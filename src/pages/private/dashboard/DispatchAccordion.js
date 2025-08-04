import React, { useState, useEffect } from "react"
import {
  ChevronDown,
  ChevronUp,
  Truck,
  Package,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"

const DispatchAccordion = ({ dispatch, onRefresh }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [relatedOrders, setRelatedOrders] = useState([])
  const [loading, setLoading] = useState(false)

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
      const response = await instance.request({
        orderIds: orderIds.join(","),
        limit: 1000
      })

      // Ensure we always set an array, even if the response is unexpected
      if (response.data?.data && Array.isArray(response.data.data)) {
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

  const getTotalPlants = () => {
    return dispatch.orderIds?.reduce((total, order) => total + (order.quantity || 0), 0) || 0
  }

  const getTotalAmount = () => {
    return dispatch.orderIds?.reduce((total, order) => total + (order.total || 0), 0) || 0
  }

  const getTotalPaid = () => {
    return dispatch.orderIds?.reduce((total, order) => total + (order.PaidAmt || 0), 0) || 0
  }

  const getTotalRemaining = () => {
    return dispatch.orderIds?.reduce((total, order) => total + (order.remainingAmt || 0), 0) || 0
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
              {getTotalPlants().toLocaleString()} plants
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
                    relatedOrders.map((order) => (
                      <div
                        key={order._id}
                        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(order.orderStatus)}
                            <span className="font-medium">Order #{order.orderId}</span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(
                                order.orderStatus
                              )}`}>
                              {order.orderStatus?.replace("_", " ")}
                            </span>
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-semibold text-gray-900">
                              ₹{order.total?.toLocaleString()}
                            </div>
                            <div className="text-gray-500">
                              {order.numberOfPlants?.toLocaleString()} plants
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Farmer:</span>
                            <div className="font-medium">{order.farmer?.name}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Village:</span>
                            <div className="font-medium">{order.farmer?.village}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Plant:</span>
                            <div className="font-medium">{order.plantDetails?.name}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Delivery:</span>
                            <div className="font-medium">
                              {order.bookingSlot?.startDay && order.bookingSlot?.endDay
                                ? `${order.bookingSlot.startDay} - ${order.bookingSlot.endDay}`
                                : order.bookingSlot?.month || "Not specified"}
                            </div>
                          </div>
                        </div>

                        {/* Payment Summary */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Paid:</span>
                              <div className="font-medium text-green-600">
                                ₹{order.PaidAmt?.toLocaleString() || 0}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Remaining:</span>
                              <div className="font-medium text-red-600">
                                ₹{order.remainingAmt?.toLocaleString() || 0}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-500">Status:</span>
                              <div className="font-medium">
                                {order.paymentCompleted ? "Completed" : "Pending"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
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
                    <div className="text-2xl font-bold text-gray-900">
                      {getTotalPlants().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Total Plants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      ₹{getTotalAmount().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Total Amount</div>
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
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DispatchAccordion
