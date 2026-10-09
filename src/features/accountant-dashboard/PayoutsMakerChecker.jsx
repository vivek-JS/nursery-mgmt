import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  IndianRupee,
  Layers,
  Landmark,
  PenLine,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  X
} from "lucide-react"
import { Toast } from "helpers/toasts/toastHelper"
import { useUserData } from "utils/roleUtils"
import {
  approvePayout,
  cancelPayout,
  createPayout,
  fetchBeneficiaries,
  fetchPayout,
  fetchPayoutConfig,
  fetchPayouts,
  fetchPayoutSummary,
  refreshPayout,
  rejectPayout,
  resendPayout
} from "./payoutsApi"
import {
  ACCOUNT_RE,
  AMOUNT_RE,
  DetailRow,
  Field,
  fmtAmount,
  fmtDate,
  fmtDateTime,
  fmtShortAmount,
  IFSC_RE,
  maskAcc,
  NAME_RE,
  Overlay,
  PanelHeader,
  PAYEE_TYPE_LABEL,
  Pill,
  ReasonDialog,
  REMARKS_RE,
  SelfApprovalWarning,
} from "./payoutsUi"
import { BankKindPill, PayeeRegister } from "./PayeeRegister"
import { BulkActionBar, BulkDecisionDialog, ExcelUploadPanel } from "./PayoutBulk"
import { downloadSheetsXlsx } from "utils/exportExcel"

const EXPORT_MAX = 5000

const VIEWS = [
  { id: "approval", label: "To approve" },
  { id: "bank", label: "With bank" },
  { id: "done", label: "Completed" },
  { id: "all", label: "All" }
]

const STATUS = {
  PENDING_APPROVAL: { text: "Awaiting ERP approval", tone: "warn" },
  SUBMITTING: { text: "Sending to bank", tone: "info" },
  AWAITING_BANK_APPROVAL: { text: "Awaiting ICICI approval", tone: "info" },
  PROCESSING: { text: "Bank processing", tone: "info" },
  UNKNOWN: { text: "No bank answer", tone: "warn" },
  SUCCESS: { text: "Paid", tone: "ok" },
  FAILED: { text: "Failed", tone: "bad" },
  REVERSED: { text: "Returned", tone: "bad" },
  REJECTED: { text: "Rejected", tone: "bad" },
  CANCELLED: { text: "Cancelled", tone: "muted" }
}

const MODES = [
  { id: "RGS", label: "NEFT", hint: "Any bank · 24x7 · up to ₹10 L after 7 PM" },
  { id: "IFS", label: "IMPS", hint: "Instant · 24x7 · max ₹5,00,000" },
  { id: "RTG", label: "RTGS", hint: "₹2,00,000 and above · bank hours" },
  { id: "TPA", label: "ICICI → ICICI", hint: "Same bank transfer · 24x7" }
]
const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.id, m.label]))

const PURPOSE_LABEL = {
  VENDOR_BILL: "Vendor bill",
  FARMER_REFUND: "Farmer refund",
  DEALER_COMMISSION: "Dealer commission",
  SALARY: "Salary",
  ADVANCE: "Advance",
  OTHER: "Other"
}

const HISTORY_LABEL = {
  CREATED: "Created",
  APPROVED: "Approved in ERP",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  SENT_TO_BANK: "Sent to ICICI",
  RESENT_TO_BANK: "Resent to ICICI",
  BANK_STATUS: "Bank update"
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
  "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function twoDigits(n) {
  if (n < 20) return ONES[n]
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`
}

function threeDigits(n) {
  const h = Math.floor(n / 100)
  const rest = n % 100
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ")
}

/** "125000.5" → "Rupees One Lakh Twenty Five Thousand and Fifty Paise Only" */
export function amountInWords(value) {
  const num = Number(value)
  if (!Number.isFinite(num) || num <= 0) return ""
  let rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  const parts = []
  const crore = Math.floor(rupees / 10000000)
  rupees %= 10000000
  const lakh = Math.floor(rupees / 100000)
  rupees %= 100000
  const thousand = Math.floor(rupees / 1000)
  rupees %= 1000
  if (crore) parts.push(`${crore >= 100 ? threeDigits(crore) : twoDigits(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (rupees) parts.push(threeDigits(rupees))
  const words = parts.join(" ") || "Zero"
  return `Rupees ${words}${paise ? ` and ${twoDigits(paise)} Paise` : ""} Only`
}

function StatusPill({ status }) {
  const s = STATUS[status] || { text: status, tone: "muted" }
  return <Pill tone={s.tone}>{s.text}</Pill>
}

/** Maker → Checker → ICICI → Paid, with the current step lit. */
function FlowSteps({ status }) {
  const steps = [
    { id: "maker", label: "Created", icon: PenLine },
    { id: "checker", label: "ERP approval", icon: ShieldCheck },
    { id: "bank", label: "ICICI approval", icon: Landmark },
    { id: "paid", label: "Paid", icon: Check }
  ]
  const reached = {
    PENDING_APPROVAL: 1,
    SUBMITTING: 2,
    AWAITING_BANK_APPROVAL: 2,
    PROCESSING: 3,
    UNKNOWN: 2,
    SUCCESS: 4,
    FAILED: 3,
    REVERSED: 4,
    REJECTED: 1,
    CANCELLED: 1
  }
  const done = status ? reached[status] ?? 0 : -1
  const failedAt = { FAILED: 3, REVERSED: 4, REJECTED: 2, CANCELLED: 2 }[status]

  return (
    <ol className="flex items-center gap-1 text-[11px] flex-wrap">
      {steps.map((s, i) => {
        const Icon = s.icon
        const n = i + 1
        const bad = failedAt === n
        const isDone = status && n <= done && !bad
        const current = status && n === done + 1 && !failedAt
        const cls = bad
          ? "bg-rose-500/10 text-rose-800 border-rose-500/40"
          : isDone
            ? "bg-emerald-500/10 text-emerald-800 border-emerald-500/40"
            : current
              ? "bg-sky-500/10 text-sky-800 border-sky-500/50"
              : "bg-muted/40 text-muted-foreground border-border"
        return (
          <React.Fragment key={s.id}>
            <li className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${cls}`}>
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </li>
            {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </React.Fragment>
        )
      })}
    </ol>
  )
}

function SummaryCard({ label, value, sub, tone, icon: Icon, onClick, active }) {
  const ring = {
    warn: "text-amber-700 bg-amber-500/10",
    info: "text-sky-700 bg-sky-500/10",
    ok: "text-emerald-700 bg-emerald-500/10",
    bad: "text-rose-700 bg-rose-500/10"
  }[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`erp-card text-left p-3 flex items-start gap-3 transition-colors hover:bg-muted/30 ${
        active ? "ring-2 ring-primary/40" : ""
      }`}
    >
      <span className={`rounded-md p-2 ${ring}`}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold text-muted-foreground">{label}</span>
        <span className="block text-lg font-bold text-foreground tabular leading-tight">{value}</span>
        <span className="block text-[11px] text-muted-foreground">{sub}</span>
      </span>
    </button>
  )
}

const EMPTY_FORM = {
  txnType: "RGS",
  payeeType: "VENDOR",
  payeeName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  bankName: "",
  amount: "",
  purpose: "VENDOR_BILL",
  referenceNo: "",
  remarks: ""
}

const PURPOSE_BY_PAYEE_TYPE = {
  VENDOR: "VENDOR_BILL",
  FARMER: "FARMER_REFUND",
  DEALER: "DEALER_COMMISSION",
  EMPLOYEE: "SALARY"
}
const purposeForPayee = (type) => PURPOSE_BY_PAYEE_TYPE[type] || EMPTY_FORM.purpose

function validatePayeeFields(f, config, e) {
  const limits = config?.limits || {}
  const acc = f.accountNumber.replace(/\s+/g, "").toUpperCase()
  const ifsc = f.txnType === "TPA" ? config?.ftIfsc || "ICIC0000011" : f.ifsc.trim().toUpperCase()
  const name = f.payeeName.trim()

  if (!name) e.payeeName = "Payee name is required"
  else if (!NAME_RE.test(name)) e.payeeName = "Letters, numbers and spaces only — the bank rejects symbols"
  else if (name.length > (limits.payeeNameMax || 80)) e.payeeName = "Too long"

  if (!acc) e.accountNumber = "Account number is required"
  else if (!ACCOUNT_RE.test(acc)) e.accountNumber = "6 to 34 letters or digits"
  if (acc && f.confirmAccountNumber.replace(/\s+/g, "").toUpperCase() !== acc) {
    e.confirmAccountNumber = "Account numbers do not match"
  }

  if (!IFSC_RE.test(ifsc)) e.ifsc = "IFSC looks wrong (e.g. HDFC0001234)"
}

function validateForm(f, config, payee) {
  const e = {}
  const limits = config?.limits || {}
  if (f.payeeMode === "registered") {
    if (!payee) e.beneficiaryId = "Choose an approved payee"
    else if (f.txnType === "TPA" && payee.bankKind !== "ICICI") {
      e.txnType = "ICICI to ICICI needs a payee with an ICICI Bank account"
    }
  } else {
    validatePayeeFields(f, config, e)
  }

  const amt = String(f.amount).trim()
  if (!AMOUNT_RE.test(amt) || !(Number(amt) > 0)) e.amount = "Enter an amount with at most 2 decimals"
  else if (f.txnType === "RTG" && Number(amt) < (limits.rtgsMin || 200000)) {
    e.amount = "RTGS needs at least ₹2,00,000"
  } else if (f.txnType === "IFS" && Number(amt) > (limits.impsMax || 500000)) {
    e.amount = "IMPS allows at most ₹5,00,000"
  }

  const remarksMax = f.txnType === "RGS" ? limits.neftRemarksMax || 32 : limits.remarksMax || 255
  if (!REMARKS_RE.test(f.remarks.trim())) e.remarks = "Letters, numbers and spaces only"
  else if (f.remarks.trim().length > remarksMax) e.remarks = `At most ${remarksMax} characters`

  return e
}

function PayeePicker({ payees, loading, selected, onSelect, error }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()
  const matches = q
    ? payees.filter((p) =>
        [p.name, p.nickname, p.accountNumber, p.ifsc, p.bankName].some((v) =>
          String(v || "").toLowerCase().includes(q)
        )
      )
    : payees

  if (selected) {
    return (
      <div className="rounded-md border border-emerald-600/30 bg-emerald-500/5 p-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            {selected.name} <BankKindPill kind={selected.bankKind} />
          </p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
            {selected.accountNumber} · {selected.ifsc}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {PAYEE_TYPE_LABEL[selected.type]}
            {selected.bankName ? ` · ${selected.bankName}` : ""} · approved by {selected.checkerName || "—"}
          </p>
        </div>
        <button
          type="button"
          className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-border hover:bg-muted/50 shrink-0"
          onClick={() => onSelect(null)}
        >
          Change
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          className="erp-input w-full pl-8 text-xs"
          placeholder="Search approved payees by name, account or IFSC"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border divide-y divide-border">
        {loading ? (
          <p className="p-3 text-xs text-muted-foreground">Loading payees…</p>
        ) : matches.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            {payees.length ? "No payee matches" : "No approved payees yet — add one under Payees"}
          </p>
        ) : (
          matches.map((p) => (
            <button
              key={p._id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted/40 flex items-center justify-between gap-3"
              onClick={() => onSelect(p)}
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground truncate">
                  {p.name}
                  {p.nickname ? <span className="font-normal text-muted-foreground"> · {p.nickname}</span> : null}
                </span>
                <span className="block text-[10px] font-mono text-muted-foreground">
                  {maskAcc(p.accountNumber)} · {p.ifsc}
                </span>
              </span>
              <BankKindPill kind={p.bankKind} />
            </button>
          ))
        )}
      </div>
      {error && <span className="block text-[11px] text-rose-700 mt-1">{error}</span>}
    </div>
  )
}

function NewPayoutPanel({ config, initialPayee, onClose, onCreated }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    payeeMode: "registered",
    txnType: initialPayee?.bankKind === "ICICI" ? "TPA" : EMPTY_FORM.txnType,
    purpose: purposeForPayee(initialPayee?.type)
  }))
  const [payee, setPayee] = useState(initialPayee || null)
  const [payees, setPayees] = useState([])
  const [payeesLoading, setPayeesLoading] = useState(true)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [duplicate, setDuplicate] = useState(null)

  useEffect(() => {
    fetchBeneficiaries({ status: "ACTIVE", limit: 500 })
      .then((page) => setPayees(page.items))
      .catch(() => setPayees([]))
      .finally(() => setPayeesLoading(false))
  }, [])

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setDuplicate(null)
  }
  const choosePayee = (p) => {
    setPayee(p)
    setDuplicate(null)
    setErrors({})
    if (!p) return
    setForm((f) => ({
      ...f,
      txnType: p.bankKind === "ICICI" ? "TPA" : f.txnType === "TPA" ? "RGS" : f.txnType,
      purpose: f.purpose === EMPTY_FORM.purpose ? purposeForPayee(p.type) : f.purpose
    }))
  }
  const liveErrors = useMemo(
    () => (touched ? validateForm(form, config, payee) : {}),
    [form, config, payee, touched]
  )
  const shown = { ...liveErrors, ...errors }
  const remarksMax =
    form.txnType === "RGS" ? config?.limits?.neftRemarksMax || 32 : config?.limits?.remarksMax || 255
  const words = amountInWords(form.amount)

  const submit = async (confirmDuplicate = false) => {
    setTouched(true)
    const clientErrors = validateForm(form, config, payee)
    setErrors({})
    if (Object.keys(clientErrors).length) return
    setSaving(true)
    try {
      const payeeFields =
        form.payeeMode === "registered"
          ? { beneficiaryId: payee._id }
          : {
              payeeType: form.payeeType,
              payeeName: form.payeeName.trim(),
              accountNumber: form.accountNumber.replace(/\s+/g, "").toUpperCase(),
              ifsc: form.txnType === "TPA" ? config?.ftIfsc : form.ifsc.trim().toUpperCase(),
              bankName: form.bankName.trim()
            }
      const payload = {
        txnType: form.txnType,
        ...payeeFields,
        amount: String(form.amount).trim(),
        purpose: form.purpose,
        referenceNo: form.referenceNo.trim(),
        remarks: form.remarks.trim(),
        ...(confirmDuplicate ? { confirmDuplicate: true } : {})
      }
      const created = await createPayout(payload)
      Toast.success(`Payment ${created.uniqueId} created — waiting for approval`)
      onCreated(created)
    } catch (e) {
      if (e.fields?.duplicate) {
        setDuplicate(e.fields.duplicate)
      } else {
        setErrors(e.fields || {})
        Toast.error(e.message)
      }
    } finally {
      setSaving(false)
    }
  }

  const mode = MODES.find((m) => m.id === form.txnType)

  return (
    <Overlay onClose={onClose} side>
      <PanelHeader
        title="New payment"
        subtitle="You are the maker. Another approver checks it, then ICICI asks your authoriser to approve in net banking."
        onClose={onClose}
      />
      <form
        className="p-5 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit(false)
        }}
      >
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground">Payment mode</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {MODES.map((m) => {
              const blocked =
                m.id === "TPA" && form.payeeMode === "registered" && payee && payee.bankKind !== "ICICI"
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={blocked}
                  title={blocked ? "This payee does not bank with ICICI" : undefined}
                  onClick={() => set({ txnType: m.id })}
                  className={`rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    form.txnType === m.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <span className="block text-xs font-bold text-foreground">{m.label}</span>
                  <span className="block text-[10px] text-muted-foreground">{m.hint}</span>
                </button>
              )
            })}
          </div>
          {shown.txnType && <span className="block text-[11px] text-rose-700 mt-1">{shown.txnType}</span>}
        </div>

        <div className="rounded-md border border-border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Pay to</p>
            {!config?.requireBeneficiary && (
              <div className="flex rounded-md border border-border overflow-hidden text-[11px] font-semibold">
                {[
                  { id: "registered", label: "Approved payee" },
                  { id: "oneTime", label: "One-time payee" }
                ].map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => set({ payeeMode: o.id })}
                    className={`px-2.5 py-1 ${
                      form.payeeMode === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {form.payeeMode === "registered" ? (
            <PayeePicker
              payees={payees}
              loading={payeesLoading}
              selected={payee}
              onSelect={choosePayee}
              error={shown.beneficiaryId}
            />
          ) : (
            <>
          <p className="text-[11px] text-amber-800 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-1.5">
            One-time payees are not checked in advance — prefer adding them under Payees.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Type">
              <select
                className="erp-input w-full text-xs"
                value={form.payeeType}
                onChange={(e) => set({ payeeType: e.target.value })}
              >
                {Object.entries(PAYEE_TYPE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <div className="col-span-2">
              <Field label="Name as per bank account" error={shown.payeeName}>
                <input
                  className="erp-input w-full text-xs"
                  value={form.payeeName}
                  maxLength={80}
                  onChange={(e) => set({ payeeName: e.target.value })}
                  placeholder="ABC Traders"
                />
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Account number" error={shown.accountNumber}>
              <input
                className="erp-input w-full text-xs font-mono"
                value={form.accountNumber}
                inputMode="numeric"
                autoComplete="off"
                onChange={(e) => set({ accountNumber: e.target.value })}
              />
            </Field>
            <Field label="Re-enter account number" error={shown.confirmAccountNumber}>
              <input
                className="erp-input w-full text-xs font-mono"
                value={form.confirmAccountNumber}
                inputMode="numeric"
                autoComplete="off"
                onPaste={(e) => e.preventDefault()}
                onChange={(e) => set({ confirmAccountNumber: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {form.txnType === "TPA" ? (
              <Field label="IFSC" hint="Fixed for ICICI to ICICI transfers">
                <input className="erp-input w-full text-xs font-mono" value={config?.ftIfsc || "ICIC0000011"} disabled />
              </Field>
            ) : (
              <Field label="IFSC" error={shown.ifsc}>
                <input
                  className="erp-input w-full text-xs font-mono uppercase"
                  value={form.ifsc}
                  maxLength={11}
                  onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })}
                  placeholder="HDFC0001234"
                />
              </Field>
            )}
            <Field label="Bank name (optional)">
              <input
                className="erp-input w-full text-xs"
                value={form.bankName}
                onChange={(e) => set({ bankName: e.target.value })}
              />
            </Field>
          </div>
            </>
          )}
        </div>

        <div className="rounded-md border border-border p-3 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Payment</p>
          <Field label="Amount (₹)" error={shown.amount} hint={mode?.hint}>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                className="erp-input w-full text-sm font-semibold pl-8 tabular"
                value={form.amount}
                inputMode="decimal"
                onChange={(e) => set({ amount: e.target.value.replace(/[^\d.]/g, "") })}
                placeholder="0.00"
              />
            </div>
          </Field>
          {words && <p className="text-[11px] italic text-foreground/80 -mt-1">{words}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Purpose">
              <select
                className="erp-input w-full text-xs"
                value={form.purpose}
                onChange={(e) => set({ purpose: e.target.value })}
              >
                {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Bill / invoice / order no." error={shown.referenceNo}>
              <input
                className="erp-input w-full text-xs"
                value={form.referenceNo}
                maxLength={40}
                onChange={(e) => set({ referenceNo: e.target.value })}
              />
            </Field>
          </div>
          <Field
            label={`Remarks (shown to the payee's bank) ${form.remarks.trim().length}/${remarksMax}`}
            error={shown.remarks}
          >
            <input
              className="erp-input w-full text-xs"
              value={form.remarks}
              onChange={(e) => set({ remarks: e.target.value })}
              placeholder="Invoice 4471"
            />
          </Field>
        </div>

        <div className="rounded-md bg-muted/40 border border-border px-3 py-2 text-[11px] text-muted-foreground flex items-center gap-2">
          <Landmark className="w-3.5 h-3.5 shrink-0" />
          Debit from ICICI account {config?.debitAccount || "—"}
        </div>

        {duplicate && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-950">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Possible duplicate
            </p>
            <p className="mt-1">{duplicate}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-600 bg-white hover:bg-amber-50"
                onClick={() => submit(true)}
                disabled={saving}
              >
                Create anyway
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
                onClick={() => setDuplicate(null)}
              >
                Go back
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary text-xs inline-flex items-center gap-1.5" disabled={saving}>
            <Send className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Submit for approval"}
          </button>
        </div>
      </form>
    </Overlay>
  )
}

function PayeeSourcePill({ payout }) {
  return payout.beneficiaryId ? (
    <Pill tone="ok">Approved payee</Pill>
  ) : (
    <Pill tone="warn">One-time payee — check the account carefully</Pill>
  )
}

function ApproveDialog({ payout, isSelf, onClose, onDone }) {
  const [checked, setChecked] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const approve = async () => {
    setBusy(true)
    try {
      const res = await approvePayout(payout._id, note.trim() || undefined)
      const s = STATUS[res.status]?.text || res.status
      if (res.status === "FAILED") Toast.error(`ICICI rejected it: ${res.bank?.message || "see details"}`)
      else Toast.success(`Approved and sent to ICICI — ${s}`)
      onDone(res)
    } catch (e) {
      Toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Overlay onClose={onClose}>
      <PanelHeader title="Approve payment" subtitle={`Reference ${payout.uniqueId}`} onClose={onClose} />
      <div className="p-5 space-y-4">
        <div className="rounded-md border border-border p-3 text-center">
          <p className="text-2xl font-bold tabular">{fmtAmount(payout.amount)}</p>
          <p className="text-[11px] italic text-muted-foreground mt-1">{amountInWords(payout.amount)}</p>
        </div>
        <div>
          <DetailRow label="Payee">{payout.payee?.name}</DetailRow>
          <DetailRow label="Payee source">
            <PayeeSourcePill payout={payout} />
          </DetailRow>
          <DetailRow label="Account number" mono>
            {payout.payee?.accountNumber}
          </DetailRow>
          <DetailRow label="IFSC" mono>
            {payout.payee?.ifsc}
          </DetailRow>
          <DetailRow label="Mode">{MODE_LABEL[payout.txnType]}</DetailRow>
          <DetailRow label="Purpose">
            {PURPOSE_LABEL[payout.purpose]}
            {payout.referenceNo ? ` · ${payout.referenceNo}` : ""}
          </DetailRow>
          <DetailRow label="Created by">{payout.makerName}</DetailRow>
        </div>
        {isSelf && <SelfApprovalWarning what="payment" />}
        <div className="rounded-md bg-sky-500/10 border border-sky-600/30 px-3 py-2 text-[11px] text-sky-950">
          After you approve, ICICI holds this payment until your authoriser approves it in ICICI net banking
          (CIB). No money moves before that.
        </div>
        <Field label="Note (optional)">
          <input className="erp-input w-full text-xs" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          I have checked the payee name, account number, IFSC and amount against the bill.
        </label>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary text-xs inline-flex items-center gap-1.5"
            disabled={!checked || busy}
            onClick={approve}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {busy ? "Sending…" : "Approve & send to ICICI"}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

function DetailPanel({ id, config, myId, onClose, onChanged, onApprove, onReject, onCancel }) {
  const [payout, setPayout] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setPayout(await fetchPayout(id))
    } catch (e) {
      Toast.error(e.message)
      onClose()
    }
  }, [id, onClose])

  useEffect(() => {
    load()
  }, [load])

  const refresh = async () => {
    setBusy(true)
    try {
      const res = await refreshPayout(id)
      setPayout(res.payout)
      if (res.warning) Toast.error(res.warning)
      else Toast.success(`Status: ${STATUS[res.payout.status]?.text || res.payout.status}`)
      onChanged()
    } catch (e) {
      Toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const resend = async () => {
    if (!window.confirm("Resend to ICICI with the same reference? ICICI never pays the same reference twice.")) return
    setBusy(true)
    try {
      setPayout(await resendPayout(id))
      Toast.success("Resent to ICICI")
      onChanged()
    } catch (e) {
      Toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  if (!payout) {
    return (
      <Overlay onClose={onClose} side>
        <PanelHeader title="Payment" onClose={onClose} />
        <p className="p-5 text-sm text-muted-foreground">Loading…</p>
      </Overlay>
    )
  }

  const isMaker = String(payout.makerId) === String(myId)
  const mayApprove = Boolean(config?.canApprove && (!isMaker || config?.canSelfApprove))
  const pending = payout.status === "PENDING_APPROVAL"
  const withBank = ["AWAITING_BANK_APPROVAL", "PROCESSING", "UNKNOWN"].includes(payout.status)

  return (
    <Overlay onClose={onClose} side>
      <PanelHeader title={payout.payee?.name} subtitle={`Reference ${payout.uniqueId}`} onClose={onClose} />
      <div className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-bold tabular">{fmtAmount(payout.amount)}</p>
            <p className="text-[11px] italic text-muted-foreground">{amountInWords(payout.amount)}</p>
          </div>
          <StatusPill status={payout.status} />
        </div>

        <FlowSteps status={payout.status} />

        {payout.status === "AWAITING_BANK_APPROVAL" && (
          <div className="rounded-md bg-sky-500/10 border border-sky-600/30 px-3 py-2 text-xs text-sky-950">
            Waiting for your authoriser to approve this in ICICI net banking (CIB → Transactions → Pending
            approval). Status updates automatically; you can also refresh.
          </div>
        )}
        {payout.status === "UNKNOWN" && (
          <div className="rounded-md bg-amber-500/10 border border-amber-500/40 px-3 py-2 text-xs text-amber-950">
            ICICI did not answer. Do not create a new payment — refresh the status first. If ICICI has no record,
            an approver can resend it with the same reference.
          </div>
        )}
        {payout.status === "REJECTED" && payout.rejectReason && (
          <div className="rounded-md bg-rose-500/10 border border-rose-600/30 px-3 py-2 text-xs text-rose-950">
            Rejected by {payout.checkerName}: {payout.rejectReason}
          </div>
        )}

        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Payee</h3>
          <DetailRow label="Name">{payout.payee?.name}</DetailRow>
          <DetailRow label="Account number" mono>
            {payout.payee?.accountNumber}
          </DetailRow>
          <DetailRow label="IFSC" mono>
            {payout.payee?.ifsc}
          </DetailRow>
          <DetailRow label="Bank">{payout.payee?.bankName}</DetailRow>
          <DetailRow label="Type">{PAYEE_TYPE_LABEL[payout.payee?.type]}</DetailRow>
          <DetailRow label="Source">
            <PayeeSourcePill payout={payout} />
          </DetailRow>
        </section>

        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Payment</h3>
          <DetailRow label="Mode">{MODE_LABEL[payout.txnType]}</DetailRow>
          <DetailRow label="Purpose">{PURPOSE_LABEL[payout.purpose]}</DetailRow>
          <DetailRow label="Bill / reference">{payout.referenceNo}</DetailRow>
          <DetailRow label="Remarks">{payout.remarks}</DetailRow>
          <DetailRow label="Debit account" mono>
            {maskAcc(payout.debitAccount)}
          </DetailRow>
          {payout.batchId && (
            <DetailRow label="Excel batch">
              {payout.batchName} <span className="font-mono text-muted-foreground">({payout.batchId})</span>
            </DetailRow>
          )}
          <DetailRow label="Created by">
            {payout.makerName} · {fmtDateTime(payout.createdAt)}
          </DetailRow>
          {payout.checkerName && (
            <DetailRow label={payout.status === "REJECTED" ? "Rejected by" : "Approved by"}>
              {payout.checkerName} · {fmtDateTime(payout.checkedAt)}
              {payout.selfApproved ? (
                <span className="ml-1.5">
                  <Pill tone="warn">Self-approved</Pill>
                </span>
              ) : null}
            </DetailRow>
          )}
        </section>

        {(payout.bank?.reqId || payout.bank?.utr || payout.bank?.message) && (
          <section>
            <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
              ICICI {payout.bank?.stub ? <Pill tone="warn">Test bank</Pill> : null}
            </h3>
            <DetailRow label="Bank request id" mono>
              {payout.bank?.reqId}
            </DetailRow>
            <DetailRow label="UTR" mono>
              {payout.bank?.utr}
            </DetailRow>
            <DetailRow label="Bank status">{payout.bank?.status}</DetailRow>
            <DetailRow label="Message">{payout.bank?.message}</DetailRow>
            <DetailRow label="Last checked">{fmtDateTime(payout.bank?.lastCheckedAt)}</DetailRow>
          </section>
        )}

        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Timeline</h3>
          <ol className="relative border-l border-border ml-1.5 space-y-3">
            {(payout.history || []).map((h, i) => (
              <li key={i} className="ml-4">
                <span className="absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full bg-primary/70" />
                <p className="text-xs font-semibold text-foreground">
                  {HISTORY_LABEL[h.action] || h.action}
                  {h.toStatus && h.action !== "CREATED" ? (
                    <span className="ml-2 align-middle">
                      <StatusPill status={h.toStatus} />
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {h.byName} · {fmtDateTime(h.at)}
                </p>
                {h.note && <p className="text-[11px] text-foreground/80 mt-0.5">{h.note}</p>}
              </li>
            ))}
          </ol>
        </section>

        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-border">
          {pending && isMaker && (
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
              onClick={() => onCancel(payout)}
            >
              Cancel payment
            </button>
          )}
          {pending && mayApprove && (
            <>
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-rose-600/50 text-rose-800 hover:bg-rose-500/10"
                onClick={() => onReject(payout)}
              >
                Reject
              </button>
              <button
                type="button"
                className="btn-primary text-xs inline-flex items-center gap-1.5"
                onClick={() => onApprove(payout)}
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Approve
              </button>
            </>
          )}
          {withBank && (
            <button
              type="button"
              className="btn-primary text-xs inline-flex items-center gap-1.5"
              onClick={refresh}
              disabled={busy}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy ? "animate-spin" : ""}`} /> Check status with ICICI
            </button>
          )}
          {payout.status === "UNKNOWN" && config?.canApprove && (
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-600 text-amber-900 hover:bg-amber-50"
              onClick={resend}
              disabled={busy}
            >
              Resend (same reference)
            </button>
          )}
        </div>
      </div>
    </Overlay>
  )
}

/**
 * Accounting dashboard → Payouts: maker creates, a second person approves in
 * the ERP, ICICI holds it for the authoriser in net banking, then it is paid.
 */
export function PayoutsMakerChecker() {
  const userData = useUserData()
  const myId = userData?._id || userData?.id

  const [config, setConfig] = useState(null)
  const [summary, setSummary] = useState(null)
  const [view, setView] = useState("approval")
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [rows, setRows] = useState([])
  const rowCount = useRef(0)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const [section, setSection] = useState("payments")
  const [payeeCounts, setPayeeCounts] = useState({})
  const [createOpen, setCreateOpen] = useState(false)
  const [createFor, setCreateFor] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [detailKey, setDetailKey] = useState(0)
  const [batch, setBatch] = useState(null)
  const [selected, setSelected] = useState({})
  const [bulkAction, setBulkAction] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setSelected({})
  }, [view, debounced, batch])

  useEffect(() => {
    const pending = new Set(rows.filter((p) => p.status === "PENDING_APPROVAL").map((p) => p._id))
    setSelected((s) => {
      const keep = Object.entries(s).filter(([id]) => pending.has(id))
      return keep.length === Object.keys(s).length ? s : Object.fromEntries(keep)
    })
  }, [rows])

  useEffect(() => {
    fetchPayoutConfig()
      .then(setConfig)
      .catch(() => setConfig(null))
  }, [])

  const loadSummary = useCallback(async () => {
    try {
      const [s, payees] = await Promise.all([fetchPayoutSummary(), fetchBeneficiaries({ limit: 1 })])
      setSummary(s)
      setPayeeCounts(payees.counts)
    } catch {
      /* cards are optional */
    }
  }, [])

  const openNewPayment = (payee = null) => {
    setCreateFor(payee)
    setCreateOpen(true)
  }

  const loadRows = useCallback(
    async (append = false) => {
      setLoading(true)
      try {
        const page = await fetchPayouts({
          view,
          search: debounced,
          batchId: batch?.id,
          skip: append ? rowCount.current : 0
        })
        setRows((prev) => {
          const next = append ? [...prev, ...page.items] : page.items
          rowCount.current = next.length
          return next
        })
        setTotal(page.total)
        setHasMore(page.hasMore)
      } catch {
        if (!append) setRows([])
      } finally {
        setLoading(false)
      }
    },
    [view, debounced, batch]
  )

  const reloadAll = useCallback(async () => {
    await Promise.all([loadRows(false), loadSummary()])
  }, [loadRows, loadSummary])

  useEffect(() => {
    loadRows(false)
  }, [loadRows])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  // Payouts with the bank change on their own (poller); keep the screen current.
  useEffect(() => {
    if (view !== "bank" && view !== "all") return undefined
    const t = setInterval(() => {
      if (document.visibilityState === "visible") reloadAll()
    }, 60000)
    return () => clearInterval(t)
  }, [view, reloadAll])

  const closeDetail = useCallback(() => setDetailId(null), [])

  const afterChange = async () => {
    setDetailKey((k) => k + 1)
    await reloadAll()
  }

  const quickRefresh = async (row) => {
    setBusyId(row._id)
    try {
      const res = await refreshPayout(row._id)
      if (res.warning) Toast.error(res.warning)
      else Toast.success(`${row.uniqueId}: ${STATUS[res.payout.status]?.text || res.payout.status}`)
      await reloadAll()
    } catch (e) {
      Toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  const counts = {
    approval: summary?.awaitingApproval?.count ?? 0,
    bank: summary?.withBank?.count ?? 0
  }

  const canDecide = (p) =>
    p.status === "PENDING_APPROVAL" &&
    Boolean(config?.canApprove && (String(p.makerId) !== String(myId) || config?.canSelfApprove))
  const selectable = rows.filter(canDecide)
  const selectedRows = Object.values(selected)
  const allSelected = selectable.length > 0 && selectable.every((p) => selected[p._id])
  const toggleRow = (p) =>
    setSelected((s) => {
      const next = { ...s }
      if (next[p._id]) delete next[p._id]
      else next[p._id] = p
      return next
    })
  const toggleAll = () =>
    setSelected(allSelected ? {} : Object.fromEntries(selectable.map((p) => [p._id, p])))

  const exportRows = async () => {
    setExporting(true)
    try {
      const all = []
      for (;;) {
        const page = await fetchPayouts({ view, search: debounced, batchId: batch?.id, limit: 500, skip: all.length })
        all.push(...page.items)
        if (!page.hasMore || !page.items.length || all.length >= EXPORT_MAX) break
      }
      if (!all.length) {
        Toast.error("Nothing to export")
        return
      }
      downloadSheetsXlsx(`payouts-${batch ? batch.name : VIEWS.find((v) => v.id === view)?.label || view}`, [
        {
          title: "Payouts",
          headers: [
            "Created", "Reference", "Payee", "Payee type", "Account number", "IFSC", "Bank", "Mode", "Amount",
            "Purpose", "Bill / reference", "Remarks", "Status", "UTR", "Bank message", "Maker", "Checker",
            "Checked at", "Self-approved", "Approved payee", "Batch"
          ],
          rows: all.map((p) => [
            fmtDateTime(p.createdAt),
            p.uniqueId,
            p.payee?.name,
            PAYEE_TYPE_LABEL[p.payee?.type] || p.payee?.type,
            p.payee?.accountNumber,
            p.payee?.ifsc,
            p.payee?.bankName,
            MODE_LABEL[p.txnType] || p.txnType,
            Number(p.amount),
            PURPOSE_LABEL[p.purpose] || p.purpose,
            p.referenceNo,
            p.remarks,
            STATUS[p.status]?.text || p.status,
            p.bank?.utr,
            p.bank?.message,
            p.makerName,
            p.checkerName,
            p.checkedAt ? fmtDateTime(p.checkedAt) : "",
            p.selfApproved ? "Yes" : "",
            p.beneficiaryId ? "Yes" : "No",
            p.batchName ? `${p.batchName} (${p.batchId})` : ""
          ])
        }
      ])
      if (all.length >= EXPORT_MAX) Toast.error(`Exported the first ${EXPORT_MAX} — narrow the search for the rest`)
    } catch (e) {
      Toast.error(e.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="erp-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              Payouts · Maker / Checker
              {config?.stub && <Pill tone="warn">Test bank — no real money</Pill>}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-2xl">
              Every payment needs three people: the maker creates it, a different approver checks it here, and
              your ICICI authoriser approves it in net banking. Money moves only after all three.
            </p>
            <div className="mt-3">
              <FlowSteps status={null} />
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50 inline-flex items-center gap-1.5 disabled:opacity-50"
                onClick={() => setUploadOpen(true)}
                disabled={!config?.debitConfigured}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Upload Excel
              </button>
              <button
                type="button"
                className="btn-primary text-xs inline-flex items-center gap-1.5"
                onClick={() => openNewPayment()}
                disabled={!config?.debitConfigured}
                title={config?.debitConfigured ? "" : "ICICI debit account is not configured"}
              >
                <Plus className="w-3.5 h-3.5" /> New payment
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Debit account {config?.debitAccount || "—"} ·{" "}
              {config?.canApprove ? "You can approve" : "You can create; an approver must approve"}
            </span>
          </div>
        </div>
        <div className="mt-4 flex gap-1 border-b border-border">
          {[
            { id: "payments", label: "Payments", badge: counts.approval },
            { id: "payees", label: "Payees", badge: payeeCounts.PENDING_APPROVAL || 0 }
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                section === s.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
              {s.badge ? (
                <span className="ml-1.5 text-[10px] badge-pending px-1.5 py-0.5 rounded-full font-bold">{s.badge}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {section === "payees" && (
        <PayeeRegister
          config={config}
          myId={myId}
          onPay={(payee) => openNewPayment(payee)}
          onCountsChange={setPayeeCounts}
        />
      )}

      {section === "payments" && (
      <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Awaiting ERP approval"
          value={summary?.awaitingApproval?.count ?? "—"}
          sub={fmtShortAmount(summary?.awaitingApproval?.amount)}
          tone="warn"
          icon={ShieldCheck}
          active={view === "approval"}
          onClick={() => setView("approval")}
        />
        <SummaryCard
          label="Awaiting ICICI approval"
          value={summary?.awaitingBankApproval?.count ?? "—"}
          sub="Approve in net banking"
          tone="info"
          icon={Landmark}
          active={view === "bank"}
          onClick={() => setView("bank")}
        />
        <SummaryCard
          label="Needs attention"
          value={summary?.needsAttention?.count ?? "—"}
          sub="No answer from bank"
          tone="warn"
          icon={AlertTriangle}
          onClick={() => setView("bank")}
        />
        <SummaryCard
          label="Paid today"
          value={summary?.paidToday?.count ?? "—"}
          sub={fmtShortAmount(summary?.paidToday?.amount)}
          tone="ok"
          icon={Check}
          active={view === "done"}
          onClick={() => setView("done")}
        />
        <SummaryCard
          label="Failed / returned (30 days)"
          value={summary?.failed30d?.count ?? "—"}
          sub={fmtShortAmount(summary?.failed30d?.amount)}
          tone="bad"
          icon={X}
          onClick={() => setView("done")}
        />
      </div>

      <div className="erp-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex gap-1 border-b border-border overflow-x-auto">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  view === v.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {v.label}
                {counts[v.id] ? (
                  <span className="ml-1.5 text-[10px] badge-pending px-1.5 py-0.5 rounded-full font-bold">
                    {counts[v.id]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                className="erp-input pl-8 w-56 text-xs py-1.5"
                placeholder="Payee, reference, UTR, bill no…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="p-2 rounded-md border border-border hover:bg-muted/50 text-muted-foreground"
              onClick={reloadAll}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              className="px-2.5 py-1.5 rounded-md border border-border hover:bg-muted/50 text-xs font-semibold text-muted-foreground inline-flex items-center gap-1 disabled:opacity-50"
              onClick={exportRows}
              disabled={exporting || !rows.length}
              title="Download this list as Excel"
            >
              <Download className="w-3.5 h-3.5" /> {exporting ? "…" : "Export"}
            </button>
          </div>
        </div>

        {batch && (
          <div className="mb-3 flex items-center gap-2 text-xs">
            <Pill tone="info">
              <Layers className="w-3 h-3" /> Batch: {batch.name}
            </Pill>
            <span className="font-mono text-[11px] text-muted-foreground">{batch.id}</span>
            <button
              type="button"
              className="text-[11px] font-semibold text-primary hover:underline"
              onClick={() => setBatch(null)}
            >
              Show all payments
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {selectable.length > 0 && (
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all that I can approve"
                      title="Select all that you can approve"
                    />
                  </th>
                )}
                <th>Created</th>
                <th>Payee</th>
                <th>Mode</th>
                <th>Purpose</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                <th>Maker / Checker</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted-foreground py-10">
                    {loading
                      ? "Loading…"
                      : view === "approval"
                        ? "Nothing waiting for approval"
                        : "No payments here yet"}
                  </td>
                </tr>
              ) : (
                rows.map((p) => {
                  const isMaker = String(p.makerId) === String(myId)
                  const mayApprove = Boolean(config?.canApprove && (!isMaker || config?.canSelfApprove))
                  const pending = p.status === "PENDING_APPROVAL"
                  const withBank = ["AWAITING_BANK_APPROVAL", "PROCESSING", "UNKNOWN"].includes(p.status)
                  return (
                    <tr
                      key={p._id}
                      className={`cursor-pointer hover:bg-muted/30 ${selected[p._id] ? "bg-primary/5" : ""}`}
                      onClick={() => setDetailId(p._id)}
                    >
                      {selectable.length > 0 && (
                        <td onClick={(e) => e.stopPropagation()}>
                          {canDecide(p) && (
                            <input
                              type="checkbox"
                              checked={Boolean(selected[p._id])}
                              onChange={() => toggleRow(p)}
                              aria-label={`Select ${p.uniqueId}`}
                            />
                          )}
                        </td>
                      )}
                      <td className="whitespace-nowrap">
                        <span className="block">{fmtDate(p.createdAt)}</span>
                        <span className="block text-[10px] font-mono text-muted-foreground">{p.uniqueId}</span>
                      </td>
                      <td>
                        <span className="block font-semibold text-foreground">
                          {p.payee?.name}
                          {p.beneficiaryId && (
                            <ShieldCheck
                              className="inline w-3 h-3 ml-1 text-emerald-700"
                              aria-label="Approved payee"
                            />
                          )}
                        </span>
                        <span className="block text-[10px] font-mono text-muted-foreground">
                          {maskAcc(p.payee?.accountNumber)} · {p.payee?.ifsc}
                        </span>
                        {p.batchId && !batch && (
                          <button
                            type="button"
                            className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-sky-800 hover:underline"
                            onClick={(e) => {
                              e.stopPropagation()
                              setBatch({ id: p.batchId, name: p.batchName })
                            }}
                            title="Show this Excel batch"
                          >
                            <Layers className="w-3 h-3" /> {p.batchName}
                          </button>
                        )}
                      </td>
                      <td>{MODE_LABEL[p.txnType] || p.txnType}</td>
                      <td>
                        <span className="block">{PURPOSE_LABEL[p.purpose] || p.purpose}</span>
                        {p.referenceNo && (
                          <span className="block text-[10px] text-muted-foreground">{p.referenceNo}</span>
                        )}
                      </td>
                      <td className="text-right tabular font-semibold">{fmtAmount(p.amount)}</td>
                      <td>
                        <StatusPill status={p.status} />
                        {p.bank?.utr && (
                          <span className="block text-[10px] font-mono text-muted-foreground mt-0.5">
                            UTR {p.bank.utr}
                          </span>
                        )}
                      </td>
                      <td className="text-[11px]">
                        <span className="block">
                          <PenLine className="inline w-3 h-3 mr-1 text-muted-foreground" />
                          {p.makerName}
                        </span>
                        {p.checkerName && (
                          <span className="block text-muted-foreground">
                            <ShieldCheck className="inline w-3 h-3 mr-1" />
                            {p.selfApproved ? "Self-approved" : p.checkerName}
                          </span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          {pending && mayApprove && (
                            <>
                              <button
                                type="button"
                                className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-emerald-600/40 text-emerald-800 hover:bg-emerald-500/10"
                                onClick={() => setApproveTarget(p)}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-rose-600/40 text-rose-800 hover:bg-rose-500/10"
                                onClick={() => setRejectTarget(p)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {pending && isMaker && !mayApprove && (
                            <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Waiting for approver
                            </span>
                          )}
                          {pending && !isMaker && !config?.canApprove && (
                            <span className="text-[11px] text-muted-foreground">Approver needed</span>
                          )}
                          {withBank && (
                            <button
                              type="button"
                              className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-sky-600/40 text-sky-800 hover:bg-sky-500/10 inline-flex items-center gap-1 disabled:opacity-50"
                              onClick={() => quickRefresh(p)}
                              disabled={busyId === p._id}
                            >
                              <RefreshCw className={`w-3 h-3 ${busyId === p._id ? "animate-spin" : ""}`} />
                              Status
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-3 text-[11px] text-muted-foreground">
          <span>
            {rows.length} of {total}
          </span>
          {hasMore && (
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
              onClick={() => loadRows(true)}
              disabled={loading}
            >
              Load more
            </button>
          )}
        </div>
        <BulkActionBar
          count={selectedRows.length}
          amount={selectedRows.reduce((s, p) => s + (Number(p.amount) || 0), 0)}
          noun="payment"
          onClear={() => setSelected({})}
          onApprove={() => setBulkAction("approve")}
          onReject={() => setBulkAction("reject")}
        />
      </div>
      </>
      )}

      {uploadOpen && (
        <ExcelUploadPanel
          kind="payment"
          onClose={() => setUploadOpen(false)}
          onCreated={(res) => {
            setSection("payments")
            setView("approval")
            setSearch("")
            if (res.batch) setBatch(res.batch)
            loadSummary()
          }}
        />
      )}

      {bulkAction && (
        <BulkDecisionDialog
          kind="payment"
          action={bulkAction}
          items={selectedRows.map((p) => ({
            id: p._id,
            label: `${p.payee?.name} · ${p.uniqueId}`,
            amount: p.amount,
            isSelf: String(p.makerId) === String(myId)
          }))}
          onClose={() => setBulkAction(null)}
          onFinished={async () => {
            setSelected({})
            await reloadAll()
          }}
        />
      )}

      {createOpen && (
        <NewPayoutPanel
          config={config}
          initialPayee={createFor}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false)
            setSection("payments")
            setView("approval")
            reloadAll()
          }}
        />
      )}

      {detailId && (
        <DetailPanel
          key={`${detailId}-${detailKey}`}
          id={detailId}
          config={config}
          myId={myId}
          onClose={closeDetail}
          onChanged={reloadAll}
          onApprove={setApproveTarget}
          onReject={setRejectTarget}
          onCancel={setCancelTarget}
        />
      )}

      {approveTarget && (
        <ApproveDialog
          payout={approveTarget}
          isSelf={String(approveTarget.makerId) === String(myId)}
          onClose={() => setApproveTarget(null)}
          onDone={async () => {
            setApproveTarget(null)
            await afterChange()
          }}
        />
      )}

      {rejectTarget && (
        <ReasonDialog
          title="Reject payment"
          subtitle={`${rejectTarget.payee?.name} · ${fmtAmount(rejectTarget.amount)}`}
          actionLabel="Reject"
          required
          onClose={() => setRejectTarget(null)}
          onSubmit={async (reason) => {
            try {
              await rejectPayout(rejectTarget._id, reason)
              Toast.success("Payment rejected")
              setRejectTarget(null)
              await afterChange()
            } catch (e) {
              Toast.error(e.message)
            }
          }}
        />
      )}

      {cancelTarget && (
        <ReasonDialog
          title="Cancel payment"
          subtitle={`${cancelTarget.payee?.name} · ${fmtAmount(cancelTarget.amount)}`}
          actionLabel="Cancel payment"
          onClose={() => setCancelTarget(null)}
          onSubmit={async (reason) => {
            try {
              await cancelPayout(cancelTarget._id, reason)
              Toast.success("Payment cancelled")
              setCancelTarget(null)
              await afterChange()
            } catch (e) {
              Toast.error(e.message)
            }
          }}
        />
      )}
    </div>
  )
}
