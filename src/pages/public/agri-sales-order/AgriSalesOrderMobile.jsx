import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  Box,
  IconButton,
  Typography,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Fab,
} from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon,
  ZoomIn as ZoomInIcon,
  Delete as DeleteIcon,
  TextFields as TextFieldsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalShipping as LocalShippingIcon,
  DirectionsCar as DirectionsCarIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
  Inventory2 as InventoryIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import AddAgriSalesOrderForm from "../../private/inventory/AddAgriSalesOrderForm";
import { Toast } from "helpers/toasts/toastHelper";
import { useIsLoggedIn } from "hooks/state";
import { API, NetworkManager } from "network/core";
import { useLogoutModel } from "layout/privateLayout/privateLayout.model";
import moment from "moment";

/**
 * Mobile-Only Agri Sales Order Page
 * Shows employee's orders with filters and payment management
 */
const AgriSalesOrderMobile = () => {
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();
  const logoutModel = useLogoutModel();
  // Get user jobTitle and ID from Redux state
  const userData = useSelector((state) => state?.userData?.userData);
  const userJobTitle = userData?.jobTitle;
  const userId = userData?._id || userData?.id;
  const isAgriInputDealer = userJobTitle === "AGRI_INPUT_DEALER";
  const [showForm, setShowForm] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedDateRange, setSelectedDateRange] = useState([
    new Date(new Date().setDate(new Date().getDate() - 7)), // 7 days ago
    new Date(),
  ]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paidAmount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    modeOfPayment: "",
    bankName: "",
    transactionId: "", // Unified field for UTR/Transaction ID/Cheque Number
    remark: "",
    receiptPhoto: [],
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState(null); // State for image preview popup
  const [ocrProcessing, setOcrProcessing] = useState({}); // State for OCR processing
  const [ocrResults, setOcrResults] = useState({}); // State for OCR results
  // For AGRI_INPUT_DEALER: 0 = Assigned, 1 = Dispatched
  // For others: 0 = Orders, 1 = Assigned, 2 = Dispatched, 3 = Outstanding, 4 = Farmer Outstanding, 5 = Rankboard
  const [activeTab, setActiveTab] = useState(0);
  const [outstandingData, setOutstandingData] = useState(null);
  const [outstandingLoading, setOutstandingLoading] = useState(false);
  const [outstandingView, setOutstandingView] = useState("total"); // total, district, taluka, village
  const [filteredFromOutstanding, setFilteredFromOutstanding] = useState(false); // Track if orders are filtered from outstanding
  const [expandedOrderId, setExpandedOrderId] = useState(null); // For order payment accordion
  const [expandedFarmerId, setExpandedFarmerId] = useState(null); // For farmer outstanding accordion
  const [farmerOutstandingData, setFarmerOutstandingData] = useState([]); // Farmer-wise outstanding data
  const [showActivityLog, setShowActivityLog] = useState(false); // For activity log modal
  const [expandedTargetId, setExpandedTargetId] = useState(null); // For target orders accordion
  // Dispatch related state
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedOrdersForDispatch, setSelectedOrdersForDispatch] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dispatchForm, setDispatchForm] = useState({
    dispatchMode: "VEHICLE",
    vehicleId: "",
    vehicleNumber: "",
    driverName: "",
    driverMobile: "",
    courierName: "",
    courierTrackingId: "",
    courierContact: "",
    dispatchNotes: "",
  });
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false); // For multi-select mode
  // Complete order related state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedOrdersForComplete, setSelectedOrdersForComplete] = useState([]);
  const [completeForm, setCompleteForm] = useState({
    returnQuantities: {}, // { orderId: returnQty }
    returnReason: "",
    returnNotes: "",
  });
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeSelectionMode, setCompleteSelectionMode] = useState(false); // For selecting dispatched orders
  // Assigned orders state (for sales person to see orders assigned to them)
  const [assignedOrders, setAssignedOrders] = useState([]);
  const [assignedOrdersLoading, setAssignedOrdersLoading] = useState(false);
  // Dispatched orders state
  const [dispatchedOrders, setDispatchedOrders] = useState([]);
  const [dispatchedOrdersLoading, setDispatchedOrdersLoading] = useState(false);
  // Sales return related state
  const [showSalesReturnModal, setShowSalesReturnModal] = useState(false);
  const [selectedOrderForSalesReturn, setSelectedOrderForSalesReturn] = useState(null);
  const [salesReturnForm, setSalesReturnForm] = useState({
    returnQuantity: 0,
    returnReason: "",
    returnNotes: "",
    paymentAdjustments: [], // [{ amount: -100, adjustmentType: "REFUND", reason: "...", notes: "..." }]
  });
  const [salesReturnLoading, setSalesReturnLoading] = useState(false);
  const [rankboardData, setRankboardData] = useState([]);
  const [rankboardLoading, setRankboardLoading] = useState(false);
  // Order status filter for subtabs in Orders tab: 'all', 'pending', 'accepted', 'dispatched'
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  // Targets state
  const [salesTargets, setSalesTargets] = useState([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [targetDateRange, setTargetDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (isLoggedIn === false) {
      navigate("/auth/login", { replace: true });
    }
  }, [isLoggedIn, navigate]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch orders
  const fetchOrders = async () => {
    if (!isLoggedIn) return;

    setLoading(true);
    try {
      const params = {
        myOrders: "true",
        search: debouncedSearchTerm,
        page: 1,
        limit: 1000,
      };

      const [startDate, endDate] = selectedDateRange;
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD");
        params.endDate = moment(endDate).format("YYYY-MM-DD");
      }

      const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS);
      const response = await instance.request({}, params);

      if (response?.data?.status === "Success") {
        setOrders(response.data.data?.data || []);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      Toast.error("Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assigned orders (orders assigned to this sales person for dispatch)
  const fetchAssignedOrders = async () => {
    if (!isLoggedIn) return;

    setAssignedOrdersLoading(true);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_ASSIGNED_ORDERS);
      const response = await instance.request({}, { limit: 1000 });

      if (response?.data?.status === "Success") {
        setAssignedOrders(response.data.data?.data || []);
      } else {
        setAssignedOrders([]);
      }
    } catch (error) {
      console.error("Error fetching assigned orders:", error);
      setAssignedOrders([]);
    } finally {
      setAssignedOrdersLoading(false);
    }
  };

  // Fetch dispatched orders (orders that have been dispatched)
  const fetchDispatchedOrders = async () => {
    if (!isLoggedIn) return;

    setDispatchedOrdersLoading(true);
    try {
      const params = {
        myOrders: "true",
        search: debouncedSearchTerm,
        page: 1,
        limit: 1000,
      };

      const [startDate, endDate] = selectedDateRange;
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD");
        params.endDate = moment(endDate).format("YYYY-MM-DD");
      }

      const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS);
      const response = await instance.request({}, params);

      if (response?.data?.status === "Success") {
        const allOrders = response.data.data?.data || [];
        // Filter only dispatched orders (orderStatus is DISPATCHED or dispatchStatus is DISPATCHED/IN_TRANSIT)
        const dispatched = allOrders.filter(
          (order) =>
            order.orderStatus === "DISPATCHED" ||
            order.dispatchStatus === "DISPATCHED" ||
            order.dispatchStatus === "IN_TRANSIT"
        );
        setDispatchedOrders(dispatched);
      } else {
        setDispatchedOrders([]);
      }
    } catch (error) {
      console.error("Error fetching dispatched orders:", error);
      Toast.error("Failed to load dispatched orders");
      setDispatchedOrders([]);
    } finally {
      setDispatchedOrdersLoading(false);
    }
  };

  // Fetch outstanding analysis
  const fetchOutstandingAnalysis = async () => {
    setOutstandingLoading(true);
    try {
      const params = {};
      const [startDate, endDate] = selectedDateRange;
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD");
        params.endDate = moment(endDate).format("YYYY-MM-DD");
      }

      const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_OUTSTANDING_ANALYSIS);
      const response = await instance.request({}, params);

      if (response?.data?.status === "Success") {
        setOutstandingData(response.data.data);
      } else {
        setOutstandingData(null);
      }
    } catch (error) {
      console.error("Error fetching outstanding analysis:", error);
      Toast.error("Failed to load outstanding data");
      setOutstandingData(null);
    } finally {
      setOutstandingLoading(false);
    }
  };

  // Compute farmer-wise outstanding from orders
  const computeFarmerOutstanding = (ordersData) => {
    const farmerMap = {};
    
    ordersData.forEach((order) => {
      if (order.balanceAmount > 0) {
        const key = order.customerMobile || order.customerName;
        if (!farmerMap[key]) {
          farmerMap[key] = {
            customerName: order.customerName,
            customerMobile: order.customerMobile,
            customerVillage: order.customerVillage,
            customerTaluka: order.customerTaluka,
            customerDistrict: order.customerDistrict,
            totalOutstanding: 0,
            totalOrders: 0,
            orders: [],
          };
        }
        farmerMap[key].totalOutstanding += order.balanceAmount || 0;
        farmerMap[key].totalOrders += 1;
        farmerMap[key].orders.push(order);
      }
    });

    // Convert to array and sort by outstanding amount
    return Object.values(farmerMap).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
  };

  // Fetch farmer outstanding data
  const fetchFarmerOutstanding = async () => {
    setOutstandingLoading(true);
    try {
      const params = {
        myOrders: "true",
        page: 1,
        limit: 1000,
      };

      const [startDate, endDate] = selectedDateRange;
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD");
        params.endDate = moment(endDate).format("YYYY-MM-DD");
      }

      const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS);
      const response = await instance.request({}, params);

      if (response?.data?.status === "Success") {
        const allOrders = response.data.data?.data || [];
        const farmerData = computeFarmerOutstanding(allOrders);
        setFarmerOutstandingData(farmerData);
      } else {
        setFarmerOutstandingData([]);
      }
    } catch (error) {
      console.error("Error fetching farmer outstanding:", error);
      Toast.error("Failed to load farmer outstanding data");
      setFarmerOutstandingData([]);
    } finally {
      setOutstandingLoading(false);
    }
  };

  const fetchRankboard = async () => {
    if (!isLoggedIn) return;

    setRankboardLoading(true);
    try {
      const params = {};
      const [startDate, endDate] = selectedDateRange;
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD");
        params.endDate = moment(endDate).format("YYYY-MM-DD");
      }

      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_SALES_RANKBOARD);
      const response = await instance.request({}, params);

      if (response?.data?.status === "Success") {
        setRankboardData(response.data.data?.entries || []);
      } else {
        setRankboardData([]);
      }
    } catch (error) {
      console.error("Error fetching rankboard:", error);
      Toast.error("Failed to load rankboard");
      setRankboardData([]);
    } finally {
      setRankboardLoading(false);
    }
  };

  // Fetch sales targets for current user
  const fetchSalesTargets = async () => {
    if (!isLoggedIn || !userId) return;

    setTargetsLoading(true);
    try {
      const params = {
        userId: userId,
        startDate: targetDateRange.startDate,
        endDate: targetDateRange.endDate,
      };

      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_SALES_TARGETS);
      const response = await instance.request({}, params);

      if (response?.data?.status === "Success") {
        setSalesTargets(response.data.data || []);
      } else {
        setSalesTargets([]);
      }
    } catch (error) {
      console.error("Error fetching sales targets:", error);
      Toast.error("Failed to load targets");
      setSalesTargets([]);
    } finally {
      setTargetsLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      if (isAgriInputDealer) {
        // For AGRI_INPUT_DEALER: tab 0 = Assigned, tab 1 = Dispatched
        if (activeTab === 0) {
          fetchAssignedOrders();
        } else if (activeTab === 1) {
          fetchDispatchedOrders();
        }
      } else {
        // For other users: normal tab structure
      if (activeTab === 0) {
        // Only fetch all orders if not filtered from outstanding (to preserve filtered orders)
        if (!filteredFromOutstanding) {
          fetchOrders();
        }
      } else if (activeTab === 1) {
        // Assigned Orders tab
        fetchAssignedOrders();
        setFilteredFromOutstanding(false);
      } else if (activeTab === 2) {
        // Outstanding tab (was tab 3, now tab 2)
        fetchOutstandingAnalysis();
        setOutstandingView("total");
        setFilteredFromOutstanding(false);
      } else if (activeTab === 3) {
        // Farmer Outstanding tab (was tab 4, now tab 3)
        fetchFarmerOutstanding();
        setFilteredFromOutstanding(false);
      } else if (activeTab === 4) {
        // Rankboard tab (was tab 5, now tab 4)
        fetchRankboard();
        setFilteredFromOutstanding(false);
      } else if (activeTab === 5) {
        // Targets tab
        fetchSalesTargets();
        setFilteredFromOutstanding(false);
      }
    }
    }
  }, [isLoggedIn, debouncedSearchTerm, selectedDateRange, activeTab, isAgriInputDealer]);

  const rankboardEntries = [...rankboardData].sort(
    (a, b) => (b.scores?.recommendedScore || 0) - (a.scores?.recommendedScore || 0)
  );

  if (isLoggedIn === undefined || isLoggedIn === false) {
    return null;
  }

  const handleClose = () => {
    setShowForm(false);
  };

  const handleSuccess = () => {
    Toast.success("Order created successfully!");
    setShowForm(false);
    if (activeTab === 0) {
      fetchOrders();
    } else if (activeTab === 3) {
      fetchOutstandingAnalysis();
    } else if (activeTab === 4) {
      fetchFarmerOutstanding();
    } else if (activeTab === 5) {
      fetchRankboard();
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
    setShowActivityLog(false); // Reset activity log view
    setPaymentForm({
      paidAmount: "",
      paymentDate: moment().format("YYYY-MM-DD"),
      modeOfPayment: "",
      bankName: "",
      transactionId: "",
      remark: "",
      receiptPhoto: [],
    });
  };

  const handlePaymentInputChange = (field, value) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImages(true);
    try {
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("media_key", file);
          formData.append("media_type", "IMAGE");
          formData.append("content_type", "multipart/form-data");

          const instance = NetworkManager(API.MEDIA.UPLOAD);
          const response = await instance.request(formData);
          
          // Response structure from API: { success: true, message: "...", data: { media_url: "..." } }
          // NetworkManager wraps it: response.data = { success: true, message: "...", data: { media_url: "..." } }
          // So the URL is at: response.data.data.media_url
          const mediaUrl = response.data?.data?.media_url || response.data?.media_url;
          
          if (!mediaUrl) {
            console.error("Media upload response structure:", response);
            throw new Error("Failed to get media URL from response");
          }
          
          return mediaUrl;
        })
      );
      // Filter out any null/undefined values
      const validUrls = uploadedUrls.filter(url => url && url.trim() !== "");
      
      if (validUrls.length === 0) {
        Toast.error("No valid image URLs were received from upload");
        return;
      }

      const currentPhotoCount = paymentForm.receiptPhoto?.length || 0;

      handlePaymentInputChange("receiptPhoto", [...(paymentForm.receiptPhoto || []), ...validUrls]);
      Toast.success("Images uploaded successfully");

      // OCR processing disabled
      // validUrls.forEach((url, index) => {
      //   const imageIndex = currentPhotoCount + index;
      //   setTimeout(() => {
      //     processImageWithOCR(url, imageIndex);
      //   }, 800 * (index + 1)); // Stagger OCR processing
      // });
    } catch (error) {
      console.error("Error uploading images:", error);
      Toast.error("Failed to upload images");
    } finally {
      setUploadingImages(false);
    }
  };

  // OCR Helper Functions
  const extractAmount = (text) => {
    const patterns = [
      /(?:amount|total|paid|₹|rs\.?)[\s:]*([\d,]+\.?\d*)/i,
      /₹\s*([\d,]+\.?\d*)/i,
      /(\d{2,}(?:,\d{2,3})*(?:\.\d{2})?)/g,
    ];

    const amounts = [];
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const amount = match[1].replace(/,/g, "");
        if (amount && parseFloat(amount) > 0) {
          amounts.push(parseFloat(amount));
        }
      }
    }

    return amounts.length > 0 ? Math.max(...amounts).toString() : null;
  };

  const extractTransactionId = (text) => {
    const patterns = [
      /(?:transaction|txn|id|ref)[\s#:]*([A-Z0-9]{8,20})/i,
      /(?:upi|upi\s*ref)[\s:]*([A-Z0-9]{8,20})/i,
      /\b([A-Z0-9]{12,20})\b/g,
      /(?:ref|reference)[\s:]*([A-Z0-9]{6,20})/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }
    }
    return null;
  };

  const extractChequeNumber = (text) => {
    const patterns = [
      /(?:cheque|chq|check)[\s#:]*no\.?[\s:]*(\d{6,12})/i,
      /cheque[\s#:]*(\d{6,12})/i,
      /^\s*(\d{6,12})\s*$/m,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const extractDate = (text) => {
    const patterns = [
      /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
      /(\d{2,4}[-/]\d{1,2}[-/]\d{1,2})/,
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          const dateStr = match[1];
          let date;
          if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                date = new Date(parts[2], parts[1] - 1, parts[0]);
                if (isNaN(date.getTime())) {
                  date = new Date(parts[2], parts[0] - 1, parts[1]);
                }
              } else {
                const year = parseInt(parts[2]) < 50 ? 2000 + parseInt(parts[2]) : 1900 + parseInt(parts[2]);
                date = new Date(year, parts[1] - 1, parts[0]);
              }
            }
          } else if (dateStr.includes("-")) {
            date = new Date(dateStr);
          }
          
          if (date && !isNaN(date.getTime())) {
            return moment(date).format("YYYY-MM-DD");
          }
        } catch (e) {
          console.error("Date parsing error:", e);
        }
      }
    }
    return null;
  };

  const extractBankName = (text) => {
    const banks = [
      "SBI", "State Bank", "HDFC", "ICICI", "Axis", "Kotak", "Punjab National Bank", "PNB",
      "Bank of Baroda", "Canara Bank", "Union Bank", "Indian Bank", "Bank of India",
    ];

    const lowerText = text.toLowerCase();
    for (const bank of banks) {
      if (lowerText.includes(bank.toLowerCase())) {
        return bank;
      }
    }
    return null;
  };

  // OCR function disabled - not calling API
  // const processImageWithOCR = async (imageUrl, index) => {
  //   setOcrProcessing((prev) => ({ ...prev, [index]: true }));
  //   setOcrResults((prev) => ({ ...prev, [index]: null }));

  //   try {
  //     // Call backend OCR API with image URL
  //     const instance = NetworkManager(API.MEDIA.OCR_PROCESS);
  //     const payload = {
  //       imageUrl: imageUrl,
  //     };
      
  //     const response = await instance.request(payload);
      
  //     // Handle response structure
  //     const ocrData = response.data?.data || response.data;
      
  //     if (!ocrData) {
  //       throw new Error("No OCR data received from server");
  //     }

  //     // Extract data from backend response
  //     const extractedData = {
  //       rawText: ocrData.rawText || ocrData.text || "",
  //       amount: ocrData.amount || null,
  //       transactionId: ocrData.transactionId || ocrData.transaction_id || null,
  //       chequeNumber: ocrData.chequeNumber || ocrData.cheque_number || null,
  //       date: ocrData.date || null,
  //       bankName: ocrData.bankName || ocrData.bank_name || null,
  //       type: ocrData.type || "Receipt",
  //     };

  //     // If backend didn't extract but provided raw text, extract locally as fallback
  //     if (!extractedData.amount && extractedData.rawText) {
  //       extractedData.amount = extractAmount(extractedData.rawText);
  //     }
  //     if (!extractedData.date && extractedData.rawText) {
  //       extractedData.date = extractDate(extractedData.rawText);
  //     }
  //     if (!extractedData.transactionId && extractedData.rawText) {
  //       extractedData.transactionId = extractTransactionId(extractedData.rawText);
  //     }
  //     if (!extractedData.chequeNumber && extractedData.rawText) {
  //       extractedData.chequeNumber = extractChequeNumber(extractedData.rawText);
  //     }
  //     if (!extractedData.bankName && extractedData.rawText) {
  //       extractedData.bankName = extractBankName(extractedData.rawText);
  //     }

  //     setOcrResults((prev) => ({ ...prev, [index]: extractedData }));

  //     // Auto-fill form fields if data was extracted (only if fields are empty)
  //     let fieldsUpdated = [];
      
  //     if (extractedData.amount && !paymentForm.paidAmount) {
  //       handlePaymentInputChange("paidAmount", extractedData.amount);
  //       fieldsUpdated.push(`Amount: ₹${extractedData.amount}`);
  //     }

  //     if (extractedData.date && !paymentForm.paymentDate) {
  //       handlePaymentInputChange("paymentDate", extractedData.date);
  //       fieldsUpdated.push(`Date: ${extractedData.date}`);
  //     }

  //     if (extractedData.chequeNumber && !paymentForm.modeOfPayment) {
  //       handlePaymentInputChange("modeOfPayment", "Cheque");
  //       fieldsUpdated.push("Payment Mode: Cheque");
  //       if (!paymentForm.transactionId) {
  //         handlePaymentInputChange("transactionId", extractedData.chequeNumber);
  //         fieldsUpdated.push(`Cheque Number: ${extractedData.chequeNumber}`);
  //       }
  //       if (extractedData.bankName && !paymentForm.bankName) {
  //         handlePaymentInputChange("bankName", extractedData.bankName);
  //         fieldsUpdated.push(`Bank: ${extractedData.bankName}`);
  //       }
  //     }

  //     if (extractedData.transactionId && !extractedData.chequeNumber) {
  //       // Only set UPI if it's not a cheque
  //       if (!paymentForm.modeOfPayment) {
  //         handlePaymentInputChange("modeOfPayment", "UPI");
  //         fieldsUpdated.push("Payment Mode: UPI");
  //       }
  //       if (!paymentForm.transactionId) {
  //         handlePaymentInputChange("transactionId", extractedData.transactionId);
  //         fieldsUpdated.push(`Transaction ID: ${extractedData.transactionId}`);
  //       }
  //     }

  //     if (fieldsUpdated.length > 0) {
  //       Toast.success(`OCR completed! Extracted: ${fieldsUpdated.join(", ")}`);
  //     } else {
  //       Toast.success("OCR processing completed. Data extracted but fields already filled.");
  //     }
  //   } catch (error) {
  //     console.error("OCR processing error:", error);
  //     const errorMessage = error.response?.data?.message || error.message || "OCR processing failed";
  //     Toast.error(`OCR processing failed: ${errorMessage}`);
  //   } finally {
  //     setOcrProcessing((prev) => ({ ...prev, [index]: false }));
  //   }
  // };

  const handleAddPayment = async () => {
    if (!paymentForm.paidAmount || !paymentForm.modeOfPayment) {
      Toast.error("Please fill in payment amount and mode");
      return;
    }

    if (
      paymentForm.modeOfPayment !== "Cash" &&
      paymentForm.modeOfPayment !== "NEFT/RTGS" &&
      (!paymentForm.receiptPhoto || paymentForm.receiptPhoto.length === 0)
    ) {
      Toast.error(`Payment image is mandatory for ${paymentForm.modeOfPayment} payments`);
      return;
    }

    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.ADD_AGRI_SALES_ORDER_PAYMENT);
      
      // Filter out null/undefined/empty values from receiptPhoto array
      const validReceiptPhotos = (paymentForm.receiptPhoto || []).filter(
        (photo) => photo && photo.trim && photo.trim() !== "" && photo !== null && photo !== undefined
      );
      
      const payload = {
        paidAmount: paymentForm.paidAmount,
        paymentDate: paymentForm.paymentDate,
        modeOfPayment: paymentForm.modeOfPayment,
        bankName: paymentForm.bankName || "",
        transactionId: paymentForm.transactionId || "",
        receiptPhoto: validReceiptPhotos,
        remark: paymentForm.remark || "",
        paymentStatus: "PENDING",
      };

      const response = await instance.request(payload, [`${selectedOrder._id}/payment`]);

      if (response?.data) {
        Toast.success("Payment added successfully");
        setShowPaymentModal(false);
        setSelectedOrder(null);
        if (activeTab === 0) {
          fetchOrders();
        } else {
          fetchOutstandingAnalysis();
        }
      } else {
        Toast.error("Failed to add payment");
      }
    } catch (error) {
      console.error("Error adding payment:", error);
      Toast.error("Failed to add payment");
    } finally {
      setLoading(false);
    }
  };

  // ==================== DISPATCH FUNCTIONS ====================

  // Fetch active vehicles
  const fetchVehicles = async () => {
    try {
      const instance = NetworkManager(API.VEHICLE.GET_ACTIVE_VEHICLES);
      const response = await instance.request();
      // Ensure we always set an array
      const vehiclesData = response?.data?.data || response?.data || [];
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      setVehicles([]); // Reset to empty array on error
    }
  };

  // Handle vehicle selection - auto-fill driver details
  const handleVehicleSelect = (vehicleId) => {
    const vehiclesArray = Array.isArray(vehicles) ? vehicles : [];
    const vehicle = vehiclesArray.find((v) => v._id === vehicleId || v.id === vehicleId);
    if (vehicle) {
      setDispatchForm((prev) => ({
        ...prev,
        vehicleId: vehicleId,
        vehicleNumber: vehicle.number || "",
        driverName: vehicle.driverName || prev.driverName,
        driverMobile: vehicle.driverMobile || prev.driverMobile,
      }));
    } else {
      setDispatchForm((prev) => ({
        ...prev,
        vehicleId: vehicleId,
      }));
    }
  };

  // Toggle order selection for dispatch
  const toggleOrderSelection = (orderId) => {
    setSelectedOrdersForDispatch((prev) => {
      if (prev.includes(orderId)) {
        return prev.filter((id) => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  // Select all orders for dispatch
  const selectAllOrders = () => {
    const dispatchableOrders = orders.filter(
      (order) =>
        (order.orderStatus === "ACCEPTED" || order.orderStatus === "ASSIGNED") &&
        order.dispatchStatus === "NOT_DISPATCHED"
    );
    setSelectedOrdersForDispatch(dispatchableOrders.map((o) => o._id));
  };

  // Clear all selections
  const clearAllSelections = () => {
    setSelectedOrdersForDispatch([]);
    setSelectionMode(false);
  };

  // Open dispatch modal
  const openDispatchModal = () => {
    if (selectedOrdersForDispatch.length === 0) {
      Toast.error("Please select at least one order to dispatch");
      return;
    }
    fetchVehicles();
    setShowDispatchModal(true);
  };

  // Handle dispatch submission
  const handleDispatch = async () => {
    // Validation based on dispatch mode
    if (dispatchForm.dispatchMode === "VEHICLE") {
      if (!dispatchForm.driverName || !dispatchForm.driverMobile) {
        Toast.error("Driver name and mobile are required");
        return;
      }
      if (!dispatchForm.vehicleNumber && !dispatchForm.vehicleId) {
        Toast.error("Please select a vehicle or enter vehicle number");
        return;
      }
      if (dispatchForm.driverMobile.length !== 10) {
        Toast.error("Driver mobile must be 10 digits");
        return;
      }
    } else if (dispatchForm.dispatchMode === "COURIER") {
      if (!dispatchForm.courierName) {
        Toast.error("Courier service name is required");
        return;
      }
    }

    try {
      setDispatchLoading(true);
      const instance = NetworkManager(API.INVENTORY.DISPATCH_AGRI_SALES_ORDERS);
      
      // Build payload based on dispatch mode
      const payload = {
        orderIds: selectedOrdersForDispatch,
        dispatchMode: dispatchForm.dispatchMode,
        dispatchNotes: dispatchForm.dispatchNotes || "",
      };

      if (dispatchForm.dispatchMode === "VEHICLE") {
        payload.vehicleId = dispatchForm.vehicleId || null;
        payload.vehicleNumber = dispatchForm.vehicleNumber;
        payload.driverName = dispatchForm.driverName;
        payload.driverMobile = dispatchForm.driverMobile;
      } else if (dispatchForm.dispatchMode === "COURIER") {
        payload.courierName = dispatchForm.courierName;
        payload.courierTrackingId = dispatchForm.courierTrackingId || "";
        payload.courierContact = dispatchForm.courierContact || "";
      }

      const response = await instance.request(payload);

      if (response?.data) {
        Toast.success(`${selectedOrdersForDispatch.length} order(s) dispatched successfully`);
        setShowDispatchModal(false);
        setSelectedOrdersForDispatch([]);
        setSelectionMode(false);
        setDispatchForm({
          dispatchMode: "VEHICLE",
          vehicleId: "",
          vehicleNumber: "",
          driverName: "",
          driverMobile: "",
          courierName: "",
          courierTrackingId: "",
          courierContact: "",
          dispatchNotes: "",
        });
        fetchOrders();
      } else {
        Toast.error("Failed to dispatch orders");
      }
    } catch (error) {
      console.error("Error dispatching orders:", error);
      Toast.error(error?.response?.data?.message || "Failed to dispatch orders");
    } finally {
      setDispatchLoading(false);
    }
  };

  // ==================== COMPLETE ORDER HANDLERS ====================
  
  // Toggle order selection for complete
  const toggleCompleteOrderSelection = (orderId) => {
    setSelectedOrdersForComplete((prev) => {
      if (prev.includes(orderId)) {
        // Remove from selection and clear return quantity
        const newReturnQuantities = { ...completeForm.returnQuantities };
        delete newReturnQuantities[orderId];
        setCompleteForm((f) => ({ ...f, returnQuantities: newReturnQuantities }));
        return prev.filter((id) => id !== orderId);
      } else {
        return [...prev, orderId];
      }
    });
  };

  // Open complete modal
  const openCompleteModal = () => {
    if (selectedOrdersForComplete.length === 0) {
      Toast.error("Please select at least one dispatched order to complete");
      return;
    }
    // Initialize return quantities to 0 for all selected orders
    const initialReturnQty = {};
    selectedOrdersForComplete.forEach((id) => {
      initialReturnQty[id] = 0;
    });
    setCompleteForm({
      returnQuantities: initialReturnQty,
      returnReason: "",
      returnNotes: "",
    });
    setShowCompleteModal(true);
  };

  // Open sales return modal
  const openSalesReturnModal = (order) => {
    setSelectedOrderForSalesReturn(order);
    setSalesReturnForm({
      returnQuantity: order.salesReturnQuantity || 0,
      returnReason: order.salesReturnReason || "",
      returnNotes: order.salesReturnNotes || "",
      paymentAdjustments: [],
    });
    setShowSalesReturnModal(true);
  };

  // Handle sales return submission
  const handleSalesReturn = async () => {
    if (!selectedOrderForSalesReturn) return;

    try {
      setSalesReturnLoading(true);
      const instance = NetworkManager(API.INVENTORY.PROCESS_SALES_RETURN);
      const payload = {
        returnQuantity: parseFloat(salesReturnForm.returnQuantity) || 0,
        returnReason: salesReturnForm.returnReason || "",
        returnNotes: salesReturnForm.returnNotes || "",
        paymentAdjustments: salesReturnForm.paymentAdjustments.length > 0 ? salesReturnForm.paymentAdjustments : undefined,
      };

      const response = await instance.request(payload, { id: selectedOrderForSalesReturn._id });

      if (response?.data) {
        Toast.success("Sales return processed successfully (No stock impact)");
        setShowSalesReturnModal(false);
        setSelectedOrderForSalesReturn(null);
        setSalesReturnForm({
          returnQuantity: 0,
          returnReason: "",
          returnNotes: "",
          paymentAdjustments: [],
        });
        fetchOrders();
        if (isAgriInputDealer) {
          if (activeTab === 0) fetchAssignedOrders();
        } else {
          if (activeTab === 1) fetchAssignedOrders();
        }
      } else {
        Toast.error("Failed to process sales return");
      }
    } catch (error) {
      console.error("Error processing sales return:", error);
      Toast.error(error?.response?.data?.message || "Failed to process sales return");
    } finally {
      setSalesReturnLoading(false);
    }
  };

  // Handle complete order submission
  const handleCompleteOrders = async () => {
    try {
      setCompleteLoading(true);
      const instance = NetworkManager(API.INVENTORY.COMPLETE_AGRI_SALES_ORDERS);
      const payload = {
        orderIds: selectedOrdersForComplete,
        returnQuantities: completeForm.returnQuantities,
        returnReason: completeForm.returnReason || "",
        returnNotes: completeForm.returnNotes || "",
      };

      const response = await instance.request(payload);

      if (response?.data) {
        const totalReturns = Object.values(completeForm.returnQuantities).filter((q) => q > 0).length;
        Toast.success(
          `${selectedOrdersForComplete.length} order(s) completed${totalReturns > 0 ? ` (${totalReturns} with returns)` : ""}`
        );
        setShowCompleteModal(false);
        setSelectedOrdersForComplete([]);
        setCompleteSelectionMode(false);
        setCompleteForm({
          returnQuantities: {},
          returnReason: "",
          returnNotes: "",
        });
        fetchOrders();
        if (isAgriInputDealer) {
          if (activeTab === 1) fetchDispatchedOrders();
        }
      } else {
        Toast.error("Failed to complete orders");
      }
    } catch (error) {
      console.error("Error completing orders:", error);
      Toast.error(error?.response?.data?.message || "Failed to complete orders");
    } finally {
      setCompleteLoading(false);
    }
  };

  // Get dispatch status color and label
  const getDispatchStatusInfo = (status) => {
    switch (status) {
      case "DISPATCHED":
        return { bg: "#e3f2fd", color: "#1565c0", label: "Dispatched" };
      case "IN_TRANSIT":
        return { bg: "#fff3e0", color: "#e65100", label: "In Transit" };
      case "DELIVERED":
        return { bg: "#e8f5e9", color: "#2e7d32", label: "Delivered" };
      default:
        return { bg: "#f5f5f5", color: "#757575", label: "Not Dispatched" };
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return { bg: "#fef3c7", color: "#92400e", label: "Pending" };
      case "ACCEPTED":
        return { bg: "#dcfce7", color: "#166534", label: "Accepted" };
      case "ASSIGNED":
        return { bg: "#f3e8ff", color: "#7c3aed", label: "Assigned" };
      case "DISPATCHED":
        return { bg: "#e3f2fd", color: "#1565c0", label: "Dispatched" };
      case "REJECTED":
        return { bg: "#fee2e2", color: "#991b1b", label: "Rejected" };
      case "COMPLETED":
        return { bg: "#d1fae5", color: "#065f46", label: "Completed" };
      case "CANCELLED":
        return { bg: "#f3f4f6", color: "#374151", label: "Cancelled" };
      default:
        return { bg: "#f5f5f5", color: "#666", label: status || "Unknown" };
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return { bg: "#dcfce7", color: "#166534" };
      case "PARTIAL":
        return { bg: "#fef3c7", color: "#92400e" };
      case "PENDING":
        return { bg: "#fee2e2", color: "#991b1b" };
      default:
        return { bg: "#f5f5f5", color: "#666" };
    }
  };

  const handleLogout = async () => {
    try {
      await logoutModel.logout();
      navigate("/auth/login");
    } catch (e) {
      Toast.error("Logout failed");
      navigate("/auth/login");
    }
  };

  const [startDate, endDate] = selectedDateRange;

  const renderOutstandingView = () => {
    if (outstandingLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!outstandingData) {
      return (
        <Card sx={{ mt: 2, textAlign: "center", py: 4 }}>
          <CardContent>
            <Typography variant="body1" color="textSecondary">
              No outstanding data found
            </Typography>
          </CardContent>
        </Card>
      );
    }

    // Total View - Flow Chart Style
    if (outstandingView === "total") {
      const total = outstandingData.total || { totalOutstanding: 0, totalOrders: 0 };
      return (
        <Box sx={{ mt: 2 }}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
              color: "white",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(244, 67, 54, 0.3)",
              "&:active": { transform: "scale(0.98)" },
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (outstandingData.byDistrict && outstandingData.byDistrict.length > 0) {
                setOutstandingView("district");
              } else {
                Toast.info("No district data available");
              }
            }}>
            <CardContent 
              sx={{ 
                p: 3, 
                textAlign: "center", 
                position: "relative",
                pointerEvents: "none", // Allow clicks to pass through to Card
              }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                ₹{total.totalOutstanding?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body1" sx={{ opacity: 0.9, mb: 1 }}>
                Total Outstanding
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {total.totalOrders || 0} orders
              </Typography>
              {outstandingData.byDistrict && outstandingData.byDistrict.length > 0 && (
                <Box sx={{ mt: 2, display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    Tap to view by District
                  </Typography>
                  <ArrowForwardIcon sx={{ fontSize: "1rem", opacity: 0.7 }} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      );
    }

    // District View - Flow Chart Style
    if (outstandingView === "district") {
      const districts = outstandingData.byDistrict || [];
      return (
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => setOutstandingView("total")}
            sx={{ mb: 2, textTransform: "none" }}>
            Back to Total
          </Button>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "flex-start",
            }}>
            {districts.map((district, index) => (
              <Card
                key={index}
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #fff 0%, #f5f5f5 100%)",
                  "&:active": { transform: "scale(0.95)", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" },
                  flex: "0 0 auto",
                  minWidth: "120px",
                  maxWidth: "calc(50% - 8px)",
                  position: "relative",
                  zIndex: 1,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const talukas = (outstandingData.byTaluka || []).filter((t) => t._id?.district === district._id);
                  if (talukas.length > 0) {
                    setOutstandingView(`taluka-${district._id}`);
                  } else {
                    Toast.info("No talukas available for this district");
                  }
                }}>
                <CardContent 
                  sx={{ 
                    p: 2, 
                    textAlign: "center", 
                    "&:last-child": { pb: 2 },
                    pointerEvents: "none", // Allow clicks to pass through to Card
                  }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.65rem",
                      color: "#666",
                      display: "block",
                      mb: 0.5,
                      fontWeight: 500,
                    }}>
                    DISTRICT
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    sx={{
                      fontSize: "0.8rem",
                      mb: 1,
                      wordBreak: "break-word",
                      minHeight: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    {district._id || "Unknown"}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="error" sx={{ fontSize: "0.95rem", mb: 0.5 }}>
                    ₹{(district.totalOutstanding / 1000).toFixed(1)}K
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                    {district.totalOrders || 0} orders
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      );
    }

    // Taluka View - Flow Chart Style
    if (outstandingView.startsWith("taluka-")) {
      const districtId = outstandingView.replace("taluka-", "");
      const talukas = (outstandingData.byTaluka || []).filter((t) => t._id?.district === districtId);
      const districtName = outstandingData.byDistrict?.find((d) => d._id === districtId)?._id || districtId;

      return (
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => setOutstandingView("district")}
            sx={{ mb: 2, textTransform: "none" }}>
            Back to Districts
          </Button>
          <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: "block", fontSize: "0.75rem" }}>
            District: {districtName}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "flex-start",
            }}>
            {talukas.map((taluka, index) => (
              <Card
                key={index}
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #fff 0%, #f5f5f5 100%)",
                  "&:active": { transform: "scale(0.95)", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" },
                  flex: "0 0 auto",
                  minWidth: "120px",
                  maxWidth: "calc(50% - 8px)",
                  position: "relative",
                  zIndex: 1,
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const villages = (outstandingData.byVillage || []).filter(
                    (v) => v._id?.district === districtId && v._id?.taluka === taluka._id?.taluka
                  );
                  if (villages.length > 0) {
                    setOutstandingView(`village-${districtId}-${taluka._id?.taluka}`);
                  } else {
                    Toast.info("No villages available for this taluka");
                  }
                }}>
                <CardContent 
                  sx={{ 
                    p: 2, 
                    textAlign: "center", 
                    "&:last-child": { pb: 2 },
                    pointerEvents: "none", // Allow clicks to pass through to Card
                  }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.65rem",
                      color: "#666",
                      display: "block",
                      mb: 0.5,
                      fontWeight: 500,
                    }}>
                    TALUKA
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    sx={{
                      fontSize: "0.8rem",
                      mb: 1,
                      wordBreak: "break-word",
                      minHeight: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    {taluka._id?.taluka || "Unknown"}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="error" sx={{ fontSize: "0.95rem", mb: 0.5 }}>
                    ₹{(taluka.totalOutstanding / 1000).toFixed(1)}K
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                    {taluka.totalOrders || 0} orders
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      );
    }

    // Village View - Flow Chart Style
    if (outstandingView.startsWith("village-")) {
      const parts = outstandingView.replace("village-", "").split("-");
      const districtId = parts[0];
      const talukaId = parts.slice(1).join("-");
      const villages = (outstandingData.byVillage || []).filter(
        (v) => v._id?.district === districtId && v._id?.taluka === talukaId
      );
      const districtName = outstandingData.byDistrict?.find((d) => d._id === districtId)?._id || districtId;
      const talukaName = outstandingData.byTaluka?.find(
        (t) => t._id?.district === districtId && t._id?.taluka === talukaId
      )?._id?.taluka || talukaId;

      return (
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => setOutstandingView(`taluka-${districtId}`)}
            sx={{ mb: 2, textTransform: "none" }}>
            Back to Talukas
          </Button>
          <Typography variant="caption" color="textSecondary" sx={{ mb: 1.5, display: "block", fontSize: "0.75rem" }}>
            {districtName} → {talukaName}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "flex-start",
            }}>
            {villages.map((village, index) => (
              <Card
                key={index}
                sx={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  borderRadius: "12px",
                  background: "linear-gradient(135deg, #fff 0%, #f5f5f5 100%)",
                  "&:active": { transform: "scale(0.95)", boxShadow: "0 1px 4px rgba(0,0,0,0.15)" },
                  flex: "0 0 auto",
                  minWidth: "120px",
                  maxWidth: "calc(50% - 8px)",
                  position: "relative",
                  zIndex: 1,
                }}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Fetch orders for this specific village
                  setLoading(true);
                  try {
                    const params = {
                      myOrders: "true",
                      page: 1,
                      limit: 1000,
                    };
                    const [startDate, endDate] = selectedDateRange;
                    if (startDate && endDate) {
                      params.startDate = moment(startDate).format("YYYY-MM-DD");
                      params.endDate = moment(endDate).format("YYYY-MM-DD");
                    }
                    const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS);
                    const response = await instance.request({}, params);
                    if (response?.data?.status === "Success") {
                      const allOrders = response.data.data?.data || [];
                      const filteredOrders = allOrders.filter(
                        (o) =>
                          o.customerDistrict === districtId &&
                          o.customerTaluka === talukaId &&
                          o.customerVillage === village._id?.village &&
                          o.balanceAmount > 0
                      );
                      setOrders(filteredOrders);
                      setFilteredFromOutstanding(true); // Mark that orders are filtered from outstanding
                      setActiveTab(0); // Switch to orders tab
                    }
                  } catch (error) {
                    console.error("Error fetching village orders:", error);
                    Toast.error("Failed to load orders");
                  } finally {
                    setLoading(false);
                  }
                }}>
                <CardContent 
                  sx={{ 
                    p: 2, 
                    textAlign: "center", 
                    "&:last-child": { pb: 2 },
                    pointerEvents: "none", // Allow clicks to pass through to Card
                  }}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.65rem",
                      color: "#666",
                      display: "block",
                      mb: 0.5,
                      fontWeight: 500,
                    }}>
                    VILLAGE
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    fontWeight="bold"
                    sx={{
                      fontSize: "0.8rem",
                      mb: 1,
                      wordBreak: "break-word",
                      minHeight: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    {village._id?.village || "Unknown"}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="error" sx={{ fontSize: "0.95rem", mb: 0.5 }}>
                    ₹{(village.totalOutstanding / 1000).toFixed(1)}K
                  </Typography>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem", mb: 0.5, display: "block" }}>
                    {village.totalOrders || 0} orders
                  </Typography>
                  <Typography variant="caption" color="primary" sx={{ fontSize: "0.65rem", fontWeight: 500 }}>
                    Tap to view orders
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      );
    }

    return null;
  };

  // Render Farmer Outstanding View (Tab 2)
  const renderFarmerOutstandingView = () => {
    if (outstandingLoading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "300px" }}>
          <CircularProgress />
        </Box>
      );
    }

    if (farmerOutstandingData.length === 0) {
      return (
        <Card sx={{ mt: 2, textAlign: "center", py: 4 }}>
          <CardContent>
            <Typography variant="body1" color="textSecondary">
              No outstanding found for any farmer
            </Typography>
          </CardContent>
        </Card>
      );
    }

    // Calculate totals
    const totalOutstanding = farmerOutstandingData.reduce((sum, f) => sum + f.totalOutstanding, 0);
    const totalFarmers = farmerOutstandingData.length;

    return (
      <Box sx={{ mt: 1, pb: 10 }}>
        {/* Summary Card */}
        <Card
          sx={{
            mb: 2,
            background: "linear-gradient(135deg, #f44336 0%, #d32f2f 100%)",
            color: "white",
            borderRadius: "12px",
          }}>
          <CardContent sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h5" fontWeight="bold">
              ₹{totalOutstanding.toLocaleString()}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Total Outstanding from {totalFarmers} farmers
            </Typography>
          </CardContent>
        </Card>

        {/* Farmer Accordion List */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {farmerOutstandingData.map((farmer, index) => {
            const isExpanded = expandedFarmerId === farmer.customerMobile;

            return (
              <Card
                key={farmer.customerMobile || index}
                sx={{
                  borderRadius: "10px",
                  overflow: "hidden",
                  boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0,0,0,0.1)",
                  transition: "all 0.2s",
                }}>
                {/* Farmer Header - Clickable */}
                <Box
                  onClick={() => setExpandedFarmerId(isExpanded ? null : farmer.customerMobile)}
                  sx={{
                    p: 1.5,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    backgroundColor: isExpanded ? "#f5f5f5" : "white",
                    "&:active": { backgroundColor: "#eeeeee" },
                  }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#e3f2fd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                    <PersonIcon sx={{ color: "#1976d2", fontSize: "1.2rem" }} />
                  </Box>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: "0.9rem" }}>
                      {farmer.customerName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.75rem" }}>
                      {farmer.customerMobile} • {farmer.customerVillage}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="error" sx={{ fontSize: "0.9rem" }}>
                      ₹{farmer.totalOutstanding.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                      {farmer.totalOrders} orders
                    </Typography>
                  </Box>

                  {isExpanded ? (
                    <ExpandLessIcon sx={{ color: "#666" }} />
                  ) : (
                    <ExpandMoreIcon sx={{ color: "#666" }} />
                  )}
                </Box>

                {/* Expanded Orders */}
                {isExpanded && (
                  <Box sx={{ backgroundColor: "#fafafa", borderTop: "1px solid #e0e0e0" }}>
                    {farmer.orders.map((order) => {
                      const statusColors = getStatusColor(order.orderStatus);
                      return (
                        <Box
                          key={order._id}
                          onClick={() => handleOrderClick(order)}
                          sx={{
                            p: 1.5,
                            borderBottom: "1px solid #e0e0e0",
                            cursor: "pointer",
                            "&:last-child": { borderBottom: "none" },
                            "&:active": { backgroundColor: "#f0f0f0" },
                          }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontSize: "0.7rem",
                                color: "#666",
                              }}>
                              {order.orderNumber}
                            </Typography>
                            <Chip
                              label={order.orderStatus}
                              size="small"
                              sx={{
                                fontSize: "0.6rem",
                                height: "18px",
                                backgroundColor: statusColors.bg,
                                color: statusColors.color,
                              }}
                            />
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <Typography 
                              variant="body2" 
                              fontWeight="bold" 
                              sx={{ 
                                fontSize: "0.85rem",
                                color: "#0f766e",
                                backgroundColor: "#f0fdfa",
                                px: 1.5,
                                py: 0.5,
                                borderRadius: "6px",
                                fontWeight: 700,
                                wordBreak: "break-word",
                              }}>
                              {order.productName || (order.ramAgriVarietyName ? `${order.ramAgriCropName || ""} – ${order.ramAgriVarietyName}`.trim() : order.ramAgriCropName) || "—"} • <strong>{order.quantity}</strong> qty
                            </Typography>
                            <Typography variant="caption" fontWeight="bold" color="error" sx={{ fontSize: "0.75rem" }}>
                              ₹{order.balanceAmount?.toLocaleString() || 0}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem" }}>
                            {moment(order.orderDate).format("DD MMM YYYY")}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Card>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Render Payment Status Icon
  const getPaymentStatusIcon = (status) => {
    switch (status) {
      case "COLLECTED":
        return <CheckCircleIcon sx={{ fontSize: "1rem", color: "#4caf50" }} />;
      case "PENDING":
        return <HourglassEmptyIcon sx={{ fontSize: "1rem", color: "#ff9800" }} />;
      case "REJECTED":
        return <CancelIcon sx={{ fontSize: "1rem", color: "#f44336" }} />;
      default:
        return null;
    }
  };

  // Get Activity Log Icon and Color
  const getActivityIconAndColor = (action) => {
    switch (action) {
      case "ORDER_CREATED":
        return { icon: <ShoppingCartIcon sx={{ fontSize: "1rem" }} />, color: "#4caf50", bg: "#e8f5e9" };
      case "ORDER_ACCEPTED":
        return { icon: <CheckCircleIcon sx={{ fontSize: "1rem" }} />, color: "#2196f3", bg: "#e3f2fd" };
      case "ORDER_REJECTED":
      case "ORDER_CANCELLED":
        return { icon: <CancelIcon sx={{ fontSize: "1rem" }} />, color: "#f44336", bg: "#ffebee" };
      case "PAYMENT_ADDED":
        return { icon: <PaymentIcon sx={{ fontSize: "1rem" }} />, color: "#9c27b0", bg: "#f3e5f5" };
      case "PAYMENT_STATUS_CHANGED":
        return { icon: <ReceiptIcon sx={{ fontSize: "1rem" }} />, color: "#ff9800", bg: "#fff3e0" };
      case "ORDER_UPDATED":
      case "CUSTOMER_UPDATED":
      case "PRODUCT_UPDATED":
      case "QUANTITY_UPDATED":
      case "RATE_UPDATED":
      case "NOTES_UPDATED":
      case "DELIVERY_DATE_UPDATED":
        return { icon: <EditIcon sx={{ fontSize: "1rem" }} />, color: "#607d8b", bg: "#eceff1" };
      default:
        return { icon: <HistoryIcon sx={{ fontSize: "1rem" }} />, color: "#9e9e9e", bg: "#f5f5f5" };
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f5",
      }}>
      {/* Compact Header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          background: "linear-gradient(135deg, #43a047 0%, #2e7d32 100%)",
          boxShadow: "0 2px 12px rgba(46, 125, 50, 0.2)",
        }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            py: 1.5,
            gap: 1,
          }}>
          <IconButton
            onClick={() => navigate(-1)}
            size="small"
            sx={{
              color: "white",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.25)" },
              p: 0.75,
            }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>

          <Box sx={{ flex: 1 }}>
            <Typography
              variant="subtitle2"
              sx={{
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: "0.7rem",
                fontWeight: 500,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}>
              Ram Agri Input
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontSize: "1rem",
                fontWeight: 600,
                lineHeight: 1.2,
                mt: -0.25,
              }}>
              {activeTab === 0
                ? `My Orders (${orders.length})`
                : activeTab === 1
                ? `Assigned (${assignedOrders.length})`
                : activeTab === 2
                ? "Outstanding"
                : activeTab === 3
                ? "Farmer Outstanding"
                : "Rankboard"}
            </Typography>
          </Box>

          <IconButton
            onClick={handleLogout}
            size="small"
            sx={{
              color: "white",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.25)" },
              p: 0.75,
            }}
            aria-label="Logout">
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Filters Section */}
        <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5 }}>
          {/* Search */}
          <TextField
            fullWidth
            size="small"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              mb: 1,
              backgroundColor: "white",
              borderRadius: "8px",
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: "#666" }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Date Range */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <DatePicker
                selected={startDate}
                onChange={(date) => setSelectedDateRange([date, endDate])}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                placeholderText="Start Date"
                dateFormat="dd/MM/yyyy"
                customInput={
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Start Date"
                    sx={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon fontSize="small" sx={{ color: "#666" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                }
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <DatePicker
                selected={endDate}
                onChange={(date) => setSelectedDateRange([startDate, date])}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                placeholderText="End Date"
                dateFormat="dd/MM/yyyy"
                customInput={
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="End Date"
                    sx={{
                      backgroundColor: "white",
                      borderRadius: "8px",
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "8px",
                      },
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon fontSize="small" sx={{ color: "#666" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                }
              />
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", backgroundColor: "white" }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTab(newValue);
              // Fetch data when switching tabs
              if (isAgriInputDealer) {
                // For AGRI_INPUT_DEALER: tab 0 = Assigned, tab 1 = Dispatched
                if (newValue === 0) {
                  fetchAssignedOrders();
                } else if (newValue === 1) {
                  fetchDispatchedOrders();
                }
              } else {
                // For others: tab 0 = Orders, tab 1 = Assigned, tab 2 = Area, tab 3 = Farmers, tab 4 = Rankboard, tab 5 = Targets
                if (newValue === 0) {
                  if (!filteredFromOutstanding) {
                    fetchOrders();
                  }
                } else if (newValue === 1) {
                  fetchAssignedOrders();
                  setFilteredFromOutstanding(false);
                } else if (newValue === 2) {
                  fetchOutstandingAnalysis();
                  setOutstandingView("total");
                  setFilteredFromOutstanding(false);
                } else if (newValue === 3) {
                  fetchFarmerOutstanding();
                  setFilteredFromOutstanding(false);
                } else if (newValue === 4) {
                  fetchRankboard();
                  setFilteredFromOutstanding(false);
                } else if (newValue === 5) {
                  fetchSalesTargets();
                  setFilteredFromOutstanding(false);
                }
              }
            }} 
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              "& .MuiTab-root": {
                fontSize: "0.7rem",
                minHeight: "42px",
                textTransform: "none",
                fontWeight: 600,
                px: 1.5,
                minWidth: "auto",
              },
            }}>
            {/* For AGRI_INPUT_DEALER: Only show Assigned tab */}
            {isAgriInputDealer ? (
              [
                <Tab key="assigned" label={`Assigned${assignedOrders.length > 0 ? ` (${assignedOrders.length})` : ""}`} />,
                <Tab key="dispatched" label={`Dispatched${dispatchedOrders.length > 0 ? ` (${dispatchedOrders.length})` : ""}`} />
              ]
            ) : (
              [
                <Tab key="orders" label="Orders" />,
                <Tab key="assigned" label={`Assigned${assignedOrders.length > 0 ? ` (${assignedOrders.length})` : ""}`} />,
                <Tab key="area" label="Area" />,
                <Tab key="farmers" label="Farmers" />,
                <Tab key="rankboard" label="Rankboard" />,
                <Tab key="targets" label="Targets" />
              ]
            )}
          </Tabs>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          px: 1.5,
          py: 1.5,
          width: "100%",
          maxWidth: "100%",
          boxSizing: "border-box",
          WebkitOverflowScrolling: "touch",
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#ccc",
            borderRadius: "3px",
          },
        }}>
        {/* Content based on active tab */}
        {isAgriInputDealer ? (
          // For AGRI_INPUT_DEALER: Only show Assigned (tab 0) and Dispatched (tab 1)
          activeTab === 0 ? (
            // Assigned Tab (tab 0 for AGRI_INPUT_DEALER)
            <>
              {assignedOrdersLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : assignedOrders.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    No assigned orders found
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 10 }}>
                  {/* Info Banner */}
                  <Box sx={{ p: 1.5, backgroundColor: "#e8f5e9", borderRadius: "8px", mb: 1 }}>
                    <Typography variant="caption" sx={{ color: "#2e7d32", fontWeight: 600 }}>
                      📋 These orders are assigned to you for dispatch. Select and dispatch when ready.
                    </Typography>
                  </Box>
                  
                  {/* Selection Mode Header for Assigned Orders */}
                  {selectionMode && (
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                        p: 1,
                        backgroundColor: "#e3f2fd",
                        borderRadius: "8px",
                      }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: "#1565c0" }}>
                        {selectedOrdersForDispatch.length} selected for dispatch
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button 
                          size="small" 
                          onClick={() => setSelectedOrdersForDispatch(assignedOrders.map(o => o._id))} 
                          sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                          Select All
                        </Button>
                        <Button size="small" onClick={clearAllSelections} sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<LocalShippingIcon sx={{ fontSize: "0.9rem" }} />}
                          onClick={openDispatchModal}
                          disabled={selectedOrdersForDispatch.length === 0}
                          sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                          Dispatch
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {assignedOrders.map((order) => {
                    const isSelected = selectedOrdersForDispatch.includes(order._id);
                    const productLabel = order.productName 
                      || (order.ramAgriVarietyName
                        ? `${order.ramAgriCropName || ""} – ${order.ramAgriVarietyName}`.trim()
                        : order.ramAgriCropName || "—");
                    
                    // Debug logging for product name
                    console.log("🔍 Product Name Debug (Assigned):", {
                      orderId: order._id,
                      orderNumber: order.orderNumber,
                      productName: order.productName,
                      ramAgriCropName: order.ramAgriCropName,
                      ramAgriVarietyName: order.ramAgriVarietyName,
                      productLabel: productLabel
                    });
                    
                    return (
                      <Card
                        key={order._id}
                        sx={{
                          transition: "all 0.2s",
                          backgroundColor: isSelected ? "#e3f2fd" : "white",
                          borderRadius: "10px",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                          overflow: "hidden",
                          border: isSelected ? "2px solid #1976d2" : "1px solid #e0e0e0",
                        }}>
                        <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flex: 1 }}>
                              {/* Selection Checkbox */}
                              {selectionMode && (
                                <IconButton
                                  size="small"
                                  onClick={() => toggleOrderSelection(order._id)}
                                  sx={{ p: 0, mt: 0.5 }}>
                                  {isSelected ? (
                                    <CheckBoxIcon sx={{ color: "#1976d2", fontSize: "1.2rem" }} />
                                  ) : (
                                    <CheckBoxOutlineBlankIcon sx={{ color: "#9e9e9e", fontSize: "1.2rem" }} />
                                  )}
                                </IconButton>
                              )}
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.7rem",
                                    mb: 0.5,
                                    color: "#666",
                                  }}>
                                  {order.orderNumber}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="bold" 
                                  sx={{ 
                                    fontSize: "0.85rem",
                                    mt: 0.5,
                                    backgroundColor: "#fff3e0",
                                    color: "#f57c00",
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: "6px",
                                    display: "inline-block",
                                    fontWeight: 700,
                                    boxShadow: "0 2px 4px rgba(245, 124, 0, 0.2)",
                                  }}>
                                  {order.customerName}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                                  {order.customerVillage}, {order.customerTaluka}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold" 
                                sx={{ 
                                  color: "#2e7d32", 
                                  fontSize: "0.9rem",
                                  fontWeight: 700,
                                  backgroundColor: "#e8f5e9",
                                  px: 1,
                                  py: 0.4,
                                  borderRadius: "6px",
                                  display: "inline-block",
                                  mb: 0.5,
                                }}>
                                ₹{Number(order.totalAmount || 0).toLocaleString()}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color: "#0369a1",
                                  backgroundColor: "#e0f2fe",
                                  px: 1,
                                  py: 0.4,
                                  borderRadius: "6px",
                                  display: "inline-block",
                                }}>
                                Qty: <strong>{order.quantity}</strong>
                              </Typography>
                            </Box>
                          </Box>

                          {/* Product name - Highlighted - Compact */}
                          {productLabel && productLabel !== "—" ? (
                            <Box sx={{ 
                              mb: 0.75, 
                              p: 1, 
                              background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
                              borderRadius: "6px", 
                              borderLeft: "3px solid #065f46",
                              boxShadow: "0 1px 4px rgba(15, 118, 110, 0.2)",
                            }}>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold" 
                                sx={{ 
                                  fontSize: "0.85rem", 
                                  color: "white",
                                  fontWeight: 700,
                                  textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                  lineHeight: 1.4,
                                  wordBreak: "break-word",
                                }}>
                                {productLabel}
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ 
                              mb: 0.75, 
                              p: 1, 
                              backgroundColor: "#ffebee",
                              borderRadius: "6px", 
                              borderLeft: "3px solid #c62828",
                            }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: "0.85rem", 
                                  color: "#c62828",
                                  fontWeight: 600,
                                }}>
                                ⚠️ Product name not available
                                <br />
                                <span style={{ fontSize: "0.7rem", color: "#666" }}>
                                  Debug: productName={String(order.productName)}, 
                                  crop={String(order.ramAgriCropName)}, 
                                  variety={String(order.ramAgriVarietyName)}
                                </span>
                              </Typography>
                            </Box>
                          )}

                          {/* Assigned Info */}
                          <Box sx={{ mb: 1, p: 1, backgroundColor: "#e8f5e9", borderRadius: "6px" }}>
                            <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#2e7d32" }}>
                              Assigned by: {order.assignedBy?.name || "Admin"} • {order.assignedAt ? moment(order.assignedAt).format("DD MMM, hh:mm A") : ""}
                            </Typography>
                            {order.assignmentNotes && (
                              <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#666", display: "block", mt: 0.5 }}>
                                Note: {order.assignmentNotes}
                              </Typography>
                            )}
                          </Box>

                          {/* Action Buttons */}
                          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                            {!selectionMode && (
                              <Button
                                size="small"
                                variant="contained"
                                startIcon={<LocalShippingIcon sx={{ fontSize: "0.9rem" }} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectionMode(true);
                                  setSelectedOrdersForDispatch([order._id]);
                                }}
                                sx={{
                                  flex: 1,
                                  fontSize: "0.7rem",
                                  textTransform: "none",
                                  py: 0.5,
                                  backgroundColor: "#1565c0",
                                  "&:hover": { backgroundColor: "#0d47a1" },
                                }}>
                                Dispatch
                              </Button>
                            )}
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<PaymentIcon sx={{ fontSize: "0.9rem" }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOrderClick(order);
                              }}
                              sx={{
                                flex: 1,
                                fontSize: "0.7rem",
                                textTransform: "none",
                                py: 0.5,
                                borderColor: "#4caf50",
                                color: "#4caf50",
                              }}>
                              Payment
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </>
          ) : activeTab === 1 ? (
            // Dispatched Tab (tab 1 for AGRI_INPUT_DEALER)
            <>
              {dispatchedOrdersLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={32} />
                </Box>
              ) : dispatchedOrders.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    No dispatched orders found
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 10 }}>
                  {/* Info Banner + Select to Complete - Only for AGRI_INPUT_DEALER */}
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
                    <Box sx={{ p: 1.5, backgroundColor: "#e3f2fd", borderRadius: "8px", flex: 1 }}>
                      <Typography variant="caption" sx={{ color: "#1565c0", fontWeight: 600 }}>
                        🚚 Orders that have been dispatched
                      </Typography>
                    </Box>
                    {!completeSelectionMode && isAgriInputDealer && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CheckBoxOutlineBlankIcon />}
                        onClick={() => {
                          setCompleteSelectionMode(true);
                          setSelectedOrdersForComplete([]);
                        }}
                        sx={{ fontSize: "0.75rem", textTransform: "none", borderColor: "#2e7d32", color: "#2e7d32" }}>
                        Select to Complete
                      </Button>
                    )}
                  </Box>

                  {/* Complete action bar when selection mode - Only for AGRI_INPUT_DEALER */}
                  {completeSelectionMode && isAgriInputDealer && (
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, p: 1, backgroundColor: "#e8f5e9", borderRadius: "8px", mb: 1 }}>
                      <Typography variant="body2" fontWeight="bold" sx={{ color: "#2e7d32" }}>
                        {selectedOrdersForComplete.length} selected to complete
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedOrdersForComplete(dispatchedOrders.map((o) => o._id));
                            const initial = {};
                            dispatchedOrders.forEach((o) => { initial[o._id] = 0; });
                            setCompleteForm((f) => ({ ...f, returnQuantities: initial }));
                          }}
                          sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                          Select All
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setCompleteSelectionMode(false);
                            setSelectedOrdersForComplete([]);
                          }}
                          sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleIcon sx={{ fontSize: "0.9rem" }} />}
                          onClick={openCompleteModal}
                          disabled={selectedOrdersForComplete.length === 0}
                          sx={{ fontSize: "0.7rem", textTransform: "none", backgroundColor: "#2e7d32" }}>
                          Complete
                        </Button>
                      </Box>
                    </Box>
                  )}

                  {dispatchedOrders.map((order) => {
                    const isExpanded = expandedOrderId === order._id;
                    const hasPayments = order.payment && order.payment.length > 0;
                    const isSelectedForComplete = selectedOrdersForComplete.includes(order._id);
                    const canComplete = order.orderStatus === "DISPATCHED" || order.dispatchStatus === "DISPATCHED" || order.dispatchStatus === "IN_TRANSIT";
                    const productLabel = order.productName 
                      || (order.ramAgriVarietyName
                        ? `${order.ramAgriCropName || ""} – ${order.ramAgriVarietyName}`.trim()
                        : order.ramAgriCropName || "—");
                    const balance = order.balanceAmount ?? (Number(order.totalAmount || 0) - Number(order.totalPaidAmount || 0));
                    
                    // Debug logging for product name
                    console.log("🔍 Product Name Debug:", {
                      orderId: order._id,
                      orderNumber: order.orderNumber,
                      productName: order.productName,
                      ramAgriCropName: order.ramAgriCropName,
                      ramAgriVarietyName: order.ramAgriVarietyName,
                      productLabel: productLabel,
                      fullOrder: order
                    });

                    return (
                      <Card
                        key={order._id}
                        sx={{
                          transition: "all 0.2s",
                          backgroundColor: isSelectedForComplete ? "#e8f5e9" : "white",
                          borderRadius: "10px",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                          overflow: "hidden",
                          border: isSelectedForComplete ? "2px solid #2e7d32" : "1px solid #e0e0e0",
                        }}>
                        <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flex: 1 }}>
                              {completeSelectionMode && canComplete && isAgriInputDealer && (
                                <IconButton
                                  size="small"
                                  onClick={() => toggleCompleteOrderSelection(order._id)}
                                  sx={{ p: 0, mt: 0.5 }}>
                                  {isSelectedForComplete ? (
                                    <CheckBoxIcon sx={{ color: "#2e7d32", fontSize: "1.2rem" }} />
                                  ) : (
                                    <CheckBoxOutlineBlankIcon sx={{ color: "#9e9e9e", fontSize: "1.2rem" }} />
                                  )}
                                </IconButton>
                              )}
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.7rem",
                                    mb: 0.5,
                                    color: "#666",
                                    display: "inline-block",
                                  }}>
                                  {order.orderNumber}
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="bold" 
                                  sx={{ 
                                    fontSize: "0.85rem",
                                    mt: 0.5,
                                    backgroundColor: "#fff3e0",
                                    color: "#f57c00",
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: "6px",
                                    display: "inline-block",
                                    fontWeight: 700,
                                    boxShadow: "0 2px 4px rgba(245, 124, 0, 0.2)",
                                  }}>
                                  {order.customerName}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                                  {order.customerVillage}, {order.customerTaluka}
                                </Typography>
                              </Box>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold" 
                                sx={{ 
                                  color: "#2e7d32", 
                                  fontSize: "0.9rem",
                                  fontWeight: 700,
                                  backgroundColor: "#e8f5e9",
                                  px: 1,
                                  py: 0.4,
                                  borderRadius: "6px",
                                  display: "inline-block",
                                  mb: 0.5,
                                }}>
                                ₹{Number(order.totalAmount || 0).toLocaleString()}
                              </Typography>
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  color: "#0369a1",
                                  backgroundColor: "#e0f2fe",
                                  px: 1,
                                  py: 0.4,
                                  borderRadius: "6px",
                                  display: "inline-block",
                                }}>
                                Qty: <strong>{order.quantity}</strong>
                              </Typography>
                            </Box>
                          </Box>

                          {/* Product name - Highlighted - Compact */}
                          {productLabel && productLabel !== "—" ? (
                            <Box sx={{ 
                              mb: 0.75, 
                              p: 1, 
                              background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
                              borderRadius: "6px", 
                              borderLeft: "3px solid #065f46",
                              boxShadow: "0 1px 4px rgba(15, 118, 110, 0.2)",
                            }}>
                              <Typography 
                                variant="body2" 
                                fontWeight="bold" 
                                sx={{ 
                                  fontSize: "0.85rem", 
                                  color: "white",
                                  fontWeight: 700,
                                  textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                                  lineHeight: 1.4,
                                  wordBreak: "break-word",
                                }}>
                                {productLabel}
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ 
                              mb: 0.75, 
                              p: 1, 
                              backgroundColor: "#ffebee",
                              borderRadius: "6px", 
                              borderLeft: "3px solid #c62828",
                            }}>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: "0.85rem", 
                                  color: "#c62828",
                                  fontWeight: 600,
                                }}>
                                ⚠️ Product name not available
                                <br />
                                <span style={{ fontSize: "0.7rem", color: "#666" }}>
                                  Debug: productName={String(order.productName)}, 
                                  crop={String(order.ramAgriCropName)}, 
                                  variety={String(order.ramAgriVarietyName)}
                                </span>
                              </Typography>
                            </Box>
                          )}

                          {/* Quantity, Balance, District - Compact */}
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 0.75 }}>
                            {/* Show final quantity for completed orders, original quantity otherwise */}
                            {order.orderStatus === "COMPLETED" && order.deliveredQuantity > 0 ? (
                              <Chip
                                label={
                                  <Box component="span">
                                    Final: <strong style={{ fontSize: "0.8rem", fontWeight: 700 }}>{order.deliveredQuantity}</strong>
                                    {order.returnQuantity > 0 && (
                                      <span> (R: <strong style={{ fontSize: "0.8rem", fontWeight: 700 }}>{order.returnQuantity}</strong>)</span>
                                    )}
                                  </Box>
                                }
                                size="small"
                                sx={{ fontSize: "0.7rem", height: "20px", fontWeight: 600, backgroundColor: "#dcfce7", color: "#166534" }}
                              />
                            ) : (
                              <Chip
                                label={
                                  <Box component="span">
                                    Qty: <strong style={{ fontSize: "0.8rem", fontWeight: 700 }}>{order.quantity}</strong>
                                  </Box>
                                }
                                size="small"
                                sx={{ fontSize: "0.7rem", height: "20px", fontWeight: 600, backgroundColor: "#e0f2fe", color: "#0369a1" }}
                              />
                            )}
                            <Chip
                              label={
                                <Box component="span">
                                  Rate: ₹<strong style={{ fontSize: "0.8rem", fontWeight: 700 }}>{Number(order.rate || 0).toLocaleString()}</strong>
                                </Box>
                              }
                              size="small"
                              sx={{ fontSize: "0.7rem", height: "20px", fontWeight: 600, backgroundColor: "#f3e5f5", color: "#7b1fa2" }}
                            />
                            <Chip
                              label={
                                <Box component="span">
                                  Bal: ₹<strong style={{ fontSize: "0.8rem", fontWeight: 700 }}>{Number(balance).toLocaleString()}</strong>
                                </Box>
                              }
                              size="small"
                              sx={{
                                fontSize: "0.7rem",
                                height: "20px",
                                fontWeight: 700,
                                backgroundColor: balance > 0 ? "#fef3c7" : "#dcfce7",
                                color: balance > 0 ? "#92400e" : "#166534",
                              }}
                            />
                            {order.customerDistrict && (
                              <Chip
                                label={order.customerDistrict}
                                size="small"
                                sx={{ fontSize: "0.65rem", height: "20px", fontWeight: 600, backgroundColor: "#ede9fe", color: "#5b21b6" }}
                              />
                            )}
                          </Box>

                          {/* Dispatch Status */}
                          {order.dispatchStatus && order.dispatchStatus !== "NOT_DISPATCHED" && (
                            <Box sx={{ mb: 0.75, p: 0.75, backgroundColor: "#e3f2fd", borderRadius: "6px" }}>
                              <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#1565c0", fontWeight: 600 }}>
                                {order.dispatchMode === "COURIER" ? "📦" : "🚚"} Dispatched
                              </Typography>
                              {order.dispatchedAt && (
                                <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#666", display: "block" }}>
                                  {moment(order.dispatchedAt).format("DD MMM, hh:mm A")}
                                </Typography>
                              )}
                              {order.dispatchMode === "VEHICLE" && order.vehicleNumber && (
                                <>
                                  <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#666", display: "block" }}>
                                    Vehicle: {order.vehicleNumber}
                                  </Typography>
                                  {order.driverName && (
                                    <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#666", display: "block" }}>
                                      Driver: {order.driverName}
                                    </Typography>
                                  )}
                                  {order.driverMobile && (
                                    <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#666", display: "block" }}>
                                      📱 {order.driverMobile}
                                    </Typography>
                                  )}
                                </>
                              )}
                              {order.dispatchMode === "COURIER" && order.courierName && (
                                <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#666", display: "block" }}>
                                  Courier: {order.courierName}
                                </Typography>
                              )}
                            </Box>
                          )}

                          {/* Actions: Payment, Sales Return, Complete (Complete only for AGRI_INPUT_DEALER) */}
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {hasPayments && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<PaymentIcon sx={{ fontSize: "0.9rem" }} />}
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowPaymentModal(true);
                                }}
                                sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                                Payment
                              </Button>
                            )}
                            {(order.dispatchStatus === "DISPATCHED" || order.dispatchStatus === "IN_TRANSIT") && (
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<InventoryIcon sx={{ fontSize: "0.9rem" }} />}
                                onClick={() => openSalesReturnModal(order)}
                                sx={{ fontSize: "0.7rem", textTransform: "none", borderColor: "#7c3aed", color: "#7c3aed" }}>
                                Sales Return
                              </Button>
                            )}
                            {!completeSelectionMode && canComplete && isAgriInputDealer && (
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleIcon sx={{ fontSize: "0.9rem" }} />}
                                onClick={() => {
                                  setCompleteSelectionMode(true);
                                  setSelectedOrdersForComplete([order._id]);
                                  setCompleteForm((f) => ({ ...f, returnQuantities: { [order._id]: 0 } }));
                                }}
                                sx={{ fontSize: "0.7rem", textTransform: "none", backgroundColor: "#2e7d32" }}>
                                Complete
                              </Button>
                            )}
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              )}
            </>
          ) : null
        ) : activeTab === 0 ? (
          // Orders Tab
          <>
            {/* Back Button if filtered from Outstanding */}
            {filteredFromOutstanding && (
              <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setFilteredFromOutstanding(false);
                  setActiveTab(2); // Go back to Outstanding tab (now tab 2)
                  fetchOutstandingAnalysis(); // Refresh outstanding data
                }}
                sx={{
                  mb: 2,
                  textTransform: "none",
                  backgroundColor: "#f5f5f5",
                  "&:hover": { backgroundColor: "#e0e0e0" },
                }}>
                Back to Outstanding
              </Button>
            )}

            {loading && orders.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "300px",
                }}>
                <CircularProgress />
              </Box>
            ) : orders.length === 0 ? (
              <Card
                sx={{
                  mt: 2,
                  textAlign: "center",
                  py: 4,
                  backgroundColor: "white",
                }}>
                <CardContent>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No Orders Found
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {searchTerm || (startDate && endDate)
                      ? "No orders match your filters"
                      : "Create your first order"}
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Order Status Subtabs - Compact */}
                <Box
                  sx={{
                    mb: 1.5,
                    backgroundColor: "white",
                    borderRadius: "8px",
                    p: 0.75,
                    display: "flex",
                    gap: 0.5,
                    overflowX: "hidden",
                    overflowY: "hidden",
                    width: "100%",
                    boxSizing: "border-box",
                  }}>
                  {[
                    { value: "all", label: "All", emoji: "" },
                    { value: "pending", label: "Pending", emoji: "⏳" },
                    { value: "accepted", label: "Accepted", emoji: "✓" },
                    { value: "dispatched", label: "Dispatched", emoji: "🚚" },
                  ].map((tab) => {
                    // Calculate count for each status
                    let count = 0;
                    if (tab.value === "all") {
                      count = orders.length;
                    } else if (tab.value === "pending") {
                      count = orders.filter((o) => o.orderStatus === "PENDING").length;
                    } else if (tab.value === "accepted") {
                      count = orders.filter((o) => o.orderStatus === "ACCEPTED").length;
                    } else if (tab.value === "dispatched") {
                      count = orders.filter(
                        (o) =>
                          o.orderStatus === "DISPATCHED" ||
                          o.dispatchStatus === "DISPATCHED" ||
                          o.dispatchStatus === "IN_TRANSIT"
                      ).length;
                    }

                    const isActive = orderStatusFilter === tab.value;
                    return (
                      <Chip
                        key={tab.value}
                        onClick={() => setOrderStatusFilter(tab.value)}
                        label={
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            {tab.emoji && <span style={{ fontSize: "0.7rem" }}>{tab.emoji}</span>}
                            <span>{tab.label}</span>
                            <span style={{ fontWeight: 700, fontSize: "0.7rem" }}>({count})</span>
                          </Box>
                        }
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          maxWidth: "25%",
                          height: "32px",
                          fontSize: "0.7rem",
                          fontWeight: isActive ? 600 : 500,
                          backgroundColor: isActive ? "#43a047" : "#f5f5f5",
                          color: isActive ? "white" : "#666",
                          cursor: "pointer",
                          "&:hover": {
                            backgroundColor: isActive ? "#388e3c" : "#e0e0e0",
                          },
                          "& .MuiChip-label": {
                            px: 0.75,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          },
                        }}
                      />
                    );
                  })}
                </Box>

                {/* Selection Mode Header */}
                {/* Dispatch Selection Mode Header */}
                {selectionMode && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                      p: 1,
                      backgroundColor: "#e3f2fd",
                      borderRadius: "8px",
                    }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: "#1565c0" }}>
                      {selectedOrdersForDispatch.length} selected for dispatch
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button size="small" onClick={selectAllOrders} sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                        Select All
                      </Button>
                      <Button size="small" onClick={clearAllSelections} sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<LocalShippingIcon sx={{ fontSize: "0.9rem" }} />}
                        onClick={openDispatchModal}
                        disabled={selectedOrdersForDispatch.length === 0}
                        sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                        Dispatch
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Complete Selection Mode Header */}
                {completeSelectionMode && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                      p: 1,
                      backgroundColor: "#e8f5e9",
                      borderRadius: "8px",
                    }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: "#2e7d32" }}>
                      {selectedOrdersForComplete.length} selected to complete
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button 
                        size="small" 
                        onClick={() => {
                          // Select all dispatched/in-transit orders
                          const dispatchedOrders = orders.filter(
                            (o) => o.orderStatus === "DISPATCHED" || o.dispatchStatus === "DISPATCHED" || o.dispatchStatus === "IN_TRANSIT"
                          );
                          setSelectedOrdersForComplete(dispatchedOrders.map((o) => o._id));
                        }} 
                        sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                        Select All
                      </Button>
                      <Button 
                        size="small" 
                        onClick={() => {
                          setCompleteSelectionMode(false);
                          setSelectedOrdersForComplete([]);
                        }} 
                        sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircleIcon sx={{ fontSize: "0.9rem" }} />}
                        onClick={openCompleteModal}
                        disabled={selectedOrdersForComplete.length === 0}
                        sx={{ fontSize: "0.7rem", textTransform: "none", backgroundColor: "#2e7d32" }}>
                        Complete
                      </Button>
                    </Box>
                  </Box>
                )}

                {/* Filter orders based on selected subtab */}
                {(() => {
                  let filteredOrders = orders;
                  if (orderStatusFilter === "pending") {
                    filteredOrders = orders.filter((o) => o.orderStatus === "PENDING");
                  } else if (orderStatusFilter === "accepted") {
                    filteredOrders = orders.filter((o) => o.orderStatus === "ACCEPTED");
                  } else if (orderStatusFilter === "dispatched") {
                    filteredOrders = orders.filter(
                      (o) =>
                        o.orderStatus === "DISPATCHED" ||
                        o.dispatchStatus === "DISPATCHED" ||
                        o.dispatchStatus === "IN_TRANSIT"
                    );
                  }

                  if (filteredOrders.length === 0) {
                    return (
                      <Card
                        sx={{
                          mt: 2,
                          textAlign: "center",
                          py: 4,
                          backgroundColor: "white",
                        }}>
                        <CardContent>
                          <Typography variant="body2" color="textSecondary">
                            No {orderStatusFilter !== "all" ? orderStatusFilter : ""} orders found
                          </Typography>
                        </CardContent>
                      </Card>
                    );
                  }

                  return (
                    <Box sx={{ 
                      display: "flex", 
                      flexDirection: "column", 
                      gap: 1, 
                      pb: 10,
                      width: "100%",
                      maxWidth: "100%",
                      boxSizing: "border-box",
                      overflowX: "hidden",
                    }}>
                      {filteredOrders.map((order) => {
                  const statusColors = getStatusColor(order.orderStatus);
                  const paymentColors = getPaymentStatusColor(order.paymentStatus);
                  const isExpanded = expandedOrderId === order._id;
                  const hasPayments = order.payment && order.payment.length > 0;
                  const dispatchInfo = getDispatchStatusInfo(order.dispatchStatus);
                  const isSelected = selectedOrdersForDispatch.includes(order._id);
                  const isSelectedForComplete = selectedOrdersForComplete.includes(order._id);
                  const canDispatch =
                    (order.orderStatus === "ACCEPTED" || order.orderStatus === "ASSIGNED") &&
                    order.dispatchStatus === "NOT_DISPATCHED";
                  const canComplete = 
                    order.orderStatus === "DISPATCHED" || order.dispatchStatus === "DISPATCHED" || order.dispatchStatus === "IN_TRANSIT";
                  
                  // Product label calculation
                  const productLabel = order.productName 
                    || (order.ramAgriVarietyName
                      ? `${order.ramAgriCropName || ""} – ${order.ramAgriVarietyName}`.trim()
                      : order.ramAgriCropName || "—");
                  const balance = order.balanceAmount ?? (Number(order.totalAmount || 0) - Number(order.totalPaidAmount || 0));
                  
                  // Debug logging for product name
                  console.log("🔍 Product Name Debug (Order Tab):", {
                    orderId: order._id,
                    orderNumber: order.orderNumber,
                    productName: order.productName,
                    ramAgriCropName: order.ramAgriCropName,
                    ramAgriVarietyName: order.ramAgriVarietyName,
                    productLabel: productLabel
                  });

                  return (
                    <Card
                      key={order._id}
                      sx={{
                        transition: "all 0.2s",
                        backgroundColor: isSelected ? "#e3f2fd" : isSelectedForComplete ? "#e8f5e9" : "white",
                        borderRadius: "12px",
                        boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.15)" : "0 2px 8px rgba(0,0,0,0.08)",
                        overflow: "hidden",
                        border: isSelected ? "2px solid #1976d2" : isSelectedForComplete ? "2px solid #2e7d32" : "1px solid #e0e0e0",
                        width: "100%",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        mb: 1.5,
                      }}>
                      {/* Order Header */}
                      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 }, overflow: "hidden" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75, gap: 0.75 }}>
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flex: 1 }}>
                            {/* Selection Checkbox for Dispatch */}
                            {selectionMode && canDispatch && (
                              <IconButton
                                size="small"
                                onClick={() => toggleOrderSelection(order._id)}
                                sx={{ p: 0, mt: 0.5 }}>
                                {isSelected ? (
                                  <CheckBoxIcon sx={{ color: "#1976d2", fontSize: "1.2rem" }} />
                                ) : (
                                  <CheckBoxOutlineBlankIcon sx={{ color: "#9e9e9e", fontSize: "1.2rem" }} />
                                )}
                              </IconButton>
                            )}
                            {/* Selection Checkbox for Complete */}
                            {completeSelectionMode && canComplete && (
                              <IconButton
                                size="small"
                                onClick={() => toggleCompleteOrderSelection(order._id)}
                                sx={{ p: 0, mt: 0.5 }}>
                                {isSelectedForComplete ? (
                                  <CheckBoxIcon sx={{ color: "#2e7d32", fontSize: "1.2rem" }} />
                                ) : (
                                  <CheckBoxOutlineBlankIcon sx={{ color: "#9e9e9e", fontSize: "1.2rem" }} />
                                )}
                              </IconButton>
                            )}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                <Typography
                                  variant="body2"
                                  fontWeight="bold"
                                  sx={{
                                    fontSize: "0.85rem",
                                    color: "#212121",
                                    fontWeight: 600,
                                    wordBreak: "break-word",
                                  }}>
                                  {order.customerName}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.65rem",
                                    color: "#999",
                                    fontWeight: 500,
                                  }}>
                                  {order.orderNumber}
                                </Typography>
                              </Box>
                              {order.customerVillage && (
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block", mt: 0.25 }}>
                                  {order.customerVillage}, {order.customerTaluka}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}>
                            <Chip
                              label={order.orderStatus}
                              size="small"
                              sx={{
                                fontSize: "0.6rem",
                                height: "18px",
                                backgroundColor: statusColors.bg,
                                color: statusColors.color,
                                fontWeight: 600,
                              }}
                            />
                            {/* Dispatch Status Chip */}
                            {order.dispatchStatus && order.dispatchStatus !== "NOT_DISPATCHED" && (
                              <Chip
                                icon={order.dispatchMode === "COURIER" 
                                  ? <InventoryIcon sx={{ fontSize: "0.65rem !important" }} />
                                  : <LocalShippingIcon sx={{ fontSize: "0.65rem !important" }} />
                                }
                                label={`${dispatchInfo.label}${order.dispatchMode === "COURIER" ? "" : ""}`}
                                size="small"
                                sx={{
                                  fontSize: "0.6rem",
                                  height: "18px",
                                  backgroundColor: order.dispatchMode === "COURIER" ? "#f3e5f5" : dispatchInfo.bg,
                                  color: order.dispatchMode === "COURIER" ? "#7b1fa2" : dispatchInfo.color,
                                  fontWeight: 600,
                                  "& .MuiChip-icon": { color: order.dispatchMode === "COURIER" ? "#7b1fa2" : dispatchInfo.color },
                                }}
                              />
                            )}
                          </Box>
                        </Box>

                        {/* Product name - Compact */}
                        {productLabel && productLabel !== "—" ? (
                          <Box sx={{ 
                            mb: 0.75, 
                            mt: 0.75,
                            p: 1, 
                            backgroundColor: "#f8f9fa",
                            borderRadius: "8px", 
                            borderLeft: "4px solid #757575",
                          }}>
                            <Typography 
                              variant="body2" 
                              fontWeight="bold" 
                              sx={{ 
                                fontSize: "0.8rem", 
                                color: "#212121",
                                fontWeight: 600,
                                lineHeight: 1.4,
                                wordBreak: "break-word",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}>
                              {productLabel}
                            </Typography>
                          </Box>
                        ) : null}

                        {/* Quantity, Rate - Compact */}
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 0.5, mt: 0.5 }}>
                          <Chip
                            label={
                              <Box component="span">
                                Qty: <strong style={{ fontSize: "0.75rem", fontWeight: 700 }}>{order.quantity}</strong>
                              </Box>
                            }
                            size="small"
                            sx={{ fontSize: "0.65rem", height: "18px", fontWeight: 600, backgroundColor: "#f5f5f5", color: "#424242" }}
                          />
                          <Chip
                            label={
                              <Box component="span">
                                Rate: ₹<strong style={{ fontSize: "0.75rem", fontWeight: 700 }}>{Number(order.rate || 0).toLocaleString()}</strong>
                              </Box>
                            }
                            size="small"
                            sx={{ fontSize: "0.65rem", height: "18px", fontWeight: 600, backgroundColor: "#f5f5f5", color: "#424242" }}
                          />
                        </Box>

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5, flexWrap: "wrap", gap: 0.5 }}>
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", alignItems: "center" }}>
                            <Typography 
                              variant="body2" 
                              fontWeight="bold" 
                              sx={{ 
                                fontSize: "0.85rem",
                                color: "#424242",
                                px: 1,
                                py: 0.35,
                                borderRadius: "6px",
                                fontWeight: 700,
                              }}>
                              Total: ₹{Number(order.totalAmount || 0).toLocaleString()}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              fontWeight="bold" 
                              sx={{ 
                                fontSize: "0.75rem",
                                color: order.balanceAmount > 0 ? "#d32f2f" : "#424242",
                                px: 1,
                                py: 0.35,
                                borderRadius: "6px",
                                fontWeight: 700,
                              }}>
                              Balance: ₹{Number(order.balanceAmount || 0).toLocaleString()}
                            </Typography>
                            {/* Show final quantity info for completed orders */}
                            {order.orderStatus === "COMPLETED" && order.deliveredQuantity > 0 && order.deliveredQuantity !== order.quantity && (
                              <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#0f766e", display: "block", mt: 0.5, fontWeight: 600 }}>
                                Final Amount (Qty: <strong>{order.deliveredQuantity}</strong> × ₹<strong>{order.rate}</strong>)
                              </Typography>
                            )}
                          </Box>
                          <Chip
                            label={order.paymentStatus}
                            size="small"
                            sx={{
                              fontSize: "0.65rem",
                              height: "18px",
                              backgroundColor: "#f5f5f5",
                              color: "#424242",
                              fontWeight: 600,
                            }}
                          />
                        </Box>

                        {/* Dispatch Info Row (if dispatched) */}
                        {order.dispatchStatus && order.dispatchStatus !== "NOT_DISPATCHED" && (
                          <Box
                            sx={{
                              mt: 0.5,
                              p: 0.75,
                              backgroundColor: order.dispatchMode === "COURIER" ? "#f3e5f5" : dispatchInfo.bg,
                              borderRadius: "6px",
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                            }}>
                            {order.dispatchMode === "COURIER" ? (
                              <InventoryIcon sx={{ fontSize: "1rem", color: "#7b1fa2" }} />
                            ) : (
                              <LocalShippingIcon sx={{ fontSize: "1rem", color: dispatchInfo.color }} />
                            )}
                            <Box sx={{ flex: 1 }}>
                              {order.dispatchMode === "COURIER" ? (
                                <>
                                  <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#7b1fa2", fontWeight: 600 }}>
                                    📦 {order.courierName}
                                    {order.courierTrackingId && ` • ${order.courierTrackingId}`}
                                  </Typography>
                                  {order.courierContact && (
                                    <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666", display: "block" }}>
                                      Contact: {order.courierContact}
                                    </Typography>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Typography variant="caption" sx={{ fontSize: "0.7rem", color: dispatchInfo.color, fontWeight: 600 }}>
                                    🚚 {order.vehicleNumber} • {order.driverName}
                                  </Typography>
                                  {order.driverMobile && (
                                    <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666", display: "block" }}>
                                      📱 {order.driverMobile}
                                    </Typography>
                                  )}
                                </>
                              )}
                              {order.dispatchedAt && (
                                <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666", display: "block" }}>
                                  {moment(order.dispatchedAt).format("DD MMM, hh:mm A")}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}

                        {/* Action Buttons Row */}
                        <Box sx={{ display: "flex", gap: 1, mt: 1.5, pt: 1, borderTop: "1px solid #f0f0f0" }}>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PaymentIcon sx={{ fontSize: "0.9rem" }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order);
                            }}
                            sx={{
                              flex: 1,
                              fontSize: "0.7rem",
                              textTransform: "none",
                              py: 0.5,
                              backgroundColor: "#4caf50",
                              "&:hover": { backgroundColor: "#43a047" },
                            }}>
                            Add Payment
                          </Button>
                          {/* Dispatch Button */}
                          {canDispatch && !selectionMode && !completeSelectionMode && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<LocalShippingIcon sx={{ fontSize: "0.9rem" }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectionMode(true);
                                setSelectedOrdersForDispatch([order._id]);
                              }}
                              sx={{
                                flex: 1,
                                fontSize: "0.7rem",
                                textTransform: "none",
                                py: 0.5,
                                borderColor: "#1565c0",
                                color: "#1565c0",
                              }}>
                              Dispatch
                            </Button>
                          )}
                          {/* Sales Return Button - for orders dispatched by sales person */}
                          {(order.dispatchStatus === "DISPATCHED" || order.dispatchStatus === "IN_TRANSIT") && 
                           order.assignedTo && 
                           !selectionMode && !completeSelectionMode && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<InventoryIcon sx={{ fontSize: "0.9rem" }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                openSalesReturnModal(order);
                              }}
                              sx={{
                                flex: 1,
                                fontSize: "0.7rem",
                                textTransform: "none",
                                py: 0.5,
                                borderColor: "#7c3aed",
                                color: "#7c3aed",
                              }}>
                              Sales Return
                            </Button>
                          )}
                          {/* Complete Button - for dispatched/in-transit orders */}
                          {(order.dispatchStatus === "DISPATCHED" || order.dispatchStatus === "IN_TRANSIT") && 
                           !selectionMode && !completeSelectionMode && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<CheckCircleIcon sx={{ fontSize: "0.9rem" }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCompleteSelectionMode(true);
                                setSelectedOrdersForComplete([order._id]);
                              }}
                              sx={{
                                flex: 1,
                                fontSize: "0.7rem",
                                textTransform: "none",
                                py: 0.5,
                                borderColor: "#2e7d32",
                                color: "#2e7d32",
                              }}>
                              Complete
                            </Button>
                          )}
                          {hasPayments && (
                            <Button
                              size="small"
                              variant="outlined"
                              endIcon={isExpanded ? <ExpandLessIcon sx={{ fontSize: "0.9rem" }} /> : <ExpandMoreIcon sx={{ fontSize: "0.9rem" }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedOrderId(isExpanded ? null : order._id);
                              }}
                              sx={{
                                flex: 1,
                                fontSize: "0.7rem",
                                textTransform: "none",
                                py: 0.5,
                                borderColor: "#1976d2",
                                color: "#1976d2",
                              }}>
                              {order.payment.length} Payment{order.payment.length > 1 ? "s" : ""}
                            </Button>
                          )}
                        </Box>
                      </CardContent>

                      {/* Expanded Payment Records */}
                      {isExpanded && hasPayments && (
                        <Box sx={{ backgroundColor: "#fafafa", borderTop: "1px solid #e0e0e0" }}>
                          <Box sx={{ px: 1.5, py: 1 }}>
                            <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.7rem", color: "#666" }}>
                              PAYMENT HISTORY
                            </Typography>
                          </Box>
                          {order.payment.map((payment, idx) => {
                            const paymentStatusColor = 
                              payment.paymentStatus === "COLLECTED" ? "#4caf50" :
                              payment.paymentStatus === "PENDING" ? "#ff9800" : "#f44336";
                            
                            return (
                              <Box
                                key={payment._id || idx}
                                sx={{
                                  px: 1.5,
                                  py: 1,
                                  borderBottom: "1px solid #e8e8e8",
                                  "&:last-child": { borderBottom: "none" },
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}>
                                {/* Payment Status Icon */}
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    backgroundColor: `${paymentStatusColor}15`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}>
                                  {getPaymentStatusIcon(payment.paymentStatus)}
                                </Box>

                                {/* Payment Details */}
                                <Box sx={{ flex: 1 }}>
                                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <Typography 
                                      variant="subtitle2" 
                                      fontWeight="bold" 
                                      sx={{ 
                                        fontSize: "0.9rem",
                                        fontWeight: 700,
                                        color: payment.paymentStatus === "COLLECTED" ? "#2e7d32" : payment.paymentStatus === "PENDING" ? "#f57c00" : "#d32f2f",
                                        backgroundColor: payment.paymentStatus === "COLLECTED" ? "#e8f5e9" : payment.paymentStatus === "PENDING" ? "#fff3e0" : "#ffebee",
                                        px: 1.5,
                                        py: 0.5,
                                        borderRadius: "6px",
                                      }}>
                                      ₹{Number(payment.paidAmount || 0).toLocaleString()}
                                    </Typography>
                                    <Chip
                                      label={payment.paymentStatus}
                                      size="small"
                                      sx={{
                                        fontSize: "0.6rem",
                                        height: "18px",
                                        backgroundColor: `${paymentStatusColor}20`,
                                        color: paymentStatusColor,
                                        fontWeight: 600,
                                      }}
                                    />
                                  </Box>
                                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                                    {payment.modeOfPayment} • {moment(payment.paymentDate).format("DD MMM YYYY")}
                                  </Typography>
                                  {payment.bankName && (
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                                      Bank: {payment.bankName}
                                    </Typography>
                                  )}
                                  {payment.transactionId && (
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                                      Txn: {payment.transactionId}
                                    </Typography>
                                  )}
                                  {payment.remark && (
                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block", fontStyle: "italic" }}>
                                      &ldquo;{payment.remark}&rdquo;
                                    </Typography>
                                  )}
                                </Box>

                                {/* Receipt Photo Indicator */}
                                {payment.receiptPhoto && payment.receiptPhoto.length > 0 && (
                                  <Box
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPreviewImage(payment.receiptPhoto[0]);
                                    }}
                                    sx={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: "6px",
                                      overflow: "hidden",
                                      border: "1px solid #e0e0e0",
                                      cursor: "pointer",
                                    }}>
                                    <img
                                      src={payment.receiptPhoto[0]}
                                      alt="Receipt"
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                    />
                                  </Box>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Card>
                  );
                  })}
                    </Box>
                  );
                })()}
              </>
            )}
          </>
        ) : activeTab === 1 ? (
          // Assigned Orders Tab
          <>
            {assignedOrdersLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : assignedOrders.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="textSecondary">
                  No orders assigned to you for dispatch
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 10 }}>
                {/* Info Banner */}
                <Box sx={{ p: 1.5, backgroundColor: "#e8f5e9", borderRadius: "8px", mb: 1 }}>
                  <Typography variant="caption" sx={{ color: "#2e7d32", fontWeight: 600 }}>
                    📋 These orders are assigned to you for dispatch. Select and dispatch when ready.
                  </Typography>
                </Box>
                
                {/* Selection Mode Header for Assigned Orders */}
                {selectionMode && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                      p: 1,
                      backgroundColor: "#e3f2fd",
                      borderRadius: "8px",
                    }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ color: "#1565c0" }}>
                      {selectedOrdersForDispatch.length} selected for dispatch
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button 
                        size="small" 
                        onClick={() => setSelectedOrdersForDispatch(assignedOrders.map(o => o._id))} 
                        sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                        Select All
                      </Button>
                      <Button size="small" onClick={clearAllSelections} sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                        Cancel
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<LocalShippingIcon sx={{ fontSize: "0.9rem" }} />}
                        onClick={openDispatchModal}
                        disabled={selectedOrdersForDispatch.length === 0}
                        sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                        Dispatch
                      </Button>
                    </Box>
                  </Box>
                )}

                {assignedOrders.map((order) => {
                  const isSelected = selectedOrdersForDispatch.includes(order._id);
                  return (
                    <Card
                      key={order._id}
                      sx={{
                        transition: "all 0.2s",
                        backgroundColor: isSelected ? "#e3f2fd" : "white",
                        borderRadius: "10px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                        overflow: "hidden",
                        border: isSelected ? "2px solid #1976d2" : "1px solid #e0e0e0",
                      }}>
                      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flex: 1 }}>
                            {/* Selection Checkbox */}
                            {selectionMode && (
                              <IconButton
                                size="small"
                                onClick={() => toggleOrderSelection(order._id)}
                                sx={{ p: 0, mt: 0.5 }}>
                                {isSelected ? (
                                  <CheckBoxIcon sx={{ color: "#1976d2", fontSize: "1.2rem" }} />
                                ) : (
                                  <CheckBoxOutlineBlankIcon sx={{ color: "#9e9e9e", fontSize: "1.2rem" }} />
                                )}
                              </IconButton>
                            )}
                            <Box>
                              <Typography
                                variant="subtitle2"
                                fontWeight="bold"
                                sx={{
                                  fontSize: "0.9rem",
                                  mb: 0.5,
                                  backgroundColor: "#fff3e0",
                                  color: "#e65100",
                                  px: 1,
                                  py: 0.25,
                                  borderRadius: "4px",
                                  display: "inline-block",
                                }}>
                                {order.orderNumber}
                              </Typography>
                              <Typography variant="body2" fontWeight="medium" sx={{ fontSize: "0.85rem" }}>
                                {order.customerName}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                                {order.customerVillage}, {order.customerTaluka}
                              </Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="body2" fontWeight="bold" sx={{ color: "#2e7d32", fontSize: "0.9rem" }}>
                              ₹{order.totalAmount?.toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem" }}>
                              Qty: {order.quantity}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Product Info */}
                        <Box sx={{ mb: 1, p: 1, backgroundColor: "#f5f5f5", borderRadius: "6px" }}>
                          <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#666" }}>
                            {order.productName || order.ramAgriCropName}
                          </Typography>
                        </Box>

                        {/* Assigned Info */}
                        <Box sx={{ mb: 1, p: 1, backgroundColor: "#e8f5e9", borderRadius: "6px" }}>
                          <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#2e7d32" }}>
                            Assigned by: {order.assignedBy?.name || "Admin"} • {order.assignedAt ? moment(order.assignedAt).format("DD MMM, hh:mm A") : ""}
                          </Typography>
                          {order.assignmentNotes && (
                            <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#666", display: "block", mt: 0.5 }}>
                              Note: {order.assignmentNotes}
                            </Typography>
                          )}
                        </Box>

                        {/* Action Buttons */}
                        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                          {!selectionMode && (
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<LocalShippingIcon sx={{ fontSize: "0.9rem" }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectionMode(true);
                                setSelectedOrdersForDispatch([order._id]);
                              }}
                              sx={{
                                flex: 1,
                                fontSize: "0.7rem",
                                textTransform: "none",
                                py: 0.5,
                                backgroundColor: "#1565c0",
                                "&:hover": { backgroundColor: "#0d47a1" },
                              }}>
                              Dispatch
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PaymentIcon sx={{ fontSize: "0.9rem" }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOrderClick(order);
                            }}
                            sx={{
                              flex: 1,
                              fontSize: "0.7rem",
                              textTransform: "none",
                              py: 0.5,
                              borderColor: "#4caf50",
                              color: "#4caf50",
                            }}>
                            Payment
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </>
        ) : activeTab === 2 ? (
          // Outstanding Tab
          <>
            {renderOutstandingView()}
          </>
        ) : activeTab === 3 ? (
          // Farmer Outstanding Tab
          <>
            {renderFarmerOutstandingView()}
          </>
        ) : activeTab === 4 ? (
          // Rankboard Tab
          <>
            {rankboardLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : rankboardEntries.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="textSecondary">
                  No rankboard data available
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 10 }}>
                {/* Info Banner */}
                <Box sx={{ p: 1.5, backgroundColor: "#e8f5e9", borderRadius: "8px", mb: 1 }}>
                  <Typography variant="caption" sx={{ color: "#2e7d32", fontWeight: 600 }}>
                    📊 Rankboard based on performance metrics
                  </Typography>
                </Box>
                {rankboardEntries.map((entry, index) => {
                  const achievementPercent = entry.targetAchievement || 0;
                  return (
                    <Card
                      key={entry._id || index}
                      sx={{
                        borderRadius: "10px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                        overflow: "hidden",
                      }}>
                      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.75 }}>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: "0.9rem" }}>
                              {entry.name || "Unknown"}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                              Rank #{index + 1}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="h6" fontWeight="bold" color="primary" sx={{ fontSize: "1rem" }}>
                              {entry.scores?.recommendedScore?.toFixed(1) || 0}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem" }}>
                              Score
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                          <Chip
                            size="small"
                            label={`₹${Number(entry.revenue || 0).toLocaleString()}`}
                            sx={{ backgroundColor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }}
                          />
                          <Chip
                            size="small"
                            label={`Qty ${Number(entry.quantity || 0).toLocaleString()}`}
                            sx={{ backgroundColor: "#e3f2fd", color: "#1565c0", fontWeight: 600 }}
                          />
                          <Chip
                            size="small"
                            label={`Customers ${entry.uniqueCustomers || 0}`}
                            sx={{ backgroundColor: "#fff3e0", color: "#ef6c00", fontWeight: 600 }}
                          />
                          <Chip
                            size="small"
                            label={`Target ${Number(entry.targetAchievement || 0).toFixed(1)}%`}
                            sx={{ backgroundColor: "#ede7f6", color: "#5e35b1", fontWeight: 600 }}
                          />
                        </Box>

                        <Box sx={{ mt: 1.2 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="caption" color="textSecondary">
                              Target Progress
                            </Typography>
                            <Typography variant="caption" fontWeight={600} color="#0f766e">
                              {achievementPercent.toFixed(1)}%
                            </Typography>
                          </Box>
                          <Box sx={{ height: 6, backgroundColor: "#e5e7eb", borderRadius: 999 }}>
                            <Box
                              sx={{
                                height: "100%",
                                width: `${achievementPercent}%`,
                                borderRadius: 999,
                                background: "linear-gradient(90deg, #14b8a6 0%, #0f766e 100%)",
                              }}
                            />
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </>
        ) : activeTab === 5 ? (
          // Targets Tab
          <>
            {targetsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : salesTargets.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  No targets set for this period
                </Typography>
                <Box sx={{ mt: 2, display: "flex", gap: 1, justifyContent: "center" }}>
                  <TextField
                    type="date"
                    label="Start Date"
                    value={targetDateRange.startDate}
                    onChange={(e) => setTargetDateRange({ ...targetDateRange, startDate: e.target.value })}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: "45%" }}
                  />
                  <TextField
                    type="date"
                    label="End Date"
                    value={targetDateRange.endDate}
                    onChange={(e) => setTargetDateRange({ ...targetDateRange, endDate: e.target.value })}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: "45%" }}
                  />
                </Box>
                <Button
                  variant="contained"
                  onClick={fetchSalesTargets}
                  sx={{ mt: 2, textTransform: "none" }}>
                  Refresh
                </Button>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pb: 10, px: 1.5 }}>
                {/* Date Range Selector */}
                <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                  <TextField
                    type="date"
                    label="Start Date"
                    value={targetDateRange.startDate}
                    onChange={(e) => {
                      setTargetDateRange({ ...targetDateRange, startDate: e.target.value });
                      setTimeout(() => fetchSalesTargets(), 100);
                    }}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, minWidth: "140px" }}
                  />
                  <TextField
                    type="date"
                    label="End Date"
                    value={targetDateRange.endDate}
                    onChange={(e) => {
                      setTargetDateRange({ ...targetDateRange, endDate: e.target.value });
                      setTimeout(() => fetchSalesTargets(), 100);
                    }}
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, minWidth: "140px" }}
                  />
                </Box>

                {/* Targets List with Progress Bars */}
                {salesTargets.map((target, index) => {
                  // Use achieved amounts from API
                  const targetAmount = target.targetAmount || 0;
                  const achievedAmount = target.achievedAmount || 0;
                  const progressPercent = target.progressPercent || (targetAmount > 0 ? Math.min((achievedAmount / targetAmount) * 100, 100) : 0);
                  const remainingAmount = target.remainingAmount || Math.max(0, targetAmount - achievedAmount);
                  const orderCount = target.orderCount || 0;
                  const achievedProducts = target.achievedProducts || [];
                  const achievedOrders = target.achievedOrders || [];
                  
                  return (
                    <Card
                      key={target._id || index}
                      sx={{
                        borderRadius: "10px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                        overflow: "hidden",
                        mb: 1.5,
                      }}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: "0.9rem", mb: 0.5 }}>
                              {target.cropId?.cropName || "Unknown Crop"}
                            </Typography>
                            {achievedProducts.length > 0 && (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 0.5 }}>
                                {achievedProducts.map((product, idx) => (
                                  <Chip
                                    key={idx}
                                    label={product}
                                    size="small"
                                    sx={{
                                      fontSize: "0.65rem",
                                      height: "20px",
                                      backgroundColor: "#e3f2fd",
                                      color: "#1565c0",
                                      fontWeight: 500,
                                    }}
                                  />
                                ))}
                              </Box>
                            )}
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                              {moment(target.startDate).format("MMM DD")} - {moment(target.endDate).format("MMM DD, YYYY")}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="h6" fontWeight="bold" color="primary" sx={{ fontSize: "1rem" }}>
                              ₹{Number(targetAmount).toLocaleString()}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem" }}>
                              Target
                            </Typography>
                          </Box>
                        </Box>

                        {/* Progress Bar */}
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                              Progress
                            </Typography>
                            <Typography variant="caption" fontWeight={600} color={progressPercent >= 100 ? "#2e7d32" : progressPercent >= 50 ? "#f57c00" : "#d32f2f"} sx={{ fontSize: "0.7rem" }}>
                              {progressPercent.toFixed(1)}%
                            </Typography>
                          </Box>
                          <Box sx={{ height: 10, backgroundColor: "#e5e7eb", borderRadius: 999, overflow: "hidden" }}>
                            <Box
                              sx={{
                                height: "100%",
                                width: `${progressPercent}%`,
                                borderRadius: 999,
                                background: progressPercent >= 100 
                                  ? "linear-gradient(90deg, #4caf50 0%, #2e7d32 100%)"
                                  : progressPercent >= 50
                                  ? "linear-gradient(90deg, #ff9800 0%, #f57c00 100%)"
                                  : "linear-gradient(90deg, #f44336 0%, #d32f2f 100%)",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.75 }}>
                            <Box>
                              <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                                Achieved: ₹{Number(achievedAmount).toLocaleString()}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                                Remaining: ₹{Number(remainingAmount).toLocaleString()}
                              </Typography>
                            </Box>
                            {orderCount > 0 && (
                              <Box sx={{ textAlign: "right" }}>
                                <Typography variant="caption" fontWeight={600} color="primary" sx={{ fontSize: "0.7rem", display: "block" }}>
                                  {orderCount} Order{orderCount > 1 ? "s" : ""}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>

                        {/* Achieved Orders List */}
                        {achievedOrders.length > 0 && (
                          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid #e5e7eb" }}>
                            <Button
                              size="small"
                              onClick={() => setExpandedTargetId(expandedTargetId === target._id ? null : target._id)}
                              endIcon={expandedTargetId === target._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                              sx={{ textTransform: "none", fontSize: "0.75rem", p: 0, minWidth: "auto" }}>
                              View {achievedOrders.length} Order{achievedOrders.length > 1 ? "s" : ""}
                            </Button>
                            {expandedTargetId === target._id && (
                              <Box sx={{ mt: 1 }}>
                                {achievedOrders.map((order, orderIdx) => (
                                  <Card
                                    key={orderIdx}
                                    sx={{
                                      mb: 1,
                                      backgroundColor: "#fafafa",
                                      borderRadius: "8px",
                                      boxShadow: "none",
                                      border: "1px solid #e0e0e0",
                                    }}>
                                    <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                                        <Box sx={{ flex: 1 }}>
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                            <Typography variant="body2" fontWeight="bold" sx={{ fontSize: "0.8rem" }}>
                                              {order.productName || order.ramAgriCropName || "Product"}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem" }}>
                                              {order.orderNumber}
                                            </Typography>
                                          </Box>
                                          <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.65rem", display: "block", mt: 0.25 }}>
                                            {moment(order.orderDate).format("MMM DD, YYYY")}
                                          </Typography>
                                        </Box>
                                        <Chip
                                          label={order.orderStatus}
                                          size="small"
                                          sx={{
                                            fontSize: "0.6rem",
                                            height: "18px",
                                            backgroundColor: order.orderStatus === "COMPLETED" ? "#e8f5e9" : order.orderStatus === "DISPATCHED" ? "#e3f2fd" : "#fff3e0",
                                            color: order.orderStatus === "COMPLETED" ? "#2e7d32" : order.orderStatus === "DISPATCHED" ? "#1565c0" : "#f57c00",
                                            fontWeight: 600,
                                          }}
                                        />
                                      </Box>
                                      <Box sx={{ display: "flex", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
                                        <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                                          Qty: <strong>{order.quantity}</strong>
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                                          Rate: ₹<strong>{Number(order.rate || 0).toLocaleString()}</strong>
                                        </Typography>
                                        <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.75rem", color: "#2e7d32" }}>
                                          Amount: ₹{Number(order.totalAmount || 0).toLocaleString()}
                                        </Typography>
                                      </Box>
                                    </CardContent>
                                  </Card>
                                ))}
                              </Box>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </>
        ) : null}
      </Box>

      {/* FAB Button for Add Order (only on Orders tab) */}
      {activeTab === 0 && (
        <Fab
          color="primary"
          aria-label="add order"
          onClick={() => setShowForm(true)}
          sx={{
            position: "fixed",
            bottom: 80,
            right: 16,
            zIndex: 1000,
          }}>
          <AddIcon />
        </Fab>
      )}

      {/* FAB Button for Dispatch (on Assigned tab when orders selected) */}
      {activeTab === 1 && selectedOrdersForDispatch.length > 0 && (
        <Fab
          color="primary"
          aria-label="dispatch"
          onClick={openDispatchModal}
          sx={{
            position: "fixed",
            bottom: 80,
            right: 16,
            zIndex: 1000,
            backgroundColor: "#1565c0",
          }}>
          <LocalShippingIcon />
        </Fab>
      )}

      {/* Add Order Form Dialog */}
      <Dialog
        open={showForm}
        onClose={handleClose}
        maxWidth="sm"
        PaperProps={{
          sx: {
            margin: 1,
            maxHeight: "calc(100% - 16px)",
            borderRadius: "12px",
            width: "100%",
            maxWidth: "600px",
          },
        }}>
        <DialogTitle
          component="div"
          sx={{
            background: "linear-gradient(135deg, #43a047 0%, #2e7d32 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1.5,
          }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
            Add New Order
          </Typography>
          <IconButton onClick={handleClose} sx={{ color: "white", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <AddAgriSalesOrderForm
            open={showForm}
            onClose={handleClose}
            onSuccess={handleSuccess}
            isStandalone={true}
          />
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog
        open={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setSelectedOrder(null);
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            margin: 1,
            maxHeight: "calc(100% - 16px)",
            borderRadius: "12px",
          },
        }}>
        <DialogTitle
          component="div"
          sx={{
            background: "linear-gradient(135deg, #43a047 0%, #2e7d32 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1.5,
          }}>
          <Box>
            <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
              Add Payment
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", opacity: 0.9 }}>
              {selectedOrder?.orderNumber}
            </Typography>
          </Box>
          <IconButton
            onClick={() => {
              setShowPaymentModal(false);
              setSelectedOrder(null);
            }}
            sx={{ color: "white", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          {selectedOrder && (
            <Box sx={{ mb: 2, p: 2, backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                    Customer
                  </Typography>
                  <Typography variant="body2" fontWeight="medium" sx={{ fontSize: "0.9rem" }}>
                    {selectedOrder.customerName}
                  </Typography>
                </Box>
                {selectedOrder.activityLog && selectedOrder.activityLog.length > 0 && (
                  <Button
                    size="small"
                    startIcon={<HistoryIcon sx={{ fontSize: "0.9rem" }} />}
                    onClick={() => setShowActivityLog(!showActivityLog)}
                    sx={{
                      fontSize: "0.7rem",
                      textTransform: "none",
                      color: showActivityLog ? "#1976d2" : "#666",
                      minWidth: "auto",
                      p: 0.5,
                    }}>
                    {showActivityLog ? "Hide" : "History"} ({selectedOrder.activityLog.length})
                  </Button>
                )}
              </Box>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                    Total Amount
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: "0.9rem" }}>
                    ₹{selectedOrder.totalAmount?.toLocaleString()}
                  </Typography>
                  {/* Show final quantity calculation for completed orders */}
                  {selectedOrder.orderStatus === "COMPLETED" && selectedOrder.deliveredQuantity > 0 && selectedOrder.deliveredQuantity !== selectedOrder.quantity && (
                    <Typography variant="caption" sx={{ fontSize: "0.65rem", color: "#0f766e", display: "block", mt: 0.25 }}>
                      (Final: {selectedOrder.deliveredQuantity} × ₹{selectedOrder.rate})
                    </Typography>
                  )}
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                    Balance
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: "0.9rem", color: "#f57c00" }}>
                    ₹{selectedOrder.balanceAmount?.toLocaleString() || 0}
                  </Typography>
                </Grid>
              </Grid>

              {/* Activity Log Section */}
              {showActivityLog && selectedOrder.activityLog && selectedOrder.activityLog.length > 0 && (
                <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #e0e0e0" }}>
                  <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.75rem", color: "#666", mb: 1, display: "block" }}>
                    ORDER HISTORY
                  </Typography>
                  <Box sx={{ maxHeight: "200px", overflowY: "auto" }}>
                    {[...selectedOrder.activityLog].reverse().map((activity, idx) => {
                      const { icon, color, bg } = getActivityIconAndColor(activity.action);
                      return (
                        <Box
                          key={idx}
                          sx={{
                            display: "flex",
                            gap: 1,
                            mb: 1,
                            p: 1,
                            backgroundColor: bg,
                            borderRadius: "6px",
                            borderLeft: `3px solid ${color}`,
                          }}>
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              backgroundColor: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: color,
                              flexShrink: 0,
                            }}>
                            {icon}
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="caption" sx={{ fontSize: "0.7rem", fontWeight: 600, color: color, display: "block" }}>
                              {activity.action.replace(/_/g, " ")}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#333", display: "block" }}>
                              {activity.description}
                            </Typography>
                            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#999" }}>
                              {activity.performedByName || "System"} • {moment(activity.createdAt).format("DD MMM, hh:mm A")}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Payment Amount (₹)"
              type="number"
              value={paymentForm.paidAmount}
              onChange={(e) => handlePaymentInputChange("paidAmount", e.target.value)}
              size="small"
              required
            />

            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              value={paymentForm.paymentDate}
              onChange={(e) => handlePaymentInputChange("paymentDate", e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
              required
            />

            <FormControl fullWidth size="small" required>
              <InputLabel>Payment Mode</InputLabel>
              <Select
                value={paymentForm.modeOfPayment}
                onChange={(e) => handlePaymentInputChange("modeOfPayment", e.target.value)}
                label="Payment Mode">
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="Cheque">Cheque</MenuItem>
                <MenuItem value="NEFT/RTGS">NEFT/RTGS</MenuItem>
                <MenuItem value="1341">1341</MenuItem>
                <MenuItem value="434">434</MenuItem>
                <MenuItem value="Wallet">Wallet</MenuItem>
              </Select>
            </FormControl>

            {(paymentForm.modeOfPayment === "Cheque" || paymentForm.modeOfPayment === "NEFT/RTGS") && (
              <TextField
                fullWidth
                label="Bank Name"
                value={paymentForm.bankName}
                onChange={(e) => handlePaymentInputChange("bankName", e.target.value)}
                size="small"
              />
            )}

            {/* Dynamic Transaction ID field based on payment mode */}
            {paymentForm.modeOfPayment && paymentForm.modeOfPayment !== "Cash" && (
              <TextField
                fullWidth
                label={
                  paymentForm.modeOfPayment === "UPI"
                    ? "UTR/Transaction ID"
                    : paymentForm.modeOfPayment === "Cheque"
                    ? "Cheque Number"
                    : "Transaction ID"
                }
                value={paymentForm.transactionId}
                onChange={(e) => handlePaymentInputChange("transactionId", e.target.value)}
                size="small"
                placeholder={
                  paymentForm.modeOfPayment === "UPI"
                    ? "Enter UTR/Transaction ID"
                    : paymentForm.modeOfPayment === "Cheque"
                    ? "Enter cheque number"
                    : "Enter transaction ID"
                }
              />
            )}

            {paymentForm.modeOfPayment &&
              paymentForm.modeOfPayment !== "Cash" &&
              paymentForm.modeOfPayment !== "NEFT/RTGS" && (
                <Box>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: "0.85rem", color: "#d32f2f" }}>
                    Payment Receipt Photo * (Required for {paymentForm.modeOfPayment})
                  </Typography>
                  <input type="file" accept="image/*" multiple onChange={handleImageUpload} style={{ width: "100%" }} />
                  {uploadingImages && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                      <CircularProgress size={16} />
                      <Typography variant="caption" color="textSecondary">
                        Uploading...
                      </Typography>
                    </Box>
                  )}
                  {paymentForm.receiptPhoto.length > 0 && (
                    <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                      {paymentForm.receiptPhoto.map((url, index) => {
                        const ocrResult = ocrResults[index];
                        const isProcessing = ocrProcessing[index];
                        return (
                          <Box key={index} sx={{ position: "relative" }}>
                            <Box sx={{ position: "relative", cursor: "pointer" }}>
                              <Box
                                onClick={() => setPreviewImage(url)}
                                sx={{
                                  position: "relative",
                                  width: 60,
                                  height: 60,
                                  borderRadius: 1,
                                  overflow: "hidden",
                                  border: "1px solid #e0e0e0",
                                  "&:hover": {
                                    borderColor: "primary.main",
                                    "& .zoom-overlay": {
                                      opacity: 1,
                                    },
                                  },
                                }}
                              >
                                <img
                                  src={url}
                                  alt={`Receipt ${index + 1}`}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                                <Box
                                  className="zoom-overlay"
                                  sx={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: "rgba(0,0,0,0.3)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: 0,
                                    transition: "opacity 0.2s",
                                  }}
                                >
                                  <ZoomInIcon sx={{ color: "white", fontSize: 20 }} />
                                </Box>
                                {isProcessing && (
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      backgroundColor: "rgba(0,0,0,0.5)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <CircularProgress size={20} sx={{ color: "white" }} />
                                  </Box>
                                )}
                              </Box>
                              
                              {/* OCR Button - Hidden */}
                              {/* <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  processImageWithOCR(url, index);
                                }}
                                disabled={isProcessing}
                                sx={{
                                  position: "absolute",
                                  bottom: -8,
                                  left: -8,
                                  bgcolor: ocrResult ? "success.main" : "primary.main",
                                  color: "white",
                                  width: 24,
                                  height: 24,
                                  "&:hover": {
                                    bgcolor: ocrResult ? "success.dark" : "primary.dark",
                                  },
                                  "&:disabled": {
                                    bgcolor: "grey.400",
                                  },
                                }}
                                title={ocrResult ? "OCR Completed - Click to re-process" : "Extract data from image (OCR)"}
                              >
                                <TextFieldsIcon fontSize="small" />
                              </IconButton> */}

                              {/* Delete Button */}
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = paymentForm.receiptPhoto.filter((_, i) => i !== index);
                                  handlePaymentInputChange("receiptPhoto", updated);
                                  // Also remove OCR results
                                  setOcrResults((prev) => {
                                    const newResults = { ...prev };
                                    delete newResults[index];
                                    return newResults;
                                  });
                                }}
                                sx={{
                                  position: "absolute",
                                  top: -8,
                                  right: -8,
                                  bgcolor: "error.main",
                                  color: "white",
                                  width: 24,
                                  height: 24,
                                  "&:hover": {
                                    bgcolor: "error.dark",
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
              )}

            <TextField
              fullWidth
              label="Remark (Optional)"
              value={paymentForm.remark}
              onChange={(e) => handlePaymentInputChange("remark", e.target.value)}
              size="small"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button onClick={() => {
            setShowPaymentModal(false);
            setSelectedOrder(null);
          }} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleAddPayment}
            variant="contained"
            disabled={!paymentForm.paidAmount || !paymentForm.modeOfPayment || uploadingImages}
            sx={{ textTransform: "none", backgroundColor: "#43a047", "&:hover": { backgroundColor: "#388e3c" } }}>
            Add Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <Dialog
          open={!!previewImage}
          onClose={() => setPreviewImage(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}>
          <Box sx={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", p: 2 }}>
            <IconButton
              onClick={() => setPreviewImage(null)}
              sx={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: "rgba(0,0,0,0.5)",
                color: "white",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.7)" },
              }}>
              <CloseIcon />
            </IconButton>
            <img
              src={previewImage}
              alt="Preview"
              style={{
                maxWidth: "100%",
                maxHeight: "80vh",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
            />
          </Box>
        </Dialog>
      )}

      {/* Dispatch Modal */}
      <Dialog
        open={showDispatchModal}
        onClose={() => {
          setShowDispatchModal(false);
          setDispatchForm({
            dispatchMode: "VEHICLE",
            vehicleId: "",
            vehicleNumber: "",
            driverName: "",
            driverMobile: "",
            courierName: "",
            courierTrackingId: "",
            courierContact: "",
            dispatchNotes: "",
          });
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            margin: 1,
            maxHeight: "calc(100% - 16px)",
            borderRadius: "12px",
          },
        }}>
        <DialogTitle
          component="div"
          sx={{
            background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1.5,
          }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
            Dispatch Orders ({selectedOrdersForDispatch.length})
          </Typography>
          <IconButton
            onClick={() => {
              setShowDispatchModal(false);
              setDispatchForm({
                dispatchMode: "VEHICLE",
                vehicleId: "",
                vehicleNumber: "",
                driverName: "",
                driverMobile: "",
                courierName: "",
                courierTrackingId: "",
                courierContact: "",
                dispatchNotes: "",
              });
            }}
            sx={{ color: "white", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Dispatch Mode</InputLabel>
              <Select
                value={dispatchForm.dispatchMode}
                onChange={(e) => {
                  setDispatchForm({ ...dispatchForm, dispatchMode: e.target.value });
                }}
                label="Dispatch Mode">
                <MenuItem value="VEHICLE">Vehicle</MenuItem>
                <MenuItem value="COURIER">Courier</MenuItem>
              </Select>
            </FormControl>

            {dispatchForm.dispatchMode === "VEHICLE" ? (
              <>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Vehicle</InputLabel>
                  <Select
                    value={dispatchForm.vehicleId}
                    onChange={(e) => {
                      const vehicle = vehicles.find((v) => v._id === e.target.value);
                      setDispatchForm({
                        ...dispatchForm,
                        vehicleId: e.target.value,
                        vehicleNumber: vehicle?.vehicleNumber || "",
                        driverName: vehicle?.driverName || "",
                        driverMobile: vehicle?.driverMobile || "",
                      });
                    }}
                    label="Vehicle">
                    {vehicles.map((vehicle) => (
                      <MenuItem key={vehicle._id} value={vehicle._id}>
                        {vehicle.vehicleNumber} - {vehicle.driverName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Driver Name"
                  value={dispatchForm.driverName}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, driverName: e.target.value })}
                  size="small"
                  required
                />

                <TextField
                  fullWidth
                  label="Driver Mobile"
                  value={dispatchForm.driverMobile}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, driverMobile: e.target.value })}
                  size="small"
                  required
                  type="tel"
                />
              </>
            ) : (
              <>
                <TextField
                  fullWidth
                  label="Courier Name"
                  value={dispatchForm.courierName}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, courierName: e.target.value })}
                  size="small"
                  required
                />

                <TextField
                  fullWidth
                  label="Tracking ID"
                  value={dispatchForm.courierTrackingId}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, courierTrackingId: e.target.value })}
                  size="small"
                />

                <TextField
                  fullWidth
                  label="Courier Contact"
                  value={dispatchForm.courierContact}
                  onChange={(e) => setDispatchForm({ ...dispatchForm, courierContact: e.target.value })}
                  size="small"
                  type="tel"
                />
              </>
            )}

            <TextField
              fullWidth
              label="Dispatch Notes (Optional)"
              value={dispatchForm.dispatchNotes}
              onChange={(e) => setDispatchForm({ ...dispatchForm, dispatchNotes: e.target.value })}
              size="small"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => {
              setShowDispatchModal(false);
              setDispatchForm({
                dispatchMode: "VEHICLE",
                vehicleId: "",
                vehicleNumber: "",
                driverName: "",
                driverMobile: "",
                courierName: "",
                courierTrackingId: "",
                courierContact: "",
                dispatchNotes: "",
              });
            }}
            sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleDispatch}
            variant="contained"
            disabled={dispatchLoading}
            sx={{ textTransform: "none", backgroundColor: "#1565c0", "&:hover": { backgroundColor: "#0d47a1" } }}>
            {dispatchLoading ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Dispatch"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Complete Orders Modal */}
      <Dialog
        open={showCompleteModal}
        onClose={() => {
          setShowCompleteModal(false);
          setCompleteForm({
            returnQuantities: {},
            returnReason: "",
            returnNotes: "",
          });
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            margin: 1,
            maxHeight: "calc(100% - 16px)",
            borderRadius: "12px",
          },
        }}>
        <DialogTitle
          component="div"
          sx={{
            background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1.5,
          }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
            Complete Orders ({selectedOrdersForComplete.length})
          </Typography>
          <IconButton
            onClick={() => {
              setShowCompleteModal(false);
              setCompleteForm({
                returnQuantities: {},
                returnReason: "",
                returnNotes: "",
              });
            }}
            sx={{ color: "white", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body2" sx={{ fontSize: "0.85rem", color: "#666" }}>
              Enter return quantities for orders that have partial returns. Leave as 0 for orders delivered completely.
            </Typography>

            <Box sx={{ maxHeight: "300px", overflowY: "auto" }}>
              {(activeTab === 2 ? dispatchedOrders : orders)
                .filter((o) => selectedOrdersForComplete.includes(o._id))
                .map((order) => (
                  <Box key={order._id} sx={{ mb: 2, p: 1.5, backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: "0.85rem", mb: 1 }}>
                      {order.orderNumber} - {order.customerName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem", display: "block", mb: 1 }}>
                      Original Qty: {order.quantity} • Delivered: {order.deliveredQuantity || order.quantity}
                    </Typography>
                    <TextField
                      fullWidth
                      label="Return Quantity"
                      type="number"
                      value={completeForm.returnQuantities[order._id] || 0}
                      onChange={(e) => {
                        setCompleteForm({
                          ...completeForm,
                          returnQuantities: {
                            ...completeForm.returnQuantities,
                            [order._id]: parseInt(e.target.value) || 0,
                          },
                        });
                      }}
                      size="small"
                      inputProps={{ min: 0, max: order.quantity }}
                    />
                  </Box>
                ))}
            </Box>

            <TextField
              fullWidth
              label="Return Reason (Optional)"
              value={completeForm.returnReason}
              onChange={(e) => setCompleteForm({ ...completeForm, returnReason: e.target.value })}
              size="small"
            />

            <TextField
              fullWidth
              label="Return Notes (Optional)"
              value={completeForm.returnNotes}
              onChange={(e) => setCompleteForm({ ...completeForm, returnNotes: e.target.value })}
              size="small"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => {
              setShowCompleteModal(false);
              setCompleteForm({
                returnQuantities: {},
                returnReason: "",
                returnNotes: "",
              });
            }}
            sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleCompleteOrders}
            variant="contained"
            disabled={completeLoading}
            color="success"
            sx={{ textTransform: "none", backgroundColor: "#2e7d32", "&:hover": { backgroundColor: "#1b5e20" } }}>
            {completeLoading ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Complete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sales Return Modal */}
      <Dialog
        open={showSalesReturnModal}
        onClose={() => {
          setShowSalesReturnModal(false);
          setSelectedOrderForSalesReturn(null);
          setSalesReturnForm({
            returnQuantity: 0,
            returnReason: "",
            returnNotes: "",
            paymentAdjustments: [],
          });
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            margin: 1,
            maxHeight: "calc(100% - 16px)",
            borderRadius: "12px",
          },
        }}>
        <DialogTitle
          component="div"
          sx={{
            background: "linear-gradient(135deg, #f57c00 0%, #e65100 100%)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 1.5,
          }}>
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
            Sales Return - {selectedOrderForSalesReturn?.orderNumber}
          </Typography>
          <IconButton
            onClick={() => {
              setShowSalesReturnModal(false);
              setSelectedOrderForSalesReturn(null);
              setSalesReturnForm({
                returnQuantity: 0,
                returnReason: "",
                returnNotes: "",
                paymentAdjustments: [],
              });
            }}
            sx={{ color: "white", p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2 }}>
          {selectedOrderForSalesReturn && (
            <Box sx={{ mb: 2, p: 1.5, backgroundColor: "#fff3e0", borderRadius: "8px" }}>
              <Typography variant="body2" fontWeight="bold" sx={{ fontSize: "0.85rem", mb: 0.5 }}>
                {selectedOrderForSalesReturn.customerName}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                Original Qty: {selectedOrderForSalesReturn.quantity} • Delivered: {selectedOrderForSalesReturn.deliveredQuantity || selectedOrderForSalesReturn.quantity}
              </Typography>
            </Box>
          )}

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              fullWidth
              label="Return Quantity"
              type="number"
              value={salesReturnForm.returnQuantity}
              onChange={(e) => setSalesReturnForm({ ...salesReturnForm, returnQuantity: parseInt(e.target.value) || 0 })}
              size="small"
              required
              inputProps={{
                min: 0,
                max: selectedOrderForSalesReturn?.deliveredQuantity || selectedOrderForSalesReturn?.quantity || 0,
              }}
            />

            <TextField
              fullWidth
              label="Return Reason"
              value={salesReturnForm.returnReason}
              onChange={(e) => setSalesReturnForm({ ...salesReturnForm, returnReason: e.target.value })}
              size="small"
              required
            />

            <TextField
              fullWidth
              label="Return Notes (Optional)"
              value={salesReturnForm.returnNotes}
              onChange={(e) => setSalesReturnForm({ ...salesReturnForm, returnNotes: e.target.value })}
              size="small"
              multiline
              rows={2}
            />

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontSize: "0.85rem", fontWeight: 600 }}>
                Payment Adjustments (Optional)
              </Typography>
              {salesReturnForm.paymentAdjustments.map((adjustment, index) => (
                <Box key={index} sx={{ mb: 1, p: 1, backgroundColor: "#f5f5f5", borderRadius: "6px" }}>
                  <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
                    <TextField
                      fullWidth
                      label="Amount"
                      type="number"
                      value={adjustment.amount}
                      onChange={(e) => {
                        const updated = [...salesReturnForm.paymentAdjustments];
                        updated[index].amount = parseFloat(e.target.value) || 0;
                        setSalesReturnForm({ ...salesReturnForm, paymentAdjustments: updated });
                      }}
                      size="small"
                    />
                    <FormControl fullWidth size="small">
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={adjustment.adjustmentType}
                        onChange={(e) => {
                          const updated = [...salesReturnForm.paymentAdjustments];
                          updated[index].adjustmentType = e.target.value;
                          setSalesReturnForm({ ...salesReturnForm, paymentAdjustments: updated });
                        }}
                        label="Type">
                        <MenuItem value="REFUND">Refund</MenuItem>
                        <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  <TextField
                    fullWidth
                    label="Reason"
                    value={adjustment.reason}
                    onChange={(e) => {
                      const updated = [...salesReturnForm.paymentAdjustments];
                      updated[index].reason = e.target.value;
                      setSalesReturnForm({ ...salesReturnForm, paymentAdjustments: updated });
                    }}
                    size="small"
                    sx={{ mb: 1 }}
                  />
                  <Button
                    size="small"
                    onClick={() => {
                      const updated = salesReturnForm.paymentAdjustments.filter((_, i) => i !== index);
                      setSalesReturnForm({ ...salesReturnForm, paymentAdjustments: updated });
                    }}
                    sx={{ fontSize: "0.7rem", textTransform: "none", color: "#f44336" }}>
                    Remove
                  </Button>
                </Box>
              ))}
              <Button
                size="small"
                onClick={() => {
                  setSalesReturnForm({
                    ...salesReturnForm,
                    paymentAdjustments: [
                      ...salesReturnForm.paymentAdjustments,
                      { amount: 0, adjustmentType: "REFUND", reason: "", notes: "" },
                    ],
                  });
                }}
                sx={{ fontSize: "0.7rem", textTransform: "none" }}>
                + Add Payment Adjustment
              </Button>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => {
              setShowSalesReturnModal(false);
              setSelectedOrderForSalesReturn(null);
              setSalesReturnForm({
                returnQuantity: 0,
                returnReason: "",
                returnNotes: "",
                paymentAdjustments: [],
              });
            }}
            sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            onClick={handleSalesReturn}
            variant="contained"
            disabled={salesReturnLoading}
            sx={{ textTransform: "none", backgroundColor: "#f57c00", "&:hover": { backgroundColor: "#e65100" } }}>
            {salesReturnLoading ? <CircularProgress size={20} sx={{ color: "white" }} /> : "Process Return"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Activity Log Modal */}
      {selectedOrder && (
        <Dialog
          open={showActivityLog}
          onClose={() => setShowActivityLog(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              margin: 1,
              maxHeight: "calc(100% - 16px)",
              borderRadius: "12px",
            },
          }}>
          <DialogTitle
            component="div"
            sx={{
              background: "linear-gradient(135deg, #607d8b 0%, #455a64 100%)",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 1.5,
            }}>
            <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 600 }}>
              Activity Log - {selectedOrder.orderNumber}
            </Typography>
            <IconButton onClick={() => setShowActivityLog(false)} sx={{ color: "white", p: 0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent sx={{ p: 2 }}>
            {selectedOrder.activityLog && selectedOrder.activityLog.length > 0 ? (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[...selectedOrder.activityLog].reverse().map((activity, idx) => {
                  const { icon, color, bg } = getActivityIconAndColor(activity.action);
                  return (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        gap: 1,
                        p: 1.5,
                        backgroundColor: bg,
                        borderRadius: "8px",
                        borderLeft: `3px solid ${color}`,
                      }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          backgroundColor: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: color,
                          flexShrink: 0,
                        }}>
                        {icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontSize: "0.8rem", fontWeight: 600, color: color, mb: 0.5 }}>
                          {activity.action.replace(/_/g, " ")}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "#333", mb: 0.5 }}>
                          {activity.description}
                        </Typography>
                        <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "#666" }}>
                          {activity.performedByName || "System"} • {moment(activity.createdAt).format("DD MMM YYYY, hh:mm A")}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ textAlign: "center", py: 4 }}>
                No activity log available
              </Typography>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default AgriSalesOrderMobile;
