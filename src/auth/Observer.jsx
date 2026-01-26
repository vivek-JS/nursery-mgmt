import { useUserSession } from "hooks/userSession"
import { useEffect } from "react"
import { useSelector } from "react-redux"
import { UserState } from "redux/dispatcher/UserState"

export function SessionObserver() {
  const userSession = useUserSession()
  const { observe, isLogged } = useSelector((store) => store.app)

  useEffect(() => {
    // Handle logout observation
    if (userSession.isValidSession()) {
      if (observe) userSession.deleteSession()
    }
  }, [observe])

  useEffect(() => {
    // Clear persisted state on app startup (for debugging)
    const clearPersistedState = () => {
      try {
        localStorage.removeItem("persist:root")
        sessionStorage.removeItem("persist:root")
      } catch (error) {
        console.error("Error clearing persisted state:", error)
      }
    }

    // Uncomment the line below to clear persisted state on app startup
    // clearPersistedState()

    // Synchronize initial state between cookies and Redux
    const hasValidSession = userSession.isValidSession()

    if (hasValidSession && !isLogged) {
      // User has valid session but Redux state is not logged in
      // This can happen on page refresh or app restart
      // We need to fetch user data and update Redux state
      fetchUserProfile()
    } else if (!hasValidSession && isLogged) {
      // User has no valid session but Redux state shows logged in
      // This is inconsistent, so we should logout
      UserState.logout()
    }
  }, [userSession, isLogged])

  const fetchUserProfile = async () => {
    try {
      // You can implement a profile fetch here if needed
      // For now, we'll just set the login state to true
      // since the session is valid
      UserState.login({})

      // If we're on the login page and have a valid session, redirect to dashboard
      // With BrowserRouter, check pathname directly
      const currentPath = window.location.pathname
      if (currentPath === "/auth/login" || currentPath === "" || currentPath === "/") {
        window.location.href = "/u/dashboard"
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      // If profile fetch fails, clear the session
      userSession.deleteSession()
      UserState.logout()
    }
  }

  return null
}
