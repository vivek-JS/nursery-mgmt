import React, { memo, useCallback } from "react"
import {
  Paper,
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material"
import moment from "moment"
import { fmtNum, ymdToDdMm, daysBetweenYmd, addDaysToYmd, calcDefaultPacketsUsed } from "./directSowUtils"
import DirectSowOrderPeek from "./DirectSowOrderPeek"

function orderDeliveryLabel(dayGroup) {
  if (dayGroup.label) return dayGroup.label
  if (dayGroup.deliveryKey && dayGroup.deliveryKey !== "_none") {
    return ymdToDdMm(dayGroup.deliveryKey)
  }
  return null
}

function isPastOrderDelivery(dayGroup) {
  const key = dayGroup.deliveryKey
  if (!key || key === "_none") return false
  return moment(key, "YYYY-MM-DD").isBefore(moment().startOf("day"))
}

function DirectSowDayCard({
  dayGroup,
  plantReadyDaysDefault = 0,
  conversionFactor = 1,
  hasSeedProduct = false,
  draft = {},
  saving = false,
  onDraftChange,
  onSow,
}) {
  const orders = dayGroup.orders || []
  const need = Number(dayGroup.plants) || 0
  const isExcessDay = dayGroup.noOrders || !orders.length
  const past = isPastOrderDelivery(dayGroup)
  const pkts = Number(dayGroup.officeSowed) || 0
  const pri = Number(dayGroup.primarySowed) || 0
  const slotBook = Number(dayGroup.totalBookedPlants) || need
  const slotGap = Math.max(0, slotBook - pkts - pri)
  const readyDays = Math.max(
    0,
    Number(draft.plantReadyDays) ||
      Number(dayGroup.slotReadyDays) ||
      Number(plantReadyDaysDefault) ||
      0
  )
  const readyDate =
    draft.readyDate ||
    (draft.sowDate && readyDays >= 0 ? addDaysToYmd(draft.sowDate, readyDays) : "")
  const qty = Number(draft.quantity) || 0
  const gapVal = need > 0 ? need : slotGap
  const excessPreview = Math.max(0, qty - need)
  const deliveryKey = dayGroup.deliveryKey
  const orderDelivery = orderDeliveryLabel(dayGroup)

  const patch = useCallback(
    (patchObj) => onDraftChange?.(deliveryKey, patchObj),
    [deliveryKey, onDraftChange]
  )

  const onSowDateChange = (ymd) => {
    patch({
      sowDate: ymd,
      ...(ymd && readyDays >= 0 ? { readyDate: addDaysToYmd(ymd, readyDays) } : {}),
    })
  }

  const onReadyDaysChange = (raw) => {
    const n = Math.max(0, Number(raw) || 0)
    patch({
      plantReadyDays: raw,
      ...(draft.sowDate ? { readyDate: addDaysToYmd(draft.sowDate, n) } : {}),
    })
  }

  const canSow =
    qty > 0 &&
    draft.sowDate &&
    readyDate &&
    daysBetweenYmd(draft.sowDate, readyDate) != null &&
    daysBetweenYmd(draft.sowDate, readyDate) >= 0

  const borderColor = isExcessDay ? "#14b8a6" : gapVal > 0 ? "#fb923c" : "#4ade80"

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.25,
        bgcolor: "#fff",
        border: `2px solid ${borderColor}`,
        borderRadius: 1.5,
        height: "100%",
        opacity: past ? 0.88 : 1,
      }}
    >
      <Typography variant="body2" fontWeight={800} fontSize="0.82rem" mb={0.25}>
        Sow card
        {orderDelivery && (
          <Typography component="span" fontWeight={600} fontSize="0.72rem" color="text.secondary" ml={0.5}>
            · orders {orderDelivery}
          </Typography>
        )}
        {past && (
          <Typography component="span" fontSize="0.65rem" color="text.disabled" ml={0.5}>
            (Past)
          </Typography>
        )}
      </Typography>

      <Box sx={{ display: "flex", gap: 0.4, mb: 0.75, flexWrap: "wrap" }}>
        {isExcessDay && (
          <Chip label="Excess" size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#ccfbf1" }} />
        )}
        {orders.length > 0 && (
          <Chip label={`${orders.length} ord`} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />
        )}
        <Tooltip title="Ready / delivery date = sow date + plant ready days · slot on Sow">
          <Chip
            label={readyDate ? `Ready ${ymdToDdMm(readyDate)}` : "Set ready days"}
            size="small"
            color={readyDate ? "success" : "warning"}
            variant="outlined"
            sx={{ height: 18, fontSize: "0.6rem", fontWeight: 700 }}
          />
        </Tooltip>
      </Box>

      <Grid container spacing={0.4} sx={{ mb: 0.75 }}>
        {[
          { l: "Book", v: need || slotBook, c: "#1976d2", bg: "#eff6ff" },
          { l: "Pkts", v: pkts, c: "#64748b", bg: "#f8fafc" },
          { l: "Pri", v: pri, c: "#15803d", bg: "#f0fdf4" },
          { l: "Gap", v: gapVal, c: gapVal > 0 ? "#ea580c" : "#64748b", bg: gapVal > 0 ? "#fff7ed" : "#f8fafc" },
        ].map((s) => (
          <Grid item xs={3} key={s.l}>
            <Box sx={{ bgcolor: s.bg, py: 0.4, borderRadius: 0.75, textAlign: "center" }}>
              <Typography fontSize="0.55rem" color="text.secondary">
                {s.l}
              </Typography>
              <Typography fontWeight={800} fontSize="0.72rem" color={s.c}>
                {fmtNum(s.v)}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <DirectSowOrderPeek orders={orders} />

      {excessPreview > 0 && orders.length > 0 && (
        <Typography variant="caption" display="block" color="#166534" fontWeight={700} mb={0.5} fontSize="0.62rem">
          +{fmtNum(excessPreview)} saleable
        </Typography>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.45 }}>
        <TextField
          type="date"
          size="small"
          label="Sow date"
          value={draft.sowDate || ""}
          onChange={(e) => onSowDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          disabled={saving}
          sx={{ "& .MuiInputBase-input": { fontSize: "0.72rem", py: 0.6 } }}
        />
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "flex-start" }}>
          <TextField
            type="number"
            size="small"
            label="Plant ready days"
            value={draft.plantReadyDays ?? ""}
            onChange={(e) => onReadyDaysChange(e.target.value)}
            disabled={saving}
            helperText="Changes ready date only"
            FormHelperTextProps={{ sx: { fontSize: "0.58rem", m: 0, lineHeight: 1.2 } }}
            sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "0.72rem", py: 0.6 } }}
          />
          <TextField
            size="small"
            placeholder="Batch #"
            value={draft.batchNumber || ""}
            onChange={(e) => patch({ batchNumber: e.target.value })}
            disabled={saving}
            sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "0.72rem", py: 0.6 } }}
          />
        </Box>
        {readyDate && (
          <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
            Ready date: <strong>{ymdToDdMm(readyDate)}</strong> (sow + {readyDays}d)
          </Typography>
        )}
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <TextField
            type="number"
            size="small"
            placeholder={need > 0 ? String(need) : "Plants"}
            label="Plants"
            value={draft.quantity || ""}
            onChange={(e) => {
              const val = e.target.value
              patch({
                quantity: val,
                packetsUsed: calcDefaultPacketsUsed(val, conversionFactor),
              })
            }}
            disabled={saving}
            sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "0.78rem", py: 0.65 } }}
          />
          <TextField
            type="number"
            size="small"
            label="Pkts used"
            value={draft.packetsUsed ?? ""}
            onChange={(e) => patch({ packetsUsed: e.target.value })}
            disabled={saving}
            helperText={
              hasSeedProduct
                ? `cf ${conversionFactor}`
                : "0 if no seed product"
            }
            FormHelperTextProps={{ sx: { fontSize: "0.55rem", m: 0, lineHeight: 1.1 } }}
            sx={{ width: 88, "& .MuiInputBase-input": { fontSize: "0.72rem", py: 0.65 } }}
          />
          <Button
            size="small"
            variant="contained"
            disabled={!canSow || saving}
            onClick={() => onSow?.(dayGroup, { ...draft, readyDate })}
            sx={{
              minWidth: 58,
              fontWeight: 800,
              fontSize: "0.72rem",
              bgcolor: isExcessDay ? "#0d9488" : "#16a34a",
            }}
          >
            {saving ? <CircularProgress size={14} color="inherit" /> : "Sow"}
          </Button>
        </Box>
      </Box>
    </Paper>
  )
}

export default memo(DirectSowDayCard)
