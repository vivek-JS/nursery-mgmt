import React, { useState, useEffect, useCallback } from "react"
import { NetworkManager, API } from "network/core"
import { Truck, Trash2, CheckCircle } from "lucide-react"
import DispatchForm from "./DispatchedForm"
import CollectSlipPDF from "./CollectSlipPDF"
import DeliveryChallanPDF from "./DeliveryChallan"
import OrderCompleteDialog from "./OrderCompleteDialog"
import DispatchAccordion from "./DispatchAccordion"
import { Toast } from "helpers/toasts/toastHelper"
const DispatchList = ({ setisDispatchtab, viewMode, refresh, hideHeader = false }) => {
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDispatch, setSelectedDispatch] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState(null)
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false)
  const [isCollectSlipOpen, setIsCollectSlipOpen] = useState(false)
  const [isDCOpen, setIsDCOpen] = useState(false)
  const [isOrderCompleteOpen, setIsOrderCompleteOpen] = useState(false)

  const fetchDispatches = useCallback(async () => {
    try {
      setLoading(true)
      const instance = NetworkManager(API.DISPATCHED.GET_TRAYS)
      const response = await instance.request()

      if (response.data?.data) {
        setDispatches(response.data.data)
        setisDispatchtab(response?.data?.data[0])
      }
    } catch (error) {
      console.error("Error fetching dispatches:", error)
    } finally {
      setLoading(false)
    }
  }, [setisDispatchtab])

  useEffect(() => {
    fetchDispatches()
    // Reset all dialog states when component re-renders due to viewMode or refresh changes
    setIsCollectSlipOpen(false)
    setIsDCOpen(false)
    setIsDispatchFormOpen(false)
    setIsOrderCompleteOpen(false)
  }, [viewMode, refresh, fetchDispatches])

  // Auto-refresh when dispatch is added - only when viewMode changes and no dialogs are open
  useEffect(() => {
    // Only auto-refresh if no dialogs are open to prevent interruptions
    if (!isDispatchFormOpen && !isCollectSlipOpen && !isDCOpen && !isOrderCompleteOpen && viewMode === "dispatch_process") {
      const interval = setInterval(() => {
        fetchDispatches()
      }, 30000) // Refresh every 30 seconds

      return () => clearInterval(interval)
    }
  }, [viewMode, isDispatchFormOpen, isCollectSlipOpen, isDCOpen, isOrderCompleteOpen, fetchDispatches])

  const transformDispatchForForm = (dispatchData) => {
    const plants = dispatchData.plantsDetails?.map((plant) => {
      const plantOrders = dispatchData.orderIds?.map((order) => ({
        order: order.order,
        farmerName: order.farmerName,
        plantType: plant.name,
        quantity: order.quantity,
        orderDate: order.orderDate,
        rate: order.rate,
        total: order.total,
        "Paid Amt": order["Paid Amt"],
        "remaining Amt": order["remaining Amt"],
        orderStatus: order.orderStatus,
        Delivery: order.Delivery,
        details: {
          farmer: order.details?.farmer || {},
          contact: order.details.contact,
          orderNotes: order.details.orderNotes || "",
          soilType: order.details.soilType || "",
          irrigationType: order.details.irrigationType || "",
          lastDelivery: order.details.lastDelivery || "",
          payment: order.details.payment,
          orderid: order.details.orderid,
          salesPerson: order.details.salesPerson,
          plantID: plant.plantId,
          plantSubtypeID: plant.subTypeId,
          bookingSlot: order.details.bookingSlot
        }
      }))
      
      return {
        id: plant.id,
        name: plant.name,
        quantity: plant.quantity,
        pickupDetails: plant.pickupDetails?.map((pickup) => ({
          shade: pickup.shade,
          quantity: pickup.quantity,
          shadeName: pickup.shadeName,
          cavityName: pickup.cavityName
        })),
        crates: plant.crates?.map((crate) => ({
          cavityName: crate.cavityName,
          cavitySize: crate.cavitySize,
          numberPerCrate: crate.numberPerCrate,
          crateCount: crate.crateCount,
          plantCount: crate.plantCount,
          crateDetails: crate.crateDetails || []
        })),
        orders: plantOrders
      }
    })

    return {
      driverName: dispatchData.driverName,
      driverMobile: dispatchData.driverMobile,
      vehicleName: dispatchData.vehicleName,
      transportId: dispatchData.transportId,
      plants: plants
    }
  }
  const handleOrderComplete = (dispatch, e) => {
    e.stopPropagation()
    
    // Calculate payment check based on dispatched quantities, not total order
    const incompletePayments = dispatch.orderIds.filter((order) => {
      // Find the dispatched quantity for this order from orderDispatchDetails
      const dispatchDetail = dispatch.orderDispatchDetails?.find(
        (detail) => detail.orderId?.toString() === order._id?.toString()
      )
      
      // If no dispatch detail found, use dispatched plants (fallback)
      const dispatchedQty = dispatchDetail?.dispatchQuantity || 
        (dispatch.plantsDetails?.reduce((sum, plant) => sum + (plant.quantity || 0), 0) / dispatch.orderIds.length) || 0
      
      // Calculate required payment based on dispatched quantity
      const dispatchedAmount = dispatchedQty * (order.rate || 0)
      
      // Get total paid amount
      const totalPaid = order["Paid Amt"] || 0
      
      // Check if payment is sufficient for dispatched plants
      return totalPaid < dispatchedAmount
    })

    if (incompletePayments.length > 0) {
      // Create error message with order details
      const errorMessage = incompletePayments
        .map((order) => {
          const dispatchDetail = dispatch.orderDispatchDetails?.find(
            (detail) => detail.orderId?.toString() === order._id?.toString()
          )
          const dispatchedQty = dispatchDetail?.dispatchQuantity || 
            (dispatch.plantsDetails?.reduce((sum, plant) => sum + (plant.quantity || 0), 0) / dispatch.orderIds.length) || 0
          const dispatchedAmount = dispatchedQty * (order.rate || 0)
          
          return `Order #${order.order} - ${order.farmerName}: Payment incomplete for dispatched plants\n` +
            `Dispatched: ${dispatchedQty} plants × ₹${order.rate} = ₹${dispatchedAmount}\n` +
            `Paid Amount: ₹${order["Paid Amt"] || 0}\n` +
            `Required for dispatch: ₹${dispatchedAmount}`
        })
        .join("\n\n")

      Toast.error("Cannot complete order due to pending payments:\n" + errorMessage)
      return
    }
    setSelectedDispatch(dispatch)
    setIsOrderCompleteOpen(true)
  }

  function transformDataToMap(data) {
    const map = new Map()

    data.orderIds.forEach((order) => {
      const {
        details: { farmer, contact, orderid, salesPerson, bookingSlot, payment },
        plantDetails,
        quantity,
        rate,
        total,
        remainingAmt,
        PaidAmt,
        orderStatus,
        orderDate
      } = order

      // Construct delivery string
      const delivery =
        bookingSlot.startDay && bookingSlot.endDay && bookingSlot.month
          ? `${bookingSlot.startDay} - ${bookingSlot.endDay} ${
              bookingSlot.month
            }, ${new Date().getFullYear()}`
          : ""

      // Create a transformed object for each order
      const transformedOrder = {
        order: order.order,
        farmerName: farmer.name,
        plantType: plantDetails.name,
        quantity: quantity,
        orderDate: orderDate,
        rate: rate,
        total: total,
        "Paid Amt": PaidAmt,
        "remaining Amt": remainingAmt,
        orderStatus: orderStatus,
        Delivery: delivery,
        details: {
          farmer: {
            name: farmer.name,
            mobileNumber: farmer.mobileNumber,
            village: farmer.village
          },
          contact: contact,
          orderNotes: order.details.orderNotes || "",
          payment: payment,
          orderid: orderid,
          salesPerson: {
            name: salesPerson.name,
            phoneNumber: salesPerson.phoneNumber
          },
          plantID: order.details.bookingSlot.plantId || "",
          plantSubtypeID: order.details.bookingSlot.subtypeId || "",
          bookingSlot: {
            slotId: bookingSlot._id || "",
            startDay: bookingSlot.startDay || "",
            endDay: bookingSlot.endDay || "",
            subtypeId: bookingSlot.subtypeId || "",
            month: bookingSlot.month || ""
          }
        }
      }

      // Add to the map with the order ID as the key
      map.set(orderid, transformedOrder)
    })

    return map
  }

  // Example usage

  const handleDialogOpen = (type, dispatch, e) => {
    e.stopPropagation() // Prevent the event from bubbling up

    // Prevent multiple opens by checking if already open
    if (isCollectSlipOpen || isDCOpen || isDispatchFormOpen || isOrderCompleteOpen) {
      return
    }

    let formattedData

    switch (type) {
      case "view":
        formattedData = transformDispatchForForm(dispatch)
        setSelectedDispatch(formattedData)
        setSelectedOrders(transformDataToMap(dispatch))
        setIsDispatchFormOpen(true)
        break
      case "collectSlip":
        formattedData = transformDispatchForForm(dispatch)
        setSelectedDispatch(formattedData)
        setIsCollectSlipOpen(true)
        break
      case "dc":
        // For DC we don't need to transform the data
        setSelectedDispatch(dispatch)
        setIsDCOpen(true)
        break
      default:
        break
    }
  }

  const handleDialogOpenView = (type, dispatch, e) => {
    e.stopPropagation()
    const formattedData = transformDispatchForForm(dispatch)
    setSelectedDispatch(formattedData)
    setSelectedOrders(transformDataToMap(dispatch))
    setIsDispatchFormOpen(true)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }
  const handleDelete = async (dispatch) => {
    // Add delete functionality here
    if (window.confirm("Are you sure you want to delete this dispatch?")) {
      try {
        const instance = NetworkManager(API.DISPATCHED.DELETE_TRANSPORT)
        await instance.request({}, [dispatch.transportId])
        fetchDispatches() // Refresh the list after deletion
      } catch (error) {
        console.error("Error deleting dispatch:", error)
      }
    }
  }
  const getStatusChipStyles = (status) => {
    switch (status) {
      case "DELIVERED":
        return "bg-green-100 text-green-800 border-green-200"
      case "IN_TRANSIT":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200"
      default: // PENDING
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
    }
  }
  const handleRowClick = (dispatch, e) => {
    // Don't open the view dialog if clicked on any button or if a dialog is already open
    if (
      e.target.closest("button") ||
      isDispatchFormOpen ||
      isCollectSlipOpen ||
      isDCOpen ||
      isOrderCompleteOpen
    ) {
      return
    }

    // Only open the view dialog if nothing else is open
    handleDialogOpenView("view", dispatch, e)
  }
  return (
    <>
      {viewMode === "dispatch_process" && (
        <div className="space-y-4 p-2 sm:p-4">
          {!hideHeader && (
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Dispatch List</h2>
              <button
                onClick={fetchDispatches}
                className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                Refresh List
              </button>
            </div>
          )}

          {dispatches.length === 0 ? (
            <div className="text-center py-8">
              <Truck className="text-gray-400 mx-auto mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Dispatches Found</h3>
              <p className="text-gray-500">No dispatches are currently in process.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dispatches.map((dispatch) => (
                <DispatchAccordion
                  key={dispatch._id}
                  dispatch={dispatch}
                  onRefresh={fetchDispatches}
                  onViewDispatch={(dispatch) => handleDialogOpen("view", dispatch, { stopPropagation: () => {} })}
                  onCollectSlip={(dispatch) => handleDialogOpen("collectSlip", dispatch, { stopPropagation: () => {} })}
                  onDeliveryChallan={(dispatch) => handleDialogOpen("dc", dispatch, { stopPropagation: () => {} })}
                  onCompleteOrder={(dispatch) => handleOrderComplete(dispatch, { stopPropagation: () => {} })}
                  onDeleteDispatch={(dispatch) => handleDelete(dispatch)}
                />
              ))}
            </div>
          )}

          {isDispatchFormOpen && selectedDispatch && (
            <DispatchForm
              open={isDispatchFormOpen}
              onClose={() => {
                setIsDispatchFormOpen(false)
                setSelectedDispatch(null) // Reset selected dispatch when closing
              }}
              dispatchData={selectedDispatch}
              mode="view"
              selectedOrders={selectedOrders}
            />
          )}

          {isCollectSlipOpen && selectedDispatch && (
            <CollectSlipPDF
              open={isCollectSlipOpen}
              onClose={() => {
                setIsCollectSlipOpen(false)
                setSelectedDispatch(null) // Reset selected dispatch when closing
              }}
              dispatchData={selectedDispatch}
            />
          )}

          {isDCOpen && selectedDispatch && (
            <DeliveryChallanPDF
              open={isDCOpen}
              onClose={() => {
                setIsDCOpen(false)
                setSelectedDispatch(null) // Reset selected dispatch when closing
              }}
              dispatchData={selectedDispatch}
            />
          )}

          {isOrderCompleteOpen && selectedDispatch && (
            <OrderCompleteDialog
              open={isOrderCompleteOpen}
              onClose={() => {
                setIsOrderCompleteOpen(false)
                setSelectedDispatch(null) // Reset selected dispatch when closing
              }}
              dispatchData={selectedDispatch}
            />
          )}
        </div>
      )}
    </>
  )
}

export default DispatchList
