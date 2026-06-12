import React, { useState, useEffect } from "react"
import {
  Calendar,
  Activity,
  AlertTriangle,
  Plus,
  Minus,
  X,
  UserCheck,
  Shield,
  Sprout,
  Send,
  Package,
} from "lucide-react"
import {
  TextField as Input,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
  IconButton,
  Tab,
  Tabs,
  Box,
  Modal,
  Backdrop,
  Fade,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Divider
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import { Toast } from "helpers/toasts/toastHelper"
import SlotTrailModal from "components/Modals/SlotTrailModal"
import StockChangeHistoryModal from "./StockChangeHistoryModal"
import TransferPlantsModal from "./TransferPlantsModal"
import SlotOrdersDrawer from "./SlotOrdersDrawer"
import PastDueRollModal from "./PastDueRollModal"
import RollExpiredAvailableModal from "./RollExpiredAvailableModal"
import SlotActualBreakdownModal from "./SlotActualBreakdownModal"
import SlotCard from "./SlotCard"
import SlotDetailModal from "./SlotDetailModal"
import { MONTH_ORDER, getDefaultMonthTabIndex } from "./slotMonthUtils"
import { canRunPastDueRollover } from "./pastDueRolloverUi"
import { getBufferStatusMeta } from "./bufferUi"
import moment from "moment"
import { useSelector } from "react-redux"
import {
  getAvailablePlants,
  parseSlotNumber,
  getBookedPlants,
  getTotalCapacity,
  getReleasableBuffer,
} from "./slotMetrics"

const Subtypes = ({ plantId, plantSubId, year = 2025 }) => {
  const userData = useSelector((state) => state?.userData?.userData)
  const appUser = useSelector((state) => state?.app?.user)
  const [selectedMonth, setSelectedMonth] = useState(0)
  const [slotsByMonth, setSlotsByMonth] = useState({})
  const [editValue, setEditValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [pastDueExpandKey, setPastDueExpandKey] = useState(null)

  // States for salesmen restrictions
  const [salesmenModalOpen, setSalesmenModalOpen] = useState(false)
  const [salespeople, setSalespeople] = useState([])
  const [selectedSalespeople, setSelectedSalespeople] = useState([])
  const [currentSlotForRestriction, setCurrentSlotForRestriction] = useState(null)
  const [loadingSalespeople, setLoadingSalespeople] = useState(false)

  // States for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [slotToDelete, setSlotToDelete] = useState(null)

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSlotData, setEditingSlotData] = useState(null)
  const [editAmount, setEditAmount] = useState("")
  const [operationType, setOperationType] = useState("add")

  // Buffer modal states
  const [showBufferModal, setShowBufferModal] = useState(false)
  const [bufferSlotData, setBufferSlotData] = useState(null)
  const [bufferValue, setBufferValue] = useState("0")
  const [showReleaseBufferModal, setShowReleaseBufferModal] = useState(false)
  const [releaseBufferSlotData, setReleaseBufferSlotData] = useState(null)
  const [releaseAmount, setReleaseAmount] = useState("0")

  // Slot trail modal states
  const [showSlotTrailModal, setShowSlotTrailModal] = useState(false)
  const [selectedSlotForTrail, setSelectedSlotForTrail] = useState(null)

  // Sowing modal states
  const [showSowingModal, setShowSowingModal] = useState(false)
  const [sowingSlotData, setSowingSlotData] = useState(null)
  const [sowingQuantity, setSowingQuantity] = useState("")
  const [sowingDate, setSowingDate] = useState(moment().format("YYYY-MM-DD"))
  const [sowingNotes, setSowingNotes] = useState("")

  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferSlotData, setTransferSlotData] = useState(null)

  const [stockHistorySlot, setStockHistorySlot] = useState(null)

  const [slotOrdersDrawer, setSlotOrdersDrawer] = useState(null)
  const [pastDueRollModal, setPastDueRollModal] = useState(null)
  const [rollExpiredModal, setRollExpiredModal] = useState(null)
  const [actualBreakdownSlot, setActualBreakdownSlot] = useState(null)

  const canRollPastDue = canRunPastDueRollover(userData, appUser)

  const openPendingRollModal = (slot) => {
    if (!slot?.pastDueDetail) return
    const startLbl = moment(slot.startDay, "DD-MM-YYYY").format("MMM D")
    const endLbl = moment(slot.endDay, "DD-MM-YYYY").format("MMM D")
    const yrLbl = moment(slot.startDay, "DD-MM-YYYY").format("YYYY")
    setPastDueRollModal({
      slot,
      slotLabel: `${startLbl} – ${endLbl}, ${yrLbl}`,
    })
  }

  const monthOrder = MONTH_ORDER

  useEffect(() => {
    fetchPlantsSlots()
  }, [plantId, plantSubId, year])

  const fetchPlantsSlots = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SLOTS)
      const response = await instance.request({}, { plantId, subtypeId: plantSubId, year })

      const slots = response?.data?.slots[0]?.slots || []
      const groupedSlots = groupSlotsByMonth(slots)
      setSlotsByMonth(groupedSlots)
      const months = monthOrder.filter((month) => groupedSlots[month])
      setSelectedMonth(getDefaultMonthTabIndex(months, groupedSlots))
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }

  const updateSlots = async (e, id, status, plantValue) => {
    if (e) {
      e.stopPropagation()
    }
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.UPDATE_SLOT)
      let payload = {}

      if (status !== undefined) {
        payload.status = !status
      } else if (plantValue) {
        payload.totalPlants = plantValue
      } else if (editValue) {
        payload.totalPlants = editValue
      }

      if (Object.keys(payload).length === 0) {
        console.error("Empty payload detected. Aborting API call.")
        Toast.error("Failed to update: No changes detected")
        setLoading(false)
        return
      }

      const response = await instance.request(payload, [id])
      if (response?.code === 200) {
        Toast.success(response?.data?.message || "Updated successfully")
        setEditValue("")
        setEditingSlotData(null)
        fetchPlantsSlots()
      } else {
        Toast.error(response?.data?.message || "Failed to update")
      }
    } catch (error) {
      console.error("Error updating slots:", error)
      Toast.error("Failed to update. Please try again.")
    }
    setLoading(false)
  }

  const handleDeleteSlot = async () => {
    if (!slotToDelete) return

    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.DELETE_MANUAL_SLOT)
      const response = await instance.request({}, [slotToDelete])

      if (response?.data?.success) {
        Toast.success(response?.data?.message || "Slot deleted successfully")
        setDeleteDialogOpen(false)
        setSlotToDelete(null)
        fetchPlantsSlots()
      } else {
        Toast.error(response?.data?.message || "Failed to delete slot")
      }
    } catch (error) {
      console.error("Error deleting slot:", error)
      Toast.error(error.message || "An error occurred while deleting the slot")
    }
    setLoading(false)
  }

  const openDeleteConfirmation = (e, slotId) => {
    e.stopPropagation()
    setSlotToDelete(slotId)
    setDeleteDialogOpen(true)
  }

  const groupSlotsByMonth = (slots) => {
    return slots.reduce((acc, slot) => {
      const monthName = slot.month
      if (!monthName) {
        console.warn("Slot does not have a 'month' key:", slot)
        return acc
      }
      acc[monthName] = acc[monthName] || []
      acc[monthName].push(slot)
      return acc
    }, {})
  }

  const startEditing = (e, slot) => {
    e.stopPropagation()
    const available = getAvailablePlants(slot)
    setEditingSlotData({
      currentAvailable: available,
      slotId: slot._id
    })
    setEditAmount("")
    setOperationType("add")
    setShowEditModal(true)
  }

  const handleEditChange = (e) => {
    const value = e.target.value
    // Allow only numbers and empty string, prevent blinking
    if (value === "" || /^\d*$/.test(value)) {
      setEditAmount(value)
    }
  }

  const cancelEdit = (e) => {
    if (e) e.stopPropagation()
    setShowEditModal(false)
    setEditingSlotData(null)
    setEditAmount("")
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSaveEdit()
    } else if (e.key === "Escape") {
      cancelEdit(e)
    }
  }

  const updateSlotBuffer = async (slotId, buffer) => {
    try {
      const instance = NetworkManager(API.slots.UPDATE_SLOT_BUFFER)
      const response = await instance.request({ buffer: parseFloat(buffer) }, [slotId])

      if (response?.data?.success) {
        Toast.success("Buffer updated successfully")
        fetchPlantsSlots()
      } else {
        Toast.error(response?.data?.message || "Failed to update buffer")
      }
    } catch (error) {
      console.error("Error updating buffer:", error)
      Toast.error("Failed to update buffer. Please try again.")
    }
  }

  const handleSaveEdit = async () => {
    if (!editingSlotData) return

    const currentVal = parseSlotNumber(editingSlotData.currentAvailable, 0)
    const amountToChange = parseInt(editAmount, 10) || 0

    if (amountToChange <= 0) {
      Toast.error("Enter a valid amount")
      return
    }

    const newAvailable =
      operationType === "add" ? currentVal + amountToChange : currentVal - amountToChange

    const payload = { availablePlants: newAvailable }

    try {
      const instance = NetworkManager(API.slots.UPDATE_SLOT)
      const response = await instance.request(payload, [editingSlotData.slotId])

      if (response?.code === 200 || response?.data?.success) {
        Toast.success(
          `Available: ${currentVal.toLocaleString()} → ${newAvailable.toLocaleString()}`
        )
      } else {
        Toast.error(response?.data?.message || "Failed to update available plants")
        return
      }

      fetchPlantsSlots()
      setShowEditModal(false)
      setEditingSlotData(null)
      setEditAmount("")
    } catch (error) {
      console.error("Error updating slot:", error)
      Toast.error("Failed to update slot. Please try again.")
    }
  }

  function calculateSummary(slots) {
    let totalPlants = 0
    let totalBookedPlants = 0
    let totalAvailablePlants = 0
    let totalPrimarySowed = 0
    let totalDispatchedPlants = 0
    let totalRemainingToDispatch = 0

    slots.forEach((slot) => {
      totalPlants += getTotalCapacity(slot)
      totalBookedPlants += getBookedPlants(slot)
      totalAvailablePlants += getAvailablePlants(slot)
      totalPrimarySowed += slot.primarySowed ?? 0
      totalDispatchedPlants += slot.totalDispatchedPlants ?? 0
      totalRemainingToDispatch += slot.remainingToDispatch ?? 0
    })

    return {
      totalPlants,
      totalBookedPlants,
      totalAvailablePlants,
      totalPrimarySowed,
      totalDispatchedPlants,
      totalRemainingToDispatch
    }
  }

  const calculatePercentage = (booked, total) => {
    if (total === 0) return booked > 0 ? 100 : 0
    return Math.round((booked / total) * 100)
  }

  const getStatusColor = (percentage, availablePlants) => {
    const isOverbooked = availablePlants < 0 || percentage > 100

    if (isOverbooked) return { color: "red", bg: "bg-red-500", text: "text-red-700" }
    if (percentage >= 90) return { color: "orange", bg: "bg-orange-500", text: "text-orange-700" }
    if (percentage >= 70) return { color: "yellow", bg: "bg-yellow-500", text: "text-yellow-700" }
    if (percentage >= 50) return { color: "blue", bg: "bg-blue-500", text: "text-blue-700" }
    if (percentage >= 30) return { color: "indigo", bg: "bg-indigo-500", text: "text-indigo-700" }
    return { color: "green", bg: "bg-green-500", text: "text-green-700" }
  }

  const openSlotDetails = (slot, monthName) => {
    setPastDueExpandKey(null)
    setSelectedSlot({ ...slot, monthName })
    setDetailModalOpen(true)
  }

  const openPastDueOnSlot = (e, slot, monthName, statKey, pendingSlotId = null) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    const drawerStatKey =
      statKey === "rolled-current" || statKey === "rolled-other"
        ? "pastDueRolled"
        : statKey?.startsWith("pending")
          ? "pastDuePending"
          : statKey
    setSlotOrdersDrawer({
      slot,
      monthName,
      statKey: drawerStatKey,
      pendingSlotId: pendingSlotId || (statKey?.startsWith("pending-") ? statKey.replace(/^pending-/, "") : null)
    })
  }

  const openSlotOrders = (e, slot, monthName, statKey) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setDetailModalOpen(false)
    setSlotOrdersDrawer({ slot, monthName, statKey })
  }

  const closeSlotOrdersDrawer = () => setSlotOrdersDrawer(null)

  const openStockHistory = (e, slot) => {
    if (e) e.stopPropagation()
    setStockHistorySlot(slot)
  }

  const openBufferModal = (e, slot, currentBuffer = 0) => {
    e.stopPropagation()
    setBufferSlotData(slot)
    setBufferValue(currentBuffer.toString())
    setShowBufferModal(true)
  }

  const closeBufferModal = () => {
    setShowBufferModal(false)
    setBufferSlotData(null)
    setBufferValue("0")
  }

  const openReleaseBufferModal = (e, slot) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setDetailModalOpen(false)
    const releasable = getReleasableBuffer(slot)
    setReleaseBufferSlotData(slot)
    setReleaseAmount(releasable > 0 ? String(releasable) : "")
    setShowReleaseBufferModal(true)
  }

  const closeReleaseBufferModal = () => {
    setShowReleaseBufferModal(false)
    setReleaseBufferSlotData(null)
    setReleaseAmount("0")
  }

  // Sowing modal functions
  const openSowingModal = (e, slot) => {
    if (e) e.stopPropagation()
    setSowingSlotData(slot)
    setSowingQuantity("")
    setSowingDate(moment().format("YYYY-MM-DD"))
    setSowingNotes("")
    setShowSowingModal(true)
  }

  const closeSowingModal = () => {
    setShowSowingModal(false)
    setSowingSlotData(null)
    setSowingQuantity("")
    setSowingNotes("")
  }

  const handleSowingSubmit = async () => {
    if (!sowingSlotData) return

    const quantity = parseInt(sowingQuantity) || 0

    if (quantity <= 0) {
      Toast.error("Please enter a valid quantity")
      return
    }

    if (!sowingDate) {
      Toast.error("Please select a sowing date")
      return
    }

    try {
      setLoading(true)
      const instance = NetworkManager(API.sowing.CREATE_SOWING)
      
      // Get current user ID
      const user = userData || appUser
      const userId = user?._id
      
      const payload = {
        plantId: plantId,
        subtypeId: plantSubId,
        sowingDate: moment(sowingDate).format("DD-MM-YYYY"),
        totalQuantityRequired: quantity,
        slotId: sowingSlotData._id,
        notes: sowingNotes
      }

      // Only add createdBy if we have a valid user ID
      if (userId) {
        payload.createdBy = userId
      }

      const response = await instance.request(payload)

      if (response?.data?.message) {
        Toast.success("Sowing record created successfully")
        closeSowingModal()
        fetchPlantsSlots() // Refresh the data
      }
    } catch (error) {
      console.error("Error creating sowing record:", error)
      Toast.error(error?.response?.data?.message || "Failed to create sowing record")
    } finally {
      setLoading(false)
    }
  }

  const handleReleaseBuffer = async () => {
    if (!releaseBufferSlotData) return

    const amount = Math.floor(Number(releaseAmount)) || 0
    const maxReleasable = getReleasableBuffer(releaseBufferSlotData)

    if (amount <= 0) {
      Toast.error("Please enter a valid amount to release")
      return
    }

    if (maxReleasable <= 0) {
      Toast.error(
        "No releasable buffer in database. Save buffer % on this slot (shield icon) or run buffer migration."
      )
      return
    }

    if (amount > maxReleasable) {
      Toast.error(`Cannot release more than ${maxReleasable.toLocaleString()} plants in buffer`)
      return
    }

    try {
      const instance = NetworkManager(API.slots.RELEASE_BUFFER_PLANTS)
      const response = await instance.request({ plantsToRelease: amount }, [
        releaseBufferSlotData._id,
        "release-buffer"
      ])

      if (response?.data?.success) {
        Toast.success(`Released ${amount} plants from buffer`)
        fetchPlantsSlots() // Refresh the data
        closeReleaseBufferModal()
      } else {
        Toast.error(response?.data?.message || "Failed to release buffer plants")
      }
    } catch (error) {
      console.error("Error releasing buffer plants:", error)
      Toast.error("Failed to release buffer plants. Please try again.")
    }
  }

  const handleBufferSave = async () => {
    if (!bufferSlotData) return

    const buffer = parseFloat(bufferValue) || 0

    // Validate buffer
    if (buffer < 0 || buffer > 100) {
      Toast.error("Buffer must be between 0 and 100")
      return
    }

    try {
      const instance = NetworkManager(API.slots.UPDATE_SLOT_BUFFER)
      const response = await instance.request({ buffer }, [bufferSlotData._id])

      if (response?.data?.success) {
        Toast.success("Buffer updated successfully")
        fetchPlantsSlots() // Refresh the data
        closeBufferModal()
      } else {
        Toast.error(response?.data?.message || "Failed to update buffer")
      }
    } catch (error) {
      console.error("Error updating buffer:", error)
      Toast.error("Failed to update buffer. Please try again.")
    }
  }

  const availableMonths = monthOrder.filter((month) => slotsByMonth[month])

  if (loading) return <PageLoader />

  // Compact Edit Available Plants dialog
  const EditModal = () => (
    <Dialog
      open={showEditModal}
      onClose={cancelEdit}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: "12px" } }}>
      <DialogTitle sx={{ pb: 1, fontWeight: 700, fontSize: "1.1rem" }}>
        Edit Available Plants
      </DialogTitle>
      <DialogContent>
        <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-center">
          <p className="text-xs text-slate-500">Current available</p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {parseSlotNumber(editingSlotData?.currentAvailable, 0).toLocaleString()}
          </p>
        </div>

        <div className="mb-3 flex gap-2">
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              operationType === "add"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
            onClick={() => setOperationType("add")}>
            <Plus className="mr-1 inline h-3.5 w-3.5" />
            Add
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              operationType === "subtract"
                ? "bg-red-600 text-white"
                : "bg-slate-100 text-slate-700"
            }`}
            onClick={() => setOperationType("subtract")}>
            <Minus className="mr-1 inline h-3.5 w-3.5" />
            Remove
          </button>
        </div>

        <Input
          value={editAmount}
          onChange={handleEditChange}
          onKeyDown={handleKeyPress}
          fullWidth
          size="small"
          autoFocus
          placeholder={operationType === "add" ? "Plants to add" : "Plants to remove"}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
        />

        {operationType === "add" && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[100, 500, 1000].map((n) => (
              <button
                key={n}
                type="button"
                className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                onClick={() => setEditAmount(String(n))}>
                +{n.toLocaleString()}
              </button>
            ))}
          </div>
        )}

        {editAmount && (
          <p className="mt-2 text-sm font-medium text-slate-700">
            New available:{" "}
            {(operationType === "add"
              ? parseSlotNumber(editingSlotData?.currentAvailable, 0) +
                (parseInt(editAmount, 10) || 0)
              : parseSlotNumber(editingSlotData?.currentAvailable, 0) -
                (parseInt(editAmount, 10) || 0)
            ).toLocaleString()}
          </p>
        )}

        <p className="mt-2 text-xs text-slate-500">
          Saves absolute available (PUT). Example: −8,000 + 8,000 → 0. Cap = available + booked.
        </p>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={cancelEdit} color="inherit">
          Cancel
        </Button>
        <Button onClick={handleSaveEdit} variant="contained" disableElevation>
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  )

  // Function to fetch salespeople
  const fetchSalespeople = async () => {
    setLoadingSalespeople(true)
    try {
      const instance = NetworkManager(API.slots.GET_SALESPEOPLE)
      const response = await instance.request()
      if (response?.data?.success) {
        setSalespeople(response.data.data)
      } else {
        // Handle case where response doesn't have success field (direct array)
        setSalespeople(response?.data || [])
      }
    } catch (error) {
      console.error("Error fetching salespeople:", error)
      Toast.error("Failed to fetch salespeople")
    }
    setLoadingSalespeople(false)
  }

  // Function to open salesmen restriction modal
  const openSalesmenModal = (slot) => {
    setCurrentSlotForRestriction(slot)
    setSelectedSalespeople(slot.allowedSalesmen || [])
    setSalesmenModalOpen(true)
    if (salespeople.length === 0) {
      fetchSalespeople()
    }
  }

  // Function to update slot salesmen restrictions
  const updateSalesmenRestrictions = async () => {
    if (!currentSlotForRestriction) return

    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.UPDATE_SALESMEN_RESTRICTIONS)
      const response = await instance.request(
        {
          restrictToSalesmen: selectedSalespeople.length > 0,
          allowedSalesmen: selectedSalespeople
        },
        [currentSlotForRestriction._id]
      )

      if (response?.data?.success) {
        Toast.success("Salesmen restrictions updated successfully")
        setSalesmenModalOpen(false)
        fetchPlantsSlots() // Refresh the slots
      }
    } catch (error) {
      console.error("Error updating salesmen restrictions:", error)
      Toast.error("Failed to update salesmen restrictions")
    }
    setLoading(false)
  }

  // Function to toggle salesperson selection
  const toggleSalesperson = (salespersonId) => {
    setSelectedSalespeople((prev) => {
      if (prev.includes(salespersonId)) {
        return prev.filter((id) => id !== salespersonId)
      } else {
        return [...prev, salespersonId]
      }
    })
  }

  // Salesmen Restriction Modal Component
  const SalesmenRestrictionModal = () => (
    <Modal
      open={salesmenModalOpen}
      onClose={() => setSalesmenModalOpen(false)}
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{ timeout: 500 }}>
      <Fade in={salesmenModalOpen}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: "500px",
            bgcolor: "background.paper",
            borderRadius: "12px",
            boxShadow: 24,
            p: 0,
            maxHeight: "80vh",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
          {/* Header */}
          <div className="p-6 border-b bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Restrict Slot Access</h3>
                  <p className="text-sm text-gray-600">
                    Select salespeople who can access this slot
                  </p>
                </div>
              </div>
              <IconButton onClick={() => setSalesmenModalOpen(false)}>
                <X className="w-5 h-5" />
              </IconButton>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {loadingSalespeople ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Typography variant="subtitle1" className="font-medium">
                    Available Salespeople
                  </Typography>
                  <Chip
                    label={`${selectedSalespeople.length} selected`}
                    color="primary"
                    size="small"
                  />
                </div>

                <Divider />

                {salespeople.length === 0 ? (
                  <div className="text-center py-8">
                    <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <Typography variant="body2" color="textSecondary">
                      No salespeople found
                    </Typography>
                  </div>
                ) : (
                  <List className="space-y-2">
                    {salespeople.map((salesperson) => (
                      <ListItem
                        key={salesperson._id}
                        className="border rounded-lg hover:bg-gray-50 transition-colors"
                        dense>
                        <ListItemIcon>
                          <Checkbox
                            checked={selectedSalespeople.includes(salesperson._id)}
                            onChange={() => toggleSalesperson(salesperson._id)}
                            color="primary"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{salesperson.name}</span>
                              <Chip
                                label={salesperson.jobTitle}
                                size="small"
                                color="secondary"
                                variant="outlined"
                              />
                            </div>
                          }
                          secondary={salesperson.email}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                {selectedSalespeople.length === 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <Typography variant="body2" className="text-yellow-700">
                        No restrictions will be applied. All users can access this slot.
                      </Typography>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <Button
                variant="outlined"
                onClick={() => setSalesmenModalOpen(false)}
                disabled={loading}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={updateSalesmenRestrictions}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700">
                {loading ? "Updating..." : "Update Restrictions"}
              </Button>
            </div>
          </div>
        </Box>
      </Fade>
    </Modal>
  )

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6">
      <EditModal />
      <SlotDetailModal
        open={detailModalOpen}
        slot={selectedSlot}
        pastDueExpandKey={pastDueExpandKey}
        onExpandKey={setPastDueExpandKey}
        canRollPastDue={canRollPastDue}
        onClose={() => setDetailModalOpen(false)}
        onStartEditing={startEditing}
        onOpenBuffer={openBufferModal}
        onOpenReleaseBuffer={openReleaseBufferModal}
        onOpenTransfer={(s) => {
          setTransferSlotData(s)
          setTransferModalOpen(true)
        }}
        onOpenStockHistory={openStockHistory}
        onOpenOrdersDrawer={setSlotOrdersDrawer}
        onOpenActual={setActualBreakdownSlot}
        onOpenPendingRoll={openPendingRollModal}
        onOpenRollExpired={setRollExpiredModal}
      />
      <SalesmenRestrictionModal />

      {/* Buffer Modal */}
      <Modal
        open={showBufferModal}
        onClose={closeBufferModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500
        }}>
        <Fade in={showBufferModal}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 450,
              bgcolor: "background.paper",
              borderRadius: "16px",
              boxShadow: 24,
              p: 4
            }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Buffer reserve</h3>
              <div className="p-2 bg-purple-50 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            {bufferSlotData && (() => {
              const bufferMeta = getBufferStatusMeta(bufferSlotData)
              const previewPct = parseFloat(bufferValue) || 0
              const previewReserve =
                previewPct > 0
                  ? Math.round((getTotalCapacity(bufferSlotData) * previewPct) / 100)
                  : 0
              return (
              <div className="mb-6">
                <div
                  className={`rounded-xl border bg-gradient-to-br p-4 mb-4 ${bufferMeta.styles.shell}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${bufferMeta.styles.badge}`}>
                      {bufferMeta.styles.badgeLabel}
                    </span>
                    <span className="text-xs text-gray-600">
                      {moment(bufferSlotData.startDay, "DD-MM-YYYY").format("MMM D")} –{" "}
                      {moment(bufferSlotData.endDay, "DD-MM-YYYY").format("MMM D")}
                    </span>
                  </div>
                  <p className={`text-lg font-bold ${bufferMeta.styles.number}`}>{bufferMeta.headline}</p>
                  <p className="text-xs text-gray-600 mt-1">{bufferMeta.subline}</p>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="rounded-lg bg-white/70 px-2 py-1.5">
                      <p className="text-[10px] text-gray-500">Capacity</p>
                      <p className="text-sm font-bold">{bufferMeta.total.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-white/70 px-2 py-1.5">
                      <p className="text-[10px] text-gray-500">Available</p>
                      <p className="text-sm font-bold text-green-700">
                        {bufferMeta.available.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/70 px-2 py-1.5">
                      <p className="text-[10px] text-gray-500">Booked</p>
                      <p className="text-sm font-bold text-blue-700">{bufferMeta.booked.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Buffer percentage for this slot
                  </label>
                  <Input
                    value={bufferValue}
                    onChange={(e) => setBufferValue(e.target.value)}
                    fullWidth
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="e.g. 15"
                    autoFocus
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "0.75rem",
                        fontSize: "1.125rem",
                        fontWeight: "600"
                      }
                    }}
                  />
                  {previewPct > 0 && (
                    <p className="text-xs text-purple-700 mt-2 font-medium">
                      Preview: {previewReserve.toLocaleString()} plants held back ({previewPct}% of capacity)
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Applies reserve to this slot only. You can release it to available anytime.
                  </p>
                </div>
              </div>
              )
            })()}

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeBufferModal}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200">
                Cancel
              </button>
              <button
                onClick={handleBufferSave}
                className="px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors duration-200 shadow-lg">
                Save buffer %
              </button>
            </div>
          </Box>
        </Fade>
      </Modal>

      {/* Release Buffer Modal */}
      <Modal
        open={showReleaseBufferModal}
        onClose={closeReleaseBufferModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500
        }}>
        <Fade in={showReleaseBufferModal}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 400,
              bgcolor: "background.paper",
              borderRadius: "16px",
              boxShadow: 24,
              p: 4
            }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Release to available</h3>
              <div className="p-2 bg-purple-50 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            {releaseBufferSlotData && (() => {
              const releaseMeta = getBufferStatusMeta(releaseBufferSlotData)
              return (
              <div className="mb-6">
                <div
                  className={`rounded-xl border bg-gradient-to-br p-4 mb-4 ${releaseMeta.styles.shell}`}>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold mb-2 ${releaseMeta.styles.badge}`}>
                    {releaseMeta.styles.badgeLabel}
                  </span>
                  <p className={`text-lg font-bold ${releaseMeta.styles.number}`}>
                    {releaseMeta.headline}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{releaseMeta.subline}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-white/70 px-3 py-2">
                      <p className="text-[10px] text-gray-500">Can release now</p>
                      <p className="font-bold text-violet-700">
                        {releaseMeta.releasable.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/70 px-3 py-2">
                      <p className="text-[10px] text-gray-500">Available after</p>
                      <p className="font-bold text-green-700">
                        {(getAvailablePlants(releaseBufferSlotData) +
                          releaseMeta.releasable).toLocaleString()}{" "}
                        <span className="text-[10px] font-normal text-gray-500">max</span>
                      </p>
                    </div>
                  </div>
                </div>

                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  How many plants to move to available?
                </label>
                <Input
                  value={releaseAmount}
                  onChange={(e) => setReleaseAmount(e.target.value)}
                  fullWidth
                  size="large"
                  autoFocus
                  type="number"
                  placeholder="Enter number of plants"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "0.75rem",
                      fontSize: "1.125rem",
                      fontWeight: "600"
                    }
                  }}
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Maximum: {releaseMeta.releasable.toLocaleString()} plants
                  </p>
                  {releaseMeta.releasable > 0 && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-purple-600 hover:text-purple-800"
                      onClick={() => setReleaseAmount(String(releaseMeta.releasable))}>
                      Release all
                    </button>
                  )}
                </div>
              </div>
              )
            })()}

            <div className="flex space-x-3">
              <Button
                fullWidth
                variant="outlined"
                onClick={closeReleaseBufferModal}
                sx={{
                  borderRadius: "0.75rem",
                  py: 1.5,
                  borderColor: "#6b7280",
                  color: "#6b7280",
                  "&:hover": {
                    borderColor: "#4b5563",
                    backgroundColor: "#f9fafb"
                  }
                }}>
                Cancel
              </Button>
              <Button
                fullWidth
                variant="contained"
                onClick={handleReleaseBuffer}
                disabled={!releaseAmount || parseInt(releaseAmount) <= 0}
                sx={{
                  borderRadius: "0.75rem",
                  py: 1.5,
                  backgroundColor: "#8b5cf6",
                  "&:hover": {
                    backgroundColor: "#7c3aed"
                  },
                  "&:disabled": {
                    backgroundColor: "#d1d5db"
                  }
                }}>
                Move to available
              </Button>
            </div>
          </Box>
        </Fade>
      </Modal>

      {/* Sowing Modal */}
      <Modal
        open={showSowingModal}
        onClose={closeSowingModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500
        }}>
        <Fade in={showSowingModal}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 500,
              bgcolor: "background.paper",
              borderRadius: "20px",
              boxShadow: 24,
              p: 0,
              overflow: "hidden"
            }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Sprout className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Create Sowing Record</h3>
                    <p className="text-sm text-green-100 mt-1">Plan your plant production</p>
                  </div>
                </div>
                <IconButton
                  onClick={closeSowingModal}
                  sx={{
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.1)" }
                  }}>
                  <X className="w-5 h-5" />
                </IconButton>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {sowingSlotData && (
                <>
                  {/* Slot Information Card */}
                  <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Slot Information
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 bg-white rounded-lg">
                        <span className="text-gray-600 text-xs">Delivery Period</span>
                        <p className="font-bold text-green-700">
                          {moment(sowingSlotData.startDay, "DD-MM-YYYY").format("MMM D")} -{" "}
                          {moment(sowingSlotData.endDay, "DD-MM-YYYY").format("MMM D, YYYY")}
                        </p>
                      </div>
                      <div className="p-2 bg-white rounded-lg">
                        <span className="text-gray-600 text-xs">Available Capacity</span>
                        <p className="font-bold text-green-700">
                          {sowingSlotData.availablePlants?.toLocaleString() || 0} plants
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sowing Quantity */}
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4 text-green-600" />
                      Quantity to Sow
                    </label>
                    <Input
                      value={sowingQuantity}
                      onChange={(e) => setSowingQuantity(e.target.value)}
                      fullWidth
                      size="large"
                      type="number"
                      placeholder="Enter quantity"
                      autoFocus
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          borderRadius: "12px",
                          fontSize: "1.25rem",
                          fontWeight: "600",
                          borderWidth: "2px",
                          "&:hover fieldset": {
                            borderColor: "#10b981"
                          },
                          "&.Mui-focused fieldset": {
                            borderColor: "#059669"
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1 ml-1">
                      Enter the total number of plants you plan to sow
                    </p>
                  </div>

                  {/* Sowing Date */}
                  <div className="mb-5">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-green-600" />
                      Sowing Date
                    </label>
                    <input
                      type="date"
                      value={sowingDate}
                      onChange={(e) => setSowingDate(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg font-semibold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1 ml-1">
                      When will you start sowing these plants?
                    </p>
                  </div>

                  {/* Notes */}
                  <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-600" />
                      Notes (Optional)
                    </label>
                    <textarea
                      value={sowingNotes}
                      onChange={(e) => setSowingNotes(e.target.value)}
                      placeholder="Add any additional notes or instructions..."
                      rows="3"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-sm focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                    />
                  </div>

                  {/* Info Box */}
                  <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <Activity className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900 mb-1">
                          Expected Ready Date
                        </p>
                        <p className="text-xs text-blue-700">
                          {sowingDate ? (
                            <>
                              Plants will be ready around{" "}
                              <span className="font-bold">
                                {moment(sowingDate).add(12, "days").format("MMM D, YYYY")}
                              </span>
                            </>
                          ) : (
                            "Select a sowing date to see expected ready date"
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={closeSowingModal}
                      disabled={loading}
                      sx={{
                        borderRadius: "12px",
                        py: 1.8,
                        borderWidth: "2px",
                        borderColor: "#d1d5db",
                        color: "#6b7280",
                        fontWeight: 600,
                        fontSize: "1rem",
                        textTransform: "none",
                        "&:hover": {
                          borderWidth: "2px",
                          borderColor: "#9ca3af",
                          backgroundColor: "#f9fafb"
                        }
                      }}>
                      Cancel
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSowingSubmit}
                      disabled={loading || !sowingQuantity || !sowingDate}
                      startIcon={loading ? null : <Send className="w-4 h-4" />}
                      sx={{
                        borderRadius: "12px",
                        py: 1.8,
                        fontSize: "1rem",
                        fontWeight: 700,
                        textTransform: "none",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                        "&:hover": {
                          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                          boxShadow: "0 6px 16px rgba(16, 185, 129, 0.4)"
                        },
                        "&:disabled": {
                          background: "#d1d5db",
                          boxShadow: "none"
                        }
                      }}>
                      {loading ? "Creating..." : "Create Sowing Record"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Box>
        </Fade>
      </Modal>

      {/* Enhanced Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            padding: "8px"
          }
        }}>
        <DialogTitle
          sx={{
            fontWeight: "bold",
            fontSize: "1.25rem",
            color: "#dc2626"
          }}>
          <AlertTriangle className="w-6 h-6 inline mr-2" />
          Delete Manual Slot
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: "1rem", color: "#6b7280" }}>
            Are you sure you want to delete this manually added slot? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ padding: "16px 24px" }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: "600"
            }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteSlot}
            color="error"
            variant="contained"
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: "600"
            }}>
            Delete Slot
          </Button>
        </DialogActions>
      </Dialog>

      {Object.keys(slotsByMonth).length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-white rounded-2xl p-12 shadow-lg border-2 border-dashed border-gray-200">
            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Slots Available</h3>
            <p className="text-gray-600">There are no slots available for this month</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Month Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <Tabs
              value={selectedMonth}
              onChange={(e, newValue) => setSelectedMonth(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "1rem",
                  minHeight: "60px",
                  padding: "12px 24px"
                },
                "& .Mui-selected": {
                  color: "#3b82f6"
                }
              }}>
              {availableMonths.map((month, index) => {
                const summary = calculateSummary(slotsByMonth[month])
                const { totalPlants, totalBookedPlants } = summary
                const totalCapacity = totalPlants
                const bookedPercentage = totalCapacity > 0 ? calculatePercentage(totalBookedPlants, totalCapacity) : 0
                const isOverbooked = totalCapacity < 0 || bookedPercentage > 100

                return (
                  <Tab
                    key={month}
                    label={
                      <div className="flex flex-col items-center">
                        <div className="flex items-center space-x-2">
                          <span>{month}</span>
                          {isOverbooked && <AlertTriangle className="w-4 h-4 text-red-500" />}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {slotsByMonth[month].length} slots • {bookedPercentage}%
                        </div>
                      </div>
                    }
                    sx={{
                      "&.Mui-selected": {
                        backgroundColor: isOverbooked ? "#fef2f2" : "#eff6ff"
                      }
                    }}
                  />
                )
              })}
            </Tabs>
          </div>

          {/* Selected Month Content */}
          {availableMonths[selectedMonth] && (
            <div className="space-y-4">
              {/* Month Summary */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">
                    {availableMonths[selectedMonth]} Overview
                  </h3>
                  <div className="text-sm text-gray-600">
                    {slotsByMonth[availableMonths[selectedMonth]].length} slots total
                  </div>
                </div>

                {(() => {
                  const summary = calculateSummary(slotsByMonth[availableMonths[selectedMonth]])
                  const {
                    totalPlants,
                    totalBookedPlants,
                    totalAvailablePlants,
                    totalPrimarySowed,
                    totalDispatchedPlants,
                    totalRemainingToDispatch
                  } = summary
                  const totalCapacity = totalPlants
                  const bookedPercentage = totalCapacity > 0 ? calculatePercentage(totalBookedPlants, totalCapacity) : 0
                  const isOverbooked = totalAvailablePlants < 0 || totalBookedPlants > totalCapacity
                  const statusColor = getStatusColor(bookedPercentage, totalAvailablePlants)

                  const gap = totalBookedPlants - totalPrimarySowed
                  const gapColor = gap > 0 ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-600"
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                      <div
                        className={`p-4 rounded-lg ${isOverbooked ? "bg-red-50" : "bg-green-50"}`}>
                        <p className="text-sm text-gray-600">Available Plants</p>
                        <p
                          className={`text-2xl font-bold ${
                            isOverbooked ? "text-red-600" : "text-green-600"
                          }`}>
                          {totalAvailablePlants.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50">
                        <p className="text-sm text-gray-600">Booked Plants</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {totalBookedPlants.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-slate-50">
                        <p className="text-sm text-gray-600">Dispatched & completed</p>
                        <p className="text-2xl font-bold text-slate-700">
                          {totalDispatchedPlants.toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-lg ${
                          totalRemainingToDispatch > 0 ? "bg-amber-50" : "bg-gray-50"
                        }`}>
                        <p className="text-sm text-gray-600">Remaining to dispatch</p>
                        <p
                          className={`text-2xl font-bold ${
                            totalRemainingToDispatch > 0 ? "text-amber-700" : "text-gray-900"
                          }`}>
                          {totalRemainingToDispatch.toLocaleString()}
                        </p>
                      </div>
                      <div className={`p-4 rounded-lg ${gapColor}`}>
                        <p className="text-sm text-gray-600">Sowing Gap</p>
                        <p className={`text-2xl font-bold ${gap > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                          {gap > 0 ? '+' : ''}{gap.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-600">Total Capacity</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {totalCapacity.toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`p-4 rounded-lg ${statusColor.bg
                          .replace("bg-", "bg-")
                          .replace("-500", "-50")}`}>
                        <p className="text-sm text-gray-600">Booking Rate</p>
                        <p className={`text-2xl font-bold ${statusColor.text}`}>
                          {bookedPercentage}%{isOverbooked && " (OVER)"}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Slots Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {slotsByMonth[availableMonths[selectedMonth]].map((slot) => (
                  <SlotCard
                    key={slot._id}
                    slot={slot}
                    monthName={availableMonths[selectedMonth]}
                    getStatusColor={getStatusColor}
                    canRollExpired={canRollPastDue}
                    onOpenDetails={openSlotDetails}
                    onOpenOrders={openSlotOrders}
                    onOpenPastDue={openPastDueOnSlot}
                    onOpenActual={setActualBreakdownSlot}
                    onPendingRoll={openPendingRollModal}
                    onRollExpiredAvailable={setRollExpiredModal}
                    onTrail={(e, s) => {
                      e.stopPropagation()
                      setSelectedSlotForTrail(s)
                      setShowSlotTrailModal(true)
                    }}
                    onEdit={startEditing}
                    onBuffer={openBufferModal}
                    onReleaseBuffer={openReleaseBufferModal}
                    onSowing={openSowingModal}
                    onTransfer={(e, s) => {
                      e.stopPropagation()
                      setTransferSlotData(s)
                      setTransferModalOpen(true)
                    }}
                    onStockHistory={openStockHistory}
                    onSalesmen={(e, s) => {
                      e.stopPropagation()
                      openSalesmenModal(s)
                    }}
                    onToggleStatus={updateSlots}
                    onDelete={openDeleteConfirmation}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slot Trail Modal */}
      {showSlotTrailModal && selectedSlotForTrail && (
        <SlotTrailModal
          open={showSlotTrailModal}
          onClose={() => {
            setShowSlotTrailModal(false)
            setSelectedSlotForTrail(null)
          }}
          slotId={selectedSlotForTrail._id}
          slotInfo={selectedSlotForTrail}
        />
      )}

      <StockChangeHistoryModal
        open={Boolean(stockHistorySlot)}
        onClose={() => setStockHistorySlot(null)}
        slot={stockHistorySlot}
      />

      {/* Transfer Plants Modal */}
      <TransferPlantsModal
        open={transferModalOpen}
        onClose={() => {
          setTransferModalOpen(false)
          setTransferSlotData(null)
        }}
        slot={transferSlotData}
        plantId={plantId}
        subtypeId={plantSubId}
        year={year}
        onSuccess={fetchPlantsSlots}
      />

      <SlotOrdersDrawer
        open={Boolean(slotOrdersDrawer)}
        onClose={closeSlotOrdersDrawer}
        slot={slotOrdersDrawer?.slot}
        monthName={slotOrdersDrawer?.monthName}
        statKey={slotOrdersDrawer?.statKey}
        pendingSlotId={slotOrdersDrawer?.pendingSlotId}
        plantId={plantId}
        subtypeId={plantSubId}
        canRollPastDue={canRollPastDue}
        onOpenPendingRoll={openPendingRollModal}
        onPastDueRolled={fetchPlantsSlots}
      />

      <PastDueRollModal
        open={Boolean(pastDueRollModal)}
        onClose={() => setPastDueRollModal(null)}
        detail={pastDueRollModal?.slot?.pastDueDetail}
        slotLabel={pastDueRollModal?.slotLabel || ""}
        plantId={plantId}
        subtypeId={plantSubId}
        canRoll={canRollPastDue}
        onRolled={() => {
          fetchPlantsSlots()
          if (selectedSlot?._id === pastDueRollModal?.slot?._id) {
            setPastDueExpandKey(null)
          }
        }}
      />

      <RollExpiredAvailableModal
        open={Boolean(rollExpiredModal)}
        onClose={() => setRollExpiredModal(null)}
        slot={rollExpiredModal}
        onSuccess={fetchPlantsSlots}
      />

      <SlotActualBreakdownModal
        open={Boolean(actualBreakdownSlot)}
        onClose={() => setActualBreakdownSlot(null)}
        slotRow={actualBreakdownSlot}
      />
    </div>
  )
}

export default Subtypes
