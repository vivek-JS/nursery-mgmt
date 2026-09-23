import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { getActualReadyPlants } from "./slotMetrics"
import { useSlotReadySold } from "./useSlotReadySold"
import { summaryFromBreakdownPayload } from "./expectedReadyInSlot"
import { formatExpectedReadyDate, daysFromTodayToDate } from "./lagwadWindowDays"

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

const Kpi = ({ label, value, sub, ok }) => (
  <Box
    sx={{
      flex: "1 1 100px",
      px: 1.25,
      py: 1,
      borderRadius: 1.5,
      border: "1px solid",
      borderColor: ok === false ? "#fecaca" : "#99f6e4",
      bgcolor: ok === false ? "#fef2f2" : "#f0fdfa",
    }}>
    <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
      {label}
    </Typography>
    <Typography variant="subtitle1" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "#0f766e", lineHeight: 1.2 }}>
      {value}
    </Typography>
    {sub ? (
      <Typography variant="caption" sx={{ fontSize: 10, color: "#64748b" }}>
        {sub}
      </Typography>
    ) : null}
  </Box>
)

/**
 * Batch-wise synced − order dispatch check for a delivery slot (matches Ready tile math).
 */
export default function LagwadBatchOrderCheckPanel({ slot, title = "Batch check (synced − orders)" }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)

  const reload = useCallback(async () => {
    if (!slot?._id) return
    setLoading(true)
    try {
      const inst = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
      const res = await inst.request({}, [slot._id])
      setData(res?.data?.data ?? res?.data ?? res)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slot?._id])

  useEffect(() => {
    if (!slot?._id) {
      setData(null)
      return
    }
    void reload()
  }, [slot?._id, reload])

  const {
    soldTotal,
    orderCount,
    byBatch: soldByBatch,
    loading: soldLoading,
    summary: dispatchSummary,
  } = useSlotReadySold(slot?._id, Boolean(slot?._id))

  const syncedReady = getActualReadyPlants(slot)
  const dispatchReady = Math.max(0, syncedReady - soldTotal)
  const expectedSummary = useMemo(
    () => (data && slot ? summaryFromBreakdownPayload(data, slot) : { total: 0, calendarReady: 0, awaitingMark: 0 }),
    [data, slot]
  )

  const batchRows = useMemo(() => {
    const outByBatch = new Map(
      (soldByBatch || []).map((b) => [String(b.batchNumber || "—"), b])
    )
    const shedByBatch = new Map()
    for (const b of data?.batches || []) {
      const bn = String(b.batchNumber ?? b.batchId ?? "").trim() || "—"
      shedByBatch.set(bn, {
        syncedToSlot: Math.max(0, Number(b.totalSyncedToSlot) || 0),
      })
    }
    const keys = new Set([...outByBatch.keys(), ...shedByBatch.keys()])
    return [...keys]
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((batchNumber) => {
        const out = outByBatch.get(batchNumber)
        const shed = shedByBatch.get(batchNumber) || { syncedToSlot: 0 }
        const sold = Number(out?.dispatchedPlants) || 0
        const synced = shed.syncedToSlot
        return {
          batchNumber,
          synced,
          sold,
          remain: Math.max(0, synced - sold),
          orderCount: out?.orderCount ?? (out?.orders || []).length ?? 0,
        }
      })
      .filter((r) => r.synced > 0 || r.sold > 0)
  }, [soldByBatch, data?.batches])

  const batchTotals = useMemo(
    () =>
      batchRows.reduce(
        (acc, r) => ({
          synced: acc.synced + r.synced,
          sold: acc.sold + r.sold,
          remain: acc.remain + r.remain,
        }),
        { synced: 0, sold: 0, remain: 0 }
      ),
    [batchRows]
  )

  const slotMatchOk =
    Math.abs(batchTotals.remain - dispatchReady) <= 2 ||
    (batchTotals.synced === 0 && dispatchReady === 0)

  if (!slot?._id) return null

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
        Slot ready {fmt(syncedReady)} − order dispatch {fmt(soldTotal)} ({orderCount} orders) ={" "}
        <strong>dispatch ready {fmt(dispatchReady)}</strong>
        {expectedSummary.awaitingMark > 0
          ? ` · Expected in window (awaiting mark): ${fmt(expectedSummary.awaitingMark)} — roll moves synced actual+ready on slot, not awaiting until marked`
          : null}
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Kpi label="Synced ready" value={fmt(syncedReady)} sub="actualReadyPlants" />
        <Kpi label="− Orders" value={fmt(soldTotal)} sub={dispatchSummary?.source || "ledger / dispatch"} />
        <Kpi
          label="= Dispatch ready"
          value={fmt(dispatchReady)}
          sub={slotMatchOk ? "matches batch table" : "check batch rows"}
          ok={slotMatchOk}
        />
        {expectedSummary.total > 0 ? (
          <>
            <Kpi
              label="Exp. for sell"
              value={fmt(expectedSummary.total)}
              sub="in delivery window"
            />
            <Kpi
              label="Exp. can sell"
              value={fmt(Math.max(0, expectedSummary.total - soldTotal))}
              sub={`− ${fmt(soldTotal)} orders`}
            />
          </>
        ) : null}
      </Box>

      {loading || soldLoading ? (
        <Box display="flex" justifyContent="center" py={2}>
          <CircularProgress size={24} />
        </Box>
      ) : batchRows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No batch sync lines on this slot for batch-wise check.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Batch</TableCell>
              <TableCell align="right">Synced</TableCell>
              <TableCell align="right">− Orders</TableCell>
              <TableCell align="right">Remain</TableCell>
              <TableCell align="right">Orders</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batchRows.map((r) => (
              <TableRow key={r.batchNumber} hover>
                <TableCell sx={{ fontSize: 12, fontWeight: 600 }}>{r.batchNumber}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, tabularNums: true }}>
                  {fmt(r.synced)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 12, tabularNums: true, color: "#b45309" }}>
                  {fmt(r.sold)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 12, tabularNums: true, fontWeight: 700 }}>
                  {fmt(r.remain)}
                </TableCell>
                <TableCell align="right" sx={{ fontSize: 11 }}>
                  {r.orderCount}
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: "#f0fdfa" }}>
              <TableCell sx={{ fontWeight: 800, fontSize: 12 }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: 12 }}>
                {fmt(batchTotals.synced)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: 12 }}>
                {fmt(batchTotals.sold)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: 12 }}>
                {fmt(batchTotals.remain)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      )}

      {!slotMatchOk && batchRows.length > 0 ? (
        <Chip
          size="small"
          color="warning"
          label={`Batch remain total (${fmt(batchTotals.remain)}) differs from tile dispatch ready (${fmt(dispatchReady)}) — ledger may use line share`}
          sx={{ mt: 1, height: "auto", py: 0.5, "& .MuiChip-label": { whiteSpace: "normal" } }}
        />
      ) : null}
    </Box>
  )
}

export function LagwadLineBatchTable({ lines, compact = false }) {
  if (!lines?.length) return null
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Batch / Shed</TableCell>
          <TableCell>Expected ready</TableCell>
          <TableCell>Days</TableCell>
          <TableCell align="right">Plants</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((b, i) => {
          const dayDelta = daysFromTodayToDate(b.expectedReadyDate)
          const dayLabel =
            dayDelta == null
              ? "—"
              : dayDelta === 0
                ? "Today"
                : dayDelta > 0
                  ? `In ${dayDelta}d`
                  : `${Math.abs(dayDelta)}d ago`
          return (
            <TableRow key={`${b.batchNumber}-${b.pollyhouse}-${i}`}>
              <TableCell sx={{ fontSize: compact ? 11 : 12 }}>
                {b.batchNumber ?? "—"}
                {b.pollyhouse ? (
                  <Typography variant="caption" display="block" color="text.secondary">
                    {b.pollyhouse}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell sx={{ fontSize: 11, whiteSpace: "nowrap" }}>
                {formatExpectedReadyDate(b.expectedReadyDate)}
              </TableCell>
              <TableCell sx={{ fontSize: 11 }}>{dayLabel}</TableCell>
              <TableCell align="right" sx={{ fontSize: 12, fontWeight: 700 }}>
                {fmt(b.plants ?? b.qty ?? 0)}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
