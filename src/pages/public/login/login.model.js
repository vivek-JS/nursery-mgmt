import { useUserSession } from "hooks/userSession"
import { NetworkManager, API } from "network/core"
import { UserState } from "redux/dispatcher/UserState"

export const useLoginModel = () => {
  const userSession = useUserSession()

  const loginByEmail = async (values) => {
    try {
      const instance = NetworkManager(API.HOSPITAL.LOGIN_HOSPITAL)
      const response = await instance.request(values)

      console.log("Login response:", response) // Debug log

      if (response.success && response.data) {
        // Store tokens from the new backend response format
        // The backend response has nested structure: response.data.data.accessToken
        const actualData = response.data.data || response.data
        const tokenData = {
          token: actualData.accessToken,
          refresh_token: actualData.refreshToken,
          response: {
            data: actualData.user
          }
        }

        // Store the session
        userSession.setSession(tokenData)

        // Dispatch login action to Redux to update the app state
        UserState.login(actualData.user)

        // Force a small delay to ensure Redux state is updated
        await new Promise((resolve) => setTimeout(resolve, 100))

        return true
      } else {
        console.log("Login failed - response not successful:", response)
        return false
      }
    } catch (error) {
      console.error("Login error in model:", error)
      return false
    }
  }

  return {
    loginByEmail
  }
}
