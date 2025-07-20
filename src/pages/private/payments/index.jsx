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
  InputLabel
} from "@mui/material"
import { makeStyles } from "tss-react/mui"
import {
  Download as DownloadIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from "@mui/icons-material"
import DatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import moment from "moment"
import { Toast } from "helpers/toasts/toastHelper"
import {
  useHasPaymentAccess,
  useIsAccountant,
  useIsOfficeAdmin,
  useIsSuperAdmin
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
  }
}))

const PaymentsPage = () => {
  const { classes } = useStyles()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDateRange, setSelectedDateRange] = useState([
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    new Date()
  ])
  const [activeTab, setActiveTab] = useState("collected") // "collected" or "pending"
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")

  // Role-based access control
  const hasPaymentAccess = useHasPaymentAccess() // Only Accountants and Super Admins
  const isAccountant = useIsAccountant()
  const isOfficeAdmin = useIsOfficeAdmin()
  const isSuperAdmin = useIsSuperAdmin()

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    onConfirm: null
  })

  const [startDate, endDate] = selectedDateRange

  // Handle date range changes with validation
  const handleDateRangeChange = (update) => {
    // Only update if we have valid dates
    if (
      update &&
      update[0] &&
      update[1] &&
      update[0] instanceof Date &&
      update[1] instanceof Date &&
      !isNaN(update[0].getTime()) &&
      !isNaN(update[1].getTime())
    ) {
      setSelectedDateRange(update)
    }
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

  // Fetch payments when filters change
  useEffect(() => {
    fetchPayments()
  }, [debouncedSearchTerm, startDate, endDate, activeTab])

  const fetchPayments = async () => {
    setLoading(true)
    try {
      // Only format dates if they are valid Date objects
      const params = {
        search: debouncedSearchTerm,
        limit: 1000,
        paymentStatus: activeTab === "collected" ? "COLLECTED" : "PENDING"
      }

      // Add date range only if both dates are valid
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
    // Set valid default dates (first day of current month to today)
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const today = new Date()
    setSelectedDateRange([firstDayOfMonth, today])
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
      const instance = NetworkManager(API.ORDER.UPDATE_PAYMENT_STATUS)
      const response = await instance.request({
        orderId: payment.orderId,
        paymentId: payment.payment?._id,
        paymentStatus: newStatus
      })

      if (response?.data?.success) {
        Toast.success("Payment status updated successfully")
        fetchPayments() // Refresh the list
      } else {
        Toast.error(response?.data?.message || "Failed to update payment status")
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

      {/* Payment Status Tabs */}
      <Box mb={3}>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              className={`${classes.tabButton} ${activeTab === "collected" ? "active" : ""}`}
              onClick={() => handleTabChange("collected")}>
              Collected Payments
            </Button>
          </Grid>
          <Grid item>
            <Button
              className={`${classes.tabButton} ${activeTab === "pending" ? "active" : ""}`}
              onClick={() => handleTabChange("pending")}>
              Pending Payments
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
          <Grid item xs={12} md={4}>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={handleDateRangeChange}
              isClearable={true}
              placeholderText="Select date range"
              className="w-full p-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              calendarClassName="custom-datepicker"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search by order ID, farmer name, or mobile..."
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
            const orderStatusColors = getOrderStatusColor(payment.orderStatus)

            return (
              <Grid item xs={12} key={index}>
                <Card className={classes.paymentCard}>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={2}>
                        <Typography variant="h6" fontWeight="bold">
                          Order #{payment.orderId}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {payment.farmer?.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {payment.farmer?.mobileNumber}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <Typography variant="body1" fontWeight="medium">
                          {payment.plantType?.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {payment.numberOfPlants} plants
                        </Typography>
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
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <Typography variant="body2" fontWeight="medium">
                          {payment.salesPerson?.name}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {payment.salesPerson?.phoneNumber}
                        </Typography>
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
    </Grid>
  )
}

export default PaymentsPage
