import React, { useState, useEffect } from "react"
import { NetworkManager, API } from "network/core"
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Grid,
  InputAdornment
} from "@mui/material"

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

  useEffect(() => {
    fetchStates()
  }, [])

  useEffect(() => {
    if (disabled && selectedState && selectedDistrict && selectedTaluka) {
      fetchDistricts(selectedState)
      fetchTalukas(selectedState, selectedDistrict)
      fetchVillages(selectedState, selectedDistrict, selectedTaluka)
    }
  }, [disabled, selectedState, selectedDistrict, selectedTaluka])

  useEffect(() => {
    if (selectedState) {
      fetchDistricts(selectedState)
      if (!autoFill) {
        setTalukas([])
        setVillages([])
      }
    }
  }, [selectedState])

  useEffect(() => {
    if (selectedState && selectedDistrict) {
      fetchTalukas(selectedState, selectedDistrict)
      if (!autoFill) {
        setVillages([])
      }
    }
  }, [selectedDistrict])

  useEffect(() => {
    if (selectedState && selectedDistrict && selectedTaluka) {
      fetchVillages(selectedState, selectedDistrict, selectedTaluka)
    }
  }, [selectedTaluka])

  const fetchStates = async () => {
    setLoading((prev) => ({ ...prev, states: true }))
    setError("")
    try {
      // Use states-only endpoint - cascade requires state identifier
      const instance = NetworkManager(API.LOCATION.GET_STATES_ONLY)
      const response = await instance.request()
      if (response?.data?.status === "success" && Array.isArray(response.data.data)) {
        setStates(response.data.data.map((s) => ({ id: s.id, name: s.name, code: s.code })))
      } else {
        setStates([])
      }
    } catch (err) {
      console.error("Error fetching states:", err)
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
    try {
      const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
      const response = await instance.request({ state: stateNameOrId })
      if (response?.data?.status === "success" && Array.isArray(response.data.data.districts)) {
        setDistricts(response.data.data.districts.map((d) => ({ id: d.id, name: d.name, code: d.code })))
      } else {
        setDistricts([])
      }
    } catch (err) {
      console.error("Error fetching districts:", err)
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
    try {
      const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
      const response = await instance.request({ state: stateNameOrId, district: districtNameOrId })
      if (response?.data?.status === "success" && Array.isArray(response.data.data.talukas)) {
        setTalukas(response.data.data.talukas.map((t) => ({ id: t.id, name: t.name, code: t.code })))
      } else {
        setTalukas([])
      }
    } catch (err) {
      console.error("Error fetching talukas:", err)
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
        setVillages(response.data.data.villages.map((v) => ({ id: v.id, name: v.name, code: v.code })))
      } else {
        setVillages([])
      }
    } catch (err) {
      console.error("Error fetching villages:", err)
      setError("Failed to load villages")
      setVillages([])
    } finally {
      setLoading((prev) => ({ ...prev, villages: false }))
    }
  }

  const handleStateChange = (e) => onStateChange(e.target.value)
  const handleDistrictChange = (e) => onDistrictChange(e.target.value)
  const handleTalukaChange = (e) => onTalukaChange(e.target.value)
  const handleVillageChange = (e) => onVillageChange(e.target.value)

  const sz = compact ? "small" : "medium"

  return (
    <Box className={className} sx={{ mt: compact ? 1 : 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1, py: 0.25, fontSize: "0.75rem" }}>{error}</Alert>
      )}

      <Grid container spacing={compact ? 1 : 2}>
        {/* State */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size={sz} disabled={disabled || loading.states}>
            <InputLabel>{placeholder.state}</InputLabel>
            <Select
              value={selectedState || ""}
              onChange={handleStateChange}
              label={placeholder.state}
              endAdornment={loading.states ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : null}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {states.map((s) => (
                <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>
              ))}
              {selectedState && !states.find((s) => s.name === selectedState) && (
                <MenuItem value={selectedState}>{selectedState}</MenuItem>
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* District */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size={sz} disabled={disabled || loading.districts || !selectedState}>
            <InputLabel>{placeholder.district}</InputLabel>
            <Select
              value={selectedDistrict || ""}
              onChange={handleDistrictChange}
              label={placeholder.district}
              endAdornment={loading.districts ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : null}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {districts.map((d) => (
                <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>
              ))}
              {selectedDistrict && !districts.find((d) => d.name === selectedDistrict) && (
                <MenuItem value={selectedDistrict}>{selectedDistrict}</MenuItem>
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Taluka */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size={sz} disabled={disabled || loading.talukas || !selectedDistrict}>
            <InputLabel>{placeholder.taluka}</InputLabel>
            <Select
              value={selectedTaluka || ""}
              onChange={handleTalukaChange}
              label={placeholder.taluka}
              endAdornment={loading.talukas ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : null}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {talukas.map((t) => (
                <MenuItem key={t.id} value={t.name}>{t.name}</MenuItem>
              ))}
              {selectedTaluka && !talukas.find((t) => t.name === selectedTaluka) && (
                <MenuItem value={selectedTaluka}>{selectedTaluka}</MenuItem>
              )}
            </Select>
          </FormControl>
        </Grid>

        {/* Village */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth size={sz} disabled={disabled || loading.villages || !selectedTaluka}>
            <InputLabel>{placeholder.village}</InputLabel>
            <Select
              value={selectedVillage || ""}
              onChange={handleVillageChange}
              label={placeholder.village}
              endAdornment={loading.villages ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment> : null}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {villages.map((v) => (
                <MenuItem key={v.id} value={v.name}>{v.name}</MenuItem>
              ))}
              {selectedVillage && !villages.find((v) => v.name === selectedVillage) && (
                <MenuItem value={selectedVillage}>{selectedVillage}</MenuItem>
              )}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  )
}

export default LocationSelector
