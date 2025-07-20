import { useState, useEffect } from "react"
import { NetworkManager, API } from "network/core"

export default function useLocationCascade(authToken) {
  const [states, setStates] = useState([])
  const [districts, setDistricts] = useState([])
  const [talukas, setTalukas] = useState([])
  const [villages, setVillages] = useState([])
  const [loading, setLoading] = useState({
    states: false,
    districts: false,
    talukas: false,
    villages: false
  })
  const [error, setError] = useState("")

  // Fetch all states on mount
  useEffect(() => {
    fetchStates()
    // eslint-disable-next-line
  }, [])

  const fetchStates = async () => {
    setLoading((l) => ({ ...l, states: true }))
    setError("")
    try {
      // Use the optimized endpoint for better performance
      const instance = NetworkManager(API.LOCATION.GET_STATES_ONLY)
      const response = await instance.request()
      if (response?.data?.status === "success" && Array.isArray(response.data.data)) {
        setStates(response.data.data.map((s) => ({ id: s.id, name: s.name, code: s.code })))
      } else {
        setStates([])
      }
    } catch (e) {
      setError("Failed to load states")
      setStates([])
    } finally {
      setLoading((l) => ({ ...l, states: false }))
    }
  }

  const fetchDistricts = async (stateNameOrId) => {
    setLoading((l) => ({ ...l, districts: true }))
    setError("")
    setDistricts([])
    setTalukas([])
    setVillages([])
    try {
      const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
      const response = await instance.request({ state: stateNameOrId })
      if (response?.data?.status === "success" && Array.isArray(response.data.data.districts)) {
        setDistricts(
          response.data.data.districts.map((d) => ({ id: d.id, name: d.name, code: d.code }))
        )
      } else {
        setDistricts([])
      }
    } catch (e) {
      setError("Failed to load districts")
      setDistricts([])
    } finally {
      setLoading((l) => ({ ...l, districts: false }))
    }
  }

  const fetchTalukas = async (stateNameOrId, districtNameOrId) => {
    setLoading((l) => ({ ...l, talukas: true }))
    setError("")
    setTalukas([])
    setVillages([])
    try {
      const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
      const response = await instance.request({ state: stateNameOrId, district: districtNameOrId })
      if (response?.data?.status === "success" && Array.isArray(response.data.data.talukas)) {
        setTalukas(
          response.data.data.talukas.map((t) => ({ id: t.id, name: t.name, code: t.code }))
        )
      } else {
        setTalukas([])
      }
    } catch (e) {
      setError("Failed to load talukas")
      setTalukas([])
    } finally {
      setLoading((l) => ({ ...l, talukas: false }))
    }
  }

  const fetchVillages = async (stateNameOrId, districtNameOrId, talukaNameOrId) => {
    setLoading((l) => ({ ...l, villages: true }))
    setError("")
    setVillages([])
    try {
      const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
      const response = await instance.request({
        state: stateNameOrId,
        district: districtNameOrId,
        taluka: talukaNameOrId
      })
      if (response?.data?.status === "success" && Array.isArray(response.data.data.villages)) {
        setVillages(
          response.data.data.villages.map((v) => ({ id: v.id, name: v.name, code: v.code }))
        )
      } else {
        setVillages([])
      }
    } catch (e) {
      setError("Failed to load villages")
      setVillages([])
    } finally {
      setLoading((l) => ({ ...l, villages: false }))
    }
  }

  return {
    states,
    districts,
    talukas,
    villages,
    loading,
    error,
    fetchStates,
    fetchDistricts,
    fetchTalukas,
    fetchVillages,
    setStates,
    setDistricts,
    setTalukas,
    setVillages
  }
}
