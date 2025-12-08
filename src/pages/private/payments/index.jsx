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
  const [paymentType, setPaymentType] = useState("farmer") // "farmer" or "agri-inputs"
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

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

  // Main fetch function that routes to appropriate API
  const fetchPayments = () => {
    if (paymentType === "agri-inputs") {
      fetchAgriInputsPayments()
    } else {
      fetchFarmerPayments()
    }
  }

  // Fetch payments when filters change
  useEffect(() => {
    fetchPayments()
  }, [debouncedSearchTerm, activeTab, startDateStr, endDateStr, paymentType])

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
    const headers = [
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

    const csvData = payments.map((payment) => [
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
    ])

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

    setConfirmDialog({
      open: true,
      title: "Confirm Payment Status Change",
      description: `Change payment status for Order #${payment.orderId} from ${currentStatus} to ${newStatus}?`,
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

    setConfirmDialog({
      open: true,
      title: "Confirm Order Status Change",
      description: `Change order status for Order #${payment.orderId} from ${currentStatus} to ${newStatus}?`,
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
              placeholder={paymentType === "agri-inputs" 
                ? "Search by order number, merchant name, or buyer name..." 
                : "Search by order ID, farmer name, or mobile..."}
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

      {/* Payments List */}
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
              : getOrderStatusColor(payment.orderStatus)

            return (
              <Grid item xs={12} key={index}>
                <Card className={classes.paymentCard}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={2}>
                        <Typography variant="h6" fontWeight="bold">
                          {paymentType === "agri-inputs" 
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
                                  onClick={() => openImageModal(allImages, `Order #${payment.orderId} - Images`, 0)}
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
