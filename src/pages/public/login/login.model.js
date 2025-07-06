import { useUserSession } from "hooks/userSession"
import { NetworkManager, API } from "network/core"
import { UserState } from "redux/dispatcher/UserState"

export const useLoginModel = () => {
  const userSession = useUserSession()

  const loginByEmail = async (values) => {
    try {
      console.log("🔗 Creating network instance...")
      const instance = NetworkManager(API.HOSPITAL.LOGIN_HOSPITAL)

      console.log("📡 Making request to:", API.HOSPITAL.LOGIN_HOSPITAL.endpoint)
      console.log("📡 With payload:", values)

      // Simple request without complex timeout handling
      const response = await instance.request(values)
      console.log("Login response:", response)

      if (response.success && response.data) {
        // Store tokens from the new backend response format
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

        return true
      } else {
        console.log("Login failed - response not successful:", response)
        // Check if it's a server error (500)
        if (response.status === 500 || response.message?.includes("Something went very wrong")) {
          console.error("Server error detected:", response.message)
          throw new Error("Server is experiencing issues. Please try again later.")
        }
        return false
      }
    } catch (error) {
      console.error("Login error in model:", error)
      throw error // Re-throw to be handled by controller
    }
  }

  return {
    loginByEmail
  }
}
