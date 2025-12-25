import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
  useMediaQuery,
  useTheme,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Alert,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Logout,
  Refresh,
  Search,
  Phone,
  CalendarToday,
  Add,
  Remove,
  Close,
  Check,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { useUserRole, useIsDispatchManager, useUserData } from "utils/roleUtils";
import { useLogoutModel } from "layout/privateLayout/privateLayout.model";
import { Loader } from "redux/dispatcher/Loader";
import EditOrderModal from "./components/EditOrderModal";

const DispatchedListPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const userRole = useUserRole();
  const userData = useUserData();
  const isDispatchManager = useIsDispatchManager();
  const logoutModel = useLogoutModel();

  // Check if user has access: DISPATCH_MANAGER or SUPER_ADMIN role
  const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN";
  const hasAccess = isDispatchManager || isSuperAdmin;

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [quantityChange, setQuantityChange] = useState(0);
  const [rateChange, setRateChange] = useState(0);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false);
  const [patchLoading, setPatchLoading] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    // Default to last 7 days
    const endDate = moment();
    const startDate = moment().subtract(7, "days");
    return {
      startDate: startDate,
      endDate: endDate,
    };
  });

  // Redirect if user doesn't have access
  useEffect(() => {
    if (userData === undefined || userRole === undefined) return;
    
    if (!hasAccess) {
      Toast.error("Access denied. This page is only for DISPATCH_MANAGER or SUPER_ADMIN.");
      navigate("/u/dashboard", { replace: true });
    }
  }, [userData, userRole, hasAccess, navigate]);

  // Format date for API (DD-MM-YYYY)
  const formatDateForAPI = (date) => {
    return moment(date).format("DD-MM-YYYY");
  };

  // Check if order is past due
  const isPastDue = (order) => {
    const dueDate = order.deliveryDate || order.orderBookingDate;
    if (!dueDate) return false;
    const due = moment(dueDate);
    return due.isBefore(moment(), "day");
  };

  // Fetch orders from API
  const fetchOrders = useCallback(async () => {
    if (!hasAccess || userData === undefined) return;

    setLoading(true);
    try {
      const params = {
        search: searchTerm || "",
        dispatched: true,
        limit: 10000,
        page: 1,
        status: "ACCEPTED,FARM_READY",
      };

      // Add date range if provided
      if (dateRange.startDate && dateRange.endDate) {
        params.startDate = formatDateForAPI(dateRange.startDate);
        params.endDate = formatDateForAPI(dateRange.endDate);
      }

      console.log("[DispatchedListPage] Fetching orders with params:", params);

      const instance = NetworkManager(API.ORDER.GET_ORDERS);
      const response = await instance.request({}, params);

      console.log("[DispatchedListPage] API response:", response);

      if (response?.data?.success || response?.data?.status === "Success" || response?.data?.data) {
        let ordersData = response.data.data?.data || response.data.data || [];

        // Separate past due orders and current orders
        const pastDueOrders = ordersData.filter(isPastDue);
        const currentOrders = ordersData.filter((order) => !isPastDue(order));

        // Sort past due orders by due date (ascending - oldest first)
        pastDueOrders.sort((a, b) => {
          const dateA = moment(a.deliveryDate || a.orderBookingDate);
          const dateB = moment(b.deliveryDate || b.orderBookingDate);
          return dateA.diff(dateB);
        });

        // Sort current orders by due date (ascending)
        currentOrders.sort((a, b) => {
          const dateA = moment(a.deliveryDate || a.orderBookingDate);
          const dateB = moment(b.deliveryDate || b.orderBookingDate);
          return dateA.diff(dateB);
        });

        // Combine: past due first, then current orders
        const sortedOrders = [...pastDueOrders, ...currentOrders];
        setOrders(sortedOrders);
        console.log(`[DispatchedListPage] Loaded ${sortedOrders.length} orders (${pastDueOrders.length} past due)`);
      } else {
        setOrders([]);
        Toast.error("Failed to fetch orders");
      }
    } catch (error) {
      console.error("[DispatchedListPage] Error fetching orders:", error);
      Toast.error(error?.response?.data?.message || "Failed to fetch orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [hasAccess, userData, dateRange.startDate, dateRange.endDate, searchTerm]);

  // Filter orders by search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = orders.filter((order) => {
      const farmerName = order.farmer?.name || "";
      const phoneNumber = order.farmer?.mobileNumber?.toString() || "";
      const orderNumber = order.orderId?.toString() || "";
      const village = order.farmer?.village || "";

      return (
        farmerName.toLowerCase().includes(searchLower) ||
        phoneNumber.includes(searchTerm) ||
        orderNumber.toLowerCase().includes(searchLower) ||
        village.toLowerCase().includes(searchLower)
      );
    });

    setFilteredOrders(filtered);
  }, [orders, searchTerm]);

  // Fetch orders on mount and when filters change
  useEffect(() => {
    if (hasAccess && userData !== undefined) {
      fetchOrders();
    }
  }, [hasAccess, userData, dateRange.startDate, dateRange.endDate, fetchOrders]);

  // Handle logout
  const handleLogout = async () => {
    Loader.show();
    await logoutModel.logout();
    Loader.hide();
    navigate("/auth/login", { replace: true });
  };

  // Handle call button click
  const handleCall = (mobileNumber) => {
    if (mobileNumber && mobileNumber !== "N/A") {
      try {
        // Convert to string and clean the number
        const numberString = mobileNumber?.toString() || String(mobileNumber);
        const cleanNumber = numberString.replace(/[^0-9]/g, "");
        
        if (cleanNumber && cleanNumber.length >= 10) {
          // Use tel: protocol for phone calls
          window.location.href = `tel:${cleanNumber}`;
        } else {
          Toast.error("Invalid phone number");
        }
      } catch (error) {
        console.error("Error calling number:", error);
        Toast.error("Unable to make call");
      }
    }
  };

  // Load slots for a plant and subtype
  const getSlots = async (plantId, subtypeId) => {
    if (!plantId || !subtypeId) return;
    
    setSlotsLoading(true);
    try {
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
      const years = [2025, 2026];
      
      const responses = await Promise.all(
        years.map(year => instance.request({}, { plantId, subtypeId, year }))
      );

      let allSlotsData = [];
      
      responses.forEach((response) => {
        const rawSlots =
          response?.data?.data?.slots ||
          response?.data?.slots ||
          response?.data?.data ||
          [];

        const slotsData = Array.isArray(rawSlots)
          ? rawSlots
          : Array.isArray(rawSlots?.slots)
          ? rawSlots.slots
          : [];

        allSlotsData = [...allSlotsData, ...slotsData];
      });

      if (allSlotsData.length > 0) {
        const processedSlots = allSlotsData
          .map((slot) => {
            const {
              startDay,
              endDay,
              month,
              totalBookedPlants,
              totalPlants,
              availablePlants,
              _id,
            } = slot || {};

            if (!startDay || !endDay) return null;

            const startDateValid = moment(startDay, "DD-MM-YYYY", true).isValid();
            const endDateValid = moment(endDay, "DD-MM-YYYY", true).isValid();

            if (!startDateValid || !endDateValid) return null;

            const start = moment(startDay, "DD-MM-YYYY").format("D");
            const end = moment(endDay, "DD-MM-YYYY").format("D");
            const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY");

            const available = availablePlants !== undefined ? availablePlants : totalPlants - (totalBookedPlants || 0);

            return {
              label: `${start} - ${end} ${monthYear} (${available} available)`,
              value: _id,
              available: available,
              totalPlants: totalPlants,
              totalBookedPlants: totalBookedPlants || 0,
              startDay: startDay,
              endDay: endDay
            };
          })
          .filter((slot) => slot !== null && slot.available > 0);

        setSlots(processedSlots);
      } else {
        setSlots([]);
      }
    } catch (error) {
      console.error("Error loading slots:", error);
      Toast.error("Failed to load available slots");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  // Get slot details for a specific date
  const getSlotDetailsForDate = (selectedDate) => {
    if (!selectedDate || slots.length === 0) return null;

    const selectedMoment = moment(selectedDate);

    for (const slot of slots) {
      if (!slot.startDay || !slot.endDay) continue;

      const slotStart = moment(slot.startDay, "DD-MM-YYYY");
      const slotEnd = moment(slot.endDay, "DD-MM-YYYY");

      if (
        selectedMoment.isSameOrAfter(slotStart, "day") &&
        selectedMoment.isSameOrBefore(slotEnd, "day")
      ) {
        return slot;
      }
    }

    return null;
  };

  // Get slot ID for a specific date
  const getSlotIdForDate = (selectedDate) => {
    const slotDetails = getSlotDetailsForDate(selectedDate);
    return slotDetails ? slotDetails.value : null;
  };

  // Update order
  const patchOrder = async (orderId, patchObj, row) => {
    setPatchLoading(true);

    try {
      const dataToSend = { ...patchObj };

      // Convert deliveryDate to ISO format if it's a Date object
      if (dataToSend.deliveryDate && dataToSend.deliveryDate instanceof Date) {
        dataToSend.deliveryDate = dataToSend.deliveryDate.toISOString();
      }

      // Validate slot capacity if booking slot is being changed
      if (dataToSend.bookingSlot && dataToSend.quantity) {
        const selectedSlot = slots.find((slot) => slot.value === dataToSend.bookingSlot);
        if (selectedSlot) {
          const requestedQuantity = Number(dataToSend.quantity);
          const availableCapacity = selectedSlot.available;

          // If this is the same order, add back its current quantity to available capacity
          const currentOrderQuantity = row?.numberOfPlants || row?.totalPlants || 0;
          const adjustedAvailableCapacity = availableCapacity + currentOrderQuantity;

          if (requestedQuantity > adjustedAvailableCapacity) {
            Toast.error(
              `Insufficient slot capacity. Available: ${adjustedAvailableCapacity}, Requested: ${requestedQuantity}`
            );
            setPatchLoading(false);
            return;
          }
        }
      }

      // Validate quantity changes
      if (dataToSend.quantity) {
        const newQuantity = Number(dataToSend.quantity);
        if (newQuantity <= 0) {
          Toast.error("Quantity must be greater than 0");
          setPatchLoading(false);
          return;
        }
      }

      const instance = NetworkManager(API.ORDER.UPDATE_ORDER);
      const response = await instance.request({
        ...dataToSend,
        numberOfPlants: dataToSend?.quantity,
        id: orderId,
      });

      if (response?.data?.status === "Success") {
        Toast.success("Order updated successfully");
        handleCloseEditModal();
        await fetchOrders();
      } else {
        Toast.error("Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      Toast.error("Failed to update order");
    } finally {
      setPatchLoading(false);
    }
  };

  // Open edit modal
  const handleOpenEditModal = (order) => {
    setEditingOrder(order);
    setQuantityChange(0);
    setRateChange(0);
    setIsEditModalOpen(true);
    
    // Load slots for this order
    if (order.plantType?.id && order.plantSubtype?.id) {
      getSlots(order.plantType.id, order.plantSubtype.id);
    }
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingOrder(null);
    setQuantityChange(0);
    setRateChange(0);
    setSlots([]);
  };

  // Handle quantity add/subtract
  const handleQuantityChange = (delta) => {
    const currentQuantity = editingOrder?.numberOfPlants || editingOrder?.totalPlants || 0;
    const newQuantity = Math.max(0, currentQuantity + delta);
    setQuantityChange(newQuantity - currentQuantity);
  };

  // Handle direct quantity input
  const handleQuantityInput = (value) => {
    const currentQuantity = editingOrder?.numberOfPlants || editingOrder?.totalPlants || 0;
    const newQuantity = Math.max(0, Number(value) || 0);
    setQuantityChange(newQuantity - currentQuantity);
  };

  // Handle rate change
  const handleRateChange = (delta) => {
    const currentRate = editingOrder?.rate || 0;
    const newRate = Math.max(0, currentRate + delta);
    setRateChange(newRate - currentRate);
  };

  // Handle direct rate input
  const handleRateInput = (value) => {
    const currentRate = editingOrder?.rate || 0;
    const newRate = Math.max(0, Number(value) || 0);
    setRateChange(newRate - currentRate);
  };

  // Save changes
  const handleSaveChanges = () => {
    if (!editingOrder) return;

    const orderId = editingOrder._id || editingOrder.id;
    const currentQuantity = editingOrder.numberOfPlants || editingOrder.totalPlants || 0;
    const currentRate = editingOrder.rate || 0;
    
    const newQuantity = currentQuantity + quantityChange;
    const newRate = currentRate + rateChange;

    if (newQuantity <= 0) {
      Toast.error("Quantity must be greater than 0");
      return;
    }

    if (newRate <= 0) {
      Toast.error("Rate must be greater than 0");
      return;
    }

    const updateData = {
      quantity: newQuantity,
      rate: newRate,
    };

    // Include delivery date and booking slot if changed
    if (editingOrder.deliveryDate) {
      updateData.deliveryDate = editingOrder.deliveryDate instanceof Date 
        ? editingOrder.deliveryDate.toISOString()
        : editingOrder.deliveryDate;
    }
    
    if (editingOrder.bookingSlot?.[0]?.slotId) {
      updateData.bookingSlot = editingOrder.bookingSlot[0].slotId;
    }

    patchOrder(orderId, updateData, editingOrder);
  };

  // Handle delivery date selection from modal
  const handleDeliveryDateSelect = (date, slotId) => {
    if (!editingOrder) return;
    
    setEditingOrder({
      ...editingOrder,
      deliveryDate: date,
      bookingSlot: [{ slotId }],
    });
    setShowDeliveryDateModal(false);
    Toast.success(`Delivery date set to ${moment(date).format("DD MMM YYYY")}`);
  };

  // Show loading while user data is being fetched
  if (userData === undefined || userRole === undefined) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </div>
    );
  }

  // Don't render if access is denied (will redirect)
  if (!hasAccess) {
    return null;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#f5f5f5",
          pb: isMobile ? 12 : 4,
        }}
      >
        {/* AppBar */}
        <AppBar
          position="sticky"
          sx={{
            background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <Toolbar sx={{ px: isMobile ? 2 : 3, minHeight: 64 }}>
            <Typography
              variant="h6"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                fontSize: "1.25rem",
                letterSpacing: "-0.02em",
              }}
            >
              Dispatch Orders
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              sx={{
                ml: 1,
                p: 1,
                borderRadius: 1.5,
                transition: "all 0.2s",
                "&:hover": { 
                  bgcolor: "rgba(255,255,255,0.15)",
                  transform: "scale(1.05)",
                },
              }}
              title="Logout"
            >
              <Logout sx={{ fontSize: "1.5rem" }} />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ px: isMobile ? 1 : 1.5, pt: 1.5 }}>
          {/* Search and Filters Section */}
          <Paper
            sx={{
              p: isMobile ? 2 : 2.5,
              mb: 2,
              bgcolor: "white",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Search by name, phone, order number, or village..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{
                mb: 2,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "rgba(0,0,0,0.02)",
                  transition: "all 0.2s",
                  "&:hover": {
                    bgcolor: "rgba(0,0,0,0.04)",
                  },
                  "&.Mui-focused": {
                    bgcolor: "white",
                    boxShadow: "0 0 0 3px rgba(25, 118, 210, 0.1)",
                  },
                },
                "& .MuiInputBase-input": {
                  fontSize: "0.9rem",
                  py: 1,
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: "#1976d2", fontSize: "1.1rem" }} />
                  </InputAdornment>
                ),
              }}
            />

            {/* Date Filters */}
            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 2,
                mb: 2,
              }}
            >
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(newValue) => {
                  setDateRange((prev) => ({
                    ...prev,
                    startDate: newValue || moment().subtract(7, "days"),
                  }));
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    sx: {
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "rgba(0,0,0,0.02)",
                        "&:hover": {
                          bgcolor: "rgba(0,0,0,0.04)",
                        },
                        "&.Mui-focused": {
                          bgcolor: "white",
                          boxShadow: "0 0 0 3px rgba(25, 118, 210, 0.1)",
                        },
                      },
                      "& .MuiInputBase-input": {
                        fontSize: "0.9rem",
                        py: 1,
                      },
                    },
                  },
                }}
                format="DD-MM-YYYY"
              />
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(newValue) => {
                  setDateRange((prev) => ({
                    ...prev,
                    endDate: newValue || moment(),
                  }));
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: "small",
                    sx: {
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "rgba(0,0,0,0.02)",
                        "&:hover": {
                          bgcolor: "rgba(0,0,0,0.04)",
                        },
                        "&.Mui-focused": {
                          bgcolor: "white",
                          boxShadow: "0 0 0 3px rgba(25, 118, 210, 0.1)",
                        },
                      },
                      "& .MuiInputBase-input": {
                        fontSize: "0.9rem",
                        py: 1,
                      },
                    },
                  },
                }}
                format="DD-MM-YYYY"
              />
            </Box>

            {/* Info Alert & Action Buttons */}
            <Box sx={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 2, alignItems: isMobile ? "stretch" : "center" }}>
              <Alert 
                severity="info" 
                sx={{ 
                  flex: 1,
                  borderRadius: 2,
                  border: "1px solid rgba(25, 118, 210, 0.2)",
                  bgcolor: "rgba(25, 118, 210, 0.05)",
                  "& .MuiAlert-message": {
                    fontSize: "0.85rem",
                  },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {formatDateForAPI(dateRange.startDate)} to {formatDateForAPI(dateRange.endDate)} • Past due orders shown at top
                </Typography>
              </Alert>

              {/* Action Buttons */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const endDate = moment();
                    const startDate = moment().subtract(7, "days");
                    setDateRange({ startDate, endDate });
                  }}
                  sx={{ 
                    fontSize: "0.8rem", 
                    px: 2, 
                    py: 0.75,
                    borderRadius: 2,
                    borderColor: "rgba(0,0,0,0.2)",
                    "&:hover": {
                      borderColor: "#1976d2",
                      bgcolor: "rgba(25, 118, 210, 0.05)",
                    },
                  }}
                >
                  7 Days
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const endDate = moment();
                    const startDate = moment().subtract(30, "days");
                    setDateRange({ startDate, endDate });
                  }}
                  sx={{ 
                    fontSize: "0.8rem", 
                    px: 2, 
                    py: 0.75,
                    borderRadius: 2,
                    borderColor: "rgba(0,0,0,0.2)",
                    "&:hover": {
                      borderColor: "#1976d2",
                      bgcolor: "rgba(25, 118, 210, 0.05)",
                    },
                  }}
                >
                  30 Days
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  onClick={fetchOrders}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Refresh sx={{ fontSize: "1rem" }} />}
                  sx={{
                    bgcolor: "#2e7d32",
                    fontSize: "0.85rem",
                    px: 2.5,
                    py: 0.75,
                    borderRadius: 2,
                    fontWeight: 600,
                    boxShadow: "0 2px 8px rgba(46, 125, 50, 0.3)",
                    "&:hover": { 
                      bgcolor: "#1b5e20",
                      boxShadow: "0 4px 12px rgba(46, 125, 50, 0.4)",
                    },
                    "&:disabled": {
                      bgcolor: "rgba(46, 125, 50, 0.5)",
                    },
                  }}
                >
                  Refresh
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Orders List */}
          {loading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1.5, fontSize: "0.875rem" }}>
                Loading orders...
              </Typography>
            </Box>
          ) : filteredOrders.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                No orders found for the selected criteria.
              </Typography>
            </Alert>
          ) : (
            <>
              {/* Summary */}
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                  borderRadius: 2,
                  border: "1px solid rgba(46, 125, 50, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
                  boxShadow: "0 2px 4px rgba(46, 125, 50, 0.1)",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 700,
                    color: "#1b5e20",
                    fontSize: "0.95rem",
                  }}
                >
                  Total: <span style={{ color: "#2e7d32" }}>{filteredOrders.length}</span> orders
                </Typography>
                {filteredOrders.filter(isPastDue).length > 0 && (
                  <Chip
                    label={`${filteredOrders.filter(isPastDue).length} Past Due`}
                    color="error"
                    size="small"
                    sx={{ 
                      fontSize: "0.75rem", 
                      height: 24,
                      fontWeight: 600,
                      boxShadow: "0 2px 4px rgba(211, 47, 47, 0.2)",
                    }}
                  />
                )}
              </Box>

              {/* Orders Cards - Grid Layout */}
              <Box 
                sx={{ 
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                  },
                  gap: 2,
                }}
              >
                {filteredOrders.map((order, index) => {
                  const pastDue = isPastDue(order);
                  const dueDate = order.deliveryDate || order.orderBookingDate;
                  const farmerName = order.farmer?.name || "N/A";
                  const phoneNumber = order.farmer?.mobileNumber?.toString() || "N/A";
                  const village = order.farmer?.village || "N/A";
                  const quantity = order.numberOfPlants || order.totalPlants || 0;
                  const rate = order.rate || 0;
                  const total = quantity * rate;

                  return (
                    <Paper
                      key={order._id || order.id || index}
                      onClick={() => handleOpenEditModal(order)}
                      sx={{
                        p: 2,
                        bgcolor: pastDue ? "rgba(255, 152, 0, 0.08)" : "white",
                        borderRadius: 2,
                        boxShadow: pastDue 
                          ? "0 2px 8px rgba(255, 152, 0, 0.2)" 
                          : "0 2px 8px rgba(0,0,0,0.08)",
                        border: pastDue 
                          ? "1.5px solid rgba(255, 152, 0, 0.4)" 
                          : "1px solid rgba(0,0,0,0.08)",
                        cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        position: "relative",
                        overflow: "hidden",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: "3px",
                          background: pastDue 
                            ? "linear-gradient(90deg, #ff9800, #ff6f00)"
                            : "linear-gradient(90deg, #2e7d32, #4caf50)",
                          opacity: 0.8,
                        },
                        "&:hover": {
                          boxShadow: pastDue
                            ? "0 8px 24px rgba(255, 152, 0, 0.25)"
                            : "0 8px 24px rgba(0,0,0,0.12)",
                          transform: "translateY(-4px)",
                          borderColor: pastDue ? "rgba(255, 152, 0, 0.6)" : "rgba(46, 125, 50, 0.3)",
                        },
                      }}
                    >
                      {/* Header Row - Name and Order ID */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, pb: 1, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              color: pastDue ? "#e65100" : "#1a1a1a",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {farmerName}
                          </Typography>
                          <Chip
                            label={`#${order.orderId || "N/A"}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              bgcolor: "rgba(46, 125, 50, 0.1)",
                              color: "#2e7d32",
                              border: "1px solid rgba(46, 125, 50, 0.2)",
                            }}
                          />
                        </Box>
                        {pastDue && (
                          <Chip
                            label="Past Due"
                            color="error"
                            size="small"
                            sx={{ 
                              fontSize: "0.7rem", 
                              height: 24,
                              fontWeight: 600,
                              boxShadow: "0 2px 4px rgba(211, 47, 47, 0.2)",
                            }}
                          />
                        )}
                      </Box>

                      {/* Info Grid */}
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {/* Phone and Address */}
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                          <Box 
                            sx={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: 0.5,
                              cursor: phoneNumber !== "N/A" ? "pointer" : "default",
                              px: phoneNumber !== "N/A" ? 1 : 0,
                              py: phoneNumber !== "N/A" ? 0.5 : 0,
                              borderRadius: phoneNumber !== "N/A" ? 1 : 0,
                              bgcolor: phoneNumber !== "N/A" ? "rgba(25, 118, 210, 0.08)" : "transparent",
                              transition: "all 0.2s",
                              "&:hover": phoneNumber !== "N/A" ? {
                                bgcolor: "rgba(25, 118, 210, 0.15)",
                                transform: "scale(1.02)",
                              } : {},
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (phoneNumber !== "N/A") {
                                handleCall(phoneNumber);
                              }
                            }}
                          >
                            <Phone sx={{ fontSize: "0.9rem", color: phoneNumber !== "N/A" ? "#1976d2" : "text.secondary" }} />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "0.85rem",
                                color: phoneNumber !== "N/A" ? "#1976d2" : "text.secondary",
                                fontWeight: phoneNumber !== "N/A" ? 700 : 400,
                                userSelect: "none",
                              }}
                            >
                              {phoneNumber}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "text.secondary", mx: 0.25 }}>
                            •
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                            {village}
                            {order.farmer?.taluka && `, ${order.farmer.taluka}`}
                            {order.farmer?.district && `, ${order.farmer.district}`}
                          </Typography>
                        </Box>

                        {/* Delivery Date & Plant */}
                        <Box 
                          sx={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 1, 
                            flexWrap: "wrap",
                            p: 1,
                            bgcolor: "rgba(25, 118, 210, 0.05)",
                            borderRadius: 1.5,
                            border: "1px solid rgba(25, 118, 210, 0.15)",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <CalendarToday sx={{ fontSize: "0.9rem", color: "#1976d2" }} />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                color: "#1976d2",
                              }}
                            >
                              {dueDate ? moment(dueDate).format("DD-MM-YYYY") : "N/A"}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontSize: "0.7rem", color: "rgba(0,0,0,0.3)", mx: 0.5 }}>
                            •
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: "0.8rem",
                              fontWeight: 600,
                            }}
                          >
                            🌱 <span style={{ color: "#2e7d32", fontWeight: 700 }}>{order.plantType?.name || "N/A"}</span> - <span style={{ color: "#1b5e20", fontWeight: 700 }}>{order.plantSubtype?.name || "N/A"}</span>
                          </Typography>
                        </Box>

                        {/* Quantity, Rate, Total */}
                        <Box 
                          sx={{ 
                            display: "flex", 
                            flexWrap: "wrap", 
                            gap: 1, 
                            alignItems: "center",
                            p: 1,
                            bgcolor: "rgba(46, 125, 50, 0.05)",
                            borderRadius: 1.5,
                            border: "1px solid rgba(46, 125, 50, 0.15)",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#1a1a1a" }}>
                            Qty: <span style={{ color: "#2e7d32", fontWeight: 700 }}>{quantity.toLocaleString()}</span>
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: "0.7rem", color: "rgba(0,0,0,0.3)" }}>
                            •
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                            Rate: <span style={{ fontWeight: 600 }}>₹{rate}</span>
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: "0.7rem", color: "rgba(0,0,0,0.3)" }}>
                            •
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1976d2" }}>
                            Total: ₹{total.toLocaleString()}
                          </Typography>
                        </Box>

                        {/* Cavity & Sales Person */}
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                          <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                            Cavity: <span style={{ fontWeight: 600, color: "#1a1a1a" }}>{order.cavity?.name || order.cavity?.cavity || "N/A"}</span>
                          </Typography>
                          {order.salesPerson?.name && (
                            <>
                              <Typography variant="body2" sx={{ fontSize: "0.7rem", color: "rgba(0,0,0,0.3)" }}>
                                •
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: "#0277bd",
                                }}
                              >
                                👤 {order.salesPerson.name}
                              </Typography>
                            </>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </>
          )}
        </Container>

        {/* Edit Order Modal */}
        <Dialog
          open={isEditModalOpen}
          onClose={handleCloseEditModal}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
            },
          }}
        >
          <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="h6">
                Edit Order #{editingOrder?.orderId || "N/A"}
              </Typography>
              <IconButton onClick={handleCloseEditModal} sx={{ color: "white" }}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ mt: 2 }}>
            {editingOrder && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {/* Order Info */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Farmer
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {editingOrder.farmer?.name || "N/A"}
                  </Typography>
                </Box>

                {/* Quantity Section */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Quantity (Plants)
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                    <IconButton
                      color="error"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={patchLoading}
                      sx={{ border: "1px solid", borderColor: "error.main" }}
                    >
                      <Remove />
                    </IconButton>
                    <TextField
                      type="number"
                      value={(editingOrder.numberOfPlants || editingOrder.totalPlants || 0) + quantityChange}
                      onChange={(e) => handleQuantityInput(e.target.value)}
                      inputProps={{ min: 0, style: { textAlign: "center", fontSize: "1.2rem", fontWeight: "bold" } }}
                      sx={{ flex: 1 }}
                      disabled={patchLoading}
                    />
                    <IconButton
                      color="success"
                      onClick={() => handleQuantityChange(1)}
                      disabled={patchLoading}
                      sx={{ border: "1px solid", borderColor: "success.main" }}
                    >
                      <Add />
                    </IconButton>
                  </Box>
                  
                  {/* Quick Add/Subtract Buttons */}
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                      Quick Actions:
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {[100, 500, 700, 1000].map((amount) => (
                        <React.Fragment key={amount}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            onClick={() => handleQuantityChange(-amount)}
                            disabled={patchLoading}
                            sx={{ minWidth: "60px", fontSize: "0.75rem" }}
                          >
                            -{amount}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            onClick={() => handleQuantityChange(amount)}
                            disabled={patchLoading}
                            sx={{ minWidth: "60px", fontSize: "0.75rem" }}
                          >
                            +{amount}
                          </Button>
                        </React.Fragment>
                      ))}
                    </Box>
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Current: {(editingOrder.numberOfPlants || editingOrder.totalPlants || 0).toLocaleString()} plants
                    {quantityChange !== 0 && (
                      <span style={{ color: quantityChange > 0 ? "green" : "red", fontWeight: "bold" }}>
                        {" "}({quantityChange > 0 ? "+" : ""}{quantityChange.toLocaleString()})
                      </span>
                    )}
                  </Typography>
                </Box>

                {/* Rate Section */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Rate (₹ per plant)
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <IconButton
                      color="error"
                      onClick={() => handleRateChange(-0.5)}
                      disabled={patchLoading}
                      sx={{ border: "1px solid", borderColor: "error.main" }}
                    >
                      <Remove />
                    </IconButton>
                    <TextField
                      type="number"
                      value={((editingOrder.rate || 0) + rateChange).toFixed(2)}
                      onChange={(e) => handleRateInput(e.target.value)}
                      inputProps={{ min: 0, step: 0.5, style: { textAlign: "center", fontSize: "1.2rem", fontWeight: "bold" } }}
                      sx={{ flex: 1 }}
                      disabled={patchLoading}
                    />
                    <IconButton
                      color="success"
                      onClick={() => handleRateChange(0.5)}
                      disabled={patchLoading}
                      sx={{ border: "1px solid", borderColor: "success.main" }}
                    >
                      <Add />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Current: ₹{editingOrder.rate || 0}
                    {rateChange !== 0 && (
                      <span style={{ color: rateChange > 0 ? "green" : "red", fontWeight: "bold" }}>
                        {" "}({rateChange > 0 ? "+" : ""}₹{rateChange.toFixed(2)})
                      </span>
                    )}
                  </Typography>
                </Box>

                {/* Delivery Date Section */}
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Delivery Date *
                  </Typography>
                  {slotsLoading ? (
                    <Box sx={{ p: 2, textAlign: "center", bgcolor: "grey.100", borderRadius: 1 }}>
                      <CircularProgress size={20} />
                      <Typography variant="caption" sx={{ ml: 1 }}>
                        Loading available slots...
                      </Typography>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => {
                        if (slots.length > 0) {
                          setShowDeliveryDateModal(true);
                        } else {
                          Toast.info('No available slots found. Please select a different plant/subtype.');
                        }
                      }}
                      disabled={slots.length === 0}
                      sx={{ justifyContent: "flex-start", mb: 1 }}
                    >
                      <CalendarToday sx={{ mr: 1 }} />
                      {editingOrder.deliveryDate
                        ? moment(editingOrder.deliveryDate).format("DD MMM YYYY")
                        : "Click to select delivery date"}
                    </Button>
                  )}
                  
                  {slots.length === 0 && !slotsLoading && (
                    <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
                      No available slots found for this plant/subtype combination
                    </Typography>
                  )}
                  
                  {!slotsLoading && slots.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      Click to select a delivery date from available slots
                    </Typography>
                  )}

                  {/* Show selected date slot information */}
                  {editingOrder?.deliveryDate && (() => {
                    const slotDetails = getSlotDetailsForDate(editingOrder.deliveryDate);
                    if (slotDetails) {
                      const requestedQuantity = (editingOrder.numberOfPlants || editingOrder.totalPlants || 0) + quantityChange;
                      const currentQuantity = editingOrder.numberOfPlants || editingOrder.totalPlants || 0;
                      const quantityChangeAmount = quantityChange;
                      const adjustedAvailable = slotDetails.available + currentQuantity;

                      return (
                        <Box sx={{ mt: 2, p: 2, bgcolor: "info.light", borderRadius: 1, border: "1px solid", borderColor: "info.main" }}>
                          <Typography variant="caption" sx={{ fontWeight: "bold", color: "info.dark", display: "block", mb: 1 }}>
                            📅 Delivery Period: {slotDetails.startDay} - {slotDetails.endDay}
                          </Typography>
                          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1 }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Available Capacity:
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: "bold", color: "success.main" }}>
                                {adjustedAvailable.toLocaleString()}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Requested Quantity:
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                                {requestedQuantity.toLocaleString()}
                              </Typography>
                            </Box>
                          </Box>
                          {quantityChangeAmount !== 0 && (
                            <Typography variant="caption" sx={{ color: quantityChangeAmount > 0 ? "warning.main" : "success.main", display: "block", mb: 1 }}>
                              {quantityChangeAmount > 0 ? "⚠️" : "✅"} Quantity change: {quantityChangeAmount > 0 ? "+" : ""}{quantityChangeAmount.toLocaleString()}
                            </Typography>
                          )}
                          {requestedQuantity > adjustedAvailable && (
                            <Box sx={{ bgcolor: "error.light", p: 1, borderRadius: 0.5, mt: 1 }}>
                              <Typography variant="caption" color="error" sx={{ fontWeight: "bold" }}>
                                ❌ Insufficient capacity! Only {adjustedAvailable.toLocaleString()} available.
                              </Typography>
                            </Box>
                          )}
                          {requestedQuantity <= adjustedAvailable && requestedQuantity > 0 && (
                            <Typography variant="caption" sx={{ color: "success.main", fontWeight: "bold", display: "block", mt: 1 }}>
                              ✅ Sufficient capacity available
                            </Typography>
                          )}
                        </Box>
                      );
                    } else {
                      return (
                        <Box sx={{ mt: 2, p: 1.5, bgcolor: "error.light", borderRadius: 1, border: "1px solid", borderColor: "error.main" }}>
                          <Typography variant="caption" color="error">
                            ⚠️ Selected date does not fall within any available slot
                          </Typography>
                        </Box>
                      );
                    }
                  })()}
                </Box>

                {/* Summary */}
                <Box sx={{ bgcolor: "grey.100", p: 2, borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    New Total
                  </Typography>
                  <Typography variant="h6" color="primary">
                    ₹{(
                      ((editingOrder.numberOfPlants || editingOrder.totalPlants || 0) + quantityChange) *
                      ((editingOrder.rate || 0) + rateChange)
                    ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(editingOrder.numberOfPlants || editingOrder.totalPlants || 0).toLocaleString()} × ₹{editingOrder.rate || 0} = ₹{(
                      (editingOrder.numberOfPlants || editingOrder.totalPlants || 0) * (editingOrder.rate || 0)
                    ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {(quantityChange !== 0 || rateChange !== 0) && (
                      <span style={{ color: "green", fontWeight: "bold" }}>
                        {" → "}
                        {((editingOrder.numberOfPlants || editingOrder.totalPlants || 0) + quantityChange).toLocaleString()} × ₹{((editingOrder.rate || 0) + rateChange).toFixed(2)} = ₹{(
                          ((editingOrder.numberOfPlants || editingOrder.totalPlants || 0) + quantityChange) *
                          ((editingOrder.rate || 0) + rateChange)
                        ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={handleCloseEditModal} disabled={patchLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              disabled={patchLoading || (quantityChange === 0 && rateChange === 0 && !editingOrder?.bookingSlot?.[0]?.slotId)}
              startIcon={patchLoading ? <CircularProgress size={16} /> : null}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delivery Date Picker Modal */}
        {showDeliveryDateModal && (
          <Box
            sx={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1300,
              p: 2,
            }}
            onClick={() => setShowDeliveryDateModal(false)}
          >
            <Paper
              sx={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                overflow: "auto",
                p: 3,
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">Select Delivery Date</Typography>
                <IconButton onClick={() => setShowDeliveryDateModal(false)}>
                  <Close />
                </IconButton>
              </Box>

              {slotsLoading ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CircularProgress />
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    Loading available slots...
                  </Typography>
                </Box>
              ) : slots.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    No available slots found
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {slots.map((slot) => {
                    if (!slot.startDay || !slot.endDay) return null;

                    const slotStart = moment(slot.startDay, "DD-MM-YYYY");
                    const slotEnd = moment(slot.endDay, "DD-MM-YYYY");
                    const dates = [];
                    let currentDate = slotStart.clone();
                    const today = moment().startOf("day");

                    while (currentDate.isSameOrBefore(slotEnd, "day")) {
                      if (currentDate.isSameOrAfter(today, "day")) {
                        dates.push(currentDate.clone());
                      }
                      currentDate.add(1, "day");
                    }

                    if (dates.length === 0) return null;

                    // Calculate adjusted available capacity (add back current order quantity)
                    const currentQuantity = editingOrder?.numberOfPlants || editingOrder?.totalPlants || 0;
                    const requestedQuantity = currentQuantity + quantityChange;
                    const adjustedAvailable = slot.available + currentQuantity;

                    return (
                      <Box key={slot.value} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 3, "&:last-child": { borderBottom: "none" } }}>
                        {/* Slot Header */}
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2, pb: 1.5, borderBottom: "2px solid", borderColor: "primary.light" }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "primary.main",
                              mr: 1.5,
                            }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "primary.main" }}>
                              {slot.label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
                              Available: {slot.available.toLocaleString()} plants
                              {requestedQuantity > 0 && (
                                <span style={{ marginLeft: 8, color: requestedQuantity > adjustedAvailable ? "red" : "green", fontWeight: "bold" }}>
                                  | Requested: {requestedQuantity.toLocaleString()} | Adjusted Available: {adjustedAvailable.toLocaleString()}
                                </span>
                              )}
                            </Typography>
                            {requestedQuantity > adjustedAvailable && (
                              <Alert severity="error" sx={{ mt: 1, py: 0.5 }}>
                                <Typography variant="caption">
                                  ⚠️ Insufficient capacity! Only {adjustedAvailable.toLocaleString()} available for {requestedQuantity.toLocaleString()} requested.
                                </Typography>
                              </Alert>
                            )}
                          </Box>
                        </Box>

                        {/* Dates Grid */}
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "repeat(5, 1fr)",
                              sm: "repeat(7, 1fr)",
                              md: "repeat(9, 1fr)",
                            },
                            gap: 1.5,
                          }}
                        >
                          {dates.map((date) => {
                            const isSelected =
                              editingOrder?.deliveryDate &&
                              moment(editingOrder.deliveryDate).format("YYYY-MM-DD") ===
                                date.format("YYYY-MM-DD");
                            const isToday = date.isSame(today, "day");

                            return (
                              <Button
                                key={date.format("YYYY-MM-DD")}
                                variant={isSelected ? "contained" : "outlined"}
                                onClick={() => {
                                  handleDeliveryDateSelect(date.toDate(), slot.value);
                                }}
                                sx={{
                                  minWidth: "auto",
                                  p: 1.5,
                                  flexDirection: "column",
                                  position: "relative",
                                  bgcolor: isSelected
                                    ? "primary.main"
                                    : isToday
                                    ? "warning.light"
                                    : "transparent",
                                  color: isSelected ? "white" : "text.primary",
                                  borderColor: isToday ? "warning.main" : "divider",
                                  borderWidth: isSelected ? 2 : 1,
                                  "&:hover": {
                                    bgcolor: isSelected ? "primary.dark" : "action.hover",
                                    borderColor: isSelected ? "primary.dark" : "primary.main",
                                  },
                                  transform: isSelected ? "scale(1.05)" : "scale(1)",
                                  transition: "all 0.2s",
                                }}
                              >
                                <Typography variant="caption" sx={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 600 }}>
                                  {date.format("ddd")}
                                </Typography>
                                <Typography variant="h6" sx={{ fontSize: "1.25rem", fontWeight: 600, my: 0.5 }}>
                                  {date.format("DD")}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 600 }}>
                                  {date.format("MMM")}
                                </Typography>
                                {isToday && !isSelected && (
                                  <Chip
                                    label="TODAY"
                                    size="small"
                                    sx={{
                                      position: "absolute",
                                      top: 4,
                                      right: 4,
                                      height: 16,
                                      fontSize: "0.6rem",
                                      fontWeight: "bold",
                                      bgcolor: "warning.main",
                                      color: "white",
                                    }}
                                  />
                                )}
                                {isSelected && (
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      top: 4,
                                      right: 4,
                                      width: 20,
                                      height: 20,
                                      borderRadius: "50%",
                                      bgcolor: "white",
                                      color: "primary.main",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Check sx={{ fontSize: 12 }} />
                                  </Box>
                                )}
                              </Button>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })}
                  
                  {/* Helper Text */}
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      💡 <strong>Tip:</strong> Click on any date to select it as the delivery date. Only dates within available slots are shown.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Paper>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default DispatchedListPage;
