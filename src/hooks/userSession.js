import { UserDataDispatcher } from "redux/dispatcher/userDataState"

export function useUserSession() {
  const setSession = (data) => {
    localStorage.setItem("accessToken", data.token)
    localStorage.setItem("refreshToken", data.refresh_token)
    UserDataDispatcher.saveData(data?.response?.data)
  }

  const deleteSession = () => {
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")
  }

  const isValidSession = () => {
    const hasToken =
      localStorage.getItem("accessToken") !== undefined &&
      localStorage.getItem("accessToken") !== null &&
      localStorage.getItem("accessToken") !== "undefined" &&
      localStorage.getItem("accessToken") !== "null"

    return hasToken
  }

  return {
    setSession,
    deleteSession,
    isValidSession
  }
}
