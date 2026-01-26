import React, { useState, useEffect } from 'react';
import {
  Package,
  DollarSign,
  BarChart3,
  RefreshCw,
  FileText,
  ShoppingCart,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  X,
  ArrowUpCircle,
  ArrowDownCircle,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API, NetworkManager } from '../../../network/core';
import { Toast } from "helpers/toasts/toastHelper";
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

const RamAgriSalesDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'stock', 'sales'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedVariety, setSelectedVariety] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [expandedCrops, setExpandedCrops] = useState({});
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [showVarietyLedger, setShowVarietyLedger] = useState(false);
  const [showCustomerLedger, setShowCustomerLedger] = useState(false);
  const [showCustomerLedgerSummaryDetails, setShowCustomerLedgerSummaryDetails] = useState(false);
  const [showMerchantLedger, setShowMerchantLedger] = useState(false);
  const [stockTypeTab, setStockTypeTab] = useState('seed'); // 'seed' or 'chemical'
  const [varietyLedgerData, setVarietyLedgerData] = useState(null);
  const [customerLedgerData, setCustomerLedgerData] = useState(null);
  const [merchantLedgerData, setMerchantLedgerData] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [salesTargets, setSalesTargets] = useState([]);
  const [salesTargetsLoading, setSalesTargetsLoading] = useState(false);
  const [salesUsers, setSalesUsers] = useState([]);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetCrops, setTargetCrops] = useState([]);
  const [targetMap, setTargetMap] = useState({});
  const [targetModalLoading, setTargetModalLoading] = useState(false);
  const [targetSaveLoading, setTargetSaveLoading] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState([]);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState([]);

  useEffect(() => {
    fetchData();
    fetchSalesTargets();
  }, [dateRange, orderStatusFilter, paymentStatusFilter]);

  useEffect(() => {
    fetchSalesUsers();
  }, []);

  useEffect(() => {
    if (showTargetModal && targetUserId) {
      loadTargetsForUser(targetUserId);
    }
  }, [showTargetModal, targetUserId, salesTargets]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (orderStatusFilter.length > 0) params.orderStatus = orderStatusFilter.join(',');
      if (paymentStatusFilter.length > 0) params.paymentStatus = paymentStatusFilter.join(',');

      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_SALES_DASHBOARD);
      const response = await instance.request({}, params);

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' || apiResponse.success) {
          const data = apiResponse.data;
          setDashboardData(data);
        } else {
          console.error('API Error:', apiResponse.message || 'Unknown error');
        }
      }
    } catch (error) {
      console.error('Error fetching Ram Agri Sales Dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesUsers = async () => {
    try {
      const instance = NetworkManager(API.USER.GET_USERS);
      const response = await instance.request({}, { jobTitle: "RAM_AGRI_SALES" });
      if (response?.data?.success) {
        const users = response.data.data || [];
        if (users.length > 0) {
          setSalesUsers(users);
          return;
        }
      }
      const fallbackResponse = await instance.request({}, { jobTitle: "SALES" });
      if (fallbackResponse?.data?.success) {
        setSalesUsers(fallbackResponse.data.data || []);
      } else {
        setSalesUsers([]);
      }
    } catch (error) {
      console.error("Error fetching sales users:", error);
      setSalesUsers([]);
    }
  };

  const fetchSalesTargets = async () => {
    try {
      setSalesTargetsLoading(true);
      const params = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_SALES_TARGETS);
      const response = await instance.request({}, params);
      if (response?.data?.status === "Success") {
        setSalesTargets(response.data.data || []);
      } else {
        setSalesTargets([]);
      }
    } catch (error) {
      console.error("Error fetching sales targets:", error);
      setSalesTargets([]);
    } finally {
      setSalesTargetsLoading(false);
    }
  };

  const buildTargetKey = (cropId, varietyId) => `${cropId}_${varietyId}`;

  const fetchTargetCrops = async () => {
    try {
      setTargetModalLoading(true);
      const instance = NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS);
      const response = await instance.request({}, { productType: "all" });
      if (response?.data?.status === "Success") {
        setTargetCrops(response.data.data || []);
      } else {
        setTargetCrops([]);
      }
    } catch (error) {
      console.error("Error fetching crops:", error);
      setTargetCrops([]);
    } finally {
      setTargetModalLoading(false);
    }
  };

  const loadTargetsForUser = (userId) => {
    const nextMap = {};
    salesTargets
      .filter((target) => (target.userId?._id || target.userId) === userId)
      .forEach((target) => {
        const cropId = target.cropId?._id || target.cropId;
        const varietyId = target.varietyId;
        if (cropId && varietyId) {
          nextMap[buildTargetKey(cropId, varietyId)] = target.targetAmount || 0;
        }
      });
    setTargetMap(nextMap);
  };

  const openTargetModal = () => {
    setShowTargetModal(true);
    if (targetCrops.length === 0) {
      fetchTargetCrops();
    }
    if (salesTargets.length === 0) {
      fetchSalesTargets();
    }
    if (!targetUserId && salesUsers.length > 0) {
      const defaultUserId = salesUsers[0]._id;
      setTargetUserId(defaultUserId);
      loadTargetsForUser(defaultUserId);
    }
  };

  const handleTargetSave = async () => {
    if (!targetUserId) {
      Toast.error("Please select a sales user");
      return;
    }

    try {
      setTargetSaveLoading(true);
      const targets = Object.entries(targetMap).map(([key, amount]) => {
        const [cropId, varietyId] = key.split("_");
        return { cropId, varietyId, targetAmount: Number(amount || 0) };
      });

      const payload = {
        userId: targetUserId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        targets,
      };

      const instance = NetworkManager(API.INVENTORY.SAVE_RAM_AGRI_SALES_TARGET);
      const response = await instance.request(payload);
      if (response?.data?.status === "Success") {
        Toast.success("Targets saved");
        fetchSalesTargets();
        setShowTargetModal(false);
      } else {
        Toast.error(response?.data?.message || "Failed to save targets");
      }
    } catch (error) {
      console.error("Error saving targets:", error);
      Toast.error("Failed to save targets");
    } finally {
      setTargetSaveLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleVarietyClick = (crop, variety) => {
    setSelectedVariety({ crop, variety });
    setShowSidebar(true);
  };

  const toggleCropExpansion = (cropId) => {
    setExpandedCrops(prev => ({
      ...prev,
      [cropId]: !prev[cropId],
    }));
  };

  const fetchVarietyLedger = async (cropId, varietyId) => {
    try {
      setLoadingLedger(true);
      setShowVarietyLedger(true);
      const params = { cropId, varietyId };
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_VARIETY_LEDGER);
      // For GET requests: first arg is body (empty), second arg is query params
      const response = await instance.request({}, params);

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' || apiResponse.success) {
          setVarietyLedgerData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching variety ledger:', error);
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchCustomerLedger = async (customerMobile, customerName, customerId = null) => {
    try {
      setLoadingLedger(true);
      setShowCustomerLedger(true);
      const params = {};
      if (customerMobile) params.customerMobile = customerMobile;
      if (customerName) params.customerName = customerName;
      if (customerId) params.customerId = customerId;
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_CUSTOMER_LEDGER);
      // For GET requests: first arg is body (empty), second arg is query params
      const response = await instance.request({}, params);

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' || apiResponse.success) {
          setCustomerLedgerData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching customer ledger:', error);
    } finally {
      setLoadingLedger(false);
    }
  };

  const fetchMerchantLedger = async (merchantId) => {
    try {
      setLoadingLedger(true);
      setShowMerchantLedger(true);
      const params = { merchantId };
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;

      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_MERCHANT_LEDGER);
      // For GET requests: first arg is body (empty), second arg is query params
      const response = await instance.request({}, params);

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' || apiResponse.success) {
          setMerchantLedgerData(apiResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching merchant ledger:', error);
    } finally {
      setLoadingLedger(false);
    }
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

  // Overview Tab Content
  const renderOverviewTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      );
    }

    if (!dashboardData) return null;

    const { summary, stock, sales } = dashboardData;

    const COLORS = ['#0f766e', '#14b8a6', '#0d9488', '#f59e0b', '#ef4444', '#06b6d4', '#2dd4bf'];

    // Crop-wise sales chart data
    const cropSalesChartData = sales.cropWiseSales.slice(0, 10).map(crop => ({
      name: crop.cropName.length > 10 ? crop.cropName.substring(0, 10) + '...' : crop.cropName,
      value: crop.totalValue,
      quantity: crop.totalQuantity,
      orders: crop.orderCount,
    }));

    // Payment status chart data
    const paymentStatusData = [
      { name: 'Collected', value: sales.paymentStatusBreakdown.collected, color: '#0f766e' },
      { name: 'Pending', value: sales.paymentStatusBreakdown.pending, color: '#f59e0b' },
      { name: 'Rejected', value: sales.paymentStatusBreakdown.rejected, color: '#ef4444' },
    ];

    const salesTargetTotals = Object.values(
      salesTargets.reduce((acc, target) => {
        const userId = target.userId?._id || target.userId;
        if (!userId) return acc;
        if (!acc[userId]) {
          acc[userId] = {
            userId,
            name: target.userId?.name || "Unknown",
            phone: target.userId?.phoneNumber || target.userId?.phone || "",
            totalTarget: 0,
          };
        }
        acc[userId].totalTarget += target.targetAmount || 0;
        return acc;
      }, {})
    ).sort((a, b) => b.totalTarget - a.totalTarget);

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-100 text-sm font-medium">Total Crops</p>
                <p className="text-3xl font-bold mt-2">{summary.stock.totalCrops}</p>
                <p className="text-brand-100 text-xs mt-1">{summary.stock.totalVarieties} Varieties</p>
              </div>
              <Package className="w-12 h-12 text-brand-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-100 text-sm font-medium">Total Stock Value</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(summary.stock.totalStockValue)}</p>
                <p className="text-brand-100 text-xs mt-1">{formatNumber(summary.stock.totalCurrentStock)} units</p>
              </div>
              <DollarSign className="w-12 h-12 text-brand-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-brand-600 to-brand-500 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-100 text-sm font-medium">Total Sales</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(summary.sales.totalOrderValue)}</p>
                <p className="text-brand-100 text-xs mt-1">{summary.sales.totalOrders} Orders</p>
              </div>
              <ShoppingCart className="w-12 h-12 text-brand-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Outstanding</p>
                <p className="text-3xl font-bold mt-2">{formatCurrency(summary.sales.outstandingBalance)}</p>
                <p className="text-orange-100 text-xs mt-1">Pending collection</p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Sales Targets */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Sales Targets</h3>
              <p className="text-sm text-gray-500">
                {dateRange.startDate} → {dateRange.endDate}
              </p>
            </div>
            <button
              type="button"
              onClick={openTargetModal}
              className="w-full md:w-auto bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              Set Targets (Crops & Varieties)
            </button>
          </div>

          <div className="mt-4">
            {salesTargetsLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
              </div>
            ) : salesTargetTotals.length === 0 ? (
              <p className="text-sm text-gray-500">No targets set for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-600 font-medium">Sales User</th>
                      <th className="text-right px-3 py-2 text-gray-600 font-medium">Target Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {salesTargetTotals.map((target) => (
                      <tr key={target.userId}>
                        <td className="px-3 py-2 text-gray-800">
                          {target.name}{" "}
                          <span className="text-xs text-gray-500">
                            {target.phone}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-800 font-semibold">
                          {formatCurrency(target.totalTarget || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Opening & Closing Balance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-brand-500 transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Opening Balance</h3>
            <p className="text-3xl font-bold text-brand-600">{formatCurrency(summary.sales.openingBalance)}</p>
            <p className="text-sm text-gray-500 mt-2">Balance before selected period</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-brand-500 transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Closing Balance</h3>
            <p className="text-3xl font-bold text-brand-600">{formatCurrency(summary.sales.closingBalance)}</p>
            <p className="text-sm text-gray-500 mt-2">Balance after selected period</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Sales Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={sales.dailySales}>
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

        {/* Crop-wise Sales */}
        <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Crops by Sales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cropSalesChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="value" fill="#0f766e" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
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

    if (!dashboardData) return null;

    const { stock } = dashboardData;
    const cropsByType = (stock.stockByCrop || []).reduce(
      (acc, crop) => {
        const type = crop.productType === 'chemical' ? 'chemical' : 'seed';
        acc[type].push(crop);
        return acc;
      },
      { seed: [], chemical: [] }
    );

    const calculateSummary = (crops = []) => crops.reduce(
      (summary, crop) => ({
        crops: summary.crops + 1,
        varieties: summary.varieties + (crop.varietiesCount || 0),
        stock: summary.stock + (crop.totalStock || 0),
        value: summary.value + (crop.totalValue || 0),
      }),
      { crops: 0, varieties: 0, stock: 0, value: 0 }
    );
    const seedSummary = calculateSummary(cropsByType.seed);
    const chemicalSummary = calculateSummary(cropsByType.chemical);

    const renderCropGroup = (title, crops, accentColor) => {
      const summary = calculateSummary(crops);
      const accentText = 'text-brand-600';
      const accentBorder = 'border-brand-500';
      const emptyLabel = title.toLowerCase().includes('chemical') ? 'chemicals' : 'crops';

      return (
        <div className="space-y-4">
          <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${accentBorder}`}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                <p className="text-sm text-gray-500">
                  {summary.crops} {summary.crops === 1 ? 'crop' : 'crops'} · {summary.varieties} varieties
                </p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Stock</p>
                  <p className={`text-lg font-semibold ${accentText}`}>{formatNumber(summary.stock)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Value</p>
                  <p className={`text-lg font-semibold ${accentText}`}>{formatCurrency(summary.value)}</p>
                </div>
              </div>
            </div>
          </div>

          {crops.length === 0 ? (
            <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-lg">
              <Package className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">No {emptyLabel} found</p>
              <p className="text-sm mt-2">Add {emptyLabel} to start tracking stock</p>
            </div>
          ) : (
            crops.map((crop) => (
              <div key={crop.cropId} className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleCropExpansion(crop.cropId)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                    >
                      {expandedCrops[crop.cropId] ? (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                    <div>
                      <h4 className="text-lg font-bold text-gray-800">{crop.cropName}</h4>
                      <p className="text-xs text-gray-500">{crop.varietiesCount || 0} varieties</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Stock</p>
                      <p className="text-lg font-semibold text-brand-600">{formatNumber(crop.totalStock)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Value</p>
                      <p className="text-lg font-semibold text-brand-600">{formatCurrency(crop.totalValue)}</p>
                    </div>
                  </div>
                </div>

                {expandedCrops[crop.cropId] && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    {crop.varieties && crop.varieties.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variety</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Price</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Purchase</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {crop.varieties.map((variety) => {
                              const stockQty = variety.currentStock || 0;
                              const isOut = stockQty === 0;
                              const isLow = !isOut && stockQty < 100;
                              const unitLabel = variety.primaryUnit?.abbreviation || variety.primaryUnit?.name || 'N/A';
                              const secondaryLabel = variety.secondaryUnit?.abbreviation || variety.secondaryUnit?.name;
                              const statusBadge = isOut ? 'bg-red-100 text-red-800' : isLow ? 'bg-yellow-100 text-yellow-800' : 'bg-brand-100 text-brand-800';
                              const statusLabel = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'Healthy';

                              return (
                                <tr
                                  key={variety.varietyId}
                                  className={`hover:bg-gray-50 ${isOut ? 'bg-red-50/40' : isLow ? 'bg-yellow-50/40' : ''}`}
                                >
                                  <td className="px-4 py-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-medium text-gray-900">{variety.name}</p>
                                        {secondaryLabel && (
                                          <p className="text-xs text-gray-500">
                                            Secondary: {secondaryLabel} • 1 {unitLabel} = {formatNumber(variety.conversionFactor || 1)} {secondaryLabel}
                                          </p>
                                        )}
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge}`}>
                                        {statusLabel}
                                      </span>
                                    </div>
                                  </td>
                                  <td className={`px-4 py-3 text-right font-medium ${isOut ? 'text-red-600' : 'text-gray-700'}`}>
                                    {formatNumber(stockQty)}
                                  </td>
                                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                    {formatCurrency(variety.stockValue)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-700">
                                    {formatCurrency(variety.averagePrice)}
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-700">
                                    {variety.purchasePrice ? formatCurrency(variety.purchasePrice) : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-right text-gray-700">{unitLabel}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => handleVarietyClick(crop, variety)}
                                      className="inline-flex items-center space-x-1 px-3 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-xs"
                                    >
                                      <Eye className="w-3 h-3" />
                                      <span>View</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                        <p className="text-sm">No varieties available for this crop.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      );
    };

    const activeSummary = stockTypeTab === 'chemical' ? chemicalSummary : seedSummary;
    const activeLabel = stockTypeTab === 'chemical' ? 'Chemicals' : 'Crops (Seeds)';
    const activeAccent = stockTypeTab === 'chemical' ? 'purple' : 'green';

    return (
      <div className="space-y-8">
        {/* Stock Type Tabs + Summary Card */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="inline-flex rounded-xl bg-white shadow-sm border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setStockTypeTab('seed')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                stockTypeTab === 'seed'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Crops (Seeds)
            </button>
            <button
              type="button"
              onClick={() => setStockTypeTab('chemical')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                stockTypeTab === 'chemical'
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Chemicals
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-gray-200 w-full lg:w-[420px]">
            <h3 className="text-base font-semibold text-gray-800 mb-2">{activeLabel} Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
              <div>
                <p>{stockTypeTab === 'chemical' ? 'Total Chemicals' : 'Total Crops'}</p>
                <p className={`text-lg font-semibold ${'text-brand-600'}`}>
                  {activeSummary.crops}
                </p>
              </div>
              <div>
                <p>Varieties</p>
                <p className={`text-lg font-semibold ${'text-brand-600'}`}>
                  {activeSummary.varieties}
                </p>
              </div>
              <div>
                <p>Stock</p>
                <p className={`text-lg font-semibold ${'text-brand-600'}`}>
                  {formatNumber(activeSummary.stock)}
                </p>
              </div>
              <div>
                <p>Value</p>
                <p className={`text-lg font-semibold ${'text-brand-600'}`}>
                  {formatCurrency(activeSummary.value)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Stock Group */}
        {stockTypeTab === 'chemical'
          ? renderCropGroup('Chemicals', cropsByType.chemical, 'purple')
          : renderCropGroup('Crops (Seeds)', cropsByType.seed, 'green')}

        {/* Low Stock Alert */}
        {stock.lowStockVarieties && stock.lowStockVarieties.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 transform transition-all duration-300">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <h3 className="text-lg font-semibold text-yellow-800">Low Stock Alert</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stock.lowStockVarieties.slice(0, 9).map((variety) => (
                <div key={variety.varietyId} className="bg-white rounded-lg p-4 border border-yellow-200">
                  <p className="font-medium text-gray-800">{variety.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Stock: {formatNumber(variety.currentStock)} | Avg: {formatCurrency(variety.averagePrice)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Sales Tab Content
  const renderSalesTab = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
        </div>
      );
    }

    if (!dashboardData) return null;

    const { sales } = dashboardData;

    return (
      <div className="space-y-6">
        {/* Variety-wise Sales */}
        <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Variety-wise Sales</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crop - Variety</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.varietyWiseSales.map((variety) => (
                  <tr key={`${variety.cropId}_${variety.varietyId}`} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{variety.cropName}</p>
                        <p className="text-sm text-gray-500">{variety.varietyName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{variety.orderCount}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(variety.totalQuantity)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(variety.totalValue)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-brand-600">{formatCurrency(variety.totalPaid)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">{formatCurrency(variety.outstanding)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const crop = dashboardData.stock.stockByCrop.find(c => c.cropId === variety.cropId);
                            const varietyData = crop?.varieties.find(v => v.varietyId === variety.varietyId);
                            if (crop && varietyData) {
                              handleVarietyClick(crop, varietyData);
                            }
                          }}
                          className="px-3 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => fetchVarietyLedger(variety.cropId, variety.varietyId)}
                          className="px-3 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Ledger</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Merchant-wise Purchases */}
        <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Merchant-wise Purchases (Ram Agri)</h3>
          {sales.merchantWisePurchases && sales.merchantWisePurchases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">POs</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.merchantWisePurchases.slice(0, 20).map((merchant, index) => (
                    <tr key={merchant.merchantId || index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{merchant.merchantName}</p>
                          <p className="text-xs text-gray-500">{merchant.merchantCode} ({merchant.linkedProductsCount} products)</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{merchant.merchantPhone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{merchant.totalPOs}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatNumber(merchant.totalQuantity)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(merchant.totalValue)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-brand-600">{formatCurrency(merchant.paidAmount)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-orange-600">{formatCurrency(merchant.outstanding)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => fetchMerchantLedger(merchant.merchantId)}
                          className="px-3 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Ledger</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No merchants with Ram Agri purchases found</p>
              <p className="text-sm mt-2">Merchants with linked Ram Agri products and purchase orders will appear here</p>
            </div>
          )}
        </div>

        {/* Customer-wise Sales */}
        <div className="bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer-wise Sales</h3>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.customerWiseSales.slice(0, 20).map((customer, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{customer.customerName}</p>
                        {customer.customerVillage && (
                          <p className="text-xs text-gray-500">{customer.customerVillage}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.customerMobile}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{customer.totalOrders}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(customer.totalValue)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-brand-600">{formatCurrency(customer.totalPaid)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">{formatCurrency(customer.outstanding)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => fetchCustomerLedger(customer.customerMobile, customer.customerName, customer.customerMobile)}
                        className="px-3 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm flex items-center space-x-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Ledger</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Sidebar with Transactions, Stock, and Payments
  const renderSidebar = () => {
    if (!showSidebar || !dashboardData) return null;

    const { transactions, payments, stock } = dashboardData;
    const selectedVarietySales = selectedVariety
      ? dashboardData.sales.varietyWiseSales.find(
          v => v.varietyId === selectedVariety.variety.varietyId && v.cropId === selectedVariety.crop.cropId
        )
      : null;

    return (
      <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto max-h-screen sticky top-0">
        <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Details Panel</h3>
            <button
              onClick={() => setShowSidebar(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <EyeOff className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Selected Variety Details */}
          {selectedVariety && (
            <div className="bg-gradient-to-br from-brand-50 to-brand-100 rounded-lg p-4 border border-brand-200">
              <h4 className="font-semibold text-gray-800 mb-2">Selected Variety</h4>
              <p className="text-sm font-medium text-gray-700">{selectedVariety.crop.cropName} - {selectedVariety.variety.name}</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-semibold text-gray-800">{formatNumber(selectedVariety.variety.currentStock || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock Value:</span>
                  <span className="font-semibold text-brand-600">{formatCurrency(selectedVariety.variety.stockValue || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average Price:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(selectedVariety.variety.averagePrice || 0)}</span>
                </div>
                {selectedVariety.variety.purchasePrice && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Purchase Price:</span>
                    <span className="font-semibold text-brand-600">{formatCurrency(selectedVariety.variety.purchasePrice)}</span>
                  </div>
                )}
                {selectedVariety.variety.primaryUnit && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Primary Unit:</span>
                    <span className="font-semibold text-gray-800">
                      {selectedVariety.variety.primaryUnit?.name || selectedVariety.variety.primaryUnit?.abbreviation || 'N/A'}
                    </span>
                  </div>
                )}
              </div>

              {selectedVarietySales && (
                <div className="mt-4 pt-4 border-t border-brand-200">
                  <h5 className="font-semibold text-gray-800 mb-2">Sales Summary</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Orders:</span>
                      <span className="font-semibold text-gray-800">{selectedVarietySales.orderCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Quantity:</span>
                      <span className="font-semibold text-gray-800">{formatNumber(selectedVarietySales.totalQuantity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Value:</span>
                      <span className="font-semibold text-brand-600">{formatCurrency(selectedVarietySales.totalValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid:</span>
                      <span className="font-semibold text-brand-600">{formatCurrency(selectedVarietySales.totalPaid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Outstanding:</span>
                      <span className="font-semibold text-orange-600">{formatCurrency(selectedVarietySales.outstanding)}</span>
                    </div>
                  </div>

                  {selectedVarietySales.orders && selectedVarietySales.orders.length > 0 && (
                    <div className="mt-4">
                      <h6 className="font-medium text-gray-700 mb-2">Recent Orders</h6>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {selectedVarietySales.orders.slice(0, 5).map((order, idx) => (
                          <div key={idx} className="bg-white rounded p-2 border border-gray-200 text-xs">
                            <p className="font-medium text-gray-800">{order.orderNumber}</p>
                            <p className="text-gray-600">{order.customerName}</p>
                            <div className="flex justify-between mt-1">
                              <span>{formatCurrency(order.amount)}</span>
                              <span className={order.outstanding > 0 ? 'text-orange-600' : 'text-green-600'}>
                                {order.outstanding > 0 ? `₹${order.outstanding}` : 'Paid'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recent Transactions */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Recent Transactions</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions && transactions.slice(0, 20).map((transaction, index) => (
                <div
                  key={index}
                  onClick={() => {
                    const crop = stock.stockByCrop.find(c => c.cropId === transaction.cropId);
                    const variety = crop?.varieties.find(v => v.varietyId === transaction.varietyId);
                    if (crop && variety) {
                      handleVarietyClick(crop, variety);
                    }
                  }}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-brand-500 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-600">{transaction.orderNumber}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      transaction.orderStatus === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                      transaction.orderStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {transaction.orderStatus}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{transaction.cropName} - {transaction.varietyName}</p>
                  <p className="text-xs text-gray-600 mt-1">{transaction.customerName} ({transaction.customerMobile})</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-600">Qty: {formatNumber(transaction.quantity)}</span>
                    <span className="text-xs font-semibold text-brand-600">{formatCurrency(transaction.totalAmount)}</span>
                  </div>
                  {transaction.outstanding > 0 && (
                    <p className="text-xs text-orange-600 mt-1">Outstanding: {formatCurrency(transaction.outstanding)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payments */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Recent Payments</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {payments && payments.slice(0, 20).map((payment, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-gray-600">{payment.orderNumber}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      payment.paymentStatus === 'COLLECTED' ? 'bg-brand-100 text-brand-800' :
                      payment.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {payment.paymentStatus}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{payment.customerName}</p>
                  {payment.cropName && (
                    <p className="text-xs text-gray-600 mt-1">{payment.cropName} - {payment.varietyName}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-600">{payment.modeOfPayment || 'N/A'}</span>
                    <span className="text-xs font-semibold text-brand-600">{formatCurrency(payment.paidAmount)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(payment.paymentDate || payment.orderDate).toLocaleDateString('en-IN')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Summary */}
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Stock Summary</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Crops:</span>
                <span className="font-semibold text-gray-800">{dashboardData.summary.stock.totalCrops}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Varieties:</span>
                <span className="font-semibold text-gray-800">{dashboardData.summary.stock.totalVarieties}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Stock:</span>
                <span className="font-semibold text-brand-600">{formatNumber(dashboardData.summary.stock.totalCurrentStock)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Value:</span>
                <span className="font-semibold text-brand-600">{formatCurrency(dashboardData.summary.stock.totalStockValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Low Stock:</span>
                <span className="font-semibold text-yellow-600">{dashboardData.summary.stock.lowStockCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Out of Stock:</span>
                <span className="font-semibold text-red-600">{dashboardData.summary.stock.outOfStockCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const customerLedgerEntries = (customerLedgerData?.entries || []).map((entry) => {
    const rawDate = entry?.date || entry?.details?.entryDate || entry?.createdAt;
    return {
      ...entry,
      _displayDate: rawDate || entry?.date,
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${showSidebar ? 'mr-0' : ''}`}>
        {/* Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-full mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/u/inventory')}
                  className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800">Ram Agri Input Dashboard</h1>
                  <p className="text-gray-600">Comprehensive insights into Ram Agri Input products, stock, and sales</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {!showSidebar && (
                  <button
                    onClick={() => setShowSidebar(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Show Details</span>
                  </button>
                )}
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
        </div>

        {/* Date Range Filter */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-full mx-auto px-6 py-4">
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
        </div>

        {/* Status Filter – counts from API, easy chip selection */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-full mx-auto px-6 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-gray-600 mr-1">Status:</span>
              <button
                onClick={() => {
                  setOrderStatusFilter([]);
                  setPaymentStatusFilter([]);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  orderStatusFilter.length === 0 && paymentStatusFilter.length === 0
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <span className="text-gray-400 mx-1">|</span>
              <span className="text-xs font-medium text-gray-500">Order:</span>
              {['PENDING', 'ACCEPTED', 'ASSIGNED', 'DISPATCHED', 'COMPLETED', 'REJECTED', 'CANCELLED'].map((s) => {
                const count = dashboardData?.statusCounts?.orderStatus?.[s] ?? 0;
                const active = orderStatusFilter.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setOrderStatusFilter((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s} ({count})
                  </button>
                );
              })}
              <span className="text-gray-400 mx-1">|</span>
              <span className="text-xs font-medium text-gray-500">Payment:</span>
              {['COLLECTED', 'PENDING', 'REJECTED'].map((s) => {
                const count = dashboardData?.statusCounts?.paymentStatus?.[s] ?? 0;
                const active = paymentStatusFilter.includes(s);
                return (
                  <button
                    key={s}
                    onClick={() => {
                      setPaymentStatusFilter((prev) =>
                        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {s} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-full mx-auto px-6">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Overview</span>
                </div>
              </button>
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
                onClick={() => setActiveTab('sales')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'sales'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Sales</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-full mx-auto px-6 py-8">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'stock' && renderStockTab()}
          {activeTab === 'sales' && renderSalesTab()}
        </div>
      </div>

      {/* Sidebar */}
      {renderSidebar()}

      {/* Variety Ledger Modal */}
      {showVarietyLedger && varietyLedgerData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Variety Ledger</h2>
                <p className="text-gray-600 mt-1">{varietyLedgerData.variety?.cropName} - {varietyLedgerData.variety?.varietyName}</p>
              </div>
              <button
                onClick={() => {
                  setShowVarietyLedger(false);
                  setVarietyLedgerData(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingLedger ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                      <p className="text-sm text-gray-600">Opening Stock</p>
                      <p className="text-xl font-bold text-brand-600">{formatNumber(varietyLedgerData.summary?.openingStock || 0)}</p>
                    </div>
                    <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                      <p className="text-sm text-gray-600">Total Credit</p>
                      <p className="text-xl font-bold text-brand-600">{formatNumber(varietyLedgerData.summary?.totalCredit || 0)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-sm text-gray-600">Total Debit</p>
                      <p className="text-xl font-bold text-red-600">{formatNumber(varietyLedgerData.summary?.totalDebit || 0)}</p>
                    </div>
                    <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                      <p className="text-sm text-gray-600">Closing Stock</p>
                      <p className="text-xl font-bold text-purple-600">{formatNumber(varietyLedgerData.summary?.closingStock || 0)}</p>
                    </div>
                  </div>

                  {/* Ledger Entries */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {varietyLedgerData.entries?.map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(entry.date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                entry.type === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {entry.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{entry.reference}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">{entry.description}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{formatNumber(entry.quantity || 0)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">{formatNumber(entry.balance || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Ledger Modal */}
      {showCustomerLedger && customerLedgerData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Customer Ledger</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-gray-600">{customerLedgerData.customer?.name} ({customerLedgerData.customer?.mobile})</p>
                  <button
                    type="button"
                    onClick={() => setShowCustomerLedgerSummaryDetails((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors"
                  >
                    Outstanding
                    <span className="text-orange-900">{formatCurrency(customerLedgerData.summary?.outstanding || 0)}</span>
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCustomerLedger(false);
                  setCustomerLedgerData(null);
                  setShowCustomerLedgerSummaryDetails(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingLedger ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
                </div>
              ) : (
                <>
                  {/* Totals */}
                  {showCustomerLedgerSummaryDetails && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                        <p className="text-sm text-gray-600">Total Debit</p>
                        <p className="text-xl font-bold text-red-600">{formatCurrency(customerLedgerData.summary?.totalDebit || 0)}</p>
                      </div>
                      <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                        <p className="text-sm text-gray-600">Total Credit</p>
                        <p className="text-xl font-bold text-brand-600">{formatCurrency(customerLedgerData.summary?.totalCredit || 0)}</p>
                      </div>
                    </div>
                  )}

                  {/* Ledger Entries */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {customerLedgerEntries.map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(entry._displayDate || entry.date).toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                entry.type === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {entry.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{entry.reference}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">{entry.description}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(entry.amount || 0)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(entry.balance || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Merchant Ledger Modal */}
      {showMerchantLedger && merchantLedgerData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Merchant Ledger</h2>
                <p className="text-gray-600 mt-1">{merchantLedgerData.merchant?.name} ({merchantLedgerData.merchant?.code})</p>
                {merchantLedgerData.merchant?.phone && (
                  <p className="text-sm text-gray-500">{merchantLedgerData.merchant.phone}</p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowMerchantLedger(false);
                  setMerchantLedgerData(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {loadingLedger ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
                </div>
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                      <p className="text-sm text-gray-600">Total POs</p>
                      <p className="text-xl font-bold text-brand-600">{merchantLedgerData.summary?.totalPOs || 0}</p>
                      <p className="text-xs text-gray-500 mt-1">{merchantLedgerData.summary?.totalGRNs || 0} GRNs</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <p className="text-sm text-gray-600">Total Debit</p>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(merchantLedgerData.summary?.totalDebit || 0)}</p>
                    </div>
                    <div className="bg-brand-50 rounded-lg p-4 border border-brand-200">
                      <p className="text-sm text-gray-600">Total Credit</p>
                      <p className="text-xl font-bold text-brand-600">{formatCurrency(merchantLedgerData.summary?.totalCredit || 0)}</p>
                      <p className="text-xs text-gray-500 mt-1">Paid: {formatCurrency(merchantLedgerData.summary?.paidAmount || 0)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                      <p className="text-sm text-gray-600">Outstanding</p>
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(merchantLedgerData.summary?.outstanding || 0)}</p>
                    </div>
                  </div>

                  {/* Ledger Entries */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {merchantLedgerData.entries?.map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(entry.date).toLocaleDateString('en-IN')}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                entry.type === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {entry.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{entry.category}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{entry.reference}</td>
                            <td className="px-4 py-3 text-sm text-gray-800">{entry.description}</td>
                            <td className="px-4 py-3 text-sm text-right">{formatNumber(entry.quantity || 0)}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(entry.amount || 0)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold">{formatCurrency(entry.balance || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sales Target Modal */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Set Sales Targets</h2>
                <p className="text-gray-600 mt-1">
                  {dateRange.startDate} → {dateRange.endDate}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTargetModal(false);
                  setTargetMap({});
                  setTargetUserId("");
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <label className="block text-sm text-gray-600 mb-1">Sales User</label>
                <select
                  value={targetUserId}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTargetUserId(value);
                    loadTargetsForUser(value);
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select user</option>
                  {salesUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name} ({user.phoneNumber || user.phone || "N/A"})
                    </option>
                  ))}
                </select>
              </div>

              {targetModalLoading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
                </div>
              ) : targetCrops.length === 0 ? (
                <p className="text-sm text-gray-500">No crops available.</p>
              ) : (
                <div className="space-y-4">
                  {targetCrops.map((crop) => (
                    <div key={crop._id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base font-semibold text-gray-800">{crop.cropName}</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                          {(crop.productType || "seed").toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(crop.varieties || []).map((variety) => {
                          const key = buildTargetKey(crop._id, variety._id);
                          return (
                            <div key={variety._id} className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-gray-700">{variety.name}</p>
                                <p className="text-xs text-gray-500">
                                  {variety.primaryUnit?.abbreviation || variety.primaryUnit?.name || "unit"}
                                </p>
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={targetMap[key] || ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setTargetMap((prev) => ({ ...prev, [key]: value }));
                                }}
                                className="w-32 border border-gray-300 rounded-lg px-2 py-1 text-sm text-right"
                                placeholder="₹ Target"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTargetModal(false);
                  setTargetMap({});
                  setTargetUserId("");
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTargetSave}
                disabled={targetSaveLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-60"
              >
                {targetSaveLoading ? "Saving..." : "Save Targets"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RamAgriSalesDashboard;

