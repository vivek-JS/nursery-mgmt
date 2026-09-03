import React from "react"
import {
  Box,
  CircularProgress,
  Collapse,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  alpha,
} from "@mui/material"
import RemoveShoppingCartOutlinedIcon from "@mui/icons-material/RemoveShoppingCartOutlined"
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import moment from "moment"
import { useSlotReadySold } from "../../SlotsView/useSlotReadySold"

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

const palette = {
  border: "#e2e8e2",
  muted: "#5c6f5c",
  soldBg: "#fffbeb",
  soldBorder: "#f59e0b",
  soldText: "#b45309",
  readyBg: "#ecfeff",
  readyBorder: "#67e8f9",
  readyText: "#0e7490",
}

/**
 * Full-width separate box on slot cards — opens popup on click.
 */
export function SlotReadySoldBox({ slotId, onOpen, actualReadyNow }) {
  const { soldTotal, loading: loadingPreview } = useSlotReadySold(slotId, Boolean(slotId))
  const hasSold = soldTotal > 0

  return (
    <Box
      component="button"
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen?.()
      }}
      sx={{
        mt: 1,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        border: `2px solid ${hasSold ? palette.soldBorder : palette.border}`,
        borderRadius: 2,
        px: 1.25,
        py: 1,
        bgcolor: hasSold ? palette.soldBg : "#fafafa",
        transition: "background 0.15s, border-color 0.15s, box-shadow 0.15s",
        "&:hover": {
          bgcolor: alpha(palette.soldBorder, 0.1),
          borderColor: palette.soldBorder,
          boxShadow: `0 2px 8px ${alpha(palette.soldBorder, 0.25)}`,
        },
      }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Stack direction="row" alignItems="center" spacing={1} minWidth={0}>
          <RemoveShoppingCartOutlinedIcon sx={{ fontSize: 20, color: palette.soldText, flexShrink: 0 }} />
          <Stack spacing={0.2} alignItems="flex-start" minWidth={0}>
            <Typography variant="caption" fontWeight={800} sx={{ color: palette.soldText, lineHeight: 1.2, textTransform: "uppercase" }}>
              Actual ready sold
            </Typography>
            <Typography variant="caption" sx={{ color: palette.muted, fontSize: 10 }}>
              Ready now {fmt(actualReadyNow)} · tap for batch detail
            </Typography>
          </Stack>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5} flexShrink={0}>
          {loadingPreview ? (
            <CircularProgress size={14} sx={{ color: palette.soldText }} />
          ) : (
            <Typography variant="body2" fontWeight={900} sx={{ color: palette.soldText, fontVariantNumeric: "tabular-nums" }}>
              {hasSold ? `−${fmt(soldTotal)}` : "—"}
            </Typography>
          )}
          <OpenInNewOutlinedIcon sx={{ fontSize: 16, color: palette.soldText, opacity: 0.85 }} />
        </Stack>
      </Stack>
    </Box>
  )
}

/** Compact clickable chip in table row — opens sold detail panel. */
export function SlotReadySoldTrigger({ slotId, open, onToggle, actualReadyNow }) {
  const { soldTotal, loading: loadingPreview } = useSlotReadySold(slotId, Boolean(slotId) && !open)
  const hasSold = soldTotal > 0

  return (
    <Box
      component="button"
      type="button"
      onClick={() => onToggle?.(slotId)}
      sx={{
        mt: 0.5,
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        border: `1px solid ${hasSold || open ? palette.soldBorder : palette.border}`,
        borderRadius: 1.5,
        px: 1,
        py: 0.75,
        bgcolor: open ? alpha(palette.soldBorder, 0.14) : hasSold ? palette.soldBg : "#fafafa",
        transition: "background 0.15s, border-color 0.15s",
        "&:hover": {
          bgcolor: alpha(palette.soldBorder, 0.12),
          borderColor: palette.soldBorder,
        },
      }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={0.5}>
        <Stack spacing={0.15} alignItems="flex-start">
          <Typography variant="caption" fontWeight={800} sx={{ color: palette.soldText, lineHeight: 1.2 }}>
            Ready sold
          </Typography>
          <Typography variant="caption" sx={{ color: palette.muted, fontSize: 10 }}>
            Ready now {fmt(actualReadyNow)}
          </Typography>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.25}>
          {loadingPreview && !open ? (
            <CircularProgress size={12} sx={{ color: palette.soldText }} />
          ) : (
            <Typography variant="caption" fontWeight={900} sx={{ color: palette.soldText }}>
              {hasSold ? `−${fmt(soldTotal)}` : "—"}
            </Typography>
          )}
          <ExpandMoreIcon
            sx={{
              fontSize: 16,
              color: palette.soldText,
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          />
        </Stack>
      </Stack>
    </Box>
  )
}

/**
 * Sold detail: batch-wise minus + order list (order-linked ledger LOAD).
 */
export function SlotReadySoldContent({ slotId, open, actualReadyNow }) {
  const { byBatch, ordersWithoutLedger, soldTotal, orderCount, loading, error } = useSlotReadySold(
    slotId,
    open
  )

  const batchCount = byBatch.length

  if (!open) return null

  return (
    <Box sx={{ bgcolor: palette.soldBg, px: 2, py: 1.5 }}>
      {loading ? (
        <Stack direction="row" alignItems="center" spacing={1} py={1}>
          <CircularProgress size={18} sx={{ color: palette.soldText }} />
          <Typography variant="body2" color={palette.muted}>
            Loading batch dispatch…
          </Typography>
        </Stack>
      ) : error ? (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      ) : (
        <>
          <Stack direction="row" flexWrap="wrap" gap={1.25} mb={1.5}>
            <Box
              sx={{
                flex: "1 1 200px",
                px: 1.75,
                py: 1.25,
                borderRadius: 2,
                bgcolor: "#fff",
                border: `2px solid ${palette.soldBorder}`,
              }}>
              <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5}>
                <RemoveShoppingCartOutlinedIcon sx={{ fontSize: 18, color: palette.soldText }} />
                <Typography variant="caption" fontWeight={800} sx={{ color: palette.soldText, textTransform: "uppercase" }}>
                  Batch dispatch minus
                </Typography>
              </Stack>
              <Typography variant="h5" fontWeight={900} sx={{ color: palette.soldText, fontVariantNumeric: "tabular-nums" }}>
                {soldTotal > 0 ? `−${fmt(soldTotal)}` : "—"}
              </Typography>
              <Typography variant="caption" color={palette.muted}>
                {orderCount} order{orderCount === 1 ? "" : "s"} · {batchCount} batch{batchCount === 1 ? "" : "es"}
              </Typography>
            </Box>
            <Box
              sx={{
                flex: "1 1 160px",
                px: 1.75,
                py: 1.25,
                borderRadius: 2,
                bgcolor: palette.readyBg,
                border: `1px solid ${palette.readyBorder}`,
              }}>
              <Typography variant="caption" fontWeight={800} sx={{ color: palette.readyText, textTransform: "uppercase" }}>
                Ready now on slot
              </Typography>
              <Typography variant="h6" fontWeight={900} sx={{ color: palette.readyText, mt: 0.5 }}>
                {fmt(actualReadyNow)}
              </Typography>
            </Box>
          </Stack>

          {!byBatch.length && !ordersWithoutLedger.length ? (
            <Typography variant="body2" color={palette.muted}>
              No batch dispatch minus recorded for orders on this slot yet.
            </Typography>
          ) : (
            <>
              {byBatch.map((batch) => (
                <Box
                  key={batch.batchNumber}
                  sx={{
                    mb: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${palette.soldBorder}`,
                    overflow: "hidden",
                    bgcolor: "#fff",
                  }}>
                  <Box sx={{ px: 1.5, py: 1, bgcolor: alpha(palette.soldBorder, 0.12), borderBottom: `1px solid ${palette.border}` }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2" fontWeight={800}>
                        Batch {batch.batchNumber}
                      </Typography>
                      <Chip size="small" label={`−${fmt(batch.dispatchedPlants ?? 0)}`} sx={{ fontWeight: 800, color: palette.soldText }} />
                    </Stack>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Order</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Farmer</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Shed</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                          Minus
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>When</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(batch.orders || []).map((ln) => (
                        <TableRow key={`${ln.orderMongoId}-${ln.createdAt}`} hover>
                          <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>
                            {ln.orderNumber ? `#${ln.orderNumber}` : "—"}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{ln.farmerName || "—"}</TableCell>
                          <TableCell sx={{ fontSize: 11, color: palette.muted }}>{ln.pollyhouse || "—"}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, color: palette.soldText }}>
                            −{fmt(ln.ledgerPlants ?? 0)}
                          </TableCell>
                          <TableCell sx={{ fontSize: 11 }}>
                            {ln.createdAt && moment(ln.createdAt).isValid()
                              ? moment(ln.createdAt).format("D MMM YY HH:mm")
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))}
              {ordersWithoutLedger?.length ? (
                <Box sx={{ mt: 1, p: 1.25, borderRadius: 2, border: "1px dashed #fbbf24", bgcolor: "#fff" }}>
                  <Typography variant="caption" fontWeight={800} color="#c2410c" display="block" mb={0.5}>
                    {ordersWithoutLedger.length} dispatched order(s) without ledger batch yet
                  </Typography>
                </Box>
              ) : null}
            </>
          )}
        </>
      )}
    </Box>
  )
}

export default function SlotReadySoldPanel({ slotId, open, actualReadyNow }) {
  if (!open) return null
  return (
    <Collapse in={open}>
      <Box sx={{ borderTop: `1px solid ${alpha(palette.soldBorder, 0.35)}` }}>
        <SlotReadySoldContent slotId={slotId} open={open} actualReadyNow={actualReadyNow} />
      </Box>
    </Collapse>
  )
}
