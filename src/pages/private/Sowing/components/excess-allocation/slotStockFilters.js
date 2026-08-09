import { parseSlotDay, isSlotEmpty } from "./slotStockUtils"

export const SLOTS_PAGE_SIZE = 16

export function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function monthLabel(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "Month"
  const [y, m] = ym.split("-").map(Number)
  const dt = new Date(y, m - 1, 1)
  return dt.toLocaleDateString("en-IN", { month: "long", year: "numeric" })
}

export function shiftMonth(ym, delta) {
  const [y, m] = String(ym || currentMonthKey())
    .split("-")
    .map(Number)
  const dt = new Date(y, m - 1 + delta, 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
}

export function monthRangeDdMm(ym) {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return { startDate: null, endDate: null }
  const [y, m] = ym.split("-").map(Number)
  const last = new Date(y, m, 0).getDate()
  const pad = (n) => String(n).padStart(2, "0")
  return {
    startDate: `01-${pad(m)}-${y}`,
    endDate: `${pad(last)}-${pad(m)}-${y}`,
  }
}

export function slotMonthKey(row) {
  const d = parseSlotDay(row?.slotEndDay || row?.slotStartDay)
  if (!d) return "Unknown"
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function slotMonthLabel(key) {
  return monthLabel(key)
}

/** Client-side backup filter when API already scoped month. */
export function filterRowsBySowWindow(rows, { showOverdue, showToday, horizonDays, fullMonth }) {
  if (fullMonth || !rows?.length) return rows
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayMs = today.getTime()

  return rows.filter((r) => {
    if ((Number(r.availablePlants) || 0) > 0 || (Number(r.gap) || 0) > 0) return true
    const d = parseSlotDay(r.sowByDate || r.slotEndDay)
    if (!d) return !isSlotEmpty(r)
    d.setHours(0, 0, 0, 0)
    const off = Math.round((d.getTime() - todayMs) / 86400000)
    if (showOverdue && off < 0) return true
    if (showToday && off === 0) return true
    if (horizonDays > 0 && off > 0 && off <= horizonDays) return true
    return false
  })
}

export function buildBoardQuery({
  month,
  showOverdue,
  showToday,
  horizonDays,
  showActiveOnly,
  fullMonth,
}) {
  const { startDate, endDate } = monthRangeDdMm(month)
  return {
    board: "true",
    month,
    startDate,
    endDate,
    overdue: showOverdue ? "true" : "false",
    today: showToday ? "true" : "false",
    horizonDays: String(Math.max(0, Math.min(7, Number(horizonDays) || 0))),
    includeEmpty: showActiveOnly ? "false" : "true",
    fullMonth: fullMonth ? "true" : "false",
  }
}
