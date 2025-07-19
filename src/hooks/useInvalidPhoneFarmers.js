import { useState, useEffect } from "react"
import NetworkManager from "../network/core/networkManager"
import { API } from "../network/config/endpoints"

const useInvalidPhoneFarmers = () => {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchCount = async () => {
    setLoading(true)
    setError(null)
    try {
      const instance = NetworkManager(API.FARMER.GET_INVALID_PHONE_FARMERS)
      const response = await instance.request()

      if (response?.data?.status === "success") {
        setCount(response.data.data?.length || 0)
      } else {
        setError("Failed to fetch invalid phone farmers count")
      }
    } catch (err) {
      console.error("Error fetching invalid phone farmers count:", err)
      setError("Failed to fetch invalid phone farmers count")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCount()
  }, [])

  return {
    count,
    loading,
    error,
    refetch: fetchCount
  }
}

export default useInvalidPhoneFarmers
