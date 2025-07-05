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
const FarmReadyButton = ({ orderId, onUpdateOrder, refreshOrders }) => {
  // State
  const [farmReadyDate, setFarmReadyDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [loading, setLoading] = useState(false)

  // Handler functions
  const handleOpenModal = () => {
    setFarmReadyDate(new Date())
    setShowDatePicker(true)
  }

  const handleCancel = () => {
    setShowDatePicker(false)
  }

  const handleConfirm = async () => {
    if (!orderId) return

    setLoading(true)

    try {
      // Log the date we're sending to ensure it's what we expect
      console.log("Selected date:", farmReadyDate)
      console.log("Formatted date:", farmReadyDate.toISOString())

      // Make sure we're sending a valid date object or ISO string
      await onUpdateOrder({
        id: orderId,
        orderStatus: "FARM_READY",
        // Make sure we're sending the date as ISO string for consistency
        farmReadyDateUpdate: farmReadyDate.toISOString()
      })

      Toast.success("Order marked as Farm Ready")

      if (refreshOrders) {
        refreshOrders()
      }
    } catch (error) {
      Toast.error("Failed to mark order as Farm Ready")
      console.error("Farm Ready update error:", error)
    } finally {
      setLoading(false)
      setShowDatePicker(false)
    }
  }

  return (
    <>
      {/* Farm Ready Button */}
      <button
        onClick={handleOpenModal}
        className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 focus:outline-none">
        Farm Ready
      </button>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-96 max-w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Set Farm Ready Date</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                When will this order be ready?
              </label>
              <DatePicker
                selected={farmReadyDate}
                onChange={(date) => setFarmReadyDate(date)}
                minDate={new Date()}
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                dateFormat="dd/MM/yyyy"
                placeholderText="Select date"
              />
            </div>

            <div className="flex space-x-3 justify-end">
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                Cancel
              </button>
              <button
                onClick={handleConfirm}
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
