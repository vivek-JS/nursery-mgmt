import React, { useState, useEffect, useRef } from "react"
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip
} from "@mui/material"
import { Download, FilterList } from "@mui/icons-material"
import { API } from "../../network/config/endpoints"
import { Toast } from "../../helpers/toasts/toastHelper"
import { CookieKeys } from "../../constants/cookieKeys"
import axios from "axios"
import { sumOrderAdvancePayments } from "../../utils/orderPaymentAdvance"

function escapeCsvCell(val) {
  const s = val === undefined || val === null ? "" : String(val)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function formatInDate(d) {
  if (!d) return "N/A"
  try {
    return new Date(d).toLocaleDateString("en-IN")
  } catch {
    return "N/A"
  }
}

/** Manual/sticker DC label — same resolution as FarmerOrdersTable badges. */
export function resolveManualDcNumber(obj) {
  const raw =
    obj?.deliveryChallanInvoiceNumber ?? obj?.details?.deliveryChallanInvoiceNumber
  if (raw == null || raw === "") return ""
  const s = String(raw).trim()
  return s || ""
}

/** Latest dispatch flag/date from order row (matches dashboard list). */
export function resolveLatestDispatchInfo(obj) {
  const hist = Array.isArray(obj?.dispatchHistory) ? obj.dispatchHistory : []
  if (!hist.length) {
    const dispatched =
      obj?.orderStatus === "DISPATCHED" ||
      obj?.orderStatus === "DISPATCH_PROCESS" ||
      obj?.orderStatus === "COMPLETED" ||
      obj?.orderStatus === "PARTIALLY_COMPLETED"
    return { dispatched: dispatched ? "Y" : "N", date: null }
  }
  const latest = hist[hist.length - 1]
  const date = latest?.dispatchDate || latest?.dispatchedAt || latest?.createdAt || null
  return { dispatched: "Y", date }
}

/** Build CSV text from GET /order/getOrders rows (aligned with dashboard list). */
export function ordersListRowsToCsv(rows) {
  const headers = [
    "Sr No",
    "Order ID",
    "Booking date",
    "Farmer name",
    "Mobile No",
    "District",
    "Taluka",
    "Village",
    "Plant",
    "Subtype",
    "Delivery date",
    "Original delivery date",
    "Quantity (plants)",
    "Base qty",
    "Extra qty",
    "Returned plants",
    "Damaged plants",
    "Rate (₹)",
    "Billable plants (net)",
    "Advance (Completed)",
    "Advance (Pending)",
    "Dispatched",
    "Dispatched date",
    "Manual DC number",
    "Order status",
    "Sales person",
    "Reference"
  ]
  const lines = [headers.map(escapeCsvCell).join(",")]
  let sr = 0
  for (const obj of rows) {
    const farmer = obj.farmer || {}
    const plantName =
      (obj.plantType && obj.plantType.name) ||
      (typeof obj.plantName === "string" ? obj.plantName : obj.plantName?.name) ||
      "N/A"
    let subName = "N/A"
    if (obj.plantSubtype != null) {
      if (typeof obj.plantSubtype === "string") subName = obj.plantSubtype
      else if (typeof obj.plantSubtype === "object" && obj.plantSubtype.name)
        subName = obj.plantSubtype.name
    }
    const bookingRef = obj.orderBookingDate || obj.createdAt
    const delivery = obj.deliveryDate ?? obj.farmReadyDate
    const originalDelivery = obj.oldDeliveryDate ?? null
    const refParts = []
    if (obj.salesPerson?.name) refParts.push(obj.salesPerson.name)
    const reference = refParts.length ? refParts.join(" / ") : "N/A"
    const baseQty = Number(obj.numberOfPlants) || 0
    const extraQty = Number(obj.additionalPlants) || 0
    const totalQty =
      obj.totalPlants != null && obj.totalPlants !== ""
        ? Number(obj.totalPlants)
        : baseQty + extraQty
    const ret = Number(obj.returnedPlants) || 0
    const dmg = Number(obj.damagedPlants) || 0
    const booked = Number.isFinite(totalQty) ? totalQty : 0
    const billable = Math.max(0, booked - ret - dmg)
    const dispatchInfo = resolveLatestDispatchInfo(obj)
    const { completed: advanceCompleted, pending: advancePending } = sumOrderAdvancePayments(obj)

    const row = [
      ++sr,
      obj.orderId != null ? obj.orderId : "",
      formatInDate(bookingRef),
      farmer.name || obj.orderFor?.name || "N/A",
      farmer.mobileNumber != null && farmer.mobileNumber !== ""
        ? String(farmer.mobileNumber)
        : obj.orderFor?.mobileNumber != null
          ? String(obj.orderFor.mobileNumber)
          : "N/A",
      farmer.districtName || farmer.district || "N/A",
      farmer.talukaName || farmer.taluka || "N/A",
      farmer.village || "N/A",
      plantName,
      subName,
      formatInDate(delivery),
      formatInDate(originalDelivery),
      Number.isFinite(totalQty) ? totalQty : "",
      baseQty,
      extraQty,
      ret,
      dmg,
      obj.rate ?? "",
      billable,
      advanceCompleted || "",
      advancePending || "",
      dispatchInfo.dispatched,
      formatInDate(dispatchInfo.date),
      resolveManualDcNumber(obj),
      obj.orderStatus ?? "",
      obj.salesPerson?.name || "",
      reference
    ]
    lines.push(row.map(escapeCsvCell).join(","))
  }
  return lines.join("\r\n")
}

const ExcelExport = ({
  title = "Export Orders",
  endpoint = API.ORDER.GET_CSV,
  filters = {},
  onExportComplete,
  /** Async () => order[] — same rows as dashboard filters (caller uses buildRegularOrderListParams + exportAll). One-click, no dialog. */
  ordersListFetcher = null,
  /** Badge count when using direct export (active filters). */
  filterBadgeCount = null
}) => {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exportFilters, setExportFilters] = useState({
    startDate: "",
    endDate: "",
    orderStatuses: [],
    paymentStatus: "",
    ...filters
  })

  const prevFiltersRef = useRef(filters)

  useEffect(() => {
    const prevFilters = prevFiltersRef.current || {}
    const currentFilters = filters || {}

    const filtersChanged = JSON.stringify(prevFilters) !== JSON.stringify(currentFilters)

    if (filtersChanged) {
      setExportFilters((prev) => ({
        ...prev,
        ...currentFilters
      }))
      prevFiltersRef.current = currentFilters
    }
  }, [filters])

  const orderStatusOptions = [
    { value: "", label: "All statuses" },
    { value: "PENDING", label: "Pending" },
    { value: "ACCEPTED", label: "Accepted" },
    { value: "ASSIGNED", label: "Assigned" },
    { value: "FARM_READY", label: "Farm ready" },
    { value: "READY_FOR_DISPATCH", label: "Ready for dispatch" },
    { value: "DISPATCH_PROCESS", label: "Dispatch process" },
    { value: "DISPATCHED", label: "Dispatched" },
    { value: "COMPLETED", label: "Completed" },
    { value: "PARTIALLY_COMPLETED", label: "Partially completed" },
    { value: "CANCELLED", label: "Cancelled" },
    { value: "TEMPORARY_CANCELLED", label: "Temp. cancelled" },
    { value: "REJECTED", label: "Rejected" }
  ]

  const paymentStatusOptions = [
    { value: "", label: "All Payment Statuses" },
    { value: "PENDING", label: "Pending" },
    { value: "PARTIAL", label: "Partial" },
    { value: "PAID", label: "Paid" },
    { value: "COMPLETED", label: "Completed" }
  ]

  const handleFilterChange = (field, value) => {
    setExportFilters((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleExportOrdersList = async () => {
    if (typeof ordersListFetcher !== "function") {
      Toast.error("Export is not configured")
      return
    }
    setLoading(true)
    try {
      const rows = await ordersListFetcher()
      if (!rows || rows.length === 0) {
        Toast.error("No orders to export for the current filters")
        return
      }
      const csv = ordersListRowsToCsv(rows)
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `farmer_orders_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      if (onExportComplete) onExportComplete()
    } catch (error) {
      console.error("Export error:", error)
      Toast.error(error?.message || "Export failed")
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setLoading(true)
    try {
      const authToken = localStorage.getItem(CookieKeys.Auth)
      if (!authToken || authToken === "undefined" || authToken === "null") {
        Toast.error("Please log in to export data")
        setLoading(false)
        return
      }

      const params = new URLSearchParams()

      Object.entries(exportFilters).forEach(([key, value]) => {
        if (key === "orderStatuses") {
          const statuses = Array.isArray(value) ? value.filter(Boolean) : []
          if (statuses.length) params.append("orderStatus", statuses.join(","))
          return
        }
        const isValuePresent =
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !(typeof value === "object" && Object.keys(value).length === 0)

        if (isValuePresent) {
          params.append(key, value)
        }
      })

      const baseURL = process.env.REACT_APP_BASE_URL || "http://localhost:8000/api/v1"

      const response = await axios({
        method: "GET",
        url: `${baseURL}/order/getCSV`,
        params: Object.fromEntries(params),
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "text/csv, application/json"
        },
        responseType: "text"
      })

      if (response.status === 200 && response.data) {
        const blob = new Blob([response.data], { type: "text/csv" })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url

        const filename = `orders_export_${exportFilters.startDate || "all"}_${
          exportFilters.endDate || "data"
        }.csv`
        link.download = filename

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        Toast.success("Export completed successfully!")
        setOpen(false)

        if (onExportComplete) {
          onExportComplete()
        }
      } else {
        Toast.error("Failed to export data: No data received")
      }
    } catch (error) {
      console.error("Export error:", error)
      if (error.response?.status === 401) {
        Toast.error("Authentication failed. Please log in again.")
      } else if (error.response?.status === 500) {
        Toast.error("Server error. Please try again later.")
      } else if (error.code === "NETWORK_ERROR") {
        Toast.error("Network error. Please check your connection.")
      } else {
        Toast.error("Error exporting data: " + (error.message || "Unknown error"))
      }
    } finally {
      setLoading(false)
    }
  }

  const getActiveFiltersCount = () => {
    let n = 0
    if (exportFilters.startDate) n += 1
    if (exportFilters.endDate) n += 1
    if (Array.isArray(exportFilters.orderStatuses) && exportFilters.orderStatuses.length) n += 1
    if (exportFilters.paymentStatus) n += 1
    return n
  }

  const badgeCount =
    filterBadgeCount != null ? filterBadgeCount : getActiveFiltersCount()

  const useListExport = typeof ordersListFetcher === "function"

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<Download />}
        onClick={() => {
          if (useListExport) {
            handleExportOrdersList()
          } else {
            setOpen(true)
          }
        }}
        disabled={loading}
        sx={{ minWidth: 120 }}>
        {loading ? "Exporting…" : "Export Excel"}
        {badgeCount > 0 && (
          <Chip
            label={badgeCount}
            size="small"
            sx={{ ml: 1, height: 20, fontSize: "0.75rem" }}
          />
        )}
      </Button>

      {!useListExport && (
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterList />
              {title}
            </Box>
          </DialogTitle>

          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select filters to customize your export. Leave fields empty to include all data.
            </Typography>

            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" gap={2}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={exportFilters.startDate}
                  onChange={(e) => handleFilterChange("startDate", e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  value={exportFilters.endDate}
                  onChange={(e) => handleFilterChange("endDate", e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <Box display="flex" gap={2}>
                <FormControl fullWidth>
                  <InputLabel>Order Status</InputLabel>
                  <Select
                    multiple
                    value={exportFilters.orderStatuses || []}
                    onChange={(e) =>
                      handleFilterChange(
                        "orderStatuses",
                        typeof e.target.value === "string"
                          ? e.target.value.split(",")
                          : e.target.value
                      )
                    }
                    label="Order Status"
                    renderValue={(selected) =>
                      (selected || []).length
                        ? (selected || [])
                            .map(
                              (v) =>
                                orderStatusOptions.find((o) => o.value === v)?.label || v
                            )
                            .join(", ")
                        : "All statuses"
                    }>
                    {orderStatusOptions
                      .filter((option) => option.value)
                      .map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={exportFilters.paymentStatus}
                    onChange={(e) => handleFilterChange("paymentStatus", e.target.value)}
                    label="Payment Status">
                    {paymentStatusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  <strong>Export will include:</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  • Order details (ID, date, customer info)
                  <br />
                  • Plant information (name, subtype, quantity, rate)
                  <br />
                  • Financial details (total amount, payments, balance)
                  <br />
                  • Status information (order status, payment status)
                  <br />
                  • Sales and dealer information
                  <br />• Delivery period and remarks
                </Typography>
              </Box>
            </Box>
          </DialogContent>

          <DialogActions>
            <Button onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              variant="contained"
              startIcon={<Download />}
              disabled={loading}>
              {loading ? "Exporting..." : "Export CSV"}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}

export default ExcelExport
