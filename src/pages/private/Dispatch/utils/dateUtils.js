import moment from "moment";

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
  if (!dueDate) return false;
  const due = moment(dueDate, "DD-MM-YYYY");
  const today = moment().startOf("day");
  return due.isBefore(today);
};

/**
 * Format date for API (DD-MM-YYYY)
 * @param {moment.Moment|Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDateForAPI = (date) => {
  if (!date) return null;
  return moment(date).format("DD-MM-YYYY");
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string (DD-MMM-YYYY) or "N/A"
 */
export const formatDateForDisplay = (date) => {
  if (!date) return "N/A";
  
  // Try parsing with moment (handles ISO, Date objects, and various string formats)
  const parsed = moment(date);
  
  if (parsed.isValid()) {
    return parsed.format("DD-MMM-YYYY");
  }
  
  return "N/A";
};





