import { slotRangeLabel } from "./capacitySheetUtils"

export const SHED_TAB = "shed"

/** Column grouping the board API understands (?group=N). */
export const GROUP_OPTIONS = [
  { value: 1, label: "Day-wise" },
  { value: 3, label: "3 days" },
  { value: 6, label: "6 days" },
]
export const CUSTOM_GROUP = "custom"
export const MAX_GROUP_DAYS = 30

/** Whole days 1..MAX_GROUP_DAYS, else null. */
export function parseGroup(value) {
  const days = Number(value)
  if (!Number.isInteger(days) || days < 1) return null
  return Math.min(MAX_GROUP_DAYS, days)
}

export function slotTabKey(slotDays) {
  return `${Number(slotDays) || 0}d`
}

/** Rows without slots: crops not sown here (e.g. banana) and varieties with only shed stock. */
export const STOCK_ONLY_DAYS = 0

export function slotTabLabel(slotDays) {
  const days = Number(slotDays) || 0
  if (!days) return "Shed stock only"
  return days === 1 ? "1-Day slots" : `${days}-Day slots`
}

/** One tab per slot length present in the rows, shortest first. */
export function slotTabs(rows) {
  const sizes = [...new Set((rows || []).map((row) => Number(row.slotDays) || 0))].sort((a, b) => {
    if (!a) return 1
    if (!b) return -1
    return a - b
  })
  return sizes.map((days) => ({
    key: slotTabKey(days),
    days,
    label: slotTabLabel(days),
    count: rows.filter((row) => (Number(row.slotDays) || 0) === days).length,
  }))
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function weekday(ddmmyyyy) {
  const [d, m, y] = String(ddmmyyyy || "").split("-").map(Number)
  if (!y) return ""
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}

function spanDays(startDay, endDay) {
  const toTime = (value) => {
    const [d, m, y] = String(value || "").split("-").map(Number)
    return y ? new Date(y, m - 1, d).getTime() : NaN
  }
  const days = Math.round((toTime(endDay) - toTime(startDay)) / 86400000) + 1
  return Number.isFinite(days) ? days : 1
}

/** Date text for one cell: "15 Oct" + weekday, or "19–21 Oct" + "3 days". */
export function cellLabel(cell) {
  if (!cell?.startDay) return { range: "", sub: "" }
  const days = spanDays(cell.startDay, cell.endDay)
  return {
    range: slotRangeLabel(cell.startDay, cell.endDay),
    sub: days === 1 ? weekday(cell.startDay) : `${days} days`,
  }
}

export function hasPlants(cell) {
  return Number(cell?.ready) > 0 || Number(cell?.booked) > 0 || Number(cell?.net) !== 0
}

export const nowCell = (row) => row?.now || row?.current || null

/** The cards one variety shows: now (if it has plants or overdue) then its own dated cells. */
export function rowCards(row) {
  const now = nowCell(row)
  const showNow = hasPlants(now) || Number(now?.overdue?.booked) > 0 || Number(now?.overdue?.unsold) > 0
  return [
    ...(showNow ? [{ ...now, key: "now", isNow: true }] : []),
    ...(row?.cells || []).filter(hasPlants).map((cell) => ({ ...cell, isNow: false })),
  ]
}

/** Excess = dates with free plants to sell; gap = dates where bookings are short. */
export const SHOW_OPTIONS = [
  { value: "excess", label: "Excess (free)" },
  { value: "gap", label: "Gap (short)" },
]

export function modeAmount(cell, mode) {
  const net = Number(cell?.net) || 0
  return mode === "gap" ? Math.max(0, -net) : Math.max(0, net)
}

export function modeCards(row, mode = "excess") {
  return rowCards(row).filter((cell) => modeAmount(cell, mode) > 0)
}

export function modeTotal(row, mode = "excess") {
  return modeCards(row, mode).reduce((acc, cell) => acc + modeAmount(cell, mode), 0)
}

/**
 * Board columns: "now" (current slot + overdue) then one column per date that has plants in any row.
 * Dates with nothing are skipped, so 16 Oct can sit right next to 20 Oct.
 */
export function boardColumns(rows) {
  const list = rows || []
  const ranges = new Set(list.map((row) => nowCell(row)).filter((cell) => cell?.startDay).map((cell) => `${cell.startDay}|${cell.endDay}`))
  const [nowStart, nowEnd] = ranges.size === 1 ? [...ranges][0].split("|") : ["", ""]
  const columns = [
    {
      key: "now",
      startDay: nowStart,
      endDay: nowEnd,
      range: nowStart ? slotRangeLabel(nowStart, nowEnd) : "",
      shared: ranges.size <= 1,
      sub: "Now + overdue",
    },
  ]
  const byKey = new Map()
  for (const row of list) {
    for (const cell of row.cells || []) {
      if (!byKey.has(cell.key)) byKey.set(cell.key, cell)
    }
  }
  for (const [key, cell] of [...byKey].sort(([a], [b]) => a.localeCompare(b))) {
    columns.push({ key, startDay: cell.startDay, endDay: cell.endDay, shared: true, ...cellLabel(cell) })
  }
  return columns
}

export function cellFor(row, column) {
  if (column.key === "now") return nowCell(row)
  return (row.cells || []).find((cell) => cell.key === column.key) || null
}

/** Rows grouped under their crop, in the order the crops first appear (keeps urgent-first sorting). */
export function groupByCrop(rows) {
  const groups = new Map()
  for (const row of rows || []) {
    if (!groups.has(row.plantName)) groups.set(row.plantName, [])
    groups.get(row.plantName).push(row)
  }
  return [...groups].map(([crop, list]) => ({ crop, rows: list }))
}

export function isUrgent(row) {
  return Number(row?.current?.net) < 0 || Number(row?.current?.overdue?.booked) > 0
}

export function hasOverdue(row) {
  return Number(row?.current?.overdue?.booked) > 0 || Number(row?.current?.overdue?.unsold) > 0
}

/** mode "excess" / "gap" keeps only varieties that have at least one such date; no mode keeps all. */
export function filterRows(rows, { search = "", crop = "", mode = "" } = {}) {
  const q = search.trim().toLowerCase()
  return (rows || []).filter((row) => {
    if (crop && row.plantName !== crop) return false
    if (q && !`${row.plantName} ${row.subtypeName}`.toLowerCase().includes(q)) return false
    if (mode) return modeCards(row, mode).length > 0
    return true
  })
}

function name(row) {
  return `${row.plantName || ""} ${row.subtypeName || ""}`.toLowerCase()
}

function sortValue(row, sort, columns) {
  if (sort.key === "name") return name(row)
  if (sort.key === "stock") return Number(row.stock?.inShed) || 0
  if (sort.key === "total") return sort.mode ? modeTotal(row, sort.mode) : Number(row.totals?.ready) || 0
  const column = columns.find((c) => c.key === sort.key)
  return column ? Number(cellFor(row, column)?.net) || 0 : 0
}

/** Default "urgent" order puts short / overdue varieties first, most short on top. */
export function sortRows(rows, sort, columns) {
  const list = (rows || []).slice()
  if (!sort || sort.key === "urgent") {
    return list.sort((a, b) => {
      const ua = isUrgent(a) ? 0 : 1
      const ub = isUrgent(b) ? 0 : 1
      if (ua !== ub) return ua - ub
      const na = Number(a.current?.net) || 0
      const nb = Number(b.current?.net) || 0
      if (na !== nb) return na - nb
      return name(a).localeCompare(name(b))
    })
  }
  return list.sort((a, b) => {
    const av = sortValue(a, sort, columns)
    const bv = sortValue(b, sort, columns)
    let order = typeof av === "string" ? av.localeCompare(bv) : av - bv
    if (order === 0) order = name(a).localeCompare(name(b))
    return sort.dir === "desc" ? -order : order
  })
}

export function columnTotals(rows, columns) {
  return columns.map((column) =>
    (rows || []).reduce(
      (acc, row) => {
        const cell = cellFor(row, column)
        return {
          ready: acc.ready + (Number(cell?.ready) || 0),
          booked: acc.booked + (Number(cell?.booked) || 0),
          net: acc.net + (Number(cell?.net) || 0),
          overdue: acc.overdue + (Number(cell?.overdue?.booked) || 0),
        }
      },
      { ready: 0, booked: 0, net: 0, overdue: 0 }
    )
  )
}

/** Batch-wise stock lines, one per shed batch, for stock-only varieties. */
export function stockBatchSheet(rows, title) {
  return {
    title,
    headers: ["Plant", "Subtype", "Shed", "Batch", "Lagwad date", "Ready on", "In shed", "Ready now", "Not ready yet", "Next ready"],
    rows: rows.flatMap((row) =>
      (row.stock?.batches || []).map((batch) => [
        row.plantName,
        row.subtypeName,
        batch.shed,
        batch.batchNumber,
        batch.lagwadDate ? String(batch.lagwadDate).slice(0, 10) : "",
        batch.readyDate ? String(batch.readyDate).slice(0, 10) : "",
        batch.inShed || 0,
        batch.readyNow || 0,
        batch.notReady || 0,
        batch.nextReadyDate ? String(batch.nextReadyDate).slice(0, 10) : "",
      ])
    ),
  }
}

export function exportSheet(rows, columns, title) {
  const headers = ["Plant", "Subtype", "Stock in shed", "Ready now in shed"]
  for (const column of columns) {
    const label = column.key === "now" ? `Now ${column.range}`.trim() : column.range
    headers.push(`${label} ready`, `${label} booked`, `${label} net`)
    if (column.key === "now") headers.push("Overdue booked", "Overdue unsold")
  }
  headers.push("Total ready")
  return {
    title,
    headers,
    rows: rows.map((row) => {
      const line = [row.plantName, row.subtypeName, row.stock?.inShed || 0, row.stock?.readyNow || 0]
      for (const column of columns) {
        const cell = cellFor(row, column)
        line.push(cell?.ready || 0, cell?.booked || 0, cell?.net || 0)
        if (column.key === "now") line.push(cell?.overdue?.booked || 0, cell?.overdue?.unsold || 0)
      }
      line.push(row.totals?.ready || 0)
      return line
    }),
  }
}
