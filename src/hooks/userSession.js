import { CookieKeys } from "constants/cookieKeys"
import { UserDataDispatcher } from "redux/dispatcher/userDataState"
export function useUserSession() {
  const setSession = (data) => {
    localStorage.setItem(CookieKeys.Auth, data.token)
    localStorage.setItem(CookieKeys.REFRESH_TOKEN, data.refresh_token)
    UserDataDispatcher.saveData(data?.response?.data)
  }

  const deleteSession = () => {
    localStorage.removeItem(CookieKeys.Auth)
    localStorage.removeItem(CookieKeys.REFRESH_TOKEN)
  }

  const isValidSession = () => {
    const hasToken =
      localStorage.getItem(CookieKeys.Auth) !== undefined &&
      localStorage.getItem(CookieKeys.Auth) !== null &&
      localStorage.getItem(CookieKeys.Auth) !== "undefined" &&
      localStorage.getItem(CookieKeys.Auth) !== "null"

    return hasToken
  }

  return {
    setSession,
    deleteSession,
    isValidSession
  }
}
