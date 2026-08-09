import React, { useEffect, useMemo, useState } from "react"
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
  Divider,
  Chip,
  Alert,
  Button,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import { NetworkManager, API } from "network/core"
import SeedPlanChip from "./SeedPlanChip"
import { fmt } from "./sowingPackingUtils"

/**
 * Orders linked / covered by an active or completed sowing request.
 * Includes ±4d cover-window orders (and excess requests that still covered farmers).
 */
export default function SowingLinkedOrdersDrawer({
  open,
  onClose,
  card,
  canCoverFromStock = false,
  onCoverOrder,
}) {
  const req = card?.activeRequest || card?.pendingRequest || null
  const linkedIds = useMemo(
    () => (req?.linkedOrderIds || []).map(String).filter(Boolean),
    [req?.linkedOrderIds]
  )
  const flaggedExcess =
    Boolean(req?.isExcessiveSowing) || Boolean(card?.isExcessiveSowing)
  const pureExcess = flaggedExcess && linkedIds.length === 0

  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const linkedKey = linkedIds.join(",")

  useEffect(() => {
    if (!open || !card || pureExcess) {
      setRows([])
      return
    }
    if (!linkedIds.length) {
      setRows([])
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const instance = NetworkManager(API.sowing.GET_ORDER_WISE_SOWING)
        const res = await instance.request(
          {},
          {
            plantId: card.plantId,
            subtypeId: card.subtypeId,
            orderIds: linkedIds.join(","),
          }
        )
        if (cancelled) return
        const data = res?.data?.data || []
        setRows(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, card, pureExcess, linkedKey, linkedIds])

  const pkts =
    Number(req?.packetsRequested) || Number(card?.totalPacketsInProgress) || 0

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}
    >
      <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {pureExcess ? "Excess sowing" : "Covered orders"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {card?.plantName} · {card?.subtypeName}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {req?.requestNumber || "—"}
          {pkts > 0 ? ` · ${fmt(pkts, 2)} pkt` : ""}
          {req?.status ? ` · ${req.status}` : ""}
        </Typography>
        <Divider sx={{ mb: 1.5 }} />

        {pureExcess ? (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: "#fef3c7",
              border: "1.5px solid #fbbf24",
              textAlign: "center",
            }}
          >
            <Chip
              label="EXCESS"
              sx={{
                mb: 1.5,
                fontWeight: 900,
                bgcolor: "#f59e0b",
                color: "#fff",
                fontSize: "0.85rem",
                height: 32,
              }}
            />
            <Typography fontWeight={800} color="#92400e" gutterBottom>
              Excessive sowing — no farmer orders covered yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Surplus / buffer stock. Nearby orders (±4d of ready date) are covered
              automatically when capacity allows at complete.
            </Typography>
            {pkts > 0 && (
              <Typography mt={1.5} fontWeight={700} color="#b45309">
                {fmt(pkts, 2)} packets issued for excess
              </Typography>
            )}
          </Box>
        ) : loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : rows.length === 0 ? (
          <Alert severity="info">
            {linkedIds.length
              ? "Linked covered orders could not be loaded."
              : "No orders linked to this request yet."}
          </Alert>
        ) : (
          <Stack spacing={1.25} sx={{ flex: 1, overflow: "auto", pb: 2 }}>
            {flaggedExcess && (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                Excess request — still covered {rows.length} order
                {rows.length === 1 ? "" : "s"} in ready-date ±4d window.
              </Alert>
            )}
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {rows.length} order{rows.length === 1 ? "" : "s"} covered by this sowing
              {" · "}ready-date ±4d
            </Typography>
            {rows.map((o) => (
              <Box
                key={String(o.orderId)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: "1px solid #bfdbfe",
                  bgcolor: o.sowingDone ? "#ecfdf5" : "#eff6ff",
                }}
              >
                <Stack direction="row" justifyContent="space-between" gap={1} alignItems="flex-start">
                  <Typography fontWeight={700} variant="body2">
                    #{o.orderNumber} · {o.farmerName || "Farmer"}
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    {o.sowingDone ? (
                      <Chip
                        size="small"
                        label="sowed"
                        sx={{
                          height: 20,
                          fontWeight: 800,
                          fontSize: "0.65rem",
                          bgcolor: "#bbf7d0",
                          color: "#166534",
                        }}
                      />
                    ) : canCoverFromStock && onCoverOrder ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        onClick={() => onCoverOrder(String(o.orderId || o._id || o.orderMongoId))}
                        sx={{ textTransform: "none", fontWeight: 700, py: 0, minHeight: 24 }}
                      >
                        Cover
                      </Button>
                    ) : null}
                  </Stack>
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block">
                  {o.numberOfPlants} plants
                  {o.suggestedPackets != null ? ` · ~${o.suggestedPackets} pkt` : ""}
                </Typography>
                {(o.deliveryDate || o.sowByDate) && (
                  <Typography variant="caption" fontWeight={700} display="block" sx={{ mt: 0.25 }}>
                    {o.deliveryDate
                      ? `Delivery: ${new Date(o.deliveryDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}`
                      : ""}
                    {o.sowByDate ? ` · sow by ${o.sowByDate}` : ""}
                  </Typography>
                )}
                <Box mt={0.75} display="flex" flexWrap="wrap" gap={0.5}>
                  <SeedPlanChip
                    seedSource={o.sowingPlan?.seedSource}
                    companyPackets={o.sowingPlan?.companySeedPackets}
                    raisingPackets={o.sowingPlan?.raisingSeedPackets}
                  />
                  {o.raisingInHandPackets > 0 && (
                    <Chip
                      size="small"
                      label={`${o.raisingInHandPackets} cust. in hand`}
                      sx={{ height: 22, bgcolor: "#fff8e1" }}
                    />
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}
