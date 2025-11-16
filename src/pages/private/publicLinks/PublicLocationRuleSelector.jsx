import React, { useEffect, useState } from "react"
import {
  Box,
  TextField,
  Checkbox,
  FormControlLabel,
  Chip,
  Typography
} from "@mui/material"
import { API, NetworkManager } from "network/core"

const PublicLocationRuleSelector = ({ rule, onChange }) => {
  const [states, setStates] = useState([])
  const [districts, setDistricts] = useState([])
  const [talukas, setTalukas] = useState([])
  const [villages, setVillages] = useState([])
  const [districtQuery, setDistrictQuery] = useState("")
  const [talukaQuery, setTalukaQuery] = useState("")
  const [villageQuery, setVillageQuery] = useState("")

  // Load all states once
  useEffect(() => {
    const loadStates = async () => {
      try {
        const instance = NetworkManager(API.LOCATION.GET_STATES_ONLY)
        const response = await instance.request()
        if (response?.data?.status === "success" && Array.isArray(response.data.data)) {
          setStates(response.data.data.map((s) => ({ id: s.id, name: s.name, code: s.code })))
        } else {
          setStates([])
        }
      } catch (err) {
        console.error("Failed to load states for public link selector", err)
        setStates([])
      }
    }
    loadStates()
  }, [])

  // When state changes, load districts
  useEffect(() => {
    const state = states.find((s) => s.code === rule.stateCode)
    if (state) {
    const loadDistricts = async () => {
        try {
          const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
          const response = await instance.request({ state: state.name })
          const apiDistricts = response?.data?.data?.districts || []
          setDistricts(
            apiDistricts.map((d) => ({
              id: d.id,
              name: d.name,
              code: d.code
            }))
          )
        } catch (err) {
          console.error("Failed to load districts for state", state.name, err)
          setDistricts([])
        }
      }
      loadDistricts()
    } else {
      setDistricts([])
      setTalukas([])
      setVillages([])
    }
  }, [rule.stateCode, states])

  useEffect(() => {
    const state = states.find((s) => s.code === rule.stateCode)
    if (!state || !rule.districts || rule.districts.length === 0) {
      setTalukas([])
      setVillages([])
      return
    }

    const loadTalukas = async () => {
      try {
        const allTalukas = []
        for (const d of rule.districts) {
          const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
          const response = await instance.request({
            state: state.name,
            district: d.districtName
          })
          const apiTalukas = response?.data?.data?.talukas || []
          apiTalukas.forEach((t) => {
            if (!allTalukas.find((existing) => existing.id === t.id)) {
              allTalukas.push({
                id: t.id,
                name: t.name,
                code: t.code
              })
            }
          })
        }
        setTalukas(allTalukas)
      } catch (err) {
        console.error("Failed to load talukas for selected districts", err)
        setTalukas([])
      } finally {
        setVillages([])
      }
    }
    loadTalukas()
  }, [rule.districts])

  useEffect(() => {
    const state = states.find((s) => s.code === rule.stateCode)
    if (!state || !rule.talukas || rule.talukas.length === 0) {
      setVillages([])
      return
    }

    const loadVillages = async () => {
      try {
        const allVillages = []
        // Use first selected district as parent (common case)
        const firstDistrict = rule.districts?.[0]
        if (!firstDistrict) {
          setVillages([])
          return
        }

        for (const t of rule.talukas) {
          const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
          const response = await instance.request({
            state: state.name,
            district: firstDistrict.districtName,
            taluka: t.talukaName
          })
          const apiVillages = response?.data?.data?.villages || []
          apiVillages.forEach((v) => {
            if (!allVillages.find((existing) => existing.id === v.id)) {
              allVillages.push({
                id: v.id,
                name: v.name,
                code: v.code
              })
            }
          })
        }
        setVillages(allVillages)
      } catch (err) {
        console.error("Failed to load villages for selected talukas", err)
        setVillages([])
      }
    }
    loadVillages()
  }, [rule.talukas])

  const updateRule = (patch) => {
    onChange({
      ...rule,
      ...patch
    })
  }

  const selectedState = states.find((s) => s.code === rule.stateCode) || null

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {/* State (single) */}
      <TextField
        select
        size="small"
        label="State"
        value={rule.stateCode}
        onChange={(e) => {
          const code = e.target.value
          const selected = states.find((s) => s.code === code)
          if (!selected) {
            updateRule({
              stateCode: "",
              stateName: "",
              districts: [],
              talukas: [],
              villages: []
            })
            setDistricts([])
            setTalukas([])
            setVillages([])
            return
          }
          updateRule({
            stateCode: selected.code,
            stateName: selected.name,
            districts: [],
            talukas: [],
            villages: []
          })
        }}
        SelectProps={{ native: true }}
      >
        <option value="">Select state</option>
        {states.map((s) => (
          <option key={s.id} value={s.code}>
            {s.name}
          </option>
        ))}
      </TextField>

      {/* Districts (multi with checkboxes) */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#374151" }}>
          Districts
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search districts..."
          value={districtQuery}
          onChange={(e) => setDistrictQuery(e.target.value)}
          sx={{ mt: 0.5, mb: 0.5 }}
        />
        <Box
          sx={{
            maxHeight: 180,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 1,
            p: 0.5,
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 0.25,
            backgroundColor: "#fafafa"
          }}>
          {districts
            .filter((d) => d.name.toLowerCase().includes(districtQuery.toLowerCase()))
            .map((d) => {
              const checked = rule.districts?.some((rd) => rd.districtId === d.id)
              return (
                <FormControlLabel
                  key={d.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={(e) => {
                        const isChecked = e.target.checked
                        let next = rule.districts || []
                        if (isChecked) {
                          next = [
                            ...next,
                            {
                              districtId: d.id,
                              districtCode: d.code,
                              districtName: d.name
                            }
                          ]
                        } else {
                          next = next.filter((rd) => rd.districtId !== d.id)
                        }
                        updateRule({
                          districts: next,
                          talukas: [],
                          villages: []
                        })
                      }}
                    />
                  }
                  label={d.name}
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: "11px" } }}
                />
              )
            })}
        </Box>
        {rule.districts && rule.districts.length > 0 && (
          <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {rule.districts.map((d) => (
              <Chip
                key={d.districtId || d.districtCode}
                size="small"
                label={d.districtName}
                onDelete={() =>
                  updateRule({
                    districts: (rule.districts || []).filter(
                      (rd) => rd.districtId !== d.districtId
                    ),
                    talukas: [],
                    villages: []
                  })
                }
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Talukas (multi with checkboxes) */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#374151" }}>
          Talukas
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search talukas..."
          value={talukaQuery}
          onChange={(e) => setTalukaQuery(e.target.value)}
          sx={{ mt: 0.5, mb: 0.5 }}
          disabled={!rule.districts || rule.districts.length === 0}
        />
        <Box
          sx={{
            maxHeight: 180,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 1,
            p: 0.5,
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 0.25,
            backgroundColor: "#fafafa",
            opacity: !rule.districts || rule.districts.length === 0 ? 0.6 : 1
          }}>
          {talukas
            .filter((t) => t.name.toLowerCase().includes(talukaQuery.toLowerCase()))
            .map((t) => {
              const checked = rule.talukas?.some((rt) => rt.talukaId === t.id)
              return (
                <FormControlLabel
                  key={t.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={(e) => {
                        const isChecked = e.target.checked
                        let next = rule.talukas || []
                        if (isChecked) {
                          next = [
                            ...next,
                            {
                              talukaId: t.id,
                              talukaCode: t.code,
                              talukaName: t.name
                            }
                          ]
                        } else {
                          next = next.filter((rt) => rt.talukaId !== t.id)
                        }
                        updateRule({
                          talukas: next,
                          villages: []
                        })
                      }}
                    />
                  }
                  label={t.name}
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: "11px" } }}
                />
              )
            })}
        </Box>
        {rule.talukas && rule.talukas.length > 0 && (
          <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {rule.talukas.map((t) => (
              <Chip
                key={t.talukaId || t.talukaCode}
                size="small"
                label={t.talukaName}
                onDelete={() =>
                  updateRule({
                    talukas: (rule.talukas || []).filter(
                      (rt) => rt.talukaId !== t.talukaId
                    ),
                    villages: []
                  })
                }
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Villages (multi with checkboxes) */}
      <Box>
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#374151" }}>
          Villages
        </Typography>
        <TextField
          size="small"
          fullWidth
          placeholder="Search villages..."
          value={villageQuery}
          onChange={(e) => setVillageQuery(e.target.value)}
          sx={{ mt: 0.5, mb: 0.5 }}
          disabled={!rule.talukas || rule.talukas.length === 0}
        />
        <Box
          sx={{
            maxHeight: 180,
            overflowY: "auto",
            border: "1px solid #e5e7eb",
            borderRadius: 1,
            p: 0.5,
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 0.25,
            backgroundColor: "#fafafa",
            opacity: !rule.talukas || rule.talukas.length === 0 ? 0.6 : 1
          }}>
          {villages
            .filter((v) => v.name.toLowerCase().includes(villageQuery.toLowerCase()))
            .map((v) => {
              const checked = rule.villages?.some((rv) => rv.villageId === v.id)
              return (
                <FormControlLabel
                  key={v.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={checked}
                      onChange={(e) => {
                        const isChecked = e.target.checked
                        let next = rule.villages || []
                        if (isChecked) {
                          next = [
                            ...next,
                            {
                              villageId: v.id,
                              villageName: v.name,
                              villageCode: v.code
                            }
                          ]
                        } else {
                          next = next.filter(
                            (rv) => rv.villageId !== v.id
                          )
                        }
                        updateRule({ villages: next })
                      }}
                    />
                  }
                  label={v.name}
                  sx={{ "& .MuiFormControlLabel-label": { fontSize: "11px" } }}
                />
              )
            })}
        </Box>
        {rule.villages && rule.villages.length > 0 && (
          <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
            {rule.villages.map((v) => (
              <Chip
                key={v.villageId || v.villageName}
                size="small"
                label={v.villageName}
                onDelete={() =>
                  updateRule({
                    villages: (rule.villages || []).filter(
                      (rv) => rv.villageId !== v.villageId
                    )
                  })
                }
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default PublicLocationRuleSelector


