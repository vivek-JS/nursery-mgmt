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
  sowingPlan = null,
  plantId = null,
  subtypeId = null,
  deliveryDate = null,
  bookingSlotId = null,
  canEdit = false,
  onUpdated,
}) {
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
        <Alert severity="success" sx={{ py: 0.75 }}>
          Marked <strong>sowingDone</strong>.
          {sowingDoneRequestId
            ? " Plants recorded on the ready-date slot from sow completion."
            : " Plants allocated to the ready-date slot or reserved from nearby saleable stock."}
        </Alert>
      </Box>
    )
  }

  return (
    <Box className="space-y-3">
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
