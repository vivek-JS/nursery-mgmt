import moment from "moment"

/** India Standard Time — all farmer-facing dates and admin MIS ranges. */
export const IST_OFFSET_MINUTES = 330
export const IST_OFFSET = "+05:30"

export const ORDER_DATE_DISPLAY_FORMAT = "D-MMMM YYYY"
export const WATI_TEMPLATE_DATE_FORMAT = "D-MMMM-YYYY"
export const MIS_DAILY_DATE_FORMAT = "D MMM YYYY"
export const API_YMD_FORMAT = "YYYY-MM-DD"
export const SLOT_DAY_FORMAT = "DD-MM-YYYY"

function momentFromStoredInstant(value) {
  const d = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(d.getTime())) return null
  return moment(d).utcOffset(IST_OFFSET_MINUTES)
}

/**
 * Parse stored order/API dates as an IST calendar day.
 * ISO datetimes use true IST offset (e.g. 2026-06-10T18:30:00Z → 11 Jun IST).
 */
export function momentInIst(value) {
  if (value == null || value === "") return null

  if (value instanceof Date) {
    return momentFromStoredInstant(value)
  }

  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const m = moment(s, API_YMD_FORMAT).utcOffset(IST_OFFSET_MINUTES, true)
    return m.isValid() ? m : null
  }
  if (/^\d{4}-\d{2}-\d{2}[Tt]/.test(s)) {
    return momentFromStoredInstant(s)
  }
  if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
    const m = moment(s.slice(0, 10), SLOT_DAY_FORMAT).utcOffset(IST_OFFSET_MINUTES, true)
    return m.isValid() ? m : null
  }

  const m = moment(value).utcOffset(IST_OFFSET_MINUTES)
  return m.isValid() ? m : null
}

/** Start of today in IST (for slot pickers, past-due checks). */
export function istTodayMoment() {
  return moment().utcOffset(IST_OFFSET_MINUTES).startOf("day")
}

export function istTodayYmd() {
  return istTodayMoment().format(API_YMD_FORMAT)
}

export function istYesterdayYmd() {
  return istTodayMoment().clone().subtract(1, "day").format(API_YMD_FORMAT)
}

/** Inclusive IST calendar days from startYmd through endYmd (YYYY-MM-DD). */
export function generateIstDateKeys(startYmd, endYmd) {
  const keys = []
  const cur = parseIstYmd(startYmd)
  const end = parseIstYmd(endYmd)
  if (!cur || !end) return keys
  const walk = cur.clone()
  while (walk.isSameOrBefore(end, "day")) {
    keys.push(walk.format(API_YMD_FORMAT))
    walk.add(1, "day")
  }
  return keys
}

/** Admin MIS / API date range — mirrors backend parseYmdRange (IST calendar days). */
export function parseIstYmdRange(startDate, endDate) {
  const startYmd = String(startDate || "").slice(0, 10)
  const endYmd = String(endDate || "").slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)) {
    return { error: "startDate and endDate are required (YYYY-MM-DD)" }
  }
  const startMoment = parseIstYmd(startYmd)
  const endMoment = parseIstYmd(endYmd)
  if (!startMoment || !endMoment) {
    return { error: "Invalid date format" }
  }
  if (endMoment.isBefore(startMoment)) {
    return { error: "endDate must be on or after startDate" }
  }
  return {
    startYmd,
    endYmd,
    dayCount: endMoment.diff(startMoment, "days") + 1,
    dateKeys: generateIstDateKeys(startYmd, endYmd),
  }
}

/** Parse YYYY-MM-DD as an IST calendar day (admin MIS API keys). */
export function parseIstYmd(ymd) {
  if (!ymd) return null
  const m = moment(String(ymd).slice(0, 10), API_YMD_FORMAT, true).utcOffset(
    IST_OFFSET_MINUTES,
    true
  )
  return m.isValid() ? m.startOf("day") : null
}

/** YYYY-MM-DD key for API queries and date comparisons. */
export function formatIstYmd(value) {
  const m = momentInIst(value)
  return m ? m.format(API_YMD_FORMAT) : ""
}

export function sameIstCalendarDay(a, b) {
  const ka = formatIstYmd(a)
  const kb = formatIstYmd(b)
  return ka !== "" && ka === kb
}

export function formatOrderDateDisplay(value, fallback = "-") {
  const m = momentInIst(value)
  if (!m) return value != null && value !== "" ? String(value) : fallback
  return m.format(ORDER_DATE_DISPLAY_FORMAT)
}

export function formatWatiTemplateDate(value, fallback = "N/A") {
  const m = momentInIst(value)
  if (!m) return fallback
  return m.format(WATI_TEMPLATE_DATE_FORMAT)
}

export function formatWatiDeliveryFinalSecondDate(value, fallback = "N/A") {
  return formatWatiTemplateDate(value, fallback)
}

/** Admin MIS daily row label — API date key or ISO → IST display. */
export function formatMisDailyDate(value, fallback = "—") {
  if (value == null || value === "") return fallback
  if (value === "past-due") return "Past due (before range)"
  const m = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? parseIstYmd(value)
    : momentInIst(value)
  return m ? m.format(MIS_DAILY_DATE_FORMAT) : String(value)
}

/** Date picker → admin MIS API params (IST calendar days). */
export function toApiIstDateRange(start, end) {
  return {
    startDate: start ? formatIstYmd(start) : "",
    endDate: end ? formatIstYmd(end) : "",
  }
}

/** Convert IST calendar chip to Date for API (local midnight = IST for IST users). */
export function istDayToDate(ymdOrMoment) {
  const m = moment.isMoment(ymdOrMoment)
    ? ymdOrMoment.clone().utcOffset(IST_OFFSET_MINUTES, true).startOf("day")
    : parseIstYmd(formatIstYmd(ymdOrMoment) || ymdOrMoment)
  return m ? m.toDate() : null
}
