import React, { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Check, X, Edit2 } from "react-feather"
import { CheckCircle, AlertCircle, Calendar } from "lucide-react"
import {
  Switch,
  TextField as Input,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from "@mui/material"
import { ExpandMore } from "@mui/icons-material"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import { Toast } from "helpers/toasts/toastHelper"
import FarmerOrdersTable from "../dashboard/FarmerOrdersTable"
import moment from "moment"

const Subtypes = ({ plantId, plantSubId }) => {
  const [expandedMonths, setExpandedMonths] = useState({})
  const [expandedSlots, setExpandedSlots] = useState({})
  const [editingSlot, setEditingSlot] = useState(null)
  const [slotsByMonth, setSlotsByMonth] = useState({})
  const [editValue, setEditValue] = useState("")
  const [loading, setLoading] = useState(false)

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
        // If status is provided, we're toggling the status
        payload.status = !status
      } else if (plantValue) {
        // If plantValue is explicitly passed (from modal), use it
        payload.totalPlants = plantValue
      } else if (editValue) {
        // Fallback to editValue (from direct editing, if implemented)
        payload.totalPlants = editValue
      }

      // Debug log - remove in production
      console.log("Sending payload:", payload, "to slot ID:", id)

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
        setEditingSlot(null)
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

  const groupSlotsByMonth = (slots) => {
    return slots.reduce((acc, slot) => {
      const monthName = slot.month // Use the month key directly
      if (!monthName) {
        console.warn("Slot does not have a 'month' key:", slot)
        return acc // Skip slots without a 'month' key
      }
      acc[monthName] = acc[monthName] || [] // Initialize the array if it doesn't exist
      acc[monthName].push(slot) // Add the slot to the appropriate month group
      return acc
    }, {})
  }

  const toggleMonth = (monthName) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [monthName]: !prev[monthName]
    }))
  }

  const toggleSlot = (monthName, slotIndex) => {
    const key = `${monthName}-${slotIndex}`
    setExpandedSlots((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSlotData, setEditingSlotData] = useState(null)
  const [editAmount, setEditAmount] = useState("0")
  const [operationType, setOperationType] = useState("add") // "add" or "subtract"

  const startEditing = (e, monthName, slotIndex, currentValue, slotId) => {
    e.stopPropagation()
    setEditingSlotData({
      monthName,
      slotIndex,
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

    // Calculate the new value based on operation type
    const newValue =
      operationType === "add"
        ? currentVal + amountToChange
        : Math.max(0, currentVal - amountToChange)

    // Set the new value for the API call
    setEditValue(newValue.toString())

    // Create a timeout to ensure the state is updated before the API call
    setTimeout(() => {
      updateSlots(null, editingSlotData.slotId, undefined, newValue.toString())
      setShowEditModal(false)
    }, 0)
  }

  const isSlotExpanded = (monthName, slotIndex) => expandedSlots[`${monthName}-${slotIndex}`]

  function calculateSummary(slots) {
    let totalPlants = 0
    let totalBookedPlants = 0
    let remainingPlants = 0

    slots.forEach((slot) => {
      totalPlants += slot.totalPlants
      totalBookedPlants += slot.totalBookedPlants
      remainingPlants += slot.totalPlants - slot.totalBookedPlants
    })

    return {
      totalPlants,
      totalBookedPlants,
      remainingPlants
    }
  }

  // Helper function to calculate percentage
  const calculatePercentage = (booked, total) => {
    if (total === 0) return 0
    return Math.round((booked / total) * 100)
  }

  if (loading) return <PageLoader />

  // Edit Modal Component
  const EditModal = () => {
    if (!showEditModal) return null

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
        <div
          className="bg-white rounded-lg p-6 w-80 shadow-xl"
          onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Edit Available Plants</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Available Plants
            </label>
            <div className="text-lg font-semibold text-gray-800 px-3 py-2 bg-gray-100 rounded-md">
              {editingSlotData?.currentValue || 0}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Operation</label>
            <div className="flex space-x-2">
              <button
                className={`flex-1 py-2 px-3 rounded-md ${
                  operationType === "add" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700"
                }`}
                onClick={() => setOperationType("add")}>
                Add Plants
              </button>
              <button
                className={`flex-1 py-2 px-3 rounded-md ${
                  operationType === "subtract"
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
                onClick={() => setOperationType("subtract")}>
                Remove Plants
              </button>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {operationType === "add" ? "Plants to Add" : "Plants to Remove"}
            </label>
            <Input
              value={editAmount}
              onChange={handleEditChange}
              onKeyDown={handleKeyPress}
              fullWidth
              size="small"
              autoFocus
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "0.375rem"
                }
              }}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={cancelEdit}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Apply Changes
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto bg-white rounded-lg">
      {/* Edit Modal */}
      <EditModal />

      {Object.keys(slotsByMonth).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-lg">No slots available for this month</p>
        </div>
      ) : (
        Object.keys(slotsByMonth).map((monthName) => {
          const summary = calculateSummary(slotsByMonth[monthName])
          const { totalPlants, totalBookedPlants, remainingPlants } = summary
          const totalCapacity = totalPlants + totalBookedPlants
          const bookedPercentage = calculatePercentage(totalBookedPlants, totalCapacity)
          console.log("summary", summary)
          return (
            <Accordion
              key={monthName}
              expanded={expandedMonths[monthName] || false}
              onChange={() => toggleMonth(monthName)}
              sx={{
                "&.MuiAccordion-root": {
                  border: "none",
                  boxShadow: "none",
                  "&:before": {
                    display: "none"
                  }
                }
              }}>
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  backgroundColor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  "&:hover": {
                    backgroundColor: "#f1f5f9"
                  }
                }}>
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-800">{monthName}</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        bookedPercentage > 80
                          ? "bg-green-600"
                          : bookedPercentage > 50
                          ? "bg-green-500"
                          : bookedPercentage > 20
                          ? "bg-yellow-500"
                          : "bg-orange-500"
                      }`}
                      style={{ width: `${bookedPercentage}%` }}></div>
                  </div>

                  {/* Summary Section */}
                  <div className="text-sm flex gap-8 items-center mt-2">
                    <span className="flex items-center gap-1 text-yellow-600">
                      <AlertCircle className="w-4 h-4" />
                      <strong>{totalPlants}</strong> Remaining
                    </span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <strong>{totalBookedPlants || 0}</strong> Booked
                    </span>
                    <span className="flex items-center gap-1 text-gray-700">
                      <strong>{totalCapacity || 0}</strong> Total Plants ({bookedPercentage}%)
                    </span>
                  </div>
                </div>
              </AccordionSummary>

              <AccordionDetails sx={{ padding: "0" }}>
                <div className="overflow-hidden">
                  {/* Table header */}
                  <div
                    className="grid gap-4 items-center bg-gray-100 p-3 border-b border-gray-200 font-medium text-gray-700"
                    style={{
                      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr"
                    }}>
                    <div>Date Range</div>
                    <div>Available Plants</div>
                    <div>Booked Plants</div>
                    <div>Total Capacity</div>
                    <div>Status</div>
                  </div>

                  {slotsByMonth[monthName].map((slot, index) => {
                    const { startDay, endDay, totalPlants, status, totalBookedPlants, _id } =
                      slot || {}
                    const slotKey = `${monthName}-${index}`
                    const isEditing = editingSlot === slotKey
                    const start = moment(startDay, "DD-MM-YYYY").format("D")
                    const end = moment(endDay, "DD-MM-YYYY").format("D")
                    const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")
                    const slotTotalCapacity = totalPlants + totalBookedPlants
                    const slotBookedPercentage = calculatePercentage(
                      totalBookedPlants,
                      slotTotalCapacity
                    )

                    return (
                      <div
                        key={slotKey}
                        className={`border-b last:border-b-0 transition-colors ${
                          isSlotExpanded(monthName, index) ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}>
                        <div className="p-4">
                          <div
                            className="grid gap-4 items-center"
                            style={{
                              gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr"
                            }}>
                            {/* Date Range Column */}
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => toggleSlot(monthName, index)}
                                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                                {isSlotExpanded(monthName, index) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}

                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {`${start} - ${end} ${monthYear}`}
                                  </span>

                                  {/* Micro progress bar for each slot */}
                                  <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        slotBookedPercentage > 80
                                          ? "bg-green-600"
                                          : slotBookedPercentage > 50
                                          ? "bg-green-500"
                                          : slotBookedPercentage > 20
                                          ? "bg-yellow-500"
                                          : "bg-orange-500"
                                      }`}
                                      style={{ width: `${slotBookedPercentage}%` }}></div>
                                  </div>
                                </div>
                              </button>
                            </div>

                            {/* Total Plants Column */}
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-700">{totalPlants}</span>
                                <button
                                  onClick={(e) =>
                                    startEditing(e, monthName, index, totalPlants, _id)
                                  }
                                  className="p-1 hover:bg-blue-50 rounded-full text-blue-600">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Booked Plants Column */}
                            <div className="flex items-center">
                              <span className="text-gray-700">{totalBookedPlants}</span>
                            </div>

                            {/* Total Capacity Column */}
                            <div className="flex items-center">
                              <span className="text-gray-700">{slotTotalCapacity}</span>
                              <span className="text-xs text-gray-500 ml-1">
                                ({slotBookedPercentage}%)
                              </span>
                            </div>

                            {/* Status Column */}
                            <div className="flex items-center justify-between">
                              <Switch
                                checked={status}
                                onChange={(e) => updateSlots(e, _id, status)}
                                sx={{
                                  "& .MuiSwitch-switchBase.Mui-checked": {
                                    color: "#10b981"
                                  },
                                  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                    backgroundColor: "#10b981"
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isSlotExpanded(monthName, index) && (
                          <div className="border-t border-gray-200 bg-white">
                            <FarmerOrdersTable
                              slotId={_id}
                              monthName={monthName}
                              startDay={startDay}
                              endDay={endDay}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </AccordionDetails>
            </Accordion>
          )
        })
      )}
    </div>
  )
}

export default Subtypes
