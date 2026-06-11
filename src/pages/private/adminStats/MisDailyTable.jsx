import React from "react"
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Tooltip,
  Box,
} from "@mui/material"
import moment from "moment"
import {
  DAILY_COLUMNS,
  TABLE_DELIVERY_COL_KEYS,
  fmt,
  getMetricForColumn,
  isDeliveryMetricCol,
  sumYetToDispatch,
} from "./misConstants"
import MetricCell, { TotalMetricCell } from "./MisMetricCell"
import MisColumnHeader from "./MisColumnHeader"
import { getCellGuide } from "./misGuide"

export default function MisDailyTable({ days, totals, loading, onCellClick, dueDisplay }) {
  const includeAllPastDue = Boolean(dueDisplay?.includeAllPastDue)
  const dueSummary = dueDisplay?.dueSummary
  return (
    <Paper
      elevation={0}
      data-tour="mis-table-wrap"
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: "0 4px 24px rgba(21, 101, 192, 0.08)",
      }}>
      <TableContainer sx={{ maxHeight: "min(52vh, 480px)" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {DAILY_COLUMNS.map((col) => (
                <MisColumnHeader
                  key={col.key}
                  colKey={col.key}
                  label={col.label}
                  align={col.key === "date" ? "left" : "center"}
                  sx={{
                    bgcolor: col.bgcolor,
                    borderBottom: "2px solid",
                    borderColor:
                      col.group === "booking" ? "#90caf9" : col.group === "delivery" ? "#a5d6a7" : "#b0bec5",
                    width: col.width,
                    minWidth: col.width || 84,
                  }}
                />
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && !days.length ? (
              <TableRow>
                <TableCell colSpan={DAILY_COLUMNS.length} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : days.length === 0 ? (
              <TableRow>
                <TableCell colSpan={DAILY_COLUMNS.length} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary" variant="body2">
                    No daily data for this range
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {days.map((row) => {
                  const isPastDue = row.isPastDue || row.date === "past-due"
                  const weekend = !isPastDue && [0, 6].includes(moment(row.date).day())
                  const onCell = (payload) => onCellClick(row.date, payload)
                  return (
                    <TableRow
                      key={row.date}
                      hover
                      sx={{
                        bgcolor: isPastDue
                          ? "rgba(255, 152, 0, 0.1)"
                          : weekend
                            ? "rgba(21, 101, 192, 0.04)"
                            : undefined,
                        transition: "background-color 0.12s",
                      }}>
                      <TableCell
                        sx={{
                          fontWeight: 700,
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          borderLeft: isPastDue
                            ? "3px solid #ff9800"
                            : weekend
                              ? "3px solid #42a5f5"
                              : "3px solid transparent",
                          color: isPastDue ? "#e65100" : undefined,
                        }}>
                        {isPastDue ? (
                          row.label || "Past due (before range)"
                        ) : (
                          <>
                            {moment(row.date).format("DD MMM")}
                            <Typography component="span" variant="caption" color="text.secondary" ml={0.5}>
                              {moment(row.date).format("ddd")}
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      {DAILY_COLUMNS.slice(1).map((col) => {
                        if (col.key === "unique") {
                          return (
                            <TableCell
                              key={col.key}
                              align="center"
                              onClick={() => onCell({ bucket: "unique" })}
                              sx={{
                                cursor: "pointer",
                                fontWeight: 800,
                                bgcolor: "#ede7f6",
                                fontSize: 15,
                                "&:hover": { bgcolor: "#d1c4e9" },
                              }}>
                              <Tooltip
                                title={getCellGuide("unique")}
                                arrow
                                placement="top"
                                enterDelay={350}>
                                <Box component="span" sx={{ display: "block" }}>
                                  {fmt(row.uniqueOrders)}
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    sx={{ display: "block", fontSize: 9, fontWeight: 500, color: "text.secondary" }}>
                                    orders
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </TableCell>
                          )
                        }
                        const metric = getMetricForColumn(row, col.key)
                        const mode = col.key === "booking" ? "booking" : "delivery"
                        const bucket = col.key === "booking" ? "booking" : col.key
                        const isDel = isDeliveryMetricCol(col.key)
                        return (
                          <MetricCell
                            key={col.key}
                            orders={metric?.orders}
                            plants={metric?.plants}
                            onClick={() => onCell({ mode, bucket })}
                            tint={col.bgcolor}
                            duePlusBacklog={undefined}
                            guideKey={col.key}
                          />
                        )
                      })}
                    </TableRow>
                  )
                })}
                {totals && (
                  <TableRow sx={{ bgcolor: "#1b5e20" }}>
                    <TableCell sx={{ color: "#fff", fontWeight: 700, fontSize: 12 }}>TOTAL</TableCell>
                    <TotalMetricCell orders={totals.booking.orders} plants={totals.booking.plants} />
                    <TotalMetricCell
                      orders={totals.delivery.total.orders}
                      plants={totals.delivery.total.plants}
                      duePlusBacklog={includeAllPastDue ? dueSummary : undefined}
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
                      />
                    ))}
                        <TableCell align="center" sx={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>
                          {fmt(totals.uniqueOrders)}
                          <Typography component="span" variant="caption" sx={{ display: "block", fontSize: 9, opacity: 0.75 }}>
                            orders
                          </Typography>
                        </TableCell>
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
