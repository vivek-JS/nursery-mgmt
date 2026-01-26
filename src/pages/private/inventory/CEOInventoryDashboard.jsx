import React, { useState, useEffect } from 'react';
import {
  Package,
  TrendingUp,
  DollarSign,
  BarChart3,
  RefreshCw,
  FileText,
  Users,
  ShoppingCart,
  ArrowLeft,
  Database,
  PieChart,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  Filter,
  Download,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API, NetworkManager } from '../../../network/core';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

const CEOInventoryDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'ledger'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stockData, setStockData] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await fetchCEODashboardData();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCEODashboardData = async () => {
    try {
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const instance = NetworkManager(API.INVENTORY.GET_CEO_DASHBOARD);
      const response = await instance.request(params);

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' || apiResponse.success) {
          const data = apiResponse.data || apiResponse.data;
          
          // Set stock data from backend
          if (data.stock) {
            setStockData(data.stock);
          }
          
          // Set ledger data from backend
          if (data.ledger) {
            setLedgerData(data.ledger);
          }
        } else {
          console.error('API Error:', apiResponse.message || 'Unknown error');
        }
      }
    } catch (error) {
      console.error('Error fetching CEO Dashboard data:', error);
    }
  };

  // All calculations are now done on the backend via GET_CEO_DASHBOARD API

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2,
    }).format(num || 0);
  };

  // Stock Tab Content
  const renderStockTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      );
    }

    if (!stockData) return null;

    const { summary, products, crops, lowStockProducts, outOfStockProducts, outOfStockVarieties, stockByCategory } = stockData;

    const categoryChartData = stockByCategory.map(cat => ({
      name: cat.category,
      value: cat.totalValue,
      stock: cat.totalStock,
    }));

    const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Products</p>
                <p className="text-3xl font-bold mt-2">{summary.totalProducts}</p>
                <p className="text-blue-100 text-xs mt-1">+ {summary.totalCrops} Crops</p>
              </div>
              <Package className="w-12 h-12 text-brand-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-100 text-sm font-medium">Total Stock Value</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(summary.totalStockValue)}</p>
                <p className="text-brand-100 text-xs mt-1">{formatNumber(summary.totalCurrentStock)} units</p>
              </div>
              <DollarSign className="w-12 h-12 text-brand-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm font-medium">Low Stock Items</p>
                <p className="text-3xl font-bold mt-2">{summary.lowStockCount}</p>
                <p className="text-yellow-100 text-xs mt-1">Needs attention</p>
              </div>
              <AlertCircle className="w-12 h-12 text-yellow-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Out of Stock</p>
                <p className="text-3xl font-bold mt-2">{summary.outOfStockCount}</p>
                <p className="text-red-100 text-xs mt-1">Requires restocking</p>
              </div>
              <XCircle className="w-12 h-12 text-red-200" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Value by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Quantity by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Bar dataKey="stock" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>


        {/* Low Stock Alert */}
        {lowStockProducts && lowStockProducts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 transform transition-all duration-300">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-yellow-800">Low Stock Alert</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockProducts.slice(0, 9).map((product) => (
                <div key={product._id} className="bg-white rounded-lg p-4 border border-yellow-200">
                  <p className="font-medium text-gray-800">{product.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Stock: {formatNumber(product.currentStock || 0)} | 
                    Min: {formatNumber(product.minStockLevel || 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Ledger Tab Content
  const renderLedgerTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      );
    }

    if (!ledgerData) return null;

    const { summary, payments, productLedger, customerLedger, paymentStatusBreakdown, dailySales } = ledgerData;

    const paymentStatusData = [
      { name: 'Collected', value: paymentStatusBreakdown.collected, color: '#10b981' },
      { name: 'Pending', value: paymentStatusBreakdown.pending, color: '#f59e0b' },
      { name: 'Rejected', value: paymentStatusBreakdown.rejected, color: '#ef4444' },
    ];

    return (
      <div className="space-y-6">
        {/* Date Range Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                <p className="text-3xl font-bold mt-2">{summary.totalOrders}</p>
                <p className="text-blue-100 text-xs mt-1">In selected period</p>
              </div>
              <ShoppingCart className="w-12 h-12 text-brand-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-100 text-sm font-medium">Total Order Value</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(summary.totalOrderValue)}</p>
                <p className="text-brand-100 text-xs mt-1">Gross sales</p>
              </div>
              <DollarSign className="w-12 h-12 text-brand-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Total Collected</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(summary.totalPaidAmount)}</p>
                <p className="text-purple-100 text-xs mt-1">Payments received</p>
              </div>
              <CheckCircle className="w-12 h-12 text-brand-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Outstanding</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(summary.outstandingBalance)}</p>
                <p className="text-orange-100 text-xs mt-1">Pending collection</p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Opening & Closing Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Opening Balance</h3>
            <p className="text-3xl font-bold text-brand-600">{formatCurrency(summary.openingBalance)}</p>
            <p className="text-sm text-gray-500 mt-2">Balance before selected period</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-brand-500 transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Closing Balance</h3>
            <p className="text-3xl font-bold text-brand-600">{formatCurrency(summary.closingBalance)}</p>
            <p className="text-sm text-gray-500 mt-2">Balance after selected period</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Area type="monotone" dataKey="sales" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Status</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={paymentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Product Ledger */}
        <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Product-wise Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productLedger.slice(0, 20).map((product) => (
                  <tr key={product.productId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.productName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(product.totalQuantity)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-brand-600">{formatCurrency(product.totalValue)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.orders.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Ledger */}
        <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer-wise Ledger</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mobile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customerLedger.slice(0, 20).map((customer, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{customer.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.customerMobile}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.totalOrders}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(customer.totalOrderValue)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-brand-600">{formatCurrency(customer.totalPaid)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">{formatCurrency(customer.outstanding)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.slice(0, 20).map((payment, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(payment.paymentDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.customerName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{payment.orderNumber}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(payment.paidAmount)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        payment.paymentStatus === 'COLLECTED' ? 'bg-brand-100 text-brand-800' :
                        payment.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{payment.modeOfPayment || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/u/inventory')}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">CEO Inventory Dashboard</h1>
                <p className="text-gray-600">Comprehensive insights into inventory and financials</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('stock')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'stock'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5" />
                <span>Stock</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'ledger'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Ledger</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'stock' ? renderStockTab() : renderLedgerTab()}
      </div>
    </div>
  );
};

export default CEOInventoryDashboard;

