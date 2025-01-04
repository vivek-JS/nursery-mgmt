import React, { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const OrderCompleteDialog = ({ open, onClose, dispatchData }) => {
  const [returnedPlants, setReturnedPlants] = useState({})
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [returnReasons, setReturnReasons] = useState({})
  console.log(dispatchData)
  const handleReturnedPlantsChange = (orderId, value) => {
    setReturnedPlants((prev) => ({
      ...prev,
      [orderId]: value
    }))
  }

  const handleReasonChange = (orderId, value) => {
    setReturnReasons((prev) => ({
      ...prev,
      [orderId]: value
    }))
  }

  const toggleRow = (index) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index)
    } else {
      newExpandedRows.add(index)
    }
    setExpandedRows(newExpandedRows)
  }
  const processReturnedPlants = (dispatchData, returnedPlants, returnReasons) => {
    // Validate inputs
    if (!dispatchData?.orderIds) {
      throw new Error("Invalid dispatch data")
    }

    // Initialize orderUpdates array
    const orderUpdates = []

    // Process each order that has returned plants
    Object.entries(returnedPlants).forEach(([orderId, quantity]) => {
      if (quantity && quantity > 0) {
        orderUpdates.push({
          orderId: orderId,
          returnedPlants: Number(quantity),
          returnReason: returnReasons[orderId] || "Not specified"
        })
      }
    })

    // Return formatted payload
    return {
      orderUpdates
    }
  }

  const handleCompleteOrders = async () => {
    try {
      console.log(
        "Dispatch update payload:",
        processReturnedPlants(dispatchData, returnedPlants, returnReasons)
      )
      // Add your API call here
      const instance = NetworkManager(API.DISPATCHED.UPDATE_COMPLETE)
      const user = await instance.request(
        { ...processReturnedPlants(dispatchData, returnedPlants, returnReasons) },
        [dispatchData?._id]
      )
      console.log(user)
      if (user?.data?.status) {
        onClose()
        Toast.success(user?.data?.message)
      }
    } catch (error) {
      console.error("Error completing orders:", error)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Complete Orders - Transport ID: {dispatchData.transportId}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Driver: {dispatchData.driverName} | Vehicle: {dispatchData.vehicleName}
          </p>
        </div>

        <div className="overflow-y-auto flex-grow">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-3"></th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Order</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Farmer Details
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Plant Details
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Delivered Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Returned Plants
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    Return Reason
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dispatchData.orderIds?.map((order, index) => (
                  <React.Fragment key={order.details.orderid}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => toggleRow(index)}
                          className="text-gray-500 hover:text-gray-700 focus:outline-none">
                          {expandedRows.has(index) ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">#{order.order}</td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">{order.farmerName}</div>
                        <div className="text-sm text-gray-500">{order.details.farmer.village}</div>
                        <div className="text-sm text-gray-500">Contact: {order.contact}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {order.plantDetails.name}
                        </div>
                        <div className="text-sm text-gray-500">Rate: ₹{order.rate}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">{order.quantity}</td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          max={order.quantity}
                          className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="0"
                          value={returnedPlants[order.details.orderid] || ""}
                          onChange={(e) =>
                            handleReturnedPlantsChange(order.details.orderid, e.target.value)
                          }
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Reason for return"
                          value={returnReasons[order.details.orderid] || ""}
                          onChange={(e) =>
                            handleReasonChange(order.details.orderid, e.target.value)
                          }
                        />
                      </td>
                    </tr>
                    {expandedRows.has(index) && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="text-sm space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Payment Details</h4>
                                <p>Total Amount: {order.total}</p>
                                <p>Paid Amount: {order["Paid Amt"]}</p>
                                <p>Remaining: {order["remaining Amt"]}</p>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Delivery Details</h4>
                                <p>Delivery Window: {order.Delivery}</p>
                                <p>Order Date: {order.orderDate}</p>
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Sales Person</h4>
                                <p>Name: {order.details.salesPerson.name}</p>
                                <p>Contact: {order.details.salesPerson.phoneNumber}</p>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Total Returned Plants:{" "}
              {Object.values(returnedPlants).reduce((sum, qty) => sum + Number(qty || 0), 0)}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100">
                Cancel
              </button>
              <button
                onClick={handleCompleteOrders}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                Complete Orders
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderCompleteDialog
