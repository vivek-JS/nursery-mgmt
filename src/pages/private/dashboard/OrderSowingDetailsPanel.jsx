import React, { useEffect, useState } from "react"
import {
  Alert,
  Box,
  Stack,
  Typography,
  Chip,
  CircularProgress,
} from "@mui/material"
import OrderSowForm from "./OrderSowForm"
import OrderCoverExcessSection from "./OrderCoverExcessSection"
import { summarizePicks } from "../order/ExcessBatchCoverDialog"
import { NetworkManager, API } from "network/core"

const READY_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function readyDayLabel(value) {
  const s = String(value || "").trim()
  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) {
    const month = READY_MONTHS[Number(dmy[2]) - 1] || dmy[2]
    return `${Number(dmy[1])} ${month}`
  }
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) {
    const month = READY_MONTHS[Number(ymd[2]) - 1] || ymd[2]
    return `${Number(ymd[3])} ${month}`
  }
  return s || "another date"
}

function formatDoneAt(value) {
  if (!value) return "—"
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(value)
  }
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

function requestIdParam(value) {
  if (!value) return null
  if (typeof value === "object") return value._id || value.id || null
  return String(value)
}

/**
 * Order sowing tab: record physical sow (batch, packets, date → ready slot)
 * or optionally reserve from existing saleable stock on delivery −4d…0.
 */
export default function OrderSowingDetailsPanel({
  orderMongoId,
  plantsBooked = 0,
  sowingDone = false,
  sowingDoneAt = null,
  sowingDoneRequestId = null,
  sowingCoverSources = [],
  sowingCoverReversedAt = null,
  sowBatchLinks = [],
  sowingPlan = null,
  plantId = null,
  subtypeId = null,
  deliveryDate = null,
  bookingSlotId = null,
  canEdit = false,
  onUpdated,
}) {
  const coverSources = Array.isArray(sowingCoverSources) ? sowingCoverSources : []
  const activeCover =
    coverSources.length > 0 && !sowingCoverReversedAt ? coverSources : []
  const reqId = requestIdParam(sowingDoneRequestId)
  const [sowEntry, setSowEntry] = useState(null)
  const [sowEntryLoading, setSowEntryLoading] = useState(false)

  useEffect(() => {
    if (!sowingDone || !reqId) {
      setSowEntry(null)
      setSowEntryLoading(false)
      return undefined
    }
    let cancelled = false
    setSowEntryLoading(true)
    ;(async () => {
      try {
        const instance = NetworkManager(API.sowing.GET_SOWING_REQUEST_BY_ID)
        const response = await instance.request({}, [reqId])
        if (cancelled) return
        if (!response?.data?.success) {
          setSowEntry(null)
          return
        }
        const data = response.data.data || {}
        const doneEv = (data.completionEvents || []).find((e) => e.type === "SOW_COMPLETED")
        const meta = doneEv?.meta || {}
        setSowEntry({
          requestNumber: data.requestNumber || null,
          plants: Number(data.sowedQuantity) || 0,
          shedName: data.shedName || meta.shedName || "",
          completedAt: data.sowingCompletedDate || sowingDoneAt,
          readyDate: meta.readyDate || meta.plantReadyDate || null,
          sowDate: meta.sowDate || meta.sowingDate || null,
          excessPlants: Number(meta.excessPlants) || 0,
          orderCoveredPlants:
            Number(meta.orderCoveredPlants) ||
            Math.max(0, (Number(data.sowedQuantity) || 0) - (Number(meta.excessPlants) || 0)),
          isExcessive: Boolean(data.isExcessiveSowing),
        })
      } catch {
        if (!cancelled) setSowEntry(null)
      } finally {
        if (!cancelled) setSowEntryLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [sowingDone, reqId, sowingDoneAt])

  const movedLinks = (Array.isArray(sowBatchLinks) ? sowBatchLinks : []).filter(
    (l) => l?.reason === "DISPATCH_RELINK" && Number(l.plants) > 0
  )
  const movedBlock = movedLinks.length > 0 && (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        border: "1px solid #2563eb",
        bgcolor: "#eff6ff",
      }}
    >
      <Typography variant="body2" fontWeight={800} mb={0.5}>
        Moved for a dispatch
      </Typography>
      {movedLinks.map((l, i) => {
        const code = l.causedByOrderCode || (l.causedByOrderId ? String(l.causedByOrderId).slice(-6) : "")
        return (
          <Typography key={`${l.batchId || i}-${l.at || i}`} variant="caption" sx={{ display: "block" }}>
            Moved to {readyDayLabel(l.plantReadyDate)} for dispatch of #{code || "—"} ·{" "}
            <strong>{fmtNum(l.plants)} plants</strong>
          </Typography>
        )
      })}
    </Box>
  )
  const coverSourcesBlock = coverSources.length > 0 && (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        border: `1px solid ${sowingCoverReversedAt ? "#f59e0b" : "#16a34a"}`,
        bgcolor: sowingCoverReversedAt ? "#fffbeb" : "#f0fdf4",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap" useFlexGap>
        <Typography variant="body2" fontWeight={800}>
          Covered from excess sowing
        </Typography>
        {sowingCoverReversedAt && (
          <Chip
            size="small"
            color="warning"
            label={`Cover reversed · ${formatDoneAt(sowingCoverReversedAt)}`}
            sx={{ fontWeight: 700 }}
          />
        )}
      </Stack>
      {summarizePicks(coverSources).map((s) => {
        const off = Number(s.offsetDays) || 0
        const offLabel = off === 0 ? "delivery" : off > 0 ? `+${off}d` : `${off}d`
        return (
          <Typography key={s.key} variant="caption" sx={{ display: "block" }}>
            Sowed {s.sowingDate || "—"} · ready {s.plantReadyDate || "—"} ({offLabel})
            {s.shedName ? ` · ${s.shedName}` : ""} ·{" "}
            <strong>{fmtNum(s.plants)} plants</strong>
          </Typography>
        )
      })}
    </Box>
  )

  const sowEntryBlock = sowingDone && reqId && (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1.5,
        border: "1px solid #16a34a",
        bgcolor: "#f0fdf4",
      }}
    >
      <Typography variant="body2" fontWeight={800} mb={0.5}>
        Sowing entry
      </Typography>
      {sowEntryLoading && (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={14} />
          <Typography variant="caption">Loading sowing request…</Typography>
        </Stack>
      )}
      {!sowEntryLoading && sowEntry && (
        <>
          <Typography variant="caption" sx={{ display: "block" }}>
            {sowEntry.requestNumber || "Request"} · sowed{" "}
            <strong>{fmtNum(sowEntry.plants)}</strong>
            {sowEntry.orderCoveredPlants > 0
              ? ` · covered ${fmtNum(sowEntry.orderCoveredPlants)}`
              : ""}
            {sowEntry.excessPlants > 0 ? ` · excess ${fmtNum(sowEntry.excessPlants)}` : ""}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            {sowEntry.sowDate ? `Sow ${sowEntry.sowDate} · ` : ""}
            ready {sowEntry.readyDate ? readyDayLabel(sowEntry.readyDate) : "—"}
            {sowEntry.shedName ? ` · ${sowEntry.shedName}` : ""}
          </Typography>
        </>
      )}
      {!sowEntryLoading && !sowEntry && (
        <Typography variant="caption" color="text.secondary">
          Request linked, but entry details could not be loaded.
        </Typography>
      )}
    </Box>
  )

  if (sowingDone) {
    return (
      <Box className="space-y-3">
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip label="Sow completed" color="success" size="small" sx={{ fontWeight: 700 }} />
          <Typography variant="body2" color="text.secondary">
            {formatDoneAt(sowingDoneAt)}
          </Typography>
          {reqId ? (
            <Chip
              size="small"
              variant="outlined"
              label={
                sowEntry?.requestNumber
                  ? sowEntry.requestNumber
                  : `Req ${String(reqId).slice(-8)}`
              }
            />
          ) : (
            <Chip size="small" variant="outlined" label="Direct sow / slot transfer" />
          )}
        </Stack>
        {sowEntryBlock}
        {coverSourcesBlock}
        {movedBlock}
        <Alert severity="success" sx={{ py: 0.75 }}>
          Marked <strong>sowingDone</strong>.
          {activeCover.length > 0
            ? " Plants taken from excess of the sowing entries above."
            : reqId
              ? " Plants recorded on the ready-date slot from sow completion."
              : " Plants allocated to the ready-date slot or reserved from nearby saleable stock."}
        </Alert>
      </Box>
    )
  }

  return (
    <Box className="space-y-3">
      {coverSourcesBlock}
      {movedBlock}
      <OrderSowForm
        orderMongoId={orderMongoId}
        plantId={plantId}
        subtypeId={subtypeId}
        plantsBooked={plantsBooked}
        deliveryDate={deliveryDate}
        sowingPlan={sowingPlan}
        canEdit={canEdit}
        onSowed={onUpdated}
      />

      <OrderCoverExcessSection
        orderMongoId={orderMongoId}
        plantsBooked={plantsBooked}
        bookingSlotId={bookingSlotId}
        canEdit={canEdit}
        onUpdated={onUpdated}
      />
    </Box>
  )
}
