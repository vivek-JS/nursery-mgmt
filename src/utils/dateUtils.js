import moment from "moment"

export const GET_API_DATE = (date) => {
  return moment(date).format("YYYY-MM-DD")
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
