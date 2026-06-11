import React, { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Badge,
  Popover,
  Divider,
  Paper,
} from "@mui/material"
import {
  Close as CloseIcon,
  FlashOn as FlashIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  History as HistoryIcon,
  Inventory2 as InventoryIcon,
} from "@mui/icons-material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "lib/muiLocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { useSelector } from "react-redux"
import useDebounce from "hooks/useDebounce"
import SearchableSelect from "components/FormField/SearchableSelect"
import LocationSelector from "components/LocationSelector"
import moment from "moment"

/** date-fns / MUI DatePicker format */
const DATE_PICKER_FORMAT = "dd-MMMM-yyyy"

const RECENT_ORDER_LIMIT = 3

function orderSortTime(o) {
  const raw = o?.orderBookingDate || o?.createdAt || o?.orderDate || o?.updatedAt
  const t = raw ? new Date(raw).getTime() : 0
  return Number.isFinite(t) ? t : 0
}

function formatPlantSubtypeLine(o) {
  const pn = o?.plantName
  const name = typeof pn === "object" && pn?.name ? pn.name : pn || ""
  const st = o?.plantSubtype
  const sub =
    typeof st === "object" && (st?.subtypeName || st?.name)
      ? st.subtypeName || st.name
      : st || o?.subtypeName || ""
  return [name, sub].filter(Boolean).join(" · ") || "—"
}

function formatBookingWindow(o) {
  const bs = o?.bookingSlot
  if (bs && typeof bs === "object") {
    const s = bs.startDay ?? bs.start
    const e = bs.endDay ?? bs.end
    if (s && e) return `${s} → ${e}`
    if (s) return String(s)
  }
  const d = o?.deliveryDate
  if (!d) return "—"
  if (typeof d === "object" && d?.year != null && d?.month != null) {
    const y = d.year
    const m = String(d.month).padStart(2, "0")
    const sd = d.startDay ?? d.day ?? "01"
    return moment(`${y}-${m}-${String(sd).padStart(2, "0")}`, "YYYY-MM-DD").format("D MMM YYYY")
  }
  try {
    return moment(d).format("D MMM YYYY")
  } catch {
    return "—"
  }
}

function totalDispatchedPlants(o) {
  const h = o?.dispatchHistory
  if (!Array.isArray(h) || !h.length) return null
  const sum = h.reduce((s, x) => s + (Number(x?.quantity) || 0), 0)
  return sum > 0 ? sum : null
}

const INITIAL_FORM = {
  mobileNumber: "",
  name: "",
  village: "",
  taluka: "",
  district: "",
  state: "Maharashtra",
  stateName: "Maharashtra",
  districtName: "",
  talukaName: "",
  plant: "",
  subtype: "",
  noOfPlants: "",
  rate: "",
  deliveryDate: null,
  selectedSlotId: null, // which slot card is active
  cavityId: "",
  shadeId: "",
}

function refId(v) {
  if (v == null || v === "") return ""
  if (typeof v === "object" && v._id != null) return String(v._id)
  return String(v)
}

/** Shade + cavity from this vehicle’s dispatch (all plant rows). */
function pickupDefaultsFromDispatchSnapshot(snapshot) {
  let shadeId = ""
  let cavityId = ""
  const rows = Array.isArray(snapshot?.plantsDetails) ? snapshot.plantsDetails : []
  for (const pd of rows) {
    const pickups = Array.isArray(pd?.pickupDetails) ? pd.pickupDetails : []
    for (const p of pickups) {
      const s = refId(p?.shade)
      const c = refId(p?.cavity)
      if (s && !shadeId) shadeId = s
      if (c && !cavityId) cavityId = c
      if (shadeId && cavityId) return { shadeId, cavityId }
    }
    for (const cr of Array.isArray(pd?.crates) ? pd.crates : []) {
      const c = refId(cr?.cavity)
      if (c && !cavityId) cavityId = c
      if (shadeId && cavityId) return { shadeId, cavityId }
    }
  }
  return { shadeId, cavityId }
}

/**
 * QuickOrderDialog — creates a DISPATCHED order directly and links it to a
 * dispatch vehicle via afterDispatchedOrderIds.
 *
 * Props:
 *   open          – boolean
 *   onClose       – () => void
 *   onSuccess     – () => void
 *   dispatchId    – string  (dispatch _id)
 *   dispatchLabel – string  (e.g. "Dispatch #42")
 *   dispatchSnapshot – optional full dispatch row (pre-fill cavity/shade from vehicle)
 */
const QuickOrderDialog = ({
  open,
  onClose,
  onSuccess,
  dispatchId,
  dispatchLabel,
  dispatchSnapshot,
  autoSlotSelection = false,
}) => {
  const userData = useSelector((s) => s?.userData?.userData)
  const appUser = useSelector((s) => s?.app?.user)
  const user = userData || appUser || {}

  const [form, setForm] = useState(INITIAL_FORM)
  const [farmerData, setFarmerData] = useState({})

  const [plants, setPlants] = useState([])
  const [subTypes, setSubTypes] = useState([])
  const [slots, setSlots] = useState([])

  const [loading, setLoading] = useState(false)
  const [plantsLoading, setPlantsLoading] = useState(false)
  const [subtypesLoading, setSubtypesLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [mobileLoading, setMobileLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [shades, setShades] = useState([])
  const [cavities, setCavities] = useState([])
  const [shadesLoading, setShadesLoading] = useState(false)
  const [cavitiesLoading, setCavitiesLoading] = useState(false)
  const [recentOrders, setRecentOrders] = useState([])
  const [recentOrdersLoading, setRecentOrdersLoading] = useState(false)
  const [historyAnchor, setHistoryAnchor] = useState(null)

  const debouncedMobile = useDebounce(form.mobileNumber, 500)

  // Reset on open; pre-fill shade + cavity from vehicle dispatch in same pass.
  useEffect(() => {
    if (!open) return
    const { shadeId, cavityId } = pickupDefaultsFromDispatchSnapshot(dispatchSnapshot)
    setForm({
      ...INITIAL_FORM,
      ...(cavityId ? { cavityId } : {}),
      ...(shadeId ? { shadeId } : {}),
    })
    setFarmerData({})
    setHistoryAnchor(null)
    setRecentOrders([])
    setSubTypes([])
    setSlots([])
    setErrors({})
    loadPlants()
    loadShadesAndCavities()
  }, [open, dispatchSnapshot])

  // Farmer auto-fetch
  useEffect(() => {
    if (debouncedMobile.length === 10) {
      fetchFarmer(debouncedMobile)
    } else if (debouncedMobile.length > 0 && debouncedMobile.length < 10) {
      resetFarmerData()
    }
  }, [debouncedMobile])

  // Load subtypes when plant changes
  useEffect(() => {
    if (form.plant) {
      loadSubTypes(form.plant)
      setForm((prev) => ({ ...prev, subtype: "", deliveryDate: null, selectedSlotId: null }))
      setSlots([])
    }
  }, [form.plant])

  // Load slots when subtype changes
  useEffect(() => {
    if (form.plant && form.subtype) {
      setForm((prev) => ({ ...prev, deliveryDate: null, selectedSlotId: null }))
      loadSlots(form.plant, form.subtype)
    }
  }, [form.plant, form.subtype])

  // ─── Data loading ────────────────────────────────────────────────────────────

  const loadPlants = async () => {
    setPlantsLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS)
      const response = await instance.request()
      if (response?.data) {
        setPlants(
          response.data.map((p) => ({ label: p.name, value: p.plantId, sowingAllowed: p.sowingAllowed || false }))
        )
      }
    } catch {
      Toast.error("Failed to load plants")
    } finally {
      setPlantsLoading(false)
    }
  }

  const loadShadesAndCavities = async () => {
    setShadesLoading(true)
    setCavitiesLoading(true)
    try {
      const shadeInst = NetworkManager(API.SHADE.GET_SHADES)
      const shadeRes = await shadeInst.request({}, {})
      const shadeRows = shadeRes?.data?.data?.data
      if (Array.isArray(shadeRows)) {
        setShades(shadeRows)
      } else {
        setShades([])
      }
    } catch {
      setShades([])
    } finally {
      setShadesLoading(false)
    }
    try {
      const trayInst = NetworkManager(API.TRAY.GET_TRAYS)
      const trayRes = await trayInst.request({}, {})
      const trayRows = trayRes?.data?.data?.data
      if (Array.isArray(trayRows)) {
        setCavities(trayRows)
      } else {
        setCavities([])
      }
    } catch {
      setCavities([])
    } finally {
      setCavitiesLoading(false)
    }
  }

  const loadSubTypes = async (plantId) => {
    setSubtypesLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
      const response = await instance.request(null, { plantId, year: new Date().getFullYear() })
      if (response?.data?.subtypes) {
        setSubTypes(
          response.data.subtypes.map((st) => ({
            label: st.subtypeName || st.name || st._id,
            value: st._id || st.subtypeId,
          }))
        )
      } else {
        setSubTypes([])
      }
    } catch {
      setSubTypes([])
    } finally {
      setSubtypesLoading(false)
    }
  }

  const loadSlots = async (plantId, subtypeId) => {
    setSlotsLoading(true)
    try {
      // Same as AddOrderForm: fetch 2026 + 2027 using GET_SIMPLE_SLOTS
      const years = [2026, 2027]
      const responses = await Promise.all(
        years.map((year) =>
          NetworkManager(API.slots.GET_SIMPLE_SLOTS).request({}, { plantId, subtypeId, year })
        )
      )

      let allSlotsData = []
      responses.forEach((response) => {
        const raw =
          response?.data?.data?.slots ||
          response?.data?.slots ||
          response?.data?.data ||
          []
        const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.slots) ? raw.slots : []
        allSlotsData = [...allSlotsData, ...arr]
      })

      const isSowingAllowed = plants.find((p) => p.value === plantId)?.sowingAllowed

      const processed = allSlotsData
        .map((slot) => {
          if (!slot?.startDay || !slot?.endDay) return null
          if (
            !moment(slot.startDay, "DD-MM-YYYY", true).isValid() ||
            !moment(slot.endDay, "DD-MM-YYYY", true).isValid()
          )
            return null

          const available =
            slot.availablePlants !== undefined
              ? slot.availablePlants
              : (slot.totalPlants || 0) - (slot.totalBookedPlants || 0)

          const start = moment(slot.startDay, "DD-MM-YYYY").format("D MMM")
          const end = moment(slot.endDay, "DD-MM-YYYY").format("D MMM")
          const slotLabel = `${start} to ${end}`

          return {
            label: slotLabel,
            value: slot._id,
            startDay: slot.startDay,
            endDay: slot.endDay,
            availableQuantity: available,
          }
        })
        .filter((s) => s !== null && (isSowingAllowed || s.availableQuantity > 0))

      setSlots(processed)
    } catch {
      setSlots([])
    } finally {
      setSlotsLoading(false)
    }
  }

  const fetchRecentFarmerOrders = async (farmerId) => {
    if (!farmerId) {
      setRecentOrders([])
      return
    }
    setRecentOrdersLoading(true)
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMER_ORDERS)
      const response = await instance.request({}, { pathParams: [farmerId] })
      const data = response?.data?.data
      const list = Array.isArray(data) ? data : []
      const sorted = [...list].sort((a, b) => orderSortTime(b) - orderSortTime(a))
      setRecentOrders(sorted.slice(0, RECENT_ORDER_LIMIT))
    } catch {
      setRecentOrders([])
    } finally {
      setRecentOrdersLoading(false)
    }
  }

  const fetchFarmer = async (mobile) => {
    setMobileLoading(true)
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMER_BY_MOBILE)
      const response = await instance.request(null, [mobile])
      const farmer = response?.data?.data
      if (farmer) {
        setFarmerData(farmer)
        const st = farmer.stateName || farmer.state || "Maharashtra"
        const dist = farmer.districtName || farmer.district || ""
        const tal = farmer.talukaName || farmer.taluka || ""
        setForm((prev) => ({
          ...prev,
          name: farmer.name || prev.name,
          village: farmer.village || prev.village,
          taluka: tal,
          district: dist,
          state: st,
          stateName: st,
          districtName: dist,
          talukaName: tal,
        }))
        if (farmer._id) {
          fetchRecentFarmerOrders(farmer._id)
        } else {
          setRecentOrders([])
        }
      } else {
        resetFarmerData()
      }
    } catch {
      resetFarmerData()
    } finally {
      setMobileLoading(false)
    }
  }

  const resetFarmerData = () => {
    setFarmerData({})
    setRecentOrders([])
    setForm((prev) => ({
      ...prev,
      name: "",
      village: "",
      taluka: "",
      district: "",
      state: "Maharashtra",
      stateName: "Maharashtra",
      districtName: "",
      talukaName: "",
    }))
  }

  // ─── Slot helpers ─────────────────────────────────────────────────────────────

  const getSlotIdForDate = useCallback(
    (date) => {
      if (!date || slots.length === 0) return null
      const m = moment(date)
      for (const slot of slots) {
        if (!slot.startDay || !slot.endDay) continue
        const start = moment(slot.startDay, "DD-MM-YYYY")
        const end = moment(slot.endDay, "DD-MM-YYYY")
        if (m.isSameOrAfter(start, "day") && m.isSameOrBefore(end, "day")) return slot.value
      }
      return null
    },
    [slots]
  )

  const isDateDisabled = useCallback(
    (date) => {
      if (autoSlotSelection) {
        if (slots.length === 0) return true
        return !getSlotIdForDate(date)
      }
      if (!form.selectedSlotId || slots.length === 0) return false
      const slot = slots.find((s) => s.value === form.selectedSlotId)
      if (!slot?.startDay || !slot?.endDay) return false
      const m = moment(date)
      const start = moment(slot.startDay, "DD-MM-YYYY")
      const end = moment(slot.endDay, "DD-MM-YYYY")
      return m.isBefore(start, "day") || m.isAfter(end, "day")
    },
    [autoSlotSelection, form.selectedSlotId, slots, getSlotIdForDate]
  )

  // Group slots by month — same as AddOrderForm
  const slotsByMonth = React.useMemo(() => {
    const byMonth = {}
    slots.forEach((slot) => {
      if (slot.startDay && moment(slot.startDay, "DD-MM-YYYY", true).isValid()) {
        const key = moment(slot.startDay, "DD-MM-YYYY").format("YYYY-MM")
        const label = moment(slot.startDay, "DD-MM-YYYY").format("MMMM YYYY")
        if (!byMonth[key]) byMonth[key] = { label, slots: [] }
        byMonth[key].slots.push(slot)
      }
    })
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  }, [slots])

  // ─── Validation & submit ──────────────────────────────────────────────────────

  const validate = () => {
    const e = {}
    if (!form.mobileNumber || form.mobileNumber.length !== 10) e.mobileNumber = "Enter a valid 10-digit number"
    if (!form.name?.trim()) e.name = "Farmer name is required"
    if (!form.plant) e.plant = "Select a plant"
    if (!form.subtype) e.subtype = "Select a subtype"
    if (!form.noOfPlants || parseInt(form.noOfPlants) <= 0) e.noOfPlants = "Enter quantity"
    if (!form.rate || parseFloat(form.rate) <= 0) e.rate = "Enter rate"
    if (!form.deliveryDate) e.deliveryDate = "Select delivery date"
    if (!form.cavityId) e.cavityId = "Select cavity (tray)"
    if (!form.shadeId) e.shadeId = "Select shade"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    const slotId = getSlotIdForDate(form.deliveryDate)
    if (!slotId) {
      Toast.error("No booking slot found for the selected delivery date.")
      return
    }

    setLoading(true)
    try {
      const fd = new FormData()
      const payload = {
        name: form.name.trim(),
        village: form.village || "",
        taluka: form.taluka || "",
        district: form.district || "",
        state: form.state || "Maharashtra",
        stateName: form.stateName || form.state || "Maharashtra",
        districtName: form.districtName || form.district || "",
        talukaName: form.talukaName || form.taluka || "",
        mobileNumber: form.mobileNumber,
        typeOfPlants: "Regular",
        numberOfPlants: parseInt(form.noOfPlants),
        rate: parseFloat(form.rate),
        plantName: form.plant,
        plantSubtype: form.subtype,
        bookingSlot: slotId,
        orderDate: form.deliveryDate instanceof Date ? form.deliveryDate.toISOString() : form.deliveryDate,
        deliveryDate: form.deliveryDate instanceof Date ? form.deliveryDate.toISOString() : form.deliveryDate,
        orderBookingDate: new Date().toISOString(),
        orderStatus: "DISPATCHED",
        paymentStatus: "not paid",
        orderPaymentStatus: "PENDING",
        // salesPerson is required by the backend validator
        salesPerson: user?._id || user?.id,
      }
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v)
      })
      if (form.cavityId) {
        fd.append("cavity", form.cavityId)
      }

      const createInstance = NetworkManager(API.FARMER.CREATE_FARMER)
      const createResponse = await createInstance.request(fd)

      // createFarmer → createOrder uses a session-based path that returns
      // { data: { order: {...}, payments: [], walletTransactions: [] } }
      const newOrderId =
        createResponse?.data?.data?.order?._id ||
        createResponse?.data?.data?.order?.id ||
        createResponse?.data?.data?._id ||
        createResponse?.data?._id ||
        createResponse?.data?.data?.id ||
        createResponse?.data?.id

      if (!newOrderId) {
        console.error("Could not extract order ID from response:", JSON.stringify(createResponse?.data))
        Toast.error("Order may have been created but could not be linked — order ID missing in response.")
        onSuccess?.()
        onClose()
        return
      }

      if (newOrderId && dispatchId) {
        try {
          const qty = parseInt(form.noOfPlants) || 0
          const linkInstance = NetworkManager(API.DISPATCHED.ADD_ORDER_TO_DISPATCH)
          await linkInstance.request(
            {
              orderId: newOrderId,
              dispatchQuantity: qty,
              cavityId: form.cavityId,
              shadeId: form.shadeId,
            },
            [dispatchId]
          )
        } catch (linkErr) {
          console.error("Failed to link order to dispatch:", linkErr)
          Toast.error("Order created but could not be linked to the dispatch.")
          onSuccess?.()
          onClose()
          return
        }
      }

      Toast.success("Quick order placed and added to dispatch!")
      onSuccess?.()
      onClose()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to place order"
      Toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field) => (e) => {
    const value = e?.target?.value ?? e
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const selectedSlot = slots.find((s) => s.value === form.selectedSlotId)

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 2.5, maxHeight: "92vh" } }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
            color: "white",
            py: 1.2,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FlashIcon sx={{ fontSize: "1.1rem" }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.98rem", lineHeight: 1.2 }}>
                Quick Order
              </Typography>
              {dispatchLabel && (
                <Typography sx={{ fontSize: "0.72rem", opacity: 0.85, lineHeight: 1.2 }}>
                  Adding to {dispatchLabel}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton size="small" onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2, bgcolor: "#f7faf8" }}>
          <Alert severity="info" sx={{ mb: 1.5, borderRadius: 1.5, py: 0.4, fontSize: "0.78rem" }}>
            Order will be created with status <strong>DISPATCHED</strong> and added to this vehicle.
          </Alert>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>

            {/* ── Phone number ── */}
            <TextField
              label="Mobile Number"
              value={form.mobileNumber}
              onChange={handleChange("mobileNumber")}
              fullWidth
              size="small"
              inputProps={{ maxLength: 10, inputMode: "numeric" }}
              error={!!errors.mobileNumber}
              helperText={errors.mobileNumber}
              InputProps={{
                endAdornment: mobileLoading ? (
                  <CircularProgress size={16} sx={{ mr: 0.5 }} />
                ) : farmerData?.name ? (
                  <CheckIcon sx={{ color: "success.main", fontSize: "1.1rem", mr: 0.5 }} />
                ) : null,
              }}
            />

            {/* ── Farmer name ── */}
            <TextField
              label="Farmer Name"
              value={form.name}
              onChange={handleChange("name")}
              fullWidth
              size="small"
              error={!!errors.name}
              helperText={errors.name}
              InputProps={{
                startAdornment: <PersonIcon sx={{ fontSize: "1rem", color: "text.secondary", mr: 0.75 }} />,
              }}
            />

            {farmerData?._id && (
              <Paper
                elevation={0}
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  border: "1px solid rgba(46, 125, 50, 0.22)",
                  background: "linear-gradient(135deg, rgba(232,245,233,0.95) 0%, rgba(255,255,255,0.98) 100%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "#1b5e20", display: "block", lineHeight: 1.3 }}>
                    Recent nursery orders
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", display: "block" }}>
                    Booking window, booked plants &amp; dispatched qty (last {RECENT_ORDER_LIMIT})
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => setHistoryAnchor(e.currentTarget)}
                  sx={{
                    bgcolor: "rgba(46, 125, 50, 0.12)",
                    border: "1px solid rgba(46, 125, 50, 0.28)",
                    "&:hover": { bgcolor: "rgba(46, 125, 50, 0.2)" },
                  }}
                  aria-label="View last orders"
                >
                  <Badge
                    color="primary"
                    overlap="circular"
                    badgeContent={recentOrders.length}
                    invisible={recentOrdersLoading || recentOrders.length === 0}
                    sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", minWidth: 18, height: 18 } }}
                  >
                    <HistoryIcon sx={{ fontSize: "1.15rem", color: "#2e7d32" }} />
                  </Badge>
                </IconButton>
                {recentOrdersLoading && <CircularProgress size={18} sx={{ color: "#2e7d32" }} />}
                <Popover
                  open={Boolean(historyAnchor)}
                  anchorEl={historyAnchor}
                  onClose={() => setHistoryAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                  transformOrigin={{ vertical: "top", horizontal: "left" }}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 0.75,
                        width: { xs: "min(calc(100vw - 32px), 360px)", sm: 360 },
                        maxWidth: "calc(100vw - 24px)",
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid rgba(0,0,0,0.08)",
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 1.5, py: 1, bgcolor: "#1b5e20", color: "#fff" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.82rem" }}>Last {RECENT_ORDER_LIMIT} orders</Typography>
                    <Typography sx={{ fontSize: "0.68rem", opacity: 0.9 }}>{farmerData?.name || "Farmer"}</Typography>
                  </Box>
                  <Box sx={{ maxHeight: 320, overflow: "auto" }}>
                    {recentOrdersLoading ? (
                      <Box sx={{ p: 2, display: "flex", justifyContent: "center" }}>
                        <CircularProgress size={22} />
                      </Box>
                    ) : recentOrders.length === 0 ? (
                      <Typography variant="body2" sx={{ p: 2, color: "text.secondary" }}>
                        No previous nursery orders for this mobile.
                      </Typography>
                    ) : (
                      recentOrders.map((o, idx) => {
                        const oid = String(o.orderId || o._id || "")
                        const shortId = oid.length > 6 ? oid.slice(-6) : oid || "—"
                        const booked = o.numberOfPlants ?? 0
                        const dispatched = totalDispatchedPlants(o)
                        const status = o.orderStatus || "—"
                        return (
                          <Box key={o._id || idx}>
                            {idx > 0 && <Divider />}
                            <Box sx={{ p: 1.5 }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1, mb: 0.5 }}>
                                <Typography sx={{ fontWeight: 800, fontSize: "0.78rem", fontFamily: "monospace", color: "#0d47a1" }}>
                                  #{shortId}
                                </Typography>
                                <Chip
                                  size="small"
                                  label={status}
                                  sx={{
                                    height: 22,
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                    bgcolor:
                                      status === "DISPATCHED"
                                        ? "rgba(46,125,50,0.15)"
                                        : status === "CANCELLED"
                                          ? "rgba(183,28,28,0.12)"
                                          : "rgba(21,101,192,0.12)",
                                  }}
                                />
                              </Box>
                              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mb: 0.75 }}>
                                {formatPlantSubtypeLine(o)}
                              </Typography>
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.35 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", minWidth: 72 }}>Booking</Typography>
                                  <Typography sx={{ fontSize: "0.72rem", fontWeight: 600 }}>{formatBookingWindow(o)}</Typography>
                                </Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <InventoryIcon sx={{ fontSize: 14, color: "#2e7d32" }} />
                                  <Typography sx={{ fontSize: "0.72rem" }}>
                                    <strong>{booked}</strong> booked
                                    {dispatched != null && (
                                      <>
                                        {" · "}
                                        <strong>{dispatched}</strong> dispatched
                                        {booked > 0 && (
                                          <span style={{ color: "#666" }}>
                                            {" "}
                                            ({Math.min(100, Math.round((dispatched / booked) * 100))}%)
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </Typography>
                                </Box>
                                {o.remainingPlants != null && o.remainingPlants !== "" && (
                                  <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                                    Remaining (nursery): {o.remainingPlants}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>
                        )
                      })
                    )}
                  </Box>
                </Popover>
              </Paper>
            )}

            {/* ── Location ── same pattern as AddOrderForm ── */}
            <Box>
              {farmerData?.name ? (
                // Farmer found → read-only fields (same as AddOrderForm)
                <Grid container spacing={1}>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" label="State" value={form.state || ""} disabled variant="outlined" />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" label="District" value={form.district || ""} disabled variant="outlined" />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" label="Taluka" value={form.taluka || ""} disabled variant="outlined" />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField fullWidth size="small" label="Village" value={form.village || ""} disabled variant="outlined" />
                  </Grid>
                </Grid>
              ) : (
                // No farmer → cascading dropdowns (same as AddOrderForm)
                <LocationSelector
                  selectedState={form.state}
                  selectedDistrict={form.district}
                  selectedTaluka={form.taluka}
                  selectedVillage={form.village}
                  onStateChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      state: value, stateName: value,
                      district: "", districtName: "",
                      taluka: "", talukaName: "",
                      village: "",
                    }))
                  }
                  onDistrictChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      district: value, districtName: value,
                      taluka: "", talukaName: "",
                      village: "",
                    }))
                  }
                  onTalukaChange={(value) =>
                    setForm((prev) => ({ ...prev, taluka: value, talukaName: value, village: "" }))
                  }
                  onVillageChange={(value) =>
                    setForm((prev) => ({ ...prev, village: value }))
                  }
                  compact={true}
                  showLabels={false}
                  autoFill={true}
                  required={true}
                />
              )}
              {farmerData?.name ? (
                <Alert severity="success" sx={{ mt: 0.75, py: 0.3, "& .MuiAlert-message": { fontSize: "0.73rem" } }}>
                  Location auto-filled. Clear mobile to modify.
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mt: 0.75, py: 0.3, "& .MuiAlert-message": { fontSize: "0.73rem" } }}>
                  Maharashtra pre-selected. Select district, taluka &amp; village.
                </Alert>
              )}
            </Box>

            {/* ── Plant ── */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.35, display: "block" }}>
                Plant {plantsLoading && <CircularProgress size={10} sx={{ ml: 0.5 }} />}
              </Typography>
              <SearchableSelect
                label="Plant"
                items={plants}
                value={form.plant}
                onChange={(e) => {
                  const val = e?.target?.value ?? e
                  setForm((prev) => ({ ...prev, plant: val, subtype: "" }))
                  if (errors.plant) setErrors((prev) => ({ ...prev, plant: undefined }))
                }}
                disabled={plantsLoading}
                placeholder="Search plant..."
              />
              {errors.plant && (
                <Typography variant="caption" color="error" sx={{ mt: 0.25, display: "block" }}>{errors.plant}</Typography>
              )}
            </Box>

            {/* ── Subtype ── */}
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.35, display: "block" }}>
                Subtype {subtypesLoading && <CircularProgress size={10} sx={{ ml: 0.5 }} />}
              </Typography>
              <SearchableSelect
                label="Subtype"
                items={subTypes}
                value={form.subtype}
                onChange={(e) => {
                  const val = e?.target?.value ?? e
                  setForm((prev) => ({ ...prev, subtype: val }))
                  if (errors.subtype) setErrors((prev) => ({ ...prev, subtype: undefined }))
                }}
                disabled={!form.plant || subtypesLoading}
                placeholder={form.plant ? "Search subtype..." : "Select plant first"}
              />
              {errors.subtype && (
                <Typography variant="caption" color="error" sx={{ mt: 0.25, display: "block" }}>{errors.subtype}</Typography>
              )}
            </Box>

            {/* ── Slot selection (same card style as AddOrderForm) ── */}
            {form.subtype && !autoSlotSelection && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, color: "#1e293b", fontSize: "0.88rem" }}>
                  Select Slot
                </Typography>

                {slotsLoading ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5 }}>
                    <CircularProgress size={18} sx={{ color: "#3b82f6" }} />
                    <Typography variant="body2" color="text.secondary">Loading slots...</Typography>
                  </Box>
                ) : slotsByMonth.length > 0 ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                    {slotsByMonth.map(({ label: monthLabel, slots: monthSlots }) => (
                      <Box key={monthLabel}>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            mb: 0.75,
                            fontWeight: 700,
                            color: "#64748b",
                            fontSize: "0.72rem",
                            textTransform: "uppercase",
                            letterSpacing: 0.5,
                          }}
                        >
                          {monthLabel}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
                          {monthSlots.map((slot) => {
                            const isSelected = form.selectedSlotId === slot.value
                            return (
                              <Box
                                key={slot.value}
                                onClick={() => {
                                  const deliveryDate = moment(slot.startDay, "DD-MM-YYYY").toDate()
                                  setForm((prev) => ({
                                    ...prev,
                                    selectedSlotId: slot.value,
                                    deliveryDate,
                                  }))
                                  if (errors.deliveryDate)
                                    setErrors((prev) => ({ ...prev, deliveryDate: undefined }))
                                }}
                                sx={{
                                  cursor: "pointer",
                                  p: 1.1,
                                  borderRadius: 1.5,
                                  border: isSelected ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                                  backgroundColor: isSelected ? "#eff6ff" : "#fff",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  transition: "all 0.15s",
                                  "&:active": { transform: "scale(0.98)" },
                                }}
                              >
                                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "#334155" }}>
                                  {slot.label}
                                </Typography>
                                <Typography sx={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 500 }}>
                                  {slot.availableQuantity ?? 0} available
                                </Typography>
                              </Box>
                            )
                          })}
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
                    No slots available for this plant/subtype.
                  </Typography>
                )}
              </Box>
            )}

            {/* ── Delivery Date (restricted to selected slot) ── */}
            {form.subtype && (
              <Box>
                <DatePicker
                  label="Delivery Date *"
                  format={DATE_PICKER_FORMAT}
                  value={form.deliveryDate}
                  onChange={(date) => {
                    setForm((prev) => ({ ...prev, deliveryDate: date }))
                    if (errors.deliveryDate) setErrors((prev) => ({ ...prev, deliveryDate: undefined }))
                  }}
                  disabled={!form.subtype}
                  shouldDisableDate={isDateDisabled}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      error: !!errors.deliveryDate,
                      helperText: errors.deliveryDate ||
                        (!form.subtype
                          ? "Select plant and subtype first"
                          : autoSlotSelection
                          ? slotsLoading
                            ? "Loading available dates..."
                            : slots.length === 0
                            ? "No booking slots for this plant/subtype"
                            : "Pick any date within an available slot"
                          : selectedSlot
                          ? `Only dates within ${selectedSlot.label} are enabled`
                          : "Select a slot above to pick delivery date"),
                    },
                  }}
                />
              </Box>
            )}

            {/* ── Quantity + Rate ── */}
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
              <TextField
                label="Quantity (plants)"
                value={form.noOfPlants}
                onChange={handleChange("noOfPlants")}
                fullWidth
                size="small"
                type="number"
                inputProps={{ min: 1 }}
                error={!!errors.noOfPlants}
                helperText={errors.noOfPlants}
              />
              <TextField
                label="Rate (₹)"
                value={form.rate}
                onChange={handleChange("rate")}
                fullWidth
                size="small"
                type="number"
                inputProps={{ min: 0, step: 0.5 }}
                error={!!errors.rate}
                helperText={errors.rate}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", mb: 0.35, display: "block" }}>
                Pickup — cavity &amp; shade (same as dispatch form; updates crates on this vehicle)
                {(shadesLoading || cavitiesLoading) && <CircularProgress size={10} sx={{ ml: 0.5 }} />}
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Cavity (tray)"
                    value={form.cavityId}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((prev) => ({ ...prev, cavityId: v }))
                      if (errors.cavityId) setErrors((prev) => ({ ...prev, cavityId: undefined }))
                    }}
                    error={!!errors.cavityId}
                    helperText={errors.cavityId || " "}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Select cavity</option>
                    {cavities.map((c) => (
                      <option key={String(c._id)} value={String(c._id)}>
                        {c.name}
                      </option>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Shade"
                    value={form.shadeId}
                    onChange={(e) => {
                      const v = e.target.value
                      setForm((prev) => ({ ...prev, shadeId: v }))
                      if (errors.shadeId) setErrors((prev) => ({ ...prev, shadeId: undefined }))
                    }}
                    error={!!errors.shadeId}
                    helperText={errors.shadeId || " "}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Select shade</option>
                    {shades.map((s) => (
                      <option key={String(s._id)} value={String(s._id)}>
                        {s.name}
                      </option>
                    ))}
                  </TextField>
                </Grid>
              </Grid>
            </Box>

            {form.noOfPlants && form.rate && parseFloat(form.rate) > 0 && (
              <Chip
                size="small"
                label={`Estimated total: ₹${(parseInt(form.noOfPlants) * parseFloat(form.rate)).toLocaleString()}`}
                sx={{ alignSelf: "flex-start", fontWeight: 700, bgcolor: "rgba(13,71,161,0.1)", color: "#0d47a1" }}
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, py: 1.5, bgcolor: "#f7faf8", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
          <Button onClick={onClose} size="small" sx={{ textTransform: "none" }} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            size="small"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <FlashIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
              "&:hover": { background: "linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)" },
            }}
          >
            {loading ? "Placing..." : "Place & Dispatch"}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  )
}

export default QuickOrderDialog
