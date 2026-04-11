import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
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
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Checkbox,
  Switch,
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
  Tune,
  ExpandMore,
  ExpandLess,
  Edit,
  ContentCut,
  FlashOn as FlashIcon,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "lib/muiLocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { compareAsc } from "date-fns";
import {
  formatDateForAPI,
  formatDateForDisplay,
  parseOrderDate,
  toDeliveryDateISOString,
  isOrderPastDue,
} from "./utils/dateUtils";
import { getCavityDisplayLabel, getCavityIdString } from "utils/cavityDisplay";
import {
  isWhatsappMessagingDisabled,
  setWhatsappMessagingDisabled,
} from "utils/whatsappMessagingPref";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { useUserRole, useIsDispatchManager, useUserData } from "utils/roleUtils";
import { useLogoutModel } from "layout/privateLayout/privateLayout.model";
import { Loader } from "redux/dispatcher/Loader";
import DispatchForm from "../dashboard/DispatchedForm";
import QuickOrderDialog from "./components/QuickOrderDialog";
import SplitOrderDialog from "./components/SplitOrderDialog";

// Dynamically import OrderMapView to avoid SSR issues with Leaflet
const OrderMapView = lazy(() => import("./components/OrderMapView"));

/** Matches FINAL_NURSERY_BE factory.controller DISPATCH_DAY_KEY_TO_OFFSET */
const DISPATCH_DAY_KEY_OFFSET = { TODAY: 0, TOMORROW: 1, DAY_AFTER: 2 };

const resolveOrderDispatchTargetMoment = (order) => {
  if (order?.dispatchTargetDate) {
    const m = moment(order.dispatchTargetDate).startOf("day");
    return m.isValid() ? m : null;
  }
  const key = String(order?.dispatchDayKey || "").toUpperCase();
  const off = DISPATCH_DAY_KEY_OFFSET[key];
  if (off === undefined) return null;
  return moment().startOf("day").clone().add(off, "days");
};

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
  const [dispatchDayKey, setDispatchDayKey] = useState("");
  const [showCallModal, setShowCallModal] = useState(false);
  const [callNote, setCallNote] = useState("");
  const [callOrderId, setCallOrderId] = useState(null);
  const [selectedReadyRows, setSelectedReadyRows] = useState(new Map());
  const [isDispatchFormOpen, setIsDispatchFormOpen] = useState(false);
  const [readyDispatchGroups, setReadyDispatchGroups] = useState([]);
  const [clubLoading, setClubLoading] = useState(false);
  const [readyGroupApiUnavailable, setReadyGroupApiUnavailable] = useState(false);
  const [dispatchList, setDispatchList] = useState([]);
  const [dispatchListLoading, setDispatchListLoading] = useState(false);
  const [dispatchPreviewOpen, setDispatchPreviewOpen] = useState(false);
  const [selectedDispatchPreview, setSelectedDispatchPreview] = useState(null);
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const [quickOrderDispatch, setQuickOrderDispatch] = useState(null); // { _id, label }
  const [splitOrderDialogOpen, setSplitOrderDialogOpen] = useState(false);
  const [splitOrderTarget, setSplitOrderTarget] = useState(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(!isMobile);
  const [whatsappMessagingEnabled, setWhatsappMessagingEnabled] = useState(
    () => !isWhatsappMessagingDisabled()
  );
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

  // Check if order is past due (calendar day vs today; avoids ISO TZ shift)
  const isPastDue = (order) => {
    const dueDate = order.deliveryDate || order.orderBookingDate;
    if (!dueDate) return false;
    return isOrderPastDue(dueDate);
  };

  const getDispatchDayBadge = (order) => {
    const target = resolveOrderDispatchTargetMoment(order);
    if (!target) return null;
    const dateStr = formatDateForDisplay(target.toDate());
    const today = moment().startOf("day");
    const diff = target.diff(today, "days");
    const isNotDispatched = !["DISPATCHED", "COMPLETED"].includes(order?.orderStatus);

    if (diff < 0 && isNotDispatched) {
      return {
        label: `Kaal · ${dateStr}`,
        bg: "rgba(211,47,47,0.15)",
        color: "#b71c1c",
        border: "rgba(211,47,47,0.45)",
        blink: true,
      };
    }
    if (diff === 0) {
      return {
        label: `Aaj · ${dateStr}`,
        bg: "rgba(211,47,47,0.12)",
        color: "#b71c1c",
        border: "rgba(211,47,47,0.4)",
        blink: true,
      };
    }
    if (diff === 1) {
      return {
        label: `Udya · ${dateStr}`,
        bg: "rgba(46,125,50,0.12)",
        color: "#1b5e20",
        border: "rgba(46,125,50,0.4)",
        blink: false,
      };
    }
    if (diff === 2) {
      return {
        label: `Parva · ${dateStr}`,
        bg: "rgba(0,121,107,0.12)",
        color: "#00695c",
        border: "rgba(0,121,107,0.4)",
        blink: false,
      };
    }
    return null;
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
          params.includePastDueBeyondRange = "true";
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
        // parseOrderDate (this app) returns Moment — compareAsc still works (Moment exposes getTime)
        pastDueOrders.sort((a, b) => {
          const dateA = parseOrderDate(a.deliveryDate || a.orderBookingDate);
          const dateB = parseOrderDate(b.deliveryDate || b.orderBookingDate);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return compareAsc(dateA, dateB);
        });

        // Sort current orders by due date (ascending)
        currentOrders.sort((a, b) => {
          const dateA = parseOrderDate(a.deliveryDate || a.orderBookingDate);
          const dateB = parseOrderDate(b.deliveryDate || b.orderBookingDate);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return compareAsc(dateA, dateB);
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

  const fetchDispatchList = useCallback(async () => {
    if (!hasAccess || userData === undefined) return;
    setDispatchListLoading(true);
    try {
      const instance = NetworkManager(API.DISPATCHED.GET_TRAYS);
      const response = await instance.request();
      const rows = response?.data?.data || [];
      setDispatchList(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("[DispatchedListPage] Error fetching dispatch list:", error);
      Toast.error(error?.response?.data?.message || "Failed to fetch dispatch list");
      setDispatchList([]);
    } finally {
      setDispatchListLoading(false);
    }
  }, [hasAccess, userData]);

  const getDispatchCardSummary = useCallback((dispatch) => {
    const ordersInDispatch = Array.isArray(dispatch?.orderIds) ? dispatch.orderIds : [];
    const orderDispatchDetails = Array.isArray(dispatch?.orderDispatchDetails) ? dispatch.orderDispatchDetails : [];
    const qtyByOrderId = new Map(
      orderDispatchDetails
        .filter((d) => d?.orderId)
        .map((d) => [String(d.orderId), Number(d.dispatchQuantity || 0)])
    );

    const totalPlantsFromDetails = orderDispatchDetails.reduce(
      (sum, d) => sum + Number(d?.dispatchQuantity || 0),
      0
    );
    const totalPlantsFromPlants = Array.isArray(dispatch?.plantsDetails)
      ? dispatch.plantsDetails.reduce((sum, p) => sum + Number(p?.quantity || 0), 0)
      : 0;
    const plantsDispatched = totalPlantsFromDetails || totalPlantsFromPlants || 0;

    const totals = ordersInDispatch.reduce(
      (acc, o) => {
        const oid = String(o?._id || "");
        const dispatchedQty = qtyByOrderId.has(oid)
          ? Number(qtyByOrderId.get(oid) || 0)
          : Number(o?.quantity || 0);
        const rate = Number(o?.rate || 0);
        acc.total += dispatchedQty * rate;

        const paidFromPaymentArray = Array.isArray(o?.payment)
          ? o.payment
              .filter((p) => p?.paymentStatus === "COLLECTED")
              .reduce((sum, p) => sum + Number(p?.paidAmount || 0), 0)
          : 0;
        const paidFromLegacyFields = Number(o?.PaidAmt || o?.["Paid Amt"] || 0);
        acc.paid += paidFromPaymentArray || paidFromLegacyFields;
        return acc;
      },
      { total: 0, paid: 0 }
    );
    const totalAmount = Number(totals.total || 0);
    const paidAmount = Number(totals.paid || 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    const pickupRows = (Array.isArray(dispatch?.plantsDetails) ? dispatch.plantsDetails : [])
      .flatMap((plant) => (Array.isArray(plant?.pickupDetails) ? plant.pickupDetails : []))
      .map((p) => {
        const shade = p?.shadeName || p?.shade || "";
        const cavity = p?.cavityName || "";
        return `${shade}${shade && cavity ? " - " : ""}${cavity}`.trim();
      })
      .filter(Boolean);
    const uniquePickupRows = [...new Set(pickupRows)];
    const pickupSummary = uniquePickupRows.length
      ? `${uniquePickupRows.slice(0, 2).join(", ")}${uniquePickupRows.length > 2 ? ` +${uniquePickupRows.length - 2}` : ""}`
      : "N/A";

    return { plantsDispatched, totalAmount, paidAmount, remainingAmount, pickupSummary };
  }, []);

  const mapOrderToDispatchRow = (order) => {
    const quantity = Number(order.numberOfPlants || order.totalPlants || 0);
    const cavityIdStr = getCavityIdString(order.cavity);
    const hasTrayRef = cavityIdStr !== "";
    return {
      order: order.orderId,
      farmerName: order.farmer?.name || "Unknown",
      plantType: `${order.plantType?.name || "Unknown"} -> ${order.plantSubtype?.name || "Unknown"}`,
      quantity,
      Delivery: order.deliveryDate ? formatDateForDisplay(order.deliveryDate) : "-",
      orderDate: order.orderBookingDate ? formatDateForDisplay(order.orderBookingDate) : "-",
      details: {
        orderid: order._id || order.id,
        remainingPlants: Number(order.remainingPlants ?? quantity),
        plantID: order.plantType?._id || order.plantType?.id,
        plantSubtypeID: order.plantSubtype?._id || order.plantSubtype?.id,
        cavity: order.cavity ?? null,
        cavityId: cavityIdStr || undefined,
        cavityName:
          getCavityDisplayLabel(order.cavity) ||
          (hasTrayRef ? "Not specified" : "No tray on order"),
        farmer: order.farmer || null,
      },
    };
  };

  const toggleReadySelection = (order) => {
    const key = String(order._id || order.id || "");
    if (!key) return;
    setSelectedReadyRows((prev) => {
      const next = new Map(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.set(key, mapOrderToDispatchRow(order));
      }
      return next;
    });
  };

  const getReadyDispatchGroups = useCallback(async () => {
    try {
      const instance = NetworkManager(API.READY_DISPATCH_GROUP.GET_ALL);
      const response = await instance.request({}, { status: "DRAFT" });
      const groups = response?.data?.data || [];
      setReadyDispatchGroups(Array.isArray(groups) ? groups : []);
      setReadyGroupApiUnavailable(false);
    } catch (error) {
      if (error?.response?.status === 404) {
        setReadyGroupApiUnavailable(true);
        setReadyDispatchGroups([]);
        return;
      }
      console.error("Error fetching ready dispatch groups:", error);
      setReadyDispatchGroups([]);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "ready_for_dispatch") {
      getReadyDispatchGroups();
    } else {
      setSelectedReadyRows(new Map());
    }
  }, [viewMode, getReadyDispatchGroups]);

  const handleCreateDraftGroup = async () => {
    const selected = Array.from(selectedReadyRows.values());
    if (selected.length === 0) {
      Toast.error("Select at least one order to make draft");
      return;
    }

    setClubLoading(true);
    try {
      const orderIds = selected.map((row) => row?.details?.orderid).filter(Boolean);
      const totalPlants = selected.reduce((sum, row) => sum + Number(row?.quantity || 0), 0);
      if (!readyGroupApiUnavailable) {
        const instance = NetworkManager(API.READY_DISPATCH_GROUP.CREATE);
        await instance.request({
          groups: [
            {
              orderIds,
              capacityMeta: { type: "PLANTS", unit: "plants", max: totalPlants || 0 },
            },
          ],
        });
      } else {
        const localGroup = {
          _id: `local-${Date.now()}`,
          groupCode: `LOCAL-${String(Date.now()).slice(-5)}`,
          orderIds,
          totalPlants,
          capacityMeta: { type: "PLANTS", unit: "plants", max: totalPlants || 0 },
          updatedAt: new Date().toISOString(),
        };
        setReadyDispatchGroups((prev) => [localGroup, ...(Array.isArray(prev) ? prev : [])]);
      }
      Toast.success("Draft group created");
      setSelectedReadyRows(new Map());
      if (!readyGroupApiUnavailable) {
        await getReadyDispatchGroups();
      }
    } catch (error) {
      if (error?.response?.status === 404) {
        setReadyGroupApiUnavailable(true);
        const orderIds = selected.map((row) => row?.details?.orderid).filter(Boolean);
        const totalPlants = selected.reduce((sum, row) => sum + Number(row?.quantity || 0), 0);
        const localGroup = {
          _id: `local-${Date.now()}`,
          groupCode: `LOCAL-${String(Date.now()).slice(-5)}`,
          orderIds,
          totalPlants,
          capacityMeta: { type: "PLANTS", unit: "plants", max: totalPlants || 0 },
          updatedAt: new Date().toISOString(),
        };
        setReadyDispatchGroups((prev) => [localGroup, ...(Array.isArray(prev) ? prev : [])]);
        setSelectedReadyRows(new Map());
        Toast.success("Draft group created (local)");
        return;
      }
      console.error("Error creating draft group:", error);
      Toast.error(error?.response?.data?.message || "Failed to create draft group");
    } finally {
      setClubLoading(false);
    }
  };

  const handleProceedDispatch = () => {
    console.log("[DispatchedListPage] Proceed clicked", {
      selectedCount: selectedReadyRows.size,
      selectedOrderIds: Array.from(selectedReadyRows.keys()),
      viewMode,
    });
    if (selectedReadyRows.size === 0) {
      Toast.error("Select at least one order first, then tap Proceed Dispatch");
      return;
    }
    setIsDispatchFormOpen(true);
  };

  const handleOpenGroupInDispatch = async (group) => {
    try {
      const gid = group?._id || group?.id;
      if (!gid) return;
      if (!readyGroupApiUnavailable && !String(gid).startsWith("local-")) {
        const convertInstance = NetworkManager(API.READY_DISPATCH_GROUP.CONVERT_TO_DISPATCH);
        await convertInstance.request({}, [gid]);
      }

      const groupedIds = (group?.orderIds || [])
        .map((o) => (typeof o === "string" ? o : o?._id))
        .filter(Boolean)
        .map(String);

      const preselected = new Map();
      (filteredOrders || []).forEach((order) => {
        const oid = String(order._id || order.id || "");
        if (groupedIds.includes(oid)) {
          preselected.set(oid, mapOrderToDispatchRow(order));
        }
      });

      if (!preselected.size) {
        Toast.error("No valid orders found in this view for selected group");
        return;
      }

      setSelectedReadyRows(preselected);
      setIsDispatchFormOpen(true);
    } catch (error) {
      if (error?.response?.status === 404) {
        setReadyGroupApiUnavailable(true);
      }
      console.error("Error opening group in dispatch:", error);
      Toast.error(error?.response?.data?.message || "Failed to open group");
    }
  };

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
      if (viewMode === "dispatch_list") {
        fetchDispatchList();
      } else {
        fetchOrders();
      }
    }
  }, [hasAccess, userData, dateRange.startDate, dateRange.endDate, debouncedSearchTerm, viewMode, fetchOrders, fetchDispatchList]);

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
      const y = moment().year();
      const years = [y - 1, y, y + 1];
      const responses = await Promise.all(
        years.map((year) =>
          NetworkManager(API.slots.GET_SIMPLE_SLOTS, false, { abortScope: `y${year}` }).request(
            {},
            { plantId, subtypeId, year }
          )
        )
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

    const parsed = parseOrderDate(selectedDate);
    if (!parsed) return null;
    // parseOrderDate returns native Date; Moment methods need a moment instance
    const selectedMoment = moment(parsed).startOf("day");

    for (const slot of slots) {
      if (!slot.startDay || !slot.endDay) continue;

      const slotStart = moment(slot.startDay, "DD-MM-YYYY").startOf("day");
      const slotEnd = moment(slot.endDay, "DD-MM-YYYY").startOf("day");

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

      if (dataToSend.deliveryDate) {
        const iso = toDeliveryDateISOString(dataToSend.deliveryDate);
        if (iso) dataToSend.deliveryDate = iso;
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
    setDispatchDayKey(order?.dispatchDayKey || "");
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
    setDispatchDayKey("");
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

    if (editingOrder.deliveryDate) {
      const iso = toDeliveryDateISOString(editingOrder.deliveryDate);
      if (iso) updateData.deliveryDate = iso;
    }
    
    if (editingOrder.bookingSlot?.[0]?.slotId) {
      updateData.bookingSlot = editingOrder.bookingSlot[0].slotId;
    }

    // Include status change if selected
    if (statusChange) {
      if (statusChange === "READY_FOR_DISPATCH" && !dispatchDayKey) {
        Toast.error("Please select Aaj / Udya / Parva before setting Ready for dispatch");
        return;
      }
      updateData.orderStatus = statusChange;
      if (statusChange === "READY_FOR_DISPATCH") {
        updateData.dispatchDayKey = dispatchDayKey;
      }
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
    Toast.success(`Delivery date set to ${formatDateForDisplay(date)}`);
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
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={whatsappMessagingEnabled}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setWhatsappMessagingEnabled(on);
                    setWhatsappMessagingDisabled(!on);
                  }}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "rgba(255,255,255,0.5)",
                    },
                  }}
                />
              }
              label={
                <Typography
                  component="span"
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.95)",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    maxWidth: 72,
                    lineHeight: 1.1,
                  }}
                >
                  WA msgs
                </Typography>
              }
              sx={{ mr: 0.5, alignItems: "center", m: 0 }}
            />
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
                onClick={viewMode === "dispatch_list" ? fetchDispatchList : fetchOrders}
                disabled={viewMode === "dispatch_list" ? dispatchListLoading : loading}
                startIcon={
                  viewMode === "dispatch_list"
                    ? (dispatchListLoading ? <CircularProgress size={14} color="inherit" /> : <Refresh sx={{ fontSize: "0.95rem" }} />)
                    : (loading ? <CircularProgress size={14} color="inherit" /> : <Refresh sx={{ fontSize: "0.95rem" }} />)
                }
                sx={{ minWidth: isMobile ? 88 : 100, textTransform: "none", borderRadius: 2, py: 0.8 }}
              >
                {viewMode === "dispatch_list" ? "Refresh List" : "Refresh"}
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
                variant={viewMode === "dispatch_list" ? "contained" : "outlined"}
                size="small"
                onClick={() => setViewMode("dispatch_list")}
                sx={{ textTransform: "none", borderRadius: 5, px: 1.5 }}
              >
                Dispatch List
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

            {viewMode === "dispatch_list" && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
                <Chip size="small" label="View: Grid" sx={{ fontSize: "0.72rem", height: 24 }} />
                <Chip size="small" label="Order Type: Regular Orders" sx={{ fontSize: "0.72rem", height: 24 }} />
              </Box>
            )}

            {showAdvancedFilters && viewMode !== "dispatch_list" && (
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
          {viewMode === "dispatch_list" ? (
            dispatchListLoading ? (
              <Box sx={{ py: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                  <CircularProgress size={18} />
                  <Typography variant="body2" color="textSecondary" sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                    Loading dispatch list...
                  </Typography>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
                  {[...Array(isMobile ? 4 : 6)].map((_, idx) => (
                    <Paper key={`dispatch-loading-${idx}`} sx={{ p: 1.5, borderRadius: 2, border: "1px solid rgba(0,0,0,0.08)" }}>
                      <Skeleton variant="text" width="55%" height={24} />
                      <Skeleton variant="text" width="75%" height={18} />
                      <Skeleton variant="rounded" width="100%" height={70} sx={{ mt: 0.8 }} />
                    </Paper>
                  ))}
                </Box>
              </Box>
            ) : dispatchList.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                  No dispatches found.
                </Typography>
              </Alert>
            ) : (
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)" }, gap: 1.5 }}>
                {dispatchList.map((dispatch, idx) => {
                  const ordersInDispatch = Array.isArray(dispatch?.orderIds) ? dispatch.orderIds : [];
                  const dispatchName = (dispatch?.name || "").trim() || "Unnamed Dispatch";
                  const farmerNames = [
                    ...new Set(
                      ordersInDispatch
                        .map((o) => o?.farmerName || o?.details?.farmer?.name || o?.farmer?.name || "")
                        .filter(Boolean)
                    ),
                  ];
                  const farmerNamesLabel = farmerNames.length ? farmerNames.join(", ") : "N/A";
                  const { plantsDispatched, pickupSummary } = getDispatchCardSummary(dispatch);
                  const status = dispatch?.dispatchStatus || dispatch?.status || "PENDING";
                  const statusStyles =
                    status === "DELIVERED"
                      ? { bg: "rgba(46,125,50,0.14)", color: "#1b5e20", border: "rgba(46,125,50,0.32)" }
                      : status === "IN_TRANSIT"
                        ? { bg: "rgba(2,136,209,0.14)", color: "#01579b", border: "rgba(2,136,209,0.32)" }
                        : status === "CANCELLED"
                          ? { bg: "rgba(211,47,47,0.14)", color: "#b71c1c", border: "rgba(211,47,47,0.35)" }
                          : { bg: "rgba(245,124,0,0.14)", color: "#e65100", border: "rgba(245,124,0,0.3)" };

                  return (
                    <Paper
                      key={dispatch?._id || dispatch?.transportId || idx}
                      onClick={() => {
                        setSelectedDispatchPreview(dispatch);
                        setDispatchPreviewOpen(true);
                      }}
                      sx={{
                        p: 1.45,
                        borderRadius: 2.5,
                        border: "1px solid rgba(46,125,50,0.18)",
                        cursor: "pointer",
                        background: "linear-gradient(180deg, #ffffff 0%, #f2fbf5 100%)",
                        transition: "all 0.2s ease",
                        position: "relative",
                        overflow: "hidden",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: "linear-gradient(90deg, #2e7d32, #66bb6a)",
                        },
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 10px 24px rgba(46,125,50,0.17)",
                          borderColor: "rgba(46,125,50,0.3)",
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.95 }}>
                        <Typography sx={{ fontWeight: 900, fontSize: "0.9rem", color: "#133c26" }}>
                          Dispatch #{dispatch?.transportId || idx + 1}
                        </Typography>
                        <Chip
                          size="small"
                          label={status}
                          sx={{
                            height: 21,
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            bgcolor: statusStyles.bg,
                            color: statusStyles.color,
                            border: `1px solid ${statusStyles.border}`,
                          }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: "0.78rem", color: "#1f2937", fontWeight: 700, mb: 0.6 }}>
                        Farmers: <span style={{ color: "#2e7d32", fontWeight: 800 }}>{farmerNamesLabel}</span>
                      </Typography>
                      <Typography sx={{ fontSize: "0.7rem", color: "#2e7d32", fontWeight: 800, mb: 0.5 }}>
                        {dispatchName}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.6, flexWrap: "wrap", mb: 0.65 }}>
                        <Chip
                          size="small"
                          label={`${ordersInDispatch.length} orders`}
                          sx={{ height: 20, fontSize: "0.64rem", fontWeight: 700, bgcolor: "rgba(13,71,161,0.10)", color: "#0d47a1" }}
                        />
                        <Chip
                          size="small"
                          label={`${plantsDispatched.toLocaleString()} plants`}
                          sx={{ height: 20, fontSize: "0.64rem", fontWeight: 700, bgcolor: "rgba(46,125,50,0.10)", color: "#1b5e20" }}
                        />
                      </Box>
                      <Typography sx={{ fontSize: "0.69rem", color: "#455a64", mb: 0.4 }}>
                        <strong>Driver:</strong> {dispatch?.driverName || "N/A"} • <strong>Vehicle:</strong> {dispatch?.vehicleName || "N/A"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.69rem", color: "#455a64", mb: 0.85 }}>
                        <strong>Pickup:</strong> {pickupSummary}
                      </Typography>
                      <Typography sx={{ fontSize: "0.65rem", color: "#607d8b", mb: 0.7 }}>
                        {dispatch?.createdAt ? moment(dispatch.createdAt).format("DD MMM, hh:mm A") : "N/A"}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.75 }}>
                        <Chip
                          size="small"
                          label="Tap to view details"
                          sx={{
                            height: 23,
                            fontSize: "0.66rem",
                            fontWeight: 800,
                            bgcolor: "rgba(46,125,50,0.12)",
                            color: "#1b5e20",
                            border: "1px solid rgba(46,125,50,0.24)",
                          }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<FlashIcon sx={{ fontSize: "0.9rem" }} />}
                          onClick={(e) => {
                            e.stopPropagation()
                            setQuickOrderDispatch({
                              _id: dispatch._id,
                              label: `Dispatch #${dispatch?.transportId || idx + 1}`,
                            })
                            setQuickOrderOpen(true)
                          }}
                          sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            fontSize: "0.72rem",
                            py: 0.35,
                            px: 1,
                            borderRadius: 1.5,
                            background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
                            "&:hover": { background: "linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)" },
                          }}
                        >
                          Quick Order
                        </Button>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            )
          ) : loading ? (
            <Box sx={{ py: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="textSecondary" sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                  Loading {viewMode === "ready_for_dispatch" ? "Ready" : "All"} orders...
                </Typography>
              </Box>
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
                {[...Array(isMobile ? 4 : 6)].map((_, idx) => (
                  <Paper
                    key={`loading-card-${idx}`}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: "1px solid rgba(0,0,0,0.08)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    }}
                  >
                    <Skeleton variant="text" width="72%" height={26} />
                    <Skeleton variant="text" width="46%" height={18} sx={{ mt: -0.4 }} />
                    <Skeleton variant="rounded" width="100%" height={44} sx={{ mt: 0.8 }} />
                    <Skeleton variant="rounded" width="100%" height={32} sx={{ mt: 0.8 }} />
                    <Skeleton variant="rounded" width="100%" height={40} sx={{ mt: 0.8 }} />
                  </Paper>
                ))}
              </Box>
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
                {viewMode === "ready_for_dispatch" && (
                  <Chip
                    label={`Selected ${selectedReadyRows.size}`}
                    size="small"
                    sx={{
                      fontSize: "0.72rem",
                      height: 24,
                      fontWeight: 700,
                      bgcolor: "rgba(13,71,161,0.12)",
                      color: "#0d47a1",
                      border: "1px solid rgba(13,71,161,0.25)",
                    }}
                  />
                )}
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

              {viewMode === "ready_for_dispatch" && (
                <Box sx={{ mb: isMobile ? 1 : 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCreateDraftGroup}
                    disabled={clubLoading || selectedReadyRows.size === 0}
                    sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
                  >
                    {clubLoading ? "Saving..." : `Make Draft (${selectedReadyRows.size})`}
                  </Button>
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    onClick={handleProceedDispatch}
                    sx={{ textTransform: "none", borderRadius: 2, fontWeight: 700 }}
                  >
                    Proceed Dispatch
                  </Button>
                </Box>
              )}

              {viewMode === "ready_for_dispatch" && readyDispatchGroups.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1b5e20", mb: 1 }}>
                    Clubbed groups
                  </Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2,1fr)" }, gap: 1 }}>
                    {readyDispatchGroups.map((group) => {
                      const gOrders = Array.isArray(group?.orderIds) ? group.orderIds : [];
                      const orderLabels = gOrders
                        .map((o) => {
                          if (typeof o === "string") return o.slice(-6).toUpperCase();
                          return (o?.orderId || o?._id || "").toString().slice(-6).toUpperCase();
                        })
                        .filter(Boolean);
                      return (
                        <Paper key={group?._id || group?.id} sx={{ p: 1.2, borderRadius: 2, border: "1px solid rgba(0,0,0,0.08)" }}>
                          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700 }}>{group?.groupCode || "Group"}</Typography>
                          <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 0.3 }}>
                            {gOrders.length} orders • {Number(group?.totalPlants || 0).toLocaleString()} plants
                          </Typography>
                          <Typography sx={{ fontSize: "0.66rem", color: "text.secondary", mt: 0.2 }}>
                            Capacity: {Number(group?.capacityMeta?.max || 0).toLocaleString()} {group?.capacityMeta?.unit || "plants"}
                          </Typography>
                          {orderLabels.length > 0 && (
                            <Typography sx={{ fontSize: "0.63rem", color: "#546e7a", mt: 0.25 }}>
                              IDs: {orderLabels.slice(0, 3).join(", ")}{orderLabels.length > 3 ? ` +${orderLabels.length - 3}` : ""}
                            </Typography>
                          )}
                          {group?.updatedAt && (
                            <Typography sx={{ fontSize: "0.62rem", color: "#78909c", mt: 0.2 }}>
                              Updated: {moment(group.updatedAt).format("DD MMM, hh:mm A")}
                            </Typography>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            sx={{ mt: 0.8, textTransform: "none", borderRadius: 1.5 }}
                            onClick={() => handleOpenGroupInDispatch(group)}
                          >
                            Open In Dispatch
                          </Button>
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              )}

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
                  const dispatchMetaDriver =
                    order.assignedDriver?.name || order.assignedDriver?.fullName || order.driverName || "N/A";
                  const dispatchMetaVehicle = order.assignedVehicle || order.vehicleName || "N/A";
                  const dispatchMetaRoute = order.routeId || "N/A";
                  const pickupMeta =
                    order.pickupPoint || order.pickupLocation || order.pickupAddress || order.farmer?.village || "N/A";
                  const farmerName = order.farmer?.name || "N/A";
                  const phoneNumber = order.farmer?.mobileNumber?.toString() || "N/A";
                  const village = order.farmer?.village || "N/A";
                  const quantity = order.numberOfPlants || order.totalPlants || 0;
                  const rate = order.rate || 0;
                  const total = quantity * rate;
                  const totalAmount = order?.totalAmount || total;
                  const payments = Array.isArray(order?.payment) ? order.payment : [];
                  const dispatchDayBadge = getDispatchDayBadge(order);
                  const receivedAmount = payments
                    .filter((p) => p?.paymentStatus === "COLLECTED")
                    .reduce((sum, p) => sum + (p?.paidAmount || 0), 0);
                  const outstandingAmount = Math.max(0, totalAmount - receivedAmount);

                  return (
                    <Paper
                      key={orderKey}
                      onClick={() => {
                        if (viewMode === "ready_for_dispatch") {
                          handleOpenEditModal(order);
                        } else {
                          setExpandedOrderId((prev) => (prev === orderKey ? null : orderKey));
                        }
                      }}
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
                          {/* Split badges */}
                          {order.isSplit && order.parentOrderId && (
                            <Chip
                              label="↑ Split"
                              size="small"
                              title={`Split from order ${order.parentOrderId?.orderId || ""}`}
                              sx={{
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                bgcolor: "rgba(230, 81, 0, 0.1)",
                                color: "#e65100",
                                border: "1px solid rgba(230, 81, 0, 0.35)",
                              }}
                            />
                          )}
                          {Array.isArray(order.splitOrderIds) && order.splitOrderIds.length > 0 && (
                            <Chip
                              label={`↓ ${order.splitOrderIds.length} split`}
                              size="small"
                              title={`Split into ${order.splitOrderIds.length} order(s)`}
                              sx={{
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                bgcolor: "rgba(1, 87, 155, 0.1)",
                                color: "#01579b",
                                border: "1px solid rgba(1, 87, 155, 0.35)",
                              }}
                            />
                          )}
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          {viewMode === "ready_for_dispatch" && (
                            <Checkbox
                              size="medium"
                              checked={selectedReadyRows.has(String(order._id || order.id || ""))}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReadySelection(order);
                              }}
                              sx={{
                                p: 0.7,
                                mr: 0.25,
                                "& .MuiSvgIcon-root": { fontSize: "1.25rem" },
                                bgcolor: "rgba(13,71,161,0.06)",
                                borderRadius: 1,
                              }}
                            />
                          )}
                          {dispatchDayBadge && (
                            <Chip
                              label={dispatchDayBadge.label}
                              title={dispatchDayBadge.label}
                              size="small"
                              sx={{
                                fontSize: "0.65rem",
                                height: "auto",
                                minHeight: 22,
                                fontWeight: 800,
                                maxWidth: { xs: 168, sm: 220 },
                                bgcolor: dispatchDayBadge.bg,
                                color: dispatchDayBadge.color,
                                border: `1px solid ${dispatchDayBadge.border}`,
                                animation: dispatchDayBadge.blink ? "dispatchBlink 1.1s linear infinite" : "none",
                                "& .MuiChip-label": { whiteSpace: "normal", lineHeight: 1.15, py: 0.35 },
                                "@keyframes dispatchBlink": {
                                  "0%": { opacity: 1 },
                                  "50%": { opacity: 0.35 },
                                  "100%": { opacity: 1 },
                                },
                              }}
                            />
                          )}
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
                          {(order.orderStatus === "READY_FOR_DISPATCH" || order.orderStatus === "FARM_READY" || order.orderStatus === "ACCEPTED") && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSplitOrderTarget(order);
                                setSplitOrderDialogOpen(true);
                              }}
                              sx={{ p: 0.4, color: "warning.main" }}
                              title="Split order"
                            >
                              <ContentCut sx={{ fontSize: "1rem" }} />
                            </IconButton>
                          )}
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

                        {/* Delivery date above plant/qty — slightly larger */}
                        <Box
                          sx={{
                            py: 1,
                            px: 1,
                            mb: 0.5,
                            bgcolor: pastDue ? "rgba(255, 152, 0, 0.12)" : "rgba(46, 125, 50, 0.1)",
                            borderRadius: 1.25,
                            border: `1px solid ${pastDue ? "rgba(255, 152, 0, 0.45)" : "rgba(46, 125, 50, 0.28)"}`,
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              display: "block",
                              fontWeight: 700,
                              color: "text.secondary",
                              fontSize: "0.68rem",
                              letterSpacing: "0.04em",
                              textTransform: "uppercase",
                              mb: 0.35,
                            }}
                          >
                            Delivery date
                          </Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <CalendarToday sx={{ fontSize: "1rem", color: pastDue ? "#e65100" : "#2e7d32" }} />
                            <Typography
                              sx={{
                                fontSize: { xs: "0.95rem", sm: "1rem" },
                                fontWeight: 800,
                                color: pastDue ? "#e65100" : "#1b5e20",
                                lineHeight: 1.2,
                              }}
                            >
                              {dueDate ? formatDateForDisplay(dueDate) : "N/A"}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ fontSize: "0.72rem", fontWeight: 600, color: "#6a1b9a", mt: 0.75 }}
                          >
                            Booking: {bookingDate ? formatDateForDisplay(bookingDate) : "N/A"}
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
                            border: "1px solid rgba(46,125,50,0.25)",
                            bgcolor: "rgba(46,125,50,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <Box>
                            <Typography sx={{ fontSize: "0.66rem", fontWeight: 700, color: "#1b5e20" }}>
                              Paid
                            </Typography>
                            <Typography sx={{ fontSize: "0.84rem", fontWeight: 800, color: "#2e7d32" }}>
                              ₹{receivedAmount.toLocaleString("en-IN")}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography sx={{ fontSize: "0.66rem", fontWeight: 700, color: "#b71c1c" }}>
                              Outstanding
                            </Typography>
                            <Typography sx={{ fontSize: "0.9rem", fontWeight: 800, color: "#d32f2f" }}>
                              ₹{outstandingAmount.toLocaleString("en-IN")}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Cavity + Salesperson + expand trigger */}
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            <Chip
                              label={`Cavity: ${
                                getCavityDisplayLabel(order.cavity) ||
                                (getCavityIdString(order.cavity) ? "—" : "No tray on order")
                              }`}
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

                        {/* Dispatch metadata row */}
                        <Box
                          sx={{
                            p: 0.75,
                            borderRadius: 1.25,
                            border: "1px solid rgba(0,0,0,0.1)",
                            bgcolor: "rgba(0,0,0,0.02)",
                          }}
                        >
                          <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: "text.secondary", mb: 0.35 }}>
                            Dispatch info
                          </Typography>
                          <Typography sx={{ fontSize: "0.7rem", color: "text.primary" }}>
                            Driver: <strong>{dispatchMetaDriver}</strong> • Vehicle: <strong>{dispatchMetaVehicle}</strong>
                          </Typography>
                          <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", mt: 0.2 }}>
                            Route: {dispatchMetaRoute}
                          </Typography>
                          <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", mt: 0.2 }}>
                            Pickup: {pickupMeta}
                          </Typography>
                        </Box>

                        {/* Call History - always visible, no expand needed */}
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
                      ? formatDateForDisplay(editingOrder.deliveryDate)
                      : "Choose delivery date"}
                    </Button>
                  )}
                  
                  {slots.length === 0 && !slotsLoading && (editingOrder.plantType?._id || editingOrder.plantType?.id) && (editingOrder.plantSubtype?._id || editingOrder.plantSubtype?.id) && (
                    <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary", fontSize: "0.68rem" }}>
                      No open slots for this plant. Tap above to retry or pick another window when slots exist.
                    </Typography>
                  )}
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
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      variant={statusChange === "CANCELLED" ? "contained" : "outlined"}
                      color="error"
                      size="medium"
                      onClick={() => setStatusChange(statusChange === "CANCELLED" ? "" : "CANCELLED")}
                      disabled={patchLoading}
                      sx={{
                        fontSize: "0.92rem",
                        textTransform: "none",
                        borderRadius: 2,
                        py: 1.05,
                        px: 1.8,
                        minHeight: 46,
                        fontWeight: 700,
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={statusChange === "READY_FOR_DISPATCH" ? "contained" : "outlined"}
                      color="success"
                      size="medium"
                      onClick={() => setStatusChange(statusChange === "READY_FOR_DISPATCH" ? "" : "READY_FOR_DISPATCH")}
                      disabled={patchLoading}
                      sx={{
                        fontSize: "0.92rem",
                        textTransform: "none",
                        borderRadius: 2,
                        py: 1.05,
                        px: 1.8,
                        minHeight: 46,
                        fontWeight: 700,
                      }}
                    >
                      Ready for dispatch
                    </Button>
                  </Box>
                  {statusChange === "READY_FOR_DISPATCH" && (
                    <FormControl sx={{ mt: 1.1 }}>
                      <FormLabel sx={{ fontSize: "0.72rem", color: "text.secondary", mb: 0.4 }}>
                        Dispatch day (required)
                      </FormLabel>
                      <RadioGroup
                        row
                        value={dispatchDayKey}
                        onChange={(e) => setDispatchDayKey(e.target.value)}
                      >
                        <FormControlLabel value="TODAY" control={<Radio size="small" />} label="Aaj" />
                        <FormControlLabel value="TOMORROW" control={<Radio size="small" />} label="Udya" />
                        <FormControlLabel value="DAY_AFTER" control={<Radio size="small" />} label="Parva" />
                      </RadioGroup>
                    </FormControl>
                  )}
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
            <Button
              onClick={handleCloseEditModal}
              disabled={patchLoading}
              size="medium"
              sx={{
                textTransform: "none",
                color: "text.secondary",
                fontSize: "0.95rem",
                minHeight: 44,
                px: 2,
              }}
            >
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

        {isDispatchFormOpen && (
          <DispatchForm
            open={isDispatchFormOpen}
            onDispatchSuccess={() => {
              if (whatsappMessagingEnabled) {
                Toast.success(
                  "Dispatch created. Send dispatch WhatsApp from each order’s row actions, or use the mobile dispatch screen for the automatic prompt."
                );
              }
            }}
            onClose={() => {
              setIsDispatchFormOpen(false);
              setSelectedReadyRows(new Map());
              fetchOrders();
              getReadyDispatchGroups();
            }}
            selectedOrders={selectedReadyRows}
            orders={filteredOrders}
          />
        )}

        <Dialog
          open={dispatchPreviewOpen}
          onClose={() => {
            setDispatchPreviewOpen(false);
            setSelectedDispatchPreview(null);
          }}
          fullScreen={isMobile}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: isMobile ? 0 : 2.5, overflow: "hidden" } }}
        >
          <DialogTitle
            sx={{
              py: 1.2,
              px: 1.8,
              background: "linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: "0.95rem" }}>
              Dispatch #{selectedDispatchPreview?.transportId || "N/A"} details
            </Typography>
            <IconButton
              size="small"
              onClick={() => {
                setDispatchPreviewOpen(false);
                setSelectedDispatchPreview(null);
              }}
              sx={{ color: "white" }}
            >
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 1.5, bgcolor: "#f7faf8" }}>
            {selectedDispatchPreview && (() => {
              const ordersInDispatch = Array.isArray(selectedDispatchPreview?.orderIds) ? selectedDispatchPreview.orderIds : [];
              const dispatchName = (selectedDispatchPreview?.name || "").trim() || "Unnamed Dispatch";
              const { plantsDispatched, totalAmount, paidAmount, remainingAmount, pickupSummary } =
                getDispatchCardSummary(selectedDispatchPreview);
              const farmerRows = ordersInDispatch.map((o) => ({
                name: o?.farmerName || o?.details?.farmer?.name || o?.farmer?.name || "N/A",
                phone: o?.details?.farmer?.mobileNumber || o?.farmer?.mobileNumber || o?.contact || "N/A",
                village: o?.details?.farmer?.village || o?.farmer?.village || "N/A",
              }));
              const uniqueFarmers = [...new Map(farmerRows.map((f) => [`${f.name}-${f.phone}`, f])).values()];
              const pickupRows = (Array.isArray(selectedDispatchPreview?.plantsDetails) ? selectedDispatchPreview.plantsDetails : [])
                .flatMap((plant) => (Array.isArray(plant?.pickupDetails) ? plant.pickupDetails : []))
                .map((p) => ({
                  shade: p?.shadeName || p?.shade || "N/A",
                  cavity: p?.cavityName || "N/A",
                  qty: Number(p?.quantity || 0),
                }));
              const plantRows = (Array.isArray(selectedDispatchPreview?.plantsDetails) ? selectedDispatchPreview.plantsDetails : []).map((p) => ({
                name: p?.name || p?.plantName || "Plant",
                qty: Number(p?.quantity || 0),
                subtype: p?.subTypeName || p?.subtypeName || "N/A",
              }));
              const orderRows = ordersInDispatch.map((o) => {
                const qty = Number(o?.quantity || 0);
                const rate = Number(o?.rate || 0);
                return {
                  orderNo: o?.order || o?.orderId || "N/A",
                  farmer: o?.farmerName || o?.details?.farmer?.name || "N/A",
                  village: o?.details?.farmer?.village || "N/A",
                  qty,
                  rate,
                  amount: qty * rate,
                  status: o?.orderStatus || "N/A",
                };
              });

              return (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.1 }}>
                  <Paper
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      border: "1px solid rgba(46,125,50,0.2)",
                      background: "linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%)",
                    }}
                  >
                    <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: "#1b5e20", mb: 0.45 }}>
                      Transport overview
                    </Typography>
                    <Typography sx={{ fontSize: "0.74rem", color: "#2e7d32", fontWeight: 800, mb: 0.3 }}>
                      Name: {dispatchName}
                    </Typography>
                    <Typography sx={{ fontSize: "0.76rem", color: "text.primary" }}>
                      Driver: <strong>{selectedDispatchPreview?.driverName || "N/A"}</strong> • Vehicle: <strong>{selectedDispatchPreview?.vehicleName || "N/A"}</strong>
                    </Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", mt: 0.2 }}>
                      Date: {selectedDispatchPreview?.createdAt ? moment(selectedDispatchPreview.createdAt).format("DD MMM YYYY, hh:mm A") : "N/A"}
                    </Typography>
                    <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", mt: 0.2 }}>
                      Orders: {ordersInDispatch.length} • Plants: {plantsDispatched.toLocaleString()}
                    </Typography>
                  </Paper>

                  <Paper sx={{ p: 1.1, borderRadius: 2, border: "1px solid rgba(0,0,0,0.1)", bgcolor: "white" }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: "#0d47a1", mb: 0.45 }}>
                      Farmer details ({uniqueFarmers.length})
                    </Typography>
                    {uniqueFarmers.map((f, i) => (
                      <Typography key={`${f.name}-${i}`} sx={{ fontSize: "0.72rem", color: "text.secondary", mb: 0.2 }}>
                        {f.name} ({f.phone}) • {f.village}
                      </Typography>
                    ))}
                  </Paper>

                  <Paper sx={{ p: 1.1, borderRadius: 2, border: "1px solid rgba(0,0,0,0.1)", bgcolor: "white" }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: "#6a1b9a", mb: 0.45 }}>
                      Pickup details (from shed)
                    </Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mb: 0.4 }}>
                      {pickupSummary}
                    </Typography>
                    {pickupRows.slice(0, 6).map((p, i) => (
                      <Typography key={`${p.shade}-${p.cavity}-${i}`} sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                        {p.shade} • {p.cavity} • {p.qty.toLocaleString()} plants
                      </Typography>
                    ))}
                  </Paper>

                  <Paper sx={{ p: 1.1, borderRadius: 2, border: "1px solid rgba(0,0,0,0.1)", bgcolor: "white" }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: "#2e7d32", mb: 0.5 }}>
                      Plant details ({plantRows.length})
                    </Typography>
                    {plantRows.length === 0 ? (
                      <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>No plant rows</Typography>
                    ) : (
                      plantRows.map((p, i) => (
                        <Box key={`${p.name}-${i}`} sx={{ display: "flex", justifyContent: "space-between", py: 0.25, borderBottom: i !== plantRows.length - 1 ? "1px dashed rgba(0,0,0,0.08)" : "none" }}>
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#1f2937" }}>{p.name}</Typography>
                          <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                            {p.qty.toLocaleString()} • {p.subtype}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Paper>

                  <Paper sx={{ p: 1.1, borderRadius: 2, border: "1px solid rgba(0,0,0,0.1)", bgcolor: "white" }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, color: "#37474f", mb: 0.5 }}>
                      Order details ({orderRows.length})
                    </Typography>
                    {orderRows.map((o, i) => (
                      <Box
                        key={`${o.orderNo}-${i}`}
                        sx={{
                          p: 0.75,
                          borderRadius: 1.3,
                          mb: i === orderRows.length - 1 ? 0 : 0.65,
                          bgcolor: "rgba(236,239,241,0.55)",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#1f2937" }}>
                          #{o.orderNo} • {o.farmer}
                        </Typography>
                        <Typography sx={{ fontSize: "0.66rem", color: "text.secondary", mt: 0.2 }}>
                          Village: {o.village} • Qty: {o.qty.toLocaleString()} • Rate: ₹{o.rate.toLocaleString()}
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.2 }}>
                          <Typography sx={{ fontSize: "0.66rem", color: "text.secondary" }}>Status: {o.status}</Typography>
                          <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#0d47a1" }}>₹{o.amount.toLocaleString()}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Paper>

                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 0.7 }}>
                    <Paper variant="outlined" sx={{ p: 0.9, borderRadius: 1.5, textAlign: "center", bgcolor: "white" }}>
                      <Typography sx={{ fontSize: "0.63rem", color: "text.secondary" }}>Total</Typography>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 800 }}>₹{totalAmount.toLocaleString()}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 0.9, borderRadius: 1.5, textAlign: "center", bgcolor: "white" }}>
                      <Typography sx={{ fontSize: "0.63rem", color: "text.secondary" }}>Paid</Typography>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, color: "#1b5e20" }}>₹{paidAmount.toLocaleString()}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 0.9, borderRadius: 1.5, textAlign: "center", bgcolor: "white" }}>
                      <Typography sx={{ fontSize: "0.63rem", color: "text.secondary" }}>Remaining</Typography>
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: 800, color: "#b71c1c" }}>₹{remainingAmount.toLocaleString()}</Typography>
                    </Paper>
                  </Box>

                </Box>
              );
            })()}
          </DialogContent>
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
                            const selectedM = editingOrder?.deliveryDate
                              ? moment(parseOrderDate(editingOrder.deliveryDate))
                              : null;
                            const isSelected =
                              selectedM &&
                              selectedM.isValid() &&
                              date.format("YYYY-MM-DD") === selectedM.format("YYYY-MM-DD");
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

        {/* Quick Order Dialog — creates a DISPATCHED order and links it to the selected vehicle */}
        <QuickOrderDialog
          open={quickOrderOpen}
          onClose={() => {
            setQuickOrderOpen(false)
            setQuickOrderDispatch(null)
          }}
          onSuccess={fetchDispatchList}
          dispatchId={quickOrderDispatch?._id}
          dispatchLabel={quickOrderDispatch?.label}
        />

        {/* Split Order Dialog */}
        <SplitOrderDialog
          open={splitOrderDialogOpen}
          onClose={() => {
            setSplitOrderDialogOpen(false);
            setSplitOrderTarget(null);
          }}
          order={splitOrderTarget}
          onSplitSuccess={() => {
            fetchOrders(false);
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default DispatchedListPage;
