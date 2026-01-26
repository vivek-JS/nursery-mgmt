import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  Package,
  BarChart3,
  DollarSign,
  TrendingUp,
  User,
  Search,
  Building2,
  FileText,
  Calendar,
  Eye,
  Download,
} from 'lucide-react';
import { API, NetworkManager, APIConfig } from '../../../network/core';
import { CookieKeys } from '../../../constants/cookieKeys';
import axios from 'axios';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { formatCurrency } from '../../../utils/numberUtils';
import { Toast } from 'helpers/toasts/toastHelper';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const InventoryLedger = () => {
  const navigate = useNavigate();
  const [ledgerType, setLedgerType] = useState('merchant'); // 'merchant' or 'farmer'
  const [loading, setLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [activeTab, setActiveTab] = useState('transactions'); // Changed default to transactions
  
  // Merchant selection
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState('');
  const [merchantSearch, setMerchantSearch] = useState('');
  
  // Farmer selection
  const [farmerName, setFarmerName] = useState('');
  const [farmerMobile, setFarmerMobile] = useState('');
  const [farmerSearchLoading, setFarmerSearchLoading] = useState(false);
  
  // Date range
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  useEffect(() => {
    if (ledgerType === 'merchant') {
      fetchMerchants();
    }
  }, [ledgerType]);

  const fetchMerchants = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_MERCHANTS_SIMPLE);
      const response = await instance.request({}, { limit: 1000 });
      if (response?.data) {
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

  const fetchMerchantLedger = async () => {
    if (!selectedMerchantId) {
      Toast.error('Please select a merchant');
      return;
    }

    setLoading(true);
    try {
      // Following MerchantDashboard.js pattern - use NetworkManager with params array
      const instance = NetworkManager(API.INVENTORY.GET_MERCHANT_LEDGER);
      // Endpoint is /inventory/merchants/:id/ledger, so just pass the ID
      // The urlBuilder will replace :id with selectedMerchantId
      const response = await instance.request({}, [selectedMerchantId]);
      
      if (response?.data) {
        // Handle response structure - API returns { success: true, data: { merchant, orders, ... } }
        const apiResponse = response.data;
        
        if (apiResponse.success && apiResponse.data) {
          // Standard structure: { success: true, data: { merchant, orders, payments, ... } }
          setLedgerData(apiResponse.data);
        } else if (apiResponse.merchant || apiResponse.farmer) {
          // Data is directly the ledger object (fallback)
          setLedgerData(apiResponse);
        } else {
          Toast.error(apiResponse.message || 'Error loading merchant ledger');
        }
      } else {
        Toast.error('No data received from server');
      }
    } catch (error) {
      console.error('Error fetching merchant ledger:', error);
      Toast.error('Error loading merchant ledger');
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmerLedger = async () => {
    if (!farmerName && !farmerMobile) {
      Toast.error('Please enter farmer name or mobile number');
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (farmerName) params.farmerName = farmerName;
      if (farmerMobile) params.mobileNumber = farmerMobile;

      const instance = NetworkManager(API.INVENTORY.GET_FARMER_LEDGER);
      const response = await instance.request({}, params);
      
      if (response?.data) {
        // Response structure: { success: true, data: { farmer, orders, payments, ... } }
        if (response.data.success && response.data.data) {
          setLedgerData(response.data.data);
        } else if (response.data.success) {
          // Fallback: if data is directly in response
          setLedgerData(response.data);
        } else {
          Toast.error(response.data.message || 'Error loading farmer ledger');
        }
      } else {
        Toast.error('No data received from server');
      }
    } catch (error) {
      console.error('Error fetching farmer ledger:', error);
      Toast.error('Error loading farmer ledger');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchLedger = () => {
    if (ledgerType === 'merchant') {
      fetchMerchantLedger();
    } else {
      fetchFarmerLedger();
    }
  };

  const filteredMerchants = merchants.filter(merchant =>
    merchant.name.toLowerCase().includes(merchantSearch.toLowerCase()) ||
    merchant.code.toLowerCase().includes(merchantSearch.toLowerCase()) ||
    merchant.phone.includes(merchantSearch)
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'COLLECTED':
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'PENDING':
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      case 'partial':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const exportToCSV = () => {
    if (!ledgerData) return;

    let csvContent = '';
    const headers = [];

    if (activeTab === 'transactions' || activeTab === 'payments') {
      headers.push(['Date', 'Order Number', 'Amount', 'Mode', 'Status', 'Bank', 'Transaction ID']);
      csvContent = headers.join(',') + '\n';
      ledgerData.payments.forEach(payment => {
        csvContent += [
          formatDisplayDate(payment.paymentDate),
          payment.orderNumber || '',
          payment.paidAmount || 0,
          payment.modeOfPayment || '',
          payment.paymentStatus || '',
          payment.bankName || '',
          payment.transactionId || '',
        ].join(',') + '\n';
      });
    } else if (activeTab === 'orders') {
      headers.push(['Order Number', 'Date', 'Total Amount', 'Paid', 'Outstanding', 'Status']);
      csvContent = headers.join(',') + '\n';
      ledgerData.orders.forEach(order => {
        const paid = order.paymentStatus === 'paid' ? order.totalAmount : 
                    order.paymentStatus === 'partial' ? (order.totalAmount - (ledgerData.summary.outstandingAmount / ledgerData.orders.length)) : 0;
        csvContent += [
          order.orderNumber,
          formatDisplayDate(order.orderDate),
          order.totalAmount || 0,
          paid,
          order.totalAmount - paid,
          order.status || '',
        ].join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ledgerType}-ledger-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/u/inventory')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Inventory</span>
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Inventory Ledger</h1>
            
            {/* Type Selection */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => {
                  setLedgerType('merchant');
                  setLedgerData(null);
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  ledgerType === 'merchant'
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Merchant Ledger</span>
                </div>
              </button>
              <button
                onClick={() => {
                  setLedgerType('farmer');
                  setLedgerData(null);
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  ledgerType === 'farmer'
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Farmer Ledger</span>
                </div>
              </button>
            </div>

            {/* Selection Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {ledgerType === 'merchant' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Merchant
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search by name, code, or phone..."
                        value={merchantSearch}
                        onChange={(e) => setMerchantSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Merchant *
                    </label>
                    <select
                      value={selectedMerchantId}
                      onChange={(e) => setSelectedMerchantId(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Merchant</option>
                      {filteredMerchants.map(merchant => (
                        <option key={merchant._id} value={merchant._id}>
                          {merchant.name} ({merchant.code}) - {merchant.phone}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Farmer Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter farmer name..."
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter mobile number..."
                      value={farmerMobile}
                      onChange={(e) => setFarmerMobile(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range (Optional)
                </label>
                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => setDateRange(update)}
                  isClearable={true}
                  placeholderText="Select date range"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              onClick={handleFetchLedger}
              disabled={loading || (ledgerType === 'merchant' && !selectedMerchantId) || (ledgerType === 'farmer' && !farmerName && !farmerMobile)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <BarChart3 className="w-5 h-5" />
                  <span>View Ledger</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Ledger Data Display */}
        {ledgerData && (
          <>
            {/* Summary Cards - Focused on Transactions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-6 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 mb-1 font-medium">Collected</p>
                    <p className="text-3xl font-bold text-green-700">
                      {formatCurrency(ledgerData.summary.totalPaidAmount || 0)}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      {ledgerData.summary.collectedPayments || 0} payment{ledgerData.summary.collectedPayments !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="p-3 bg-green-200 rounded-xl">
                    <CreditCard className="w-6 h-6 text-green-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl shadow-lg p-6 border border-yellow-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-yellow-700 mb-1 font-medium">Pending</p>
                    <p className="text-3xl font-bold text-yellow-700">
                      {formatCurrency(ledgerData.summary.totalPendingPayments || 0)}
                    </p>
                    <p className="text-xs text-yellow-600 mt-2">
                      {ledgerData.summary.pendingPayments || 0} payment{ledgerData.summary.pendingPayments !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-200 rounded-xl">
                    <TrendingUp className="w-6 h-6 text-yellow-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl shadow-lg p-6 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700 mb-1 font-medium">Outstanding</p>
                    <p className="text-3xl font-bold text-orange-700">
                      {formatCurrency(ledgerData.summary.outstandingAmount || 0)}
                    </p>
                    <p className="text-xs text-orange-600 mt-2">
                      Remaining balance
                    </p>
                  </div>
                  <div className="p-3 bg-orange-200 rounded-xl">
                    <DollarSign className="w-6 h-6 text-orange-700" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 mb-1 font-medium">Total Orders</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {ledgerData.summary.totalOrders || 0}
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      ₹{formatCurrency(ledgerData.summary.totalOrderValue || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-200 rounded-xl">
                    <Package className="w-6 h-6 text-blue-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Entity Info - Enhanced */}
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-6 mb-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {ledgerData.merchant?.name || ledgerData.farmer?.name || 'N/A'}
                  </h2>
                  <p className="text-gray-600">
                    {ledgerType === 'merchant' ? 'Merchant' : 'Farmer'} Ledger Summary
                  </p>
                </div>
                <div className="text-right">
                  {ledgerData.merchant?.code && (
                    <span className="inline-block px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold text-sm">
                      Code: {ledgerData.merchant.code}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                <div className="bg-white rounded-lg p-4 border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Contact</p>
                  <p className="text-base font-semibold text-gray-900">
                    {ledgerData.merchant?.phone || ledgerData.farmer?.mobileNumber || 'N/A'}
                  </p>
                  {ledgerData.merchant?.email && (
                    <p className="text-xs text-gray-500 mt-1">{ledgerData.merchant.email}</p>
                  )}
                </div>
                
                {(ledgerData.farmer?.village || ledgerData.merchant?.address) && (
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Location</p>
                    <p className="text-base font-semibold text-gray-900">
                      {ledgerData.farmer?.village || 
                       (typeof ledgerData.merchant?.address === 'string' 
                         ? ledgerData.merchant.address 
                         : `${ledgerData.merchant?.address?.city || ''}, ${ledgerData.merchant?.address?.state || ''}`) || 'N/A'}
                    </p>
                  </div>
                )}
                
                {ledgerData.merchant?.category && (
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Category</p>
                    <p className="text-base font-semibold text-gray-900 capitalize">
                      {ledgerData.merchant.category}
                    </p>
                  </div>
                )}
                
                {ledgerData.merchant?.paymentTerms && (
                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Payment Terms</p>
                    <p className="text-base font-semibold text-gray-900">
                      {ledgerData.merchant.paymentTerms}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-lg">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-6 px-6" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'transactions'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>Transactions</span>
                      {ledgerData.summary.totalPayments > 0 && (
                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">
                          {ledgerData.summary.totalPayments}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'payments'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4" />
                      <span>All Payments</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'orders'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Package className="w-4 h-4" />
                      <span>Order Ledger</span>
                      {ledgerData.summary.totalOrders > 0 && (
                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">
                          {ledgerData.summary.totalOrders}
                        </span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('products')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === 'products'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Product Ledger</span>
                      {ledgerData.summary.totalProducts > 0 && (
                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">
                          {ledgerData.summary.totalProducts}
                        </span>
                      )}
                    </div>
                  </button>
                  <div className="flex-1"></div>
                  <button
                    onClick={exportToCSV}
                    className="py-2 px-4 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {/* Transactions Tab - Simplified Payment Transactions */}
                {activeTab === 'transactions' && (
                  <div>
                    {/* Summary Cards for Transactions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-700 mb-1 font-medium">Total Collected</p>
                            <p className="text-3xl font-bold text-green-700">
                              {formatCurrency(ledgerData.summary.totalPaidAmount || 0)}
                            </p>
                            <p className="text-xs text-green-600 mt-2">
                              {ledgerData.summary.collectedPayments || 0} payment{ledgerData.summary.collectedPayments !== 1 ? 's' : ''} collected
                            </p>
                          </div>
                          <div className="p-4 bg-green-200 rounded-xl">
                            <CreditCard className="w-8 h-8 text-green-700" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-yellow-700 mb-1 font-medium">Total Pending</p>
                            <p className="text-3xl font-bold text-yellow-700">
                              {formatCurrency(ledgerData.summary.totalPendingPayments || 0)}
                            </p>
                            <p className="text-xs text-yellow-600 mt-2">
                              {ledgerData.summary.pendingPayments || 0} payment{ledgerData.summary.pendingPayments !== 1 ? 's' : ''} pending
                            </p>
                          </div>
                          <div className="p-4 bg-yellow-200 rounded-xl">
                            <TrendingUp className="w-8 h-8 text-yellow-700" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-700 mb-1 font-medium">Outstanding</p>
                            <p className="text-3xl font-bold text-blue-700">
                              {formatCurrency(ledgerData.summary.outstandingAmount || 0)}
                            </p>
                            <p className="text-xs text-blue-600 mt-2">
                              Remaining balance
                            </p>
                          </div>
                          <div className="p-4 bg-blue-200 rounded-xl">
                            <DollarSign className="w-8 h-8 text-blue-700" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-800">Payment Transactions</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                          {ledgerData.summary.collectedPayments} Collected
                        </span>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                          {ledgerData.summary.pendingPayments} Pending
                        </span>
                      </div>
                    </div>
                    
                    {ledgerData.payments && ledgerData.payments.length > 0 ? (
                      <div className="space-y-3">
                        {ledgerData.payments.map((payment, index) => (
                          <div
                            key={index}
                            className={`bg-white rounded-xl shadow-md border-l-4 ${
                              payment.paymentStatus === 'COLLECTED'
                                ? 'border-green-500'
                                : payment.paymentStatus === 'PENDING'
                                ? 'border-yellow-500'
                                : 'border-gray-300'
                            } hover:shadow-lg transition-all duration-200`}
                          >
                            <div className="p-5">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h4 className="text-lg font-bold text-gray-900">
                                      {formatCurrency(payment.paidAmount || 0)}
                                    </h4>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.paymentStatus)}`}>
                                      {payment.paymentStatus === 'COLLECTED' ? '✓ Collected' : payment.paymentStatus === 'PENDING' ? '⏳ Pending' : payment.paymentStatus}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-4 h-4" />
                                      <span>{formatDisplayDate(payment.paymentDate)}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <Package className="w-4 h-4" />
                                      <span className="font-medium">Order: {payment.orderNumber || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <CreditCard className="w-4 h-4" />
                                      <span>{payment.modeOfPayment || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  {payment.receiptPhoto && payment.receiptPhoto.length > 0 && (
                                    <button
                                      onClick={() => window.open(payment.receiptPhoto[0], '_blank')}
                                      className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="View Receipt"
                                    >
                                      <Eye className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {(payment.bankName || payment.transactionId || payment.chequeNumber || payment.upiId) && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    {payment.bankName && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Bank</p>
                                        <p className="font-medium text-gray-900">{payment.bankName}</p>
                                      </div>
                                    )}
                                    {payment.transactionId && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Transaction ID</p>
                                        <p className="font-medium text-gray-900 font-mono text-xs">{payment.transactionId}</p>
                                      </div>
                                    )}
                                    {payment.chequeNumber && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">Cheque Number</p>
                                        <p className="font-medium text-gray-900">{payment.chequeNumber}</p>
                                      </div>
                                    )}
                                    {payment.upiId && (
                                      <div>
                                        <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                                        <p className="font-medium text-gray-900">{payment.upiId}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {payment.remark && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <p className="text-xs text-gray-500 mb-1">Remarks</p>
                                  <p className="text-sm text-gray-700">{payment.remark}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                        <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No payment transactions found</p>
                        <p className="text-sm mt-2">Payments will appear here once recorded</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Ledger Tab - Detailed View */}
                {activeTab === 'payments' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment History</h3>
                    {ledgerData.payments && ledgerData.payments.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Order Number
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Mode
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Bank/Transaction
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Receipt
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {ledgerData.payments.map((payment, index) => (
                              <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDisplayDate(payment.paymentDate)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {payment.orderNumber || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                  {formatCurrency(payment.paidAmount || 0)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {payment.modeOfPayment || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {payment.bankName || payment.transactionId || payment.chequeNumber || payment.upiId || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.paymentStatus)}`}>
                                    {payment.paymentStatus}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {payment.receiptPhoto && payment.receiptPhoto.length > 0 ? (
                                    <button
                                      onClick={() => window.open(payment.receiptPhoto[0], '_blank')}
                                      className="text-blue-600 hover:text-blue-800"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No payments found</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Order Ledger Tab */}
                {activeTab === 'orders' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-800">Order History</h3>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{ledgerData.summary.totalOrders}</span> total orders
                      </div>
                    </div>
                    
                    {ledgerData.orders && ledgerData.orders.length > 0 ? (
                      <div className="space-y-4">
                        {ledgerData.orders.map((order, index) => {
                          // Calculate paid amount based on payments for this order
                          const orderPayments = ledgerData.payments?.filter(p => p.orderNumber === order.orderNumber) || [];
                          const orderPaid = orderPayments
                            .filter(p => p.paymentStatus === 'COLLECTED')
                            .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
                          const orderOutstanding = (order.totalAmount || 0) - orderPaid;
                          const paymentPercentage = order.totalAmount > 0 ? (orderPaid / order.totalAmount) * 100 : 0;
                          
                          return (
                            <div
                              key={index}
                              className="bg-white rounded-xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-all duration-200 overflow-hidden"
                            >
                              <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-3">
                                      <h4 className="text-xl font-bold text-gray-900">
                                        Order #{order.orderNumber}
                                      </h4>
                                      <button
                                        onClick={() => navigate(`/u/inventory/sell-orders/${order._id}`)}
                                        className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded transition-colors"
                                        title="View Details"
                                      >
                                        <Eye className="w-5 h-5" />
                                      </button>
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                                      <div className="flex items-center space-x-1">
                                        <Calendar className="w-4 h-4" />
                                        <span className="font-medium">{formatDisplayDate(order.orderDate)}</span>
                                      </div>
                                      {order.deliveryDate && (
                                        <div className="flex items-center space-x-1">
                                          <Package className="w-4 h-4" />
                                          <span>Delivery: {formatDisplayDate(order.deliveryDate)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${getStatusColor(order.paymentStatus)}`}>
                                      {order.paymentStatus === 'paid' ? '✓ Paid' : order.paymentStatus === 'partial' ? '⏳ Partial' : '⏳ Pending'}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-2 capitalize font-medium">{order.status}</p>
                                  </div>
                                </div>

                                {/* Payment Progress Bar */}
                                {order.totalAmount > 0 && (
                                  <div className="mb-4">
                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                      <span>Payment Progress</span>
                                      <span className="font-semibold">{paymentPercentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full transition-all ${
                                          paymentPercentage === 100
                                            ? 'bg-green-500'
                                            : paymentPercentage > 0
                                            ? 'bg-yellow-500'
                                            : 'bg-gray-300'
                                        }`}
                                        style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Amount</p>
                                    <p className="text-xl font-bold text-gray-900">
                                      {formatCurrency(order.totalAmount || 0)}
                                    </p>
                                  </div>
                                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Paid</p>
                                    <p className="text-xl font-bold text-green-700">
                                      {formatCurrency(orderPaid)}
                                    </p>
                                  </div>
                                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
                                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Outstanding</p>
                                    <p className="text-xl font-bold text-orange-700">
                                      {formatCurrency(orderOutstanding)}
                                    </p>
                                  </div>
                                </div>

                                {order.items && order.items.length > 0 && (
                                  <div className="mt-4 pt-4 border-t border-gray-200">
                                    <p className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                                      Items ({order.items.length})
                                    </p>
                                    <div className="space-y-2">
                                      {order.items.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                          <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">
                                              {item.product?.name || 'Unknown Product'}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                              {item.quantity} {item.unit?.abbreviation || item.unit?.name || 'units'} 
                                              {item.rate > 0 && ` @ ${formatCurrency(item.rate)}`}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm font-bold text-gray-900">
                                              {formatCurrency(item.amount || 0)}
                                            </p>
                                            {item.product?.category && (
                                              <p className="text-xs text-gray-500 mt-1 capitalize">
                                                {item.product.category}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No orders found</p>
                        <p className="text-sm mt-2">Orders will appear here once created</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Product Ledger Tab */}
                {activeTab === 'products' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-gray-800">Product Sales Summary</h3>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">{ledgerData.summary.totalProducts}</span> unique products
                      </div>
                    </div>
                    
                    {ledgerData.productLedger && ledgerData.productLedger.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ledgerData.productLedger.map((product, index) => {
                          const avgPrice = product.totalQuantity > 0 
                            ? (product.totalValue / product.totalQuantity) 
                            : 0;
                          
                          return (
                            <div
                              key={index}
                              className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 p-6"
                            >
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h4 className="text-lg font-bold text-gray-900 mb-1">
                                    {product.productName}
                                  </h4>
                                  <p className="text-xs text-gray-500">
                                    Product ID: {product.productId?.slice(-8) || 'N/A'}
                                  </p>
                                </div>
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <BarChart3 className="w-5 h-5 text-purple-600" />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border border-blue-200">
                                  <p className="text-xs text-blue-700 uppercase tracking-wide mb-1">Total Quantity</p>
                                  <p className="text-xl font-bold text-blue-900">
                                    {product.totalQuantity.toLocaleString('en-IN')}
                                  </p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border border-green-200">
                                  <p className="text-xs text-green-700 uppercase tracking-wide mb-1">Total Value</p>
                                  <p className="text-xl font-bold text-green-900">
                                    {formatCurrency(product.totalValue || 0)}
                                  </p>
                                </div>
                              </div>

                              {avgPrice > 0 && (
                                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-xs text-gray-600 mb-1">Average Price</p>
                                  <p className="text-sm font-semibold text-gray-900">
                                    {formatCurrency(avgPrice)} per unit
                                  </p>
                                </div>
                              )}

                              <div className="pt-4 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-semibold text-gray-700">
                                    Orders ({product.orders.length})
                                  </p>
                                  <button
                                    onClick={() => {
                                      const orderNumbers = product.orders.map(o => o.orderId).join(', ');
                                      alert(`Order Numbers:\n${orderNumbers}`);
                                    }}
                                    className="text-purple-600 hover:text-purple-800 text-xs font-medium flex items-center space-x-1"
                                  >
                                    <FileText className="w-3 h-3" />
                                    <span>View Orders</span>
                                  </button>
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto">
                                  {product.orders.map((order, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between items-center p-2 bg-gray-50 rounded text-xs hover:bg-gray-100 transition-colors"
                                    >
                                      <div>
                                        <p className="font-medium text-gray-900">{order.orderId}</p>
                                        <p className="text-gray-500">
                                          {formatDisplayDate(order.date)}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-gray-900">
                                          {order.quantity} units
                                        </p>
                                        <p className="text-gray-600">
                                          {formatCurrency(order.amount || 0)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No product data found</p>
                        <p className="text-sm mt-2">Product sales will appear here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InventoryLedger;

