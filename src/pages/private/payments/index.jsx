import React, { useState, useEffect } from "react"
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
  Box as MuiBox
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
  Shield
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
    padding: "14px"
  },
  addButton: {
    borderRadius: "8px",
    textTransform: "none",
    fontWeight: 600
  },
  paymentCard: {
    marginBottom: theme.spacing(2),
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    transition: "all 0.3s ease",
    "&:hover": {
      boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      transform: "translateY(-2px)"
    }
  },
  statusChip: {
    borderRadius: "16px",
    fontWeight: 600,
    fontSize: "0.75rem"
  },
  filterSection: {
    backgroundColor: "#f8f9fa",
    padding: theme.spacing(3),
    borderRadius: "12px",
    marginBottom: theme.spacing(3)
  },
  searchBox: {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px"
    }
  },
  tabButton: {
    padding: "12px 24px",
    borderRadius: "8px",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.3s ease",
    "&.active": {
      backgroundColor: theme.palette.primary.main,
      color: "white",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
    },
    "&:not(.active)": {
      backgroundColor: "#f5f5f5",
      color: "#666",
      "&:hover": {
        backgroundColor: "#e0e0e0"
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
    padding: "12px 16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: "inherit",
    transition: "all 0.2s ease",
    "&:focus": {
      outline: "none",
      borderColor: "#3b82f6",
      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)"
    },
    "&:hover": {
      borderColor: "#9ca3af"
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
    borderRadius: "12px",
    padding: "20px",
    maxWidth: "90vw",
    maxHeight: "90vh",
    overflow: "auto",
    position: "relative"
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
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
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
          activeTab === "collected" ? "COLLECTED" : activeTab === "pending" ? "PENDING" : "REJECTED"
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
        setPayments(response.data.data)
      } else {
        setPayments([])
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
      Toast.error("Failed to fetch payments")
      setPayments([])
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
        page: 1,
        limit: 1000
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
        setPayments(response.data.data)
      } else {
        setPayments([])
      }
    } catch (error) {
      console.error("Error fetching agri inputs payments:", error)
      Toast.error("Failed to fetch agri inputs payments")
      setPayments([])
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
        page: 1,
        limit: 1000
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

      console.log("🔍 Fetching Ram Agri Sales payments with params:", params)

      const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_PENDING_PAYMENTS)
      const response = await instance.request({}, params)

      console.log("📦 Response received:", response?.data)

      // Handle response structure: { status: "Success", message: "...", data: { data: [...], pagination: {...} } }
      if (response?.data?.status === "Success") {
        const paymentsData = response.data.data?.data || response.data.data || []
        console.log("✅ Payments extracted:", paymentsData.length, "payments")
        setPayments(Array.isArray(paymentsData) ? paymentsData : [])
      } else {
        console.warn("⚠️ Unexpected response structure:", response?.data)
        setPayments([])
      }
    } catch (error) {
      console.error("❌ Error fetching Ram Agri Sales payments:", error)
      console.error("Error details:", error.response?.data || error.message)
      Toast.error("Failed to fetch Ram Agri Sales payments")
      setPayments([])
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

  // Fetch payments when filters change
  useEffect(() => {
    if (!showOutstanding && outstandingView !== "orders") {
      fetchPayments()
    }
    fetchPendingPaymentsCount()
    if (paymentType === "ram-agri-sales") {
      fetchEmployeeOrders()
    }
  }, [debouncedSearchTerm, activeTab, startDateStr, endDateStr, paymentType, showOutstanding, outstandingView])

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
    <Grid className={classes.padding14}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Payments Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={exportToCSV}
          className={classes.addButton}>
          Export CSV
        </Button>
      </Box>

      {/* Payment Type Tabs */}
      <Box mb={3}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Button
              className={`${classes.tabButton} ${paymentType === "farmer" ? "active" : ""}`}
              onClick={() => setPaymentType("farmer")}>
              Farmer Orders Payments
            </Button>
          </Grid>
          <Grid item>
            <Button
              className={`${classes.tabButton} ${paymentType === "agri-inputs" ? "active" : ""}`}
              onClick={() => setPaymentType("agri-inputs")}>
              Agri Inputs Payments
            </Button>
          </Grid>
          <Grid item>
            <Button
              className={`${classes.tabButton} ${paymentType === "ram-agri-sales" ? "active" : ""}`}
              onClick={() => {
                setPaymentType("ram-agri-sales")
                setShowOutstanding(false)
              }}
              sx={{ position: "relative" }}>
              Ram Agri Sales Payments
              {pendingPaymentsCount > 0 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: -8,
                    right: -8,
                    backgroundColor: "#f44336",
                    color: "white",
                    borderRadius: "50%",
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: "bold",
                    border: "2px solid white",
                    zIndex: 1
                  }}>
                  {pendingPaymentsCount > 99 ? "99+" : pendingPaymentsCount}
                </Box>
              )}
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Payment Status Tabs */}
      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              className={`${classes.tabButton} ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => handleTabChange("pending")}>
              Pending Payments
            </Button>
          </Grid>
          <Grid item>
            <Button
              className={`${classes.tabButton} ${activeTab === "collected" ? "active" : ""}`}
              onClick={() => handleTabChange("collected")}>
              Collected Payments
            </Button>
          </Grid>
          <Grid item>
            <Button
              className={`${classes.tabButton} ${activeTab === "rejected" ? "active" : ""}`}
              onClick={() => handleTabChange("rejected")}>
              Rejected Payments
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Filters Section */}
      <Card className={classes.filterSection}>
        <Typography variant="h6" gutterBottom>
          <FilterIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Filters
        </Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="textSecondary" mb={1}>
              Start Date
            </Typography>
            <input
              type="date"
              value={startDate ? moment(startDate).format("YYYY-MM-DD") : ""}
              onChange={handleStartDateChange}
              className={classes.dateInput}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="textSecondary" mb={1}>
              End Date
            </Typography>
            <input
              type="date"
              value={endDate ? moment(endDate).format("YYYY-MM-DD") : ""}
              onChange={handleEndDateChange}
              className={classes.dateInput}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
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
                startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="outlined"
              onClick={clearFilters}
              fullWidth
              className={classes.addButton}>
              Clear Filters
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
            <CardContent>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                Ram Agri Sales Outstanding Analysis
              </Typography>
              
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
        <Grid container spacing={2}>
        {payments.length === 0 ? (
          <Grid item xs={12}>
            <Card className={classes.paymentCard}>
              <CardContent>
                <Typography variant="h6" textAlign="center" color="textSecondary">
                  No {activeTab} payments found for the selected filters
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
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={2}>
                        <Typography variant="h6" fontWeight="bold">
                          {paymentType === "agri-inputs" || paymentType === "ram-agri-sales"
                            ? `Order #${payment.orderNumber}` 
                            : `Order #${payment.orderId}`}
                        </Typography>
                        {paymentType === "agri-inputs" ? (
                          <>
                            <Typography variant="body2" color="textSecondary">
                              {payment.merchant?.name || payment.buyerName || "N/A"}
                            </Typography>
                            {payment.buyerVillage && (
                              <Typography variant="body2" color="textSecondary">
                                {payment.buyerVillage}
                              </Typography>
                            )}
                            {payment.merchant?.phone && (
                              <Typography variant="body2" color="textSecondary">
                                {payment.merchant.phone}
                              </Typography>
                            )}
                          </>
                        ) : paymentType === "ram-agri-sales" ? (
                          <>
                            <Typography variant="body2" color="textSecondary">
                              {payment.customerName || "N/A"}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {payment.customerMobile || "N/A"}
                            </Typography>
                            {payment.customerVillage && (
                              <Typography variant="body2" color="textSecondary">
                                {payment.customerVillage}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" color="textSecondary">
                              {payment.farmer?.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {payment.farmer?.mobileNumber}
                            </Typography>
                          </>
                        )}
                      </Grid>

                      <Grid item xs={12} md={2}>
                        {paymentType === "agri-inputs" ? (
                          <>
                            <Typography variant="body1" fontWeight="medium">
                              Agri Inputs Order
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {payment.items?.length || 0} items
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Total: ₹{payment.totalAmount?.toLocaleString() || 0}
                            </Typography>
                          </>
                        ) : paymentType === "ram-agri-sales" ? (
                          <>
                            <Typography variant="body1" fontWeight="medium">
                              {payment.productName || "N/A"}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {payment.quantity} {payment.unit || ""}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Rate: ₹{payment.rate?.toLocaleString() || 0}/{payment.unit || ""}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <Typography variant="body1" fontWeight="medium">
                              {payment.plantType?.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {payment.numberOfPlants} plants
                            </Typography>
                          </>
                        )}
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <Typography variant="h6" fontWeight="bold" color="primary">
                          ₹{payment.payment?.paidAmount?.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {payment.payment?.modeOfPayment}
                        </Typography>
                        {payment.payment?.bankName && (
                          <Typography variant="body2" color="textSecondary">
                            {payment.payment.bankName}
                          </Typography>
                        )}
                      </Grid>

                      <Grid item xs={12} md={2}>
                        {hasPaymentAccess ? (
                          <FormControl fullWidth size="small" className={classes.statusSelect}>
                            <Select
                              value={payment.payment?.paymentStatus || ""}
                              onChange={(e) => handleStatusChange(payment, e.target.value)}
                              displayEmpty
                              style={{
                                backgroundColor: statusColors.bg,
                                color: statusColors.text,
                                fontWeight: 600
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
                          />
                        )}
                        <Typography variant="body2" color="textSecondary" mt={1}>
                          {moment(payment.payment?.paymentDate).format("DD-MM-YYYY")}
                        </Typography>
                        {isOfficeAdmin && payment.payment?.paymentStatus === "PENDING" && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            Contact Accountant to change status
                          </Typography>
                        )}
                      </Grid>

                      <Grid item xs={12} md={2}>
                        {paymentType === "agri-inputs" ? (
                          <>
                            <Chip
                              label={payment.status?.toUpperCase() || "DRAFT"}
                              className={classes.statusChip}
                              style={{
                                backgroundColor: orderStatusColors.bg,
                                color: orderStatusColors.text
                              }}
                            />
                            <Typography variant="body2" color="textSecondary" mt={1}>
                              Total: ₹{payment.totalAmount?.toLocaleString() || 0}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mt={1}>
                              Paid: ₹{payment.paidAmount?.toLocaleString() || 0}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Outstanding: ₹{((payment.totalAmount || 0) - (payment.paidAmount || 0)).toLocaleString()}
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
                            />
                            <Typography variant="body2" color="textSecondary" mt={1}>
                              Total: ₹{payment.totalAmount?.toLocaleString() || 0}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" mt={1}>
                              Paid: ₹{payment.totalPaidAmount?.toLocaleString() || 0}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Balance: ₹{payment.balanceAmount?.toLocaleString() || 0}
                            </Typography>
                          </>
                        ) : (
                          <>
                            <FormControl fullWidth size="small" className={classes.statusSelect}>
                              <Select
                                value={payment.orderStatus || ""}
                                onChange={(e) => handleOrderStatusChange(payment, e.target.value)}
                                displayEmpty
                                style={{
                                  backgroundColor: orderStatusColors.bg,
                                  color: orderStatusColors.text,
                                  fontWeight: 600
                                }}>
                                <MenuItem value="COMPLETED">Completed</MenuItem>
                                <MenuItem value="PENDING">Pending</MenuItem>
                                <MenuItem value="ACCEPTED">Accepted</MenuItem>
                                <MenuItem value="DISPATCHED">Dispatched</MenuItem>
                                <MenuItem value="FARM_READY">Farm Ready</MenuItem>
                              </Select>
                            </FormControl>
                            <Typography variant="body2" color="textSecondary" mt={1}>
                              Total: ₹{payment.totalOrderAmount?.toLocaleString()}
                            </Typography>
                          </>
                        )}
                      </Grid>

                      <Grid item xs={12} md={2}>
                        {paymentType === "agri-inputs" ? (
                          <>
                            <Typography variant="body2" fontWeight="medium">
                              Created By: {payment.createdBy?.name || "N/A"}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {moment(payment.orderDate).format("DD-MM-YYYY")}
                            </Typography>
                          </>
                        ) : paymentType === "ram-agri-sales" ? (
                          <>
                            <Typography variant="body2" fontWeight="medium">
                              Created By: {payment.createdBy?.name || "N/A"}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {moment(payment.orderDate).format("DD-MM-YYYY")}
                            </Typography>
                            {payment.createdBy?.phoneNumber && (
                              <Typography variant="body2" color="textSecondary">
                                {payment.createdBy.phoneNumber}
                              </Typography>
                            )}
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" fontWeight="medium">
                              {payment.salesPerson?.name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {payment.salesPerson?.phoneNumber}
                            </Typography>
                          </>
                        )}
                      </Grid>

                      <Grid item xs={12} md={1}>
                        {(() => {
                          const allImages = getAllImagesForPayment(payment)
                          const hasImages = allImages.length > 0
                          
                          return (
                            <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
                              {hasImages ? (
                                <IconButton
                                  onClick={() => {
                                    const orderIdentifier = paymentType === "agri-inputs" || paymentType === "ram-agri-sales"
                                      ? payment.orderNumber
                                      : payment.orderId
                                    openImageModal(allImages, `Order #${orderIdentifier} - Images`, 0)
                                  }}
                                  className={classes.imageViewButton}
                                  title="View Images"
                                  size="small"
                                >
                                  <ViewIcon />
                                </IconButton>
                              ) : (
                                <Typography variant="caption" color="textSecondary">
                                  No Images
                                </Typography>
                              )}
                              {hasImages && (
                                <Typography variant="caption" color="textSecondary">
                                  {allImages.length} image{allImages.length > 1 ? 's' : ''}
                                </Typography>
                              )}
                            </Box>
                          )
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
    </Grid>
  )
}

export default PaymentsPage
