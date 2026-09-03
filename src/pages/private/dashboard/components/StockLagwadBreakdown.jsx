import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  alpha,
} from "@mui/material"
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined"
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import RemoveShoppingCartOutlinedIcon from "@mui/icons-material/RemoveShoppingCartOutlined"
import { API, NetworkManager } from "network/core"
import moment from "moment"

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

const palette = {
  border: "#e2e8e2",
  muted: "#5c6f5c",
  accent: "#15803d",
  shedBg: "#f0fdf4",
  minusBg: "#fffbeb",
  minusAccent: "#b45309",
}

/**
 * Lazy-loaded shed × batch lagwad drill-down for a booking slot row.
 */
export default function StockLagwadBreakdown({ slotId, open, hideLedger = false }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [ledgerItems, setLedgerItems] = useState([])
  const [error, setError] = useState(null)
  const [expandedBatch, setExpandedBatch] = useState(false)

  const load = useCallback(async () => {
    if (!slotId) return
    setLoading(true)
    setError(null)
    try {
      const breakdownReq = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
      const requests = [breakdownReq.request({}, [slotId])]
      if (!hideLedger) {
        const ledgerReq = NetworkManager(API.PLANT_OUTWARD.GET_SECONDARY_DISPATCH_LEDGER_LINES)
        requests.push(
          ledgerReq.request({}, {
            linkedBookingSlotId: slotId,
            action: "LOAD",
            limit: 200,
          })
        )
      }
      const results = await Promise.all(requests)
      setData(results[0]?.data?.data ?? results[0]?.data ?? results[0])
      if (!hideLedger && results[1]) {
        const ledgerPayload = results[1]?.data?.data ?? results[1]?.data ?? results[1]
        setLedgerItems(Array.isArray(ledgerPayload?.items) ? ledgerPayload.items : [])
      } else {
        setLedgerItems([])
      }
    } catch (e) {
      console.error(e)
      setError("Could not load shed breakdown")
      setData(null)
      setLedgerItems([])
    } finally {
      setLoading(false)
    }
  }, [slotId, hideLedger])

  useEffect(() => {
    if (!open || !slotId) {
      setData(null)
      setLedgerItems([])
      setError(null)
      setExpandedBatch(false)
      return
    }
    void load()
  }, [open, slotId, load])

  const shedGroups = useMemo(() => {
    const batches = data?.batches || []
    const byShed = new Map()
    for (const batch of batches) {
      for (const ln of batch.lines || []) {
        const shed = String(ln.pollyhouse || "Unassigned").trim() || "Unassigned"
        if (!byShed.has(shed)) {
          byShed.set(shed, { shed, lines: [], batches: new Set() })
        }
        const g = byShed.get(shed)
        g.lines.push({
          ...ln,
          batchNumber: batch.batchNumber ?? batch.batchId,
          batchId: batch.batchId,
        })
        if (batch.batchNumber || batch.batchId) {
          g.batches.add(String(batch.batchNumber ?? batch.batchId))
        }
      }
    }
    return [...byShed.values()]
      .map((g) => ({
        ...g,
        batchCount: g.batches.size,
        totalPlants: g.lines.reduce(
          (s, ln) => s + (Number(ln.availableQuantity ?? ln.onSlotPlants) || 0),
          0
        ),
        syncedPlants: g.lines.reduce(
          (s, ln) => s + (Number(ln.slotStockSyncedPlants ?? ln.onSlotPlants) || 0),
          0
        ),
      }))
      .sort((a, b) => b.totalPlants - a.totalPlants)
  }, [data])

  const ledgerByBatch = useMemo(() => {
    const map = new Map()
    for (const ln of ledgerItems) {
      const batch = String(ln.batchNumber || "Unknown").trim() || "Unknown"
      if (!map.has(batch)) {
        map.set(batch, { batchNumber: batch, lines: [], totalMinus: 0, shed: ln.pollyhouse || "" })
      }
      const g = map.get(batch)
      const qty = Number(ln.plantsAbs) || 0
      g.totalMinus += qty
      if (!g.shed && ln.pollyhouse) g.shed = ln.pollyhouse
      g.lines.push(ln)
    }
    return [...map.values()]
      .map((g) => ({
        ...g,
        lines: g.lines.sort((a, b) => {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return db - da
        }),
      }))
      .sort((a, b) => b.totalMinus - a.totalMinus)
  }, [ledgerItems])

  const ledgerTotalMinus = useMemo(
    () => ledgerByBatch.reduce((s, g) => s + g.totalMinus, 0),
    [ledgerByBatch]
  )

  if (!open) return null

  const summary = data?.summary || {}

  if (hideLedger && !loading && !error && !shedGroups.length) {
    return null
  }

  return (
    <Collapse in={open}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: palette.shedBg,
          borderTop: `1px solid ${palette.border}`,
        }}>
        {loading ? (
          <Stack direction="row" alignItems="center" spacing={1} py={1}>
            <CircularProgress size={18} sx={{ color: palette.accent }} />
            <Typography variant="body2" color={palette.muted}>
              Loading shed & batch lagwad…
            </Typography>
          </Stack>
        ) : error ? (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        ) : !shedGroups.length && (!hideLedger ? !ledgerByBatch.length : true) ? (
          <Typography variant="body2" color={palette.muted}>
            No secondary lagwad lines linked to this slot yet.
          </Typography>
        ) : (
          <>
            <Stack direction="row" flexWrap="wrap" gap={1} mb={1.5}>
              <Chip
                size="small"
                icon={<WarehouseOutlinedIcon />}
                label={`${shedGroups.length} shed${shedGroups.length === 1 ? "" : "s"}`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                icon={<Inventory2OutlinedIcon />}
                label={`${fmt(summary.linkedBatchCount ?? data?.batches?.length ?? 0)} batches`}
                sx={{ fontWeight: 700 }}
              />
              {!hideLedger && ledgerByBatch.length ? (
                <Chip
                  size="small"
                  icon={<RemoveShoppingCartOutlinedIcon />}
                  label={`${fmt(ledgerTotalMinus)} dispatched (ledger)`}
                  sx={{ fontWeight: 700, bgcolor: alpha(palette.minusAccent, 0.12) }}
                />
              ) : null}
              {summary.pendingSlotSync > 0 ? (
                <Chip
                  size="small"
                  color="warning"
                  label={`${fmt(summary.pendingSlotSync)} pending slot sync`}
                  sx={{ fontWeight: 700 }}
                />
              ) : null}
            </Stack>

            {!hideLedger && ledgerByBatch.length ? (
              <Box
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  border: `1px solid ${alpha(palette.minusAccent, 0.35)}`,
                  overflow: "hidden",
                  bgcolor: palette.minusBg,
                }}>
                <Box sx={{ px: 1.5, py: 1, borderBottom: `1px solid ${palette.border}` }}>
                  <Typography variant="subtitle2" fontWeight={800} color={palette.minusAccent}>
                    Dispatch minus history
                  </Typography>
                  <Typography variant="caption" color={palette.muted}>
                    Orders deducted from this slot · batch-wise
                  </Typography>
                </Box>
                {ledgerByBatch.map((group) => (
                  <Accordion
                    key={group.batchNumber}
                    disableGutters
                    elevation={0}
                    expanded={expandedBatch === group.batchNumber}
                    onChange={(_, isExpanded) =>
                      setExpandedBatch(isExpanded ? group.batchNumber : false)
                    }
                    sx={{
                      bgcolor: "#fff",
                      "&:before": { display: "none" },
                      borderBottom: `1px solid ${palette.border}`,
                    }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1} width="100%">
                        <Typography variant="body2" fontWeight={800}>
                          {group.batchNumber}
                        </Typography>
                        {group.shed ? (
                          <Typography variant="caption" color={palette.muted}>
                            {group.shed}
                          </Typography>
                        ) : null}
                        <Chip
                          size="small"
                          label={`−${fmt(group.totalMinus)} · ${group.lines.length} order${group.lines.length === 1 ? "" : "s"}`}
                          sx={{
                            ml: "auto",
                            height: 22,
                            fontWeight: 700,
                            bgcolor: alpha(palette.minusAccent, 0.1),
                            color: palette.minusAccent,
                          }}
                        />
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0, px: 0 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Order</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Farmer</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                              Minus
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>When</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {group.lines.map((ln) => {
                            const when = ln.createdAt && moment(ln.createdAt).isValid()
                              ? moment(ln.createdAt).format("D MMM YYYY HH:mm")
                              : "—"
                            const orderLabel = ln.orderNumber ? `#${ln.orderNumber}` : "—"
                            return (
                              <TableRow key={ln.ledgerLineId || `${ln.linkedOrderId}-${ln.plantsAbs}`} hover>
                                <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{orderLabel}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{ln.farmerName || "—"}</TableCell>
                                <TableCell
                                  align="right"
                                  sx={{ fontSize: 12, fontWeight: 700, color: palette.minusAccent }}>
                                  −{fmt(ln.plantsAbs)}
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{when}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ) : null}

            {shedGroups.map((group) => (
              <Box
                key={group.shed}
                sx={{
                  mb: 1.5,
                  borderRadius: 2,
                  border: `1px solid ${palette.border}`,
                  overflow: "hidden",
                  bgcolor: "#fff",
                }}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    bgcolor: alpha(palette.accent, 0.08),
                    borderBottom: `1px solid ${palette.border}`,
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 1,
                  }}>
                  <Typography variant="subtitle2" fontWeight={800} color={palette.accent}>
                    {group.shed}
                  </Typography>
                  <Typography variant="caption" color={palette.muted}>
                    {group.batchCount} batch · {fmt(group.totalPlants)} in shed · {fmt(group.syncedPlants)} on slot
                  </Typography>
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Batch</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Lagwad</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Ready</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Size</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                        In shed
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                        On slot
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Sync</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.lines.map((ln) => {
                      const lagwadDate = ln.lagwadDate || ln.secondaryInwardDate
                      const lagwadLabel =
                        ln.lagwadLabel ||
                        (lagwadDate && moment(lagwadDate).isValid()
                          ? moment(lagwadDate).format("D MMM YYYY")
                          : "—")
                      const readyLabel =
                        ln.expectedReadyLabel ||
                        (ln.expectedReadyDate && moment(ln.expectedReadyDate).isValid()
                          ? moment(ln.expectedReadyDate).format("D MMM YYYY")
                          : "—")
                      const syncTone =
                        ln.slotSyncStatus === "synced"
                          ? "success"
                          : ln.slotSyncStatus === "partial"
                            ? "warning"
                            : "default"
                      return (
                        <TableRow key={ln.secondaryInwardId || `${ln.batchId}-${lagwadLabel}`} hover>
                          <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>
                            {ln.batchNumber || "—"}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{lagwadLabel}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{readyLabel}</TableCell>
                          <TableCell sx={{ fontSize: 12 }}>{ln.size || "—"}</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
                            {fmt(ln.availableQuantity)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
                            {fmt(ln.onSlotPlants ?? ln.slotStockSyncedPlants)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={ln.slotSyncStatus || "pending"}
                              color={syncTone}
                              variant="outlined"
                              sx={{ height: 22, fontSize: 10, fontWeight: 700, textTransform: "capitalize" }}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Box>
            ))}
          </>
        )}
      </Box>
    </Collapse>
  )
}
