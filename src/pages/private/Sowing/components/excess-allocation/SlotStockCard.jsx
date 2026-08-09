import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import EventAvailableIcon from "@mui/icons-material/EventAvailable"
import { NetworkManager, API } from "network/core"
import { fmtNum, isSlotEmpty, slotStatusKind } from "./slotStockUtils"
import SlotStatGrid from "./SlotStatGrid"

const STATUS_META = {
  open: { label: "Open slot", color: "#64748b", bg: "#f8fafc", border: "#cbd5e1" },
  surplus: { label: "Surplus", color: "#166534", bg: "#f0fdf4", border: "#86efac" },
  gap: { label: "Need sow", color: "#92400e", bg: "#fffbeb", border: "#fcd34d" },
  mixed: { label: "Mixed", color: "#1d4ed8", bg: "#eff6ff", border: "#93c5fd" },
  balanced: { label: "Balanced", color: "#475569", bg: "#f1f5f9", border: "#cbd5e1" },
}

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
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const seedRow = useMemo(
    () => ({
      availablePlants: seedAvailable,
      totalBookedPlants: seedBooked,
      primarySowed: seedSowed,
      gap: seedGap,
    }),
    [seedAvailable, seedBooked, seedSowed, seedGap]
  )
  const emptySeed = isSlotEmpty(seedRow)

  const label =
    slotStartDay && slotEndDay && slotStartDay !== slotEndDay
      ? `${slotStartDay} → ${slotEndDay}`
      : slotStartDay || "—"

  const load = useCallback(async () => {
    if (!slotId || emptySeed) return
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
  }, [slotId, emptySeed])

  useEffect(() => {
    if (!expanded || emptySeed) {
      if (!expanded) setDetail(null)
      setLoading(false)
      return
    }
    load()
  }, [load, refreshKey, emptySeed, expanded])

  const summary = detail?.summary || {}
  const available =
    Number(summary.availableForSale ?? summary.availablePlants) ||
    Number(seedAvailable) ||
    0
  const booked = Number(summary.totalPlants) || Number(seedBooked) || 0
  const sowed = Number(summary.totalSowedPlants) || Number(seedSowed) || 0
  const gap =
    Number(summary.pendingPlants) ||
    Math.max(0, Number(seedGap) || Math.max(0, booked - sowed)) ||
    0
  const reserved = Number(summary.orderReservedPlants) || 0
  const covered = detail?.coveredOrders || []
  const pending = detail?.pendingOrders || []
  const sowedOnSlot = useMemo(
    () => (detail?.orders || []).filter((o) => o.sowingDone),
    [detail?.orders]
  )
  const batches = detail?.sowBatches || []

  const liveRow = { availablePlants: available, totalBookedPlants: booked, primarySowed: sowed, gap }
  const isEmpty = isSlotEmpty(liveRow) && pending.length === 0 && covered.length === 0
  const status = slotStatusKind(liveRow)
  const meta = STATUS_META[status] || STATUS_META.open

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
      sx={{
        borderRadius: 2,
        borderColor: meta.border,
        borderStyle: isEmpty ? "dashed" : "solid",
        bgcolor: meta.bg,
        height: "100%",
        minHeight: 168,
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: isEmpty ? "0 2px 8px rgba(100,116,139,0.12)" : "0 4px 14px rgba(0,0,0,0.06)" },
      }}
    >
      <CardContent sx={{ p: 1.25, "&:last-child": { pb: 1.25 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={0.5} mb={0.5}>
          <Box minWidth={0} flex={1}>
            {(plantName || subtypeName) && (
              <Typography variant="caption" color="text.secondary" fontWeight={700} noWrap display="block">
                {[plantName, subtypeName].filter(Boolean).join(" · ")}
              </Typography>
            )}
            <Typography fontWeight={900} fontSize="0.9rem" lineHeight={1.25}>
              {label}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={meta.label}
            sx={{
              height: 20,
              fontWeight: 800,
              fontSize: "0.62rem",
              bgcolor: "#fff",
              color: meta.color,
              border: `1px solid ${meta.border}`,
              flexShrink: 0,
            }}
          />
        </Stack>

        {loading && expanded && !emptySeed ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={2}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <>
            <SlotStatGrid available={available} booked={booked} sowed={sowed} gap={gap} />

            {reserved > 0 && (
              <Chip
                size="small"
                label={`Reserved ${fmtNum(reserved)}`}
                sx={{ mt: 0.75, height: 20, fontWeight: 700, bgcolor: "#dbeafe", color: "#1d4ed8" }}
              />
            )}

            {isEmpty && (
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                sx={{
                  mt: 1,
                  px: 1,
                  py: 0.75,
                  borderRadius: 1.25,
                  bgcolor: "#fff",
                  border: "1px dashed #cbd5e1",
                }}
              >
                <EventAvailableIcon sx={{ fontSize: 18, color: "#94a3b8" }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  No bookings or sow yet — ready to receive transfer or new sow
                </Typography>
              </Stack>
            )}

            {expanded && batches.length > 0 && (
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

            {expanded && (covered.length > 0 || sowedOnSlot.length > 0) && (
              <Box mt={1}>
                <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
                  <CheckCircleIcon sx={{ fontSize: 14, color: "#16a34a" }} />
                  <Typography variant="caption" fontWeight={800} color="success.main">
                    Sow complete ({Math.max(covered.length, sowedOnSlot.length)})
                  </Typography>
                </Stack>
                {(covered.length ? covered : sowedOnSlot).slice(0, 3).map((o) => (
                  <OrderLine key={o._id} order={o} variant="covered" />
                ))}
              </Box>
            )}

            {expanded && pending.length > 0 && (
              <Box mt={1}>
                <Stack direction="row" alignItems="center" spacing={0.5} mb={0.5}>
                  <WarningAmberIcon sx={{ fontSize: 14, color: "#d97706" }} />
                  <Typography variant="caption" fontWeight={800} color="warning.main">
                    Pending ({pending.length})
                  </Typography>
                </Stack>
                {pending.slice(0, 3).map((o) => {
                  const isPartial = o.partiallyCovered || (o.coveredPlants > 0 && !o.sowingDone)
                  return (
                    <OrderLine
                      key={o._id}
                      order={{ ...o, statusLabel: isPartial ? "Partial" : o.statusLabel }}
                      variant="pending"
                      canAct={canAssign}
                      onCover={handleCover}
                      onAssign={available > 0 ? handleAssignOne : null}
                    />
                  )
                })}
              </Box>
            )}

            {gap > 0 && available === 0 && pending.length > 0 && (
              <Typography variant="caption" color="warning.main" fontWeight={700} display="block" mt={0.75}>
                Short {fmtNum(gap)} — receive from nearby surplus (±4d)
              </Typography>
            )}
          </>
        )}

        {!expanded && !emptySeed && (
          <Button
            size="small"
            fullWidth
            variant="text"
            onClick={() => setExpanded(true)}
            sx={{ mt: 1, textTransform: "none", fontWeight: 800, fontSize: "0.72rem" }}
          >
            Load orders & actions
          </Button>
        )}

        {canAssign && !loading && (
          <Stack direction="row" spacing={0.5} mt={1.25} flexWrap="wrap" useFlexGap>
            {available > 0 && onSlotTransfer && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                onClick={() => onSlotTransfer({ slotId, slotLabel: label, mode: "out" })}
                sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.68rem", py: 0.25 }}
              >
                Move out
              </Button>
            )}
            {onSlotTransfer && (isEmpty || gap > 0 || available === 0) && (
              <Button
                size="small"
                variant={isEmpty ? "contained" : "outlined"}
                color={isEmpty ? "inherit" : "warning"}
                startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                onClick={() => onSlotTransfer({ slotId, slotLabel: label, mode: "in" })}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.68rem",
                  py: 0.25,
                  ...(isEmpty
                    ? { bgcolor: "#e2e8f0", color: "#334155", "&:hover": { bgcolor: "#cbd5e1" } }
                    : {}),
                }}
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
                sx={{ textTransform: "none", fontWeight: 800, fontSize: "0.68rem", py: 0.25 }}
              >
                Assign
              </Button>
            )}
            {onOpenDetail && !isEmpty && (
              <Button
                size="small"
                variant="text"
                onClick={() => onOpenDetail(slotId)}
                sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.68rem" }}
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
