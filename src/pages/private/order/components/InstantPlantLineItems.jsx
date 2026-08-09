import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Grid,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Divider,
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "lib/muiLocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material"
import moment from "moment"
import SearchableSelect from "components/FormField/SearchableSelect"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const DATE_PICKER_FORMAT = "dd-MMMM-yyyy"

function emptyLine(id) {
  return {
    localId: id || `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    plant: "",
    plantLabel: "",
    subtype: "",
    subtypeLabel: "",
    noOfPlants: "",
    rate: "",
    orderDate: null,
    bookingSlot: "",
    cavity: "",
  }
}

function slotIdForDate(selectedDate, slots) {
  if (!selectedDate || !slots?.length) return null
  const selectedMoment = moment(selectedDate)
  for (const slot of slots) {
    if (!slot.startDay || !slot.endDay) continue
    const slotStart = moment(slot.startDay, "DD-MM-YYYY")
    const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
    if (
      selectedMoment.isSameOrAfter(slotStart, "day") &&
      selectedMoment.isSameOrBefore(slotEnd, "day")
    ) {
      return slot.value
    }
  }
  return null
}

function isDateDisabled(date, slots) {
  if (!date || !slots?.length) return true
  const dateMoment = moment(date)
  for (const slot of slots) {
    if (!slot.startDay || !slot.endDay) continue
    const slotStart = moment(slot.startDay, "DD-MM-YYYY")
    const slotEnd = moment(slot.endDay, "DD-MM-YYYY")
    if (dateMoment.isSameOrAfter(slotStart, "day") && dateMoment.isSameOrBefore(slotEnd, "day")) {
      return false
    }
  }
  return true
}

/**
 * Instant-order multi plant/subtype line editor.
 * Parent receives API-ready lines via onChange(lines).
 */
export default function InstantPlantLineItems({
  cavities = [],
  defaultCavity = "",
  onChange,
}) {
  const [plants, setPlants] = useState([])
  const [lines, setLines] = useState(() => [emptyLine("line-0")])
  const [subTypesByPlant, setSubTypesByPlant] = useState({})
  const [slotsByKey, setSlotsByKey] = useState({})
  const [loadingKey, setLoadingKey] = useState("")

  const toApiLines = useCallback(
    (next) =>
      next.map((line, idx) => ({
        plantName: line.plant,
        plantSubtype: line.subtype,
        plantNameSnapshot: line.plantLabel || "",
        plantSubtypeSnapshot: line.subtypeLabel || "",
        bookingSlot: line.bookingSlot,
        numberOfPlants: parseInt(line.noOfPlants, 10) || 0,
        rate: parseFloat(line.rate) || 0,
        deliveryDate:
          line.orderDate instanceof Date
            ? line.orderDate.toISOString()
            : line.orderDate || null,
        cavity: line.cavity || defaultCavity || "",
        sortOrder: idx,
        plantLabel: line.plantLabel,
        subtypeLabel: line.subtypeLabel,
        orderDate: line.orderDate,
      })),
    [defaultCavity]
  )

  const commitLines = useCallback(
    (next) => {
      setLines(next)
      if (typeof onChange === "function") onChange(toApiLines(next))
    },
    [onChange, toApiLines]
  )

  useEffect(() => {
    if (typeof onChange === "function") onChange(toApiLines(lines))
  }, [])

  const loadPlants = async () => {
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS)
      const response = await instance.request()
      if (response?.data) {
        setPlants(
          response.data.map((plant) => ({
            label: plant.name,
            value: plant.plantId,
          }))
        )
      }
    } catch (error) {
      console.error("InstantPlantLineItems loadPlants:", error)
    }
  }

  const loadSubTypes = async (plantId) => {
    if (!plantId) return
    if (subTypesByPlant[plantId]) return
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
      const response = await instance.request(null, {
        plantId,
        year: new Date().getFullYear(),
      })
      const subtypes = (response?.data?.subtypes || []).map((subtype) => {
        let rate = 0
        if (subtype.rates) {
          rate = Array.isArray(subtype.rates)
            ? subtype.rates.length > 0
              ? subtype.rates[0]
              : 0
            : subtype.rates
        } else if (subtype.rate) {
          rate = subtype.rate
        }
        return {
          label: subtype.subtypeName,
          value: subtype.subtypeId,
          rate,
        }
      })
      setSubTypesByPlant((prev) => ({ ...prev, [plantId]: subtypes }))
    } catch (error) {
      console.error("InstantPlantLineItems loadSubTypes:", error)
      setSubTypesByPlant((prev) => ({ ...prev, [plantId]: [] }))
    }
  }

  const loadSlots = async (plantId, subtypeId) => {
    if (!plantId || !subtypeId) return
    const key = `${plantId}:${subtypeId}`
    if (slotsByKey[key]) return
    setLoadingKey(key)
    try {
      const years = [2026, 2027]
      const responses = await Promise.all(
        years.map((year) =>
          NetworkManager(API.slots.GET_SIMPLE_SLOTS, false, {
            abortScope: `instant-line-y${year}`,
          }).request({}, { plantId, subtypeId, year })
        )
      )
      let allSlotsData = []
      responses.forEach((response) => {
        const rawSlots =
          response?.data?.data?.slots ||
          response?.data?.slots ||
          response?.data?.data ||
          []
        const slotsData = Array.isArray(rawSlots)
          ? rawSlots
          : Array.isArray(rawSlots?.slots)
            ? rawSlots.slots
            : []
        allSlotsData = [...allSlotsData, ...slotsData]
      })

      const processed = allSlotsData
        .map((slot) => {
          if (!slot?._id || !slot.startDay || !slot.endDay) return null
          const startOk = moment(slot.startDay, "DD-MM-YYYY", true).isValid()
          const endOk = moment(slot.endDay, "DD-MM-YYYY", true).isValid()
          if (!startOk || !endOk) return null
          const available =
            slot.availablePlants !== undefined
              ? slot.availablePlants
              : (slot.totalPlants || 0) - (slot.totalBookedPlants || 0)
          return {
            value: slot._id,
            label: `${slot.startDay} → ${slot.endDay}`,
            startDay: slot.startDay,
            endDay: slot.endDay,
            availableQuantity: available,
          }
        })
        .filter((s) => s && (s.availableQuantity == null || s.availableQuantity > 0))

      setSlotsByKey((prev) => {
        const nextMap = { ...prev, [key]: processed }
        // Re-resolve booking slots for lines waiting on this plant/subtype
        setLines((prevLines) => {
          const nextLines = prevLines.map((line) => {
            const lineKey =
              line.plant && line.subtype ? `${line.plant}:${line.subtype}` : ""
            if (lineKey !== key || !line.orderDate) return line
            return {
              ...line,
              bookingSlot: slotIdForDate(line.orderDate, processed) || "",
            }
          })
          if (typeof onChange === "function") onChange(toApiLines(nextLines))
          return nextLines
        })
        return nextMap
      })
    } catch (error) {
      console.error("InstantPlantLineItems loadSlots:", error)
      Toast.error("Failed to load slots for plant line")
      setSlotsByKey((prev) => ({ ...prev, [key]: [] }))
    } finally {
      setLoadingKey("")
    }
  }

  const updateLine = (localId, patch) => {
    setLines((prevLines) => {
      const next = prevLines.map((line) => {
        if (line.localId !== localId) return line
        const merged = { ...line, ...patch }
        const key = merged.plant && merged.subtype ? `${merged.plant}:${merged.subtype}` : ""
        const slots = key ? slotsByKey[key] || [] : []
        if (
          Object.prototype.hasOwnProperty.call(patch, "orderDate") ||
          patch.plant ||
          patch.subtype
        ) {
          merged.bookingSlot = slotIdForDate(merged.orderDate, slots) || ""
        }
        return merged
      })
      if (typeof onChange === "function") onChange(toApiLines(next))
      return next
    })
  }

  const addLine = () => {
    commitLines([...lines, emptyLine()])
  }

  const removeLine = (localId) => {
    if (lines.length <= 1) {
      Toast.error("At least one plant line is required")
      return
    }
    commitLines(lines.filter((l) => l.localId !== localId))
  }

  const totals = useMemo(() => {
    let qty = 0
    let amount = 0
    for (const line of lines) {
      const q = parseInt(line.noOfPlants, 10) || 0
      const r = parseFloat(line.rate) || 0
      qty += q
      amount += q * r
    }
    return { qty, amount }
  }, [lines])

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1e293b" }}>
          Plants (multi-line instant)
        </Typography>
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`${totals.qty} plants · ₹${totals.amount.toLocaleString("en-IN")}`}
        />
      </Box>

      {lines.map((line, index) => {
        const subtypeOptions = line.plant ? subTypesByPlant[line.plant] || [] : []
        const slotKey = line.plant && line.subtype ? `${line.plant}:${line.subtype}` : ""
        const slots = slotKey ? slotsByKey[slotKey] || [] : []
        const slotsBusy = loadingKey === slotKey

        return (
          <Box
            key={line.localId}
            sx={{
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              border: "1px solid #e2e8f0",
              bgcolor: index % 2 === 0 ? "#f8fafc" : "#fff",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: "#475569" }}>
                Line {index + 1}
              </Typography>
              <IconButton
                size="small"
                onClick={() => removeLine(line.localId)}
                disabled={lines.length <= 1}
                aria-label="Remove plant line"
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>

            <Grid container spacing={1.5}>
              <Grid item xs={12} md={6}>
                <SearchableSelect
                  label="Select Plant"
                  items={plants}
                  value={line.plant || ""}
                  onOpen={() => {
                    void loadPlants()
                  }}
                  onChange={(e) => {
                    const plantId = e.target.value
                    const plantLabel = plants.find((p) => p.value === plantId)?.label || ""
                    updateLine(line.localId, {
                      plant: plantId,
                      plantLabel,
                      subtype: "",
                      subtypeLabel: "",
                      rate: "",
                      orderDate: null,
                      bookingSlot: "",
                    })
                    void loadSubTypes(plantId)
                  }}
                  placeholder="Search plant..."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SearchableSelect
                  label="Select Subtype"
                  items={subtypeOptions}
                  value={line.subtype || ""}
                  onOpen={() => {
                    if (line.plant) void loadSubTypes(line.plant)
                  }}
                  onChange={(e) => {
                    const subtypeId = e.target.value
                    const st = subtypeOptions.find((s) => s.value === subtypeId)
                    const rateValue =
                      st?.rate != null
                        ? typeof st.rate === "number"
                          ? st.rate
                          : parseFloat(st.rate) || 0
                        : 0
                    updateLine(line.localId, {
                      subtype: subtypeId,
                      subtypeLabel: st?.label || "",
                      rate: rateValue ? String(rateValue) : "",
                      orderDate: null,
                      bookingSlot: "",
                    })
                    if (line.plant && subtypeId) void loadSlots(line.plant, subtypeId)
                  }}
                  placeholder="Search subtype..."
                  disabled={!line.plant}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Quantity"
                  type="number"
                  value={line.noOfPlants}
                  onChange={(e) => updateLine(line.localId, { noOfPlants: e.target.value })}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Rate"
                  type="number"
                  value={line.rate}
                  onChange={(e) => updateLine(line.localId, { rate: e.target.value })}
                  inputProps={{ min: 0, step: "0.01" }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Delivery Date"
                    format={DATE_PICKER_FORMAT}
                    value={line.orderDate}
                    onOpen={() => {
                      if (line.plant && line.subtype) void loadSlots(line.plant, line.subtype)
                    }}
                    onChange={(date) => {
                      const bookingSlot = slotIdForDate(date, slots) || ""
                      updateLine(line.localId, { orderDate: date, bookingSlot })
                    }}
                    shouldDisableDate={(date) => isDateDisabled(date, slots)}
                    disabled={!line.plant || !line.subtype}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        size="small"
                        helperText={
                          slotsBusy
                            ? "Loading slots…"
                            : line.bookingSlot
                              ? "Slot matched"
                              : line.orderDate
                                ? "No slot for this date"
                                : "Pick a date in an open slot"
                        }
                      />
                    )}
                  />
                </LocalizationProvider>
                {slotsBusy && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                    <CircularProgress size={14} />
                    <Typography variant="caption">Loading slots…</Typography>
                  </Box>
                )}
              </Grid>
              {cavities?.length > 0 && (
                <Grid item xs={12} md={6}>
                  <SearchableSelect
                    label="Cavity"
                    items={cavities}
                    value={line.cavity || defaultCavity || ""}
                    onChange={(e) => updateLine(line.localId, { cavity: e.target.value })}
                    placeholder="Search cavity..."
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        )
      })}

      <Button
        startIcon={<AddIcon />}
        variant="outlined"
        size="small"
        onClick={addLine}
        sx={{ mb: 1 }}
      >
        Add plant line
      </Button>
      <Divider sx={{ my: 1 }} />
      <Typography variant="body2" color="text.secondary">
        Invoice will list each plant · subtype as its own row under one order / DC.
      </Typography>
    </Box>
  )
}

/** Validate API-shaped instant lines from InstantPlantLineItems onChange. */
export function validateInstantPlantLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return "Add at least one plant line"
  }
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!line.plantName || !line.plantSubtype) {
      return `Line ${i + 1}: select plant and subtype`
    }
    if (!line.bookingSlot) {
      return `Line ${i + 1}: pick a delivery date that matches a booking slot`
    }
    if (!line.numberOfPlants || line.numberOfPlants < 1) {
      return `Line ${i + 1}: quantity must be at least 1`
    }
    if (line.rate == null || Number.isNaN(Number(line.rate)) || Number(line.rate) < 0) {
      return `Line ${i + 1}: enter a valid rate`
    }
  }
  return null
}
