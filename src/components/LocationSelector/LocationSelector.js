import React, { useState, useEffect } from "react"
import { NetworkManager, API } from "network/core"
import { Loader } from "lucide-react"

const LocationSelector = ({
  selectedState,
  selectedDistrict,
  selectedTaluka,
  selectedVillage,
  onStateChange,
  onDistrictChange,
  onTalukaChange,
  onVillageChange,
  disabled = false,
  required = false,
  className = "",
  showLabels = true,
  autoFill = false,
  compact = false,
  placeholder = {
    state: "Select State",
    district: "Select District",
    taluka: "Select Taluka",
    village: "Select Village"
  }
}) => {
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

  // Fetch states on component mount
  useEffect(() => {
    fetchStates()
  }, [])

  // When disabled and we have values, ensure we load the necessary data to display them
  useEffect(() => {
    if (disabled && selectedState && selectedDistrict && selectedTaluka) {
      // Load districts, talukas, and villages to display the selected values
      fetchDistricts(selectedState)
      fetchTalukas(selectedState, selectedDistrict)
      fetchVillages(selectedState, selectedDistrict, selectedTaluka)
    }
  }, [disabled, selectedState, selectedDistrict, selectedTaluka])

  // Fetch districts when state changes
  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState)
      // Reset dependent selections
      onDistrictChange("")
      onTalukaChange("")
      onVillageChange("")
      setTalukas([])
      setVillages([])
    } else {
      setDistricts([])
      setTalukas([])
      setVillages([])
    }
  }, [selectedState])

  // Auto-fill districts when they are loaded and autoFill is enabled
  useEffect(() => {
    if (autoFill && districts.length > 0 && !selectedDistrict) {
      const firstDistrict = districts[0]
      onDistrictChange(firstDistrict.name)
    }
  }, [districts, autoFill, selectedDistrict, onDistrictChange])

  // Fetch talukas when district changes
  useEffect(() => {
    if (selectedState && selectedDistrict) {
      fetchTalukas(selectedState, selectedDistrict)
      // Reset dependent selections
      onTalukaChange("")
      onVillageChange("")
      setVillages([])
    } else {
      setTalukas([])
      setVillages([])
    }
  }, [selectedDistrict])

  // Auto-fill talukas when they are loaded and autoFill is enabled
  useEffect(() => {
    if (autoFill && talukas.length > 0 && !selectedTaluka) {
      const firstTaluka = talukas[0]
      onTalukaChange(firstTaluka.name)
    }
  }, [talukas, autoFill, selectedTaluka, onTalukaChange])

  // Fetch villages when taluka changes
  useEffect(() => {
    if (selectedState && selectedDistrict && selectedTaluka) {
      fetchVillages(selectedState, selectedDistrict, selectedTaluka)
      // Reset dependent selections
      onVillageChange("")
    } else {
      setVillages([])
    }
  }, [selectedTaluka])

  // Auto-fill villages when they are loaded and autoFill is enabled
  useEffect(() => {
    if (autoFill && villages.length > 0 && !selectedVillage) {
      const firstVillage = villages[0]
      onVillageChange(firstVillage.name)
    }
  }, [villages, autoFill, selectedVillage, onVillageChange])

  const fetchStates = async () => {
    setLoading((prev) => ({ ...prev, states: true }))
    setError("")

    try {
      // Use the optimized endpoint for just states
      const instance = NetworkManager(API.LOCATION.GET_STATES_ONLY)
      const response = await instance.request()

      if (response?.data?.status === "success" && Array.isArray(response.data.data)) {
        setStates(response.data.data.map((s) => ({ id: s.id, name: s.name, code: s.code })))
      } else {
        setStates([])
      }
    } catch (error) {
      console.error("Error fetching states:", error)
      setError("Failed to load states")
      setStates([])
    } finally {
      setLoading((prev) => ({ ...prev, states: false }))
    }
  }

  const fetchDistricts = async (stateNameOrId) => {
    setLoading((prev) => ({ ...prev, districts: true }))
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
    } catch (error) {
      console.error("Error fetching districts:", error)
      setError("Failed to load districts")
      setDistricts([])
    } finally {
      setLoading((prev) => ({ ...prev, districts: false }))
    }
  }

  const fetchTalukas = async (stateNameOrId, districtNameOrId) => {
    setLoading((prev) => ({ ...prev, talukas: true }))
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
    } catch (error) {
      console.error("Error fetching talukas:", error)
      setError("Failed to load talukas")
      setTalukas([])
    } finally {
      setLoading((prev) => ({ ...prev, talukas: false }))
    }
  }

  const fetchVillages = async (stateNameOrId, districtNameOrId, talukaNameOrId) => {
    setLoading((prev) => ({ ...prev, villages: true }))
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
    } catch (error) {
      console.error("Error fetching villages:", error)
      setError("Failed to load villages")
      setVillages([])
    } finally {
      setLoading((prev) => ({ ...prev, villages: false }))
    }
  }

  const handleStateChange = (e) => {
    const value = e.target.value
    onStateChange(value)
  }

  const handleDistrictChange = (e) => {
    const value = e.target.value
    onDistrictChange(value)
  }

  const handleTalukaChange = (e) => {
    const value = e.target.value
    onTalukaChange(value)
  }

  const handleVillageChange = (e) => {
    const value = e.target.value
    onVillageChange(value)
  }

  return (
    <div className={`${compact ? "space-y-2" : "space-y-4"} ${className}`}>
      {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded-md">{error}</div>}

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${compact ? "gap-2" : "gap-4"}`}>
        {/* State Selection */}
        <div className="relative">
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State {required && <span className="text-red-500">*</span>}
            </label>
          )}
          <div className="relative">
            <select
              value={selectedState}
              onChange={handleStateChange}
              disabled={disabled || loading.states}
              className={`w-full ${compact ? "p-2 text-sm rounded-md" : "p-3 rounded-lg"} border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                disabled || loading.states ? "bg-gray-100 cursor-not-allowed" : "bg-white"
              } ${required && !selectedState ? "border-red-300" : "border-gray-300"}`}>
              <option value="">{loading.states ? "Loading..." : placeholder.state}</option>
              {states.map((state) => (
                <option key={state.id} value={state.name}>
                  {state.name}
                </option>
              ))}
              {/* Add selected state if not in the list (for disabled state) */}
              {selectedState && !states.find((s) => s.name === selectedState) && (
                <option value={selectedState}>{selectedState}</option>
              )}
            </select>
            {loading.states && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* District Selection */}
        <div className="relative">
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              District {required && <span className="text-red-500">*</span>}
            </label>
          )}
          <div className="relative">
            <select
              value={selectedDistrict}
              onChange={handleDistrictChange}
              disabled={disabled || loading.districts || !selectedState}
              className={`w-full ${compact ? "p-2 text-sm rounded-md" : "p-3 rounded-lg"} border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                disabled || loading.districts || !selectedState
                  ? "bg-gray-100 cursor-not-allowed"
                  : "bg-white"
              } ${required && !selectedDistrict ? "border-red-300" : "border-gray-300"}`}>
              <option value="">{loading.districts ? "Loading..." : placeholder.district}</option>
              {districts.map((district) => (
                <option key={district.id} value={district.name}>
                  {district.name}
                </option>
              ))}
              {/* Add selected district if not in the list (for disabled state) */}
              {selectedDistrict && !districts.find((d) => d.name === selectedDistrict) && (
                <option value={selectedDistrict}>{selectedDistrict}</option>
              )}
            </select>
            {loading.districts && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Taluka Selection */}
        <div className="relative">
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Taluka {required && <span className="text-red-500">*</span>}
            </label>
          )}
          <div className="relative">
            <select
              value={selectedTaluka}
              onChange={handleTalukaChange}
              disabled={disabled || loading.talukas || !selectedDistrict}
              className={`w-full ${compact ? "p-2 text-sm rounded-md" : "p-3 rounded-lg"} border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                disabled || loading.talukas || !selectedDistrict
                  ? "bg-gray-100 cursor-not-allowed"
                  : "bg-white"
              } ${required && !selectedTaluka ? "border-red-300" : "border-gray-300"}`}>
              <option value="">{loading.talukas ? "Loading..." : placeholder.taluka}</option>
              {talukas.map((taluka) => (
                <option key={taluka.id} value={taluka.name}>
                  {taluka.name}
                </option>
              ))}
              {/* Add selected taluka if not in the list (for disabled state) */}
              {selectedTaluka && !talukas.find((t) => t.name === selectedTaluka) && (
                <option value={selectedTaluka}>{selectedTaluka}</option>
              )}
            </select>
            {loading.talukas && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Village Selection */}
        <div className="relative">
          {showLabels && (
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Village {required && <span className="text-red-500">*</span>}
            </label>
          )}
          <div className="relative">
            <select
              value={selectedVillage}
              onChange={handleVillageChange}
              disabled={disabled || loading.villages || !selectedTaluka}
              className={`w-full ${compact ? "p-2 text-sm rounded-md" : "p-3 rounded-lg"} border shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ${
                disabled || loading.villages || !selectedTaluka
                  ? "bg-gray-100 cursor-not-allowed"
                  : "bg-white"
              } ${required && !selectedVillage ? "border-red-300" : "border-gray-300"}`}>
              <option value="">{loading.villages ? "Loading..." : placeholder.village}</option>
              {villages.map((village) => (
                <option key={village.id} value={village.name}>
                  {village.name}
                </option>
              ))}
              {/* Add selected village if not in the list (for disabled state) */}
              {selectedVillage && !villages.find((v) => v.name === selectedVillage) && (
                <option value={selectedVillage}>{selectedVillage}</option>
              )}
            </select>
            {loading.villages && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LocationSelector
