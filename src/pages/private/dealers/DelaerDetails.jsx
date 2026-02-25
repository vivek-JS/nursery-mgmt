import { API, NetworkManager } from "network/core"
import React, { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { PieChart as PieChartIcon } from "@mui/icons-material"

import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Avatar,
  Paper,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  LinearProgress,
  Button,
  Collapse,
  useMediaQuery,
  useTheme,
  Skeleton,
  TextField
} from "@mui/material"
import {
  AccountBalanceWallet as WalletIcon,
  Inventory as InventoryIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  CalendarToday as CalendarIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Payment as PaymentIcon,
  ReceiptLong as ReceiptIcon,
  Info as InfoIcon,
  AddCircle as AddCircleIcon,
  RemoveCircle as RemoveCircleIcon,
  Circle as CircleIcon,
  Download as DownloadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  SwapHoriz as SwapIcon,
  Agriculture as PlantIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  History as HistoryIcon
} from "@mui/icons-material"
import DealerPDFExport from "./DealerPDFExport"
import PlantTypeWithSubtypesCard from "./PlantTypeWithSubtypesCard"

// ================================================================
// MOBILE THEME COLORS
// ================================================================
const C = {
  primary: "#5B5FC7",
  primaryLight: "#7C80D7",
  gradient: "linear-gradient(135deg, #5B5FC7 0%, #7C80D7 50%, #9B9FE8 100%)",
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
  bg: "#F8F9FC",
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString) => {
  const options = {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }
  return new Date(dateString).toLocaleDateString("en-IN", options)
}

const formatDateShort = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

export const WalletUtilization = ({ used, total }) => {
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0
  const color = percentage > 90 ? "error" : percentage > 70 ? "warning" : "success"

  return (
    <Box sx={{ width: "100%", mb: 0.5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Booked: {used.toLocaleString()}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {percentage}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percentage}
        color={color}
        sx={{ height: 6, borderRadius: 1 }}
      />
    </Box>
  )
}

const txnTypeMap = {
  CREDIT: { bg: C.greenBg, color: C.greenText, icon: <TrendingUpIcon sx={{ fontSize: 16 }} />, label: "Credit" },
  DEBIT: { bg: C.redBg, color: C.redText, icon: <TrendingDownIcon sx={{ fontSize: 16 }} />, label: "Debit" },
  INVENTORY_ADD: { bg: C.greenBg, color: C.greenText, icon: <InventoryIcon sx={{ fontSize: 16 }} />, label: "Inv. Add" },
  INVENTORY_BOOK: { bg: C.orangeBg, color: C.orangeText, icon: <InventoryIcon sx={{ fontSize: 16 }} />, label: "Inv. Book" },
  INVENTORY_RELEASE: { bg: C.blueBg, color: C.blueText, icon: <SwapIcon sx={{ fontSize: 16 }} />, label: "Inv. Release" },
}

const extractDescription = (desc) => {
  if (!desc) return desc
  const patterns = ["Wallet payment collected for Order #", "Wallet payment for Order #", "Payment collected for Order #"]
  for (const p of patterns) {
    if (desc.includes(p)) {
      if (desc.includes(" - Dealer Order")) return "Dealer Order"
      if (desc.includes(" - ")) {
        const info = desc.split(" - ")[1]
        if (info && !info.includes("Unknown")) return info
      }
    }
  }
  return desc
}

const ledgerRefTypeLabel = (refType) => {
  const map = {
    ORDER_PAYMENT: "Order Payment",
    PAYMENT_STATUS_UPDATE: "Status Update",
    ADJUSTMENT: "Adjustment",
    REVERSAL: "Reversal",
    MANUAL_CREDIT: "Manual Credit",
    MANUAL_DEBIT: "Manual Debit",
  }
  return map[refType] || refType || "—"
}

// ================================================================
// MAIN COMPONENT
// ================================================================
const DealerDetails = () => {
  const { id } = useParams()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("md"))

  const [dealer, setDealer] = useState(null)
  const [dealerFinancial, setDealerFinancial] = useState(null)
  const [dealerInventory, setDealerInventory] = useState([])
  const [walletTransactions, setWalletTransactions] = useState([])
  const [loading, setLoading] = useState(false)
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [transactionsError, setTransactionsError] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [transactionType, setTransactionType] = useState("")

  const [tabValue, setTabValue] = useState(0)
  const [mobileTab, setMobileTab] = useState(0)
  const [expandedPlant, setExpandedPlant] = useState(null)

  const [plantLedgerEntries, setPlantLedgerEntries] = useState([])
  const [plantLedgerLoading, setPlantLedgerLoading] = useState(false)
  const [plantLedgerPage, setPlantLedgerPage] = useState(0)
  const [plantLedgerLimit, setPlantLedgerLimit] = useState(10)
  const [plantLedgerTotal, setPlantLedgerTotal] = useState(0)
  const [plantLedgerType, setPlantLedgerType] = useState("")

  const [ledgerEntries, setLedgerEntries] = useState([])
  const [ledgerSummary, setLedgerSummary] = useState(null)
  const [ledgerPagination, setLedgerPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerPage, setLedgerPage] = useState(1)
  const [ledgerLimit] = useState(20)
  const [ledgerStartDate, setLedgerStartDate] = useState("")
  const [ledgerEndDate, setLedgerEndDate] = useState("")

  useEffect(() => {
    if (id) {
      getDealerDetails(id)
      getDealersStats(id)
    }
  }, [id])

  useEffect(() => {
    if (id) {
      getDealerWalletTransactions(id, page + 1, rowsPerPage, transactionType)
    }
  }, [id, page, rowsPerPage, transactionType])

  useEffect(() => {
    if (id && (tabValue === 2 || mobileTab === 2)) {
      getPlantLedger(id, plantLedgerPage + 1, plantLedgerLimit, plantLedgerType)
    }
  }, [id, tabValue, mobileTab, plantLedgerPage, plantLedgerLimit, plantLedgerType])

  useEffect(() => {
    if (id && (tabValue === 3 || mobileTab === 3)) {
      getDealerLedger(id, ledgerPage, ledgerLimit, ledgerStartDate || undefined, ledgerEndDate || undefined)
    }
  }, [id, tabValue, mobileTab, ledgerPage, ledgerLimit, ledgerStartDate, ledgerEndDate])

  const getDealerDetails = async (dealerId) => {
    setLoading(true)
    setError(null)
    try {
      const instance = NetworkManager(API.USER.GET_DEALERS)
      const response = await instance.request({}, [dealerId])
      if (response.data?.data) {
        setDealer(response.data.data)
        setDealerFinancial(
          response.data.data.financial || { availableAmount: 0, totalOrderAmount: 0, totalPaidAmount: 0, remainingAmount: 0 }
        )
        setDealerInventory(response.data.data.plantDetails || [])
      }
    } catch (err) {
      console.error("Error fetching dealer details:", err)
      setError("Failed to load dealer details. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const getDealerWalletTransactions = async (dealerId, pg = 1, limit = 10, type = "") => {
    setTransactionsLoading(true)
    setTransactionsError(null)
    try {
      const instance = NetworkManager(API.USER.GET_DEALERS_TRANSACTIONS)
      const queryParams = { page: pg, limit, ...(type && { type }) }
      const response = await instance.request({}, [dealerId], { params: queryParams })
      if (response.data) {
        const { transactions, pagination } = response?.data?.data || {}
        setWalletTransactions(transactions || [])
        setTotalTransactions(pagination?.total || 0)
      }
    } catch (err) {
      console.error("Error fetching wallet transactions:", err)
      setTransactionsError("Failed to load wallet transactions. Please try again.")
    } finally {
      setTransactionsLoading(false)
    }
  }

  const exportTransactionsCSV = async () => {
    try {
      const instance = NetworkManager(API.USER.EXPORT_DEALER_WALLET_TRANSACTIONS_CSV)
      const queryParams = { ...(transactionType && { type: transactionType }) }
      const response = await instance.request({}, [id], { params: queryParams })
      const blob = new Blob([response.data], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `${dealer?.name || "dealer"}_wallet_transactions_${new Date().toISOString().split("T")[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Error exporting CSV:", err)
    }
  }

  const getDealersStats = async (dealerId) => {
    setStatsLoading(true)
    try {
      const instance = NetworkManager(API.USER.GET_DEALERS_STATS)
      const response = await instance.request({}, [dealerId])
      if (response.data) setStats(response.data)
    } catch (err) {
      console.error("Error fetching dealer stats:", err)
    } finally {
      setStatsLoading(false)
    }
  }

  const getPlantLedger = async (dealerId, pg = 1, limit = 10, type = "") => {
    setPlantLedgerLoading(true)
    try {
      const instance = NetworkManager(API.USER.GET_DEALER_PLANT_LEDGER)
      const queryParams = { page: pg, limit, ...(type && { type }) }
      const response = await instance.request({}, [dealerId, "plant-ledger"], { params: queryParams })
      if (response?.data?.data) {
        setPlantLedgerEntries(response.data.data.entries || [])
        setPlantLedgerTotal(response.data.data.pagination?.total || 0)
      }
    } catch (err) {
      console.error("Error fetching plant ledger:", err)
      setPlantLedgerEntries([])
    } finally {
      setPlantLedgerLoading(false)
    }
  }

  const getDealerLedger = async (dealerId, pageNum = 1, limitNum = 20, startDate, endDate) => {
    setLedgerLoading(true)
    try {
      const instance = NetworkManager(API.USER.GET_DEALER_LEDGER)
      const params = { pathParams: [dealerId, "ledger"], page: pageNum, limit: limitNum }
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const response = await instance.request({}, params)
      if (response?.data?.data) {
        setLedgerEntries(response.data.data.entries || [])
        setLedgerSummary(response.data.data.summary || null)
        setLedgerPagination(response.data.data.pagination || { page: 1, limit: limitNum, total: 0, totalPages: 0 })
      }
    } catch (err) {
      console.error("Error fetching dealer ledger:", err)
      setLedgerEntries([])
      setLedgerSummary(null)
    } finally {
      setLedgerLoading(false)
    }
  }

  const handleChangePage = (_, newPage) => setPage(newPage)
  const handleChangeRowsPerPage = (e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }
  const handleTabChange = (_, newValue) => setTabValue(newValue)
  const handleTypeFilterChange = (e) => { setTransactionType(e.target.value); setPage(0) }

  if (loading) {
    return isMobile ? (
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rounded" height={60} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={60} sx={{ borderRadius: 2 }} />
        <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    ) : (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "50vh" }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading dealer details...</Typography>
      </Box>
    )
  }

  if (error) return <Box sx={{ m: isMobile ? 1.5 : 3 }}><Alert severity="error">{error}</Alert></Box>
  if (!dealer) return <Box sx={{ m: isMobile ? 1.5 : 3 }}><Alert severity="info">No dealer found with the provided ID.</Alert></Box>

  const getTransactionTypeCount = (type) => walletTransactions.filter((t) => t.type === type).length
  const remainingAmt = dealerFinancial?.remainingAmount || 0
  const isAdvance = remainingAmt < 0

  // ================================================================
  // MOBILE VIEW
  // ================================================================
  if (isMobile) {
    const renderMobileHeader = () => (
      <Card sx={{ borderRadius: 3, background: C.gradient, color: "white", mx: 1.25, mt: 1, mb: 1.25, boxShadow: "0 8px 32px rgba(91,95,199,0.25)" }}>
        <CardContent sx={{ py: 2, px: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
            <Avatar sx={{ width: 48, height: 48, fontSize: "1.3rem", fontWeight: 900, bgcolor: "rgba(255,255,255,0.2)", border: "2px solid rgba(255,255,255,0.4)" }}>
              {dealer.name?.charAt(0).toUpperCase() || "D"}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: "1.1rem", fontWeight: 900, letterSpacing: "-0.01em" }} noWrap>{dealer.name}</Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography sx={{ fontSize: "0.68rem", opacity: 0.7 }}>ID: ...{id?.slice(-8)}</Typography>
                <Chip label={dealer.isOnboarded ? "Active" : "Pending"} size="small"
                  sx={{ height: 18, fontSize: "0.55rem", fontWeight: 700, bgcolor: dealer.isOnboarded ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)", color: "white", borderRadius: 1 }} />
              </Box>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {dealer.phoneNumber && (
              <Chip icon={<PhoneIcon sx={{ fontSize: "12px !important", color: "rgba(255,255,255,0.8) !important" }} />} label={dealer.phoneNumber} size="small"
                sx={{ height: 22, fontSize: "0.62rem", fontWeight: 600, bgcolor: "rgba(255,255,255,0.15)", color: "white", borderRadius: 1, "& .MuiChip-icon": { ml: 0.25, mr: -0.25 } }} />
            )}
            {dealer.location?.village && (
              <Chip icon={<LocationIcon sx={{ fontSize: "12px !important", color: "rgba(255,255,255,0.8) !important" }} />}
                label={[dealer.location?.village, dealer.location?.district].filter(Boolean).join(", ")} size="small"
                sx={{ height: 22, fontSize: "0.62rem", fontWeight: 600, bgcolor: "rgba(255,255,255,0.15)", color: "white", borderRadius: 1, "& .MuiChip-icon": { ml: 0.25, mr: -0.25 } }} />
            )}
          </Box>
        </CardContent>
      </Card>
    )

    const renderMobileFinancials = () => (
      <Box sx={{ px: 1.25, mb: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75 }}>
          <MobileFinCard icon={<WalletIcon sx={{ fontSize: 18 }} />} iconBg={C.primaryLight + "20"} iconColor={C.primary}
            label="Available" value={`₹${(dealerFinancial?.availableAmount || 0).toLocaleString()}`} valueColor={C.primary} />
          <MobileFinCard icon={<ReceiptIcon sx={{ fontSize: 18 }} />} iconBg={C.blueBg} iconColor={C.blueText}
            label="Order Amount" value={`₹${(dealerFinancial?.totalOrderAmount || 0).toLocaleString()}`} valueColor={C.blueText} />
          <MobileFinCard icon={<PaymentIcon sx={{ fontSize: 18 }} />} iconBg={C.greenBg} iconColor={C.greenText}
            label="Total Paid" value={`₹${(dealerFinancial?.totalPaidAmount || 0).toLocaleString()}`} valueColor={C.greenText} />
          <MobileFinCard icon={isAdvance ? <TrendingDownIcon sx={{ fontSize: 18 }} /> : <TrendingUpIcon sx={{ fontSize: 18 }} />}
            iconBg={isAdvance ? C.greenBg : C.redBg} iconColor={isAdvance ? C.greenText : C.redText}
            label={isAdvance ? "In Advance" : "Remaining Due"} value={`₹${Math.abs(remainingAmt).toLocaleString()}`} valueColor={isAdvance ? C.greenText : C.redText} />
        </Box>
      </Box>
    )

    const renderMobileLedger = () => (
      <Box sx={{ px: 1.25, pb: 2 }}>
        {/* Filter + Export */}
        <Box sx={{ display: "flex", gap: 0.75, mb: 1, alignItems: "center" }}>
          <FormControl size="small" sx={{ flex: 1 }}>
            <Select value={transactionType} onChange={handleTypeFilterChange} displayEmpty
              sx={{ fontSize: "0.72rem", borderRadius: 2, height: 34, "& .MuiSelect-select": { py: 0.5 } }}>
              <MenuItem value="" sx={{ fontSize: "0.75rem" }}>All ({walletTransactions.length})</MenuItem>
              <MenuItem value="CREDIT" sx={{ fontSize: "0.75rem" }}>Credit</MenuItem>
              <MenuItem value="DEBIT" sx={{ fontSize: "0.75rem" }}>Debit</MenuItem>
              <MenuItem value="INVENTORY_ADD" sx={{ fontSize: "0.75rem" }}>Inv. Add</MenuItem>
              <MenuItem value="INVENTORY_BOOK" sx={{ fontSize: "0.75rem" }}>Inv. Book</MenuItem>
              <MenuItem value="INVENTORY_RELEASE" sx={{ fontSize: "0.75rem" }}>Inv. Release</MenuItem>
            </Select>
          </FormControl>
          <Button size="small" variant="outlined" onClick={exportTransactionsCSV} disabled={walletTransactions.length === 0}
            startIcon={<DownloadIcon sx={{ fontSize: 14 }} />}
            sx={{ fontSize: "0.68rem", textTransform: "none", borderRadius: 2, height: 34, fontWeight: 700, minWidth: "auto", px: 1.5, borderColor: C.greenText, color: C.greenText }}>
            CSV
          </Button>
        </Box>

        {transactionsLoading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: 2 }} />)}
          </Box>
        ) : transactionsError ? (
          <Alert severity="error" sx={{ fontSize: "0.75rem" }}>{transactionsError}</Alert>
        ) : walletTransactions.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <InfoIcon sx={{ fontSize: 36, color: C.textMuted, mb: 0.5 }} />
            <Typography sx={{ fontSize: "0.82rem", color: C.textMuted, fontWeight: 600 }}>No transactions found</Typography>
          </Box>
        ) : (
          <>
            {walletTransactions.map((txn, idx) => {
              const tc = txnTypeMap[txn.type] || { bg: C.bg, color: C.textSecondary, icon: <CircleIcon sx={{ fontSize: 16 }} />, label: txn.type }
              const isPositive = txn.type === "CREDIT" || txn.type === "INVENTORY_ADD" || txn.type === "INVENTORY_RELEASE"
              return (
                <Card key={txn._id || idx} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}`, mb: 0.5 }}>
                  <CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: tc.bg, display: "flex", alignItems: "center", justifyContent: "center", color: tc.color, flexShrink: 0 }}>
                        {tc.icon}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: C.textPrimary }} noWrap>
                            {extractDescription(txn.description)}
                          </Typography>
                          <Typography sx={{ fontWeight: 900, fontSize: "0.85rem", color: isPositive ? C.greenText : C.redText, flexShrink: 0, ml: 0.5 }}>
                            {isPositive ? "+" : "−"}₹{Math.abs(txn.amount || 0).toLocaleString()}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.15 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Chip label={tc.label} size="small" sx={{ height: 16, fontSize: "0.52rem", fontWeight: 700, bgcolor: tc.bg, color: tc.color, borderRadius: 0.75 }} />
                            <Chip label={txn.status} size="small" variant="outlined"
                              sx={{ height: 16, fontSize: "0.52rem", fontWeight: 600, borderColor: txn.status === "COMPLETED" ? C.green : C.orange, color: txn.status === "COMPLETED" ? C.greenText : C.orangeText, borderRadius: 0.75 }} />
                          </Box>
                          <Typography sx={{ fontSize: "0.6rem", color: C.textMuted }}>{txn.createdAt ? formatDateShort(txn.createdAt) : ""}</Typography>
                        </Box>
                        {(txn.balanceBefore !== undefined || txn.balanceAfter !== undefined) && (
                          <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, mt: 0.25 }}>
                            Bal: ₹{(txn.balanceBefore || 0).toLocaleString()} → ₹{(txn.balanceAfter || 0).toLocaleString()}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )
            })}
            {totalTransactions > walletTransactions.length && (
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 1 }}>
                <Button size="small" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}
                  sx={{ fontSize: "0.7rem", textTransform: "none", fontWeight: 700, color: C.primary }}>Prev</Button>
                <Typography sx={{ fontSize: "0.72rem", color: C.textSecondary, py: 0.5 }}>
                  {page * rowsPerPage + 1}–{Math.min((page + 1) * rowsPerPage, totalTransactions)} of {totalTransactions}
                </Typography>
                <Button size="small" disabled={(page + 1) * rowsPerPage >= totalTransactions} onClick={() => setPage((p) => p + 1)}
                  sx={{ fontSize: "0.7rem", textTransform: "none", fontWeight: 700, color: C.primary }}>Next</Button>
              </Box>
            )}
          </>
        )}
      </Box>
    )

    const renderMobileInventory = () => (
      <Box sx={{ px: 1.25, pb: 2 }}>
        {dealerInventory.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <InventoryIcon sx={{ fontSize: 36, color: C.textMuted, mb: 0.5 }} />
            <Typography sx={{ fontSize: "0.82rem", color: C.textMuted, fontWeight: 600 }}>No inventory allocated</Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {dealerInventory.map((plant, idx) => {
              const util = plant.totalQuantity ? Math.round(((plant.totalBookedQuantity || 0) / plant.totalQuantity) * 100) : 0
              const expanded = expandedPlant === idx
              return (
                <Card key={idx} elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${expanded ? C.primary + "40" : C.border}`, transition: "border-color 0.2s" }}>
                  <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 }, cursor: "pointer" }} onClick={() => setExpandedPlant(expanded ? null : idx)}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                      <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.85rem" }}>
                        {plant.plantName} <Box component="span" sx={{ color: C.textMuted, fontWeight: 500 }}>/ {plant.subtypeName}</Box>
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                        <Chip label={`${plant.totalRemainingQuantity?.toLocaleString() || 0} left`} size="small"
                          sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700, bgcolor: plant.totalRemainingQuantity > 0 ? C.greenBg : C.redBg, color: plant.totalRemainingQuantity > 0 ? C.greenText : C.redText, borderRadius: 1 }} />
                        {expanded ? <ExpandLessIcon sx={{ fontSize: 18, color: C.primary }} /> : <ExpandMoreIcon sx={{ fontSize: 18, color: C.textMuted }} />}
                      </Box>
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
                  </CardContent>
                  <Collapse in={expanded}>
                    <Box sx={{ px: 1.25, pb: 1 }}>
                      <Divider sx={{ mb: 0.75 }} />
                      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: C.textSecondary, mb: 0.5 }}>Slot Breakdown</Typography>
                      {plant.slotDetails?.map((slot, sIdx) => {
                        const slotUtil = slot.quantity ? Math.round((slot.bookedQuantity / slot.quantity) * 100) : 0
                        return (
                          <Box key={sIdx} sx={{ display: "flex", alignItems: "center", gap: 0.75, py: 0.4, borderBottom: sIdx < plant.slotDetails.length - 1 ? `1px solid ${C.borderLight}` : "none" }}>
                            <CalendarIcon sx={{ fontSize: 12, color: C.textMuted }} />
                            <Box sx={{ minWidth: 68 }}>
                              <Typography sx={{ fontSize: "0.62rem", fontWeight: 600, color: C.textPrimary }}>{slot.dates?.startDay}–{slot.dates?.endDay}</Typography>
                              <Typography sx={{ fontSize: "0.52rem", color: C.textMuted }}>{slot.dates?.month}</Typography>
                            </Box>
                            <Box sx={{ flex: 1, height: 4, bgcolor: C.border, borderRadius: 3, overflow: "hidden" }}>
                              <Box sx={{ width: `${Math.min(slotUtil, 100)}%`, height: "100%", borderRadius: 3, bgcolor: slotUtil > 80 ? C.red : slotUtil > 50 ? C.orange : C.green }} />
                            </Box>
                            <Box sx={{ textAlign: "right", minWidth: 48 }}>
                              <Typography sx={{ fontSize: "0.62rem", fontWeight: 800, color: slot.remainingQuantity > 0 ? C.greenText : C.redText }}>{slot.remainingQuantity?.toLocaleString() || 0}</Typography>
                              <Typography sx={{ fontSize: "0.48rem", color: C.textMuted }}>of {slot.quantity?.toLocaleString() || 0}</Typography>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  </Collapse>
                </Card>
              )
            })}
          </Box>
        )}
      </Box>
    )

    const renderMobilePlantLedger = () => (
      <Box sx={{ px: 1.25, pb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 140, mb: 1 }}>
          <InputLabel>Type</InputLabel>
          <Select value={plantLedgerType} label="Type" onChange={(e) => { setPlantLedgerType(e.target.value); setPlantLedgerPage(0) }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="INVENTORY_ADD">Add</MenuItem>
            <MenuItem value="INVENTORY_BOOK">Book</MenuItem>
            <MenuItem value="INVENTORY_RELEASE">Release</MenuItem>
          </Select>
        </FormControl>
        {plantLedgerLoading ? (
          <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}><CircularProgress size={28} /></Box>
        ) : plantLedgerEntries.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <HistoryIcon sx={{ fontSize: 36, color: C.textMuted, mb: 0.5 }} />
            <Typography sx={{ fontSize: "0.82rem", color: C.textMuted, fontWeight: 600 }}>No plant ledger entries</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {plantLedgerEntries.map((entry) => {
                const isAdd = entry.transactionType === "INVENTORY_ADD"
                const isRelease = entry.transactionType === "INVENTORY_RELEASE"
                const isBook = entry.transactionType === "INVENTORY_BOOK"
                const plantName = entry.plantType?.name || "Plant"
                return (
                  <Card key={entry._id} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}` }}>
                    <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                        <Chip label={entry.transactionType?.replace("INVENTORY_", "")} size="small"
                          sx={{ height: 20, fontSize: "0.6rem", fontWeight: 700, bgcolor: isAdd || isRelease ? C.greenBg : C.redBg, color: isAdd || isRelease ? C.greenText : C.redText, borderRadius: 1 }} />
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 800, color: isAdd || isRelease ? C.greenText : C.redText }}>
                          {isBook ? "-" : "+"}{Math.abs(entry.quantity || 0).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.7rem", color: C.textSecondary, mb: 0.25 }}>{plantName}</Typography>
                      <Typography sx={{ fontSize: "0.62rem", color: C.textMuted }}>{entry.description || "—"}</Typography>
                      <Typography sx={{ fontSize: "0.6rem", color: C.textMuted, mt: 0.25 }}>
                        {formatDateShort(entry.createdAt)} · Bal: {entry.balanceBefore?.toLocaleString() || 0} → {entry.balanceAfter?.toLocaleString() || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
            {plantLedgerTotal > plantLedgerLimit && (
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 1 }}>
                <Button size="small" disabled={plantLedgerPage === 0} onClick={() => setPlantLedgerPage((p) => Math.max(0, p - 1))}
                  sx={{ fontSize: "0.7rem", textTransform: "none", fontWeight: 700, color: C.primary }}>Prev</Button>
                <Typography sx={{ fontSize: "0.72rem", color: C.textSecondary, py: 0.5 }}>
                  {plantLedgerPage * plantLedgerLimit + 1}–{Math.min((plantLedgerPage + 1) * plantLedgerLimit, plantLedgerTotal)} of {plantLedgerTotal}
                </Typography>
                <Button size="small" disabled={(plantLedgerPage + 1) * plantLedgerLimit >= plantLedgerTotal} onClick={() => setPlantLedgerPage((p) => p + 1)}
                  sx={{ fontSize: "0.7rem", textTransform: "none", fontWeight: 700, color: C.primary }}>Next</Button>
              </Box>
            )}
          </>
        )}
      </Box>
    )

    const renderMobileWalletLedger = () => (
      <Box sx={{ px: 1.25, pb: 2 }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 1, alignItems: "center" }}>
          <TextField size="small" label="Start" type="date" value={ledgerStartDate} onChange={(e) => { setLedgerStartDate(e.target.value); setLedgerPage(1) }}
            InputLabelProps={{ shrink: true }} sx={{ width: 120 }} inputProps={{ style: { fontSize: "0.75rem" } }} />
          <TextField size="small" label="End" type="date" value={ledgerEndDate} onChange={(e) => { setLedgerEndDate(e.target.value); setLedgerPage(1) }}
            InputLabelProps={{ shrink: true }} sx={{ width: 120 }} inputProps={{ style: { fontSize: "0.75rem" } }} />
          <Button size="small" variant="contained" onClick={() => getDealerLedger(id, 1, ledgerLimit, ledgerStartDate || undefined, ledgerEndDate || undefined)}
            sx={{ fontSize: "0.7rem", textTransform: "none", fontWeight: 700 }}>Apply</Button>
        </Box>
        {ledgerSummary != null && (
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0.5, mb: 1 }}>
            <Box sx={{ p: 0.75, bgcolor: C.redBg, borderRadius: 1.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.52rem", color: C.textMuted, fontWeight: 600 }}>Debit</Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: C.redText }}>₹{(ledgerSummary.totalDebit || 0).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ p: 0.75, bgcolor: C.greenBg, borderRadius: 1.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.52rem", color: C.textMuted, fontWeight: 600 }}>Credit</Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: C.greenText }}>₹{(ledgerSummary.totalCredit || 0).toLocaleString()}</Typography>
            </Box>
            <Box sx={{ p: 0.75, bgcolor: C.blueBg, borderRadius: 1.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.52rem", color: C.textMuted, fontWeight: 600 }}>Balance</Typography>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 800, color: C.blueText }}>₹{(ledgerSummary.balance != null ? ledgerSummary.balance : 0).toLocaleString()}</Typography>
            </Box>
          </Box>
        )}
        {ledgerLoading ? (
          <Box sx={{ py: 3, display: "flex", justifyContent: "center" }}><CircularProgress size={28} /></Box>
        ) : ledgerEntries.length === 0 ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <ReceiptIcon sx={{ fontSize: 36, color: C.textMuted, mb: 0.5 }} />
            <Typography sx={{ fontSize: "0.82rem", color: C.textMuted, fontWeight: 600 }}>No ledger entries</Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
              {ledgerEntries.map((entry) => {
                const hasCredit = (entry.credit || 0) > 0
                return (
                  <Card key={entry._id} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}` }}>
                    <CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                        <Chip label={ledgerRefTypeLabel(entry.refType)} size="small"
                          sx={{ height: 18, fontSize: "0.58rem", fontWeight: 700, bgcolor: hasCredit ? C.greenBg : C.redBg, color: hasCredit ? C.greenText : C.redText, borderRadius: 1 }} />
                        <Typography sx={{ fontSize: "0.72rem", fontWeight: 800, color: hasCredit ? C.greenText : C.redText }}>
                          {hasCredit ? "+" : "−"}₹{((entry.credit || 0) || (entry.debit || 0)).toLocaleString()}
                        </Typography>
                      </Box>
                      <Typography sx={{ fontSize: "0.65rem", color: C.textSecondary }}>{entry.description || entry.reference || "—"}</Typography>
                      <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, mt: 0.15 }}>
                        {entry.entryDate ? formatDateShort(entry.entryDate) : ""} · Bal: ₹{(entry.balanceBefore || 0).toLocaleString()} → ₹{(entry.balanceAfter || 0).toLocaleString()}
                      </Typography>
                      {(entry.orderId?.orderId || entry.createdBy?.name) && (
                        <Typography sx={{ fontSize: "0.52rem", color: C.textMuted, mt: 0.1 }}>
                          {entry.orderId?.orderId ? `Order #${entry.orderId.orderId}` : ""}{entry.orderId?.orderId && entry.createdBy?.name ? " · " : ""}{entry.createdBy?.name || ""}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </Box>
            {ledgerPagination.totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 1 }}>
                <Button size="small" disabled={ledgerPage <= 1} onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
                  sx={{ fontSize: "0.7rem", textTransform: "none", fontWeight: 700, color: C.primary }}>Prev</Button>
                <Typography sx={{ fontSize: "0.72rem", color: C.textSecondary, py: 0.5 }}>
                  Page {ledgerPage} of {ledgerPagination.totalPages || 1}
                </Typography>
                <Button size="small" disabled={ledgerPage >= (ledgerPagination.totalPages || 1)} onClick={() => setLedgerPage((p) => p + 1)}
                  sx={{ fontSize: "0.7rem", textTransform: "none", fontWeight: 700, color: C.primary }}>Next</Button>
              </Box>
            )}
          </>
        )}
      </Box>
    )

    const renderMobileStats = () => (
      <Box sx={{ px: 1.25, pb: 2 }}>
        {statsLoading ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Skeleton variant="rounded" height={80} sx={{ borderRadius: 2 }} />
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 2 }} />
          </Box>
        ) : !stats ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <InfoIcon sx={{ fontSize: 36, color: C.textMuted, mb: 0.5 }} />
            <Typography sx={{ fontSize: "0.82rem", color: C.textMuted, fontWeight: 600 }}>No statistics available</Typography>
          </Box>
        ) : (
          <>
            {/* Overall stats */}
            {stats.dealerStats && (
              <Card elevation={0} sx={{ borderRadius: 2.5, border: `1px solid ${C.border}`, mb: 1 }}>
                <CardContent sx={{ py: 1, px: 1.25, "&:last-child": { pb: 1 } }}>
                  <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.82rem", mb: 0.75 }}>Overall Summary</Typography>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0.75 }}>
                    <Box sx={{ textAlign: "center", p: 0.75, bgcolor: C.bg, borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: C.primary }}>{(stats.dealerStats.totalQuantity || 0).toLocaleString()}</Typography>
                      <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Total Plants</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", p: 0.75, bgcolor: C.orangeBg, borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: C.orangeText }}>{(stats.dealerStats.totalBookedQuantity || 0).toLocaleString()}</Typography>
                      <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Booked</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", p: 0.75, bgcolor: C.greenBg, borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: C.greenText }}>{(stats.dealerStats.totalRemainingQuantity || 0).toLocaleString()}</Typography>
                      <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Available</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75, mt: 0.75 }}>
                    <Box sx={{ textAlign: "center", p: 0.75, bgcolor: C.greenBg, borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: C.greenText }}>{stats.dealerStats.acceptedOrdersCount || 0}</Typography>
                      <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Accepted Orders</Typography>
                    </Box>
                    <Box sx={{ textAlign: "center", p: 0.75, bgcolor: C.redBg, borderRadius: 1.5 }}>
                      <Typography sx={{ fontSize: "1rem", fontWeight: 900, color: C.redText }}>{stats.dealerStats.rejectedOrdersCount || 0}</Typography>
                      <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Rejected Orders</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Plant type distribution */}
            {stats.byPlantType?.length > 0 && (
              <Box>
                <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.82rem", mb: 0.75, display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PieChartIcon sx={{ fontSize: 16, color: C.primary }} /> Plant Distribution
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {stats.byPlantType.map((pt, idx) => {
                    const bkPct = pt.totalQuantity ? Math.round((pt.totalBookedQuantity / pt.totalQuantity) * 100) : 0
                    return (
                      <Card key={idx} elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}` }}>
                        <CardContent sx={{ py: 0.75, px: 1.25, "&:last-child": { pb: 0.75 } }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.25 }}>
                            <Typography sx={{ fontWeight: 800, color: C.textPrimary, fontSize: "0.8rem" }}>{pt.plantTypeName || "Unknown"}</Typography>
                            <Chip label={`${(pt.totalRemainingQuantity || 0).toLocaleString()} avail.`} size="small"
                              sx={{ height: 18, fontSize: "0.55rem", fontWeight: 700, bgcolor: pt.totalRemainingQuantity > 0 ? C.greenBg : C.redBg, color: pt.totalRemainingQuantity > 0 ? C.greenText : C.redText, borderRadius: 1 }} />
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Box sx={{ flex: 1, height: 4, bgcolor: C.border, borderRadius: 3, overflow: "hidden" }}>
                              <Box sx={{ width: `${Math.min(bkPct, 100)}%`, height: "100%", borderRadius: 3, bgcolor: bkPct > 80 ? C.red : bkPct > 50 ? C.orange : C.green }} />
                            </Box>
                            <Typography sx={{ fontSize: "0.6rem", fontWeight: 700, color: C.textSecondary }}>{bkPct}%</Typography>
                          </Box>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.25 }}>
                            <Typography sx={{ fontSize: "0.6rem", color: C.textMuted }}>Total: <Box component="span" sx={{ fontWeight: 700, color: C.textSecondary }}>{(pt.totalQuantity || 0).toLocaleString()}</Box></Typography>
                            <Typography sx={{ fontSize: "0.6rem", color: C.textMuted }}>Booked: <Box component="span" sx={{ fontWeight: 700, color: C.textSecondary }}>{(pt.totalBookedQuantity || 0).toLocaleString()}</Box></Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    )

    return (
      <Box sx={{ minHeight: "100vh", bgcolor: C.bg }}>
        {renderMobileHeader()}
        {renderMobileFinancials()}

        {/* Tabs */}
        <Tabs value={mobileTab} onChange={(_, v) => setMobileTab(v)} variant="fullWidth"
          sx={{
            minHeight: 40, bgcolor: "white", borderBottom: `1px solid ${C.border}`, mx: 1.25, borderRadius: "12px 12px 0 0",
            "& .MuiTab-root": { minHeight: 40, py: 0, fontSize: "0.72rem", textTransform: "none", fontWeight: 700, color: C.textMuted, "&.Mui-selected": { color: C.primary } },
            "& .MuiTabs-indicator": { bgcolor: C.primary, height: 2.5, borderRadius: 2 },
          }}>
          <Tab icon={<WalletIcon sx={{ fontSize: 15, mr: 0.3 }} />} iconPosition="start" label="Transactions" />
          <Tab icon={<InventoryIcon sx={{ fontSize: 15, mr: 0.3 }} />} iconPosition="start" label="Inventory" />
          <Tab icon={<HistoryIcon sx={{ fontSize: 15, mr: 0.3 }} />} iconPosition="start" label="Plant Ledger" />
          <Tab icon={<ReceiptIcon sx={{ fontSize: 15, mr: 0.3 }} />} iconPosition="start" label="Wallet Ledger" />
          <Tab icon={<PieChartIcon sx={{ fontSize: 15, mr: 0.3 }} />} iconPosition="start" label="Stats" />
        </Tabs>

        <Box sx={{ mx: 1.25, bgcolor: "white", borderRadius: "0 0 12px 12px", mb: 1.5, minHeight: 200 }}>
          {mobileTab === 0 && renderMobileLedger()}
          {mobileTab === 1 && renderMobileInventory()}
          {mobileTab === 2 && renderMobilePlantLedger()}
          {mobileTab === 3 && renderMobileWalletLedger()}
          {mobileTab === 4 && renderMobileStats()}
        </Box>

        {/* Refresh */}
        <Box sx={{ px: 1.25, pb: 2 }}>
          <Button size="small" variant="outlined" fullWidth
            onClick={() => { getDealerDetails(id); getDealersStats(id); getDealerWalletTransactions(id, page + 1, rowsPerPage, transactionType); if (tabValue === 2 || mobileTab === 2) getPlantLedger(id, plantLedgerPage + 1, plantLedgerLimit, plantLedgerType); if (tabValue === 3 || mobileTab === 3) getDealerLedger(id, ledgerPage, ledgerLimit, ledgerStartDate || undefined, ledgerEndDate || undefined) }}
            startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
            sx={{ fontSize: "0.72rem", textTransform: "none", borderRadius: 2, borderColor: C.primary, color: C.primary, fontWeight: 700, height: 36 }}>
            Refresh All Data
          </Button>
        </Box>
      </Box>
    )
  }

  // ================================================================
  // DESKTOP VIEW (original layout)
  // ================================================================
  return (
    <Box sx={{ p: 3 }}>
      {/* Dealer Header */}
      <Card sx={{ mb: 3, overflow: "hidden", borderRadius: 2, boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
        <Box sx={{ bgcolor: "primary.main", color: "white", p: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: "white", color: "primary.main", mr: 3, fontSize: 40 }}>
              {dealer.name?.charAt(0).toUpperCase() || "D"}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight="bold">{dealer.name}</Typography>
              <Typography variant="subtitle1">Dealer ID: {id.substring(id.length - 8)}</Typography>
            </Box>
          </Box>
          <Chip label={dealer.isOnboarded ? "Onboarded" : "Not Onboarded"} color={dealer.isOnboarded ? "success" : "warning"} sx={{ fontWeight: "bold" }} />
        </Box>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <PhoneIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="body1" fontWeight="medium">{dealer.phoneNumber}</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <LocationIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="body1">
                  {[dealer.location?.village, dealer.location?.taluka, dealer.location?.district, dealer.location?.state].filter(Boolean).join(", ")}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CalendarIcon sx={{ mr: 1, color: "primary.main" }} />
                <Typography variant="body1">{dealer.birthDate ? new Date(dealer.birthDate).toLocaleDateString("en-IN") : "Not specified"}</Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Financial Overview</Typography>

      {!statsLoading && stats && (
        <>
          <Typography variant="h5" sx={{ mt: 4, mb: 2, fontWeight: 600, display: "flex", alignItems: "center" }}>
            <PieChartIcon sx={{ mr: 1 }} /> Plant Distribution
          </Typography>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {stats.byPlantType?.map((plantType) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={plantType.plantTypeId}>
                <PlantTypeWithSubtypesCard plantType={plantType} subtypes={stats.byPlantAndSubtype || []} />
              </Grid>
            ))}
            {(!stats.byPlantType || stats.byPlantType.length === 0) && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: "center" }}>
                  <InfoIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
                  <Typography variant="h6">No plant statistics available</Typography>
                  <Typography variant="body2" color="text.secondary">There is no plant distribution data for this dealer.</Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {statsLoading && (
        <Box sx={{ width: "100%", mt: 4, mb: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>Plant Distribution</Typography>
          <LinearProgress />
        </Box>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" } }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar sx={{ bgcolor: "primary.light", mr: 2 }}><WalletIcon sx={{ color: "primary.main" }} /></Avatar>
                <Typography variant="h6">Available Amount</Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ mt: 2, fontWeight: "bold", color: "primary.main" }}>
                {formatCurrency(dealerFinancial?.availableAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" } }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar sx={{ bgcolor: "info.light", mr: 2 }}><ReceiptIcon sx={{ color: "info.main" }} /></Avatar>
                <Typography variant="h6">Total Order Amount</Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ mt: 2, fontWeight: "bold", color: "info.main" }}>
                {formatCurrency(dealerFinancial?.totalOrderAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" } }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar sx={{ bgcolor: "success.light", mr: 2 }}><PaymentIcon sx={{ color: "success.main" }} /></Avatar>
                <Typography variant="h6">Total Paid Amount</Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ mt: 2, fontWeight: "bold", color: "success.main" }}>
                {formatCurrency(dealerFinancial?.totalPaidAmount || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.08)", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)", boxShadow: "0 4px 15px rgba(0,0,0,0.1)" } }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                <Avatar sx={{ bgcolor: dealerFinancial?.remainingAmount < 0 ? "success.light" : "error.light", mr: 2 }}>
                  {dealerFinancial?.remainingAmount < 0 ? <ArrowDownwardIcon sx={{ color: "success.main" }} /> : <ArrowUpwardIcon sx={{ color: "error.main" }} />}
                </Avatar>
                <Typography variant="h6">Remaining Amount</Typography>
              </Box>
              <Typography variant="h3" component="div" sx={{ mt: 2, fontWeight: "bold", color: dealerFinancial?.remainingAmount < 0 ? "success.main" : "error.main" }}>
                {formatCurrency(Math.abs(dealerFinancial?.remainingAmount || 0))}
                <Typography variant="caption" sx={{ ml: 1 }}>{dealerFinancial?.remainingAmount < 0 ? "in advance" : "due"}</Typography>
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth" indicatorColor="primary" textColor="primary"
          sx={{ borderBottom: 1, borderColor: "divider", "& .MuiTab-root": { fontWeight: "bold" } }}>
          <Tab label="Wallet Transactions" icon={<WalletIcon />} iconPosition="start" />
          <Tab label="Inventory Details" icon={<InventoryIcon />} iconPosition="start" />
          <Tab label="Plant Ledger" icon={<HistoryIcon />} iconPosition="start" />
          <Tab label="Wallet Ledger" icon={<ReceiptIcon />} iconPosition="start" />
        </Tabs>
      </Box>

      {/* Transactions Tab */}
      {tabValue === 0 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <DealerPDFExport dealer={dealer} dealerFinancial={dealerFinancial} dealerInventory={dealerInventory} transactions={walletTransactions} />
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportTransactionsCSV} disabled={!dealer || walletTransactions.length === 0}
              sx={{ borderColor: "success.main", color: "success.main", "&:hover": { borderColor: "success.dark", bgcolor: "success.50" }, padding: "10px 20px", borderRadius: "8px", textTransform: "none", fontWeight: "bold" }}>
              Export CSV
            </Button>
            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel id="transaction-type-label">Filter by Type</InputLabel>
              <Select labelId="transaction-type-label" id="transaction-type-select" value={transactionType} label="Filter by Type" onChange={handleTypeFilterChange}>
                <MenuItem value="">All Transactions ({walletTransactions.length})</MenuItem>
                <MenuItem value="CREDIT">Credit ({getTransactionTypeCount("CREDIT")})</MenuItem>
                <MenuItem value="DEBIT">Debit ({getTransactionTypeCount("DEBIT")})</MenuItem>
                <MenuItem value="INVENTORY_ADD">Inventory Add ({getTransactionTypeCount("INVENTORY_ADD")})</MenuItem>
                <MenuItem value="INVENTORY_BOOK">Inventory Book ({getTransactionTypeCount("INVENTORY_BOOK")})</MenuItem>
                <MenuItem value="INVENTORY_RELEASE">Inventory Release ({getTransactionTypeCount("INVENTORY_RELEASE")})</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {transactionsLoading ? (
            <Box sx={{ width: "100%", mt: 3 }}><LinearProgress /></Box>
          ) : transactionsError ? (
            <Alert severity="error" sx={{ mt: 2 }}>{transactionsError}</Alert>
          ) : walletTransactions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <InfoIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6">No transactions found</Typography>
              <Typography variant="body2" color="text.secondary">There are no transactions matching your filter criteria.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 2 }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: "grey.100" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Balance Before</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Balance After</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {walletTransactions.map((transaction) => (
                    <TableRow key={transaction._id}
                      sx={{ "&:last-child td, &:last-child th": { border: 0 }, bgcolor: transaction.type === "CREDIT" ? "rgba(76, 175, 80, 0.04)" : transaction.type === "DEBIT" ? "rgba(244, 67, 54, 0.04)" : "inherit" }} hover>
                      <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                      <TableCell>
                        <Chip icon={transaction.type === "CREDIT" ? <AddCircleIcon fontSize="small" /> : transaction.type === "DEBIT" ? <RemoveCircleIcon fontSize="small" /> : <CircleIcon fontSize="small" />}
                          label={transaction.type} size="small"
                          color={transaction.type === "CREDIT" || transaction.type === "INVENTORY_ADD" ? "success" : transaction.type === "DEBIT" || transaction.type === "INVENTORY_BOOK" ? "error" : "info"}
                          sx={{ fontWeight: "medium", "& .MuiChip-icon": { ml: 0.5 } }} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: "bold", color: transaction.type === "CREDIT" || transaction.type === "INVENTORY_ADD" ? "success.main" : transaction.type === "DEBIT" || transaction.type === "INVENTORY_BOOK" ? "error.main" : "text.primary" }}>
                        {transaction.type === "CREDIT" || transaction.type === "INVENTORY_ADD" ? "+ " : "- "}{formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>{formatCurrency(transaction.balanceBefore)}</TableCell>
                      <TableCell>{formatCurrency(transaction.balanceAfter)}</TableCell>
                      <TableCell>
                        <Tooltip title={transaction.description} arrow>
                          <Typography sx={{ maxWidth: 250, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {extractDescription(transaction.description)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip label={transaction.status} size="small"
                          color={transaction.status === "COMPLETED" ? "success" : transaction.status === "PENDING" ? "warning" : "error"}
                          variant="outlined" sx={{ fontWeight: "medium" }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div" count={totalTransactions} rowsPerPage={rowsPerPage} page={page}
                onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
            </TableContainer>
          )}
        </Box>
      )}

      {/* Inventory Tab */}
      {tabValue === 1 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Plant Inventory</Typography>
          {dealerInventory.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <InfoIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6">No inventory found</Typography>
              <Typography variant="body2" color="text.secondary">This dealer doesnt have any plant inventory yet.</Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {dealerInventory.map((plant) => (
                <Grid item xs={12} key={`${plant.plantType}-${plant.subType}`}>
                  <Card sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 2 }}>
                    <CardContent>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: "bold" }}>{plant.plantName} - {plant.subtypeName}</Typography>
                        <Box>
                          <Chip label={`Total: ${plant.totalQuantity.toLocaleString()} units`} color="primary" sx={{ mr: 1, fontWeight: "medium" }} />
                          <Chip label={`Available: ${plant.totalRemainingQuantity.toLocaleString()} units`} color={plant.totalRemainingQuantity > 0 ? "success" : "error"} sx={{ fontWeight: "medium" }} />
                        </Box>
                      </Box>
                      <WalletUtilization used={plant.totalBookedQuantity} total={plant.totalQuantity} />
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: "medium" }}>Slot Details</Typography>
                      <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                          <TableHead sx={{ bgcolor: "grey.50" }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: "bold" }}>Period</TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>Total Quantity</TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>Booked Quantity</TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>Remaining Quantity</TableCell>
                              <TableCell sx={{ fontWeight: "bold" }}>Utilization</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {plant.slotDetails.map((slot) => (
                              <TableRow key={slot.slotId} hover sx={{ bgcolor: slot.remainingQuantity === 0 ? "rgba(244, 67, 54, 0.04)" : "inherit" }}>
                                <TableCell>
                                  <Box sx={{ display: "flex", alignItems: "center" }}>
                                    <CalendarIcon fontSize="small" color="primary" sx={{ mr: 1 }} />
                                    <Box>
                                      <Typography variant="body2" sx={{ fontWeight: "medium" }}>{slot.dates.startDay} to {slot.dates.endDay}</Typography>
                                      <Typography variant="caption" color="text.secondary">{slot.dates.month} {new Date().getFullYear()}</Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell>{slot.quantity.toLocaleString()}</TableCell>
                                <TableCell>{slot.bookedQuantity.toLocaleString()}</TableCell>
                                <TableCell>
                                  <Typography sx={{ fontWeight: "bold", color: slot.remainingQuantity > 0 ? "success.main" : "error.main" }}>
                                    {slot.remainingQuantity.toLocaleString()}
                                  </Typography>
                                </TableCell>
                                <TableCell><WalletUtilization used={slot.bookedQuantity} total={slot.quantity} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Plant Ledger Tab */}
      {tabValue === 2 && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Typography variant="h6">Plant Inventory Ledger</Typography>
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel>Filter by Type</InputLabel>
              <Select value={plantLedgerType} label="Filter by Type" onChange={(e) => { setPlantLedgerType(e.target.value); setPlantLedgerPage(0) }}>
                <MenuItem value="">All</MenuItem>
                <MenuItem value="INVENTORY_ADD">INVENTORY_ADD</MenuItem>
                <MenuItem value="INVENTORY_BOOK">INVENTORY_BOOK</MenuItem>
                <MenuItem value="INVENTORY_RELEASE">INVENTORY_RELEASE</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {plantLedgerLoading ? (
            <Box sx={{ width: "100%", mt: 3 }}><LinearProgress /></Box>
          ) : plantLedgerEntries.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <HistoryIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6">No plant ledger entries</Typography>
              <Typography variant="body2" color="text.secondary">Plant movements will appear here when orders are placed or rejected.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 2 }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: "grey.100" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Plant</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Quantity</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Balance Before</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Balance After</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plantLedgerEntries.map((entry) => {
                    const isAdd = entry.transactionType === "INVENTORY_ADD"
                    const isRelease = entry.transactionType === "INVENTORY_RELEASE"
                    const plantName = entry.plantType?.name || "—"
                    return (
                      <TableRow key={entry._id} hover sx={{ bgcolor: isAdd || isRelease ? "rgba(76, 175, 80, 0.04)" : "rgba(244, 67, 54, 0.04)" }}>
                        <TableCell>{formatDate(entry.createdAt)}</TableCell>
                        <TableCell>
                          <Chip label={entry.transactionType?.replace("INVENTORY_", "")} size="small"
                            color={isAdd || isRelease ? "success" : "error"} sx={{ fontWeight: "medium" }} />
                        </TableCell>
                        <TableCell>{plantName}</TableCell>
                        <TableCell sx={{ fontWeight: "bold", color: isAdd || isRelease ? "success.main" : "error.main" }}>
                          {entry.transactionType === "INVENTORY_BOOK" ? "-" : "+"}{Math.abs(entry.quantity || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{entry.balanceBefore?.toLocaleString() || 0}</TableCell>
                        <TableCell>{entry.balanceAfter?.toLocaleString() || 0}</TableCell>
                        <TableCell>
                          <Tooltip title={entry.description} arrow>
                            <Typography sx={{ maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {entry.description || "—"}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <TablePagination rowsPerPageOptions={[10, 25, 50]} component="div" count={plantLedgerTotal} rowsPerPage={plantLedgerLimit} page={plantLedgerPage}
                onPageChange={(_, p) => setPlantLedgerPage(p)} onRowsPerPageChange={() => {}} />
            </TableContainer>
          )}
        </Box>
      )}

      {/* Wallet Ledger Tab (auditable) */}
      {tabValue === 3 && (
        <Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mb: 2 }}>
            <Typography variant="h6">Audit Ledger</Typography>
            <TextField size="small" label="Start date" type="date" value={ledgerStartDate} onChange={(e) => { setLedgerStartDate(e.target.value); setLedgerPage(1) }}
              InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <TextField size="small" label="End date" type="date" value={ledgerEndDate} onChange={(e) => { setLedgerEndDate(e.target.value); setLedgerPage(1) }}
              InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
            <Button variant="outlined" size="small" onClick={() => getDealerLedger(id, 1, ledgerLimit, ledgerStartDate || undefined, ledgerEndDate || undefined)}>
              Apply
            </Button>
          </Box>
          {ledgerSummary != null && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: "error.50", borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Total Debit</Typography>
                    <Typography variant="h6" fontWeight="bold" color="error.main">{formatCurrency(ledgerSummary.totalDebit || 0)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: "success.50", borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Total Credit</Typography>
                    <Typography variant="h6" fontWeight="bold" color="success.main">{formatCurrency(ledgerSummary.totalCredit || 0)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card sx={{ bgcolor: "primary.50", borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">Balance (Credit − Debit)</Typography>
                    <Typography variant="h6" fontWeight="bold" color="primary.main">{formatCurrency(ledgerSummary.balance != null ? ledgerSummary.balance : 0)}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
          {ledgerLoading ? (
            <Box sx={{ width: "100%", mt: 3 }}><LinearProgress /></Box>
          ) : ledgerEntries.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <ReceiptIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6">No ledger entries</Typography>
              <Typography variant="body2" color="text.secondary">Audit ledger entries will appear here when payments or adjustments are recorded.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", borderRadius: 2 }}>
              <Table sx={{ minWidth: 650 }}>
                <TableHead sx={{ bgcolor: "grey.100" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Debit</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Credit</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Balance Before</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Balance After</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Order</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgerEntries.map((entry) => (
                    <TableRow key={entry._id} hover sx={{ bgcolor: (entry.credit || 0) > 0 ? "rgba(76, 175, 80, 0.04)" : "rgba(244, 67, 54, 0.04)" }}>
                      <TableCell>{formatDate(entry.entryDate || entry.createdAt)}</TableCell>
                      <TableCell>
                        <Chip label={ledgerRefTypeLabel(entry.refType)} size="small" sx={{ fontWeight: "medium" }} />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "error.main" }}>{(entry.debit || 0) > 0 ? formatCurrency(entry.debit) : "—"}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: "success.main" }}>{(entry.credit || 0) > 0 ? formatCurrency(entry.credit) : "—"}</TableCell>
                      <TableCell>{formatCurrency(entry.balanceBefore != null ? entry.balanceBefore : 0)}</TableCell>
                      <TableCell>{formatCurrency(entry.balanceAfter != null ? entry.balanceAfter : 0)}</TableCell>
                      <TableCell>{entry.orderId?.orderId ? `#${entry.orderId.orderId}` : "—"}</TableCell>
                      <TableCell>
                        <Tooltip title={entry.description} arrow>
                          <Typography sx={{ maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {entry.description || entry.reference || "—"}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{entry.createdBy?.name || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination rowsPerPageOptions={[20, 50]} component="div" count={ledgerPagination.total || 0} rowsPerPage={ledgerLimit} page={(ledgerPagination.page || 1) - 1}
                onPageChange={(_, p) => setLedgerPage(p + 1)} onRowsPerPageChange={() => {}} />
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  )
}

const MobileFinCard = ({ icon, iconBg, iconColor, label, value, valueColor }) => (
  <Card elevation={0} sx={{ borderRadius: 2, border: `1px solid ${C.border}` }}>
    <CardContent sx={{ py: 1, px: 1, "&:last-child": { pb: 1 } }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: iconBg, display: "flex", alignItems: "center", justifyContent: "center", color: iconColor, flexShrink: 0 }}>{icon}</Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: "0.58rem", color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>{label}</Typography>
          <Typography sx={{ fontWeight: 900, color: valueColor, fontSize: "0.88rem", letterSpacing: "-0.02em", lineHeight: 1.2 }}>{value}</Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
)

export default DealerDetails
