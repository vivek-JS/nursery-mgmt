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

      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timeout")), 30000) // 30 seconds
      })

      const requestPromise = instance.request(values)
      const response = await Promise.race([requestPromise, timeoutPromise])

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
        // Check if it's a server error (500)
        if (response.status === 500 || response.message?.includes("Something went very wrong")) {
          console.error("Server error detected:", response.message)
          throw new Error("Server is experiencing issues. Please try again later.")
        }
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
