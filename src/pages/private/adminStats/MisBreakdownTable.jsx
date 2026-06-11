import React, { useMemo, useState } from "react"
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import RefreshIcon from "@mui/icons-material/Refresh"
import FileDownloadIcon from "@mui/icons-material/FileDownload"
import {
  BREAKDOWN_METRIC_COLS,
  TABLE_DELIVERY_COL_KEYS,
  asDisplayLabel,
  getMetricForColumn,
  plantAccentFor,
  isDeliveryMetricCol,
  sumYetToDispatch,
  buildCellDuePlus,
  buildTotalsDuePlus,
} from "./misConstants"
import MetricCell, { TotalMetricCell } from "./MisMetricCell"
import MisColumnHeader from "./MisColumnHeader"

function dispatchPct(row) {
  const booked = row.booking?.plants || 0
  const out =
    (row.delivery?.dispatched?.plants || 0) +
    (row.delivery?.completed?.plants || 0) +
    (row.delivery?.dispatchProcess?.plants || 0)
  if (booked <= 0) return 0
  return Math.min(100, Math.round((out / booked) * 100))
}

export default function MisBreakdownTable({
  rows,
  totals,
  loading,
  onCellClick,
  onRefresh,
  onExport,
  scope,
  title,
  subtitle,
  icon: Icon,
  emptyMessage,
  nameColumnLabel = "Name",
  dateRangeLabel,
  dueDisplay,
}) {
  const includeAllPastDue = Boolean(dueDisplay?.includeAllPastDue)
  const [search, setSearch] = useState("")

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows || []
    return (rows || []).filter((row) => {
      const name = asDisplayLabel(row.personName, "").toLowerCase()
      const phone = String(row.phoneNumber || "").toLowerCase()
      const role = String(row.jobTitle || "").toLowerCase()
      return name.includes(q) || phone.includes(q) || role.includes(q)
    })
  }, [rows, search])

  const colCount = 1 + BREAKDOWN_METRIC_COLS.length + 1

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 4px 24px rgba(46, 125, 50, 0.1)",
      }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          background:
            scope === "dealer"
              ? "linear-gradient(135deg, #4a148c 0%, #6a1b9a 50%, #8e24aa 100%)"
              : "linear-gradient(135deg, #0d47a1 0%, #1565c0 50%, #1976d2 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
        }}>
        {Icon ? <Icon /> : null}
        <Box flex={1} minWidth={160}>
          <Typography variant="subtitle2" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {subtitle}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5} ml="auto">
          {onExport && (
            <Tooltip title="Export this tab">
              <span>
                <IconButton
                  size="small"
                  onClick={onExport}
                  disabled={!rows?.length}
                  sx={{ color: "#fff" }}>
                  <FileDownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
          {onRefresh && (
            <Tooltip title="Refresh">
              <span>
                <IconButton size="small" onClick={onRefresh} disabled={loading} sx={{ color: "#fff" }}>
                  {loading ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          bgcolor: "#fafafa",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}>
        <TextField
          size="small"
          placeholder={`Search ${nameColumnLabel.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200, flex: "1 1 200px", maxWidth: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        {dateRangeLabel && (
          <Typography variant="caption" fontWeight={600} color="text.secondary">
            {dateRangeLabel}
          </Typography>
        )}
        {totals && (
          <Box display="flex" gap={1} flexWrap="wrap" ml={{ sm: "auto" }}>
            <Chip
              size="small"
              label={`${filteredRows.length} shown`}
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: 11 }}
            />
            <Chip
              size="small"
              color="primary"
              variant="outlined"
              label={`Booked ${(totals.booking?.plants || 0).toLocaleString()} plants`}
              sx={{ fontWeight: 600, fontSize: 11 }}
            />
            <Chip
              size="small"
              color="success"
              variant="outlined"
              label={`Delivery ${(totals.delivery?.total?.plants || 0).toLocaleString()} plants`}
              sx={{ fontWeight: 600, fontSize: 11 }}
            />
          </Box>
        )}
      </Box>

      <TableContainer sx={{ maxHeight: "min(58vh, 560px)" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <MisColumnHeader
                colKey="name"
                label={nameColumnLabel}
                align="left"
                sx={{ bgcolor: "#fafafa", minWidth: 160 }}
              />
              {BREAKDOWN_METRIC_COLS.map((col) => (
                <MisColumnHeader
                  key={col.key}
                  colKey={col.key}
                  label={col.label}
                  sx={{ bgcolor: col.bgcolor }}
                />
              ))}
              <MisColumnHeader colKey="shipPct" label="Ship %" sx={{ bgcolor: "#fafafa", width: 88 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !rows?.length ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} color="success" />
                </TableCell>
              </TableRow>
            ) : !rows?.length ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary" variant="body2">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : !filteredRows.length ? (
              <TableRow>
                <TableCell colSpan={colCount} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary" variant="body2">
                    No matches for &ldquo;{search}&rdquo;
                  </Typography>
                  <Button size="small" onClick={() => setSearch("")} sx={{ mt: 1 }}>
                    Clear search
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {filteredRows.map((row, idx) => {
                  const name = asDisplayLabel(row.personName, "Unknown")
                  const accent = plantAccentFor(name)
                  const pct = dispatchPct(row)
                  const onCell = (payload) =>
                    onCellClick({
                      scope,
                      personId: row.personId,
                      personName: name,
                      phoneNumber: row.phoneNumber,
                      jobTitle: row.jobTitle,
                      ...payload,
                    })
                  return (
                    <TableRow
                      key={`${scope}-${row.personId || name}-${idx}`}
                      hover
                      sx={{ bgcolor: idx % 2 === 0 ? "rgba(0,0,0,0.015)" : undefined }}>
                      <TableCell
                        sx={{
                          fontWeight: 600,
                          fontSize: 13,
                          borderLeft: `4px solid ${accent}`,
                        }}>
                        <Typography variant="body2" fontWeight={700} color={accent}>
                          {name}
                        </Typography>
                        {row.phoneNumber && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {row.phoneNumber}
                          </Typography>
                        )}
                        {row.jobTitle && scope === "sales" && (
                          <Chip
                            label={row.jobTitle}
                            size="small"
                            sx={{ mt: 0.5, height: 20, fontSize: 10, fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                      {BREAKDOWN_METRIC_COLS.map((col) => {
                        const metric = getMetricForColumn(row, col.key)
                        const mode = col.key === "booking" ? "booking" : "delivery"
                        const bucket = col.key === "booking" ? "booking" : col.key
                        return (
                          <MetricCell
                            key={col.key}
                            orders={metric?.orders}
                            plants={metric?.plants}
                            onClick={() => onCell({ mode, bucket })}
                            tint={col.bgcolor}
                            duePlusBacklog={
                              includeAllPastDue && isDeliveryMetricCol(col.key)
                                ? buildCellDuePlus(row, col.key, metric)
                                : undefined
                            }
                            guideKey={col.key}
                          />
                        )
                      })}
                      <TableCell align="center">
                        <Box display="flex" alignItems="center" gap={0.75} justifyContent="center">
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              width: 44,
                              height: 6,
                              borderRadius: 3,
                              bgcolor: "#e0e0e0",
                              "& .MuiLinearProgress-bar": {
                                borderRadius: 3,
                                bgcolor: pct >= 80 ? "#2e7d32" : pct >= 40 ? "#f9a825" : "#e53935",
                              },
                            }}
                          />
                          <Typography variant="caption" fontWeight={700} fontSize={11}>
                            {pct}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {totals && (
                  <TableRow sx={{ bgcolor: "#263238" }}>
                    <TableCell sx={{ color: "#fff", fontWeight: 700 }}>
                      TOTAL
                    </TableCell>
                    <TotalMetricCell orders={totals.booking.orders} plants={totals.booking.plants} />
                    <TotalMetricCell
                      orders={totals.delivery.total.orders}
                      plants={totals.delivery.total.plants}
                      duePlusBacklog={
                        includeAllPastDue ? buildTotalsDuePlus(totals, "deliveryTotal") : undefined
                      }
                    />
                    {TABLE_DELIVERY_COL_KEYS.map((bucket) => (
                      <TotalMetricCell
                        key={bucket}
                        orders={
                          bucket === "yetToDispatch"
                            ? sumYetToDispatch(totals.delivery).orders
                            : totals.delivery[bucket]?.orders
                        }
                        plants={
                          bucket === "yetToDispatch"
                            ? sumYetToDispatch(totals.delivery).plants
                            : totals.delivery[bucket]?.plants
                        }
                        duePlusBacklog={
                          includeAllPastDue ? buildTotalsDuePlus(totals, bucket) : undefined
                        }
                      />
                    ))}
                    <TableCell />
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
