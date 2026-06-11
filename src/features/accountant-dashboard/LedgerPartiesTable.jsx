import React, { useCallback, useEffect, useState } from "react"
import { BookOpen, Search } from "lucide-react"
import { fetchFarmerPlantLedgerParties, fetchRamAgriLedgerParties } from "./paymentsApi"
import { cn } from "lib/cn"

const fmt = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN")}`
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

/**
 * Directory of parties that have ledger activity (farmer plant vs Ram Agri customer).
 */
export function LedgerPartiesTable({ selectedOrg, onOpenLedger, dateRangeLabel }) {
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (selectedOrg === "ram-agri") {
        const { items: rows, pagination: pg } = await fetchRamAgriLedgerParties({
          search: debounced,
          page,
          limit: 25
        })
        setItems(rows)
        setPagination(pg)
      } else {
        const { items: rows, pagination: pg } = await fetchFarmerPlantLedgerParties({
          search: debounced,
          page,
          limit: 25
        })
        setItems(rows)
        setPagination(pg)
      }
    } catch (e) {
      console.error(e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [selectedOrg, debounced, page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [debounced, selectedOrg])

  const totalPages = Math.max(1, pagination.pages || 1)

  return (
    <div className="erp-card animate-fade-up stagger-2 min-w-0 max-w-full">
      <div className="px-4 py-3 border-b border-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">All farmers / parties with ledger</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedOrg === "ram-agri"
              ? "Ram Agri customers with at least one ledger line"
              : "Nursery farmers with farmer plant ledger entries"}
            {dateRangeLabel ? ` · ${dateRangeLabel}` : ""}
          </p>
        </div>
        <div className="relative flex items-center gap-2">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            className="erp-input pl-8 w-52 text-xs py-1.5"
            placeholder="Search name or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Location</th>
              <th className="tabular">Outstanding</th>
              <th>Lines</th>
              <th>Last activity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
                  Loading…
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const isAgri = selectedOrg === "ram-agri"
                const mobile = row.customerMobile || ""
                const name = row.customerName || "—"
                const loc = isAgri
                  ? "—"
                  : [row.village, row.taluka, row.district].filter(Boolean).join(", ") || "—"
                return (
                  <tr key={`${mobile}-${name}`}>
                    <td className="font-medium">{name}</td>
                    <td className="font-mono text-xs tabular">{mobile}</td>
                    <td className="text-xs text-muted-foreground">{loc}</td>
                    <td
                      className={cn(
                        "tabular font-semibold",
                        Number(row.outstanding) > 0
                          ? "text-status-rejected"
                          : Number(row.outstanding) < 0
                            ? "text-status-pending"
                            : "text-status-collected"
                      )}
                    >
                      {fmt(row.outstanding)}
                    </td>
                    <td className="tabular text-xs">{row.lineCount ?? "—"}</td>
                    <td className="text-xs text-muted-foreground tabular">{fmtDate(row.lastEntryDate)}</td>
                    <td>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                        onClick={() =>
                          onOpenLedger(
                            mobile,
                            name,
                            isAgri ? undefined : row.farmerId ?? row.farmer?._id
                          )
                        }
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        Ledger
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground py-10 text-sm">
                  No parties with ledger entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-center gap-2 py-3 text-xs text-muted-foreground border-t border-border">
        <button
          type="button"
          className="px-2 py-1 border border-border rounded-sm disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </button>
        <span>
          Page {page} / {totalPages} ({pagination.total ?? items.length} total)
        </span>
        <button
          type="button"
          className="px-2 py-1 border border-border rounded-sm disabled:opacity-50"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
