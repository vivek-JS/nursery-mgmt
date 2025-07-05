import { CookieKeys, CookieOptions } from "constants/cookieKeys"
import { useCookies } from "react-cookie"
import { UserDataDispatcher } from "redux/dispatcher/userDataState"
export function useUserSession() {
  const [cookies, setCookie, removeCookie] = useCookies([CookieKeys.Auth, CookieKeys.REFRESH_TOKEN])

  const setSession = (data) => {
    setCookie(CookieKeys.Auth, data.token, CookieOptions)
    setCookie(CookieKeys.REFRESH_TOKEN, data.refresh_token, CookieOptions)
    UserDataDispatcher.saveData(data?.response?.data)
  }

  const deleteSession = () => {
    const cookieNames = Object.keys(cookies)
    cookieNames.map((cookie) => {
      removeCookie(cookie, CookieOptions)
    })
  }

  const isValidSession = () => {
    const hasToken =
      cookies[CookieKeys.Auth] !== undefined &&
      cookies[CookieKeys.Auth] !== null &&
      cookies[CookieKeys.Auth] !== "undefined" &&
      cookies[CookieKeys.Auth] !== "null"

    return hasToken
  }

  return {
    setSession,
    deleteSession,
    isValidSession
  }
}
