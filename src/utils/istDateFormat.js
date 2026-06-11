import moment from "moment"

/** India Standard Time — farmer-facing order dates and WATI templates. */
export const WATI_IST_OFFSET_MINUTES = 330

/** Table / modal display — e.g. 15-June 2025 */
export const ORDER_DATE_DISPLAY_FORMAT = "D-MMMM YYYY"

/** WATI order accepted / dispatch template dates — e.g. 15-June-2026 */
export const WATI_TEMPLATE_DATE_FORMAT = "D-MMMM-YYYY"

/**
 * Parse stored order/API dates as an IST calendar day (avoids UTC midnight showing previous day).
 * @param {Date|string|number|null|undefined} value
 * @returns {moment.Moment|null}
 */
export function momentInIst(value) {
  if (value == null || value === "") return null
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const m = moment(s.slice(0, 10), "YYYY-MM-DD").utcOffset(WATI_IST_OFFSET_MINUTES, true)
    return m.isValid() ? m : null
  }
  if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
    const m = moment(s.slice(0, 10), "DD-MM-YYYY").utcOffset(WATI_IST_OFFSET_MINUTES, true)
    return m.isValid() ? m : null
  }
  const m = moment(value).utcOffset(WATI_IST_OFFSET_MINUTES)
  return m.isValid() ? m : null
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

/** delivery_final_second template — e.g. 15-June-2026 */
export function formatWatiDeliveryFinalSecondDate(value, fallback = "N/A") {
  return formatWatiTemplateDate(value, fallback)
}
