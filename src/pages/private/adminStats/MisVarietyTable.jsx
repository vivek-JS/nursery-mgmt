import React, { useMemo } from "react"
import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
} from "@mui/material"
import GrassIcon from "@mui/icons-material/Grass"
import {
  BREAKDOWN_METRIC_COLS,
  TABLE_DELIVERY_COL_KEYS,
  getMetricForColumn,
  plantAccentFor,
  asDisplayLabel,
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

export default function MisVarietyTable({ rows, totals, loading, onCellClick, dueDisplay }) {
  const includeAllPastDue = Boolean(dueDisplay?.includeAllPastDue)
  const grouped = useMemo(() => {
    const map = new Map()
    for (const row of rows || []) {
      const name = asDisplayLabel(row.plantName, "Unknown")
      if (!map.has(name)) map.set(name, [])
      map.get(name).push({ ...row, plantName: name, subtype: asDisplayLabel(row.subtype, "Other") })
    }
    return [...map.entries()]
  }, [rows])

  const colCount = 2 + BREAKDOWN_METRIC_COLS.length + 1

  return (
    <Paper
      elevation={0}
      data-tour="mis-table-wrap"
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
          background: "linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}>
        <GrassIcon />
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Plant &amp; subtype — range summary
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Booking by order date · delivery by scheduled delivery date
          </Typography>
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: "min(58vh, 560px)" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <MisColumnHeader
                colKey="plant"
                label="Plant"
                align="left"
                sx={{ bgcolor: "#fafafa", minWidth: 120 }}
              />
              <MisColumnHeader
                colKey="subtype"
                label="Subtype"
                align="left"
                sx={{ bgcolor: "#fafafa", minWidth: 110 }}
              />
              {BREAKDOWN_METRIC_COLS.map((col) => (
                <MisColumnHeader
                  key={col.key}
                  colKey={col.key}
                  label={col.label}
                  sx={{ bgcolor: col.bgcolor }}
                />
              ))}
              <MisColumnHeader
                colKey="shipPct"
                label="Ship %"
                sx={{ bgcolor: "#fafafa", width: 88 }}
              />
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
                    No plant bookings in this range
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {grouped.flatMap(([plantName, plantRows]) => {
                  const accent = plantAccentFor(plantName)
                  return plantRows.map((row, idx) => {
                    const pct = dispatchPct(row)
                    const onCell = (payload) =>
                      onCellClick({
                        scope: "variety",
                        plantName: row.plantName,
                        subtype: row.subtype,
                        plantId: row.plantId,
                        subtypeId: row.subtypeId,
                        ...payload,
                      })
                    return (
                      <TableRow
                        key={`${asDisplayLabel(row.plantName)}-${asDisplayLabel(row.subtype)}`}
                        hover
                        sx={{
                          bgcolor: idx % 2 === 0 ? "rgba(0,0,0,0.015)" : undefined,
                        }}>
                        {idx === 0 ? (
                          <TableCell
                            rowSpan={plantRows.length}
                            sx={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: accent,
                              borderLeft: `4px solid ${accent}`,
                              verticalAlign: "top",
                            }}>
                            {plantName}
                          </TableCell>
                        ) : null}
                        <TableCell>
                          <Chip
                            label={asDisplayLabel(row.subtype, "Other")}
                            size="small"
                            variant="outlined"
                            sx={{
                              height: 22,
                              fontSize: 11,
                              fontWeight: 600,
                              borderColor: accent,
                              color: accent,
                            }}
                          />
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
                  })
                })}
                {totals && (
                  <TableRow sx={{ bgcolor: "#263238" }}>
                    <TableCell colSpan={2} sx={{ color: "#fff", fontWeight: 700 }}>
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
