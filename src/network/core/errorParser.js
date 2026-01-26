import { Toast } from "helpers/toasts/toastHelper"

/**
 * Formats Mongoose validation errors into user-friendly messages
 */
const formatValidationError = (errorMessage) => {
  // Check if it's a Mongoose validation error
  if (typeof errorMessage !== "string" || !errorMessage.includes("validation failed")) {
    return errorMessage
  }

  // Extract validation errors from the message
  // Format: "Model validation failed: field.path: Path `field` (value) is less than minimum allowed value (0)."
  const validationErrors = []
  const errorParts = errorMessage.split(/,\s*(?=[A-Za-z])/)

  errorParts.forEach((part) => {
    // Match patterns like: "varieties.0.stockValue: Path `stockValue` (-496) is less than minimum allowed value (0)."
    // Simplified pattern: [path]: Path `[field]` ([value]) [description]
    const pathMatch = part.match(/([\w.]+):\s*Path\s+`([\w]+)`\s+\(([^)]+)\)\s+(.+?)(?:\.|$)/)
    if (pathMatch) {
      const [, fullPath, fieldName, value, description] = pathMatch
      
      // Extract array index if present (e.g., "varieties.0" -> "varieties[1]" - 1-indexed for user display)
      const pathParts = fullPath.split(".")
      const arrayIndexMatch = pathParts[1]?.match(/^(\d+)$/)
      const friendlyPath = arrayIndexMatch 
        ? `${pathParts[0]}[${parseInt(arrayIndexMatch[1]) + 1}]` 
        : fullPath.replace(".", " > ")

      // Format field name (camelCase to Title Case)
      const friendlyFieldName = fieldName
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim()

      // Format value - handle negative numbers and currency
      let formattedValue = value.trim()
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        if (fieldName.toLowerCase().includes("price") || fieldName.toLowerCase().includes("rate") || fieldName.toLowerCase().includes("value")) {
          const absValue = Math.abs(numValue)
          const sign = numValue < 0 ? "-" : ""
          formattedValue = `${sign}₹${absValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        } else {
          formattedValue = numValue.toLocaleString("en-IN")
        }
      }

      // Format description - make it more user-friendly
      let friendlyDescription = description.toLowerCase()
      if (friendlyDescription.includes("less than minimum")) {
        const minMatch = description.match(/minimum allowed value \(([\d.]+)\)/)
        if (minMatch) {
          const minValue = parseFloat(minMatch[1])
          friendlyDescription = `must be ${minValue.toLocaleString("en-IN")} or greater`
        } else {
          friendlyDescription = "cannot be negative"
        }
      } else if (friendlyDescription.includes("greater than maximum")) {
        const maxMatch = description.match(/maximum allowed value \(([\d.]+)\)/)
        if (maxMatch) {
          const maxValue = parseFloat(maxMatch[1])
          friendlyDescription = `must be ${maxValue.toLocaleString("en-IN")} or less`
        }
      }

      validationErrors.push({
        field: friendlyFieldName,
        path: friendlyPath,
        value: formattedValue,
        issue: friendlyDescription
      })
    }
  })

  // If we successfully parsed validation errors, format them nicely
  if (validationErrors.length > 0) {
    let formattedMessage = "⚠️ Validation Error:\n\n"
    
    validationErrors.forEach((err, index) => {
      formattedMessage += `• ${err.field}: ${err.value} (${err.issue})`
      if (index < validationErrors.length - 1) {
        formattedMessage += "\n"
      }
    })

    return formattedMessage
  }

  // If we couldn't parse it, return original message
  return errorMessage
}

export const apiError = (error) => {
  if (!error) {
    return;
  }
  
  if (Array.isArray(error)) {
    error?.forEach((msg) => {
      const formattedMsg = formatValidationError(msg)
      Toast.error(formattedMsg)
    })
  } else if (typeof error === "object") {
    // Handle error objects with message property
    const errorMessage = error?.message || error?.error || JSON.stringify(error);
    const formattedMsg = formatValidationError(errorMessage)
    Toast.error(formattedMsg)
  } else if (typeof error === "string") {
    // Handle string error messages
    const formattedMsg = formatValidationError(error)
    Toast.error(formattedMsg)
  } else {
    // Fallback for any other type
    Toast.error(String(error))
  }
}

export const offlineNotation = () => {
  Toast.info("The network seems to be not working, proceeding with offline data")
}
