import React, { useState, useEffect, useCallback, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
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
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  KeyboardArrowRight as ArrowRightIcon,
  WhatsApp as WhatsAppIcon,
  Close as CloseIcon,
} from "@mui/icons-material"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import moment from "moment"
import debounce from "lodash.debounce"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import AddOrderForm from "./AddOrderForm"
import PaymentQRModal from "components/Modals/PaymentQRModal"
import SearchableSelectField from "components/Inputs/SearchableSelectField"

// ================================================================
// THEME COLORS
// ================================================================
const C = {
  primary: "#5B5FC7",
  primaryLight: "#7B7FD7",
  primaryDark: "#4A4EB0",
  gradient: "linear-gradient(135deg, #5B5FC7 0%, #8B5CF6 100%)",
  gradientSoft: "linear-gradient(135deg, #EEF0FF 0%, #F5F0FF 100%)",
  bg: "#F7F8FC",
  cardBg: "#FFFFFF",
  textPrimary: "#1A1D2E",
  textSecondary: "#6B7185",
  textMuted: "#9CA3B8",
  border: "#E8EBF0",
  borderLight: "#F0F1F5",
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
}

const STATUS_MAP = {
  PENDING: { label: "Pending", color: C.orange, bg: C.orangeBg, text: C.orangeText },
  ACCEPTED: { label: "Accepted", color: C.green, bg: C.greenBg, text: C.greenText },
  DISPATCHED: { label: "Dispatched", color: C.blue, bg: C.blueBg, text: C.blueText },
  FARM_READY: { label: "Farm Ready", color: C.purple, bg: C.purpleBg, text: C.purpleText },
  REJECTED: { label: "Rejected", color: C.red, bg: C.redBg, text: C.redText },
}

const getLatestSlot = (slotData) => {
  if (!slotData) return null
  if (Array.isArray(slotData)) {
    const filtered = slotData.filter(Boolean)
    return filtered.length ? filtered[filtered.length - 1] : null
  }
  return slotData
}

const mapSlotForUi = (slotData) => getLatestSlot(slotData)

// Keep REJECTED rendering support for legacy orders, but do not expose it as a selectable transition.
const statusOptions = Object.entries(STATUS_MAP)
  .filter(([value]) => value !== "REJECTED")
  .map(([value, v]) => ({ value, label: v.label, color: v.color }))
const isActionLockedStatus = (status) => ["DISPATCHED", "REJECTED", "CANCELLED"].includes((status || "").toUpperCase())
const paymentModeOptions = ["Cash", "UPI", "Cheque", "NEFT/RTGS", "1341", "434"].map((m) => ({ label: m, value: m }))
const txnTypeOptions = ["CREDIT", "DEBIT", "INVENTORY_ADD", "INVENTORY_BOOK", "INVENTORY_RELEASE"].map((t) => ({
  label: t.replace("_", " "),
  value: t,
}))

const txnTypeColors = {
  CREDIT: { bg: C.greenBg, color: C.greenText, icon: <TrendingUpIcon sx={{ fontSize: 15 }} /> },
  DEBIT: { bg: C.redBg, color: C.redText, icon: <TrendingDownIcon sx={{ fontSize: 15 }} /> },
  INVENTORY_ADD: { bg: C.greenBg, color: C.greenText, icon: <InventoryIcon sx={{ fontSize: 15 }} /> },
  INVENTORY_BOOK: { bg: C.orangeBg, color: C.orangeText, icon: <InventoryIcon sx={{ fontSize: 15 }} /> },
  INVENTORY_RELEASE: { bg: C.blueBg, color: C.blueText, icon: <SwapIcon sx={{ fontSize: 15 }} /> },
}

// ================================================================
// MAIN COMPONENT
// ================================================================
function PlaceOrderMobile() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const location = useLocation()
  const navigate = useNavigate()
  const userData = useSelector((state) => state?.userData?.userData)
  const appUser = useSelector((state) => state?.app?.user)
  const user = userData || appUser || {}
  const userJobTitle = user?.jobTitle
  const userId = user?._id || user?.id
  const isDealerOrSales = userJobTitle === "DEALER" || userJobTitle === "SALES"
  const isDealer = userJobTitle === "DEALER"
  const canChangeOrderStatus = !isDealer && (userJobTitle === "SUPERADMIN" || userJobTitle === "SUPER_ADMIN" || userJobTitle === "OFFICE_ADMIN")

  const [activeTab, setActiveTab] = useState(0)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [selectedDateRange, setSelectedDateRange] = useState([new Date(Date.now() - 7 * 86400000), new Date()])
  const [statusFilter, setStatusFilter] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [addPaymentOpen, setAddPaymentOpen] = useState(null)
  const [paymentQRModalOpen, setPaymentQRModalOpen] = useState(false)
  const [paymentQRModalData, setPaymentQRModalData] = useState(null)
  const [generateQRLoading, setGenerateQRLoading] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailTab, setDetailTab] = useState(0)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [newPayment, setNewPayment] = useState({ paidAmount: "", paymentDate: moment().format("YYYY-MM-DD"), modeOfPayment: "", bankName: "", remark: "", receiptPhoto: [], paymentStatus: "PENDING", isWalletPayment: false })
  const [newRemark, setNewRemark] = useState("")
  const [remarkLoading, setRemarkLoading] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [dealerWallet, setDealerWallet] = useState(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletInventory, setWalletInventory] = useState([])
  const [walletSubTab, setWalletSubTab] = useState(0)
  const [dealerStats, setDealerStats] = useState(null)
  const [dealerDetail, setDealerDetail] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [txnLoading, setTxnLoading] = useState(false)
  const [txnPage, setTxnPage] = useState(1)
  const [txnTotal, setTxnTotal] = useState(0)
  const [txnTypeFilter, setTxnTypeFilter] = useState("")
  const [plantLedgerEntries, setPlantLedgerEntries] = useState([])
  const [plantLedgerLoading, setPlantLedgerLoading] = useState(false)
  const [plantLedgerPage, setPlantLedgerPage] = useState(1)
  const [orderMode, setOrderMode] = useState(location.state?.orderMode === "plant" ? "plant" : null)
  const [shareOrderDialogOpen, setShareOrderDialogOpen] = useState(false)
  const [shareOrderPayload, setShareOrderPayload] = useState(null)
  // Bulk payment (plant orders – same flow as agri mobile)
  const [showBulkPaymentDialog, setShowBulkPaymentDialog] = useState(false)
  const [bulkPaymentMain, setBulkPaymentMain] = useState({
    totalAmount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    modeOfPayment: "",
    bankName: "",
    remark: "",
    transactionId: "",
    chequeNumber: "",
    receiptPhoto: [],
  })
  const [bulkAllocations, setBulkAllocations] = useState([])
  const [pendingBulkAmounts, setPendingBulkAmounts] = useState({})
  const [bulkPaymentSubmitting, setBulkPaymentSubmitting] = useState(false)
  const [bulkOrderSearch, setBulkOrderSearch] = useState("")
  const [bulkOrderSearchResults, setBulkOrderSearchResults] = useState([])
  const [bulkOrderSearchLoading, setBulkOrderSearchLoading] = useState(false)
  const bulkOrderSearchTimerRef = useRef(null)

  useEffect(() => {
    const handler = debounce(() => setDebouncedSearchTerm(searchTerm), 400)
    handler()
    return () => handler.cancel()
  }, [searchTerm])

  useEffect(() => {
    if (userId) {
      loadTransactions()
      if (isDealer) {
        loadDealerWallet(userId)
        loadDealerDetail(userId)
        loadDealerStats(userId)
      }
    }
  }, [userId, isDealer])
  useEffect(() => { if (userId) loadTransactions() }, [txnPage, txnTypeFilter])
  useEffect(() => { if (isDealer && userId && walletSubTab === 1) loadPlantLedger() }, [isDealer, userId, walletSubTab, plantLedgerPage])

  const loadDealerWallet = async (dealerId) => {
    setWalletLoading(true)
    try {
      const instance = NetworkManager(API.USER.GET_DEALER_WALLET_DETAILS)
      const response = await instance.request({}, [dealerId])
      const data = response?.data?.data || response?.data
      setDealerWallet({
        availableAmount: data?.financial?.availableAmount || 0,
        totalOrderAmount: data?.financial?.totalOrderAmount || 0,
        totalPaidAmount: data?.financial?.totalPaidAmount || 0,
        remainingAmount: data?.financial?.remainingAmount || 0,
        dealer: data?.dealer || null,
      })
      setWalletInventory(data?.plantDetails || [])
    } catch (err) { console.error("Error loading wallet:", err) } finally { setWalletLoading(false) }
  }

  const loadDealerDetail = async (dealerId) => {
    try {
      const instance = NetworkManager(API.USER.GET_DEALERS)
      const response = await instance.request({}, [dealerId])
      if (response?.data?.data) {
        const d = response.data.data
        setDealerDetail(d)
        if (d.financial) {
          setDealerWallet((prev) => ({
            ...prev,
            availableAmount: d.financial.availableAmount || prev?.availableAmount || 0,
            totalOrderAmount: d.financial.totalOrderAmount || prev?.totalOrderAmount || 0,
            totalPaidAmount: d.financial.totalPaidAmount || prev?.totalPaidAmount || 0,
            remainingAmount: d.financial.remainingAmount || prev?.remainingAmount || 0,
            pendingPayment: d.financial.pendingPayment || 0,
          }))
        }
        if (d.plantDetails?.length) setWalletInventory(d.plantDetails)
      }
    } catch (err) { console.error("Error loading dealer detail:", err) }
  }

  const loadDealerStats = async (dealerId) => {
    try {
      const instance = NetworkManager(API.USER.GET_DEALERS_STATS)
      const response = await instance.request({}, [dealerId])
      if (response?.data) setDealerStats(response.data)
    } catch (err) { console.error("Error loading dealer stats:", err) }
  }

  const loadTransactions = async () => {
    if (!userId) return
    setTxnLoading(true)
    try {
      const instance = NetworkManager(API.USER.GET_DEALERS_TRANSACTIONS)
      const response = await instance.request({}, [userId], { params: { page: txnPage, limit: 20, ...(txnTypeFilter && { type: txnTypeFilter }) } })
      const { transactions: txns, pagination } = response?.data?.data || {}
      setTransactions(txns || [])
      setTxnTotal(pagination?.total || 0)
    } catch (err) { console.error("Error loading transactions:", err); setTransactions([]) } finally { setTxnLoading(false) }
  }

  const loadPlantLedger = async () => {
    if (!userId) return
    setPlantLedgerLoading(true)
    try {
      const instance = NetworkManager(API.USER.GET_DEALER_PLANT_LEDGER)
      const response = await instance.request({}, [userId, "plant-ledger"], { params: { page: plantLedgerPage, limit: 15 } })
      const entries = response?.data?.data?.entries || []
      setPlantLedgerEntries(entries)
    } catch (err) { console.error("Error loading plant ledger:", err); setPlantLedgerEntries([]) } finally { setPlantLedgerLoading(false) }
  }

  const getTotalPaid = (payment) => {
    if (!payment || !Array.isArray(payment)) return 0
    return payment.reduce((t, p) => t + (p?.paymentStatus === "COLLECTED" ? Number(p.paidAmount) || 0 : 0), 0)
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
      const params = { search: debouncedSearchTerm || "", dispatched: false, limit: 500, page: 1 }
      if (startDate && endDate) { params.startDate = moment(startDate).format("DD-MM-YYYY"); params.endDate = moment(endDate).format("DD-MM-YYYY") }
      if (statusFilter) params.status = statusFilter
      if (isDealerOrSales && userId) params.salesPerson = userId
      const response = await instance.request({}, params)
      const rawData = response?.data?.data?.data || []
      const mapped = rawData.map((data) => {
        const { farmer, numberOfPlants = 0, additionalPlants = 0, totalPlants, rate, salesPerson, createdAt, orderStatus, id, payment, bookingSlot, orderId, plantType, plantSubtype, orderFor, dealerOrder, orderBookingDate, deliveryDate, orderRemarks, statusChanges } = data || {}
        const totalPlantCount = typeof totalPlants === "number" ? totalPlants : (numberOfPlants || 0) + (additionalPlants || 0)
        const totalOrderAmount = Number(rate || 0) * totalPlantCount
        const paid = getTotalPaid(payment)
        const latestSlot = mapSlotForUi(bookingSlot)
        const startDay = latestSlot?.startDay
        const endDay = latestSlot?.endDay
        const farmerName = orderFor ? `${farmer?.name || "Unknown"} → ${orderFor.name}` : dealerOrder ? `Dealer: ${salesPerson?.name || "Unknown"}` : farmer?.name || "Unknown"
        return {
          _id: id, order: orderId, farmerName,
          farmerMobile: farmer?.mobileNumber || "", farmerVillage: farmer?.village || "",
          farmerTaluka: farmer?.talukaName || farmer?.taluka || "", farmerDistrict: farmer?.districtName || farmer?.district || "",
          plantType: plantType?.name || "—", plantSubtype: plantSubtype?.name || "—",
          plantTypeDisplay: `${plantType?.name || "—"} / ${plantSubtype?.name || "—"}`,
          quantity: numberOfPlants || 0, totalPlants: totalPlantCount,
          rate: rate || 0, total: totalOrderAmount, paidAmt: paid, remainingAmt: totalOrderAmount - paid,
          orderStatus: orderStatus || "—",
          slotPeriod: startDay && endDay ? `${startDay} to ${endDay}` : "—",
          orderDate: moment(orderBookingDate || createdAt).format("DD MMM YY"),
          deliveryDate: deliveryDate ? moment(deliveryDate).format("DD MMM YY") : "—",
          deliveryDateRaw: deliveryDate || null,
          payments: payment || [], orderRemarks: orderRemarks || [],
          salesPerson: salesPerson?.name || "—", dealerOrder: dealerOrder || false, orderFor: orderFor || null,
          statusChanges: statusChanges || [],
        }
      }).filter((o) => o && o.order)
      setOrders(mapped)
    } catch (error) { console.error("Error fetching orders:", error); Toast.error("Failed to load orders"); setOrders([]) } finally { setLoading(false) }
  }, [selectedDateRange, debouncedSearchTerm, statusFilter, isDealerOrSales, userId])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const searchBulkOrders = useCallback(async (search) => {
    if (!search || String(search).trim().length < 2) {
      setBulkOrderSearchResults([])
      return
    }
    setBulkOrderSearchLoading(true)
    try {
      const instance = NetworkManager(API.ORDER.GET_ORDERS)
      const params = { search: String(search).trim(), limit: 30, page: 1 }
      if (isDealerOrSales && userId) params.salesPerson = userId
      const response = await instance.request({}, params)
      const rawData = response?.data?.data?.data || []
      const mapped = rawData.map((data) => {
        const { farmer, numberOfPlants = 0, additionalPlants = 0, totalPlants, rate, salesPerson, id, payment, orderId } = data || {}
        const totalPlantCount = typeof totalPlants === "number" ? totalPlants : (numberOfPlants || 0) + (additionalPlants || 0)
        const totalOrderAmount = Number(rate || 0) * totalPlantCount
        const paid = getTotalPaid(payment)
        const outstanding = Math.max(0, totalOrderAmount - paid)
        return {
          orderId: id,
          orderNumber: orderId,
          farmerName: farmer?.name || "—",
          village: farmer?.village || farmer?.villageName || "—",
          taluka: farmer?.talukaName || farmer?.taluka || "—",
          district: farmer?.districtName || farmer?.district || "—",
          salesPersonName: salesPerson?.name || "—",
          outstanding,
        }
      }).filter((o) => o && o.orderId)
      setBulkOrderSearchResults(mapped)
    } catch (e) {
      console.error("Bulk order search:", e)
      setBulkOrderSearchResults([])
    } finally {
      setBulkOrderSearchLoading(false)
    }
  }, [isDealerOrSales, userId])

  useEffect(() => {
    if (!showBulkPaymentDialog) return
    if (bulkOrderSearchTimerRef.current) clearTimeout(bulkOrderSearchTimerRef.current)
    const q = String(bulkOrderSearch).trim()
    if (q.length < 2) {
      setBulkOrderSearchResults([])
      return
    }
    bulkOrderSearchTimerRef.current = setTimeout(() => searchBulkOrders(q), 350)
    return () => { if (bulkOrderSearchTimerRef.current) clearTimeout(bulkOrderSearchTimerRef.current) }
  }, [showBulkPaymentDialog, bulkOrderSearch, searchBulkOrders])

  const addOrderToBulkAllocation = (item, amount) => {
    const amt = parseFloat(amount)
    if (!item?.orderId || isNaN(amt) || amt <= 0) return
    const orderLabel = `#${item.orderNumber || item.orderId}`
    setBulkAllocations((prev) => {
      if (prev.some((a) => a.orderId === item.orderId)) return prev
      return [...prev, { ...item, amount: amt, orderLabel }]
    })
    setPendingBulkAmounts((prev) => ({ ...prev, [item.orderId]: "" }))
  }

  const removeBulkAllocation = (orderId) => {
    setBulkAllocations((prev) => prev.filter((a) => a.orderId !== orderId))
    setPendingBulkAmounts((prev) => { const next = { ...prev }; delete next[orderId]; return next })
  }

  const handleBulkPaymentSubmit = async () => {
    if (!bulkAllocations.length) {
      Toast.error("Add at least one order")
      return
    }
    const totalAmount = bulkAllocations.reduce((s, a) => s + (Number(a.amount) || 0), 0)
    if (!totalAmount || totalAmount <= 0) {
      Toast.error("Enter valid amounts for orders")
      return
    }
    const { modeOfPayment, paymentDate, receiptPhoto, bankName, remark, transactionId, chequeNumber } = bulkPaymentMain
    if (!modeOfPayment) {
      Toast.error("Select payment mode")
      return
    }
    const needsReceipt = modeOfPayment && !["Cash", "NEFT/RTGS", "Wallet"].includes(modeOfPayment)
    if (needsReceipt && (!receiptPhoto || !receiptPhoto.length)) {
      Toast.error("Receipt photo required for this payment mode")
      return
    }
    setBulkPaymentSubmitting(true)
    try {
      const allocations = bulkAllocations.map((a) => ({
        orderId: a.orderId,
        amount: Number(a.amount),
        orderType: "ORDER",
        source: "PLANT",
      }))
      const payload = {
        totalAmount,
        paymentDate: paymentDate || moment().format("YYYY-MM-DD"),
        modeOfPayment,
        bankName: bankName || "",
        remark: remark || "",
        receiptPhoto: receiptPhoto || [],
        transactionId: transactionId || undefined,
        chequeNumber: chequeNumber || undefined,
        allocations,
      }
      const instance = NetworkManager(API.ORDER.POST_BULK_PAYMENT)
      await instance.request(payload)
      Toast.success("Bulk payment added")
      setShowBulkPaymentDialog(false)
      setBulkAllocations([])
      setPendingBulkAmounts({})
      setBulkPaymentMain({ totalAmount: "", paymentDate: moment().format("YYYY-MM-DD"), modeOfPayment: "", bankName: "", remark: "", transactionId: "", chequeNumber: "", receiptPhoto: [] })
      setBulkOrderSearch("")
      setBulkOrderSearchResults([])
      fetchOrders()
    } catch (err) {
      Toast.error(err?.response?.data?.message || "Bulk payment failed")
    } finally {
      setBulkPaymentSubmitting(false)
    }
  }

  const handleSuccess = (createdOrderPayload) => {
    setShowForm(false)
    fetchOrders()
    if (createdOrderPayload) {
      setShareOrderPayload(createdOrderPayload)
      setShareOrderDialogOpen(true)
    }
  }

  const getStatus = (status) => STATUS_MAP[(status || "").toUpperCase()] || { label: status, color: "#9CA3B8", bg: "#F0F1F5", text: "#6B7185" }
  const getStatusColor = (status) => {
    const s = (status || "").toUpperCase()
    if (s === "ACCEPTED") return "success"; if (s === "DISPATCHED") return "info"
    if (s === "PENDING" || s === "FARM_READY") return "warning"; if (s === "REJECTED") return "error"
    return "default"
  }

  const toggleExpand = (orderId, order) => {
    if (expandedOrder === orderId) { setExpandedOrder(null); setSelectedOrder(null); setAddPaymentOpen(null) }
    else { setExpandedOrder(orderId); setSelectedOrder(order); setNewPayment({ paidAmount: "", paymentDate: moment().format("YYYY-MM-DD"), modeOfPayment: "", bankName: "", remark: "", receiptPhoto: [], paymentStatus: "PENDING", isWalletPayment: false }); setAddPaymentOpen(null) }
  }

  const openOrderDetail = (order) => {
    setSelectedOrder(order); setDetailTab(0)
    setNewPayment({ paidAmount: "", paymentDate: moment().format("YYYY-MM-DD"), modeOfPayment: "", bankName: "", remark: "", receiptPhoto: [], paymentStatus: "PENDING", isWalletPayment: false })
    setNewRemark(""); setDetailOpen(true)
  }
  const closeOrderDetail = () => { setDetailOpen(false); setSelectedOrder(null) }
  const refreshOrderDetail = async () => {
    await fetchOrders()
    if (selectedOrder) setTimeout(() => { setOrders((prev) => { const u = prev.find((o) => o._id === selectedOrder._id); if (u) setSelectedOrder(u); return prev }) }, 100)
  }

  const handlePaymentInputChange = (field, value) => {
    setNewPayment((prev) => { const u = { ...prev, [field]: value }; if (field === "isWalletPayment" && value) u.modeOfPayment = "Wallet"; return u })
  }
  const handlePaymentImageUpload = async (event) => {
    const files = Array.from(event.target.files); if (!files.length) return
    for (const file of files) { if (!file.type.startsWith("image/")) { Toast.error("Select valid images"); return } if (file.size > 8 * 1024 * 1024) { Toast.error("Max 8MB per file"); return } }
    try {
      setPaymentLoading(true)
      const urls = await Promise.all(files.map(async (file) => { const fd = new FormData(); fd.append("media_key", file); fd.append("media_type", "IMAGE"); fd.append("content_type", "multipart/form-data"); const inst = NetworkManager(API.MEDIA.UPLOAD); const res = await inst.request(fd); return res.data.media_url }))
      setNewPayment((prev) => ({ ...prev, receiptPhoto: [...(prev.receiptPhoto || []), ...urls] }))
    } catch { Toast.error("Upload failed") } finally { setPaymentLoading(false) }
  }
  const removePaymentImage = (index) => { setNewPayment((prev) => ({ ...prev, receiptPhoto: prev.receiptPhoto.filter((_, i) => i !== index) })) }

  const handleAddPayment = async () => {
    if (!selectedOrder) return
    if (!newPayment.paidAmount || parseFloat(newPayment.paidAmount) <= 0) { Toast.error("Enter valid amount"); return }
    if (!newPayment.isWalletPayment && !newPayment.modeOfPayment) { Toast.error("Select payment mode"); return }
    if (newPayment.modeOfPayment && !["Cash", "NEFT/RTGS", "Wallet"].includes(newPayment.modeOfPayment) && (!newPayment.receiptPhoto || !newPayment.receiptPhoto.length)) { Toast.error(`Receipt required for ${newPayment.modeOfPayment}`); return }
    if (newPayment.isWalletPayment && dealerWallet && parseFloat(newPayment.paidAmount) > dealerWallet.availableAmount) { Toast.error(`Exceeds wallet balance (₹${dealerWallet.availableAmount?.toLocaleString()})`); return }
    setPaymentLoading(true)
    try {
      const payload = { paidAmount: newPayment.paidAmount, paymentDate: newPayment.paymentDate, modeOfPayment: newPayment.isWalletPayment ? "Wallet" : newPayment.modeOfPayment, bankName: newPayment.bankName || "", remark: newPayment.remark || "", receiptPhoto: newPayment.receiptPhoto || [], isWalletPayment: Boolean(newPayment.isWalletPayment), paymentStatus: "PENDING" }
      const inst = NetworkManager(API.ORDER.ADD_PAYMENT); await inst.request(payload, [selectedOrder._id])
      Toast.success("Payment added")
      setNewPayment({ paidAmount: "", paymentDate: moment().format("YYYY-MM-DD"), modeOfPayment: "", bankName: "", remark: "", receiptPhoto: [], paymentStatus: "PENDING", isWalletPayment: false })
      if (userId) loadDealerWallet(userId); await refreshOrderDetail()
    } catch (err) { Toast.error(err?.response?.data?.message || "Failed to add payment") } finally { setPaymentLoading(false) }
  }
  const handleGeneratePaymentQR = async (row) => {
    if (!row?._id) { Toast.error("Order not found"); return }
    setGenerateQRLoading(true)
    try {
      const inst = NetworkManager(API.ORDER.GENERATE_PAYMENT_QR)
      const res = await inst.request({}, [row._id])
      const data = res?.data
      if (data?.success && data?.qrImageOrString != null) {
        setPaymentQRModalData({ qrImageOrString: data.qrImageOrString, amount: data.amount, orderId: data.orderId, customerName: data.customerName, mobileNumber: data.mobileNumber, expiresAt: data.expiresAt })
        setPaymentQRModalOpen(true)
        Toast.success("QR generated")
        refreshOrderDetail()
      } else { Toast.error(data?.message || "Failed to generate QR") }
    } catch (err) { Toast.error(err?.response?.data?.message || "Failed to generate payment QR") } finally { setGenerateQRLoading(false) }
  }
  const [watiDialogOpen, setWatiDialogOpen] = useState(false)
  const [watiSending, setWatiSending] = useState(false)
  const handleStatusChange = async (newStatus) => {
    if (!selectedOrder) return; setStatusLoading(true)
    try {
      const inst = NetworkManager(API.ORDER.UPDATE_ORDER)
      await inst.request({ id: selectedOrder._id, orderStatus: newStatus })
      Toast.success(`Status → ${newStatus}`)
      await refreshOrderDetail()
      if (newStatus === "ACCEPTED" && !selectedOrder.dealerOrder && selectedOrder.farmerMobile) {
        setWatiDialogOpen(true)
      }
    } catch (err) { Toast.error(err?.response?.data?.message || "Failed") } finally { setStatusLoading(false) }
  }
  const handleAddRemark = async () => {
    if (!selectedOrder || !newRemark.trim()) return; setRemarkLoading(true)
    try { const inst = NetworkManager(API.ORDER.UPDATE_ORDER); await inst.request({ id: selectedOrder._id, orderRemarks: newRemark.trim() }); Toast.success("Remark added"); setNewRemark(""); await refreshOrderDetail() }
    catch { Toast.error("Failed") } finally { setRemarkLoading(false) }
  }

  const userName = user?.name || user?.firstName || "User"
  const userInitial = userName.charAt(0).toUpperCase()
  const userRole = userJobTitle === "DEALER" ? "Dealer" : userJobTitle === "SALES" ? "Sales" : userJobTitle === "OFFICE_ADMIN" ? "Admin" : userJobTitle === "SUPERADMIN" ? "Super Admin" : userJobTitle || "User"

  // =========================================================
  // HEADER
  // =========================================================
  const renderHeader = () => (
    <Box sx={{ position: "sticky", top: 0, zIndex: 1100, flexShrink: 0, background: C.gradient, boxShadow: "0 4px 20px rgba(91,95,199,0.25)" }}>
      <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.25, gap: 1.5 }}>
        <IconButton size="small" onClick={() => navigate("/u/mobile")} sx={{ color: "white", p: 0.5, mr: 0.5 }} aria-label="Back to dashboard">
          <ArrowBackIcon sx={{ fontSize: 26 }} />
        </IconButton>
        <Avatar sx={{ width: 40, height: 40, bgcolor: "rgba(255,255,255,0.2)", fontSize: "1rem", fontWeight: 800, border: "2.5px solid rgba(255,255,255,0.35)", letterSpacing: 0 }}>
          {userInitial}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ color: "white", fontWeight: 800, lineHeight: 1.2, fontSize: "1rem", letterSpacing: "-0.01em" }} noWrap>
            {userName}
          </Typography>
          <Typography sx={{ color: "rgba(255,255,255,0.7)", fontSize: "0.7rem", fontWeight: 500, lineHeight: 1.2 }}>
            {userRole} · Plant orders
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          onClick={() => navigate("/u/mobile/agri-sales-order")}
          startIcon={<InventoryIcon sx={{ fontSize: 18 }} />}
          sx={{
            borderColor: "rgba(255,255,255,0.8)",
            color: "white",
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "none",
            borderRadius: 2,
            py: 0.5,
            px: 1,
            "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" },
          }}>
          Agri orders
        </Button>
        {isDealer && dealerWallet && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, bgcolor: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", borderRadius: 2, px: 1.25, py: 0.5 }}>
            <WalletIcon sx={{ fontSize: 16, color: "rgba(255,255,255,0.8)" }} />
            <Typography sx={{ color: "white", fontWeight: 800, fontSize: "0.8rem" }}>
              ₹{dealerWallet.availableAmount?.toLocaleString() || 0}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )

  // =========================================================
  // BOTTOM NAV
  // =========================================================
  const renderBottomNav = () => (
    <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200, borderTop: `1px solid ${C.border}` }} elevation={12}>
      <BottomNavigation value={activeTab} onChange={(_, v) => setActiveTab(v)} showLabels
        sx={{
          height: 60, bgcolor: "white",
          "& .MuiBottomNavigationAction-root": { minWidth: 0, py: 0.75, color: C.textMuted, "&.Mui-selected": { color: C.primary } },
          "& .MuiBottomNavigationAction-label": { fontSize: "0.65rem", fontWeight: 600, mt: 0.25, "&.Mui-selected": { fontSize: "0.65rem", fontWeight: 700 } },
        }}>
        <BottomNavigationAction label="Orders" icon={<Badge badgeContent={orders.length > 99 ? "99+" : orders.length || null} color="error" max={999} sx={{ "& .MuiBadge-badge": { fontSize: "0.5rem", height: 14, minWidth: 14 } }}><OrdersIcon sx={{ fontSize: 24 }} /></Badge>} />
        {isDealer && <BottomNavigationAction label="Ledger" icon={<LedgerIcon sx={{ fontSize: 24 }} />} />}
        {isDealer && <BottomNavigationAction label="Wallet" icon={<WalletIcon sx={{ fontSize: 24 }} />} />}
        <BottomNavigationAction label="Profile" icon={<PersonIcon sx={{ fontSize: 24 }} />} />
      </BottomNavigation>
    </Paper>
  )

  // =========================================================
  // TAB 0: ORDERS
  // =========================================================
  const renderOrdersTab = () => {
    const isExp = (id) => expandedOrder === id

    const renderPaymentSection = (row) => {
      const payments = row.payments || []
      const paidTotal = getTotalPaidAll(payments)
      return (
        <Box>
          {/* Summary */}
          <Box sx={{ display: "flex", borderRadius: 2, overflow: "hidden", mb: 1.25, border: `1px solid ${C.border}` }}>
            <SummaryCell label="Total" value={`₹${row.total?.toLocaleString()}`} color={C.textPrimary} />
            <SummaryCell label="Paid" value={`₹${paidTotal?.toLocaleString()}`} color={C.green} border />
            <SummaryCell label="Due" value={`₹${row.remainingAmt?.toLocaleString()}`} color={row.remainingAmt > 0 ? C.red : C.green} border />
          </Box>

          {/* Payments list */}
          <Box sx={{ mb: 1 }}>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: C.textPrimary, mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
              <ReceiptIcon sx={{ fontSize: 16, color: C.primary }} /> Payment History
              <Chip label={payments.length} size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700, bgcolor: C.primaryLight + "20", color: C.primary, ml: 0.5 }} />
            </Typography>
            {payments.length === 0 ? (
              <Box sx={{ py: 1.5, textAlign: "center", bgcolor: C.bg, borderRadius: 2 }}>
                <Typography sx={{ fontSize: "0.75rem", color: C.textMuted }}>No payments recorded yet</Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {payments.map((p, idx) => {
                  const collected = p.paymentStatus === "COLLECTED"
                  return (
                    <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.75, bgcolor: collected ? C.greenBg : C.orangeBg, borderRadius: 2, border: `1px solid ${collected ? "#BBF7D0" : "#FDE68A"}` }}>
                      <Box sx={{ width: 30, height: 30, borderRadius: "50%", bgcolor: collected ? C.green : C.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {collected ? <CheckIcon sx={{ fontSize: 15, color: "white" }} /> : <PaymentIcon sx={{ fontSize: 15, color: "white" }} />}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography sx={{ fontSize: "0.88rem", fontWeight: 800, color: C.textPrimary }}>
                            ₹{Number(p.paidAmount || 0).toLocaleString()}
                          </Typography>
                          <Chip label={collected ? "Collected" : "Pending"} size="small"
                            sx={{ height: 18, fontSize: "0.55rem", fontWeight: 700, bgcolor: collected ? C.green + "20" : C.orange + "20", color: collected ? C.greenText : C.orangeText }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.68rem", color: C.textSecondary, mt: 0.15 }}>
                          <Box component="span" sx={{ fontWeight: 600 }}>{p.modeOfPayment || "—"}</Box>
                          {" · "}{p.paymentDate ? moment(p.paymentDate).format("DD MMM YY") : "—"}
                          {p.remark && <Box component="span" sx={{ fontStyle: "italic" }}> · {p.remark}</Box>}
                        </Typography>
                        {p.receiptPhoto?.length > 0 && (
                          <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
                            {p.receiptPhoto.map((url, i) => (
                              <Box key={i} component="img" src={url} sx={{ width: 34, height: 34, borderRadius: 1, objectFit: "cover", border: "1px solid #ddd", cursor: "pointer" }}
                                onClick={(e) => { e.stopPropagation(); window.open(url, "_blank") }} />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )
                })}
              </Box>
            )}
          </Box>

          {/* Add Payment / Generate QR */}
          {!isActionLockedStatus(row.orderStatus) && (
            <Box>
              {(() => {
                const totalAmt = (row.rate || 0) * ((row.numberOfPlants || 0) + (row.additionalPlants || 0))
                const paidAmt = (row.payment || []).reduce((s, p) => s + (p?.paymentStatus === "COLLECTED" ? Number(p?.paidAmount || 0) : 0), 0)
                const balance = Math.max(0, totalAmt - paidAmt)
                const now = new Date()
                const hasActiveQR = (row.payment || []).some((p) => p.paymentStatus === "PENDING" && p.qrReferenceId && p.qrExpiresAt && new Date(p.qrExpiresAt) > now)
                return (
                  <Box sx={{ display: "flex", gap: 0.5, mb: 0.5 }}>
                    {balance > 0 && !hasActiveQR && (
                      <Button size="small" variant="outlined" disabled={generateQRLoading}
                        startIcon={<PaymentIcon sx={{ fontSize: 15 }} />}
                        onClick={(e) => { e.stopPropagation(); handleGeneratePaymentQR(row) }}
                        sx={{ flex: 1, fontSize: "0.7rem", fontWeight: 700, textTransform: "none", borderRadius: 2, height: 34, borderColor: "#0d9488", color: "#0d9488" }}>
                        {generateQRLoading ? "…" : "QR Pay"}
                      </Button>
                    )}
                    <Button fullWidth={balance <= 0 || hasActiveQR} size="small"
                      variant={addPaymentOpen === row._id ? "contained" : "outlined"}
                      startIcon={<PaymentIcon sx={{ fontSize: 15 }} />}
                      onClick={(e) => { e.stopPropagation(); setAddPaymentOpen(addPaymentOpen === row._id ? null : row._id); setSelectedOrder(row) }}
                      sx={{ flex: 1, fontSize: "0.75rem", fontWeight: 700, textTransform: "none", borderRadius: 2, height: 34,
                        ...(addPaymentOpen === row._id ? { background: C.gradient, boxShadow: "0 2px 8px rgba(91,95,199,0.3)" } : { borderColor: C.primary, color: C.primary })
                      }}>
                      {addPaymentOpen === row._id ? "Close" : "Add Payment"}
                    </Button>
                  </Box>
                )
              })()}
              <Collapse in={addPaymentOpen === row._id}>
                <Box sx={{ p: 1.25, bgcolor: C.bg, borderRadius: 2, border: `1px solid ${C.border}`, mt: 0.5 }}>
                  {isDealer && dealerWallet && (
                    <Box sx={{ mb: 1, p: 0.75, bgcolor: C.orangeBg, borderRadius: 1.5, border: "1px solid #FDE68A" }}>
                      <FormControlLabel
                        control={<Checkbox size="small" checked={newPayment.isWalletPayment} onChange={(e) => handlePaymentInputChange("isWalletPayment", e.target.checked)} sx={{ p: 0.25, color: C.primary, "&.Mui-checked": { color: C.primary } }} />}
                        label={<Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: C.orangeText }}>Wallet — ₹{dealerWallet.availableAmount?.toLocaleString()}</Typography>}
                        sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: 0.5 } }}
                      />
                    </Box>
                  )}
                  <Box sx={{ display: "flex", gap: 0.75, mb: 0.75 }}>
                    <TextField size="small" placeholder="Amount ₹" type="number" value={newPayment.paidAmount} onChange={(e) => handlePaymentInputChange("paidAmount", e.target.value)} sx={{ flex: 1, ...fieldSx }} />
                    <TextField size="small" type="date" value={newPayment.paymentDate} onChange={(e) => handlePaymentInputChange("paymentDate", e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 130, ...fieldSx }} />
                  </Box>
                  <Box sx={{ display: "flex", gap: 0.75, mb: 0.75 }}>
                    <SearchableSelectField
                      options={[{ label: "Mode", value: "" }, ...paymentModeOptions]}
                      value={newPayment.modeOfPayment}
                      onChange={(val) => handlePaymentInputChange("modeOfPayment", val)}
                      placeholder="Search mode..."
                      disabled={newPayment.isWalletPayment}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon sx={{ fontSize: 13 }} />} disabled={paymentLoading}
                      sx={{ fontSize: "0.65rem", textTransform: "none", borderRadius: 2, height: 36, minWidth: 80, borderColor: C.border, color: C.textSecondary }}>
                      {paymentLoading ? "..." : "Receipt"}<input type="file" hidden accept="image/*" multiple onChange={handlePaymentImageUpload} />
                    </Button>
                  </Box>
                  {newPayment.receiptPhoto?.length > 0 && (
                    <Box sx={{ display: "flex", gap: 0.5, mb: 0.75 }}>
                      {newPayment.receiptPhoto.map((url, idx) => (
                        <Box key={idx} sx={{ position: "relative" }}>
                          <Box component="img" src={url} sx={{ width: 40, height: 40, borderRadius: 1, objectFit: "cover", border: `1px solid ${C.border}` }} />
                          <IconButton onClick={() => removePaymentImage(idx)} size="small" sx={{ position: "absolute", top: -6, right: -6, bgcolor: C.red, color: "white", width: 16, height: 16, "&:hover": { bgcolor: C.red } }}>
                            <DeleteIcon sx={{ fontSize: 9 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                  <TextField size="small" fullWidth placeholder="Remark (optional)" value={newPayment.remark} onChange={(e) => handlePaymentInputChange("remark", e.target.value)} sx={{ mb: 0.75, ...fieldSx }} />
                  <Button fullWidth variant="contained" size="small" disabled={paymentLoading || !newPayment.paidAmount} onClick={handleAddPayment}
                    startIcon={paymentLoading ? <CircularProgress size={14} /> : <CheckIcon sx={{ fontSize: 15 }} />}
                    sx={{ height: 36, fontSize: "0.78rem", textTransform: "none", fontWeight: 700, borderRadius: 2, background: C.gradient, boxShadow: "0 2px 8px rgba(91,95,199,0.3)" }}>
                    {paymentLoading ? "Adding..." : "Submit Payment"}
                  </Button>
                </Box>
              </Collapse>
            </Box>
          )}

          {/* Actions */}
          <Box sx={{ display: "flex", gap: 0.75, mt: 1, pt: 0.75, borderTop: `1px solid ${C.borderLight}` }}>
            <Button size="small" variant="text" endIcon={<ArrowRightIcon sx={{ fontSize: 16 }} />}
              onClick={(e) => { e.stopPropagation(); openOrderDetail(row) }}
              sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "none", color: C.primary, flex: 1 }}>
              Full Details
            </Button>
            {canChangeOrderStatus && !isActionLockedStatus(row.orderStatus) && (
              <Box sx={{ minWidth: 140 }} onClick={(e) => e.stopPropagation()}>
                <SearchableSelectField
                  options={[{ label: "Change Status", value: "" }, ...statusOptions.filter((s) => s.value !== row.orderStatus)]}
                  value=""
                  onChange={(val) => {
                    if (val) {
                      setSelectedOrder(row)
                      handleStatusChange(val)
                    }
                  }}
                  placeholder={statusLoading ? "..." : "Status"}
                  disabled={statusLoading}
                  clearable={false}
                  size="small"
                />
              </Box>
            )}
          </Box>
        </Box>
      )
    }

    return (
      <>
        {/* Filters */}
        <Box sx={{ px: 1.5, py: 1, bgcolor: "white", borderBottom: `1px solid ${C.border}` }}>
          <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
            <TextField size="small" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: C.textMuted }} /></InputAdornment> }}
              sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2.5, height: 38, bgcolor: C.bg, "& fieldset": { borderColor: C.border } }, "& .MuiOutlinedInput-input": { py: 0.5, fontSize: "0.82rem" } }} />
            <IconButton size="small" onClick={() => setShowFilters(!showFilters)}
              sx={{ bgcolor: showFilters ? C.primary : C.bg, color: showFilters ? "white" : C.textSecondary, width: 38, height: 38, borderRadius: 2.5, border: `1px solid ${showFilters ? C.primary : C.border}` }}>
              <FilterIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton size="small" onClick={fetchOrders} disabled={loading} sx={{ bgcolor: C.bg, width: 38, height: 38, borderRadius: 2.5, border: `1px solid ${C.border}` }}>
              <RefreshIcon sx={{ fontSize: 18, color: C.textSecondary }} />
            </IconButton>
            <Button size="small" variant="contained" startIcon={<PaymentIcon sx={{ fontSize: 16 }} />}
              onClick={() => { setShowBulkPaymentDialog(true); setBulkOrderSearch(""); setBulkOrderSearchResults([]); setBulkAllocations([]); setPendingBulkAmounts({}); setBulkPaymentMain({ totalAmount: "", paymentDate: moment().format("YYYY-MM-DD"), modeOfPayment: "", bankName: "", remark: "", transactionId: "", chequeNumber: "", receiptPhoto: [] }) }}
              sx={{ height: 38, borderRadius: 2.5, textTransform: "none", fontSize: "0.75rem", fontWeight: 700, bgcolor: "#0D9488", "&:hover": { bgcolor: "#0F766E" } }}>
              Bulk payment
            </Button>
          </Box>
          {showFilters && (
            <Box sx={{ mt: 1, display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
              <SearchableSelectField
                options={[{ label: "All Status", value: "" }, ...statusOptions]}
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                placeholder="Search status..."
                size="small"
                sx={{ minWidth: 180 }}
              />
              <DatePicker selectsRange startDate={selectedDateRange[0]} endDate={selectedDateRange[1]} onChange={(dates) => setSelectedDateRange(dates || [])} dateFormat="dd/MM/yy"
                customInput={<TextField size="small" InputProps={{ startAdornment: <InputAdornment position="start"><CalendarIcon sx={{ fontSize: 14, color: C.textMuted }} /></InputAdornment> }}
                  sx={{ width: 170, "& .MuiOutlinedInput-root": { height: 34, borderRadius: 2, bgcolor: C.bg }, "& .MuiOutlinedInput-input": { py: 0.25, fontSize: "0.72rem" } }} inputProps={{ readOnly: true }} />} />
            </Box>
          )}
        </Box>

        {/* Order list */}
        <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", p: 1.25, pb: "72px" }}>
          {loading ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25, py: 2 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={105} sx={{ borderRadius: 3 }} />)}
            </Box>
          ) : orders.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8 }}>
              <Box sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: C.bg, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
                <PlantIcon sx={{ fontSize: 36, color: C.textMuted }} />
              </Box>
              <Typography sx={{ fontWeight: 700, color: C.textPrimary, fontSize: "1rem", mb: 0.5 }}>No orders found</Typography>
              <Typography sx={{ color: C.textMuted, fontSize: "0.82rem" }}>Tap + to create a new order</Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {orders.map((row) => {
                const expanded = isExp(row._id)
                const st = getStatus(row.orderStatus)
                const totalPayments = (row.payments || []).length
                const collectedCount = (row.payments || []).filter((p) => p.paymentStatus === "COLLECTED").length
                const paidPercent = row.total > 0 ? Math.round((row.paidAmt / row.total) * 100) : 0
                return (
                  <Card key={row.order} elevation={0}
                    sx={{
                      borderRadius: 3, overflow: "hidden", bgcolor: "white",
                      border: `1px solid ${expanded ? C.primary + "40" : C.border}`,
                      boxShadow: expanded ? `0 4px 20px ${C.primary}15` : "0 1px 3px rgba(0,0,0,0.04)",
                      transition: "all 0.2s ease",
                    }}>
                    {/* Header */}
                    <CardContent onClick={() => toggleExpand(row._id, row)}
                      sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 }, cursor: "pointer", "&:active": { bgcolor: C.bg } }}>
                      {/* Row 1: Order # + Status */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                        <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: C.textMuted, letterSpacing: "0.02em" }}>
                          #{row.order}
                          {row.dealerOrder && <Box component="span" sx={{ ml: 0.5, px: 0.5, py: 0.1, bgcolor: C.blueBg, color: C.blueText, borderRadius: 0.5, fontSize: "0.55rem", fontWeight: 700 }}>DEALER</Box>}
                        </Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                          <IconButton size="small" onClick={(e) => {
                            e.stopPropagation()
                            setShareOrderPayload({
                              order: row.order,
                              farmerName: row.farmerName,
                              farmerMobile: row.farmerMobile,
                              farmerVillage: row.farmerVillage,
                              plantType: row.plantType,
                              plantSubtype: row.plantSubtype,
                              totalPlants: row.totalPlants,
                              quantity: row.totalPlants,
                              rate: row.rate,
                              total: row.total,
                              paidAmt: row.paidAmt,
                              remainingAmt: row.remainingAmt,
                              deliveryDate: row.deliveryDate,
                            })
                            setShareOrderDialogOpen(true)
                          }} sx={{ color: "#25D366", p: 0.25 }} aria-label="Share on WhatsApp">
                            <WhatsAppIcon sx={{ fontSize: 22 }} />
                          </IconButton>
                          <Chip label={st.label} size="small"
                            sx={{ height: 20, fontSize: "0.6rem", fontWeight: 700, bgcolor: st.bg, color: st.text, borderRadius: 1 }} />
                          {expanded ? <ExpandLessIcon sx={{ fontSize: 20, color: C.primary }} /> : <ExpandMoreIcon sx={{ fontSize: 20, color: C.textMuted }} />}
                        </Box>
                      </Box>

                      {/* Row 2: Name + Amount */}
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.25 }}>
                        <Typography sx={{ fontSize: "0.92rem", fontWeight: 800, color: C.textPrimary, flex: 1, pr: 1.5, letterSpacing: "-0.01em" }} noWrap>
                          {row.farmerName}
                        </Typography>
                        <Typography sx={{ fontSize: "0.95rem", fontWeight: 900, color: C.primary, letterSpacing: "-0.02em" }}>
                          ₹{row.total?.toLocaleString()}
                        </Typography>
                      </Box>

                      {/* Row 3: Plant info */}
                      <Typography sx={{ fontSize: "0.72rem", color: C.textSecondary, mb: 0.75 }}>
                        <Box component="span" sx={{ fontWeight: 600, color: C.textPrimary }}>{row.plantTypeDisplay}</Box>
                        {" · "}{row.totalPlants} plants · ₹{row.rate}/plant · {row.orderDate}
                      </Typography>

                      {/* Row 4: Payment bar + chips */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Box sx={{ flex: 1, height: 4, bgcolor: C.border, borderRadius: 2, overflow: "hidden" }}>
                          <Box sx={{ width: `${Math.min(paidPercent, 100)}%`, height: "100%", bgcolor: paidPercent >= 100 ? C.green : paidPercent > 50 ? C.primary : C.orange, borderRadius: 2, transition: "width 0.3s ease" }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.62rem", fontWeight: 700, color: paidPercent >= 100 ? C.greenText : C.textSecondary, minWidth: 28 }}>
                          {paidPercent}%
                        </Typography>
                        {row.remainingAmt > 0 && (
                          <Chip label={`₹${row.remainingAmt?.toLocaleString()} due`} size="small"
                            sx={{ height: 18, fontSize: "0.58rem", fontWeight: 700, bgcolor: C.redBg, color: C.redText, borderRadius: 1 }} />
                        )}
                        {totalPayments > 0 && (
                          <Chip icon={<ReceiptIcon sx={{ fontSize: "11px !important", color: `${C.primary} !important` }} />}
                            label={`${collectedCount}/${totalPayments}`} size="small"
                            sx={{ height: 18, fontSize: "0.55rem", fontWeight: 700, bgcolor: C.primaryLight + "15", color: C.primary, borderRadius: 1, "& .MuiChip-icon": { ml: 0.25, mr: -0.25 } }} />
                        )}
                      </Box>
                    </CardContent>

                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                      <Box sx={{ borderTop: `1px solid ${C.border}`, px: 1.5, py: 1.25, bgcolor: C.bg + "80" }}>
                        {renderPaymentSection(row)}
                      </Box>
                    </Collapse>
                  </Card>
                )
              })}
            </Box>
          )}
        </Box>

        <Fab onClick={() => setShowForm(true)}
          sx={{ position: "fixed", bottom: 72, right: 16, width: 52, height: 52, background: C.gradient, boxShadow: "0 6px 20px rgba(91,95,199,0.35)", zIndex: 1150, "&:hover": { boxShadow: "0 8px 25px rgba(91,95,199,0.45)" } }}>
          <AddIcon sx={{ color: "white", fontSize: 26 }} />
        </Fab>

        {/* Bulk Payment Dialog – same UI as Ram Agri mobile */}
        <Dialog
          open={showBulkPaymentDialog}
          onClose={() => { setShowBulkPaymentDialog(false); setPendingBulkAmounts({}); setBulkOrderSearch(""); setBulkOrderSearchResults([]) }}
          fullScreen
          PaperProps={{ sx: { borderRadius: 0, bgcolor: C.bg } }}>
          <DialogTitle sx={{ background: C.gradient, color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5, px: 2 }}>
            <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: "white" }}>Bulk payment</Typography>
            <IconButton onClick={() => { setShowBulkPaymentDialog(false); setPendingBulkAmounts({}); setBulkOrderSearch(""); setBulkOrderSearchResults([]) }} sx={{ color: "white", p: 0.5 }} size="small"><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent sx={{ p: 1.5, bgcolor: C.bg, "&:first-of-type": { pt: 1.5 } }}>
            <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", mb: 1.5, overflow: "hidden" }}>
              <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: C.textMuted, letterSpacing: "0.02em", mb: 1 }}>Payment details</Typography>
                <Box sx={{ display: "flex", gap: 0.75, mb: 0.75 }}>
                  <TextField size="small" placeholder="Amount ₹" type="number" value={bulkPaymentMain.totalAmount} onChange={(e) => setBulkPaymentMain((p) => ({ ...p, totalAmount: e.target.value }))} sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} inputProps={{ min: 0, step: 0.01 }} />
                  <TextField size="small" type="date" value={bulkPaymentMain.paymentDate} onChange={(e) => setBulkPaymentMain((p) => ({ ...p, paymentDate: e.target.value }))} InputLabelProps={{ shrink: true }} sx={{ width: 130, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                </Box>
                <Box sx={{ display: "flex", gap: 0.75, mb: 0.75 }}>
                  <SearchableSelectField
                    options={[{ label: "Mode", value: "" }, ...paymentModeOptions, { label: "Wallet", value: "Wallet" }]}
                    value={bulkPaymentMain.modeOfPayment}
                    onChange={(val) => setBulkPaymentMain((p) => ({ ...p, modeOfPayment: val }))}
                    placeholder="Search mode..."
                    size="small"
                    sx={{ flex: 1 }}
                  />
                  <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon sx={{ fontSize: 13 }} />} sx={{ fontSize: "0.65rem", textTransform: "none", borderRadius: 2, height: 36, minWidth: 80, borderColor: C.border, color: C.textSecondary }}>
                    {bulkPaymentMain.receiptPhoto?.length ? `${bulkPaymentMain.receiptPhoto.length} Receipt` : "Receipt"}
                    <input type="file" hidden accept="image/*" multiple onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      try {
                        const urls = await Promise.all(files.map(async (file) => {
                          const fd = new FormData();
                          fd.append("media_key", file);
                          fd.append("media_type", "IMAGE");
                          fd.append("content_type", "multipart/form-data");
                          const inst = NetworkManager(API.MEDIA.UPLOAD);
                          const res = await inst.request(fd);
                          return res.data?.data?.media_url || res.data?.media_url;
                        }));
                        setBulkPaymentMain((p) => ({ ...p, receiptPhoto: [...(p.receiptPhoto || []), ...urls.filter(Boolean)] }));
                        Toast.success("Uploaded");
                      } catch { Toast.error("Upload failed"); }
                    }} />
                  </Button>
                </Box>
                {bulkPaymentMain.receiptPhoto?.length > 0 && (
                  <Box sx={{ display: "flex", gap: 0.5, mb: 0.75, flexWrap: "wrap" }}>
                    {bulkPaymentMain.receiptPhoto.map((url, idx) => (
                      <Box key={idx} sx={{ position: "relative" }}>
                        <Box component="img" src={url} sx={{ width: 40, height: 40, borderRadius: 1, objectFit: "cover", border: `1px solid ${C.border}` }} />
                        <IconButton size="small" onClick={() => setBulkPaymentMain((p) => ({ ...p, receiptPhoto: (p.receiptPhoto || []).filter((_, i) => i !== idx) }))} sx={{ position: "absolute", top: -6, right: -6, bgcolor: C.red, color: "white", width: 16, height: 16 }}><DeleteIcon sx={{ fontSize: 9 }} /></IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                {(bulkPaymentMain.modeOfPayment === "Cheque" || bulkPaymentMain.modeOfPayment === "NEFT/RTGS") && (
                  <TextField size="small" label="Bank" value={bulkPaymentMain.bankName} onChange={(e) => setBulkPaymentMain((p) => ({ ...p, bankName: e.target.value }))} fullWidth sx={{ mb: 0.75, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                )}
                {bulkPaymentMain.modeOfPayment === "Cheque" && (
                  <TextField size="small" label="Cheque No" value={bulkPaymentMain.chequeNumber} onChange={(e) => setBulkPaymentMain((p) => ({ ...p, chequeNumber: e.target.value }))} fullWidth sx={{ mb: 0.75, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                )}
                {bulkPaymentMain.modeOfPayment && bulkPaymentMain.modeOfPayment !== "Cheque" && (
                  <TextField size="small" placeholder="Txn ID (optional)" value={bulkPaymentMain.transactionId} onChange={(e) => setBulkPaymentMain((p) => ({ ...p, transactionId: e.target.value }))} fullWidth sx={{ mb: 0.75, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
                )}
                <TextField size="small" fullWidth placeholder="Remark (optional)" value={bulkPaymentMain.remark} onChange={(e) => setBulkPaymentMain((p) => ({ ...p, remark: e.target.value }))} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
              </CardContent>
            </Card>

            {bulkAllocations.length > 0 && (
              <Box sx={{ mb: 1.5 }}>
                <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: C.textMuted, mb: 0.75 }}>Added · {bulkAllocations.length} order(s) · ₹{bulkAllocations.reduce((s, a) => s + (Number(a.amount) || 0), 0).toLocaleString()}</Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {bulkAllocations.map((a) => (
                    <Chip key={String(a.orderId)} label={`${a.orderLabel} ₹${Number(a.amount).toLocaleString()}`} size="small" onDelete={() => removeBulkAllocation(a.orderId)}
                      sx={{ height: 24, fontSize: "0.65rem", fontWeight: 700, bgcolor: C.greenBg, color: C.greenText, borderRadius: 1, border: `1px solid ${C.green}` }} />
                  ))}
                </Box>
              </Box>
            )}

            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: C.textMuted, letterSpacing: "0.02em", mb: 0.5 }}>Add orders</Typography>
            <TextField size="small" fullWidth placeholder="Search by order number, name, ID…" value={bulkOrderSearch} onChange={(e) => setBulkOrderSearch(e.target.value)} sx={{ mb: 1, "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
            <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
              {bulkOrderSearchLoading ? (
                <Box sx={{ py: 3, textAlign: "center" }}><CircularProgress size={24} sx={{ color: C.primary }} /></Box>
              ) : bulkOrderSearch.trim().length < 2 ? (
                <Typography sx={{ fontSize: "0.75rem", color: C.textMuted, py: 1.5 }}>Type 2+ characters. Results show outstanding & salesman.</Typography>
              ) : bulkOrderSearchResults.length > 0 ? (
                bulkOrderSearchResults.map((order) => {
                  const idStr = String(order.orderId);
                  const orderNum = order.orderNumber || idStr;
                  const name = order.farmerName || "—";
                  const location = [order.village, order.taluka, order.district].filter(Boolean).join(" · ") || "—";
                  const outstanding = order.outstanding != null ? Number(order.outstanding) : 0;
                  const userLabel = order.salesPersonName || "";
                  const pendingVal = pendingBulkAmounts[idStr] ?? "";
                  return (
                    <Card key={idStr} elevation={0} sx={{ borderRadius: 3, border: `1px solid ${C.border}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", mb: 0.75, overflow: "hidden" }}>
                      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: "0.92rem", fontWeight: 800, color: C.textPrimary }} noWrap>#{orderNum} {name}</Typography>
                            <Typography sx={{ fontSize: "0.72rem", color: C.textSecondary }}>{location}</Typography>
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.25 }}>
                              {outstanding > 0 && <Chip label={`₹${outstanding.toLocaleString()} due`} size="small" sx={{ height: 18, fontSize: "0.58rem", fontWeight: 700, bgcolor: C.redBg, color: C.redText, borderRadius: 1 }} />}
                              {userLabel && <Typography component="span" sx={{ fontSize: "0.65rem", color: C.textMuted }}>{userLabel}</Typography>}
                            </Box>
                          </Box>
                          <TextField type="number" size="small" placeholder="₹" value={pendingVal} onChange={(e) => setPendingBulkAmounts((p) => ({ ...p, [idStr]: e.target.value }))} sx={{ width: 72 }} inputProps={{ min: 0, step: 0.01 }} />
                          <Button size="small" variant="contained" onClick={() => { const amt = Number(pendingVal); if (amt > 0) addOrderToBulkAllocation(order, amt); else Toast.error("Enter amount first"); }} sx={{ fontSize: "0.7rem", textTransform: "none", fontWeight: 700, borderRadius: 2, background: C.gradient }}>Add</Button>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <Typography sx={{ fontSize: "0.75rem", color: C.textMuted, py: 1.5 }}>No orders found.</Typography>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 2, pt: 1, borderTop: `1px solid ${C.border}`, bgcolor: "white" }}>
            <Button onClick={() => { setShowBulkPaymentDialog(false); setPendingBulkAmounts({}); setBulkOrderSearch(""); setBulkOrderSearchResults([]); }} sx={{ textTransform: "none", fontWeight: 700 }}>Cancel</Button>
            <Button variant="contained" onClick={handleBulkPaymentSubmit} disabled={bulkPaymentSubmitting} startIcon={bulkPaymentSubmitting ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />} sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2, background: C.gradient }}>
              {bulkPaymentSubmitting ? "Saving…" : "Submit Payment"}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    )
  }

  // =========================================================
  // TAB 1: LEDGER
  // =========================================================
  const renderLedgerTab = () => (
    <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", pb: "72px" }}>
      <Box sx={{ px: 1.5, py: 1.25, bgcolor: "white", borderBottom: `1px solid ${C.border}` }}>
        <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "1rem", mb: 0.75 }}>Transaction Ledger</Typography>
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
          <SearchableSelectField
            options={[{ label: "All Types", value: "" }, ...txnTypeOptions]}
            value={txnTypeFilter}
            onChange={(val) => { setTxnTypeFilter(val); setTxnPage(1) }}
            placeholder="Search type..."
            size="small"
            sx={{ flex: 1 }}
          />
          <IconButton size="small" onClick={loadTransactions} disabled={txnLoading} sx={{ bgcolor: C.bg, width: 34, height: 34, borderRadius: 2, border: `1px solid ${C.border}` }}>
            <RefreshIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        {txnTotal > 0 && <Typography sx={{ mt: 0.5, fontSize: "0.72rem", color: C.textMuted, fontWeight: 600 }}>{txnTotal} transactions</Typography>}
      </Box>
      {txnLoading && <LinearProgress sx={{ height: 2, "& .MuiLinearProgress-bar": { bgcolor: C.primary } }} />}
      <Box sx={{ p: 1.25 }}>
        {!txnLoading && transactions.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: C.bg, display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 1.5 }}>
              <LedgerIcon sx={{ fontSize: 28, color: C.textMuted }} />
            </Box>
            <Typography sx={{ color: C.textMuted, fontSize: "0.85rem" }}>No transactions found</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {transactions.map((txn, idx) => {
              const tc = txnTypeColors[txn.type] || { bg: C.bg, color: C.textSecondary, icon: <SwapIcon sx={{ fontSize: 15 }} /> }
              const isPositive = txn.type === "CREDIT" || txn.type === "INVENTORY_ADD" || txn.type === "INVENTORY_RELEASE"
              return (
                <Card key={txn._id || idx} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.border}`, bgcolor: "white" }}>
                  <CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Box sx={{ width: 26, height: 26, borderRadius: 1.5, bgcolor: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", color: tc.color }}>{tc.icon}</Box>
                        <Chip label={txn.type?.replace(/_/g, " ")} size="small" sx={{ height: 18, fontSize: "0.58rem", fontWeight: 700, bgcolor: tc.bg, color: tc.color, borderRadius: 1 }} />
                      </Box>
                      <Typography sx={{ fontWeight: 900, color: isPositive ? C.greenText : C.redText, fontSize: "0.95rem", letterSpacing: "-0.02em" }}>
                        {isPositive ? "+" : "−"}₹{Math.abs(txn.amount || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.7rem", color: C.textSecondary, lineHeight: 1.4, mb: 0.35 }} noWrap>{txn.description || "—"}</Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography sx={{ fontSize: "0.65rem", color: C.textMuted }}>{txn.createdAt ? moment(txn.createdAt).format("DD MMM YY, hh:mm A") : "—"}</Typography>
                      <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: C.primary }}>Bal: ₹{(txn.balanceAfter || 0).toLocaleString()}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}
        {txnTotal > 20 && (
          <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2, pb: 2 }}>
            <Button size="small" variant="outlined" disabled={txnPage <= 1} onClick={() => setTxnPage((p) => Math.max(1, p - 1))} sx={{ fontSize: "0.72rem", minWidth: 60, borderRadius: 2, borderColor: C.border, color: C.textSecondary }}>Prev</Button>
            <Chip label={`${txnPage} / ${Math.ceil(txnTotal / 20)}`} size="small" sx={{ alignSelf: "center", fontWeight: 700, bgcolor: C.bg }} />
            <Button size="small" variant="outlined" disabled={txnPage >= Math.ceil(txnTotal / 20)} onClick={() => setTxnPage((p) => p + 1)} sx={{ fontSize: "0.72rem", minWidth: 60, borderRadius: 2, borderColor: C.border, color: C.textSecondary }}>Next</Button>
          </Box>
        )}
      </Box>
    </Box>
  )

  // =========================================================
  // TAB 2: WALLET (with Money / Plants sub-tabs)
  // =========================================================
  const renderWalletTab = () => {
    const remainingAmt = dealerWallet?.remainingAmount || 0
    const isAdvance = remainingAmt < 0

    const renderMoneySubTab = () => (
      <Box sx={{ p: 1.25 }}>
        {/* Balance Hero */}
        <Card sx={{ borderRadius: 3.5, background: C.gradient, color: "white", mb: 1.5, boxShadow: "0 8px 32px rgba(91,95,199,0.3)" }}>
          <CardContent sx={{ py: 2.5, px: 2.5 }}>
            <Typography sx={{ opacity: 0.7, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, mb: 0.25 }}>Available Balance</Typography>
            <Typography sx={{ fontSize: "2.2rem", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.1, mb: 1.5 }}>
              ₹{dealerWallet?.availableAmount?.toLocaleString() || "0"}
            </Typography>
            <Divider sx={{ bgcolor: "rgba(255,255,255,0.15)", mb: 1.5 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              {[{ label: "Total Orders", val: dealerWallet?.totalOrderAmount }, { label: "Total Paid", val: dealerWallet?.totalPaidAmount }, { label: isAdvance ? "Advance" : "Due", val: Math.abs(remainingAmt) }].map((item, i) => (
                <Box key={i} sx={{ textAlign: i === 2 ? "right" : i === 1 ? "center" : "left" }}>
                  <Typography sx={{ opacity: 0.6, fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{item.label}</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", mt: 0.15 }}>₹{item.val?.toLocaleString() || "0"}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Financial Summary Cards */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75, mb: 1.5 }}>
          <FinCard icon={<WalletIcon sx={{ fontSize: 18 }} />} iconBg={C.primaryLight + "20"} iconColor={C.primary} label="Available" value={`₹${(dealerWallet?.availableAmount || 0).toLocaleString()}`} valueColor={C.primary} />
          <FinCard icon={<ReceiptIcon sx={{ fontSize: 18 }} />} iconBg={C.blueBg} iconColor={C.blueText} label="Order Amount" value={`₹${(dealerWallet?.totalOrderAmount || 0).toLocaleString()}`} valueColor={C.blueText} />
          <FinCard icon={<PaymentIcon sx={{ fontSize: 18 }} />} iconBg={C.greenBg} iconColor={C.greenText} label="Total Paid" value={`₹${(dealerWallet?.totalPaidAmount || 0).toLocaleString()}`} valueColor={C.greenText} />
          <FinCard icon={isAdvance ? <TrendingDownIcon sx={{ fontSize: 18 }} /> : <TrendingUpIcon sx={{ fontSize: 18 }} />} iconBg={isAdvance ? C.greenBg : C.redBg} iconColor={isAdvance ? C.greenText : C.redText}
            label={isAdvance ? "In Advance" : "Remaining Due"} value={`₹${Math.abs(remainingAmt).toLocaleString()}`} valueColor={isAdvance ? C.greenText : C.redText} />
        </Box>

        {/* Stats summary from dealerStats */}
        {dealerStats?.dealerStats && (
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.border}`, mb: 1.5 }}>
            <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
              <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.82rem", mb: 0.75 }}>Order Summary</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0.75 }}>
                <Box sx={{ textAlign: "center" }}>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: C.greenText }}>{dealerStats.dealerStats.acceptedOrdersCount || 0}</Typography>
                  <Typography sx={{ fontSize: "0.6rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Accepted</Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: C.redText }}>{dealerStats.dealerStats.rejectedOrdersCount || 0}</Typography>
                  <Typography sx={{ fontSize: "0.6rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Rejected</Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, color: C.primary }}>{dealerStats.dealerStats.orders?.length || 0}</Typography>
                  <Typography sx={{ fontSize: "0.6rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Total</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Recent transactions preview */}
        {transactions.length > 0 && (
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
              <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.82rem" }}>Recent Transactions</Typography>
              <Button size="small" onClick={() => setActiveTab(1)} sx={{ fontSize: "0.65rem", textTransform: "none", color: C.primary, fontWeight: 700 }}>
                View All
              </Button>
            </Box>
            {transactions.slice(0, 5).map((txn, idx) => {
              const tc = txnTypeColors[txn.type] || { bg: C.bg, color: C.textSecondary, icon: <SwapIcon sx={{ fontSize: 15 }} /> }
              const isPositive = txn.type === "CREDIT" || txn.type === "INVENTORY_ADD" || txn.type === "INVENTORY_RELEASE"
              return (
                <Box key={txn._id || idx} sx={{ display: "flex", alignItems: "center", gap: 0.75, py: 0.6, borderBottom: idx < 4 ? `1px solid ${C.borderLight}` : "none" }}>
                  <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", color: tc.color, flexShrink: 0 }}>{tc.icon}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.72rem", color: C.textPrimary, fontWeight: 600 }} noWrap>{txn.description || txn.type}</Typography>
                    <Typography sx={{ fontSize: "0.6rem", color: C.textMuted }}>{txn.createdAt ? moment(txn.createdAt).format("DD MMM, hh:mm A") : ""}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 900, fontSize: "0.82rem", color: isPositive ? C.greenText : C.redText }}>
                    {isPositive ? "+" : "−"}₹{Math.abs(txn.amount || 0).toLocaleString()}
                  </Typography>
                </Box>
              )
            })}
          </Box>
        )}

        <Button size="small" variant="outlined" fullWidth onClick={() => { loadDealerWallet(userId); loadDealerDetail(userId); loadDealerStats(userId) }}
          startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
          sx={{ mt: 0.5, fontSize: "0.72rem", textTransform: "none", borderRadius: 2, borderColor: C.primary, color: C.primary, fontWeight: 700, height: 34 }}>
          Refresh
        </Button>
      </Box>
    )

    const renderPlantsSubTab = () => (
      <Box sx={{ p: 1.25 }}>
        {/* Overall plant stats */}
        {dealerStats?.dealerStats && (dealerStats.dealerStats.totalQuantity > 0) && (
          <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.border}`, mb: 1.5 }}>
            <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
              <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.82rem", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                <PlantIcon sx={{ fontSize: 16, color: C.green }} /> Overall Inventory
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0.75, mb: 0.75 }}>
                <Box sx={{ textAlign: "center", p: 0.75, bgcolor: C.bg, borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: C.primary }}>{(dealerStats.dealerStats.totalQuantity || 0).toLocaleString()}</Typography>
                  <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Total</Typography>
                </Box>
                <Box sx={{ textAlign: "center", p: 0.75, bgcolor: C.orangeBg, borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: C.orangeText }}>{(dealerStats.dealerStats.totalBookedQuantity || 0).toLocaleString()}</Typography>
                  <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Booked</Typography>
                </Box>
                <Box sx={{ textAlign: "center", p: 0.75, bgcolor: C.greenBg, borderRadius: 1.5 }}>
                  <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: C.greenText }}>{(dealerStats.dealerStats.totalRemainingQuantity || 0).toLocaleString()}</Typography>
                  <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Available</Typography>
                </Box>
              </Box>
              {dealerStats.dealerStats.totalQuantity > 0 && (() => {
                const bookPct = Math.round((dealerStats.dealerStats.totalBookedQuantity / dealerStats.dealerStats.totalQuantity) * 100)
                return (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ flex: 1, height: 6, bgcolor: C.border, borderRadius: 3, overflow: "hidden" }}>
                      <Box sx={{ width: `${Math.min(bookPct, 100)}%`, height: "100%", borderRadius: 3, bgcolor: bookPct > 80 ? C.red : bookPct > 50 ? C.orange : C.green }} />
                    </Box>
                    <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: C.textSecondary }}>{bookPct}% booked</Typography>
                  </Box>
                )
              })()}
            </CardContent>
          </Card>
        )}

        {/* Plant type distribution (from stats) */}
        {dealerStats?.byPlantType?.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.82rem", mb: 0.75 }}>Plant Distribution</Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {dealerStats.byPlantType.map((pt, idx) => {
                const bkPct = pt.totalQuantity ? Math.round((pt.totalBookedQuantity / pt.totalQuantity) * 100) : 0
                return (
                  <Card key={idx} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}` }}>
                    <CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                        <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.82rem" }}>{pt.plantTypeName || "Unknown"}</Typography>
                        <Chip label={`${(pt.totalRemainingQuantity || 0).toLocaleString()} left`} size="small"
                          sx={{ height: 18, fontSize: "0.58rem", fontWeight: 700, bgcolor: pt.totalRemainingQuantity > 0 ? C.greenBg : C.redBg, color: pt.totalRemainingQuantity > 0 ? C.greenText : C.redText, borderRadius: 1 }} />
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                        <Box sx={{ flex: 1, height: 4, bgcolor: C.border, borderRadius: 3, overflow: "hidden" }}>
                          <Box sx={{ width: `${Math.min(bkPct, 100)}%`, height: "100%", borderRadius: 3, bgcolor: bkPct > 80 ? C.red : bkPct > 50 ? C.orange : C.green }} />
                        </Box>
                        <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: C.textSecondary }}>{bkPct}%</Typography>
                      </Box>
                      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                        <Typography sx={{ fontSize: "0.62rem", color: C.textMuted }}>Total: <Box component="span" sx={{ fontWeight: 700, color: C.textSecondary }}>{(pt.totalQuantity || 0).toLocaleString()}</Box></Typography>
                        <Typography sx={{ fontSize: "0.62rem", color: C.textMuted }}>Booked: <Box component="span" sx={{ fontWeight: 700, color: C.textSecondary }}>{(pt.totalBookedQuantity || 0).toLocaleString()}</Box></Typography>
                      </Box>
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
          </Box>
        )}

        {/* Detailed Inventory (from wallet/dealer API) */}
        <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.82rem", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
          <InventoryIcon sx={{ fontSize: 16, color: C.primary }} /> Inventory Details
          <Chip label={walletInventory.length} size="small" sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700, bgcolor: C.primaryLight + "15", color: C.primary, ml: 0.25 }} />
        </Typography>

        {walletInventory.length === 0 ? (
          <Box sx={{ py: 3, textAlign: "center", bgcolor: C.bg, borderRadius: 2 }}>
            <InventoryIcon sx={{ fontSize: 32, color: C.textMuted, mb: 0.5 }} />
            <Typography sx={{ fontSize: "0.82rem", color: C.textMuted }}>No inventory allocated yet</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {walletInventory.map((plant, idx) => {
              const util = plant.totalQuantity ? Math.round(((plant.totalBookedQuantity || 0) / plant.totalQuantity) * 100) : 0
              return (
                <Card key={idx} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.border}` }}>
                  <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.85rem" }}>
                        {plant.plantName} <Box component="span" sx={{ color: C.textMuted, fontWeight: 500 }}>/ {plant.subtypeName}</Box>
                      </Typography>
                      <Chip label={`${plant.totalRemainingQuantity?.toLocaleString() || 0} left`} size="small"
                        sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700, bgcolor: plant.totalRemainingQuantity > 0 ? C.greenBg : C.redBg, color: plant.totalRemainingQuantity > 0 ? C.greenText : C.redText, borderRadius: 1 }} />
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Box sx={{ flex: 1, height: 5, bgcolor: C.border, borderRadius: 3, overflow: "hidden" }}>
                        <Box sx={{ width: `${Math.min(util, 100)}%`, height: "100%", borderRadius: 3, bgcolor: util > 80 ? C.red : util > 50 ? C.orange : C.green }} />
                      </Box>
                      <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: C.textSecondary, minWidth: 28 }}>{util}%</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography sx={{ fontSize: "0.65rem", color: C.textMuted }}>Total: <Box component="span" sx={{ fontWeight: 700, color: C.textSecondary }}>{plant.totalQuantity?.toLocaleString() || 0}</Box></Typography>
                      <Typography sx={{ fontSize: "0.65rem", color: C.textMuted }}>Booked: <Box component="span" sx={{ fontWeight: 700, color: C.textSecondary }}>{plant.totalBookedQuantity?.toLocaleString() || 0}</Box></Typography>
                    </Box>
                    {plant.slotDetails?.length > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: C.textSecondary, mb: 0.25 }}>Slots</Typography>
                        {plant.slotDetails.map((slot, sIdx) => {
                          const slotUtil = slot.quantity ? Math.round((slot.bookedQuantity / slot.quantity) * 100) : 0
                          return (
                            <Box key={sIdx} sx={{ display: "flex", alignItems: "center", gap: 0.75, py: 0.35, borderBottom: sIdx < plant.slotDetails.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
                              <CalendarIcon sx={{ fontSize: 11, color: C.textMuted }} />
                              <Typography sx={{ fontSize: "0.62rem", color: C.textSecondary, minWidth: 60 }}>
                                {slot.dates?.startDay || ""}–{slot.dates?.endDay || ""} {slot.dates?.month || ""}
                              </Typography>
                              <Box sx={{ flex: 1, height: 3, bgcolor: C.border, borderRadius: 3, overflow: "hidden" }}>
                                <Box sx={{ width: `${Math.min(slotUtil, 100)}%`, height: "100%", borderRadius: 3, bgcolor: slotUtil > 80 ? C.red : slotUtil > 50 ? C.orange : C.green }} />
                              </Box>
                              <Typography sx={{ fontSize: "0.58rem", fontWeight: 700, color: slot.remainingQuantity > 0 ? C.greenText : C.redText, minWidth: 28, textAlign: "right" }}>
                                {slot.remainingQuantity || 0}
                              </Typography>
                            </Box>
                          )
                        })}
                      </Box>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </Box>
        )}

        {/* Plant Ledger */}
        <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.82rem", mb: 0.75, mt: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}>
          <HistoryIcon sx={{ fontSize: 16, color: C.primary }} /> Plant Ledger
        </Typography>
        {plantLedgerLoading ? (
          <Box sx={{ py: 2, display: "flex", justifyContent: "center" }}><CircularProgress size={24} /></Box>
        ) : plantLedgerEntries.length === 0 ? (
          <Box sx={{ py: 2, textAlign: "center", bgcolor: C.bg, borderRadius: 2 }}>
            <HistoryIcon sx={{ fontSize: 28, color: C.textMuted, mb: 0.5 }} />
            <Typography sx={{ fontSize: "0.78rem", color: C.textMuted }}>No plant ledger entries yet</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
            {plantLedgerEntries.map((entry) => {
              const isAdd = entry.transactionType === "INVENTORY_ADD"
              const isRelease = entry.transactionType === "INVENTORY_RELEASE"
              const plantName = entry.plantType?.name || "Plant"
              return (
                <Card key={entry._id} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}` }}>
                  <CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                      <Chip label={entry.transactionType?.replace("INVENTORY_", "")} size="small"
                        sx={{ height: 18, fontSize: "0.58rem", fontWeight: 700, bgcolor: isAdd || isRelease ? C.greenBg : C.redBg, color: isAdd || isRelease ? C.greenText : C.redText, borderRadius: 1 }} />
                      <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: isAdd || isRelease ? C.greenText : C.redText }}>
                        {entry.transactionType === "INVENTORY_BOOK" ? "−" : "+"}{Math.abs(entry.quantity || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.68rem", color: C.textSecondary }}>{plantName}</Typography>
                    <Typography sx={{ fontSize: "0.6rem", color: C.textMuted, mt: 0.15 }}>{entry.description || "—"}</Typography>
                    <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, mt: 0.15 }}>
                      {entry.createdAt ? moment(entry.createdAt).format("DD MMM, hh:mm A") : ""} · Bal: {entry.balanceBefore?.toLocaleString() || 0} → {entry.balanceAfter?.toLocaleString() || 0}
                    </Typography>
                  </CardContent>
                </Card>
              )
            })}
            {plantLedgerEntries.length >= 15 && (
              <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, mt: 0.5 }}>
                <Button size="small" disabled={plantLedgerPage <= 1} onClick={() => setPlantLedgerPage((p) => Math.max(1, p - 1))}
                  sx={{ fontSize: "0.65rem", textTransform: "none", fontWeight: 700, color: C.primary }}>Prev</Button>
                <Typography sx={{ fontSize: "0.68rem", color: C.textSecondary, py: 0.25 }}>Page {plantLedgerPage}</Typography>
                <Button size="small" onClick={() => setPlantLedgerPage((p) => p + 1)}
                  sx={{ fontSize: "0.65rem", textTransform: "none", fontWeight: 700, color: C.primary }}>Next</Button>
              </Box>
            )}
          </Box>
        )}

        <Button size="small" variant="outlined" fullWidth onClick={() => { loadDealerWallet(userId); loadDealerDetail(userId); loadDealerStats(userId); loadPlantLedger() }}
          startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
          sx={{ mt: 1.5, fontSize: "0.72rem", textTransform: "none", borderRadius: 2, borderColor: C.primary, color: C.primary, fontWeight: 700, height: 34 }}>
          Refresh
        </Button>
      </Box>
    )

    return (
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Sub-tabs */}
        <Tabs value={walletSubTab} onChange={(_, v) => setWalletSubTab(v)} variant="fullWidth"
          sx={{
            minHeight: 40, bgcolor: "white", borderBottom: `1px solid ${C.border}`, flexShrink: 0,
            "& .MuiTab-root": { minHeight: 40, py: 0, fontSize: "0.78rem", textTransform: "none", fontWeight: 700, color: C.textMuted, "&.Mui-selected": { color: C.primary } },
            "& .MuiTabs-indicator": { bgcolor: C.primary, height: 2.5, borderRadius: 2 },
          }}>
          <Tab icon={<WalletIcon sx={{ fontSize: 16, mr: 0.5 }} />} iconPosition="start" label="Money" />
          <Tab icon={<PlantIcon sx={{ fontSize: 16, mr: 0.5 }} />} iconPosition="start" label="Plants" />
        </Tabs>
        <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", pb: "72px" }}>
          {walletLoading ? (
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
              <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2.5 }} />
              <Skeleton variant="rounded" height={60} sx={{ borderRadius: 2 }} />
            </Box>
          ) : (
            walletSubTab === 0 ? renderMoneySubTab() : renderPlantsSubTab()
          )}
        </Box>
      </Box>
    )
  }

  // =========================================================
  // TAB 3: PROFILE
  // =========================================================
  const renderProfileTab = () => (
    <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", pb: "72px" }}>
      <Box sx={{ p: 1.5 }}>
        <Card sx={{ borderRadius: 3.5, background: C.gradient, color: "white", mb: 2, boxShadow: "0 8px 32px rgba(91,95,199,0.3)" }}>
          <CardContent sx={{ py: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Avatar sx={{ width: 72, height: 72, fontSize: "1.8rem", fontWeight: 900, bgcolor: "rgba(255,255,255,0.2)", border: "3px solid rgba(255,255,255,0.4)", mb: 1.25 }}>{userInitial}</Avatar>
            <Typography sx={{ fontWeight: 900, fontSize: "1.25rem", letterSpacing: "-0.01em" }}>{userName}</Typography>
            <Chip label={userRole} size="small" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 700, mt: 0.75, height: 24, fontSize: "0.72rem", borderRadius: 1.5 }} />
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.border}`, mb: 1.5 }}>
          <CardContent sx={{ py: 1.25, px: 1.5, "&:last-child": { pb: 1.25 } }}>
            <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.88rem", mb: 1 }}>Account Details</Typography>
            <ProfileRow icon={<PersonIcon sx={{ fontSize: 18 }} />} label="Name" value={userName} />
            <ProfileRow icon={<PhoneIcon sx={{ fontSize: 18 }} />} label="Mobile" value={user?.phone || user?.mobileNumber || user?.phoneNumber || "—"} />
            <ProfileRow icon={<LocationIcon sx={{ fontSize: 18 }} />} label="Location" value={[user?.defaultVillage, user?.defaultTaluka, user?.defaultDistrict, user?.defaultState].filter(Boolean).join(", ") || "—"} />
            <ProfileRow icon={<ReceiptIcon sx={{ fontSize: 18 }} />} label="Job Title" value={userJobTitle || "—"} last />
          </CardContent>
        </Card>

        <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.border}`, mb: 1.5 }}>
          <CardContent sx={{ py: 1.25, px: 1.5, "&:last-child": { pb: 1.25 } }}>
            <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.88rem", mb: 1 }}>Quick Stats</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
              <StatBox label="Total Orders" value={orders.length} color={C.primary} bg={C.primaryLight + "15"} />
              <StatBox label="Pending" value={orders.filter((o) => o.orderStatus === "PENDING").length} color={C.orangeText} bg={C.orangeBg} />
              <StatBox label="Accepted" value={orders.filter((o) => o.orderStatus === "ACCEPTED").length} color={C.greenText} bg={C.greenBg} />
              <StatBox label="Dispatched" value={orders.filter((o) => o.orderStatus === "DISPATCHED").length} color={C.blueText} bg={C.blueBg} />
            </Box>
          </CardContent>
        </Card>

      </Box>
    </Box>
  )

  // =========================================================
  // ORDER DETAIL DIALOG
  // =========================================================
  const renderOrderDetail = () => {
    if (!selectedOrder) return null; const o = selectedOrder; const st = getStatus(o.orderStatus)
    return (
      <Dialog open={detailOpen} onClose={closeOrderDetail} fullScreen TransitionComponent={Slide} TransitionProps={{ direction: "up" }}>
        <Box sx={{ background: C.gradient, color: "white", px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1, minWidth: 0 }}>
            <IconButton onClick={closeOrderDetail} size="small" sx={{ color: "white" }}><ArrowBackIcon sx={{ fontSize: 20 }} /></IconButton>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 800, fontSize: "0.92rem" }} noWrap>#{o.order}</Typography>
              <Typography sx={{ opacity: 0.8, fontSize: "0.7rem" }} noWrap>{o.farmerName}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton size="small" onClick={() => {
              setShareOrderPayload({
                order: o.order,
                farmerName: o.farmerName,
                farmerMobile: o.farmerMobile,
                farmerVillage: o.farmerVillage,
                plantType: o.plantType,
                plantSubtype: o.plantSubtype,
                totalPlants: o.totalPlants,
                quantity: o.totalPlants,
                rate: o.rate,
                total: o.total,
                paidAmt: o.paidAmt,
                remainingAmt: o.remainingAmt,
                deliveryDate: o.deliveryDate,
              })
              setShareOrderDialogOpen(true)
            }} sx={{ color: "rgba(255,255,255,0.95)" }} aria-label="Share on WhatsApp">
              <WhatsAppIcon sx={{ fontSize: 20 }} />
            </IconButton>
            <Chip label={st.label} size="small" sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white", fontWeight: 700, height: 22, fontSize: "0.62rem" }} />
            <IconButton onClick={refreshOrderDetail} size="small" sx={{ color: "white" }}><RefreshIcon sx={{ fontSize: 16 }} /></IconButton>
          </Box>
        </Box>
        <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ minHeight: 40, borderBottom: `1px solid ${C.border}`, bgcolor: "white",
            "& .MuiTab-root": { minHeight: 40, py: 0, fontSize: "0.75rem", textTransform: "none", fontWeight: 700, minWidth: 0, color: C.textMuted, "&.Mui-selected": { color: C.primary } },
            "& .MuiTabs-indicator": { bgcolor: C.primary, height: 2.5, borderRadius: 2 } }}>
          <Tab label="Details" /><Tab label="Payment" /><Tab label="Remarks" /><Tab label="History" />
        </Tabs>
        <Box sx={{ flex: 1, overflow: "auto", WebkitOverflowScrolling: "touch", bgcolor: C.bg }}>
          {detailTab === 0 && renderODDetails(o)}{detailTab === 1 && renderODPayment(o)}{detailTab === 2 && renderODRemarks(o)}{detailTab === 3 && renderODHistory(o)}
        </Box>
        {!isActionLockedStatus(o.orderStatus) && (
          <Box sx={{ px: 2, py: 1, borderTop: `1px solid ${C.border}`, bgcolor: "white", display: "flex", gap: 0.75 }}>
            <Button size="small" variant="outlined" startIcon={<PaymentIcon sx={{ fontSize: 15 }} />} onClick={() => setDetailTab(1)} sx={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "none", flex: 1, borderRadius: 2, borderColor: C.primary, color: C.primary }}>Add Payment</Button>
            {canChangeOrderStatus && (
              <Box sx={{ minWidth: 160 }}>
                <SearchableSelectField
                  options={[{ label: "Change Status", value: "" }, ...statusOptions.filter((s) => s.value !== o.orderStatus)]}
                  value=""
                  onChange={(val) => { if (val) handleStatusChange(val) }}
                  placeholder={statusLoading ? "..." : "Status"}
                  disabled={statusLoading}
                  clearable={false}
                  size="small"
                />
              </Box>
            )}
          </Box>
        )}
      </Dialog>
    )
  }

  const renderODDetails = (o) => (
    <Box sx={{ p: 1.5 }}>
      <MiniCard icon={<PersonIcon sx={{ fontSize: 18, color: C.primary }} />} title="Farmer">
        <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: C.textPrimary }}>{o.farmerName}</Typography>
        {o.farmerMobile && <Typography sx={{ fontSize: "0.72rem", color: C.textSecondary, mt: 0.25 }}><PhoneIcon sx={{ fontSize: 11, mr: 0.25, verticalAlign: "middle" }} />{o.farmerMobile}</Typography>}
        {(o.farmerVillage || o.farmerTaluka) && <Typography sx={{ fontSize: "0.72rem", color: C.textSecondary }} noWrap><LocationIcon sx={{ fontSize: 11, mr: 0.25, verticalAlign: "middle" }} />{[o.farmerVillage, o.farmerTaluka, o.farmerDistrict].filter(Boolean).join(", ")}</Typography>}
        {o.orderFor && (<Box sx={{ mt: 0.75, p: 0.75, bgcolor: C.orangeBg, borderRadius: 1.5, border: "1px solid #FDE68A" }}><Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: C.orangeText }}>Order For: {o.orderFor.name}</Typography>{o.orderFor.mobileNumber && <Typography sx={{ fontSize: "0.68rem", color: C.textSecondary }}>{o.orderFor.mobileNumber}</Typography>}</Box>)}
      </MiniCard>
      <MiniCard icon={<PlantIcon sx={{ fontSize: 18, color: C.green }} />} title="Order Details">
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
          <InfoRow label="Plant" value={o.plantType} /><InfoRow label="Subtype" value={o.plantSubtype} />
          <InfoRow label="Quantity" value={`${o.totalPlants} plants`} /><InfoRow label="Rate" value={`₹${o.rate}`} />
          <InfoRow label="Slot" value={o.slotPeriod} /><InfoRow label="Delivery" value={o.deliveryDate} />
          <InfoRow label="Ordered" value={o.orderDate} /><InfoRow label="Sales" value={o.salesPerson} />
        </Box>
      </MiniCard>
      <MiniCard icon={<ReceiptIcon sx={{ fontSize: 18, color: C.orange }} />} title="Payment Summary">
        <Box sx={{ display: "flex", borderRadius: 2, overflow: "hidden", border: `1px solid ${C.border}` }}>
          <SummaryCell label="Total" value={`₹${o.total?.toLocaleString()}`} color={C.textPrimary} />
          <SummaryCell label="Paid" value={`₹${o.paidAmt?.toLocaleString()}`} color={C.green} border />
          <SummaryCell label="Due" value={`₹${o.remainingAmt?.toLocaleString()}`} color={o.remainingAmt > 0 ? C.red : C.green} border />
        </Box>
      </MiniCard>
    </Box>
  )

  const renderODPayment = (o) => (
    <Box sx={{ p: 1.5 }}>
      <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.88rem", mb: 1 }}>Payments ({o.payments?.length || 0})</Typography>
      {o.payments?.length > 0 ? o.payments.map((p, idx) => (
        <Card key={idx} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}`, mb: 0.75 }}>
          <CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography sx={{ fontWeight: 900, fontSize: "0.92rem", color: C.textPrimary }}>₹{Number(p.paidAmount || 0).toLocaleString()}</Typography>
              <Chip label={p.paymentStatus === "COLLECTED" ? "Collected" : "Pending"} size="small" sx={{ height: 18, fontSize: "0.58rem", fontWeight: 700, bgcolor: p.paymentStatus === "COLLECTED" ? C.greenBg : C.orangeBg, color: p.paymentStatus === "COLLECTED" ? C.greenText : C.orangeText, borderRadius: 1 }} />
            </Box>
            <Typography sx={{ fontSize: "0.68rem", color: C.textSecondary, mt: 0.25 }}><Box component="span" sx={{ fontWeight: 600 }}>{p.modeOfPayment || "—"}</Box> · {p.paymentDate ? moment(p.paymentDate).format("DD MMM YY") : "—"}{p.remark ? ` · ${p.remark}` : ""}</Typography>
            {p.receiptPhoto?.length > 0 && <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>{p.receiptPhoto.map((url, i) => <Box key={i} component="img" src={url} sx={{ width: 40, height: 40, borderRadius: 1, objectFit: "cover", border: `1px solid ${C.border}`, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); window.open(url, "_blank") }} />)}</Box>}
          </CardContent>
        </Card>
      )) : <Box sx={{ py: 2, textAlign: "center", bgcolor: C.bg, borderRadius: 2, mb: 1.5 }}><Typography sx={{ fontSize: "0.78rem", color: C.textMuted }}>No payments yet</Typography></Box>}
      <Divider sx={{ my: 1.25 }} />
      <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.88rem", mb: 1 }}>Add Payment</Typography>
      {isDealer && dealerWallet && (
        <Box sx={{ mb: 1, p: 0.75, bgcolor: C.orangeBg, borderRadius: 2, border: "1px solid #FDE68A" }}>
          <FormControlLabel control={<Checkbox size="small" checked={newPayment.isWalletPayment} onChange={(e) => handlePaymentInputChange("isWalletPayment", e.target.checked)} sx={{ color: C.primary, "&.Mui-checked": { color: C.primary } }} />}
            label={<Box><Typography sx={{ fontWeight: 700, fontSize: "0.78rem" }}>Pay from Wallet</Typography><Typography sx={{ fontSize: "0.65rem", color: C.textSecondary }}>Balance: ₹{dealerWallet.availableAmount?.toLocaleString()}</Typography></Box>} />
        </Box>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField fullWidth size="small" label="Amount (₹)" type="number" value={newPayment.paidAmount} onChange={(e) => handlePaymentInputChange("paidAmount", e.target.value)} sx={fieldSx} />
        <TextField fullWidth size="small" label="Date" type="date" value={newPayment.paymentDate} onChange={(e) => handlePaymentInputChange("paymentDate", e.target.value)} InputLabelProps={{ shrink: true }} sx={fieldSx} />
        <SearchableSelectField
          options={[{ label: "Select", value: "" }, ...paymentModeOptions]}
          value={newPayment.modeOfPayment}
          onChange={(val) => handlePaymentInputChange("modeOfPayment", val)}
          label="Mode"
          placeholder="Search mode..."
          disabled={newPayment.isWalletPayment}
          size="small"
        />
        {(newPayment.modeOfPayment === "Cheque" || newPayment.modeOfPayment === "NEFT/RTGS") && <TextField fullWidth size="small" label="Bank Name" value={newPayment.bankName} onChange={(e) => handlePaymentInputChange("bankName", e.target.value)} sx={fieldSx} />}
        <TextField fullWidth size="small" label="Remark" value={newPayment.remark} onChange={(e) => handlePaymentInputChange("remark", e.target.value)} multiline rows={2} sx={fieldSx} />
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button variant="outlined" component="label" size="small" startIcon={<UploadIcon sx={{ fontSize: 14 }} />} disabled={paymentLoading} sx={{ fontSize: "0.68rem", textTransform: "none", borderRadius: 2, borderColor: C.border, color: C.textSecondary }}>{paymentLoading ? "..." : "Receipt"}<input type="file" hidden accept="image/*" multiple onChange={handlePaymentImageUpload} /></Button>
          {newPayment.receiptPhoto?.length > 0 && <Box sx={{ display: "flex", gap: 0.5 }}>{newPayment.receiptPhoto.map((url, idx) => <Box key={idx} sx={{ position: "relative" }}><Box component="img" src={url} sx={{ width: 44, height: 44, borderRadius: 1, objectFit: "cover", border: `1px solid ${C.border}` }} /><IconButton onClick={() => removePaymentImage(idx)} size="small" sx={{ position: "absolute", top: -6, right: -6, bgcolor: C.red, color: "white", width: 16, height: 16 }}><DeleteIcon sx={{ fontSize: 9 }} /></IconButton></Box>)}</Box>}
        </Box>
        <Button variant="contained" fullWidth onClick={handleAddPayment} disabled={paymentLoading || !newPayment.paidAmount} startIcon={paymentLoading ? <CircularProgress size={14} /> : <PaymentIcon sx={{ fontSize: 16 }} />}
          sx={{ background: C.gradient, textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40, fontSize: "0.85rem", boxShadow: "0 2px 8px rgba(91,95,199,0.3)" }}>{paymentLoading ? "Adding..." : "Add Payment"}</Button>
      </Box>
    </Box>
  )

  const renderODRemarks = (o) => (
    <Box sx={{ p: 1.5 }}>
      <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.88rem", mb: 1 }}>Remarks ({Array.isArray(o.orderRemarks) ? o.orderRemarks.length : o.orderRemarks ? 1 : 0})</Typography>
      {(Array.isArray(o.orderRemarks) ? o.orderRemarks : o.orderRemarks ? [o.orderRemarks] : []).map((r, idx) => {
        const txt = typeof r === "string" ? r : r?.text || r?.remark || JSON.stringify(r)
        return (<Card key={idx} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}`, mb: 0.75 }}><CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}><Typography sx={{ fontSize: "0.82rem", color: C.textPrimary }}>{txt}</Typography>{typeof r !== "string" && r?.createdAt && <Typography sx={{ fontSize: "0.62rem", color: C.textMuted, mt: 0.25 }}>{moment(r.createdAt).format("DD MMM YY, hh:mm A")}</Typography>}</CardContent></Card>)
      })}
      {(!o.orderRemarks || (Array.isArray(o.orderRemarks) && !o.orderRemarks.length)) && <Box sx={{ py: 2, textAlign: "center", bgcolor: C.bg, borderRadius: 2, mb: 1 }}><Typography sx={{ fontSize: "0.78rem", color: C.textMuted }}>No remarks yet</Typography></Box>}
      <Divider sx={{ my: 1 }} />
      <TextField fullWidth size="small" multiline rows={2} value={newRemark} onChange={(e) => setNewRemark(e.target.value)} placeholder="Add remark..." sx={fieldSx} />
      <Button variant="contained" fullWidth onClick={handleAddRemark} disabled={remarkLoading || !newRemark.trim()} startIcon={remarkLoading ? <CircularProgress size={14} /> : <CommentIcon sx={{ fontSize: 16 }} />}
        sx={{ mt: 1, background: C.gradient, textTransform: "none", fontWeight: 700, borderRadius: 2, height: 40, fontSize: "0.85rem", boxShadow: "0 2px 8px rgba(91,95,199,0.3)" }}>{remarkLoading ? "Adding..." : "Add Remark"}</Button>
    </Box>
  )

  const renderODHistory = (o) => (
    <Box sx={{ p: 1.5 }}>
      <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.88rem", mb: 1 }}>Status History</Typography>
      {o.statusChanges?.length > 0 ? o.statusChanges.map((c, idx) => {
        const s = getStatus(c.status || c.newStatus)
        return (<Card key={idx} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}`, mb: 0.75 }}><CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.color }} /><Typography sx={{ fontWeight: 700, fontSize: "0.82rem", color: C.textPrimary }}>{s.label || "—"}</Typography></Box>
          <Typography sx={{ fontSize: "0.65rem", color: C.textMuted, mt: 0.25, pl: 2.5 }}>{c.changedAt || c.date ? moment(c.changedAt || c.date).format("DD MMM YY, hh:mm A") : "—"}{(c.changedBy?.name || c.changedBy) ? ` · ${c.changedBy?.name || c.changedBy}` : ""}</Typography>
        </CardContent></Card>)
      }) : <Box sx={{ py: 2, textAlign: "center", bgcolor: C.bg, borderRadius: 2 }}><Typography sx={{ fontSize: "0.78rem", color: C.textMuted }}>No status history</Typography></Box>}
    </Box>
  )

  const renderOrderTypeSelection = () => (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", px: 2, py: 4 }}>
      <Typography sx={{ fontSize: "1.1rem", fontWeight: 800, color: C.textPrimary, mb: 1, textAlign: "center" }}>Select order type</Typography>
      <Typography sx={{ fontSize: "0.78rem", color: C.textSecondary, mb: 3, textAlign: "center" }}>Plant orders and Agri input orders are separate — choose one to continue</Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", maxWidth: 320 }}>
        <Card elevation={0} sx={{ borderRadius: 3, border: "2px solid", borderColor: C.primary, overflow: "hidden", cursor: "pointer", "&:active": { bgcolor: C.gradientSoft } }} onClick={() => setOrderMode("plant")}>
          <CardContent sx={{ py: 2.5, px: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <PlantIcon sx={{ fontSize: 28, color: "white" }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: C.textPrimary }}>Plant Order</Typography>
              <Typography sx={{ fontSize: "0.78rem", color: C.textSecondary }}>Nursery plants (farmer / dealer)</Typography>
            </Box>
          </CardContent>
        </Card>
        <Card elevation={0} sx={{ borderRadius: 3, border: "2px solid", borderColor: C.border, overflow: "hidden", cursor: "pointer", "&:active": { bgcolor: C.bg } }} onClick={() => navigate("/u/mobile/agri-sales-order")}>
          <CardContent sx={{ py: 2.5, px: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <InventoryIcon sx={{ fontSize: 28, color: C.green }} />
            </Box>
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: "1rem", color: C.textPrimary }}>Agri Input Orders</Typography>
              <Typography sx={{ fontSize: "0.78rem", color: C.textSecondary }}>Ram Agri products</Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  )

  const getShareOrderMessage = (payload) => {
    if (!payload) return ""
    return `👋 नमस्कार *${payload.farmerName || "Farmer"}*
आपली ऑर्डर प्लेस झाली आहे!:

📝 ऑर्डर तपशील:
🆔 ऑर्डर आयडी: *${payload.order || "N/A"}*
👤 नाव: *${payload.farmerName || "N/A"}*
🏡 गाव: *${payload.farmerVillage || "N/A"}*
📞 मोबाईल नंबर: *${payload.farmerMobile || "N/A"}*
🌱 रोप प्रकार: *${payload.plantType || "N/A"}*
🔖 उप-प्रकार: *${payload.plantSubtype || "N/A"}*
🌿 बुक केलेली एकूण रोपे: *${payload.totalPlants || payload.quantity || 0}*

💰 पेमेंट तपशील:
प्रति रोप दर: *₹${payload.rate || 0}*
एकूण रक्कम: *₹${payload.total || 0}*
प्राप्त रक्कम: *₹${payload.paidAmt || 0}*
शिल्लक रक्कम: *₹${payload.remainingAmt || 0}*

🚚 डिलिव्हरी तारीख:
 *${payload.deliveryDate || "To be confirmed"}*

आभार! 🙏
राम बायोटेक,
7276386452`
  }

  // =========================================================
  // MAIN RENDER
  // =========================================================
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: C.bg, width: "100%", maxWidth: "100vw", overflowX: "hidden" }}>
      {orderMode === null ? (
        <>
          <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${C.border}` }}>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: C.textPrimary }}>Place Order</Typography>
          </Box>
          {renderOrderTypeSelection()}
        </>
      ) : (
        <>
          {renderHeader()}
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {activeTab === 0 && renderOrdersTab()}
            {isDealer && activeTab === 1 && renderLedgerTab()}
            {isDealer && activeTab === 2 && renderWalletTab()}
            {(isDealer ? activeTab === 3 : activeTab >= 1) && renderProfileTab()}
          </Box>
          {renderBottomNav()}
        </>
      )}
      <AddOrderForm open={showForm} onClose={() => setShowForm(false)} onSuccess={handleSuccess} fullScreen={isMobile} />
      {renderOrderDetail()}
      {shareOrderDialogOpen && shareOrderPayload && (
        <Dialog open onClose={() => { setShareOrderDialogOpen(false); setShareOrderPayload(null) }} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }} sx={{ zIndex: 99999 }}>
          <Box sx={{ p: 2, bgcolor: "#22C55E", color: "white" }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>Share order via WhatsApp?</Typography>
            <Typography sx={{ fontSize: "0.8rem", opacity: 0.9 }}>Order placed successfully</Typography>
          </Box>
          <Box sx={{ p: 2, maxHeight: 280, overflow: "auto" }}>
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mb: 1 }}>Message preview:</Typography>
            <Box component="pre" sx={{ bgcolor: "#f8fafc", p: 2, borderRadius: 2, fontSize: "0.75rem", whiteSpace: "pre-wrap", fontFamily: "inherit", border: "1px solid #e2e8f0" }}>
              {getShareOrderMessage(shareOrderPayload)}
            </Box>
          </Box>
          <Box sx={{ p: 2, display: "flex", gap: 1, justifyContent: "flex-end", borderTop: "1px solid #e2e8f0" }}>
            <Button variant="outlined" onClick={() => { setShareOrderDialogOpen(false); setShareOrderPayload(null) }} sx={{ borderRadius: 2 }}>Cancel</Button>
            <Button variant="contained" color="success" onClick={() => {
              const mobile = String(shareOrderPayload.farmerMobile || "").replace(/\D/g, "").slice(-10)
              const num = mobile.length === 10 ? `91${mobile}` : ""
              const text = encodeURIComponent(getShareOrderMessage(shareOrderPayload))
              const url = num ? `https://wa.me/${num}?text=${text}` : `https://wa.me/?text=${text}`
              window.open(url, "_blank")
              setShareOrderDialogOpen(false)
              setShareOrderPayload(null)
            }} sx={{ borderRadius: 2 }}>Share on WhatsApp</Button>
          </Box>
        </Dialog>
      )}
      {watiDialogOpen && selectedOrder && (
        <Dialog open onClose={() => setWatiDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }} sx={{ zIndex: 99999 }}>
          <Box sx={{ p: 2, bgcolor: "#22C55E", color: "white" }}>
            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem" }}>WhatsApp संदेश पाठवायचा का?</Typography>
            <Typography sx={{ fontSize: "0.8rem", opacity: 0.9 }}>Order #{selectedOrder.order} accepted</Typography>
          </Box>
          <Box sx={{ p: 2, maxHeight: 280, overflow: "auto" }}>
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mb: 1 }}>Message Preview:</Typography>
            <Box component="pre" sx={{ bgcolor: "#f8fafc", p: 2, borderRadius: 2, fontSize: "0.75rem", whiteSpace: "pre-wrap", fontFamily: "inherit", border: "1px solid #e2e8f0" }}>
              {`👋 नमस्कार *${selectedOrder.farmerName || "Farmer"}*
आपली ऑर्डर स्वीकारली आहे!:

📝 ऑर्डर तपशील:
🆔 ऑर्डर आयडी: *${selectedOrder.order || "N/A"}*
👤 नाव: *${selectedOrder.farmerName || "N/A"}*
🏡 गाव: *${selectedOrder.farmerVillage || "N/A"}*
📞 मोबाईल नंबर: *${selectedOrder.farmerMobile || "N/A"}*
🌱 रोप प्रकार: *${selectedOrder.plantType || "N/A"}*
🔖 उप-प्रकार: *${selectedOrder.plantSubtype || "N/A"}*
🌿 बुक केलेली एकूण रोपे: *${selectedOrder.totalPlants || selectedOrder.quantity || 0}*

💰 पेमेंट तपशील:
प्रति रोप दर: *₹${selectedOrder.rate || 0}*
एकूण रक्कम: *₹${selectedOrder.total || 0}*
प्राप्त रक्कम: *₹${selectedOrder.paidAmt || 0}*
शिल्लक रक्कम: *₹${selectedOrder.remainingAmt || 0}*

🚚 डिलिव्हरी तारीख:
 *${selectedOrder.deliveryDate || "To be confirmed"}*

आपली ऑर्डर मध्ये काही बदल असल्यास आम्हाला कळवा.
आभार! 🙏
राम बायोटेक,
7276386452`}
            </Box>
          </Box>
          <Box sx={{ p: 2, display: "flex", gap: 1, justifyContent: "flex-end", borderTop: "1px solid #e2e8f0" }}>
            <Button variant="outlined" onClick={() => setWatiDialogOpen(false)} sx={{ borderRadius: 2 }}>नाही</Button>
            <Button variant="contained" color="success" disabled={watiSending} onClick={async () => {
              setWatiSending(true)
              try {
                const inst = NetworkManager(API.ORDER.SEND_ACCEPTED_WHATSAPP)
                await inst.request({}, [selectedOrder._id])
                Toast.success("WhatsApp message sent")
              } catch (e) { Toast.error(e?.response?.data?.message || "Failed to send") }
              finally { setWatiSending(false); setWatiDialogOpen(false) }
            }} sx={{ borderRadius: 2 }}>{watiSending ? "पाठवत आहे..." : "होय पाठवा"}</Button>
          </Box>
        </Dialog>
      )}
      <PaymentQRModal
        open={paymentQRModalOpen}
        onClose={() => { setPaymentQRModalOpen(false); setPaymentQRModalData(null) }}
        qrImageOrString={paymentQRModalData?.qrImageOrString}
        amount={paymentQRModalData?.amount}
        orderId={paymentQRModalData?.orderId}
        customerName={paymentQRModalData?.customerName}
        mobileNumber={paymentQRModalData?.mobileNumber}
        expiresAt={paymentQRModalData?.expiresAt}
      />
    </Box>
  )
}

// ================================================================
// SHARED STYLES & HELPERS
// ================================================================
const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: "white", "& fieldset": { borderColor: "#E8EBF0" } }, "& .MuiOutlinedInput-input": { py: 1, fontSize: "0.82rem" }, "& .MuiInputLabel-root": { fontSize: "0.82rem" } }

const InfoRow = ({ label, value }) => (
  <Box>
    <Typography sx={{ fontSize: "0.65rem", color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.2, mb: 0.15 }}>{label}</Typography>
    <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "#1A1D2E", lineHeight: 1.3 }}>{value || "—"}</Typography>
  </Box>
)

const PaymentChip = ({ label, value, color }) => (
  <Box sx={{ textAlign: "center" }}>
    <Typography sx={{ fontSize: "0.58rem", color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase" }}>{label}</Typography>
    <Typography sx={{ fontWeight: 900, color, fontSize: "0.92rem", letterSpacing: "-0.02em" }}>{value}</Typography>
  </Box>
)

const SummaryCell = ({ label, value, color, border }) => (
  <Box sx={{ flex: 1, textAlign: "center", py: 0.75, px: 0.5, bgcolor: "#F7F8FC", ...(border && { borderLeft: "1px solid #E8EBF0" }) }}>
    <Typography sx={{ fontSize: "0.58rem", color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</Typography>
    <Typography sx={{ fontWeight: 900, color, fontSize: "0.88rem", letterSpacing: "-0.02em", mt: 0.15 }}>{value}</Typography>
  </Box>
)

const MiniCard = ({ icon, title, children }) => (
  <Card elevation={0} sx={{ mb: 1.25, borderRadius: 2.5, border: "1px solid #E8EBF0" }}>
    <CardContent sx={{ py: 1, px: 1.5, "&:last-child": { pb: 1 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
        {icon}
        <Typography sx={{ fontWeight: 800, color: "#1A1D2E", fontSize: "0.82rem" }}>{title}</Typography>
      </Box>
      {children}
    </CardContent>
  </Card>
)

const ProfileRow = ({ icon, label, value, last }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.75, ...(!last && { borderBottom: "1px solid #F0F1F5" }) }}>
    <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: "#EEF0FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#5B5FC7", flexShrink: 0 }}>{icon}</Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: "0.65rem", color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, color: "#1A1D2E", fontSize: "0.85rem" }} noWrap>{value}</Typography>
    </Box>
  </Box>
)

const StatBox = ({ label, value, color, bg }) => (
  <Box sx={{ p: 1.25, bgcolor: bg, borderRadius: 2, textAlign: "center" }}>
    <Typography sx={{ fontWeight: 900, color, fontSize: "1.25rem", letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</Typography>
    <Typography sx={{ fontSize: "0.65rem", color: "#6B7185", fontWeight: 600, mt: 0.25 }}>{label}</Typography>
  </Box>
)

const FinCard = ({ icon, iconBg, iconColor, label, value, valueColor }) => (
  <Card elevation={0} sx={{ borderRadius: 2, border: "1px solid #E8EBF0" }}>
    <CardContent sx={{ py: 1, px: 1, "&:last-child": { pb: 1 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, flexShrink: 0 }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: "0.58rem", color: "#9CA3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</Typography>
          <Typography sx={{ fontWeight: 900, color: valueColor, fontSize: "0.88rem", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{value}</Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
)

export default PlaceOrderMobile
