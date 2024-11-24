import React, { useState, useEffect } from "react"
import { ChevronDown, ChevronUp, Check, X, Edit2 } from "react-feather"
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

  // ... keep existing fetch and data handling functions ...

  const fetchPlantsSlots = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SLOTS)
      const response = await instance.request(
        {},
        { plantId, subtypeId: plantSubId, year: "2024", status: true }
      )
      const slots = response?.data?.[0]?.subtypeSlots?.[0]?.slots || []
      const groupedSlots = groupSlotsByMonth(slots)
      setSlotsByMonth(groupedSlots)
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }

  const updateSlots = async (e, id, status) => {
    if (e) {
      e.stopPropagation()
    }
    console.log(status)
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.UPDATE_SLOT)
      let payload = {}
      !editValue ? (payload.status = !status) : (payload.totalPlants = editValue)
      const response = await instance.request(payload, [id])
      if (response?.code === 200) {
        Toast.success(response?.data?.message)
        setEditValue("")
        setEditingSlot(null)
        fetchPlantsSlots()
      }

      console.log(response)
    } catch (error) {
      console.error("Error fetching plants:", error)
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

  const startEditing = (monthName, slotIndex, currentValue) => {
    const key = `${monthName}-${slotIndex}`
    setEditingSlot(key)
    setEditValue(currentValue?.toString() || "0")
  }

  const handleEditChange = (e) => {
    const value = e.target.value.replace(/\D/g, "")
    setEditValue(value)
  }

  const saveEdit = (monthName, slotIndex, id) => {
    // Save the edited slot value logic here
    updateSlots(id)
  }

  const cancelEdit = () => {
    setEditingSlot(null)
    setEditValue("")
  }

  const handleKeyPress = (e, monthName, slotIndex) => {
    if (e.key === "Enter") {
      saveEdit(monthName, slotIndex)
    } else if (e.key === "Escape") {
      cancelEdit()
    }
  }

  const isSlotExpanded = (monthName, slotIndex) => expandedSlots[`${monthName}-${slotIndex}`]

  if (loading) return <PageLoader />

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow">
      {Object.keys(slotsByMonth).map((monthName) => (
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
            <span className="text-lg font-semibold text-gray-800">{monthName}</span>
          </AccordionSummary>
          <AccordionDetails sx={{ padding: "0" }}>
            {slotsByMonth[monthName].map((slot, index) => {
              const { startDay, endDay, totalPlants, status, month, totalBookedPlants } = slot || {}
              const slotKey = `${monthName}-${index}`
              const isEditing = editingSlot === slotKey

              return (
                <div
                  key={slotKey}
                  className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                  <div className="p-4">
                    <div
                      className="grid gap-4 items-center"
                      style={{
                        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr" // Date range column gets more space
                      }}>
                      {/* Date Range Column */}
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggleSlot(monthName, index)}
                          className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
                          {isSlotExpanded(monthName, index) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <span className="font-medium">
                            {`${startDay} ${month}`}-{`${endDay} ${month}`}
                          </span>
                        </button>
                      </div>

                      {/* Total Plants Column */}
                      <div className="flex items-center space-x-3">
                        {isEditing ? (
                          <div className="flex items-center space-x-2">
                            <Input
                              value={editValue}
                              onChange={handleEditChange}
                              onKeyDown={(e) => handleKeyPress(e, monthName, index)}
                              size="small"
                              sx={{ width: "100px" }}
                            />
                            <button
                              onClick={(e) => updateSlots(e, slot?._id)}
                              className="p-1 hover:bg-green-50 rounded-full text-green-600">
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1 hover:bg-red-50 rounded-full text-red-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <span className="text-gray-700">{totalPlants}</span>
                            <button
                              onClick={() => startEditing(monthName, index, totalPlants)}
                              className="p-1 hover:bg-blue-50 rounded-full text-blue-600">
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Booked Plants Column */}
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-700">{totalBookedPlants}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-gray-700">{totalPlants - totalBookedPlants}</span>
                      </div>

                      {/* Status Column */}
                      <div className="flex items-center justify-between">
                        <Switch
                          checked={status}
                          onChange={(e) => updateSlots(e, slot?._id, status)} // Call the handler with necessary params
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
                    <div className="bg-gray-50 p-4 border-t">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Slot Duration</h4>
                          <p className="text-gray-700">{endDay - startDay + 1} days</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Availability</h4>
                          <p className="text-gray-700">
                            {totalPlants - totalBookedPlants} slots available
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  )
}

export default Subtypes
