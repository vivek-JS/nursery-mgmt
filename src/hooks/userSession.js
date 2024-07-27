import { CookieKeys, CookieOptions } from "constants/cookieKeys"
import { useCookies } from "react-cookie"
import { UserDataDispatcher } from "redux/dispatcher/userDataState"
export function useUserSession() {
  const [cookies, setCookie, removeCookie] = useCookies([CookieKeys.Auth])

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
    return cookies[CookieKeys.Auth] !== undefined
  }

  return {
    setSession,
    deleteSession,
    isValidSession
  }
}
