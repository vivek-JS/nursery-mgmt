import React, { useState, useEffect } from "react"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"
import { API, NetworkManager } from "network/core"

const ReplaceOrderDialog = ({ open, onClose }) => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  
  // Debounce search term to avoid too many API calls
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)
    
    return () => {
      clearTimeout(timerId)
    }
  }, [searchTerm])
  
  // Function to get the total paid amount
  const getTotalPaidAmount = (payment) => {
    return payment?.reduce((total, curr) => total + (curr.amount || 0), 0) || 0
  }

  const getOrders = async () => {
    if (!open) return;
    
    setLoading(true)
    
    try {
      // Use current date range or set defaults
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - 1) // Default to 1 month ago
      const endDate = new Date()
      
      const formattedStartDate = moment(startDate).format("DD-MM-YYYY")
      const formattedEndDate = moment(endDate).format("DD-MM-YYYY")
      
      // Use the appropriate API endpoint
      const instance = NetworkManager(API.ORDER.GET_ORDERS)
      
      // Set parameters with only ACCEPTED,FARM_READY status
      const params = {
        search: debouncedSearchTerm,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        status: "ACCEPTED,FARM_READY"
      }
      
      const response = await instance.request({}, params)
      
      // Transform the data
      const formattedOrders = response?.data?.data?.map((data) => {
        const {
          farmer,
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
          returnedPlants
        } = data || {}
        
        const { startDay, endDay } = bookingSlot[0] || {}
        const start = moment(startDay, "DD-MM-YYYY").format("D")
        const end = moment(endDay, "DD-MM-YYYY").format("D")
        const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY")
        
        return {
          id: id,
          order: orderId,
          farmerName: farmer?.name,
          plantType: `${plantType?.name} -> ${plantSubtype?.name}`,
          quantity: numberOfPlants,
          orderDate: moment(createdAt).format("DD/MM/YYYY"),
          rate,
          total: `₹ ${Number(rate * numberOfPlants)}`,
          paidAmount: `₹ ${Number(getTotalPaidAmount(payment))}`,
          remainingAmount: `₹ ${
            Number(rate * numberOfPlants) - Number(getTotalPaidAmount(payment))
          }`,
          remainingPlants: remainingPlants || numberOfPlants,
          returnedPlants: returnedPlants || 0,
          orderStatus: orderStatus,
          delivery: `${start} - ${end} ${monthYear}`,
          contact: farmer?.mobileNumber,
          salesPerson: salesPerson?.name
        }
      }) || []
      
      setOrders(formattedOrders)
    } catch (error) {
      console.error("Error fetching orders:", error)
      Toast.error("Failed to fetch orders")
    } finally {
      setLoading(false)
    }
  }

  // Fetch orders when dialog opens and when search term changes
  useEffect(() => {
    if (open) {
      getOrders()
    }
  }, [open, debouncedSearchTerm])
  
  // Handle search input changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
  }

  // Don't render anything if dialog shouldn't be open
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center" style={{ zIndex: 100 }}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 p-6" style={{ position: 'relative', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Orders</h2>
          
          <div className="flex items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="border border-gray-300 rounded-md py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            
            <button
              onClick={getOrders}
              className="ml-3 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md"
            >
              Refresh
            </button>
            
            <button
              onClick={onClose}
              className="ml-3 text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Farmer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plant Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      {order.order}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.farmerName}
                      {order.contact && (
                        <div className="text-xs text-gray-400">{order.contact}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.plantType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.orderDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.delivery}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.total}
                      <div className="text-xs">
                        <span className="text-green-600">Paid: {order.paidAmount}</span>
                        {Number(order.remainingAmount.replace('₹ ', '')) > 0 && (
                          <div className="text-red-600">Due: {order.remainingAmount}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.orderStatus === 'ACCEPTED' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {order.orderStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <div>
            Showing {orders.length} orders
          </div>
          
          <div>
            <span className="font-medium">Status filter:</span> ACCEPTED, FARM_READY
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReplaceOrderDialog