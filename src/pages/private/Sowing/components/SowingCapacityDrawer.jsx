import React, { useEffect, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Typography,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import { Link as RouterLink } from "react-router-dom"
import { NetworkManager, API } from "network/core"
import { fmt, STATUS_STYLE } from "../capacitySheetUtils"

function Stat({ label, value, color }) {
  return (
    <Box sx={{ minWidth: 88 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
      <Typography fontWeight={800} color={color || "text.primary"}>
        {fmt(value)}
      </Typography>
    </Box>
  )
}

export default function SowingCapacityDrawer({ slotId, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!slotId) {
      setData(null)
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const instance = NetworkManager(API.sowing.GET_CAPACITY_SLOT)
        const res = await instance.request({}, [slotId])
        if (cancelled) return
        if (res?.data?.success) setData(res.data)
        else setError(res?.data?.message || "Could not load this slot")
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || "Could not load this slot")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slotId])

  const slot = data?.slot
  const status = STATUS_STYLE[slot?.status] || STATUS_STYLE.fulfilled

  return (
    <Drawer anchor="right" open={Boolean(slotId)} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 440 } } }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={800}>
              Slot
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {slot ? `${slot.plantName} · ${slot.subtypeName}` : "Capacity"}
            </Typography>
            {slot ? (
              <Typography variant="body2" color="text.secondary">
                {slot.startDay} → {slot.endDay}
              </Typography>
            ) : null}
          </Box>
          <IconButton onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Stack>

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={28} />
          </Box>
        ) : null}
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}

        {slot && !loading ? (
          <>
            <Chip size="small" label={status.label} sx={{ mt: 1.5, fontWeight: 800, bgcolor: status.bg, color: status.color }} />
            <Stack direction="row" flexWrap="wrap" gap={1.5} mt={2}>
              <Stat label="Gap" value={slot.gap} color="#c2410c" />
              <Stat label="Can book" value={slot.canBook} color="#047857" />
              <Stat label="Booked" value={slot.booked} />
              <Stat label="Sowed" value={slot.sowed} color="#059669" />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Can book is sowed plants left after order cover.
            </Typography>

            <Divider sx={{ my: 2 }} />
            <Typography fontWeight={800} mb={1}>
              Orders on this booking slot
            </Typography>
            {(data.orders || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No farmer orders booked on this slot.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {data.orders.map((order) => (
                  <Box key={order.orderId} sx={{ p: 1.25, borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontWeight={700} fontSize="0.85rem">
                        #{order.orderNumber} · {order.farmerName || "Farmer"}
                      </Typography>
                      <Typography fontWeight={800}>{fmt(order.plants)}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {order.seedPlan}
                      {order.sowingDone ? " · sowing done" : " · need sow"}
                      {order.farmerMobile ? ` · ${order.farmerMobile}` : ""}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography fontWeight={800} mb={1}>
              Sowing batches
            </Typography>
            {(data.batches || []).length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No sowing batch on this slot yet.
              </Typography>
            ) : (
              <Stack spacing={1}>
                {data.batches.map((batch, i) => (
                  <Box key={`${batch.requestNumber}-${i}`} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <Typography fontWeight={700} fontSize="0.85rem">
                      {batch.requestNumber || "Batch"} · {fmt(batch.plantsSowed)} plants
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Sow {batch.sowingDate || "—"} · ready {batch.plantReadyDate || "—"} · packets {fmt(batch.packetsUsed)} · covered {fmt(batch.orderCoveredPlants)} · excess {fmt(batch.excessPlants)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={1} mt={3}>
              <Button component={RouterLink} to="/u/dashboard" variant="outlined" sx={{ textTransform: "none", fontWeight: 700 }}>
                Add order
              </Button>
              <Button component={RouterLink} to="/u/admin-direct-sow" variant="contained" color="success" sx={{ textTransform: "none", fontWeight: 800 }}>
                Direct sow
              </Button>
            </Stack>
          </>
        ) : null}
      </Box>
    </Drawer>
  )
}
