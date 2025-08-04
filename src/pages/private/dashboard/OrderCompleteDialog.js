import React, { useState } from "react"
import { ChevronDown, ChevronRight, Plus, RefreshCw, Check } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import ReplaceOrderDialog from "./ReplaceOrderDialog"

const OrderCompleteDialog = ({ open, onClose, dispatchData }) => {
  const [returnedPlants, setReturnedPlants] = useState({})
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [returnReasons, setReturnReasons] = useState({})
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false)
  const [ordersToAdd, setOrdersToAdd] = useState([])
  const [availableOrders, setAvailableOrders] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  // Actions for each order row
  const [orderActions, setOrderActions] = useState({})

  // Initialize default actions for each order
  React.useEffect(() => {
    if (dispatchData?.orderIds) {
      const initialActions = {}
      dispatchData.orderIds.forEach((order) => {
        initialActions[order.details.orderid] = {
          addToInventory: false, // Default to false
          completeOrder: true // Default to true
        }
      })
      setOrderActions(initialActions)
    }
  }, [dispatchData])

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

  const handleActionChange = (orderId, action, checked) => {
    setOrderActions((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [action]: checked
      }
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

  const handleOpenAddOrderDialog = async () => {
    setShowAddOrderDialog(true)
  }

  const handleCloseAddOrderDialog = () => {
    setShowAddOrderDialog(false)
    setSelectedOrders([])
  }

  const handleSelectOrder = (order) => {
    if (selectedOrders.some((o) => o._id === order._id)) {
      setSelectedOrders(selectedOrders.filter((o) => o._id !== order._id))
    } else {
      setSelectedOrders([...selectedOrders, order])
    }
  }

  const handleAddSelectedOrders = async () => {
    if (selectedOrders.length === 0) {
      Toast.warning("Please select at least one order to add")
      return
    }

    setIsLoading(true)
    try {
      // Add the selected orders to the dispatch
      const orderIds = selectedOrders.map((order) => order._id)
      const instance = NetworkManager(API.DISPATCHED.ADD_ORDERS)
      const response = await instance.request({ orderIds }, [dispatchData._id])

      if (response?.data?.status) {
        Toast.success("Orders added successfully")
        handleCloseAddOrderDialog()
      }
    } catch (error) {
      console.error("Error adding orders to dispatch:", error)
      Toast.error("Failed to add orders to dispatch")
    } finally {
      setIsLoading(false)
    }
  }

  // Process returned plants function
  const processReturnedPlants = (dispatchData, returnedPlants, returnReasons, orderActions) => {
    // Validate inputs
    if (!dispatchData?.orderIds) {
      throw new Error("Invalid dispatch data")
    }

    // Initialize orderUpdates array
    const orderUpdates = []

    // Process each order
    dispatchData.orderIds.forEach((order) => {
      const orderId = order.details.orderid
      const returnedQuantity = returnedPlants[orderId] || 0
      const actions = orderActions[orderId] || { addToInventory: false, completeOrder: true }

      // Add order to updates
      orderUpdates.push({
        orderId: orderId,
        returnedPlants: Number(returnedQuantity),
        returnReason: returnReasons[orderId] || "",
        actions: {
          addToInventory: actions.addToInventory,
          completeOrder: actions.completeOrder
        }
      })
    })

    // Return formatted payload
    return {
      orderUpdates
    }
  }

  const handleCompleteOrders = async (e) => {
    e.stopPropagation()
    e.preventDefault()

    try {
      setIsLoading(true)

      // Make API call
      const instance = NetworkManager(API.DISPATCHED.UPDATE_COMPLETE)
      const user = await instance.request(
        {
          ...processReturnedPlants(dispatchData, returnedPlants, returnReasons, orderActions)
        },
        [dispatchData?._id]
      )

      if (user?.data?.status) {
        onClose()
        Toast.success(user?.data?.message)
      }
    } catch (error) {
      console.error("Error completing orders:", error)
      if (error.message && error.message.includes("Order #")) {
        Toast.error(error.message)
      } else {
        Toast.error("Error processing orders")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Complete Orders - Transport ID: {dispatchData.transportId}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Driver: {dispatchData.driverName} | Vehicle: {dispatchData.vehicleName}
                </p>
              </div>
              <button
                onClick={handleOpenAddOrderDialog}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Other Order
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-grow">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="w-10 px-4 py-3"></th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Order
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Farmer Details
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Plant Details
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Total Plants
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Returned Plants
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Return Reason
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-64">
                      Actions
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
                          <div className="text-sm font-medium text-gray-900">
                            {order.farmerName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.details?.farmer?.village || "N/A"}
                          </div>
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
                        <td className="px-4 py-4">
                          <div className="space-y-2">
                            {/* Per-row actions */}
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`inventory-${order.details.orderid}`}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                checked={
                                  orderActions[order.details.orderid]?.addToInventory !== false
                                }
                                onChange={(e) =>
                                  handleActionChange(
                                    order.details.orderid,
                                    "addToInventory",
                                    e.target.checked
                                  )
                                }
                              />
                              <label
                                htmlFor={`inventory-${order.details.orderid}`}
                                className="ml-2 flex items-center text-sm text-gray-900">
                                <RefreshCw className="w-3.5 h-3.5 mr-1 text-blue-600" />
                                Add to Inventory
                              </label>
                            </div>

                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id={`complete-${order.details.orderid}`}
                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                checked={
                                  orderActions[order.details.orderid]?.completeOrder !== false
                                }
                                onChange={(e) =>
                                  handleActionChange(
                                    order.details.orderid,
                                    "completeOrder",
                                    e.target.checked
                                  )
                                }
                              />
                              <label
                                htmlFor={`complete-${order.details.orderid}`}
                                className="ml-2 flex items-center text-sm text-gray-900">
                                <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                                Complete Order
                              </label>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {expandedRows.has(index) && (
                        <tr className="bg-gray-50">
                          <td colSpan={8} className="px-4 py-4">
                            <div className="text-sm space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">
                                    Payment Details
                                  </h4>
                                  <p>Total Amount: {order.total}</p>
                                  <p>Paid Amount: {order["Paid Amt"]}</p>
                                  <p>Remaining: {order["remaining Amt"]}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">
                                    Delivery Details
                                  </h4>
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
                  className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
                  disabled={isLoading}>
                  Cancel
                </button>
                <button
                  onClick={(e) => handleCompleteOrders(e)}
                  className={`px-4 py-2 ${
                    isLoading ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"
                  } text-white rounded flex items-center`}
                  disabled={isLoading}>
                  {isLoading && (
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Process Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Order Dialog */}
      {showAddOrderDialog && (
        <ReplaceOrderDialog open={showAddOrderDialog} onClose={handleCloseAddOrderDialog} />
      )}
    </>
  )
}

export default OrderCompleteDialog
