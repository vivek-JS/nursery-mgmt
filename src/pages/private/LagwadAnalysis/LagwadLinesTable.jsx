import React, { useEffect, useMemo, useState } from "react"
import moment from "moment"
import * as XLSX from "xlsx"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Sprout
} from "lucide-react"
import { fmt, getReadyStatusUi, SYNC_STATUS_UI } from "./lagwadAnalysisUi"

const PAGE_SIZES = [25, 50, 100, 0]

const dateTs = (value) => {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : null
}

/** Browser-local day so an IST-midnight timestamp never reads as the previous day. */
const dayLabel = (value) => {
  const ts = dateTs(value)
  return ts == null ? "—" : moment(ts).format("DD MMM YYYY")
}

const lagwadValue = (l) => dateTs(l?.lagwadDate) ?? dateTs(l?.secondaryInwardDate)
const readyValue = (l) => dateTs(l?.expectedReadyDate) ?? dateTs(l?.dateOfDispatch)

const SYNC_RANK = { synced: 0, partial: 1, pending: 2 }
const STATUS_RANK = { ready: 0, legacy_bypass: 1, awaiting: 2 }

const COLUMNS = [
  { key: "batchNumber", label: "Batch", type: "text", get: (l) => l.batchNumber ?? "" },
  { key: "size", label: "Size", type: "text", get: (l) => l.size ?? "" },
  { key: "pollyhouse", label: "Shed", type: "text", get: (l) => l.pollyhouse ?? "" },
  { key: "lagwadDate", label: "Lagwad date", type: "date", get: lagwadValue },
  { key: "readyDate", label: "Ready date", type: "date", get: readyValue },
  { key: "numberOfTrays", label: "Trays", type: "num", get: (l) => Number(l.numberOfTrays) || 0 },
  { key: "cavity", label: "Cavity", type: "num", get: (l) => Number(l.cavity) || 0 },
  { key: "totalQuantity", label: "Gross", type: "num", get: (l) => Number(l.totalQuantity) || 0 },
  {
    key: "availableQuantity",
    label: "Available",
    type: "num",
    get: (l) => Number(l.availableQuantity) || 0
  },
  { key: "sell90", label: "Sell 90%", type: "num", get: (l) => Number(l.sell90) || 0 },
  { key: "mort10", label: "Mort 10%", type: "num", get: (l) => Number(l.mort10) || 0 },
  { key: "overdueDays", label: "Overdue days", type: "num", get: (l) => Number(l.overdueDays) || 0 },
  {
    key: "readyStatus",
    label: "Status",
    type: "rank",
    get: (l) => STATUS_RANK[l.readyStatus] ?? 9
  },
  {
    key: "slotSyncStatus",
    label: "Slot sync",
    type: "rank",
    get: (l) => SYNC_RANK[l.slotSyncStatus] ?? 9
  },
  { key: "slotLabel", label: "Linked slot", type: "text", get: (l) => l.slotLabelResolved ?? "" }
]

const SUM_KEYS = new Set(["numberOfTrays", "totalQuantity", "availableQuantity", "sell90", "mort10"])

const compareValues = (a, b, type, dir) => {
  const nullA = a == null || a === ""
  const nullB = b == null || b === ""
  if (nullA && nullB) return 0
  if (nullA) return 1
  if (nullB) return -1
  const cmp =
    type === "text"
      ? String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" })
      : a - b
  return dir === "asc" ? cmp : -cmp
}

/** Same lagwad day → most recently entered line first (Mongo ids grow with time). */
const latestEntryFirst = (a, b) =>
  String(b.secondaryInwardId || "").localeCompare(String(a.secondaryInwardId || ""))

const th =
  "sticky top-0 z-10 border border-slate-300 bg-slate-100 px-2 py-1.5 text-left text-[11px] font-bold text-slate-700 whitespace-nowrap"
const td = "border border-slate-200 px-2 py-1 text-xs text-slate-800 whitespace-nowrap"
const tdNum = `${td} text-right tabular-nums`

const LagwadLinesTable = ({ lines, slotLabelById }) => {
  const [sort, setSort] = useState({ key: "lagwadDate", dir: "desc" })
  const [query, setQuery] = useState("")
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(0)

  const rows = useMemo(
    () =>
      (Array.isArray(lines) ? lines : []).map((l) => ({
        ...l,
        slotLabelResolved: l.slotLabel || slotLabelById?.get?.(l.slotId) || ""
      })),
    [lines, slotLabelById]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((l) =>
      [l.batchNumber, l.size, l.pollyhouse, l.slotLabelResolved, dayLabel(lagwadValue(l))]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [rows, query])

  const sorted = useMemo(() => {
    const col = COLUMNS.find((c) => c.key === sort.key) || COLUMNS[3]
    return [...filtered].sort((a, b) => {
      const cmp = compareValues(col.get(a), col.get(b), col.type, sort.dir)
      if (cmp !== 0) return cmp
      const byLagwad = compareValues(lagwadValue(a), lagwadValue(b), "date", "desc")
      return byLagwad !== 0 ? byLagwad : latestEntryFirst(a, b)
    })
  }, [filtered, sort])

  const totals = useMemo(() => {
    const out = {}
    for (const key of SUM_KEYS) {
      const col = COLUMNS.find((c) => c.key === key)
      out[key] = filtered.reduce((s, l) => s + col.get(l), 0)
    }
    return out
  }, [filtered])

  const size = pageSize || sorted.length || 1
  const pageCount = Math.max(1, Math.ceil(sorted.length / size))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(safePage * size, safePage * size + size)

  useEffect(() => {
    setPage(0)
  }, [query, sort, pageSize, lines?.length])

  const onSort = (key) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    )

  const exportExcel = () => {
    const data = sorted.map((l, i) => ({
      "#": i + 1,
      Batch: l.batchNumber ?? "",
      Size: l.size ?? "",
      Shed: l.pollyhouse ?? "",
      "Lagwad date": dayLabel(lagwadValue(l)),
      "Ready date": dayLabel(readyValue(l)),
      Trays: Number(l.numberOfTrays) || 0,
      Cavity: Number(l.cavity) || 0,
      Gross: Number(l.totalQuantity) || 0,
      Available: Number(l.availableQuantity) || 0,
      "Sell 90%": Number(l.sell90) || 0,
      "Mort 10%": Number(l.mort10) || 0,
      "Overdue days": Number(l.overdueDays) || 0,
      Status: getReadyStatusUi(l).label,
      "Slot sync": SYNC_STATUS_UI[l.slotSyncStatus]?.label ?? "",
      "Linked slot": l.slotLabelResolved
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Lagwad")
    XLSX.writeFile(wb, `lagwad-analysis-${moment().format("YYYY-MM-DD")}.xlsx`)
  }

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Sprout className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-700">No lagwad entries this year</p>
        <p className="mt-1 text-xs text-slate-500">
          Record secondary lagwad or pick another plant / subtype / year.
        </p>
      </div>
    )
  }

  const SortIcon = ({ colKey }) => {
    if (sort.key !== colKey) return <ArrowUpDown className="h-3 w-3 text-slate-400" />
    return sort.dir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-cyan-700" />
    ) : (
      <ArrowDown className="h-3 w-3 text-cyan-700" />
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search batch, shed, slot, date…"
            className="h-8 w-64 rounded border border-slate-300 bg-white pl-7 pr-2 text-xs outline-none focus:border-cyan-500"
          />
        </div>
        <span className="text-xs text-slate-500">
          {fmt(sorted.length)} of {fmt(rows.length)} lines
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded border border-slate-300 bg-white px-2 text-xs">
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "All rows" : `${n} rows`}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:text-cyan-700 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-600">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:text-cyan-700 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={exportExcel}
            className="flex h-8 items-center gap-1.5 rounded bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700">
            <Download className="h-3.5 w-3.5" />
            Excel
          </button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-220px)] overflow-auto rounded border border-slate-300 bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={`${th} w-10 text-center`}>#</th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`${th} cursor-pointer select-none hover:bg-slate-200 ${
                    c.type === "num" ? "text-right" : ""
                  }`}
                  onClick={() => onSort(c.key)}>
                  <span
                    className={`inline-flex items-center gap-1 ${
                      c.type === "num" ? "flex-row-reverse" : ""
                    }`}>
                    {c.label}
                    <SortIcon colKey={c.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((l, i) => {
              const status = getReadyStatusUi(l)
              const sync = SYNC_STATUS_UI[l.slotSyncStatus]
              const overdue = Number(l.overdueDays) || 0
              return (
                <tr
                  key={`${l.secondaryInwardId}-${l.slotId}`}
                  className="odd:bg-white even:bg-slate-50 hover:bg-cyan-50">
                  <td className={`${td} text-center text-slate-400`}>
                    {safePage * size + i + 1}
                  </td>
                  <td className={`${td} font-semibold`}>{l.batchNumber || "—"}</td>
                  <td className={td}>{l.size || "—"}</td>
                  <td className={td}>{l.pollyhouse || "—"}</td>
                  <td className={td}>{dayLabel(lagwadValue(l))}</td>
                  <td className={td}>{dayLabel(readyValue(l))}</td>
                  <td className={tdNum}>{fmt(l.numberOfTrays)}</td>
                  <td className={tdNum}>{l.cavity || "—"}</td>
                  <td className={tdNum}>{fmt(l.totalQuantity)}</td>
                  <td className={tdNum}>{fmt(l.availableQuantity)}</td>
                  <td className={`${tdNum} text-emerald-700`}>{fmt(l.sell90)}</td>
                  <td className={`${tdNum} text-rose-600`}>{fmt(l.mort10)}</td>
                  <td
                    className={`${tdNum} ${
                      overdue >= 7
                        ? "font-semibold text-rose-700"
                        : overdue > 0
                          ? "text-amber-700"
                          : "text-slate-400"
                    }`}>
                    {overdue > 0 ? `+${overdue}` : "0"}
                  </td>
                  <td className={td}>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className={`${td} ${sync?.className || ""}`}>{sync?.label || "—"}</td>
                  <td className={`${td} text-slate-600`}>{l.slotLabelResolved || "—"}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="sticky bottom-0 bg-slate-100 font-bold">
              <td className={`${td} bg-slate-100 text-center`}>Σ</td>
              {COLUMNS.map((c) => (
                <td
                  key={c.key}
                  className={`${SUM_KEYS.has(c.key) ? tdNum : td} bg-slate-100 font-bold`}>
                  {SUM_KEYS.has(c.key) ? fmt(totals[c.key]) : c.key === "batchNumber" ? "Total" : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

export default LagwadLinesTable
