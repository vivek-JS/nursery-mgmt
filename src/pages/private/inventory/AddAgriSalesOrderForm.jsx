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
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import useDebounce from "hooks/useDebounce";
import moment from "moment";
import { makeStyles } from "tss-react/mui";

const useStyles = makeStyles()((theme) => ({
  dialog: {
    "& .MuiDialog-paper": {
      borderRadius: 12,
      maxHeight: "90vh",
      maxWidth: "95vw",
      width: "100%",
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
    padding: "20px 24px",
    [theme.breakpoints.down("sm")]: {
      padding: "16px",
    },
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: "1rem",
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 8,
    color: "#2c3e50",
  },
  customerInfo: {
    padding: 12,
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    marginBottom: 16,
    border: "1px solid #4caf50",
  },
  paymentCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
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
    remark: "",
    receiptPhoto: [],
    isWalletPayment: false,
  });

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
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
          return response.data.media_url;
        })
      );

      setPaymentData((prev) => ({
        ...prev,
        receiptPhoto: [...(prev.receiptPhoto || []), ...uploadedUrls],
      }));

      Toast.success("Images uploaded successfully");
    } catch (error) {
      console.error("Error uploading images:", error);
      Toast.error("Failed to upload images");
    } finally {
      setLoading(false);
    }
  };

  const removePaymentImage = (index) => {
    setPaymentData((prev) => ({
      ...prev,
      receiptPhoto: prev.receiptPhoto.filter((_, i) => i !== index),
    }));
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

    // Check variety stock availability
    const crop = ramAgriCrops.find((c) => c._id === formData.ramAgriCropId);
    if (crop) {
      const variety = crop.varieties?.find((v) => v._id === formData.ramAgriVarietyId);
      if (variety) {
        const currentStock = variety.currentStock || 0;
        const requiredQuantity = parseFloat(formData.quantity);
        if (currentStock < requiredQuantity) {
          Toast.error(`Insufficient stock. Available: ${currentStock}, Required: ${requiredQuantity}`);
          return false;
        }
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
        secondaryUnit: variety?.secondaryUnit?._id || variety?.secondaryUnit || "",
        conversionFactor: variety?.conversionFactor || 1,
        quantity: parseFloat(formData.quantity),
        rate: parseFloat(formData.rate),
        orderDate: formData.orderDate instanceof Date ? formData.orderDate.toISOString() : formData.orderDate,
        deliveryDate: formData.deliveryDate ? (formData.deliveryDate instanceof Date ? formData.deliveryDate.toISOString() : formData.deliveryDate) : null,
        notes: formData.notes || "",
      };

      // Add payment if provided
      if (paymentData.paidAmount && parseFloat(paymentData.paidAmount) > 0) {
        payload.payment = [
          {
            paidAmount: parseFloat(paymentData.paidAmount),
            paymentDate: paymentData.paymentDate,
            modeOfPayment: paymentData.isWalletPayment ? "Wallet" : paymentData.modeOfPayment,
            bankName: paymentData.bankName || "",
            receiptPhoto: paymentData.receiptPhoto || [],
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
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CheckIcon color="success" fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  Customer Found: {customerData.name}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Location: {customerData.village}, {customerData.taluka}, {customerData.district}
              </Typography>
            </Box>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Mobile Number *"
                value={formData.customerMobile}
                onChange={(e) => handleInputChange("customerMobile", e.target.value)}
                inputProps={{ maxLength: 10, pattern: "[0-9]*" }}
                InputProps={{
                  startAdornment: <Box sx={{ mr: 1, color: "text.secondary" }}>+91</Box>,
                  endAdornment: mobileLoading && <CircularProgress size={20} />,
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
                label="Customer Name *"
                value={formData.customerName}
                onChange={(e) => handleInputChange("customerName", e.target.value)}
                disabled={!!customerData?.name}
                placeholder="Enter customer name"
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Village"
                value={formData.customerVillage}
                onChange={(e) => handleInputChange("customerVillage", e.target.value)}
                disabled={!!customerData?.name}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Taluka"
                value={formData.customerTaluka}
                onChange={(e) => handleInputChange("customerTaluka", e.target.value)}
                disabled={!!customerData?.name}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="District"
                value={formData.customerDistrict}
                onChange={(e) => handleInputChange("customerDistrict", e.target.value)}
                disabled={!!customerData?.name}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Product Information */}
          <Typography className={classes.sectionTitle}>
            <PackageIcon /> Ram Agri Product Information
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
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
              <FormControl fullWidth>
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
                        {variety.name} - Stock: {variety.currentStock || 0} {getUnitDisplayName(variety.primaryUnit)}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>

            {selectedVariety && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 1 }}>
                  <Typography variant="caption">
                    <strong>Crop:</strong> {formData.ramAgriCropName} | <strong>Variety:</strong> {formData.ramAgriVarietyName} |{" "}
                    <strong>Stock:</strong> {selectedVariety.currentStock || 0} {getUnitDisplayName(selectedVariety.primaryUnit)} |{" "}
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
                <Box sx={{ p: 2, bgcolor: "#e3f2fd", borderRadius: 1 }}>
                  <Typography variant="body2" color="text.secondary">
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
                  renderInput={(params) => <TextField {...params} fullWidth />}
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
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                multiline
                rows={2}
                placeholder="Additional notes or remarks"
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Payment Information */}
          <Typography className={classes.sectionTitle}>Payment Information (Optional)</Typography>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
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
                label="Payment Date"
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => handlePaymentInputChange("paymentDate", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
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

            <Grid item xs={12}>
              <TextField
                fullWidth
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
                    <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                      {paymentData.receiptPhoto.map((photo, index) => (
                        <Box key={index} sx={{ position: "relative" }}>
                          <img src={photo} alt={`Receipt ${index + 1}`} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 4 }} />
                          <IconButton
                            size="small"
                            onClick={() => removePaymentImage(index)}
                            sx={{ position: "absolute", top: -8, right: -8, bgcolor: "error.main", color: "white", width: 24, height: 24 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              </Grid>
            )}

            {/* Payment Summary */}
            {paidAmount > 0 && (
              <Grid item xs={12}>
                <Box className={classes.paymentCard}>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Payment Summary:
                  </Typography>
                  <Typography variant="body2">
                    Total Amount: <strong>₹{totalAmount.toLocaleString()}</strong>
                  </Typography>
                  <Typography variant="body2">
                    Paid Amount: <strong>₹{paidAmount.toLocaleString()}</strong>
                  </Typography>
                  <Typography variant="body2" color={balanceAmount > 0 ? "text.secondary" : "success.main"}>
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
      <Box sx={{ width: "100%", maxWidth: "100%", backgroundColor: "white", borderRadius: { xs: 0, sm: 2 }, minHeight: "calc(100vh - 64px)" }}>
        {formContent}
        {actionButtons}
      </Box>
    );
  }

  // Dialog mode (default)
  return (
    <Dialog open={open} onClose={handleClose} className={classes.dialog} maxWidth="md" fullWidth>
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
      <DialogContent>{formContent}</DialogContent>
      <DialogActions sx={{ p: 2, borderTop: "1px solid #e0e0e0" }}>
        <Button onClick={handleClose} color="secondary" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading} startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}>
          {loading ? "Creating..." : "Create Order"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddAgriSalesOrderForm;

