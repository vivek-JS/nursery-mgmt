import { format, addDays, parseISO, isValid } from "date-fns"

/**
 * Utility functions for date formatting and manipulation
 */
const dateUtils = {
  /**
   * Format a date string to a readable format
   *
   * @param {string|Date} date - Date to format
   * @param {string} formatStr - Format string (default: 'dd MMM yyyy')
   * @returns {string} Formatted date string
   */
  formatDate: (date, formatStr = "dd MMM yyyy") => {
    if (!date) return ""

    let dateObj

    if (typeof date === "string") {
      // Handle "DD-MM-YYYY" format
      if (date.includes("-") && date.length === 10) {
        const [day, month, year] = date.split("-")
        dateObj = new Date(`${year}-${month}-${day}`)
      } else {
        // Try to parse as ISO date
        dateObj = parseISO(date)
      }
    } else {
      // Already a Date object
      dateObj = date
    }

    if (!isValid(dateObj)) return date.toString()

    return format(dateObj, formatStr)
  },

  /**
   * Get preset date ranges for quick selection
   *
   * @returns {Object} Object containing preset date ranges
   */
  getPresetDateRanges: () => {
    const today = new Date()

    return {
      nextWeek: {
        start: today,
        end: addDays(today, 7),
        label: "Next Week"
      },
      nextTwoWeeks: {
        start: today,
        end: addDays(today, 14),
        label: "Next Two Weeks"
      },
      nextMonth: {
        start: today,
        end: addDays(today, 30),
        label: "Next Month"
      }
    }
  },

  /**
   * Format a date for API request
   *
   * @param {Date} date - Date to format
   * @returns {string} Date formatted as YYYY-MM-DD
   */
  formatForApi: (date) => {
    return format(date, "yyyy-MM-dd")
  }
}

export default dateUtils
