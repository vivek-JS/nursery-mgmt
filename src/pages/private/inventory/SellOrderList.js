import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit2, Package, Building2, DollarSign, CreditCard } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { API, NetworkManager } from 'network/core';
import moment from 'moment';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { formatDecimal, formatCurrency } from '../../../utils/numberUtils';

const SellOrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMerchant, setSelectedMerchant] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('');
  const [merchants, setMerchants] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  useEffect(() => {
    fetchOrders();
    fetchMerchants();
  }, [searchTerm, selectedMerchant, selectedStatus, selectedPaymentStatus, startDate, endDate]);

  const fetchMerchants = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_MERCHANTS_SIMPLE);
      const response = await instance.request({}, { limit: 1000 });
      if (response?.data) {
        // Handle response structure: { success: true, data: [...] }
        if (response.data.success && Array.isArray(response.data.data)) {
          setMerchants(response.data.data);
        } else if (Array.isArray(response.data.data)) {
          setMerchants(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (searchTerm) params.search = searchTerm;
      if (selectedMerchant) params.merchant = selectedMerchant;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPaymentStatus) params.paymentStatus = selectedPaymentStatus;
      if (startDate) params.startDate = moment(startDate).format('YYYY-MM-DD');
      if (endDate) params.endDate = moment(endDate).format('YYYY-MM-DD');

      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_SELL_ORDERS);
      const response = await instance.request({}, params);
      if (response?.data) {
        // Handle response structure: { success: true, data: [...], pagination: {...} }
        if (response.data.success && Array.isArray(response.data.data)) {
          setOrders(response.data.data);
        } else if (Array.isArray(response.data.data)) {
          setOrders(response.data.data);
        } else {
          setOrders([]);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalPaidAmount = (payments) => {
    if (!payments || !Array.isArray(payments)) return 0;
    return payments.reduce(
      (total, payment) => total + (payment?.paymentStatus === 'COLLECTED' ? payment.paidAmount : 0),
      0
    );
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-700';
      case 'dispatched':
        return 'bg-purple-100 text-purple-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Sell Orders</h1>
            <p className="text-gray-600">Manage sell orders to merchants/recipients</p>
          </div>
          <button
            onClick={() => navigate('/u/inventory/sell-orders/new')}
            className="bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">New Sell Order</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Order number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Merchant</label>
              <select
                value={selectedMerchant}
                onChange={(e) => setSelectedMerchant(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">All Merchants</option>
                {merchants.map(merchant => (
                  <option key={merchant._id} value={merchant._id}>
                    {merchant.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="dispatched">Dispatched</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
              <select
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">All Payment Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <DatePicker
                selectsRange={true}
                startDate={startDate}
                endDate={endDate}
                onChange={(update) => setDateRange(update)}
                isClearable={true}
                placeholderText="Select date range"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No sell orders found</h3>
          <p className="text-gray-500 mb-6">Create your first sell order</p>
          <button
            onClick={() => navigate('/u/inventory/sell-orders/new')}
            className="bg-pink-500 text-white px-6 py-2 rounded-xl hover:bg-pink-600 transition-colors"
          >
            Create Sell Order
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order) => {
            const totalPaid = getTotalPaidAmount(order.payment);
            const outstanding = order.totalAmount - totalPaid;

            return (
              <div
                key={order._id}
                onClick={() => navigate(`/u/inventory/sell-orders/${order._id}`)}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">Order #{order.orderNumber}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {order.merchant?.name || order.buyerName || 'Unknown Buyer'}
                        </span>
                      </div>
                      {order.buyerVillage && (
                        <div className="text-xs text-gray-500 mt-1">
                          {order.buyerVillage}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/u/inventory/sell-orders/${order._id}`);
                      }}
                      className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                      title="View Details / Add Payment"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Order Date</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatDisplayDate(order.orderDate)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total Amount</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(formatDecimal(order.totalAmount) || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Paid Amount</span>
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(formatDecimal(totalPaid) || 0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Outstanding</span>
                      <span className="text-sm font-medium text-orange-600">
                        {formatCurrency(formatDecimal(outstanding) || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(
                          order.paymentStatus
                        )}`}
                      >
                        {order.paymentStatus.toUpperCase()}
                      </span>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}
                      >
                        {order.status.toUpperCase()}
                      </span>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Items ({order.items.length})</p>
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-xs text-gray-600 flex justify-between">
                              <span>{item.product?.name || 'Unknown'}</span>
                              <span>{item.quantity} × ₹{item.rate}</span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <p className="text-xs text-gray-400">+{order.items.length - 2} more items</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SellOrderList;

