import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLoginModel } from "./login.model"
import { toast } from "react-toastify"

export const useLoginController = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showLoader, setShowLoader] = useState(false)

  const navigate = useNavigate()
  const model = useLoginModel()

  const togglePasswordVisiblity = () => {
    setShowPassword((prev) => !prev)
  }

  const handleLogin = async (values) => {
    console.log("🔄 Starting login process...", values)
    setShowLoader(true)

    try {
      console.log("📡 Making API call...")
      const success = await model.loginByEmail(values)
      console.log("📡 API call completed, success:", success)

      if (success) {
        console.log("✅ Login successful, navigating to dashboard...")
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
        console.log("❌ Login failed")
        // Show error message if login fails
        toast.error("Login failed. Please check your phone number and password.")
      }
    } catch (error) {
      console.error("💥 Login error:", error)
      toast.error("Login error. Please try again.")
    } finally {
      console.log("🏁 Login process finished, hiding loader")
      setShowLoader(false)
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
    showLoader,
    togglePasswordVisiblity,
    handleLogin,
    navigateToForgotPassword,
    navigateToSignUp
  }
}
