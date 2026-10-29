import React from "react"
import { Box, Button, Chip, Stack, Tooltip, Typography } from "@mui/material"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import ShedFillBar from "./ShedFillBar"
import { CROP, CROP_KEYS, INK, LINE, MUTED, fmt, pctLabel, toneOf } from "./smartShedFormat"

export default function ShedCard({ shed, onOpenBatches }) {
  const tone = toneOf(shed.used)
  const batchCount = shed.batches?.length || 0
  const noRoom = shed.over || shed.papayaRoom < 1
  const hasMusk = (shed.muskmelon?.occupied || 0) > 0

  return (
    <Box
      id={`smart-shed-${shed.key}`}
      sx={{
        bgcolor: "#fff",
        border: `1px solid ${LINE}`,
        borderRadius: 3,
        overflow: "hidden",
        scrollMarginTop: 88,
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        sx={{ px: 2.25, pt: 2, pb: 1.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 19, color: INK, lineHeight: 1.2 }}>
            {shed.label}
            <Box component="span" sx={{ fontWeight: 700, color: MUTED, ml: 1, fontSize: 16 }}>
              {shed.labelMr}
            </Box>
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: MUTED, fontWeight: 600, mt: 0.25 }}>
            Shade {shed.number}
            {shed.shadeName ? ` · ${shed.shadeName}` : ""}
            {` · max ${fmt(shed.papayaMax)} papaya or ${fmt(shed.melonMax)} watermelon`}
          </Typography>
        </Box>
        <Chip
          label={`${tone.label} · ${pctLabel(shed.used)}`}
          sx={{ fontWeight: 900, bgcolor: tone.bg, color: tone.fg, border: `1px solid ${tone.border}`, flexShrink: 0 }}
        />
      </Stack>

      <Box
        sx={{
          mx: 2.25,
          px: 2,
          py: 1.5,
          borderRadius: 2,
          bgcolor: noRoom ? "#fef2f2" : "#f8fafc",
          border: `1px solid ${noRoom ? "#fecaca" : LINE}`,
        }}
      >
        <Typography sx={{ fontSize: 11.5, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: MUTED }}>
          Can still take
        </Typography>
        {noRoom ? (
          <Typography sx={{ fontSize: 22, fontWeight: 900, color: "#b91c1c", mt: 0.25 }}>
            No room{shed.over ? ` — over by ${pctLabel(shed.used - 1)}` : ""}
          </Typography>
        ) : (
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "baseline" }} spacing={{ xs: 0.25, sm: 1.25 }} sx={{ mt: 0.25 }}>
            <RoomFigure value={shed.papayaRoom} crop="papaya" />
            <Typography sx={{ fontSize: 14, fontWeight: 800, color: MUTED }}>or</Typography>
            <RoomFigure value={shed.melonRoom} crop="watermelon" />
          </Stack>
        )}
        <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 600, mt: 0.5 }}>
          One floor: sowing either one uses up the other. Muskmelon counts the same as watermelon.
        </Typography>
      </Box>

      <Box sx={{ px: 2.25, pt: 1.75 }}>
        <ShedFillBar shed={shed} />
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: `repeat(${hasMusk ? 3 : 2}, minmax(0, 1fr))` },
          gap: 1,
          px: 2.25,
          pt: 1.75,
        }}
      >
        {CROP_KEYS.filter((key) => key !== "muskmelon" || hasMusk).map((key) => (
          <CropStat
            key={key}
            crop={key}
            value={key === "papaya" ? shed.papayaOccupied : shed[key]?.occupied}
            max={key === "papaya" ? shed.papayaMax : shed.melonMax}
          />
        ))}
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        spacing={1}
        sx={{ px: 2.25, py: 1.75, mt: 1.5, borderTop: `1px solid ${LINE}`, bgcolor: "#fcfcfd" }}
      >
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <HoldChip
            label="Held for open orders"
            value={shed.onOpen}
            tip="Sown and linked to an order that has not gone out. This space is taken."
            sx={{ bgcolor: "#e0f2fe", color: "#075985" }}
          />
          <HoldChip
            label="Sown, no order"
            value={shed.noOrder}
            tip="In the shed with no open order on it. Still takes space; free to cover a new order."
            sx={{ bgcolor: "#fef3c7", color: "#92400e" }}
          />
          <HoldChip
            label="Already out"
            value={shed.orderOut}
            tip="Orders on these batches that are dispatched. Their plants left, so this does not hold space."
            variant="outlined"
            sx={{ color: MUTED, borderColor: "#cbd5e1" }}
          />
        </Stack>
        <Button
          size="small"
          onClick={() => onOpenBatches?.(shed)}
          disabled={!batchCount}
          endIcon={<ChevronRightIcon />}
          sx={{ fontWeight: 800, textTransform: "none", flexShrink: 0 }}
        >
          {batchCount ? `${batchCount} batch${batchCount === 1 ? "" : "es"} in shed` : "Nothing sown"}
        </Button>
      </Stack>
    </Box>
  )
}

function RoomFigure({ value, crop }) {
  return (
    <Typography sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 900, color: INK, fontVariantNumeric: "tabular-nums", lineHeight: 1.15 }}>
      {fmt(value)}
      <Box component="span" sx={{ fontSize: 15, fontWeight: 800, color: CROP[crop].ink, ml: 0.75 }}>
        {CROP[crop].label.toLowerCase()}
      </Box>
    </Typography>
  )
}

function CropStat({ crop, value, max }) {
  const meta = CROP[crop]
  return (
    <Box sx={{ borderRadius: 2, border: `1px solid ${LINE}`, px: 1.25, py: 1, borderLeft: `4px solid ${meta.color}` }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: meta.ink }}>
        {meta.label} · {meta.labelMr}
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 900, color: INK, fontVariantNumeric: "tabular-nums", lineHeight: 1.25 }}>
        {fmt(value)}
      </Typography>
      <Typography sx={{ fontSize: 11.5, color: MUTED, fontWeight: 600 }}>
        of {fmt(max)} max
      </Typography>
    </Box>
  )
}

function HoldChip({ label, value, tip, variant = "filled", sx }) {
  return (
    <Tooltip arrow title={tip}>
      <Chip size="small" variant={variant} label={`${label} ${fmt(value)}`} sx={{ fontWeight: 800, ...sx }} />
    </Tooltip>
  )
}
