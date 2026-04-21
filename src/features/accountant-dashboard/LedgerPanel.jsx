import React from "react"
import {
  X,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Sprout,
  Wallet,
  Hash,
  Receipt,
  Banknote
} from "lucide-react"
import { cn } from "lib/cn"
import { formatFarmerLedgerRunningBalance } from "./normalize"
import { Toast } from "helpers/toasts/toastHelper"
import {
  transferFarmerPlantAdvance,
  searchFarmersForLedgerTransfer,
  searchFarmerPlantOrdersForTransfer,
  createFarmerPlantLedgerManualEntry
} from "./paymentsApi"

const fmt = (n) => `₹${Math.abs(Number(n) || 0).toLocaleString("en-IN")}`

/** Plain rupee for display (no forced abs — caller decides sign wording). */
const fmtPlain = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const defaultLedgerApis = {
  searchTargets: searchFarmersForLedgerTransfer,
  searchOrders: searchFarmerPlantOrdersForTransfer,
  transferAdvance: transferFarmerPlantAdvance,
  createManualEntry: createFarmerPlantLedgerManualEntry
}

/** Centered modal — farmer plant nursery ledger (also Ram Agri when meta.ledgerApis is set) */
function FarmerPlantLedgerModal({
  ledger,
  onClose,
  canTransferAdvance,
  onRefresh,
  canTransferOrderPayment,
  onOpenPaymentTransfer
}) {
  const { customer, summary, entries, meta } = ledger
  const orders = meta?.orders || []
  const ledgerApis = meta?.ledgerApis || defaultLedgerApis
  const searchOrdersApi = ledgerApis?.searchOrders
  const ledgerTitle = meta?.ledgerTitle || "Farmer plant ledger"
  const partyWord = meta?.partyWord || "farmer"
  const transferSearchLabel = meta?.transferSearchLabel || `Search ${partyWord} (name/mobile)`
  const [transferOpen, setTransferOpen] = React.useState(false)
  const [manualOpen, setManualOpen] = React.useState(false)
  const [searchText, setSearchText] = React.useState("")
  const [searchResults, setSearchResults] = React.useState([])
  const [searchLoading, setSearchLoading] = React.useState(false)
  const [selectedTarget, setSelectedTarget] = React.useState(null)
  const [orderSearchText, setOrderSearchText] = React.useState("")
  const [orderSearchResults, setOrderSearchResults] = React.useState([])
  const [orderSearchLoading, setOrderSearchLoading] = React.useState(false)
  const [selectedOrder, setSelectedOrder] = React.useState(null)
  const [amount, setAmount] = React.useState("")
  const [manualAmount, setManualAmount] = React.useState("")
  const [reason, setReason] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [manualType, setManualType] = React.useState("CREDIT")
  const [manualMode, setManualMode] = React.useState("Cash")
  const [manualRemark, setManualRemark] = React.useState("")
  const [manualBankName, setManualBankName] = React.useState("")
  const [manualTransactionId, setManualTransactionId] = React.useState("")
  const [manualChequeNumber, setManualChequeNumber] = React.useState("")
  const [manualSaving, setManualSaving] = React.useState(false)

  // Stat cards must reflect ledger rows (row-wise outstanding), not order-range aggregation.
  const sumDebit = entries.reduce((s, e) => s + (e.type === "DEBIT" ? Number(e.amount) || 0 : 0), 0)
  const sumCredit = entries.reduce((s, e) => s + (e.type === "CREDIT" ? Number(e.amount) || 0 : 0), 0)
  const outstanding = Number(summary.outstanding) || 0
  const derivedFromLines = entries.length > 0

  const totalPurchase = Math.round(sumDebit * 100) / 100
  const totalCollected = Math.round(sumCredit * 100) / 100
  const due = Math.max(0, outstanding)
  const hasAdvance = outstanding < 0
  const availableAdvance = Math.max(0, Math.round(Math.abs(outstanding) * 100) / 100)
  const bankNameRequiredForMode = ["UPI", "Cheque", "NEFT/RTGS", "Bank Transfer", "Card"].includes(manualMode)

  React.useEffect(() => {
    if (!transferOpen) return
    const q = String(searchText || "").trim()
    if (!q || q.length < 2) {
      setSearchResults([])
      return
    }
    let cancelled = false
    setSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const rows = await ledgerApis.searchTargets({ q, limit: 12 })
        if (!cancelled) setSearchResults(rows || [])
      } catch (_) {
        if (!cancelled) setSearchResults([])
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [transferOpen, searchText])

  React.useEffect(() => {
    if (!transferOpen) return
    const q = String(orderSearchText || "").trim()
    if (!q) {
      setOrderSearchResults([])
      return
    }
    let cancelled = false
    setOrderSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const rows = await (searchOrdersApi
          ? searchOrdersApi({ q, limit: 12 })
          : Promise.resolve([]))
        if (!cancelled) setOrderSearchResults(Array.isArray(rows) ? rows : [])
      } catch (_) {
        if (!cancelled) setOrderSearchResults([])
      } finally {
        if (!cancelled) setOrderSearchLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [transferOpen, orderSearchText, searchOrdersApi])

  const resetTransferState = React.useCallback(() => {
    setSearchText("")
    setSearchResults([])
    setSelectedTarget(null)
    setOrderSearchText("")
    setOrderSearchResults([])
    setSelectedOrder(null)
    setAmount("")
    setReason("")
  }, [])

  const closeTransferModal = React.useCallback(() => {
    setTransferOpen(false)
    resetTransferState()
  }, [resetTransferState])

  const statCards = [
    {
      label: "Total debit",
      sub: "Sum of debit lines",
      value: fmtPlain(totalPurchase),
      accent: "from-sky-600/95 to-indigo-800/95",
      icon: Receipt
    },
    {
      label: "Total credit",
      sub: "Sum of credit lines",
      value: fmtPlain(totalCollected),
      accent: "from-emerald-600/95 to-teal-800/95",
      icon: Banknote
    },
    {
      label: hasAdvance ? "Advance / overpaid" : "Total outstanding",
      sub: hasAdvance ? "Collected more than billed (credit)" : due <= 0 ? "Nothing pending" : "Still to collect",
      value: hasAdvance ? fmtPlain(Math.abs(outstanding)) : fmtPlain(due),
      accent: hasAdvance
        ? "from-violet-600/95 to-purple-900/95"
        : due <= 0
          ? "from-emerald-600/95 to-green-900/95"
          : "from-amber-500/95 to-orange-900/95",
      icon: Wallet
    }
  ]

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-border/60 overflow-hidden bg-card animate-fade-up"
          role="dialog"
          aria-modal
          aria-labelledby="ledger-title"
        >
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400/20 via-transparent to-transparent" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center ring-1 ring-white/20">
                  <Sprout className="w-6 h-6 text-emerald-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200/90">
                    {ledgerTitle}
                  </p>
                  <h2 id="ledger-title" className="text-xl font-bold tracking-tight truncate">
                    {customer.name || "Farmer"}
                  </h2>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-sm text-slate-200/90">
                    <span className="tabular">{customer.mobile || "—"}</span>
                    <span className="text-slate-400">·</span>
                    <span className="truncate">
                      {[customer.village, customer.taluka, customer.district].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/80 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {statCards.map((s) => (
                <div
                  key={s.label}
                  className={cn(
                    "rounded-xl px-4 py-3.5 bg-gradient-to-br text-white shadow-lg ring-1 ring-white/10",
                    s.accent
                  )}
                >
                  <div className="flex items-center gap-2 opacity-95">
                    <s.icon className="w-4 h-4 flex-shrink-0 opacity-90" />
                    <span className="text-[11px] font-semibold leading-tight">{s.label}</span>
                  </div>
                  <div className="text-2xl font-bold tabular mt-2 tracking-tight">{s.value}</div>
                  <div className="text-[11px] opacity-85 mt-1 leading-snug">{s.sub}</div>
                </div>
              ))}
            </div>
            <p className="relative mt-3 text-[11px] text-slate-300/85 leading-relaxed max-w-2xl">
              {derivedFromLines
                ? "Totals are summed from ledger lines (row-wise outstanding)."
                : "No ledger activity in this date range."}
            </p>
            {canTransferAdvance && customer.mobile && (
              <div className="relative mt-3 flex flex-wrap gap-2">
                {hasAdvance && (
                  <>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 ring-1 ring-white/20 transition-colors"
                      onClick={() => setTransferOpen(true)}
                    >
                      Transfer advance
                    </button>
                    <span className="text-[11px] text-slate-200/80 self-center">
                      Available to transfer: ₹{availableAdvance.toLocaleString("en-IN")}
                    </span>
                  </>
                )}
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 ring-1 ring-white/20 transition-colors"
                  onClick={() => setManualOpen(true)}
                >
                  Add manual entry
                </button>
                {canTransferOrderPayment && typeof onOpenPaymentTransfer === "function" && (
                  <button
                    type="button"
                    className="rounded-lg border border-white/40 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white shadow-sm ring-1 ring-white/25 transition hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                    onClick={() => onOpenPaymentTransfer()}
                  >
                    Order transfer
                  </button>
                )}
              </div>
            )}
          </div>

          {transferOpen && (
            <>
              <div
                className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm"
                onClick={() => !saving && closeTransferModal()}
                aria-hidden
              />
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-md rounded-2xl shadow-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30">
                    <div className="text-sm font-semibold text-foreground">Transfer advance</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      From {customer.name || partyWord} ({customer.mobile}) · Available ₹{availableAdvance.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      {transferSearchLabel} (optional)
                      <input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        placeholder="Type at least 2 characters (or use order id below)"
                        disabled={saving}
                      />
                    </label>
                    {searchLoading ? (
                      <div className="text-[11px] text-muted-foreground">Searching…</div>
                    ) : searchResults.length > 0 ? (
                      <div className="max-h-36 overflow-y-auto border border-border rounded-lg">
                        {searchResults.map((f) => {
                          const isActive = selectedTarget?._id === f._id
                          return (
                            <button
                              key={f._id}
                              type="button"
                              onClick={() => {
                                setSelectedTarget(f)
                              }}
                              className={cn(
                                "w-full text-left px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted text-xs",
                                isActive && "bg-muted"
                              )}
                            >
                              <div className="font-semibold">{f.name || partyWord} · {f.mobileNumber || "—"}</div>
                              <div className="text-muted-foreground">
                                {[f.village, f.taluka, f.district].filter(Boolean).join(", ") || "—"}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground">
                        Search by name or mobile number.
                      </div>
                    )}
                    {selectedTarget && (
                      <div className="text-[11px] rounded-lg border border-border bg-muted/40 px-2 py-1">
                        To: <span className="font-semibold">{selectedTarget.name || "Farmer"}</span> ({selectedTarget.mobileNumber || "—"}) ·{" "}
                        {[selectedTarget.village, selectedTarget.taluka].filter(Boolean).join(", ") || "—"}
                      </div>
                    )}
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Transfer to order (optional)
                      <input
                        value={orderSearchText}
                        onChange={(e) => setOrderSearchText(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        placeholder="Type order id or farmer name"
                        disabled={saving}
                      />
                    </label>
                    {orderSearchLoading ? (
                      <div className="text-[11px] text-muted-foreground">Searching orders…</div>
                    ) : orderSearchText.trim() ? (
                      <div className="max-h-32 overflow-y-auto border border-border rounded-lg">
                        {orderSearchResults.length > 0 ? (
                          orderSearchResults.map((o, i) => {
                            const oid = String(o?._id || "")
                            const isActive = selectedOrder?._id === oid
                            return (
                              <button
                                key={`${oid || o?.orderId || "order"}-${i}`}
                                type="button"
                                onClick={() => {
                                  const farmer = o?.farmer || {}
                                  setSelectedOrder({
                                    _id: oid,
                                    orderId: o?.orderId,
                                    farmer
                                  })
                                  // Pre-fill target party from this order’s farmer (advance UI); payment transfer allows any eligible target order.
                                  if (farmer?.mobileNumber) {
                                    setSelectedTarget({
                                      _id: farmer?._id,
                                      name: farmer?.name || "Farmer",
                                      mobileNumber: farmer?.mobileNumber,
                                      village: farmer?.village || "",
                                      taluka: farmer?.taluka || "",
                                      district: farmer?.district || ""
                                    })
                                  }
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 border-b border-border last:border-b-0 hover:bg-muted text-xs",
                                  isActive && "bg-muted"
                                )}
                              >
                                <div className="font-semibold">
                                  #{o?.orderId ?? "—"} · {o?.farmer?.name || "Farmer"}
                                </div>
                                <div className="text-muted-foreground">
                                  {o?.farmer?.mobileNumber || "—"} · {[o?.farmer?.village, o?.farmer?.taluka].filter(Boolean).join(", ") || "—"}
                                </div>
                              </button>
                            )
                          })
                        ) : (
                          <div className="px-3 py-2 text-[11px] text-muted-foreground">No matching orders.</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground">Search with order id or farmer name to fetch orders.</div>
                    )}
                    {selectedOrder && (
                      <div className="text-[11px] rounded-lg border border-border bg-muted/40 px-2 py-1 flex items-center justify-between gap-2">
                        <span>
                          Order: <span className="font-semibold">#{selectedOrder.orderId ?? "—"}</span> ·{" "}
                          {selectedOrder?.farmer?.name || "Farmer"}
                        </span>
                        <button
                          type="button"
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedOrder(null)}
                          disabled={saving}
                        >
                          Clear
                        </button>
                      </div>
                    )}
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Amount (₹)
                      <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        placeholder="e.g. 500"
                        disabled={saving}
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Reason (optional)
                      <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        placeholder="e.g. transferred to relative"
                        disabled={saving}
                      />
                    </label>
                  </div>
                  <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
                      disabled={saving}
                      onClick={closeTransferModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
                      disabled={saving}
                      onClick={async () => {
                        const amt = Number(String(amount).replace(/[^\d.]/g, ""))
                        const targetMobileRaw = selectedTarget?.mobileNumber || selectedOrder?.farmer?.mobileNumber || ""
                        const tm = targetMobileRaw ? String(targetMobileRaw).replace(/\D/g, "") : ""
                        if (!tm || tm.length < 10) {
                          Toast.error(`Select a valid target ${partyWord} or order`)
                          return
                        }
                        if (!(amt > 0)) {
                          Toast.error("Enter a valid amount")
                          return
                        }
                        setSaving(true)
                        try {
                          const resp = await ledgerApis.transferAdvance({
                            fromMobile: customer.mobile,
                            toMobile: tm.slice(-10),
                            toFarmerId: selectedTarget?._id || selectedOrder?.farmer?._id || undefined,
                            amount: amt,
                            reason,
                            orderId: selectedOrder?._id || undefined
                          })
                          const msg = resp?.message || resp?.data?.message
                          Toast.success(msg || "Advance transferred")
                          closeTransferModal()
                          if (typeof onRefresh === "function") {
                            await onRefresh()
                          }
                        } catch (e) {
                          Toast.error(e?.response?.data?.message || "Transfer failed")
                        } finally {
                          setSaving(false)
                        }
                      }}
                    >
                      {saving ? "Transferring…" : "Transfer"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {manualOpen && (
            <>
              <div
                className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm"
                onClick={() => !manualSaving && setManualOpen(false)}
                aria-hidden
              />
              <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 pointer-events-none">
                <div className="pointer-events-auto w-full max-w-lg rounded-2xl shadow-2xl border border-border bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border bg-muted/30">
                    <div className="text-sm font-semibold text-foreground">Manual ledger entry</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      For {customer.name || partyWord} ({customer.mobile})
                    </div>
                  </div>
                  <div className="px-5 py-3 border-b border-amber-300/40 bg-amber-100/40 dark:bg-amber-900/20 text-[11px] text-amber-900 dark:text-amber-100">
                    Warning: You are creating a manual ledger adjustment. This is immutable and will be audit logged.
                  </div>
                  <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Entry type
                      <select
                        value={manualType}
                        onChange={(e) => setManualType(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        disabled={manualSaving}
                      >
                        <option value="CREDIT">Credit</option>
                        <option value="DEBIT">Debit</option>
                      </select>
                    </label>
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Amount (₹)
                      <input
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        placeholder="e.g. 500"
                        disabled={manualSaving}
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Mode of payment
                      <select
                        value={manualMode}
                        onChange={(e) => setManualMode(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        disabled={manualSaving}
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Cheque">Cheque</option>
                        <option value="NEFT/RTGS">NEFT/RTGS</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Card">Card</option>
                      </select>
                    </label>
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Bank name {bankNameRequiredForMode ? "*" : "(optional)"}
                      <input
                        value={manualBankName}
                        onChange={(e) => setManualBankName(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        placeholder="Bank name"
                        disabled={manualSaving}
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Transaction ID (optional)
                      <input
                        value={manualTransactionId}
                        onChange={(e) => setManualTransactionId(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        placeholder="UTR / reference"
                        disabled={manualSaving}
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-muted-foreground">
                      Cheque number (optional)
                      <input
                        value={manualChequeNumber}
                        onChange={(e) => setManualChequeNumber(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        placeholder="Cheque no."
                        disabled={manualSaving}
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-muted-foreground sm:col-span-2">
                      Remark *
                      <input
                        value={manualRemark}
                        onChange={(e) => setManualRemark(e.target.value)}
                        className="erp-input block mt-1 w-full text-xs"
                        placeholder="Reason / notes for manual adjustment"
                        disabled={manualSaving}
                      />
                    </label>
                  </div>
                  <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-end gap-2">
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors"
                      disabled={manualSaving}
                      onClick={() => setManualOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
                      disabled={manualSaving}
                      onClick={async () => {
                        const amt = Number(String(manualAmount).replace(/[^\d.]/g, ""))
                        if (!(amt > 0)) {
                          Toast.error("Enter a valid amount")
                          return
                        }
                        if (!String(manualRemark || "").trim()) {
                          Toast.error("Remark is required")
                          return
                        }
                        if (bankNameRequiredForMode && !String(manualBankName || "").trim()) {
                          Toast.error("Bank name is required for this mode")
                          return
                        }

                        setManualSaving(true)
                        try {
                          const resp = await ledgerApis.createManualEntry({
                            mobileNumber: customer.mobile,
                            entryType: manualType,
                            amount: amt,
                            modeOfPayment: manualMode,
                            remark: manualRemark,
                            bankName: manualBankName,
                            transactionId: manualTransactionId,
                            chequeNumber: manualChequeNumber
                          })
                          Toast.success(resp?.message || "Manual ledger entry created")
                          setManualOpen(false)
                          setManualType("CREDIT")
                          setManualMode("Cash")
                          setManualAmount("")
                          setManualRemark("")
                          setManualBankName("")
                          setManualTransactionId("")
                          setManualChequeNumber("")
                          if (typeof onRefresh === "function") await onRefresh()
                        } catch (e) {
                          Toast.error(e?.response?.data?.message || "Failed to create manual entry")
                        } finally {
                          setManualSaving(false)
                        }
                      }}
                    >
                      {manualSaving ? "Saving…" : "Create entry"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {orders.length > 0 && (
            <div className="px-5 py-2 border-b border-border bg-muted/30">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                Orders in view ({orders.length})
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-16 overflow-y-auto">
                {orders.slice(0, 12).map((o, i) => (
                  <span
                    key={`${o._id || o.orderId}-${i}`}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-muted border border-border text-foreground"
                  >
                    #{o.orderId ?? "—"} · {o.source === "ARCHIVE" ? "archived" : "active"} ·{" "}
                    {o.outstanding > 0 ? `due ${fmt(o.outstanding)}` : "ok"}
                  </span>
                ))}
                {orders.length > 12 && (
                  <span className="text-[10px] text-muted-foreground">+{orders.length - 12} more</span>
                )}
              </div>
            </div>
          )}

          {due > 0 && (
            <div className="mx-5 mt-3 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs font-medium text-amber-900 dark:text-amber-100">
                {fmtPlain(due)} still due — follow up collections for this {partyWord}.
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
            <div className="mb-2">
              <div className="text-[11px] font-semibold text-muted-foreground">Activity</div>
              <p className="text-[10px] text-muted-foreground/90 mt-0.5">
                <span className="font-medium text-amber-800/90 dark:text-amber-200/90">Due</span> = amount you owe us ·{" "}
                <span className="font-medium text-violet-800/90 dark:text-violet-200/90">Advance</span> = prepayment /
                credit balance
              </p>
            </div>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No activity in this date range.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/80 shadow-sm bg-card">
                <table className="w-full min-w-[680px] text-left text-[13px] leading-snug">
                  <thead className="sticky top-0 z-[1]">
                    <tr className="border-b border-border bg-muted/80 backdrop-blur-sm text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2.5 font-semibold text-left">Date</th>
                      <th className="px-3 py-2.5 font-semibold text-right tabular">Debit</th>
                      <th className="px-3 py-2.5 font-semibold text-right tabular">Credit</th>
                      <th className="px-3 py-2.5 font-semibold text-left">Before</th>
                      <th className="px-3 py-2.5 font-semibold text-left">After</th>
                      <th className="px-3 py-2.5 font-semibold text-left min-w-[220px]">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => {
                      const isDebit = e.type === "DEBIT"
                      const before = e.balanceBefore ?? 0
                      const after = e.balanceAfter ?? e.balance ?? 0
                      const bBefore = formatFarmerLedgerRunningBalance(before)
                      const bAfter = formatFarmerLedgerRunningBalance(after)
                      return (
                        <tr
                          key={e.raw?._id || i}
                          className={cn(
                            "border-b border-border/50 last:border-b-0 transition-colors",
                            isDebit
                              ? "bg-rose-50/90 dark:bg-rose-950/25 hover:bg-rose-100/80 dark:hover:bg-rose-950/40"
                              : "bg-emerald-50/90 dark:bg-emerald-950/25 hover:bg-emerald-100/80 dark:hover:bg-emerald-950/40",
                            `animate-fade-up stagger-${Math.min(i + 1, 5)}`
                          )}
                        >
                          <td className="px-3 py-2.5 align-top tabular text-muted-foreground whitespace-nowrap">
                            {fmtDate(e.date)}
                          </td>
                          <td className="px-3 py-2.5 align-top text-right tabular font-semibold text-rose-800 dark:text-rose-200">
                            {isDebit ? fmtPlain(e.amount) : "—"}
                          </td>
                          <td className="px-3 py-2.5 align-top text-right tabular font-semibold text-emerald-800 dark:text-emerald-200">
                            {!isDebit ? fmtPlain(e.amount) : "—"}
                          </td>
                          <td className="px-3 py-2.5 align-top text-[11px]">
                            <span className="font-medium text-foreground">{bBefore.label}</span>{" "}
                            <span
                              className={cn(
                                bBefore.tone === "due" && "text-amber-700 dark:text-amber-300",
                                bBefore.tone === "advance" && "text-violet-700 dark:text-violet-300",
                                bBefore.tone === "zero" && "text-muted-foreground"
                              )}
                            >
                              {bBefore.text}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-top text-[11px]">
                            <span className="font-medium text-foreground">{bAfter.label}</span>{" "}
                            <span
                              className={cn(
                                bAfter.tone === "due" && "text-amber-700 dark:text-amber-300",
                                bAfter.tone === "advance" && "text-violet-700 dark:text-violet-300",
                                bAfter.tone === "zero" && "text-muted-foreground"
                              )}
                            >
                              {bAfter.text}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <span
                              className={cn(
                                "inline-block align-middle text-[9px] font-bold px-1.5 py-0.5 rounded mr-2",
                                isDebit
                                  ? "bg-rose-200/80 text-rose-950 dark:bg-rose-900/50 dark:text-rose-100"
                                  : "bg-emerald-200/80 text-emerald-950 dark:bg-emerald-900/50 dark:text-emerald-100"
                              )}
                            >
                              {isDebit ? "Debit" : "Credit"}
                            </span>
                            <span className="text-foreground font-medium align-middle">{e.description}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="px-5 py-3 border-t border-border bg-muted/20 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/** Legacy slide-over — Ram Agri & older farmer UIs */
function LegacyLedgerPanel({ ledger, onClose }) {
  const { customer, summary, entries } = ledger
  const outstanding = summary.outstanding

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 z-[100] animate-fade-in" onClick={onClose} aria-hidden />
      <div className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-card shadow-erp-lg z-[110] flex flex-col animate-slide-in-right border-l border-border">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 bg-muted/30">
          <div>
            <h3 className="text-base font-semibold text-foreground">{customer.name}</h3>
            <div className="text-xs text-muted-foreground mt-0.5">
              {customer.village}, {customer.taluka}, {customer.district} · {customer.mobile}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-border transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
          {[
            { label: "Orders", value: summary.totalOrders.toString(), neutral: true },
            { label: "Total Debit", value: fmt(summary.totalDebit), debit: true },
            { label: "Total Credit", value: fmt(summary.totalCredit), credit: true },
            {
              label: "Outstanding",
              value: outstanding < 0 ? `-${fmt(outstanding)}` : fmt(outstanding),
              warning: outstanding < 0
            }
          ].map((s) => (
            <div key={s.label} className="px-3 py-3 text-center">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div
                className={cn(
                  "text-sm font-bold tabular mt-1",
                  s.debit ? "text-status-rejected" : s.credit ? "text-status-collected" : s.warning ? "text-status-pending" : "text-foreground"
                )}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {outstanding < 0 && (
          <div className="mx-4 mt-3 px-3 py-2 rounded-sm bg-status-pending-bg border border-status-pending/20 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-pending flex-shrink-0" />
            <span className="text-xs font-medium text-status-pending">
              Outstanding balance: {fmt(outstanding)} needs recovery
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Transaction History ({entries.length} entries)
            </div>
            <div className="space-y-1.5">
              {entries.map((e, i) => (
                <div
                  key={i}
                  className={cn("erp-card px-3 py-2.5 flex items-center gap-3 animate-fade-up", `stagger-${Math.min(i + 1, 5)}`)}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                      e.type === "DEBIT" ? "bg-status-rejected-bg" : "bg-status-collected-bg"
                    )}
                  >
                    {e.type === "DEBIT" ? (
                      <TrendingDown className="w-4 h-4 text-status-rejected" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-status-collected" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold font-mono text-muted-foreground">{e.reference}</span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-sm",
                          e.type === "DEBIT" ? "badge-rejected" : "badge-collected"
                        )}
                      >
                        {e.type}
                      </span>
                    </div>
                    <div className="text-xs text-foreground font-medium truncate mt-0.5">{e.description}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {fmtDate(e.date)} · {e.category}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div
                      className={cn(
                        "tabular font-bold text-sm",
                        e.type === "DEBIT" ? "text-status-rejected" : "text-status-collected"
                      )}
                    >
                      {e.type === "DEBIT" ? "−" : "+"}
                      {fmt(e.amount)}
                    </div>
                    <div
                      className={cn(
                        "text-[11px] tabular mt-0.5 font-medium",
                        e.balance < 0 ? "text-status-pending" : "text-muted-foreground"
                      )}
                    >
                      Bal: {e.balance < 0 ? `-${fmt(e.balance)}` : fmt(e.balance)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Close ledger
          </button>
        </div>
      </div>
    </>
  )
}

export function LedgerPanel({ ledger, onClose, canTransferOrderPayment, onOpenPaymentTransfer }) {
  if (!ledger) return null
  if (ledger.meta?.variant === "farmerPlant") {
    return (
      <FarmerPlantLedgerModal
        ledger={ledger}
        onClose={onClose}
        canTransferAdvance={ledger?.meta?.canTransferAdvance}
        onRefresh={ledger?.meta?.onRefresh}
        canTransferOrderPayment={Boolean(canTransferOrderPayment)}
        onOpenPaymentTransfer={onOpenPaymentTransfer}
      />
    )
  }
  return <LegacyLedgerPanel ledger={ledger} onClose={onClose} />
}
