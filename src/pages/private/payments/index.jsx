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
  InputLabel,
  IconButton,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Modal,
  Backdrop,
  Fade,
  Box as MuiBox,
  Pagination
} from "@mui/material"
import { makeStyles } from "tss-react/mui"
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  ArrowBackIos as PrevIcon,
  ArrowForwardIos as NextIcon,
  Shield,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  Assignment as AssignmentIcon
} from "@mui/icons-material"

import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import moment from "moment"
import { Toast } from "helpers/toasts/toastHelper"
import {
  useHasPaymentAccess,
  useIsAccountant,
  useIsOfficeAdmin,
  useIsSuperAdmin,
  useHasPaymentsAccess
} from "utils/roleUtils"

const useStyles = makeStyles()((theme) => ({
  padding14: {
    padding: theme.spacing(2),
    backgroundColor: "#f8f9fa",
    minHeight: "100vh",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5)
    }
  },
  pageHeader: {
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    borderRadius: "10px",
    padding: theme.spacing(2, 3),
    marginBottom: theme.spacing(2),
    color: "white",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.25)",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5, 2)
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
    borderRadius: "8px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    transition: "all 0.2s ease",
    border: "1px solid rgba(0,0,0,0.08)",
    overflow: "hidden",
    "&:hover": {
      boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
      borderColor: "#667eea"
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
    borderRadius: "8px",
    marginBottom: theme.spacing(2),
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.08)",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1.5)
    }
  },
  searchBox: {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: "#f8f9fa",
      transition: "all 0.3s ease",
      "&:hover": {
        backgroundColor: "#f1f3f5"
      },
      "&.Mui-focused": {
        backgroundColor: "white",
        boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.1)"
      }
    }
  },
  tabButton: {
    padding: "8px 16px",
    borderRadius: "6px",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "13px",
    transition: "all 0.2s ease",
    minWidth: "100px",
    "&.active": {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)"
    },
    "&:not(.active)": {
      backgroundColor: "white",
      color: "#64748b",
      border: "1px solid #e2e8f0",
      "&:hover": {
        backgroundColor: "#f8f9fa",
        borderColor: "#cbd5e1"
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
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "13px",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    backgroundColor: "#f8f9fa",
    "&:focus": {
      outline: "none",
      borderColor: "#667eea",
      backgroundColor: "white",
      boxShadow: "0 0 0 2px rgba(102, 126, 234, 0.1)"
    },
    "&:hover": {
      borderColor: "#cbd5e1",
      backgroundColor: "#f1f3f5"
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
    padding: theme.spacing(1.5),
    borderRadius: "8px",
    marginBottom: theme.spacing(2),
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
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
    borderRadius: "6px",
    backgroundColor: "#f8f9fa",
    borderLeft: "3px solid #667eea"
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
  const [paymentType, setPaymentType] = useState("farmer") // "farmer", "agri-inputs", or "ram-agri-sales"
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
      } else {
        setPayments([])
        setTotalPages(1)
        setTotalCount(0)
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

  // Fetch payments function for agri inputs (sell orders)
  const fetchAgriInputsPayments = async () => {
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

      const instance = NetworkManager(API.INVENTORY.GET_SELL_ORDER_PENDING_PAYMENTS)
      const response = await instance.request({}, params)

      if (response?.data?.success && response.data.data) {
        const data = Array.isArray(response.data.data) ? response.data.data : []
        setPayments(data)
        // Handle pagination metadata if available
        if (response.data.pagination) {
          setTotalPages(response.data.pagination.totalPages || 1)
          setTotalCount(response.data.pagination.total || data.length)
        } else {
          setTotalPages(1)
          setTotalCount(data.length)
        }
      } else {
        setPayments([])
        setTotalPages(1)
        setTotalCount(0)
      }
    } catch (error) {
      console.error("Error fetching agri inputs payments:", error)
      Toast.error("Failed to fetch agri inputs payments")
      setPayments([])
      setTotalPages(1)
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  // Fetch payments function for Ram Agri Sales orders
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
      } else {
        setPayments([])
        setTotalPages(1)
        setTotalCount(0)
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
    if (paymentType === "agri-inputs") {
      fetchAgriInputsPayments()
    } else if (paymentType === "ram-agri-sales") {
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
      : paymentType === "agri-inputs"
      ? [
          "Order Number",
          "Merchant/Buyer Name",
          "Phone Number",
          "Items Count",
          "Payment Amount",
          "Payment Status",
          "Payment Date",
          "Mode of Payment",
          "Bank Name",
          "Order Status",
          "Total Order Amount",
          "Paid Amount",
          "Outstanding Amount",
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
      } else if (paymentType === "agri-inputs") {
        return [
          payment.orderNumber || "",
          payment.merchant?.name || payment.buyerName || "",
          payment.merchant?.phone || "",
          payment.items?.length || 0,
          payment.payment?.paidAmount || 0,
          payment.payment?.paymentStatus || "",
          moment(payment.payment?.paymentDate).format("DD-MM-YYYY"),
          payment.payment?.modeOfPayment || "",
          payment.payment?.bankName || "",
          payment.status || "",
          payment.totalAmount || 0,
          payment.paidAmount || 0,
          ((payment.totalAmount || 0) - (payment.paidAmount || 0)),
          payment.createdBy?.name || ""
        ]
      } else {
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
      }
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
    setActiveTab(tab)
  }

  // Handle status change with confirmation
  const handleStatusChange = (payment, newStatus) => {
    const currentStatus = payment.payment?.paymentStatus
    if (newStatus === currentStatus) return

    const orderIdentifier = paymentType === "agri-inputs" || paymentType === "ram-agri-sales"
      ? payment.orderNumber
      : payment.orderId

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

    const orderIdentifier = paymentType === "agri-inputs" || paymentType === "ram-agri-sales"
      ? payment.orderNumber
      : payment.orderId

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
    try {
      if (paymentType === "agri-inputs") {
        // Update sell order payment status
        const instance = NetworkManager(API.INVENTORY.UPDATE_SELL_ORDER_PAYMENT_STATUS)
        const response = await instance.request({
          paymentId: payment.payment?._id,
          paymentStatus: newStatus
        }, [`${payment._id}/payment/${payment.payment?._id}/status`])

        if (response?.data?.success) {
          Toast.success("Payment status updated successfully")
          fetchPayments()
        } else {
          Toast.error(response?.data?.message || "Failed to update payment status")
        }
      } else if (paymentType === "ram-agri-sales") {
        // Update Ram Agri Sales order payment status
        // Use paymentIndex from aggregation result, or default to 0
        const paymentIndex = payment.paymentIndex !== undefined ? payment.paymentIndex : 0
        
        const instance = NetworkManager(API.INVENTORY.UPDATE_AGRI_SALES_ORDER_PAYMENT_STATUS)
        const response = await instance.request({
          paymentStatus: newStatus
        }, [`${payment._id}/payment/${paymentIndex}/status`])

        if (response?.data?.status === "Success") {
          Toast.success("Payment status updated successfully")
          fetchPayments()
        } else {
          Toast.error(response?.data?.message || "Failed to update payment status")
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
          Toast.success("Payment status updated successfully")
          fetchPayments()
        } else {
          Toast.error(response?.data?.message || "Failed to update payment status")
        }
      }
    } catch (error) {
      console.error("Error updating payment status:", error)
      Toast.error("Failed to update payment status")
    }
  }

  const updateOrderStatus = async (payment, newStatus) => {
    try {
      const instance = NetworkManager(API.ORDER.UPDATE_ORDER)
      const response = await instance.request({
        id: payment._id, // Use the order's MongoDB _id
        orderStatus: newStatus
      })

      if (response?.data?.status === "Success") {
        Toast.success("Order status updated successfully")
        fetchPayments() // Refresh the list
      } else {
        Toast.error(response?.data?.message || "Failed to update order status")
      }
    } catch (error) {
      console.error("Error updating order status:", error)
      Toast.error("Failed to update order status")
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
    
    if (paymentType === "agri-inputs") {
      // For agri inputs, only payment receipt photos
      if (payment.payment?.receiptPhoto && payment.payment.receiptPhoto.length > 0) {
        payment.payment.receiptPhoto.forEach((photo, index) => {
          images.push({
            url: photo,
            type: 'Payment Receipt',
            index: index + 1
          })
        })
      }
    } else {
      // For farmer orders, order screenshots + payment receipt photos
      if (payment.screenshots && payment.screenshots.length > 0) {
        payment.screenshots.forEach((screenshot, index) => {
          images.push({
            url: screenshot,
            type: 'Order Screenshot',
            index: index + 1
          })
        })
      }
      
      if (payment.payment?.receiptPhoto && payment.payment.receiptPhoto.length > 0) {
        payment.payment.receiptPhoto.forEach((photo, index) => {
          images.push({
            url: photo,
            type: 'Payment Receipt',
            index: index + 1
          })
        })
      }
    }
    
    return images
  }

  if (loading) return <PageLoader />

  return (
    <Box className={classes.padding14}>
      {/* Header Section */}
      <Box className={classes.pageHeader}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
          <Typography variant="h5" component="h1" fontWeight="bold">
            💳 Payments Management
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
            sx={{
              backgroundColor: "rgba(255,255,255,0.2)",
              color: "white",
              backdropFilter: "blur(10px)",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.3)"
              }
            }}>
            Export CSV
          </Button>
        </Box>
      </Box>

      {/* Payment Type & Status Tabs - Combined */}
      <Box className={classes.tabContainer}>
        <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center">
          <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600, mr: 1 }}>
            Type:
          </Typography>
          <Button
            className={`${classes.tabButton} ${paymentType === "farmer" ? "active" : ""}`}
            onClick={() => setPaymentType("farmer")}
            size="small">
            Farmer
          </Button>
          <Button
            className={`${classes.tabButton} ${paymentType === "agri-inputs" ? "active" : ""}`}
            onClick={() => setPaymentType("agri-inputs")}
            size="small">
            Agri Inputs
          </Button>
          <Button
            className={`${classes.tabButton} ${paymentType === "ram-agri-sales" ? "active" : ""}`}
            onClick={() => {
              setPaymentType("ram-agri-sales")
              setShowOutstanding(false)
            }}
            size="small"
            sx={{ position: "relative" }}>
            Ram Agri Sales
            {pendingPaymentsCount > 0 && (
              <Box
                sx={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  backgroundColor: "#f44336",
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
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
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
                paymentType === "agri-inputs" 
                  ? "Search by order number, merchant name, or buyer name..." 
                  : paymentType === "ram-agri-sales"
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
        <Grid container spacing={2}>
        {payments.length === 0 ? (
          <Grid item xs={12}>
            <Card className={classes.paymentCard}>
              <CardContent sx={{ py: 8, textAlign: "center" }}>
                <Box sx={{ fontSize: 64, mb: 2, opacity: 0.3 }}>📭</Box>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No {activeTab} payments found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Try adjusting your filters or date range
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          payments.map((payment, index) => {
            const statusColors = getStatusColor(payment.payment?.paymentStatus)
            const orderStatusColors = paymentType === "agri-inputs" 
              ? getStatusColor(payment.status) 
              : paymentType === "ram-agri-sales"
              ? getOrderStatusColor(payment.orderStatus)
              : getOrderStatusColor(payment.orderStatus)

            return (
              <Grid item xs={12} key={index}>
                <Card className={classes.paymentCard}>
                  <CardContent className={classes.paymentCardContent}>
                    <Grid container spacing={2} alignItems="center">
                      {/* Payment Amount - Primary Focus */}
                      <Grid item xs={12} sm={12} md={2.5}>
                        <Box sx={{ 
                          background: "linear-gradient(135deg, #22c55e15 0%, #16a34a15 100%)",
                          padding: "12px",
                          borderRadius: "8px",
                          border: "2px solid #22c55e30"
                        }}>
                          <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                            PAYMENT AMOUNT
                          </Typography>
                          <Typography variant="h5" fontWeight="bold" color="#16a34a" sx={{ mb: 0.5 }}>
                            ₹{payment.payment?.paidAmount?.toLocaleString() || 0}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block">
                            {payment.payment?.modeOfPayment || "N/A"}
                            {payment.payment?.bankName && ` • ${payment.payment.bankName}`}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
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
                              sx={{
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                fontWeight: 600,
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                height: "32px",
                                "& .MuiOutlinedInput-notchedOutline": {
                                  border: "none"
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
                            background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "2px solid #667eea30"
                          }}>
                            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                              FARMER DETAILS
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="#667eea" sx={{ mb: 0.5 }}>
                              {payment.farmer?.name || "N/A"}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "10px", display: "block" }}>
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
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "9px", display: "block", mt: 1, opacity: 0.7 }}>
                              Order ID: #{payment.orderId}
                            </Typography>
                          </Box>
                        ) : paymentType === "ram-agri-sales" ? (
                          <Box sx={{ 
                            background: "linear-gradient(135deg, #667eea15 0%, #764ba215 100%)",
                            padding: "10px",
                            borderRadius: "8px",
                            border: "2px solid #667eea30"
                          }}>
                            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                              CUSTOMER DETAILS
                            </Typography>
                            <Typography variant="body2" fontWeight="bold" color="#667eea" sx={{ mb: 0.5 }}>
                              {payment.customerName || "N/A"}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "10px", display: "block" }}>
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
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "9px", display: "block", mt: 1, opacity: 0.7 }}>
                              Order ID: #{payment.orderNumber}
                            </Typography>
                          </Box>
                        ) : (
                          <>
                            <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                              ORDER ID
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" color="primary" sx={{ mb: 0.5 }}>
                              #{payment.orderNumber}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "10px" }}>
                              {payment.merchant?.name || payment.buyerName || "N/A"}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" display="block" sx={{ fontSize: "10px" }}>
                              {payment.merchant?.phone || ""}
                            </Typography>
                          </>
                        )}
                      </Grid>

                      {/* Product/Order Info */}
                      <Grid item xs={6} sm={3} md={2}>
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                          {paymentType === "agri-inputs" ? "ITEMS" : paymentType === "ram-agri-sales" ? "PRODUCT" : "PLANT"}
                        </Typography>
                        {paymentType === "agri-inputs" ? (
                          <Typography variant="body2" fontWeight="medium">
                            {payment.items?.length || 0} items
                          </Typography>
                        ) : paymentType === "ram-agri-sales" ? (
                          <>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: "0.85rem" }}>
                              {payment.productName || "N/A"}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "10px" }}>
                              {payment.quantity} {payment.unit || ""}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" fontWeight="medium" sx={{ fontSize: "0.85rem" }}>
                              {payment.plantType?.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: "10px" }}>
                              {payment.numberOfPlants} plants
                            </Typography>
                          </>
                        )}
                      </Grid>

                      {/* Order Status & Amounts */}
                      <Grid item xs={6} sm={3} md={2}>
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                          ORDER STATUS
                        </Typography>
                        {paymentType === "agri-inputs" ? (
                          <>
                            <Chip
                              label={payment.status?.toUpperCase() || "DRAFT"}
                              className={classes.statusChip}
                              style={{
                                backgroundColor: orderStatusColors.bg,
                                color: orderStatusColors.text
                              }}
                              size="small"
                              sx={{ mb: 0.5 }}
                            />
                            <Typography variant="caption" color="textSecondary" display="block" sx={{ fontSize: "10px" }}>
                              Out: ₹{((payment.totalAmount || 0) - (payment.paidAmount || 0)).toLocaleString()}
                            </Typography>
                          </>
                        ) : paymentType === "ram-agri-sales" ? (
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
                              sx={{
                                backgroundColor: orderStatusColors.bg,
                                color: orderStatusColors.text,
                                fontWeight: 600,
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                height: "32px",
                                "& .MuiOutlinedInput-notchedOutline": {
                                  border: "none"
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
                        <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                          {paymentType === "farmer" ? "SALES PERSON" : "CREATED BY"}
                        </Typography>
                        <Typography variant="caption" fontWeight="medium" sx={{ fontSize: "0.8rem" }}>
                          {paymentType === "agri-inputs" ? payment.createdBy?.name || "N/A"
                            : paymentType === "ram-agri-sales" ? payment.createdBy?.name || "N/A"
                            : payment.salesPerson?.name}
                        </Typography>
                        {(() => {
                          const allImages = getAllImagesForPayment(payment)
                          const hasImages = allImages.length > 0
                          
                          return hasImages ? (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: "block", fontWeight: 600, fontSize: "10px" }}>
                                IMAGES ({allImages.length})
                              </Typography>
                              <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                                {allImages.slice(0, 3).map((image, idx) => (
                                  <Box
                                    key={idx}
                                    onClick={() => {
                                      const orderIdentifier = paymentType === "agri-inputs" || paymentType === "ram-agri-sales"
                                        ? payment.orderNumber
                                        : payment.orderId
                                      openImageModal(allImages, `Order #${orderIdentifier} - Images`, idx)
                                    }}
                                    sx={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "4px",
                                      overflow: "hidden",
                                      border: "2px solid #e2e8f0",
                                      cursor: "pointer",
                                      "&:hover": {
                                        borderColor: "#667eea",
                                        transform: "scale(1.1)",
                                        zIndex: 1
                                      },
                                      transition: "all 0.2s ease"
                                    }}
                                  >
                                    <img
                                      src={image.url}
                                      alt={`Preview ${idx + 1}`}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover"
                                      }}
                                      onError={(e) => {
                                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAxMEwyNSAxNUgyMFYyMEgxNVYxNUgxMEwyMCAxMFoiIGZpbGw9IiNDQ0NDQ0Mi8+Cjwvc3ZnPg=='
                                      }}
                                    />
                                  </Box>
                                ))}
                                {allImages.length > 3 && (
                                  <Box
                                    onClick={() => {
                                      const orderIdentifier = paymentType === "agri-inputs" || paymentType === "ram-agri-sales"
                                        ? payment.orderNumber
                                        : payment.orderId
                                      openImageModal(allImages, `Order #${orderIdentifier} - Images`, 3)
                                    }}
                                    sx={{
                                      width: "40px",
                                      height: "40px",
                                      borderRadius: "4px",
                                      border: "2px dashed #cbd5e1",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      backgroundColor: "#f8f9fa",
                                      "&:hover": {
                                        borderColor: "#667eea",
                                        backgroundColor: "#e0f2fe"
                                      },
                                      transition: "all 0.2s ease"
                                    }}
                                  >
                                    <Typography variant="caption" fontWeight="bold" color="textSecondary">
                                      +{allImages.length - 3}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                          ) : null
                        })()}
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            )
          })
        )}
        </Grid>
        
        {/* Pagination */}
        {payments.length > 0 && totalPages > 1 && (
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
                    fontSize: "0.875rem"
                  }
                }}
              />
            </Box>
          </Box>
        )}
        </>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((d) => ({ ...d, open: false }))}>
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.description}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
          <Button onClick={confirmDialog.onConfirm} variant="contained" color="primary">
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
    </Box>
  )
}

export default PaymentsPage
