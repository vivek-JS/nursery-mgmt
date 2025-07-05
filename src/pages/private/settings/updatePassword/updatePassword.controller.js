import { useState } from "react"
import { useUpdatePasswordModel } from "./updatePassword.model"
import { useUserSession } from "hooks/userSession"
import { UserState } from "redux/dispatcher/UserState"

export const useUpdatePasswordController = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setshowConfirmPassword] = useState(false)
  const [showLoader, setShowLoader] = useState(false)

  const userSession = useUserSession()

  const model = useUpdatePasswordModel()

  const togglePasswordVisiblity = () => {
    setShowPassword((prev) => !prev)
  }
  const togglenewPasswordVisiblity = () => {
    setShowNewPassword((prev) => !prev)
  }

  const toggleConfirmPasswordVisiblity = () => {
    setshowConfirmPassword((prev) => !prev)
  }

  const handlePasswordUpdate = async (values) => {
    setShowLoader(true)
    const payload = {
      password: values.password,
      confirmpassword: values.confirmpassword,
      newpassword: values.newpassword
    }
    const response = await model.update(payload)
    setShowLoader(false)
    if (response.success) {
      userSession.setSession(response.data)
      // Dispatch login action to Redux to update the app state
      UserState.login(response.data.user || response.data)
    }
  }

  return {
    showPassword,
    showLoader,
    togglePasswordVisiblity,
    handlePasswordUpdate,
    toggleConfirmPasswordVisiblity,
    showConfirmPassword,
    showNewPassword,
    togglenewPasswordVisiblity
  }
}
