import React, { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Tooltip,
} from "@mui/material";
import {
  ArrowBack,
  Refresh,
  Logout,
  Phone,
  Call,
  Edit,
  LocationOn,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useUserData, useUserRole, useIsDispatchManager } from "utils/roleUtils";
import { useLogoutModel } from "layout/privateLayout/privateLayout.model";
import { Loader } from "redux/dispatcher/Loader";
import EditOrderModal from "./components/EditOrderModal";
import OrderCard from "./components/OrderCard";
import { getDefaultDateRange, formatDateForAPI, isDueDatePassed, formatDateForDisplay } from "./utils/dateUtils";

const DispatchOrderList = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const userData = useUserData();
  const userRole = useUserRole();
  const isDispatchManager = useIsDispatchManager();
  const logoutModel = useLogoutModel();

  // Handle logout
  const handleLogout = async () => {
    Loader.show();
    await logoutModel.logout();
    Loader.hide();
    navigate("/auth/login", { replace: true });
  };

  // Check if user has access: DISPATCH_MANAGER or SUPER_ADMIN role
  const isSuperAdmin = userRole === "SUPER_ADMIN" || userRole === "SUPERADMIN";
  const hasAccess = isDispatchManager || isSuperAdmin;

  // Redirect if user doesn't have access
  useEffect(() => {
    if (userData !== undefined && userRole !== undefined) {
      if (!hasAccess) {
        Toast.error("Access denied. This page is only for DISPATCH_MANAGER or SUPER_ADMIN.");
        navigate("/u/dashboard", { replace: true });
      }
    }
  }, [userData, userRole, hasAccess, navigate]);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const defaultRange = getDefaultDateRange();
    return {
      startDate: moment(defaultRange.startDate, "DD-MM-YYYY"),
      endDate: moment(defaultRange.endDate, "DD-MM-YYYY"),
    };
  });
  const [showAllPastDue, setShowAllPastDue] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch orders from API
  const fetchOrders = async () => {
    if (!hasAccess || userData === undefined) return;

    setLoading(true);
    try {
      const params = {
        search: "",
        dispatched: true,
        limit: 10000,
        page: 1,
        status: "ACCEPTED,FARM_READY",
      };

      // Add date range if startDate is provided
      if (dateRange.startDate) {
        params.startDate = formatDateForAPI(dateRange.startDate);
        params.endDate = formatDateForAPI(dateRange.endDate);
      }
      // If no startDate, don't send date params (shows all data)

      console.log("[DispatchOrderList] Fetching orders with params:", params);

      const instance = NetworkManager(API.ORDER.GET_ORDERS);
      const response = await instance.request({}, params);

      console.log("[DispatchOrderList] API response:", response);

      if (response?.data?.success || response?.data?.data) {
        let ordersData = response.data.data?.data || response.data.data || [];
        
        // If no startDate provided, we already have all orders (no date filter)
        // The API returns all orders when no date params are sent

        // Sort orders by due date (ascending)
        ordersData.sort((a, b) => {
          const dateA = moment(a.farmReadyDate || a.dueDate || a.orderBookingDate, "DD-MM-YYYY");
          const dateB = moment(b.farmReadyDate || b.dueDate || b.orderBookingDate, "DD-MM-YYYY");
          return dateA.diff(dateB);
        });

        setOrders(ordersData);
        console.log(`[DispatchOrderList] Loaded ${ordersData.length} orders`);
      } else {
        setOrders([]);
        Toast.error("Failed to fetch orders");
      }
    } catch (error) {
      console.error("[DispatchOrderList] Error fetching orders:", error);
      Toast.error(error?.response?.data?.message || "Failed to fetch orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders on mount and when date range changes
  useEffect(() => {
    if (hasAccess && userData !== undefined) {
      fetchOrders();
    }
  }, [hasAccess, userData, dateRange.startDate, dateRange.endDate, showAllPastDue]);

  // Handle call button click
  const handleCall = (mobileNumber) => {
    if (mobileNumber && mobileNumber !== "N/A") {
      const cleanNumber = mobileNumber.replace(/[^0-9]/g, "");
      if (cleanNumber) {
        window.location.href = `tel:${cleanNumber}`;
      } else {
        Toast.error("Invalid phone number");
      }
    }
  };

  // Handle edit button click
  const handleEdit = (order) => {
    setSelectedOrder(order);
    setEditModalOpen(true);
  };

  // Handle edit modal close
  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setSelectedOrder(null);
  };

  // Handle edit success - refresh orders
  const handleEditSuccess = () => {
    fetchOrders();
  };

  // Helper functions for table display
  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
        return "#4caf50";
      case "FARM_READY":
        return "#2196f3";
      case "DISPATCHED":
        return "#ff9800";
      case "DELIVERED":
        return "#8bc34a";
      case "CANCELLED":
        return "#f44336";
      default:
        return "#757575";
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toUpperCase()) {
      case "FARM_READY":
        return "Ready to Dispatch";
      default:
        return status || "N/A";
    }
  };

  // Calculate payment info for an order
  const getPaymentInfo = (order) => {
    const totalAmount = order?.totalAmount || order?.rate * (order?.numberOfPlants || 0) || 0;
    const payments = order?.payment || [];
    const receivedAmount = payments
      .filter((p) => p.paymentStatus === "COLLECTED")
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const pendingAmount = Math.max(0, totalAmount - receivedAmount);
    return { totalAmount, receivedAmount, pendingAmount };
  };

  // Show loading while checking access
  if (userData === undefined || userRole === undefined) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
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
            bgcolor: "#2e7d32",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <Toolbar sx={{ px: isMobile ? 1.5 : 2, minHeight: isMobile ? 56 : 64 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => navigate("/u/dashboard")}
              sx={{ mr: 1 }}
            >
              <ArrowBack />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                flexGrow: 1,
                fontWeight: 600,
                fontSize: isMobile ? "1rem" : "1.125rem",
              }}
            >
              Dispatch Orders
            </Typography>
            <IconButton
              color="inherit"
              onClick={handleLogout}
              sx={{
                ml: 1,
                p: 0.75,
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
              title="Logout"
            >
              <Logout sx={{ fontSize: isMobile ? "1.25rem" : "1.5rem" }} />
            </IconButton>
            <Button
              variant="outlined"
              size={isMobile ? "small" : "medium"}
              onClick={fetchOrders}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} sx={{ color: "white" }} /> : <Refresh />}
              sx={{
                borderColor: "white",
                color: "white",
                fontWeight: 600,
                ml: 1,
                fontSize: isMobile ? "0.75rem" : "0.875rem",
                px: isMobile ? 1.5 : 2,
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.8)",
                  bgcolor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              Refresh
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ px: isMobile ? 1.5 : 2, pt: 2 }}>
          {/* Date Filter Section */}
          <Paper
            sx={{
              p: isMobile ? 2 : 2.5,
              mb: 2,
              bgcolor: "white",
              borderRadius: 2,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: "#1976d2",
                mb: 2,
                fontSize: isMobile ? "1rem" : "1.125rem",
              }}
            >
              Filter Orders
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 2,
                mb: 2,
              }}
            >
              <DatePicker
                label="Start Date (Optional)"
                value={dateRange.startDate}
                onChange={(newValue) => {
                  setDateRange((prev) => ({
                    ...prev,
                    startDate: newValue || null,
                  }));
                }}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    size: isMobile ? "medium" : "small",
                    placeholder: "Leave empty for all data",
                    sx: {
                      "& .MuiInputBase-input": {
                        fontSize: isMobile ? "16px" : "0.95rem",
                        py: isMobile ? 1.5 : 1,
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
                    size: isMobile ? "medium" : "small",
                    sx: {
                      "& .MuiInputBase-input": {
                        fontSize: isMobile ? "16px" : "0.95rem",
                        py: isMobile ? 1.5 : 1,
                      },
                    },
                  },
                }}
                format="DD-MM-YYYY"
              />
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                {dateRange.startDate
                  ? `Showing orders from ${formatDateForAPI(dateRange.startDate)} to ${formatDateForAPI(dateRange.endDate)}`
                  : "Showing all orders (no date filter applied)"}
                {showAllPastDue && !dateRange.startDate && " including past due orders"}
              </Typography>
            </Alert>

            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                const defaultRange = getDefaultDateRange();
                setDateRange({
                  startDate: moment(defaultRange.startDate, "DD-MM-YYYY"),
                  endDate: moment(defaultRange.endDate, "DD-MM-YYYY"),
                });
              }}
              sx={{
                fontSize: isMobile ? "0.75rem" : "0.875rem",
              }}
            >
              Reset to Default (1 Week)
            </Button>
          </Paper>

          {/* Orders List */}
          {loading ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress size={32} />
              <Typography
                variant="body2"
                color="textSecondary"
                sx={{ mt: 1.5, fontSize: "0.875rem" }}
              >
                Loading orders...
              </Typography>
            </Box>
          ) : orders.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontSize: isMobile ? "0.875rem" : "0.9rem" }}>
                No orders found for the selected criteria.
              </Typography>
            </Alert>
          ) : (
            <>
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  bgcolor: "#e8f5e9",
                  borderRadius: 1.5,
                  border: "1px solid #4caf50",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    fontWeight: 600,
                    color: "#2e7d32",
                    fontSize: isMobile ? "0.9rem" : "1rem",
                  }}
                >
                  Total Orders: {orders.length}
                </Typography>
              </Box>

              <Box>
                {orders.map((order, index) => (
                  <OrderCard
                    key={order._id || order.id || index}
                    order={order}
                    onCall={handleCall}
                    onEdit={handleEdit}
                  />
                ))}
              </Box>
            </>
          )}
        </Container>

        {/* Edit Order Modal */}
        <EditOrderModal
          open={editModalOpen}
          onClose={handleEditModalClose}
          order={selectedOrder}
          onSuccess={handleEditSuccess}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default DispatchOrderList;



