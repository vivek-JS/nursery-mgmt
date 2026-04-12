import React, { useState } from "react"
import { ChevronDown, ChevronRight, Plus, Check } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import ReplaceOrderDialog from "./ReplaceOrderDialog"

const getExistingReturnedPlants = (order) =>
  Math.max(
    0,
    Number(order.details?.returnedPlants ?? order.returnedPlants ?? 0) || 0
  )

const getExistingDamagedPlants = (order) =>
  Math.max(
    0,
    Number(order.details?.damagedPlants ?? order.damagedPlants ?? 0) || 0
  )

const OrderCompleteDialog = ({ open, onClose, dispatchData }) => {
  const [returnedPlants, setReturnedPlants] = useState({})
  const [damagedPlants, setDamagedPlants] = useState({})
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [returnReasons, setReturnReasons] = useState({})
  const [showAddOrderDialog, setShowAddOrderDialog] = useState(false)
  const [ordersToAdd, setOrdersToAdd] = useState([])
  const [availableOrders, setAvailableOrders] = useState([])
  const [selectedOrders, setSelectedOrders] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  // Actions for each order row
  const [orderActions, setOrderActions] = useState({})
  const [additionalPlantInputs, setAdditionalPlantInputs] = useState({})

  // Initialize default actions for each order
  React.useEffect(() => {
    if (dispatchData?.orderIds) {
      const initialActions = {}
      const initialAdditionalPlants = {}
      dispatchData.orderIds.forEach((order) => {
        initialActions[order.details.orderid] = {
          completeOrder: true // Default to true
        }
        const existingAdditional =
          Number(order.details?.additionalPlants ?? order.additionalPlants ?? 0) || 0
        initialAdditionalPlants[order.details.orderid] = existingAdditional
      })
      setOrderActions(initialActions)
      setAdditionalPlantInputs(initialAdditionalPlants)
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

  const handleDamagedPlantsChange = (orderId, value) => {
    setDamagedPlants((prev) => ({
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

  const handleAdditionalPlantsChange = (orderId, value) => {
    const sanitizedValue =
      value === "" ? "" : Math.max(0, Number.isNaN(Number(value)) ? 0 : Number(value))

    setAdditionalPlantInputs((prev) => ({
      ...prev,
      [orderId]: sanitizedValue
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

  const getPlantQuantities = React.useCallback(
    (order) => {
      const orderId = order.details?.orderid
      const basePlants =
        Number(order.details?.numberOfPlants ?? order.numberOfPlants ?? order.quantity ?? 0)
      const additionalFromData =
        Number(order.details?.additionalPlants ?? order.additionalPlants ?? 0) || 0
      const hasStateValue = Object.prototype.hasOwnProperty.call(
        additionalPlantInputs,
        orderId
      )
      const stateValue = hasStateValue ? additionalPlantInputs[orderId] : undefined

      let additionalValue = additionalFromData

      if (hasStateValue) {
        if (stateValue === "" || stateValue === null || stateValue === undefined) {
          additionalValue = 0
        } else {
          const parsed = Number(stateValue)
          additionalValue = Number.isNaN(parsed) ? 0 : parsed
        }
      }

      const totalPlants = basePlants + additionalValue

      return {
        basePlants,
        additionalPlants: additionalValue,
        totalPlants
      }
    },
    [additionalPlantInputs]
  )

  // Process returned plants function
  const processReturnedPlants = (
    dispatchData,
    returnedPlants,
    damagedPlants,
    returnReasons,
    orderActions
  ) => {
    // Validate inputs
    if (!dispatchData?.orderIds) {
      throw new Error("Invalid dispatch data")
    }

    // Initialize orderUpdates array
    const orderUpdates = []

    // Process each order
    dispatchData.orderIds.forEach((order) => {
      const orderId = order.details.orderid
      const rawReturned = returnedPlants[orderId]
      const returnedQuantity = Math.max(0, Number.isNaN(Number(rawReturned)) ? 0 : Number(rawReturned))
      const rawDamaged = damagedPlants[orderId]
      const damagedQuantity = Math.max(0, Number.isNaN(Number(rawDamaged)) ? 0 : Number(rawDamaged))
      const { basePlants, additionalPlants: additionalPlantCount, totalPlants } = getPlantQuantities(order)
      const actions = orderActions[orderId] || { completeOrder: true }

      const undispatchedAtNursery =
        Number(order.details?.remainingPlants ?? order.remainingPlants ?? 0) || 0

      const existingReturned = getExistingReturnedPlants(order)
      const existingDamaged = getExistingDamagedPlants(order)
      const maxTrackableThisBatch = Math.max(0, totalPlants - existingReturned - existingDamaged)
      if (returnedQuantity + damagedQuantity > maxTrackableThisBatch) {
        throw new Error(
          `Return + damaged quantity for Order #${order.order} cannot exceed ${maxTrackableThisBatch} (${existingReturned} returned and ${existingDamaged} damaged already recorded of ${totalPlants} total)`
        )
      }

      // Status: undispatched-at-nursery drives further dispatch; returns alone do not mean "ready for dispatch"
      const isCompleteChecked = actions.completeOrder !== false
      let finalStatus = "COMPLETED"
      let finalCompleteAction = actions.completeOrder !== false

      if (undispatchedAtNursery > 0) {
        finalStatus = "READY_FOR_DISPATCH"
        finalCompleteAction = false
      } else if (!isCompleteChecked) {
        finalStatus = "PARTIALLY_COMPLETED"
        finalCompleteAction = false
      }

      // Add order to updates
      orderUpdates.push({
        orderId: orderId,
        returnedPlants: returnedQuantity,
        damagedPlants: damagedQuantity,
        returnReason: returnReasons[orderId] || "",
        additionalPlants: additionalPlantCount,
        basePlants,
        totalPlants,
        actions: {
          completeOrder: finalCompleteAction,
          finalStatus: finalStatus // Include the calculated final status
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
          ...processReturnedPlants(
            dispatchData,
            returnedPlants,
            damagedPlants,
            returnReasons,
            orderActions
          )
        },
        [dispatchData?._id]
      )

      if (user?.data?.status) {
        onClose()
        Toast.success(user?.data?.message)
      }
    } catch (error) {
      console.error("Error completing orders:", error)
      if (
        error.message &&
        (error.message.includes("Order #") || error.message.includes("Return quantity for Order #"))
      ) {
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
                      Base Plants
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Additional Plants
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Total Plants
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
                      title="Quantity returned on this completion and auto-added to inventory">
                      Returned Plants
                    </th>
                    <th
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-900"
                      title="Damaged quantity will be recorded but not added to inventory">
                      Damaged Plants
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                      Return / Damage Reason
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-64">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dispatchData.orderIds?.map((order, index) => {
                    const { basePlants, additionalPlants: additionalPlantCount, totalPlants } =
                      getPlantQuantities(order)
                    const returnedQuantity = Number(returnedPlants[order.details.orderid] || 0)
                    const damagedQuantity = Number(damagedPlants[order.details.orderid] || 0)
                    const existingReturned = getExistingReturnedPlants(order)
                    const existingDamaged = getExistingDamagedPlants(order)
                    const maxTrackableThisBatch = Math.max(
                      0,
                      totalPlants - existingReturned - existingDamaged
                    )
                    const maxReturnThisBatch = Math.max(
                      0,
                      maxTrackableThisBatch - damagedQuantity
                    )
                    const maxDamagedThisBatch = Math.max(
                      0,
                      maxTrackableThisBatch - returnedQuantity
                    )
                    const undispatchedAtNursery =
                      Number(order.details?.remainingPlants ?? order.remainingPlants ?? 0) || 0
                    const isCompleteChecked =
                      orderActions[order.details.orderid]?.completeOrder !== false
                    const netWithFarmer = Math.max(
                      0,
                      totalPlants - returnedQuantity - damagedQuantity - undispatchedAtNursery
                    )

                    return (
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
                        <>
                          <td className="px-4 py-4 text-sm text-gray-900">{basePlants}</td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            <input
                              type="number"
                              min="0"
                              className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              value={
                                Object.prototype.hasOwnProperty.call(
                                  additionalPlantInputs,
                                  order.details.orderid
                                )
                                  ? additionalPlantInputs[order.details.orderid]
                                  : additionalPlantCount > 0
                                    ? additionalPlantCount
                                    : ""
                              }
                              onChange={(e) =>
                                handleAdditionalPlantsChange(order.details.orderid, e.target.value)
                              }
                            />
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">{totalPlants}</td>
                        </>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            max={maxReturnThisBatch}
                            className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="This delivery"
                            value={returnedQuantity || ""}
                            onChange={(e) =>
                              handleReturnedPlantsChange(order.details.orderid, e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            max={maxDamagedThisBatch}
                            className="w-24 px-2 py-1 border rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            placeholder="Damaged"
                            value={damagedQuantity || ""}
                            onChange={(e) =>
                              handleDamagedPlantsChange(order.details.orderid, e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Reason for return/damage"
                            value={returnReasons[order.details.orderid] || ""}
                            onChange={(e) =>
                              handleReasonChange(order.details.orderid, e.target.value)
                            }
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-2">
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
                          <td colSpan={11} className="px-4 py-4">
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
                              
                              {/* Status Preview */}
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                                  <span className="mr-2">📊</span>
                                  Status Preview
                                </h4>
                                <div className="text-sm">
                                  <p className="text-gray-700">
                                    <span className="font-medium">Base Plants:</span> {basePlants}
                                  </p>
                                  <p className="text-gray-700">
                                    <span className="font-medium">Additional Plants:</span>{" "}
                                    {additionalPlantCount}
                                  </p>
                                  <p className="text-gray-700">
                                    <span className="font-medium">Total Plants:</span>{" "}
                                    {totalPlants}
                                  </p>
                                  <p className="text-gray-700">
                                    <span className="font-medium">Returned Plants:</span>{" "}
                                    {returnedQuantity}
                                  </p>
                                  <p className="text-gray-700">
                                    <span className="font-medium">Damaged Plants:</span>{" "}
                                    {damagedQuantity}
                                  </p>
                                  <p className="text-gray-700">
                                    <span className="font-medium">Remaining at nursery (undispatched):</span>{" "}
                                    {undispatchedAtNursery}
                                  </p>
                                  <p className="text-gray-700">
                                    <span className="font-medium">
                                      Net with farmer (after return + damage):
                                    </span>{" "}
                                    {netWithFarmer}
                                  </p>
                                  <div className="mt-2 p-2 bg-white rounded border">
                                    <p className="text-sm">
                                      <span className="font-medium">Final Status:</span>{" "}
                                      <span
                                        className={`font-bold ${
                                          undispatchedAtNursery > 0
                                            ? "text-orange-600"
                                            : !isCompleteChecked
                                              ? "text-amber-600"
                                              : "text-green-600"
                                        }`}>
                                        {undispatchedAtNursery > 0
                                          ? "READY_FOR_DISPATCH (plants still at nursery)"
                                          : !isCompleteChecked
                                            ? "PARTIALLY_COMPLETED (Complete Order unchecked)"
                                            : "COMPLETED / closing dispatch (no undispatched qty)"}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Total this submit - Returned:{" "}
                {Object.values(returnedPlants).reduce((sum, qty) => sum + Number(qty || 0), 0)} |
                Damaged:{" "}
                {Object.values(damagedPlants).reduce((sum, qty) => sum + Number(qty || 0), 0)}
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
