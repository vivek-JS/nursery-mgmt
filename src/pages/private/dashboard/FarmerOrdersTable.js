import React, { useState, useEffect } from "react"
import { PauseIcon, Edit2Icon, CheckIcon } from "lucide-react"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import moment from "moment"
import debounce from "lodash.debounce" // Optional: Use lodash for debouncing
import { Grid } from "@mui/material"
import RenderExpandedContent from "./RenderExpandedContent"

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
  const orderStatusOptions = ["Accepted", "Pending", "Rejected", "Dispatched", "Completed"]

  useEffect(() => {
    if (startDate && endDate) {
      getOrders()
    }
  }, [debouncedSearchTerm, refresh, startDate, endDate])
  const debouncedSearchChange = debounce((value) => {
    setDebouncedSearchTerm(value)
  }, 500)
  const handleSearchChange = (val) => {
    setSearchTerm(val)
    debouncedSearchChange(val)
  }
  const getTotalPaidAmount = (payments) => {
    return payments.reduce((total, payment) => total + payment.paidAmount, 0)
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
    const emps = slotId
      ? await instance.request({}, { slotId: slotId })
      : await instance.request(
          {},
          {
            search: debouncedSearchTerm,
            startDate: formattedStartDate,
            endDate: formattedEndtDate,
            dispatched: false
          }
        )

    setOrders(
      emps?.data?.data?.map((data, index) => {
        const {
          farmer,
          //   typeOfPlants,
          numberOfPlants,
          rate,
          salesPerson,
          createdAt,
          orderStatus,
          id,
          plantName,
          plantSubtype,
          payment,
          bookingSlot
        } = data || {}
        return {
          sr: index + 1,
          farmerName: farmer?.name,
          plantType: `${plantName} -> ${plantSubtype}`,
          quantity: numberOfPlants,
          orderDate: moment(createdAt).format("DD/MM/YYYY"),
          rate,
          "Paid Amt": Number(getTotalPaidAmount(payment)),
          total: Number(rate * numberOfPlants),
          "remaining Amt": `₹ ${
            Number(rate * numberOfPlants) - Number(getTotalPaidAmount(payment))
          }`,
          orderStatus: orderStatus,
          Delivery: `${bookingSlot?.startDay} ${bookingSlot?.month} - ${bookingSlot?.endDay} ${bookingSlot?.month}`,
          details: {
            farmer,
            contact: farmer?.mobileNumber,
            orderNotes: "Premium quality seed potatoes",
            soilType: "Sandy loam",
            irrigationType: "Sprinkler system",
            lastDelivery: "2024-11-05",
            payment,
            orderid: id,
            salesPerson
          }
        }
      })
    )
    setLoading(false)

    // setEmployees(emps?.data?.data)
  }
  const pacthOrders = async (patchObj) => {
    setpatchLoading(true)

    const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
    const emps = await instance.request({ ...patchObj })
    if (emps?.data?.status === "Success") {
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
  const saveEditedRow = (index) => {
    setEditingRows((prev) => {
      const newEditingRows = new Set(prev)
      newEditingRows.delete(index)
      return newEditingRows
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Accepted":
        return "bg-green-100 text-green-700"
      case "Pending":
        return "bg-yellow-100 text-yellow-700"
      case "Rejected":
        return "bg-red-100 text-red-700"
      case "Dispatched":
      case "Processing":
        return "bg-blue-100 text-blue-700"
      case "Completed":
        return "bg-gray-100 text-gray-700"
      default:
        return "bg-gray-50 text-gray-600"
    }
  }

  const toggleEditing = (index) => {
    const newEditingRows = new Set(editingRows)
    if (newEditingRows.has(index)) {
      newEditingRows.delete(index)
    } else {
      newEditingRows.add(index)
    }
    setEditingRows(newEditingRows)
  }
  const handleInputChange = (index, key, value) => {
    const newData = [...orders]
    newData[index][key] = value
    //  setData(newData)
  }
  const refreshComponent = () => {
    setRefresh(!refresh)
  }
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

      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-white rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-50">
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
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((row, index) => (
              <React.Fragment key={index}>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleRow(index)}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none">
                      {expandedRows.has(index) ? "▼" : "▶"}
                    </button>
                  </td>
                  {Object.entries(row)
                    .filter(([key]) => key !== "details")
                    .map(([key, value]) => (
                      <td key={key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {key === "orderStatus" ? (
                          <select
                            value={value}
                            onChange={(e) =>
                              pacthOrders({
                                id: row?.details?.orderid,
                                orderStatus: e.target.value
                              })
                            }
                            className={`${getStatusColor(
                              value
                            )} px-3 py-1 rounded-md text-sm focus:outline-none`}>
                            {orderStatusOptions.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : editingRows.has(index) &&
                          (key === "rate" ||
                            key === "quantity" ||
                            key === "expectedDeliveryDate") ? (
                          <input
                            type={key === "expectedDeliveryDate" ? "date" : "number"}
                            value={value}
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
                    ))}
                  <td className="px-6 py-4 text-right">
                    {editingRows.has(index) ? (
                      <button
                        onClick={() => saveEditedRow(index)}
                        className="text-green-500 hover:text-green-700 focus:outline-none">
                        <CheckIcon size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleEditing(index)}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none mr-4">
                        <Edit2Icon size={16} />
                      </button>
                    )}
                    <button className="text-gray-500 hover:text-gray-700 focus:outline-none">
                      <PauseIcon size={16} />
                    </button>
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
    </div>
  )
}

export default FarmerOrdersTable
