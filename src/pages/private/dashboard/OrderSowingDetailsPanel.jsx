import React from "react"
import {
  Alert,
  Box,
  Stack,
  Typography,
  Chip,
} from "@mui/material"
import OrderSowForm from "./OrderSowForm"
import OrderCoverExcessSection from "./OrderCoverExcessSection"
import { summarizePicks } from "../order/ExcessBatchCoverDialog"

const READY_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function readyDayLabel(value) {
  const m = String(value || "").match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!m) return value || "another date"
  const month = READY_MONTHS[Number(m[2]) - 1] || m[2]
  return `${Number(m[1])} ${month}`
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
            <strong>{Number(l.plants || 0).toLocaleString("en-IN")} plants</strong>
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
            <strong>{Number(s.plants || 0).toLocaleString("en-IN")} plants</strong>
          </Typography>
        )
      })}
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
          {sowingDoneRequestId ? (
            <Chip
              size="small"
              variant="outlined"
              label={`Req ${String(sowingDoneRequestId).slice(-8)}`}
            />
          ) : (
            <Chip size="small" variant="outlined" label="Direct sow / slot transfer" />
          )}
        </Stack>
        {coverSourcesBlock}
        {movedBlock}
        <Alert severity="success" sx={{ py: 0.75 }}>
          Marked <strong>sowingDone</strong>.
          {coverSources.length > 0
            ? " Plants taken from excess of the sowing entries above."
            : sowingDoneRequestId
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
