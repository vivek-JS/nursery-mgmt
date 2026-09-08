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
  Divider,
} from "@mui/material"
import { alpha } from "@mui/material/styles"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import {
  getActualReadyPlants,
  getActualRemainingPlants,
  getBookedPlants,
  getDisplayAvailablePlants,
  getExpectedMortality,
  getTotalAllDispatchedPlants,
} from "./slotMetrics"
import {
  useSlotReadySold,
  dispatchedQtyForLineWithBatchShare,
} from "./useSlotReadySold"
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

const mapBreakdownLine = (ln, batchMeta = {}) => ({
  ...ln,
  ready: readyFromLine(ln),
  inwardQty: Math.max(0, Number(ln.totalQuantity ?? ln.availableQuantity) || 0),
  lagwadLabel: lineLagwadLabel(ln),
  lineReady: isLineReady(ln),
  batchNumber: batchMeta.batchNumber ?? ln.batchNumber,
  batchId: batchMeta.batchId ?? ln.batchId,
  plantLabel: batchMeta.plantLabel ?? ln.plantLabel,
  subtypeLabel: batchMeta.subtypeLabel ?? ln.subtypeLabel,
})

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

  const {
    items: soldItems,
    loading: soldLoading,
    error: soldError,
    soldTotal,
    orderCount,
    byBatch: soldByBatch,
    ordersWithoutLedger,
    summary: dispatchSummary,
    dispatchedByInwardId,
    dispatchedByBatchShed,
    dispatchedByBatchNumber,
  } = useSlotReadySold(slot?._id, open)

  const syncedReady = getActualReadyPlants(slot)
  const dispatchReady = Math.max(0, syncedReady - soldTotal)
  const availablePlants = Math.max(0, getDisplayAvailablePlants(slot))
  const bookedPlants = getBookedPlants(slot)
  const dispatchedPlants = getTotalAllDispatchedPlants(slot)
  const remainingDispatch = Math.max(0, getActualRemainingPlants(slot))
  const sellablePlants = Math.max(0, Number(slot?.actualPlants) || 0)
  const mortalityPlants = getExpectedMortality(slot)

  const expectedSummary = useMemo(
    () => (data && slot ? summaryFromBreakdownPayload(data, slot) : { total: 0, calendarReady: 0, awaitingMark: 0, entries: [] }),
    [data, slot]
  )

  const expReadyCombined = syncedReady + expectedSummary.awaitingMark

  const allLines = useMemo(() => {
    const batches = data?.batches || []
    const rows = []
    for (const b of batches) {
      for (const ln of b.lines || []) {
        const ready = readyFromLine(ln)
        if (ready < 1) continue
        rows.push(
          mapBreakdownLine(ln, {
            batchNumber: b.batchNumber ?? b.batchId,
            batchId: b.batchId,
            plantLabel: b.plantLabel,
            subtypeLabel: b.subtypeLabel,
          })
        )
      }
    }
    return rows
  }, [data])

  /** Every shed line on slot — includes old / zero-sync batches for batch-wise sold view. */
  const allBatchLines = useMemo(() => {
    const batches = data?.batches || []
    const rows = []
    for (const b of batches) {
      for (const ln of b.lines || []) {
        rows.push(
          mapBreakdownLine(ln, {
            batchNumber: b.batchNumber ?? b.batchId,
            batchId: b.batchId,
            plantLabel: b.plantLabel,
            subtypeLabel: b.subtypeLabel,
          })
        )
      }
    }
    return rows
  }, [data])

  /** All batches on slot — merge shed sync list with ledger outflow (batch-centric, not slot-wise). */
  const batchOutflowRows = useMemo(() => {
    const outByBatch = new Map(
      soldByBatch.map((b) => [String(b.batchNumber || "—"), b])
    )
    const shedByBatch = new Map()
    for (const b of data?.batches || []) {
      const bn = String(b.batchNumber ?? b.batchId ?? "").trim()
      if (!bn) continue
      shedByBatch.set(bn, {
        availableInShed: Math.max(0, Number(b.totalAvailableInShed) || 0),
        syncedToSlot: Math.max(0, Number(b.totalSyncedToSlot) || 0),
      })
    }
    const keys = new Set([...outByBatch.keys(), ...shedByBatch.keys()])
    return [...keys]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((batchNumber) => {
        const out = outByBatch.get(batchNumber)
        const shed = shedByBatch.get(batchNumber) || {
          availableInShed: 0,
          syncedToSlot: 0,
        }
        const sold = Number(out?.dispatchedPlants) || 0
        return {
          batchNumber,
          availableInShed: shed.availableInShed,
          syncedToSlot: shed.syncedToSlot,
          dispatchedPlants: sold,
          remain: Math.max(0, shed.syncedToSlot - sold),
          orderCount: out?.orderCount ?? (out?.orders || []).length ?? 0,
          orders: out?.orders || [],
          outflowLines: out?.outflowLines || [],
        }
      })
  }, [soldByBatch, data?.batches])

  const batchOutflowTotals = useMemo(
    () =>
      batchOutflowRows.reduce(
        (acc, b) => ({
          availableInShed: acc.availableInShed + (Number(b.availableInShed) || 0),
          syncedToSlot: acc.syncedToSlot + (Number(b.syncedToSlot) || 0),
          sold: acc.sold + (Number(b.dispatchedPlants) || 0),
          remain: acc.remain + (Number(b.remain) || 0),
        }),
        { availableInShed: 0, syncedToSlot: 0, sold: 0, remain: 0 }
      ),
    [batchOutflowRows]
  )

  const batchOutflowTotal = batchOutflowTotals.sold
  const readyNowLines = useMemo(() => allLines.filter((ln) => ln.lineReady), [allLines])
  const notReadyLines = useMemo(() => allLines.filter((ln) => !ln.lineReady), [allLines])

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

  const batchSiblingsByNumber = useMemo(() => {
    const m = new Map()
    for (const ln of allBatchLines) {
      const bk = ln.batchNumber || "—"
      if (!m.has(bk)) m.set(bk, [])
      m.get(bk).push(ln)
    }
    return m
  }, [allBatchLines])

  const readySectionTotals = useMemo(() => {
    const sumLines = (rows) =>
      rows.reduce(
        (acc, ln) => {
          const batchKey = ln.batchNumber || "—"
          const siblings = batchSiblingsByNumber.get(batchKey) || [ln]
          const dispatched = dispatchedQtyForLineWithBatchShare(
            ln,
            siblings,
            dispatchedByInwardId,
            dispatchedByBatchShed,
            dispatchedByBatchNumber
          )
          const synced = Math.max(0, Number(ln.ready ?? ln.qty) || 0)
          acc.synced += synced
          acc.dispatched += dispatched
          acc.remain += Math.max(0, synced - dispatched)
          return acc
        },
        { synced: 0, dispatched: 0, remain: 0 }
      )
    return {
      readyNow: sumLines(readyNowLines),
      notReady: sumLines(notReadyLines),
    }
  }, [
    readyNowLines,
    notReadyLines,
    batchSiblingsByNumber,
    dispatchedByInwardId,
    dispatchedByBatchShed,
    dispatchedByBatchNumber,
  ])

  const EntryTable = ({ rows, showMark = false, showDispatched = true, siblingMap }) => (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Batch</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Lagwad</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Shed</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Exp. ready</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
            Sowed
          </TableCell>
          {showDispatched ? (
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "#b45309" }}>
              Order dispatch
            </TableCell>
          ) : null}
          {showDispatched ? (
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "#059669" }}>
              Remain
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
          const batchKey = ln.batchNumber || "—"
          const siblings =
            siblingMap?.get(batchKey) || batchSiblingsByNumber.get(batchKey) || [ln]
          const dispatched = showDispatched
            ? dispatchedQtyForLineWithBatchShare(
                ln,
                siblings,
                dispatchedByInwardId,
                dispatchedByBatchShed,
                dispatchedByBatchNumber
              )
            : 0
          const lineReadyQty = Math.max(0, Number(ln.ready ?? ln.qty) || 0)
          const lineRemain = Math.max(0, lineReadyQty - dispatched)
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
              {showDispatched ? (
                <TableCell
                  align="right"
                  sx={{
                    fontSize: 12,
                    fontWeight: lineRemain > 0 ? 800 : 400,
                    color: lineRemain > 0 ? "#059669" : "text.secondary",
                    tabularNums: true,
                  }}>
                  {lineReadyQty > 0 ? fmt(lineRemain) : "—"}
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
        <Typography variant="caption" color="text.secondary" display="block">
          {period} · actual ready {fmt(dispatchReady)}
          {soldTotal > 0 ? ` (${fmt(syncedReady)} − ${fmt(soldTotal)} dispatch)` : ""}
          {expectedSummary.awaitingMark > 0 ? ` · + ${fmt(expectedSummary.awaitingMark)} exp await` : ""}
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
            <Box sx={{ p: 2, pb: 1, bgcolor: "#f8fafc" }}>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                <KpiCard
                  label="Available"
                  value={fmt(availablePlants)}
                  sub="for booking"
                  accent="#059669"
                  bg="#ecfdf5"
                  border="#a7f3d0"
                />
                <KpiCard
                  label="Booked"
                  value={fmt(bookedPlants)}
                  sub="excl. rolled"
                  accent="#1d4ed8"
                  bg="#eff6ff"
                  border="#bfdbfe"
                />
                <KpiCard
                  label="Dispatched"
                  value={fmt(dispatchedPlants)}
                  sub="orders loaded"
                  accent="#6d28d9"
                  bg="#f5f3ff"
                  border="#ddd6fe"
                />
                <KpiCard
                  label="To dispatch"
                  value={fmt(remainingDispatch)}
                  sub="queue left"
                  accent="#b45309"
                  bg="#fffbeb"
                  border="#fcd34d"
                />
              </Stack>

              <Divider sx={{ my: 1.5, borderColor: "#e2e8f0" }} />

              <Stack direction="row" flexWrap="wrap" gap={1}>
                <KpiCard
                  label="Sellable"
                  value={fmt(sellablePlants)}
                  sub="90% actual"
                  accent="#0f766e"
                  bg="#f0fdfa"
                  border="#99f6e4"
                />
                <KpiCard
                  label="Exp. mort."
                  value={fmt(mortalityPlants)}
                  sub="10% reserve"
                  accent="#be123c"
                  bg="#fff1f2"
                  border="#fecdd3"
                />
                <KpiCard
                  label="Actual ready"
                  value={fmt(dispatchReady)}
                  sub={
                    soldTotal > 0
                      ? `${fmt(syncedReady)} synced − ${fmt(soldTotal)} dispatch`
                      : `${fmt(syncedReady)} synced on slot`
                  }
                  accent="#0e7490"
                  bg="#ecfeff"
                  border="#67e8f9"
                />
                <KpiCard
                  label="Exp. ready"
                  value={fmt(expReadyCombined)}
                  sub={`${fmt(syncedReady)} actual + ${fmt(expectedSummary.awaitingMark)} await`}
                  accent="#5b21b6"
                  bg="#faf5ff"
                  border="#e9d5ff"
                />
              </Stack>
            </Box>

            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ borderBottom: 1, borderColor: "divider", minHeight: 40, px: 1 }}>
              <Tab label="Overview" sx={{ textTransform: "none", fontWeight: 700, minHeight: 40 }} />
              <Tab label="Batch outflow" sx={{ textTransform: "none", fontWeight: 700, minHeight: 40, color: soldTotal > 0 ? "#b45309" : undefined }} />
              <Tab label="Shed-wise" sx={{ textTransform: "none", fontWeight: 700, minHeight: 40 }} />
              <Tab label="Sowing entries" sx={{ textTransform: "none", fontWeight: 700, minHeight: 40 }} />
              <Tab
                label={soldTotal > 0 ? `Orders −${fmt(soldTotal)}` : "Orders subtracted"}
                sx={{ textTransform: "none", fontWeight: 700, minHeight: 40, color: soldTotal > 0 ? "#b45309" : undefined }}
              />
            </Tabs>

            {tab === 0 ? (
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#0e7490", mb: 1 }}>
                  All batches — synced & sold ({batchOutflowRows.length})
                </Typography>
                {!batchOutflowRows.length ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    No batches on this slot yet.
                  </Typography>
                ) : (
                  <Box sx={{ mb: 2, borderRadius: 2, border: "1px solid #67e8f9", overflow: "hidden", bgcolor: "#fff" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: "#ecfeff" }}>
                          <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>Batch</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: "#0e7490" }}>
                            Synced
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: "#b45309" }}>
                            Sold
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: "#059669" }}>
                            Remain
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>Orders</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {batchOutflowRows.map((batch) => {
                          const sold = Number(batch.dispatchedPlants) || 0
                          const synced = Number(batch.syncedToSlot) || 0
                          const isOld = synced < 1 && sold > 0
                          return (
                            <TableRow
                              key={`ov-${batch.batchNumber}`}
                              hover
                              sx={isOld ? { bgcolor: alpha("#fcd34d", 0.12) } : undefined}>
                              <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>
                                {batch.batchNumber}
                                {isOld ? (
                                  <Chip
                                    size="small"
                                    label="old"
                                    sx={{ ml: 0.75, height: 18, fontSize: 9, fontWeight: 800, bgcolor: "#fef3c7", color: "#b45309" }}
                                  />
                                ) : null}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: 12, tabularNums: true }}>
                                {synced > 0 ? fmt(synced) : "—"}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontSize: 12,
                                  fontWeight: sold > 0 ? 900 : 400,
                                  color: sold > 0 ? "#b45309" : "text.secondary",
                                  tabularNums: true,
                                }}>
                                {sold > 0 ? `−${fmt(sold)}` : "—"}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: 12, tabularNums: true }}>
                                {fmt(batch.remain)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: 12, tabularNums: true }}>
                                {sold > 0 ? batch.orderCount : "—"}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        <TableRow sx={{ bgcolor: alpha("#67e8f9", 0.25) }}>
                          <TableCell sx={{ fontSize: 12, fontWeight: 900 }}>Total</TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: "#0e7490", tabularNums: true }}>
                            {fmt(batchOutflowTotals.syncedToSlot)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: "#b45309", tabularNums: true }}>
                            {batchOutflowTotals.sold > 0 ? `−${fmt(batchOutflowTotals.sold)}` : "—"}
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: "#059669", tabularNums: true }}>
                            {fmt(batchOutflowTotals.remain)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 1.5, py: 1, bgcolor: "#f8fafc" }}>
                      Dispatch ready = synced − sold per batch · old = fully moved out, sold remains on ledger
                    </Typography>
                  </Box>
                )}

                <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#059669", mb: 1 }}>
                  Ready now — {fmt(readySectionTotals.readyNow.remain)} after dispatch
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 600 }}>
                    ({fmt(readySectionTotals.readyNow.synced)} synced
                    {readySectionTotals.readyNow.dispatched > 0
                      ? ` · −${fmt(readySectionTotals.readyNow.dispatched)} dispatch`
                      : ""}
                    )
                  </Typography>
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
                  Not ready yet — {fmt(readySectionTotals.notReady.remain)} after dispatch
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1, fontWeight: 600 }}>
                    ({fmt(readySectionTotals.notReady.synced)} synced
                    {readySectionTotals.notReady.dispatched > 0
                      ? ` · −${fmt(readySectionTotals.notReady.dispatched)} dispatch`
                      : ""}
                    )
                  </Typography>
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
              <Box sx={{ p: 2, bgcolor: "#fffbeb" }}>
                {soldLoading ? (
                  <Stack alignItems="center" py={4}>
                    <CircularProgress size={28} sx={{ color: "#b45309" }} />
                  </Stack>
                ) : soldError ? (
                  <Typography color="error">{soldError}</Typography>
                ) : !batchOutflowRows.length ? (
                  <Typography variant="body2" color="text.secondary">
                    No batches synced to this slot yet.
                  </Typography>
                ) : (
                  <>
                    <Typography variant="body2" fontWeight={800} color="#b45309" sx={{ mb: 0.5 }}>
                      Batch outflow — plants loaded out per batch (dispatch ledger)
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                      <Chip
                        label={`Avail ${fmt(batchOutflowTotals.availableInShed)}`}
                        variant="outlined"
                        sx={{ color: "#0369a1", fontWeight: 700 }}
                      />
                      <Chip
                        label={`Synced ${fmt(batchOutflowTotals.syncedToSlot)}`}
                        variant="outlined"
                        sx={{ color: "#0e7490", fontWeight: 700 }}
                      />
                      <Chip
                        label={batchOutflowTotal > 0 ? `Sold −${fmt(batchOutflowTotal)}` : "Sold 0"}
                        sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#b45309" }}
                      />
                      <Chip
                        label={`Remain ${fmt(batchOutflowTotals.remain)}`}
                        variant="outlined"
                        sx={{ color: "#059669", fontWeight: 700 }}
                      />
                      {orderCount > 0 ? (
                        <Chip label={`${orderCount} order${orderCount === 1 ? "" : "s"}`} variant="outlined" sx={{ color: "#b45309" }} />
                      ) : null}
                    </Stack>
                    <Box sx={{ mb: 2, borderRadius: 2, border: "1px solid #fcd34d", overflow: "hidden", bgcolor: "#fff" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#fef3c7" }}>
                            <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>Batch</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: "#0369a1" }}>
                              Avail
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: "#0e7490" }}>
                              Synced
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: "#b45309" }}>
                              Sold
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11, color: "#059669" }}>
                              Remain
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, fontSize: 11 }}>Orders</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {batchOutflowRows.map((batch) => {
                            const sold = Number(batch.dispatchedPlants) || 0
                            return (
                              <TableRow key={`out-${batch.batchNumber}`} hover>
                                <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>{batch.batchNumber}</TableCell>
                                <TableCell align="right" sx={{ fontSize: 12, tabularNums: true }}>
                                  {fmt(batch.availableInShed)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: 12, tabularNums: true }}>
                                  {fmt(batch.syncedToSlot)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: 12, fontWeight: sold > 0 ? 900 : 400, color: sold > 0 ? "#b45309" : "text.secondary", tabularNums: true }}>
                                  {sold > 0 ? `−${fmt(sold)}` : "—"}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: 12, tabularNums: true }}>
                                  {fmt(batch.remain)}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: 12, tabularNums: true }}>
                                  {sold > 0 ? batch.orderCount : "—"}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                          <TableRow sx={{ bgcolor: alpha("#fcd34d", 0.35) }}>
                            <TableCell sx={{ fontSize: 12, fontWeight: 900 }}>Total</TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: "#0369a1", tabularNums: true }}>
                              {fmt(batchOutflowTotals.availableInShed)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: "#0e7490", tabularNums: true }}>
                              {fmt(batchOutflowTotals.syncedToSlot)}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: "#b45309", tabularNums: true }}>
                              {batchOutflowTotals.sold > 0 ? `−${fmt(batchOutflowTotals.sold)}` : "—"}
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: "#059669", tabularNums: true }}>
                              {fmt(batchOutflowTotals.remain)}
                            </TableCell>
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </Box>
                    {batchOutflowRows
                      .filter((batch) => Number(batch.dispatchedPlants) > 0)
                      .map((batch) => {
                        const lines = batch.outflowLines || batch.orders || []
                        return (
                          <Box
                            key={batch.batchNumber}
                            sx={{ mb: 2, borderRadius: 2, border: "1px solid #fcd34d", overflow: "hidden", bgcolor: "#fff" }}>
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{ px: 1.5, py: 1, bgcolor: "#fef3c7", borderBottom: "1px solid #fde68a" }}>
                              <Typography variant="body2" fontWeight={800}>
                                Batch {batch.batchNumber}
                              </Typography>
                              <Chip
                                size="small"
                                label={`−${fmt(batch.dispatchedPlants ?? 0)} out`}
                                sx={{ fontWeight: 900, color: "#b45309", bgcolor: "#fff" }}
                              />
                            </Stack>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Order</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Farmer</TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Shed</TableCell>
                                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11, color: "#b45309" }}>
                                    Out
                                  </TableCell>
                                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>When</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {lines.map((ln) => {
                                  const qty = Number(ln.plantsOut ?? ln.ledgerPlants ?? ln.plantsAbs) || 0
                                  return (
                                    <TableRow
                                      key={ln.ledgerLineId || `${ln.orderMongoId}-${ln.createdAt}`}
                                      hover>
                                      <TableCell sx={{ fontSize: 12, fontWeight: 800 }}>
                                        {ln.orderNumber ? `#${ln.orderNumber}` : "—"}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: 12 }}>{ln.farmerName || "—"}</TableCell>
                                      <TableCell sx={{ fontSize: 12 }}>{ln.pollyhouse || "—"}</TableCell>
                                      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, color: "#b45309", tabularNums: true }}>
                                        −{fmt(qty)}
                                      </TableCell>
                                      <TableCell sx={{ fontSize: 11 }}>
                                        {ln.createdAt && moment(ln.createdAt).isValid()
                                          ? moment(ln.createdAt).format("D MMM YY HH:mm")
                                          : "—"}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                                <TableRow sx={{ bgcolor: alpha("#fcd34d", 0.25) }}>
                                  <TableCell colSpan={3} sx={{ fontSize: 12, fontWeight: 800 }}>
                                    Batch total out
                                  </TableCell>
                                  <TableCell align="right" sx={{ fontSize: 12, fontWeight: 900, color: "#b45309", tabularNums: true }}>
                                    −{fmt(batch.dispatchedPlants ?? 0)}
                                  </TableCell>
                                  <TableCell />
                                </TableRow>
                              </TableBody>
                            </Table>
                          </Box>
                        )
                      })}
                  </>
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
                    No dispatch orders subtracted from dispatch ready on this slot yet.
                  </Typography>
                ) : (
                  <>
                    <Stack direction="row" flexWrap="wrap" gap={1} mb={2}>
                      <Chip label={`Total −${fmt(soldTotal)}`} sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#b45309" }} />
                      <Chip label={`${orderCount} order${orderCount === 1 ? "" : "s"}`} variant="outlined" sx={{ color: "#b45309" }} />
                      <Chip label={`Dispatch ready ${fmt(dispatchReady)}`} sx={{ bgcolor: "#ecfeff", color: "#0e7490" }} variant="outlined" />
                      <Chip label={`Synced ${fmt(syncedReady)}`} variant="outlined" sx={{ color: "#0e7490" }} />
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
