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
  sowingPlan = null,
  plantId = null,
  subtypeId = null,
  deliveryDate = null,
  bookingSlotId = null,
  canEdit = false,
  onUpdated,
}) {
  const coverSources = Array.isArray(sowingCoverSources) ? sowingCoverSources : []
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
      {coverSources.map((s, idx) => {
        const off = Number(s.offsetDays) || 0
        const offLabel = off === 0 ? "delivery" : off > 0 ? `+${off}d` : `${off}d`
        return (
          <Typography key={s.batchId || idx} variant="caption" sx={{ display: "block" }}>
            Ready {s.plantReadyDate || "—"} ({offLabel})
            {s.sowingDate ? ` · sowed ${s.sowingDate}` : ""}
            {s.shedName ? ` · ${s.shedName}` : ""}
            {s.requestNumber ? ` · ${s.requestNumber}` : ""} ·{" "}
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
