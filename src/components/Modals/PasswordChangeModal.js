import React, { useState } from "react"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Button from "@mui/material/Button"
import { Formik, Form } from "formik"
import * as Yup from "yup"
import { FormField } from "components"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useUserSession } from "hooks/userSession"
import { UserState } from "redux/dispatcher/UserState"

const validationSchema = Yup.object().shape({
  newPassword: Yup.string()
    .min(8, "Password must be at least 8 characters")
    .required("New password is required"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("newPassword"), null], "Passwords must match")
    .required("Confirm password is required")
})

const initialValues = {
  newPassword: "",
  confirmPassword: ""
}

const PasswordChangeModal = ({ open, onClose, onSuccess, loginResponse }) => {
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const userSession = useUserSession()

  // Debug logging
  console.log("🔍 PasswordChangeModal props:")
  console.log("   - open:", open)
  console.log("   - loginResponse:", loginResponse)
  console.log("   - loginResponse?.isPasswordSet:", loginResponse?.isPasswordSet)
  console.log("   - loginResponse?.forcePasswordReset:", loginResponse?.forcePasswordReset)

  const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    setLoading(true)
    try {
      console.log("🔍 Password change attempt - loginResponse:", loginResponse)

      // If this is from login flow and we have login response data
      if (loginResponse && loginResponse.user) {
        console.log("🔍 Using login flow password change")

        // Use the access token from login response
        const instance = NetworkManager(API.USER.CHANGE_PASSWORD)
        const response = await instance.request({
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword
        })

        if (response?.data?.status === "Success") {
          Toast.success("Password changed successfully")

          // Update the user state with new user data
          if (response.data.data?.user) {
            UserState.update(response.data.data.user)
          }

          resetForm()
          onSuccess && onSuccess()
          onClose()
        } else {
          Toast.error(response?.data?.message || "Failed to change password")
        }
      } else {
        console.log("🔍 Using regular password change flow")

        // Regular password change flow
        const instance = NetworkManager(API.USER.CHANGE_PASSWORD)
        const response = await instance.request({
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword
        })

        if (response?.data?.status === "Success") {
          Toast.success("Password changed successfully")

          // Update the user state with new user data
          if (response.data.data?.user) {
            UserState.update(response.data.data.user)
          }

          resetForm()
          onSuccess && onSuccess()
          onClose()
        } else {
          Toast.error(response?.data?.message || "Failed to change password")
        }
      }
    } catch (error) {
      console.error("Password change error:", error)
      Toast.error(error?.response?.data?.message || "Failed to change password")
    } finally {
      setLoading(false)
      setSubmitting(false)
    }
  }

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword((prev) => !prev)
  }

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword((prev) => !prev)
  }

  // Determine modal title and description based on context
  const getModalContent = () => {
    if (loginResponse && (loginResponse.forcePasswordReset || !loginResponse.isPasswordSet)) {
      return {
        title: "Set Your Password",
        description: "Please set a new password for your account. This is required for security."
      }
    }
    return {
      title: "Change Password",
      description: "Please set a new password for your account"
    }
  }

  const modalContent = getModalContent()

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      disableBackdropClick>
      <DialogTitle>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ margin: 0, color: "#1976d2" }}>{modalContent.title}</h2>
          <p style={{ margin: "8px 0 0 0", color: "#666", fontSize: "14px" }}>
            {modalContent.description}
          </p>
        </div>
      </DialogTitle>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}>
        {({ values, errors, touched, handleChange, handleBlur, isValid, dirty }) => (
          <Form>
            <DialogContent>
              <div style={{ padding: "16px 0" }}>
                <FormField
                  label="New Password"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  showPassword={showNewPassword}
                  togglePasswordVisiblity={toggleNewPasswordVisibility}
                  required
                  fullWidth
                  margin="normal"
                />

                <FormField
                  label="Confirm Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  showPassword={showConfirmPassword}
                  togglePasswordVisiblity={toggleConfirmPasswordVisibility}
                  required
                  fullWidth
                  margin="normal"
                />
              </div>
            </DialogContent>

            <DialogActions style={{ padding: "16px 24px" }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={!isValid || !dirty || loading}
                style={{ minWidth: "120px" }}>
                {loading ? "Changing..." : "Change Password"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  )
}

export default PasswordChangeModal
