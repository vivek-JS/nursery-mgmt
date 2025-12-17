/**
 * Format number to fixed 2 decimal places if it has more than 2 decimal places
 * @param {number|string} num - Number to format
 * @returns {string|number} Formatted number
 */
export const formatDecimal = (num) => {
  if (num === null || num === undefined || num === "") return num
  
  const numValue = typeof num === "string" ? parseFloat(num) : num
  
  if (isNaN(numValue)) return num
  
  // Check if number has more than 2 decimal places
  const numStr = numValue.toString()
  const decimalIndex = numStr.indexOf(".")
  
  if (decimalIndex === -1) {
    // No decimal point, return as is
    return numValue
  }
  
  const decimalPart = numStr.substring(decimalIndex + 1)
  if (decimalPart.length > 2) {
    // Has more than 2 decimal places, fix to 2
    return parseFloat(numValue.toFixed(2))
  }
  
  // 2 or fewer decimal places, return as is
  return numValue
}

/**
 * Format number with currency symbol and fixed 2 decimal places if needed
 * @param {number|string} amount - Amount to format
 * @param {boolean} showCurrency - Whether to show currency symbol (default: true)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, showCurrency = true) => {
  const formatted = formatDecimal(amount)
  if (showCurrency) {
    return `₹${formatted.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return formatted.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}







