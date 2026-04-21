import React, { useState, useEffect, useCallback } from "react"
import { NetworkManager, API } from "network/core"
import { Truck } from "lucide-react"
import DispatchForm from "./DispatchedForm"
import CollectSlipPDF from "./CollectSlipPDF"
import DeliveryChallanPDF from "./DeliveryChallan"
import OrderCompleteDialog from "./OrderCompleteDialog"
import DispatchAccordion from "./DispatchAccordion"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"
const DispatchList = ({ setisDispatchtab, viewMode, refresh, hideHeader = false }) => {
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDispatch, setSelectedDispatch] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState(null)
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false)
  const [isCollectSlipOpen, setIsCollectSlipOpen] = useState(false)
  const [isDCOpen, setIsDCOpen] = useState(false)
  const [isOrderCompleteOpen, setIsOrderCompleteOpen] = useState(false)

  const enrichDispatchLoadStatus = async (dispatchRows = []) => {
    if (!Array.isArray(dispatchRows) || dispatchRows.length === 0) return []
    return Promise.all(
      dispatchRows.map(async (dispatch) => {
        try {
          const orderIds = (dispatch.orderIds || []).map((order) => order?._id).filter(Boolean)
          if (orderIds.length === 0) {
            return { ...dispatch, agriLoadBlocked: false, agriLoadBlockedBy: [] }
          }
          const instance = NetworkManager(API.INVENTORY.GET_DISPATCH_LOAD_STATUS)
          const response = await instance.request({ orderIds })
          const data = response?.data?.data || {}
          return {
            ...dispatch,
            agriLoadBlocked: Boolean(data.isBlocked),
            agriLoadBlockedBy: Array.isArray(data.blockedBy) ? data.blockedBy : [],
          }
        } catch (error) {
          return { ...dispatch, agriLoadBlocked: false, agriLoadBlockedBy: [] }
        }
      })
    )
  }

  const fetchDispatches = useCallback(async () => {
    try {
      setLoading(true)
      const instance = NetworkManager(API.DISPATCHED.GET_TRAYS)
      const response = await instance.request()

      if (response.data?.data) {
        const enrichedDispatches = await enrichDispatchLoadStatus(response.data.data)
        setDispatches(enrichedDispatches)
        setisDispatchtab(enrichedDispatches[0])
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

  /** Build DispatchForm `selectedOrders` Map from GET /dispatched/:id payload. */
  const transformGetDispatchToMap = (d) => {
    const m = new Map()
    const rows = Array.isArray(d?.orderIds) ? d.orderIds : []
    for (const o of rows) {
      const id = o?._id
      if (!id) continue
      const subtypes = Array.isArray(o.plantName?.subtypes) ? o.plantName.subtypes : []
      const stName =
        subtypes.find((s) => String(s?._id) === String(o.plantSubtype))?.name || "Unknown"
      const cavity = o.cavity
      const cavityIdRaw =
        typeof cavity === "object" && cavity?._id != null
          ? String(cavity._id)
          : cavity != null
          ? String(cavity)
          : ""
      const qty = Number(o.numberOfPlants || 0) + Number(o.additionalPlants || 0)
      m.set(String(id), {
        order: o.orderId,
        farmerName: o.farmer?.name || "Unknown",
        plantType: `${o.plantName?.name || "Unknown"} -> ${stName}`,
        quantity: qty,
        orderDate: o.orderBookingDate ? moment(o.orderBookingDate).format("DD-MM-YYYY") : "",
        rate: o.rate,
        total: qty * Number(o.rate || 0),
        "Paid Amt": 0,
        "remaining Amt": 0,
        orderStatus: o.orderStatus,
        Delivery: o.deliveryDate ? moment(o.deliveryDate).format("DD-MM-YYYY") : "",
        details: {
          farmer: o.farmer || {},
          orderid: id,
          remainingPlants: Number(o.remainingPlants ?? qty),
          plantID: o.plantName?._id || o.plantName,
          plantSubtypeID: o.plantSubtype,
          cavity: cavity ?? null,
          cavityId: cavityIdRaw || undefined,
          cavityName:
            (typeof cavity === "object" && cavity?.name) || (cavityIdRaw ? "Tray" : ""),
        },
      })
    }
    return m
  }

  const transformDispatchForForm = (dispatchData) => {
    const plants = dispatchData.plantsDetails?.map((plant) => {
      const plantOrders = dispatchData.orderIds?.map((order) => {
        const firstPickup =
          Array.isArray(plant.pickupDetails) && plant.pickupDetails.length > 0
            ? plant.pickupDetails[0]
            : null
        return {
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
            ...(order.details || {}),
            farmer: order.details?.farmer || {},
            plantID: plant.plantId,
            plantSubtypeID: plant.subTypeId,
            cavityName:
              order.details?.cavityName ??
              firstPickup?.cavityName,
            cavityId:
              order.details?.cavityId ??
              (order.details?.cavity && typeof order.details.cavity === "object"
                ? order.details.cavity._id ?? order.details.cavity.id
                : undefined) ??
              firstPickup?.cavity
          }
        }
      })
      
      return {
        id: plant.id,
        name: plant.name,
        quantity: plant.quantity,
        pickupDetails: plant.pickupDetails?.map((pickup) => ({
          shade: pickup.shade,
          quantity: pickup.quantity,
          shadeName: pickup.shadeName,
          cavityName: pickup.cavityName,
          cavity: pickup.cavity,
          cavitySize: pickup.cavitySize,
          numberPerCrate: pickup.numberPerCrate
        })),
        crates: plant.crates?.map((crate) => ({
          cavity: crate.cavity,
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
      _id: dispatchData._id,
      name: dispatchData.name || "",
      driverName: dispatchData.driverName,
      driverMobile: dispatchData.driverMobile,
      vehicleName: dispatchData.vehicleName,
      transportId: dispatchData.transportId,
      plants: plants,
      orderIds: Array.isArray(dispatchData.orderIds) ? dispatchData.orderIds : [],
      orderDispatchDetails: Array.isArray(dispatchData.orderDispatchDetails)
        ? dispatchData.orderDispatchDetails
        : []
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
          cavityId: order.cavity || order.details?.cavity || order.details?.cavityId,
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
      case "view": {
        const openView = async () => {
          try {
            const inst = NetworkManager(API.DISPATCHED.GET_BY_ID)
            const res = await inst.request({}, [String(dispatch._id)])
            const raw = res?.data?.data ?? res?.data
            const d = raw && raw._id ? raw : raw?.data
            const merged = d?._id ? { ...dispatch, ...d } : dispatch
            const fd = transformDispatchForForm(merged)
            setSelectedDispatch(fd)
            setSelectedOrders(d?._id ? transformGetDispatchToMap(d) : transformDataToMap(merged))
            setIsDispatchFormOpen(true)
          } catch (err) {
            console.error("getDispatch for edit:", err)
            const fd = transformDispatchForForm(dispatch)
            setSelectedDispatch(fd)
            setSelectedOrders(transformDataToMap(dispatch))
            setIsDispatchFormOpen(true)
          }
        }
        void openView()
        break
      }
      case "collectSlip":
        formattedData = transformDispatchForForm(dispatch)
        setSelectedDispatch(formattedData)
        setIsCollectSlipOpen(true)
        break
      case "dc":
        if (dispatch?.agriLoadBlocked) {
          const blockedOrders = (dispatch.agriLoadBlockedBy || [])
            .map((row) => row.agriOrderNumber || row.agriOrderId)
            .filter(Boolean)
          Toast.error(
            `Agri Input pending load by Agri admin. Challan blocked${
              blockedOrders.length ? ` (${blockedOrders.join(", ")})` : ""
            }`
          )
          return
        }
        setSelectedDispatch(dispatch)
        setIsDCOpen(true)
        break
      default:
        break
    }
  }

  const handleDialogOpenView = (type, dispatch, e) => {
    e.stopPropagation()
    handleDialogOpen("view", dispatch, { stopPropagation: () => {} })
  }

  const handleDelete = async (dispatch) => {
    if (
      !window.confirm(
        "Remove this transport and restore orders to ready for dispatch? This cannot be undone."
      )
    ) {
      return
    }
    try {
      const instance = NetworkManager(API.DISPATCHED.DELETE_TRANSPORT)
      await instance.request({}, [dispatch.transportId])
      Toast.success("Transport removed.")
      fetchDispatches()
      if (typeof refresh === "function") refresh()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("dispatchCreated"))
      }
    } catch (error) {
      console.error("Error deleting dispatch:", error)
      Toast.error(error?.response?.data?.message || error?.message || "Failed to remove transport")
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

  if (viewMode !== "dispatch_process") {
    return null
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px] px-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <>
        <div className="space-y-4 px-4 py-3 border-b border-gray-100">
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
                if (typeof refresh === "function") refresh()
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
    </>
  )
}

export default DispatchList
