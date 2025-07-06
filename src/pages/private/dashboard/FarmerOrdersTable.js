import React, { useState, useEffect } from "react"
import { Edit2Icon, CheckIcon, XIcon, RefreshCw } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import moment from "moment"
import debounce from "lodash.debounce"
import { MenuItem, Select } from "@mui/material"
import DownloadPDFButton from "./OrdereRecipt"
import DispatchForm from "./DispatchedForm"
import DispatchList from "./DispatchedList"
import { Toast } from "helpers/toasts/toastHelper"
import FarmReadyButton from "./FarmReadyButton"
import { faHourglassEmpty } from "@fortawesome/free-solid-svg-icons"
import { FaUser, FaCreditCard, FaEdit, FaFileAlt } from "react-icons/fa"

const FarmerOrdersTable = ({ slotId, monthName, startDay, endDay }) => {
  const today = new Date()
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [editingRows, setEditingRows] = useState(new Set())
  const [selectedDateRange, setSelectedDateRange] = useState([
    new Date(today.getFullYear(), 0, 1),
    today
  ])
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])
  const [patchLoading, setpatchLoading] = useState(false)
  const [startDate, endDate] = selectedDateRange
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [refresh, setRefresh] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
  const orderStatusOptions = [
    { label: "Accepted", value: "ACCEPTED" },
    { label: "Pending", value: "PENDING" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Dispatched", value: "DISPATCHED" },
    { label: "Completed", value: "COMPLETED" },
    { label: "Partially Completed", value: "PARTIALLY_COMPLETED" },
    { label: "Ready For Dispatch", value: "FARM_READY" },
    { label: "Loading", value: "DISPATCH_PROCESS" }
  ]
  const [slots, setSlots] = useState([])
  const [updatedObject, setUpdatedObject] = useState(null)
  const [viewMode, setViewMode] = useState("booking")
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false)
  const [isDispatchtab, setisDispatchtab] = useState(false)
  const [newRemark, setNewRemark] = useState("")
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [newPayment, setNewPayment] = useState({
    paidAmount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    modeOfPayment: "",
    bankName: "",
    remark: "",
    receiptPhoto: []
  })
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [activeTab, setActiveTab] = useState("overview")
  const handleFarmReady = (orderId) => {
    // Get current date
    const farmReadyDate = moment().format("DD-MM-YYYY")

    // Call pacthOrders with FARM_READY status
    pacthOrders(
      {
        id: orderId,
        orderStatus: "FARM_READY",
        farmReadyDate: farmReadyDate
      },
      null // No row data needed for this simple update
    )
  }
  // Add these handler functions
  const handleAddRemark = (orderId) => {
    if (!newRemark.trim()) return

    pacthOrders(
      {
        id: orderId,
        orderRemarks: newRemark
      },
      selectedRow
    ).then(() => {
      // Refresh modal data after successful remark
      setTimeout(() => {
        refreshModalData()
      }, 1000)
    })

    setNewRemark("")
  }

  const handleAddPayment = async (orderId) => {
    if (!newPayment.paidAmount || !newPayment.modeOfPayment) {
      Toast.error("Please fill in amount and payment mode")
      return
    }

    setLoading(true)
    try {
      const instance = NetworkManager(API.ORDER.ADD_PAYMENT)
      const payload = {
        ...newPayment,
        paymentStatus: "COLLECTED"
      }
      const response = await instance.request(payload, [orderId])

      if (response?.data) {
        Toast.success(response?.data?.message || "Payment added successfully")
        setShowPaymentForm(false)
        setNewPayment({
          paidAmount: "",
          paymentDate: moment().format("YYYY-MM-DD"),
          modeOfPayment: "",
          bankName: "",
          remark: "",
          receiptPhoto: []
        })
        // Refresh modal data after successful payment
        setTimeout(() => {
          refreshModalData()
        }, 1000)
      } else {
        Toast.error("Failed to add payment")
      }
    } catch (error) {
      console.error("Error adding payment:", error)
      Toast.error("Failed to add payment")
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentInputChange = (field, value) => {
    setNewPayment((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const refreshModalData = async () => {
    if (selectedOrder) {
      // Refresh the orders to get updated data
      await getOrders()
      // Find the updated order data
      const updatedOrder = orders.find(
        (order) => order.details.orderid === selectedOrder.details.orderid
      )
      if (updatedOrder) {
        setSelectedOrder(updatedOrder)
      }
    }
  }

  // Add function to handle row selection
  const toggleRowSelection = (orderId, rowData) => {
    setSelectedRows((prevSelectedRows) => {
      const newSelectedRows = new Map(prevSelectedRows)

      // If row is already selected, remove it
      if (newSelectedRows.has(orderId)) {
        newSelectedRows.delete(orderId)
      } else {
        // Add the full row data to the map
        newSelectedRows.set(orderId, {
          ...rowData,
          details: {
            ...rowData.details,
            orderid: orderId
          }
        })
      }

      return newSelectedRows
    })
  }
  // Add function to handle "Select All" functionality
  const toggleSelectAll = () => {
    if (selectedRows.size === orders.length) {
      setSelectedRows(new Set())
    } else {
      const allOrderIds = orders.map((order) => order.details.orderid)
      setSelectedRows(new Set(allOrderIds))
    }
  }
  useEffect(() => {
    if (startDate && endDate) {
      getOrders()
    }
  }, [debouncedSearchTerm, refresh, startDate, endDate, viewMode])

  useEffect(() => {
    if (selectedRow?.details?.plantID && selectedRow?.details?.plantSubtypeID) {
      getSlots(selectedRow?.details?.plantID, selectedRow?.details?.plantSubtypeID)
    }
  }, [selectedRow])
  const debouncedSearch = React.useCallback(
    debounce((searchValue) => {
      setDebouncedSearchTerm(searchValue)
    }, 500), // 500ms delay
    [] // Empty dependency array to ensure the debounced function doesn't change
  )
  const handleSearchChange = (val) => {
    setSearchTerm(val)
    debouncedSearch(val)
  }
  const getTotalPaidAmount = (payments) => {
    return payments.reduce(
      (total, payment) => total + (payment?.paymentStatus == "COLLECTED" ? payment.paidAmount : 0),
      0
    )
  }
  React.useEffect(() => {
    // Cleanup the debounced function when component unmounts
    return () => {
      debouncedSearch.cancel()
    }
  }, [debouncedSearch])

  const getSlots = async (plantId, subtypeId) => {
    // Handle form submission
    try {
      //setLoading(true)

      const instance = NetworkManager(API.ORDER.GET_SLOTS)
      const emps = await instance.request(
        {},
        { plantId: plantId, subtypeId: subtypeId, year: "2025" }
      )
      let apiSlots = emps?.data?.slots[0].slots
      if (emps.data) {
        const data = apiSlots?.filter((slot) => slot?.status)
        setSlots(
          data
            ?.map((district) => {
              const { startDay, endDay, totalBookedPlants, totalPlants, status, _id } =
                district || {}
              const start = moment(startDay, "DD-MM-YYYY").format("D")
              const end = moment(endDay, "DD-MM-YYYY").format("D")
              const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")
              if (!status) {
                return
              }
              return {
                label: `${start} - ${end} ${monthYear} (${totalPlants})`,
                value: _id,
                available: totalPlants - totalBookedPlants
              }
            })
            .filter((data) => data?.available)
        )
      }
    } catch (error) {
      // console.log(error)
      // Alert.alert("Error", errorMessage)
    } finally {
      //setLoading(false)
    }
  }

  const getOrders = async () => {
    setLoading(true)
    const date = new Date(startDate)
    const formattedStartDate = moment(date).format("DD-MM-YYYY")
    const edate = new Date(endDate)
    const formattedEndtDate = moment(edate).format("DD-MM-YYYY")
    const instance = slotId
      ? NetworkManager(API.ORDER.GET_ORDERS_SLOTS)
      : NetworkManager(API.ORDER.GET_ORDERS)
    const params = {
      search: debouncedSearchTerm,
      startDate: formattedStartDate,
      endDate: formattedEndtDate,
      dispatched: viewMode === "booking" ? false : true
    }

    if (viewMode === "dispatched") {
      params.status = "ACCEPTED,FARM_READY"
    }

    if (viewMode === "farmready") {
      params.status = "FARM_READY"
    }
    if (viewMode === "farmready" || viewMode === "dispatch_process") {
      params.startDate = null
    }

    if (viewMode === "farmready" || viewMode === "dispatch_process") {
      params.endDate = null
    }
    if (viewMode === "farmready") {
      params.status = "FARM_READY"
    }
    if (viewMode === "dispatch_process") {
      params.status = "DISPATCH_PROCESS"
    }
    if (viewMode === "dispatch_process") {
      params.dispatched = false
    }
    console.log(params)

    const emps = slotId
      ? await instance.request({}, { slotId, monthName, startDay, endDay })
      : await instance.request({}, params)

    setOrders(
      emps?.data?.data?.map((data) => {
        const {
          farmer,
          //   typeOfPlants,
          numberOfPlants,
          rate,
          salesPerson,
          createdAt,
          orderStatus,
          id,
          payment,
          bookingSlot,
          orderId,
          plantType,
          plantSubtype,
          remainingPlants,
          returnedPlants,
          statusChanges,
          orderRemarks,
          dealerOrder,
          farmReadyDate
        } = data || {}
        const { startDay, endDay } = bookingSlot[0] || {}
        const start = moment(startDay, "DD-MM-YYYY").format("D")
        const end = moment(endDay, "DD-MM-YYYY").format("D")
        const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")
        return {
          order: orderId,
          farmerName: dealerOrder ? `via ${salesPerson?.name}` : farmer?.name,
          plantType: `${plantType?.name} -> ${plantSubtype?.name}`,
          quantity: numberOfPlants,
          orderDate: moment(createdAt).format("DD/MM/YYYY"),
          rate,
          total: `₹ ${Number(rate * numberOfPlants)}`,
          "Paid Amt": `₹ ${Number(getTotalPaidAmount(payment))}`,
          "remaining Amt": `₹ ${
            Number(rate * numberOfPlants) - Number(getTotalPaidAmount(payment))
          }`,
          "remaining Plants": remainingPlants || numberOfPlants,
          "returned Plants": returnedPlants || 0,
          orderStatus: orderStatus,
          Delivery: `${start} - ${end} ${monthYear}`,
          "Farm Ready":
            farmReadyDate && farmReadyDate.length > 0
              ? moment(farmReadyDate[0]).format("DD-MMM-YYYY")
              : "-",
          details: {
            farmer,
            contact: farmer?.mobileNumber,
            orderNotes: "Premium quality seed potatoes",
            soilType: "Sandy loam",
            irrigationType: "Sprinkler system",
            lastDelivery: "2024-11-05",
            payment,
            orderid: id,
            salesPerson,
            plantID: plantType?.id,
            plantSubtypeID: plantSubtype?.id,
            bookingSlot: bookingSlot[0],
            rate: rate,
            numberOfPlants,

            statusChanges: statusChanges || [],
            orderRemarks: orderRemarks || [],
            deliveryChanges: data.deliveryChanges || [],
            returnHistory: data?.returnHistory || [],
            dealerOrder: dealerOrder || faHourglassEmpty,
            farmReadyDate: farmReadyDate
          }
        }
      })
    )
    setLoading(false)

    // setEmployees(emps?.data?.data)
  }
  const pacthOrders = async (patchObj, row) => {
    setpatchLoading(true)

    try {
      // Handle Date objects for farmReadyDate
      const dataToSend = { ...patchObj }

      // If updating farmReadyDate specifically

      const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
      const emps = await instance.request({
        ...dataToSend,
        numberOfPlants: dataToSend?.quantity
      })

      console.log(emps)
      refreshComponent()

      if (emps?.error) {
        Toast.error(emps?.error)
        setpatchLoading(false)
        return
      }

      if (emps?.data?.status === "Success") {
        // Your existing code for handling success
        if (dataToSend?.orderStatus === "ACCEPTED") {
          // Your existing WATI template code
        }
        setEditingRows(new Set())
        setUpdatedObject(null)
        getOrders()
      }
    } catch (error) {
      console.error("Error updating order:", error)
      Toast.error("Failed to update order")
    } finally {
      setpatchLoading(false)
    }
  }
  const saveEditedRow = (index, row) => {
    pacthOrders(
      {
        id: row?.details?.orderid,
        ...updatedObject
      },
      row
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-700"
      case "PENDING":
        return "bg-yellow-100 text-yellow-700"
      case "REJECTED":
      case "CANCELLED":
        return "bg-red-100 text-red-700"
      case "DISPATCHED":
      case "PROCESSING":
        return "bg-blue-100 text-blue-700"
      case "COMPLETED":
        return "bg-gray-100 text-gray-700"
      case "PARTIALLY_COMPLETED":
        return "bg-indigo-100 text-indigo-700"
      case "FARM_READY":
        return "bg-amber-100 text-amber-700"
      case "DISPATCH_PROCESS":
        return "bg-cyan-100 text-cyan-700"
      default:
        return "bg-gray-50 text-gray-600"
    }
  }
  console.log(updatedObject)
  const toggleEditing = (index, row) => {
    // console.log(row)
    setSelectedRow(row)
    setUpdatedObject({
      rate: row?.rate,
      quantity: row?.quantity,
      bookingSlot: row?.details?.bookingSlot?.slotId
    })
    // setSelectedRow(row)
    const newEditingRows = new Set(editingRows)
    if (newEditingRows.has(index)) {
      newEditingRows.delete(index)
    } else {
      newEditingRows.add(index)
    }
    setEditingRows(newEditingRows)
  }
  const handleInputChange = (index, key, value) => {
    //const newData = [...orders]
    // newData[index][key] = value
    //  setData(newData)
    setUpdatedObject({ ...updatedObject, [key]: value })
  }

  const refreshComponent = () => {
    setRefresh(!refresh)
  }
  const cancelEditing = (index) => {
    const newEditingRows = new Set(editingRows)
    newEditingRows.delete(index)
    setEditingRows(newEditingRows)
    setUpdatedObject(null)
    setSelectedRow(null)
  }

  return (
    <div className="w-full p-4 bg-gray-50">
      {(loading || patchLoading) && <PageLoader />}

      {/* Header Controls */}
      <div className="mb-6 space-y-4">
        {/* Date range picker and search box */}
        <div className="flex flex-col lg:flex-row gap-4">
          {!slotId && (
            <div className="flex-1">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setSelectedDateRange(update)}
                isClearable={true}
                placeholderText="Select date range"
                className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                calendarClassName="custom-datepicker"
              />
            </div>
          )}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* View mode toggle buttons */}
        <div className="flex flex-wrap gap-2">
          <div className="inline-flex items-center bg-white rounded-lg p-1 shadow-sm border">
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === "booking"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              onClick={() => setViewMode("booking")}>
              All Orders
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === "dispatched"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              onClick={() => setViewMode("dispatched")}>
              To Dispatch
            </button>
            <button
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                viewMode === "farmready"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              onClick={() => setViewMode("farmready")}>
              Ready
            </button>
            {isDispatchtab && (
              <button
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  viewMode === "dispatch_process"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                } animate-pulse`}
                onClick={() => setViewMode("dispatch_process")}>
                Loading
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dispatch list component */}
      <DispatchList setisDispatchtab={setisDispatchtab} viewMode={viewMode} refresh={refresh} />

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {(orders || []).map((row, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer ${
              row?.details?.payment.some((payment) => payment.paymentStatus === "PENDING")
                ? "animate-pulse border-amber-200"
                : ""
            } ${row?.details?.dealerOrder ? "border-sky-200 bg-sky-50" : ""}`}
            onClick={() => {
              setSelectedOrder(row)
              setIsOrderModalOpen(true)
            }}>
            {/* Card Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm">Order #{row.order}</h3>
                  <p className="text-xs text-gray-500 mt-1">{row.farmerName}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {viewMode === "farmready" && (
                    <input
                      type="checkbox"
                      onChange={() => toggleRowSelection(row.details.orderid, row)}
                      checked={selectedRows.has(row.details.orderid)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  )}
                  <DownloadPDFButton order={row} />
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <select
                  disabled={
                    row.orderStatus === "DISPATCH_PROCESS" || row.orderStatus === "COMPLETED"
                  }
                  value={row.orderStatus}
                  onChange={(e) => {
                    if (
                      e.target.value === "DISPATCH_PROCESS" ||
                      e.target.value === "DISPATCHED" ||
                      e.target.value === "COMPLETED"
                    ) {
                      Toast.info("This status cant be change directly")
                      return
                    }
                    pacthOrders(
                      {
                        id: row?.details?.orderid,
                        orderStatus: e.target.value
                      },
                      row
                    )
                  }}
                  className={`${getStatusColor(
                    row.orderStatus
                  )} px-2 py-1 rounded-full text-xs font-medium focus:outline-none`}>
                  {orderStatusOptions.map((option) => (
                    <option key={option?.value} value={option?.value}>
                      {option?.label}
                    </option>
                  ))}
                </select>

                {row.orderStatus === "ACCEPTED" && (
                  <FarmReadyButton
                    orderId={row.details.orderid}
                    onUpdateOrder={pacthOrders}
                    refreshOrders={refreshComponent}
                  />
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
              {/* Plant Info */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Plant Type</span>
                <span className="text-sm font-medium text-gray-900">{row.plantType}</span>
              </div>

              {/* Quantity & Rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500">Quantity</span>
                  <div className="text-sm font-medium text-gray-900">{row.quantity}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Rate</span>
                  <div className="text-sm font-medium text-gray-900">₹{row.rate}</div>
                </div>
              </div>

              {/* Financial Info */}
              <div className="bg-gray-50 rounded-md p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Total</span>
                  <span className="text-sm font-semibold text-gray-900">{row.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Paid</span>
                  <span className="text-sm text-green-600">{row["Paid Amt"]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Remaining</span>
                  <span className="text-sm text-amber-600">{row["remaining Amt"]}</span>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Delivery</span>
                <span className="text-sm font-medium text-blue-600">{row.Delivery}</span>
              </div>

              {/* Farm Ready Date */}
              {row["Farm Ready"] !== "-" && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Farm Ready</span>
                  <span className="text-sm font-medium text-amber-600">{row["Farm Ready"]}</span>
                </div>
              )}

              {/* Action Buttons */}
              {viewMode !== "dispatch_process" &&
                row?.orderStatus !== "COMPLETED" &&
                row?.orderStatus !== "DISPATCH_PROCESS" &&
                row?.orderStatus !== "DISPATCHED" && (
                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                    {editingRows.has(index) ? (
                      <>
                        <button
                          onClick={() => saveEditedRow(index, row)}
                          className="text-green-500 hover:text-green-700">
                          <CheckIcon size={16} />
                        </button>
                        <button
                          onClick={() => cancelEditing(index)}
                          className="text-red-500 hover:text-red-700">
                          <XIcon size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => toggleEditing(index, row)}
                        className="text-gray-500 hover:text-gray-700">
                        <Edit2Icon size={16} />
                      </button>
                    )}
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Fixed bottom bar for batch actions */}
      {viewMode !== "booking" && selectedRows.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm py-4 border-t shadow-lg z-50">
          <div className="flex justify-between items-center max-w-7xl mx-auto px-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {selectedRows.size} {selectedRows.size === 1 ? "order" : "orders"} selected
              </span>
            </div>
            <button
              onClick={() => setIsDispatchFormOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <span>Proceed to Dispatch</span>
            </button>
          </div>
        </div>
      )}

      {/* Dispatch form modal */}
      {isDispatchFormOpen && (
        <DispatchForm
          open={isDispatchFormOpen}
          onClose={() => {
            setIsDispatchFormOpen(false)
            setSelectedRows(new Set())
            getOrders()
          }}
          selectedOrders={selectedRows}
          orders={orders}
        />
      )}

      {/* Order Details Modal */}
      {isOrderModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Order #{selectedOrder.order}</h2>
                  <p className="text-blue-100 mt-1">
                    {selectedOrder.farmerName} • {selectedOrder.plantType}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={refreshModalData}
                    className="text-white hover:text-blue-100 transition-colors p-1 rounded hover:bg-white hover:bg-opacity-10">
                    <RefreshCw size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setIsOrderModalOpen(false)
                      setSelectedOrder(null)
                      setShowPaymentForm(false)
                      setNewPayment({
                        paidAmount: "",
                        paymentDate: moment().format("YYYY-MM-DD"),
                        modeOfPayment: "",
                        bankName: "",
                        remark: "",
                        receiptPhoto: []
                      })
                    }}
                    className="text-white hover:text-blue-100 transition-colors">
                    <XIcon size={28} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
              <div className="p-6">
                {/* Order Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="text-blue-600 text-sm font-medium">Total Value</div>
                    <div className="text-2xl font-bold text-blue-900">
                      ₹{selectedOrder.rate * selectedOrder.quantity}
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <div className="text-green-600 text-sm font-medium">Paid Amount</div>
                    <div className="text-2xl font-bold text-green-900">
                      ₹{getTotalPaidAmount(selectedOrder?.details?.payment)}
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <div className="text-amber-600 text-sm font-medium">Remaining</div>
                    <div className="text-2xl font-bold text-amber-900">
                      ₹
                      {selectedOrder.rate * selectedOrder.quantity -
                        getTotalPaidAmount(selectedOrder?.details?.payment)}
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <div className="text-purple-600 text-sm font-medium">Status</div>
                    <div className="text-lg font-bold text-purple-900">
                      {selectedOrder.orderStatus}
                    </div>
                  </div>
                </div>

                {/* Main Content Tabs */}
                <div className="bg-white rounded-lg border">
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6" aria-label="Tabs">
                      <button
                        onClick={() => setActiveTab("overview")}
                        className={`inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "overview"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaUser size={16} className="mr-2" />
                        Overview
                      </button>
                      <button
                        onClick={() => setActiveTab("payments")}
                        className={`inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "payments"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaCreditCard size={16} className="mr-2" />
                        Payments
                      </button>
                      <button
                        onClick={() => setActiveTab("edit")}
                        className={`inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "edit"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaEdit size={16} className="mr-2" />
                        Edit Order
                      </button>
                      <button
                        onClick={() => setActiveTab("remarks")}
                        className={`inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === "remarks"
                            ? "border-blue-500 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        }`}>
                        <FaFileAlt size={16} className="mr-2" />
                        Remarks
                      </button>
                    </nav>
                  </div>

                  {/* Tab Content */}
                  <div className="p-6">
                    {activeTab === "overview" && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-3">Farmer Information</h3>
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm text-gray-500">Name:</span>
                                <span className="ml-2 font-medium">
                                  {selectedOrder?.details?.farmer?.name}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Village:</span>
                                <span className="ml-2 font-medium">
                                  {selectedOrder?.details?.farmer?.village}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-3">Sales Person</h3>
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm text-gray-500">Name:</span>
                                <span className="ml-2 font-medium">
                                  {selectedOrder?.details?.salesPerson?.name}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500">Contact:</span>
                                <span className="ml-2 font-medium">
                                  {selectedOrder?.details?.salesPerson?.phoneNumber}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-medium text-gray-900 mb-3">Order Details</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <span className="text-sm text-gray-500">Plant Type:</span>
                              <div className="font-medium">{selectedOrder.plantType}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Quantity:</span>
                              <div className="font-medium">{selectedOrder.quantity}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Rate per Plant:</span>
                              <div className="font-medium">₹{selectedOrder.rate}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Delivery:</span>
                              <div className="font-medium">{selectedOrder.Delivery}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Order Date:</span>
                              <div className="font-medium">{selectedOrder.orderDate}</div>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">Farm Ready:</span>
                              <div className="font-medium">{selectedOrder["Farm Ready"]}</div>
                            </div>
                          </div>
                        </div>

                        {/* Farm Ready History */}
                        {selectedOrder?.details?.farmReadyDate &&
                          selectedOrder?.details?.farmReadyDate.length > 0 && (
                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                              <h3 className="font-medium text-amber-900 mb-3 flex items-center">
                                <span className="mr-2">🌾</span>
                                Farm Ready History
                              </h3>
                              <div className="space-y-2">
                                {selectedOrder.details.farmReadyDate.map((date, index) => (
                                  <div
                                    key={index}
                                    className={`flex items-center justify-between p-2 rounded ${
                                      index === 0 ? "bg-amber-100" : "bg-white"
                                    }`}>
                                    <span className="text-sm font-medium">
                                      {moment(date).format("DD MMMM, YYYY")}
                                    </span>
                                    {index === 0 && (
                                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                                        Latest
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Status History */}
                        {selectedOrder?.details?.statusChanges &&
                          selectedOrder?.details?.statusChanges.length > 0 && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                              <h3 className="font-medium text-blue-900 mb-3 flex items-center">
                                <span className="mr-2">📊</span>
                                Status Change History
                              </h3>
                              <div className="space-y-2">
                                {selectedOrder.details.statusChanges.map((change, index) => (
                                  <div key={index} className="bg-white p-3 rounded border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-sm font-medium text-gray-900">
                                        {change.fromStatus} → {change.toStatus}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {moment(change.changedAt).format("DD/MM/YYYY HH:mm")}
                                      </span>
                                    </div>
                                    {change.changedBy && (
                                      <div className="text-xs text-gray-600">
                                        Changed by: {change.changedBy.name}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Delivery Changes */}
                        {selectedOrder?.details?.deliveryChanges &&
                          selectedOrder?.details?.deliveryChanges.length > 0 && (
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                              <h3 className="font-medium text-green-900 mb-3 flex items-center">
                                <span className="mr-2">🚚</span>
                                Delivery Change History
                              </h3>
                              <div className="space-y-3">
                                {selectedOrder.details.deliveryChanges.map((change, index) => {
                                  const prevStartDay = change.previousDeliveryDate?.startDay
                                  const prevEndDay = change.previousDeliveryDate?.endDay
                                  const prevMonth = change.previousDeliveryDate?.month
                                  const prevYear = change.previousDeliveryDate?.year

                                  const newStartDay = change.newDeliveryDate?.startDay
                                  const newEndDay = change.newDeliveryDate?.endDay
                                  const newMonth = change.newDeliveryDate?.month
                                  const newYear = change.newDeliveryDate?.year

                                  return (
                                    <div key={index} className="bg-white p-3 rounded border">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-900">
                                          Delivery Changed
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {moment(change.changedAt).format("DD/MM/YYYY")}
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                        <div className="bg-red-50 px-3 py-2 rounded-md">
                                          <span className="text-red-500 line-through text-sm">
                                            {prevStartDay} - {prevEndDay} {prevMonth} {prevYear}
                                          </span>
                                        </div>
                                        <div className="flex justify-center">
                                          <span className="text-gray-400">→</span>
                                        </div>
                                        <div className="bg-green-50 px-3 py-2 rounded-md">
                                          <span className="text-green-600 font-medium text-sm">
                                            {newStartDay} - {newEndDay} {newMonth} {newYear}
                                          </span>
                                        </div>
                                      </div>
                                      {change.reasonForChange && (
                                        <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                                          <span className="font-medium">Reason:</span>{" "}
                                          {change.reasonForChange}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                        {/* Return History */}
                        {selectedOrder?.details?.returnHistory &&
                          selectedOrder?.details?.returnHistory.length > 0 && (
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                              <h3 className="font-medium text-red-900 mb-3 flex items-center">
                                <span className="mr-2">🔄</span>
                                Plant Return History
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Total Plants</div>
                                  <div className="text-xl font-bold text-gray-900">
                                    {selectedOrder.quantity}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Returned Plants</div>
                                  <div className="text-xl font-bold text-red-600">
                                    {selectedOrder["returned Plants"]}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-500">Remaining Plants</div>
                                  <div className="text-xl font-bold text-green-600">
                                    {selectedOrder["remaining Plants"]}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {selectedOrder.details.returnHistory.map(
                                  (returnItem, returnIndex) => (
                                    <div key={returnIndex} className="bg-white p-3 rounded border">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-medium text-red-600">
                                          {returnItem.quantity} plants returned
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          {returnItem.date
                                            ? moment(returnItem.date).format("DD/MM/YYYY")
                                            : "N/A"}
                                        </span>
                                      </div>
                                      {returnItem.reason && (
                                        <div className="text-sm text-gray-600">
                                          <span className="font-medium">Reason:</span>{" "}
                                          {returnItem.reason}
                                        </div>
                                      )}
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {returnItem.dispatchId && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Dispatch ID: {returnItem.dispatchId}
                                          </span>
                                        )}
                                        {returnItem.processedBy && (
                                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                            Processed by: {returnItem.processedBy.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {activeTab === "payments" && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-gray-900">Payment Management</h3>
                          <button
                            onClick={() => setShowPaymentForm(!showPaymentForm)}
                            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors">
                            {showPaymentForm ? "Cancel" : "+ Add Payment"}
                          </button>
                        </div>

                        {showPaymentForm && (
                          <div className="bg-gray-50 rounded-lg p-6 border">
                            <h4 className="font-medium text-gray-900 mb-4">Add New Payment</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Amount (₹)
                                </label>
                                <input
                                  type="number"
                                  value={newPayment.paidAmount}
                                  onChange={(e) =>
                                    handlePaymentInputChange("paidAmount", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                                  placeholder="Enter amount"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Payment Date
                                </label>
                                <input
                                  type="date"
                                  value={newPayment.paymentDate}
                                  onChange={(e) =>
                                    handlePaymentInputChange("paymentDate", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Payment Mode
                                </label>
                                <select
                                  value={newPayment.modeOfPayment}
                                  onChange={(e) =>
                                    handlePaymentInputChange("modeOfPayment", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1">
                                  <option value="">Select Mode</option>
                                  <option value="Cash">Cash</option>
                                  <option value="Phone Pe">Phone Pe</option>
                                  <option value="Google Pay">Google Pay</option>
                                  <option value="Cheque">Cheque</option>
                                  <option value="JPCB">JPCB</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-sm text-gray-500 font-medium">
                                  Bank Name
                                </label>
                                <input
                                  type="text"
                                  value={newPayment.bankName}
                                  onChange={(e) =>
                                    handlePaymentInputChange("bankName", e.target.value)
                                  }
                                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                                  placeholder={
                                    newPayment.modeOfPayment === "Cheque"
                                      ? "Enter bank name"
                                      : "N/A"
                                  }
                                  disabled={newPayment.modeOfPayment !== "Cheque"}
                                />
                              </div>
                            </div>
                            <div className="mt-4">
                              <label className="text-sm text-gray-500 font-medium">Remark</label>
                              <input
                                type="text"
                                value={newPayment.remark}
                                onChange={(e) => handlePaymentInputChange("remark", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                                placeholder="Optional remark"
                              />
                            </div>
                            <div className="flex items-center justify-end space-x-2 mt-4">
                              <button
                                onClick={() => setShowPaymentForm(false)}
                                className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">
                                Cancel
                              </button>
                              <button
                                onClick={() => handleAddPayment(selectedOrder.details.orderid)}
                                disabled={!newPayment.paidAmount || !newPayment.modeOfPayment}
                                className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                Add Payment
                              </button>
                            </div>
                          </div>
                        )}

                        {selectedOrder?.details?.payment &&
                          selectedOrder?.details?.payment.length > 0 && (
                            <div className="bg-white rounded-lg border">
                              <div className="p-4 border-b">
                                <h4 className="font-medium text-gray-900">Payment History</h4>
                              </div>
                              <div className="divide-y">
                                {selectedOrder.details.payment.map((payment, pIndex) => (
                                  <div key={pIndex} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-4">
                                        <div className="text-lg font-semibold text-gray-900">
                                          ₹{payment.paidAmount}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {payment.modeOfPayment}
                                        </div>
                                        <span
                                          className={`px-2 py-1 text-xs rounded-full ${
                                            payment.paymentStatus === "COLLECTED"
                                              ? "bg-green-100 text-green-700"
                                              : "bg-amber-100 text-amber-700"
                                          }`}>
                                          {payment.paymentStatus}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        {moment(payment.paymentDate).format("DD/MM/YYYY")}
                                      </div>
                                    </div>
                                    {payment.remark && (
                                      <div className="mt-2 text-sm text-gray-600">
                                        Remark: {payment.remark}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {activeTab === "edit" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Edit Order Details</h3>
                        <div className="bg-gray-50 rounded-lg p-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                              <label className="text-sm text-gray-500 font-medium">Rate (₹)</label>
                              <input
                                type="number"
                                value={updatedObject?.rate || selectedOrder?.rate}
                                onChange={(e) => handleInputChange(0, "rate", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-gray-500 font-medium">Quantity</label>
                              <input
                                type="number"
                                value={updatedObject?.quantity || selectedOrder?.quantity}
                                onChange={(e) => handleInputChange(0, "quantity", e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm text-gray-500 font-medium">
                                Delivery Slot
                              </label>
                              <Select
                                value={
                                  updatedObject?.bookingSlot ||
                                  selectedOrder?.details?.bookingSlot?.slotId
                                }
                                onChange={(e) =>
                                  setUpdatedObject({
                                    ...updatedObject,
                                    bookingSlot: e.target.value
                                  })
                                }
                                className="w-full mt-1">
                                <MenuItem value="">Select Slot</MenuItem>
                                {slots.map(({ label, value }) => (
                                  <MenuItem key={value} value={value}>
                                    {label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </div>
                          </div>
                          <div className="flex items-center justify-end space-x-2 mt-6">
                            <button
                              onClick={() => {
                                setUpdatedObject(null)
                                setSelectedRow(null)
                              }}
                              className="px-4 py-2 text-gray-600 border rounded-lg hover:bg-gray-50">
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                pacthOrders(
                                  {
                                    id: selectedOrder?.details?.orderid,
                                    ...updatedObject
                                  },
                                  selectedOrder
                                ).then(() => {
                                  // Refresh modal data after successful edit
                                  setTimeout(() => {
                                    refreshModalData()
                                  }, 1000) // Small delay to ensure API call completes
                                })
                              }}
                              className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600">
                              Save Changes
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === "remarks" && (
                      <div className="space-y-6">
                        <h3 className="text-lg font-medium text-gray-900">Order Remarks</h3>

                        {selectedOrder?.details?.orderRemarks &&
                          selectedOrder?.details?.orderRemarks.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-4">
                              <h4 className="font-medium text-gray-900 mb-3">Existing Remarks</h4>
                              <div className="space-y-2">
                                {selectedOrder.details.orderRemarks.map((remark, remarkIndex) => (
                                  <div key={remarkIndex} className="bg-white p-3 rounded border">
                                    <div className="text-sm text-gray-700">{remark}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        <div className="bg-white rounded-lg border p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Add New Remark</h4>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter a new remark..."
                              value={newRemark}
                              onChange={(e) => setNewRemark(e.target.value)}
                              className="flex-grow px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handleAddRemark(selectedOrder.details.orderid)}
                              disabled={!newRemark.trim()}
                              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                              Add Remark
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FarmerOrdersTable
