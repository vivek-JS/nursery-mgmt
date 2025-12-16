import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLoginModel } from "./login.model"
import PasswordChangeModal from "components/Modals/PasswordChangeModal"
import { NetworkManager, API } from "network/core"
import { hasSeenTodaysQuote, markQuoteAsSeen } from "utils/quoteUtils"

export const useLoginController = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quote, setQuote] = useState(null)
  const [loginResponse, setLoginResponse] = useState(null)

  const navigate = useNavigate()
  const model = useLoginModel()

  const togglePasswordVisiblity = () => {
    setShowPassword((prev) => !prev)
  }

  // Using utility functions from quoteUtils

  // Fetch today's motivational quote
  const fetchTodaysQuote = async () => {
    try {
      const instance = NetworkManager(API.MOTIVATIONAL_QUOTE.GET_TODAY)
      const response = await instance.request()

      // NetworkManager returns { success: boolean, data: backendResponse }
      // Backend response structure: { status: "Success", message: "...", data: { quote } }
      if (response?.success && response?.data) {
        const backendData = response.data.data || response.data
        if (backendData && backendData.line1 && backendData.line2) {
          return {
            line1: backendData.line1,
            line2: backendData.line2,
            id: backendData.id
          }
        }
      }
      return null
    } catch (error) {
      console.error("Error fetching motivational quote:", error)
      return null
    }
  }

  // Show motivational quote modal if user hasn't seen it today
  const showMotivationalQuote = async () => {
    // Check if user has already seen today's quote
    if (hasSeenTodaysQuote()) {
      return
    }

    // Fetch today's quote
    const todaysQuote = await fetchTodaysQuote()
    if (todaysQuote) {
      setQuote(todaysQuote)
      setShowQuoteModal(true)
      markQuoteAsSeen()
    }
  }

  const handleLogin = async (values) => {
    setShowLoader(true)

    try {
      const response = await model.loginByEmail(values)
      console.log("🔍 Login response:", response)

      if (response.success) {
        setLoginResponse(response)
        console.log("🔍 Response details:")
        console.log("   - isPasswordSet:", response.isPasswordSet)
        console.log("   - forcePasswordReset:", response.forcePasswordReset)
        console.log("   - user role:", response.user?.role)

        // Show password change modal if:
        // 1. Password is not set (isPasswordSet: false), OR
        // 2. Force password reset is required (forcePasswordReset: true)
        console.log("🔍 Checking password set conditions:")
        console.log("   - response.isPasswordSet:", response.isPasswordSet)
        console.log("   - response.forcePasswordReset:", response.forcePasswordReset)
        console.log(
          "   - Condition result:",
          !response.isPasswordSet || response.forcePasswordReset
        )

        if (!response.isPasswordSet || response.forcePasswordReset) {
          console.log("🔍 Opening password change modal automatically")
          setShowPasswordChangeModal(true)
          console.log("🔍 Modal state set to true")
        } else {
          console.log("🔍 Navigating to dashboard (password already set)")
          // Show motivational quote modal first (if not seen today)
          await showMotivationalQuote()

          // Navigate to dashboard if password is already set and no reset required
          setTimeout(() => {
            navigate("/u/dashboard", { replace: true })
          }, 500)

          // Fallback: if navigation doesn't work, force a page reload with hash
          setTimeout(() => {
            // With HashRouter, pathname is always "/" and route is in hash
            const currentHash = window.location.hash
            if (currentHash !== "#/u/dashboard") {
              window.location.href = "/#/u/dashboard"
            }
          }, 2000)
        }
      }
    } catch (error) {
      console.error("Login error:", error)
    } finally {
      setShowLoader(false)
    }
  }

  const handlePasswordChangeSuccess = async () => {
    // Close the modal and navigate to dashboard after successful password change
    setShowPasswordChangeModal(false)
    
    // Show motivational quote modal after password change
    await showMotivationalQuote()
    
    setTimeout(() => {
      navigate("/u/dashboard", { replace: true })
    }, 500)
  }

  const handleQuoteModalClose = () => {
    setShowQuoteModal(false)
  }

  // Prevent closing modal if password is not set
  const handleModalClose = () => {
    // Only allow closing if password is already set (manual password change, not forced)
    if (loginResponse && (!loginResponse.isPasswordSet || loginResponse.forcePasswordReset)) {
      // Password not set - don't allow closing
      console.log("🚫 Cannot close modal - password must be set")
      return
    }
    setShowPasswordChangeModal(false)
  }

  const navigateToForgotPassword = () => {
    navigate("/auth/forgot-password")
  }

  const navigateToSignUp = () => {
    navigate("/auth/signup")
  }

  // Manual function to open password reset modal
  const openPasswordResetModal = () => {
    console.log("🔍 Manually opening password reset modal")
    setShowPasswordChangeModal(true)
  }

  return {
    showPassword,
    showLoader,
    showPasswordChangeModal,
    setShowPasswordChangeModal,
    showQuoteModal,
    quote,
    togglePasswordVisiblity,
    handleLogin,
    handlePasswordChangeSuccess,
    handleModalClose,
    handleQuoteModalClose,
    navigateToForgotPassword,
    navigateToSignUp,
    openPasswordResetModal,
    loginResponse
  }
}
