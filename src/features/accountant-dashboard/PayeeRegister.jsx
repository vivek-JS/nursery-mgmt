import React, { useCallback, useEffect, useState } from "react"
import { Ban, Building2, Plus, RefreshCw, Search, Send, ShieldCheck, UserPlus } from "lucide-react"
import { Toast } from "helpers/toasts/toastHelper"
import {
  approveBeneficiary,
  createBeneficiary,
  disableBeneficiary,
  fetchBeneficiaries,
  rejectBeneficiary
} from "./payoutsApi"
import {
  ACCOUNT_RE,
  DetailRow,
  Field,
  fmtDate,
  IFSC_RE,
  maskAcc,
  NAME_RE,
  Overlay,
  PanelHeader,
  PAYEE_TYPE_LABEL,
  Pill,
  ReasonDialog,
  SelfApprovalWarning
} from "./payoutsUi"

const FILTERS = [
  { id: "ACTIVE", label: "Approved", statuses: ["ACTIVE"] },
  { id: "PENDING_APPROVAL", label: "Awaiting approval", statuses: ["PENDING_APPROVAL"] },
  { id: "CLOSED", label: "Rejected / disabled", statuses: ["REJECTED", "DISABLED"] },
  { id: "ALL", label: "All", statuses: [] }
]

const PAYEE_STATUS = {
  PENDING_APPROVAL: { text: "Awaiting approval", tone: "warn" },
  ACTIVE: { text: "Approved", tone: "ok" },
  REJECTED: { text: "Rejected", tone: "bad" },
  DISABLED: { text: "Disabled", tone: "muted" }
}

const MOBILE_RE = /^[6-9]\d{9}$/

export function BankKindPill({ kind }) {
  return kind === "ICICI" ? <Pill tone="info">ICICI Bank</Pill> : <Pill tone="muted">Other bank</Pill>
}

const EMPTY = {
  bankKind: "NON_ICICI",
  name: "",
  nickname: "",
  accountNumber: "",
  confirmAccountNumber: "",
  ifsc: "",
  bankName: "",
  type: "VENDOR",
  mobile: ""
}

function validate(f) {
  const e = {}
  const name = f.name.trim()
  const acc = f.accountNumber.replace(/\s+/g, "").toUpperCase()
  const ifsc = f.ifsc.trim().toUpperCase()
  const mobile = f.mobile.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "")

  if (!name) e.name = "Payee name is required"
  else if (!NAME_RE.test(name)) e.name = "Letters, numbers and spaces only — the bank rejects symbols"
  if (!acc) e.accountNumber = "Account number is required"
  else if (!ACCOUNT_RE.test(acc)) e.accountNumber = "6 to 34 letters or digits"
  if (acc && f.confirmAccountNumber.replace(/\s+/g, "").toUpperCase() !== acc) {
    e.confirmAccountNumber = "Account numbers do not match"
  }
  if (!IFSC_RE.test(ifsc)) e.ifsc = "IFSC looks wrong (e.g. HDFC0001234)"
  else if (f.bankKind === "ICICI" && !ifsc.startsWith("ICIC")) e.ifsc = "ICICI Bank IFSCs start with ICIC"
  else if (f.bankKind === "NON_ICICI" && ifsc.startsWith("ICIC")) e.ifsc = "This is an ICICI IFSC — choose ICICI Bank"
  if (mobile && !MOBILE_RE.test(mobile)) e.mobile = "10-digit mobile number"
  return e
}

function AddPayeePanel({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [touched, setTouched] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }))
    setServerErrors({})
  }
  const errors = { ...(touched ? validate(form) : {}), ...serverErrors }

  const submit = async (e) => {
    e.preventDefault()
    setTouched(true)
    if (Object.keys(validate(form)).length) return
    setSaving(true)
    try {
      const created = await createBeneficiary({
        ...form,
        name: form.name.trim(),
        accountNumber: form.accountNumber.replace(/\s+/g, "").toUpperCase(),
        confirmAccountNumber: form.confirmAccountNumber.replace(/\s+/g, "").toUpperCase(),
        ifsc: form.ifsc.trim().toUpperCase()
      })
      Toast.success(`${created.name} added — waiting for approval`)
      onCreated(created)
    } catch (err) {
      setServerErrors(err.fields || {})
      Toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Overlay onClose={onClose} side>
      <PanelHeader
        title="Add payee"
        subtitle="A different approver must approve the payee before anyone can pay it."
        onClose={onClose}
      />
      <form className="p-5 space-y-4" onSubmit={submit}>
        <div>
          <span className="text-[11px] font-semibold text-muted-foreground">Payee banks with</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {[
              { id: "ICICI", label: "ICICI Bank", hint: "Paid ICICI to ICICI, 24x7" },
              { id: "NON_ICICI", label: "Another bank", hint: "Paid by NEFT, RTGS or IMPS" }
            ].map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => set({ bankKind: k.id })}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  form.bankKind === k.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <span className="block text-xs font-bold text-foreground">{k.label}</span>
                <span className="block text-[10px] text-muted-foreground">{k.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Type">
            <select className="erp-input w-full text-xs" value={form.type} onChange={(e) => set({ type: e.target.value })}>
              {Object.entries(PAYEE_TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Name as per bank account" error={errors.name}>
              <input
                className="erp-input w-full text-xs"
                value={form.name}
                maxLength={80}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="ABC Traders"
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Account number" error={errors.accountNumber}>
            <input
              className="erp-input w-full text-xs font-mono"
              value={form.accountNumber}
              autoComplete="off"
              onChange={(e) => set({ accountNumber: e.target.value })}
            />
          </Field>
          <Field label="Re-enter account number" error={errors.confirmAccountNumber}>
            <input
              className="erp-input w-full text-xs font-mono"
              value={form.confirmAccountNumber}
              autoComplete="off"
              onPaste={(e) => e.preventDefault()}
              onChange={(e) => set({ confirmAccountNumber: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="IFSC"
            error={errors.ifsc}
            hint={form.bankKind === "ICICI" ? "The branch IFSC, starting with ICIC" : undefined}
          >
            <input
              className="erp-input w-full text-xs font-mono uppercase"
              value={form.ifsc}
              maxLength={11}
              onChange={(e) => set({ ifsc: e.target.value.toUpperCase() })}
              placeholder={form.bankKind === "ICICI" ? "ICIC0000104" : "HDFC0001234"}
            />
          </Field>
          <Field label="Bank name (optional)">
            <input
              className="erp-input w-full text-xs"
              value={form.bankKind === "ICICI" ? "ICICI Bank" : form.bankName}
              disabled={form.bankKind === "ICICI"}
              onChange={(e) => set({ bankName: e.target.value })}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Short name (optional)" error={errors.nickname}>
            <input
              className="erp-input w-full text-xs"
              value={form.nickname}
              maxLength={40}
              onChange={(e) => set({ nickname: e.target.value })}
              placeholder="Seed supplier"
            />
          </Field>
          <Field label="Mobile (optional)" error={errors.mobile}>
            <input
              className="erp-input w-full text-xs"
              value={form.mobile}
              inputMode="tel"
              onChange={(e) => set({ mobile: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary text-xs inline-flex items-center gap-1.5" disabled={saving}>
            <UserPlus className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Submit for approval"}
          </button>
        </div>
      </form>
    </Overlay>
  )
}

function ApprovePayeeDialog({ payee, isSelf, onClose, onDone }) {
  const [checked, setChecked] = useState(false)
  const [busy, setBusy] = useState(false)
  const approve = async () => {
    setBusy(true)
    try {
      await approveBeneficiary(payee._id)
      Toast.success(`${payee.name} approved`)
      onDone()
    } catch (e) {
      Toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Overlay onClose={onClose}>
      <PanelHeader title="Approve payee" subtitle={`Added by ${payee.makerName}`} onClose={onClose} />
      <div className="p-5 space-y-4">
        <div>
          <DetailRow label="Name">{payee.name}</DetailRow>
          <DetailRow label="Bank">
            <BankKindPill kind={payee.bankKind} /> {payee.bankName}
          </DetailRow>
          <DetailRow label="Account number" mono>
            {payee.accountNumber}
          </DetailRow>
          <DetailRow label="IFSC" mono>
            {payee.ifsc}
          </DetailRow>
          <DetailRow label="Type">{PAYEE_TYPE_LABEL[payee.type]}</DetailRow>
          {payee.mobile && <DetailRow label="Mobile">{payee.mobile}</DetailRow>}
        </div>
        {isSelf && <SelfApprovalWarning what="payee" />}
        <label className="flex items-start gap-2 text-xs">
          <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
          I have checked the account number and IFSC against a cancelled cheque or bank letter.
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
            {busy ? "Approving…" : "Approve payee"}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

/** Payee register: add once, approve once, then pay without retyping account details. */
export function PayeeRegister({ config, myId, onPay, onCountsChange }) {
  const [filter, setFilter] = useState("ACTIVE")
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [rows, setRows] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [disableTarget, setDisableTarget] = useState(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const statuses = FILTERS.find((f) => f.id === filter)?.statuses || []
      const page = await fetchBeneficiaries({ status: statuses.join(","), search: debounced })
      setRows(page.items)
      setCounts(page.counts)
      onCountsChange?.(page.counts)
    } catch (e) {
      Toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }, [filter, debounced, onCountsChange])

  useEffect(() => {
    load()
  }, [load])

  const countFor = (f) =>
    f.statuses.length
      ? f.statuses.reduce((n, s) => n + (counts[s] || 0), 0)
      : Object.values(counts).reduce((n, c) => n + c, 0)

  return (
    <div className="erp-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-4 h-4" /> Payee register
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-2xl">
            Check a payee&apos;s bank details once: one person adds them, another approves. Payments to an approved
            payee use the saved details, so nobody retypes an account number.
            {config?.requireBeneficiary ? " Only approved payees can be paid." : ""}
          </p>
        </div>
        <button type="button" className="btn-primary text-xs inline-flex items-center gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="w-3.5 h-3.5" /> Add payee
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex gap-1 flex-wrap">
          {FILTERS.map((f) => {
            const n = countFor(f)
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                  filter === f.id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                {f.label}
                {n ? <span className="ml-1.5 tabular">{n}</span> : null}
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              className="erp-input pl-8 w-56 text-xs py-1.5"
              placeholder="Name, account, IFSC…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="p-2 rounded-md border border-border hover:bg-muted/50 text-muted-foreground"
            onClick={load}
            disabled={loading}
            aria-label="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Payee</th>
              <th>Bank</th>
              <th>Account</th>
              <th>Type</th>
              <th>Status</th>
              <th>Added / approved by</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-10">
                  {loading ? "Loading…" : filter === "ACTIVE" ? "No approved payees yet — add one" : "Nothing here"}
                </td>
              </tr>
            ) : (
              rows.map((b) => {
                const isMaker = String(b.makerId) === String(myId)
                const mayApprove = Boolean(config?.canApprove && (!isMaker || config?.canSelfApprove))
                const s = PAYEE_STATUS[b.status] || { text: b.status, tone: "muted" }
                return (
                  <tr key={b._id}>
                    <td>
                      <span className="block font-semibold text-foreground">{b.name}</span>
                      {b.nickname && <span className="block text-[10px] text-muted-foreground">{b.nickname}</span>}
                    </td>
                    <td>
                      <BankKindPill kind={b.bankKind} />
                      {b.bankName && b.bankKind !== "ICICI" && (
                        <span className="block text-[10px] text-muted-foreground mt-0.5">{b.bankName}</span>
                      )}
                    </td>
                    <td className="font-mono text-[11px]">
                      <span className="block">{maskAcc(b.accountNumber)}</span>
                      <span className="block text-muted-foreground">{b.ifsc}</span>
                    </td>
                    <td>{PAYEE_TYPE_LABEL[b.type] || b.type}</td>
                    <td>
                      <Pill tone={s.tone}>{s.text}</Pill>
                      {b.rejectReason && <span className="block text-[10px] text-muted-foreground mt-0.5">{b.rejectReason}</span>}
                    </td>
                    <td className="text-[11px]">
                      <span className="block">
                        {b.makerName} · {fmtDate(b.createdAt)}
                      </span>
                      {b.checkerName && (
                        <span className="block text-muted-foreground">
                          {b.selfApproved ? "Self-approved" : b.checkerName}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {b.status === "ACTIVE" && (
                          <button
                            type="button"
                            className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-primary/40 text-primary hover:bg-primary/10 inline-flex items-center gap-1"
                            onClick={() => onPay(b)}
                          >
                            <Send className="w-3 h-3" /> Pay
                          </button>
                        )}
                        {b.status === "PENDING_APPROVAL" && mayApprove && (
                          <>
                            <button
                              type="button"
                              className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-emerald-600/40 text-emerald-800 hover:bg-emerald-500/10"
                              onClick={() => setApproveTarget(b)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-rose-600/40 text-rose-800 hover:bg-rose-500/10"
                              onClick={() => setRejectTarget(b)}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {b.status === "PENDING_APPROVAL" && !mayApprove && (
                          <span className="text-[11px] text-muted-foreground">Waiting for approver</span>
                        )}
                        {b.status === "ACTIVE" && config?.canApprove && (
                          <button
                            type="button"
                            className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-border text-muted-foreground hover:bg-muted/50 inline-flex items-center gap-1"
                            onClick={() => setDisableTarget(b)}
                          >
                            <Ban className="w-3 h-3" /> Disable
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

      {adding && (
        <AddPayeePanel
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false)
            setFilter("PENDING_APPROVAL")
            load()
          }}
        />
      )}
      {approveTarget && (
        <ApprovePayeeDialog
          payee={approveTarget}
          isSelf={String(approveTarget.makerId) === String(myId)}
          onClose={() => setApproveTarget(null)}
          onDone={() => {
            setApproveTarget(null)
            load()
          }}
        />
      )}
      {rejectTarget && (
        <ReasonDialog
          title="Reject payee"
          subtitle={rejectTarget.name}
          actionLabel="Reject"
          required
          onClose={() => setRejectTarget(null)}
          onSubmit={async (reason) => {
            try {
              await rejectBeneficiary(rejectTarget._id, reason)
              Toast.success("Payee rejected")
              setRejectTarget(null)
              load()
            } catch (e) {
              Toast.error(e.message)
            }
          }}
        />
      )}
      {disableTarget && (
        <ReasonDialog
          title="Disable payee"
          subtitle={`${disableTarget.name} — no new payments, and pending ones cannot be approved`}
          actionLabel="Disable"
          onClose={() => setDisableTarget(null)}
          onSubmit={async (reason) => {
            try {
              await disableBeneficiary(disableTarget._id, reason)
              Toast.success("Payee disabled")
              setDisableTarget(null)
              load()
            } catch (e) {
              Toast.error(e.message)
            }
          }}
        />
      )}
    </div>
  )
}
