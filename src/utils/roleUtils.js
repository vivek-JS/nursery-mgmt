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
 * Check if user can add payments - ANYONE can add payments now
 * All new payments will be added with PENDING status
 */
export const useCanAddPayment = () => {
  return true // Anyone can add payments
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

/**
 * Check if user is dealer
 */
export const useIsDealer = () => {
  const userRole = useUserRole()
  return userRole === "DEALER"
}

/**
 * Check if user is dispatch manager
 */
export const useIsDispatchManager = () => {
  const userRole = useUserRole()
  return userRole === "DISPATCH_MANAGER"
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
