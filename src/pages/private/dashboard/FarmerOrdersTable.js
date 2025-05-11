import React, { useState, useEffect } from "react"
import { Edit2Icon, CheckIcon, XIcon, FilterIcon, Info } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import moment from "moment"
import debounce from "lodash.debounce" // Optional: Use lodash for debouncing
import { Grid, MenuItem, Select, Popover, Tooltip } from "@mui/material"
import RenderExpandedContent from "./RenderExpandedContent"
import { sendWatiTemplateAxios } from "network/core/wati"
import DownloadPDFButton from "./OrdereRecipt"
import DispatchForm from "./DispatchedForm"
import DispatchList from "./DispatchedList"
import { Toast } from "helpers/toasts/toastHelper"
import { renderOrderRemarks, renderReturnHistory, renderStatusHistory } from "./helpsers"
import FarmReadyButton from "./FarmReadyButton"
const FarmerOrdersTable = ({ slotId, monthName, startDay, endDay }) => {
  const today = new Date()
  const [sorting, setSorting] = useState({ column: null, direction: "asc" })
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
  const [viewMode, setViewMode] = useState("booking") // 'booking' or 'dispatched'
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [selectedOrderStatuses, setSelectedOrderStatuses] = useState([])
  const [anchorEl, setAnchorEl] = useState(null)
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false)
  const [isDispatchtab, setisDispatchtab] = useState(false)
  const [newRemark, setNewRemark] = useState("") // State for new remark input
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
    )

    setNewRemark("")
  }
  const handleFilterClick = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleFilterClose = () => {
    setAnchorEl(null)
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
  }, [debouncedSearchTerm, refresh, startDate, endDate, viewMode, selectedOrderStatuses])

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

    // Add status filter if statuses are selected
    if (selectedOrderStatuses.length > 0) {
      params.status = selectedOrderStatuses.join(",")
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
          dealerOrder
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
            dealerOrder: dealerOrder || false
          }
        }
      })
    )
    setLoading(false)

    // setEmployees(emps?.data?.data)
  }
  const pacthOrders = async (patchObj, row) => {
    setpatchLoading(true)

    const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
    const emps = await instance.request({ ...patchObj, numberOfPlants: patchObj?.quantity })
    console.log(emps)
    refreshComponent()
    if (emps?.error) {
      Toast.error(emps?.error)
      setpatchLoading(false)

      return
    }

    if (emps?.data?.status === "Success") {
      if (patchObj?.orderStatus === "ACCEPTED") {
        sendWatiTemplateAxios(
          {
            requestBody: {
              template_name: "order_accpeted_revamped",
              broadcast_name: "ss",
              parameters: [
                {
                  name: "name",
                  value: row?.farmerName
                },
                {
                  name: "id",
                  value: row?.order
                },
                {
                  name: "village",
                  value: row?.details?.farmer?.village
                },
                {
                  name: "number",
                  value: row?.details?.farmer?.mobileNumber
                },
                {
                  name: "plant",
                  value: row?.plantType.split("->")[0].trim()
                },
                {
                  name: "subtype",
                  value: row?.plantType.split("->")[1].trim()
                },
                {
                  name: "total_booked",
                  value: row?.quantity
                },
                {
                  name: "rate",
                  value: row?.rate
                },
                {
                  name: "total",
                  value: Number(row?.rate) * Number(row?.quantity)
                },
                {
                  name: "advacne",
                  value: getTotalPaidAmount(row?.details?.payment)
                },
                {
                  name: "remaiing",
                  value:
                    Number(row?.rate) * Number(row?.quantity) -
                    getTotalPaidAmount(row?.details?.payment)
                },
                {
                  name: "delivery",
                  value: row?.Delivery
                }
              ]
            }
          },
          `91${row?.details?.farmer?.mobileNumber}`
        )
      }
      setEditingRows(new Set())
      setUpdatedObject(null)
      getOrders()
    }

    setpatchLoading(false)

    // setEmployees(emps?.data?.data)
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

  const handleSort = (column) => {
    setSorting((current) => ({
      column,
      direction: current.column === column && current.direction === "asc" ? "desc" : "asc"
    }))
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
    <div className="w-full p-6 bg-gray-100">
      {(loading || patchLoading) && <PageLoader />}

      {/* Date range picker and search box - updated for responsive layout */}
      <Grid container justifyContent="space-between" alignItems="center" className="mb-6">
        {!slotId && (
          <Grid item xs={12} md={6} className="mb-4 md:mb-0">
            <div className="relative">
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setSelectedDateRange(update)}
                isClearable={true}
                placeholderText="Select date range"
                className="p-3 border rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                calendarClassName="custom-datepicker"
              />
            </div>
          </Grid>
        )}
        <Grid item xs={12} md={6}>
          <div className="flex justify-end">
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full max-w-md p-3 border rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </Grid>
      </Grid>

      {/* View mode toggle buttons */}
      <Grid item xs={12} md={4}>
        <div className="flex justify-start mb-4">
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1 shadow-sm">
            <button
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                viewMode === "booking"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              onClick={() => setViewMode("booking")}>
              All
            </button>

            <button
              className={`px-4 py-1.5 text-xs font-medium rounded-md ml-1 transition-all duration-200 ${
                viewMode === "dispatched"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              onClick={() => setViewMode("dispatched")}>
              To be Dispatched
            </button>
            <button
              className={`px-4 py-1.5 text-xs font-medium rounded-md ml-1 transition-all duration-200 ${
                viewMode === "farmready"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
              onClick={() => setViewMode("farmready")}>
              Ready To Dispatch
            </button>
            {isDispatchtab && (
              <button
                className={`px-4 py-1.5 text-xs font-medium rounded-md ml-1 transition-all duration-200 
      ${
        viewMode === "dispatch_process"
          ? "bg-white text-blue-600 shadow-sm"
          : "text-gray-600 hover:text-gray-800"
      }
      ${"animate-pulse bg-green-100"}
    `}
                onClick={() => setViewMode("dispatch_process")}>
                Loading
              </button>
            )}
          </div>
        </div>
      </Grid>

      {/* Dispatch list component */}
      {
        <DispatchList
          setisDispatchtab={setisDispatchtab}
          viewMode={viewMode}
          refresh={refresh} // Pass refresh state as prop
        />
      }

      {/* Responsive table with proper overflow handling */}
      <div className="overflow-hidden">
        <div className="overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 sm:px-6 lg:px-8">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse bg-white rounded-lg shadow-md table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    {viewMode === "farmready" && (
                      <th className="w-10 px-6 py-3">
                        <div className="relative inline-block">
                          <input
                            type="checkbox"
                            onChange={toggleSelectAll}
                            checked={selectedRows.size === orders.length && orders.length > 0}
                            className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-600 
                                   checked:bg-blue-600 checked:border-blue-600
                                   hover:border-blue-500 cursor-pointer transition-colors
                                   focus:ring-2 focus:ring-blue-200 focus:ring-offset-0"
                          />
                        </div>
                      </th>
                    )}
                    <th className="w-10 px-6 py-3"></th>
                    {Object.keys(orders[0] || {})
                      .filter((key) => key !== "details")
                      .map((column) => (
                        <th
                          key={column}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => handleSort(column)}>
                          <div className="flex items-center space-x-1">
                            <span>{column.charAt(0).toUpperCase() + column.slice(1)}</span>
                            {sorting.column === column && (
                              <span className="text-gray-400">
                                {sorting.direction === "asc" ? "▲" : "▼"}
                              </span>
                            )}
                          </div>
                          {column === "orderStatus" && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleFilterClick(e)
                                }}
                                className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                                <FilterIcon
                                  size={14}
                                  className={
                                    selectedOrderStatuses.length > 0
                                      ? "text-blue-500"
                                      : "text-gray-500"
                                  }
                                />
                              </button>
                              <Popover
                                open={Boolean(anchorEl)}
                                anchorEl={anchorEl}
                                onClose={handleFilterClose}
                                anchorOrigin={{
                                  vertical: "bottom",
                                  horizontal: "right"
                                }}
                                transformOrigin={{
                                  vertical: "top",
                                  horizontal: "right"
                                }}>
                                <div className="p-4 w-64">
                                  <div className="mb-2 font-medium text-sm text-gray-700">
                                    Filter by Status
                                  </div>
                                  {orderStatusOptions.map((status) => (
                                    <div key={status.value} className="flex items-center mb-2">
                                      <input
                                        type="checkbox"
                                        id={status.value}
                                        checked={selectedOrderStatuses.includes(status?.value)}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedOrderStatuses([
                                              ...selectedOrderStatuses,
                                              status?.value
                                            ])
                                          } else {
                                            setSelectedOrderStatuses(
                                              selectedOrderStatuses.filter(
                                                (s) => s !== status?.value
                                              )
                                            )
                                          }
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      />
                                      <label
                                        htmlFor={status.value}
                                        className="ml-2 text-sm text-gray-600">
                                        <span
                                          className={`${getStatusColor(
                                            status?.value
                                          )} px-2 py-1 rounded-md`}>
                                          {status?.label}
                                        </span>
                                      </label>
                                    </div>
                                  ))}
                                  {selectedOrderStatuses.length > 0 && (
                                    <button
                                      onClick={() => setSelectedOrderStatuses([])}
                                      className="mt-2 text-xs text-gray-500 hover:text-gray-700">
                                      Clear filters
                                    </button>
                                  )}
                                </div>
                              </Popover>
                            </>
                          )}{" "}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((row, index) => (
                    <React.Fragment key={index}>
                      <tr
                        className={`hover:bg-gray-50 transition-colors ${
                          row?.details?.payment.some(
                            (payment) => payment.paymentStatus === "PENDING"
                          )
                            ? "animate-blink"
                            : ""
                        }  ${
                          row?.details?.dealerOrder
                            ? "bg-sky-50" // Light sky blue background for dealer orders
                            : ""
                        }`}>
                        {viewMode === "farmready" && (
                          <td className="w-10 px-6 py-3">
                            <div className="relative inline-block">
                              <input
                                type="checkbox"
                                onChange={() => toggleRowSelection(row.details.orderid, row)}
                                checked={selectedRows.has(row.details.orderid)}
                                className="w-5 h-5 rounded-md border-2 border-gray-300 text-blue-600 
                                   checked:bg-blue-600 checked:border-blue-600
                                   hover:border-blue-500 cursor-pointer transition-colors
                                   focus:ring-2 focus:ring-blue-200 focus:ring-offset-0"
                              />
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => toggleRow(index)}
                            className="text-gray-500 hover:text-gray-700 focus:outline-none">
                            {expandedRows.has(index) ? "▼" : "▶"}
                          </button>
                          <DownloadPDFButton order={row} />
                        </td>
                        {Object.entries(row)
                          .filter(([key]) => key !== "details")
                          .map(([key, value]) => {
                            return (
                              <td
                                key={key}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 truncate-cell">
                                {key === "orderStatus" ? (
                                  <div className="flex items-center">
                                    <Tooltip
                                      title={renderStatusHistory(row.details.statusChanges)}
                                      placement="right"
                                      arrow
                                      PopperProps={{
                                        sx: {
                                          "& .MuiTooltip-tooltip": {
                                            backgroundColor: "white",
                                            color: "rgba(0, 0, 0, 0.87)",
                                            boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.2)",
                                            padding: 0,
                                            maxWidth: "none"
                                          },
                                          "& .MuiTooltip-arrow": {
                                            color: "white"
                                          }
                                        }
                                      }}>
                                      <select
                                        disabled={
                                          value === "DISPATCH_PROCESS" || value === "COMPLETED"
                                        }
                                        value={value}
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
                                          value
                                        )} px-3 py-1 rounded-md text-sm focus:outline-none`}>
                                        {orderStatusOptions.map((option) => (
                                          <option key={option?.value} value={option?.value}>
                                            {option?.label}
                                          </option>
                                        ))}
                                      </select>
                                    </Tooltip>
                                    <span className="ml-1 cursor-pointer text-blue-500">
                                      <Info size={16} />
                                    </span>
                                  </div>
                                ) : key === "Delivery" && editingRows.has(index) ? (
                                  <Select
                                    value={
                                      updatedObject["bookingSlot"] ||
                                      row?.details?.bookingSlot?.slotId
                                    }
                                    label="Filter by Job Title"
                                    onChange={(e) =>
                                      setUpdatedObject({
                                        ...updatedObject,
                                        bookingSlot: e.target.value
                                      })
                                    }>
                                    <MenuItem value="">All</MenuItem>
                                    {slots.map(({ label, value }) => (
                                      <MenuItem key={value} value={value}>
                                        {label}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                ) : editingRows.has(index) &&
                                  (key === "rate" ||
                                    key === "quantity" ||
                                    key === "expectedDeliveryDate") ? (
                                  <input
                                    type={key === "expectedDeliveryDate" ? "date" : "number"}
                                    value={updatedObject[key]}
                                    onChange={(e) => handleInputChange(index, key, e.target.value)}
                                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                ) : key.includes("amount") ||
                                  key.includes("rate") ||
                                  key.includes("advance") ? (
                                  `₹${Number(value).toFixed(2)}`
                                ) : key === "returned Plants" ? (
                                  <div className="flex items-center">
                                    {value}
                                    {row.details.returnHistory &&
                                      row.details.returnHistory.length > 0 && (
                                        <Tooltip
                                          title={renderReturnHistory(row.details.returnHistory)}
                                          placement="right"
                                          arrow
                                          PopperProps={{
                                            sx: {
                                              "& .MuiTooltip-tooltip": {
                                                backgroundColor: "white",
                                                color: "rgba(0, 0, 0, 0.87)",
                                                boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.2)",
                                                padding: 0,
                                                maxWidth: "none"
                                              },
                                              "& .MuiTooltip-arrow": {
                                                color: "white"
                                              }
                                            }
                                          }}>
                                          <span className="ml-1 cursor-pointer text-blue-500">
                                            <Info size={16} />
                                          </span>
                                        </Tooltip>
                                      )}
                                  </div>
                                ) : (
                                  <div className="flex items-center">
                                    {value}
                                    {key === "order" &&
                                      row.details.orderRemarks &&
                                      row.details.orderRemarks.length > 0 && (
                                        <Tooltip
                                          title={renderOrderRemarks(row.details.orderRemarks)}
                                          placement="right"
                                          arrow
                                          PopperProps={{
                                            sx: {
                                              "& .MuiTooltip-tooltip": {
                                                backgroundColor: "white",
                                                color: "rgba(0, 0, 0, 0.87)",
                                                boxShadow: "0px 2px 10px rgba(0, 0, 0, 0.2)",
                                                padding: 0,
                                                maxWidth: "none"
                                              },
                                              "& .MuiTooltip-arrow": {
                                                color: "white"
                                              }
                                            }
                                          }}>
                                          <span className="ml-1 cursor-pointer text-amber-500">
                                            <Info size={16} />
                                          </span>
                                        </Tooltip>
                                      )}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        {viewMode !== "dispatch_process" &&
                          row?.orderStatus !== "COMPLETED" &&
                          row?.orderStatus !== "DISPATCH_PROCESS" &&
                          row?.orderStatus !== "DISPATCHED" && (
                            <td className="px-6 py-4 text-right">
                              {editingRows.has(index) ? (
                                <div className="flex flex-col">
                                  <div className="flex mb-2">
                                    <button
                                      onClick={() => saveEditedRow(index, row)}
                                      className="text-green-500 hover:text-green-700 focus:outline-none mr-2">
                                      <CheckIcon size={16} />
                                    </button>
                                    <button
                                      onClick={() => cancelEditing(index)}
                                      className="text-red-500 hover:text-red-700 focus:outline-none">
                                      <XIcon size={16} />
                                    </button>
                                  </div>

                                  {/* Add remark while editing */}
                                  <div className="flex items-center mt-2">
                                    <input
                                      type="text"
                                      placeholder="Add remark..."
                                      value={newRemark}
                                      onChange={(e) => setNewRemark(e.target.value)}
                                      className="w-32 px-2 py-1 text-xs border border-gray-300 rounded mr-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                    <button
                                      onClick={() => {
                                        if (newRemark.trim()) {
                                          handleAddRemark(row.details.orderid)
                                        }
                                      }}
                                      disabled={!newRemark.trim()}
                                      className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                      Add
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => toggleEditing(index, row)}
                                    className="text-gray-500 hover:text-gray-700 focus:outline-none">
                                    <Edit2Icon size={16} />
                                  </button>

                                  {/* Farm Ready button - only show if order is ACCEPTED and not already FARM_READY */}
                                  {row.orderStatus === "ACCEPTED" && (
                                    <FarmReadyButton
                                      orderId={row.details.orderid}
                                      onUpdateOrder={pacthOrders}
                                      refreshOrders={refreshComponent}
                                    />
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                      </tr>
                      {expandedRows.has(index) && (
                        <tr>
                          <td colSpan={Object.keys(row).length + 1}>
                            <div>
                              <RenderExpandedContent
                                farmer={{
                                  name: row?.details?.farmer?.name,
                                  address: `${row?.details?.farmer?.village}`,
                                  contact: "+1234567890"
                                }}
                                salesPerson={{
                                  name: row?.details?.salesPerson?.name,
                                  contact: row?.details?.salesPerson?.phoneNumber
                                }}
                                details={{ payment: row?.details?.payment }}
                                orderId={row?.details?.orderid}
                                getOrders={getOrders}
                                orderDetaisl={row?.details}
                                refreshComponent={refreshComponent}
                              />

                              {/* Returns Section */}
                              {row.details.returnHistory &&
                                row.details.returnHistory.length > 0 && (
                                  <div className="mt-4 border-t pt-4 px-6">
                                    <h3 className="text-lg font-medium text-gray-800 mb-2">
                                      Plant Returns
                                    </h3>
                                    <div className="bg-gray-50 p-4 rounded-md">
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                        <div className="border-r pr-4">
                                          <span className="text-gray-500 text-sm">
                                            Total Plants
                                          </span>
                                          <div className="text-xl font-medium">{row.quantity}</div>
                                        </div>
                                        <div className="border-r pr-4">
                                          <span className="text-gray-500 text-sm">
                                            Returned Plants
                                          </span>
                                          <div className="text-xl font-medium text-amber-600">
                                            {row["returned Plants"]}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-gray-500 text-sm">
                                            Remaining Plants
                                          </span>
                                          <div className="text-xl font-medium text-green-600">
                                            {row["remaining Plants"]}
                                          </div>
                                        </div>
                                      </div>

                                      <h4 className="font-medium text-gray-700 mt-4 mb-2">
                                        Return History:
                                      </h4>
                                      <div className="max-h-40 overflow-y-auto">
                                        {row.details.returnHistory.map(
                                          (returnItem, returnIndex) => (
                                            <div
                                              key={returnIndex}
                                              className="mb-3 p-2 bg-white rounded-md shadow-sm">
                                              <div className="flex justify-between items-start">
                                                <div>
                                                  <span className="font-medium text-amber-600">
                                                    {returnItem.quantity} plants returned
                                                  </span>
                                                </div>
                                                <span className="text-sm text-gray-500">
                                                  {returnItem.date
                                                    ? moment(returnItem.date).format("DD/MM/YYYY")
                                                    : "N/A"}
                                                </span>
                                              </div>
                                              {returnItem.reason && (
                                                <div className="text-sm text-gray-600 mt-1">
                                                  <span className="font-medium">Reason:</span>{" "}
                                                  {returnItem.reason}
                                                </div>
                                              )}
                                              {returnItem.processedBy && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                  Processed by:{" "}
                                                  {returnItem.processedBy.name || "Unknown"}
                                                </div>
                                              )}
                                              {returnItem.dispatchId && (
                                                <div className="text-xs text-gray-500 mt-1">
                                                  Dispatch ID: {returnItem.dispatchId}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              {/* Delivery Changes Section */}
                              {/* Delivery Changes Section */}
                              {row.details.deliveryChanges &&
                                row.details.deliveryChanges.length > 0 && (
                                  <div className="mt-4 border-t pt-4 px-6">
                                    <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
                                      <span className="mr-2">Delivery Changes</span>
                                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {row.details.deliveryChanges.length}
                                      </span>
                                    </h3>
                                    <div className="bg-gray-50 p-4 rounded-md">
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                        <div className="border-r pr-4">
                                          <span className="text-gray-500 text-sm">
                                            Current Delivery
                                          </span>
                                          <div className="text-lg font-medium text-blue-600">
                                            {row.Delivery}
                                          </div>
                                        </div>
                                        <div className="border-r pr-4">
                                          <span className="text-gray-500 text-sm">Changes</span>
                                          <div className="text-lg font-medium text-amber-600">
                                            {row.details.deliveryChanges.length}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-gray-500 text-sm">
                                            Last Changed
                                          </span>
                                          <div className="text-lg font-medium text-green-600">
                                            {row.details.deliveryChanges.length > 0
                                              ? new Date(
                                                  row.details.deliveryChanges[
                                                    row.details.deliveryChanges.length - 1
                                                  ].changedAt
                                                ).toLocaleDateString()
                                              : "N/A"}
                                          </div>
                                        </div>
                                      </div>

                                      <h4 className="font-medium text-gray-700 mt-4 mb-2">
                                        Change History:
                                      </h4>
                                      <div className="max-h-80 overflow-y-auto space-y-3">
                                        {row.details.deliveryChanges.map((change, changeIndex) => {
                                          const prevStartDay = change.previousDeliveryDate?.startDay
                                          const prevEndDay = change.previousDeliveryDate?.endDay
                                          const prevMonth = change.previousDeliveryDate?.month
                                          const prevYear = change.previousDeliveryDate?.year

                                          const newStartDay = change.newDeliveryDate?.startDay
                                          const newEndDay = change.newDeliveryDate?.endDay
                                          const newMonth = change.newDeliveryDate?.month
                                          const newYear = change.newDeliveryDate?.year

                                          const changeDate = new Date(
                                            change.changedAt
                                          ).toLocaleString()

                                          return (
                                            <div
                                              key={changeIndex}
                                              className="p-3 bg-white rounded-md shadow-sm border-l-4 border-blue-400 hover:shadow-md transition-shadow">
                                              <div className="flex justify-between items-start">
                                                <div className="text-sm font-medium text-blue-600 bg-blue-50 rounded px-2 py-0.5">
                                                  {changeDate}
                                                </div>
                                              </div>
                                              <div className="mt-2 grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                                                <div className="bg-red-50 px-3 py-2 rounded-md md:col-span-3 flex items-center">
                                                  <span className="text-red-500 line-through">
                                                    {prevStartDay} - {prevEndDay} {prevMonth}{" "}
                                                    {prevYear}
                                                  </span>
                                                </div>
                                                <div className="flex justify-center md:col-span-1">
                                                  <div className="bg-gray-100 rounded-full p-1">
                                                    <svg
                                                      xmlns="http://www.w3.org/2000/svg"
                                                      className="h-5 w-5 text-gray-500"
                                                      viewBox="0 0 20 20"
                                                      fill="currentColor">
                                                      <path
                                                        fillRule="evenodd"
                                                        d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                      />
                                                    </svg>
                                                  </div>
                                                </div>
                                                <div className="bg-green-50 px-3 py-2 rounded-md md:col-span-3 flex items-center">
                                                  <span className="text-green-600 font-medium">
                                                    {newStartDay} - {newEndDay} {newMonth} {newYear}
                                                  </span>
                                                </div>
                                              </div>
                                              {change.reasonForChange && (
                                                <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md border-l-2 border-amber-400">
                                                  <span className="font-medium text-amber-600">
                                                    Reason:{" "}
                                                  </span>
                                                  {change.reasonForChange}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              {/* Returns Section */}
                              {row.details.returnHistory &&
                                row.details.returnHistory.length > 0 && (
                                  <div className="mt-4 border-t pt-4 px-6">
                                    <h3 className="text-lg font-medium text-gray-800 mb-2 flex items-center">
                                      <span className="mr-2">Plant Returns</span>
                                      <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        {row.details.returnHistory.length}
                                      </span>
                                    </h3>
                                    <div className="bg-gray-50 p-4 rounded-md">
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                        <div className="border-r pr-4">
                                          <span className="text-gray-500 text-sm">
                                            Total Plants
                                          </span>
                                          <div className="text-xl font-medium">{row.quantity}</div>
                                        </div>
                                        <div className="border-r pr-4">
                                          <span className="text-gray-500 text-sm">
                                            Returned Plants
                                          </span>
                                          <div className="text-xl font-medium text-amber-600">
                                            {row["returned Plants"]}
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-gray-500 text-sm">
                                            Remaining Plants
                                          </span>
                                          <div className="text-xl font-medium text-green-600">
                                            {row["remaining Plants"]}
                                          </div>
                                        </div>
                                      </div>

                                      <h4 className="font-medium text-gray-700 mt-4 mb-2">
                                        Return History:
                                      </h4>
                                      <div className="max-h-80 overflow-y-auto space-y-3">
                                        {row.details.returnHistory.map(
                                          (returnItem, returnIndex) => (
                                            <div
                                              key={returnIndex}
                                              className="p-3 bg-white rounded-md shadow-sm border-l-4 border-amber-400 hover:shadow-md transition-shadow">
                                              <div className="flex justify-between items-start">
                                                <div className="text-sm font-medium text-blue-600 bg-blue-50 rounded px-2 py-0.5">
                                                  {returnItem.date
                                                    ? new Date(returnItem.date).toLocaleString()
                                                    : "N/A"}
                                                </div>
                                                <div className="text-amber-600 bg-amber-50 text-sm font-medium px-2 py-0.5 rounded">
                                                  {returnItem.quantity} plants
                                                </div>
                                              </div>
                                              {returnItem.reason && (
                                                <div className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded-md border-l-2 border-amber-400">
                                                  <span className="font-medium text-amber-600">
                                                    Reason:{" "}
                                                  </span>
                                                  {returnItem.reason}
                                                </div>
                                              )}
                                              <div className="flex flex-wrap gap-2 mt-2">
                                                {returnItem.dispatchId && (
                                                  <div className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                                                    <span className="font-medium">
                                                      Dispatch ID:{" "}
                                                    </span>
                                                    {returnItem.dispatchId}
                                                  </div>
                                                )}
                                                {returnItem.processedBy && (
                                                  <div className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-md">
                                                    <span className="font-medium">
                                                      Processed by:{" "}
                                                    </span>
                                                    {returnItem.processedBy.name || "Unknown"}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              {/* Order Remarks Section */}
                              <div className="mt-4 border-t pt-4 px-6">
                                <h3 className="text-lg font-medium text-gray-800 mb-2">
                                  Order Remarks
                                </h3>

                                {/* Display existing remarks */}
                                {row?.details?.orderRemarks &&
                                row?.details?.orderRemarks.length > 0 ? (
                                  <div className="mb-4">
                                    <ul className="list-disc pl-5 space-y-1">
                                      {row.details.orderRemarks.map((remark, remarkIndex) => (
                                        <li key={remarkIndex} className="text-gray-700">
                                          {remark}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : (
                                  <p className="text-gray-500 italic mb-4">No remarks added yet</p>
                                )}

                                {/* Add new remark */}
                                <div className="flex flex-col sm:flex-row">
                                  <input
                                    type="text"
                                    placeholder="Add a new remark..."
                                    value={newRemark}
                                    onChange={(e) => setNewRemark(e.target.value)}
                                    className="flex-grow p-2 border border-gray-300 rounded-md mb-2 sm:mb-0 sm:mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => handleAddRemark(row.details.orderid)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                    disabled={!newRemark.trim()}>
                                    Add Remark
                                  </button>
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
        </div>
      </div>

      {/* Fixed bottom bar for batch actions */}
      {viewMode !== "booking" && selectedRows.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm py-4 border-t shadow-lg">
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
            setSelectedRows(new Set()) // Clear selection after closing
            getOrders() // Refresh orders after dispatch
          }}
          selectedOrders={selectedRows}
          orders={orders}
        />
      )}
    </div>
  )
}

export default FarmerOrdersTable
