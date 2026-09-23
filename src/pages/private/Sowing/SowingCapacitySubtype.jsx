import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material"
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom"
import { NetworkManager, API } from "network/core"
import SowingCapacityDrawer from "./components/SowingCapacityDrawer"
import { fmt, rangeForPreset, STATUS_STYLE } from "./capacitySheetUtils"

export default function SowingCapacitySubtype() {
  const { plantId, subtypeId } = useParams()
  const [params] = useSearchParams()
  const fallback = rangeForPreset("14")
  const from = params.get("from") || fallback.from
  const to = params.get("to") || fallback.to
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [subtype, setSubtype] = useState(null)
  const [plantName, setPlantName] = useState("")
  const [slotId, setSlotId] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const instance = NetworkManager(API.sowing.GET_CAPACITY_SHEET)
        const res = await instance.request({}, { from, to, plantId, subtypeId })
        if (cancelled) return
        const plant = (res?.data?.plants || [])[0]
        const row = plant?.subtypes?.[0] || null
        setPlantName(plant?.plantName || "")
        setSubtype(row)
        if (!res?.data?.success) setError(res?.data?.message || "Could not load subtype")
        else if (!row) setError("No slots in this range")
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.message || err?.message || "Could not load subtype")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [from, to, plantId, subtypeId])

  const maxBar = useMemo(() => {
    const slots = subtype?.slots || []
    return Math.max(1, ...slots.map((s) => Math.max(s.booked, s.sowed)))
  }, [subtype])

  const status = STATUS_STYLE[subtype?.status] || STATUS_STYLE.fulfilled

  return (
    <Box p={3} sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <Button component={RouterLink} to={`/u/sowing-capacity`} sx={{ textTransform: "none", fontWeight: 700, mb: 1 }}>
        Back to capacity
      </Button>
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : null}
      {error && !subtype ? <Alert severity="info">{error}</Alert> : null}
      {subtype ? (
        <>
          <Typography variant="h5" fontWeight={800}>
            {plantName} · {subtype.subtypeName}
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {subtype.seedPlanLabel} · {from} → {to} · {status.label}
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap mb={3}>
            <Typography fontWeight={700} color="#c2410c">Gap {fmt(subtype.gap)}</Typography>
            <Typography fontWeight={700} color="#047857">Can book {fmt(subtype.canBook)}</Typography>
            <Typography fontWeight={700}>Booked {fmt(subtype.booked)}</Typography>
            <Typography fontWeight={700}>Sowed {fmt(subtype.sowed)}</Typography>
          </Stack>
          <Stack spacing={1.25}>
            {subtype.slots.map((slot) => (
              <Box
                key={slot.slotId}
                onClick={() => setSlotId(slot.slotId)}
                sx={{ p: 1.5, bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, cursor: "pointer" }}
              >
                <Stack direction="row" justifyContent="space-between" mb={1}>
                  <Typography fontWeight={800}>
                    {slot.startDay === slot.endDay ? slot.startDay : `${slot.startDay} → ${slot.endDay}`}
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {(STATUS_STYLE[slot.status] || STATUS_STYLE.fulfilled).label}
                  </Typography>
                </Stack>
                <Box sx={{ height: 10, bgcolor: "#e2e8f0", borderRadius: 99, overflow: "hidden", mb: 0.5 }}>
                  <Box sx={{ width: `${(slot.booked / maxBar) * 100}%`, height: "100%", bgcolor: "#94a3b8" }} />
                </Box>
                <Box sx={{ height: 10, bgcolor: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                  <Box sx={{ width: `${(slot.sowed / maxBar) * 100}%`, height: "100%", bgcolor: "#059669" }} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Gap {fmt(slot.gap)} · can book {fmt(slot.canBook)} · booked {fmt(slot.booked)} · sowed {fmt(slot.sowed)}
                </Typography>
              </Box>
            ))}
          </Stack>
        </>
      ) : null}
      <SowingCapacityDrawer slotId={slotId} onClose={() => setSlotId(null)} />
    </Box>
  )
}
