import React, { useRef, useState } from "react"
import * as XLSX from "xlsx"
import { CheckCircle2, Download, FileSpreadsheet, Upload, XCircle } from "lucide-react"
import {
  bulkApproveBeneficiaries,
  bulkApprovePayouts,
  bulkCreateBeneficiaries,
  bulkCreatePayouts,
  bulkRejectBeneficiaries,
  bulkRejectPayouts
} from "./payoutsApi"
import { downloadSheetsXlsx } from "utils/exportExcel"
import { Field, Overlay, PanelHeader, Pill, fmtAmount, maskAcc } from "./payoutsUi"

const MAX_ROWS = 500
const APPROVE_CHUNK = 5
const DECIDE_CHUNK = 50

const MODE_LABEL = { RGS: "NEFT", RTG: "RTGS", IFS: "IMPS", TPA: "ICICI to ICICI" }

/** Template columns: header shown in Excel, API key, and other header spellings people use. */
const COLUMNS = {
  payment: [
    { header: "Payee name", key: "payeeName", aliases: ["name", "beneficiaryname", "payee"] },
    { header: "Account number", key: "accountNumber", aliases: ["accountno", "account", "acno", "acnumber", "bankaccount"] },
    { header: "IFSC", key: "ifsc", aliases: ["ifsccode"] },
    { header: "Mode (NEFT / RTGS / IMPS / ICICI)", key: "mode", aliases: ["mode", "paymentmode", "txntype", "transfertype"] },
    { header: "Amount", key: "amount", aliases: ["amountrs", "amountinr", "rs"] },
    { header: "Purpose", key: "purpose", aliases: [] },
    { header: "Bill / reference no", key: "referenceNo", aliases: ["referenceno", "reference", "billno", "invoiceno", "refno"] },
    { header: "Remarks", key: "remarks", aliases: ["narration", "note"] },
    { header: "Payee type", key: "payeeType", aliases: ["type"] },
    { header: "Bank name", key: "bankName", aliases: [] }
  ],
  payee: [
    { header: "Payee name", key: "name", aliases: ["name", "beneficiaryname", "payee"] },
    { header: "Account number", key: "accountNumber", aliases: ["accountno", "account", "acno", "acnumber", "bankaccount"] },
    { header: "IFSC", key: "ifsc", aliases: ["ifsccode"] },
    { header: "Bank (ICICI / Other)", key: "bank", aliases: ["bank", "bankkind", "icici"] },
    { header: "Type", key: "type", aliases: ["payeetype"] },
    { header: "Short name", key: "nickname", aliases: ["nickname", "alias"] },
    { header: "Mobile", key: "mobile", aliases: ["phone", "mobileno", "phoneno"] },
    { header: "Bank name", key: "bankName", aliases: [] }
  ]
}

const SAMPLES = {
  payment: [
    ["ABC Traders", "50100012345678", "HDFC0001234", "NEFT", 25000, "Vendor bill", "INV 1042", "October supply", "Vendor", "HDFC Bank"],
    ["Ramesh Patil", "000401234567", "ICIC0000004", "ICICI", 1500, "Farmer refund", "", "", "Farmer", ""]
  ],
  payee: [
    ["ABC Traders", "50100012345678", "HDFC0001234", "Other", "Vendor", "ABC", "9876543210", "HDFC Bank"],
    ["Ramesh Patil", "000401234567", "ICIC0000004", "ICICI", "Farmer", "", "", ""]
  ]
}

const HELP = {
  payment: [
    ["Column", "What to fill"],
    ["Payee name", "Letters, numbers and spaces only (no & . , -). For an approved payee the register name is used."],
    ["Account number", "Keep this column as Text so long numbers and leading zeros stay exact."],
    ["IFSC", "11 characters, e.g. HDFC0001234. Not needed for ICICI to ICICI."],
    ["Mode", "NEFT, RTGS (₹2 lakh or more), IMPS, or ICICI (ICICI to ICICI transfer)."],
    ["Amount", "Rupees, up to 2 decimals. Commas are fine."],
    ["Purpose", "Vendor bill, Farmer refund, Dealer commission, Salary, Advance or Other (default)."],
    ["Payee type", "Vendor (default), Farmer, Dealer, Employee or Other."],
    ["", ""],
    ["After upload", "Every row is checked first. Nothing is created until you confirm. Created payments wait for ERP approval, then ICICI net-banking approval."]
  ],
  payee: [
    ["Column", "What to fill"],
    ["Payee name", "Letters, numbers and spaces only, as on the bank account."],
    ["Account number", "Keep this column as Text so long numbers and leading zeros stay exact."],
    ["IFSC", "11 characters. The bank is worked out from it (ICIC… is ICICI)."],
    ["Bank", "Optional: ICICI or Other. Must match the IFSC."],
    ["Type", "Vendor (default), Farmer, Dealer, Employee or Other."],
    ["Mobile", "Optional, 10 digits."],
    ["", ""],
    ["After upload", "Every row is checked first. Created payees wait for approval before they can be paid."]
  ]
}

const squash = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "")

function columnFor(kind, header) {
  const h = squash(header)
  if (!h) return null
  return COLUMNS[kind].find((c) => squash(c.header) === h || squash(c.key) === h || c.aliases.includes(h)) || null
}

export function downloadTemplate(kind) {
  downloadSheetsXlsx(
    kind === "payment" ? "payments-upload-template" : "payees-upload-template",
    [
      { title: kind === "payment" ? "Payments" : "Payees", headers: COLUMNS[kind].map((c) => c.header), rows: SAMPLES[kind] },
      { title: "How to fill", headers: HELP[kind][0], rows: HELP[kind].slice(1) }
    ],
    { stamp: false }
  )
}

async function readRows(file, kind) {
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" })
  const ws = wb.Sheets[wb.SheetNames[0]]
  if (!ws) throw new Error("The file has no sheets")
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "", blankrows: false })
  const headerIndex = grid.findIndex((r) => r.filter((v) => columnFor(kind, v)).length >= 2)
  if (headerIndex < 0) throw new Error("Could not find the header row. Use the template's column names.")
  const cols = grid[headerIndex].map((h) => columnFor(kind, h))
  const missing = ["accountNumber", kind === "payment" ? "amount" : "ifsc"].filter(
    (k) => !cols.some((c) => c?.key === k)
  )
  if (missing.length) {
    const names = missing.map((k) => COLUMNS[kind].find((c) => c.key === k).header)
    throw new Error(`Missing column: ${names.join(", ")}`)
  }
  const rows = grid
    .slice(headerIndex + 1)
    .filter((r) => r.some((v) => String(v).trim()))
    .map((r) => {
      const row = {}
      cols.forEach((c, i) => {
        if (c && String(r[i] ?? "").trim()) row[c.key] = String(r[i]).trim()
      })
      return row
    })
  if (!rows.length) throw new Error("The sheet has a header but no rows")
  if (rows.length > MAX_ROWS) throw new Error(`At most ${MAX_ROWS} rows per upload (this file has ${rows.length})`)
  if (rows.some((r) => /e\+/i.test(r.accountNumber || ""))) {
    throw new Error("Some account numbers look like 5.01E+13. Format the Account number column as Text and type them again.")
  }
  return rows
}

const rowMessages = (r) => [
  ...Object.values(r.errors || {}),
  ...(r.duplicate ? [`Possible duplicate: ${r.duplicate}`] : []),
  ...(r.warnings || [])
]

const VERDICT = {
  ok: { tone: "ok", label: "Ready" },
  warning: { tone: "warn", label: "Check" },
  error: { tone: "bad", label: "Error" }
}

/** Upload an Excel sheet, review every row, then create the valid ones. */
export function ExcelUploadPanel({ kind, onClose, onCreated }) {
  const isPayment = kind === "payment"
  const fileRef = useRef(null)
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState(null)
  const [check, setCheck] = useState(null)
  const [result, setResult] = useState(null)
  const [batchName, setBatchName] = useState("")
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [filter, setFilter] = useState("all")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const runCheck = async (list, withDuplicates = includeDuplicates) => {
    const data = isPayment
      ? await bulkCreatePayouts(list, { dryRun: true, confirmDuplicates: withDuplicates })
      : await bulkCreateBeneficiaries(list, { dryRun: true })
    setCheck(data)
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setError("")
    setCheck(null)
    setResult(null)
    setBusy(true)
    try {
      const list = await readRows(file, kind)
      setFileName(file.name)
      setRows(list)
      if (!batchName) setBatchName(file.name.replace(/\.[^.]+$/, "").slice(0, 80))
      await runCheck(list)
    } catch (err) {
      setRows(null)
      setError(err.message || "Could not read the file")
    } finally {
      setBusy(false)
    }
  }

  const toggleDuplicates = async (on) => {
    setIncludeDuplicates(on)
    if (!rows) return
    setBusy(true)
    try {
      await runCheck(rows, on)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const create = async () => {
    setBusy(true)
    setError("")
    try {
      const data = isPayment
        ? await bulkCreatePayouts(rows, { dryRun: false, confirmDuplicates: includeDuplicates, batchName })
        : await bulkCreateBeneficiaries(rows, { dryRun: false })
      setResult(data)
      onCreated?.(data)
    } catch (err) {
      setError(err.message || "Could not create")
    } finally {
      setBusy(false)
    }
  }

  const downloadProblems = () => {
    const problems = (result || check).rows.filter((r) => r.verdict !== "ok" && !r.created)
    const cols = COLUMNS[kind]
    downloadSheetsXlsx(`${isPayment ? "payments" : "payees"}-upload-problems`, [
      {
        title: "Fix these rows",
        headers: ["File row", ...cols.map((c) => c.header), "Problem"],
        rows: problems.map((r) => [r.row, ...cols.map((c) => rows[r.row - 1]?.[c.key] ?? ""), rowMessages(r).join("; ")])
      }
    ])
  }

  const s = check?.summary
  const shown = (result || check)?.rows.filter((r) => filter === "all" || r.verdict === filter) || []
  const problemCount = s ? s.errors + (s.warnings || 0) : 0

  return (
    <Overlay onClose={busy ? undefined : onClose} side>
      <PanelHeader
        title={isPayment ? "Upload payments from Excel" : "Upload payees from Excel"}
        subtitle={
          isPayment
            ? "Every row is checked like a single payment. Created payments wait for ERP approval."
            : "Every row is checked like a single payee. Created payees wait for approval."
        }
        onClose={onClose}
      />
      <div className="p-5 space-y-4">
        {!result && (
          <div className="rounded-md border border-dashed border-border p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
                onClick={() => downloadTemplate(kind)}
              >
                <Download className="w-3.5 h-3.5" /> Download template
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-primary bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                <Upload className="w-3.5 h-3.5" /> {rows ? "Choose another file" : "Choose Excel file"}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
            </div>
            <p className="text-[11px] text-muted-foreground">
              .xlsx, .xls or .csv, up to {MAX_ROWS} rows. The first sheet is read; column names can be in any order.
            </p>
            {fileName && (
              <p className="text-[11px] text-foreground inline-flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5" /> {fileName} · {rows?.length || 0} rows
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-rose-600/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-900">{error}</div>
        )}
        {busy && !check && <p className="text-xs text-muted-foreground">Checking rows…</p>}

        {result && (
          <div className="rounded-md border border-emerald-600/30 bg-emerald-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-bold text-emerald-900 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> {result.summary.created} {isPayment ? "payments" : "payees"} created
            </p>
            {isPayment && result.batch && (
              <p className="text-[11px] text-emerald-900">
                Batch <span className="font-mono">{result.batch.id}</span> · {result.batch.name} ·{" "}
                {fmtAmount(result.summary.creatableAmount)}. They are now awaiting ERP approval.
              </p>
            )}
            {result.summary.total > result.summary.created && (
              <p className="text-[11px] text-emerald-900">
                {result.summary.total - result.summary.created} rows were skipped — download them below, fix and upload again.
              </p>
            )}
          </div>
        )}

        {s && (
          <>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", `All ${s.total}`, "muted"],
                ["ok", `Ready ${s.ok}`, "ok"],
                ...(isPayment ? [["warning", `Possible duplicate ${s.warnings}`, "warn"]] : []),
                ["error", `Errors ${s.errors}`, "bad"]
              ].map(([key, label, tone]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`rounded-md ${filter === key ? "ring-2 ring-primary/50" : ""}`}
                >
                  <Pill tone={tone}>{label}</Pill>
                </button>
              ))}
            </div>

            <div className="border border-border rounded-md overflow-auto max-h-[45vh]">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr className="text-left text-[11px] text-muted-foreground">
                    <th className="px-2 py-1.5 font-semibold">Row</th>
                    <th className="px-2 py-1.5 font-semibold">Payee</th>
                    {isPayment && <th className="px-2 py-1.5 font-semibold">Mode</th>}
                    {isPayment && <th className="px-2 py-1.5 font-semibold text-right">Amount</th>}
                    <th className="px-2 py-1.5 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.row} className="border-t border-border/60 align-top">
                      <td className="px-2 py-1.5 text-muted-foreground">{r.row}</td>
                      <td className="px-2 py-1.5">
                        <div className="font-semibold text-foreground">{r.payeeName || r.name || "—"}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {maskAcc(r.accountNumber)} {r.ifsc || ""}
                        </div>
                        {r.registeredPayee && <div className="text-[11px] text-emerald-800">Approved payee</div>}
                      </td>
                      {isPayment && <td className="px-2 py-1.5">{MODE_LABEL[r.txnType] || r.txnType || "—"}</td>}
                      {isPayment && <td className="px-2 py-1.5 text-right tabular-nums">{fmtAmount(r.amount)}</td>}
                      <td className="px-2 py-1.5">
                        {r.created ? (
                          <Pill tone="ok">Created{r.created.uniqueId ? ` ${r.created.uniqueId}` : ""}</Pill>
                        ) : (
                          <Pill tone={VERDICT[r.verdict]?.tone}>{VERDICT[r.verdict]?.label}</Pill>
                        )}
                        {rowMessages(r).map((m) => (
                          <div
                            key={m}
                            className={`text-[11px] mt-0.5 ${r.verdict === "error" ? "text-rose-700" : "text-amber-800"}`}
                          >
                            {m}
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                  {!shown.length && (
                    <tr>
                      <td colSpan={5} className="px-2 py-4 text-center text-muted-foreground">
                        No rows here
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {problemCount > 0 && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                onClick={downloadProblems}
              >
                <Download className="w-3.5 h-3.5" /> Download rows that need fixing
              </button>
            )}

            {!result && (
              <div className="space-y-3 border-t border-border pt-4">
                {isPayment && (
                  <Field label="Batch name" hint="Shown on every payment so the batch is easy to find and approve.">
                    <input
                      className="erp-input w-full text-xs"
                      value={batchName}
                      maxLength={80}
                      onChange={(e) => setBatchName(e.target.value)}
                    />
                  </Field>
                )}
                {isPayment && s.warnings > 0 && (
                  <label className="flex items-start gap-2 text-[11px] text-amber-900">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={includeDuplicates}
                      disabled={busy}
                      onChange={(e) => toggleDuplicates(e.target.checked)}
                    />
                    Also create the {s.warnings} possible duplicates (I checked they are separate payments)
                  </label>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-muted-foreground">
                    {s.creatable
                      ? `${s.creatable} will be created${isPayment ? `, total ${fmtAmount(s.creatableAmount)}` : ""}. Rows with errors are skipped.`
                      : "Nothing can be created yet — fix the rows and upload again."}
                  </p>
                  <button
                    type="button"
                    className="shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md border border-primary bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    disabled={busy || !s.creatable}
                    onClick={create}
                  >
                    {busy ? "Working…" : `Create ${s.creatable} ${isPayment ? "payments" : "payees"}`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {result && (
          <div className="flex justify-end">
            <button
              type="button"
              className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </Overlay>
  )
}

/** Sticky bar shown while rows are ticked. */
export function BulkActionBar({ count, amount, noun, onApprove, onReject, onClear }) {
  if (!count) return null
  return (
    <div className="sticky bottom-2 z-20 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-card px-4 py-2.5 shadow-lg">
      <p className="text-xs font-semibold text-foreground">
        {count} {noun}
        {count === 1 ? "" : "s"} selected
        {amount != null && <span className="text-muted-foreground font-normal"> · {fmtAmount(amount)}</span>}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
          onClick={onClear}
        >
          Clear
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-rose-600 text-rose-700 hover:bg-rose-500/10"
          onClick={onReject}
        >
          Reject {count}
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800"
          onClick={onApprove}
        >
          Approve {count}
        </button>
      </div>
    </div>
  )
}

const RUNNERS = {
  payment: { approve: bulkApprovePayouts, reject: bulkRejectPayouts },
  payee: { approve: bulkApproveBeneficiaries, reject: bulkRejectBeneficiaries }
}

/**
 * Confirm, then approve or reject the selected items in small chunks so progress is visible.
 * `items`: [{ id, label, amount?, isSelf }]
 */
export function BulkDecisionDialog({ kind, action, items, onClose, onFinished }) {
  const isApprove = action === "approve"
  const isPayment = kind === "payment"
  const noun = isPayment ? "payment" : "payee"
  const [text, setText] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [results, setResults] = useState(null)
  const [error, setError] = useState("")

  const total = items.reduce((sum, x) => sum + (Number(x.amount) || 0), 0)
  const selfCount = items.filter((x) => x.isSelf).length
  const labelOf = Object.fromEntries(items.map((x) => [x.id, x.label]))
  const chunk = isApprove && isPayment ? APPROVE_CHUNK : DECIDE_CHUNK

  const run = async () => {
    setRunning(true)
    setError("")
    const all = []
    try {
      for (let i = 0; i < items.length; i += chunk) {
        const ids = items.slice(i, i + chunk).map((x) => x.id)
        const data = await RUNNERS[kind][action](ids, text.trim() || undefined)
        all.push(...data.items)
        setDone(all.length)
      }
    } catch (err) {
      setError(err.message || "Stopped")
    }
    setResults(all)
    setRunning(false)
    onFinished?.()
  }

  const ok = results?.filter((r) => r.ok) || []
  const failed = results?.filter((r) => !r.ok) || []
  const needsReason = !isApprove && !text.trim()

  return (
    <Overlay onClose={running ? undefined : onClose}>
      <PanelHeader
        title={`${isApprove ? "Approve" : "Reject"} ${items.length} ${noun}${items.length === 1 ? "" : "s"}`}
        subtitle={
          isPayment
            ? isApprove
              ? `${fmtAmount(total)} in total. Each is sent to ICICI and then waits for net-banking approval.`
              : `${fmtAmount(total)} in total. Rejected payments are not sent to the bank.`
            : isApprove
              ? "Approved payees can be paid straight away."
              : "Rejected payees cannot be paid."
        }
        onClose={running ? () => {} : onClose}
      />
      <div className="p-5 space-y-4">
        {!results && !running && (
          <>
            <div className="max-h-40 overflow-auto rounded-md border border-border divide-y divide-border/60">
              {items.map((x) => (
                <div key={x.id} className="flex justify-between gap-3 px-3 py-1.5 text-xs">
                  <span className="truncate">
                    {x.label}
                    {x.isSelf && <span className="text-amber-700"> · created by you</span>}
                  </span>
                  {x.amount != null && <span className="tabular-nums shrink-0">{fmtAmount(x.amount)}</span>}
                </div>
              ))}
            </div>
            {isApprove && selfCount > 0 && (
              <div className="rounded-md bg-amber-500/10 border border-amber-500/40 px-3 py-2 text-[11px] text-amber-950">
                You created {selfCount} of these. As super admin you can approve them yourself; they will be recorded
                as self-approved.
              </div>
            )}
            <Field label={isApprove ? "Note (optional)" : "Reason (shown to the maker)"}>
              <textarea
                className="erp-input w-full text-xs min-h-[64px]"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </Field>
            {isApprove && isPayment && (
              <label className="flex items-start gap-2 text-[11px] text-foreground">
                <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
                I checked the payees, accounts and amounts ({fmtAmount(total)} in total)
              </label>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
                onClick={onClose}
              >
                Back
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border text-white disabled:opacity-50 ${
                  isApprove ? "border-emerald-700 bg-emerald-700 hover:bg-emerald-800" : "border-rose-600 bg-rose-600 hover:bg-rose-700"
                }`}
                disabled={needsReason || (isApprove && isPayment && !confirmed)}
                onClick={run}
              >
                {isApprove ? "Approve" : "Reject"} {items.length}
              </button>
            </div>
          </>
        )}

        {running && (
          <div className="space-y-2">
            <p className="text-xs text-foreground">
              {isApprove && isPayment ? "Sending to ICICI one by one" : "Working"} — {done} of {items.length}
            </p>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
            </div>
            <p className="text-[11px] text-muted-foreground">Keep this window open until it finishes.</p>
          </div>
        )}

        {results && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Pill tone="ok">
                <CheckCircle2 className="w-3 h-3" /> {ok.length} {isApprove ? "approved" : "rejected"}
              </Pill>
              {failed.length > 0 && (
                <Pill tone="bad">
                  <XCircle className="w-3 h-3" /> {failed.length} failed
                </Pill>
              )}
              {results.length < items.length && <Pill tone="warn">{items.length - results.length} not processed</Pill>}
            </div>
            {error && <p className="text-xs text-rose-700">{error}</p>}
            {failed.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md border border-rose-600/30 divide-y divide-border/60">
                {failed.map((r) => (
                  <div key={r.id} className="px-3 py-1.5 text-xs">
                    <span className="font-semibold">{labelOf[r.id] || r.uniqueId || r.id}</span>
                    <span className="text-rose-700"> — {r.error}</span>
                  </div>
                ))}
              </div>
            )}
            {isApprove && isPayment && ok.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Next: approve them in ICICI net banking. Their status updates here automatically.
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Overlay>
  )
}
