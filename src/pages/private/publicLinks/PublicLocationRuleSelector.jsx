import React, { useEffect, useMemo, useState } from "react"
import {
  Autocomplete,
  Box,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Typography
} from "@mui/material"
import SearchRoundedIcon from "@mui/icons-material/SearchRounded"
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined"
import { API, NetworkManager } from "network/core"

const C = {
  primary: "#1B7A4E",
  primarySoft: "#E8F5EE",
  ink: "#163027",
  muted: "#5B6B63",
  line: "#D7E3DB",
  surface: "#F7FBF8"
}

const emptyRuleForState = (state) => ({
  stateCode: state.code,
  stateName: state.name,
  districts: [],
  talukas: [],
  villages: []
})

const StateRulePanel = ({ rule, onChange }) => {
  const [districts, setDistricts] = useState([])
  const [talukas, setTalukas] = useState([])
  const [villagesByTaluka, setVillagesByTaluka] = useState({})
  const [districtQuery, setDistrictQuery] = useState("")
  const [talukaQuery, setTalukaQuery] = useState("")
  const [villageQuery, setVillageQuery] = useState("")
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [loadingTalukas, setLoadingTalukas] = useState(false)

  const updateRule = (patch) => {
    onChange({
      ...rule,
      ...patch
    })
  }

  useEffect(() => {
    if (!rule.stateName) {
      setDistricts([])
      setTalukas([])
      setVillagesByTaluka({})
      return
    }

    const loadDistricts = async () => {
      setLoadingDistricts(true)
      try {
        const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
        const response = await instance.request({ state: rule.stateName })
        const apiDistricts = response?.data?.data?.districts || []
        setDistricts(
          apiDistricts.map((d) => ({
            id: d.id,
            name: d.name,
            code: d.code
          }))
        )
      } catch (err) {
        console.error("Failed to load districts for state", rule.stateName, err)
        setDistricts([])
      } finally {
        setLoadingDistricts(false)
      }
    }
    loadDistricts()
  }, [rule.stateCode, rule.stateName])

  useEffect(() => {
    if (!rule.stateName || !rule.districts || rule.districts.length === 0) {
      setTalukas([])
      setVillagesByTaluka({})
      return
    }

    const loadTalukas = async () => {
      setLoadingTalukas(true)
      try {
        const allTalukas = []
        for (const d of rule.districts) {
          const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
          const response = await instance.request({
            state: rule.stateName,
            district: d.districtName
          })
          const apiTalukas = response?.data?.data?.talukas || []
          apiTalukas.forEach((t) => {
            if (!allTalukas.find((existing) => existing.id === t.id)) {
              allTalukas.push({
                id: t.id,
                name: t.name,
                code: t.code,
                districtId: d.districtId,
                districtName: d.districtName,
                districtCode: d.districtCode
              })
            }
          })
        }
        setTalukas(allTalukas)
      } catch (err) {
        console.error("Failed to load talukas for selected districts", err)
        setTalukas([])
      } finally {
        setLoadingTalukas(false)
        setVillagesByTaluka({})
      }
    }
    loadTalukas()
  }, [rule.districts, rule.stateName])

  useEffect(() => {
    if (
      !rule.stateName ||
      !rule.talukas ||
      rule.talukas.length === 0 ||
      !rule.districts ||
      rule.districts.length === 0
    ) {
      setVillagesByTaluka({})
      return
    }

    const loadVillages = async () => {
      try {
        const map = {}

        for (const t of rule.talukas) {
          let districtName = t.districtName

          if (!districtName && rule.districts && rule.districts.length > 0) {
            if (t.districtId) {
              const matchedDistrict = rule.districts.find((d) => d.districtId === t.districtId)
              districtName = matchedDistrict?.districtName
            }
            if (!districtName) {
              districtName = rule.districts[0]?.districtName
            }
          }

          if (!districtName) continue

          const instance = NetworkManager(API.LOCATION.GET_CASCADING_LOCATION)
          const response = await instance.request({
            state: rule.stateName,
            district: districtName,
            taluka: t.talukaName
          })
          const apiVillages = response?.data?.data?.villages || []

          const list = []
          apiVillages.forEach((v) => {
            if (!list.find((existing) => existing.id === v.id)) {
              list.push({
                id: v.id,
                name: v.name,
                code: v.code
              })
            }
          })

          const talukaKey = t.talukaCode || t.talukaId || t.talukaName
          map[talukaKey] = list
        }

        setVillagesByTaluka(map)

        const nextVillages = []
        const seen = new Set()
        for (const t of rule.talukas) {
          const talukaKey = t.talukaCode || t.talukaId || t.talukaName
          for (const v of map[talukaKey] || []) {
            const key = `${talukaKey}|${v.name.toLowerCase()}`
            if (seen.has(key)) continue
            seen.add(key)
            nextVillages.push({
              talukaId: t.talukaId,
              talukaCode: t.talukaCode,
              districtCode:
                t.districtCode ||
                rule.districts?.find((d) => d.districtId === t.districtId)?.districtCode,
              villageId: v.id,
              villageName: v.name,
              villageCode: v.code
            })
          }
        }
        const sameCount = (rule.villages || []).length === nextVillages.length
        const sameSet =
          sameCount &&
          nextVillages.every((v) =>
            (rule.villages || []).some(
              (rv) =>
                String(rv.villageName || "").toLowerCase() ===
                  String(v.villageName || "").toLowerCase() &&
                String(rv.talukaCode || rv.talukaId || "") ===
                  String(v.talukaCode || v.talukaId || "")
            )
          )
        if (!sameSet) {
          updateRule({ villages: nextVillages })
        }
      } catch (err) {
        console.error("Failed to load villages for selected talukas", err)
        setVillagesByTaluka({})
      }
    }
    loadVillages()
  }, [rule.talukas, rule.districts, rule.stateCode, rule.stateName])

  const filteredDistricts = districts.filter((d) =>
    d.name.toLowerCase().includes(districtQuery.toLowerCase())
  )
  const filteredTalukas = talukas.filter((t) =>
    t.name.toLowerCase().includes(talukaQuery.toLowerCase())
  )

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      <LocationPicker
        title="Districts"
        hint={
          loadingDistricts
            ? "Loading districts..."
            : `${rule.districts?.length || 0} of ${districts.length} selected`
        }
        query={districtQuery}
        onQueryChange={setDistrictQuery}
        disabled={!districts.length}
        allSelected={!!districts.length && rule.districts?.length === districts.length}
        onToggleAll={(isChecked) => {
          if (!isChecked) {
            updateRule({ districts: [], talukas: [], villages: [] })
            return
          }
          updateRule({
            districts: districts.map((d) => ({
              districtId: d.id,
              districtCode: d.code,
              districtName: d.name
            })),
            talukas: [],
            villages: []
          })
        }}
        selectedChips={(rule.districts || []).map((d) => ({
          key: d.districtId || d.districtCode,
          label: d.districtName,
          onDelete: () =>
            updateRule({
              districts: (rule.districts || []).filter((rd) => rd.districtId !== d.districtId),
              talukas: [],
              villages: []
            })
        }))}>
        {filteredDistricts.map((d) => {
          const checked = rule.districts?.some((rd) => rd.districtId === d.id)
          return (
            <FormControlLabel
              key={d.id}
              control={
                <Checkbox
                  size="small"
                  checked={checked}
                  sx={{ color: C.line, "&.Mui-checked": { color: C.primary } }}
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
              sx={{ "& .MuiFormControlLabel-label": { fontSize: 12, color: C.ink } }}
            />
          )
        })}
        {!loadingDistricts && !filteredDistricts.length && (
          <Typography sx={{ fontSize: 12, color: C.muted, gridColumn: "1 / -1", py: 1 }}>
            No districts match this search.
          </Typography>
        )}
      </LocationPicker>

      <LocationPicker
        title="Talukas"
        hint={
          !rule.districts?.length
            ? "Select districts first"
            : loadingTalukas
              ? "Loading talukas..."
              : `${rule.talukas?.length || 0} of ${talukas.length} selected`
        }
        query={talukaQuery}
        onQueryChange={setTalukaQuery}
        disabled={!rule.districts?.length || !talukas.length}
        allSelected={!!talukas.length && rule.talukas?.length === talukas.length}
        onToggleAll={(isChecked) => {
          if (!isChecked) {
            updateRule({ talukas: [], villages: [] })
            return
          }
          updateRule({
            talukas: talukas.map((t) => ({
              talukaId: t.id,
              talukaCode: t.code,
              talukaName: t.name,
              districtId: t.districtId,
              districtName: t.districtName,
              districtCode: t.districtCode
            })),
            villages: []
          })
        }}
        selectedChips={(rule.talukas || []).map((t) => ({
          key: t.talukaCode || t.talukaId,
          label: t.talukaName,
          onDelete: () =>
            updateRule({
              talukas: (rule.talukas || []).filter(
                (rt) => (rt.talukaCode || rt.talukaId) !== (t.talukaCode || t.talukaId)
              ),
              villages: []
            })
        }))}>
        {filteredTalukas.map((t) => {
          const checked = rule.talukas?.some(
            (rt) => rt.talukaCode === t.code || rt.talukaId === t.id
          )
          return (
            <FormControlLabel
              key={t.id || t.code}
              control={
                <Checkbox
                  size="small"
                  checked={checked}
                  sx={{ color: C.line, "&.Mui-checked": { color: C.primary } }}
                  onChange={(e) => {
                    const isChecked = e.target.checked
                    let next = rule.talukas || []
                    if (isChecked) {
                      next = [
                        ...next,
                        {
                          talukaId: t.id,
                          talukaCode: t.code,
                          talukaName: t.name,
                          districtId: t.districtId,
                          districtName: t.districtName,
                          districtCode: t.districtCode
                        }
                      ]
                    } else {
                      next = next.filter((rt) => rt.talukaCode !== t.code && rt.talukaId !== t.id)
                    }
                    updateRule({
                      talukas: next,
                      villages: []
                    })
                  }}
                />
              }
              label={
                <span>
                  {t.name}
                  {t.districtName ? (
                    <span style={{ color: C.muted, marginLeft: 4 }}>({t.districtName})</span>
                  ) : null}
                </span>
              }
              sx={{ "& .MuiFormControlLabel-label": { fontSize: 12, color: C.ink } }}
            />
          )
        })}
        {!loadingTalukas && rule.districts?.length > 0 && !filteredTalukas.length && (
          <Typography sx={{ fontSize: 12, color: C.muted, gridColumn: "1 / -1", py: 1 }}>
            No talukas match this search.
          </Typography>
        )}
      </LocationPicker>

      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.ink }}>
            Villages
          </Typography>
          <Typography sx={{ fontSize: 11, color: C.muted }}>
            {!rule.talukas?.length
              ? "Select talukas to include their villages"
              : `${rule.villages?.length || 0} villages included`}
          </Typography>
        </Box>
        <TextField
          size="small"
          fullWidth
          placeholder="Search villages..."
          value={villageQuery}
          onChange={(e) => setVillageQuery(e.target.value)}
          disabled={!rule.talukas?.length}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon sx={{ fontSize: 16, color: C.muted }} />
              </InputAdornment>
            )
          }}
          sx={searchFieldSx}
        />
        <Box
          sx={{
            mt: 1,
            maxHeight: 230,
            overflowY: "auto",
            border: `1px solid ${C.line}`,
            borderRadius: 2,
            p: 1,
            backgroundColor: C.surface,
            opacity: !rule.talukas?.length ? 0.55 : 1
          }}>
          {rule.talukas?.map((t, talukaIndex) => {
            const talukaKey = t.talukaCode || t.talukaId || t.talukaName
            const list = (villagesByTaluka[talukaKey] || []).filter((v) =>
              v.name.toLowerCase().includes(villageQuery.toLowerCase())
            )
            const allSelectedInTaluka =
              list.length > 0 &&
              list.every((v) =>
                (rule.villages || []).some(
                  (rv) =>
                    (rv.villageId === v.id ||
                      String(rv.villageName || "").toLowerCase() === v.name.toLowerCase()) &&
                    ((rv.talukaCode && rv.talukaCode === t.talukaCode) ||
                      (rv.talukaId && rv.talukaId === t.talukaId) ||
                      !rv.talukaCode)
                )
              )

            return (
              <Box key={talukaKey}>
                {talukaIndex > 0 && <Divider sx={{ my: 1, borderColor: C.line }} />}
                <Box
                  sx={{
                    border: `1px solid ${C.line}`,
                    borderRadius: 1.5,
                    p: 1,
                    backgroundColor: "#fff"
                  }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.ink }}>
                      {t.talukaName}
                      {t.districtName ? ` · ${t.districtName}` : ""} — {list.length}
                    </Typography>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          disabled={!list.length}
                          checked={allSelectedInTaluka}
                          sx={{ color: C.line, "&.Mui-checked": { color: C.primary } }}
                          onChange={(e) => {
                            const isChecked = e.target.checked
                            let next = rule.villages || []
                            if (!isChecked) {
                              next = next.filter(
                                (rv) =>
                                  rv.talukaCode !== t.talukaCode && rv.talukaId !== t.talukaId
                              )
                            } else {
                              const toAdd = list.filter(
                                (v) =>
                                  !next.some(
                                    (rv) =>
                                      (rv.villageId === v.id ||
                                        String(rv.villageName || "").toLowerCase() ===
                                          v.name.toLowerCase()) &&
                                      (rv.talukaCode === t.talukaCode ||
                                        rv.talukaId === t.talukaId ||
                                        !rv.talukaCode)
                                  )
                              )
                              next = [
                                ...next,
                                ...toAdd.map((v) => ({
                                  talukaId: t.talukaId,
                                  talukaCode: t.talukaCode,
                                  districtCode:
                                    t.districtCode ||
                                    rule.districts?.find((d) => d.districtId === t.districtId)
                                      ?.districtCode,
                                  villageId: v.id,
                                  villageName: v.name,
                                  villageCode: v.code
                                }))
                              ]
                            }
                            updateRule({ villages: next })
                          }}
                        />
                      }
                      label="All"
                      sx={{
                        m: 0,
                        "& .MuiFormControlLabel-label": { fontSize: 10, color: C.muted }
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 0.25
                    }}>
                    {list.map((v) => {
                      const checked = (rule.villages || []).some(
                        (rv) =>
                          (rv.villageId === v.id ||
                            String(rv.villageName || "").toLowerCase() ===
                              v.name.toLowerCase()) &&
                          (rv.talukaCode === t.talukaCode ||
                            rv.talukaId === t.talukaId ||
                            !rv.talukaCode)
                      )
                      return (
                        <FormControlLabel
                          key={v.id || v.code || v.name}
                          control={
                            <Checkbox
                              size="small"
                              checked={checked}
                              sx={{ color: C.line, "&.Mui-checked": { color: C.primary } }}
                              onChange={(e) => {
                                const isChecked = e.target.checked
                                let next = rule.villages || []
                                if (isChecked) {
                                  if (
                                    !next.some(
                                      (rv) =>
                                        (rv.villageId === v.id ||
                                          String(rv.villageName || "").toLowerCase() ===
                                            v.name.toLowerCase()) &&
                                        (rv.talukaCode === t.talukaCode ||
                                          rv.talukaId === t.talukaId)
                                    )
                                  ) {
                                    next = [
                                      ...next,
                                      {
                                        talukaId: t.talukaId,
                                        talukaCode: t.talukaCode,
                                        districtCode:
                                          t.districtCode ||
                                          rule.districts?.find(
                                            (d) => d.districtId === t.districtId
                                          )?.districtCode,
                                        villageId: v.id,
                                        villageName: v.name,
                                        villageCode: v.code
                                      }
                                    ]
                                  }
                                } else {
                                  next = next.filter(
                                    (rv) =>
                                      !(
                                        (rv.villageId === v.id ||
                                          String(rv.villageName || "").toLowerCase() ===
                                            v.name.toLowerCase()) &&
                                        (rv.talukaCode === t.talukaCode ||
                                          rv.talukaId === t.talukaId ||
                                          !rv.talukaCode)
                                      )
                                  )
                                }
                                updateRule({ villages: next })
                              }}
                            />
                          }
                          label={v.name}
                          sx={{ "& .MuiFormControlLabel-label": { fontSize: 11, color: C.ink } }}
                        />
                      )
                    })}
                    {!list.length && (
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: C.muted,
                          gridColumn: "1 / -1",
                          py: 0.5
                        }}>
                        No villages found for this taluka.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Box>
  )
}

const searchFieldSx = {
  "& .MuiOutlinedInput-root": {
    backgroundColor: "#fff",
    borderRadius: 2,
    fontSize: 13,
    "& fieldset": { borderColor: C.line },
    "&:hover fieldset": { borderColor: C.primary },
    "&.Mui-focused fieldset": { borderColor: C.primary }
  }
}

const LocationPicker = ({
  title,
  hint,
  query,
  onQueryChange,
  disabled,
  allSelected,
  onToggleAll,
  selectedChips,
  children
}) => (
  <Box>
    <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{title}</Typography>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography sx={{ fontSize: 11, color: C.muted }}>{hint}</Typography>
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              disabled={disabled}
              checked={allSelected}
              sx={{ color: C.line, "&.Mui-checked": { color: C.primary } }}
              onChange={(e) => onToggleAll(e.target.checked)}
            />
          }
          label="All"
          sx={{
            m: 0,
            "& .MuiFormControlLabel-label": { fontSize: 10, color: C.muted }
          }}
        />
      </Box>
    </Box>
    <TextField
      size="small"
      fullWidth
      placeholder={`Search ${title.toLowerCase()}...`}
      value={query}
      onChange={(e) => onQueryChange(e.target.value)}
      disabled={disabled}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchRoundedIcon sx={{ fontSize: 16, color: C.muted }} />
          </InputAdornment>
        )
      }}
      sx={searchFieldSx}
    />
    <Box
      sx={{
        mt: 1,
        maxHeight: 168,
        overflowY: "auto",
        border: `1px solid ${C.line}`,
        borderRadius: 2,
        p: 1,
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 0.25,
        backgroundColor: C.surface,
        opacity: disabled ? 0.55 : 1
      }}>
      {children}
    </Box>
    {selectedChips?.length > 0 && (
      <Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
        {selectedChips.slice(0, 10).map((chip) => (
          <Chip
            key={chip.key}
            size="small"
            label={chip.label}
            onDelete={chip.onDelete}
            sx={{
              height: 22,
              backgroundColor: C.primarySoft,
              color: C.primary,
              fontWeight: 600,
              "& .MuiChip-deleteIcon": { color: C.primary, fontSize: 14 }
            }}
          />
        ))}
        {selectedChips.length > 10 && (
          <Chip
            size="small"
            label={`+${selectedChips.length - 10} more`}
            sx={{ height: 22, backgroundColor: "#EEF2F0", color: C.muted, fontWeight: 600 }}
          />
        )}
      </Box>
    )}
  </Box>
)

const PublicLocationRuleSelector = ({ rules = [], onChange }) => {
  const [states, setStates] = useState([])
  const [activeStateCode, setActiveStateCode] = useState(rules[0]?.stateCode || "")

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

  useEffect(() => {
    if (!rules.length) {
      setActiveStateCode("")
      return
    }
    if (!rules.some((rule) => rule.stateCode === activeStateCode)) {
      setActiveStateCode(rules[0].stateCode)
    }
  }, [rules, activeStateCode])

  const selectedStates = useMemo(
    () =>
      rules
        .map((rule) => states.find((s) => s.code === rule.stateCode))
        .filter(Boolean)
        .concat(
          rules
            .filter((rule) => rule.stateCode && !states.find((s) => s.code === rule.stateCode))
            .map((rule) => ({
              id: rule.stateCode,
              code: rule.stateCode,
              name: rule.stateName || rule.stateCode
            }))
        ),
    [rules, states]
  )

  const handleStatesChange = (_, nextStates) => {
    const existingByCode = Object.fromEntries(
      (rules || []).map((rule) => [rule.stateCode, rule])
    )
    const nextRules = nextStates.map((state) => existingByCode[state.code] || emptyRuleForState(state))
    const added = nextStates.find((state) => !rules.some((rule) => rule.stateCode === state.code))
    onChange(nextRules)
    if (added) {
      setActiveStateCode(added.code)
    } else if (!nextRules.some((rule) => rule.stateCode === activeStateCode)) {
      setActiveStateCode(nextRules[0]?.stateCode || "")
    }
  }

  const handleRuleUpdate = (stateCode, updatedRule) => {
    onChange(rules.map((rule) => (rule.stateCode === stateCode ? updatedRule : rule)))
  }

  const summary = rules.reduce(
    (acc, rule) => {
      acc.districts += rule.districts?.length || 0
      acc.talukas += rule.talukas?.length || 0
      acc.villages += rule.villages?.length || 0
      return acc
    },
    { districts: 0, talukas: 0, villages: 0 }
  )

  return (
    <Box>
      <Autocomplete
        multiple
        options={states}
        value={selectedStates}
        disableCloseOnSelect
        isOptionEqualToValue={(option, value) => option.code === value.code}
        getOptionLabel={(option) => option.name || ""}
        onChange={handleStatesChange}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.code}
              size="small"
              label={option.name}
              sx={{
                backgroundColor: C.primarySoft,
                color: C.primary,
                fontWeight: 700,
                "& .MuiChip-deleteIcon": { color: C.primary }
              }}
            />
          ))
        }
        renderOption={(props, option, { selected }) => {
          const { key, ...optionProps } = props
          return (
            <li key={key || option.code} {...optionProps}>
              <Checkbox
                size="small"
                checked={selected}
                sx={{ mr: 1, color: C.line, "&.Mui-checked": { color: C.primary } }}
              />
              {option.name}
            </li>
          )
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={selectedStates.length ? "Add another state..." : "Search and select states..."}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start" sx={{ ml: 0.5 }}>
                    <PlaceOutlinedIcon sx={{ fontSize: 18, color: C.primary }} />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              )
            }}
          />
        )}
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: "#fff",
            borderRadius: 2,
            minHeight: 48,
            alignItems: "center",
            "& fieldset": { borderColor: C.line },
            "&:hover fieldset": { borderColor: C.primary },
            "&.Mui-focused fieldset": { borderColor: C.primary, borderWidth: 1.5 }
          }
        }}
      />

      {rules.length > 0 && (
        <Box
          sx={{
            mt: 1.5,
            display: "flex",
            flexWrap: "wrap",
            gap: 1
          }}>
          {[
            `${rules.length} state${rules.length === 1 ? "" : "s"}`,
            `${summary.districts} district${summary.districts === 1 ? "" : "s"}`,
            `${summary.talukas} taluka${summary.talukas === 1 ? "" : "s"}`,
            `${summary.villages} village${summary.villages === 1 ? "" : "s"}`
          ].map((label) => (
            <Chip
              key={label}
              size="small"
              label={label}
              sx={{
                height: 24,
                backgroundColor: "#fff",
                border: `1px solid ${C.line}`,
                color: C.ink,
                fontWeight: 600
              }}
            />
          ))}
        </Box>
      )}

      {rules.length === 0 ? (
        <Box
          sx={{
            mt: 2,
            border: `1px dashed ${C.line}`,
            borderRadius: 2,
            backgroundColor: C.surface,
            py: 4,
            px: 2,
            textAlign: "center"
          }}>
          <PlaceOutlinedIcon sx={{ fontSize: 28, color: C.primary, mb: 0.5 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
            Select one or more states
          </Typography>
          <Typography sx={{ fontSize: 12, color: C.muted, mt: 0.5 }}>
            Farmers on this public link will only see locations from the states you add here.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          {rules.length > 1 && (
            <Tabs
              value={activeStateCode}
              onChange={(_, value) => setActiveStateCode(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 36,
                mb: 1.5,
                "& .MuiTab-root": {
                  minHeight: 36,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 13,
                  color: C.muted
                },
                "& .Mui-selected": { color: `${C.primary} !important` },
                "& .MuiTabs-indicator": { backgroundColor: C.primary, height: 3, borderRadius: 2 }
              }}>
              {rules.map((rule) => (
                <Tab
                  key={rule.stateCode}
                  value={rule.stateCode}
                  label={`${rule.stateName || rule.stateCode} (${rule.districts?.length || 0})`}
                />
              ))}
            </Tabs>
          )}

          {rules.map((rule) => (
            <Box key={rule.stateCode} hidden={rule.stateCode !== activeStateCode}>
              {rules.length === 1 && (
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: C.ink, mb: 1.25 }}>
                  {rule.stateName}
                </Typography>
              )}
              <StateRulePanel
                rule={rule}
                onChange={(updated) => handleRuleUpdate(rule.stateCode, updated)}
              />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default PublicLocationRuleSelector
