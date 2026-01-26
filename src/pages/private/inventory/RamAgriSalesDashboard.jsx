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
  Download,
  MessageCircle,
  Share2,
  Copy,
  Check,
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
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'stock', 'sales', 'targets', 'orders'
  const [orderStatusTab, setOrderStatusTab] = useState('pending'); // 'pending', 'accepted', 'dispatched', 'completed', 'outstanding'
  const [outstandingOrders, setOutstandingOrders] = useState([]);
  const [outstandingOrdersLoading, setOutstandingOrdersLoading] = useState(false);
  const [outstandingOrdersPage, setOutstandingOrdersPage] = useState(1);
  const [outstandingOrdersTotal, setOutstandingOrdersTotal] = useState(0);
  const outstandingOrdersPerPage = 20;
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
  const [targetModalDateRange, setTargetModalDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [videoSummary, setVideoSummary] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoPeriod, setVideoPeriod] = useState('day'); // 'day' or 'week'
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
    fetchSalesTargets();
  }, [dateRange]);

  useEffect(() => {
    if (activeTab === 'orders' && orderStatusTab === 'outstanding') {
      fetchOutstandingOrders();
    }
  }, [activeTab, orderStatusTab, outstandingOrdersPage]);

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
      // Filter out zero amounts and validate
      const targets = Object.entries(targetMap)
        .map(([key, amount]) => {
          const [cropId, varietyId] = key.split("_");
          const targetAmount = Number(amount || 0);
          return { cropId, varietyId, targetAmount };
        })
        .filter((target) => target.targetAmount > 0 && target.cropId && target.varietyId);

      if (targets.length === 0) {
        Toast.error("Please set at least one target with amount greater than 0");
        setTargetSaveLoading(false);
        return;
      }

      const payload = {
        userId: targetUserId,
        startDate: targetModalDateRange.startDate,
        endDate: targetModalDateRange.endDate,
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

  const generateVideoSummary = async (period = 'day') => {
    try {
      setVideoLoading(true);
      setVideoPeriod(period);
      const params = { period };
      
      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_VIDEO_SUMMARY);
      const response = await instance.request({}, params);

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' || apiResponse.success) {
          setVideoSummary(apiResponse.data);
          setShowVideoModal(true);
        } else {
          Toast.error(apiResponse.message || 'Failed to generate video summary');
        }
      }
    } catch (error) {
      console.error('Error generating video summary:', error);
      Toast.error('Failed to generate video summary');
    } finally {
      setVideoLoading(false);
    }
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

  // Export stock data to CSV (table format: Crop, Variety, Stock)
  const exportStockToCSV = (crops, type) => {
    try {
      setExporting(true);
      const allVarieties = [];
      
      crops.forEach((crop) => {
        if (crop.varieties && crop.varieties.length > 0) {
          crop.varieties.forEach((variety) => {
            const unitLabel = variety.primaryUnit?.abbreviation || variety.primaryUnit?.name || 'N/A';
            allVarieties.push({
              'Crop': crop.cropName,
              'Variety': variety.name,
              'Stock': `${formatNumber(variety.currentStock || 0)} ${unitLabel}`,
            });
          });
        }
      });

      // Create CSV content in table format
      const headers = ['Crop', 'Variety', 'Stock'];
      const csvContent = [
        headers.join(','),
        ...allVarieties.map(row => 
          headers.map(header => {
            const value = row[header] || '';
            return typeof value === 'string' && (value.includes(',') || value.includes('"'))
              ? `"${value.replace(/"/g, '""')}"`
              : value;
          }).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `ram-agri-stock-${type}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      Toast.success('Stock data exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      Toast.error('Failed to export stock data');
    } finally {
      setExporting(false);
    }
  };

  // Fetch outstanding orders
  const fetchOutstandingOrders = async () => {
    setOutstandingOrdersLoading(true);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS);
      // Fetch all orders and filter client-side for outstanding
      // No date filter as per requirement
      const response = await instance.request(
        {},
        {
          orderStatus: 'COMPLETED',
          limit: 1000, // Fetch more to filter client-side
        }
      );
      if (response?.data?.success) {
        const allOrders = response.data.data?.data || [];
        // Filter orders with outstanding balance > 0
        const outstanding = allOrders
          .filter(order => (order.balanceAmount || 0) > 0)
          .sort((a, b) => (b.balanceAmount || 0) - (a.balanceAmount || 0)); // Sort by highest outstanding first
        
        // Apply pagination
        const startIndex = (outstandingOrdersPage - 1) * outstandingOrdersPerPage;
        const endIndex = startIndex + outstandingOrdersPerPage;
        setOutstandingOrders(outstanding.slice(startIndex, endIndex));
        setOutstandingOrdersTotal(outstanding.length);
      }
    } catch (error) {
      console.error('Error fetching outstanding orders:', error);
      Toast.error('Failed to fetch outstanding orders');
    } finally {
      setOutstandingOrdersLoading(false);
    }
  };

  // Helper function to calculate days remaining for delivery date
  const getDaysRemaining = (deliveryDate) => {
    if (!deliveryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(deliveryDate);
    delivery.setHours(0, 0, 0, 0);
    const diffTime = delivery - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function to format days remaining chip
  const renderDeliveryDateChip = (deliveryDate) => {
    const daysRemaining = getDaysRemaining(deliveryDate);
    if (daysRemaining === null) return null;

    let chipText = '';
    let chipColor = 'bg-gray-100 text-gray-800';
    
    if (daysRemaining < 0) {
      chipText = `Overdue ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}`;
      chipColor = 'bg-red-100 text-red-800';
    } else if (daysRemaining === 0) {
      chipText = 'Today';
      chipColor = 'bg-orange-100 text-orange-800';
    } else if (daysRemaining === 1) {
      chipText = 'Tomorrow';
      chipColor = 'bg-yellow-100 text-yellow-800';
    } else {
      chipText = `${daysRemaining} days`;
      chipColor = daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
    }

    return (
      <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${chipColor}`}>
        {chipText}
      </span>
    );
  };

  // Copy all stock data to clipboard
  const copyAllStockData = (varieties) => {
    try {
      const data = varieties.map(v => {
        const unitLabel = v.primaryUnit?.abbreviation || v.primaryUnit?.name || 'N/A';
        return {
          crop: v.cropName,
          variety: v.name,
          stock: `${formatNumber(v.currentStock || 0)} ${unitLabel}`,
        };
      });

      const text = [
        'Crop\tVariety\tStock',
        ...data.map(d => `${d.crop}\t${d.variety}\t${d.stock}`)
      ].join('\n');

      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        Toast.success('Stock data copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (error) {
      console.error('Copy error:', error);
      Toast.error('Failed to copy data');
    }
  };

  // Generate WhatsApp message for crop-wise (all varieties of a crop)
  const generateCropWhatsAppMessage = (crop) => {
    if (!crop.varieties || crop.varieties.length === 0) {
      return null;
    }

    let message = `🌾 *Ram Agri Input - Stock Information*\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📦 *Crop:* ${crop.cropName}\n`;
    message += `📊 *Total Varieties:* ${crop.varieties.length}\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `*Stock Details:*\n\n`;

    crop.varieties.forEach((variety, index) => {
      const stockQty = variety.currentStock || 0;
      const unitLabel = variety.primaryUnit?.abbreviation || variety.primaryUnit?.name || 'N/A';
      const isOut = stockQty === 0;
      const isLow = !isOut && stockQty < 100;
      const status = isOut ? '❌ Out of Stock' : isLow ? '⚠️ Low Stock' : '✅ Available';
      
      // Better alignment with fixed width formatting
      const varietyName = `${index + 1}. ${variety.name}`;
      const stockInfo = `Stock: *${formatNumber(stockQty)} ${unitLabel}*`;
      const statusInfo = `Status: ${status}`;
      
      message += `*${varietyName}*\n`;
      message += `${stockInfo}\n`;
      message += `${statusInfo}\n`;
      
      if (index < crop.varieties.length - 1) {
        message += `\n────────────────────────\n\n`;
      }
    });

    message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `📅 *Date:* ${new Date().toLocaleDateString('en-IN')}\n\n`;
    message += `📞 *For inquiries, please contact the office.*`;
    
    return message;
  };

  // Share crop-wise to WhatsApp
  const shareCropToWhatsApp = (crop) => {
    const message = generateCropWhatsAppMessage(crop);
    if (!message) {
      Toast.error('No varieties found for this crop');
      return;
    }
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Try to use Web Share API first
    if (navigator.share) {
      navigator.share({
        title: `${crop.cropName} Stock`,
        text: message,
        url: whatsappUrl,
      }).catch(() => {
        // Fallback: open WhatsApp
        window.open(whatsappUrl, '_blank');
      });
    } else {
      // Fallback: open WhatsApp
      window.open(whatsappUrl, '_blank');
    }
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

    // Flatten all varieties for card view
    const getAllVarieties = (crops) => {
      const allVarieties = [];
      crops.forEach((crop) => {
        if (crop.varieties && crop.varieties.length > 0) {
          crop.varieties.forEach((variety) => {
            allVarieties.push({
              ...variety,
              cropId: crop.cropId,
              cropName: crop.cropName,
              crop: crop,
            });
          });
        }
      });
      return allVarieties;
    };

    const activeVarieties = getAllVarieties(
      stockTypeTab === 'chemical' ? cropsByType.chemical : cropsByType.seed
    );
    const activeSummary = stockTypeTab === 'chemical' ? chemicalSummary : seedSummary;
    const activeLabel = stockTypeTab === 'chemical' ? 'Chemicals' : 'Crops (Seeds)';
    const activeCrops = stockTypeTab === 'chemical' ? cropsByType.chemical : cropsByType.seed;

    return (
      <div className="space-y-6">
        {/* Stock Type Tabs + Summary Card + Actions */}
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

          <div className="flex items-center gap-3 flex-wrap">
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-brand-500 w-full lg:w-[280px]">
              <h3 className="text-base font-semibold text-gray-800 mb-2">{activeLabel} Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                <div>
                  <p>{stockTypeTab === 'chemical' ? 'Total Chemicals' : 'Total Crops'}</p>
                  <p className="text-lg font-semibold text-brand-600">{activeSummary.crops}</p>
                </div>
                <div>
                  <p>Varieties</p>
                  <p className="text-lg font-semibold text-brand-600">{activeSummary.varieties}</p>
                </div>
                <div>
                  <p>Stock</p>
                  <p className="text-lg font-semibold text-brand-600">{formatNumber(activeSummary.stock)}</p>
                </div>
                <div>
                  <p>Value</p>
                  <p className="text-lg font-semibold text-brand-600">{formatCurrency(activeSummary.value)}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyAllStockData(activeVarieties)}
                disabled={activeVarieties.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy All'}</span>
              </button>
              <button
                type="button"
                onClick={() => exportStockToCSV(activeCrops, stockTypeTab)}
                disabled={exporting || activeVarieties.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                <Download className={`w-4 h-4 ${exporting ? 'animate-spin' : ''}`} />
                <span>{exporting ? 'Exporting...' : 'Export CSV'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Compact Card Grid View - Only Crop, Variety, Stock */}
        {activeVarieties.length === 0 ? (
          <div className="text-center py-10 text-gray-500 bg-white rounded-xl shadow-lg">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="text-lg font-medium">No {activeLabel.toLowerCase()} found</p>
            <p className="text-sm mt-2">Add {activeLabel.toLowerCase()} to start tracking stock</p>
          </div>
        ) : (
          <div>
            {/* Group by Crop */}
            {activeCrops.map((crop) => {
              if (!crop.varieties || crop.varieties.length === 0) return null;
              
              return (
                <div key={crop.cropId} className="mb-6">
                  {/* Crop Header with WhatsApp Button */}
                  <div className="flex items-center justify-between mb-3 px-2">
                    <h3 className="text-lg font-bold text-gray-800">{crop.cropName}</h3>
                    <button
                      onClick={() => shareCropToWhatsApp(crop)}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      title="Share crop stock on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>
                  </div>

                  {/* Varieties Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {crop.varieties.map((variety) => {
                      const stockQty = variety.currentStock || 0;
                      const isOut = stockQty === 0;
                      const isLow = !isOut && stockQty < 100;
                      const cardBorder = isOut 
                        ? 'border-red-300 bg-red-50/30' 
                        : isLow 
                        ? 'border-yellow-300 bg-yellow-50/30' 
                        : 'border-gray-200';

                      return (
                        <div
                          key={`${crop.cropId}_${variety.varietyId}`}
                          className={`bg-white rounded-lg shadow-sm p-3 border ${cardBorder} transform transition-all duration-200 hover:shadow-md`}
                        >
                          {/* Compact Info - Only Crop, Variety, Stock */}
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-gray-500 truncate">{crop.cropName}</p>
                            <p className="text-sm font-bold text-gray-900 truncate">{variety.name}</p>
                            <div className="pt-1 border-t border-gray-100">
                              <p className="text-xs text-gray-600">Stock</p>
                              <p className={`text-base font-bold ${isOut ? 'text-red-600' : 'text-brand-600'}`}>
                                {formatNumber(stockQty)} {variety.primaryUnit?.abbreviation || variety.primaryUnit?.name || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

  // Targets Tab Content
  const renderTargetsTab = () => {
    // Helper function to get variety name
    const getVarietyName = (cropId, varietyId) => {
      if (!cropId || !varietyId) return 'N/A';
      const cropIdStr = cropId._id || cropId;
      const varietyIdStr = varietyId._id || varietyId;
      
      // Try to find in targetCrops first (if loaded)
      const crop = targetCrops.find(c => (c._id || c.cropId) === cropIdStr);
      if (crop && crop.varieties) {
        const variety = crop.varieties.find(v => (v._id || v.varietyId) === varietyIdStr);
        if (variety) return variety.name;
      }
      
      // Try to find in dashboardData stock
      if (dashboardData?.stock?.stockByCrop) {
        const stockCrop = dashboardData.stock.stockByCrop.find(c => c.cropId === cropIdStr);
        if (stockCrop && stockCrop.varieties) {
          const variety = stockCrop.varieties.find(v => v.varietyId === varietyIdStr);
          if (variety) return variety.name;
        }
      }
      
      return varietyIdStr.toString().substring(0, 8) + '...';
    };

    // Group targets by user
    const targetsByUser = salesTargets.reduce((acc, target) => {
      const userId = target.userId?._id || target.userId;
      const userName = target.userId?.name || 'Unknown User';
      const userPhone = target.userId?.phoneNumber || target.userId?.phone || 'N/A';
      const cropId = target.cropId?._id || target.cropId;
      const varietyId = target.varietyId;
      
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName,
          userPhone,
          targets: [],
          totalTarget: 0,
        };
      }
      
      // Add variety name to target
      const targetWithVarietyName = {
        ...target,
        varietyName: getVarietyName(cropId, varietyId),
      };
      
      acc[userId].targets.push(targetWithVarietyName);
      acc[userId].totalTarget += target.targetAmount || 0;
      
      return acc;
    }, {});

    const userTargetsList = Object.values(targetsByUser);

    return (
      <div className="space-y-6">
        {/* Header with Set Targets Button */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Sales Targets</h2>
              <p className="text-sm text-gray-500 mt-1">
                Period: {dateRange.startDate} → {dateRange.endDate}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {userTargetsList.length} user(s) with targets set
              </p>
            </div>
            <button
              onClick={openTargetModal}
              className="w-full md:w-auto bg-brand-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center space-x-2"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Set Targets</span>
            </button>
          </div>
        </div>

        {/* Targets List */}
        {salesTargetsLoading ? (
          <div className="flex items-center justify-center h-96 bg-white rounded-xl shadow-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
          </div>
        ) : userTargetsList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No Targets Set</h3>
            <p className="text-sm text-gray-500 mb-4">
              Set sales targets for users to track their performance
            </p>
            <button
              onClick={openTargetModal}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              Set Targets Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {userTargetsList.map((userTarget) => (
              <div key={userTarget.userId} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                {/* User Header */}
                <div className="bg-gradient-to-r from-brand-50 to-brand-100 p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{userTarget.userName}</h3>
                      <p className="text-sm text-gray-600">{userTarget.userPhone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Target</p>
                      <p className="text-xl font-bold text-brand-600">{formatCurrency(userTarget.totalTarget)}</p>
                      <p className="text-xs text-gray-500 mt-1">{userTarget.targets.length} crop/variety target(s)</p>
                    </div>
                  </div>
                </div>

                {/* Targets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Crop</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variety</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Target</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Achieved</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Progress</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Range</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {userTarget.targets.map((target, index) => {
                        const targetAmount = target.targetAmount || 0;
                        const achievedAmount = target.achievedAmount || 0;
                        const progressPercent = target.progressPercent || (targetAmount > 0 ? Math.min((achievedAmount / targetAmount) * 100, 100) : 0);
                        const orderCount = target.orderCount || 0;
                        
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-800">
                                  {target.cropId?.cropName || 'Unknown Crop'}
                                </span>
                                {target.cropId?.productType && (
                                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                                    {target.cropId.productType.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <span className="font-medium">{target.varietyName || 'N/A'}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-sm font-semibold text-brand-600">
                                {formatCurrency(targetAmount)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div>
                                <span className={`text-sm font-semibold ${achievedAmount >= targetAmount ? 'text-green-600' : achievedAmount > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                                  {formatCurrency(achievedAmount)}
                                </span>
                                {orderCount > 0 && (
                                  <span className="block text-xs text-gray-500 mt-0.5">
                                    {orderCount} order{orderCount !== 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-end">
                                <span className={`text-sm font-semibold ${
                                  progressPercent >= 100 ? 'text-green-600' : 
                                  progressPercent >= 50 ? 'text-orange-600' : 
                                  'text-red-600'
                                }`}>
                                  {progressPercent.toFixed(1)}%
                                </span>
                                <div className="w-20 h-1.5 bg-gray-200 rounded-full mt-1">
                                  <div
                                    className={`h-full rounded-full ${
                                      progressPercent >= 100 ? 'bg-green-500' : 
                                      progressPercent >= 50 ? 'bg-orange-500' : 
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {target.startDate && target.endDate ? (
                                <span>
                                  {new Date(target.startDate).toLocaleDateString('en-IN')} → {new Date(target.endDate).toLocaleDateString('en-IN')}
                                </span>
                              ) : (
                                'N/A'
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {target.updatedAt ? (
                                <span>{new Date(target.updatedAt).toLocaleDateString('en-IN')}</span>
                              ) : (
                                'N/A'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
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
                        {(customer.customerTaluka || customer.customerVillage) && (
                          <p className="text-xs text-gray-500">
                            {customer.customerTaluka && customer.customerVillage 
                              ? `${customer.customerTaluka} → ${customer.customerVillage}`
                              : customer.customerTaluka || customer.customerVillage}
                          </p>
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

  // Orders Tab Content
  const renderOrdersTab = () => {
    const fetchOrdersByStatus = async (status) => {
      // This will be called when switching tabs
      // For now, we only fetch outstanding orders
      if (status === 'outstanding') {
        await fetchOutstandingOrders();
      }
    };

    return (
      <div className="space-y-6">
        {/* Order Status Tabs */}
        <div className="bg-white rounded-xl shadow-lg border-b border-gray-200">
          <div className="overflow-x-auto">
            <div className="flex space-x-1 px-4 min-w-max">
            <button
              onClick={() => {
                setOrderStatusTab('pending');
                fetchOrdersByStatus('pending');
              }}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                orderStatusTab === 'pending'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => {
                setOrderStatusTab('accepted');
                fetchOrdersByStatus('accepted');
              }}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                orderStatusTab === 'accepted'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Accepted
            </button>
            <button
              onClick={() => {
                setOrderStatusTab('dispatched');
                fetchOrdersByStatus('dispatched');
              }}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                orderStatusTab === 'dispatched'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Dispatched
            </button>
            <button
              onClick={() => {
                setOrderStatusTab('completed');
                fetchOrdersByStatus('completed');
              }}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                orderStatusTab === 'completed'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => {
                setOrderStatusTab('outstanding');
                fetchOrdersByStatus('outstanding');
              }}
              className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                orderStatusTab === 'outstanding'
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Outstanding
            </button>
            </div>
          </div>
        </div>

        {/* Orders Content */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {orderStatusTab === 'outstanding' ? (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Outstanding Orders</h3>
              {outstandingOrdersLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
                </div>
              ) : outstandingOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">No outstanding orders found</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {outstandingOrders.map((order) => (
                      <div
                        key={order._id}
                        className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-brand-500 hover:shadow-md transition-all relative"
                      >
                        {renderDeliveryDateChip(order.deliveryDate)}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                order.orderStatus === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                order.orderStatus === 'DISPATCHED' ? 'bg-blue-100 text-blue-800' :
                                order.orderStatus === 'ACCEPTED' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.orderStatus}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-800 mb-1">{order.customerName}</p>
                            {(order.customerTaluka || order.customerVillage) && (
                              <p className="text-xs text-gray-500 mb-1">
                                {order.customerTaluka && order.customerVillage 
                                  ? `${order.customerTaluka} → ${order.customerVillage}`
                                  : order.customerTaluka || order.customerVillage}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 mb-2">{order.customerMobile}</p>
                            <p className="text-sm text-gray-700 mb-2">{order.productName}</p>
                            <div className="flex items-center space-x-4 text-sm">
                              <span className="text-gray-600">Qty: <span className="font-semibold">{order.quantity}</span></span>
                              <span className="text-gray-600">Rate: <span className="font-semibold">{formatCurrency(order.rate)}</span></span>
                              <span className="text-gray-600">Total: <span className="font-semibold">{formatCurrency(order.totalAmount)}</span></span>
                            </div>
                            <div className="flex items-center space-x-4 mt-2 text-sm">
                              <span className="text-brand-600">Paid: <span className="font-semibold">{formatCurrency(order.totalPaidAmount || 0)}</span></span>
                              <span className="text-orange-600 font-semibold">Outstanding: {formatCurrency(order.balanceAmount || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {outstandingOrdersTotal > outstandingOrdersPerPage && (() => {
                    const startIndex = (outstandingOrdersPage - 1) * outstandingOrdersPerPage + 1;
                    const endIndex = Math.min(outstandingOrdersPage * outstandingOrdersPerPage, outstandingOrdersTotal);
                    const isFirstPage = outstandingOrdersPage === 1;
                    const isLastPage = outstandingOrdersPage * outstandingOrdersPerPage >= outstandingOrdersTotal;
                    
                    return (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Showing {startIndex} to {endIndex} of {outstandingOrdersTotal} orders
                        </p>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setOutstandingOrdersPage(prev => Math.max(1, prev - 1))}
                            disabled={isFirstPage}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isFirstPage
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-brand-600 text-white hover:bg-brand-700'
                            }`}
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setOutstandingOrdersPage(prev => prev + 1)}
                            disabled={isLastPage}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isLastPage
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-brand-600 text-white hover:bg-brand-700'
                            }`}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg font-medium">Orders for {orderStatusTab} status will be displayed here</p>
              <p className="text-sm mt-2">This feature is coming soon</p>
            </div>
          )}
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
                            {(order.customerTaluka || order.customerVillage) && (
                              <p className="text-gray-500 text-xs mt-0.5">
                                {order.customerTaluka && order.customerVillage 
                                  ? `${order.customerTaluka} → ${order.customerVillage}`
                                  : order.customerTaluka || order.customerVillage}
                              </p>
                            )}
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
                  {(payment.customerTaluka || payment.customerVillage) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {payment.customerTaluka && payment.customerVillage 
                        ? `${payment.customerTaluka} → ${payment.customerVillage}`
                        : payment.customerTaluka || payment.customerVillage}
                    </p>
                  )}
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
                <div className="flex items-center space-x-2 border-r border-gray-300 pr-3">
                  <button
                    onClick={() => generateVideoSummary('day')}
                    disabled={videoLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    <BarChart3 className={`w-4 h-4 ${videoLoading ? 'animate-spin' : ''}`} />
                    <span>Video (Day)</span>
                  </button>
                  <button
                    onClick={() => generateVideoSummary('week')}
                    disabled={videoLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    <BarChart3 className={`w-4 h-4 ${videoLoading ? 'animate-spin' : ''}`} />
                    <span>Video (Week)</span>
                  </button>
                </div>
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
              <button
                onClick={() => setActiveTab('targets')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'targets'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Targets</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'orders'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>Orders</span>
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
          {activeTab === 'targets' && renderTargetsTab()}
          {activeTab === 'orders' && renderOrdersTab()}
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
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-800">Set Sales Targets</h2>
                <div className="mt-2 space-y-2">
                  {/* Quick Day Selection */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setDate(endDate.getDate() - 7);
                        setTargetModalDateRange({
                          startDate: startDate.toISOString().split('T')[0],
                          endDate: endDate.toISOString().split('T')[0],
                        });
                      }}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                      7 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setDate(endDate.getDate() - 15);
                        setTargetModalDateRange({
                          startDate: startDate.toISOString().split('T')[0],
                          endDate: endDate.toISOString().split('T')[0],
                        });
                      }}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                      15 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setDate(endDate.getDate() - 30);
                        setTargetModalDateRange({
                          startDate: startDate.toISOString().split('T')[0],
                          endDate: endDate.toISOString().split('T')[0],
                        });
                      }}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                      30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setMonth(endDate.getMonth() - 1);
                        setTargetModalDateRange({
                          startDate: startDate.toISOString().split('T')[0],
                          endDate: endDate.toISOString().split('T')[0],
                        });
                      }}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                      1 Month
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setMonth(endDate.getMonth() - 3);
                        setTargetModalDateRange({
                          startDate: startDate.toISOString().split('T')[0],
                          endDate: endDate.toISOString().split('T')[0],
                        });
                      }}
                      className="px-3 py-1 text-xs rounded-lg border border-gray-300 hover:bg-gray-100"
                    >
                      3 Months
                    </button>
                  </div>
                  {/* Date Range Inputs */}
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={targetModalDateRange.startDate}
                      onChange={(e) => setTargetModalDateRange({ ...targetModalDateRange, startDate: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    />
                    <span className="text-gray-500">→</span>
                    <input
                      type="date"
                      value={targetModalDateRange.endDate}
                      onChange={(e) => setTargetModalDateRange({ ...targetModalDateRange, endDate: e.target.value })}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                </div>
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

      {/* Video Summary Modal */}
      {showVideoModal && videoSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Video Summary ({videoPeriod === 'day' ? 'Daily' : 'Weekly'})</h2>
                <p className="text-gray-600 mt-1">
                  {new Date(videoSummary.currentPeriod.start).toLocaleDateString('en-IN')} - {new Date(videoSummary.currentPeriod.end).toLocaleDateString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowVideoModal(false);
                  setVideoSummary(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Video Player */}
              {videoSummary.video?.videoUrl ? (
                <div className="mb-6">
                  <video
                    src={videoSummary.video.videoUrl.startsWith('http') 
                      ? videoSummary.video.videoUrl 
                      : `${window.location.origin}${videoSummary.video.videoUrl}`}
                    controls
                    className="w-full rounded-lg shadow-lg"
                    autoPlay
                    crossOrigin="anonymous"
                  >
                    Your browser does not support the video tag.
                  </video>
                  {videoSummary.video.method === 'google-tts-ffmpeg' && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      🆓 Generated using Google Cloud TTS (FREE)
                    </p>
                  )}
                  {videoSummary.video.method === 'd-id' && (
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Generated using D-ID API
                    </p>
                  )}
                </div>
              ) : (
                <div className="mb-6 bg-gray-100 rounded-lg p-8 text-center">
                  <p className="text-gray-600 mb-2 font-semibold">Video generation not available</p>
                  {videoSummary.videoError ? (
                    <div className="mt-2">
                      <p className="text-sm text-red-600 mb-2">Error: {videoSummary.videoError}</p>
                      <p className="text-xs text-gray-500">
                        Please check D_ID_API_KEY configuration in backend .env file.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      Please check D_ID_API_KEY configuration in backend .env file.
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    The Hindi text summary is still available below.
                  </p>
                </div>
              )}

              {/* Summary Text */}
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Hindi Summary</h3>
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <p className="text-gray-800 whitespace-pre-line leading-relaxed" style={{ fontFamily: 'Arial, sans-serif', direction: 'ltr' }}>
                    {videoSummary.hindiSummary}
                  </p>
                </div>
              </div>

              {/* Comparison Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Orders Comparison</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Period:</span>
                      <span className="font-semibold">{videoSummary.currentPeriod.totalOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Previous Period:</span>
                      <span className="font-semibold">{videoSummary.previousPeriod.totalOrders}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Change:</span>
                      <span className={`font-semibold ${videoSummary.comparison.orderChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {videoSummary.comparison.orderChange >= 0 ? '+' : ''}{videoSummary.comparison.orderChange} ({videoSummary.comparison.orderChangePercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Sales Comparison</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Period:</span>
                      <span className="font-semibold">{formatCurrency(videoSummary.currentPeriod.totalSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Previous Period:</span>
                      <span className="font-semibold">{formatCurrency(videoSummary.previousPeriod.totalSales)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Change:</span>
                      <span className={`font-semibold ${videoSummary.comparison.salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {videoSummary.comparison.salesChange >= 0 ? '+' : ''}{formatCurrency(videoSummary.comparison.salesChange)} ({videoSummary.comparison.salesChangePercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <h4 className="font-semibold text-gray-800 mb-3">Dispatched Orders</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Period:</span>
                      <span className="font-semibold">{videoSummary.currentPeriod.dispatchedOrders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Previous Period:</span>
                      <span className="font-semibold">{videoSummary.previousPeriod.dispatchedOrders}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Change:</span>
                      <span className={`font-semibold ${videoSummary.comparison.dispatchedChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {videoSummary.comparison.dispatchedChange >= 0 ? '+' : ''}{videoSummary.comparison.dispatchedChange}
                      </span>
                    </div>
                  </div>
                </div>

                {videoSummary.currentPeriod.topSalesman && (
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="font-semibold text-gray-800 mb-3">🏆 Top Salesman</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-semibold">{videoSummary.currentPeriod.topSalesman.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Sales:</span>
                        <span className="font-semibold text-brand-600">{formatCurrency(videoSummary.currentPeriod.topSalesman.sales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Orders:</span>
                        <span className="font-semibold">{videoSummary.currentPeriod.topSalesman.orders}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowVideoModal(false);
                  setVideoSummary(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-100"
              >
                Close
              </button>
              {videoSummary.video?.videoUrl && (
                <a
                  href={videoSummary.video.videoUrl}
                  download
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700"
                >
                  Download Video
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RamAgriSalesDashboard;

