import React, { useMemo, useState } from "react"
import { X, TrendingDown, TrendingUp, RefreshCw, Database, ArrowLeftRight } from "lucide-react"
import { formatFarmerLedgerRunningBalance } from "./normalize"

const fmt = (n) => `₹${Math.abs(Number(n) || 0).toLocaleString("en-IN")}`
const fmtDate = (d) => {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

/**
 * Side panel: sub-ledger (default) or central ledger for one party.
 */
export function LedgerPanel({
  ledger,
  centralLedger,
  ledgerSource = "sub",
  onLedgerSourceChange,
  onClose,
  loadingCentral = false,
  onRefreshCentral,
  canSyncCentral = false,
  onSyncCentral,
  syncRunning = false,
  syncStatusText = "",
  canTransferOrderPayment = false,
  onOpenPaymentTransfer
}) {
  if (!ledger && !centralLedger) return null

  const active = ledgerSource === "central" && centralLedger ? centralLedger : ledger
  if (!active) return null

  const { customer, summary, entries } = active
  const [centralFilter, setCentralFilter] = useState("all")
  const outstanding = Number(summary.outstanding) || 0
  const runBal = formatFarmerLedgerRunningBalance(outstanding)
  const isCentral = ledgerSource === "central"
  const transferCount =
    Number(active.meta?.transferCount) ||
    entries.filter((e) => e.isTransfer || /transfer/i.test(String(e.category || ""))).length

  const visibleEntries = useMemo(() => {
    if (!isCentral || centralFilter !== "transfers") return entries
    return entries.filter(
      (e) => e.isTransfer || /transfer/i.test(String(e.category || e.description || ""))
    )
  }, [entries, isCentral, centralFilter])

  return (
    <>
      <div className="fixed inset-0 bg-foreground/20 z-40" onClick={onClose} role="presentation" />
      <div className="fixed right-0 top-0 h-full w-full max-w-[540px] bg-card shadow-erp-lg z-50 flex flex-col border-l border-border">
        <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3 bg-muted/30">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground truncate">{customer.name}</h3>
            <div className="text-xs text-muted-foreground mt-0.5">
              {[customer.village, customer.taluka, customer.district].filter(Boolean).join(", ")}
              {customer.mobile ? ` · ${customer.mobile}` : ""}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button
                type="button"
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  !isCentral
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}
                onClick={() => onLedgerSourceChange?.("sub")}
              >
                Sub-ledger
              </button>
              <button
                type="button"
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                  isCentral
                    ? "bg-violet-700 text-white border-violet-700"
                    : "border-border text-muted-foreground"
                }`}
                onClick={() => onLedgerSourceChange?.("central")}
              >
                <Database className="w-3 h-3" />
                Central ledger
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-border text-muted-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {canSyncCentral && (
          <div className="px-4 py-2 border-b border-border bg-violet-50/80 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={syncRunning}
              onClick={onSyncCentral}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncRunning ? "animate-spin" : ""}`} />
              {syncRunning ? "Syncing…" : "Sync to central ledger"}
            </button>
            {isCentral && onRefreshCentral && (
              <button
                type="button"
                disabled={loadingCentral}
                onClick={onRefreshCentral}
                className="text-[11px] font-medium text-violet-900 underline"
              >
                Refresh central view
              </button>
            )}
            {syncStatusText ? (
              <span className="text-[10px] text-violet-900/80 flex-1 min-w-[120px]">{syncStatusText}</span>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-4 divide-x divide-border border-b border-border">
          {[
            {
              label: isCentral ? "Lines" : "Orders",
              value: isCentral ? String(entries.length) : String(summary.totalOrders ?? 0),
              neutral: true
            },
            { label: "Debit", value: fmt(summary.totalDebit ?? summary.totalBilled), debit: true },
            { label: "Credit", value: fmt(summary.totalCredit ?? summary.totalCollected), credit: true },
            { label: runBal.label, value: runBal.text, warning: runBal.tone === "advance" }
          ].map((s) => (
            <div key={s.label} className="px-2 py-2.5 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </div>
              <div
                className={`text-xs font-bold tabular mt-0.5 ${
                  s.debit
                    ? "text-status-rejected"
                    : s.credit
                      ? "text-status-collected"
                      : s.warning
                        ? "text-status-pending"
                        : "text-foreground"
                }`}
              >
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {canTransferOrderPayment && onOpenPaymentTransfer && (
          <div className="px-4 py-2 border-b border-border flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline"
              onClick={onOpenPaymentTransfer}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transfer order payment
            </button>
            {isCentral && transferCount > 0 ? (
              <span className="text-[10px] text-violet-800">
                {transferCount} transfer line(s) in central ledger
              </span>
            ) : null}
          </div>
        )}

        <div className="flex-1 overflow-y-auto relative">
          {loadingCentral && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 text-sm">
              Loading central ledger…
            </div>
          )}
          <div className="px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {isCentral ? "Central ledger (AR + transfers)" : "Transaction history"} ({visibleEntries.length})
              </div>
              {isCentral && transferCount > 0 ? (
                <div className="flex gap-1">
                  <button
                    type="button"
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                      centralFilter === "all"
                        ? "bg-violet-700 text-white border-violet-700"
                        : "border-border text-muted-foreground"
                    }`}
                    onClick={() => setCentralFilter("all")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-0.5 ${
                      centralFilter === "transfers"
                        ? "bg-amber-600 text-white border-amber-600"
                        : "border-border text-muted-foreground"
                    }`}
                    onClick={() => setCentralFilter("transfers")}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    Transfers
                  </button>
                </div>
              ) : null}
            </div>
            {visibleEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {isCentral && centralFilter === "transfers"
                  ? "No transfer lines in this period. Advance / payment transfers appear here after sync or new activity."
                  : isCentral
                    ? "No central ledger lines yet. Run “Sync to central ledger” to backfill from sub-ledgers."
                    : "No entries in this period."}
              </p>
            ) : (
              <div className="space-y-1.5">
                {visibleEntries.map((e, i) => (
                  <div
                    key={e.raw?._id || i}
                    className={`erp-card px-3 py-2.5 flex items-center gap-3 ${
                      e.isTransfer || /transfer/i.test(String(e.category || ""))
                        ? "ring-1 ring-amber-200/80 bg-amber-50/40"
                        : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                        e.type === "DEBIT" ? "bg-status-rejected-bg" : "bg-status-collected-bg"
                      }`}
                    >
                      {e.type === "DEBIT" ? (
                        <TrendingDown className="w-4 h-4 text-status-rejected" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-status-collected" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold font-mono text-muted-foreground">
                          {e.reference}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-sm ${
                            e.type === "DEBIT" ? "badge-rejected" : "badge-collected"
                          }`}
                        >
                          {e.type}
                        </span>
                        {(e.isTransfer || /transfer/i.test(String(e.category || ""))) && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-900">
                            Transfer
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-foreground font-medium truncate mt-0.5">
                        {e.description}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {fmtDate(e.date)} · {e.category}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div
                        className={`tabular font-bold text-sm ${
                          e.type === "DEBIT" ? "text-status-rejected" : "text-status-collected"
                        }`}
                      >
                        {e.type === "DEBIT" ? "−" : "+"}
                        {fmt(e.amount)}
                      </div>
                      <div className="text-[11px] tabular mt-0.5 text-muted-foreground">
                        Bal: {formatFarmerLedgerRunningBalance(e.balance).text}{" "}
                        <span className="text-[10px]">({formatFarmerLedgerRunningBalance(e.balance).label})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-border flex gap-2">
          {ledger?.meta?.onRefresh && !isCentral && (
            <button
              type="button"
              className="flex-1 text-sm border border-border rounded-md py-2 hover:bg-muted"
              onClick={() => ledger.meta.onRefresh?.()}
            >
              Refresh sub-ledger
            </button>
          )}
          <button type="button" className="flex-1 text-sm text-muted-foreground py-2" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </>
  )
}
