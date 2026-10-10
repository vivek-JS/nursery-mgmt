import React, { useCallback, useEffect, useMemo, useState } from "react"
import moment from "moment"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const TONE_CLASS = {
  ok: "border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  bad: "border-rose-600/30 bg-rose-500/10 text-rose-900 dark:text-rose-100",
  muted: "border-border bg-muted/40 text-muted-foreground",
}

function Pill({ tone = "muted", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  )
}

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
const fmtDate = (d) => (d ? moment(d).format("DD-MM-YYYY") : "—")
const apiError = (e, fallback) => e?.response?.data?.message || e?.message || fallback

const KIND_LABEL = {
  RECEIVED: "Cash received",
  SPENT: "Expense",
  DEPOSITED: "Bank deposit",
  NOTED_DEPOSIT: "Noted as bank deposit in app",
}

const emptyForm = (account = "") => ({
  employeeId: "",
  entryDate: moment().format("YYYY-MM-DD"),
  amount: "",
  accountNumber: account,
  slipNumber: "",
  narration: "",
  slipPhotos: [],
})

async function uploadPhoto(file) {
  const formData = new FormData()
  formData.append("media_key", file)
  formData.append("media_type", "IMAGE")
  formData.append("content_type", "multipart/form-data")
  const res = await NetworkManager(API.MEDIA.UPLOAD).request(formData)
  return res?.data?.data?.media_url || res?.data?.media_url || null
}

/**
 * Cash book: each employee's cash in hand, and bank deposits made out of it.
 * A deposit names the employee, cannot exceed their cash in hand, and needs a slip photo.
 */
export function CashbookPanel({ accounts, defaultAccount, onCountChange }) {
  const [summary, setSummary] = useState({ startDate: null, employees: [], totals: {} })
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [deposits, setDeposits] = useState([])
  const [loadingDeposits, setLoadingDeposits] = useState(false)
  const [form, setForm] = useState(() => emptyForm(defaultAccount))
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [loadingLedger, setLoadingLedger] = useState(false)

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const res = await NetworkManager(API.BANKING.GET_CASH_IN_HAND).request()
      const body = res?.data ?? {}
      setSummary({
        startDate: body.startDate || null,
        employees: body.employees ?? [],
        totals: body.totals ?? {},
      })
    } catch (e) {
      Toast.error(apiError(e, "Failed to load cash in hand"))
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const fetchDeposits = useCallback(async () => {
    setLoadingDeposits(true)
    try {
      const res = await NetworkManager(API.BANKING.GET_CASH_DEPOSITS).request()
      setDeposits(res?.data?.data ?? [])
    } catch (e) {
      Toast.error(apiError(e, "Failed to load cash deposits"))
      setDeposits([])
    } finally {
      setLoadingDeposits(false)
    }
  }, [])

  const openLedger = useCallback(async (employeeId) => {
    if (!employeeId) return
    setLoadingLedger(true)
    setLedger({ employeeId, employee: null, entries: [] })
    try {
      const res = await NetworkManager(API.BANKING.GET_EMPLOYEE_CASH_BOOK).request(
        {},
        { pathParams: [String(employeeId)] }
      )
      const body = res?.data ?? {}
      setLedger({ employeeId, employee: body.employee, entries: body.entries ?? [] })
    } catch (e) {
      Toast.error(apiError(e, "Failed to load the employee's cash book"))
      setLedger(null)
    } finally {
      setLoadingLedger(false)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchSummary(), fetchDeposits()])
  }, [fetchSummary, fetchDeposits])

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  useEffect(() => {
    if (!form.accountNumber && defaultAccount) setForm((f) => ({ ...f, accountNumber: defaultAccount }))
  }, [defaultAccount, form.accountNumber])

  const unverifiedCount = useMemo(() => deposits.filter((d) => !d.depositVerified).length, [deposits])
  useEffect(() => {
    onCountChange?.(unverifiedCount)
  }, [unverifiedCount, onCountChange])

  const employees = summary.employees.filter((e) => e.employeeId)
  const selected = employees.find((e) => String(e.employeeId) === String(form.employeeId))
  const available = selected ? Math.max(0, Number(selected.cashInHand) || 0) : 0
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const startDeposit = (row) => {
    set({ employeeId: String(row.employeeId), amount: row.cashInHand > 0 ? String(row.cashInHand) : "" })
    document.getElementById("cashbook-deposit-form")?.scrollIntoView({ behavior: "smooth", block: "center" })
  }

  const handlePhotos = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ""
    if (!files.length) return
    setUploading(true)
    try {
      const urls = (await Promise.all(files.map(uploadPhoto))).filter(Boolean)
      if (!urls.length) throw new Error("Upload returned no image link")
      set({ slipPhotos: [...form.slipPhotos, ...urls] })
    } catch (err) {
      Toast.error(apiError(err, "Photo upload failed"))
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const amount = Number(form.amount)
    const account = form.accountNumber || defaultAccount
    if (!form.employeeId) return Toast.error("Select the employee whose cash is being deposited")
    if (!(amount > 0)) return Toast.error("Enter a deposit amount")
    if (amount - available > 0.01) {
      return Toast.error(`Amount is more than ${selected?.name || "the employee"}'s cash in hand (${inr(available)})`)
    }
    if (!account) return Toast.error("Select a bank account")
    if (!form.slipPhotos.length) return Toast.error("Attach a photo of the deposit slip")
    setSaving(true)
    try {
      const res = await NetworkManager(API.BANKING.POST_CASH_DEPOSIT).request({ ...form, amount, accountNumber: account })
      const left = res?.data?.cashInHandAfter
      Toast.success(
        left != null ? `Deposit saved. ${selected?.name || "Employee"} now holds ${inr(left)}` : "Deposit saved"
      )
      setForm(emptyForm(account))
      await refreshAll()
      if (ledger?.employeeId === form.employeeId) void openLedger(form.employeeId)
    } catch (err) {
      Toast.error(apiError(err, "Could not save deposit"))
    } finally {
      setSaving(false)
    }
  }

  const handleVerify = async (deposit) => {
    setBusyId(String(deposit._id))
    try {
      const res = await NetworkManager(API.BANKING.POST_VERIFY_CASH_DEPOSIT).request(
        {},
        { pathParams: [String(deposit._id)] }
      )
      const body = res?.data ?? {}
      if (body.matched === false) Toast.error(body.message || "No matching bank credit yet")
      else Toast.success("Deposit matched to the bank credit")
      await refreshAll()
    } catch (e) {
      Toast.error(apiError(e, "Verification failed"))
    } finally {
      setBusyId(null)
    }
  }

  const handleCancel = async (deposit) => {
    const reason = window.prompt(
      `Cancel the ${inr(deposit.amount)} deposit? The amount goes back to the employee's cash in hand.\n\nReason:`,
      ""
    )
    if (reason === null) return
    setBusyId(String(deposit._id))
    try {
      await NetworkManager(API.BANKING.POST_CANCEL_CASH_DEPOSIT).request(
        { reason },
        { pathParams: [String(deposit._id)] }
      )
      Toast.success("Deposit cancelled")
      await refreshAll()
    } catch (e) {
      Toast.error(apiError(e, "Could not cancel the deposit"))
    } finally {
      setBusyId(null)
    }
  }

  const totals = summary.totals || {}

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-3xl">
          Cash in hand = cash payments the employee recorded (or that were booked under them) − their
          expenses − bank deposits below. Counting starts {fmtDate(summary.startDate)}. Rejected
          payments are left out; payments still awaiting confirmation are included because the
          employee already holds that cash.
        </p>
        <button
          type="button"
          className="text-xs font-semibold px-3 py-1.5 rounded-sm border border-border hover:bg-muted disabled:opacity-50"
          onClick={refreshAll}
          disabled={loadingSummary}
        >
          {loadingSummary ? "…" : "Refresh"}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Stat label="Cash in hand (all employees)" value={inr(totals.cashInHand)} />
        <Stat label="Awaiting confirmation" value={inr(totals.receivedAwaiting)} />
        <Stat label="Deposits not yet matched to bank" value={inr(totals.depositedUnverified)} />
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th className="text-right">Cash received</th>
              <th className="text-right">Expenses</th>
              <th className="text-right">Deposited</th>
              <th className="text-right">Cash in hand</th>
              <th>Last activity</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loadingSummary && employees.length === 0 ? (
              <EmptyRow colSpan={7}>Loading…</EmptyRow>
            ) : summary.employees.length === 0 ? (
              <EmptyRow colSpan={7}>No cash movements since {fmtDate(summary.startDate)}</EmptyRow>
            ) : (
              summary.employees.map((e) => (
                <tr key={String(e.employeeId || "unlinked")}>
                  <td>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {[e.role, e.phoneNumber].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td className="tabular text-right">
                    {inr(e.received)}
                    {e.receivedAwaiting > 0 && (
                      <div className="text-[11px] text-amber-700">{inr(e.receivedAwaiting)} awaiting</div>
                    )}
                  </td>
                  <td className="tabular text-right">{inr(e.spent)}</td>
                  <td className="tabular text-right">
                    {inr(e.deposited)}
                    {e.depositedUnverified > 0 && (
                      <div className="text-[11px] text-amber-700">{inr(e.depositedUnverified)} not matched</div>
                    )}
                    {e.notedDepositInApp > 0 && (
                      <div
                        className="text-[11px] text-muted-foreground"
                        title="Entered in the cashier app as a bank deposit expense. Record it here with the slip photo to reduce cash in hand."
                      >
                        {inr(e.notedDepositInApp)} noted in app
                      </div>
                    )}
                  </td>
                  <td className="tabular text-right">
                    <span className={`font-bold ${e.cashInHand < 0 ? "text-rose-700" : ""}`}>{inr(e.cashInHand)}</span>
                  </td>
                  <td className="text-[11px]">{fmtDate(e.lastActivity)}</td>
                  <td>
                    {e.employeeId ? (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-teal-600/40 text-teal-800 hover:bg-teal-500/10 disabled:opacity-50"
                          disabled={!(e.cashInHand > 0)}
                          onClick={() => startDeposit(e)}
                        >
                          Deposit
                        </button>
                        <button
                          type="button"
                          className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-border hover:bg-muted"
                          onClick={() => openLedger(e.employeeId)}
                        >
                          Cash book
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {ledger && (
        <EmployeeLedger ledger={ledger} loading={loadingLedger} onClose={() => setLedger(null)} />
      )}

      <form
        id="cashbook-deposit-form"
        onSubmit={handleSave}
        className="rounded-md border border-border p-3 space-y-3"
      >
        <div className="text-xs font-semibold">Record a bank deposit</div>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-[11px] font-semibold text-muted-foreground">
            Employee
            <select
              className="erp-input block mt-1 text-xs min-w-[14rem]"
              value={form.employeeId}
              onChange={(e) => set({ employeeId: e.target.value })}
            >
              <option value="">Select…</option>
              {employees.map((e) => (
                <option key={String(e.employeeId)} value={String(e.employeeId)}>
                  {e.name} — {inr(e.cashInHand)} in hand
                </option>
              ))}
            </select>
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground">
            Date
            <input
              type="date"
              className="erp-input block mt-1 text-xs"
              value={form.entryDate}
              min={summary.startDate ? moment(summary.startDate).format("YYYY-MM-DD") : undefined}
              max={moment().format("YYYY-MM-DD")}
              onChange={(e) => set({ entryDate: e.target.value })}
            />
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground">
            Amount{selected ? ` (max ${inr(available)})` : ""}
            <input
              type="number"
              min="0"
              step="0.01"
              max={selected ? available : undefined}
              className="erp-input block mt-1 text-xs"
              value={form.amount}
              onChange={(e) => set({ amount: e.target.value })}
            />
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground">
            Bank account
            {accounts.length > 0 ? (
              <select
                className="erp-input block mt-1 text-xs"
                value={form.accountNumber || defaultAccount || ""}
                onChange={(e) => set({ accountNumber: e.target.value })}
              >
                <option value="">Select…</option>
                {accounts.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className="erp-input block mt-1 text-xs"
                value={form.accountNumber}
                onChange={(e) => set({ accountNumber: e.target.value })}
              />
            )}
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground">
            Slip no.
            <input
              type="text"
              className="erp-input block mt-1 text-xs"
              value={form.slipNumber}
              onChange={(e) => set({ slipNumber: e.target.value })}
            />
          </label>
          <label className="text-[11px] font-semibold text-muted-foreground flex-1 min-w-[12rem]">
            Narration
            <input
              type="text"
              className="erp-input block mt-1 text-xs w-full"
              value={form.narration}
              onChange={(e) => set({ narration: e.target.value })}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-[11px] font-semibold text-muted-foreground">
            Slip photo (required)
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="block mt-1 text-xs"
              disabled={uploading}
              onChange={handlePhotos}
            />
          </label>
          {uploading && <span className="text-[11px] text-muted-foreground">Uploading…</span>}
          {form.slipPhotos.map((url, i) => (
            <div key={url} className="relative">
              <a href={url} target="_blank" rel="noreferrer">
                <img src={url} alt={`Slip ${i + 1}`} className="w-14 h-14 object-cover rounded border border-border" />
              </a>
              <button
                type="button"
                aria-label="Remove photo"
                className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full w-4 h-4 text-[10px] leading-4"
                onClick={() => set({ slipPhotos: form.slipPhotos.filter((_, j) => j !== i) })}
              >
                ×
              </button>
            </div>
          ))}
          <button type="submit" className="btn-primary text-xs ml-auto" disabled={saving || uploading}>
            {saving ? "…" : "Save deposit"}
          </button>
        </div>
      </form>

      <div>
        <div className="text-xs font-semibold mb-2">Bank deposits</div>
        <p className="text-[11px] text-muted-foreground mb-2">
          Verify matches a deposit to the bank credit on the statement (same account and amount, within 2 days).
        </p>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Slip no.</th>
                <th>Photo</th>
                <th className="text-right">Amount</th>
                <th>Bank</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loadingDeposits ? (
                <EmptyRow colSpan={8}>Loading…</EmptyRow>
              ) : deposits.length === 0 ? (
                <EmptyRow colSpan={8}>No cash deposits yet</EmptyRow>
              ) : (
                deposits.map((d) => {
                  const busy = busyId === String(d._id)
                  const photos = d.slipPhotos || []
                  return (
                    <tr key={String(d._id)}>
                      <td>{fmtDate(d.entryDate)}</td>
                      <td>
                        {d.depositedBy?.name || "—"}
                        {d.createdBy?.name && (
                          <div className="text-[11px] text-muted-foreground">by {d.createdBy.name}</div>
                        )}
                      </td>
                      <td>{d.slipNumber || "—"}</td>
                      <td>
                        {photos.length ? (
                          <div className="flex gap-1">
                            {photos.map((url, i) => (
                              <a key={url} href={url} target="_blank" rel="noreferrer">
                                <img
                                  src={url}
                                  alt={`Slip ${i + 1}`}
                                  className="w-9 h-9 object-cover rounded border border-border"
                                />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="tabular text-right">{inr(d.amount)}</td>
                      <td>{d.accountNumber || "—"}</td>
                      <td>
                        {d.depositVerified ? <Pill tone="ok">Matched to bank</Pill> : <Pill tone="warn">Not matched</Pill>}
                      </td>
                      <td>
                        {d.depositVerified ? (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        ) : (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-teal-600/40 text-teal-800 hover:bg-teal-500/10 disabled:opacity-50"
                              disabled={busy}
                              onClick={() => handleVerify(d)}
                            >
                              {busy ? "…" : "Verify"}
                            </button>
                            <button
                              type="button"
                              className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-rose-600/40 text-rose-800 hover:bg-rose-500/10 disabled:opacity-50"
                              disabled={busy}
                              onClick={() => handleCancel(d)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-border px-3 py-2 min-w-[12rem]">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular">{value}</div>
    </div>
  )
}

function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center text-sm text-muted-foreground py-6">
        {children}
      </td>
    </tr>
  )
}

function EmployeeLedger({ ledger, loading, onClose }) {
  const emp = ledger.employee
  return (
    <div className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-xs font-semibold">
          Cash book — {emp?.name || "…"}
          {emp && <span className="ml-2 font-normal text-muted-foreground">Cash in hand {inr(emp.cashInHand)}</span>}
        </div>
        <button type="button" className="text-[11px] font-semibold px-2 py-1 rounded-sm border border-border" onClick={onClose}>
          Close
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Details</th>
                <th className="text-right">In</th>
                <th className="text-right">Out</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ledger.entries.length === 0 ? (
                <EmptyRow colSpan={6}>No cash movements</EmptyRow>
              ) : (
                ledger.entries.map((r) => {
                  const isIn = r.kind === "RECEIVED"
                  const isOut = r.kind === "SPENT" || r.kind === "DEPOSITED"
                  return (
                    <tr key={`${r.kind}-${r.refId}`} className={r.kind === "NOTED_DEPOSIT" ? "opacity-60" : ""}>
                      <td>{fmtDate(r.date)}</td>
                      <td>
                        {KIND_LABEL[r.kind] || r.kind}
                        {r.kind === "RECEIVED" && !r.confirmed && (
                          <span className="ml-1">
                            <Pill tone="warn">Awaiting confirmation</Pill>
                          </span>
                        )}
                        {r.kind === "DEPOSITED" && (
                          <span className="ml-1">
                            {r.confirmed ? <Pill tone="ok">Matched</Pill> : <Pill tone="warn">Not matched</Pill>}
                          </span>
                        )}
                      </td>
                      <td>
                        <div>{r.title}</div>
                        {r.detail && <div className="text-[11px] text-muted-foreground">{r.detail}</div>}
                        {(r.photos || []).map((url) => (
                          <a key={url} href={url} target="_blank" rel="noreferrer" className="text-[11px] underline mr-2">
                            Slip photo
                          </a>
                        ))}
                      </td>
                      <td className="tabular text-right">{isIn ? inr(r.amount) : ""}</td>
                      <td className="tabular text-right">{isOut ? inr(r.amount) : r.kind === "NOTED_DEPOSIT" ? `(${inr(r.amount)})` : ""}</td>
                      <td className="tabular text-right">{inr(r.balanceAfter)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
