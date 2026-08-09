import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import { NetworkManager, API } from "network/core"
import { fmtNum } from "./slotStockUtils"

function OrderLine({ order, variant, canAct, onCover, onAssign }) {
  const plants = Number(order.plants || order.numberOfPlants) || 0
  const isPending = variant === "pending"
  return (
    <Box
      sx={{
        py: 0.5,
        px: 0.75,
        borderRadius: 1,
        bgcolor: isPending ? "#fffbeb" : "#f0fdf4",
        border: `1px solid ${isPending ? "#fde68a" : "#bbf7d0"}`,
        mb: 0.5,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={0.5}>
        <Box minWidth={0} flex={1}>
          <Typography variant="caption" fontWeight={800} display="block">
            #{order.orderId} · {fmtNum(plants)} plants
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap display="block">
            {order.farmerName || "Farmer"}
            {order.statusLabel ? ` · ${order.statusLabel}` : ""}
          </Typography>
        </Box>
        {canAct && isPending && (
          <Stack direction="row" spacing={0.25} flexShrink={0}>
            {onAssign && (
              <Button
                size="small"
                variant="contained"
                color="success"
                sx={{ minWidth: 0, px: 0.75, fontSize: "0.65rem", fontWeight: 800, textTransform: "none" }}
                onClick={() => onAssign(order)}
              >
                Assign
              </Button>
            )}
            {onCover && (
              <Button
                size="small"
                variant="outlined"
                sx={{ minWidth: 0, px: 0.75, fontSize: "0.65rem", fontWeight: 700, textTransform: "none" }}
                onClick={() => onCover(order)}
              >
                Cover
              </Button>
            )}
          </Stack>
        )}
        {!isPending && (
          <CheckCircleIcon sx={{ fontSize: 16, color: "#16a34a", mt: 0.25 }} />
        )}
      </Stack>
    </Box>
  )
}

/**
 * Full slot card: available · gap · booked · sowed · covered · pending orders + actions.
 */
export default function SlotStockCard({
  slotId,
  slotStartDay,
  slotEndDay,
  availablePlants: seedAvailable = 0,
  totalBookedPlants: seedBooked = 0,
  primarySowed: seedSowed = 0,
  gap: seedGap = 0,
  plantName,
  subtypeName,
  plantId,
  subtypeId,
  canAssign = false,
  refreshKey = 0,
  onAssign,
  onCoverOrder,
  onSlotTransfer,
  onOpenDetail,
}) {
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState(null)

  const label =
    slotStartDay && slotEndDay && slotStartDay !== slotEndDay
      ? `${slotStartDay} → ${slotEndDay}`
      : slotStartDay || "—"

  const load = useCallback(async () => {
    if (!slotId) return
    setLoading(true)
    try {
      const instance = NetworkManager(API.sowing.GET_SLOT_ORDERS_SUMMARY)
      const res = await instance.request({}, [slotId])
      setDetail(res?.data?.success ? res.data : null)
    } catch {
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [slotId])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const summary = detail?.summary || {}
  const available =
    Number(summary.availableForSale ?? summary.availablePlants) ||
    Number(seedAvailable) ||
    0
  const booked = Number(summary.totalPlants) || Number(seedBooked) || 0
  const sowed =
    Number(summary.totalSowedPlants) ||
    Number(seedSowed) ||
    0
  const gap =
    Number(summary.pendingPlants) ||
    Math.max(0, Number(seedGap) || booked - sowed) ||
    0
  const reserved = Number(summary.orderReservedPlants) || 0
  const covered = detail?.coveredOrders || []
  const pending = detail?.pendingOrders || []
  const sowedOnSlot = useMemo(
    () => (detail?.orders || []).filter((o) => o.sowingDone),
    [detail?.orders]
  )
  const batches = detail?.sowBatches || []

  const borderColor =
    available > 0 ? "#86efac" : gap > 0 ? "#fcd34d" : sowed > 0 ? "#93c5fd" : "#e2e8f0"
  const bgColor =
    available > 0 ? "#f0fdf4" : gap > 0 ? "#fffbeb" : sowed > 0 ? "#eff6ff" : "#fafafa"

  const handleCover = (order) => {
    onCoverOrder?.({
      orderMongoId: order._id,
      orderId: order.orderId,
      plantId,
      subtypeId,
    })
  }

  const handleAssignOne = () => {
    onAssign?.({
      slotId,
      slotLabel: label,
      availablePlants: available,
      plantId,
      subtypeId,
    })
  }

  return (
    <Card
      variant="outlined"
      sx={{ borderRadius: 2, borderColor, bgcolor: bgColor, height: "100%" }}
    >
      <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
        {(plantName || subtypeName) && (
          <Typography variant="caption" color="text.secondary" fontWeight={700} noWrap display="block">
            {[plantName, subtypeName].filter(Boolean).join(" · ")}
          </Typography>
        )}
        <Typography fontWeight={800} fontSize="0.95rem">
          {label}
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={22} />
          </Box>
        ) : (
          <>
            <Stack direction="row" spacing={0.4} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Chip size="small" label={`Avail ${fmtNum(available)}`} sx={{ fontWeight: 800, bgcolor: "#dcfce7", color: "#166534" }} />
              {gap > 0 && (
                <Chip size="small" label={`Gap ${fmtNum(gap)}`} sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e" }} />
              )}
              {booked > 0 && (
                <Chip size="small" variant="outlined" label={`Booked ${fmtNum(booked)}`} />
              )}
              {sowed > 0 && (
                <Chip size="small" variant="outlined" label={`Sowed ${fmtNum(sowed)}`} />
              )}
              {reserved > 0 && (
                <Chip size="small" label={`Reserved ${fmtNum(reserved)}`} sx={{ bgcolor: "#dbeafe", color: "#1d4ed8", fontWeight: 700 }} />
              )}
            </Stack>

            {batches.length > 0 && (
              <Box mt={1}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  Sowing ({batches.length})
                </Typography>
                {batches.slice(0, 2).map((b, i) => (
                  <Typography key={i} variant="caption" display="block" color="text.secondary">
                    {b.sowingDate || "—"} · {fmtNum(b.plantsSowed)} plants
                  </Typography>
                ))}
              </Box>
            )}

            <Divider sx={{ my: 1 }} />

            {(covered.length > 0 || sowedOnSlot.length > 0) && (
              <Box mb={1}>
                <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
                  <CheckCircleIcon sx={{ fontSize: 14, color: "#16a34a" }} />
                  <Typography variant="caption" fontWeight={800} color="success.main">
                    Sow complete ({Math.max(covered.length, sowedOnSlot.length)})
                  </Typography>
                </Stack>
                {(covered.length ? covered : sowedOnSlot).slice(0, 4).map((o) => (
                  <OrderLine key={o._id} order={o} variant="covered" />
                ))}
              </Box>
            )}

            {pending.length > 0 && (
              <Box mb={1}>
                <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
                  <WarningAmberIcon sx={{ fontSize: 14, color: "#d97706" }} />
                  <Typography variant="caption" fontWeight={800} color="warning.main">
                    Need sow ({pending.length}) · {fmtNum(gap)} gap
                  </Typography>
                </Stack>
                {pending.slice(0, 5).map((o) => (
                  <OrderLine
                    key={o._id}
                    order={o}
                    variant="pending"
                    canAct={canAssign}
                    onCover={handleCover}
                    onAssign={available > 0 ? handleAssignOne : null}
                  />
                ))}
              </Box>
            )}

            {pending.length === 0 && covered.length === 0 && sowed === 0 && available === 0 && (
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Empty slot — receive transfer or cover orders from other slots
              </Typography>
            )}
          </>
        )}

        {canAssign && !loading && (
          <Stack direction="row" spacing={0.5} mt={1} flexWrap="wrap" useFlexGap>
            {available > 0 && onSlotTransfer && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                onClick={() => onSlotTransfer({ slotId, slotLabel: label, mode: "out" })}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.7rem" }}
              >
                Move out
              </Button>
            )}
            {(gap > 0 || available === 0) && onSlotTransfer && (
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                onClick={() => onSlotTransfer({ slotId, slotLabel: label, mode: "in" })}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.7rem" }}
              >
                Receive in
              </Button>
            )}
            {available > 0 && onAssign && (
              <Button
                size="small"
                variant="contained"
                color="success"
                onClick={handleAssignOne}
                sx={{ textTransform: "none", fontWeight: 800, fontSize: "0.7rem" }}
              >
                Assign & mark sow
              </Button>
            )}
            {onOpenDetail && (
              <Button
                size="small"
                variant="text"
                onClick={() => onOpenDetail(slotId)}
                sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.7rem" }}
              >
                Details
              </Button>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  )
}
