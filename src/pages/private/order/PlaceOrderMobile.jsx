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
} from "@mui/material"
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Search as SearchIcon,
  CalendarToday as CalendarIcon,
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

/**
 * Mobile Place Order page - regular orders only (farmer/dealer, quota, wallet).
 * No sidebar; full viewport with app bar, filters, order cards, FAB to add order.
 * Route: /u/mobile/place-order
 */
function PlaceOrderMobile() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))
  const navigate = useNavigate()
  const userData = useSelector((state) => state?.userData?.userData)
  const userJobTitle = userData?.jobTitle
  const userId = userData?._id || userData?.id
  const isDealerOrSales = userJobTitle === "DEALER" || userJobTitle === "SALES"

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

  useEffect(() => {
    const handler = debounce(() => setDebouncedSearchTerm(searchTerm), 400)
    handler()
    return () => handler.cancel()
  }, [searchTerm])

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
      if (statusFilter) {
        params.status = statusFilter
      }
      if (isDealerOrSales && userId) {
        params.salesPerson = userId
      }

      const response = await instance.request({}, params)
      const rawData = response?.data?.data?.data || []

      const getTotalPaid = (payment) => {
        if (!payment || !Array.isArray(payment)) return 0
        return payment.reduce(
          (t, p) => t + (p?.paymentStatus === "COLLECTED" ? Number(p.paidAmount) || 0 : 0),
          0
        )
      }

      const mapped = rawData
        .map((data) => {
          const {
            farmer,
            numberOfPlants = 0,
            additionalPlants = 0,
            totalPlants,
            rate,
            salesPerson,
            createdAt,
            orderStatus,
            id,
            payment,
            bookingSlot,
            orderId,
            plantType,
            plantSubtype,
            remainingPlants,
            orderFor,
            dealerOrder,
            orderBookingDate,
            deliveryDate,
          } = data || {}
          const basePlants = numberOfPlants || 0
          const extraPlants = additionalPlants || 0
          const totalPlantCount =
            typeof totalPlants === "number" ? totalPlants : basePlants + extraPlants
          const totalOrderAmount = Number(rate || 0) * totalPlantCount
          const paid = getTotalPaid(payment)

          const latestSlot = mapSlotForUi(bookingSlot)
          const startDay = latestSlot?.startDay
          const endDay = latestSlot?.endDay
          const start = startDay ? moment(startDay, "DD-MM-YYYY").format("D") : "N/A"
          const end = endDay ? moment(endDay, "DD-MM-YYYY").format("D") : "N/A"
          const monthYear = startDay ? moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY") : "N/A"

          const farmerName = orderFor
            ? `${farmer?.name || "Unknown"} (Order for: ${orderFor.name})`
            : dealerOrder
            ? `via ${salesPerson?.name || "Unknown"}`
            : farmer?.name || "Unknown"

          return {
            order: orderId,
            farmerName,
            plantType: `${plantType?.name || "—"} → ${plantSubtype?.name || "—"}`,
            quantity: basePlants,
            totalPlants: totalPlantCount,
            rate: rate || 0,
            total: totalOrderAmount,
            paidAmt: paid,
            remainingAmt: totalOrderAmount - paid,
            orderStatus: orderStatus || "—",
            delivery: `${start} - ${end} ${monthYear}`,
            orderDate: moment(orderBookingDate || createdAt).format("DD MMM YYYY"),
            deliveryDate: deliveryDate ? moment(deliveryDate).format("DD MMM YYYY") : "—",
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

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleSuccess = () => {
    setShowForm(false)
    fetchOrders()
  }

  const getStatusColor = (status) => {
    const s = (status || "").toUpperCase()
    if (s === "ACCEPTED" || s === "DISPATCHED") return "success"
    if (s === "PENDING" || s === "FARM_READY") return "warning"
    if (s === "REJECTED") return "error"
    return "default"
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f5",
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
      }}
    >
      {/* Top app bar */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          flexShrink: 0,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          boxShadow: "0 2px 12px rgba(102, 126, 234, 0.25)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            py: 1.25,
            gap: 1,
            minHeight: 56,
          }}
        >
          {!isDealerOrSales && (
            <IconButton
              onClick={() => navigate("/u/dashboard")}
              size="medium"
              sx={{
                color: "white",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.3)" },
                p: 1,
              }}
              aria-label="Back"
            >
              <ArrowBackIcon sx={{ fontSize: "1.25rem" }} />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontSize: "1.1rem",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Place Order
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.7rem" }}>
              {isDealerOrSales ? "Your orders" : "Orders"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Filters */}
      <Box sx={{ p: 1.5, pb: 0, bgcolor: "#fff", borderBottom: "1px solid #e0e0e0" }}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1.5 }}>
          <TextField
            size="small"
            placeholder="Search name, order..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ flex: "1 1 140px", minWidth: 120, maxWidth: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              label="Status"
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="ACCEPTED">Accepted</MenuItem>
              <MenuItem value="DISPATCHED">Dispatched</MenuItem>
              <MenuItem value="FARM_READY">Farm Ready</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <CalendarIcon sx={{ fontSize: 18, color: "text.secondary" }} />
          <DatePicker
            selectsRange
            startDate={selectedDateRange[0]}
            endDate={selectedDateRange[1]}
            onChange={(dates) => setSelectedDateRange(dates || [])}
            dateFormat="dd/MM/yyyy"
            customInput={
              <TextField
                size="small"
                label="Date range"
                sx={{ minWidth: 200 }}
                inputProps={{ readOnly: true }}
              />
            }
          />
        </Box>
      </Box>

      {/* Order cards */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          p: 1.5,
          pb: 10,
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">No orders in this range.</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tap + to add an order.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {orders.map((row) => (
              <Card
                key={row.order}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  "&:hover": { boxShadow: "0 2px 8px rgba(0,0,0,0.12)" },
                }}
              >
                <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary" noWrap sx={{ flex: 1, pr: 1 }}>
                      #{row.order}
                    </Typography>
                    <Chip
                      label={row.orderStatus}
                      size="small"
                      color={getStatusColor(row.orderStatus)}
                      sx={{ fontSize: "0.7rem", height: 22 }}
                    />
                  </Box>
                  <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                    {row.farmerName}
                  </Typography>
                  <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
                    {row.plantType} · {row.quantity} plants
                  </Typography>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {row.orderDate} · {row.delivery}
                    </Typography>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      ₹{row.total?.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                    <Chip
                      label={`Paid ₹${row.paidAmt?.toLocaleString()}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "0.65rem", height: 20 }}
                    />
                    {row.remainingAmt > 0 && (
                      <Chip
                        label={`Balance ₹${row.remainingAmt?.toLocaleString()}`}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontSize: "0.65rem", height: 20 }}
                      />
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>

      {/* FAB */}
      <Fab
        color="primary"
        aria-label="Add order"
        onClick={() => setShowForm(true)}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          "&:hover": {
            background: "linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)",
          },
          boxShadow: "0 4px 14px rgba(102, 126, 234, 0.4)",
        }}
      >
        <AddIcon />
      </Fab>

      <AddOrderForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleSuccess}
        fullScreen={isMobile}
      />
    </Box>
  )
}

export default PlaceOrderMobile
