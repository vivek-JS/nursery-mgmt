/**
 * Utility functions for managing motivational quote display
 */

/**
 * Check if user has seen today's quote
 * @returns {boolean} True if user has seen today's quote
 */
export const hasSeenTodaysQuote = () => {
  const lastSeenDate = localStorage.getItem("lastQuoteSeenDate")
  const today = new Date().toDateString()
  return lastSeenDate === today
}

/**
 * Mark today's quote as seen
 */
export const markQuoteAsSeen = () => {
  const today = new Date().toDateString()
  localStorage.setItem("lastQuoteSeenDate", today)
}

/**
 * Reset the quote display (clear the seen date)
 * This will allow the quote to show again
 */
export const resetQuoteDisplay = () => {
  localStorage.removeItem("lastQuoteSeenDate")
  console.log("✅ Quote display reset - quote will show on next login/page load")
}

/**
 * Get the last seen date
 * @returns {string|null} The last seen date or null if never seen
 */
export const getLastSeenDate = () => {
  return localStorage.getItem("lastQuoteSeenDate")
}

/**
 * Force show quote on next check (for testing)
 * This clears the seen date
 */
export const forceShowQuote = () => {
  resetQuoteDisplay()
  console.log("✅ Quote will be shown on next login/page load")
}

// Make functions available globally for easy console access
if (typeof window !== "undefined") {
  window.resetQuote = resetQuoteDisplay
  window.forceShowQuote = forceShowQuote
  window.getLastQuoteDate = getLastSeenDate
  window.hasSeenQuote = hasSeenTodaysQuote
}

