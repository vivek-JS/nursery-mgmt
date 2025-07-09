import { useUserSession } from "./userSession"
import { useSelector } from "react-redux"

// custom hooks to get state stored in redux
export const useIsLoggedIn = () => {
  try {
    const userSession = useUserSession()
    const appState = useSelector((store) => store?.app)
    const isLogged = appState?.isLogged || false

    // Debug logging
    const hasValidSession = userSession?.isValidSession?.() || false
    console.log("🔍 Auth Debug:", {
      hasValidSession,
      isLogged,
      finalResult: hasValidSession && isLogged,
      cookies: hasValidSession,
      appStateExists: !!appState,
      env: process.env.REACT_APP_APP_ENV || "dev"
    })

    // Check both session validity and Redux state
    return hasValidSession && isLogged
  } catch (error) {
    console.error("❌ Error in useIsLoggedIn:", error)
    return false
  }
}
