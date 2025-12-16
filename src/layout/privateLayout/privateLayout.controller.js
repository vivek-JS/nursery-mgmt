import { useNavigate, useLocation } from "react-router-dom"
import { useLogoutModel } from "./privateLayout.model"
import React from "react"
import { Loader } from "redux/dispatcher/Loader"
import { useSelector } from "react-redux"
import { NetworkManager, API } from "network/core"
import { hasSeenTodaysQuote, markQuoteAsSeen } from "utils/quoteUtils"
//import { Toast } from "helpers/toasts/toastHelper"

export const usePrivateLayoutController = (props) => {
  const navigateTo = useNavigate()
  const location = useLocation()
  // With HashRouter, location.pathname works correctly via useLocation hook
  const currentRoute = location.pathname
  const model = useLogoutModel()
  const [showPasswordModal, setShowPasswordModal] = React.useState(false)
  const [showQuoteModal, setShowQuoteModal] = React.useState(false)
  const [quote, setQuote] = React.useState(null)
  const [userProfile, setUserProfile] = React.useState(null)
  const user = useSelector((state) => state?.app?.user)

  React.useEffect(() => {
    window.scrollTo(0, 0)
    if (props.isLoggedIn) {
      checkPasswordStatus()
      // Show motivational quote if not seen today (only after password is set)
      if (user && user.isPasswordSet !== false) {
        checkAndShowQuote()
      }
    }
  }, [props.isLoggedIn])

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

  // Check and show motivational quote if not seen today
  const checkAndShowQuote = async () => {
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

  const handleQuoteModalClose = () => {
    setShowQuoteModal(false)
  }

  return {
    navigate,
    handleLogout,
    activeMenu,
    showPasswordModal,
    setShowPasswordModal,
    showQuoteModal,
    quote,
    handlePasswordChangeSuccess,
    handlePasswordModalClose,
    handleQuoteModalClose,
    userProfile
  }
}
