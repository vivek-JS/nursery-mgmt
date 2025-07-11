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
  Shield
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
import moment from "moment"

const Subtypes = ({ plantId, plantSubId }) => {
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
      const response = await instance.request({}, { plantId, subtypeId: plantSubId, year: 2025 })

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

  const startEditing = (e, currentValue, slotId) => {
    e.stopPropagation()
    setEditingSlotData({
      currentValue: currentValue?.toString() || "0",
      slotId
    })
    setEditAmount("0")
    setOperationType("add")
    setShowEditModal(true)
  }

  const handleEditChange = (e) => {
    const value = e.target.value.replace(/\D/g, "")
    setEditAmount(value)
  }

  const cancelEdit = (e) => {
    if (e) e.stopPropagation()
    setShowEditModal(false)
    setEditingSlotData(null)
    setEditAmount("0")
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSaveEdit()
    } else if (e.key === "Escape") {
      cancelEdit(e)
    }
  }

  const handleSaveEdit = () => {
    if (!editingSlotData || !editAmount) return

    const currentVal = parseInt(editingSlotData.currentValue) || 0
    const amountToChange = parseInt(editAmount) || 0

    if (amountToChange <= 0) {
      cancelEdit()
      return
    }

    const newValue =
      operationType === "add"
        ? currentVal + amountToChange
        : Math.max(0, currentVal - amountToChange)

    setEditValue(newValue.toString())

    setTimeout(() => {
      updateSlots(null, editingSlotData.slotId, undefined, newValue.toString())
      setShowEditModal(false)
    }, 0)
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
              <h3 className="text-2xl font-bold text-gray-900">Edit Plant Capacity</h3>
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
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Operation Type
              </label>
              <div className="flex space-x-2">
                <button
                  className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    operationType === "add"
                      ? "bg-green-500 text-white shadow-lg transform scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  onClick={() => setOperationType("add")}>
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Plants
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

            <div className="mb-8">
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
    const slotTotalCapacity = selectedSlot.totalPlants + selectedSlot.totalBookedPlants
    const slotAvailablePlants = selectedSlot.totalPlants
    const slotBookedPercentage = calculatePercentage(
      selectedSlot.totalBookedPlants,
      slotTotalCapacity
    )
    const slotIsOverbooked = slotAvailablePlants < 0 || slotBookedPercentage > 100

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
                <IconButton onClick={() => setDetailModalOpen(false)}>
                  <X className="w-6 h-6" />
                </IconButton>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Available Plants</p>
                        <p
                          className={`text-2xl font-bold ${
                            slotAvailablePlants < 0 ? "text-red-600" : "text-green-600"
                          }`}>
                          {slotAvailablePlants.toLocaleString()}
                        </p>
                      </div>
                      <Target
                        className={`w-8 h-8 ${
                          slotAvailablePlants < 0 ? "text-red-500" : "text-green-500"
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
                    isManual
                  } = slot || {}

                  const start = moment(startDay, "DD-MM-YYYY").format("MMM D")
                  const end = moment(endDay, "DD-MM-YYYY").format("MMM D")
                  const year = moment(startDay, "DD-MM-YYYY").format("YYYY")
                  const slotTotalCapacity = totalPlants + totalBookedPlants
                  const slotAvailablePlants = totalPlants
                  const slotBookedPercentage = calculatePercentage(
                    totalBookedPlants,
                    slotTotalCapacity
                  )
                  const slotStatusColor = getStatusColor(slotBookedPercentage, slotAvailablePlants)
                  const slotIsOverbooked = slotAvailablePlants < 0 || slotBookedPercentage > 100

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
                          </div>
                          <div className="flex items-center space-x-1">
                            <Tooltip title="Edit Plants">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditing(e, totalPlants, _id)
                                }}
                                sx={{ color: slotAvailablePlants < 0 ? "#dc2626" : "#059669" }}>
                                <Edit2 className="w-4 h-4" />
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
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <p className="text-gray-600">Available</p>
                            <p
                              className={`font-bold ${
                                slotAvailablePlants < 0 ? "text-red-600" : "text-green-600"
                              }`}>
                              {slotAvailablePlants.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Booked</p>
                            <p className="font-bold text-blue-600">{totalBookedPlants}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total</p>
                            <p className="font-bold text-gray-900">{slotTotalCapacity}</p>
                          </div>
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
    </div>
  )
}

export default Subtypes
