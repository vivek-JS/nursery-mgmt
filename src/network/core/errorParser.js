import { Toast } from "helpers/toasts/toastHelper"

export const apiError = (error) => {
  if (!error) {
    return;
  }
  
  if (Array.isArray(error)) {
    error?.forEach((msg) => {
      Toast.error(msg)
    })
  } else if (typeof error === "object") {
    // Handle error objects with message property
    const errorMessage = error?.message || error?.error || JSON.stringify(error);
    Toast.error(errorMessage)
  } else if (typeof error === "string") {
    // Handle string error messages
    Toast.error(error)
  } else {
    // Fallback for any other type
    Toast.error(String(error))
  }
}

export const offlineNotation = () => {
  Toast.info("The network seems to be not working, proceeding with offline data")
}
