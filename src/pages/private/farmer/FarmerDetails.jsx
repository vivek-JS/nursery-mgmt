import React, { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  CircularProgress,
  Alert,
  Tooltip,
  Divider,
  Tabs,
  Tab,
  Button,
  Skeleton,
  useMediaQuery,
  useTheme,
  IconButton
} from "@mui/material"
import {
  ArrowBack as ArrowBackIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Receipt as ReceiptIcon,
  Payments as PaymentsIcon,
  LocalFlorist as PlantIcon,
  AccountBalanceWallet as WalletIcon,
  CurrencyRupee as RupeeIcon,
  Group as GroupIcon,
  WhatsApp as WhatsAppIcon,
  Refresh as RefreshIcon,
  AccountBalance as AccountBalanceIcon
} from "@mui/icons-material"
import { API, NetworkManager } from "network/core"
import { LedgerPanel } from "features/accountant-dashboard/LedgerPanel"
import { fetchFarmerPlantLedger, normalizeFarmerIdForLedger } from "features/accountant-dashboard/paymentsApi"
import { useHasPaymentAccess, useHasPaymentsAccess } from "utils/roleUtils"
import { Toast } from "helpers/toasts/toastHelper"

// ================================================================
// THEME COLORS
// ================================================================
const C = {
  primary: "#2E7D32",
  primaryLight: "#4CAF50",
  primaryDark: "#1B5E20",
  gradient: "linear-gradient(135deg, #2E7D32 0%, #4CAF50 60%, #81C784 100%)",
  green: "#22C55E",
  greenBg: "#ECFDF5",
  greenText: "#166534",
  red: "#EF4444",
  redBg: "#FEF2F2",
  redText: "#991B1B",
  orange: "#F59E0B",
  orangeBg: "#FFFBEB",
  orangeText: "#92400E",
  blue: "#3B82F6",
  blueBg: "#EFF6FF",
  blueText: "#1E40AF",
  purple: "#8B5CF6",
  purpleBg: "#F5F3FF",
  purpleText: "#5B21B6",
  textPrimary: "#1A1D2E",
  textSecondary: "#4A4F65",
  textMuted: "#9CA3B8",
  border: "#E8EBF0",
  borderLight: "#F0F1F5",
  bg: "#F4F6F0",
}

// ================================================================
// HELPERS
// ================================================================
const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0)

const formatDate = (dateString) => {
  if (!dateString) return "—"
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  })
}

const getInitials = (name) => {
  if (!name) return "F"
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("")
}

const ORDER_STATUS_META = {
  PENDING: { label: "Pending", bg: C.orangeBg, color: C.orangeText },
  PROCESSING: { label: "Processing", bg: C.blueBg, color: C.blueText },
  COMPLETED: { label: "Completed", bg: C.greenBg, color: C.greenText },
  DISPATCHED: { label: "Dispatched", bg: C.purpleBg, color: C.purpleText },
  CANCELLED: { label: "Cancelled", bg: C.redBg, color: C.redText },
  REJECTED: { label: "Rejected", bg: C.redBg, color: C.redText },
  FARM_READY: { label: "Farm Ready", bg: C.greenBg, color: C.greenText },
  READY_FOR_DISPATCH: { label: "Ready to Dispatch", bg: C.blueBg, color: C.blueText },
  DISPATCH_PROCESS: { label: "Dispatching", bg: C.purpleBg, color: C.purpleText },
  PARTIALLY_COMPLETED: { label: "Partial", bg: C.orangeBg, color: C.orangeText },
  TEMPORARY_CANCELLED: { label: "Temp. Cancelled", bg: C.redBg, color: C.redText },
  ACCEPTED: { label: "Accepted", bg: C.greenBg, color: C.greenText },
}

const PAYMENT_STATUS_META = {
  COLLECTED: { label: "Collected", bg: C.greenBg, color: C.greenText },
  PENDING: { label: "Pending", bg: C.orangeBg, color: C.orangeText },
  REJECTED: { label: "Rejected", bg: C.redBg, color: C.redText },
  BANK_VERIFIED: { label: "Verified", bg: C.blueBg, color: C.blueText },
}

const StatusBadge = ({ status, meta }) => {
  const m = meta[status] || { label: status || "—", bg: C.borderLight, color: C.textMuted }
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1.5,
        py: 0.4,
        borderRadius: 10,
        bgcolor: m.bg,
        color: m.color,
        fontSize: 12,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {m.label}
    </Box>
  )
}

// ================================================================
// STAT CARD
// ================================================================
const StatCard = ({ icon, label, value, color, loading }) => (
  <Card
    elevation={0}
    sx={{
      border: `1px solid ${C.border}`,
      borderRadius: 3,
      p: 0,
      height: "100%",
      background: "#fff",
      "&:hover": { boxShadow: "0 4px 16px rgba(0,0,0,0.08)" },
      transition: "box-shadow 0.2s",
    }}
  >
    <CardContent sx={{ p: "16px !important" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2.5,
            bgcolor: color + "18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {React.cloneElement(icon, { sx: { color, fontSize: 22 } })}
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: C.textMuted, fontWeight: 500, display: "block", mb: 0.3 }}>
            {label}
          </Typography>
          {loading ? (
            <Skeleton width={70} height={24} />
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 700, color: C.textPrimary, lineHeight: 1.2 }}>
              {value}
            </Typography>
          )}
        </Box>
      </Box>
    </CardContent>
  </Card>
)

// ================================================================
// SKELETON LOADER
// ================================================================
const PageSkeleton = () => (
  <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: C.bg, minHeight: "100vh" }}>
    <Skeleton width={120} height={36} sx={{ mb: 2 }} />
    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 3, mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
          <Skeleton variant="circular" width={72} height={72} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="50%" height={32} />
            <Skeleton width="35%" height={20} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
        <Grid container spacing={2}>
          {[...Array(4)].map((_, i) => (
            <Grid item xs={6} md={3} key={i}>
              <Skeleton height={80} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 3 }}>
      <CardContent>
        <Skeleton width="40%" height={40} sx={{ mb: 2 }} />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />
        ))}
      </CardContent>
    </Card>
  </Box>
)

// ================================================================
// MAIN COMPONENT
// ================================================================
const FarmerDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))
  const hasLedgerUi = useHasPaymentsAccess()
  const hasPaymentAccess = useHasPaymentAccess()

  const [farmer, setFarmer] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ordersError, setOrdersError] = useState(null)
  const [activeTab, setActiveTab] = useState(0)

  // Pagination
  const [orderPage, setOrderPage] = useState(0)
  const [orderRowsPerPage, setOrderRowsPerPage] = useState(10)
  const [paymentPage, setPaymentPage] = useState(0)
  const [paymentRowsPerPage, setPaymentRowsPerPage] = useState(10)

  const [ledgerData, setLedgerData] = useState(null)
  const [loadingLedger, setLoadingLedger] = useState(false)

  const loadPlantLedger = useCallback(async () => {
    if (!farmer) return
    setLoadingLedger(true)
    try {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(endDate.getDate() - 15)
      const fid = normalizeFarmerIdForLedger(farmer._id || farmer.id)
      const mobile = String(farmer.mobileNumber ?? "").replace(/\D/g, "")
      const mapped = await fetchFarmerPlantLedger({
        farmerId: fid,
        customerMobile: mobile.length >= 10 ? mobile.slice(-10) : undefined,
        startDate,
        endDate
      })
      if (mapped) {
        setLedgerData({
          ...mapped,
          meta: {
            ...(mapped.meta || {}),
            canTransferAdvance: hasPaymentAccess,
            onRefresh: loadPlantLedger
          }
        })
      } else {
        Toast.error("No ledger data for this farmer (try a different date range from Payments)")
      }
    } catch (e) {
      console.error(e)
      Toast.error("Failed to load plant ledger")
    } finally {
      setLoadingLedger(false)
    }
  }, [farmer, hasPaymentAccess])

  const fetchFarmer = async () => {
    setLoading(true)
    setError(null)
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMER_BY_ID)
      const res = await instance.request({}, { pathParams: [id] })
      setFarmer(res?.data?.data || res?.data || null)
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load farmer details")
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    setOrdersLoading(true)
    setOrdersError(null)
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMER_ORDERS)
      const res = await instance.request({}, { pathParams: [id] })
      const data = res?.data?.data
      setOrders(Array.isArray(data) ? data : [])
    } catch (err) {
      if (err?.response?.status === 404) {
        setOrders([])
      } else {
        setOrdersError(err?.response?.data?.message || "Failed to load orders")
      }
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchFarmer()
      fetchOrders()
    }
  }, [id])

  // ---- Derived stats ----
  const totalOrders = orders.length
  const totalPlants = orders.reduce((s, o) => s + (o.numberOfPlants || 0), 0)
  const allPayments = orders.flatMap((o) =>
    (o.payment || []).map((p) => ({ ...p, orderId: o.orderId || o._id, orderStatus: o.orderStatus }))
  )
  const totalPaid = allPayments
    .filter((p) => ["COLLECTED", "BANK_VERIFIED"].includes(p.paymentStatus))
    .reduce((s, p) => s + (p.paidAmount || 0), 0)
  const totalOrderValue = orders.reduce(
    (s, o) => s + (o.numberOfPlants || 0) * (o.rate || 0),
    0
  )
  const outstanding = totalOrderValue - totalPaid

  if (loading) return <PageSkeleton />

  if (error)
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/u/farmers")} sx={{ mb: 2 }}>
          Back to Farmers
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    )

  if (!farmer)
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/u/farmers")} sx={{ mb: 2 }}>
          Back to Farmers
        </Button>
        <Alert severity="warning">Farmer not found.</Alert>
      </Box>
    )

  // Paginated slices
  const paginatedOrders = orders.slice(
    orderPage * orderRowsPerPage,
    orderPage * orderRowsPerPage + orderRowsPerPage
  )
  const paginatedPayments = allPayments.slice(
    paymentPage * paymentRowsPerPage,
    paymentPage * paymentRowsPerPage + paymentRowsPerPage
  )

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: C.bg, minHeight: "100vh" }}>
      {/* ---- Top bar ---- */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/u/farmers")}
          variant="outlined"
          size="small"
          sx={{
            borderColor: C.border,
            color: C.textSecondary,
            "&:hover": { borderColor: C.primary, color: C.primary },
            borderRadius: 2,
          }}
        >
          Farmers
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 700, color: C.textPrimary, flex: 1 }}>
          {farmer.name}
        </Typography>
        {farmer.opt_in && (
          <Chip
            icon={<WhatsAppIcon sx={{ fontSize: 16, color: "#25D366 !important" }} />}
            label="WhatsApp Opt-in"
            size="small"
            sx={{ bgcolor: "#E8F5E9", color: "#1B5E20", fontWeight: 600, borderRadius: 2 }}
          />
        )}
        {hasLedgerUi && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<AccountBalanceIcon sx={{ fontSize: 18 }} />}
            onClick={loadPlantLedger}
            disabled={loadingLedger}
            sx={{
              borderColor: C.border,
              color: C.textSecondary,
              textTransform: "none",
              fontWeight: 600,
              borderRadius: 2,
              "&:hover": { borderColor: C.primary, color: C.primary },
            }}
          >
            Plant ledger
          </Button>
        )}
        <Tooltip title="Refresh">
          <IconButton
            size="small"
            onClick={() => { fetchFarmer(); fetchOrders() }}
            sx={{ color: C.textMuted }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ---- Profile + Stats ---- */}
      <Card
        elevation={0}
        sx={{
          border: `1px solid ${C.border}`,
          borderRadius: 3,
          mb: 3,
          overflow: "visible",
        }}
      >
        {/* Gradient accent strip */}
        <Box sx={{ height: 6, background: C.gradient, borderRadius: "12px 12px 0 0" }} />
        <CardContent sx={{ p: { xs: 2, md: 3 } }}>
          <Grid container spacing={3} alignItems="flex-start">
            {/* Avatar + info */}
            <Grid item xs={12} md={5}>
              <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                <Avatar
                  sx={{
                    width: 72,
                    height: 72,
                    background: C.gradient,
                    fontSize: 26,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {getInitials(farmer.name)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: C.textPrimary, mb: 0.5 }}>
                    {farmer.name}
                  </Typography>

                  {/* Mobile */}
                  {farmer.mobileNumber && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mb: 0.5 }}>
                      <PhoneIcon sx={{ fontSize: 15, color: C.primary }} />
                      <Typography variant="body2" sx={{ color: C.textSecondary }}>
                        {farmer.mobileNumber}
                        {farmer.alternateNumber ? ` / ${farmer.alternateNumber}` : ""}
                      </Typography>
                    </Box>
                  )}

                  {/* Location */}
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.7 }}>
                    <LocationIcon sx={{ fontSize: 15, color: C.primary, mt: 0.2 }} />
                    <Typography variant="body2" sx={{ color: C.textSecondary }}>
                      {[farmer.village, farmer.talukaName, farmer.districtName, farmer.stateName]
                        .filter(Boolean)
                        .join(", ")}
                    </Typography>
                  </Box>

                  {/* Referrals */}
                  {farmer.referredTo?.length > 0 && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mt: 0.5 }}>
                      <GroupIcon sx={{ fontSize: 15, color: C.purple }} />
                      <Typography variant="body2" sx={{ color: C.textMuted }}>
                        {farmer.referredTo.length} referral{farmer.referredTo.length !== 1 ? "s" : ""}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>

            {/* Divider */}
            <Grid item xs={12} md="auto" sx={{ display: { xs: "none", md: "flex" }, alignItems: "stretch" }}>
              <Divider orientation="vertical" flexItem />
            </Grid>
            <Grid item xs={12} sx={{ display: { xs: "block", md: "none" }, py: "0 !important" }}>
              <Divider />
            </Grid>

            {/* Stats */}
            <Grid item xs={12} md>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3} md={3}>
                  <StatCard
                    icon={<ReceiptIcon />}
                    label="Total Orders"
                    value={totalOrders}
                    color={C.blue}
                    loading={ordersLoading}
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={3}>
                  <StatCard
                    icon={<PlantIcon />}
                    label="Total Plants"
                    value={totalPlants.toLocaleString("en-IN")}
                    color={C.primary}
                    loading={ordersLoading}
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={3}>
                  <StatCard
                    icon={<WalletIcon />}
                    label="Total Paid"
                    value={formatCurrency(totalPaid)}
                    color={C.green}
                    loading={ordersLoading}
                  />
                </Grid>
                <Grid item xs={6} sm={3} md={3}>
                  <StatCard
                    icon={<RupeeIcon />}
                    label="Outstanding"
                    value={formatCurrency(outstanding)}
                    color={outstanding > 0 ? C.orange : C.green}
                    loading={ordersLoading}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ---- Orders / Payments Tabs ---- */}
      <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 3 }}>
        <Box sx={{ borderBottom: `1px solid ${C.border}`, px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            textColor="inherit"
            TabIndicatorProps={{ style: { background: C.primary, height: 3, borderRadius: 3 } }}
          >
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ReceiptIcon sx={{ fontSize: 16 }} />
                  <span>Order History</span>
                  <Chip
                    label={totalOrders}
                    size="small"
                    sx={{ height: 18, fontSize: 11, bgcolor: C.borderLight, color: C.textSecondary }}
                  />
                </Box>
              }
              sx={{ textTransform: "none", fontWeight: 600, color: C.textSecondary, "&.Mui-selected": { color: C.primary } }}
            />
            <Tab
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PaymentsIcon sx={{ fontSize: 16 }} />
                  <span>Payment History</span>
                  <Chip
                    label={allPayments.length}
                    size="small"
                    sx={{ height: 18, fontSize: 11, bgcolor: C.borderLight, color: C.textSecondary }}
                  />
                </Box>
              }
              sx={{ textTransform: "none", fontWeight: 600, color: C.textSecondary, "&.Mui-selected": { color: C.primary } }}
            />
            {hasLedgerUi && (
              <Tab
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AccountBalanceIcon sx={{ fontSize: 16 }} />
                    <span>Plant ledger</span>
                  </Box>
                }
                sx={{ textTransform: "none", fontWeight: 600, color: C.textSecondary, "&.Mui-selected": { color: C.primary } }}
              />
            )}
          </Tabs>
        </Box>

        {/* ---- Order History Tab ---- */}
        {activeTab === 0 && (
          <Box>
            {ordersLoading ? (
              <Box sx={{ p: 3 }}>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />
                ))}
              </Box>
            ) : ordersError ? (
              <Box sx={{ p: 3 }}>
                <Alert severity="error">{ordersError}</Alert>
              </Box>
            ) : orders.length === 0 ? (
              <Box
                sx={{
                  p: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                  color: C.textMuted,
                }}
              >
                <ReceiptIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  No orders found
                </Typography>
                <Typography variant="body2">This farmer has no orders yet.</Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: C.bg }}>
                        {["Order ID", "Plants", "Rate", "Total Value", "Status", "Delivery Date", "Payment Status"].map(
                          (h) => (
                            <TableCell
                              key={h}
                              sx={{
                                fontWeight: 700,
                                color: C.textSecondary,
                                fontSize: 12,
                                borderBottom: `1px solid ${C.border}`,
                                whiteSpace: "nowrap",
                                py: 1.5,
                              }}
                            >
                              {h}
                            </TableCell>
                          )
                        )}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedOrders.map((order) => (
                        <TableRow
                          key={order._id}
                          hover
                          sx={{ "&:last-child td": { borderBottom: 0 }, cursor: "default" }}
                        >
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: C.textPrimary, fontFamily: "monospace" }}>
                              #{String(order.orderId || order._id).slice(-6)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <PlantIcon sx={{ fontSize: 14, color: C.primary }} />
                              <Typography variant="body2">
                                {(order.numberOfPlants || 0).toLocaleString("en-IN")}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ color: C.textSecondary }}>
                              {formatCurrency(order.rate)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCurrency((order.numberOfPlants || 0) * (order.rate || 0))}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <StatusBadge status={order.orderStatus} meta={ORDER_STATUS_META} />
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ color: C.textSecondary, whiteSpace: "nowrap" }}>
                              {order.deliveryDate
                                ? formatDate(
                                    order.deliveryDate?.startDay
                                      ? `${order.deliveryDate.year}-${order.deliveryDate.month}-${order.deliveryDate.startDay}`
                                      : order.deliveryDate
                                  )
                                : "—"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <StatusBadge status={order.orderPaymentStatus} meta={PAYMENT_STATUS_META} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={orders.length}
                  page={orderPage}
                  onPageChange={(_, p) => setOrderPage(p)}
                  rowsPerPage={orderRowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setOrderRowsPerPage(parseInt(e.target.value, 10))
                    setOrderPage(0)
                  }}
                  rowsPerPageOptions={[5, 10, 25]}
                  sx={{ borderTop: `1px solid ${C.border}` }}
                />
              </>
            )}
          </Box>
        )}

        {/* ---- Payment History Tab ---- */}
        {activeTab === 1 && (
          <Box>
            {ordersLoading ? (
              <Box sx={{ p: 3 }}>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />
                ))}
              </Box>
            ) : ordersError ? (
              <Box sx={{ p: 3 }}>
                <Alert severity="error">{ordersError}</Alert>
              </Box>
            ) : allPayments.length === 0 ? (
              <Box
                sx={{
                  p: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                  color: C.textMuted,
                }}
              >
                <PaymentsIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  No payments found
                </Typography>
                <Typography variant="body2">No payment records for this farmer.</Typography>
              </Box>
            ) : (
              <>
                {/* Summary row */}
                <Box
                  sx={{
                    px: 3,
                    py: 1.5,
                    bgcolor: C.bg,
                    borderBottom: `1px solid ${C.border}`,
                    display: "flex",
                    gap: 3,
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    {
                      label: "Total Collected",
                      value: formatCurrency(
                        allPayments
                          .filter((p) => ["COLLECTED", "BANK_VERIFIED"].includes(p.paymentStatus))
                          .reduce((s, p) => s + (p.paidAmount || 0), 0)
                      ),
                      color: C.greenText,
                    },
                    {
                      label: "Pending",
                      value: formatCurrency(
                        allPayments
                          .filter((p) => p.paymentStatus === "PENDING")
                          .reduce((s, p) => s + (p.paidAmount || 0), 0)
                      ),
                      color: C.orangeText,
                    },
                    {
                      label: "Rejected",
                      value: formatCurrency(
                        allPayments
                          .filter((p) => p.paymentStatus === "REJECTED")
                          .reduce((s, p) => s + (p.paidAmount || 0), 0)
                      ),
                      color: C.redText,
                    },
                  ].map((item) => (
                    <Box key={item.label}>
                      <Typography variant="caption" sx={{ color: C.textMuted }}>
                        {item.label}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: item.color }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: C.bg }}>
                        {["Date", "Order #", "Mode", "Amount", "Bank", "Status"].map((h) => (
                          <TableCell
                            key={h}
                            sx={{
                              fontWeight: 700,
                              color: C.textSecondary,
                              fontSize: 12,
                              borderBottom: `1px solid ${C.border}`,
                              whiteSpace: "nowrap",
                              py: 1.5,
                            }}
                          >
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedPayments.map((payment, idx) => (
                        <TableRow
                          key={payment._id || idx}
                          hover
                          sx={{ "&:last-child td": { borderBottom: 0 } }}
                        >
                          <TableCell sx={{ py: 1.5, whiteSpace: "nowrap" }}>
                            <Typography variant="body2" sx={{ color: C.textSecondary }}>
                              {formatDate(payment.paymentDate)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, color: C.textPrimary, fontFamily: "monospace" }}
                            >
                              #{String(payment.orderId || "").slice(-6)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ color: C.textSecondary, textTransform: "capitalize" }}>
                              {payment.modeOfPayment?.replace(/_/g, " ") || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: C.textPrimary }}>
                              {formatCurrency(payment.paidAmount)}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ color: C.textMuted }}>
                              {payment.bankName || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <StatusBadge status={payment.paymentStatus} meta={PAYMENT_STATUS_META} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={allPayments.length}
                  page={paymentPage}
                  onPageChange={(_, p) => setPaymentPage(p)}
                  rowsPerPage={paymentRowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setPaymentRowsPerPage(parseInt(e.target.value, 10))
                    setPaymentPage(0)
                  }}
                  rowsPerPageOptions={[5, 10, 25]}
                  sx={{ borderTop: `1px solid ${C.border}` }}
                />
              </>
            )}
          </Box>
        )}

        {hasLedgerUi && activeTab === 2 && (
          <Box sx={{ p: { xs: 2, md: 4 }, textAlign: "center" }}>
            <AccountBalanceIcon sx={{ fontSize: 48, color: C.primary, opacity: 0.85, mb: 1.5 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: C.textPrimary, mb: 1 }}>
              Nursery plant ledger
            </Typography>
            <Typography variant="body2" sx={{ color: C.textSecondary, mb: 2, maxWidth: 480, mx: "auto" }}>
              Running balance, order debits, and payment credits (same ledger as Payments → View ledger). Uses the last 15 days
              by default; open to transfer advance or add manual entries if you have access.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AccountBalanceIcon />}
              onClick={loadPlantLedger}
              disabled={loadingLedger}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                background: C.gradient,
                boxShadow: "0 4px 14px rgba(46,125,50,0.35)",
              }}
            >
              Open plant ledger
            </Button>
          </Box>
        )}
      </Card>

      <LedgerPanel ledger={ledgerData} onClose={() => setLedgerData(null)} />
      {loadingLedger && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(15, 23, 42, 0.12)",
          }}
        >
          <CircularProgress sx={{ color: C.primary }} />
        </Box>
      )}
    </Box>
  )
}

export default FarmerDetails
