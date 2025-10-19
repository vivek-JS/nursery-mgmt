import React, { useState, useEffect } from "react"
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  Target,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  TrendingDown,
  Eye,
  MoreHorizontal,
  X,
  UserCheck,
  Shield,
  History
} from "lucide-react"
import {
  Switch,
  TextField as Input,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Chip,
  Tooltip,
  IconButton,
  Tab,
  Tabs,
  Box,
  Card,
  CardContent,
  Modal,
  Backdrop,
  Fade,
  Checkbox,
  FormControlLabel,
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
import FarmerOrdersTable from "../dashboard/FarmerOrdersTable"
import SlotTrailModal from "components/Modals/SlotTrailModal"
import moment from "moment"

const Subtypes = ({ plantId, plantSubId, year = 2025 }) => {
  const [selectedMonth, setSelectedMonth] = useState(0)
  const [slotsByMonth, setSlotsByMonth] = useState({})
  const [editValue, setEditValue] = useState("")
  const [loading, setLoading] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)

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
  const [editAmount, setEditAmount] = useState("0")
  const [operationType, setOperationType] = useState("add")
  const [editBuffer, setEditBuffer] = useState("0")

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

  const monthOrder = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]

  useEffect(() => {
    fetchPlantsSlots()
  }, [])

  const fetchPlantsSlots = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SLOTS)
      const response = await instance.request({}, { plantId, subtypeId: plantSubId, year })

      const slots = response?.data?.slots[0]?.slots || []
      const groupedSlots = groupSlotsByMonth(slots)
      setSlotsByMonth(groupedSlots)
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

  const startEditing = (e, currentValue, slotId, currentBuffer = 0) => {
    e.stopPropagation()
    setEditingSlotData({
      currentValue: currentValue?.toString() || "0",
      slotId,
      currentBuffer
    })
    setEditAmount("0")
    setEditBuffer("") // Start with empty buffer field
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
    setEditAmount("0")
    setEditBuffer("")
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
      const response = await instance.request({ buffer: parseFloat(buffer) }, [slotId, "buffer"])

      if (response?.data?.success) {
        Toast.success("Buffer updated successfully")
        fetchPlantsSlots() // Refresh the data
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

    const currentVal = parseInt(editingSlotData.currentValue) || 0
    const amountToChange = parseInt(editAmount) || 0
    const bufferValue = parseFloat(editBuffer) || 0

    // Validate buffer
    if (bufferValue < 0 || bufferValue > 100) {
      Toast.error("Buffer must be between 0 and 100")
      return
    }

    try {
      // Update plants if amount is provided
      if (amountToChange > 0) {
        if (operationType === "add") {
          // Use the new addPlantsToCapacity endpoint
          const instance = NetworkManager(API.slots.ADD_PLANTS_TO_CAPACITY)
          const response = await instance.request({ plantsToAdd: amountToChange }, [
            editingSlotData.slotId,
            "add-capacity"
          ])

          if (response?.data?.success) {
            Toast.success(`Added ${amountToChange} plants to available plants`)
          } else {
            Toast.error(response?.data?.message || "Failed to add plants")
            return
          }
        } else {
          // For subtraction, use the general update endpoint
          const newValue = Math.max(0, currentVal - amountToChange)
          setEditValue(newValue.toString())
          setTimeout(() => {
            updateSlots(null, editingSlotData.slotId, undefined, newValue.toString())
          }, 0)
        }
      }

      // Update buffer only if user explicitly changed it
      const currentBuffer = parseFloat(editingSlotData.currentBuffer || 0)
      const newBufferValue = parseFloat(editBuffer) || 0

      // Only update buffer if the value is different AND user entered a value
      if (editBuffer !== "" && newBufferValue !== currentBuffer) {
        await updateSlotBuffer(editingSlotData.slotId, newBufferValue)
      }

      // Refresh data
      fetchPlantsSlots()
      setShowEditModal(false)
    } catch (error) {
      console.error("Error updating slot:", error)
      Toast.error("Failed to update slot. Please try again.")
    }
  }

  function calculateSummary(slots) {
    let totalPlants = 0
    let totalBookedPlants = 0

    slots.forEach((slot) => {
      totalPlants += slot.totalPlants
      totalBookedPlants += slot.totalBookedPlants
    })

    return {
      totalPlants,
      totalBookedPlants
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
    setSelectedSlot({ ...slot, monthName })
    setDetailModalOpen(true)
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

  const openReleaseBufferModal = (slot) => {
    setReleaseBufferSlotData(slot)
    setReleaseAmount("0")
    setShowReleaseBufferModal(true)
  }

  const closeReleaseBufferModal = () => {
    setShowReleaseBufferModal(false)
    setReleaseBufferSlotData(null)
    setReleaseAmount("0")
  }

  const handleReleaseBuffer = async () => {
    if (!releaseBufferSlotData) return

    const amount = parseInt(releaseAmount) || 0

    if (amount <= 0) {
      Toast.error("Please enter a valid amount to release")
      return
    }

    if (amount > (releaseBufferSlotData.bufferAmount || 0)) {
      Toast.error("Cannot release more plants than available in buffer")
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
      const response = await instance.request({ buffer }, [bufferSlotData._id, "buffer"])

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

  // Enhanced Edit Modal Component
  const EditModal = () => {
    if (!showEditModal) return null

    return (
      <Modal
        open={showEditModal}
        onClose={cancelEdit}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500
        }}>
        <Fade in={showEditModal}>
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
              <h3 className="text-2xl font-bold text-gray-900">Edit Available Plants</h3>
              <div className="p-2 bg-blue-50 rounded-full">
                <Edit2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Current Available Plants
              </label>
              <div className="text-3xl font-bold text-gray-900 px-4 py-3 bg-gray-50 rounded-xl border-2 border-gray-200">
                {editingSlotData?.currentValue || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Plants added will go directly to available plants. Buffer amount stays the same,
                percentage will be recalculated.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Operation Type
              </label>
              <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Note:</strong> Plants added will go directly to available plants. Buffer
                  amount stays the same, percentage will be recalculated.
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    operationType === "add"
                      ? "bg-green-500 text-white shadow-lg transform scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setOperationType("add")}>
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add to Available
                </button>
                <button
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    operationType === "subtract"
                      ? "bg-red-500 text-white shadow-lg transform scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setOperationType("subtract")}>
                  <Minus className="w-4 h-4 inline mr-2" />
                  Remove Plants
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {operationType === "add" ? "Plants to Add" : "Plants to Remove"}
              </label>
              <Input
                value={editAmount}
                onChange={handleEditChange}
                onKeyDown={handleKeyPress}
                fullWidth
                size="large"
                autoFocus
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.75rem",
                    fontSize: "1.125rem",
                    fontWeight: "600"
                  }
                }}
              />
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Buffer Percentage (Optional)
              </label>
              <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Current Buffer:</strong> {editingSlotData?.currentBuffer || 0}%
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Buffer amount stays the same, percentage will be recalculated
                </p>
              </div>
              <Input
                value={editBuffer}
                onChange={(e) => setEditBuffer(e.target.value)}
                fullWidth
                size="large"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Enter new buffer percentage (optional)"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "0.75rem",
                    fontSize: "1.125rem",
                    fontWeight: "600"
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">
                <strong>Note:</strong> Only set this if you want to change the buffer percentage.
                Leave empty to keep buffer amount unchanged (percentage will be recalculated).
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelEdit}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors duration-200 shadow-lg">
                Apply Changes
              </button>
            </div>
          </Box>
        </Fade>
      </Modal>
    )
  }

  // Slot Detail Modal
  const SlotDetailModal = () => {
    if (!selectedSlot) return null

    const start = moment(selectedSlot.startDay, "DD-MM-YYYY").format("MMM D")
    const end = moment(selectedSlot.endDay, "DD-MM-YYYY").format("MMM D")
    const year = moment(selectedSlot.startDay, "DD-MM-YYYY").format("YYYY")

    // Use buffer-adjusted values if available, otherwise fall back to original calculation
    const effectiveTotalCapacity =
      selectedSlot.bufferAdjustedCapacity ||
      selectedSlot.totalPlants + selectedSlot.totalBookedPlants
    const effectiveAvailablePlants =
      selectedSlot.availablePlants !== undefined
        ? selectedSlot.availablePlants
        : selectedSlot.totalPlants
    const effectiveTotalPlants =
      selectedSlot.totalPlants !== undefined ? selectedSlot.totalPlants : selectedSlot.totalPlants

    const slotBookedPercentage = calculatePercentage(
      selectedSlot.totalBookedPlants,
      effectiveTotalCapacity
    )
    const slotIsOverbooked = effectiveAvailablePlants < 0 || slotBookedPercentage > 100

    return (
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500
        }}>
        <Fade in={detailModalOpen}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "90%",
              maxWidth: "1000px",
              height: "80%",
              bgcolor: "background.paper",
              borderRadius: "16px",
              boxShadow: 24,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}>
            {/* Modal Header */}
            <div className={`p-6 border-b ${slotIsOverbooked ? "bg-red-50" : "bg-blue-50"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-2 rounded-xl ${slotIsOverbooked ? "bg-red-500" : "bg-blue-500"}`}>
                    {slotIsOverbooked ? (
                      <AlertTriangle className="w-6 h-6 text-white" />
                    ) : (
                      <Calendar className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {start} - {end}, {year}
                    </h3>
                    <p className="text-gray-600">{selectedSlot.monthName}</p>
                  </div>
                  {selectedSlot.isManual && (
                    <Chip
                      icon={<Zap className="w-3 h-3" />}
                      label="Manual Slot"
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  )}
                  {slotIsOverbooked && (
                    <Chip
                      icon={<AlertTriangle className="w-3 h-3" />}
                      label="OVERBOOKED"
                      size="small"
                      color="error"
                      variant="filled"
                    />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Tooltip title="Edit Plants">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation()
                        startEditing(
                          e,
                          effectiveAvailablePlants,
                          selectedSlot._id,
                          selectedSlot.effectiveBuffer || selectedSlot.buffer || 0
                        )
                        setDetailModalOpen(false)
                      }}
                      sx={{ color: "#3b82f6" }}>
                      <Edit2 className="w-5 h-5" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Update Buffer">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation()
                        openBufferModal(e, selectedSlot, selectedSlot.buffer || 0)
                        setDetailModalOpen(false)
                      }}
                      sx={{ color: "#8b5cf6" }}>
                      <Shield className="w-5 h-5" />
                    </IconButton>
                  </Tooltip>
                  <IconButton onClick={() => setDetailModalOpen(false)}>
                    <X className="w-6 h-6" />
                  </IconButton>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Available Plants</p>
                        <p
                          className={`text-2xl font-bold ${
                            effectiveAvailablePlants < 0 ? "text-red-600" : "text-green-600"
                          }`}>
                          {effectiveAvailablePlants.toLocaleString()}
                        </p>
                        {selectedSlot.bufferAmount > 0 && (
                          <p className="text-xs text-gray-500">
                            -{selectedSlot.bufferAmount?.toLocaleString() || 0} buffer applied
                          </p>
                        )}
                      </div>
                      <Target
                        className={`w-8 h-8 ${
                          effectiveAvailablePlants < 0 ? "text-red-500" : "text-green-500"
                        }`}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Booked Plants</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {selectedSlot.totalBookedPlants}
                        </p>
                      </div>
                      <Users className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Booking Rate</p>
                        <p
                          className={`text-2xl font-bold ${
                            slotIsOverbooked ? "text-red-600" : "text-gray-900"
                          }`}>
                          {slotBookedPercentage}%
                        </p>
                      </div>
                      {slotIsOverbooked ? (
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                      ) : (
                        <TrendingUp className="w-8 h-8 text-gray-500" />
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Effective Buffer</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedSlot.effectiveBuffer || selectedSlot.buffer || 0}%
                        </p>
                        {selectedSlot.effectiveBuffer &&
                          selectedSlot.effectiveBuffer !== (selectedSlot.buffer || 0) && (
                            <p className="text-xs text-purple-600">
                              Inherited from{" "}
                              {selectedSlot.effectiveBuffer === selectedSlot.buffer
                                ? "slot"
                                : selectedSlot.effectiveBuffer === selectedSlot.subtypeBuffer
                                ? "subtype"
                                : "plant"}
                            </p>
                          )}
                      </div>
                      <Shield className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Farmer Orders Table */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                    Farmer Orders
                  </h4>
                </div>
                <div className="overflow-auto">
                  <FarmerOrdersTable
                    slotId={selectedSlot._id}
                    monthName={selectedSlot.monthName}
                    startDay={selectedSlot.startDay}
                    endDay={selectedSlot.endDay}
                  />
                </div>
              </div>
            </div>
          </Box>
        </Fade>
      </Modal>
    )
  }

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
      <SlotDetailModal />
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
              <h3 className="text-2xl font-bold text-gray-900">Update Buffer</h3>
              <div className="p-2 bg-purple-50 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            {bufferSlotData && (
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Slot Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Date Range:</span>
                      <p className="font-medium">
                        {moment(bufferSlotData.startDay, "DD-MM-YYYY").format("MMM D")} -{" "}
                        {moment(bufferSlotData.endDay, "DD-MM-YYYY").format("MMM D")}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Available Plants:</span>
                      <p className="font-medium">{bufferSlotData.totalPlants?.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Current Buffer:</span>
                      <p className="font-medium text-purple-600">{bufferSlotData.buffer || 0}%</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="font-medium">{bufferSlotData.status ? "Active" : "Inactive"}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Buffer Percentage
                  </label>
                  <Input
                    value={bufferValue}
                    onChange={(e) => setBufferValue(e.target.value)}
                    fullWidth
                    size="large"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Enter buffer percentage (0-100)"
                    autoFocus
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "0.75rem",
                        fontSize: "1.125rem",
                        fontWeight: "600"
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Additional buffer percentage for this slot (0-100%)
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <div className="p-1 bg-blue-100 rounded">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-900 mb-1">What is Buffer?</h5>
                      <p className="text-sm text-blue-700">
                        Buffer is an additional percentage of plants kept as reserve for this slot.
                        This helps manage unexpected demand or production variations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeBufferModal}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200">
                Cancel
              </button>
              <button
                onClick={handleBufferSave}
                className="px-6 py-3 text-sm font-medium text-white bg-purple-600 rounded-xl hover:bg-purple-700 transition-colors duration-200 shadow-lg">
                Update Buffer
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
              <h3 className="text-2xl font-bold text-gray-900">Release Buffer Plants</h3>
              <div className="p-2 bg-purple-50 rounded-full">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
            </div>

            {releaseBufferSlotData && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Slot Information
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Available Buffer:</span>{" "}
                    {releaseBufferSlotData.bufferAmount?.toLocaleString() || 0} plants
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Current Available:</span>{" "}
                    {releaseBufferSlotData.availablePlants?.toLocaleString() || 0} plants
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Plants to Release from Buffer
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
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {releaseBufferSlotData?.bufferAmount?.toLocaleString() || 0} plants
              </p>
            </div>

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
                Release Plants
              </Button>
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
                const totalCapacity = totalPlants + totalBookedPlants
                const bookedPercentage = calculatePercentage(totalBookedPlants, totalCapacity)
                const isOverbooked = totalPlants < 0 || bookedPercentage > 100

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
                  const { totalPlants, totalBookedPlants } = summary
                  const totalCapacity = totalPlants + totalBookedPlants
                  const bookedPercentage = calculatePercentage(totalBookedPlants, totalCapacity)
                  const isOverbooked = totalPlants < 0 || bookedPercentage > 100
                  const statusColor = getStatusColor(bookedPercentage, totalPlants)

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div
                        className={`p-4 rounded-lg ${isOverbooked ? "bg-red-50" : "bg-green-50"}`}>
                        <p className="text-sm text-gray-600">Available Plants</p>
                        <p
                          className={`text-2xl font-bold ${
                            isOverbooked ? "text-red-600" : "text-green-600"
                          }`}>
                          {totalPlants.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 rounded-lg bg-blue-50">
                        <p className="text-sm text-gray-600">Booked Plants</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {totalBookedPlants.toLocaleString()}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {slotsByMonth[availableMonths[selectedMonth]].map((slot, index) => {
                  const {
                    startDay,
                    endDay,
                    totalPlants,
                    status,
                    totalBookedPlants,
                    _id,
                    isManual,
                    buffer = 0
                  } = slot || {}

                  const start = moment(startDay, "DD-MM-YYYY").format("MMM D")
                  const end = moment(endDay, "DD-MM-YYYY").format("MMM D")
                  const year = moment(startDay, "DD-MM-YYYY").format("YYYY")

                  // Use buffer-adjusted values if available, otherwise fall back to original calculation
                  const effectiveTotalCapacity =
                    slot.bufferAdjustedCapacity || totalPlants + totalBookedPlants
                  const effectiveAvailablePlants =
                    slot.availablePlants !== undefined ? slot.availablePlants : totalPlants
                  const effectiveTotalPlants =
                    slot.totalPlants !== undefined ? slot.totalPlants : totalPlants

                  const slotBookedPercentage = calculatePercentage(
                    totalBookedPlants,
                    effectiveTotalCapacity
                  )
                  const slotStatusColor = getStatusColor(
                    slotBookedPercentage,
                    effectiveAvailablePlants
                  )
                  const slotIsOverbooked =
                    effectiveAvailablePlants < 0 || slotBookedPercentage > 100

                  return (
                    <Card
                      key={_id}
                      className={`transition-all duration-300 hover:shadow-lg cursor-pointer ${
                        slotIsOverbooked ? "ring-2 ring-red-200" : ""
                      }`}
                      onClick={() => openSlotDetails(slot, availableMonths[selectedMonth])}>
                      <CardContent className={`p-4 ${slotIsOverbooked ? "bg-red-50" : ""}`}>
                        {/* Card Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold text-gray-900">
                              {start} - {end}
                            </h4>
                            {isManual && (
                              <Tooltip title="Manual Slot">
                                <Zap className="w-4 h-4 text-amber-500" />
                              </Tooltip>
                            )}
                            {slotIsOverbooked && (
                              <Tooltip title="Overbooked">
                                <AlertTriangle className="w-4 h-4 text-red-500" />
                              </Tooltip>
                            )}
                            <Tooltip title="View Slot Trail">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  console.log("History button clicked for slot:", slot)
                                  console.log("Slot ID:", slot._id)
                                  setSelectedSlotForTrail(slot)
                                  setShowSlotTrailModal(true)
                                }}
                                className="text-blue-600 hover:text-blue-800">
                                <History className="w-4 h-4" />
                              </IconButton>
                            </Tooltip>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Tooltip title="Edit Plants">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditing(e, totalPlants, _id, buffer)
                                }}
                                sx={{
                                  color:
                                    (slot.availablePlants || totalPlants) < 0
                                      ? "#dc2626"
                                      : "#059669"
                                }}>
                                <Edit2 className="w-4 h-4" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Update Buffer">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openBufferModal(e, slot, buffer)
                                }}
                                sx={{ color: "#8b5cf6" }}>
                                <Shield className="w-4 h-4" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="View Details">
                              <IconButton size="small">
                                <Eye className="w-4 h-4" />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-gray-600">Booking Progress</span>
                            <span className={`text-xs font-medium ${slotStatusColor.text}`}>
                              {slotBookedPercentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 ${
                                slotStatusColor.bg
                              } transition-all duration-500 rounded-full ${
                                slotIsOverbooked ? "animate-pulse" : ""
                              }`}
                              style={{ width: `${Math.min(slotBookedPercentage, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-2 text-center text-xs mb-2">
                          <div>
                            <p className="text-gray-600">Available</p>
                            <p
                              className={`font-bold ${
                                slot.availablePlants < 0 ? "text-red-600" : "text-green-600"
                              }`}>
                              {slot.availablePlants?.toLocaleString() ||
                                totalPlants.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Booked</p>
                            <p className="font-bold text-blue-600">{totalBookedPlants}</p>
                          </div>
                        </div>

                        {/* Buffer Info */}
                        <div className="mb-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-purple-700 font-medium">Buffer</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-purple-600 font-bold">
                                {slot.effectiveBuffer || buffer || 0}%
                              </span>
                              <Tooltip title="Update Buffer">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openBufferModal(e, slot, slot.effectiveBuffer || buffer)
                                  }}
                                  sx={{
                                    color: "#8b5cf6",
                                    padding: "2px",
                                    "&:hover": { backgroundColor: "rgba(139, 92, 246, 0.1)" }
                                  }}>
                                  <Shield className="w-3 h-3" />
                                </IconButton>
                              </Tooltip>
                            </div>
                          </div>
                          {slot.effectiveBuffer && slot.effectiveBuffer !== (buffer || 0) && (
                            <div className="text-xs text-purple-600 mt-1">
                              Inherited from{" "}
                              {slot.effectiveBuffer === slot.buffer
                                ? "slot"
                                : slot.effectiveBuffer === slot.subtypeBuffer
                                ? "subtype"
                                : "plant"}
                            </div>
                          )}
                          {/* Release Buffer Button */}
                          {slot.bufferAmount > 0 && (
                            <div className="mt-2">
                              <Tooltip title="Release plants from buffer to available">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openReleaseBufferModal(slot)
                                  }}
                                  sx={{
                                    width: "100%",
                                    fontSize: "0.7rem",
                                    padding: "2px 4px",
                                    borderColor: "#8b5cf6",
                                    color: "#8b5cf6",
                                    "&:hover": {
                                      backgroundColor: "rgba(139, 92, 246, 0.1)",
                                      borderColor: "#7c3aed"
                                    }
                                  }}>
                                  <Shield className="w-3 h-3 mr-1" />
                                  Release Buffer ({slot.bufferAmount?.toLocaleString() || 0})
                                </Button>
                              </Tooltip>
                            </div>
                          )}
                        </div>

                        <div className="text-center text-xs">
                          <p className="text-gray-600">Total Capacity</p>
                          <p className="font-bold text-gray-900">
                            {slot.originalTotalPlants
                              ? slot.originalTotalPlants.toLocaleString()
                              : (totalPlants + totalBookedPlants).toLocaleString()}
                          </p>
                          {slot.bufferAmount > 0 && (
                            <p className="text-xs text-gray-500">
                              -{slot.bufferAmount?.toLocaleString() || 0} buffer
                            </p>
                          )}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center space-x-2">
                            <Switch
                              size="small"
                              checked={status}
                              onChange={(e) => {
                                e.stopPropagation()
                                updateSlots(e, _id, status)
                              }}
                              color="success"
                            />
                            <span className="text-xs text-gray-600">
                              {status ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            {/* Allow Only Toggle Button */}
                            <Tooltip title="Allow Only Specific Salespeople">
                              <Button
                                size="small"
                                variant={slot.restrictToSalesmen ? "contained" : "outlined"}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openSalesmenModal(slot)
                                }}
                                sx={{
                                  minWidth: "auto",
                                  padding: "4px 8px",
                                  fontSize: "0.7rem",
                                  borderRadius: "6px",
                                  textTransform: "none",
                                  backgroundColor: slot.restrictToSalesmen
                                    ? "#3b82f6"
                                    : "transparent",
                                  color: slot.restrictToSalesmen ? "white" : "#3b82f6",
                                  borderColor: "#3b82f6",
                                  "&:hover": {
                                    backgroundColor: slot.restrictToSalesmen ? "#2563eb" : "#eff6ff"
                                  }
                                }}
                                startIcon={<Shield className="w-3 h-3" />}>
                                Allow Only
                                {slot.restrictToSalesmen && slot.allowedSalesmen && (
                                  <Chip
                                    label={slot.allowedSalesmen.length}
                                    size="small"
                                    sx={{
                                      marginLeft: "4px",
                                      height: "16px",
                                      fontSize: "0.6rem",
                                      backgroundColor: "rgba(255,255,255,0.2)",
                                      color: "white"
                                    }}
                                  />
                                )}
                              </Button>
                            </Tooltip>

                            {isManual && totalBookedPlants === 0 && (
                              <Tooltip title="Delete Manual Slot">
                                <IconButton
                                  size="small"
                                  onClick={(e) => openDeleteConfirmation(e, _id)}
                                  sx={{ color: "#dc2626" }}>
                                  <Trash2 className="w-4 h-4" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
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
    </div>
  )
}

export default Subtypes
