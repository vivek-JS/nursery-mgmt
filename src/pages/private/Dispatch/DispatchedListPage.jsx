import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  Person,
  Map as MapIcon,
  FormatListBulleted,
  ArrowBack,
  Tune,
  ExpandMore,
  ExpandLess,
  Edit,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "lib/muiLocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { useUserRole, useIsDispatchManager, useUserData } from "utils/roleUtils";
import { useLogoutModel } from "layout/privateLayout/privateLayout.model";
import { Loader } from "redux/dispatcher/Loader";
import EditOrderModal from "./components/EditOrderModal";

// Dynamically import OrderMapView to avoid SSR issues with Leaflet
const OrderMapView = lazy(() => import("./components/OrderMapView"));

const DispatchedListPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = useUserRole();
  const userData = useUserData();
  const isDispatchManager = useIsDispatchManager();
  const logoutModel = useLogoutModel();

  // Check if user has access: DISPATCH_MANAGER, ADMIN, or SUPER_ADMIN role
  const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN";
  const isAdmin = userRole === "ADMIN";
  const hasAccess = isDispatchManager || isSuperAdmin || isAdmin;
  const isMobileDispatchEntry = location.pathname.includes("/u/mobile/dispatch-orders");

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const debounceTimerRef = useRef(null);
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
  const [viewMode, setViewMode] = useState("all"); // "all" or "ready_for_dispatch"
  const [displayMode, setDisplayMode] = useState("list"); // "list" or "map"
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [statusChange, setStatusChange] = useState("");
  const [showCallModal, setShowCallModal] = useState(false);
  const [callNote, setCallNote] = useState("");
  const [callOrderId, setCallOrderId] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(!isMobile);
  const [dateRange, setDateRange] = useState(() => {
    // Default to last 7 days
    const endDate = moment();
    const startDate = moment().subtract(7, "days");
    return {
      startDate: startDate,
      endDate: endDate,
    };
  });

  useEffect(() => {
    setShowAdvancedFilters(!isMobile);
  }, [isMobile]);

  // Redirect if user doesn't have access
  useEffect(() => {
    if (userData === undefined || userRole === undefined) return;
    
    if (!hasAccess) {
      Toast.error("Access denied. This page is only for DISPATCH_MANAGER, ADMIN, or SUPER_ADMIN.");
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
        search: debouncedSearchTerm || "",
        // Set dispatched based on whether we're searching
        // When searching, set dispatched=false to search all orders
        dispatched: debouncedSearchTerm?.trim() ? false : true,
        limit: 10000,
        page: 1,
      };

      // Set status based on viewMode
      if (viewMode === "ready_for_dispatch") {
        params.ready_for_dispatch = "true";
        // Remove date filters for ready for dispatch - always fetch all orders regardless of date
        delete params.startDate;
        delete params.endDate;
        // Don't set status filter when using ready_for_dispatch
        delete params.status;
      } else {
        params.status = "ACCEPTED,FARM_READY";
        // Don't send date filters if there's a search term
        // When searching, we want to find orders regardless of date
        if (dateRange.startDate && dateRange.endDate && !debouncedSearchTerm?.trim()) {
          params.startDate = formatDateForAPI(dateRange.startDate);
          params.endDate = formatDateForAPI(dateRange.endDate);
        }
      }

      console.log("[DispatchedListPage] Fetching orders with params:", params);

      const instance = NetworkManager(API.ORDER.GET_ORDERS);
      const response = await instance.request({}, params);

      console.log("[DispatchedListPage] API response:", response);

      if (response?.data?.success || response?.data?.status === "Success" || response?.data?.data) {
        let ordersData = response.data.data?.data || response.data.data || [];

        // Normalize orders: ensure callHistory exists as an array
        ordersData = ordersData.map(order => ({
          ...order,
          callHistory: Array.isArray(order.callHistory) ? order.callHistory : []
        }));

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
        
        // Filter out READY_FOR_DISPATCH orders from main list (unless in ready_for_dispatch view)
        let filteredData = sortedOrders;
        if (viewMode === "all") {
          filteredData = sortedOrders.filter(order => order.orderStatus !== "READY_FOR_DISPATCH");
        }

        setOrders(filteredData);
        console.log(`[DispatchedListPage] Loaded ${filteredData.length} orders (${pastDueOrders.length} past due, viewMode: ${viewMode})`);
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
  }, [hasAccess, userData, dateRange.startDate, dateRange.endDate, debouncedSearchTerm, viewMode]);

  // Debounce search term - update debouncedSearchTerm after user stops typing
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    // Cleanup function to clear timer on unmount or when searchTerm changes
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  // Filter orders by search term (client-side filtering for immediate UI feedback)
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
  }, [hasAccess, userData, dateRange.startDate, dateRange.endDate, debouncedSearchTerm, viewMode, fetchOrders]);

  // Handle logout
  const handleLogout = async () => {
    Loader.show();
    await logoutModel.logout();
    Loader.hide();
    navigate("/auth/login", { replace: true });
  };

  // Handle call button click with note tracking
  // Handle call button click - opens modal and creates initial call history entry
  const handleCallClick = async (order, mobileNumber) => {
    if (mobileNumber && mobileNumber !== "N/A") {
      const orderId = order._id || order.id;
      setCallOrderId(orderId);
      setCallNote("");
      setShowCallModal(true);
      
      // Immediately create a call history entry with current date
      try {
        const instance = NetworkManager(API.ORDER.UPDATE_ORDER);
        const callHistoryEntry = {
          date: new Date().toISOString(),
          calledBy: userData?._id || userData?.id,
          note: "", // Empty note initially, will be updated when "Mark Call Done" is clicked
        };

        const response = await instance.request({
          id: orderId,
          callHistory: callHistoryEntry
        });

        if (response?.data?.status === "Success" || response?.data?.success) {
          // Optimistically update the order in the local state
          setOrders(prevOrders => 
            prevOrders.map(o => {
              if ((o._id || o.id) === orderId) {
                return {
                  ...o,
                  callHistory: [
                    ...(o.callHistory || []),
                    callHistoryEntry
                  ]
                };
              }
              return o;
            })
          );
        }
      } catch (error) {
        console.error("Error creating initial call history:", error);
        // Don't show error to user, just log it
      }
    } else {
      Toast.error("Invalid phone number");
    }
  };

  // Handle actual call initiation
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

  // Update call note - creates a new entry with the note (or updates if note is empty)
  const handleSaveCall = async () => {
    if (!callOrderId) return;

    try {
      const instance = NetworkManager(API.ORDER.UPDATE_ORDER);
      
      // Create a new call history entry with the note
      // If note is empty, we'll still save it (the initial entry was already created)
      const callHistoryEntry = {
        date: new Date().toISOString(),
        calledBy: userData?._id || userData?.id,
        note: callNote || "",
      };

      // Send the call history entry - backend will push it to the array
      const response = await instance.request({
        id: callOrderId,
        callHistory: callHistoryEntry
      });

      if (response?.data?.status === "Success" || response?.data?.success) {
        Toast.success("Call note saved successfully");
        setShowCallModal(false);
        setCallNote("");
        setCallOrderId(null);
        
        // Optimistically update the order in the local state
        setOrders(prevOrders => 
          prevOrders.map(order => {
            if ((order._id || order.id) === callOrderId) {
              return {
                ...order,
                callHistory: [
                  ...(order.callHistory || []),
                  callHistoryEntry
                ]
              };
            }
            return order;
          })
        );
        
        // Refresh orders to get updated call history from server
        setTimeout(() => {
          fetchOrders();
        }, 500);
      } else {
        Toast.error(response?.data?.message || "Failed to save call note");
      }
    } catch (error) {
      console.error("Error saving call note:", error);
      Toast.error(error?.response?.data?.message || "Failed to save call note");
    }
  };

  // Handle shortcut note selection
  const handleShortcutNote = (note) => {
    setCallNote(note);
  };

  // Load slots for a plant and subtype
  const getSlots = async (plantId, subtypeId) => {
    if (!plantId || !subtypeId) return;
    
    setSlotsLoading(true);
    try {
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
      const y = moment().year();
      const years = [y - 1, y, y + 1];
      
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
          .filter((slot) => slot !== null);

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
      const effectiveQuantity =
        dataToSend.numberOfPlants !== undefined
          ? Number(dataToSend.numberOfPlants)
          : Number(dataToSend.quantity);

      // Convert deliveryDate to ISO format if it's a Date object
      if (dataToSend.deliveryDate && dataToSend.deliveryDate instanceof Date) {
        dataToSend.deliveryDate = dataToSend.deliveryDate.toISOString();
      }

      // Validate slot capacity if booking slot is being changed
      if (dataToSend.bookingSlot && Number.isFinite(effectiveQuantity)) {
        const selectedSlot = slots.find((slot) => slot.value === dataToSend.bookingSlot);
        if (selectedSlot) {
          const requestedQuantity = effectiveQuantity;
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
      if (Number.isFinite(effectiveQuantity)) {
        const newQuantity = effectiveQuantity;
        if (newQuantity <= 0) {
          Toast.error("Quantity must be greater than 0");
          setPatchLoading(false);
          return;
        }
      }

      const instance = NetworkManager(API.ORDER.UPDATE_ORDER);
      delete dataToSend.quantity;
      const response = await instance.request({
        ...dataToSend,
        numberOfPlants: effectiveQuantity,
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
      const backendMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      Toast.error(backendMessage || "Failed to update order");
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
    
    // Load slots for this order (API often returns _id, not id)
    const plantId = order.plantType?._id || order.plantType?.id;
    const subtypeId = order.plantSubtype?._id || order.plantSubtype?.id;
    if (plantId && subtypeId) {
      getSlots(plantId, subtypeId);
    }
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingOrder(null);
    setQuantityChange(0);
    setRateChange(0);
    setStatusChange("");
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
      numberOfPlants: newQuantity,
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

    // Include status change if selected
    if (statusChange) {
      updateData.orderStatus = statusChange;
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
    Toast.success(`Delivery date set to ${moment(date).format("DD - MMM-YYYY").toUpperCase()}`);
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
            {isMobileDispatchEntry && (
              <IconButton
                color="inherit"
                onClick={() => navigate("/u/mobile")}
                sx={{ mr: 1, p: 1, borderRadius: 1.5 }}
                title="Back to mobile dashboard"
              >
                <ArrowBack />
              </IconButton>
            )}
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
          {/* Compact Search and Filters Section */}
          <Paper
            sx={{
              p: isMobile ? 1.25 : 2,
              mb: 2,
              bgcolor: "white",
              borderRadius: 2,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
              <TextField
                fullWidth
                placeholder="Search name, phone, order, village..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: "rgba(0,0,0,0.02)",
                  },
                  "& .MuiInputBase-input": {
                    fontSize: "0.85rem",
                    py: 0.85,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: "#2e7d32", fontSize: "1rem" }} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={fetchOrders}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Refresh sx={{ fontSize: "0.95rem" }} />}
                sx={{ minWidth: isMobile ? 88 : 100, textTransform: "none", borderRadius: 2, py: 0.8 }}
              >
                Refresh
              </Button>
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 1 }}>
              <Button
                variant={viewMode === "all" ? "contained" : "outlined"}
                size="small"
                onClick={() => setViewMode("all")}
                sx={{ textTransform: "none", borderRadius: 5, px: 1.5 }}
              >
                All
              </Button>
              <Button
                variant={viewMode === "ready_for_dispatch" ? "contained" : "outlined"}
                size="small"
                onClick={() => setViewMode("ready_for_dispatch")}
                sx={{ textTransform: "none", borderRadius: 5, px: 1.5 }}
              >
                Ready
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                startIcon={<Tune sx={{ fontSize: "1rem" }} />}
                sx={{ textTransform: "none", ml: "auto" }}
              >
                {showAdvancedFilters ? "Hide Filters" : "More Filters"}
              </Button>
            </Box>

            {showAdvancedFilters && (
              <Box sx={{ pt: 0.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    gap: 1,
                    mb: 1.25,
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
                    slotProps={{ textField: { fullWidth: true, size: "small" } }}
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
                    slotProps={{ textField: { fullWidth: true, size: "small" } }}
                    format="DD-MM-YYYY"
                  />
                </Box>

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", mb: 1.25 }}>
                  <Button
                    variant={displayMode === "list" ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setDisplayMode("list")}
                    startIcon={<FormatListBulleted />}
                    sx={{ fontSize: "0.75rem", textTransform: "none", borderRadius: 2 }}
                  >
                    List
                  </Button>
                  <Button
                    variant={displayMode === "map" ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setDisplayMode("map")}
                    startIcon={<MapIcon />}
                    sx={{ fontSize: "0.75rem", textTransform: "none", borderRadius: 2 }}
                  >
                    Map
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const endDate = moment();
                      const startDate = moment().subtract(7, "days");
                      setDateRange({ startDate, endDate });
                    }}
                    sx={{ fontSize: "0.75rem", textTransform: "none", borderRadius: 2 }}
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
                    sx={{ fontSize: "0.75rem", textTransform: "none", borderRadius: 2 }}
                  >
                    30 Days
                  </Button>
                </Box>

                <Alert severity="info" sx={{ borderRadius: 2, py: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.78rem" }}>
                    {viewMode === "ready_for_dispatch"
                      ? "Showing all ready for dispatch orders (date filter skipped)."
                      : `${formatDateForAPI(dateRange.startDate)} to ${formatDateForAPI(dateRange.endDate)} • Past due first`}
                  </Typography>
                </Alert>
              </Box>
            )}
          </Paper>

          {/* Orders List or Map View */}
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
          ) : displayMode === "map" ? (
            <Box sx={{ height: "calc(100vh - 300px)", width: "100%", mt: 2 }}>
              <Suspense fallback={
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                  <CircularProgress />
                </Box>
              }>
                <OrderMapView orders={filteredOrders} />
              </Suspense>
            </Box>
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

              {/* Plant-wise Summary Cards for Ready for Dispatch */}
              {viewMode === "ready_for_dispatch" && filteredOrders.length > 0 && (() => {
                // Group orders by plant type and calculate total plants
                const plantSummary = new Map();
                
                filteredOrders.forEach(order => {
                  const plantType = order.plantType?.name || order.plantName || "Unknown";
                  const plantSubtype = order.plantSubtype?.name || "Unknown";
                  const key = `${plantType} - ${plantSubtype}`;
                  
                  if (!plantSummary.has(key)) {
                    plantSummary.set(key, {
                      plantType: plantType,
                      plantSubtype: plantSubtype,
                      totalPlants: 0,
                      orderCount: 0
                    });
                  }
                  
                  const summary = plantSummary.get(key);
                  const quantity = order.numberOfPlants || order.totalPlants || order.quantity || 0;
                  summary.totalPlants += quantity;
                  summary.orderCount += 1;
                });
                
                const summaryArray = Array.from(plantSummary.values()).sort((a, b) => 
                  b.totalPlants - a.totalPlants
                );
                
                return (
                  <Box sx={{ mb: 3 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 1.5, 
                        fontSize: "0.9rem", 
                        fontWeight: 700,
                        color: "#1b5e20"
                      }}
                    >
                      Delivery summary by plant
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: {
                          xs: "repeat(auto-fill, minmax(140px, 1fr))",
                          sm: "repeat(auto-fill, minmax(160px, 1fr))",
                          md: "repeat(auto-fill, minmax(180px, 1fr))",
                          lg: "repeat(auto-fill, minmax(200px, 1fr))",
                        },
                        gap: 1.5,
                      }}
                    >
                      {summaryArray.map((summary, index) => (
                        <Paper
                          key={index}
                          sx={{
                            p: 1,
                            background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                            borderRadius: 2,
                            border: "1px solid rgba(46, 125, 50, 0.22)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                            transition: "all 0.2s",
                            minWidth: 0,
                            "&:hover": {
                              boxShadow: "0 4px 12px rgba(46, 125, 50, 0.15)",
                              transform: "translateY(-1px)",
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              color: "#1b5e20",
                              fontWeight: 600,
                              fontSize: "0.62rem",
                              mb: 0.35,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={`${summary.plantType} - ${summary.plantSubtype}`}
                          >
                            {summary.plantType} - {summary.plantSubtype}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: "#0d47a1",
                              fontSize: "0.95rem",
                              mb: 0.3,
                              lineHeight: 1.2,
                            }}
                          >
                            {summary.totalPlants.toLocaleString()}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "#424242",
                              fontSize: "0.6rem",
                            }}
                          >
                            {summary.orderCount} {summary.orderCount === 1 ? 'order' : 'orders'}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  </Box>
                );
              })()}

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
                  const orderKey = order._id || order.id || index;
                  const isExpanded = expandedOrderId === orderKey;
                  const pastDue = isPastDue(order);
                  const dueDate = order.deliveryDate || order.orderBookingDate;
                  const bookingDate = order.orderBookingDate || order.createdAt;
                  const farmerName = order.farmer?.name || "N/A";
                  const phoneNumber = order.farmer?.mobileNumber?.toString() || "N/A";
                  const village = order.farmer?.village || "N/A";
                  const quantity = order.numberOfPlants || order.totalPlants || 0;
                  const rate = order.rate || 0;
                  const total = quantity * rate;
                  const totalAmount = order?.totalAmount || total;
                  const payments = Array.isArray(order?.payment) ? order.payment : [];
                  const receivedAmount = payments
                    .filter((p) => p?.paymentStatus === "COLLECTED")
                    .reduce((sum, p) => sum + (p?.paidAmount || 0), 0);
                  const outstandingAmount = Math.max(0, totalAmount - receivedAmount);

                  return (
                    <Paper
                      key={orderKey}
                      onClick={() => setExpandedOrderId((prev) => (prev === orderKey ? null : orderKey))}
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
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {pastDue && (
                            <Chip
                              label="Past Due"
                              color="error"
                              size="small"
                              sx={{ 
                                fontSize: "0.7rem", 
                                height: 24,
                                fontWeight: 700,
                                boxShadow: "0 2px 4px rgba(211, 47, 47, 0.2)",
                              }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(order);
                            }}
                            sx={{ p: 0.4 }}
                            title="Edit order"
                          >
                            <Edit sx={{ fontSize: "1rem" }} />
                          </IconButton>
                        </Box>
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
                            }}
                          >
                            <Phone sx={{ fontSize: "0.9rem", color: phoneNumber !== "N/A" ? "#1b5e20" : "text.secondary" }} />
                            <Typography
                              variant="body2"
                              sx={{
                                fontSize: "0.85rem",
                                color: phoneNumber !== "N/A" ? "#1a1a1a" : "text.secondary",
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

                        {phoneNumber !== "N/A" && (
                          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<Phone sx={{ fontSize: "0.85rem" }} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCall(phoneNumber);
                              }}
                              sx={{
                                textTransform: "none",
                                borderRadius: 1.5,
                                py: 0.25,
                                px: 1,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                minHeight: 30,
                              }}
                            >
                              Call
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCallOrderId(order._id || order.id);
                                setCallNote("");
                                setShowCallModal(true);
                              }}
                              sx={{ textTransform: "none", borderRadius: 1.5, py: 0.25, px: 1, fontSize: "0.72rem", minHeight: 30 }}
                            >
                              Note
                            </Button>
                          </Box>
                        )}

                        {/* Due date & booking */}
                        <Box 
                          sx={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 0.75, 
                            flexWrap: "wrap",
                            py: 0.65,
                            px: 0.85,
                            bgcolor: "rgba(46, 125, 50, 0.08)",
                            borderRadius: 1.25,
                            border: "1px solid rgba(46, 125, 50, 0.2)",
                          }}
                        >
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <CalendarToday sx={{ fontSize: "0.85rem", color: "#2e7d32" }} />
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                color: "#1a1a1a",
                              }}
                            >
                              {dueDate ? moment(dueDate).format("DD - MMM-YYYY").toUpperCase() : "N/A"}
                            </Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontSize: "0.7rem", color: "rgba(0,0,0,0.3)", mx: 0.5 }}>
                            •
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              color: "#6a1b9a",
                            }}
                          >
                            Booking: {bookingDate ? moment(bookingDate).format("DD-MMM-YYYY").toUpperCase() : "N/A"}
                          </Typography>
                        </Box>

                        {/* Plant + Qty + Rate + Total — one row, block-wise */}
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "row",
                            alignItems: "stretch",
                            borderRadius: 1.5,
                            border: "1px solid rgba(46, 125, 50, 0.22)",
                            bgcolor: "rgba(46, 125, 50, 0.07)",
                            overflow: "hidden",
                          }}
                        >
                          {[
                            {
                              label: "Plant",
                              value: `${order.plantType?.name || "N/A"} · ${order.plantSubtype?.name || "N/A"}`,
                              valueSx: { color: "#2e7d32", fontWeight: 700 },
                            },
                            {
                              label: "Qty",
                              value: quantity.toLocaleString(),
                              valueSx: { color: "#1a1a1a", fontWeight: 700 },
                            },
                            {
                              label: "Rate",
                              value: `₹${rate}`,
                              valueSx: { color: "text.primary", fontWeight: 600 },
                            },
                            {
                              label: "Total",
                              value: `₹${total.toLocaleString()}`,
                              valueSx: { color: "#1b5e20", fontWeight: 800 },
                            },
                          ].map((cell, cellIdx) => (
                            <Box
                              key={cell.label}
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                px: { xs: 0.75, sm: 1 },
                                py: 1,
                                borderRight: cellIdx < 3 ? "1px solid rgba(0,0,0,0.1)" : "none",
                                textAlign: "center",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                gap: 0.25,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: "0.62rem",
                                  fontWeight: 600,
                                  color: "text.secondary",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {cell.label}
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: { xs: "0.72rem", sm: "0.8rem" },
                                  lineHeight: 1.25,
                                  wordBreak: "break-word",
                                  ...cell.valueSx,
                                }}
                              >
                                {cell.value}
                              </Typography>
                            </Box>
                          ))}
                        </Box>

                        <Box
                          sx={{
                            p: 0.9,
                            borderRadius: 1.5,
                            border: "1px solid rgba(211,47,47,0.35)",
                            bgcolor: "rgba(211,47,47,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography sx={{ fontSize: "0.76rem", fontWeight: 700, color: "#b71c1c" }}>
                            Outstanding
                          </Typography>
                          <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: "#d32f2f" }}>
                            ₹{outstandingAmount.toLocaleString("en-IN")}
                          </Typography>
                        </Box>

                        {/* Cavity + Salesperson + expand trigger */}
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            <Chip
                              label={`Cavity: ${order.cavity?.name || order.cavity?.cavity || "N/A"}`}
                              size="small"
                              sx={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                height: 24,
                                bgcolor: "rgba(121,85,72,0.12)",
                                color: "#5d4037",
                                border: "1px solid rgba(121,85,72,0.28)",
                              }}
                            />
                            {order.salesPerson?.name && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.35 }}>
                                <Person sx={{ fontSize: "0.8rem", color: "text.secondary" }} />
                                <Typography sx={{ fontSize: "0.7rem", color: "text.primary", fontWeight: 600 }}>
                                  {order.salesPerson.name}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                          <Button
                            size="small"
                            variant="text"
                            endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedOrderId((prev) => (prev === orderKey ? null : orderKey));
                            }}
                            sx={{ textTransform: "none", fontSize: "0.72rem", minWidth: "auto" }}
                          >
                            {isExpanded ? "Hide" : "Details"}
                          </Button>
                        </Box>

                        {isExpanded && (
                          <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 1 }}>
                            {/* Payment entries */}
                            <Box sx={{ p: 1, bgcolor: "rgba(211,47,47,0.04)", borderRadius: 1, border: "1px solid rgba(211,47,47,0.15)" }}>
                              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#b71c1c", mb: 0.6 }}>
                                Payment Entries ({payments.length})
                              </Typography>
                              {payments.length > 0 ? (
                                payments.slice().reverse().slice(0, 4).map((p, pIdx) => (
                                  <Box key={pIdx} sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 0.35, borderBottom: pIdx < Math.min(payments.length, 4) - 1 ? "1px dashed rgba(0,0,0,0.1)" : "none" }}>
                                    <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                                      {p?.paymentDate ? moment(p.paymentDate).format("DD-MMM-YYYY") : "No date"} • {p?.paymentMethod || p?.mode || "N/A"}
                                    </Typography>
                                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: p?.paymentStatus === "COLLECTED" ? "#2e7d32" : "#d32f2f" }}>
                                      ₹{(p?.paidAmount || 0).toLocaleString("en-IN")} {p?.paymentStatus ? `(${p.paymentStatus})` : ""}
                                    </Typography>
                                  </Box>
                                ))
                              ) : (
                                <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>No payment entries yet.</Typography>
                              )}
                            </Box>

                            {/* Call History */}
                            <Box sx={{ p: 0.85, bgcolor: "rgba(46, 125, 50, 0.06)", borderRadius: 1, border: "1px solid rgba(46, 125, 50, 0.15)" }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.35 }}>
                                <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#1b5e20" }}>
                                  Calls ({order.callHistory?.length || 0})
                                </Typography>
                                {phoneNumber !== "N/A" && (
                                  <Button
                                    size="small"
                                    variant="text"
                                    color="success"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCallOrderId(order._id || order.id);
                                      setCallNote("");
                                      setShowCallModal(true);
                                    }}
                                    sx={{ fontSize: "0.62rem", px: 0.5, py: 0.2, minWidth: "auto", textTransform: "none" }}
                                  >
                                    + Add
                                  </Button>
                                )}
                              </Box>
                              {(order.callHistory || [])
                                .filter((call) => call.note && call.note.trim() !== "")
                                .slice(-3)
                                .map((call, idx) => (
                                  <Typography key={idx} sx={{ fontSize: "0.66rem", color: "text.secondary", display: "block", mb: 0.25 }}>
                                    {moment(call.date).format("DD-MM-YYYY HH:mm")} • {call.note}
                                  </Typography>
                                ))}
                              {!(order.callHistory || []).some((call) => call.note && call.note.trim() !== "") && (
                                <Typography sx={{ fontSize: "0.66rem", color: "text.secondary" }}>No call notes yet.</Typography>
                              )}
                            </Box>
                          </Box>
                        )}
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
              borderRadius: 3,
              overflow: "hidden",
              maxHeight: "92vh",
              border: "1px solid rgba(46, 125, 50, 0.2)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            },
          }}
        >
          <DialogTitle
            sx={{
              py: 1.25,
              px: 2,
              background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
              color: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.02em" }}>
                Edit Order #{editingOrder?.orderId || "N/A"}
              </Typography>
              <IconButton onClick={handleCloseEditModal} sx={{ color: "white", p: 0.5 }} size="small">
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 1.5, px: 2, pb: 1, bgcolor: "#f8faf8" }}>
            {editingOrder && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                {/* Order Info */}
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "white",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase" }}>
                    Farmer
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#1a1a1a", mt: 0.25 }}>
                    {editingOrder.farmer?.name || "N/A"}
                  </Typography>
                </Box>

                {/* Quantity Section */}
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "white",
                    border: "1px solid rgba(46, 125, 50, 0.15)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", display: "block", mb: 0.75 }}>
                    Quantity (plants)
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={patchLoading}
                      sx={{ border: "1px solid", borderColor: "error.main", p: 0.5 }}
                    >
                      <Remove sx={{ fontSize: "1.1rem" }} />
                    </IconButton>
                    <TextField
                      type="number"
                      size="small"
                      value={(editingOrder.numberOfPlants || editingOrder.totalPlants || 0) + quantityChange}
                      onChange={(e) => handleQuantityInput(e.target.value)}
                      inputProps={{ min: 0, style: { textAlign: "center", fontSize: "1rem", fontWeight: 700 } }}
                      sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "rgba(46,125,50,0.04)" } }}
                      disabled={patchLoading}
                    />
                    <IconButton
                      color="success"
                      size="small"
                      onClick={() => handleQuantityChange(1)}
                      disabled={patchLoading}
                      sx={{ border: "1px solid", borderColor: "success.main", p: 0.5 }}
                    >
                      <Add sx={{ fontSize: "1.1rem" }} />
                    </IconButton>
                  </Box>
                  
                  {/* Compact quick adjust */}
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, alignItems: "center" }}>
                    <Typography variant="caption" sx={{ fontSize: "0.62rem", fontWeight: 600, color: "text.secondary", width: "100%", mb: 0.25 }}>
                      ± quick
                    </Typography>
                    {[
                      { delta: -500, color: "error" },
                      { delta: -100, color: "error" },
                      { delta: 100, color: "success" },
                      { delta: 500, color: "success" },
                    ].map(({ delta, color }) => (
                      <Button
                        key={delta}
                        size="small"
                        variant="outlined"
                        color={color}
                        onClick={() => handleQuantityChange(delta)}
                        disabled={patchLoading}
                        sx={{ minWidth: "44px", fontSize: "0.65rem", py: 0.2, px: 0.5, borderRadius: 1 }}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </Button>
                    ))}
                  </Box>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", fontSize: "0.7rem" }}>
                    Current: {(editingOrder.numberOfPlants || editingOrder.totalPlants || 0).toLocaleString()} plants
                    {quantityChange !== 0 && (
                      <span style={{ color: quantityChange > 0 ? "#2e7d32" : "#c62828", fontWeight: 700 }}>
                        {" "}({quantityChange > 0 ? "+" : ""}{quantityChange.toLocaleString()})
                      </span>
                    )}
                  </Typography>
                </Box>

                {/* Rate Section */}
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "white",
                    border: "1px solid rgba(46, 125, 50, 0.18)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", display: "block", mb: 0.75 }}>
                    Rate (₹ / plant)
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => handleRateChange(-0.5)}
                      disabled={patchLoading}
                      sx={{ border: "1px solid", borderColor: "error.main", p: 0.5 }}
                    >
                      <Remove sx={{ fontSize: "1.1rem" }} />
                    </IconButton>
                    <TextField
                      type="number"
                      size="small"
                      value={((editingOrder.rate || 0) + rateChange).toFixed(2)}
                      onChange={(e) => handleRateInput(e.target.value)}
                      inputProps={{ min: 0, step: 0.5, style: { textAlign: "center", fontSize: "1rem", fontWeight: 700 } }}
                      sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "rgba(46,125,50,0.06)" } }}
                      disabled={patchLoading}
                    />
                    <IconButton
                      color="success"
                      size="small"
                      onClick={() => handleRateChange(0.5)}
                      disabled={patchLoading}
                      sx={{ border: "1px solid", borderColor: "success.main", p: 0.5 }}
                    >
                      <Add sx={{ fontSize: "1.1rem" }} />
                    </IconButton>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", fontSize: "0.7rem" }}>
                    Current: ₹{editingOrder.rate || 0}
                    {rateChange !== 0 && (
                      <span style={{ color: rateChange > 0 ? "#2e7d32" : "#c62828", fontWeight: 700 }}>
                        {" "}({rateChange > 0 ? "+" : ""}₹{rateChange.toFixed(2)})
                      </span>
                    )}
                  </Typography>
                </Box>

                {/* Delivery Date Section */}
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "white",
                    border: "1px solid rgba(46, 125, 50, 0.18)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", display: "block", mb: 0.75 }}>
                    Delivery date
                  </Typography>
                  {slotsLoading ? (
                    <Box sx={{ p: 1.25, textAlign: "center", bgcolor: "rgba(0,0,0,0.03)", borderRadius: 2 }}>
                      <CircularProgress size={18} sx={{ color: "#2e7d32" }} />
                      <Typography variant="caption" sx={{ ml: 1, fontSize: "0.72rem", color: "text.secondary" }}>
                        Loading slots…
                      </Typography>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      fullWidth
                      size="small"
                      onClick={() => {
                        const plantId = editingOrder.plantType?._id || editingOrder.plantType?.id;
                        const subtypeId = editingOrder.plantSubtype?._id || editingOrder.plantSubtype?.id;
                        if (!plantId || !subtypeId) {
                          Toast.error("Plant or subtype missing on this order.");
                          return;
                        }
                        setShowDeliveryDateModal(true);
                        if (slots.length === 0 && !slotsLoading) {
                          getSlots(plantId, subtypeId);
                        }
                      }}
                      disabled={!(editingOrder.plantType?._id || editingOrder.plantType?.id) || !(editingOrder.plantSubtype?._id || editingOrder.plantSubtype?.id)}
                      sx={{
                        justifyContent: "flex-start",
                        mb: 0.25,
                        borderRadius: 2,
                        textTransform: "none",
                        fontWeight: 600,
                        borderColor: "rgba(46, 125, 50, 0.45)",
                        color: "#1b5e20",
                        py: 0.75,
                        "&:hover": { borderColor: "#2e7d32", bgcolor: "rgba(46, 125, 50, 0.06)" },
                      }}
                    >
                      <CalendarToday sx={{ mr: 1, fontSize: "1rem", color: "#2e7d32" }} />
                    {editingOrder.deliveryDate
                      ? moment(editingOrder.deliveryDate).format("DD - MMM-YYYY").toUpperCase()
                      : "Choose delivery date"}
                    </Button>
                  )}
                  
                  {slots.length === 0 && !slotsLoading && (editingOrder.plantType?._id || editingOrder.plantType?.id) && (editingOrder.plantSubtype?._id || editingOrder.plantSubtype?.id) && (
                    <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary", fontSize: "0.68rem" }}>
                      No open slots for this plant. Tap above to retry or pick another window when slots exist.
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
                        <Box sx={{ mt: 1.25, p: 1.25, bgcolor: "rgba(232, 245, 233, 0.9)", borderRadius: 1.5, border: "1px solid rgba(46, 125, 50, 0.28)" }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "#1b5e20", display: "block", mb: 0.75, fontSize: "0.7rem" }}>
                            Slot window: {slotDetails.startDay} – {slotDetails.endDay}
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

                {/* Status Change Section */}
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: "white",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", display: "block", mb: 0.75 }}>
                    Status
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                    <Button
                      variant={statusChange === "CANCELLED" ? "contained" : "outlined"}
                      color="error"
                      size="small"
                      onClick={() => setStatusChange(statusChange === "CANCELLED" ? "" : "CANCELLED")}
                      disabled={patchLoading}
                      sx={{ fontSize: "0.72rem", textTransform: "none", borderRadius: 2, py: 0.5 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={statusChange === "READY_FOR_DISPATCH" ? "contained" : "outlined"}
                      color="success"
                      size="small"
                      onClick={() => setStatusChange(statusChange === "READY_FOR_DISPATCH" ? "" : "READY_FOR_DISPATCH")}
                      disabled={patchLoading}
                      sx={{ fontSize: "0.72rem", textTransform: "none", borderRadius: 2, py: 0.5 }}
                    >
                      Ready for dispatch
                    </Button>
                  </Box>
                  {statusChange && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: "block", fontSize: "0.68rem" }}>
                      {editingOrder.orderStatus || "N/A"} → {statusChange}
                    </Typography>
                  )}
                </Box>

                {/* Summary */}
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    background: "linear-gradient(135deg, rgba(232,245,233,0.95) 0%, rgba(200,230,201,0.5) 100%)",
                    border: "1px solid rgba(46, 125, 50, 0.25)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "#1b5e20", fontWeight: 700, fontSize: "0.65rem", textTransform: "uppercase" }}>
                    New total
                  </Typography>
                  <Typography sx={{ fontSize: "1.25rem", fontWeight: 800, color: "#1b5e20", mt: 0.25 }}>
                    ₹{(
                      ((editingOrder.numberOfPlants || editingOrder.totalPlants || 0) + quantityChange) *
                      ((editingOrder.rate || 0) + rateChange)
                    ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.68rem", display: "block", mt: 0.25 }}>
                    {(editingOrder.numberOfPlants || editingOrder.totalPlants || 0).toLocaleString()} × ₹{editingOrder.rate || 0} = ₹{(
                      (editingOrder.numberOfPlants || editingOrder.totalPlants || 0) * (editingOrder.rate || 0)
                    ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    {(quantityChange !== 0 || rateChange !== 0) && (
                      <span style={{ color: "#2e7d32", fontWeight: 700 }}>
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
          <DialogActions
            sx={{
              px: 2,
              py: 1.25,
              gap: 1,
              bgcolor: "rgba(0,0,0,0.02)",
              borderTop: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Button onClick={handleCloseEditModal} disabled={patchLoading} size="small" sx={{ textTransform: "none", color: "text.secondary" }}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveChanges}
              disabled={patchLoading || (quantityChange === 0 && rateChange === 0 && !editingOrder?.bookingSlot?.[0]?.slotId && !statusChange)}
              startIcon={patchLoading ? <CircularProgress size={14} color="inherit" /> : null}
              size="small"
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 2,
                background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
                boxShadow: "0 2px 8px rgba(46,125,50,0.35)",
                "&:hover": { background: "linear-gradient(135deg, #1b5e20 0%, #145214 100%)" },
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delivery date picker — Dialog stacks above edit Dialog (portal + z-index) */}
        <Dialog
          open={showDeliveryDateModal}
          onClose={() => setShowDeliveryDateModal(false)}
          maxWidth="md"
          fullWidth
          scroll="paper"
          PaperProps={{
            sx: {
              borderRadius: 3,
              maxHeight: "min(90vh, 720px)",
              border: "1px solid rgba(46, 125, 50, 0.22)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
            },
          }}
        >
          <DialogTitle
            sx={{
              py: 1.1,
              px: 2,
              background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem" }}>Select delivery date</Typography>
            <IconButton onClick={() => setShowDeliveryDateModal(false)} sx={{ color: "white", p: 0.5 }} size="small">
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 0, bgcolor: "#f8faf8" }}>
            <Box sx={{ p: 1.5 }}>
              {slotsLoading ? (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <CircularProgress size={28} sx={{ color: "#2e7d32" }} />
                  <Typography variant="body2" sx={{ mt: 1.5, color: "text.secondary", fontSize: "0.85rem" }}>
                    Loading slots…
                  </Typography>
                </Box>
              ) : slots.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    No slots returned for this plant. Close and try again, or check plant/subtype data.
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                      <Box key={slot.value} sx={{ borderBottom: "1px solid", borderColor: "divider", pb: 2, "&:last-child": { borderBottom: "none", pb: 0 } }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1.25, pb: 1, borderBottom: "1px solid", borderColor: "rgba(46,125,50,0.2)" }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "#2e7d32",
                              mr: 1.25,
                              flexShrink: 0,
                            }}
                          />
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#1b5e20", fontSize: "0.82rem" }}>
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
                              md: "repeat(8, 1fr)",
                            },
                            gap: 1,
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
                                color={isSelected ? "success" : "inherit"}
                                onClick={() => {
                                  handleDeliveryDateSelect(date.toDate(), slot.value);
                                }}
                                sx={{
                                  minWidth: "auto",
                                  p: 1,
                                  flexDirection: "column",
                                  position: "relative",
                                  bgcolor: isSelected
                                    ? "#2e7d32"
                                    : isToday
                                    ? "rgba(255, 183, 77, 0.25)"
                                    : "white",
                                  color: isSelected ? "white" : "text.primary",
                                  borderColor: isToday ? "#f57c00" : "rgba(0,0,0,0.12)",
                                  borderWidth: isSelected ? 2 : 1,
                                  "&:hover": {
                                    bgcolor: isSelected ? "#1b5e20" : "rgba(46,125,50,0.08)",
                                    borderColor: isSelected ? "#1b5e20" : "#2e7d32",
                                  },
                                  transition: "all 0.15s",
                                }}
                              >
                                <Typography variant="caption" sx={{ fontSize: "0.6rem", textTransform: "uppercase", fontWeight: 600 }}>
                                  {date.format("ddd")}
                                </Typography>
                                <Typography sx={{ fontSize: "1.05rem", fontWeight: 700, my: 0.35 }}>
                                  {date.format("DD")}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: "0.58rem", textTransform: "uppercase", fontWeight: 600 }}>
                                  {date.format("MMM")}
                                </Typography>
                                {isToday && !isSelected && (
                                  <Chip
                                    label="Today"
                                    size="small"
                                    sx={{
                                      position: "absolute",
                                      top: 2,
                                      right: 2,
                                      height: 14,
                                      fontSize: "0.55rem",
                                      fontWeight: 700,
                                      bgcolor: "#f57c00",
                                      color: "white",
                                    }}
                                  />
                                )}
                                {isSelected && (
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      top: 2,
                                      right: 2,
                                      width: 18,
                                      height: 18,
                                      borderRadius: "50%",
                                      bgcolor: "white",
                                      color: "#2e7d32",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Check sx={{ fontSize: 11 }} />
                                  </Box>
                                )}
                              </Button>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })}
                  
                  <Alert severity="success" variant="outlined" sx={{ mt: 0.5, borderRadius: 2, py: 0.5, fontSize: "0.75rem", borderColor: "rgba(46,125,50,0.35)", bgcolor: "rgba(232,245,233,0.5)" }}>
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                      Tap a date to apply. Only dates inside an open slot are listed.
                    </Typography>
                  </Alert>
                </Box>
              )}
            </Box>
          </DialogContent>
        </Dialog>

        {/* Call Modal */}
        <Dialog
          open={showCallModal}
          onClose={() => {
            setShowCallModal(false);
            setCallNote("");
            setCallOrderId(null);
          }}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              overflow: "hidden",
              border: "1px solid rgba(46, 125, 50, 0.2)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            },
          }}
        >
          <DialogTitle
            sx={{
              py: 1.25,
              px: 2,
              background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
              color: "white",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Phone sx={{ fontSize: "1.25rem" }} />
              <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>Record call</Typography>
            </Box>
          </DialogTitle>
          <DialogContent sx={{ pt: 1.5, px: 2, pb: 1, bgcolor: "#f8faf8" }}>
            {callOrderId && (() => {
              const order = orders.find(o => (o._id || o.id) === callOrderId);
              const phoneNumber = order?.farmer?.mobileNumber;
              const farmerName = order?.farmer?.name || "N/A";
              
              // Shortcut notes
              const shortcutNotes = [
                "Not reachable",
                "Mobile off",
                "Delivery date changes",
                "Will call back",
                "Confirmed delivery",
                "Postponed",
              ];
              
              return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 2,
                      bgcolor: "white",
                      border: "1px solid rgba(46, 125, 50, 0.2)",
                      borderLeft: "4px solid #2e7d32",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase" }}>
                      Farmer
                    </Typography>
                    <Typography sx={{ fontWeight: 700, fontSize: "1rem", mt: 0.25, color: "#1a1a1a" }}>
                      {farmerName}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                      <Phone sx={{ fontSize: "1rem", color: "#2e7d32" }} />
                      <Typography sx={{ color: "#1a1a1a", fontWeight: 700, fontSize: "0.88rem" }}>
                        {phoneNumber || "N/A"}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "white", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", display: "block", mb: 0.75 }}>
                      Quick notes
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {shortcutNotes.map((note) => (
                        <Chip
                          key={note}
                          label={note}
                          size="small"
                          onClick={() => handleShortcutNote(note)}
                          sx={{
                            cursor: "pointer",
                            fontSize: "0.68rem",
                            height: 26,
                            borderRadius: 1.5,
                            "&:hover": { bgcolor: "rgba(46, 125, 50, 0.12)" },
                          }}
                          variant={callNote === note ? "filled" : "outlined"}
                          color={callNote === note ? "success" : "default"}
                        />
                      ))}
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", display: "block", mb: 0.5 }}>
                      Note
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      size="small"
                      value={callNote}
                      onChange={(e) => setCallNote(e.target.value)}
                      placeholder="Short summary after call..."
                      variant="outlined"
                      sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "white" } }}
                    />
                  </Box>
                </Box>
              );
            })()}
          </DialogContent>
          <DialogActions
            sx={{
              px: 2,
              py: 1.25,
              gap: 0.75,
              flexWrap: "wrap",
              bgcolor: "rgba(0,0,0,0.02)",
              borderTop: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <Button
              size="small"
              onClick={() => {
                setShowCallModal(false);
                setCallNote("");
                setCallOrderId(null);
              }}
              sx={{ textTransform: "none", color: "text.secondary" }}
            >
              Cancel
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                const order = orders.find(o => (o._id || o.id) === callOrderId);
                const phoneNumber = order?.farmer?.mobileNumber;
                if (phoneNumber) {
                  handleCall(phoneNumber);
                }
              }}
              startIcon={<Phone sx={{ fontSize: "1rem" }} />}
              sx={{ textTransform: "none", borderRadius: 2, borderColor: "#2e7d32", color: "#1b5e20" }}
            >
              Call
            </Button>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                handleSaveCall();
              }}
              startIcon={<Check sx={{ fontSize: "1rem" }} />}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 700,
                background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
                boxShadow: "0 2px 8px rgba(46,125,50,0.3)",
                "&:hover": { background: "linear-gradient(135deg, #1b5e20 0%, #145214 100%)" },
              }}
            >
              Save note
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default DispatchedListPage;
