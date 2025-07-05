import { useUserSession } from "./userSession"
import { useSelector } from "react-redux"

// custom hooks to get state stored in redux
export const useIsLoggedIn = () => {
  const userSession = useUserSession()
  const { isLogged } = useSelector((store) => store.app)

  // Debug logging
  const hasValidSession = userSession.isValidSession()
  console.log("🔍 Auth Debug:", {
    hasValidSession,
    isLogged,
    finalResult: hasValidSession && isLogged,
    cookies: userSession.isValidSession()
  })

  // Check both session validity and Redux state
  return hasValidSession && isLogged
}
