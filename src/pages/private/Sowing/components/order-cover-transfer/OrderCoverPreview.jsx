import React from "react"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import EastIcon from "@mui/icons-material/East"
import { fmtNum, offsetLabel } from "./orderCoverApi"

function sumPicks(picks) {
  return Object.values(picks || {}).reduce(
    (s, n) => s + Math.max(0, Math.floor(Number(n) || 0)),
    0
  )
}

/**
 * Multi source slots → one destination.
 * picks: { [slotId]: plants } — only positive values count.
 */
export default function OrderCoverPreview({
  preview,
  loading = false,
  picks = {},
  onPicksChange,
  includeAllAvailable = false,
}) {
  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary">
        Checking saleable stock{includeAllAvailable ? " (all slots)…" : " on delivery day and prior 4 days…"}
      </Typography>
    )
  }
  if (!preview) return null

  const need = Math.max(0, Math.floor(Number(preview.plantsNeeded) || 0))
  const dest = preview.destinationSlot
  const windowSlots = preview.slots || []
  const allSlots = preview.allAvailableSlots || []
  const slotSource = includeAllAvailable && allSlots.length ? allSlots : windowSlots
  const slots = slotSource.filter(
    (s) => (Number(s.availablePlants) || 0) > 0 || s.isBookingSlot
  )
  const available = slots.reduce(
    (s, x) => s + (Number(x.availablePlants) || 0),
    0
  )
  const shortfall = Math.max(0, need - available)

  const selectedTotal = sumPicks(picks)

  const remaining = Math.max(0, need - selectedTotal)
  const over = Math.max(0, selectedTotal - need)
  const exact = need > 0 && selectedTotal === need && Boolean(dest?.slotId)

  const setQty = (slotId, raw, maxAvail) => {
    if (!onPicksChange) return
    const next = { ...(picks || {}) }
    const n = Math.max(0, Math.floor(Number(raw) || 0))
    const capped = Math.min(n, Math.max(0, maxAvail))
    if (capped <= 0) delete next[slotId]
    else next[slotId] = capped
    onPicksChange(next)
  }

  const toggleSlot = (slot, checked) => {
    if (!onPicksChange) return
    const id = String(slot.slotId)
    const next = { ...(picks || {}) }
    if (!checked) {
      delete next[id]
      onPicksChange(next)
      return
    }
    const avail = Math.max(0, Number(slot.availablePlants) || 0)
    const already = Object.entries(next).reduce(
      (s, [k, v]) => (k === id ? s : s + Math.max(0, Number(v) || 0)),
      0
    )
    const take = Math.min(avail, Math.max(0, need - already))
    if (take > 0) next[id] = take
    else delete next[id]
    onPicksChange(next)
  }

  const autoFill = () => {
    if (!onPicksChange) return
    const next = {}
    for (const t of preview.plannedTransfers || []) {
      const id = String(t.fromSlotId)
      const plants = Math.max(0, Math.floor(Number(t.plants) || 0))
      if (id && plants > 0) next[id] = plants
    }
    onPicksChange(next)
  }

  const clearPicks = () => onPicksChange?.({})

  return (
    <Stack spacing={1.5}>
      <Alert
        severity={exact ? "success" : available >= need ? "info" : "warning"}
        sx={{ py: 0.75 }}
      >
        {exact
          ? `Ready: ${fmtNum(selectedTotal)} plants from ${
              Object.keys(picks || {}).filter((k) => (picks[k] || 0) > 0).length
            } slot(s) → ${dest?.label || "delivery slot"}.`
          : available < need
            ? preview.message ||
              "Not enough saleable stock in the lookback window."
            : `Pick one or more source slots totaling exactly ${fmtNum(need)} plants.`}
      </Alert>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          size="small"
          label={`Need ${fmtNum(need)}`}
          sx={{ fontWeight: 800, bgcolor: "#ffedd5", color: "#9a3412" }}
        />
        <Chip
          size="small"
          label={`Selected ${fmtNum(selectedTotal)}`}
          color={exact ? "success" : over > 0 ? "error" : "default"}
          sx={{ fontWeight: 800 }}
        />
        {remaining > 0 && (
          <Chip
            size="small"
            label={`Still need ${fmtNum(remaining)}`}
            color="warning"
            sx={{ fontWeight: 800 }}
          />
        )}
        {over > 0 && (
          <Chip
            size="small"
            label={`Over by ${fmtNum(over)}`}
            color="error"
            sx={{ fontWeight: 800 }}
          />
        )}
        <Chip
          size="small"
          variant="outlined"
          label={
            includeAllAvailable
              ? "All saleable slots"
              : preview.windowLabel || "delivery −4d…0"
          }
          sx={{ fontWeight: 600 }}
        />
        {shortfall > 0 && available < need && (
          <Chip
            size="small"
            label={`Window short ${fmtNum(shortfall)}`}
            color="error"
            sx={{ fontWeight: 800 }}
          />
        )}
      </Stack>

      {dest && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: "#f0fdf4",
            borderColor: "#86efac",
          }}
        >
          <Typography variant="caption" fontWeight={800} color="text.secondary">
            Destination (one slot — reserved)
          </Typography>
          <Typography fontWeight={900}>{dest.label}</Typography>
          <Typography variant="caption" color="text.secondary">
            Reserved now {fmtNum(dest.orderReservedPlants)} · saleable{" "}
            {fmtNum(dest.availablePlants)}
          </Typography>
        </Paper>
      )}

      <Box>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={0.75}
          gap={1}
          flexWrap="wrap"
        >
          <Typography variant="caption" fontWeight={800} color="text.secondary">
            Source slots (select multiple → transfer to destination)
          </Typography>
          <Stack direction="row" spacing={0.75}>
            <Button
              size="small"
              onClick={autoFill}
              disabled={!preview.plannedTransfers?.length}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Auto-fill plan
            </Button>
            <Button
              size="small"
              onClick={clearPicks}
              disabled={!Object.keys(picks || {}).length}
              sx={{ textTransform: "none" }}
            >
              Clear
            </Button>
          </Stack>
        </Stack>

        {slots.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {includeAllAvailable
              ? "No saleable stock for this plant/subtype."
              : "No saleable stock in delivery −4d…0. Try “Show all available slots”."}
          </Typography>
        ) : (
          <Stack spacing={0.75}>
            {slots.map((slot) => {
              const id = String(slot.slotId)
              const avail = Math.max(0, Number(slot.availablePlants) || 0)
              const qty = Math.max(0, Math.floor(Number(picks?.[id]) || 0))
              const checked = qty > 0
              const same =
                dest?.slotId && String(dest.slotId) === id

              return (
                <Paper
                  key={id}
                  variant="outlined"
                  sx={{
                    p: 1,
                    borderRadius: 1.5,
                    borderColor: checked ? "#166534" : "#e2e8f0",
                    bgcolor: checked ? "#f0fdf4" : "#fff",
                    borderWidth: checked ? 2 : 1,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ sm: "center" }}
                    spacing={1}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5} flex={1} minWidth={0}>
                      <Checkbox
                        size="small"
                        checked={checked}
                        disabled={avail <= 0 && !checked}
                        onChange={(e) => toggleSlot(slot, e.target.checked)}
                      />
                      <Box minWidth={0}>
                        <Typography fontWeight={800} fontSize="0.9rem" noWrap>
                          {slot.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {offsetLabel(slot.offsetDays)} · saleable{" "}
                          {fmtNum(avail)}
                          {same ? " · same as destination" : ""}
                        </Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TextField
                        size="small"
                        type="number"
                        label="Transfer"
                        value={qty || ""}
                        disabled={avail <= 0}
                        onChange={(e) => setQty(id, e.target.value, avail)}
                        inputProps={{ min: 0, max: avail, step: 1 }}
                        sx={{ width: 120 }}
                      />
                      <EastIcon sx={{ color: "#64748b", fontSize: 18 }} />
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        noWrap
                        sx={{ maxWidth: 140 }}
                      >
                        → {dest?.label || "dest"}
                      </Typography>
                    </Stack>
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  )
}
