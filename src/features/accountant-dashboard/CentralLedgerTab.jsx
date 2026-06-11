import React, { useCallback, useEffect, useState } from "react"
import moment from "moment"
import { RefreshCw, Database } from "lucide-react"
import { Toast } from "helpers/toasts/toastHelper"
import {
  fetchCentralLedgerLines,
  fetchCentralLedgerSyncStatus,
  startCentralLedgerSync
} from "./financeApi"

const fmt = (n) => `₹${Math.abs(Number(n) || 0).toLocaleString("en-IN")}`
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const ACCOUNT_OPTIONS = [
  { value: "", label: "All accounts" },
  { value: "AR_FARMER", label: "AR — Farmers (plants)" },
  { value: "AR_AGRI", label: "AR — Agri customers" },
  { value: "AR_DEALER", label: "AR — Dealers" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_ICICI", label: "Bank (ICICI)" },
  { value: "CUSTOMER_ADVANCE", label: "Customer advance (transfers)" },
  { value: "PAYMENT_CLEARING", label: "Payment clearing (transfers)" }
]

export function CentralLedgerTab({
  selectedOrg,
  startDate,
  endDate,
  canSync = false,
  onOpenPartyLedger
}) {
  const [accountCode, setAccountCode] = useState(
    selectedOrg === "ram-agri" ? "AR_AGRI" : "AR_FARMER"
  )
  const [partyId, setPartyId] = useState("")
  const [lines, setLines] = useState([])
  const [pagination, setPagination] = useState(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [syncRunning, setSyncRunning] = useState(false)
  const [syncStatusText, setSyncStatusText] = useState("")
  const [showTransfersOnly, setShowTransfersOnly] = useState(false)

  const loadLines = useCallback(async () => {
    setLoading(true)
    try {
      const partyType =
        accountCode === "AR_AGRI"
          ? "AGRI_CUSTOMER"
          : accountCode === "AR_FARMER"
            ? "FARMER"
            : accountCode === "AR_DEALER"
              ? "DEALER"
              : undefined
      const data = await fetchCentralLedgerLines({
        accountCode: accountCode || undefined,
        partyType: partyId.trim() ? partyType : undefined,
        partyId: partyId.trim() || undefined,
        startDate,
        endDate,
        page,
        limit: 50
      })
      const rows = Array.isArray(data?.lines) ? data.lines : []
      setLines(
        showTransfersOnly
          ? rows.filter((r) =>
              ["FARMER_ADVANCE_TRANSFER", "FARMER_PAYMENT_TRANSFER"].includes(
                r.metadata?.eventType || r.eventType
              )
            )
          : rows
      )
      setPagination(data?.pagination || null)
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to load central ledger lines")
      setLines([])
    } finally {
      setLoading(false)
    }
  }, [accountCode, partyId, startDate, endDate, page, showTransfersOnly])

  useEffect(() => {
    setAccountCode(selectedOrg === "ram-agri" ? "AR_AGRI" : "AR_FARMER")
  }, [selectedOrg])

  useEffect(() => {
    loadLines()
  }, [loadLines])

  const pollSyncStatus = useCallback(async () => {
    try {
      const job = await fetchCentralLedgerSyncStatus()
      if (job?.running) {
        setSyncRunning(true)
        setSyncStatusText("Sync in progress…")
        return true
      }
      setSyncRunning(false)
      if (job?.stats) {
        const s = job.stats
        const posted =
          (s.farmer?.posted || 0) +
          (s.agri?.posted || 0) +
          (s.dealer?.posted || 0) +
          (s.wallet?.posted || 0) +
          (s.bank?.posted || 0)
        setSyncStatusText(
          job.error
            ? `Sync failed: ${job.error}`
            : `Last sync: ${posted} posted · finished ${job.finishedAt ? moment(job.finishedAt).fromNow() : ""}`
        )
      } else if (job?.error) {
        setSyncStatusText(`Sync failed: ${job.error}`)
      }
      return false
    } catch {
      setSyncRunning(false)
      return false
    }
  }, [])

  useEffect(() => {
    pollSyncStatus()
    if (!syncRunning) return undefined
    const id = setInterval(async () => {
      const still = await pollSyncStatus()
      if (!still) {
        loadLines()
        Toast.success("Central ledger sync finished")
      }
    }, 3000)
    return () => clearInterval(id)
  }, [syncRunning, pollSyncStatus, loadLines])

  const handleSync = async () => {
    try {
      await startCentralLedgerSync({
        sources: ["farmer", "agri", "dealer", "wallet", "bank"]
      })
      setSyncRunning(true)
      setSyncStatusText("Sync started…")
      Toast.success("Central ledger sync started")
    } catch (e) {
      if (e?.response?.status === 409) {
        setSyncRunning(true)
        Toast.info("Sync already running")
        pollSyncStatus()
      } else {
        Toast.error(e?.response?.data?.message || "Failed to start sync")
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="erp-card p-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-violet-900">
          <Database className="w-5 h-5" />
          <div>
            <h2 className="text-sm font-bold">Central ledger (GL)</h2>
            <p className="text-[11px] text-muted-foreground">
              Immutable double-entry lines. Sub-ledger tabs stay unchanged; sync copies history here.
            </p>
          </div>
        </div>
        {canSync && (
          <button
            type="button"
            disabled={syncRunning}
            onClick={handleSync}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-violet-700 text-white hover:bg-violet-800 disabled:opacity-60 ml-auto"
          >
            <RefreshCw className={`w-4 h-4 ${syncRunning ? "animate-spin" : ""}`} />
            {syncRunning ? "Syncing…" : "Sync all to central ledger"}
          </button>
        )}
        {syncStatusText ? (
          <p className="w-full text-[11px] text-violet-900/90">{syncStatusText}</p>
        ) : null}
      </div>

      <div className="erp-card p-3 flex flex-wrap gap-3 items-end">
        <label className="text-[11px] font-semibold text-muted-foreground">
          Account
          <select
            className="erp-input block mt-1 text-xs min-w-[160px]"
            value={accountCode}
            onChange={(e) => {
              setAccountCode(e.target.value)
              setPage(1)
            }}
          >
            {ACCOUNT_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[11px] font-semibold text-muted-foreground">
          Party ID (mobile / dealer id)
          <input
            className="erp-input block mt-1 text-xs w-40"
            placeholder="Optional"
            value={partyId}
            onChange={(e) => {
              setPartyId(e.target.value)
              setPage(1)
            }}
          />
        </label>
        <button type="button" className="btn-primary text-xs" onClick={() => loadLines()} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
        <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 cursor-pointer">
          <input
            type="checkbox"
            checked={showTransfersOnly}
            onChange={(e) => {
              setShowTransfersOnly(e.target.checked)
              setPage(1)
            }}
          />
          Transfers only
        </label>
      </div>

      <div className="erp-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Date</th>
                <th className="text-left px-3 py-2 font-semibold">Account</th>
                <th className="text-left px-3 py-2 font-semibold">Party</th>
                <th className="text-right px-3 py-2 font-semibold">Debit</th>
                <th className="text-right px-3 py-2 font-semibold">Credit</th>
                <th className="text-left px-3 py-2 font-semibold">Type</th>
                <th className="text-left px-3 py-2 font-semibold">Ref</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    {loading ? "Loading…" : "No lines. Run sync to import from sub-ledgers."}
                  </td>
                </tr>
              ) : (
                lines.map((row) => (
                  <tr key={String(row._id)} className="border-b border-border/60 hover:bg-muted/30">
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.entryDate)}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{row.accountCode}</td>
                    <td className="px-3 py-2">
                      {row.partyId ? (
                        <button
                          type="button"
                          className="text-violet-800 underline font-medium"
                          onClick={() => onOpenPartyLedger?.(row.partyId, row.partyType)}
                        >
                          {row.partyType ? `${row.partyType}: ` : ""}
                          {row.partyId}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular text-status-rejected">
                      {row.debit > 0 ? fmt(row.debit) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular text-status-collected">
                      {row.credit > 0 ? fmt(row.credit) : "—"}
                    </td>
                    <td className="px-3 py-2 text-[10px]">
                      {row.metadata?.eventType === "FARMER_ADVANCE_TRANSFER" ||
                      row.metadata?.eventType === "FARMER_PAYMENT_TRANSFER" ? (
                        <span className="font-semibold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                          Transfer
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{row.metadata?.eventType || "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground max-w-[140px] truncate">
                      {row.sourceLineRef || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-border text-[11px]">
            <span>
              Page {pagination.page} / {pagination.totalPages} · {pagination.total} lines
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                className="px-2 py-1 border rounded disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= pagination.totalPages || loading}
                className="px-2 py-1 border rounded disabled:opacity-40"
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
