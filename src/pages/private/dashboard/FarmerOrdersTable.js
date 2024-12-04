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

const FarmerOrdersTable = () => {
  const today = new Date()

  // const [data, setData] = useState([
  //   {
  //     sr: 1,
  //     farmerName: "John Doe",
  //     plantType: "Tomatoes",
  //     quantity: 500,
  //     rate: 45.5,
  //     advance: 10000,
  //     remainingAmt: 12750,
  //     orderStatus: "Pending",
  //     expectedDeliveryDate: "2024-12-15",
  //     salesmenName: "Mike Johnson",
  //     details: {
  //       address: "123 Farm Road, Agricultural Zone",
  //       contact: "+1 234-567-8900",
  //       orderNotes: "Organic farming certified",
  //       soilType: "Loamy",
  //       irrigationType: "Drip irrigation",
  //       lastDelivery: "2024-11-01",
  //       paymentHistory: [
  //         { date: "2024-10-15", amount: 5000, type: "Advance" },
  //         { date: "2024-11-01", amount: 5000, type: "Second installment" }
  //       ]
  //     }
  //   },
  //   {
  //     sr: 2,
  //     farmerName: "Sarah Smith",
  //     plantType: "Potatoes",
  //     quantity: 1000,
  //     rate: 25.75,
  //     advance: 15000,
  //     remainingAmt: 10750,
  //     orderStatus: "Confirmed",
  //     expectedDeliveryDate: "2024-12-20",
  //     salesmenName: "Tom Wilson",
  //     details: {
  //       address: "456 Agricultural Avenue, Rural District",
  //       contact: "+1 345-678-9012",
  //       orderNotes: "Premium quality seed potatoes",
  //       soilType: "Sandy loam",
  //       irrigationType: "Sprinkler system",
  //       lastDelivery: "2024-11-05",
  //       paymentHistory: [
  //         { date: "2024-10-20", amount: 8000, type: "Advance" },
  //         { date: "2024-11-05", amount: 7000, type: "Second installment" }
  //       ]
  //     }
  //   }
  // ])

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

  const orderStatusOptions = ["Accepted", "Pending", "Rejected", "Dispatched", "Completed"]
  useEffect(() => {
    getOrders()
  }, [debouncedSearchTerm])
  const debouncedSearchChange = debounce((value) => {
    setDebouncedSearchTerm(value)
  }, 500)
  console.log(orders)
  const handleSearchChange = (val) => {
    setSearchTerm(val)
    debouncedSearchChange(val)
  }
  const getOrders = async () => {
    console.log("In")
    setLoading(true)
    const instance = NetworkManager(API.ORDER.GET_ORDERS)
    const emps = await instance.request({}, { search: debouncedSearchTerm })
    console.log(emps)

    setOrders(
      emps?.data?.data?.map((data, index) => {
        const {
          farmer,
          //   typeOfPlants,
          numberOfPlants,
          rate,
          advance,
          salesPerson,
          createdAt,
          orderStatus,
          id,
          plantName,
          plantSubtype,
          payment
        } = data || {}
        return {
          sr: index + 1,
          farmerName: farmer?.name,
          plantType: `${plantName} -> ${plantSubtype}`,
          quantity: numberOfPlants,
          orderDate: moment(createdAt).format("DD/MM/YYYY"),
          rate,
          advance: advance,
          remainingAmt: Number(rate * numberOfPlants) - Number(advance),
          orderStatus: orderStatus,
          expectedDeliveryDate: "2024-12-20",
          salesmenName: salesPerson,
          details: {
            name: farmer.name,
            contact: farmer?.mobileNumber,
            orderNotes: "Premium quality seed potatoes",
            soilType: "Sandy loam",
            irrigationType: "Sprinkler system",
            lastDelivery: "2024-11-05",
            payment,
            orderid: id
          }
        }
      })
    )
    setLoading(false)

    // setEmployees(emps?.data?.data)
  }
  const pacthOrders = async (patchObj) => {
    console.log(patchObj)?.setLoading(true)
    setpatchLoading(true)

    const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
    const emps = await instance.request({ ...patchObj })
    if (emps?.data?.status === "Success") {
      getOrders()
    }

    setpatchLoading(false)

    // setEmployees(emps?.data?.data)
  }
  console.log(startDate)

  const toggleRow = (index) => {
    const newExpandedRows = new Set(expandedRows)
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index)
    } else {
      newExpandedRows.add(index)
    }
    setExpandedRows(newExpandedRows)
  }

  // const handleStatusChange = (index, newStatus) => {
  //   const newData = [...data]
  //   newData[index].orderStatus = newStatus
  //   setData(newData)
  // }

  // const filteredData = useMemo(() => {
  //   return data.filter((row) => {
  //     if (searchTerm) {
  //       const searchValue = searchTerm.toLowerCase()
  //       return Object.values(row).some((value) => String(value).toLowerCase().includes(searchValue))
  //     }
  //     return true
  //   })
  // }, [data, searchTerm])

  // const sortedData = useMemo(() => {
  //   if (!sorting.column) return filteredData

  //   return [...filteredData].sort((a, b) => {
  //     if (a[sorting.column] < b[sorting.column]) {
  //       return sorting.direction === "asc" ? -1 : 1
  //     }
  //     if (a[sorting.column] > b[sorting.column]) {
  //       return sorting.direction === "asc" ? 1 : -1
  //     }
  //     return 0
  //   })
  // }, [filteredData, sorting])

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
                    <button
                      onClick={() => console.log(`Paused order ${index}`)}
                      className="text-gray-500 hover:text-gray-700 focus:outline-none">
                      <PauseIcon size={16} />
                    </button>
                  </td>
                </tr>
                {expandedRows.has(index) && (
                  <tr>
                    <td colSpan={Object.keys(row).length + 1}>
                      <RenderExpandedContent
                        farmer={{
                          name: "John Doe",
                          address: "123 Greenfield St, Village XYZ, Country",
                          contact: "+1234567890"
                        }}
                        details={{ payment: row?.details?.payment }}
                        orderId={row?.details?.orderid}
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
