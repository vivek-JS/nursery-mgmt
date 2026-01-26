import { useSelector } from "react-redux"
import { useState, useEffect, useCallback } from "react"
import { NetworkManager, API } from "network/core"

/**
 * Hook to get current user data from Redux store
 */
export const useUserData = () => {
  return useSelector((state) => state?.userData?.userData)
}

/**
 * Hook to get current user role from Redux store
 * Prioritizes jobTitle over role for all checks
 */
export const useUserRole = () => {
  const userData = useUserData()
  // Always prioritize jobTitle over role
  return userData?.jobTitle || userData?.role
}

/**
 * Check if user has payment access (ACCOUNTANT or SUPER_ADMIN)
 * This is for changing payment status only
 * All checks prioritize jobTitle over role
 */
export const useHasPaymentAccess = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle for all checks
  const isAccountant = jobTitle === "ACCOUNTANT" || userRole === "ACCOUNTANT"
  const isSuperAdmin = jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN"
  return isAccountant || isSuperAdmin
}

/**
 * Check if user can add payments (ACCOUNTANT, SUPER_ADMIN, or OFFICE_ADMIN)
 * Office Admins can add payments but only with PENDING status
 * All checks prioritize jobTitle over role
 */
export const useHasPaymentAddAccess = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle for all checks
  const isAccountant = jobTitle === "ACCOUNTANT" || userRole === "ACCOUNTANT"
  const isOfficeAdmin = jobTitle === "OFFICE_ADMIN" || userRole === "OFFICE_ADMIN"
  const isSuperAdmin = jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN"
  return isAccountant || isSuperAdmin || isOfficeAdmin
}

/**
 * Check if user can add payments - ANYONE can add payments now
 * All new payments will be added with PENDING status
 */
export const useCanAddPayment = () => {
  return true // Anyone can add payments
}

/**
 * Check if user is accountant
 * Prioritizes jobTitle over role
 */
export const useIsAccountant = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle
  return jobTitle === "ACCOUNTANT" || userRole === "ACCOUNTANT"
}

/**
 * Check if user is office admin
 * Prioritizes jobTitle over role
 */
export const useIsOfficeAdmin = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle
  return jobTitle === "OFFICE_ADMIN" || userRole === "OFFICE_ADMIN"
}

/**
 * Check if user is super admin
 * Checks jobTitle first, then role
 */
export const useIsSuperAdmin = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle
  return jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN"
}

/**
 * Check if user is admin (includes SUPER_ADMIN)
 * Checks jobTitle first, then role
 */
export const useIsAdmin = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle
  return jobTitle === "ADMIN" || jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "ADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN"
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

/**
 * Check if user is dealer
 * Checks jobTitle first, then role
 */
export const useIsDealer = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle
  return jobTitle === "DEALER" || userRole === "DEALER"
}

/**
 * Check if user is dispatch manager
 * Checks jobTitle first, then role
 */
export const useIsDispatchManager = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle
  return jobTitle === "DISPATCH_MANAGER" || userRole === "DISPATCH_MANAGER"
}

/**
 * Check if user has WhatsApp access (SUPER_ADMIN only)
 * Checks jobTitle first, then role
 */
export const useHasWhatsAppAccess = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle
  return jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN"
}

/**
 * Check if user has Payments access (ACCOUNTANT only, but SUPER_ADMIN has all access)
 * Prioritizes jobTitle over role
 */
export const useHasPaymentsAccess = () => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  // Prioritize jobTitle for all checks
  const isAccountant = jobTitle === "ACCOUNTANT" || userRole === "ACCOUNTANT"
  const isSuperAdmin = jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN"
  return isAccountant || isSuperAdmin
}

/**
 * Check if user has access to a specific menu item based on role
 * @param {string} menuTitle - The title of the menu item
 * @returns {boolean} - True if user has access to the menu item
 * All checks prioritize jobTitle over role
 */
export const useHasMenuAccess = (menuTitle) => {
  const userData = useUserData()
  const jobTitle = userData?.jobTitle
  const userRole = userData?.role
  
  // SUPER_ADMIN has access to everything - check jobTitle first
  if (jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN") {
    return true
  }
  
  // Role-specific access controls - prioritize jobTitle
  switch (menuTitle) {
    case "WhatsApp Management":
      return jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN"
    
    case "Payments": {
      // Prioritize jobTitle for all checks
      const isAccountant = jobTitle === "ACCOUNTANT" || userRole === "ACCOUNTANT"
      const isSuperAdmin = jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN"
      return isAccountant || isSuperAdmin
    }
    
    case "Labs":
      return jobTitle === "LABORATORY_MANAGER" || userRole === "LABORATORY_MANAGER" || jobTitle === "SUPER_ADMIN" || jobTitle === "SUPERADMIN" || userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN"
    
    default:
      // For all other menu items, allow access (existing logic)
      return true
  }
}

/**
 * Hook to get dealer wallet details
 */
export const useDealerWallet = () => {
  const [walletData, setWalletData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const userData = useUserData()
  const isDealer = useIsDealer()

  const fetchWalletDetails = useCallback(async () => {
    if (!isDealer || !userData?._id) {
      setWalletData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const instance = NetworkManager(API.USER.GET_DEALER_WALLET_DETAILS)
      const response = await instance.request({}, [userData._id])

      if (response?.data) {
        setWalletData(response.data)
      } else {
        setError("Failed to fetch wallet details")
      }
    } catch (err) {
      console.error("Error fetching dealer wallet:", err)
      setError(err.message || "Failed to fetch wallet details")
    } finally {
      setLoading(false)
    }
  }, [isDealer, userData?._id])

  useEffect(() => {
    fetchWalletDetails()
  }, [fetchWalletDetails])

  return {
    walletData,
    loading,
    error,
    refetch: fetchWalletDetails
  }
}

/**
 * Hook to get dealer wallet details for a specific dealer
 * Used by accountants to manage dealer payments
 */
export const useDealerWalletById = (dealerId) => {
  const [walletData, setWalletData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchWalletDetails = useCallback(async () => {
    console.log("useDealerWalletById - fetchWalletDetails called with dealerId:", dealerId)

    if (!dealerId) {
      console.log("useDealerWalletById - No dealerId provided, setting walletData to null")
      setWalletData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log("useDealerWalletById - Making API call for dealerId:", dealerId)
      const instance = NetworkManager(API.USER.GET_DEALER_WALLET_DETAILS)
      const response = await instance.request({}, [dealerId])
      console.log("useDealerWalletById - API response:", response)

      console.log("useDealerWalletById - Full response:", response)
      console.log("useDealerWalletById - Response.data:", response?.data)
      console.log("useDealerWalletById - Response.data?.data:", response?.data?.data)

      // Check if the response has nested data structure
      const walletData = response?.data?.data || response?.data

      if (walletData) {
        console.log("useDealerWalletById - Wallet data to set:", walletData)
        console.log("useDealerWalletById - Wallet data.financial:", walletData.financial)
        console.log(
          "useDealerWalletById - Wallet data.financial?.availableAmount:",
          walletData.financial?.availableAmount
        )
        setWalletData(walletData)
        console.log("useDealerWalletById - Wallet data set successfully")
      } else {
        setError("Failed to fetch wallet details")
        console.log("useDealerWalletById - No wallet data found in response")
      }
    } catch (err) {
      console.error("Error fetching dealer wallet:", err)
      setError(err.message || "Failed to fetch wallet details")
    } finally {
      setLoading(false)
    }
  }, [dealerId])

  useEffect(() => {
    fetchWalletDetails()
  }, [fetchWalletDetails])

  return {
    walletData,
    loading,
    error,
    refetch: fetchWalletDetails
  }
}
