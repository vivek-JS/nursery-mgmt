import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

export const DEFAULT_LOGIN_PASSWORD = "1234"

/**
 * Admin reset: set user password to default (1234) and require change on next login.
 * @returns {Promise<boolean>} true if reset succeeded
 */
export async function resetUserPasswordToDefault({ id, name = "this user" }) {
  if (!id) {
    Toast.error("Missing user id")
    return false
  }

  const confirmed = window.confirm(
    `Reset login password for "${name}" to default (${DEFAULT_LOGIN_PASSWORD})?\n\n` +
      `They can log in with ${DEFAULT_LOGIN_PASSWORD}, then must set a new password.`
  )
  if (!confirmed) return false

  try {
    const instance = NetworkManager(API.EMPLOYEE.RESET_PASSWORD_TO_DEFAULT)
    const response = await instance.request({ id })

    if (response?.success) {
      Toast.success(
        response?.message ||
          `Password reset to ${DEFAULT_LOGIN_PASSWORD}. User must change it on next login.`
      )
      return true
    }

    Toast.error(response?.message || response?.data?.message || "Password reset failed")
    return false
  } catch (error) {
    console.error("Error resetting password:", error)
    Toast.error(error?.message || "Failed to reset password")
    return false
  }
}
