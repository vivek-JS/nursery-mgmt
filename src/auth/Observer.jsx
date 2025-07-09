import { useUserSession } from "hooks/userSession"
import { useEffect, useCallback } from "react"
import { useSelector } from "react-redux"
import { UserState } from "redux/dispatcher/UserState"

export function SessionObserver() {
  console.log("🔄 SessionObserver: Initializing...")

  const userSession = useUserSession()
  const appState = useSelector((store) => store?.app)
  const { observe, isLogged } = appState || { observe: null, isLogged: false }

  console.log("🔄 SessionObserver: Store state:", { observe, isLogged })

  const fetchUserProfile = useCallback(async () => {
    try {
      console.log("🔄 Fetching user profile...")

      // You can implement a profile fetch here if needed
      // For now, we'll just set the login state to true
      // since the session is valid
      UserState.login({})

      // If we're on the login page and have a valid session, redirect to dashboard
      if (window.location.pathname === "/auth/login") {
        console.log("🔄 Redirecting to dashboard from login page")
        window.location.href = "/u/dashboard"
      }
    } catch (error) {
      console.error("❌ Error fetching user profile:", error)
      // If profile fetch fails, clear the session
      try {
        userSession?.deleteSession?.()
        UserState.logout()
      } catch (logoutError) {
        console.error("❌ Error during logout:", logoutError)
      }
    }
  }, [userSession])

  useEffect(() => {
    try {
      // Handle logout observation
      if (userSession?.isValidSession?.()) {
        if (observe) userSession.deleteSession()
      }
    } catch (error) {
      console.error("❌ Error in logout observation:", error)
    }
  }, [observe, userSession])

  useEffect(() => {
    try {
      // Clear persisted state on app startup (for debugging)
      const clearPersistedState = () => {
        try {
          localStorage.removeItem("persist:root")
          sessionStorage.removeItem("persist:root")
          console.log("🧹 Cleared persisted Redux state")
        } catch (error) {
          console.error("Error clearing persisted state:", error)
        }
      }

      // Synchronize initial state between localStorage and Redux
      const hasValidSession = userSession?.isValidSession?.() || false

      // Clear persisted state if user is not logged in but Redux thinks they are
      if (!hasValidSession && isLogged) {
        console.log("🧹 Clearing persisted state due to invalid session")
        clearPersistedState()
      }

      console.log("🔄 Session Observer:", {
        hasValidSession,
        isLogged,
        currentPath: window.location.pathname
      })

      if (hasValidSession && !isLogged) {
        // User has valid session but Redux state is not logged in
        // This can happen on page refresh or app restart
        // We need to fetch user data and update Redux state
        fetchUserProfile()
      } else if (!hasValidSession && isLogged) {
        // User has no valid session but Redux state shows logged in
        // This is inconsistent, so we should logout
        console.log("🚪 Logging out due to invalid session")
        UserState.logout()
      }
    } catch (error) {
      console.error("❌ Error in session synchronization:", error)
    }
  }, [userSession, isLogged, fetchUserProfile])

  return null
}
