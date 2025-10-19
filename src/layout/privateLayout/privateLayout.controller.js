import { useNavigate } from "react-router-dom"
import { useLogoutModel } from "./privateLayout.model"
import React from "react"
import { Loader } from "redux/dispatcher/Loader"
import { useSelector } from "react-redux"
//import { Toast } from "helpers/toasts/toastHelper"

export const usePrivateLayoutController = (props) => {
  const navigateTo = useNavigate()
  const currentRoute = window.location.pathname
  const model = useLogoutModel()
  const [showPasswordModal, setShowPasswordModal] = React.useState(false)
  const [userProfile, setUserProfile] = React.useState(null)
  const user = useSelector((state) => state?.app?.user)

  React.useEffect(() => {
    window.scrollTo(0, 0)
    if (props.isLoggedIn) {
      checkPasswordStatus()
    }
  }, [props.isLoggedIn])

  const checkPasswordStatus = async () => {
    // Check if user has isPasswordSet field
    if (user && user.isPasswordSet === false) {
      // User must set password
      setShowPasswordModal(true)
      setUserProfile(user)
    }
  }

  const navigate = (route) => {
    navigateTo(route)
  }

  const handleLogout = async () => {
    Loader.show()
    await model.logout()
    Loader.hide()
  }

  const activeMenu = (item) => currentRoute.includes(item.route)

  const handlePasswordChangeSuccess = () => {
    setShowPasswordModal(false)
  }

  const handlePasswordModalClose = () => {
    // Don't allow closing if password is not set
    if (user && user.isPasswordSet === false) {
      return
    }
    setShowPasswordModal(false)
  }

  return {
    navigate,
    handleLogout,
    activeMenu,
    showPasswordModal,
    setShowPasswordModal,
    handlePasswordChangeSuccess,
    handlePasswordModalClose,
    userProfile
  }
}
