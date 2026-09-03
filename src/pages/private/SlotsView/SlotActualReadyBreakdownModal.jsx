import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  TextField,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { getActualReadyPlants } from "./slotMetrics"
import { useSlotReadySold, dispatchedQtyForLine } from "./useSlotReadySold"
import { summaryFromBreakdownPayload } from "./expectedReadyInSlot"
import moment from "moment"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const readyFromLine = (ln) =>
  Math.max(0, Number(ln.slotStockSyncedPlants ?? ln.onSlotPlants) || 0)

const lineLagwadLabel = (ln) =>
  ln.lagwadLabel ||
  (ln.secondaryInwardDate || ln.lagwadDate
    ? new Date(ln.secondaryInwardDate || ln.lagwadDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—")

const isLineReady = (ln) => Boolean(ln.dispatchEligible || ln.calendarReady)

const KpiCard = ({ label, value, sub, accent = "#0e7490", bg = "#ecfeff", border = "#67e8f9" }) => (
  <Box
    sx={{
      flex: "1 1 120px",
      px: 1.5,
      py: 1.25,
      borderRadius: 2,
      bgcolor: bg,
      border: `1px solid ${border}`,
    }}>
    <Typography variant="caption" fontWeight={800} sx={{ color: accent, textTransform: "uppercase", fontSize: 10 }}>
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={900} sx={{ color: accent, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
      {value}
    </Typography>
    {sub ? (
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
        {sub}
      </Typography>
    ) : null}
  </Box>
)

const StatusChip = ({ ready }) =>
  ready ? (
    <Chip size="small" label="Ready" color="success" variant="outlined" sx={{ height: 22, fontSize: 10, fontWeight: 700 }} />
  ) : (
    <Chip size="small" label="Not ready" color="warning" variant="outlined" sx={{ height: 22, fontSize: 10, fontWeight: 700 }} />
  )

const SlotActualReadyBreakdownModal = ({
  open,
  onClose,
  slot,
  initialTab = 0,
  onMarkedReady,
}) => {
  const [tab, setTab] = useState(initialTab)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [markingId, setMarkingId] = useState(null)
  const [markReason, setMarkReason] = useState("Marked ready from slot window")

  const reload = useCallback(async () => {
    if (!slot?._id) return null
    setLoading(true)
    setError(null)
    try {
      const inst = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
      const res = await inst.request({}, [slot._id])
      const payload = res?.data?.data ?? res?.data ?? res
      setData(payload)
      return payload
    } catch (e) {
      console.error(e)
      setError("Could not load ready breakdown")
      setData(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [slot?._id])

  useEffect(() => {
    if (!open || !slot?._id) {
      setData(null)
      setError(null)
      setTab(0)
      return
    }
    setTab(initialTab)
    void reload()
  }, [open, slot?._id, initialTab, reload])

  const slotReady = getActualReadyPlants(slot)
  const {
    items: soldItems,
    loading: soldLoading,
    error: soldError,
    soldTotal,
    orderCount,
    byBatch: soldByBatch,
    ordersWithoutLedger,
    dispatchedByInwardId,
    dispatchedByBatchShed,
    dispatchedByBatchNumber,
  } = useSlotReadySold(slot?._id, open)

  const expectedSummary = useMemo(
    () => (data && slot ? summaryFromBreakdownPayload(data, slot) : { total: 0, calendarReady: 0, awaitingMark: 0, entries: [] }),
    [data, slot]
  )

  const allLines = useMemo(() => {
    const batches = data?.batches || []
    const rows = []
    for (const b of batches) {
      for (const ln of b.lines || []) {
        const ready = readyFromLine(ln)
        if (ready < 1) continue
        rows.push({
          ...ln,
          ready,
          lagwadLabel: lineLagwadLabel(ln),
          batchNumber: b.batchNumber ?? b.batchId,
          batchId: b.batchId,
          plantLabel: b.plantLabel,
          subtypeLabel: b.subtypeLabel,
          lineReady: isLineReady(ln),
        })
      }
    }
    return rows
  }, [data])

  const readyNowLines = useMemo(() => allLines.filter((ln) => ln.lineReady), [allLines])
  const notReadyLines = useMemo(() => allLines.filter((ln) => !ln.lineReady), [allLines])

  const batchRows = useMemo(() => {
    const batches = data?.batches || []
    return batches
      .map((b) => {
        const lines = (b.lines || [])
          .map((ln) => ({
            ...ln,
            ready: readyFromLine(ln),
            lagwadLabel: lineLagwadLabel(ln),
            lineReady: isLineReady(ln),
          }))
          .filter((ln) => ln.ready > 0)
        const totalReady = lines.reduce((s, ln) => s + ln.ready, 0)
        const readyQty = lines.filter((ln) => ln.lineReady).reduce((s, ln) => s + ln.ready, 0)
        const notReadyQty = totalReady - readyQty
        return {
          batchId: b.batchId,
          batchNumber: b.batchNumber ?? b.batchId,
          plantLabel: b.plantLabel,
          subtypeLabel: b.subtypeLabel,
          anchorSowingLabel: b.anchorSowingLabel ?? null,
          lagwadAnchorLabel: b.lagwadAnchorLabel ?? null,
          secondaryReadyLabel: b.secondaryReadyLabel ?? null,
          lines,
          totalReady,
          readyQty,
          notReadyQty,
        }
      })
      .filter((b) => b.lines.length > 0)
      .sort((a, b) => b.totalReady - a.totalReady)
  }, [data])

  const batchWiseMerged = useMemo(() => {
    const map = new Map()
    for (const b of batchRows) {
      map.set(String(b.batchNumber), { ...b, dispatchOrders: [], dispatchedPlants: 0 })
    }
    for (const d of soldByBatch) {
      const key = String(d.batchNumber || "—")
      if (!map.has(key)) {
        map.set(key, {
          batchNumber: key,
          lines: [],
          totalReady: 0,
          readyQty: 0,
          notReadyQty: 0,
          dispatchOnly: true,
          dispatchOrders: [],
          dispatchedPlants: 0,
        })
      }
      const row = map.get(key)
      row.dispatchOrders = d.orders || []
      row.dispatchedPlants = Number(d.dispatchedPlants) || 0
    }
    return [...map.values()].sort((a, b) => {
      const score = (r) => (Number(r.dispatchedPlants) || 0) + (Number(r.totalReady) || 0)
      return score(b) - score(a)
    })
  }, [batchRows, soldByBatch])

  const sowingEntries = useMemo(() => {
    return [...allLines].sort((a, b) => {
      const ta = a.secondaryInwardDate || a.lagwadDate ? new Date(a.secondaryInwardDate || a.lagwadDate).getTime() : 0
      const tb = b.secondaryInwardDate || b.lagwadDate ? new Date(b.secondaryInwardDate || b.lagwadDate).getTime() : 0
      return tb - ta
    })
  }, [allLines])

  const shedRows = useMemo(() => {
    const map = new Map()
    for (const ln of allLines) {
      const shed = String(ln.pollyhouse || "Unassigned").trim() || "Unassigned"
      if (!map.has(shed)) map.set(shed, { shed, totalReady: 0, readyQty: 0, batches: new Map() })
      const g = map.get(shed)
      g.totalReady += ln.ready
      if (ln.lineReady) g.readyQty += ln.ready
      const bk = ln.batchNumber
      if (!g.batches.has(bk)) g.batches.set(bk, { batchNumber: bk, ready: 0, lines: [] })
      const bg = g.batches.get(bk)
      bg.ready += ln.ready
      bg.lines.push(ln)
    }
    return [...map.values()]
      .map((g) => ({
        ...g,
        notReadyQty: g.totalReady - g.readyQty,
        batchList: [...g.batches.values()].sort((a, b) => b.ready - a.ready),
      }))
      .sort((a, b) => b.totalReady - a.totalReady)
  }, [allLines])

  const shedSyncedTotal = useMemo(() => allLines.reduce((s, ln) => s + ln.ready, 0), [allLines])
  const pipelineTotal = slotReady + expectedSummary.awaitingMark

  const period =
    slot?.startDay && slot?.endDay ? `${slot.startDay} – ${slot.endDay}` : "Slot"

  const markReady = async (entry) => {
    if (!entry?.batchId || !entry?.secondaryInwardId) return
    setMarkingId(String(entry.secondaryInwardId))
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_INWARD_READINESS_BYPASS)
      await inst.request({ reason: markReason.trim() || "Marked ready from slot window" }, [
        entry.batchId,
        entry.secondaryInwardId,
      ])
      Toast.success("Line marked ready")
      await reload()
      onMarkedReady?.()
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Could not mark ready")
    } finally {
      setMarkingId(null)
    }
  }

  const EntryTable = ({ rows, showMark = false, showDispatched = true }) => (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Batch</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Lagwad</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Shed</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Exp. ready</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
            Qty
          </TableCell>
          {showDispatched ? (
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "#b45309" }}>
              Dispatched
            </TableCell>
          ) : null}
          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
          {showMark ? (
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
              Action
            </TableCell>
          ) : null}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((ln, idx) => {
          const dispatched = showDispatched
            ? dispatchedQtyForLine(
                ln,
                dispatchedByInwardId,
                dispatchedByBatchShed,
                dispatchedByBatchNumber
              )
            : 0
          return (
            <TableRow key={ln.secondaryInwardId || `${ln.batchNumber}-${idx}`} hover>
              <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{ln.batchNumber}</TableCell>
              <TableCell sx={{ fontSize: 12, color: "#92400e" }}>{ln.lagwadLabel}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{ln.pollyhouse || "—"}</TableCell>
              <TableCell sx={{ fontSize: 12 }}>{ln.expectedReadyLabel || "—"}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, tabularNums: true }}>
                {fmt(ln.ready ?? ln.qty)}
              </TableCell>
              {showDispatched ? (
                <TableCell
                  align="right"
                  sx={{
                    fontSize: 12,
                    fontWeight: dispatched > 0 ? 800 : 400,
                    color: dispatched > 0 ? "#b45309" : "text.secondary",
                    tabularNums: true,
                  }}>
                  {dispatched > 0 ? `−${fmt(dispatched)}` : "—"}
                </TableCell>
              ) : null}
              <TableCell>
                <StatusChip ready={ln.lineReady ?? isLineReady(ln)} />
              </TableCell>
              {showMark ? (
                <TableCell align="right">
                  {!ln.lineReady && !isLineReady(ln) ? (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={markingId === String(ln.secondaryInwardId)}
                      onClick={() => markReady(ln)}
                      sx={{ textTransform: "none", fontSize: "0.65rem", py: 0.2, bgcolor: "#7c3aed" }}>
                      Mark ready
                    </Button>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth onClick={(e) => e.stopPropagation()}>
      <DialogTitle sx={{ bgcolor: "#ecfeff", borderBottom: "1px solid #67e8f9", py: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={800} color="#0e7490">
          Ready breakdown
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {period} · actual {fmt(slotReady)} + expected awaiting {fmt(expectedSummary.awaitingMark)} = pipeline{" "}
          {fmt(pipelineTotal)}
        </Typography>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {loading && !data ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ p: 3 }}>
            {error}
          </Typography>
        ) : (
          <>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ p: 2, pb: 1, bgcolor: "#f8fafc" }}>
              <KpiCard label="Actual ready" value={fmt(slotReady)} sub="On slot now" />
              <KpiCard
                label="Expected window"
                value={fmt(expectedSummary.total)}
                sub={`${fmt(expectedSummary.calendarReady)} ready · ${fmt(expectedSummary.awaitingMark)} await`}
                accent="#5b21b6"
                bg="#f5f3ff"
                border="#ddd6fe"
              />
              <KpiCard
                label="Orders dispatched"
                value={soldTotal > 0 ? `−${fmt(soldTotal)}` : "—"}
                sub={
                  soldTotal > 0
                    ? `${orderCount} order${orderCount === 1 ? "" : "s"} · subtracted from ready`
                    : "No dispatch on this slot"
                }
                accent="#b45309"
                bg="#fffbeb"
                border="#fcd34d"
              />
              <KpiCard
                label="Shed synced"
                value={fmt(shedSyncedTotal)}
                sub={`${fmt(readyNowLines.reduce((s, l) => s + l.ready, 0))} ready · ${fmt(notReadyLines.reduce((s, l) => s + l.ready, 0))} not ready`}
                accent="#0369a1"
                bg="#f0f9ff"
                border="#bae6fd"
              />
            </Stack>

            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40, px: 1 }}>
              <Tab label="Overview" sx={{ textTransform: "none", fontWeight: 700, minHeight: 40 }} />
              <Tab label="Batch-wise" sx={{ textTransform: "none", fontWeight: 700, minHeight: 40 }} />
              <Tab label="Shed-wise" sx={{ textTransform: "none", fontWeight: 700, minHeight: 40 }} />
              <Tab label="Sowing entries" sx={{ textTransform: "none", fontWeight: 700, minHeight: 40 }} />
              <Tab
                label={soldTotal > 0 ? `Orders −${fmt(soldTotal)}` : "Orders subtracted"}
                sx={{ textTransform: "none", fontWeight: 700, minHeight: 40, color: soldTotal > 0 ? "#b45309" : undefined }}
              />
            </Tabs>

            {tab === 0 ? (
              <Box sx={{ p: 2 }}>
                {soldTotal > 0 ? (
                  <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: "#fffbeb", border: "1px solid #fcd34d" }}>
                    <Typography variant="body2" fontWeight={800} color="#b45309">
                      −{fmt(soldTotal)} dispatched via {orderCount} order{orderCount === 1 ? "" : "s"}
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1 }}>
                      {soldByBatch.map((b) => (
                        <Chip
                          key={b.batchNumber}
                          size="small"
                          label={`${b.batchNumber}: −${fmt(b.dispatchedPlants ?? 0)}`}
                          sx={{ fontWeight: 700, bgcolor: "#fff", color: "#b45309", border: "1px solid #fcd34d" }}
                        />
                      ))}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                      Batch minus = plants loaded from shed for orders on this slot · Orders tab for full list
                    </Typography>
                  </Box>
                ) : null}

                <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#059669", mb: 1 }}>
                  Ready now ({fmt(readyNowLines.reduce((s, l) => s + l.ready, 0))})
                </Typography>
                {!readyNowLines.length ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No calendar-ready lines synced on this slot.
                  </Typography>
                ) : (
                  <Box sx={{ mb: 2, borderRadius: 2, border: "1px solid #a7f3d0", overflow: "hidden" }}>
                    <EntryTable rows={readyNowLines} />
                  </Box>
                )}

                <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#d97706", mb: 1 }}>
                  Not ready yet ({fmt(notReadyLines.reduce((s, l) => s + l.ready, 0))})
                </Typography>
                {!notReadyLines.length ? (
                  <Typography variant="body2" color="text.secondary">
                    All synced lines are ready for dispatch.
                  </Typography>
                ) : (
                  <>
                    <TextField
                      size="small"
                      fullWidth
                      label="Mark-ready reason"
                      value={markReason}
                      onChange={(e) => setMarkReason(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ borderRadius: 2, border: "1px solid #fde68a", overflow: "hidden" }}>
                      <EntryTable rows={notReadyLines} showMark />
                    </Box>
                  </>
                )}

                {expectedSummary.entries.length > 0 ? (
                  <>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#5b21b6", mt: 2, mb: 1 }}>
                      Expected in slot window ({fmt(expectedSummary.total)})
                    </Typography>
                    <Box sx={{ borderRadius: 2, border: "1px solid #ddd6fe", overflow: "hidden" }}>
                      <EntryTable
                        rows={expectedSummary.entries.map((e) => ({
                          ...e,
                          ready: e.qty,
                          lineReady: isLineReady(e),
                          lagwadLabel: lineLagwadLabel(e),
                        }))}
                        showMark
                      />
                    </Box>
                  </>
                ) : null}
              </Box>
            ) : tab === 1 ? (
              <Box sx={{ p: 2 }}>
                {soldLoading ? (
                  <Stack alignItems="center" py={4}>
                    <CircularProgress size={28} sx={{ color: "#b45309" }} />
                  </Stack>
                ) : !batchWiseMerged.length ? (
                  <Typography variant="body2" color="text.secondary">
                    No shed lines or batch dispatch on this slot yet.
                  </Typography>
                ) : (
                  batchWiseMerged.map((batch) => {
                    const batchDispatched =
                      Number(batch.dispatchedPlants) ||
                      dispatchedByBatchNumber.get(batch.batchNumber) ||
                      0
                    const netReady = Math.max(0, (batch.readyQty || 0) - batchDispatched)
                    return (
                    <Box
                      key={batch.batchNumber}
                      sx={{ mb: 2, borderRadius: 2, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        flexWrap="wrap"
                        gap={0.5}
                        sx={{ px: 1.5, py: 1, bgcolor: "#f0fdfa", borderBottom: "1px solid #e2e8f0" }}>
                        <Box>
                          <Typography variant="body2" fontWeight={800}>
                            {batch.batchNumber}
                          </Typography>
                          <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                            {!batch.dispatchOnly ? (
                              <>
                                <Chip size="small" label={`Ready ${fmt(batch.readyQty)}`} color="success" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                                {batch.notReadyQty > 0 ? (
                                  <Chip size="small" label={`Not ready ${fmt(batch.notReadyQty)}`} color="warning" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                                ) : null}
                                <Chip size="small" label={`Shed ${fmt(batch.totalReady)}`} sx={{ height: 20, fontSize: 10, bgcolor: "#ecfeff", color: "#0e7490" }} />
                              </>
                            ) : (
                              <Chip size="small" label="Dispatch only (no shed sync)" variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                            )}
                          </Stack>
                        </Box>
                        <Stack direction="row" gap={0.5} flexWrap="wrap">
                          {batchDispatched > 0 ? (
                            <Chip
                              size="small"
                              label={`−${fmt(batchDispatched)} order dispatch`}
                              sx={{ fontWeight: 800, bgcolor: "#fffbeb", color: "#b45309" }}
                            />
                          ) : null}
                          {!batch.dispatchOnly && batch.readyQty > 0 ? (
                            <Chip
                              size="small"
                              label={`Net ready ${fmt(netReady)}`}
                              sx={{ fontWeight: 800, bgcolor: "#ecfdf5", color: "#059669" }}
                            />
                          ) : null}
                        </Stack>
                      </Stack>
                      {batch.lines.length > 0 ? (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Lagwad</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Shed</TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Exp. ready</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                              Qty
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "#b45309" }}>
                              Dispatched
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {batch.lines.map((ln, idx) => {
                            const dispatched = dispatchedQtyForLine(
                              ln,
                              dispatchedByInwardId,
                              dispatchedByBatchShed,
                              dispatchedByBatchNumber
                            )
                            return (
                            <TableRow key={ln._id || `${batch.batchNumber}-${idx}`} hover>
                              <TableCell sx={{ fontSize: 12, color: "#92400e" }}>{ln.lagwadLabel}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{ln.pollyhouse || "—"}</TableCell>
                              <TableCell sx={{ fontSize: 12 }}>{ln.expectedReadyLabel || "—"}</TableCell>
                              <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, tabularNums: true }}>
                                {fmt(ln.ready)}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontSize: 12,
                                  fontWeight: dispatched > 0 ? 800 : 400,
                                  color: dispatched > 0 ? "#b45309" : "text.secondary",
                                  tabularNums: true,
                                }}>
                                {dispatched > 0 ? `−${fmt(dispatched)}` : "—"}
                              </TableCell>
                              <TableCell>
                                <StatusChip ready={ln.lineReady} />
                              </TableCell>
                            </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                      ) : null}
                      {batch.dispatchOrders?.length > 0 ? (
                        <Box sx={{ borderTop: batch.lines.length ? "1px solid #fde68a" : "none", bgcolor: "#fffbeb" }}>
                          <Typography
                            variant="caption"
                            fontWeight={800}
                            sx={{ px: 1.5, py: 0.75, display: "block", color: "#b45309" }}>
                            Order dispatch (batch minus · order-linked)
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Order</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Farmer</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Shed</TableCell>
                                <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "#b45309" }}>
                                  Minus
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {batch.dispatchOrders.map((o) => (
                                <TableRow key={o.orderMongoId || `${o.orderNumber}-${o.createdAt}`} hover>
                                  <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>
                                    {o.orderNumber ? `#${o.orderNumber}` : "—"}
                                  </TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>{o.farmerName || "—"}</TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>{o.pollyhouse || "—"}</TableCell>
                                  <TableCell sx={{ fontSize: 12 }}>{o.orderStatus || "—"}</TableCell>
                                  <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, color: "#b45309", tabularNums: true }}>
                                    −{fmt(o.ledgerPlants ?? 0)}
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow sx={{ bgcolor: alpha("#fcd34d", 0.2) }}>
                                <TableCell colSpan={4} sx={{ fontSize: 12, fontWeight: 800 }}>
                                  Batch total minus
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: "#b45309", tabularNums: true }}>
                                  −{fmt(batchDispatched)}
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </Box>
                      ) : null}
                    </Box>
                    )
                  })
                )}
              </Box>
            ) : tab === 2 ? (
              <Box sx={{ p: 2 }}>
                {!shedRows.length ? (
                  <Typography variant="body2" color="text.secondary">
                    No shed lines synced to this slot yet.
                  </Typography>
                ) : (
                  shedRows.map((group) => (
                    <Box key={group.shed} sx={{ mb: 2, borderRadius: 2, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1, bgcolor: "#eff6ff", borderBottom: "1px solid #e2e8f0" }}>
                        <Typography variant="body2" fontWeight={800}>
                          {group.shed}
                        </Typography>
                        <Stack direction="row" gap={0.5}>
                          <Chip size="small" label={`Ready ${fmt(group.readyQty)}`} color="success" variant="outlined" sx={{ fontSize: 10 }} />
                          {group.notReadyQty > 0 ? (
                            <Chip size="small" label={`Not ready ${fmt(group.notReadyQty)}`} color="warning" variant="outlined" sx={{ fontSize: 10 }} />
                          ) : null}
                        </Stack>
                      </Stack>
                      <EntryTable rows={group.batchList.flatMap((b) => b.lines)} />
                    </Box>
                  ))
                )}
              </Box>
            ) : tab === 3 ? (
              <Box sx={{ p: 2 }}>
                {!sowingEntries.length ? (
                  <Typography variant="body2" color="text.secondary">
                    No sowing / lagwad entries on this slot.
                  </Typography>
                ) : (
                  <EntryTable rows={sowingEntries} />
                )}
              </Box>
            ) : (
              <Box sx={{ p: 2, bgcolor: "#fffbeb" }}>
                {soldLoading ? (
                  <Stack alignItems="center" py={4}>
                    <CircularProgress size={28} sx={{ color: "#b45309" }} />
                  </Stack>
                ) : soldError ? (
                  <Typography color="error">{soldError}</Typography>
                ) : !soldByBatch.length && !soldItems.length ? (
                  <Typography variant="body2" color="text.secondary">
                    No dispatch orders subtracted from actual ready on this slot yet.
                  </Typography>
                ) : (
                  <>
                    <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
                      <Chip label={`Total −${fmt(soldTotal)}`} sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#b45309" }} />
                      <Chip label={`${orderCount} order${orderCount === 1 ? "" : "s"}`} variant="outlined" sx={{ color: "#b45309" }} />
                      <Chip label={`Actual ready now ${fmt(slotReady)}`} sx={{ bgcolor: "#ecfeff", color: "#0e7490" }} variant="outlined" />
                    </Stack>
                    {soldByBatch.map((batch) => (
                      <Box key={batch.batchNumber} sx={{ mb: 2, borderRadius: 2, border: "1px solid #fcd34d", overflow: "hidden", bgcolor: "#fff" }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1, bgcolor: "#fef3c7", borderBottom: "1px solid #fde68a" }}>
                          <Typography variant="body2" fontWeight={800}>
                            Batch {batch.batchNumber}
                          </Typography>
                          <Stack direction="row" gap={0.5}>
                            <Chip size="small" label={`−${fmt(batch.dispatchedPlants ?? batch.sold ?? 0)}`} sx={{ fontWeight: 800, color: "#b45309" }} />
                            {batch.orderCount ? (
                              <Chip size="small" label={`${batch.orderCount} order${batch.orderCount === 1 ? "" : "s"}`} variant="outlined" sx={{ fontSize: 10 }} />
                            ) : null}
                          </Stack>
                        </Stack>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Order</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Farmer</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Shed</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                                Dispatched
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>When</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {(batch.orders || []).map((ln) => (
                              <TableRow key={ln.ledgerLineId || `${ln.orderMongoId || ln.linkedOrderId}-${ln.batchNumber}`} hover>
                                <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>
                                  {ln.orderNumber ? `#${ln.orderNumber}` : "—"}
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{ln.farmerName || "—"}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{ln.pollyhouse || ln.metadata?.pollyhouse || "—"}</TableCell>
                                <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, color: "#b45309", tabularNums: true }}>
                                  −{fmt(ln.ledgerPlants ?? ln.plantsAbs ?? 0)}
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
                      <Box sx={{ mt: 2, borderRadius: 2, border: "1px dashed #fbbf24", overflow: "hidden", bgcolor: "#fff" }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1, bgcolor: "#fff7ed", borderBottom: "1px solid #fed7aa" }}>
                          <Typography variant="body2" fontWeight={800} color="#c2410c">
                            Orders without ledger batch
                          </Typography>
                          <Chip size="small" label={`${ordersWithoutLedger.length} order${ordersWithoutLedger.length === 1 ? "" : "s"}`} variant="outlined" />
                        </Stack>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Order</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Farmer</TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                                Dispatched
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {ordersWithoutLedger.map((o) => (
                              <TableRow key={o.orderMongoId} hover>
                                <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>
                                  {o.orderNumber ? `#${o.orderNumber}` : "—"}
                                </TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{o.farmerName || "—"}</TableCell>
                                <TableCell sx={{ fontSize: 12 }}>{o.orderStatus || "—"}</TableCell>
                                <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, color: "#b45309", tabularNums: true }}>
                                  −{fmt(o.dispatchedPlants ?? 0)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    ) : null}
                  </>
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: "#0e7490", "&:hover": { bgcolor: "#155e75" } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SlotActualReadyBreakdownModal
