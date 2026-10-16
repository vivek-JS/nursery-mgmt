import { slotRangeLabel } from "./capacitySheetUtils"

export const SHED_TAB = "shed"

/** Slot columns after "today" in the table; the API sends more for the ready-plants message. */
export function tableSlotCount(slotDays) {
  return Number(slotDays) <= 1 ? 7 : 4
}

export function slotTabKey(slotDays) {
  return `${Number(slotDays) || 0}d`
}

export function slotTabLabel(slotDays) {
  const days = Number(slotDays) || 0
  if (!days) return "No slots"
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

function rangeKey(cell) {
  return cell?.startDay ? `${cell.startDay}|${cell.endDay}` : ""
}

function mostCommon(keys) {
  const counts = new Map()
  for (const key of keys) {
    if (key) counts.set(key, (counts.get(key) || 0) + 1)
  }
  let best = ""
  let bestN = 0
  for (const [key, n] of counts) {
    if (n > bestN) {
      best = key
      bestN = n
    }
  }
  return { key: best, shared: counts.size === 1 }
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function weekday(ddmmyyyy) {
  const [d, m, y] = String(ddmmyyyy || "").split("-").map(Number)
  if (!y) return ""
  return WEEKDAYS[new Date(y, m - 1, d).getDay()]
}

/**
 * Board columns: the current slot (with overdue folded in) followed by the next slots.
 * When every row shares a window the header carries the dates; otherwise each cell shows its own.
 */
export function boardColumns(rows, slotDays) {
  const list = rows || []
  const longest = list.reduce((max, row) => Math.max(max, (row.upcoming || []).length), 0)
  const width = Math.min(longest, tableSlotCount(slotDays))
  const dayLabel = Number(slotDays) === 1
  const columnInfo = (cells, index) => {
    const { key, shared } = mostCommon(cells.map(rangeKey))
    const [start, end] = key ? key.split("|") : ["", ""]
    return {
      index,
      range: key ? slotRangeLabel(start, end) : "",
      shared,
      sub: index < 0 ? "Current slot + overdue" : dayLabel && start ? weekday(start) : `Slot ${index + 2}`,
    }
  }
  const columns = [{ key: "current", ...columnInfo(list.map((row) => row.current), -1) }]
  for (let i = 0; i < width; i += 1) {
    columns.push({ key: `u${i}`, ...columnInfo(list.map((row) => row.upcoming?.[i]), i) })
  }
  return columns
}

export function cellFor(row, column) {
  if (column.key === "current") return row.current
  return row.upcoming?.[column.index] || null
}

export function isUrgent(row) {
  return Number(row?.current?.net) < 0 || Number(row?.current?.overdue?.booked) > 0
}

export function hasOverdue(row) {
  return Number(row?.current?.overdue?.booked) > 0 || Number(row?.current?.overdue?.unsold) > 0
}

function cells(row) {
  return [row.current, ...(row.upcoming || []).slice(0, tableSlotCount(row.slotDays))].filter(Boolean)
}

export const CAPACITY_FILTERS = [
  { key: "all", label: "All varieties" },
  { key: "short", label: "Short only" },
  { key: "overdue", label: "Overdue present" },
  { key: "free", label: "Free to sell" },
  { key: "stock", label: "Stock in shed" },
]

export function filterRows(rows, { search = "", crop = "", capacity = "all" } = {}) {
  const q = search.trim().toLowerCase()
  return (rows || []).filter((row) => {
    if (crop && row.plantName !== crop) return false
    if (q && !`${row.plantName} ${row.subtypeName}`.toLowerCase().includes(q)) return false
    if (capacity === "short") return cells(row).some((cell) => Number(cell.net) < 0)
    if (capacity === "overdue") return hasOverdue(row)
    if (capacity === "free") return cells(row).some((cell) => Number(cell.net) > 0)
    if (capacity === "stock") return Number(row.stock?.inShed) > 0
    return true
  })
}

function name(row) {
  return `${row.plantName || ""} ${row.subtypeName || ""}`.toLowerCase()
}

function sortValue(row, sort, columns) {
  if (sort.key === "name") return name(row)
  if (sort.key === "stock") return Number(row.stock?.inShed) || 0
  if (sort.key === "total") return Number(row.totals?.ready) || 0
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

export function exportSheet(rows, columns, title) {
  const headers = ["Plant", "Subtype", "Stock in shed", "Ready now in shed"]
  for (const column of columns) {
    const label = column.key === "current" ? `Current ${column.range}`.trim() : column.range || column.sub
    headers.push(`${label} ready`, `${label} booked`, `${label} net`)
    if (column.key === "current") headers.push("Overdue booked", "Overdue unsold")
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
        if (column.key === "current") line.push(cell?.overdue?.booked || 0, cell?.overdue?.unsold || 0)
      }
      line.push(row.totals?.ready || 0)
      return line
    }),
  }
}
