import { format, isValid } from "date-fns"

export const GET_API_DATE = (date) => {
  if (date == null || date === "") return ""
  const d = date instanceof Date ? date : new Date(date)
  return isValid(d) ? format(d, "yyyy-MM-dd") : ""
}

/**
 * Format date to "DD - MMM - YYYY" format (e.g., "12 - NOV - 2025")
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDisplayDate = (date) => {
  if (!date) return ""

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date
    if (isNaN(dateObj.getTime())) return String(date)

    const day = String(dateObj.getDate()).padStart(2, "0")
    const month = dateObj.toLocaleString("en-US", { month: "short" }).toUpperCase()
    const year = dateObj.getFullYear()

    return `${day} - ${month} - ${year}`
  } catch (error) {
    console.error("Error formatting date:", error)
    return String(date)
  }
}
