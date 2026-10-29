import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Chip,
  Drawer,
  IconButton,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import { CROP, CROP_KEYS, INK, LINE, MUTED, dayLabel, fmt, pctLabel, sowTime } from "./smartShedFormat"

const SORTS = {
  space: { label: "Most space first", fn: (a, b) => b.occupied - a.occupied },
  newest: { label: "Newest sow first", fn: (a, b) => sowTime(b.sowingDate) - sowTime(a.sowingDate) },
  oldest: { label: "Oldest sow first", fn: (a, b) => sowTime(a.sowingDate) - sowTime(b.sowingDate) },
}

export default function ShedBatchDrawer({ shed, onClose }) {
  const mobile = useMediaQuery("(max-width:600px)")
  const [crop, setCrop] = useState("all")
  const [sort, setSort] = useState("space")

  useEffect(() => {
    setCrop("all")
    setSort("space")
  }, [shed?.key])

  const batches = shed?.batches || []
  const present = useMemo(() => CROP_KEYS.filter((key) => batches.some((b) => b.crop === key)), [batches])
  const rows = useMemo(
    () => batches.filter((b) => crop === "all" || b.crop === crop).slice().sort(SORTS[sort].fn),
    [batches, crop, sort]
  )
  const shown = rows.reduce((sum, b) => sum + (Number(b.occupied) || 0), 0)

  return (
    <Drawer
      anchor={mobile ? "bottom" : "right"}
      open={Boolean(shed)}
      onClose={onClose}
      PaperProps={{
        sx: mobile
          ? { height: "92vh", borderTopLeftRadius: 16, borderTopRightRadius: 16 }
          : { width: 560, maxWidth: "100vw" },
      }}
    >
      {shed ? (
        <Stack sx={{ height: "100%" }}>
          <Box sx={{ px: 2.5, pt: 2, pb: 1.5, borderBottom: `1px solid ${LINE}` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 18, color: INK }}>
                  {shed.label} · {shed.labelMr}
                </Typography>
                <Typography sx={{ fontSize: 12.5, color: MUTED, fontWeight: 600 }}>
                  {fmt(shown)} plants in {rows.length} batch{rows.length === 1 ? "" : "es"} · shed {pctLabel(shed.used)} full
                </Typography>
              </Box>
              <IconButton onClick={onClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
              <ToggleButtonGroup size="small" exclusive value={crop} onChange={(_, v) => v && setCrop(v)}>
                <ToggleButton value="all" sx={{ fontWeight: 800, textTransform: "none", px: 1.25 }}>
                  All
                </ToggleButton>
                {present.map((key) => (
                  <ToggleButton key={key} value={key} sx={{ fontWeight: 800, textTransform: "none", px: 1.25 }}>
                    {CROP[key].label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Select size="small" value={sort} onChange={(e) => setSort(e.target.value)} sx={{ fontWeight: 700, fontSize: 13, ml: "auto" }}>
                {Object.entries(SORTS).map(([key, s]) => (
                  <MenuItem key={key} value={key}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 1.5, bgcolor: "#f8fafc" }}>
            <Stack spacing={1}>
              {rows.map((batch) => (
                <BatchRow key={batch.batchId} batch={batch} />
              ))}
              {!rows.length ? (
                <Typography sx={{ py: 4, textAlign: "center", color: MUTED, fontWeight: 600 }}>No batches for this crop.</Typography>
              ) : null}
            </Stack>
          </Box>
        </Stack>
      ) : null}
    </Drawer>
  )
}

function BatchRow({ batch }) {
  const meta = CROP[batch.crop] || CROP.watermelon
  const sow = dayLabel(batch.sowingDate)
  const ready = dayLabel(batch.plantReadyDate)
  return (
    <Box sx={{ bgcolor: "#fff", border: `1px solid ${LINE}`, borderLeft: `4px solid ${meta.color}`, borderRadius: 2, px: 1.5, py: 1.25 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography noWrap sx={{ fontWeight: 800, fontSize: 14, color: INK, minWidth: 0 }}>
          {batch.plantName || meta.label}
          {batch.subtypeName ? (
            <Box component="span" sx={{ color: MUTED, fontWeight: 700 }}>
              {` · ${batch.subtypeName}`}
            </Box>
          ) : null}
        </Typography>
        <Typography sx={{ fontWeight: 900, fontSize: 16, color: INK, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {fmt(batch.occupied)}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 600, mt: 0.25 }}>
        {[batch.shedName, sow ? `Sown ${sow}` : "", ready ? `Ready ${ready}` : "", batch.requestNumber].filter(Boolean).join(" · ")}
      </Typography>
      <Stack direction="row" spacing={0.6} sx={{ mt: 0.85 }} flexWrap="wrap" useFlexGap>
        {batch.onOpen > 0 ? <Mini label="Open orders" value={batch.onOpen} sx={{ bgcolor: "#e0f2fe", color: "#075985" }} /> : null}
        {batch.noOrder > 0 ? <Mini label="No order" value={batch.noOrder} sx={{ bgcolor: "#fef3c7", color: "#92400e" }} /> : null}
        {batch.orderOut > 0 ? <Mini label="Out" value={batch.orderOut} variant="outlined" sx={{ color: MUTED }} /> : null}
      </Stack>
      {(batch.orders || []).length ? (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.85, pt: 0.85, borderTop: `1px dashed ${LINE}` }} flexWrap="wrap" useFlexGap>
          {batch.orders.map((order, index) => (
            <Chip
              key={`${order.orderId}-${index}`}
              size="small"
              variant={order.out ? "outlined" : "filled"}
              label={`#${order.orderId || "order"}${order.name ? ` ${order.name}` : ""} · ${fmt(order.plants)}${order.out ? " · out" : ""}`}
              sx={{
                fontWeight: 700,
                fontSize: 11.5,
                bgcolor: order.out ? "transparent" : "#f1f5f9",
                color: order.out ? MUTED : INK,
                textDecoration: order.out ? "line-through" : "none",
              }}
            />
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}

function Mini({ label, value, variant = "filled", sx }) {
  return <Chip size="small" variant={variant} label={`${label} ${fmt(value)}`} sx={{ height: 22, fontWeight: 800, fontSize: 11.5, ...sx }} />
}
