import { useUserSession } from "./userSession"
import { useSelector } from "react-redux"

// custom hooks to get state stored in redux
export const useIsLoggedIn = () => {
  const userSession = useUserSession()
  const { isLogged } = useSelector((store) => store.app)

  // Check both session validity and Redux state
  return userSession.isValidSession() && isLogged
}
