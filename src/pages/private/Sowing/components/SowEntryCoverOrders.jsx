import React from "react"
import { Box, Chip, Popover, Stack, Typography } from "@mui/material"

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

function dayLabel(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function orderPlantQty(order) {
  const covered = Number(order?.coveredPlants)
  if (order?.coveredPlants != null && Number.isFinite(covered)) return Math.max(0, covered)
  const n = Number(order?.plants)
  return Number.isFinite(n) ? n : 0
}

/** Plant total covered. Prefer explicit coverPlants (0 = show —); never invent cover from full order sizes. */
export function SowEntryCoverCell({ orders, coverPlants = null }) {
  const fromOrders = (orders || []).reduce((sum, order) => sum + orderPlantQty(order), 0)
  const hasBooked = coverPlants != null && coverPlants !== ""
  const booked = Number(coverPlants)
  const total = hasBooked
    ? (Number.isFinite(booked) && booked > 0 ? booked : 0)
    : fromOrders
  if (total < 1) return "—"
  return (
    <Box sx={{ textAlign: "right", lineHeight: 1.15 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: "#047857", fontVariantNumeric: "tabular-nums" }}>
        {fmt(total)}
      </Typography>
      {(orders || []).length > 0 ? (
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#0f766e" }}>
          {orders.length}
        </Typography>
      ) : null}
    </Box>
  )
}

export default function SowEntryCoverOrders({ anchor, title, orders, onClose }) {
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      onClick={(e) => e.stopPropagation()}
    >
      <Box sx={{ p: 1.25, minWidth: 260, maxWidth: 360 }}>
        <Typography fontWeight={900} fontSize={13} color="#047857" mb={1}>
          Orders covered · {orders.length}
          {title ? ` · ${title}` : ""}
        </Typography>
        <Stack spacing={0.6}>
          {orders.map((order) => {
            const dispatched =
              Boolean(order.dispatched) ||
              ["DISPATCHED", "DISPATCH_PROCESS", "COMPLETED", "PARTIALLY_COMPLETED"].includes(
                String(order.orderStatus || order.statusLabel || "").toUpperCase()
              ) ||
              String(order.statusLabel || "").toLowerCase() === "dispatched"
            return (
            <Box key={String(order.orderId || order.orderNumber)} sx={{ px: 0.25 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Typography fontWeight={800} fontSize={13}>
                  #{order.orderNumber || order.orderId} · {order.farmerName || "Farmer"}
                </Typography>
                {dispatched ? (
                  <Chip
                    size="small"
                    label="Dispatched"
                    sx={{
                      height: 18,
                      fontWeight: 800,
                      fontSize: "0.65rem",
                      bgcolor: "#dbeafe",
                      color: "#1d4ed8",
                    }}
                  />
                ) : null}
              </Stack>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                {fmt(orderPlantQty(order))} plants
                {order.bookingDate ? ` · booked ${dayLabel(order.bookingDate)}` : ""}
                {order.deliveryDate ? ` · delivery ${dayLabel(order.deliveryDate)}` : ""}
              </Typography>
            </Box>
            )
          })}
        </Stack>
      </Box>
    </Popover>
  )
}
