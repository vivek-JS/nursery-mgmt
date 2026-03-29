import moment from "moment";

/**
 * Parse order delivery/booking dates as calendar days (avoids UTC ISO strings shifting the day in local TZ).
 * Returns a Moment instance (this file uses moment.js). Safe to use .diff(), .isSameOrAfter(), .format(), etc.
 * Note: `nursery-mgmt-mobile` has a different `parseOrderDate` that returns native Date — do not copy-paste logic across apps without checking.
 * @param {string|Date|import("moment").Moment} raw
 * @returns {import("moment").Moment|null}
 */
export const parseOrderDate = (raw) => {
  if (raw == null || raw === "") return null;
  if (moment.isMoment(raw)) {
    const m = raw.clone();
    return m.isValid() ? m.startOf("day") : null;
  }
  if (raw instanceof Date) {
    return moment([raw.getFullYear(), raw.getMonth(), raw.getDate()]);
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const m = moment(s.slice(0, 10), "YYYY-MM-DD", true);
    return m.isValid() ? m : null;
  }
  if (/^\d{2}-\d{2}-\d{4}/.test(s)) {
    const m = moment(s.slice(0, 10), "DD-MM-YYYY", true);
    return m.isValid() ? m : null;
  }
  const m = moment(s);
  return m.isValid() ? m : null;
};

/**
 * ISO string for API: calendar date stored as UTC midnight for that YYYY-MM-DD (stable across timezones).
 * @param {string|Date|import("moment").Moment} raw
 * @returns {string|null}
 */
export const toDeliveryDateISOString = (raw) => {
  const m = parseOrderDate(raw);
  if (!m || !m.isValid()) return null;
  return moment.utc(m.format("YYYY-MM-DD"), "YYYY-MM-DD").toISOString();
};

/**
 * True if the calendar due date is strictly before today (local).
 */
export const isOrderPastDue = (raw) => {
  const m = parseOrderDate(raw);
  if (!m || !m.isValid()) return false;
  return m.startOf("day").isBefore(moment().startOf("day"));
};

/**
 * Get default date range (1 week from today)
 * @returns {Object} { startDate, endDate } in DD-MM-YYYY format
 */
export const getDefaultDateRange = () => {
  const today = moment();
  const oneWeekLater = moment().add(7, "days");
  
  return {
    startDate: today.format("DD-MM-YYYY"),
    endDate: oneWeekLater.format("DD-MM-YYYY"),
  };
};

/**
 * Check if order's due delivery date has passed
 * @param {string|Date} dueDate - Due delivery date
 * @returns {boolean} True if due date has passed
 */
export const isDueDatePassed = (dueDate) => {
  return isOrderPastDue(dueDate);
};

/**
 * Format date for API (DD-MM-YYYY)
 * @param {moment.Moment|Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForAPI = (date) => {
  if (!date) return null;
  const m = parseOrderDate(date);
  if (m && m.isValid()) return m.format("DD-MM-YYYY");
  return moment(date).format("DD-MM-YYYY");
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string (DD-MMM-YYYY) or "N/A"
 */
export const formatDateForDisplay = (date) => {
  const m = parseOrderDate(date);
  if (!m || !m.isValid()) return "N/A";
  return m.format("DD-MMM-YYYY");
};






