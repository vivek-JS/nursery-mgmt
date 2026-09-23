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

function formatWhen(value) {
  if (!value) return "—"
  const text = String(value)
  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) return text
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return text
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
}

export default function SowingCapacityDrawer({ detail, onClose }) {
  const slotIds = detail?.slotIds || []
  const slotKey = slotIds.join("|")
  const focus = detail?.focus || "slot"
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [packs, setPacks] = useState([])

  useEffect(() => {
    if (!slotIds.length) {
      setPacks([])
      return undefined
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const rows = await Promise.all(
          slotIds.map(async (slotId) => {
            const instance = NetworkManager(API.sowing.GET_CAPACITY_SLOT)
            const res = await instance.request({}, [slotId])
            if (!res?.data?.success) throw new Error(res?.data?.message || "Could not load this slot")
            return res.data
          })
        )
        if (!cancelled) setPacks(rows)
      } catch (err) {
        if (!cancelled) {
          setPacks([])
          setError(err?.response?.data?.message || err?.message || "Could not load this slot")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slotKey])

  const slot = packs[0]?.slot
  const totals = packs.reduce(
    (acc, pack) => ({
      canBook: acc.canBook + (Number(pack.slot?.canBook) || 0),
      gap: acc.gap + (Number(pack.slot?.gap) || 0),
      booked: acc.booked + (Number(pack.slot?.booked) || 0),
      sowed: acc.sowed + (Number(pack.slot?.sowed) || 0),
    }),
    { canBook: 0, gap: 0, booked: 0, sowed: 0 }
  )
  const stats = packs.length > 1 ? totals : slot || totals
  const status = STATUS_STYLE[slot?.status] || STATUS_STYLE.fulfilled
  const orders = packs.flatMap((pack) =>
    (pack.orders || []).map((order) => ({
      ...order,
      slotLabel: pack.slot ? `${pack.slot.startDay} → ${pack.slot.endDay}` : "",
    }))
  )
  const gapOrders = orders.filter((order) => !order.sowingDone)
  const shownOrders = focus === "gap" && gapOrders.length ? gapOrders : orders
  const lagwadEntries = packs.flatMap((pack) => {
    const rows = pack.lagwadEntries?.length ? pack.lagwadEntries : (pack.batches || []).filter((batch) => Number(batch.excessPlants) > 0)
    return rows.map((entry) => ({
      ...entry,
      slotLabel: pack.slot ? `${pack.slot.startDay} → ${pack.slot.endDay}` : "",
      subtypeName: pack.slot?.subtypeName || "",
    }))
  })
  const title =
    focus === "gap" ? "Orders on this booking slot" : focus === "canBook" ? "Lagwad excess" : slot ? `${slot.plantName} · ${slot.subtypeName}` : "Capacity"

  return (
    <Drawer anchor="right" open={slotIds.length > 0} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 460 } } }}>
      <Box sx={{ p: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={800}>
              {focus === "gap" ? "Gap" : focus === "canBook" ? "Can book" : "Slot"}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {title}
            </Typography>
            {slot && focus !== "slot" ? (
              <Typography variant="body2" color="text.secondary">
                {slot.plantName} · {slot.subtypeName}
              </Typography>
            ) : null}
            {slot && packs.length === 1 ? (
              <Typography variant="body2" color="text.secondary">
                {slot.startDay} → {slot.endDay}
              </Typography>
            ) : packs.length > 1 ? (
              <Typography variant="body2" color="text.secondary">
                {packs.length} slots in this range
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
              <Stat label="Can book" value={stats.canBook} color={Number(stats.canBook) < 0 ? "#e11d48" : "#047857"} />
              <Stat label="Gap" value={stats.gap} color="#e11d48" />
              <Stat label="Booked" value={stats.booked} />
              <Stat label="Sowed" value={stats.sowed} color="#059669" />
            </Stack>
            <Typography variant="caption" color="text.secondary" display="block" mt={1}>
              Can book is excess minus gap. A minus means the gap is higher and more sowing is needed.
            </Typography>

            {focus !== "canBook" ? (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={800} mb={1}>
                  Orders on this booking slot
                </Typography>
                {shownOrders.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No farmer orders booked on this slot.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {shownOrders.map((order) => (
                      <Box key={`${order.orderId}-${order.slotLabel}`} sx={{ p: 1.25, borderRadius: 1.5, border: "1px solid #e2e8f0" }}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography fontWeight={700} fontSize="0.85rem">
                            #{order.orderNumber} · {order.farmerName || "Farmer"}
                          </Typography>
                          <Typography fontWeight={800}>{fmt(order.plants)}</Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Booking {formatWhen(order.bookingDate)} · Delivery {formatWhen(order.deliveryDate)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {order.seedPlan}
                          {order.sowingDone ? " · sowing done" : " · need sow"}
                          {order.slotLabel ? ` · ${order.slotLabel}` : ""}
                          {order.farmerMobile ? ` · ${order.farmerMobile}` : ""}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </>
            ) : null}

            {focus !== "gap" ? (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography fontWeight={800} mb={1}>
                  Lagwad excess
                </Typography>
                {lagwadEntries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No lagwad entry with excess plants on this slot.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {lagwadEntries.map((entry, index) => (
                      <Box key={`${entry.requestNumber}-${entry.slotLabel}-${index}`} sx={{ p: 1.25, borderRadius: 1.5, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <Typography fontWeight={700} fontSize="0.85rem">
                          {entry.requestNumber || "Lagwad"} · excess {fmt(entry.excessPlants)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Sow {entry.sowingDate || "—"} · ready {entry.plantReadyDate || "—"}
                          {entry.slotLabel ? ` · ${entry.slotLabel}` : ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Sowed {fmt(entry.plantsSowed)} · covered {fmt(entry.orderCoveredPlants)} · sellable 90% {fmt(entry.actualPlantsApplied)} · reserve 10% {fmt(entry.expectedMortalityApplied)}
                          {entry.shedName ? ` · ${entry.shedName}` : ""}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </>
            ) : null}

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
