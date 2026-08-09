import React from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Stack,
  Chip,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import OrderSowForm from "../../dashboard/OrderSowForm"

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

export default function PendingOrderSowDialog({
  open,
  order,
  canEdit = false,
  onClose,
  onSowed,
}) {
  if (!order) return null

  const sowingPlan =
    order.sowingPlan ||
    (order.seedSource || order.companySeedPackets || order.raisingSeedPackets
      ? {
          seedSource: order.seedSource,
          companySeedPackets: order.companySeedPackets,
          raisingSeedPackets: order.raisingSeedPackets,
        }
      : null)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6, pb: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography fontWeight={900}>
            Sow order #{order.orderNumber}
          </Typography>
          <Chip size="small" label={`${fmtNum(order.plants)} plants`} sx={{ fontWeight: 700 }} />
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {order.plantName} · {order.subtypeName}
          {order.farmerName ? ` · ${order.farmerName}` : ""}
        </Typography>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <OrderSowForm
          orderMongoId={order.orderId}
          plantId={order.plantId}
          subtypeId={order.subtypeId}
          plantsBooked={order.plants}
          deliveryDate={order.deliveryDate}
          sowingPlan={sowingPlan}
          canEdit={canEdit}
          onSowed={(data) => {
            onSowed?.(data)
            onClose?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
