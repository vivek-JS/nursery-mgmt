import moment from "moment"

export function daysPastSlotEnd(endDay, asOf = new Date()) {
  if (!endDay) return 0
  const end = moment(endDay, "DD-MM-YYYY", true).endOf("day")
  const today = moment(asOf).startOf("day")
  if (!end.isValid()) return 0
  return Math.max(0, today.diff(end, "days"))
}

export function formatExpectedReadyDate(iso) {
  if (!iso) return "—"
  const m = moment(iso)
  return m.isValid() ? m.format("D MMM YYYY") : "—"
}

export function isSlotFutureWindow(slot, asOf = new Date()) {
  const startDay = slot?.startDay
  if (!startDay || typeof startDay !== "string") return false
  const start = moment(startDay, "DD-MM-YYYY", true).startOf("day")
  const today = moment(asOf).startOf("day")
  return start.isValid() && start.isAfter(today)
}

export function daysFromTodayToDate(iso) {
  if (!iso) return null
  const m = moment(iso).startOf("day")
  const today = moment().startOf("day")
  if (!m.isValid()) return null
  return m.diff(today, "days")
}
