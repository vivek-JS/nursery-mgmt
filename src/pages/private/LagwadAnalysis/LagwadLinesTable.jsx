import React, { useEffect, useMemo, useState } from "react"
import moment from "moment"
import { Tooltip } from "@mui/material"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Sprout,
  Trash2,
  Undo2
} from "lucide-react"
import DestroyPlantsDialog from "./DestroyPlantsDialog"
import DestroyLogDialog from "./DestroyLogDialog"
import DestroyRemainingDialog from "./DestroyRemainingDialog"
import { fmt, getReadyStatusUi, tooltipSlotProps } from "./lagwadAnalysisUi"
import { downloadSheetsXlsx } from "utils/exportExcel"

const PAGE_SIZES = [25, 50, 100, 0]

const dateTs = (value) => {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : null
}

/** Browser-local day so an IST-midnight timestamp never reads as the previous day. */
const dayLabel = (value) => {
  const ts = dateTs(value)
  return ts == null ? "—" : moment(ts).format("DD MMM YY")
}

const num = (v) => Number(v) || 0
const lagwadValue = (l) => dateTs(l?.lagwadDate) ?? dateTs(l?.secondaryInwardDate)
const readyValue = (l) => dateTs(l?.expectedReadyDate) ?? dateTs(l?.dateOfDispatch)
const destroyedOf = (l) => num(l.destroyedQuantity)
const soldOf = (l) =>
  l.soldQuantity != null
    ? num(l.soldQuantity)
    : Math.max(0, num(l.totalQuantity) - num(l.availableQuantity) - destroyedOf(l))

const STATUS_RANK = { ready: 0, legacy_bypass: 1, awaiting: 2 }

const SIZE_UI = {
  R1: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  R2: "bg-sky-50 text-sky-700 ring-sky-200",
  R3: "bg-violet-50 text-violet-700 ring-violet-200"
}

const COLUMNS = [
  { key: "batchNumber", label: "Batch", type: "text", get: (l) => l.batchNumber ?? "" },
  { key: "size", label: "Size", type: "text", get: (l) => l.size ?? "" },
  { key: "pollyhouse", label: "Shed", type: "text", get: (l) => l.pollyhouse ?? "" },
  { key: "lagwadDate", label: "Lagwad", type: "date", get: lagwadValue },
  { key: "readyDate", label: "Ready", type: "date", get: readyValue },
  { key: "numberOfTrays", label: "Trays", type: "num", get: (l) => num(l.numberOfTrays) },
  { key: "totalQuantity", label: "Gross", type: "num", get: (l) => num(l.totalQuantity) },
  { key: "sold", label: "Sold", type: "num", get: soldOf },
  { key: "destroyed", label: "Destroyed", type: "num", get: destroyedOf },
  { key: "availableQuantity", label: "In shed", type: "num", get: (l) => num(l.availableQuantity) },
  { key: "sell90", label: "Sell 90%", type: "num", get: (l) => num(l.sell90) },
  { key: "mort10", label: "Mort 10%", type: "num", get: (l) => num(l.mort10) },
  { key: "overdueDays", label: "Overdue", type: "num", get: (l) => num(l.overdueDays) },
  { key: "readyStatus", label: "Status", type: "rank", get: (l) => STATUS_RANK[l.readyStatus] ?? 9 },
  { key: "slotLabel", label: "Slot", type: "text", get: (l) => l.slotLabelResolved ?? "" }
]

const SUM_KEYS = new Set([
  "numberOfTrays",
  "totalQuantity",
  "sold",
  "destroyed",
  "availableQuantity",
  "sell90",
  "mort10"
])

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
  "sticky top-0 z-10 border-b border-r border-slate-200 bg-slate-50/95 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap backdrop-blur last:border-r-0"
const td = "border-b border-r border-slate-100 px-3 py-2 text-[13px] text-slate-700 whitespace-nowrap last:border-r-0"
const tdNum = `${td} text-right tabular-nums`

const StatCard = ({ label, value, tone }) => (
  <div className={`rounded-xl border bg-white px-4 py-3 shadow-sm ${tone.border}`}>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`mt-1 text-xl font-bold tabular-nums ${tone.text}`}>{value}</p>
  </div>
)

const LagwadLinesTable = ({ lines, slotLabelById, onChanged }) => {
  const [sort, setSort] = useState({ key: "lagwadDate", dir: "desc" })
  const [query, setQuery] = useState("")
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(0)
  const [destroyLine, setDestroyLine] = useState(null)
  const [logLine, setLogLine] = useState(null)
  const [destroyAllLine, setDestroyAllLine] = useState(null)

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

  const destroyAllEstimate = useMemo(() => {
    if (!destroyAllLine) return null
    const sameBatch = rows.filter((l) => String(l.batchId) === String(destroyAllLine.batchId))
    const left = (list) => list.reduce((s, l) => s + num(l.availableQuantity), 0)
    return {
      batch: left(sameBatch),
      shed: left(sameBatch.filter((l) => (l.pollyhouse || "") === (destroyAllLine.pollyhouse || "")))
    }
  }, [destroyAllLine, rows])

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
    const excelDay = (ts) => (ts == null ? "" : moment(ts).format("DD-MM-YYYY"))
    downloadSheetsXlsx("lagwad-analysis", [
      {
        title: "Lagwad",
        headers: [
          "#",
          "Batch",
          "Size",
          "Shed",
          "Lagwad date",
          "Ready date",
          "Trays",
          "Cavity",
          "Gross",
          "Sold",
          "Destroyed",
          "In shed",
          "Sell 90%",
          "Mort 10%",
          "Overdue days",
          "Status",
          "Slot"
        ],
        rows: sorted.map((l, i) => [
          i + 1,
          l.batchNumber ?? "",
          l.size ?? "",
          l.pollyhouse ?? "",
          excelDay(lagwadValue(l)),
          excelDay(readyValue(l)),
          num(l.numberOfTrays),
          num(l.cavity),
          num(l.totalQuantity),
          soldOf(l),
          destroyedOf(l),
          num(l.availableQuantity),
          num(l.sell90),
          num(l.mort10),
          num(l.overdueDays),
          getReadyStatusUi(l).label,
          l.slotLabelResolved
        ])
      }
    ])
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
    if (sort.key !== colKey) return <ArrowUpDown className="h-3 w-3 text-slate-300" />
    return sort.dir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-emerald-600" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-600" />
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Gross lagwad"
          value={fmt(totals.totalQuantity)}
          tone={{ border: "border-slate-200", text: "text-slate-900" }}
        />
        <StatCard
          label="Sold"
          value={fmt(totals.sold)}
          tone={{ border: "border-indigo-100", text: "text-indigo-600" }}
        />
        <StatCard
          label="Destroyed"
          value={fmt(totals.destroyed)}
          tone={{ border: "border-rose-100", text: "text-rose-600" }}
        />
        <StatCard
          label="In shed"
          value={fmt(totals.availableQuantity)}
          tone={{ border: "border-emerald-100", text: "text-emerald-600" }}
        />
        <StatCard
          label="Entries"
          value={fmt(sorted.length)}
          tone={{ border: "border-slate-200", text: "text-slate-900" }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search batch, shed, slot, date…"
            className="h-9 w-72 rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none transition-colors focus:border-emerald-400 focus:bg-white"
          />
        </div>
        <span className="text-xs text-slate-500">
          {fmt(sorted.length)} of {fmt(rows.length)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700">
            {PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "All rows" : `${n} rows`}
              </option>
            ))}
          </select>
          <div className="flex items-center rounded-lg border border-slate-200">
            <button
              type="button"
              disabled={safePage <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="flex h-9 w-9 items-center justify-center text-slate-600 hover:text-emerald-700 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[56px] border-x border-slate-200 text-center text-xs font-medium text-slate-600">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              className="flex h-9 w-9 items-center justify-center text-slate-600 hover:text-emerald-700 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={exportExcel}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700">
            <Download className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      <div className="max-h-[calc(100vh-300px)] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className={`${th} w-12 text-center`}>#</th>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={`${th} cursor-pointer select-none transition-colors hover:bg-slate-100 hover:text-slate-800 ${
                    c.type === "num" ? "text-right" : ""
                  } ${sort.key === c.key ? "text-slate-800" : ""}`}
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
              <th className={`${th} text-center`}>Action</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((l, i) => {
              const status = getReadyStatusUi(l)
              const overdue = num(l.overdueDays)
              const sold = soldOf(l)
              const destroyed = destroyedOf(l)
              const inShed = num(l.availableQuantity)
              return (
                <tr
                  key={`${l.secondaryInwardId}-${l.slotId}`}
                  className="transition-colors odd:bg-white even:bg-slate-50/60 hover:bg-emerald-50/50">
                  <td className={`${td} text-center text-xs text-slate-400`}>
                    {safePage * size + i + 1}
                  </td>
                  <td className={`${td} font-semibold text-slate-900`}>
                    {l.batchNumber || "—"}
                    {l.isReturn && (
                      <Tooltip
                        title={`Returned from vehicle${l.returnReason ? ` · ${l.returnReason}` : ""}${
                          l.returnedAt ? ` · ${dayLabel(l.returnedAt)}` : ""
                        }`}
                        arrow
                        slotProps={tooltipSlotProps}>
                        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                          <Undo2 className="h-3 w-3" />
                          Returned
                        </span>
                      </Tooltip>
                    )}
                  </td>
                  <td className={td}>
                    {l.size ? (
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${
                          SIZE_UI[l.size] || "bg-slate-50 text-slate-600 ring-slate-200"
                        }`}>
                        {l.size}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className={td}>{l.pollyhouse || "—"}</td>
                  <td className={td}>{dayLabel(lagwadValue(l))}</td>
                  <td className={td}>{dayLabel(readyValue(l))}</td>
                  <td className={tdNum}>
                    {fmt(l.numberOfTrays)}
                    {l.cavity ? <span className="ml-1 text-[11px] text-slate-400">×{l.cavity}</span> : null}
                  </td>
                  <td className={tdNum}>{fmt(l.totalQuantity)}</td>
                  <td className={`${tdNum} ${sold ? "font-medium text-indigo-600" : "text-slate-300"}`}>
                    {fmt(sold)}
                  </td>
                  <td className={`${tdNum} ${destroyed ? "font-medium text-rose-600" : "text-slate-300"}`}>
                    {destroyed > 0 ? (
                      <button
                        type="button"
                        onClick={() => setLogLine(l)}
                        title="View destroy log"
                        className="underline decoration-dotted underline-offset-2 hover:text-rose-800">
                        {fmt(destroyed)}
                      </button>
                    ) : (
                      fmt(destroyed)
                    )}
                  </td>
                  <td className={`${tdNum} font-semibold ${inShed ? "text-emerald-700" : "text-slate-300"}`}>
                    {fmt(inShed)}
                  </td>
                  <td className={`${tdNum} text-slate-600`}>{fmt(l.sell90)}</td>
                  <td className={`${tdNum} text-slate-400`}>{fmt(l.mort10)}</td>
                  <td
                    className={`${tdNum} ${
                      overdue >= 7
                        ? "font-semibold text-rose-600"
                        : overdue > 0
                          ? "text-amber-600"
                          : "text-slate-300"
                    }`}>
                    {overdue > 0 ? `+${overdue}d` : "—"}
                  </td>
                  <td className={td}>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                  <td className={`${td} text-slate-500`}>{l.slotLabelResolved || "—"}</td>
                  <td className={`${td} text-center`}>
                    <Tooltip
                      title={inShed > 0 ? "Record destroyed plants" : "No plants left in shed"}
                      arrow
                      slotProps={tooltipSlotProps}>
                      <span>
                        <button
                          type="button"
                          disabled={inShed < 1 || !l.batchId}
                          onClick={() => setDestroyLine(l)}
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-30">
                          <Trash2 className="h-3.5 w-3.5" />
                          Destroy
                        </button>
                      </span>
                    </Tooltip>
                    <Tooltip
                      title="Destroy all remaining of this batch (this shed or all sheds)"
                      arrow
                      slotProps={tooltipSlotProps}>
                      <span>
                        <button
                          type="button"
                          disabled={inShed < 1 || !l.batchId}
                          onClick={() => setDestroyAllLine(l)}
                          className="ml-1 inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-30">
                          All
                        </button>
                      </span>
                    </Tooltip>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td className={`${td} sticky bottom-0 border-t border-slate-200 bg-slate-100 text-center font-bold`}>
                Σ
              </td>
              {COLUMNS.map((c) => (
                <td
                  key={c.key}
                  className={`${SUM_KEYS.has(c.key) ? tdNum : td} sticky bottom-0 border-t border-slate-200 bg-slate-100 font-bold text-slate-900`}>
                  {SUM_KEYS.has(c.key) ? fmt(totals[c.key]) : c.key === "batchNumber" ? "Total" : ""}
                </td>
              ))}
              <td className={`${td} sticky bottom-0 border-t border-slate-200 bg-slate-100`} />
            </tr>
          </tfoot>
        </table>
      </div>

      <DestroyPlantsDialog
        open={Boolean(destroyLine)}
        line={destroyLine}
        onClose={() => setDestroyLine(null)}
        onDone={onChanged}
      />
      <DestroyLogDialog open={Boolean(logLine)} line={logLine} onClose={() => setLogLine(null)} />
      <DestroyRemainingDialog
        open={Boolean(destroyAllLine)}
        line={destroyAllLine}
        estimate={destroyAllEstimate}
        onClose={() => setDestroyAllLine(null)}
        onDone={onChanged}
      />
    </div>
  )
}

export default LagwadLinesTable
