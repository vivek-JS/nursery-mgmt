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
  Autocomplete,
  Radio,
  RadioGroup,
  FormControlLabel,
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  Paper,
  Stack,
} from "@mui/material";
import {
  Close as CloseIcon,
  Add as AddIcon,
  Person as PersonIcon,
  Inventory as PackageIcon,
  CheckCircle as CheckIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  ZoomIn as ZoomInIcon,
  TextFields as TextFieldsIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "lib/muiLocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import useDebounce from "hooks/useDebounce";
import moment from "moment";
import { makeStyles } from "tss-react/mui";
import LocationSelector from "components/LocationSelector";
import { useUserData } from "utils/roleUtils";
import { buildAgriEditFormStateFromOrderRow } from "../dashboard/agriSalesOrderEditPrefill";
import AgriDeliveryTimingField from "./components/AgriDeliveryTimingField";
import AgriOrderPartyChannel from "./components/AgriOrderPartyChannel";
import {
  AGRI_DELIVERY_TIMING,
  formatAgriDeliveryTimingLabel,
  inferAgriDeliveryTiming,
  resolveAgriDeliveryDate,
  toAgriApiDateISO,
} from "utils/agriDeliveryTiming";
import {
  isAgriDealerSelf,
  dealerProfileToCustomerFields,
  isUserRamAgriSalesRep,
} from "utils/agriDealerOrder";
import {
  getRamAgriProductTypeLabel,
  getRamAgriProductTypeLabelPlural,
  getRamAgriProductTypeRadioLabel,
} from "utils/ramAgriProductType";

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
    padding: "12px 18px",
    position: "relative",
    [theme.breakpoints.down("sm")]: {
      padding: "10px 12px",
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
    padding: "8px 10px",
    maxWidth: 1000,
    margin: "0 auto",
    background: "#fafafa",
    [theme.breakpoints.down("sm")]: {
      padding: "6px 8px",
    },
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: "0.82rem",
    marginBottom: 4,
    display: "flex",
    alignItems: "center",
    gap: 4,
    color: "#2c3e50",
  },
  customerInfo: {
    padding: 6,
    backgroundColor: "#e8f5e9",
    borderRadius: 4,
    marginBottom: 6,
    border: "1px solid #4caf50",
  },
  paymentCard: {
    marginTop: 4,
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
  },
}));

const AddAgriSalesOrderForm = ({
  open = true,
  onClose,
  onSuccess,
  isStandalone = false,
  linkedNurseryOrder = null,
  /** Dashboard row — opens form in edit mode (Ram Agri Input order). */
  editOrder = null,
}) => {
  const { classes } = useStyles();
  const user = useUserData();
  const isRamAgriRepUser = isUserRamAgriSalesRep(user);
  const isDealerSelfUser = isAgriDealerSelf(user);
  const [loading, setLoading] = useState(false);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [ramAgriCrops, setRamAgriCrops] = useState([]);
  const [inventoryGiftProducts, setInventoryGiftProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [customerData, setCustomerData] = useState({});
  const [productType, setProductType] = useState("seed");
  const linkedNurseryOrderId = linkedNurseryOrder?.details?.orderid || linkedNurseryOrder?._id || null;
  const isLinkedFlow = Boolean(linkedNurseryOrderId) && !editOrder;
  const editOrderId = editOrder?.details?.orderid || editOrder?.details?._id || null;
  const isEditMode = Boolean(editOrderId);

  const productTypeLabel = getRamAgriProductTypeLabel(productType);
  const productTypeLabelPlural = getRamAgriProductTypeLabelPlural(productType);
  const isGiftMode = productType === "gift";

  const emptyProductLine = (type = productType) =>
    type === "gift"
      ? { productId: "", productName: "", quantity: "", rate: "" }
      : { ramAgriCropId: "", ramAgriCropName: "", varietySlots: [] };
  const [productLines, setProductLines] = useState([emptyProductLine()]);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [deliveryTiming, setDeliveryTiming] = useState(AGRI_DELIVERY_TIMING.TODAY);

  const [formData, setFormData] = useState({
    customerName: "",
    customerMobile: "",
    customerVillage: "",
    customerTaluka: "",
    customerDistrict: "",
    customerState: "Maharashtra",
    orderDate: new Date(),
    deliveryDate: resolveAgriDeliveryDate(AGRI_DELIVERY_TIMING.TODAY, null, new Date()),
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
  const [ramAgriSalesRepOptions, setRamAgriSalesRepOptions] = useState([]);
  const [agriSalesPersonId, setAgriSalesPersonId] = useState("");
  const [ramAgriLimitSummary, setRamAgriLimitSummary] = useState(null);
  const [orderChannel, setOrderChannel] = useState("RETAIL");
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState("");
  const [loadingMerchants, setLoadingMerchants] = useState(false);

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
      if (productType === "gift") {
        loadInventoryGiftProducts();
      } else {
        loadRamAgriCrops(productType);
      }
    }
  }, [open, productType]);

  useEffect(() => {
    if (open) {
      loadUnits();
    }
  }, [open]);

  const loadRamAgriSalesReps = async () => {
    try {
      const instance = NetworkManager(API.EMPLOYEE.GET_EMPLOYEE);
      const [ramAgriResp, salesResp] = await Promise.all([
        instance.request(null, { jobTitle: "RAM_AGRI_SALES" }),
        instance.request(null, { jobTitle: "SALES" }),
      ]);
      const list = [...(ramAgriResp?.data?.data || []), ...(salesResp?.data?.data || [])];
      const uniqById = Array.from(
        new Map((Array.isArray(list) ? list : []).map((u) => [String(u?._id || ""), u])).values()
      ).filter((u) => u?._id);
      setRamAgriSalesRepOptions(
        uniqById.map((u) => ({ label: u.name || "—", value: u._id }))
      );
    } catch (e) {
      console.error("Error loading Ram Agri/Sales reps:", e);
      setRamAgriSalesRepOptions([]);
    }
  };

  useEffect(() => {
    if (open && !isRamAgriRepUser && !isDealerSelfUser) {
      loadRamAgriSalesReps();
    }
  }, [open, isRamAgriRepUser, isDealerSelfUser]);

  const loadMerchantsForB2B = async () => {
    setLoadingMerchants(true);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_MERCHANTS_SIMPLE);
      const res = await instance.request();
      const list = res?.data?.data || res?.data || [];
      setMerchants(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error("Error loading merchants:", e);
      setMerchants([]);
    } finally {
      setLoadingMerchants(false);
    }
  };

  useEffect(() => {
    if (open && orderChannel === "B2B" && merchants.length === 0) {
      loadMerchantsForB2B();
    }
  }, [open, orderChannel]);

  const handleOrderChannelChange = (channel) => {
    setOrderChannel(channel);
    if (channel !== "B2B") {
      setSelectedMerchantId("");
    } else if (merchants.length === 0) {
      loadMerchantsForB2B();
    }
  };

  const handleMerchantSelect = (merchant) => {
    if (!merchant) {
      setSelectedMerchantId("");
      return;
    }
    setSelectedMerchantId(merchant._id);
    const village =
      merchant.address?.village ||
      merchant.address?.city ||
      (typeof merchant.address === "string" ? merchant.address : "") ||
      "";
    setFormData((prev) => ({
      ...prev,
      customerName: merchant.name || prev.customerName,
      customerMobile: String(merchant.phone || "").replace(/\D/g, "").slice(-10) || prev.customerMobile,
      customerVillage: village || prev.customerVillage,
      customerTaluka: merchant.address?.taluka || merchant.address?.state || prev.customerTaluka,
      customerDistrict: merchant.address?.district || merchant.address?.city || prev.customerDistrict,
      customerState: merchant.address?.state || prev.customerState || "Maharashtra",
    }));
    setCustomerData({});
  };

  useEffect(() => {
    if (open && isDealerSelfUser && !isEditMode && !isLinkedFlow) {
      const profile = dealerProfileToCustomerFields(user);
      setFormData((prev) => ({
        ...prev,
        customerName: profile.customerName || prev.customerName,
        customerMobile: profile.customerMobile || prev.customerMobile,
        customerVillage: profile.customerVillage || prev.customerVillage,
        customerTaluka: profile.customerTaluka || prev.customerTaluka,
        customerDistrict: profile.customerDistrict || prev.customerDistrict,
        customerState: profile.customerState || prev.customerState,
      }));
    }
  }, [open, isDealerSelfUser, isEditMode, isLinkedFlow, user]);

  useEffect(() => {
    if (!open || isLinkedFlow) {
      setRamAgriLimitSummary(null);
      return;
    }
    const sp = isDealerSelfUser
      ? user?._id || user?.id
      : isRamAgriRepUser
        ? user?._id || user?.id
        : agriSalesPersonId;
    if (!sp) {
      setRamAgriLimitSummary(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const inst = NetworkManager(API.INVENTORY.GET_AGRI_SALES_OUTSTANDING_LIMIT_SUMMARY);
        const params = isRamAgriRepUser ? {} : { userId: sp };
        const res = await inst.request({}, params);
        const api = res?.data;
        if (!cancelled && api?.status === "Success" && api.data) {
          setRamAgriLimitSummary(api.data);
        }
      } catch {
        if (!cancelled) setRamAgriLimitSummary(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, isLinkedFlow, isRamAgriRepUser, user?._id, user?.id, agriSalesPersonId]);

  useEffect(() => {
    if (!open || !isEditMode || !editOrder) return;
    const prefilled = buildAgriEditFormStateFromOrderRow(editOrder);
    setFormData(prefilled.formData);
    setDeliveryTiming(
      inferAgriDeliveryTiming(prefilled.formData.deliveryDate, prefilled.formData.orderDate)
    );
    setProductLines(prefilled.productLines);
    setProductType(prefilled.productType || "seed");
    if (prefilled.agriSalesPersonId) {
      setAgriSalesPersonId(String(prefilled.agriSalesPersonId));
    }
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
  }, [open, isEditMode, editOrder?.details?.orderid]);

  useEffect(() => {
    if (!open || !isLinkedFlow) return;
    const farmer = linkedNurseryOrder?.details?.farmer || {};
    const mobile = farmer.mobileNumber || linkedNurseryOrder?.details?.contact || "";
    const orderDeliveryDate =
      linkedNurseryOrder?.details?.deliveryDate || linkedNurseryOrder?.deliveryDate;

    setFormData((prev) => {
      const nextDeliveryDate = orderDeliveryDate ? new Date(orderDeliveryDate) : prev.deliveryDate;
      if (orderDeliveryDate) {
        setDeliveryTiming(inferAgriDeliveryTiming(nextDeliveryDate, prev.orderDate));
      }
      return {
        ...prev,
        customerName: farmer.name || linkedNurseryOrder?.farmerName || prev.customerName,
        customerMobile: mobile ? String(mobile) : prev.customerMobile,
        customerVillage: farmer.village || prev.customerVillage,
        customerTaluka: farmer.taluka || prev.customerTaluka,
        customerDistrict: farmer.district || prev.customerDistrict,
        deliveryDate: nextDeliveryDate,
      };
    });
  }, [open, isLinkedFlow, linkedNurseryOrder]);

  const getCurrentRate = (variety) => {
    if (!variety) return 0;
    if (Number(variety.sellerRate) > 0) {
      return Number(variety.sellerRate);
    }
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

  const updateProductLineCrop = (index, cropId) => {
    const crop = ramAgriCrops.find((c) => c._id === cropId);
    setProductLines((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        ramAgriCropId: cropId || "",
        ramAgriCropName: crop?.cropName || "",
        varietySlots: [],
      };
      return next;
    });
  };

  /** `selectedVarieties` = array of variety subdocuments from the crop, or one element for linked flow */
  const handleVarietyMultiChange = (index, selectedVarieties) => {
    setProductLines((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      const prevSlots = row.varietySlots || [];
      let list = Array.isArray(selectedVarieties)
        ? selectedVarieties
        : selectedVarieties
          ? [selectedVarieties]
          : [];
      if (isLinkedFlow && list.length > 1) {
        list = list.slice(0, 1);
      }
      row.varietySlots = list.map((v) => {
        const existing = prevSlots.find((s) => String(s.ramAgriVarietyId) === String(v._id));
        const cr = getCurrentRate(v);
        return {
          ramAgriVarietyId: v._id,
          ramAgriVarietyName: v.name,
          quantity: existing?.quantity ?? "",
          rate: existing?.rate || (cr > 0 ? String(cr) : ""),
        };
      });
      next[index] = row;
      return next;
    });
  };

  const updateVarietySlot = (lineIndex, slotIndex, updates) => {
    setProductLines((prev) => {
      const next = [...prev];
      const row = { ...next[lineIndex] };
      const slots = [...(row.varietySlots || [])];
      if (!slots[slotIndex]) return prev;
      slots[slotIndex] = { ...slots[slotIndex], ...updates };
      row.varietySlots = slots;
      next[lineIndex] = row;
      return next;
    });
  };

  const loadInventoryGiftProducts = async () => {
    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS);
      const response = await instance.request({}, { category: "gift", isActive: true, limit: 500 });
      const apiResponse = response?.data;
      let products = [];
      if (apiResponse?.success && Array.isArray(apiResponse.data)) {
        products = apiResponse.data;
      } else if (apiResponse?.status === "Success" && Array.isArray(apiResponse.data)) {
        products = apiResponse.data;
      } else if (Array.isArray(apiResponse?.data?.data)) {
        products = apiResponse.data.data;
      }
      setInventoryGiftProducts(products);
      if (!products.length) {
        Toast.warn("No gift inventory products found. Add products under category Gifts.");
      }
    } catch (error) {
      console.error("Error loading gift products:", error);
      Toast.error("Failed to load gift products");
      setInventoryGiftProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRamAgriCrops = async (type = productType) => {
    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS);
      const response = await instance.request({}, { productType: type });
      
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
        
        // Filter only active crops with active varieties (keep crops even if no varieties)
        const activeCrops = cropsData
          .filter((crop) => crop.isActive !== false)
          .map((crop) => ({
            ...crop,
            varieties: (crop.varieties || []).filter((v) => v.isActive !== false),
          }));
        
        setRamAgriCrops(activeCrops);
        
        if (activeCrops.length === 0) {
          Toast.warn(`No Ram Agri ${productTypeLabelPlural.toLowerCase()} found.`);
        } else if (activeCrops.every((crop) => !crop.varieties || crop.varieties.length === 0)) {
          Toast.warn(`No active varieties found for ${productTypeLabelPlural.toLowerCase()}. Add varieties to place orders.`);
        }
      } else {
        setRamAgriCrops([]);
        Toast.error(`No ${productTypeLabelPlural.toLowerCase()} data received from server`);
      }
    } catch (error) {
      console.error("Error loading Ram Agri crops:", error);
      Toast.error(`Failed to load ${productTypeLabelPlural.toLowerCase()}: ${error.response?.data?.message || error.message}`);
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
      } else if (field === "orderDate" && value) {
        if (deliveryTiming === AGRI_DELIVERY_TIMING.CUSTOM) {
          newData.deliveryDate = resolveAgriDeliveryDate(
            AGRI_DELIVERY_TIMING.CUSTOM,
            prev.deliveryDate,
            value
          );
        } else {
          newData.deliveryDate = resolveAgriDeliveryDate(deliveryTiming, null, value);
        }
      }

      return newData;
    });
  };

  const handleDeliveryTimingChange = (timing) => {
    setDeliveryTiming(timing);
    setFormData((prev) => ({
      ...prev,
      deliveryDate: resolveAgriDeliveryDate(
        timing,
        timing === AGRI_DELIVERY_TIMING.CUSTOM ? null : prev.deliveryDate,
        prev.orderDate
      ),
    }));
  };

  const handleDeliveryDateChange = (date) => {
    setDeliveryTiming(AGRI_DELIVERY_TIMING.CUSTOM);
    setFormData((prev) => ({
      ...prev,
      deliveryDate: resolveAgriDeliveryDate(AGRI_DELIVERY_TIMING.CUSTOM, date, prev.orderDate),
    }));
  };

  const handleProductTypeChange = (event) => {
    const nextType = event.target.value;
    setProductType(nextType);
    setProductLines([emptyProductLine(nextType)]);
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
    const linesToCheck = isLinkedFlow ? productLines.slice(0, 1) : productLines;
    if (isGiftMode) {
      for (let i = 0; i < linesToCheck.length; i++) {
        const row = linesToCheck[i];
        const label = linesToCheck.length > 1 ? ` (product ${i + 1})` : "";
        if (!row.productId) {
          Toast.error(`Please select a gift product${label}`);
          return false;
        }
        if (!row.quantity || parseFloat(row.quantity) <= 0) {
          Toast.error(`Please enter valid quantity${label}`);
          return false;
        }
        if (!row.rate || parseFloat(row.rate) <= 0) {
          Toast.error(`Please enter valid rate${label}`);
          return false;
        }
      }
    } else {
    for (let i = 0; i < linesToCheck.length; i++) {
      const row = linesToCheck[i];
      const label = linesToCheck.length > 1 ? ` (product ${i + 1})` : "";
      if (!row.ramAgriCropId) {
        Toast.error(`Please select a ${productTypeLabel.toLowerCase()}${label}`);
        return false;
      }
      const slots = row.varietySlots || [];
      if (!slots.length) {
        Toast.error(`Select at least one variety${label} · किमान एक वान निवडा`);
        return false;
      }
      for (let j = 0; j < slots.length; j++) {
        const slot = slots[j];
        const vlabel = slots.length > 1 ? `${label} (${slot.ramAgriVarietyName || `variety ${j + 1}`})` : label;
        if (!slot.ramAgriVarietyId) {
          Toast.error(`Invalid variety selection${vlabel}`);
          return false;
        }
        if (!slot.quantity || parseFloat(slot.quantity) <= 0) {
          Toast.error(`Please enter valid quantity${vlabel}`);
          return false;
        }
        if (!slot.rate || parseFloat(slot.rate) <= 0) {
          Toast.error(`Please enter valid rate${vlabel}`);
          return false;
        }
      }
    }
    }

    if (isRamAgriRepUser && !(user?._id || user?.id)) {
      Toast.error("Unable to resolve your user id; please re-login");
      return false;
    }
    if (orderChannel === "B2B" && !selectedMerchantId) {
      Toast.error("Please select a merchant for B2B order");
      return false;
    }
    if (!isRamAgriRepUser && !isDealerSelfUser && !agriSalesPersonId && !isEditMode && orderChannel !== "B2B") {
      Toast.error("Please select sales person");
      return false;
    }

    if (!formData.deliveryDate) {
      Toast.error("Please select when to send the order (ऑर्डर कधी पाठवायची)");
      return false;
    }
    if (deliveryTiming === AGRI_DELIVERY_TIMING.CUSTOM && !formData.deliveryDate) {
      Toast.error("Please pick a delivery date (तारीख निवडा)");
      return false;
    }
    if (!toAgriApiDateISO(formData.deliveryDate)) {
      Toast.error("Invalid delivery date. Please choose आज / उद्या or pick a valid date.");
      return false;
    }
    if (!isEditMode && paymentData.paidAmount && parseFloat(paymentData.paidAmount) > 0) {
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

    if (!isEditMode && !isLinkedFlow && ramAgriLimitSummary) {
      const rows = isLinkedFlow ? productLines.slice(0, 1) : productLines;
      const orderTot = rows.reduce(
        (acc, row) =>
          acc +
          (row.varietySlots || []).reduce(
            (s, slot) => s + parseFloat(slot.quantity || 0) * parseFloat(slot.rate || 0),
            0
          ),
        0
      );
      if (
        orderTot > 0 &&
        ramAgriLimitSummary.outstanding + orderTot > ramAgriLimitSummary.limit + 1e-6
      ) {
        Toast.error(
          "Ram Agri sales outstanding limit would be exceeded for the selected sales person. Reduce the order or collect payment (marked collected) before submitting."
        );
        return false;
      }
    }

    return true;
  };

  const handleRequestSubmit = () => {
    if (!validateForm()) return;
    setConfirmSubmitOpen(true);
  };

  const submitAgriOrder = async () => {
    setLoading(true);
    try {
      const buildLineItemsPayload = () => {
        const linesSrc = isLinkedFlow ? productLines.slice(0, 1) : productLines;
        if (isGiftMode) {
          return linesSrc
            .filter((row) => row.productId)
            .map((row) => {
              const product = inventoryGiftProducts.find((p) => p._id === row.productId);
              return {
                isRamAgriProduct: false,
                productId: row.productId,
                productName: row.productName || product?.name || "",
                primaryUnit: product?.primaryUnit?._id || product?.primaryUnit || "",
                conversionFactor: product?.conversionFactor || 1,
                quantity: parseFloat(row.quantity),
                rate: parseFloat(row.rate),
              };
            });
        }
        const items = [];
        linesSrc.forEach((row) => {
          const crop = ramAgriCrops.find((c) => c._id === row.ramAgriCropId);
          (row.varietySlots || []).forEach((slot) => {
            if (!slot.ramAgriVarietyId) return;
            const variety = crop?.varieties?.find((v) => v._id === slot.ramAgriVarietyId);
            items.push({
              isRamAgriProduct: true,
              ramAgriCropId: row.ramAgriCropId,
              ramAgriVarietyId: slot.ramAgriVarietyId,
              ramAgriCropName: row.ramAgriCropName || crop?.cropName || "",
              ramAgriVarietyName: slot.ramAgriVarietyName || variety?.name || "",
              primaryUnit: variety?.primaryUnit?._id || variety?.primaryUnit || "",
              secondaryUnit: variety?.secondaryUnit?._id || variety?.secondaryUnit || null,
              conversionFactor: variety?.conversionFactor || 1,
              quantity: parseFloat(slot.quantity),
              rate: parseFloat(slot.rate),
            });
          });
        });
        return items;
      };

      const lineItems = buildLineItemsPayload();

      const payload = {
        customerName: formData.customerName.trim(),
        customerMobile: formData.customerMobile,
        customerVillage: formData.customerVillage || "",
        customerTaluka: formData.customerTaluka || "",
        customerDistrict: formData.customerDistrict || "",
        customerState: formData.customerState || "Maharashtra",
        lineItems,
        orderDate: toAgriApiDateISO(formData.orderDate) || new Date().toISOString(),
        deliveryDate: toAgriApiDateISO(formData.deliveryDate),
        notes: formData.notes || "",
        orderChannel: orderChannel === "B2B" ? "B2B" : "RETAIL",
        ...(orderChannel === "B2B" && selectedMerchantId
          ? { merchant: selectedMerchantId }
          : {}),
      };

      if (isDealerSelfUser) {
        payload.isDealerSelfOrder = true;
      } else if (isRamAgriRepUser) {
        const sid = user?._id || user?.id;
        if (!sid) {
          Toast.error("Unable to resolve your user id; please re-login");
          setLoading(false);
          return;
        }
        payload.salesPerson = sid;
      } else if (agriSalesPersonId) {
        payload.salesPerson = agriSalesPersonId;
      }

      // Add payment if provided (create only)
      if (!isEditMode && paymentData.paidAmount && parseFloat(paymentData.paidAmount) > 0) {
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

      let response;
      if (isEditMode) {
        const instance = NetworkManager(API.INVENTORY.UPDATE_AGRI_SALES_ORDER);
        response = await instance.request(payload, [editOrderId]);
      } else if (isLinkedFlow) {
        const row = productLines[0];
        const linkedInstance = NetworkManager(API.INVENTORY.CREATE_LINKED_AGRI_ORDER);
        if (isGiftMode) {
          response = await linkedInstance.request({
            linkedNurseryOrderId,
            productId: row.productId,
            quantity: parseFloat(row.quantity),
            rate: parseFloat(row.rate),
            notes: payload.notes,
            salesPerson: payload.salesPerson,
          });
        } else {
          const slot0 = row.varietySlots?.[0];
          response = await linkedInstance.request({
            linkedNurseryOrderId,
            ramAgriCropId: row.ramAgriCropId,
            ramAgriVarietyId: slot0?.ramAgriVarietyId,
            quantity: parseFloat(slot0?.quantity),
            rate: parseFloat(slot0?.rate),
            notes: payload.notes,
            salesPerson: payload.salesPerson,
          });
        }
      } else {
        const instance = NetworkManager(API.INVENTORY.CREATE_AGRI_SALES_ORDER);
        response = await instance.request(payload);
      }

      if (response?.data) {
        Toast.success(
          isEditMode
            ? "Ram Agri Input order updated successfully"
            : isLinkedFlow
            ? "Linked Agri Inputs added successfully"
            : "Agri Sales Order created successfully"
        );
        const orderDoc = response?.data?.data || response?.data;
        const totalAmountComputed = (() => {
          const rows = isLinkedFlow ? productLines.slice(0, 1) : productLines;
          return rows.reduce(
            (acc, row) =>
              acc +
              (row.varietySlots || []).reduce(
                (s, slot) => s + parseFloat(slot.quantity || 0) * parseFloat(slot.rate || 0),
                0
              ),
            0
          );
        })();
        const row0 = productLines[0];
        const slot0 = row0?.varietySlots?.[0];
        const paidAmt = parseFloat(paymentData.paidAmount || 0);
        const createdAgriOrderPayload = {
          _id: orderDoc?._id,
          orderNumber: orderDoc?.orderNumber || orderDoc?.orderId,
          customerName: formData.customerName?.trim() || orderDoc?.customerName || "",
          customerMobile: formData.customerMobile || orderDoc?.customerMobile || "",
          customerVillage: formData.customerVillage || "",
          productName: row0?.ramAgriCropName || "",
          varietyName: slot0?.ramAgriVarietyName || "",
          quantity: parseFloat(slot0?.quantity) || 0,
          rate: parseFloat(slot0?.rate) || 0,
          total: totalAmountComputed,
          paidAmt,
          remainingAmt: totalAmountComputed - paidAmt,
          deliveryDate: formData.deliveryDate ? (formData.deliveryDate instanceof Date ? formData.deliveryDate.toLocaleDateString() : formData.deliveryDate) : "",
          linkedNurseryOrderId: linkedNurseryOrderId || null,
        };
        handleClose();
        onSuccess?.(isEditMode ? { ...createdAgriOrderPayload, _id: editOrderId } : createdAgriOrderPayload);
      }
    } catch (error) {
      console.error("Error saving order:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        (isEditMode ? "Failed to update order" : "Failed to create order");
      Toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setConfirmSubmitOpen(false);
    await submitAgriOrder();
  };

  const handleClose = () => {
    setConfirmSubmitOpen(false);
    setDeliveryTiming(AGRI_DELIVERY_TIMING.TODAY);
    setFormData({
      customerName: "",
      customerMobile: "",
      customerVillage: "",
      customerTaluka: "",
      customerDistrict: "",
      customerState: "Maharashtra",
      orderDate: new Date(),
      deliveryDate: resolveAgriDeliveryDate(AGRI_DELIVERY_TIMING.TODAY, null, new Date()),
      notes: "",
    });
    setProductType("seed");
    setProductLines([emptyProductLine("seed")]);
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
    setAgriSalesPersonId("");
    setRamAgriLimitSummary(null);
    setOrderChannel("RETAIL");
    setSelectedMerchantId("");
    onClose();
  };

  const totalAmount = (() => {
    const rows = isLinkedFlow ? productLines.slice(0, 1) : productLines;
    return rows.reduce(
      (acc, row) =>
        acc +
        (row.varietySlots || []).reduce(
          (s, slot) => s + parseFloat(slot.quantity || 0) * parseFloat(slot.rate || 0),
          0
        ),
      0
    );
  })();
  const paidAmount = parseFloat(paymentData.paidAmount || 0);
  const balanceAmount = totalAmount - paidAmount;

  const ramAgriNewOrderUnpaidExposure = totalAmount;
  const ramAgriCreditBlocksSubmit =
    !isEditMode &&
    !isLinkedFlow &&
    ramAgriLimitSummary &&
    totalAmount > 0 &&
    ramAgriLimitSummary.outstanding + ramAgriNewOrderUnpaidExposure > ramAgriLimitSummary.limit + 1e-6;
  const ramAgriCreditShowAlert =
    !isLinkedFlow && ramAgriLimitSummary && (ramAgriLimitSummary.overLimit || ramAgriCreditBlocksSubmit);

  const searchableDropdownSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      backgroundColor: "#fff",
      "& fieldset": {
        borderColor: "#cfd8dc",
        borderWidth: 1.2,
      },
      "&:hover fieldset": {
        borderColor: "#4caf50",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#2e7d32",
        borderWidth: 2,
      },
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: "#2e7d32",
    },
  };

  // Form content (shared between Dialog and standalone modes)
  const formContent = (
    <Box sx={isStandalone ? { p: { xs: 1, sm: 1.5 }, maxWidth: "100%" } : {}} className={!isStandalone ? classes.formContainer : ""}>
          {/* Customer Information */}
          <Typography className={classes.sectionTitle}>
            <PersonIcon /> Customer Information
          </Typography>
          {!isLinkedFlow && !isDealerSelfUser && (
            <AgriOrderPartyChannel
              orderChannel={orderChannel}
              onOrderChannelChange={handleOrderChannelChange}
              merchants={merchants}
              selectedMerchantId={selectedMerchantId}
              onMerchantChange={handleMerchantSelect}
              loadingMerchants={loadingMerchants}
            />
          )}
          {isLinkedFlow && (
            <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
              Linked with nursery order #
              {linkedNurseryOrder?.order || linkedNurseryOrder?.details?.publicOrderCode || linkedNurseryOrderId}.
              Customer and delivery date are prefilled from that order.
            </Alert>
          )}

          {ramAgriCreditShowAlert && (
            <Alert severity="error" sx={{ mb: 1, py: 0.5 }}>
              {ramAgriLimitSummary?.overLimit
                ? `Ram Agri outstanding is already above the limit (₹${Number(
                    ramAgriLimitSummary.outstanding || 0
                  ).toLocaleString("en-IN", { maximumFractionDigits: 2 })} outstanding vs ₹${Number(
                    ramAgriLimitSummary.limit || 0
                  ).toLocaleString("en-IN", { maximumFractionDigits: 2 })} cap). New unpaid orders cannot be placed until outstanding is reduced.`
                : `This order would exceed the Ram Agri outstanding cap for ${
                    ramAgriLimitSummary?.userName || "this sales person"
                  }: current ₹${Number(ramAgriLimitSummary.outstanding || 0).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })} + new unpaid ₹${Number(ramAgriNewOrderUnpaidExposure || 0).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })} exceeds limit ₹${Number(ramAgriLimitSummary.limit || 0).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}.`}
            </Alert>
          )}

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

          <Grid container spacing={1}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                label="Mobile Number *"
                value={formData.customerMobile}
                onChange={(e) => handleInputChange("customerMobile", e.target.value)}
                disabled={isLinkedFlow}
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
                margin="dense"
                label="Customer Name *"
                value={formData.customerName}
                onChange={(e) => handleInputChange("customerName", e.target.value)}
                disabled={isLinkedFlow || !!customerData?.name}
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
                  <Grid container spacing={1}>
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

          {!isRamAgriRepUser && !isDealerSelfUser && orderChannel !== "B2B" && (
            <>
              <Typography className={classes.sectionTitle} sx={{ mt: 0.5 }}>
                <PersonIcon sx={{ fontSize: "1rem" }} /> Sales person
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    sx={searchableDropdownSx}
                    options={ramAgriSalesRepOptions}
                    value={ramAgriSalesRepOptions.find((o) => o.value === agriSalesPersonId) || null}
                    onChange={(_, opt) => setAgriSalesPersonId(opt?.value || "")}
                    getOptionLabel={(o) => o?.label || ""}
                    isOptionEqualToValue={(a, b) => a?.value === b?.value}
                    loading={loading}
                    renderInput={(params) => (
                      <TextField {...params} label="Ram Agri / Sales *" placeholder="Select sales person" />
                    )}
                  />
                </Grid>
              </Grid>
            </>
          )}

          {!isRamAgriRepUser && !isDealerSelfUser && orderChannel === "B2B" && (
            <>
              <Typography className={classes.sectionTitle} sx={{ mt: 0.5 }}>
                <PersonIcon sx={{ fontSize: "1rem" }} /> Sales person (optional)
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    fullWidth
                    size="small"
                    sx={searchableDropdownSx}
                    options={ramAgriSalesRepOptions}
                    value={ramAgriSalesRepOptions.find((o) => o.value === agriSalesPersonId) || null}
                    onChange={(_, opt) => setAgriSalesPersonId(opt?.value || "")}
                    getOptionLabel={(o) => o?.label || ""}
                    isOptionEqualToValue={(a, b) => a?.value === b?.value}
                    loading={loading}
                    renderInput={(params) => (
                      <TextField {...params} label="Ram Agri / Sales" placeholder="Optional attribution" />
                    )}
                  />
                </Grid>
              </Grid>
            </>
          )}

          <Divider sx={{ my: 1 }} />

          {/* Product Information */}
          <Typography className={classes.sectionTitle} sx={{ alignItems: "flex-start", mt: 0.25 }}>
            <PackageIcon sx={{ fontSize: "1rem" }} />{" "}
            {isGiftMode ? "Gift products — भेटवस्तू" : `Ram Agri ${productTypeLabel} — उत्पादने`}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 0.5, ml: 0.25, lineHeight: 1.35, fontSize: "0.7rem" }}
          >
            {isGiftMode
              ? "Inventory gift SKU from category Gifts · linked to plant dispatch."
              : "एकाच पिकासाठी एकाधिक वान (multi). प्रत्येक वानासाठी प्रमाण · सेलर दर auto."}
          </Typography>

          <Grid container spacing={1}>
            <Grid item xs={12}>
              <FormControl component="fieldset" sx={{ mb: 0 }}>
                <RadioGroup
                  row
                  name="ramAgriProductType"
                  value={productType}
                  onChange={handleProductTypeChange}
                  sx={{ flexWrap: "wrap", gap: 0.25, "& .MuiFormControlLabel-root": { mr: 1, my: 0 } }}
                >
                  <FormControlLabel value="seed" control={<Radio size="small" />} label={getRamAgriProductTypeRadioLabel("seed")} />
                  <FormControlLabel value="chemical" control={<Radio size="small" />} label={getRamAgriProductTypeRadioLabel("chemical")} />
                  <FormControlLabel value="gift" control={<Radio size="small" />} label={getRamAgriProductTypeRadioLabel("gift")} />
                </RadioGroup>
              </FormControl>
            </Grid>

            {(isLinkedFlow ? productLines.slice(0, 1) : productLines).map((line, idx) => {
              const selectedCropRow = ramAgriCrops.find((c) => c._id === line.ramAgriCropId);
              const selectedCropOptionRow = selectedCropRow || null;
              const varietyOptions = selectedCropRow?.varieties || [];
              const slots = line.varietySlots || [];
              const selectedVarietyObjects = slots
                .map((s) => varietyOptions.find((v) => String(v._id) === String(s.ramAgriVarietyId)))
                .filter(Boolean);
              const linkedSingleVariety = isLinkedFlow
                ? varietyOptions.find((v) => String(v._id) === String(slots[0]?.ramAgriVarietyId)) || null
                : null;

              const realIndex = isLinkedFlow ? 0 : idx;
              const lineLabel = isLinkedFlow ? "Product" : `Product ${idx + 1}`;
              const lineLabelMr = isLinkedFlow ? "उत्पादन" : `उत्पादन ${idx + 1}`;
              return (
                <Grid item xs={12} key={isLinkedFlow ? "linked-line" : `line-${idx}`}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: { xs: 1, sm: 1.25 },
                      borderRadius: 1.5,
                      borderColor: "divider",
                      bgcolor: "#fff",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700} color="primary.dark">
                        {lineLabel} · {lineLabelMr}
                      </Typography>
                      {!isLinkedFlow && productLines.length > 1 && (
                        <Button
                          size="small"
                          color="error"
                          variant="text"
                          startIcon={<DeleteIcon sx={{ fontSize: 18 }} />}
                          sx={{ minHeight: 32, px: 0.5 }}
                          onClick={() =>
                            setProductLines((prev) => prev.filter((_, i) => i !== realIndex))
                          }
                        >
                          Remove · काढा
                        </Button>
                      )}
                    </Stack>
                    {isGiftMode ? (
                      <Grid container spacing={1}>
                        <Grid item xs={12}>
                          <Autocomplete
                            fullWidth
                            size="small"
                            sx={searchableDropdownSx}
                            options={inventoryGiftProducts}
                            value={
                              inventoryGiftProducts.find((p) => p._id === line.productId) || null
                            }
                            onChange={(_, product) => {
                              setProductLines((prev) => {
                                const next = [...prev];
                                next[realIndex] = {
                                  ...next[realIndex],
                                  productId: product?._id || "",
                                  productName: product?.name || "",
                                  rate:
                                    product?.averagePrice > 0
                                      ? String(product.averagePrice)
                                      : next[realIndex].rate,
                                };
                                return next;
                              });
                            }}
                            getOptionLabel={(option) =>
                              `${option?.code || ""} · ${option?.name || ""}`.trim()
                            }
                            isOptionEqualToValue={(option, value) => option?._id === value?._id}
                            loading={loading}
                            disabled={loading || inventoryGiftProducts.length === 0}
                            noOptionsText="No gift products — add in Inventory → Products (category Gifts)"
                            renderInput={(params) => (
                              <TextField {...params} label="Gift product *" placeholder="Search gift SKU" />
                            )}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Quantity *"
                            value={line.quantity || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProductLines((prev) => {
                                const next = [...prev];
                                next[realIndex] = { ...next[realIndex], quantity: value };
                                return next;
                              });
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            label="Rate *"
                            value={line.rate || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setProductLines((prev) => {
                                const next = [...prev];
                                next[realIndex] = { ...next[realIndex], rate: value };
                                return next;
                              });
                            }}
                          />
                        </Grid>
                      </Grid>
                    ) : (
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={isLinkedFlow ? 12 : 6}>
                        <Autocomplete
                          fullWidth
                          size="small"
                          sx={searchableDropdownSx}
                          options={ramAgriCrops}
                          value={selectedCropOptionRow}
                          onChange={(_, crop) => {
                            updateProductLineCrop(realIndex, crop?._id || "");
                          }}
                          getOptionLabel={(option) =>
                            `${option?.cropName || ""} (${option?.varieties?.length || 0} varieties)`
                          }
                          isOptionEqualToValue={(option, value) => option?._id === value?._id}
                          loading={loading}
                          disabled={loading || ramAgriCrops.length === 0}
                          noOptionsText={
                            loading
                              ? `Loading ${productTypeLabelPlural.toLowerCase()}...`
                              : `No Ram Agri ${productTypeLabelPlural.toLowerCase()} available`
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={`पिक / ${productTypeLabel} *`}
                              placeholder={`Search ${productTypeLabel.toLowerCase()}`}
                            />
                          )}
                        />
                      </Grid>

                      <Grid item xs={12} sm={isLinkedFlow ? 12 : 6}>
                        <Autocomplete
                          multiple={!isLinkedFlow}
                          fullWidth
                          size="small"
                          limitTags={isLinkedFlow ? undefined : 3}
                          ChipProps={
                            isLinkedFlow
                              ? undefined
                              : { size: "small", sx: { maxWidth: { xs: "100%", sm: 200 }, height: 22 } }
                          }
                          sx={{
                            ...searchableDropdownSx,
                            "& .MuiAutocomplete-inputRoot": { flexWrap: "wrap", py: 0.5 },
                          }}
                          options={varietyOptions}
                          value={isLinkedFlow ? linkedSingleVariety || null : selectedVarietyObjects}
                          onChange={(_, val) => {
                            if (isLinkedFlow) {
                              handleVarietyMultiChange(realIndex, val ? [val] : []);
                            } else {
                              handleVarietyMultiChange(realIndex, val || []);
                            }
                          }}
                          getOptionLabel={(option) => option?.name || ""}
                          isOptionEqualToValue={(option, value) => option?._id === value?._id}
                          loading={loading}
                          disabled={loading || !line.ramAgriCropId || !varietyOptions.length}
                          disableCloseOnSelect={!isLinkedFlow}
                          noOptionsText={
                            !line.ramAgriCropId
                              ? `आधी ${productTypeLabel.toLowerCase()} निवडा`
                              : `No varieties for this ${productTypeLabel.toLowerCase()}`
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label={
                                isLinkedFlow
                                  ? "वान · Variety *"
                                  : "वान · Varieties (multi) *"
                              }
                              placeholder={
                                isLinkedFlow ? "One variety" : "Select one or more varieties"
                              }
                            />
                          )}
                        />
                      </Grid>

                      {slots.length > 0 && (
                        <Grid item xs={12}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mb: 0.5, display: "block", fontSize: "0.65rem" }}
                          >
                            प्रमाण व दर · per variety
                          </Typography>
                          <Stack spacing={0.75}>
                            {slots.map((slot, sidx) => (
                              <Paper
                                key={slot.ramAgriVarietyId || `slot-${sidx}`}
                                variant="outlined"
                                sx={{ p: { xs: 0.75, sm: 1 }, bgcolor: "#fafafa", borderRadius: 1 }}
                              >
                                <Typography
                                  variant="caption"
                                  fontWeight={700}
                                  color="primary.dark"
                                  display="block"
                                  sx={{ fontSize: "0.7rem", mb: 0.25 }}
                                >
                                  {slot.ramAgriVarietyName || "Variety"}
                                </Typography>
                                <Grid container spacing={0.75}>
                                  <Grid item xs={6} sm={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      margin="dense"
                                      label="प्रमाण · Qty *"
                                      type="number"
                                      value={slot.quantity}
                                      onChange={(e) =>
                                        updateVarietySlot(realIndex, sidx, { quantity: e.target.value })
                                      }
                                      inputProps={{ min: 0.01, step: 0.01 }}
                                      placeholder="Qty"
                                    />
                                  </Grid>
                                  <Grid item xs={6} sm={6}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      margin="dense"
                                      label="दर · Rate *"
                                      type="number"
                                      value={slot.rate}
                                      disabled
                                      inputProps={{ min: 0, step: 0.01 }}
                                      title="सेलर दर · Auto"
                                    />
                                  </Grid>
                                </Grid>
                              </Paper>
                            ))}
                          </Stack>
                        </Grid>
                      )}
                    </Grid>
                    )}
                  </Paper>
                </Grid>
              );
            })}

            {!isLinkedFlow && (
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  size="small"
                  startIcon={<AddIcon fontSize="small" />}
                  onClick={() => setProductLines((prev) => [...prev, emptyProductLine()])}
                  sx={{
                    py: { xs: 0.75, sm: 1 },
                    borderStyle: "dashed",
                    borderWidth: 1.5,
                    justifyContent: "flex-start",
                    textAlign: "left",
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.25 }}>
                    <Typography variant="body2" component="span" fontWeight={600}>
                      आणखी एक प्रॉडक्ट जोडा
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Add another product line
                    </Typography>
                  </Box>
                </Button>
              </Grid>
            )}

            {totalAmount > 0 && (
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: { xs: 0.75, sm: 1 },
                    borderRadius: 1.5,
                    background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                    border: "1px solid #90caf9",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
                    एकूण रक्कम · Total: <strong>₹{totalAmount.toLocaleString()}</strong>
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
                  renderInput={(params) => <TextField {...params} fullWidth size="small" margin="dense" />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <AgriDeliveryTimingField
                deliveryTiming={deliveryTiming}
                onDeliveryTimingChange={handleDeliveryTimingChange}
                deliveryDate={formData.deliveryDate}
                onDeliveryDateChange={handleDeliveryDateChange}
                orderDate={formData.orderDate}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                margin="dense"
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                multiline
                minRows={1}
                maxRows={3}
                placeholder="Additional notes or remarks"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }} />

          {/* Payment Information — create only; use order modal Payments tab when editing */}
          {!isEditMode && (
          <>
          <Typography className={classes.sectionTitle}>Payment Information (Optional)</Typography>

          <Grid container spacing={1}>
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
          </>
          )}
        </Box>
  );

  // Action buttons (shared between Dialog and standalone modes)
  const actionButtons = (
    <Box sx={{ p: { xs: 2, sm: 3 }, borderTop: "1px solid #e0e0e0", display: "flex", gap: 2, justifyContent: "flex-end", flexWrap: "wrap" }}>
      <Button
        onClick={handleClose}
        color="secondary"
        disabled={loading}
        variant={isStandalone ? "outlined" : "text"}
        sx={isStandalone ? { width: { xs: "100%", sm: "auto" } } : undefined}
      >
        Cancel
      </Button>
      <Button
        onClick={handleRequestSubmit}
        variant="contained"
        color="primary"
        disabled={loading || ramAgriCreditBlocksSubmit}
        startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
        sx={isStandalone ? { width: { xs: "100%", sm: "auto" } } : undefined}
      >
        {loading ? "Creating..." : "Review & create · तपासून तयार करा"}
      </Button>
    </Box>
  );

  const summaryFlatLines = (() => {
    const rows = isLinkedFlow ? productLines.slice(0, 1) : productLines;
    const out = [];
    rows.forEach((row) => {
      const cropName =
        row.ramAgriCropName ||
        ramAgriCrops.find((c) => c._id === row.ramAgriCropId)?.cropName ||
        "—";
      (row.varietySlots || []).forEach((slot) => {
        if (!slot.ramAgriVarietyId) return;
        const qty = parseFloat(slot.quantity || 0);
        const rate = parseFloat(slot.rate || 0);
        out.push({
          cropName,
          varietyName: slot.ramAgriVarietyName || "—",
          qty,
          rate,
          lineTot: qty * rate,
        });
      });
    });
    return out;
  })();

  const orderConfirmDialog = (
    <Dialog
      open={confirmSubmitOpen}
      onClose={() => !loading && setConfirmSubmitOpen(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
        },
      }}
    >
      <DialogTitle
        sx={{
          background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
          py: { xs: 1.25, sm: 2 },
          px: { xs: 1.5, sm: 3 },
          borderBottom: "1px solid rgba(46,125,50,0.2)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: { xs: 26, sm: 32 } }} />
          <Box>
            <Typography variant="h6" component="div" fontWeight={700}>
              Confirm order
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ऑर्डर तपासून पुष्टी करा · Quick summary before submit
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: { xs: 1.5, sm: 3 }, pb: 1, px: { xs: 1.5, sm: 3 } }}>
        <Stack spacing={{ xs: 1.25, sm: 2 }}>
          {ramAgriCreditBlocksSubmit && (
            <Alert severity="error">
              Cannot create: Ram Agri outstanding limit exceeded for this sales person. Adjust the order or collect
              verified payment first.
            </Alert>
          )}
          <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 2, bgcolor: "#f5f5f5" }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Customer · ग्राहक
            </Typography>
            <Typography variant="body1" fontWeight={700} sx={{ mt: 0.5 }}>
              {formData.customerName?.trim() || "—"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              +91 {formData.customerMobile}
            </Typography>
          </Paper>

          <Typography variant="subtitle2" color="text.secondary">
            Lines · ओळी ({summaryFlatLines.length})
          </Typography>

          {summaryFlatLines.map((line, i) => (
            <Paper key={`sum-${i}`} variant="outlined" sx={{ p: { xs: 1, sm: 1.75 }, borderRadius: 1.5, bgcolor: "#fafafa" }}>
              <Typography variant="caption" color="primary.dark" fontWeight={600}>
                {i + 1}. {line.cropName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {line.varietyName}
              </Typography>
              <Typography variant="body2">
                {line.qty} × ₹{line.rate.toLocaleString("en-IN", { maximumFractionDigits: 2 })} ={" "}
                <Box component="span" fontWeight={700} color="success.dark">
                  ₹{line.lineTot.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </Box>
              </Typography>
            </Paper>
          ))}

          <Paper variant="outlined" sx={{ p: { xs: 1.25, sm: 2 }, borderRadius: 2, bgcolor: "#f5f5f5" }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Send · ऑर्डर कधी पाठवायची
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
              {formatAgriDeliveryTimingLabel(deliveryTiming, formData.deliveryDate)}
            </Typography>
          </Paper>

          <Paper
            sx={{
              p: { xs: 1.25, sm: 2 },
              borderRadius: 2,
              background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
              border: "1px solid #90caf9",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="subtitle2">Total · एकूण</Typography>
              <Typography variant="h6" fontWeight={800} color="primary.dark">
                ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
              </Typography>
            </Stack>
            {paidAmount > 0 && (
              <Stack spacing={0.5} sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed rgba(0,0,0,0.15)" }}>
                <Typography variant="caption">
                  Paid · भरलेले: <strong>₹{paidAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
                </Typography>
                <Typography variant="caption" color={balanceAmount > 0 ? "warning.dark" : "success.dark"}>
                  Balance · उर्वरित: <strong>₹{balanceAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</strong>
                </Typography>
              </Stack>
            )}
          </Paper>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          px: { xs: 1.5, sm: 3 },
          py: { xs: 1.25, sm: 2.5 },
          bgcolor: "#fafafa",
          borderTop: "1px solid #e0e0e0",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Button variant="outlined" size="small" onClick={() => setConfirmSubmitOpen(false)} disabled={loading}>
          Back · परत
        </Button>
        <Button
          variant="contained"
          color="success"
          size="medium"
          onClick={handleConfirmSubmit}
          disabled={loading || ramAgriCreditBlocksSubmit}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
          sx={{ px: { xs: 2, sm: 3 }, fontWeight: 700 }}
        >
          {loading ? "Saving…" : "Confirm & create · निश्चित करा"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // If standalone mode, render without Dialog wrapper
  if (isStandalone) {
    return (
      <>
        <Box sx={{ width: "100%", maxWidth: "100%", backgroundColor: "white", borderRadius: { xs: 0, sm: 2 }, minHeight: "calc(100vh - 64px)" }}>
          {formContent}
          {actionButtons}
        </Box>

        {orderConfirmDialog}

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
        component="div"
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
        {orderConfirmDialog}
      </>
    );
  }

  // Dialog mode (default)
  return (
    <>
      <Dialog open={open} onClose={handleClose} className={classes.dialog} maxWidth="md" fullWidth>
        <DialogTitle component="div" className={classes.dialogTitle}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <AddIcon />
              <Typography variant="h6">
                {isEditMode ? "Ram Agri Input - Edit Order" : "Ram Agri Input - New Order"}
              </Typography>
            </Box>
            <IconButton className={classes.closeButton} onClick={handleClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: { xs: 0.5, sm: 1 }, pt: { xs: 0.5, sm: 1 } }}>{formContent}</DialogContent>
        <DialogActions sx={{ px: { xs: 1, sm: 2 }, py: { xs: 1, sm: 1.25 }, borderTop: "1px solid #e0e0e0", gap: 0.5, flexWrap: "wrap" }}>
          <Button onClick={handleClose} color="secondary" size="small" disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRequestSubmit} variant="contained" color="primary" size="small" disabled={loading || ramAgriCreditBlocksSubmit} startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}>
            {loading
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
              ? "Review & save · तपासून सेव्ह करा"
              : "Review & create · तपासून तयार करा"}
          </Button>
        </DialogActions>
      </Dialog>

      {orderConfirmDialog}

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
          component="div"
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

