import React, { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material"
import FileDownloadIcon from "@mui/icons-material/FileDownload"
import TableViewIcon from "@mui/icons-material/TableView"
import EditIcon from "@mui/icons-material/Edit"
import moment from "moment"
import {
  COHORT_COLORS,
  STATUS_COLORS,
  advanceFilterSummary,
  fmt,
  fmtRs,
} from "./deliveryReportConstants"
import { fetchAllDeliveryReportOrders, fetchDeliveryReportOrders } from "./deliveryReportApi"
import {
  downloadDeliveryReportCsv,
  downloadDeliveryReportExcel,
} from "./deliveryReportExport"

function formatDate(val) {
  if (!val) return "—"
  const d = moment(val)
  return d.isValid() ? d.utcOffset(330).format("DD MMM YYYY") : "—"
}

function cohortLabel(id) {
  if (id === "native") return "Native"
  if (id === "rolled") return "Rolled"
  if (id === "deliveryChanged") return "Changed"
  return id
}

export default function DeliveryReportResults({
  filters,
  summary,
  summaryLoading,
  summaryError,
  onEditFilters,
  onRefresh,
}) {
  const [orders, setOrders] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [exporting, setExporting] = useState(false)
  const [exportInfo, setExportInfo] = useState("")
  const limit = 50

  const loadOrders = useCallback(
    async (p = 1) => {
      setLoading(true)
      setError("")
      try {
        const data = await fetchDeliveryReportOrders(filters, p, limit)
        setOrders(data.orders || [])
        setTotal(data.total || 0)
        setPage(p)
      } catch (err) {
        setError(err?.message || "Failed to load orders")
        setOrders([])
      } finally {
        setLoading(false)
      }
    },
    [filters]
  )

  useEffect(() => {
    if (summary && !summaryError) loadOrders(1)
  }, [summary, summaryError, loadOrders])

  const runExport = async (format) => {
    setExporting(true)
    setError("")
    setExportInfo("")
    try {
      const { orders: allOrders, total: exportTotal } = await fetchAllDeliveryReportOrders(filters)
      if (!allOrders.length) {
        setError("No orders to export for current filters.")
        return
      }
      if (format === "excel") {
        downloadDeliveryReportExcel({ filters, summary, orders: allOrders })
      } else {
        downloadDeliveryReportCsv({ filters, orders: allOrders })
      }
      const label = format === "excel" ? "Excel" : "CSV"
      if (exportTotal > allOrders.length) {
        setExportInfo(`${label} downloaded — ${allOrders.length} of ${exportTotal} orders (export cap).`)
      } else {
        setExportInfo(`${label} downloaded — ${allOrders.length} orders.`)
      }
    } catch (err) {
      setError(err?.message || "Export failed")
    } finally {
      setExporting(false)
    }
  }

  const totalPages = Math.ceil(total / limit) || 0
  const advanceOnly = (filters.advancePayment || []).length > 0
  const advanceLabel = advanceFilterSummary(filters.advancePayment)

  return (
    <Box>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2, alignItems: "center" }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          {advanceOnly ? "Advance Orders Report" : "Delivery Report"} — {filters.plantName}
          {filters.subtypeName ? ` · ${filters.subtypeName}` : ""}
        </Typography>
        <Button startIcon={<EditIcon />} onClick={onEditFilters} size="small">
          Edit filters
        </Button>
        <Button
          startIcon={exporting ? <CircularProgress size={16} /> : <FileDownloadIcon />}
          onClick={() => runExport("csv")}
          size="small"
          variant="outlined"
          disabled={exporting || summaryLoading}
        >
          Download CSV
        </Button>
        <Button
          startIcon={exporting ? <CircularProgress size={16} /> : <TableViewIcon />}
          onClick={() => runExport("excel")}
          size="small"
          variant="contained"
          disabled={exporting || summaryLoading}
        >
          Download Excel
        </Button>
        <Button onClick={() => { onRefresh(); loadOrders(page) }} size="small">
          Refresh
        </Button>
      </Box>

      {summaryLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {summaryError ? <Alert severity="error" sx={{ mb: 2 }}>{summaryError}</Alert> : null}
      {advanceOnly ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing advance orders only: <strong>{advanceLabel}</strong>
        </Alert>
      ) : null}
      {exportInfo ? <Alert severity="success" sx={{ mb: 2 }}>{exportInfo}</Alert> : null}

      {summary && !advanceOnly ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3 }}>
          <Paper sx={{ p: 2, minWidth: 120 }}>
            <Typography variant="caption" color="text.secondary">Orders</Typography>
            <Typography variant="h5">{fmt(summary.totals?.orders)}</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 120 }}>
            <Typography variant="caption" color="text.secondary">Plants</Typography>
            <Typography variant="h5">{fmt(summary.totals?.plants)}</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">Amount</Typography>
            <Typography variant="h5">{fmtRs(summary.totals?.amount)}</Typography>
          </Paper>
        </Box>
      ) : null}

      {summary && advanceOnly ? (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3 }}>
          <Paper sx={{ p: 2, minWidth: 120 }}>
            <Typography variant="caption" color="text.secondary">Advance orders</Typography>
            <Typography variant="h5">{fmt(summary.totals?.orders)}</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 120 }}>
            <Typography variant="caption" color="text.secondary">Plants</Typography>
            <Typography variant="h5">{fmt(summary.totals?.plants)}</Typography>
          </Paper>
          <Paper sx={{ p: 2, minWidth: 140 }}>
            <Typography variant="caption" color="text.secondary">Amount</Typography>
            <Typography variant="h5">{fmtRs(summary.totals?.amount)}</Typography>
          </Paper>
          {(filters.advancePayment || []).includes("collected") ? (
            <Paper sx={{ p: 2, minWidth: 140 }}>
              <Typography variant="caption" color="text.secondary">Advance collected</Typography>
              <Typography variant="h6">{fmt(summary.byPayment?.advanceCollected)}</Typography>
            </Paper>
          ) : null}
          {(filters.advancePayment || []).includes("pending") ? (
            <Paper sx={{ p: 2, minWidth: 140 }}>
              <Typography variant="caption" color="text.secondary">Advance pending</Typography>
              <Typography variant="h6">{fmt(summary.byPayment?.advancePending)}</Typography>
            </Paper>
          ) : null}
        </Box>
      ) : null}

      {summary?.byStatus?.length && !advanceOnly ? (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>By status</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {summary.byStatus.map((row) => {
              const c = STATUS_COLORS[row.status] || {}
              return (
                <Chip
                  key={row.status}
                  size="small"
                  label={`${row.status}: ${row.orders} ord / ${fmt(row.plants)} plants`}
                  sx={{ bgcolor: c.bg, color: c.color }}
                />
              )
            })}
          </Box>
        </Box>
      ) : null}

      {summary?.byCohort?.length && !advanceOnly ? (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>By delivery type</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {summary.byCohort.map((row) => {
              const c = COHORT_COLORS[row.cohort] || {}
              return (
                <Chip
                  key={row.cohort}
                  size="small"
                  label={`${cohortLabel(row.cohort)}: ${row.orders} ord / ${fmt(row.plants)} plants`}
                  sx={{ bgcolor: c.bg, color: c.color }}
                />
              )
            })}
          </Box>
        </Box>
      ) : null}

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Farmer</TableCell>
              <TableCell>Location</TableCell>
              <TableCell align="right">Plants</TableCell>
              <TableCell>Delivery</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Advance</TableCell>
              <TableCell>Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !orders.length ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : null}
            {!loading && !orders.length ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  No orders match these filters.
                </TableCell>
              </TableRow>
            ) : null}
            {orders.map((o) => {
              const st = STATUS_COLORS[o.orderStatus] || {}
              return (
                <TableRow key={o._id || o.id || o.orderId} hover>
                  <TableCell>{o.orderId ?? "—"}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{o.farmerName || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.farmerMobile || ""}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{o.farmerVillage || "—"}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {o.farmerTaluka || ""}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{fmt(o.plants ?? o.linePlantTotal)}</TableCell>
                  <TableCell>{formatDate(o.deliveryDate)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={o.orderStatus}
                      sx={{ bgcolor: st.bg, color: st.color, fontSize: "0.7rem" }}
                    />
                  </TableCell>
                  <TableCell>
                    {o.advanceCollected > 0 ? (
                      <Typography variant="caption" display="block" color="success.main">
                        ₹{fmt(o.advanceCollected)}
                      </Typography>
                    ) : null}
                    {o.advancePending > 0 ? (
                      <Typography variant="caption" display="block" color="warning.main">
                        Pending ₹{fmt(o.advancePending)}
                      </Typography>
                    ) : null}
                    {!o.advanceCollected && !o.advancePending ? "—" : null}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {(o.cohortTags || []).map((t) => {
                        const c = COHORT_COLORS[t] || {}
                        return (
                          <Chip
                            key={t}
                            size="small"
                            label={cohortLabel(t)}
                            sx={{ bgcolor: c.bg, color: c.color, height: 20, fontSize: "0.65rem" }}
                          />
                        )
                      })}
                    </Box>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 ? (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 1, mt: 2 }}>
          <Button disabled={page <= 1 || loading} onClick={() => loadOrders(page - 1)} size="small">
            Previous
          </Button>
          <Typography variant="body2" sx={{ alignSelf: "center" }}>
            Page {page} / {totalPages} ({fmt(total)} orders)
          </Typography>
          <Button
            disabled={page >= totalPages || loading}
            onClick={() => loadOrders(page + 1)}
            size="small"
          >
            Next
          </Button>
        </Box>
      ) : null}
    </Box>
  )
}
