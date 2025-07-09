import { NetworkManager, API } from "network/core"
import { UserState } from "redux/dispatcher/UserState"
import { useUserSession } from "hooks/userSession"

export const useLoginModel = () => {
  const userSession = useUserSession()

  const loginByEmail = async (values) => {
    console.log("🔐 loginByEmail called")
    console.log("📱 Phone:", values.phoneNumber)
    console.log("🔑 Password:", values.password ? "***" : "empty")

    // Use the correct backend endpoint
    const loginEndpoint = {
      endpoint: "/user/login",
      method: "POST",
      baseURL: "http://localhost:8000/api/v1"
    }

    console.log("🌐 API endpoint:", loginEndpoint)

    const instance = NetworkManager(loginEndpoint)
    console.log("🌐 NetworkManager instance created")

    try {
      // Prepare the request payload in the format expected by your backend
      const payload = {
        phoneNumber: parseInt(values.phoneNumber),
        password: values.password
      }

      console.log("📦 Request payload:", { ...payload, password: "***" })

      const response = await instance.request(payload)
      console.log("✅ Request completed successfully")
      console.log("📡 Response success:", response.success)
      console.log("📡 Response data:", response.data ? "exists" : "null")
      console.log("📡 Full response:", response)

      if (response.success && response.data) {
        console.log("🎉 Login successful, setting session...")

        // Extract user data from the response
        const userData = response.data.user || response.data
        const accessToken = response.data.accessToken
        const refreshToken = response.data.refreshToken

        console.log("👤 User data:", userData)
        console.log("🔑 Access token:", accessToken ? "exists" : "missing")
        console.log("🔄 Refresh token:", refreshToken ? "exists" : "missing")

        // Store tokens in localStorage
        if (accessToken) {
          localStorage.setItem("accessToken", accessToken)
          console.log("💾 Access token stored in localStorage")
        }

        if (refreshToken) {
          localStorage.setItem("refreshToken", refreshToken)
          console.log("💾 Refresh token stored in localStorage")
        }

        // Prepare session data in the format expected by userSession.setSession
        const sessionData = {
          token: accessToken,
          refresh_token: refreshToken,
          response: {
            data: userData
          }
        }

        console.log("📦 Session data prepared:", {
          hasToken: !!sessionData.token,
          hasRefreshToken: !!sessionData.refresh_token,
          hasUser: !!sessionData.response?.data
        })

        // Set the session
        userSession.setSession(sessionData)

        // Dispatch login action to Redux to update the app state
        UserState.login(userData)

        return true
      } else {
        console.log("❌ Login failed - no success or data")
        console.log("❌ Response details:", response)
        return false
      }
    } catch (error) {
      console.log("❌ Login failed with error:", error.message || error)
      console.log("❌ Error details:", error)
      return false
    }
  }

  return {
    loginByEmail
  }
}
