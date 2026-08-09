import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Stack,
  Chip,
  Tabs,
  Tab,
  Paper,
  Button,
} from "@mui/material"

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

function fmtDay(d) {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return null
  }
}

const STATUS_SX = {
  need_sow: { bgcolor: "#fef3c7", color: "#92400e" },
  reserved_here: { bgcolor: "#dcfce7", color: "#166534" },
  reserved_elsewhere: { bgcolor: "#dbeafe", color: "#1d4ed8" },
}

function OrderCard({ o, onCover }) {
  const sx = STATUS_SX[o.statusKey] || STATUS_SX.need_sow
  const needSow = o.statusKey === "need_sow" || (!o.sowingDone && !o.statusKey)
  const mongoId = o._id || o.orderMongoId

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        borderColor:
          o.statusKey === "reserved_here"
            ? "#86efac"
            : needSow
              ? "#fde68a"
              : "#bfdbfe",
        bgcolor:
          o.statusKey === "reserved_here"
            ? "#f0fdf4"
            : needSow
              ? "#fffbeb"
              : "#eff6ff",
      }}
    >
      <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
        <Box minWidth={0}>
          <Typography fontWeight={800} fontSize="0.9rem" noWrap>
            #{o.orderId || o.orderNumber} · {o.farmerName || o.farmer?.name || "Farmer"}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {fmtNum(o.plants ?? (Number(o.numberOfPlants) || 0) + (Number(o.additionalPlants) || 0))}{" "}
            plants
            {fmtDay(o.deliveryDate) ? ` · delivery ${fmtDay(o.deliveryDate)}` : ""}
          </Typography>
          {o.bookingSlotLabel && !o.bookedOnThisSlot && (
            <Typography variant="caption" fontWeight={700} display="block" sx={{ mt: 0.25 }}>
              Booked: {o.bookingSlotLabel}
            </Typography>
          )}
          {o.statusKey === "reserved_elsewhere" && o.reservedOnReadyLabel && (
            <Typography variant="caption" fontWeight={700} display="block" sx={{ mt: 0.25, color: "#1d4ed8" }}>
              Reserved on {o.reservedOnReadyLabel}
            </Typography>
          )}
          {needSow && onCover && mongoId && (
            <Button
              size="small"
              variant="contained"
              color="success"
              onClick={(e) => {
                e.stopPropagation()
                onCover(o)
              }}
              sx={{ mt: 1, textTransform: "none", fontWeight: 800 }}
            >
              Cover from stock
            </Button>
          )}
        </Box>
        <Chip
          size="small"
          label={o.statusLabel || (o.sowingDone ? "Sowed" : "Need sow")}
          sx={{ height: 22, fontWeight: 800, fontSize: "0.65rem", ...sx }}
        />
      </Stack>
    </Paper>
  )
}

/**
 * Beautiful slot orders: Pending / Reserved (cross-slot) / All booked.
 */
export default function SlotOrdersPanel({
  summary = {},
  pendingOrders = [],
  coveredOrders = [],
  orders = [],
  initialTab = "pending",
  onTabChange,
  onCoverOrder,
}) {
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    setTab(initialTab || "pending")
  }, [initialTab])

  const pending = useMemo(
    () =>
      pendingOrders.length
        ? pendingOrders
        : (orders || []).filter((o) => !o.sowingDone),
    [pendingOrders, orders]
  )
  const covered = coveredOrders || []
  const allBooked = orders || []

  const list =
    tab === "reserved" ? covered : tab === "booked" ? allBooked : pending

  const emptyMsg =
    tab === "reserved"
      ? "No orders reserved on this ready slot yet."
      : tab === "booked"
        ? "No orders booked on this slot."
        : "No unsown orders — gap is clear for this slot."

  const setAndNotify = (next) => {
    setTab(next)
    onTabChange?.(next)
  }

  return (
    <Box>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        <Chip
          clickable
          size="small"
          label={`Reserved ${fmtNum(summary.orderReservedPlants || summary.coveredPlants || 0)}`}
          onClick={() => setAndNotify("reserved")}
          sx={{
            fontWeight: 800,
            bgcolor: tab === "reserved" ? "#166534" : "#dcfce7",
            color: tab === "reserved" ? "#fff" : "#166534",
          }}
        />
        <Chip
          size="small"
          color="success"
          variant="outlined"
          label={`Available (sale) ${fmtNum(summary.availableForSale ?? summary.availablePlants ?? 0)}`}
          sx={{ fontWeight: 800 }}
        />
        <Chip
          clickable
          size="small"
          label={`Pending sow ${fmtNum(summary.pendingPlants || 0)} · ${summary.pendingOrdersCount ?? pending.length}`}
          onClick={() => setAndNotify("pending")}
          sx={{
            fontWeight: 800,
            bgcolor: tab === "pending" ? "#b45309" : "#fef3c7",
            color: tab === "pending" ? "#fff" : "#92400e",
          }}
        />
        <Chip
          clickable
          size="small"
          label={`Covered ${summary.coveredOrdersCount ?? covered.length}`}
          onClick={() => setAndNotify("reserved")}
          sx={{
            fontWeight: 700,
            bgcolor: "#ecfdf5",
            color: "#065f46",
            border: "1px solid #a7f3d0",
          }}
        />
      </Stack>

      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        Gap = order plants still need sow (unsown only). Reserved = covered on this ready
        slot (order may be booked prev/next day). Available = saleable excess only.
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setAndNotify(v)}
        sx={{
          minHeight: 36,
          mb: 1.25,
          borderBottom: "1px solid #e2e8f0",
          "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 800 },
        }}
      >
        <Tab value="pending" label={`Pending (${pending.length})`} />
        <Tab value="reserved" label={`Reserved / covered (${covered.length})`} />
        <Tab value="booked" label={`All booked (${allBooked.length})`} />
      </Tabs>

      <Stack spacing={1} sx={{ maxHeight: 420, overflowY: "auto", pr: 0.5 }}>
        {list.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {emptyMsg}
          </Typography>
        ) : (
          list.map((o) => (
            <OrderCard
              key={String(o._id || o.orderId)}
              o={o}
              onCover={onCoverOrder}
            />
          ))
        )}
      </Stack>
    </Box>
  )
}
