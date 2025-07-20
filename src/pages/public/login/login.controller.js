import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useLoginModel } from "./login.model"
import PasswordChangeModal from "components/Modals/PasswordChangeModal"

export const useLoginController = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showLoader, setShowLoader] = useState(false)
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false)
  const [loginResponse, setLoginResponse] = useState(null)

  const navigate = useNavigate()
  const model = useLoginModel()

  const togglePasswordVisiblity = () => {
    setShowPassword((prev) => !prev)
  }

  const handleLogin = async (values) => {
    setShowLoader(true)

    try {
      const response = await model.loginByEmail(values)

      if (response.success) {
        setLoginResponse(response)

        // Show password change modal if:
        // 1. Password is not set (isPasswordSet: false), OR
        // 2. Force password reset is required (forcePasswordReset: true)
        if (!response.isPasswordSet || response.forcePasswordReset) {
          setShowPasswordChangeModal(true)
        } else {
          // Navigate to dashboard if password is already set and no reset required
          setTimeout(() => {
            navigate("/u/dashboard", { replace: true })
          }, 500)

          // Fallback: if navigation doesn't work, force a page reload
          setTimeout(() => {
            if (window.location.pathname !== "/u/dashboard") {
              window.location.href = "/u/dashboard"
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

  const handlePasswordChangeSuccess = () => {
    // Navigate to dashboard after successful password change
    setTimeout(() => {
      navigate("/u/dashboard", { replace: true })
    }, 500)
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
    showPasswordChangeModal,
    setShowPasswordChangeModal,
    togglePasswordVisiblity,
    handleLogin,
    handlePasswordChangeSuccess,
    navigateToForgotPassword,
    navigateToSignUp
  }
}
