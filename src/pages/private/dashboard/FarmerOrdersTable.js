import React, { useState, useEffect } from "react"
import { Edit2Icon, CheckIcon, XIcon, FilterIcon } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import moment from "moment"
import debounce from "lodash.debounce" // Optional: Use lodash for debouncing
import { Grid, MenuItem, Select, Popover } from "@mui/material"
import RenderExpandedContent from "./RenderExpandedContent"
import { sendWatiTemplateAxios } from "network/core/wati"
import DownloadPDFButton from "./OrdereRecipt"
import DispatchForm from "./DispatchedForm"
import DispatchList from "./DispatchedList"
import { Toast } from "helpers/toasts/toastHelper"
const FarmerOrdersTable = ({ slotId }) => {
  const today = new Date()
  const [sorting, setSorting] = useState({ column: null, direction: "asc" })
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedRows, setExpandedRows] = useState(new Set())
  const [editingRows, setEditingRows] = useState(new Set())
  const [selectedDateRange, setSelectedDateRange] = useState([today, today])
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
    { label: "Farm Ready", value: "FARM_READY" },
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

  // Add these handler functions

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
    console.log(startDate)
    if (startDate && endDate) {
      getOrders()
    }
  }, [debouncedSearchTerm, refresh, startDate, endDate, viewMode, selectedOrderStatuses])

  useEffect(() => {
    if (selectedRow?.details?.plantID && selectedRow?.details?.plantSubtypeID) {
      getSlots(selectedRow?.details?.plantID, selectedRow?.details?.plantSubtypeID)
    }
  }, [selectedRow])
  const debouncedSearchChange = debounce((value) => {
    setDebouncedSearchTerm(value)
  }, 500)
  const handleSearchChange = (val) => {
    setSearchTerm(val)
    debouncedSearchChange(val)
  }
  const getTotalPaidAmount = (payments) => {
    return payments.reduce(
      (total, payment) => total + (payment?.paymentStatus == "COLLECTED" ? payment.paidAmount : 0),
      0
    )
  }

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
          data?.map((district) => {
            const { startDay, endDay, totalBookedPlants, totalPlants, status, _id } = district || {}
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
    console.log(endDate)
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
    if (viewMode === "farmready") {
      params.status = "FARM_READY"
    }

    if (viewMode === "dispatch_process") {
      params.status = "DISPATCH_PROCESS"
    }

    const emps = slotId
      ? await instance.request({}, { slotId: slotId })
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
          plantSubtype
        } = data || {}
        const { startDay, endDay } = bookingSlot[0] || {}
        const start = moment(startDay, "DD-MM-YYYY").format("D")
        const end = moment(endDay, "DD-MM-YYYY").format("D")
        const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")
        return {
          order: orderId,
          farmerName: farmer?.name,
          plantType: `${plantType?.name} -> ${plantSubtype?.name}`,
          quantity: numberOfPlants,
          orderDate: moment(createdAt).format("DD/MM/YYYY"),
          rate,
          total: `₹ ${Number(rate * numberOfPlants)}`,
          "Paid Amt": `₹ ${Number(getTotalPaidAmount(payment))}`,
          "remaining Amt": `₹ ${
            Number(rate * numberOfPlants) - Number(getTotalPaidAmount(payment))
          }`,
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
            bookingSlot: bookingSlot[0]
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
    console.log(emps?.error)
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
      case "FARM_READY":
        return "bg-amber-100 text-amber-700"
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
  console.log(isDispatchtab)

  return (
    <div className="w-full p-6 bg-gray-100">
      {(loading || patchLoading) && <PageLoader />}
      <Grid container justifyContent={"space-between"}>
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
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full max-w-md p-3 border rounded-md shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </Grid>
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
      {<DispatchList setisDispatchtab={setisDispatchtab} viewMode={viewMode} />}{" "}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow-md">
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
                              selectedOrderStatuses.length > 0 ? "text-blue-500" : "text-gray-500"
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
                              <div key={status} className="flex items-center mb-2">
                                <input
                                  type="checkbox"
                                  id={status}
                                  checked={selectedOrderStatuses.includes(status?.key)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedOrderStatuses([
                                        ...selectedOrderStatuses,
                                        status?.value
                                      ])
                                    } else {
                                      setSelectedOrderStatuses(
                                        selectedOrderStatuses.filter((s) => s !== status?.value)
                                      )
                                    }
                                  }}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor={status} className="ml-2 text-sm text-gray-600">
                                  <span
                                    className={`${getStatusColor(
                                      status?.key
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
                    row?.details?.payment.some((payment) => payment.paymentStatus === "PENDING")
                      ? "animate-blink"
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
                        <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {key === "orderStatus" ? (
                            <select
                              value={value}
                              onChange={(e) =>
                                pacthOrders(
                                  {
                                    id: row?.details?.orderid,
                                    orderStatus: e.target.value
                                  },
                                  row
                                )
                              }
                              className={`${getStatusColor(
                                value
                              )} px-3 py-1 rounded-md text-sm focus:outline-none`}>
                              {orderStatusOptions.map((option) => (
                                <option key={option?.value} value={option?.value}>
                                  {option?.label}
                                </option>
                              ))}
                            </select>
                          ) : key === "Delivery" && editingRows.has(index) ? (
                            <Select
                              value={
                                updatedObject["bookingSlot"] || row?.details?.bookingSlot?.slotId
                              }
                              label="Filter by Job Title"
                              onChange={(e) =>
                                setUpdatedObject({ ...updatedObject, bookingSlot: e.target.value })
                              }>
                              <MenuItem value="">All</MenuItem>
                              {slots.map(({ label, value }) => (
                                <MenuItem key={label} value={value}>
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
                          ) : (
                            value
                          )}
                        </td>
                      )
                    })}
                  <td className="px-6 py-4 text-right">
                    {editingRows.has(index) ? (
                      <>
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
                      </>
                    ) : (
                      <button
                        onClick={() => toggleEditing(index, row)}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none">
                        <Edit2Icon size={16} />
                      </button>
                    )}
                  </td>
                </tr>
                {expandedRows.has(index) && (
                  <tr>
                    <td colSpan={Object.keys(row).length + 1}>
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
                        refreshComponent={refreshComponent}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
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
