import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import {
  Close as CloseIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Inventory as PackageIcon,
  CheckCircle as CheckIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  ZoomIn as ZoomInIcon,
  TextFields as TextFieldsIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import useDebounce from "hooks/useDebounce";
import moment from "moment";
import { makeStyles } from "tss-react/mui";
import LocationSelector from "components/LocationSelector";

const useStyles = makeStyles()((theme) => ({
  dialog: {
    "& .MuiDialog-paper": {
      borderRadius: 12,
      boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
      maxHeight: "90vh",
      [theme.breakpoints.down("sm")]: {
        maxWidth: "100vw",
        maxHeight: "100vh",
        margin: 0,
        borderRadius: 0,
      },
    },
  },
  dialogTitle: {
    background: "linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)",
    color: "white",
    padding: "16px 24px",
    position: "relative",
    [theme.breakpoints.down("sm")]: {
      padding: "12px 16px",
    },
  },
  closeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    color: "white",
    "&:hover": {
      backgroundColor: "rgba(255,255,255,0.1)",
    },
  },
  formContainer: {
    padding: "12px 16px",
    maxWidth: 1000,
    margin: "0 auto",
    background: "#fafafa",
    [theme.breakpoints.down("sm")]: {
      padding: "12px",
    },
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: "0.9rem",
    marginBottom: 8,
    display: "flex",
    alignItems: "center",
    gap: 6,
    color: "#2c3e50",
  },
  customerInfo: {
    padding: 8,
    backgroundColor: "#e8f5e9",
    borderRadius: 6,
    marginBottom: 8,
    border: "1px solid #4caf50",
  },
  paymentCard: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
  },
}));

const AddAgriSalesOrderForm = ({ open = true, onClose, onSuccess, isStandalone = false }) => {
  const { classes } = useStyles();
  const [loading, setLoading] = useState(false);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [ramAgriCrops, setRamAgriCrops] = useState([]);
  const [units, setUnits] = useState([]);
  const [customerData, setCustomerData] = useState({});

  const [formData, setFormData] = useState({
    customerName: "",
    customerMobile: "",
    customerVillage: "",
    customerTaluka: "",
    customerDistrict: "",
    customerState: "Maharashtra",
    ramAgriCropId: "",
    ramAgriVarietyId: "",
    ramAgriCropName: "",
    ramAgriVarietyName: "",
    quantity: "",
    rate: "",
    orderDate: new Date(),
    deliveryDate: null,
    notes: "",
  });

  const [paymentData, setPaymentData] = useState({
    paidAmount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    modeOfPayment: "",
    bankName: "",
    transactionId: "", // Unified field for UTR/Transaction ID/Cheque Number
    remark: "",
    receiptPhoto: [],
    isWalletPayment: false,
  });

  // State for image preview popup
  const [previewImage, setPreviewImage] = useState(null);
  
  // State for OCR processing
  const [ocrProcessing, setOcrProcessing] = useState({});
  const [ocrResults, setOcrResults] = useState({});

  // Debounced mobile number for customer lookup
  const debouncedMobileNumber = useDebounce(formData?.customerMobile || "", 500);

  // Auto-fill customer data when mobile number is entered
  useEffect(() => {
    if (debouncedMobileNumber?.length === 10) {
      setMobileLoading(true);
      getCustomerByMobile(debouncedMobileNumber);
    } else if (customerData && debouncedMobileNumber?.length < 10) {
      setCustomerData({});
    }
  }, [debouncedMobileNumber]);

  // Load Ram Agri crops and units
  useEffect(() => {
    if (open) {
      loadRamAgriCrops();
      loadUnits();
    }
  }, [open]);

  // Update rate and UOM when variety is selected
  useEffect(() => {
    if (formData?.ramAgriCropId && formData?.ramAgriVarietyId) {
      const crop = ramAgriCrops.find((c) => c._id === formData.ramAgriCropId);
      if (crop) {
        const variety = crop.varieties?.find((v) => v._id === formData.ramAgriVarietyId);
        if (variety) {
          // Get current rate (from active rate or default rate)
          const getCurrentRate = (variety) => {
            if (variety.rates && variety.rates.length > 0) {
              const now = new Date();
              const activeRate = variety.rates.find(
                (r) => new Date(r.startDate) <= now && new Date(r.endDate) >= now
              );
              if (activeRate) {
                return activeRate.minRate && activeRate.maxRate
                  ? (Number(activeRate.minRate) + Number(activeRate.maxRate)) / 2
                  : activeRate.rate || variety.defaultRate || 0;
              }
            }
            return variety.defaultRate || 0;
          };

          const currentRate = getCurrentRate(variety);
          setFormData((prev) => ({
            ...prev,
            ramAgriCropName: crop.cropName,
            ramAgriVarietyName: variety.name,
            rate: currentRate > 0 ? currentRate.toString() : prev.rate,
          }));
        }
      }
    }
  }, [formData?.ramAgriCropId, formData?.ramAgriVarietyId, ramAgriCrops]);

  const loadRamAgriCrops = async () => {
    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS);
      const response = await instance.request();
      
      if (response?.data) {
        const apiResponse = response.data;
        let cropsData = [];
        
        if (apiResponse?.status === "Success" && apiResponse?.data) {
          cropsData = Array.isArray(apiResponse.data) ? apiResponse.data : [];
        } else if (apiResponse?.success && apiResponse?.data) {
          cropsData = Array.isArray(apiResponse.data) ? apiResponse.data : [];
        } else if (Array.isArray(apiResponse)) {
          cropsData = apiResponse;
        }
        
        // Filter only active crops with active varieties
        const activeCrops = cropsData
          .filter((crop) => crop.isActive !== false)
          .map((crop) => ({
            ...crop,
            varieties: (crop.varieties || []).filter((v) => v.isActive !== false),
          }))
          .filter((crop) => crop.varieties.length > 0);
        
        setRamAgriCrops(activeCrops);
        
        if (activeCrops.length === 0) {
          Toast.warning("No Ram Agri crops with active varieties found.");
        }
      } else {
        setRamAgriCrops([]);
        Toast.error("No crops data received from server");
      }
    } catch (error) {
      console.error("Error loading Ram Agri crops:", error);
      Toast.error(`Failed to load crops: ${error.response?.data?.message || error.message}`);
      setRamAgriCrops([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUnits = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_UNITS);
      const response = await instance.request();
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success && apiResponse.data) {
          setUnits(apiResponse.data);
        } else if (apiResponse.status === "Success" && apiResponse.data) {
          setUnits(apiResponse.data);
        }
      }
    } catch (error) {
      console.error("Error loading units:", error);
    }
  };

  const getCustomerByMobile = async (mobileNumber) => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_CUSTOMER_BY_MOBILE);
      const response = await instance.request(null, [mobileNumber]);

      if (response?.data?.data) {
        const customer = response.data.data;
        setCustomerData(customer);
        setFormData((prev) => ({
          ...prev,
          customerName: customer.name || "",
          customerVillage: customer.village || "",
          customerTaluka: customer.taluka || "",
          customerDistrict: customer.district || "",
          customerState: customer.state || "Maharashtra",
        }));
        setMobileLoading(false);
      } else {
        setCustomerData({});
        setMobileLoading(false);
      }
    } catch (error) {
      console.error("Error fetching customer:", error);
      setCustomerData({});
      setMobileLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    if (field === "customerMobile") {
      // Only allow numeric input and limit to 10 digits
      value = value.replace(/[^0-9]/g, "").slice(0, 10);
    }
    
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      
      // When state changes, reset dependent location fields (LocationSelector will handle this, but we ensure consistency)
      if (field === "customerState" && value !== prev.customerState) {
        newData.customerDistrict = "";
        newData.customerTaluka = "";
        newData.customerVillage = "";
      }
      // When district changes, reset taluka and village
      else if (field === "customerDistrict" && value !== prev.customerDistrict) {
        newData.customerTaluka = "";
        newData.customerVillage = "";
      }
      // When taluka changes, reset village
      else if (field === "customerTaluka" && value !== prev.customerTaluka) {
        newData.customerVillage = "";
      }
      
      return newData;
    });
  };

  const handlePaymentInputChange = (field, value) => {
    setPaymentData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePaymentImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        Toast.error("Please select valid image files only");
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        Toast.error("File is too large. Maximum size is 8MB per file");
        return;
      }
    }

    try {
      setLoading(true);
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
            console.error("Available paths:", {
              "response.data": response.data,
              "response.data.data": response.data?.data,
              "response.data.media_url": response.data?.media_url,
              "response.data.data.media_url": response.data?.data?.media_url,
            });
            throw new Error("Failed to get media URL from response");
          }
          
          return mediaUrl;
        })
      );

      // Filter out any null/undefined values just in case
      const validUrls = uploadedUrls.filter(url => url && url.trim() !== "");

      if (validUrls.length === 0) {
        Toast.error("No valid image URLs were received from upload");
        return;
      }

      // Get the current index to start from for OCR processing (before state update)
      const currentPhotoCount = paymentData.receiptPhoto?.length || 0;

      setPaymentData((prev) => ({
        ...prev,
        receiptPhoto: [...(prev.receiptPhoto || []), ...validUrls],
      }));

      Toast.success("Images uploaded successfully. Processing with OCR...");

      // Automatically process each uploaded image with OCR
      // Use setTimeout to ensure state is updated and stagger processing

    } catch (error) {
      console.error("Error uploading images:", error);
      const errorMessage = error.message || "Failed to upload images";
      Toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removePaymentImage = (index) => {
    setPaymentData((prev) => ({
      ...prev,
      receiptPhoto: prev.receiptPhoto.filter((_, i) => i !== index),
    }));
    // Also remove OCR results for this image
    setOcrResults((prev) => {
      const newResults = { ...prev };
      delete newResults[index];
      return newResults;
    });
  };

  // OCR Helper Functions
  const extractAmount = (text) => {
    // Patterns for amount extraction
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

    // Return the largest amount found (usually the total)
    return amounts.length > 0 ? Math.max(...amounts).toString() : null;
  };

  const extractTransactionId = (text) => {
    // UPI transaction ID patterns
    const patterns = [
      /(?:transaction|txn|id|ref)[\s#:]*([A-Z0-9]{8,20})/i,
      /(?:upi|upi\s*ref)[\s:]*([A-Z0-9]{8,20})/i,
      /\b([A-Z0-9]{12,20})\b/g, // Generic long alphanumeric IDs
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
    // Cheque number patterns
    const patterns = [
      /(?:cheque|chq|check)[\s#:]*no\.?[\s:]*(\d{6,12})/i,
      /cheque[\s#:]*(\d{6,12})/i,
      /^\s*(\d{6,12})\s*$/m, // Standalone 6-12 digit numbers
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
    // Date patterns (DD/MM/YYYY, DD-MM-YYYY, etc.)
    const patterns = [
      /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/,
      /(\d{2,4}[-/]\d{1,2}[-/]\d{1,2})/,
      /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/, // YYYY-MM-DD
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          const dateStr = match[1];
          let date;
          // Try parsing different formats
          if (dateStr.includes("/")) {
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                // DD/MM/YYYY or MM/DD/YYYY - try DD/MM/YYYY first
                date = new Date(parts[2], parts[1] - 1, parts[0]);
                if (isNaN(date.getTime())) {
                  date = new Date(parts[2], parts[0] - 1, parts[1]); // Try MM/DD/YYYY
                }
              } else {
                // DD/MM/YY
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
    // Common bank names
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
      
      if (extractedData.amount && !paymentData.paidAmount) {
        handlePaymentInputChange("paidAmount", extractedData.amount);
        fieldsUpdated.push(`Amount: ₹${extractedData.amount}`);
      }

      if (extractedData.date && !paymentData.paymentDate) {
        handlePaymentInputChange("paymentDate", extractedData.date);
        fieldsUpdated.push(`Date: ${extractedData.date}`);
      }

      if (extractedData.chequeNumber && !paymentData.modeOfPayment) {
        handlePaymentInputChange("modeOfPayment", "Cheque");
        fieldsUpdated.push("Payment Mode: Cheque");
        if (!paymentData.transactionId) {
          handlePaymentInputChange("transactionId", extractedData.chequeNumber);
          fieldsUpdated.push(`Cheque Number: ${extractedData.chequeNumber}`);
        }
        if (extractedData.bankName && !paymentData.bankName) {
          handlePaymentInputChange("bankName", extractedData.bankName);
          fieldsUpdated.push(`Bank: ${extractedData.bankName}`);
        }
      }

      if (extractedData.transactionId && !extractedData.chequeNumber) {
        // Only set UPI if it's not a cheque
        if (!paymentData.modeOfPayment) {
          handlePaymentInputChange("modeOfPayment", "UPI");
          fieldsUpdated.push("Payment Mode: UPI");
        }
        if (!paymentData.transactionId) {
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

  const validateForm = () => {
    if (!formData.customerName || formData.customerName.trim() === "") {
      Toast.error("Please enter customer name");
      return false;
    }
    if (!formData.customerMobile || formData.customerMobile.length !== 10) {
      Toast.error("Please enter valid 10-digit mobile number");
      return false;
    }
    if (!formData.ramAgriCropId) {
      Toast.error("Please select a crop");
      return false;
    }
    if (!formData.ramAgriVarietyId) {
      Toast.error("Please select a variety");
      return false;
    }
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      Toast.error("Please enter valid quantity");
      return false;
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      Toast.error("Please enter valid rate");
      return false;
    }

    // Validate payment if provided
    if (paymentData.paidAmount && parseFloat(paymentData.paidAmount) > 0) {
      if (!paymentData.isWalletPayment && !paymentData.modeOfPayment) {
        Toast.error("Please select payment mode");
        return false;
      }
      // Validate image for non-Cash payments (except NEFT/RTGS)
      if (
        paymentData.modeOfPayment &&
        paymentData.modeOfPayment !== "Cash" &&
        paymentData.modeOfPayment !== "NEFT/RTGS" &&
        (!paymentData.receiptPhoto || paymentData.receiptPhoto.length === 0)
      ) {
        Toast.error(`Payment image is mandatory for ${paymentData.modeOfPayment} payments`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Get crop and variety for UOM
      const crop = ramAgriCrops.find((c) => c._id === formData.ramAgriCropId);
      const variety = crop?.varieties?.find((v) => v._id === formData.ramAgriVarietyId);

      const payload = {
        customerName: formData.customerName.trim(),
        customerMobile: formData.customerMobile,
        customerVillage: formData.customerVillage || "",
        customerTaluka: formData.customerTaluka || "",
        customerDistrict: formData.customerDistrict || "",
        customerState: formData.customerState || "Maharashtra",
        isRamAgriProduct: true,
        ramAgriCropId: formData.ramAgriCropId,
        ramAgriVarietyId: formData.ramAgriVarietyId,
        ramAgriCropName: formData.ramAgriCropName || crop?.cropName || "",
        ramAgriVarietyName: formData.ramAgriVarietyName || variety?.name || "",
        primaryUnit: variety?.primaryUnit?._id || variety?.primaryUnit || "",
        secondaryUnit: variety?.secondaryUnit?._id || variety?.secondaryUnit || null,
        conversionFactor: variety?.conversionFactor || 1,
        quantity: parseFloat(formData.quantity),
        rate: parseFloat(formData.rate),
        orderDate: formData.orderDate instanceof Date ? formData.orderDate.toISOString() : formData.orderDate,
        deliveryDate: formData.deliveryDate ? (formData.deliveryDate instanceof Date ? formData.deliveryDate.toISOString() : formData.deliveryDate) : null,
        notes: formData.notes || "",
      };

      // Add payment if provided
      if (paymentData.paidAmount && parseFloat(paymentData.paidAmount) > 0) {
        // Filter out null/undefined/empty values from receiptPhoto array
        const validReceiptPhotos = (paymentData.receiptPhoto || []).filter(
          (photo) => photo && photo.trim && photo.trim() !== "" && photo !== null && photo !== undefined
        );
        
        payload.payment = [
          {
            paidAmount: parseFloat(paymentData.paidAmount),
            paymentDate: paymentData.paymentDate,
            modeOfPayment: paymentData.isWalletPayment ? "Wallet" : paymentData.modeOfPayment,
            bankName: paymentData.bankName || "",
            transactionId: paymentData.transactionId || "",
            receiptPhoto: validReceiptPhotos,
            remark: paymentData.remark || "",
            isWalletPayment: paymentData.isWalletPayment || false,
            paymentStatus: "PENDING",
          },
        ];
      }

      const instance = NetworkManager(API.INVENTORY.CREATE_AGRI_SALES_ORDER);
      const response = await instance.request(payload);

      if (response?.data) {
        Toast.success("Agri Sales Order created successfully");
        handleClose();
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error creating order:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create order";
      Toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      customerName: "",
      customerMobile: "",
      customerVillage: "",
      customerTaluka: "",
      customerDistrict: "",
      customerState: "Maharashtra",
      ramAgriCropId: "",
      ramAgriVarietyId: "",
      ramAgriCropName: "",
      ramAgriVarietyName: "",
      quantity: "",
      rate: "",
      orderDate: new Date(),
      deliveryDate: null,
      notes: "",
    });
    setPaymentData({
      paidAmount: "",
      paymentDate: moment().format("YYYY-MM-DD"),
      modeOfPayment: "",
      bankName: "",
      transactionId: "",
      remark: "",
      receiptPhoto: [],
      isWalletPayment: false,
    });
    setCustomerData({});
    onClose();
  };

  const selectedCrop = ramAgriCrops.find((c) => c._id === formData.ramAgriCropId);
  const selectedVariety = selectedCrop?.varieties?.find((v) => v._id === formData.ramAgriVarietyId);
  const totalAmount = parseFloat(formData.quantity || 0) * parseFloat(formData.rate || 0);
  const paidAmount = parseFloat(paymentData.paidAmount || 0);
  const balanceAmount = totalAmount - paidAmount;

  const getUnitDisplayName = (unit) => {
    if (!unit) return "N/A";
    if (typeof unit === "object") {
      return unit.abbreviation || unit.name || "N/A";
    }
    return unit;
  };

  // Form content (shared between Dialog and standalone modes)
  const formContent = (
    <Box sx={isStandalone ? { p: { xs: 2, sm: 3 }, maxWidth: "100%" } : {}} className={!isStandalone ? classes.formContainer : ""}>
          {/* Customer Information */}
          <Typography className={classes.sectionTitle}>
            <PersonIcon /> Customer Information
          </Typography>

          {customerData?.name && (
            <Box className={classes.customerInfo}>
              <Box display="flex" alignItems="center" gap={0.5} mb={0.5}>
                <CheckIcon color="success" fontSize="small" sx={{ fontSize: "16px" }} />
                <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.875rem" }}>
                  Customer Found: {customerData.name}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                Location: {customerData.village}, {customerData.taluka}, {customerData.district}
              </Typography>
            </Box>
          )}

          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Mobile Number *"
                value={formData.customerMobile}
                onChange={(e) => handleInputChange("customerMobile", e.target.value)}
                inputProps={{ maxLength: 10, pattern: "[0-9]*" }}
                InputProps={{
                  startAdornment: <Box sx={{ mr: 0.5, color: "text.secondary", fontSize: "0.875rem" }}>+91</Box>,
                  endAdornment: mobileLoading && <CircularProgress size={16} />,
                }}
                error={formData.customerMobile?.length > 0 && formData.customerMobile?.length !== 10}
                helperText={
                  formData.customerMobile?.length > 0 && formData.customerMobile?.length !== 10
                    ? `Enter ${10 - formData.customerMobile.length} more digits`
                    : customerData?.name
                    ? "✓ Customer found - details auto-filled"
                    : "Enter 10-digit mobile number to auto-fill"
                }
                placeholder="10-digit mobile number"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Customer Name *"
                value={formData.customerName}
                onChange={(e) => handleInputChange("customerName", e.target.value)}
                disabled={!!customerData?.name}
                placeholder="Enter customer name"
              />
            </Grid>

            <Grid item xs={12}>
              {customerData?.name ? (
                // Show location as read-only when customer is found
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 1, fontWeight: 600, color: "#2c3e50", fontSize: "0.875rem" }}>
                    Location (Auto-filled from customer data)
                  </Typography>
                  <Grid container spacing={1.5}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="State"
                        value={formData.customerState || ""}
                        disabled
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="District"
                        value={formData.customerDistrict || ""}
                        disabled
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Taluka"
                        value={formData.customerTaluka || ""}
                        disabled
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="Village"
                        value={formData.customerVillage || ""}
                        disabled
                        variant="outlined"
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>
              ) : (
                // Show normal LocationSelector when no customer is found
                <LocationSelector
                  selectedState={formData.customerState}
                  selectedDistrict={formData.customerDistrict}
                  selectedTaluka={formData.customerTaluka}
                  selectedVillage={formData.customerVillage}
                  onStateChange={(value) => handleInputChange("customerState", value)}
                  onDistrictChange={(value) => handleInputChange("customerDistrict", value)}
                  onTalukaChange={(value) => handleInputChange("customerTaluka", value)}
                  onVillageChange={(value) => handleInputChange("customerVillage", value)}
                  required={false}
                  showLabels={false}
                  className="mt-4"
                  disabled={false}
                  autoFill={true}
                />
              )}
              {customerData?.name ? (
                <Alert severity="success" sx={{ mt: 1, py: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    <strong>Customer Found:</strong> Location fields are auto-filled and
                    disabled. You can modify them if needed by clearing the mobile number
                    first.
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mt: 1, py: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    <strong>Default Location:</strong> Maharashtra state is pre-selected.
                    Please select your district, taluka, and village.
                  </Typography>
                </Alert>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5 }} />

          {/* Product Information */}
          <Typography className={classes.sectionTitle}>
            <PackageIcon /> Ram Agri Product Information
          </Typography>

          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Crop *</InputLabel>
                <Select
                  value={formData.ramAgriCropId}
                  onChange={(e) => {
                    handleInputChange("ramAgriCropId", e.target.value);
                    handleInputChange("ramAgriVarietyId", ""); // Reset variety when crop changes
                  }}
                  label="Select Crop *"
                  disabled={loading || ramAgriCrops.length === 0}
                >
                  {loading ? (
                    <MenuItem disabled>
                      <Box display="flex" alignItems="center" gap={1}>
                        <CircularProgress size={16} />
                        <span>Loading crops...</span>
                      </Box>
                    </MenuItem>
                  ) : ramAgriCrops.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary">
                        No Ram Agri crops available.
                      </Typography>
                    </MenuItem>
                  ) : (
                    ramAgriCrops.map((crop) => (
                      <MenuItem key={crop._id} value={crop._id}>
                        {crop.cropName} ({crop.varieties?.length || 0} varieties)
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Variety *</InputLabel>
                <Select
                  value={formData.ramAgriVarietyId}
                  onChange={(e) => handleInputChange("ramAgriVarietyId", e.target.value)}
                  label="Select Variety *"
                  disabled={loading || !formData.ramAgriCropId || !selectedCrop?.varieties?.length}
                >
                  {!formData.ramAgriCropId ? (
                    <MenuItem disabled>Select a crop first</MenuItem>
                  ) : !selectedCrop?.varieties?.length ? (
                    <MenuItem disabled>No varieties available for this crop</MenuItem>
                  ) : (
                    selectedCrop.varieties.map((variety) => (
                      <MenuItem key={variety._id} value={variety._id}>
                        {variety.name}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            {selectedVariety && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 0.5, py: 0.5 }}>
                  <Typography variant="caption" sx={{ fontSize: "0.75rem" }}>
                    <strong>Crop:</strong> {formData.ramAgriCropName} | <strong>Variety:</strong> {formData.ramAgriVarietyName} |{" "}
                    <strong>Unit:</strong> {getUnitDisplayName(selectedVariety.primaryUnit)}
                    {selectedVariety.secondaryUnit && ` (1 ${getUnitDisplayName(selectedVariety.primaryUnit)} = ${selectedVariety.conversionFactor || 1} ${getUnitDisplayName(selectedVariety.secondaryUnit)})`}
                    {selectedVariety.defaultRate && ` | Default Rate: ₹${selectedVariety.defaultRate}/${getUnitDisplayName(selectedVariety.primaryUnit)}`}
                  </Typography>
                </Alert>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Quantity *"
                type="number"
                value={formData.quantity}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                inputProps={{ min: 0.01, step: 0.01 }}
                placeholder="Enter quantity"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Rate per Unit *"
                type="number"
                value={formData.rate}
                onChange={(e) => handleInputChange("rate", e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                placeholder="Enter rate"
              />
            </Grid>

            {totalAmount > 0 && (
              <Grid item xs={12}>
                <Box sx={{ p: 1, bgcolor: "#e3f2fd", borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
                    Total Amount: <strong>₹{totalAmount.toLocaleString()}</strong>
                  </Typography>
                </Box>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Order Date"
                  value={formData.orderDate}
                  onChange={(date) => handleInputChange("orderDate", date)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Delivery Date (Optional)"
                  value={formData.deliveryDate}
                  onChange={(date) => handleInputChange("deliveryDate", date)}
                  minDate={formData.orderDate}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                multiline
                rows={2}
                placeholder="Additional notes or remarks"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1.5 }} />

          {/* Payment Information */}
          <Typography className={classes.sectionTitle}>Payment Information (Optional)</Typography>

          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Paid Amount (₹)"
                type="number"
                value={paymentData.paidAmount}
                onChange={(e) => handlePaymentInputChange("paidAmount", e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                placeholder="Enter amount"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Payment Date"
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => handlePaymentInputChange("paymentDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Mode</InputLabel>
                <Select
                  value={paymentData.modeOfPayment}
                  onChange={(e) => handlePaymentInputChange("modeOfPayment", e.target.value)}
                  label="Payment Mode"
                  disabled={paymentData.isWalletPayment}
                >
                  <MenuItem value="">Select Mode</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="UPI">UPI</MenuItem>
                  <MenuItem value="Cheque">Cheque</MenuItem>
                  <MenuItem value="NEFT/RTGS">NEFT/RTGS</MenuItem>
                  <MenuItem value="1341">1341</MenuItem>
                  <MenuItem value="434">434</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Bank Name"
                value={paymentData.bankName}
                onChange={(e) => handlePaymentInputChange("bankName", e.target.value)}
                disabled={!paymentData.modeOfPayment || (paymentData.modeOfPayment !== "Cheque" && paymentData.modeOfPayment !== "NEFT/RTGS")}
                placeholder={
                  paymentData.modeOfPayment === "Cheque" || paymentData.modeOfPayment === "NEFT/RTGS"
                    ? "Enter bank name"
                    : "N/A"
                }
              />
            </Grid>

            {/* Dynamic Transaction ID field based on payment mode */}
            {paymentData.modeOfPayment && paymentData.modeOfPayment !== "Cash" && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label={
                    paymentData.modeOfPayment === "UPI"
                      ? "UTR/Transaction ID"
                      : paymentData.modeOfPayment === "Cheque"
                      ? "Cheque Number"
                      : "Transaction ID"
                  }
                  value={paymentData.transactionId}
                  onChange={(e) => handlePaymentInputChange("transactionId", e.target.value)}
                  placeholder={
                    paymentData.modeOfPayment === "UPI"
                      ? "Enter UTR/Transaction ID"
                      : paymentData.modeOfPayment === "Cheque"
                      ? "Enter cheque number"
                      : "Enter transaction ID"
                  }
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Payment Remark"
                value={paymentData.remark}
                onChange={(e) => handlePaymentInputChange("remark", e.target.value)}
                placeholder="Optional remark"
              />
            </Grid>

            {/* Payment Receipt Upload */}
            {paymentData.modeOfPayment && paymentData.modeOfPayment !== "Cash" && paymentData.modeOfPayment !== "NEFT/RTGS" && (
              <Grid item xs={12}>
                <Box>
                  <Button variant="outlined" component="label" startIcon={<UploadIcon />} size="small">
                    Upload Receipt Photos *
                    <input type="file" hidden accept="image/*" multiple onChange={handlePaymentImageUpload} />
                  </Button>
                  {paymentData.receiptPhoto?.length > 0 && (
                    <Box sx={{ display: "flex", gap: 0.5, mt: 1, flexWrap: "wrap" }}>
                      {paymentData.receiptPhoto.map((photo, index) => {
                        const ocrResult = ocrResults[index];
                        const isProcessing = ocrProcessing[index];
                        return (
                          <Box key={index} sx={{ position: "relative" }}>
                            <Box sx={{ position: "relative", cursor: "pointer" }}>
                              <Box
                                onClick={() => setPreviewImage(photo)}
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
                                  src={photo}
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
                                  processImageWithOCR(photo, index);
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
                                  removePaymentImage(index);
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
              </Grid>
            )}

            {/* Payment Summary */}
            {paidAmount > 0 && (
              <Grid item xs={12}>
                <Box className={classes.paymentCard}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.875rem", mb: 0.5, display: "block", fontWeight: 600 }}>
                    Payment Summary:
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.875rem", display: "block" }}>
                    Total Amount: <strong>₹{totalAmount.toLocaleString()}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.875rem", display: "block" }}>
                    Paid Amount: <strong>₹{paidAmount.toLocaleString()}</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.875rem", display: "block" }} color={balanceAmount > 0 ? "text.secondary" : "success.main"}>
                    Balance: <strong>₹{balanceAmount.toLocaleString()}</strong>
                  </Typography>
                </Box>
              </Grid>
            )}
          </Grid>
        </Box>
  );

  // Action buttons (shared between Dialog and standalone modes)
  const actionButtons = (
    <Box sx={{ p: { xs: 2, sm: 3 }, borderTop: "1px solid #e0e0e0", display: "flex", gap: 2, justifyContent: "flex-end", flexWrap: "wrap" }}>
      <Button onClick={handleClose} color="secondary" disabled={loading} variant={isStandalone ? "outlined" : "text"} fullWidth={isStandalone ? { xs: true, sm: false } : false}>
        Cancel
      </Button>
      <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />} fullWidth={isStandalone ? { xs: true, sm: false } : false}>
        {loading ? "Creating..." : "Create Order"}
      </Button>
    </Box>
  );

  // If standalone mode, render without Dialog wrapper
  if (isStandalone) {
    return (
      <>
        <Box sx={{ width: "100%", maxWidth: "100%", backgroundColor: "white", borderRadius: { xs: 0, sm: 2 }, minHeight: "calc(100vh - 64px)" }}>
          {formContent}
          {actionButtons}
        </Box>

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
      </>
    );
  }

  // Dialog mode (default)
  return (
    <>
      <Dialog open={open} onClose={handleClose} className={classes.dialog} maxWidth="sm">
        <DialogTitle className={classes.dialogTitle}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <AddIcon />
              <Typography variant="h6">Ram Agri Sales - New Order</Typography>
            </Box>
            <IconButton className={classes.closeButton} onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 1 }}>{formContent}</DialogContent>
        <DialogActions sx={{ p: 1, borderTop: "1px solid #e0e0e0" }}>
          <Button onClick={handleClose} color="secondary" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}>
            {loading ? "Creating..." : "Create Order"}
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
    </>
  );
};

export default AddAgriSalesOrderForm;

