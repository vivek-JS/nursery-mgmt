import React, { useState, useEffect, useRef } from "react"
import {
  Grid,
  Button,
  Box,
  Chip,
  Card,
  CardContent,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Modal,
  Backdrop,
  Fade,
  Pagination,
  CircularProgress,
  Collapse,
  Zoom,
  Slide
} from "@mui/material"
import { makeStyles } from "tss-react/mui"
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  Close as CloseIcon,
  ArrowBackIos as PrevIcon,
  ArrowForwardIos as NextIcon,
  Shield,
  TrendingUp as TrendingUpIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  AccessTime as AccessTimeIcon
} from "@mui/icons-material"

import { colorScheme } from "constants/colorScheme"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import moment from "moment"
import { Toast } from "helpers/toasts/toastHelper"
import {
  useHasPaymentAccess,
  useIsAccountant,
  useIsOfficeAdmin,
  useIsSuperAdmin,
  useHasPaymentsAccess,
  useUserData
} from "utils/roleUtils"

const useStyles = makeStyles()((theme) => ({
  padding14: {
    padding: theme.spacing(2.5),
    background: "linear-gradient(180deg, #f0f4ff 0%, #e8eeff 40%, #f8fafc 100%)",
    minHeight: "100vh",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5)
    }
  },
  pageHeader: {
    background: colorScheme.gradientHeader,
    borderRadius: "16px",
    padding: theme.spacing(2.5, 3),
    marginBottom: theme.spacing(2.5),
    color: "white",
    boxShadow: colorScheme.shadowHeader,
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5, 2),
      borderRadius: "12px"
    }
  },
  addButton: {
    borderRadius: "12px",
    textTransform: "none",
    fontWeight: 600,
    padding: "10px 24px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 20px rgba(0,0,0,0.2)"
    }
  },
  paymentCard: {
    marginBottom: theme.spacing(1.5),
    borderRadius: "14px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    border: "1px solid rgba(15, 118, 110, 0.12)",
    overflow: "hidden",
    animation: "$fadeInUp 0.4s ease-out",
    "&:hover": {
      boxShadow: "0 8px 24px rgba(15, 118, 110, 0.15)",
      borderColor: "rgba(15, 118, 110, 0.3)",
      transform: "translateY(-2px)"
    }
  },
  "@keyframes fadeInUp": {
    "0%": {
      opacity: 0,
      transform: "translateY(10px)"
    },
    "100%": {
      opacity: 1,
      transform: "translateY(0)"
    }
  },
  statusChip: {
    borderRadius: "20px",
    fontWeight: 600,
    fontSize: "0.75rem",
    padding: "4px 12px",
    height: "auto"
  },
  filterSection: {
    background: "white",
    padding: theme.spacing(2),
    borderRadius: "14px",
    marginBottom: theme.spacing(2),
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.06)",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5),
      borderRadius: "12px"
    }
  },
  searchBox: {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: "#f8fafc",
      transition: "all 0.3s ease",
      "&:hover": {
        backgroundColor: "#f1f5f9"
      },
      "&.Mui-focused": {
        backgroundColor: "white",
        boxShadow: "0 0 0 3px rgba(15, 118, 110, 0.15)"
      }
    }
  },
  tabButton: {
    padding: "10px 20px",
    borderRadius: "10px",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    minWidth: "110px",
    position: "relative",
    overflow: "hidden",
    "&.active": {
      background: colorScheme.gradientButton,
      color: "white",
      boxShadow: colorScheme.shadowButton,
      transform: "scale(1.02)",
      "&:hover": {
        transform: "scale(1.05)",
        boxShadow: "0 6px 20px rgba(15, 118, 110, 0.4)"
      }
    },
    "&:not(.active)": {
      backgroundColor: "white",
      color: "#64748b",
      border: "1px solid #e2e8f0",
      "&:hover": {
        backgroundColor: "#f0fdfa",
        borderColor: "#99f6e4",
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
      }
    }
  },
  statusSelect: {
    minWidth: "120px",
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      fontSize: "0.75rem"
    },
    "& .MuiSelect-select": {
      zIndex: 1300
    },
    "& .MuiMenu-paper": {
      zIndex: 1300
    }
  },
  disabledStatus: {
    opacity: 0.6,
    cursor: "not-allowed"
  },
  dateInput: {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    fontSize: "14px",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    backgroundColor: "#f8fafc",
    "&:focus": {
      outline: "none",
      borderColor: "#0f766e",
      backgroundColor: "white",
      boxShadow: "0 0 0 2px rgba(15, 118, 110, 0.15)"
    },
    "&:hover": {
      borderColor: "#99f6e4",
      backgroundColor: "#f0fdfa"
    }
  },
  imageViewButton: {
    padding: "8px",
    borderRadius: "8px",
    backgroundColor: "#f5f5f5",
    color: "#666",
    "&:hover": {
      backgroundColor: "#e0e0e0",
      color: "#333"
    }
  },
  imageModal: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: "none"
  },
  imageModalContent: {
    backgroundColor: "white",
    borderRadius: "20px",
    padding: "24px",
    maxWidth: "90vw",
    maxHeight: "90vh",
    overflow: "auto",
    position: "relative",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
  },
  imageModalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    paddingBottom: "10px",
    borderBottom: "1px solid #e0e0e0"
  },
  imageContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px"
  },
  mainImage: {
    maxWidth: "100%",
    maxHeight: "60vh",
    objectFit: "contain",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)"
  },
  imageNavigation: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px"
  },
  imageThumbnails: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: "20px"
  },
  thumbnail: {
    width: "80px",
    height: "80px",
    objectFit: "cover",
    borderRadius: "8px",
    cursor: "pointer",
    border: "2px solid transparent",
    "&.active": {
      border: "2px solid #1976d2"
    }
  },
  imageInfo: {
    textAlign: "center",
    color: "#666",
    fontSize: "14px"
  },
  outstandingCard: {
    cursor: "pointer",
    transition: "all 0.3s ease",
    borderRadius: "12px",
    border: "1px solid rgba(0,0,0,0.05)",
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "0 8px 20px rgba(0,0,0,0.12)"
    }
  },
  tabContainer: {
    backgroundColor: "white",
    padding: theme.spacing(2),
    borderRadius: "14px",
    marginBottom: theme.spacing(2),
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.06)"
  },
  paymentCardContent: {
    padding: theme.spacing(2) + "!important",
    "&:last-child": {
      paddingBottom: theme.spacing(2)
    },
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5) + "!important"
    }
  },
  infoSection: {
    padding: theme.spacing(1),
    borderRadius: "8px",
    backgroundColor: "#f0fdfa",
    borderLeft: "4px solid #0f766e"
  },
  ledgerButton: {
    borderRadius: "10px",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "13px",
    background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    color: "white",
    "&:hover": {
      background: "linear-gradient(135deg, #0d9488 0%, #2dd4bf 100%)",
      boxShadow: "0 4px 12px rgba(15, 118, 110, 0.3)"
    }
  },
  ledgerModal: {
    "& .MuiDialog-paper": {
      borderRadius: "16px",
      boxShadow: "0 24px 48px rgba(0,0,0,0.12)",
      maxWidth: "min(900px, 95vw)",
      maxHeight: "90vh"
    }
  },
  flowChartContainer: {
    width: "100%",
    height: "100%",
    minHeight: "400px",
    position: "relative",
    overflow: "auto",
    backgroundColor: "#fafafa",
    padding: theme.spacing(2),
    [theme.breakpoints.down("md")]: {
      padding: theme.spacing(1),
      minHeight: "300px"
    }
  },
  nodeCard: {
    padding: theme.spacing(2),
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    transition: "all 0.3s ease",
    "&:hover": {
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      transform: "scale(1.02)"
    },
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5)
    }
  },
  paymentCardAnimating: {
    opacity: 0,
    transform: "translateX(-20px) scale(0.95)",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    pointerEvents: "none"
  },
  paymentCardEntering: {
    opacity: 0,
    transform: "translateY(20px) scale(0.95)",
    animation: "$slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards"
  },
  "@keyframes slideInUp": {
    "0%": {
      opacity: 0,
      transform: "translateY(20px) scale(0.95)"
    },
    "100%": {
      opacity: 1,
      transform: "translateY(0) scale(1)"
    }
  },
  "@keyframes fadeOut": {
    "0%": {
      opacity: 1,
      transform: "scale(1)"
    },
    "100%": {
      opacity: 0,
      transform: "scale(0.95)",
      height: 0,
      marginBottom: 0,
      padding: 0
    }
  },
  statusUpdating: {
    position: "relative",
    "&::after": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.8)",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10
    }
  },
  successPulse: {
    animation: "$pulseSuccess 0.6s ease-in-out"
  },
  "@keyframes pulseSuccess": {
    "0%": {
      transform: "scale(1)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
    },
    "50%": {
      transform: "scale(1.02)",
      boxShadow: "0 8px 24px rgba(46, 125, 50, 0.3)"
    },
    "100%": {
      transform: "scale(1)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
    }
  },
  "@keyframes bounce": {
    "0%, 100%": {
      transform: "translateY(0)"
    },
    "50%": {
      transform: "translateY(-10px)"
    }
  }
}))

const PaymentsPage = () => {
  const { classes } = useStyles()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  // Auto-select last 15 days on mount
  const [selectedDateRange, setSelectedDateRange] = useState(() => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - 15)
    return [startDate, endDate]
  })
  const [activeTab, setActiveTab] = useState("pending") // "collected", "pending", or "rejected"
  const [paymentType, setPaymentType] = useState("farmer") // "farmer" or "ram-agri-sales" (Agri Input)
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0)
  const [showOutstanding, setShowOutstanding] = useState(false) // Toggle for outstanding view
  const [outstandingView, setOutstandingView] = useState("total") // "total", "salesmen", "district", "taluka", "village", "customer"
  const [outstandingData, setOutstandingData] = useState(null)
  const [customerOutstandingData, setCustomerOutstandingData] = useState([])
  const [employeeOrders, setEmployeeOrders] = useState([]) // Orders booked by employee
  
  // Pagination state
  const [page, setPage] = useState(1)
  const [rowsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Role-based access control
  const hasPaymentsAccess = useHasPaymentsAccess() // Only Accountants and Super Admins
  const hasPaymentAccess = useHasPaymentAccess() // Only Accountants and Super Admins
  const isAccountant = useIsAccountant()
  const isOfficeAdmin = useIsOfficeAdmin()
  const isSuperAdmin = useIsSuperAdmin()
  const userData = useUserData() // Get current user data for activity logging

  // Access control check
  if (!hasPaymentsAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
          <CardContent sx={{ textAlign: 'center', p: 4 }}>
            <Shield sx={{ fontSize: 64, color: '#f44336', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="error">
              Access Denied
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              You don&apos;t have permission to access Payments Management.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This feature is only available to Accountant and Super Admin users.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null
  })

  // Image viewing modal state
  const [imageModal, setImageModal] = useState({
    open: false,
    images: [],
    currentIndex: 0,
    title: ""
  })

  // Customer ledger modal state (Agri Input only)
  const [showCustomerLedger, setShowCustomerLedger] = useState(false)
  const [customerLedgerData, setCustomerLedgerData] = useState(null)
  const [loadingLedger, setLoadingLedger] = useState(false)
  const [showCustomerLedgerSummaryDetails, setShowCustomerLedgerSummaryDetails] = useState(false)

  // Animation states
  const [updatingPayments, setUpdatingPayments] = useState(new Set())
  const [removingPayments, setRemovingPayments] = useState(new Set())
  const [successPayments, setSuccessPayments] = useState(new Set())

  // Activity log states
  const [todaysActivities, setTodaysActivities] = useState([])
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [allActivities, setAllActivities] = useState([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  const [startDate, endDate] = selectedDateRange
  
  // Track date string for comparison
  const startDateStr = startDate ? moment(startDate).format("DD-MM-YYYY") : null
  const endDateStr = endDate ? moment(endDate).format("DD-MM-YYYY") : null

  // Handle date range changes
  const handleStartDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : null
    if (date && date instanceof Date && !isNaN(date.getTime())) {
      setSelectedDateRange([date, endDate])
    }
  }

  const handleEndDateChange = (e) => {
    const date = e.target.value ? new Date(e.target.value) : null
    if (date && date instanceof Date && !isNaN(date.getTime())) {
      setSelectedDateRange([startDate, date])
    }
  }
  
  const clearDates = () => {
    setSelectedDateRange([null, null])
  }

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500)

    return () => {
      clearTimeout(handler)
    }
  }, [searchTerm])

  // Fetch payments function for farmer orders
  const fetchFarmerPayments = async () => {
    setLoading(true)
    try {
      const params = {
        search: debouncedSearchTerm,
        paymentStatus:
          activeTab === "collected" ? "COLLECTED" : activeTab === "pending" ? "PENDING" : "REJECTED",
        page: page,
        limit: rowsPerPage
      }

      if (
        startDate &&
        endDate &&
        startDate instanceof Date &&
        endDate instanceof Date &&
        !isNaN(startDate.getTime()) &&
        !isNaN(endDate.getTime())
      ) {
        params.startDate = moment(startDate).format("DD-MM-YYYY")
        params.endDate = moment(endDate).format("DD-MM-YYYY")
      }

      const instance = NetworkManager(API.ORDER.GET_PAYMENTS)
      const response = await instance.request({}, params)

      if (response?.data?.data) {
        setPayments(Array.isArray(response.data.data) ? response.data.data : [])
        // Handle pagination metadata if available
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1)
          setTotalCount(response.data.pagination.total || response.data.data.length)
        } else {
          setTotalPages(1)
          setTotalCount(response.data.data.length)
        }
        // Clear animation states
        setUpdatingPayments(new Set())
        setRemovingPayments(new Set())
      } else {
        setPayments([])
        setTotalPages(1)
        setTotalCount(0)
        setUpdatingPayments(new Set())
        setRemovingPayments(new Set())
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
      Toast.error("Failed to fetch payments")
      setPayments([])
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Fetch payments function for Agri Input (Ram Agri Sales) orders
  const fetchRamAgriSalesPayments = async () => {
    setLoading(true)
    try {
      const params = {
        search: debouncedSearchTerm || "",
        paymentStatus:
          activeTab === "collected" ? "COLLECTED" : activeTab === "pending" ? "PENDING" : "REJECTED",
        page: page,
        limit: rowsPerPage
      }

      if (
        startDate &&
        endDate &&
        startDate instanceof Date &&
        endDate instanceof Date &&
        !isNaN(startDate.getTime()) &&
        !isNaN(endDate.getTime())
      ) {
        params.startDate = moment(startDate).format("DD-MM-YYYY")
        params.endDate = moment(endDate).format("DD-MM-YYYY")
      }

      const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_PENDING_PAYMENTS)
      const response = await instance.request({}, params)

      // Handle response structure: { status: "Success", message: "...", data: { data: [...], pagination: {...} } }
      if (response?.data?.status === "Success") {
        const responseData = response.data.data
        const paymentsData = responseData?.data || response.data.data || []
        setPayments(Array.isArray(paymentsData) ? paymentsData : [])
        // Handle pagination metadata if available
        if (responseData?.pagination) {
          setTotalPages(responseData.pagination.pages || responseData.pagination.totalPages || 1)
          setTotalCount(responseData.pagination.total || paymentsData.length)
        } else {
          setTotalPages(1)
          setTotalCount(paymentsData.length)
        }
        // Clear animation states
        setUpdatingPayments(new Set())
        setRemovingPayments(new Set())
      } else {
        setPayments([])
        setTotalPages(1)
        setTotalCount(0)
        setUpdatingPayments(new Set())
        setRemovingPayments(new Set())
      }
    } catch (error) {
      console.error("Error fetching Ram Agri Sales payments:", error)
      Toast.error("Failed to fetch Ram Agri Sales payments")
      setPayments([])
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Main fetch function that routes to appropriate API
  const fetchPayments = () => {
    if (paymentType === "ram-agri-sales") {
      fetchRamAgriSalesPayments()
    } else {
      fetchFarmerPayments()
    }
  }

  // Fetch pending payments count for Ram Agri Sales
  const fetchPendingPaymentsCount = async () => {
    if (paymentType === "ram-agri-sales") {
      try {
        const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_PENDING_PAYMENTS_COUNT)
        const response = await instance.request({}, {})
        if (response?.data?.status === "Success") {
          setPendingPaymentsCount(response.data.data?.count || 0)
        }
      } catch (error) {
        console.error("Error fetching pending payments count:", error)
      }
    } else {
      setPendingPaymentsCount(0)
    }
  }

  // Fetch outstanding analysis
  const fetchOutstandingAnalysis = async () => {
    try {
      const params = {}
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD")
        params.endDate = moment(endDate).format("YYYY-MM-DD")
      }

      const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_OUTSTANDING_ANALYSIS)
      const response = await instance.request({}, params)

      if (response?.data?.status === "Success") {
        setOutstandingData(response.data.data)
      }
    } catch (error) {
      console.error("Error fetching outstanding analysis:", error)
      Toast.error("Failed to fetch outstanding analysis")
    }
  }

  // Fetch customer outstanding
  const fetchCustomerOutstanding = async () => {
    try {
      const params = {}
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD")
        params.endDate = moment(endDate).format("YYYY-MM-DD")
      }

      const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_CUSTOMER_OUTSTANDING)
      const response = await instance.request({}, params)

      if (response?.data?.status === "Success") {
        setCustomerOutstandingData(response.data.data?.data || [])
      }
    } catch (error) {
      console.error("Error fetching customer outstanding:", error)
      Toast.error("Failed to fetch customer outstanding")
    }
  }

  // Fetch employee orders (all orders booked by current employee)
  const fetchEmployeeOrders = async () => {
    if (paymentType === "ram-agri-sales") {
      try {
        const params = {
          myOrders: "true",
          page: 1,
          limit: 1000
        }
        if (startDate && endDate) {
          params.startDate = moment(startDate).format("YYYY-MM-DD")
          params.endDate = moment(endDate).format("YYYY-MM-DD")
        }

        const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS)
        const response = await instance.request({}, params)

        if (response?.data?.status === "Success") {
          setEmployeeOrders(response.data.data?.data || [])
        }
      } catch (error) {
        console.error("Error fetching employee orders:", error)
      }
    }
  }

  // Fetch customer ledger (Agri Input – opens in popup)
  const fetchCustomerLedger = async (customerMobile, customerName, customerId = null) => {
    try {
      setLoadingLedger(true)
      setShowCustomerLedger(true)
      setCustomerLedgerData(null)
      const params = {}
      if (customerMobile) params.customerMobile = customerMobile
      if (customerName) params.customerName = customerName
      if (customerId) params.customerId = customerId
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD")
        params.endDate = moment(endDate).format("YYYY-MM-DD")
      }

      const instance = NetworkManager(API.INVENTORY.GET_RAM_AGRI_CUSTOMER_LEDGER)
      const response = await instance.request({}, params)

      if (response?.data) {
        const apiResponse = response.data
        if (apiResponse.status === "Success" || apiResponse.success) {
          setCustomerLedgerData(apiResponse.data)
        } else {
          Toast.error(apiResponse.message || "Failed to load ledger")
        }
      }
    } catch (error) {
      console.error("Error fetching customer ledger:", error)
      Toast.error("Failed to fetch customer ledger")
    } finally {
      setLoadingLedger(false)
    }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount || 0)

  // Log payment activity
  const logPaymentActivity = async (activityData) => {
    try {
      const instance = NetworkManager(API.ORDER.CREATE_PAYMENT_ACTIVITY)
      await instance.request({
        ...activityData,
        timestamp: new Date().toISOString(),
        paymentType: paymentType,
        performedBy: {
          userId: userData?._id,
          name: userData?.name,
          email: userData?.email,
          phoneNumber: userData?.phoneNumber,
          role: userData?.role || userData?.jobTitle
        }
      })
    } catch (error) {
      console.error("Error logging payment activity:", error)
      // Don't show error to user, just log it
    }
  }

  // Fetch today's activities
  const fetchTodaysActivities = async () => {
    try {
      const instance = NetworkManager(API.ORDER.GET_TODAYS_PAYMENT_ACTIVITIES)
      const response = await instance.request({}, {})
      
      if (response?.data?.data) {
        setTodaysActivities(Array.isArray(response.data.data) ? response.data.data : [])
      }
    } catch (error) {
      console.error("Error fetching today's activities:", error)
    }
  }

  // Fetch all activities
  const fetchAllActivities = async () => {
    setLoadingActivities(true)
    try {
      const params = {}
      if (startDate && endDate) {
        params.startDate = moment(startDate).format("YYYY-MM-DD")
        params.endDate = moment(endDate).format("YYYY-MM-DD")
      }

      const instance = NetworkManager(API.ORDER.GET_PAYMENT_ACTIVITIES)
      const response = await instance.request({}, params)
      
      if (response?.data?.data) {
        setAllActivities(Array.isArray(response.data.data) ? response.data.data : [])
      }
    } catch (error) {
      console.error("Error fetching activities:", error)
      Toast.error("Failed to fetch activities")
    } finally {
      setLoadingActivities(false)
    }
  }

  // Track previous filter values to reset page only when filters actually change
  const prevFiltersRef = useRef({ debouncedSearchTerm, activeTab, startDateStr, endDateStr, paymentType, showOutstanding, outstandingView })

  // Fetch payments when filters or page change
  useEffect(() => {
    const currentFilters = { debouncedSearchTerm, activeTab, startDateStr, endDateStr, paymentType, showOutstanding, outstandingView }
    const filtersChanged = 
      prevFiltersRef.current.debouncedSearchTerm !== debouncedSearchTerm ||
      prevFiltersRef.current.activeTab !== activeTab ||
      prevFiltersRef.current.startDateStr !== startDateStr ||
      prevFiltersRef.current.endDateStr !== endDateStr ||
      prevFiltersRef.current.paymentType !== paymentType ||
      prevFiltersRef.current.showOutstanding !== showOutstanding ||
      prevFiltersRef.current.outstandingView !== outstandingView

    // Reset page only if filters changed and we're not already on page 1
    if (filtersChanged && page !== 1) {
      setPage(1)
      prevFiltersRef.current = currentFilters
      return // Exit early, will re-run with page=1
    }

    // Update ref after checking
    prevFiltersRef.current = currentFilters

    if (!showOutstanding && outstandingView !== "orders") {
      fetchPayments()
    }
    fetchPendingPaymentsCount()
    if (paymentType === "ram-agri-sales") {
      fetchEmployeeOrders()
    }
  }, [debouncedSearchTerm, activeTab, startDateStr, endDateStr, paymentType, showOutstanding, outstandingView, page])

  // Fetch outstanding data when outstanding view is enabled
  useEffect(() => {
    if (showOutstanding && paymentType === "ram-agri-sales") {
      fetchOutstandingAnalysis()
      if (outstandingView === "customer") {
        fetchCustomerOutstanding()
      }
    }
  }, [showOutstanding, paymentType, outstandingView, startDateStr, endDateStr])

  // Fetch today's activities on mount and when payment type changes
  useEffect(() => {
    fetchTodaysActivities()
  }, [paymentType])

  const getStatusColor = (status) => {
    switch (status) {
      case "COLLECTED":
        return { color: "success", bg: "#e8f5e8", text: "#2e7d32" }
      case "PENDING":
        return { color: "warning", bg: "#fff3e0", text: "#f57c00" }
      case "REJECTED":
        return { color: "error", bg: "#ffebee", text: "#d32f2f" }
      default:
        return { color: "default", bg: "#f5f5f5", text: "#757575" }
    }
  }

  const getOrderStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return { color: "success", bg: "#e8f5e8", text: "#2e7d32" }
      case "PENDING":
        return { color: "warning", bg: "#fff3e0", text: "#f57c00" }
      case "ACCEPTED":
        return { color: "info", bg: "#e3f2fd", text: "#1976d2" }
      case "DISPATCHED":
        return { color: "primary", bg: "#e8eaf6", text: "#3f51b5" }
      case "FARM_READY":
        return { color: "secondary", bg: "#f3e5f5", text: "#7b1fa2" }
      default:
        return { color: "default", bg: "#f5f5f5", text: "#757575" }
    }
  }

  const exportToCSV = () => {
    const headers = paymentType === "ram-agri-sales"
      ? [
          "Order Number",
          "Customer Name",
          "Mobile Number",
          "Product Name",
          "Quantity",
          "Unit",
          "Rate",
          "Payment Amount",
          "Payment Status",
          "Payment Date",
          "Mode of Payment",
          "Bank Name",
          "Order Status",
          "Total Order Amount",
          "Total Paid Amount",
          "Balance Amount",
          "Created By"
        ]
      : [
          "Order ID",
          "Farmer Name",
          "Mobile Number",
          "Plant Type",
          "Payment Amount",
          "Payment Status",
          "Payment Date",
          "Mode of Payment",
          "Bank Name",
          "Order Status",
          "Total Order Amount",
          "Sales Person"
        ]

    const csvData = payments.map((payment) => {
      if (paymentType === "ram-agri-sales") {
        return [
          payment.orderNumber || "",
          payment.customerName || "",
          payment.customerMobile || "",
          payment.productName || "",
          payment.quantity || 0,
          payment.unit || "",
          payment.rate || 0,
          payment.payment?.paidAmount || 0,
          payment.payment?.paymentStatus || "",
          moment(payment.payment?.paymentDate).format("DD-MM-YYYY"),
          payment.payment?.modeOfPayment || "",
          payment.payment?.bankName || "",
          payment.orderStatus || "",
          payment.totalAmount || 0,
          payment.totalPaidAmount || 0,
          payment.balanceAmount || 0,
          payment.createdBy?.name || ""
        ]
      }
      return [
        payment.orderId,
        payment.farmer?.name || "",
        payment.farmer?.mobileNumber || "",
        payment.plantType?.name || "",
        payment.payment?.paidAmount || 0,
        payment.payment?.paymentStatus || "",
        moment(payment.payment?.paymentDate).format("DD-MM-YYYY"),
        payment.payment?.modeOfPayment || "",
        payment.payment?.bankName || "",
        payment.orderStatus || "",
        payment.totalOrderAmount || 0,
        payment.salesPerson?.name || ""
      ]
    })

    const csvContent = [headers, ...csvData]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payments_${activeTab}_${moment().format("DD-MM-YYYY")}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearchTerm("")
    // Clear date range completely
    setSelectedDateRange([null, null])
  }

  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab)
    }
  }

  // Handle status change with confirmation
  const handleStatusChange = (payment, newStatus) => {
    const currentStatus = payment.payment?.paymentStatus
    if (newStatus === currentStatus) return

    const orderIdentifier = paymentType === "ram-agri-sales" ? payment.orderNumber : payment.orderId

    setConfirmDialog({
      open: true,
      title: "Confirm Payment Status Change",
      description: `Change payment status for Order #${orderIdentifier} from ${currentStatus} to ${newStatus}?`,
      onConfirm: () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        updatePaymentStatus(payment, newStatus)
      }
    })
  }

  // Handle order status change with confirmation
  const handleOrderStatusChange = (payment, newStatus) => {
    const currentStatus = payment.orderStatus
    if (newStatus === currentStatus) return

    const orderIdentifier = paymentType === "ram-agri-sales" ? payment.orderNumber : payment.orderId

    setConfirmDialog({
      open: true,
      title: "Confirm Order Status Change",
      description: `Change order status for Order #${orderIdentifier} from ${currentStatus} to ${newStatus}?`,
      onConfirm: () => {
        setConfirmDialog((d) => ({ ...d, open: false }))
        updateOrderStatus(payment, newStatus)
      }
    })
  }

  const updatePaymentStatus = async (payment, newStatus) => {
    const paymentId = payment._id || payment.orderId || payment.orderNumber
    const currentStatus = payment.payment?.paymentStatus
    
    // Mark payment as updating
    setUpdatingPayments(prev => new Set(prev).add(paymentId))
    
    try {
      if (paymentType === "ram-agri-sales") {
        // Update Ram Agri Sales order payment status
        // Use paymentIndex from aggregation result, or default to 0
        const paymentIndex = payment.paymentIndex !== undefined ? payment.paymentIndex : 0
        
        const instance = NetworkManager(API.INVENTORY.UPDATE_AGRI_SALES_ORDER_PAYMENT_STATUS)
        const response = await instance.request({
          paymentStatus: newStatus
        }, [`${payment._id}/payment/${paymentIndex}/status`])

        if (response?.data?.status === "Success") {
          // Log activity
          const orderIdentifier = paymentType === "ram-agri-sales" ? payment.orderNumber : payment.orderId
          logPaymentActivity({
            action: "PAYMENT_STATUS_CHANGED",
            orderId: orderIdentifier,
            orderNumber: payment.orderNumber || payment.orderId,
            customerName: payment.customerName || payment.farmer?.name,
            customerMobile: payment.customerMobile || payment.farmer?.mobileNumber,
            previousStatus: currentStatus,
            newStatus: newStatus,
            amount: payment.payment?.paidAmount || 0,
            description: `Payment status changed from ${currentStatus} to ${newStatus} for Order #${orderIdentifier}`
          })

          // Show success animation
          setSuccessPayments(prev => new Set(prev).add(paymentId))
          setTimeout(() => {
            setSuccessPayments(prev => {
              const next = new Set(prev)
              next.delete(paymentId)
              return next
            })
          }, 600)
          
          // If status changed from PENDING to COLLECTED and we're on pending tab, fade out
          if (currentStatus === "PENDING" && newStatus === "COLLECTED" && activeTab === "pending") {
            setRemovingPayments(prev => new Set(prev).add(paymentId))
            setTimeout(() => {
              fetchPayments()
              fetchTodaysActivities() // Refresh today's activities
              setRemovingPayments(prev => {
                const next = new Set(prev)
                next.delete(paymentId)
                return next
              })
            }, 400)
          } else {
            // Otherwise just refresh after a short delay
            setTimeout(() => {
              fetchPayments()
              fetchTodaysActivities() // Refresh today's activities
            }, 300)
          }
          
          Toast.success("Payment status updated successfully")
        } else {
          Toast.error(response?.data?.message || "Failed to update payment status")
          setUpdatingPayments(prev => {
            const next = new Set(prev)
            next.delete(paymentId)
            return next
          })
        }
      } else {
        // Update farmer order payment status
        const instance = NetworkManager(API.ORDER.UPDATE_PAYMENT_STATUS)
        const response = await instance.request({
          orderId: payment.orderId,
          paymentId: payment.payment?._id,
          paymentStatus: newStatus
        })

        if (response?.data?.success) {
          // Log activity
          const orderIdentifier = payment.orderId
          logPaymentActivity({
            action: "PAYMENT_STATUS_CHANGED",
            orderId: orderIdentifier,
            orderNumber: payment.orderId,
            customerName: payment.farmer?.name,
            customerMobile: payment.farmer?.mobileNumber,
            previousStatus: currentStatus,
            newStatus: newStatus,
            amount: payment.payment?.paidAmount || 0,
            description: `Payment status changed from ${currentStatus} to ${newStatus} for Order #${orderIdentifier}`
          })

          // Show success animation
          setSuccessPayments(prev => new Set(prev).add(paymentId))
          setTimeout(() => {
            setSuccessPayments(prev => {
              const next = new Set(prev)
              next.delete(paymentId)
              return next
            })
          }, 600)
          
          // If status changed from PENDING to COLLECTED and we're on pending tab, fade out
          if (currentStatus === "PENDING" && newStatus === "COLLECTED" && activeTab === "pending") {
            setRemovingPayments(prev => new Set(prev).add(paymentId))
            setTimeout(() => {
              fetchPayments()
              fetchTodaysActivities() // Refresh today's activities
              setRemovingPayments(prev => {
                const next = new Set(prev)
                next.delete(paymentId)
                return next
              })
            }, 400)
          } else {
            // Otherwise just refresh after a short delay
            setTimeout(() => {
              fetchPayments()
              fetchTodaysActivities() // Refresh today's activities
            }, 300)
          }
          
          Toast.success("Payment status updated successfully")
        } else {
          Toast.error(response?.data?.message || "Failed to update payment status")
          setUpdatingPayments(prev => {
            const next = new Set(prev)
            next.delete(paymentId)
            return next
          })
        }
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
      Toast.error("Failed to update payment status")
      setUpdatingPayments(prev => {
        const next = new Set(prev)
        next.delete(paymentId)
        return next
      })
    }
  }

  const updateOrderStatus = async (payment, newStatus) => {
    const paymentId = payment._id || payment.orderId || payment.orderNumber
    
    // Mark payment as updating
    setUpdatingPayments(prev => new Set(prev).add(paymentId))
    
    try {
      const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
      const response = await instance.request({
        id: payment._id, // Use the order's MongoDB _id
        orderStatus: newStatus
      })

      if (response?.data?.status === "Success") {
        // Log activity
        const orderIdentifier = payment.orderNumber || payment.orderId
        const currentOrderStatus = payment.orderStatus
        logPaymentActivity({
          action: "ORDER_STATUS_CHANGED",
          orderId: orderIdentifier,
          orderNumber: payment.orderNumber || payment.orderId,
          customerName: payment.customerName || payment.farmer?.name,
          customerMobile: payment.customerMobile || payment.farmer?.mobileNumber,
          previousStatus: currentOrderStatus,
          newStatus: newStatus,
          amount: payment.payment?.paidAmount || payment.totalAmount || 0,
          description: `Order status changed from ${currentOrderStatus} to ${newStatus} for Order #${orderIdentifier}`
        })

        // Show success animation
        setSuccessPayments(prev => new Set(prev).add(paymentId))
        setTimeout(() => {
          setSuccessPayments(prev => {
            const next = new Set(prev)
            next.delete(paymentId)
            return next
          })
        }, 600)
        
        // Refresh after animation
        setTimeout(() => {
          fetchPayments()
          fetchTodaysActivities() // Refresh today's activities
        }, 300)
        
        Toast.success("Order status updated successfully")
      } else {
        Toast.error(response?.data?.message || "Failed to update order status")
        setUpdatingPayments(prev => {
          const next = new Set(prev)
          next.delete(paymentId)
          return next
        })
      }
    } catch (error) {
      console.error("Error updating order status:", error)
      Toast.error("Failed to update order status")
      setUpdatingPayments(prev => {
        const next = new Set(prev)
        next.delete(paymentId)
        return next
      })
    }
  }

  // Image viewing functions
  const openImageModal = (images, title, startIndex = 0) => {
    if (images && images.length > 0) {
      setImageModal({
        open: true,
        images: images,
        currentIndex: startIndex,
        title: title
      })
    }
  }

  const closeImageModal = () => {
    setImageModal({
      open: false,
      images: [],
      currentIndex: 0,
      title: ""
    })
  }

  const nextImage = () => {
    setImageModal(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }))
  }

  const prevImage = () => {
    setImageModal(prev => ({
      ...prev,
      currentIndex: prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1
    }))
  }

  const goToImage = (index) => {
    setImageModal(prev => ({
      ...prev,
      currentIndex: index
    }))
  }

  // Get all images for a payment (order screenshots + payment receipt photos)
  const getAllImagesForPayment = (payment) => {
    const images = []
    if (payment.screenshots && payment.screenshots.length > 0) {
      payment.screenshots.forEach((screenshot, index) => {
        images.push({ url: screenshot, type: "Order Screenshot", index: index + 1 })
      })
    }
    if (payment.payment?.receiptPhoto && payment.payment.receiptPhoto.length > 0) {
      payment.payment.receiptPhoto.forEach((photo, index) => {
        images.push({ url: photo, type: "Payment Receipt", index: index + 1 })
      })
    }
    return images
  }

  if (loading) return <PageLoader />

  return (
    <Box className={classes.padding14}>
      {/* Header Section */}
      <Box className={classes.pageHeader}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
          <Box>
            <Typography variant="h5" component="h1" fontWeight="bold" sx={{ letterSpacing: "-0.02em" }}>
              Payments Management
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
              View and manage farmer &amp; Agri Input payments
            </Typography>
          </Box>
          <Box display="flex" gap={1.5} alignItems="center">
            <Button
              variant="contained"
              size="small"
              startIcon={<HistoryIcon />}
              onClick={() => {
                setShowActivityModal(true)
                fetchAllActivities()
              }}
              sx={{
                backgroundColor: "rgba(255,255,255,0.25)",
                color: "white",
                backdropFilter: "blur(8px)",
                borderRadius: "10px",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.35)"
                }
              }}>
              Activity Log
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={exportToCSV}
              sx={{
                backgroundColor: "rgba(255,255,255,0.25)",
                color: "white",
                backdropFilter: "blur(8px)",
                borderRadius: "10px",
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.35)"
                }
              }}>
              Export CSV
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Today's Activity Widget */}
      {todaysActivities.length > 0 && (
        <Card 
          sx={{ 
            mb: 2, 
            borderRadius: "14px",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            cursor: "pointer",
            transition: "all 0.3s ease",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)"
            }
          }}
          onClick={() => {
            setShowActivityModal(true)
            fetchAllActivities()
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1.5}>
                <AccessTimeIcon sx={{ fontSize: 28 }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Today&apos;s Activity
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {todaysActivities.length} {todaysActivities.length === 1 ? "activity" : "activities"} recorded
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="bold" textAlign="right">
                  {todaysActivities.filter(a => a.action === "PAYMENT_STATUS_CHANGED" && a.newStatus === "COLLECTED").length}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                  Payments Collected
                </Typography>
              </Box>
            </Box>
            {todaysActivities.slice(0, 3).map((activity, idx) => (
              <Box 
                key={idx} 
                sx={{ 
                  mt: 1.5, 
                  p: 1, 
                  backgroundColor: "rgba(255,255,255,0.15)", 
                  borderRadius: "8px",
                  backdropFilter: "blur(10px)"
                }}
              >
                <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                  {activity.description || activity.action}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, fontSize: "0.7rem" }}>
                  {moment(activity.timestamp || activity.createdAt).format("hh:mm A")}
                </Typography>
              </Box>
            ))}
            {todaysActivities.length > 3 && (
              <Typography variant="caption" sx={{ mt: 1, display: "block", opacity: 0.9, textAlign: "center" }}>
                +{todaysActivities.length - 3} more activities - Click to view all
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Type & Status Tabs - Combined */}
      <Box className={classes.tabContainer}>
        <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 1 }}>
            Type:
          </Typography>
          <Button
            className={`${classes.tabButton} ${paymentType === "farmer" ? "active" : ""}`}
            onClick={() => setPaymentType("farmer")}
            size="small">
            Farmer
          </Button>
          <Button
            className={`${classes.tabButton} ${paymentType === "ram-agri-sales" ? "active" : ""}`}
            onClick={() => {
              setPaymentType("ram-agri-sales")
              setShowOutstanding(false)
            }}
            size="small"
            sx={{ position: "relative" }}>
            Agri Input
            {pendingPaymentsCount > 0 && (
              <Box
                component="span"
                sx={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  backgroundColor: "#dc2626",
                  color: "white",
                  borderRadius: "50%",
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.65rem",
                  fontWeight: "bold",
                  border: "2px solid white",
                  zIndex: 1
                }}>
                {pendingPaymentsCount > 99 ? "99+" : pendingPaymentsCount}
              </Box>
            )}
          </Button>
          <Box sx={{ ml: 2, display: "flex", gap: 1, alignItems: "center" }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Status:
            </Typography>
            <Button
              className={`${classes.tabButton} ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => handleTabChange("pending")}
              size="small">
              ⏳ Pending
            </Button>
            <Button
              className={`${classes.tabButton} ${activeTab === "collected" ? "active" : ""}`}
              onClick={() => handleTabChange("collected")}
              size="small">
              ✅ Collected
            </Button>
            <Button
              className={`${classes.tabButton} ${activeTab === "rejected" ? "active" : ""}`}
              onClick={() => handleTabChange("rejected")}
              size="small">
              ❌ Rejected
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Filters Section */}
      <Card className={classes.filterSection}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="caption" color="textSecondary" mb={0.5} display="block" fontWeight={500}>
              Start Date
            </Typography>
            <input
              type="date"
              value={startDate ? moment(startDate).format("YYYY-MM-DD") : ""}
              onChange={handleStartDateChange}
              className={classes.dateInput}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="caption" color="textSecondary" mb={0.5} display="block" fontWeight={500}>
              End Date
            </Typography>
            <input
              type="date"
              value={endDate ? moment(endDate).format("YYYY-MM-DD") : ""}
              onChange={handleEndDateChange}
              className={classes.dateInput}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              size="small"
              placeholder={
                paymentType === "ram-agri-sales"
                  ? "Search by order number, customer name, or mobile..."
                  : "Search by order ID, farmer name, or mobile..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={classes.searchBox}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: "#64748b", fontSize: 20 }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              fullWidth
              size="small"
              sx={{
                borderRadius: "6px",
                textTransform: "none",
                fontWeight: 600,
                borderColor: "#e2e8f0",
                color: "#64748b",
                "&:hover": {
                  borderColor: "#cbd5e1",
                  backgroundColor: "#f8f9fa"
                }
              }}>
              Clear
            </Button>
          </Grid>
        </Grid>
      </Card>

      {/* Employee Orders View */}
      {outstandingView === "orders" && paymentType === "ram-agri-sales" && (
        <Box mb={3}>
          <Card className={classes.paymentCard}>
            <CardContent>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                My Orders ({employeeOrders.length})
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {employeeOrders.length === 0 ? (
                  <Grid item xs={12}>
                    <Typography variant="body1" color="textSecondary" textAlign="center" py={4}>
                      No orders found for the selected filters
                    </Typography>
                  </Grid>
                ) : (
                  employeeOrders.map((order) => (
                    <Grid item xs={12} sm={6} md={4} key={order._id}>
                      <Card variant="outlined" sx={{ p: 2, height: "100%" }}>
                        <Typography variant="h6" fontWeight="bold">
                          {order.orderNumber}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {order.customerName}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {order.customerMobile}
                        </Typography>
                        <Typography variant="body2" mt={1}>
                          {order.productName} - {order.quantity} {order.unit}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Total: ₹{order.totalAmount?.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Paid: ₹{order.totalPaidAmount?.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color="error">
                          Balance: ₹{order.balanceAmount?.toLocaleString()}
                        </Typography>
                        <Chip
                          label={order.orderStatus}
                          size="small"
                          sx={{ mt: 1 }}
                          color={order.orderStatus === "ACCEPTED" ? "success" : order.orderStatus === "PENDING" ? "warning" : "default"}
                        />
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Outstanding Analysis View */}
      {showOutstanding && paymentType === "ram-agri-sales" && (
        <Box mb={3}>
          <Card className={classes.paymentCard}>
            <CardContent className={classes.paymentCardContent}>
              <Box display="flex" alignItems="center" mb={3}>
                <TrendingUpIcon sx={{ mr: 1.5, color: "#667eea", fontSize: 32 }} />
                <Typography variant="h5" fontWeight="bold">
                  Outstanding Analysis
                </Typography>
              </Box>
              
              {/* Outstanding View Tabs */}
              <Box mb={3} sx={{ borderBottom: 1, borderColor: "divider" }}>
                <Grid container spacing={1}>
                  <Grid item>
                    <Button
                      size="small"
                      onClick={() => setOutstandingView("total")}
                      variant={outstandingView === "total" ? "contained" : "outlined"}>
                      Total
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      size="small"
                      onClick={() => setOutstandingView("salesmen")}
                      variant={outstandingView === "salesmen" ? "contained" : "outlined"}>
                      By Salesmen
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      size="small"
                      onClick={() => setOutstandingView("district")}
                      variant={outstandingView === "district" ? "contained" : "outlined"}>
                      By District
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      size="small"
                      onClick={() => setOutstandingView("taluka")}
                      variant={outstandingView === "taluka" ? "contained" : "outlined"}>
                      By Taluka
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      size="small"
                      onClick={() => setOutstandingView("village")}
                      variant={outstandingView === "village" ? "contained" : "outlined"}>
                      By Village
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      size="small"
                      onClick={() => setOutstandingView("customer")}
                      variant={outstandingView === "customer" ? "contained" : "outlined"}>
                      By Customer
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Outstanding Content */}
              {outstandingView === "total" && outstandingData?.total && (
                <Box>
                  <Card variant="outlined" sx={{ p: 3, mb: 2, backgroundColor: "#f5f5f5" }}>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                      Total Outstanding: ₹{outstandingData.total.totalOutstanding?.toLocaleString() || 0}
                    </Typography>
                    <Typography variant="body1" color="textSecondary" mt={1}>
                      Total Orders: {outstandingData.total.totalOrders || 0}
                    </Typography>
                  </Card>
                </Box>
              )}

              {outstandingView === "salesmen" && outstandingData?.bySalesmen && (
                <Grid container spacing={2}>
                  {outstandingData.bySalesmen.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={item._id || index}>
                      <Card variant="outlined" className={classes.outstandingCard} sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {item.salesmanName || "Unknown"}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {item.salesmanPhone || "N/A"}
                        </Typography>
                        <Typography variant="h6" color="error" mt={1}>
                          ₹{item.totalOutstanding?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {item.totalOrders || 0} orders
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {outstandingView === "district" && outstandingData?.byDistrict && (
                <Grid container spacing={2}>
                  {outstandingData.byDistrict.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={item._id || index}>
                      <Card variant="outlined" className={classes.outstandingCard} sx={{ p: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {item._id || "Unknown District"}
                        </Typography>
                        <Typography variant="h6" color="error" mt={1}>
                          ₹{item.totalOutstanding?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {item.totalOrders || 0} orders
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {outstandingView === "taluka" && outstandingData?.byTaluka && (
                <Grid container spacing={2}>
                  {outstandingData.byTaluka.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card variant="outlined" className={classes.outstandingCard} sx={{ p: 2 }}>
                        <Typography variant="body2" color="textSecondary">
                          {item._id?.district || "Unknown"} District
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {item._id?.taluka || "Unknown Taluka"}
                        </Typography>
                        <Typography variant="h6" color="error" mt={1}>
                          ₹{item.totalOutstanding?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {item.totalOrders || 0} orders
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {outstandingView === "village" && outstandingData?.byVillage && (
                <Grid container spacing={2}>
                  {outstandingData.byVillage.map((item, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card variant="outlined" className={classes.outstandingCard} sx={{ p: 2 }}>
                        <Typography variant="caption" color="textSecondary" display="block">
                          {item._id?.district || "Unknown"} → {item._id?.taluka || "Unknown"}
                        </Typography>
                        <Typography variant="h6" fontWeight="bold">
                          {item._id?.village || "Unknown Village"}
                        </Typography>
                        <Typography variant="h6" color="error" mt={1}>
                          ₹{item.totalOutstanding?.toLocaleString() || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {item.totalOrders || 0} orders
                        </Typography>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {outstandingView === "customer" && customerOutstandingData.length > 0 && (
                <Grid container spacing={2}>
                  {customerOutstandingData.map((customer, index) => (
                    <Grid item xs={12} key={index}>
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={3}>
                            <Typography variant="h6" fontWeight="bold">
                              {customer._id?.customerName || "Unknown"}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {customer._id?.customerMobile || "N/A"}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {customer.customerVillage}, {customer.customerTaluka}, {customer.customerDistrict}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={3}>
                            <Typography variant="h6" color="error">
                              ₹{customer.totalOutstanding?.toLocaleString() || 0}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {customer.totalOrders || 0} orders
                            </Typography>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" fontWeight="medium" mb={1}>
                              Orders:
                            </Typography>
                            <Box sx={{ maxHeight: 150, overflowY: "auto" }}>
                              {customer.orders?.map((order, idx) => (
                                <Box key={idx} sx={{ mb: 1, p: 1, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
                                  <Typography variant="caption" display="block">
                                    {order.orderNumber} - ₹{order.balanceAmount?.toLocaleString() || 0} outstanding
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {moment(order.orderDate).format("DD-MM-YYYY")} | Status: {order.orderStatus}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Grid>
                        </Grid>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              {outstandingView === "customer" && customerOutstandingData.length === 0 && (
                <Typography variant="body1" color="textSecondary" textAlign="center" py={4}>
                  No customer outstanding data found
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Payments List */}
      {!showOutstanding && outstandingView !== "orders" && (
        <>
        <Fade in={!loading} timeout={300}>
          <Grid container spacing={2}>
        {payments.length === 0 ? (
          <Grid item xs={12}>
            <Fade in timeout={400}>
              <Card className={classes.paymentCard}>
                <CardContent sx={{ py: 8, textAlign: "center" }}>
                  <Box 
                    sx={{ 
                      fontSize: 64, 
                      mb: 2, 
                      opacity: 0.3,
                      animation: "$bounce 2s infinite"
                    }}>
                    📭
                  </Box>
                  <Typography variant="h6" color="textSecondary" gutterBottom>
                    No {activeTab} payments found
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Try adjusting your filters or date range
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        ) : (
          payments.map((payment, index) => {
            const statusColors = getStatusColor(payment.payment?.paymentStatus)
            const orderStatusColors = getOrderStatusColor(payment.orderStatus)
            const paymentId = payment._id || payment.orderId || payment.orderNumber
            const isUpdating = updatingPayments.has(paymentId)
            const isRemoving = removingPayments.has(paymentId)
            const isSuccess = successPayments.has(paymentId)

            return (
              <Grid item xs={12} key={paymentId || index}>
                <Collapse in={!isRemoving} timeout={400}>
                  <Card 
                    className={`${classes.paymentCard} ${isSuccess ? classes.successPulse : ""}`}
                    sx={{
                      opacity: isRemoving ? 0 : 1,
                      transform: isRemoving ? "translateX(-20px) scale(0.95)" : "translateX(0) scale(1)",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      overflow: "hidden",
                      animationDelay: `${index * 0.05}s`
                    }}>
                    {isUpdating && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: "rgba(255, 255, 255, 0.85)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 1000,
                          borderRadius: "14px"
                        }}
                      >
                        <CircularProgress size={40} sx={{ color: "#0f766e" }} />
                      </Box>
                    )}
                  <CardContent className={classes.paymentCardContent}>
                    <Grid container spacing={2} alignItems="center">
                      {/* Payment Amount - Primary Focus */}
                      <Grid item xs={12} sm={12} md={2.5}>
                        <Box sx={{ 
                          background: "linear-gradient(135deg, #0f766e12 0%, #14b8a612 100%)",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "2px solid rgba(15, 118, 110, 0.25)"
                        }}>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                            PAYMENT AMOUNT
                          </Typography>
                          <Typography variant="h5" fontWeight="bold" color="#0f766e" sx={{ mb: 0.5 }}>
                            ₹{payment.payment?.paidAmount?.toLocaleString() || 0}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {payment.payment?.modeOfPayment || "N/A"}
                            {payment.payment?.bankName && ` • ${payment.payment.bankName}`}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                            {moment(payment.payment?.paymentDate).format("DD-MM-YYYY")}
                          </Typography>
                        </Box>
                      </Grid>

                      {/* Payment Status */}
                      <Grid item xs={6} sm={3} md={1.5}>
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                          STATUS
                        </Typography>
                        {hasPaymentAccess ? (
                          <FormControl fullWidth size="small">
                            <Select
                              value={payment.payment?.paymentStatus || ""}
                              onChange={(e) => handleStatusChange(payment, e.target.value)}
                              displayEmpty
                              disabled={isUpdating}
                              sx={{
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                fontWeight: 600,
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                height: "32px",
                                transition: "all 0.3s ease",
                                "& .MuiOutlinedInput-notchedOutline": {
                                  border: "none"
                                },
                                "&:hover": {
                                  transform: "scale(1.02)",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                }
                              }}>
                              <MenuItem value="COLLECTED">Collected</MenuItem>
                              <MenuItem value="PENDING">Pending</MenuItem>
                              <MenuItem value="REJECTED">Rejected</MenuItem>
                            </Select>
                          </FormControl>
                        ) : (
                          <Chip
                            label={payment.payment?.paymentStatus}
                            className={classes.statusChip}
                            style={{
                              backgroundColor: statusColors.bg,
                              color: statusColors.text
                            }}
                            size="small"
                          />
                        )}
                      </Grid>

                      {/* Farmer/Customer Details & Order ID */}
                      <Grid item xs={6} sm={4} md={2.5}>
                        {paymentType === "farmer" ? (
                          <Box sx={{ 
                            background: "linear-gradient(135deg, #0f766e12 0%, #14b8a612 100%)",
                            padding: "10px",
                            borderRadius: "10px",
                            border: "2px solid rgba(15, 118, 110, 0.2)"
                          }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                              FARMER DETAILS
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="#0f766e" sx={{ mb: 0.5 }}>
                              {payment.farmer?.name || "N/A"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10px", display: "block" }}>
                              {payment.farmer?.mobileNumber || ""}
                            </Typography>
                            {(payment.farmer?.district || payment.farmer?.taluka || payment.farmer?.village) && (
                              <Typography variant="caption" sx={{ fontSize: "10px", display: "block", mt: 0.5 }}>
                                {payment.farmer?.district && (
                                  <span style={{ fontWeight: 600, color: "#22c55e" }}>📍 {payment.farmer.district}</span>
                                )}
                                {payment.farmer?.taluka && (
                                  <span style={{ color: "#0ea5e9", fontWeight: 500, marginLeft: "6px" }}>• {payment.farmer.taluka}</span>
                                )}
                                {payment.farmer?.village && (
                                  <span style={{ color: "#f59e0b", marginLeft: "6px" }}>• {payment.farmer.village}</span>
                                )}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "9px", display: "block", mt: 1, opacity: 0.7 }}>
                              Order ID: #{payment.orderId}
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ 
                            background: "linear-gradient(135deg, #0f766e12 0%, #14b8a612 100%)",
                            padding: "10px",
                            borderRadius: "10px",
                            border: "2px solid rgba(15, 118, 110, 0.2)"
                          }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                              CUSTOMER DETAILS
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="#0f766e" sx={{ mb: 0.5 }}>
                              {payment.customerName || "N/A"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10px", display: "block" }}>
                              {payment.customerMobile || ""}
                            </Typography>
                            {(payment.customerDistrict || payment.customerTaluka || payment.customerVillage) && (
                              <Typography variant="caption" sx={{ fontSize: "10px", display: "block", mt: 0.5 }}>
                                {payment.customerDistrict && (
                                  <span style={{ fontWeight: 600, color: "#22c55e" }}>📍 {payment.customerDistrict}</span>
                                )}
                                {payment.customerTaluka && (
                                  <span style={{ color: "#0ea5e9", fontWeight: 500, marginLeft: "6px" }}>• {payment.customerTaluka}</span>
                                )}
                                {payment.customerVillage && (
                                  <span style={{ color: "#f59e0b", marginLeft: "6px" }}>• {payment.customerVillage}</span>
                                )}
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "9px", display: "block", mt: 1, opacity: 0.7 }}>
                              Order ID: #{payment.orderNumber}
                            </Typography>
                          </Box>
                        )}
                      </Grid>

                      {/* Product/Order Info */}
                      <Grid item xs={6} sm={3} md={2}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                          {paymentType === "ram-agri-sales" ? "PRODUCT" : "PLANT"}
                        </Typography>
                        {paymentType === "ram-agri-sales" ? (
                          <>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: "0.85rem" }}>
                              {payment.productName || "N/A"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10px" }}>
                              {payment.quantity} {payment.unit || ""}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: "0.85rem" }}>
                              {payment.plantType?.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10px" }}>
                              {payment.numberOfPlants} plants
                            </Typography>
                          </>
                        )}
                      </Grid>

                      {/* Order Status & Amounts */}
                      <Grid item xs={6} sm={3} md={2}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                          ORDER STATUS
                        </Typography>
                        {paymentType === "ram-agri-sales" ? (
                          <>
                            <Chip
                              label={payment.orderStatus?.toUpperCase() || "PENDING"}
                              className={classes.statusChip}
                              style={{
                                backgroundColor: orderStatusColors.bg,
                                color: orderStatusColors.text
                              }}
                              size="small"
                              sx={{ mb: 0.5 }}
                            />
                            <Typography variant="caption" color="error" display="block" sx={{ fontSize: "10px" }} fontWeight={600}>
                              Bal: ₹{payment.balanceAmount?.toLocaleString() || 0}
                            </Typography>
                          </>
                        ) : (
                          <FormControl fullWidth size="small">
                            <Select
                              value={payment.orderStatus || ""}
                              onChange={(e) => handleOrderStatusChange(payment, e.target.value)}
                              displayEmpty
                              disabled={isUpdating}
                              sx={{
                                backgroundColor: orderStatusColors.bg,
                                color: orderStatusColors.text,
                                fontWeight: 600,
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                height: "32px",
                                transition: "all 0.3s ease",
                                "& .MuiOutlinedInput-notchedOutline": {
                                  border: "none"
                                },
                                "&:hover": {
                                  transform: "scale(1.02)",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                }
                              }}>
                              <MenuItem value="COMPLETED">Completed</MenuItem>
                              <MenuItem value="PENDING">Pending</MenuItem>
                              <MenuItem value="ACCEPTED">Accepted</MenuItem>
                              <MenuItem value="DISPATCHED">Dispatched</MenuItem>
                              <MenuItem value="FARM_READY">Farm Ready</MenuItem>
                            </Select>
                          </FormControl>
                        )}
                      </Grid>

                      <Grid item xs={12} md={1.5}>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                          {paymentType === "farmer" ? "SALES PERSON" : "CREATED BY"}
                        </Typography>
                        <Typography variant="caption" fontWeight="medium" sx={{ fontSize: "0.8rem" }}>
                          {paymentType === "ram-agri-sales" ? payment.createdBy?.name || "N/A" : payment.salesPerson?.name}
                        </Typography>
                        {(() => {
                          const allImages = getAllImagesForPayment(payment)
                          const hasImages = allImages.length > 0
                          const orderIdentifier = paymentType === "ram-agri-sales" ? payment.orderNumber : payment.orderId
                          return hasImages ? (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                                IMAGES ({allImages.length})
                              </Typography>
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                {allImages.slice(0, 3).map((image, idx) => (
                                  <Box
                                    key={idx}
                                    onClick={() => openImageModal(allImages, `Order #${orderIdentifier} - Images`, idx)}
                                    sx={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "6px",
                                      overflow: "hidden",
                                      border: "2px solid #e2e8f0",
                                      cursor: "pointer",
                                      "&:hover": {
                                        borderColor: "#0f766e",
                                        transform: "scale(1.05)",
                                        zIndex: 1
                                      },
                                      transition: "all 0.2s ease"
                                    }}
                                  >
                                    <img
                                      src={image.url}
                                      alt={`Preview ${idx + 1}`}
                                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                      onError={(e) => {
                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAxMEwyNSAxNUgyMFYyMEgxNVYxNUgxMEwyMCAxMFoiIGZpbGw9IiNDQ0NDQ0MiLz4KPC9zdmc+'
                                      }}
                                    />
                                  </Box>
                                ))}
                                {allImages.length > 3 && (
                                  <Box
                                    onClick={() => openImageModal(allImages, `Order #${orderIdentifier} - Images`, 3)}
                                    sx={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "6px",
                                      border: "2px dashed #cbd5e1",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      backgroundColor: "#f8fafc",
                                      "&:hover": {
                                        borderColor: "#0f766e",
                                        backgroundColor: "#f0fdfa"
                                      },
                                      transition: "all 0.2s ease"
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                      +{allImages.length - 3}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          ) : null
                        })()}
                        {paymentType === "ram-agri-sales" && (
                          <Button
                            size="small"
                            startIcon={<ReceiptIcon sx={{ fontSize: 16 }} />}
                            onClick={() => fetchCustomerLedger(payment.customerMobile, payment.customerName, payment.customerMobile)}
                            className={classes.ledgerButton}
                            sx={{ mt: 1.5, width: "100%", justifyContent: "flex-start" }}
                          >
                            See Ledger
                          </Button>
                        )}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
                </Collapse>
              </Grid>
            )
          })
        )}
          </Grid>
        </Fade>
        
        {/* Pagination */}
        {payments.length > 0 && totalPages > 1 && (
          <Fade in timeout={400}>
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mt: 3, mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Showing {((page - 1) * rowsPerPage) + 1} - {Math.min(page * rowsPerPage, totalCount)} of {totalCount}
                </Typography>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(event, value) => setPage(value)}
                  color="primary"
                  size="small"
                  showFirstButton
                  showLastButton
                  sx={{
                    "& .MuiPaginationItem-root": {
                      fontSize: "0.875rem",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        transform: "scale(1.1)"
                      }
                    }
                  }}
                />
              </Box>
            </Box>
          </Fade>
        )}
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((d) => ({ ...d, open: false }))}
        TransitionComponent={Zoom}
        TransitionProps={{ timeout: 200 }}
        PaperProps={{
          sx: {
            borderRadius: "16px",
            boxShadow: "0 24px 48px rgba(0,0,0,0.15)"
          }
        }}>
        <DialogTitle sx={{ pb: 1.5, fontWeight: 600 }}>
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" color="text.secondary">
            {confirmDialog.description}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button 
            onClick={() => setConfirmDialog((d) => ({ ...d, open: false }))}
            variant="outlined"
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600
            }}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDialog.onConfirm} 
            variant="contained" 
            color="primary"
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(15, 118, 110, 0.3)",
              "&:hover": {
                boxShadow: "0 6px 16px rgba(15, 118, 110, 0.4)"
              }
            }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Viewing Modal */}
      <Modal
        open={imageModal.open}
        onClose={closeImageModal}
        className={classes.imageModal}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
        }}
      >
        <Fade in={imageModal.open}>
          <div className={classes.imageModalContent}>
            <div className={classes.imageModalHeader}>
              <Typography variant="h6" component="h2">
                {imageModal.title}
              </Typography>
              <IconButton onClick={closeImageModal} size="small">
                <CloseIcon />
              </IconButton>
            </div>
            
            {imageModal.images.length > 0 && (
              <div className={classes.imageContainer}>
                <img
                  src={imageModal.images[imageModal.currentIndex]?.url}
                  alt={`Image ${imageModal.currentIndex + 1}`}
                  className={classes.mainImage}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDAgNTBMMTUwIDEwMEgxMjVWMTUwSDc1VjEwMEg1MEwxMDAgNTBaIiBmaWxsPSIjQ0NDQ0NDIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTgwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPkltYWdlIG5vdCBmb3VuZDwvdGV4dD4KPC9zdmc+'
                  }}
                />
                
                <div className={classes.imageInfo}>
                  <Typography variant="body2" color="textSecondary">
                    {imageModal.images[imageModal.currentIndex]?.type} - Image {imageModal.currentIndex + 1} of {imageModal.images.length}
                  </Typography>
                </div>
                
                {imageModal.images.length > 1 && (
                  <>
                    <div className={classes.imageNavigation}>
                      <IconButton onClick={prevImage} size="small">
                        <PrevIcon />
                      </IconButton>
                      <Typography variant="body2" color="textSecondary">
                        {imageModal.currentIndex + 1} / {imageModal.images.length}
                      </Typography>
                      <IconButton onClick={nextImage} size="small">
                        <NextIcon />
                      </IconButton>
                    </div>
                    
                    <div className={classes.imageThumbnails}>
                      {imageModal.images.map((image, index) => (
                        <img
                          key={index}
                          src={image.url}
                          alt={`Thumbnail ${index + 1}`}
                          className={`${classes.thumbnail} ${index === imageModal.currentIndex ? 'active' : ''}`}
                          onClick={() => goToImage(index)}
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00MCAyMEw2MCA0MEg1MFY2MEgzMFY0MEgyMEw0MCAyMFoiIGZpbGw9IiNDQ0NDQ0MiLz4KPC9zdmc+'
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Fade>
      </Modal>

      {/* Activity Log Modal - Non-destructive (no outside click close) */}
      <Dialog
        open={showActivityModal}
        onClose={() => {}} // Prevent closing by clicking outside
        maxWidth="lg"
        fullWidth
        PaperProps={{ 
          sx: { 
            borderRadius: "16px",
            maxHeight: "90vh"
          } 
        }}
        TransitionComponent={Zoom}
        TransitionProps={{ timeout: 300 }}
        disableEscapeKeyDown={false} // Allow ESC key to close
      >
        <DialogTitle sx={{ 
          borderBottom: 1, 
          borderColor: "divider", 
          py: 2, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white"
        }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <HistoryIcon />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Payment Activity Log
              </Typography>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                All payment-related activities
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={() => setShowActivityModal(false)}
            size="small"
            sx={{ 
              color: "white",
              "&:hover": { 
                backgroundColor: "rgba(255,255,255,0.2)" 
              } 
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {loadingActivities ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400, py: 4 }}>
              <CircularProgress size={48} sx={{ color: "primary.main" }} />
            </Box>
          ) : (
            <Box sx={{ overflow: "auto", flex: 1, p: 3 }}>
              {allActivities.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center" }}>
                  <HistoryIcon sx={{ fontSize: 64, color: "text.secondary", opacity: 0.3, mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No activities found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Activities will appear here when you make changes to payments
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {allActivities.map((activity, index) => {
                    const getActivityIcon = () => {
                      if (activity.action === "PAYMENT_STATUS_CHANGED") {
                        if (activity.newStatus === "COLLECTED") return <CheckCircleIcon sx={{ color: "#2e7d32" }} />
                        if (activity.newStatus === "REJECTED") return <CancelIcon sx={{ color: "#d32f2f" }} />
                        return <PendingIcon sx={{ color: "#f57c00" }} />
                      }
                      return <HistoryIcon />
                    }

                    const getActivityColor = () => {
                      if (activity.action === "PAYMENT_STATUS_CHANGED") {
                        if (activity.newStatus === "COLLECTED") return { bg: "#e8f5e8", border: "#2e7d32" }
                        if (activity.newStatus === "REJECTED") return { bg: "#ffebee", border: "#d32f2f" }
                        return { bg: "#fff3e0", border: "#f57c00" }
                      }
                      return { bg: "#f5f5f5", border: "#757575" }
                    }

                    const colors = getActivityColor()

                    return (
                      <Card
                        key={index}
                        sx={{
                          borderLeft: `4px solid ${colors.border}`,
                          backgroundColor: colors.bg,
                          transition: "all 0.2s ease",
                          "&:hover": {
                            transform: "translateX(4px)",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Box display="flex" gap={2} alignItems="flex-start">
                            <Box sx={{ mt: 0.5 }}>
                              {getActivityIcon()}
                            </Box>
                            <Box flex={1}>
                              <Typography variant="body1" fontWeight={600} gutterBottom>
                                {activity.description || activity.action}
                              </Typography>
                              <Box display="flex" flexWrap="wrap" gap={2} mt={1}>
                                {activity.orderNumber && (
                                  <Chip
                                    label={`Order: ${activity.orderNumber}`}
                                    size="small"
                                    sx={{ fontSize: "0.7rem" }}
                                  />
                                )}
                                {activity.customerName && (
                                  <Chip
                                    label={activity.customerName}
                                    size="small"
                                    sx={{ fontSize: "0.7rem" }}
                                  />
                                )}
                                {activity.amount > 0 && (
                                  <Chip
                                    label={formatCurrency(activity.amount)}
                                    size="small"
                                    color="primary"
                                    sx={{ fontSize: "0.7rem", fontWeight: 600 }}
                                  />
                                )}
                              </Box>
                              <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                                <Typography variant="caption" color="text.secondary">
                                  {moment(activity.timestamp || activity.createdAt).format("DD MMM YYYY, hh:mm A")}
                                </Typography>
                                {activity.performedBy?.name && (
                                  <Chip
                                    label={`By: ${activity.performedBy.name}`}
                                    size="small"
                                    sx={{ fontSize: "0.65rem", height: "20px" }}
                                  />
                                )}
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    )
                  })}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider" }}>
          <Button
            onClick={() => setShowActivityModal(false)}
            variant="outlined"
            sx={{ borderRadius: "8px", textTransform: "none", fontWeight: 600 }}
          >
            Close
          </Button>
          <Button
            onClick={() => {
              fetchAllActivities()
              fetchTodaysActivities()
            }}
            variant="contained"
            sx={{ 
              borderRadius: "8px", 
              textTransform: "none", 
              fontWeight: 600,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            }}
          >
            Refresh
          </Button>
        </DialogActions>
      </Dialog>

      {/* Customer Ledger Modal (Agri Input) */}
      <Dialog
        open={showCustomerLedger}
        onClose={() => {
          setShowCustomerLedger(false)
          setCustomerLedgerData(null)
          setShowCustomerLedgerSummaryDetails(false)
        }}
        maxWidth="md"
        fullWidth
        className={classes.ledgerModal}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ borderBottom: 1, borderColor: "divider", py: 2, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="h6" fontWeight="bold" color="text.primary">
              Customer Ledger
            </Typography>
            {customerLedgerData?.customer && (
              <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1, mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {customerLedgerData.customer.name} ({customerLedgerData.customer.mobile})
                </Typography>
                <Chip
                  size="small"
                  label={`Outstanding ${formatCurrency(customerLedgerData.summary?.outstanding || 0)}`}
                  sx={{
                    backgroundColor: "rgba(249, 115, 22, 0.12)",
                    color: "#c2410c",
                    fontWeight: 600
                  }}
                  onClick={() => setShowCustomerLedgerSummaryDetails((p) => !p)}
                />
              </Box>
            )}
          </Box>
          <IconButton
            onClick={() => {
              setShowCustomerLedger(false)
              setCustomerLedgerData(null)
              setShowCustomerLedgerSummaryDetails(false)
            }}
            size="small"
            sx={{ "&:hover": { backgroundColor: "action.hover" } }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {loadingLedger ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 280, py: 4 }}>
              <CircularProgress size={48} sx={{ color: "primary.main" }} />
            </Box>
          ) : customerLedgerData ? (
            <>
              {showCustomerLedgerSummaryDetails && (
                <Grid container spacing={2} sx={{ px: 3, pt: 2 }}>
                  <Grid item xs={6}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: "error.50", border: "1px solid", borderColor: "error.200" }}>
                      <Typography variant="caption" color="text.secondary">Total Debit</Typography>
                      <Typography variant="h6" fontWeight="bold" color="error.main">{formatCurrency(customerLedgerData.summary?.totalDebit || 0)}</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: "success.50", border: "1px solid", borderColor: "success.200" }}>
                      <Typography variant="caption" color="text.secondary">Total Credit</Typography>
                      <Typography variant="h6" fontWeight="bold" color="success.main">{formatCurrency(customerLedgerData.summary?.totalCredit || 0)}</Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}
              <Box sx={{ overflow: "auto", flex: 1, px: 3, pb: 3, pt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>Ledger entries</Typography>
                <Box sx={{ overflow: "auto", maxHeight: 420, border: 1, borderColor: "divider", borderRadius: 2 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "var(--mui-palette-grey-50)", borderBottom: "1px solid var(--mui-palette-divider)" }}>
                        <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600 }}>Date</th>
                        <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600 }}>Type</th>
                        <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600 }}>Reference</th>
                        <th style={{ textAlign: "left", padding: "12px 16px", fontWeight: 600 }}>Description</th>
                        <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 600 }}>Amount</th>
                        <th style={{ textAlign: "right", padding: "12px 16px", fontWeight: 600 }}>Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((customerLedgerData?.entries || []).map((entry) => ({
                        ...entry,
                        _displayDate: entry?.date || entry?.details?.entryDate || entry?.createdAt || entry?.date
                      }))).map((entry, index) => (
                        <tr key={index} style={{ borderBottom: "1px solid var(--mui-palette-divider)" }}>
                          <td style={{ padding: "12px 16px", color: "var(--mui-palette-text-secondary)" }}>
                            {entry._displayDate ? new Date(entry._displayDate).toLocaleString("en-IN") : "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <Chip
                              size="small"
                              label={entry.type || "—"}
                              sx={{
                                backgroundColor: entry.type === "CREDIT" ? "success.50" : "error.50",
                                color: entry.type === "CREDIT" ? "success.dark" : "error.dark",
                                fontWeight: 600
                              }}
                            />
                          </td>
                          <td style={{ padding: "12px 16px", color: "var(--mui-palette-text-secondary)" }}>{entry.reference || "—"}</td>
                          <td style={{ padding: "12px 16px" }}>{entry.description || "—"}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>{formatCurrency(entry.amount || 0)}</td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>{formatCurrency(entry.balance || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!customerLedgerData?.entries || customerLedgerData.entries.length === 0) && (
                    <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
                      <Typography variant="body2">No ledger entries found</Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>
              <Typography variant="body2">No ledger data available</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  )
}

export default PaymentsPage
