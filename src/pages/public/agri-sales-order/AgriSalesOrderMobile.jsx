import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/icons-material";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import AddAgriSalesOrderForm from "../../private/inventory/AddAgriSalesOrderForm";
import { Toast } from "helpers/toasts/toastHelper";
import { useIsLoggedIn } from "hooks/state";
import { API, NetworkManager } from "network/core";
import moment from "moment";

/**
 * Mobile-Only Agri Sales Order Page
 * Shows employee's orders with filters and payment management
 */
const AgriSalesOrderMobile = () => {
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();
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
  const [activeTab, setActiveTab] = useState(0); // 0: Orders, 1: Outstanding
  const [outstandingData, setOutstandingData] = useState(null);
  const [outstandingLoading, setOutstandingLoading] = useState(false);
  const [outstandingView, setOutstandingView] = useState("total"); // total, district, taluka, village
  const [filteredFromOutstanding, setFilteredFromOutstanding] = useState(false); // Track if orders are filtered from outstanding

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

  useEffect(() => {
    if (isLoggedIn) {
      if (activeTab === 0) {
        // Only fetch all orders if not filtered from outstanding (to preserve filtered orders)
        if (!filteredFromOutstanding) {
          fetchOrders();
        }
      } else if (activeTab === 1) {
        fetchOutstandingAnalysis();
        setOutstandingView("total");
        setFilteredFromOutstanding(false); // Reset when switching to outstanding tab
      }
    }
  }, [isLoggedIn, debouncedSearchTerm, selectedDateRange, activeTab]);

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
    } else {
      fetchOutstandingAnalysis();
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
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
      Toast.success("Images uploaded successfully. Processing with OCR...");

      // Automatically process each uploaded image with OCR
      validUrls.forEach((url, index) => {
        const imageIndex = currentPhotoCount + index;
        setTimeout(() => {
          processImageWithOCR(url, imageIndex);
        }, 800 * (index + 1)); // Stagger OCR processing
      });
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

  const processImageWithOCR = async (imageUrl, index) => {
    setOcrProcessing((prev) => ({ ...prev, [index]: true }));
    setOcrResults((prev) => ({ ...prev, [index]: null }));

    try {
      // Call backend OCR API with image URL
      const instance = NetworkManager(API.MEDIA.OCR_PROCESS);
      const payload = {
        imageUrl: imageUrl,
      };
      
      const response = await instance.request(payload);
      
      // Handle response structure
      const ocrData = response.data?.data || response.data;
      
      if (!ocrData) {
        throw new Error("No OCR data received from server");
      }

      // Extract data from backend response
      const extractedData = {
        rawText: ocrData.rawText || ocrData.text || "",
        amount: ocrData.amount || null,
        transactionId: ocrData.transactionId || ocrData.transaction_id || null,
        chequeNumber: ocrData.chequeNumber || ocrData.cheque_number || null,
        date: ocrData.date || null,
        bankName: ocrData.bankName || ocrData.bank_name || null,
        type: ocrData.type || "Receipt",
      };

      // If backend didn't extract but provided raw text, extract locally as fallback
      if (!extractedData.amount && extractedData.rawText) {
        extractedData.amount = extractAmount(extractedData.rawText);
      }
      if (!extractedData.date && extractedData.rawText) {
        extractedData.date = extractDate(extractedData.rawText);
      }
      if (!extractedData.transactionId && extractedData.rawText) {
        extractedData.transactionId = extractTransactionId(extractedData.rawText);
      }
      if (!extractedData.chequeNumber && extractedData.rawText) {
        extractedData.chequeNumber = extractChequeNumber(extractedData.rawText);
      }
      if (!extractedData.bankName && extractedData.rawText) {
        extractedData.bankName = extractBankName(extractedData.rawText);
      }

      setOcrResults((prev) => ({ ...prev, [index]: extractedData }));

      // Auto-fill form fields if data was extracted (only if fields are empty)
      let fieldsUpdated = [];
      
      if (extractedData.amount && !paymentForm.paidAmount) {
        handlePaymentInputChange("paidAmount", extractedData.amount);
        fieldsUpdated.push(`Amount: ₹${extractedData.amount}`);
      }

      if (extractedData.date && !paymentForm.paymentDate) {
        handlePaymentInputChange("paymentDate", extractedData.date);
        fieldsUpdated.push(`Date: ${extractedData.date}`);
      }

      if (extractedData.chequeNumber && !paymentForm.modeOfPayment) {
        handlePaymentInputChange("modeOfPayment", "Cheque");
        fieldsUpdated.push("Payment Mode: Cheque");
        if (!paymentForm.transactionId) {
          handlePaymentInputChange("transactionId", extractedData.chequeNumber);
          fieldsUpdated.push(`Cheque Number: ${extractedData.chequeNumber}`);
        }
        if (extractedData.bankName && !paymentForm.bankName) {
          handlePaymentInputChange("bankName", extractedData.bankName);
          fieldsUpdated.push(`Bank: ${extractedData.bankName}`);
        }
      }

      if (extractedData.transactionId && !extractedData.chequeNumber) {
        // Only set UPI if it's not a cheque
        if (!paymentForm.modeOfPayment) {
          handlePaymentInputChange("modeOfPayment", "UPI");
          fieldsUpdated.push("Payment Mode: UPI");
        }
        if (!paymentForm.transactionId) {
          handlePaymentInputChange("transactionId", extractedData.transactionId);
          fieldsUpdated.push(`Transaction ID: ${extractedData.transactionId}`);
        }
      }

      if (fieldsUpdated.length > 0) {
        Toast.success(`OCR completed! Extracted: ${fieldsUpdated.join(", ")}`);
      } else {
        Toast.success("OCR processing completed. Data extracted but fields already filled.");
      }
    } catch (error) {
      console.error("OCR processing error:", error);
      const errorMessage = error.response?.data?.message || error.message || "OCR processing failed";
      Toast.error(`OCR processing failed: ${errorMessage}`);
    } finally {
      setOcrProcessing((prev) => ({ ...prev, [index]: false }));
    }
  };

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

      const response = await instance.request(payload, [selectedOrder._id]);

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

  const getStatusColor = (status) => {
    switch (status) {
      case "ACCEPTED":
        return { bg: "#dcfce7", color: "#166534" };
      case "PENDING":
        return { bg: "#fef3c7", color: "#92400e" };
      case "REJECTED":
        return { bg: "#fee2e2", color: "#991b1b" };
      case "COMPLETED":
        return { bg: "#f3f4f6", color: "#374151" };
      default:
        return { bg: "#f5f5f5", color: "#666" };
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
            onClick={() => {
              if (outstandingData.byDistrict && outstandingData.byDistrict.length > 0) {
                setOutstandingView("district");
              }
            }}>
            <CardContent sx={{ p: 3, textAlign: "center", position: "relative" }}>
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
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 1.5,
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
                }}
                onClick={() => {
                  const talukas = (outstandingData.byTaluka || []).filter((t) => t._id?.district === district._id);
                  if (talukas.length > 0) {
                    setOutstandingView(`taluka-${district._id}`);
                  }
                }}>
                <CardContent sx={{ p: 2, textAlign: "center", "&:last-child": { pb: 2 } }}>
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
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 1.5,
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
                }}
                onClick={() => {
                  const villages = (outstandingData.byVillage || []).filter(
                    (v) => v._id?.district === districtId && v._id?.taluka === taluka._id?.taluka
                  );
                  if (villages.length > 0) {
                    setOutstandingView(`village-${districtId}-${taluka._id?.taluka}`);
                  }
                }}>
                <CardContent sx={{ p: 2, textAlign: "center", "&:last-child": { pb: 2 } }}>
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
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 1.5,
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
                }}
                onClick={async () => {
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
                <CardContent sx={{ p: 2, textAlign: "center", "&:last-child": { pb: 2 } }}>
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
              Ram Agri Sales
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
              {activeTab === 0 ? `My Orders (${orders.length})` : "Outstanding"}
            </Typography>
          </Box>
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
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} variant="fullWidth">
            <Tab label="Orders" />
            <Tab label="Outstanding" />
          </Tabs>
        </Box>
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          px: 1.5,
          py: 1.5,
        }}>
        {activeTab === 0 ? (
          // Orders Tab
          <>
            {/* Back Button if filtered from Outstanding */}
            {filteredFromOutstanding && (
              <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => {
                  setFilteredFromOutstanding(false);
                  setActiveTab(1); // Go back to Outstanding tab
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
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pb: 10 }}>
                {orders.map((order) => {
                  const statusColors = getStatusColor(order.orderStatus);
                  const paymentColors = getPaymentStatusColor(order.paymentStatus);

                  return (
                    <Card
                      key={order._id}
                      sx={{
                        cursor: "pointer",
                        transition: "all 0.2s",
                        "&:active": { transform: "scale(0.98)" },
                        backgroundColor: "white",
                        borderRadius: "8px",
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      }}
                      onClick={() => handleOrderClick(order)}>
                      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography
                              variant="subtitle2"
                              fontWeight="bold"
                              sx={{
                                fontSize: "0.9rem",
                                mb: 0.5,
                                backgroundColor: "#e3f2fd",
                                color: "#1976d2",
                                px: 1,
                                py: 0.25,
                                borderRadius: "4px",
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
                                py: 0.25,
                                borderRadius: "4px",
                                display: "inline-block",
                              }}>
                              {order.customerName}
                            </Typography>
                          </Box>
                          <Chip
                            label={order.orderStatus}
                            size="small"
                            sx={{
                              fontSize: "0.65rem",
                              height: "20px",
                              backgroundColor: statusColors.bg,
                              color: statusColors.color,
                              fontWeight: 600,
                            }}
                          />
                        </Box>

                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                          <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.75rem" }}>
                            ₹{order.totalAmount?.toLocaleString()} • Balance: ₹{order.balanceAmount?.toLocaleString() || 0}
                          </Typography>
                          <Chip
                            label={order.paymentStatus}
                            size="small"
                            sx={{
                              fontSize: "0.65rem",
                              height: "18px",
                              backgroundColor: paymentColors.bg,
                              color: paymentColors.color,
                              fontWeight: 600,
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            )}
          </>
        ) : (
          // Outstanding Tab
          renderOutstandingView()
        )}
      </Box>

      {/* FAB Button for Add Order */}
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
              <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem", display: "block", mb: 0.5 }}>
                Customer
              </Typography>
              <Typography variant="body2" fontWeight="medium" sx={{ fontSize: "0.9rem", mb: 1 }}>
                {selectedOrder.customerName}
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: "0.7rem" }}>
                    Total Amount
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: "0.9rem" }}>
                    ₹{selectedOrder.totalAmount?.toLocaleString()}
                  </Typography>
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
                              
                              {/* OCR Button */}
                              <IconButton
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
                              </IconButton>

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

                            {/* OCR Results Display */}
                            {ocrResult && (
                              <Box
                                sx={{
                                  mt: 0.5,
                                  p: 0.75,
                                  bgcolor: "#e8f5e9",
                                  borderRadius: 0.5,
                                  border: "1px solid #4caf50",
                                  fontSize: "0.7rem",
                                  maxWidth: 200,
                                }}
                              >
                                {ocrResult.amount && (
                                  <Typography variant="caption" sx={{ display: "block", fontWeight: 600, color: "#2e7d32" }}>
                                    Amount: ₹{ocrResult.amount}
                                  </Typography>
                                )}
                                {ocrResult.chequeNumber && (
                                  <Typography variant="caption" sx={{ display: "block", fontSize: "0.65rem", color: "#555" }}>
                                    Cheque: {ocrResult.chequeNumber}
                                  </Typography>
                                )}
                                {ocrResult.transactionId && (
                                  <Typography variant="caption" sx={{ display: "block", fontSize: "0.65rem", color: "#555" }}>
                                    Txn ID: {ocrResult.transactionId}
                                  </Typography>
                                )}
                              </Box>
                            )}
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
          <Button
            onClick={() => {
              setShowPaymentModal(false);
              setSelectedOrder(null);
            }}
            size="small">
            Cancel
          </Button>
          <Button
            onClick={handleAddPayment}
            variant="contained"
            size="small"
            disabled={
              !paymentForm.paidAmount ||
              !paymentForm.modeOfPayment ||
              (paymentForm.modeOfPayment !== "Cash" &&
                paymentForm.modeOfPayment !== "NEFT/RTGS" &&
                paymentForm.receiptPhoto.length === 0) ||
              loading
            }
            startIcon={<PaymentIcon />}>
            {loading ? "Adding..." : "Add Payment"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            maxHeight: "90vh",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "white",
            padding: "12px 16px",
          }}
        >
          <Typography variant="h6">Receipt Photo Preview</Typography>
          <IconButton onClick={() => setPreviewImage(null)} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ padding: 2, display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0, 0, 0, 0.9)" }}>
          {previewImage && (
            <img
              src={previewImage}
              alt="Receipt preview"
              style={{
                maxWidth: "100%",
                maxHeight: "75vh",
                objectFit: "contain",
                borderRadius: 4,
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AgriSalesOrderMobile;
