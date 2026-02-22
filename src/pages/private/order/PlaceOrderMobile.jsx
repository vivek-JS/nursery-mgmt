import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import {
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Chip,
  Fab,
  Card,
  CardContent,
  CircularProgress,
  useMediaQuery,
  useTheme,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  Button,
  Divider,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Alert,
  Slide,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  LinearProgress,
  Badge,
  Paper,
  Skeleton,
  Collapse,
} from "@mui/material"
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
  Check as CheckIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Comment as CommentIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Agriculture as PlantIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Receipt as ReceiptIcon,
  AccountBalanceWallet as WalletIcon,
  ListAlt as OrdersIcon,
  AccountBalance as LedgerIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapIcon,
  Inventory as InventoryIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from "@mui/icons-material"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import moment from "moment"
import debounce from "lodash.debounce"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import AddOrderForm from "./AddOrderForm"

const getLatestSlot = (slotData) => {
  if (!slotData) return null
  if (Array.isArray(slotData)) {
    const filtered = slotData.filter(Boolean)
    if (!filtered.length) return null
    return filtered[filtered.length - 1]
  }
  return slotData
}

const mapSlotForUi = (slotData) => {
  const latestSlot = getLatestSlot(slotData)
  if (!latestSlot) return null
  return latestSlot
}

const statusOptions = [
  { value: "PENDING", label: "Pending", color: "#ff9800" },
  { value: "ACCEPTED", label: "Accepted", color: "#4caf50" },
  { value: "DISPATCHED", label: "Dispatched", color: "#2196f3" },
  { value: "FARM_READY", label: "Farm Ready", color: "#9c27b0" },
  { value: "REJECTED", label: "Rejected", color: "#f44336" },
]

const txnTypeColors = {
  CREDIT: { bg: "#e8f5e9", color: "#2e7d32", icon: <TrendingUpIcon sx={{ fontSize: 16 }} /> },
  DEBIT: { bg: "#ffebee", color: "#c62828", icon: <TrendingDownIcon sx={{ fontSize: 16 }} /> },
  INVENTORY_ADD: { bg: "#e8f5e9", color: "#2e7d32", icon: <InventoryIcon sx={{ fontSize: 16 }} /> },
  INVENTORY_BOOK: { bg: "#fff3e0", color: "#e65100", icon: <InventoryIcon sx={{ fontSize: 16 }} /> },
  INVENTORY_RELEASE: { bg: "#e3f2fd", color: "#1565c0", icon: <SwapIcon sx={{ fontSize: 16 }} /> },
}

// ================================================================
// MAIN COMPONENT
// ================================================================
function PlaceOrderMobile() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const navigate = useNavigate()
  const userData = useSelector((state) => state?.userData?.userData)
  const appUser = useSelector((state) => state?.app?.user)
  const user = userData || appUser || {}
  const userJobTitle = user?.jobTitle
  const userId = user?._id || user?.id
  const isDealerOrSales = userJobTitle === "DEALER" || userJobTitle === "SALES"
  const isDealer = userJobTitle === "DEALER"

  // Bottom nav tab
  const [activeTab, setActiveTab] = useState(0)

  // Orders state
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [selectedDateRange, setSelectedDateRange] = useState([
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    new Date(),
  ])
  const [statusFilter, setStatusFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [addPaymentOpen, setAddPaymentOpen] = useState(null)

  // Order detail state
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState(0)

  // Payment state
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [newPayment, setNewPayment] = useState({
    paidAmount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    modeOfPayment: "",
    bankName: "",
    remark: "",
    receiptPhoto: [],
    paymentStatus: "PENDING",
    isWalletPayment: false,
  })

  // Edit state
  const [editData, setEditData] = useState({})
  const [editLoading, setEditLoading] = useState(false)

  // Remark state
  const [newRemark, setNewRemark] = useState("")
  const [remarkLoading, setRemarkLoading] = useState(false)

  // Status change state
  const [statusLoading, setStatusLoading] = useState(false)

  // Wallet state
  const [dealerWallet, setDealerWallet] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletInventory, setWalletInventory] = useState([])

  // Ledger state
  const [transactions, setTransactions] = useState([])
  const [txnLoading, setTxnLoading] = useState(false)
  const [txnPage, setTxnPage] = useState(1)
  const [txnTotal, setTxnTotal] = useState(0)
  const [txnTypeFilter, setTxnTypeFilter] = useState("")

  // Debounce search
  useEffect(() => {
    const handler = debounce(() => setDebouncedSearchTerm(searchTerm), 400)
    handler()
    return () => handler.cancel()
  }, [searchTerm])

  // Load wallet on mount
  useEffect(() => {
    if (userId) {
      loadDealerWallet(userId)
    }
  }, [userId])

  // Load transactions when ledger tab is active
  useEffect(() => {
    if (activeTab === 1 && userId) {
      loadTransactions()
    }
  }, [activeTab, txnPage, txnTypeFilter, userId])

  // =========================================================
  // DATA LOADERS
  // =========================================================
  const loadDealerWallet = async (dealerId) => {
    setWalletLoading(true)
    try {
      const instance = NetworkManager(API.USER.GET_DEALER_WALLET_DETAILS)
      const response = await instance.request({}, [dealerId])
      const data = response?.data?.data || response?.data
      const financial = data?.financial
      const plantDetails = data?.plantDetails || []
      const dealerInfo = data?.dealer

      setDealerWallet({
        availableAmount: financial?.availableAmount || 0,
        totalOrderAmount: financial?.totalOrderAmount || 0,
        totalPaidAmount: financial?.totalPaidAmount || 0,
        remainingAmount: financial?.remainingAmount || 0,
        dealer: dealerInfo || null,
      })
      setWalletInventory(plantDetails)
    } catch (err) {
      console.error("Error loading wallet:", err)
    } finally {
      setWalletLoading(false)
    }
  }

  const loadTransactions = async () => {
    if (!userId) return
    setTxnLoading(true)
    try {
      const instance = NetworkManager(API.USER.GET_DEALERS_TRANSACTIONS)
      const queryParams = {
        page: txnPage,
        limit: 20,
        ...(txnTypeFilter && { type: txnTypeFilter }),
      }
      const response = await instance.request({}, [userId], { params: queryParams })
      const { transactions: txns, pagination } = response?.data?.data || {}
      setTransactions(txns || [])
      setTxnTotal(pagination?.total || 0)
    } catch (err) {
      console.error("Error loading transactions:", err)
      setTransactions([])
    } finally {
      setTxnLoading(false)
    }
  }

  const getTotalPaid = (payment) => {
    if (!payment || !Array.isArray(payment)) return 0
    return payment.reduce(
      (t, p) => t + (p?.paymentStatus === "COLLECTED" ? Number(p.paidAmount) || 0 : 0),
      0
    )
  }

  const getTotalPaidAll = (payment) => {
    if (!payment || !Array.isArray(payment)) return 0
    return payment.reduce((t, p) => t + (Number(p.paidAmount) || 0), 0)
  }

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.ORDER.GET_ORDERS)
      const [startDate, endDate] = selectedDateRange
      const params = {
        search: debouncedSearchTerm || "",
        dispatched: false,
        limit: 500,
        page: 1,
      }
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("DD-MM-YYYY")
        params.endDate = moment(endDate).format("DD-MM-YYYY")
      }
      if (statusFilter) params.status = statusFilter
      if (isDealerOrSales && userId) params.salesPerson = userId

      const response = await instance.request({}, params)
      const rawData = response?.data?.data?.data || []

      const mapped = rawData
        .map((data) => {
          const {
            farmer, numberOfPlants = 0, additionalPlants = 0, totalPlants, rate,
            salesPerson, createdAt, orderStatus, id, payment, bookingSlot, orderId,
            plantType, plantSubtype, orderFor, dealerOrder, orderBookingDate,
            deliveryDate, orderRemarks, statusChanges,
          } = data || {}
          const basePlants = numberOfPlants || 0
          const extraPlants = additionalPlants || 0
          const totalPlantCount = typeof totalPlants === "number" ? totalPlants : basePlants + extraPlants
          const totalOrderAmount = Number(rate || 0) * totalPlantCount
          const paid = getTotalPaid(payment)

          const latestSlot = mapSlotForUi(bookingSlot)
          const startDay = latestSlot?.startDay
          const endDay = latestSlot?.endDay
          const start = startDay ? moment(startDay, "DD-MM-YYYY").format("D") : "N/A"
          const end = endDay ? moment(endDay, "DD-MM-YYYY").format("D") : "N/A"
          const monthYear = startDay ? moment(startDay, "DD-MM-YYYY").format("MMM YY") : ""

          const farmerName = orderFor
            ? `${farmer?.name || "Unknown"} → ${orderFor.name}`
            : dealerOrder
            ? `Dealer: ${salesPerson?.name || "Unknown"}`
            : farmer?.name || "Unknown"

          return {
            _id: id, order: orderId, farmerName,
            farmerMobile: farmer?.mobileNumber || "",
            farmerVillage: farmer?.village || "",
            farmerTaluka: farmer?.talukaName || farmer?.taluka || "",
            farmerDistrict: farmer?.districtName || farmer?.district || "",
            plantType: plantType?.name || "—",
            plantSubtype: plantSubtype?.name || "—",
            plantTypeDisplay: `${plantType?.name || "—"} → ${plantSubtype?.name || "—"}`,
            quantity: basePlants, totalPlants: totalPlantCount,
            rate: rate || 0, total: totalOrderAmount,
            paidAmt: paid, remainingAmt: totalOrderAmount - paid,
            orderStatus: orderStatus || "—",
            delivery: `${start}-${end} ${monthYear}`,
            slotPeriod: startDay && endDay ? `${startDay} to ${endDay}` : "—",
            orderDate: moment(orderBookingDate || createdAt).format("DD MMM YY"),
            deliveryDate: deliveryDate ? moment(deliveryDate).format("DD MMM YY") : "—",
            deliveryDateRaw: deliveryDate || null,
            payments: payment || [], orderRemarks: orderRemarks || [],
            salesPerson: salesPerson?.name || "—",
            dealerOrder: dealerOrder || false, orderFor: orderFor || null,
            statusChanges: statusChanges || [],
          }
        })
        .filter((o) => o && o.order)

      setOrders(mapped)
    } catch (error) {
      console.error("Error fetching orders:", error)
      Toast.error("Failed to load orders")
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [selectedDateRange, debouncedSearchTerm, statusFilter, isDealerOrSales, userId])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleSuccess = () => { setShowForm(false); fetchOrders() }

  const getStatusDot = (status) => {
    const s = (status || "").toUpperCase()
    if (s === "ACCEPTED") return "#4caf50"
    if (s === "DISPATCHED") return "#2196f3"
    if (s === "PENDING") return "#ff9800"
    if (s === "FARM_READY") return "#9c27b0"
    if (s === "REJECTED") return "#f44336"
    return "#9e9e9e"
  }
  const getStatusColor = (status) => {
    const s = (status || "").toUpperCase()
    if (s === "ACCEPTED") return "success"
    if (s === "DISPATCHED") return "info"
    if (s === "PENDING" || s === "FARM_READY") return "warning"
    if (s === "REJECTED") return "error"
    return "default"
  }

  // =========================================================
  // ACCORDION TOGGLE
  // =========================================================
  const toggleExpand = (orderId, order) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null)
      setSelectedOrder(null)
      setAddPaymentOpen(null)
    } else {
      setExpandedOrder(orderId)
      setSelectedOrder(order)
      setNewPayment({ paidAmount: "", paymentDate: moment().format("YYYY-MM-DD"), modeOfPayment: "", bankName: "", remark: "", receiptPhoto: [], paymentStatus: "PENDING", isWalletPayment: false })
      setAddPaymentOpen(null)
    }
  }

  // =========================================================
  // ORDER DETAIL HANDLERS
  // =========================================================
  const openOrderDetail = (order) => {
    setSelectedOrder(order)
    setDetailTab(0)
    setEditData({ rate: order.rate, quantity: order.quantity, deliveryDate: order.deliveryDateRaw ? new Date(order.deliveryDateRaw) : null })
    setNewPayment({ paidAmount: "", paymentDate: moment().format("YYYY-MM-DD"), modeOfPayment: "", bankName: "", remark: "", receiptPhoto: [], paymentStatus: "PENDING", isWalletPayment: false })
    setNewRemark("")
    setDetailOpen(true)
  }

  const closeOrderDetail = () => { setDetailOpen(false); setSelectedOrder(null) }

  const refreshOrderDetail = async () => {
    await fetchOrders()
    if (selectedOrder) {
      setTimeout(() => {
        setOrders((prev) => {
          const updated = prev.find((o) => o._id === selectedOrder._id)
          if (updated) setSelectedOrder(updated)
          return prev
        })
      }, 100)
    }
  }

  // Payment handlers
  const handlePaymentInputChange = (field, value) => {
    setNewPayment((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === "isWalletPayment" && value) updated.modeOfPayment = "Wallet"
      return updated
    })
  }

  const handlePaymentImageUpload = async (event) => {
    const files = Array.from(event.target.files)
    if (!files.length) return
    for (const file of files) {
      if (!file.type.startsWith("image/")) { Toast.error("Select valid images"); return }
      if (file.size > 8 * 1024 * 1024) { Toast.error("Max 8MB per file"); return }
    }
    try {
      setPaymentLoading(true)
      const urls = await Promise.all(files.map(async (file) => {
        const fd = new FormData()
        fd.append("media_key", file); fd.append("media_type", "IMAGE"); fd.append("content_type", "multipart/form-data")
        const inst = NetworkManager(API.MEDIA.UPLOAD)
        const res = await inst.request(fd)
        return res.data.media_url
      }))
      setNewPayment((prev) => ({ ...prev, receiptPhoto: [...(prev.receiptPhoto || []), ...urls] }))
    } catch { Toast.error("Upload failed") } finally { setPaymentLoading(false) }
  }

  const removePaymentImage = (index) => {
    setNewPayment((prev) => ({ ...prev, receiptPhoto: prev.receiptPhoto.filter((_, i) => i !== index) }))
  }

  const handleAddPayment = async () => {
    if (!selectedOrder) return
    if (!newPayment.paidAmount || parseFloat(newPayment.paidAmount) <= 0) { Toast.error("Enter valid amount"); return }
    if (!newPayment.isWalletPayment && !newPayment.modeOfPayment) { Toast.error("Select payment mode"); return }
    if (newPayment.modeOfPayment && !["Cash", "NEFT/RTGS", "Wallet"].includes(newPayment.modeOfPayment) && (!newPayment.receiptPhoto || !newPayment.receiptPhoto.length)) {
      Toast.error(`Receipt required for ${newPayment.modeOfPayment}`); return
    }
    if (newPayment.isWalletPayment && dealerWallet && parseFloat(newPayment.paidAmount) > dealerWallet.availableAmount) {
      Toast.error(`Exceeds wallet balance (₹${dealerWallet.availableAmount?.toLocaleString()})`); return
    }
    setPaymentLoading(true)
    try {
      const payload = {
        paidAmount: newPayment.paidAmount, paymentDate: newPayment.paymentDate,
        modeOfPayment: newPayment.isWalletPayment ? "Wallet" : newPayment.modeOfPayment,
        bankName: newPayment.bankName || "", remark: newPayment.remark || "",
        receiptPhoto: newPayment.receiptPhoto || [],
        isWalletPayment: Boolean(newPayment.isWalletPayment), paymentStatus: "PENDING",
      }
      const inst = NetworkManager(API.ORDER.ADD_PAYMENT)
      await inst.request(payload, [selectedOrder._id])
      Toast.success("Payment added")
      setNewPayment({ paidAmount: "", paymentDate: moment().format("YYYY-MM-DD"), modeOfPayment: "", bankName: "", remark: "", receiptPhoto: [], paymentStatus: "PENDING", isWalletPayment: false })
      if (userId) loadDealerWallet(userId)
      await refreshOrderDetail()
    } catch (err) {
      Toast.error(err?.response?.data?.message || "Failed to add payment")
    } finally { setPaymentLoading(false) }
  }

  const handleSaveEdit = async () => {
    if (!selectedOrder) return
    setEditLoading(true)
    try {
      const payload = { id: selectedOrder._id }
      if (editData.rate !== selectedOrder.rate) payload.rate = parseFloat(editData.rate)
      if (editData.quantity !== selectedOrder.quantity) payload.numberOfPlants = parseInt(editData.quantity)
      if (editData.deliveryDate) payload.deliveryDate = editData.deliveryDate instanceof Date ? editData.deliveryDate.toISOString() : editData.deliveryDate
      const inst = NetworkManager(API.ORDER.UPDATE_ORDER)
      await inst.request(payload)
      Toast.success("Order updated")
      await refreshOrderDetail()
    } catch (err) {
      Toast.error(err?.response?.data?.message || "Failed to update")
    } finally { setEditLoading(false) }
  }

  const handleStatusChange = async (newStatus) => {
    if (!selectedOrder) return
    setStatusLoading(true)
    try {
      const inst = NetworkManager(API.ORDER.UPDATE_ORDER)
      await inst.request({ id: selectedOrder._id, orderStatus: newStatus })
      Toast.success(`Status → ${newStatus}`)
      await refreshOrderDetail()
    } catch (err) {
      Toast.error(err?.response?.data?.message || "Failed")
    } finally { setStatusLoading(false) }
  }

  const handleAddRemark = async () => {
    if (!selectedOrder || !newRemark.trim()) return
    setRemarkLoading(true)
    try {
      const inst = NetworkManager(API.ORDER.UPDATE_ORDER)
      await inst.request({ id: selectedOrder._id, orderRemarks: newRemark.trim() })
      Toast.success("Remark added")
      setNewRemark("")
      await refreshOrderDetail()
    } catch { Toast.error("Failed") } finally { setRemarkLoading(false) }
  }

  // =========================================================
  // USER INFO for header
  // =========================================================
  const userName = user?.name || user?.firstName || "User"
  const userInitial = userName.charAt(0).toUpperCase()
  const userRole = userJobTitle === "DEALER" ? "Dealer" : userJobTitle === "SALES" ? "Sales" : userJobTitle === "OFFICE_ADMIN" ? "Admin" : userJobTitle === "SUPERADMIN" ? "Super Admin" : userJobTitle || "User"

  // =========================================================
  // RENDER: APP HEADER
  // =========================================================
  const renderHeader = () => (
    <Box
      sx={{
        position: "sticky", top: 0, zIndex: 1100, flexShrink: 0,
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        boxShadow: "0 2px 12px rgba(102,126,234,0.3)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", px: 1.5, py: 1, gap: 1.25 }}>
        {!isDealerOrSales && (
          <IconButton onClick={() => navigate("/u/dashboard")} size="small" sx={{ color: "white", bgcolor: "rgba(255,255,255,0.15)", "&:hover": { bgcolor: "rgba(255,255,255,0.25)" } }}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        <Avatar sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.25)", fontSize: "0.95rem", fontWeight: 700, border: "2px solid rgba(255,255,255,0.4)" }}>
          {userInitial}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ color: "white", fontWeight: 700, lineHeight: 1.2, fontSize: "0.9rem" }} noWrap>
            {userName}
          </Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.8)", fontSize: "0.65rem", lineHeight: 1 }}>
            {userRole}
          </Typography>
        </Box>
        {dealerWallet && (
          <Chip
            icon={<WalletIcon sx={{ fontSize: "14px !important", color: "white !important" }} />}
            label={`₹${dealerWallet.availableAmount?.toLocaleString() || 0}`}
            size="small"
            sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 700, fontSize: "0.7rem", height: 28, "& .MuiChip-icon": { ml: 0.5 } }}
          />
        )}
      </Box>
    </Box>
  )

  // =========================================================
  // RENDER: BOTTOM NAV
  // =========================================================
  const renderBottomNav = () => (
    <Paper
      sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200, borderTop: "1px solid #e0e0e0" }}
      elevation={8}
    >
      <BottomNavigation
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        showLabels
        sx={{
          height: 56,
          "& .MuiBottomNavigationAction-root": { minWidth: 0, py: 0.5, "&.Mui-selected": { color: "#667eea" } },
          "& .MuiBottomNavigationAction-label": { fontSize: "0.6rem", "&.Mui-selected": { fontSize: "0.6rem" } },
        }}
      >
        <BottomNavigationAction label="Orders" icon={<Badge badgeContent={orders.length > 99 ? "99+" : orders.length || null} color="error" max={999} sx={{ "& .MuiBadge-badge": { fontSize: "0.55rem", height: 14, minWidth: 14 } }}><OrdersIcon sx={{ fontSize: 22 }} /></Badge>} />
        <BottomNavigationAction label="Ledger" icon={<LedgerIcon sx={{ fontSize: 22 }} />} />
        <BottomNavigationAction label="Wallet" icon={<WalletIcon sx={{ fontSize: 22 }} />} />
        <BottomNavigationAction label="Profile" icon={<PersonIcon sx={{ fontSize: 22 }} />} />
      </BottomNavigation>
    </Paper>
  )

  // =========================================================
  // TAB 0: ORDERS (Accordion Cards)
  // =========================================================
  const renderOrdersTab = () => {
    const isExpanded = (id) => expandedOrder === id

    const renderAccordionPayments = (row) => {
      const payments = row.payments || []
      const paidTotal = getTotalPaidAll(payments)
      return (
        <Box>
          {/* Payment summary bar */}
          <Box sx={{ display: "flex", justifyContent: "space-around", py: 0.75, px: 0.5, bgcolor: "#f8f9fa", borderRadius: 1.5, mb: 1, border: "1px solid #eee" }}>
            <PaymentChip label="Total" value={`₹${row.total?.toLocaleString()}`} color="#2c3e50" />
            <Box sx={{ width: "1px", bgcolor: "#e0e0e0" }} />
            <PaymentChip label="Paid" value={`₹${paidTotal?.toLocaleString()}`} color="#4caf50" />
            <Box sx={{ width: "1px", bgcolor: "#e0e0e0" }} />
            <PaymentChip label="Due" value={`₹${row.remainingAmt?.toLocaleString()}`} color={row.remainingAmt > 0 ? "#e53935" : "#4caf50"} />
          </Box>

          {/* Payment history */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" fontWeight={700} color="#2c3e50" sx={{ fontSize: "0.7rem", display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
              <ReceiptIcon sx={{ fontSize: 14 }} /> Payments ({payments.length})
            </Typography>
            {payments.length === 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", pl: 0.5 }}>No payments yet</Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {payments.map((p, idx) => (
                  <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 0.75, p: 0.75, bgcolor: p.paymentStatus === "COLLECTED" ? "#f1f8e9" : "#fff8e1", borderRadius: 1.5, border: `1px solid ${p.paymentStatus === "COLLECTED" ? "#c5e1a5" : "#ffe082"}` }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: p.paymentStatus === "COLLECTED" ? "#4caf50" : "#ff9800", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {p.paymentStatus === "COLLECTED" ? <CheckIcon sx={{ fontSize: 14, color: "white" }} /> : <PaymentIcon sx={{ fontSize: 14, color: "white" }} />}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.8rem" }}>₹{Number(p.paidAmount || 0).toLocaleString()}</Typography>
                        <Chip label={p.paymentStatus || "PENDING"} size="small" sx={{ height: 16, fontSize: "0.5rem", fontWeight: 600, bgcolor: p.paymentStatus === "COLLECTED" ? "#e8f5e9" : "#fff3e0", color: p.paymentStatus === "COLLECTED" ? "#2e7d32" : "#e65100" }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>
                        {p.modeOfPayment || "—"} · {p.paymentDate ? moment(p.paymentDate).format("DD MMM YY") : "—"}
                        {p.remark ? ` · ${p.remark}` : ""}
                      </Typography>
                      {p.receiptPhoto?.length > 0 && (
                        <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
                          {p.receiptPhoto.map((url, i) => (
                            <Box key={i} component="img" src={url} sx={{ width: 32, height: 32, borderRadius: 0.5, objectFit: "cover", border: "1px solid #ddd", cursor: "pointer" }}
                              onClick={(e) => { e.stopPropagation(); window.open(url, "_blank") }} />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Add Payment inline (collapsible) */}
          {row.orderStatus !== "DISPATCHED" && row.orderStatus !== "REJECTED" && (
            <Box>
              <Button fullWidth size="small" variant={addPaymentOpen === row._id ? "contained" : "outlined"}
                startIcon={<PaymentIcon sx={{ fontSize: 14 }} />}
                onClick={(e) => { e.stopPropagation(); setAddPaymentOpen(addPaymentOpen === row._id ? null : row._id); setSelectedOrder(row) }}
                sx={{ fontSize: "0.7rem", textTransform: "none", borderRadius: 2, height: 30, mb: 0.5,
                  ...(addPaymentOpen === row._id ? { background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" } : { borderColor: "#667eea", color: "#667eea" })
                }}>
                {addPaymentOpen === row._id ? "Hide Payment Form" : "Add Payment"}
              </Button>
              <Collapse in={addPaymentOpen === row._id}>
                <Box sx={{ p: 1, bgcolor: "#fafbff", borderRadius: 1.5, border: "1px solid #e8eaf6", mt: 0.5 }}>
                  {isDealer && dealerWallet && (
                    <Box sx={{ mb: 0.75, p: 0.5, bgcolor: "#fff3e0", borderRadius: 1, border: "1px solid #ffe0b2" }}>
                      <FormControlLabel
                        control={<Checkbox size="small" checked={newPayment.isWalletPayment} onChange={(e) => handlePaymentInputChange("isWalletPayment", e.target.checked)} sx={{ p: 0.25 }} />}
                        label={<Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.68rem" }}>Wallet (₹{dealerWallet.availableAmount?.toLocaleString()})</Typography>}
                        sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: 0.5 } }}
                      />
                    </Box>
                  )}
                  <Box sx={{ display: "flex", gap: 0.75, mb: 0.75 }}>
                    <TextField size="small" placeholder="Amount ₹" type="number" value={newPayment.paidAmount}
                      onChange={(e) => handlePaymentInputChange("paidAmount", e.target.value)}
                      sx={{ flex: 1, ...compactField }} />
                    <TextField size="small" type="date" value={newPayment.paymentDate}
                      onChange={(e) => handlePaymentInputChange("paymentDate", e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ width: 130, ...compactField }} />
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.75, mb: 0.75 }}>
                    <FormControl size="small" sx={{ flex: 1 }}>
                      <Select value={newPayment.modeOfPayment} displayEmpty
                        onChange={(e) => handlePaymentInputChange("modeOfPayment", e.target.value)}
                        disabled={newPayment.isWalletPayment}
                        sx={{ fontSize: "0.75rem", height: 32, borderRadius: 2 }}>
                        <MenuItem value=""><em>Mode</em></MenuItem>
                        <MenuItem value="Cash">Cash</MenuItem>
                        <MenuItem value="UPI">UPI</MenuItem>
                        <MenuItem value="Cheque">Cheque</MenuItem>
                        <MenuItem value="NEFT/RTGS">NEFT/RTGS</MenuItem>
                        <MenuItem value="1341">1341</MenuItem>
                        <MenuItem value="434">434</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon sx={{ fontSize: 12 }} />}
                      disabled={paymentLoading}
                      sx={{ fontSize: "0.6rem", textTransform: "none", borderRadius: 2, height: 32, minWidth: 80 }}>
                      {paymentLoading ? "..." : "Receipt"}
                      <input type="file" hidden accept="image/*" multiple onChange={handlePaymentImageUpload} />
                    </Button>
                  </Box>
                  {newPayment.receiptPhoto?.length > 0 && (
                    <Box sx={{ display: "flex", gap: 0.5, mb: 0.75 }}>
                      {newPayment.receiptPhoto.map((url, idx) => (
                        <Box key={idx} sx={{ position: "relative" }}>
                          <Box component="img" src={url} sx={{ width: 36, height: 36, borderRadius: 0.5, objectFit: "cover", border: "1px solid #eee" }} />
                          <IconButton onClick={() => removePaymentImage(idx)} size="small" sx={{ position: "absolute", top: -4, right: -4, bgcolor: "rgba(244,67,54,0.9)", color: "white", width: 14, height: 14 }}>
                            <DeleteIcon sx={{ fontSize: 8 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                  <TextField size="small" fullWidth placeholder="Remark (optional)" value={newPayment.remark}
                    onChange={(e) => handlePaymentInputChange("remark", e.target.value)}
                    sx={{ mb: 0.75, ...compactField }} />
                  <Button fullWidth variant="contained" size="small" disabled={paymentLoading || !newPayment.paidAmount}
                    onClick={handleAddPayment}
                    startIcon={paymentLoading ? <CircularProgress size={12} /> : <CheckIcon sx={{ fontSize: 14 }} />}
                    sx={{ height: 32, fontSize: "0.72rem", textTransform: "none", fontWeight: 600, borderRadius: 2, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                    {paymentLoading ? "Adding..." : "Submit Payment"}
                  </Button>
                </Box>
              </Collapse>
            </Box>
          )}

          {/* Quick action buttons */}
          <Box sx={{ display: "flex", gap: 0.5, mt: 1, pt: 0.75, borderTop: "1px solid #eee" }}>
            <Button size="small" variant="text"
              startIcon={<ArrowRightIcon sx={{ fontSize: 14 }} />}
              onClick={(e) => { e.stopPropagation(); openOrderDetail(row) }}
              sx={{ fontSize: "0.6rem", textTransform: "none", color: "#667eea", flex: 1 }}>
              Full Details
            </Button>
            {row.orderStatus !== "DISPATCHED" && row.orderStatus !== "REJECTED" && (
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select value="" displayEmpty onChange={(e) => { if (e.target.value) { setSelectedOrder(row); handleStatusChange(e.target.value) } }}
                  disabled={statusLoading} onClick={(e) => e.stopPropagation()}
                  sx={{ fontSize: "0.6rem", height: 26, borderRadius: 2, "& .MuiSelect-select": { py: 0.25 } }}
                  renderValue={() => statusLoading ? "..." : "Status ▾"}>
                  <MenuItem value="" disabled>Change</MenuItem>
                  {statusOptions.filter((s) => s.value !== row.orderStatus).map((s) => (
                    <MenuItem key={s.value} value={s.value} sx={{ fontSize: "0.75rem" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color }} />{s.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </Box>
      )
    }

    return (
      <>
        {/* Filters */}
        <Box sx={{ px: 1.25, py: 1, bgcolor: "#fff", borderBottom: "1px solid #eee" }}>
          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
            <TextField
              size="small" placeholder="Search name, order..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18 }} color="action" /></InputAdornment> }}
              sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2, height: 36 }, "& .MuiOutlinedInput-input": { py: 0.5, fontSize: "0.8rem" } }}
            />
            <IconButton size="small" onClick={() => setShowFilters(!showFilters)} sx={{ bgcolor: showFilters ? "#667eea" : "#f5f5f5", color: showFilters ? "white" : "text.secondary", width: 36, height: 36, borderRadius: 2 }}>
              <FilterIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" onClick={fetchOrders} disabled={loading} sx={{ bgcolor: "#f5f5f5", width: 36, height: 36, borderRadius: 2 }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>
          {showFilters && (
            <Box sx={{ mt: 1, display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select value={statusFilter} displayEmpty onChange={(e) => setStatusFilter(e.target.value)} sx={{ fontSize: "0.75rem", height: 32, borderRadius: 2 }}>
                  <MenuItem value="">All Status</MenuItem>
                  {statusOptions.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <DatePicker
                  selectsRange startDate={selectedDateRange[0]} endDate={selectedDateRange[1]}
                  onChange={(dates) => setSelectedDateRange(dates || [])} dateFormat="dd/MM/yy"
                  customInput={<TextField size="small" sx={{ width: 155, "& .MuiOutlinedInput-root": { height: 32, borderRadius: 2 }, "& .MuiOutlinedInput-input": { py: 0.25, fontSize: "0.7rem" } }} inputProps={{ readOnly: true }} />}
                />
              </Box>
            </Box>
          )}
        </Box>

        {/* Order list - Accordion cards */}
        <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", p: 1, pb: "72px" }}>
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, py: 2 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2.5 }} />)}
            </Box>
          ) : orders.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <PlantIcon sx={{ fontSize: 56, color: "#e0e0e0", mb: 1.5 }} />
              <Typography variant="body2" color="text.secondary" fontWeight={600}>No orders found</Typography>
              <Typography variant="caption" color="text.secondary">Tap + to create a new order</Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {orders.map((row) => {
                const expanded = isExpanded(row._id)
                const paidCount = (row.payments || []).filter((p) => p.paymentStatus === "COLLECTED").length
                const totalPayments = (row.payments || []).length
                return (
                  <Card key={row.order} variant="outlined"
                    sx={{
                      borderRadius: 2.5, overflow: "hidden",
                      borderLeft: `3.5px solid ${getStatusDot(row.orderStatus)}`,
                      boxShadow: expanded ? "0 4px 16px rgba(102,126,234,0.15)" : "none",
                      transition: "box-shadow 0.2s, border-color 0.2s",
                      ...(expanded && { borderColor: "#667eea" }),
                    }}>
                    {/* Card header - always visible */}
                    <CardContent
                      onClick={() => toggleExpand(row._id, row)}
                      sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 }, cursor: "pointer", "&:active": { bgcolor: "#f5f5f5" } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: "0.65rem" }}>#{row.order}</Typography>
                          {row.dealerOrder && <Chip label="D" size="small" sx={{ height: 14, fontSize: "0.5rem", bgcolor: "#e3f2fd", color: "#1976d2", fontWeight: 700, "& .MuiChip-label": { px: 0.5 } }} />}
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Chip label={row.orderStatus} size="small" color={getStatusColor(row.orderStatus)} sx={{ fontSize: "0.55rem", height: 18, fontWeight: 600 }} />
                          {expanded ? <ExpandLessIcon sx={{ fontSize: 18, color: "#667eea" }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: "#aaa" }} />}
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem", flex: 1, pr: 1 }} noWrap>{row.farmerName}</Typography>
                        <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: "0.82rem" }}>₹{row.total?.toLocaleString()}</Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block" }}>
                        {row.plantTypeDisplay} · {row.totalPlants}p · ₹{row.rate} · {row.orderDate}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, alignItems: "center" }}>
                        <Chip label={`Paid ₹${row.paidAmt?.toLocaleString()}`} size="small" variant="outlined" color="success" sx={{ fontSize: "0.55rem", height: 16, "& .MuiChip-label": { px: 0.5 } }} />
                        {row.remainingAmt > 0 && <Chip label={`Due ₹${row.remainingAmt?.toLocaleString()}`} size="small" variant="outlined" color="error" sx={{ fontSize: "0.55rem", height: 16, "& .MuiChip-label": { px: 0.5 } }} />}
                        {totalPayments > 0 && (
                          <Chip
                            icon={<ReceiptIcon sx={{ fontSize: "10px !important" }} />}
                            label={`${paidCount}/${totalPayments}`}
                            size="small" variant="outlined"
                            sx={{ fontSize: "0.5rem", height: 16, ml: "auto", "& .MuiChip-label": { px: 0.25 }, "& .MuiChip-icon": { ml: 0.25, mr: -0.25 } }}
                          />
                        )}
                      </Box>
                    </CardContent>

                    {/* Expanded accordion content */}
                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                      <Divider />
                      <Box sx={{ px: 1.25, py: 1 }}>
                        {renderAccordionPayments(row)}
                      </Box>
                    </Collapse>
                  </Card>
                )
              })}
            </Box>
          )}
        </Box>

        {/* FAB */}
        <Fab color="primary" onClick={() => setShowForm(true)}
          sx={{ position: "fixed", bottom: 68, right: 16, width: 48, height: 48, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", boxShadow: "0 4px 14px rgba(102,126,234,0.4)", zIndex: 1150 }}>
          <AddIcon />
        </Fab>
      </>
    )
  }

  // =========================================================
  // TAB 1: LEDGER
  // =========================================================
  const renderLedgerTab = () => (
    <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", pb: "72px" }}>
      {/* Header */}
      <Box sx={{ px: 1.5, py: 1.25, bgcolor: "#fff", borderBottom: "1px solid #eee" }}>
        <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ mb: 0.75 }}>Transaction Ledger</Typography>
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select value={txnTypeFilter} displayEmpty onChange={(e) => { setTxnTypeFilter(e.target.value); setTxnPage(1) }} sx={{ fontSize: "0.75rem", height: 32, borderRadius: 2 }}>
              <MenuItem value="">All Types</MenuItem>
              <MenuItem value="CREDIT">Credit</MenuItem>
              <MenuItem value="DEBIT">Debit</MenuItem>
              <MenuItem value="INVENTORY_ADD">Inventory Add</MenuItem>
              <MenuItem value="INVENTORY_BOOK">Inventory Book</MenuItem>
              <MenuItem value="INVENTORY_RELEASE">Inventory Release</MenuItem>
            </Select>
          </FormControl>
          <IconButton size="small" onClick={loadTransactions} disabled={txnLoading} sx={{ bgcolor: "#f5f5f5", width: 32, height: 32, borderRadius: 2 }}>
            <RefreshIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        {txnTotal > 0 && <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>{txnTotal} transactions found</Typography>}
      </Box>

      {txnLoading && <LinearProgress sx={{ height: 2 }} />}

      {/* Transaction list */}
      <Box sx={{ p: 1 }}>
        {!txnLoading && transactions.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <LedgerIcon sx={{ fontSize: 48, color: "#e0e0e0", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No transactions found</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {transactions.map((txn, idx) => {
              const tc = txnTypeColors[txn.type] || { bg: "#f5f5f5", color: "#666", icon: <SwapIcon sx={{ fontSize: 16 }} /> }
              const isPositive = txn.type === "CREDIT" || txn.type === "INVENTORY_ADD" || txn.type === "INVENTORY_RELEASE"
              return (
                <Card key={txn._id || idx} variant="outlined" sx={{ borderRadius: 2, borderLeft: `3px solid ${tc.color}` }}>
                  <CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.25 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: 1, bgcolor: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", color: tc.color }}>
                          {tc.icon}
                        </Box>
                        <Chip label={txn.type?.replace("_", " ")} size="small" sx={{ height: 18, fontSize: "0.55rem", fontWeight: 600, bgcolor: tc.bg, color: tc.color }} />
                      </Box>
                      <Typography variant="body2" fontWeight={700} sx={{ color: isPositive ? "#2e7d32" : "#c62828", fontSize: "0.85rem" }}>
                        {isPositive ? "+" : "-"}₹{Math.abs(txn.amount || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.65rem", display: "block", mt: 0.25, lineHeight: 1.3 }} noWrap>
                      {txn.description || "—"}
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>
                        {txn.createdAt ? moment(txn.createdAt).format("DD MMM YY, hh:mm A") : "—"}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.6rem", fontWeight: 600, color: "#667eea" }}>
                        Bal: ₹{(txn.balanceAfter || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}

        {/* Pagination */}
        {txnTotal > 20 && (
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 1.5, pb: 2 }}>
            <Button size="small" variant="outlined" disabled={txnPage <= 1} onClick={() => setTxnPage((p) => Math.max(1, p - 1))} sx={{ fontSize: "0.7rem", minWidth: 60, borderRadius: 2 }}>
              Prev
            </Button>
            <Chip label={`${txnPage} / ${Math.ceil(txnTotal / 20)}`} size="small" sx={{ alignSelf: "center", fontWeight: 600 }} />
            <Button size="small" variant="outlined" disabled={txnPage >= Math.ceil(txnTotal / 20)} onClick={() => setTxnPage((p) => p + 1)} sx={{ fontSize: "0.7rem", minWidth: 60, borderRadius: 2 }}>
              Next
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  )

  // =========================================================
  // TAB 2: WALLET
  // =========================================================
  const renderWalletTab = () => (
    <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", pb: "72px" }}>
      {walletLoading ? (
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} />
          <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }} />
          <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }} />
        </Box>
      ) : (
        <Box sx={{ p: 1.25 }}>
          {/* Balance Card */}
          <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", mb: 1.5, boxShadow: "0 4px 20px rgba(102,126,234,0.3)" }}>
            <CardContent sx={{ py: 2, px: 2 }}>
              <Typography variant="caption" sx={{ opacity: 0.8, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: 1 }}>
                Available Balance
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ my: 0.5, letterSpacing: -0.5 }}>
                ₹{dealerWallet?.availableAmount?.toLocaleString() || "0"}
              </Typography>
              <Divider sx={{ bgcolor: "rgba(255,255,255,0.2)", my: 1 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: "0.6rem" }}>Total Orders</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.85rem" }}>₹{dealerWallet?.totalOrderAmount?.toLocaleString() || "0"}</Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: "0.6rem" }}>Total Paid</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.85rem" }}>₹{dealerWallet?.totalPaidAmount?.toLocaleString() || "0"}</Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: "0.6rem" }}>Pending</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.85rem" }}>₹{dealerWallet?.remainingAmount?.toLocaleString() || "0"}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Plant Inventory */}
          <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
            <PlantIcon sx={{ fontSize: 18, color: "#4caf50" }} />
            Plant Inventory ({walletInventory.length})
          </Typography>

          {walletInventory.length === 0 ? (
            <Alert severity="info" sx={{ py: 0.5, "& .MuiAlert-message": { fontSize: "0.75rem" } }}>No inventory data available.</Alert>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {walletInventory.map((plant, idx) => {
                const utilization = plant.totalQuantity ? Math.round(((plant.totalBookedQuantity || 0) / plant.totalQuantity) * 100) : 0
                return (
                  <Card key={idx} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.8rem" }}>
                          {plant.plantName} — {plant.subtypeName}
                        </Typography>
                        <Chip
                          label={`${plant.totalRemainingQuantity?.toLocaleString() || 0} left`}
                          size="small"
                          sx={{ height: 20, fontSize: "0.6rem", fontWeight: 700, bgcolor: plant.totalRemainingQuantity > 0 ? "#e8f5e9" : "#ffebee", color: plant.totalRemainingQuantity > 0 ? "#2e7d32" : "#c62828" }}
                        />
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <LinearProgress
                          variant="determinate" value={Math.min(utilization, 100)}
                          sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "#e0e0e0",
                            "& .MuiLinearProgress-bar": { borderRadius: 3, bgcolor: utilization > 80 ? "#f44336" : utilization > 50 ? "#ff9800" : "#4caf50" }
                          }}
                        />
                        <Typography variant="caption" fontWeight={600} sx={{ fontSize: "0.6rem", minWidth: 28 }}>{utilization}%</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>Total: {plant.totalQuantity?.toLocaleString() || 0}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>Booked: {plant.totalBookedQuantity?.toLocaleString() || 0}</Typography>
                      </Box>
                      {plant.slotDetails?.length > 0 && (
                        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                          {plant.slotDetails.map((slot, sIdx) => (
                            <Chip
                              key={sIdx}
                              label={`${slot.dates?.startDay || ""}-${slot.dates?.endDay || ""} · ${slot.remainingQuantity || 0}`}
                              size="small" variant="outlined"
                              sx={{ height: 18, fontSize: "0.5rem", fontWeight: 600, borderColor: slot.remainingQuantity > 0 ? "#4caf50" : "#e0e0e0", color: slot.remainingQuantity > 0 ? "#2e7d32" : "#999" }}
                            />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          )}

          <Button size="small" variant="outlined" onClick={() => loadDealerWallet(userId)} startIcon={<RefreshIcon sx={{ fontSize: 14 }} />} sx={{ mt: 1.5, fontSize: "0.7rem", textTransform: "none", borderRadius: 2, borderColor: "#667eea", color: "#667eea" }}>
            Refresh Wallet
          </Button>
        </Box>
      )}
    </Box>
  )

  // =========================================================
  // TAB 3: PROFILE
  // =========================================================
  const renderProfileTab = () => (
    <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", pb: "72px" }}>
      <Box sx={{ p: 1.5 }}>
        {/* Profile Card */}
        <Card sx={{ borderRadius: 3, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", mb: 1.5 }}>
          <CardContent sx={{ py: 2.5, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Avatar sx={{ width: 64, height: 64, fontSize: "1.5rem", fontWeight: 700, bgcolor: "rgba(255,255,255,0.25)", border: "3px solid rgba(255,255,255,0.5)", mb: 1 }}>
              {userInitial}
            </Avatar>
            <Typography variant="h6" fontWeight={700}>{userName}</Typography>
            <Chip label={userRole} size="small" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 600, mt: 0.5, height: 22, fontSize: "0.7rem" }} />
          </CardContent>
        </Card>

        {/* Info Cards */}
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 1 }}>
          <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
            <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ mb: 0.75, fontSize: "0.8rem" }}>Account Details</Typography>
            <ProfileRow icon={<PersonIcon sx={{ fontSize: 16 }} />} label="Name" value={userName} />
            <ProfileRow icon={<PhoneIcon sx={{ fontSize: 16 }} />} label="Mobile" value={user?.phone || user?.mobileNumber || user?.phoneNumber || "—"} />
            <ProfileRow icon={<LocationIcon sx={{ fontSize: 16 }} />} label="Location" value={[user?.defaultVillage, user?.defaultTaluka, user?.defaultDistrict, user?.defaultState].filter(Boolean).join(", ") || "—"} />
            <ProfileRow icon={<ReceiptIcon sx={{ fontSize: 16 }} />} label="Job Title" value={userJobTitle || "—"} />
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 1 }}>
          <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
            <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ mb: 0.75, fontSize: "0.8rem" }}>Quick Stats</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <StatBox label="Total Orders" value={orders.length} color="#667eea" />
              <StatBox label="Pending" value={orders.filter((o) => o.orderStatus === "PENDING").length} color="#ff9800" />
              <StatBox label="Accepted" value={orders.filter((o) => o.orderStatus === "ACCEPTED").length} color="#4caf50" />
              <StatBox label="Dispatched" value={orders.filter((o) => o.orderStatus === "DISPATCHED").length} color="#2196f3" />
            </Box>
          </CardContent>
        </Card>

        {!isDealerOrSales && (
          <Button fullWidth variant="outlined" onClick={() => navigate("/u/dashboard")} startIcon={<ArrowBackIcon />} sx={{ mt: 1, textTransform: "none", borderRadius: 2, borderColor: "#667eea", color: "#667eea" }}>
            Go to Dashboard
          </Button>
        )}
      </Box>
    </Box>
  )

  // =========================================================
  // ORDER DETAIL DIALOG
  // =========================================================
  const renderOrderDetail = () => {
    if (!selectedOrder) return null
    const o = selectedOrder
    return (
      <Dialog open={detailOpen} onClose={closeOrderDetail} fullScreen TransitionComponent={Slide} TransitionProps={{ direction: "up" }}>
        <Box sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white", px: 1.5, py: 0.75, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
            <IconButton onClick={closeOrderDetail} size="small" sx={{ color: "white" }}><ArrowBackIcon sx={{ fontSize: 18 }} /></IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ fontSize: "0.85rem" }}>#{o.order}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85, fontSize: "0.65rem" }} noWrap>{o.farmerName}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Chip label={o.orderStatus} size="small" color={getStatusColor(o.orderStatus)} sx={{ fontWeight: 600, height: 22, fontSize: "0.6rem" }} />
            <IconButton onClick={refreshOrderDetail} size="small" sx={{ color: "white" }}><RefreshIcon sx={{ fontSize: 16 }} /></IconButton>
          </Box>
        </Box>

        <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ minHeight: 36, borderBottom: "1px solid #eee", bgcolor: "#fafafa",
            "& .MuiTab-root": { minHeight: 36, py: 0, fontSize: "0.7rem", textTransform: "none", fontWeight: 600, minWidth: 0 } }}>
          <Tab label="Details" />
          <Tab label="Payment" />
          <Tab label="Edit" />
          <Tab label="Remarks" />
          <Tab label="History" />
        </Tabs>

        <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
          {detailTab === 0 && renderODDetails(o)}
          {detailTab === 1 && renderODPayment(o)}
          {detailTab === 2 && renderODEdit(o)}
          {detailTab === 3 && renderODRemarks(o)}
          {detailTab === 4 && renderODHistory(o)}
        </Box>

        {o.orderStatus !== "DISPATCHED" && o.orderStatus !== "REJECTED" && (
          <Box sx={{ px: 1.5, py: 0.75, borderTop: "1px solid #eee", bgcolor: "#fafafa", display: "flex", gap: 0.75 }}>
            <Button size="small" variant="outlined" startIcon={<PaymentIcon sx={{ fontSize: "14px !important" }} />} onClick={() => setDetailTab(1)} sx={{ fontSize: "0.65rem", textTransform: "none", flex: 1, borderRadius: 2 }}>
              Add Payment
            </Button>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <Select value="" displayEmpty onChange={(e) => { if (e.target.value) handleStatusChange(e.target.value) }} disabled={statusLoading} sx={{ fontSize: "0.65rem", height: 30, borderRadius: 2 }}
                renderValue={() => statusLoading ? "..." : "Status"}>
                <MenuItem value="" disabled>Change Status</MenuItem>
                {statusOptions.filter((s) => s.value !== o.orderStatus).map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: s.color }} />{s.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
      </Dialog>
    )
  }

  // OD Sub-tabs
  const renderODDetails = (o) => (
    <Box sx={{ p: 1.25 }}>
      <MiniCard icon={<PersonIcon sx={{ fontSize: 16, color: "#667eea" }} />} title="Farmer">
        <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.82rem" }}>{o.farmerName}</Typography>
        {o.farmerMobile && <Typography variant="caption" color="text.secondary"><PhoneIcon sx={{ fontSize: 10, mr: 0.25, verticalAlign: "middle" }} />{o.farmerMobile}</Typography>}
        {(o.farmerVillage || o.farmerTaluka) && <Typography variant="caption" color="text.secondary" display="block"><LocationIcon sx={{ fontSize: 10, mr: 0.25, verticalAlign: "middle" }} />{[o.farmerVillage, o.farmerTaluka, o.farmerDistrict].filter(Boolean).join(", ")}</Typography>}
        {o.orderFor && (
          <Box sx={{ mt: 0.5, p: 0.75, bgcolor: "#fff3e0", borderRadius: 1, border: "1px solid #ffe0b2" }}>
            <Typography variant="caption" fontWeight={600} color="#e65100">Order For: {o.orderFor.name}</Typography>
            {o.orderFor.mobileNumber && <Typography variant="caption" display="block" color="text.secondary">{o.orderFor.mobileNumber}</Typography>}
          </Box>
        )}
      </MiniCard>
      <MiniCard icon={<PlantIcon sx={{ fontSize: 16, color: "#4caf50" }} />} title="Order Details">
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
          <InfoRow label="Plant" value={o.plantType} />
          <InfoRow label="Subtype" value={o.plantSubtype} />
          <InfoRow label="Quantity" value={`${o.totalPlants} plants`} />
          <InfoRow label="Rate" value={`₹${o.rate}`} />
          <InfoRow label="Slot" value={o.slotPeriod} />
          <InfoRow label="Delivery" value={o.deliveryDate} />
          <InfoRow label="Ordered" value={o.orderDate} />
          <InfoRow label="Sales" value={o.salesPerson} />
        </Box>
      </MiniCard>
      <MiniCard icon={<ReceiptIcon sx={{ fontSize: 16, color: "#ff9800" }} />} title="Payment Summary">
        <Box sx={{ display: "flex", justifyContent: "space-around" }}>
          <PaymentChip label="Total" value={`₹${o.total?.toLocaleString()}`} color="#2c3e50" />
          <PaymentChip label="Paid" value={`₹${o.paidAmt?.toLocaleString()}`} color="#4caf50" />
          <PaymentChip label="Due" value={`₹${o.remainingAmt?.toLocaleString()}`} color={o.remainingAmt > 0 ? "#f44336" : "#4caf50"} />
        </Box>
      </MiniCard>
    </Box>
  )

  const renderODPayment = (o) => (
    <Box sx={{ p: 1.25 }}>
      <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ mb: 0.75, fontSize: "0.8rem" }}>
        Payments ({o.payments?.length || 0})
      </Typography>
      {o.payments?.length > 0 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.5 }}>
          {o.payments.map((p, idx) => (
            <Card key={idx} variant="outlined" sx={{ borderRadius: 1.5 }}>
              <CardContent sx={{ py: 0.5, px: 1, "&:last-child": { pb: 0.5 } }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" fontWeight={700} sx={{ fontSize: "0.8rem" }}>₹{Number(p.paidAmount || 0).toLocaleString()}</Typography>
                  <Chip label={p.paymentStatus || "PENDING"} size="small" color={p.paymentStatus === "COLLECTED" ? "success" : "warning"} sx={{ fontSize: "0.5rem", height: 16 }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>
                  {p.modeOfPayment || "—"} · {p.paymentDate ? moment(p.paymentDate).format("DD MMM YY") : "—"}
                  {p.remark ? ` · ${p.remark}` : ""}
                </Typography>
                {p.receiptPhoto?.length > 0 && (
                  <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
                    {p.receiptPhoto.map((url, i) => <Box key={i} component="img" src={url} sx={{ width: 36, height: 36, borderRadius: 0.5, objectFit: "cover", border: "1px solid #eee" }} onClick={(e) => { e.stopPropagation(); window.open(url, "_blank") }} />)}
                  </Box>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
      {(!o.payments || o.payments.length === 0) && <Alert severity="info" sx={{ mb: 1.5, py: 0.25, "& .MuiAlert-message": { fontSize: "0.7rem" } }}>No payments yet.</Alert>}

      <Divider sx={{ mb: 1 }} />
      <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ mb: 0.75, fontSize: "0.8rem" }}>Add Payment</Typography>

      {isDealer && dealerWallet && (
        <Box sx={{ mb: 1, p: 0.75, bgcolor: "#fff3e0", borderRadius: 1.5, border: "1px solid #ffe0b2" }}>
          <FormControlLabel
            control={<Checkbox size="small" checked={newPayment.isWalletPayment} onChange={(e) => handlePaymentInputChange("isWalletPayment", e.target.checked)} />}
            label={<Box><Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.75rem" }}>Pay from Wallet</Typography><Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>Balance: ₹{dealerWallet.availableAmount?.toLocaleString()}</Typography></Box>}
          />
        </Box>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField fullWidth size="small" label="Amount (₹)" type="number" value={newPayment.paidAmount} onChange={(e) => handlePaymentInputChange("paidAmount", e.target.value)} sx={compactField} />
        <TextField fullWidth size="small" label="Date" type="date" value={newPayment.paymentDate} onChange={(e) => handlePaymentInputChange("paymentDate", e.target.value)} InputLabelProps={{ shrink: true }} sx={compactField} />
        <FormControl fullWidth size="small">
          <InputLabel sx={{ fontSize: "0.8rem" }}>Mode</InputLabel>
          <Select value={newPayment.modeOfPayment} onChange={(e) => handlePaymentInputChange("modeOfPayment", e.target.value)} label="Mode" disabled={newPayment.isWalletPayment} sx={{ ...compactField, "& .MuiSelect-select": { py: 0.75 } }}>
            <MenuItem value="">Select</MenuItem>
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="UPI">UPI</MenuItem>
            <MenuItem value="Cheque">Cheque</MenuItem>
            <MenuItem value="NEFT/RTGS">NEFT/RTGS</MenuItem>
            <MenuItem value="1341">1341</MenuItem>
            <MenuItem value="434">434</MenuItem>
          </Select>
        </FormControl>
        {(newPayment.modeOfPayment === "Cheque" || newPayment.modeOfPayment === "NEFT/RTGS") && <TextField fullWidth size="small" label="Bank Name" value={newPayment.bankName} onChange={(e) => handlePaymentInputChange("bankName", e.target.value)} sx={compactField} />}
        <TextField fullWidth size="small" label="Remark" value={newPayment.remark} onChange={(e) => handlePaymentInputChange("remark", e.target.value)} multiline rows={2} sx={compactField} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon sx={{ fontSize: 14 }} />} disabled={paymentLoading} sx={{ fontSize: "0.65rem", textTransform: "none", borderRadius: 2 }}>
            {paymentLoading ? "..." : "Receipt"}
            <input type="file" hidden accept="image/*" multiple onChange={handlePaymentImageUpload} />
          </Button>
          {newPayment.receiptPhoto?.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {newPayment.receiptPhoto.map((url, idx) => (
                <Box key={idx} sx={{ position: "relative" }}>
                  <Box component="img" src={url} sx={{ width: 40, height: 40, borderRadius: 0.5, objectFit: "cover", border: "1px solid #eee" }} />
                  <IconButton onClick={() => removePaymentImage(idx)} size="small" sx={{ position: "absolute", top: -4, right: -4, bgcolor: "rgba(244,67,54,0.9)", color: "white", width: 14, height: 14, "&:hover": { bgcolor: "#f44336" } }}>
                    <DeleteIcon sx={{ fontSize: 8 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
        </Box>
        <Button variant="contained" fullWidth onClick={handleAddPayment} disabled={paymentLoading || !newPayment.paidAmount} startIcon={paymentLoading ? <CircularProgress size={14} /> : <PaymentIcon sx={{ fontSize: 16 }} />}
          sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", textTransform: "none", fontWeight: 600, borderRadius: 2, height: 36, fontSize: "0.8rem" }}>
          {paymentLoading ? "Adding..." : "Add Payment"}
        </Button>
      </Box>
    </Box>
  )

  const renderODEdit = (o) => (
    <Box sx={{ p: 1.25 }}>
      <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ mb: 1, fontSize: "0.8rem" }}>Edit Order</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField fullWidth size="small" label="Rate (₹)" type="number" value={editData.rate || ""} onChange={(e) => setEditData((p) => ({ ...p, rate: e.target.value }))} sx={compactField} />
        <TextField fullWidth size="small" label="Plants" type="number" value={editData.quantity || ""} onChange={(e) => setEditData((p) => ({ ...p, quantity: e.target.value }))} sx={compactField} />
        <Typography variant="caption" color="text.secondary">Est. Total: ₹{((parseInt(editData.quantity) || 0) * (parseFloat(editData.rate) || 0)).toLocaleString()}</Typography>
        <Divider />
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
          <InfoRow label="Current Rate" value={`₹${o.rate}`} />
          <InfoRow label="Current Qty" value={`${o.totalPlants}`} />
        </Box>
        <Button variant="contained" fullWidth onClick={handleSaveEdit} disabled={editLoading} startIcon={editLoading ? <CircularProgress size={14} /> : <CheckIcon sx={{ fontSize: 16 }} />}
          sx={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", textTransform: "none", fontWeight: 600, borderRadius: 2, height: 36, fontSize: "0.8rem" }}>
          {editLoading ? "Saving..." : "Save Changes"}
        </Button>
      </Box>
    </Box>
  )

  const renderODRemarks = (o) => (
    <Box sx={{ p: 1.25 }}>
      <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ mb: 0.75, fontSize: "0.8rem" }}>Remarks ({Array.isArray(o.orderRemarks) ? o.orderRemarks.length : o.orderRemarks ? 1 : 0})</Typography>
      {(Array.isArray(o.orderRemarks) ? o.orderRemarks : o.orderRemarks ? [o.orderRemarks] : []).map((r, idx) => {
        const txt = typeof r === "string" ? r : r?.text || r?.remark || JSON.stringify(r)
        return (
          <Card key={idx} variant="outlined" sx={{ borderRadius: 1.5, mb: 0.5 }}>
            <CardContent sx={{ py: 0.5, px: 1, "&:last-child": { pb: 0.5 } }}>
              <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>{txt}</Typography>
              {typeof r !== "string" && r?.createdAt && <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem" }}>{moment(r.createdAt).format("DD MMM YY, hh:mm A")}</Typography>}
            </CardContent>
          </Card>
        )
      })}
      {(!o.orderRemarks || (Array.isArray(o.orderRemarks) && !o.orderRemarks.length)) && <Alert severity="info" sx={{ mb: 1, py: 0.25, "& .MuiAlert-message": { fontSize: "0.7rem" } }}>No remarks.</Alert>}
      <Divider sx={{ my: 1 }} />
      <TextField fullWidth size="small" multiline rows={2} value={newRemark} onChange={(e) => setNewRemark(e.target.value)} placeholder="Add remark..." sx={compactField} />
      <Button variant="contained" fullWidth onClick={handleAddRemark} disabled={remarkLoading || !newRemark.trim()} startIcon={remarkLoading ? <CircularProgress size={14} /> : <CommentIcon sx={{ fontSize: 16 }} />}
        sx={{ mt: 0.75, background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", textTransform: "none", fontWeight: 600, borderRadius: 2, height: 36, fontSize: "0.8rem" }}>
        {remarkLoading ? "Adding..." : "Add Remark"}
      </Button>
    </Box>
  )

  const renderODHistory = (o) => (
    <Box sx={{ p: 1.25 }}>
      <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ mb: 0.75, fontSize: "0.8rem" }}>Status History</Typography>
      {o.statusChanges?.length > 0 ? o.statusChanges.map((c, idx) => (
        <Card key={idx} variant="outlined" sx={{ borderRadius: 1.5, mb: 0.5 }}>
          <CardContent sx={{ py: 0.5, px: 1, "&:last-child": { pb: 0.5 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: getStatusDot(c.status || c.newStatus) }} />
              <Typography variant="body2" fontWeight={600} sx={{ fontSize: "0.75rem" }}>{c.status || c.newStatus || "—"}</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem" }}>
              {c.changedAt || c.date ? moment(c.changedAt || c.date).format("DD MMM YY, hh:mm A") : "—"}
              {(c.changedBy?.name || c.changedBy) ? ` · ${c.changedBy?.name || c.changedBy}` : ""}
            </Typography>
          </CardContent>
        </Card>
      )) : <Alert severity="info" sx={{ py: 0.25, "& .MuiAlert-message": { fontSize: "0.7rem" } }}>No history.</Alert>}
    </Box>
  )

  // =========================================================
  // MAIN RENDER
  // =========================================================
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "#f5f5f5", width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
      {renderHeader()}

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {activeTab === 0 && renderOrdersTab()}
        {activeTab === 1 && renderLedgerTab()}
        {activeTab === 2 && renderWalletTab()}
        {activeTab === 3 && renderProfileTab()}
      </Box>

      {renderBottomNav()}

      <AddOrderForm open={showForm} onClose={() => setShowForm(false)} onSuccess={handleSuccess} fullScreen={isMobile} />
      {renderOrderDetail()}
    </Box>
  )
}

// ================================================================
// HELPER COMPONENTS
// ================================================================
const compactField = { "& .MuiOutlinedInput-root": { borderRadius: 2 }, "& .MuiOutlinedInput-input": { py: 0.75, fontSize: "0.8rem" }, "& .MuiInputLabel-root": { fontSize: "0.8rem" } }

const InfoRow = ({ label, value }) => (
  <Box>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem", display: "block", lineHeight: 1.1 }}>{label}</Typography>
    <Typography variant="body2" fontWeight={500} sx={{ fontSize: "0.78rem", lineHeight: 1.2 }}>{value || "—"}</Typography>
  </Box>
)

const PaymentChip = ({ label, value, color }) => (
  <Box sx={{ textAlign: "center" }}>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.55rem" }}>{label}</Typography>
    <Typography variant="body2" fontWeight={700} sx={{ color, fontSize: "0.85rem" }}>{value}</Typography>
  </Box>
)

const MiniCard = ({ icon, title, children }) => (
  <Card variant="outlined" sx={{ mb: 1, borderRadius: 2 }}>
    <CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        {icon}
        <Typography variant="subtitle2" fontWeight={700} color="#2c3e50" sx={{ fontSize: "0.75rem" }}>{title}</Typography>
      </Box>
      {children}
    </CardContent>
  </Card>
)

const ProfileRow = ({ icon, label, value }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, borderBottom: "1px solid #f5f5f5" }}>
    <Box sx={{ color: "#667eea" }}>{icon}</Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>{label}</Typography>
      <Typography variant="body2" fontWeight={500} sx={{ fontSize: "0.78rem" }} noWrap>{value}</Typography>
    </Box>
  </Box>
)

const StatBox = ({ label, value, color }) => (
  <Box sx={{ p: 1, bgcolor: "#f8f9fa", borderRadius: 1.5, textAlign: "center", border: "1px solid #eee" }}>
    <Typography variant="h6" fontWeight={800} sx={{ color, fontSize: "1.1rem" }}>{value}</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>{label}</Typography>
  </Box>
)

export default PlaceOrderMobile
