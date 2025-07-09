import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLoginModel } from "./login.model"

export const useLoginController = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const navigate = useNavigate()
  const model = useLoginModel()

  const togglePasswordVisiblity = () => {
    setShowPassword((prev) => !prev)
  }

  const handleLogin = async (values) => {
    console.log("🔐 Login attempt started")
    console.log("📱 Phone:", values.phoneNumber)
    console.log("🔑 Password:", values.password ? "***" : "empty")

    setErrorMessage("") // Clear any previous error messages

    // Clear any stale persisted state before login attempt
    try {
      localStorage.removeItem("persist:root")
      sessionStorage.removeItem("persist:root")
      console.log("🧹 Cleared persisted state")
    } catch (error) {
      console.error("Error clearing persisted state:", error)
    }

    try {
      console.log("🌐 Making login request...")
      const success = await model.loginByEmail(values)
      console.log("✅ Login result:", success)

      if (success) {
        console.log("🎉 Login successful, navigating to dashboard...")
        // Force a small delay to ensure Redux state is updated
        setTimeout(() => {
          navigate("/u/dashboard", { replace: true })
        }, 500)

        // Fallback: if navigation doesn't work, force a page reload
        setTimeout(() => {
          if (window.location.pathname !== "/u/dashboard") {
            window.location.href = "/u/dashboard"
          }
        }, 2000)
      } else {
        // Login failed, show error message
        console.log("❌ Login failed")
        setErrorMessage("Invalid phone number or password. Please try again.")
      }
    } catch (error) {
      console.error("❌ Login error:", error)
      setErrorMessage("Network error. Please check your connection and try again.")
    }
  }

  const navigateToForgotPassword = () => {
    navigate("/auth/forgot-password")
  }

  const navigateToSignUp = () => {
    navigate("/auth/signup")
  }

  return {
    showPassword,
    errorMessage,
    togglePasswordVisiblity,
    handleLogin,
    navigateToForgotPassword,
    navigateToSignUp
  }
}
