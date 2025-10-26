import React, { useState, useEffect } from "react"
import {
  ChevronDown,
  ChevronUp,
  Truck,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  FileText,
  Truck as TruckIcon,
  Trash2,
  Download
} from "lucide-react"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"

const DispatchAccordion = ({ 
  dispatch, 
  onRefresh, 
  onViewDispatch, 
  onCollectSlip, 
  onDeliveryChallan, 
  onCompleteOrder, 
  onDeleteDispatch 
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [relatedOrders, setRelatedOrders] = useState([])
  const [loading, setLoading] = useState(false)

  // Debug: Log dispatch data
  useEffect(() => {
    console.log('Dispatch data:', dispatch)
    console.log('Order Dispatch Details:', dispatch?.orderDispatchDetails)
  }, [dispatch])

  useEffect(() => {
    if (relatedOrders.length > 0) {
      console.log('Related orders updated:', relatedOrders)
      console.log('First order sample:', relatedOrders[0])
    }
  }, [relatedOrders])

  useEffect(() => {
    if (isExpanded && dispatch?.orderIds?.length > 0) {
      fetchRelatedOrders()
    }
  }, [isExpanded, dispatch])

  const fetchRelatedOrders = async () => {
    try {
      setLoading(true)
      const orderIds = dispatch.orderIds.map((order) => order._id)

      const instance = NetworkManager(API.ORDER.GET_ORDERS)
      const response = await instance.request({}, {
        orderIds: orderIds.join(","),
        limit: 1000
      })

      console.log('Fetched related orders response:', response.data)

      // Ensure we always set an array, even if the response is unexpected
      if (response.data?.data?.data && Array.isArray(response.data.data.data)) {
        console.log('Using nested data structure, orders:', response.data.data.data)
        setRelatedOrders(response.data.data.data)
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        console.log('Using flat data structure, orders:', response.data.data)
        setRelatedOrders(response.data.data)
      } else {
        console.warn("API returned non-array data for related orders:", response.data?.data)
        setRelatedOrders([])
      }
    } catch (error) {
      console.error("Error fetching related orders:", error)
      Toast.error("Failed to load related orders")
      setRelatedOrders([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "DISPATCH_PROCESS":
        return <Clock className="text-blue-600" size={16} />
      case "DISPATCHED":
        return <Truck className="text-green-600" size={16} />
      case "COMPLETED":
        return <CheckCircle className="text-green-600" size={16} />
      case "CANCELLED":
        return <AlertCircle className="text-red-600" size={16} />
      default:
        return <Package className="text-gray-600" size={16} />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "DISPATCH_PROCESS":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "DISPATCHED":
        return "bg-green-100 text-green-800 border-green-200"
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200"
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  // Get dispatched quantity for a specific order from dispatch details
  const getDispatchedQuantity = (orderId) => {
    if (dispatch?.orderDispatchDetails && Array.isArray(dispatch.orderDispatchDetails)) {
      const dispatchDetail = dispatch.orderDispatchDetails.find(
        (detail) => detail.orderId?.toString() === orderId?.toString()
      )
      if (dispatchDetail) {
        console.log(`Found dispatch detail for order ${orderId}:`, dispatchDetail)
        return dispatchDetail.dispatchQuantity || 0
      }
    }
    // Fallback to plantsDetails if orderDispatchDetails not available
    if (dispatch?.plantsDetails && Array.isArray(dispatch.plantsDetails)) {
      const totalFromPlants = dispatch.plantsDetails.reduce(
        (sum, plant) => sum + (plant.quantity || 0),
        0
      )
      // Distribute evenly across orders as fallback
      const orderCount = dispatch.orderIds?.length || 1
      console.log(`Using fallback calculation for order ${orderId}: ${Math.floor(totalFromPlants / orderCount)}`)
      return Math.floor(totalFromPlants / orderCount)
    }
    console.log(`No dispatch details found for order ${orderId}, returning 0`)
    return 0
  }

  const getTotalPlants = () => {
    // Calculate total from orderDispatchDetails if available
    if (dispatch?.orderDispatchDetails && Array.isArray(dispatch.orderDispatchDetails)) {
      return dispatch.orderDispatchDetails.reduce(
        (total, detail) => total + (detail.dispatchQuantity || 0),
        0
      )
    }
    // Fallback to plantsDetails total
    if (dispatch?.plantsDetails && Array.isArray(dispatch.plantsDetails)) {
      return dispatch.plantsDetails.reduce(
        (total, plant) => total + (plant.quantity || 0),
        0
      )
    }
    return 0
  }

  const getTotalAmount = () => {
    // Calculate based on dispatched quantities and rates
    if (relatedOrders && relatedOrders.length > 0) {
      const totalAmount = relatedOrders.reduce((total, order) => {
        const dispatchedQty = getDispatchedQuantity(order._id)
        const rate = order.rate || 0
        const amount = dispatchedQty * rate
        console.log(`Order ${order.orderId}: ${dispatchedQty} plants × ₹${rate} = ₹${amount}`)
        return total + amount
      }, 0)
      console.log('Total dispatch amount:', totalAmount)
      return totalAmount
    }
    return 0
  }

  const getTotalPaid = () => {
    if (relatedOrders && relatedOrders.length > 0) {
      const totalPaid = relatedOrders.reduce((total, order) => {
        const paid = (order.payment || [])
          .filter(p => p.paymentStatus === "COLLECTED")
          .reduce((sum, p) => sum + (p.paidAmount || 0), 0)
        console.log(`Order ${order.orderId} paid: ₹${paid}`)
        return total + paid
      }, 0)
      console.log('Total paid amount:', totalPaid)
      return totalPaid
    }
    return 0
  }

  const getTotalRemaining = () => {
    return getTotalAmount() - getTotalPaid()
  }

  return (
    <div className="border border-gray-200 rounded-lg mb-4 bg-white shadow-sm">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3">
          <Truck className="text-green-600" size={20} />
          <div>
            <h3 className="font-semibold text-gray-900">Dispatch #{dispatch.transportId}</h3>
            <p className="text-sm text-gray-500">
              {dispatch.driverName} • {dispatch.orderIds?.length || 0} orders •{" "}
              {getTotalPlants().toLocaleString()} plants dispatched
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Summary Stats */}
          <div className="hidden md:flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                ₹{getTotalAmount().toLocaleString()}
              </div>
              <div className="text-gray-500">Total</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-green-600">₹{getTotalPaid().toLocaleString()}</div>
              <div className="text-gray-500">Paid</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-red-600">
                ₹{getTotalRemaining().toLocaleString()}
              </div>
              <div className="text-gray-500">Remaining</div>
            </div>
          </div>

          {/* Expand/Collapse Icon */}
          {isExpanded ? (
            <ChevronUp className="text-gray-400" size={20} />
          ) : (
            <ChevronDown className="text-gray-400" size={20} />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Orders List */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Related Orders</h4>
                <div className="grid gap-3">
                  {Array.isArray(relatedOrders) && relatedOrders.length > 0 ? (
                    relatedOrders.map((order) => {
                      const dispatchedQty = getDispatchedQuantity(order._id)
                      const dispatchedAmount = dispatchedQty * (order.rate || 0)
                      const isPartialDispatch = dispatchedQty < order.numberOfPlants
                      
                      // Calculate total paid from payment array
                      const totalPaid = (order.payment || [])
                        .filter(p => p.paymentStatus === "COLLECTED")
                        .reduce((sum, p) => sum + (p.paidAmount || 0), 0)
                      
                      const totalOrderAmount = order.numberOfPlants * (order.rate || 0)
                      const remainingAmount = totalOrderAmount - totalPaid
                      
                      return (
                        <div
                          key={order._id}
                          className={`bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow ${
                            isPartialDispatch ? 'border-orange-300' : 'border-gray-200'
                          }`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {getStatusIcon(order.orderStatus)}
                              <span className="font-medium">Order #{order.orderId}</span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(
                                  order.orderStatus
                                )}`}>
                                {order.orderStatus?.replace("_", " ")}
                              </span>
                              {isPartialDispatch && (
                                <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700 border border-orange-200">
                                  Partial
                                </span>
                              )}
                            </div>
                            <div className="text-right text-sm">
                              <div className="font-semibold text-blue-600">
                                ₹{dispatchedAmount.toLocaleString()}
                              </div>
                              <div className="text-blue-600 font-medium">
                                {dispatchedQty.toLocaleString()} plants
                              </div>
                              {isPartialDispatch && (
                                <div className="text-xs text-gray-500 mt-1">
                                  of {order.numberOfPlants?.toLocaleString()} total
                                </div>
                              )}
                              <div className="text-xs text-gray-600 mt-1">
                                @ ₹{order.rate}/plant
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                            <div>
                              <span className="text-gray-500">Farmer:</span>
                              <div className="font-medium">{order.farmer?.name || "N/A"}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Village:</span>
                              <div className="font-medium">{order.farmer?.village || "N/A"}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Plant:</span>
                              <div className="font-medium">{order.plantType?.name || "N/A"}</div>
                            </div>
                            <div>
                              <span className="text-gray-500">Subtype:</span>
                              <div className="font-medium">{order.plantSubtype?.name || "N/A"}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Delivery:</span>
                              <div className="font-medium">
                                {order.bookingSlot?.[0]?.startDay && order.bookingSlot?.[0]?.endDay
                                  ? `${order.bookingSlot[0].startDay} - ${order.bookingSlot[0].endDay}`
                                  : "Not specified"}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Rate:</span>
                              <div className="font-medium">₹{order.rate || 0}/plant</div>
                            </div>
                          </div>

                          {/* Dispatch Quantity Info */}
                          {isPartialDispatch && (
                            <div className="mt-3 pt-3 border-t border-gray-100 bg-orange-50 p-3 rounded">
                              <h5 className="font-medium text-orange-900 mb-2 text-sm">📦 Partial Dispatch Info</h5>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <span className="text-orange-700">Dispatched Now:</span>
                                  <div className="font-bold text-orange-900">
                                    {dispatchedQty.toLocaleString()} plants
                                  </div>
                                </div>
                                <div>
                                  <span className="text-orange-700">Remaining:</span>
                                  <div className="font-bold text-orange-900">
                                    {(order.remainingPlants || 0).toLocaleString()} plants
                                  </div>
                                </div>
                                <div>
                                  <span className="text-orange-700">Total Order:</span>
                                  <div className="font-bold text-orange-900">
                                    {order.numberOfPlants?.toLocaleString()} plants
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Dispatch History for this order */}
                          {order.dispatchHistory && order.dispatchHistory.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100 bg-blue-50 p-3 rounded">
                              <h5 className="font-medium text-blue-900 mb-2 text-sm flex items-center">
                                🚚 Dispatch Trail ({order.dispatchHistory.length} dispatch{order.dispatchHistory.length > 1 ? 'es' : ''})
                              </h5>
                              <div className="space-y-2">
                                {order.dispatchHistory.map((dispatch, idx) => (
                                  <div key={idx} className="bg-white p-2 rounded border border-blue-200 text-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium text-blue-700">
                                        {dispatch.quantity} plants
                                      </span>
                                      <span className="text-gray-500">
                                        {moment(dispatch.date).format("DD/MM/YYYY HH:mm")}
                                      </span>
                                    </div>
                                    {dispatch.dispatch && (
                                      <div className="text-gray-600">
                                        Dispatch #{dispatch.dispatch.transportId} • {dispatch.dispatch.driverName}
                                      </div>
                                    )}
                                    <div className="text-gray-600">
                                      Remaining after: {dispatch.remainingAfterDispatch} plants
                                    </div>
                                    {dispatch.processedBy && (
                                      <div className="text-gray-500">
                                        By: {dispatch.processedBy.name}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Payment Summary */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Total Amount:</span>
                                <div className="font-semibold text-gray-900">
                                  ₹{totalOrderAmount.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Paid:</span>
                                <div className="font-medium text-green-600">
                                  ₹{totalPaid.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Remaining:</span>
                                <div className="font-medium text-red-600">
                                  ₹{remainingAmount.toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-gray-500">Payment Status:</span>
                                <div className="font-medium">
                                  {order.paymentCompleted ? "Completed" : "Pending"}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                      <div className="text-gray-500 mb-2">No related orders found</div>
                      <div className="text-sm text-gray-400">
                        This dispatch has no associated orders
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Stats */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-3">Dispatch Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {getTotalPlants().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Dispatched Plants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      ₹{getTotalAmount().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Dispatch Amount</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ₹{getTotalPaid().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Paid Amount</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      ₹{getTotalRemaining().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Remaining</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onViewDispatch(dispatch)
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
                    <Eye size={16} className="mr-2" />
                    View
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCollectSlip(dispatch)
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
                    <Download size={16} className="mr-2" />
                    Collect Slip
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeliveryChallan(dispatch)
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
                    <FileText size={16} className="mr-2" />
                    Delivery Challan
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onCompleteOrder(dispatch)
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
                    <CheckCircle size={16} className="mr-2" />
                    Complete Order
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteDispatch(dispatch)
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DispatchAccordion
