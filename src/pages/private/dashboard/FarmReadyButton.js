import React, { useState } from "react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { Toast } from "helpers/toasts/toastHelper"

/**
 * FarmReadyButton Component - A button that allows marking orders as "Farm Ready"
 * with a date picker to select when the order will be ready
 *
 * @param {object} props
 * @param {string} props.orderId - The ID of the order to mark as Farm Ready
 * @param {function} props.onUpdateOrder - Function to call to update the order status
 * @param {function} props.refreshOrders - Function to refresh the orders list after update
 * @returns {JSX.Element}
 */
const FarmReadyButton = ({ orderId, onUpdateOrder, refreshOrders, currentFarmReadyDate }) => {
  // State
  const [farmReadyDate, setFarmReadyDate] = useState(
    currentFarmReadyDate ? new Date(currentFarmReadyDate) : new Date()
  )
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [reason, setReason] = useState("")

  // Handler functions
  const handleOpenModal = () => {
    setFarmReadyDate(currentFarmReadyDate ? new Date(currentFarmReadyDate) : new Date())
    setReason("")
    setShowDatePicker(true)
  }

  const handleCancel = () => {
    setShowDatePicker(false)
    setReason("")
  }

  const handleConfirm = async () => {
    if (!orderId) return

    if (!reason.trim()) {
      Toast.error("Please provide a reason for the farm ready date change")
      return
    }

    setLoading(true)

    try {
      // Log the date we're sending to ensure it's what we expect
      console.log("Selected date:", farmReadyDate)
      console.log("Formatted date:", farmReadyDate.toISOString())

      // Only update the farm ready date, don't change the order status
      await onUpdateOrder({
        id: orderId,
        farmReadyDate: farmReadyDate.toISOString(),
        farmReadyDateChangeReason: reason || "",
        farmReadyDateChangeNotes: reason || ""
      })

      Toast.success("Farm ready date updated successfully")

      if (refreshOrders) {
        refreshOrders()
      }
    } catch (error) {
      Toast.error("Failed to update farm ready date")
      console.error("Farm Ready update error:", error)
    } finally {
      setLoading(false)
      setShowDatePicker(false)
      setReason("")
    }
  }

  return (
    <>
      {/* Farm Ready Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          handleOpenModal()
        }}
        className="px-3 py-1.5 text-xs bg-amber-500 text-white rounded-md hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 transition-colors duration-200 shadow-sm font-medium">
        {currentFarmReadyDate ? "📅 Edit Farm Ready Date" : "🚀 Mark Farm Ready"}
      </button>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
          onClick={(e) => {
            e.stopPropagation()
            // Only close if clicking on the backdrop
            if (e.target === e.currentTarget) {
              handleCancel()
            }
          }}>
          <div
            className="bg-white rounded-lg p-6 shadow-xl w-96 max-w-full"
            onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {currentFarmReadyDate ? "📅 Edit Farm Ready Date" : "🚀 Mark Order as Farm Ready"}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🌱 When will this order be ready for dispatch?
              </label>
              <div onClick={(e) => e.stopPropagation()}>
                <DatePicker
                  selected={farmReadyDate}
                  onChange={(date) => setFarmReadyDate(date)}
                  minDate={new Date()}
                  className="w-full p-2 border rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select date"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📝 Reason for change *
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Weather conditions, Plant growth status, etc."
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCancel()
                }}
                disabled={loading}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                Cancel
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleConfirm()
                }}
                disabled={loading}
                className={`px-4 py-2 text-sm text-white ${
                  loading ? "bg-amber-400" : "bg-amber-600 hover:bg-amber-700"
                } rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500`}>
                {loading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default FarmReadyButton
