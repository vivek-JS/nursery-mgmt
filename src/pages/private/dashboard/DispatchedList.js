import React, { useState, useEffect } from "react"
import { NetworkManager, API } from "network/core"
import { Truck, Trash2, CheckCircle } from "lucide-react"
import DispatchForm from "./DispatchedForm"
import CollectSlipPDF from "./CollectSlipPDF"
import DeliveryChallanPDF from "./DeliveryChallan"
import OrderCompleteDialog from "./OrderCompleteDialog"
import { Toast } from "helpers/toasts/toastHelper"
const DispatchList = ({ setisDispatchtab, viewMode, refresh }) => {
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDispatch, setSelectedDispatch] = useState(null)
  const [selectedOrders, setSelectedOrders] = useState(null)
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false)
  const [isCollectSlipOpen, setIsCollectSlipOpen] = useState(false)
  const [isDCOpen, setIsDCOpen] = useState(false)
  const [isOrderCompleteOpen, setIsOrderCompleteOpen] = useState(false)

  useEffect(() => {
    fetchDispatches()
  }, [viewMode, refresh])

  const fetchDispatches = async () => {
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
  }

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
          farmer: order.details.farmer,
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
      console.log(plant?.pickupDetails)
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
        crates: plant.crates?.map((crate) => {
          return {
            numberOfCavityTrays: Math.ceil(crate?.crateDetails[0]?.plantCount / crate?.cavitySize),
            numberOfCrates: crate?.crateDetails[0]?.crateCount,
            quantity: crate?.crateDetails[0]?.plantCount,
            cavityName: crate?.cavityName
          }
        }),
        selectedCavity: plant.crates[0].cavity,
        cavityDetails: {
          cavityName: plant.crates[0].cavityName,
          cavitySize: plant.crates[0].cavitySize || 8
        },
        orders: plantOrders
      }
    })

    return {
      driverName: dispatchData.driverName,
      vehicleName: dispatchData.vehicleName,
      transportId: dispatchData.transportId,
      plants: plants
    }
  }
  const handleOrderComplete = (dispatch, e) => {
    e.stopPropagation()
    const incompletePayments = dispatch.orderIds.filter((order) => !order.paymentCompleted)

    if (incompletePayments.length > 0) {
      // Create error message with order details
      const errorMessage = incompletePayments
        .map(
          (order) =>
            `Order #${order.order} - ${order.farmerName}: Payment not completed\n` +
            `Total Amount: ${order.total}\n` +
            `Paid Amount: ${order["Paid Amt"]}\n` +
            `Remaining: ${order["remaining Amt"]}`
        )
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
    e.stopPropagation()
    console.log(type)
    const formattedData = transformDispatchForForm(dispatch)
    switch (type) {
      case "view":
        setSelectedDispatch(formattedData)
        setSelectedOrders(transformDataToMap(dispatch))
        setIsDispatchFormOpen(true)
        break
      case "collectSlip":
        setSelectedDispatch(formattedData)
        setIsCollectSlipOpen(true)
        break
      case "dc":
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
    // Don't open the view dialog if clicked on any button
    if (e.target.closest("button")) {
      return
    }
    handleDialogOpenView("view", dispatch, e)
  }
  return (
    <>
      {viewMode === "dispatch_process" && (
        <div className="space-y-4 p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Dispatch List</h2>
            <button
              onClick={fetchDispatches}
              className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
              Refresh List
            </button>
          </div>

          {dispatches.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No dispatches found</div>
          ) : (
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Transport ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Order IDs
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Total Plants
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Plant Types
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {dispatches?.map((dispatch) => (
                    <tr
                      key={dispatch._id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={(e) => handleRowClick(dispatch, e)}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Truck className="text-green-600 mr-2" size={20} />
                          <span className="text-gray-900">{dispatch.transportId}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {dispatch.driverName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(dispatch.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        <div className="flex items-center gap-1">
                          {dispatch.orderIds?.slice(0, 3).map((order) => (
                            <span
                              key={order.order}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-xs">
                              #{order.order}
                            </span>
                          ))}
                          {dispatch.orderIds?.length > 3 && (
                            <span className="text-gray-500 text-xs">
                              +{dispatch.orderIds.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusChipStyles(
                            dispatch.transportStatus
                          )}`}>
                          {dispatch.transportStatus || "PENDING"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {dispatch.plantsDetails.reduce((sum, plant) => sum + plant.quantity, 0)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {dispatch.plantsDetails?.map((plant) => plant.name).join(", ")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                        <button
                          onClick={(e) => handleDialogOpen("collectSlip", dispatch, e)}
                          className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
                          Collect Slip
                        </button>
                        <button
                          onClick={(e) => handleDialogOpen("dc", dispatch, e)}
                          className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700">
                          DC
                        </button>
                        {dispatch.transportStatus !== "DELIVERED" && (
                          <>
                            <button
                              onClick={(e) => handleOrderComplete(dispatch, e)}
                              className="inline-flex items-center px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700">
                              <CheckCircle size={16} className="mr-1" />
                              Complete Order
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(dispatch)
                              }}
                              className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded hover:bg-red-200">
                              <Trash2 size={16} className="mr-1" />
                              Delete
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {isDispatchFormOpen && (
            <DispatchForm
              open={isDispatchFormOpen}
              onClose={() => setIsDispatchFormOpen(false)}
              dispatchData={selectedDispatch}
              mode="view"
              selectedOrders={selectedOrders}
            />
          )}

          {isCollectSlipOpen && (
            <CollectSlipPDF
              open={isCollectSlipOpen}
              onClose={() => setIsCollectSlipOpen(false)}
              dispatchData={selectedDispatch}
            />
          )}

          {isDCOpen && (
            <DeliveryChallanPDF
              open={isDCOpen}
              onClose={() => setIsDCOpen(false)}
              dispatchData={selectedDispatch}
            />
          )}
          {/* New Order Complete Dialog */}
          {isOrderCompleteOpen && (
            <OrderCompleteDialog
              open={isOrderCompleteOpen}
              onClose={() => setIsOrderCompleteOpen(false)}
              dispatchData={selectedDispatch}
            />
          )}
        </div>
      )}
    </>
  )
}

export default DispatchList
