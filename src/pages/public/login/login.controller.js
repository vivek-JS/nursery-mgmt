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

        // If password is not set and user is not superadmin, show the password change modal
        if (!response.isPasswordSet && response.user?.role !== "superadmin") {
          setShowPasswordChangeModal(true)
        } else {
          // Navigate to dashboard if password is already set or user is superadmin
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
