import React, { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import { NetworkManager, API } from "network/core"
import { fmt } from "../capacitySheetUtils"

const COLORS = {
  papaya: "#ca8a04",
  watermelon: "#16a34a",
  muskmelon: "#0f766e",
  vacant: "#e2e8f0",
  ink: "#0f172a",
  muted: "#64748b",
}

function pct(part, whole) {
  if (!(whole > 0)) return 0
  return (Number(part) || 0) / whole
}

function pctLabel(value) {
  const n = Number(value) || 0
  if (!Number.isFinite(n)) return "—"
  return `${Math.round(n * 1000) / 10}%`
}

function Bar({ shed }) {
  const used = Number(shed.used) || 0
  const scale = used > 1 ? 1 / used : 1
  const segments = [
    { key: "papaya", label: "Papaya", color: COLORS.papaya, width: pct(shed.papayaOccupied, shed.papayaMax) * scale * 100 },
    { key: "watermelon", label: "Watermelon", color: COLORS.watermelon, width: pct(shed.watermelon?.occupied, shed.melonMax) * scale * 100 },
    { key: "muskmelon", label: "Muskmelon", color: COLORS.muskmelon, width: pct(shed.muskmelon?.occupied, shed.melonMax) * scale * 100 },
  ]
  const usedWidth = segments.reduce((sum, seg) => sum + seg.width, 0)
  const vacantWidth = Math.max(0, 100 - usedWidth)
  return (
    <Box>
      <Stack direction="row" sx={{ height: 14, borderRadius: 99, overflow: "hidden", bgcolor: COLORS.vacant }}>
        {segments.map((seg) =>
          seg.width > 0 ? (
            <Tooltip key={seg.key} title={`${seg.label} ${pctLabel(seg.width / 100 / (scale || 1))}`}>
              <Box sx={{ width: `${seg.width}%`, bgcolor: seg.color }} />
            </Tooltip>
          ) : null
        )}
        {vacantWidth > 0 ? <Box sx={{ width: `${vacantWidth}%`, bgcolor: COLORS.vacant }} /> : null}
      </Stack>
      <Stack direction="row" spacing={1.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
        <Legend color={COLORS.papaya} label="Papaya" />
        <Legend color={COLORS.watermelon} label="Watermelon" />
        <Legend color={COLORS.muskmelon} label="Muskmelon" />
        <Legend color={COLORS.vacant} label="Vacant" />
      </Stack>
    </Box>
  )
}

function Legend({ color, label }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, border: "1px solid #cbd5e1" }} />
      <Typography sx={{ fontSize: 11.5, color: COLORS.muted, fontWeight: 700 }}>{label}</Typography>
    </Stack>
  )
}

function Stat({ label, value, hint }) {
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase" }}>{label}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 800, color: COLORS.ink, lineHeight: 1.2 }}>{value}</Typography>
      {hint ? <Typography sx={{ fontSize: 11.5, color: COLORS.muted }}>{hint}</Typography> : null}
    </Box>
  )
}

function ShedCard({ shed }) {
  const [open, setOpen] = useState(false)
  const usedLabel = pctLabel(shed.used)
  return (
    <Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2.5, p: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 18, color: COLORS.ink }}>
            {shed.label} · {shed.labelMr}
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: COLORS.muted }}>
            Shade {shed.number}
            {shed.shadeName ? ` · ${shed.shadeName}` : ""}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={shed.over ? `Overfull ${usedLabel}` : `${usedLabel} full`}
          sx={{
            fontWeight: 800,
            bgcolor: shed.over ? "#fef2f2" : "#f0fdf4",
            color: shed.over ? "#b91c1c" : "#166534",
          }}
        />
      </Stack>

      <Box sx={{ mt: 1.5 }}>
        <Bar shed={shed} />
      </Box>

      <Stack direction="row" spacing={2} sx={{ mt: 1.75 }} flexWrap="wrap" useFlexGap>
        <Stat label="Papaya in shed" value={fmt(shed.papayaOccupied)} hint={`of ${fmt(shed.papayaMax)}`} />
        <Stat label="Watermelon" value={fmt(shed.watermelon?.occupied)} hint="shares melon space" />
        <Stat label="Muskmelon" value={fmt(shed.muskmelon?.occupied)} hint="same size as watermelon" />
        <Stat
          label="Can still take"
          value={`${fmt(shed.papayaRoom)} papaya`}
          hint={`or ${fmt(shed.melonRoom)} watermelon`}
        />
      </Stack>

      <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
        <Chip size="small" label={`On open orders ${fmt(shed.onOpen)}`} sx={{ fontWeight: 700 }} />
        <Chip size="small" label={`Sown, no order yet ${fmt(shed.noOrder)}`} sx={{ fontWeight: 700 }} />
        <Chip size="small" variant="outlined" label={`Order out on these batches ${fmt(shed.orderOut)}`} sx={{ fontWeight: 700 }} />
      </Stack>

      <Stack direction="row" alignItems="center" sx={{ mt: 1 }}>
        <IconButton size="small" onClick={() => setOpen((v) => !v)} aria-label="Show batches">
          <ExpandMoreIcon sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </IconButton>
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: COLORS.muted }}>
          {shed.batches?.length || 0} batches still holding space
        </Typography>
      </Stack>
      <Collapse in={open}>
        <Stack spacing={1} sx={{ mt: 0.5 }}>
          {(shed.batches || []).map((batch) => (
            <Box key={batch.batchId} sx={{ border: "1px solid #e2e8f0", borderRadius: 1.5, px: 1.25, py: 1 }}>
              <Typography sx={{ fontWeight: 800, fontSize: 13.5 }}>
                {batch.plantName}
                {batch.subtypeName ? ` · ${batch.subtypeName}` : ""} · {fmt(batch.occupied)} in shed
              </Typography>
              <Typography sx={{ fontSize: 12, color: COLORS.muted }}>
                {batch.shedName || "Shed"} · {batch.sowingDate || "—"}
                {batch.requestNumber ? ` · ${batch.requestNumber}` : ""}
                {` · open orders ${fmt(batch.onOpen)} · no order ${fmt(batch.noOrder)} · out ${fmt(batch.orderOut)}`}
              </Typography>
              {(batch.orders || []).length ? (
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.75 }} flexWrap="wrap" useFlexGap>
                  {batch.orders.map((order, index) => (
                    <Chip
                      key={`${batch.batchId}-${order.orderId}-${index}`}
                      size="small"
                      variant={order.out ? "outlined" : "filled"}
                      label={`${order.orderId || "Order"}${order.name ? ` ${order.name}` : ""} · ${fmt(order.plants)}${order.out ? " · out" : ""}`}
                      sx={{ fontWeight: 700 }}
                    />
                  ))}
                </Stack>
              ) : null}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  )
}

export default function SmartShedTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await NetworkManager(API.sowing.GET_SMART_SHED).request()
      if (res?.data?.success) setData(res.data)
      else setError(res?.data?.message || "Could not load smart shed")
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load smart shed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const unmatched = data?.unmatched
  const hasUnmatched = (unmatched?.occupied || 0) > 0

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography sx={{ color: COLORS.muted, fontSize: 13, fontWeight: 600 }}>
          One floor per shed. Full of papaya means no room for watermelon. Muskmelon uses the watermelon size.
          An order that is out frees only its plants. Numbers are live when you refresh.
        </Typography>
        <IconButton onClick={load} disabled={loading} sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
      {loading && !data ? (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress size={28} />
        </Stack>
      ) : null}

      <Stack spacing={1.5}>
        {(data?.sheds || []).map((shed) => (
          <ShedCard key={shed.key} shed={shed} />
        ))}
      </Stack>

      {hasUnmatched ? (
        <Box sx={{ mt: 1.5, bgcolor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 2.5, p: 2 }}>
          <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Sowing not on these four forts</Typography>
          <Typography sx={{ fontSize: 13, color: "#92400e", mb: 1 }}>
            {fmt(unmatched.occupied)} plants are in a shed name that is not Panhalgad, Kondhana, Vishalgad, or Salher.
            They are not counted against those ceilings.
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "#92400e" }}>
            Papaya {fmt(unmatched.papayaOccupied)} · Watermelon {fmt(unmatched.watermelonOccupied)} · Muskmelon{" "}
            {fmt(unmatched.muskmelonOccupied)}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            {(unmatched.batches || []).slice(0, 20).map((batch) => (
              <Typography key={batch.batchId} sx={{ fontSize: 12.5 }}>
                {batch.shedName || "Unnamed"} · {batch.plantName} · {fmt(batch.occupied)}
              </Typography>
            ))}
          </Stack>
        </Box>
      ) : null}
    </Box>
  )
}
