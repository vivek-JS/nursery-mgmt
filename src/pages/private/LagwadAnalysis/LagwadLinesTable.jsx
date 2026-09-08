import React, { useEffect, useMemo, useState } from "react"
import { Tooltip } from "@mui/material"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Sprout } from "lucide-react"
import {
  tooltipSlotProps,
  fmt,
  getOverdueUi,
  getReadyStatusUi,
  SYNC_STATUS_UI
} from "./lagwadAnalysisUi"

const PAGE_SIZE = 25

const SORT_FIELDS = {
  lagwadDate: "lagwadDate",
  readyDate: "readyDate"
}

const headerCell =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
const sortableHeaderCell =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 cursor-pointer select-none transition-colors hover:bg-slate-100 hover:text-cyan-800"
const bodyCell = "px-3 py-2 text-xs text-slate-700"

const dateTs = (value) => {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : null
}

const lagwadTs = (line) =>
  dateTs(line?.lagwadDate) ?? dateTs(line?.secondaryInwardDate) ?? null

const readyTs = (line) =>
  dateTs(line?.expectedReadyDate) ?? dateTs(line?.dateOfDispatch) ?? null

const compareNullable = (a, b, dir) => {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  return dir === "asc" ? a - b : b - a
}

/** Newer Mongo ids / batch refs float to the top when lagwad dates match. */
const tieBreakLatestFirst = (a, b) => {
  const idCmp = String(b.secondaryInwardId || "").localeCompare(String(a.secondaryInwardId || ""))
  if (idCmp !== 0) return idCmp
  return String(b.batchNumber || "").localeCompare(String(a.batchNumber || ""))
}

const SortHeader = ({ label, field, sortField, sortDir, onSort }) => {
  const active = sortField === field
  return (
    <th className={sortableHeaderCell} scope="col">
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex w-full items-center gap-1 text-left">
        <span className={active ? "text-cyan-800" : "text-slate-500"}>{label}</span>
        {active ? (
          sortDir === "asc" ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cyan-700" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-slate-300" />
        )}
      </button>
    </th>
  )
}

/** Flat paginated list — sortable by lagwad date and ready date. */
const LagwadLinesTable = ({ lines, slotLabelById }) => {
  const [page, setPage] = useState(0)
  const [sortField, setSortField] = useState(SORT_FIELDS.lagwadDate)
  const [sortDir, setSortDir] = useState("desc")

  const handleSort = (field) => {
    setSortField((prevField) => {
      if (prevField === field) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"))
        return prevField
      }
      setSortDir("desc")
      return field
    })
    setPage(0)
  }

  const sortedLines = useMemo(() => {
    const list = Array.isArray(lines) ? [...lines] : []
    return list.sort((a, b) => {
      let cmp = 0
      if (sortField === SORT_FIELDS.readyDate) {
        cmp = compareNullable(readyTs(a), readyTs(b), sortDir)
        if (cmp === 0) cmp = compareNullable(lagwadTs(a), lagwadTs(b), "desc")
      } else {
        cmp = compareNullable(lagwadTs(a), lagwadTs(b), sortDir)
        if (cmp === 0) cmp = compareNullable(readyTs(a), readyTs(b), "desc")
      }
      if (cmp !== 0) return cmp
      return tieBreakLatestFirst(a, b)
    })
  }, [lines, sortField, sortDir])

  const pageCount = Math.max(1, Math.ceil(sortedLines.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageLines = sortedLines.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
  const rangeStart = sortedLines.length === 0 ? 0 : safePage * PAGE_SIZE + 1
  const rangeEnd = Math.min(sortedLines.length, (safePage + 1) * PAGE_SIZE)

  const sortLabel =
    sortField === SORT_FIELDS.readyDate
      ? `Ready date · ${sortDir === "asc" ? "oldest first" : "latest first"}`
      : `Lagwad date · ${sortDir === "asc" ? "oldest first" : "latest first"}`

  useEffect(() => {
    setPage(0)
  }, [lines?.length, sortField, sortDir])

  useEffect(() => {
    if (page > pageCount - 1) setPage(Math.max(0, pageCount - 1))
  }, [page, pageCount])

  if (!sortedLines.length) {
    return (
      <div className="lag-rise rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Sprout className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-700">No lagwad entries this year</p>
        <p className="mt-1 text-xs text-slate-500">
          Record secondary lagwad or pick another plant / subtype / year.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
            Lagwad entries
          </p>
          <p className="text-[11px] text-slate-500">
            {fmt(sortedLines.length)} lines · {sortLabel} · page {safePage + 1} of {pageCount}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-slate-500">
            {rangeStart}–{rangeEnd} of {fmt(sortedLines.length)}
          </span>
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="lag-panel lag-rise overflow-hidden rounded-xl">
        <div className="lag-scroll overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={headerCell}>Batch</th>
                <th className={headerCell}>Shed</th>
                <th className={`${headerCell} text-right`}>Gross</th>
                <th className={`${headerCell} text-right`}>Sell 90%</th>
                <th className={`${headerCell} text-right`}>Mort 10%</th>
                <SortHeader
                  label="Lagwad date"
                  field={SORT_FIELDS.lagwadDate}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortHeader
                  label="Ready date"
                  field={SORT_FIELDS.readyDate}
                  sortField={sortField}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <th className={headerCell}>Ready age</th>
                <th className={headerCell}>Status</th>
                <th className={headerCell}>Linked slot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageLines.map((line) => {
                const overdue = getOverdueUi(line.overdueDays)
                const status = getReadyStatusUi(line)
                const sync = SYNC_STATUS_UI[line.slotSyncStatus]
                return (
                  <tr
                    key={`${line.secondaryInwardId}-${line.slotId}`}
                    className="transition-colors hover:bg-slate-50">
                    <td className={`${bodyCell} font-semibold text-slate-900`}>
                      {line.batchNumber}
                      {line.size && (
                        <span className="ml-1 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-500">
                          {line.size}
                        </span>
                      )}
                    </td>
                    <td className={bodyCell}>{line.pollyhouse || "—"}</td>
                    <td className={`${bodyCell} lag-readout text-right`}>
                      {fmt(line.totalQuantity)}
                    </td>
                    <td
                      className={`${bodyCell} lag-readout text-right font-semibold text-emerald-600`}>
                      {fmt(line.sell90)}
                    </td>
                    <td className={`${bodyCell} lag-readout text-right text-rose-600`}>
                      {fmt(line.mort10)}
                    </td>
                    <td className={bodyCell}>{line.lagwadLabel || "—"}</td>
                    <td className={bodyCell}>{line.expectedReadyLabel || "—"}</td>
                    <td className={bodyCell}>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] ${overdue.className}`}>
                        {overdue.label}
                      </span>
                    </td>
                    <td className={bodyCell}>
                      <Tooltip
                        arrow
                        slotProps={tooltipSlotProps}
                        title={
                          line.pendingSlotSync > 0
                            ? `${fmt(line.pendingSlotSync)} plants in shed not yet synced to the slot`
                            : "Fully synced to the booking slot"
                        }>
                        <span className="inline-flex flex-col">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${status.className}`}>
                            {status.label}
                          </span>
                          {sync && line.slotSyncStatus !== "synced" && (
                            <span className={`mt-0.5 text-[9px] ${sync.className}`}>
                              {sync.label}
                            </span>
                          )}
                        </span>
                      </Tooltip>
                    </td>
                    <td className={`${bodyCell} text-slate-500`}>
                      {line.slotLabel || slotLabelById?.get?.(line.slotId) || "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default LagwadLinesTable
