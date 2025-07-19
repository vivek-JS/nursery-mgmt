import { useSelector } from "react-redux"

/**
 * Hook to get current user data from Redux store
 */
export const useUserData = () => {
  return useSelector((state) => state?.userData?.userData)
}

/**
 * Hook to get current user role from Redux store
 */
export const useUserRole = () => {
  const userData = useUserData()
  return userData?.role || userData?.jobTitle
}

/**
 * Check if user has payment access (ACCOUNTANT or SUPER_ADMIN)
 * This is for changing payment status only
 */
export const useHasPaymentAccess = () => {
  const userRole = useUserRole()
  return userRole === "ACCOUNTANT" || userRole === "SUPER_ADMIN"
}

/**
 * Check if user can add payments (ACCOUNTANT, SUPER_ADMIN, or OFFICE_ADMIN)
 * Office Admins can add payments but only with PENDING status
 */
export const useHasPaymentAddAccess = () => {
  const userRole = useUserRole()
  return userRole === "ACCOUNTANT" || userRole === "SUPER_ADMIN" || userRole === "OFFICE_ADMIN"
}

/**
 * Check if user is accountant
 */
export const useIsAccountant = () => {
  const userRole = useUserRole()
  return userRole === "ACCOUNTANT"
}

/**
 * Check if user is office admin
 */
export const useIsOfficeAdmin = () => {
  const userRole = useUserRole()
  return userRole === "OFFICE_ADMIN"
}

/**
 * Check if user is super admin
 */
export const useIsSuperAdmin = () => {
  const userRole = useUserRole()
  return userRole === "SUPER_ADMIN"
}

/**
 * Check if user is admin (includes SUPER_ADMIN)
 */
export const useIsAdmin = () => {
  const userRole = useUserRole()
  return userRole === "ADMIN" || userRole === "SUPER_ADMIN"
}

/**
 * Utility function to check if user has any of the specified roles
 * @param {string|Array} allowedRoles - Role or array of roles to check
 * @returns {boolean} - True if user has any of the allowed roles
 */
export const useHasRole = (allowedRoles) => {
  const userRole = useUserRole()
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  return roles.includes(userRole)
}
