import React, { useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { NetworkManager, API } from "network/core"

export const SOW_LABEL = "याची sowing करू"

export function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

export function offsetChipLabel(off) {
  const n = Number(off) || 0
  if (n === 0) return "delivery"
  return n > 0 ? `+${n}d` : `${n}d`
}

function toYmd(value) {
  if (!value) return ""
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** GET /sowing/excess-batches — free excess per sowing batch within delivery ±windowDays. */
export async function fetchExcessBatches({ plantId, subtypeId, deliveryDate, need, windowDays = 5 }) {
  const instance = NetworkManager(API.sowing.GET_EXCESS_BATCHES)
  const res = await instance.request(
    {},
    { plantId, subtypeId, deliveryDate: toYmd(deliveryDate), need, windowDays }
  )
  if (!res?.data?.success) {
    throw new Error(res?.data?.message || "Failed to load excess sowing")
  }
  return res.data.data || null
}

/** Nearest-first auto fill up to need. Returns { [batchId]: plants }. */
export function autoFillPicks(entries = [], need = 0) {
  const next = {}
  let left = Math.max(0, Math.floor(Number(need) || 0))
  for (const e of entries) {
    if (left <= 0) break
    const take = Math.min(left, Math.max(0, Number(e.freePlants) || 0))
    if (take > 0) {
      next[e.batchId] = take
      left -= take
    }
  }
  return next
}

export function picksMapToList(picks = {}, entries = []) {
  const byBatch = new Map(entries.map((e) => [String(e.batchId), e]))
  return Object.entries(picks)
    .map(([batchId, plants]) => {
      const e = byBatch.get(String(batchId))
      return e
        ? {
            batchId: String(batchId),
            slotId: String(e.slotId),
            plants: Math.max(0, Math.floor(Number(plants) || 0)),
            plantReadyDate: e.plantReadyDate,
            offsetDays: e.offsetDays,
          }
        : null
    })
    .filter((p) => p && p.plants > 0)
}

/**
 * Booking-time popup: excess from sowing batches within delivery ±5 days.
 * Full mode → pick batches summing to need, then Cover order or याची sowing करू.
 * Partial mode → read-only list, only याची sowing करू.
 */
export default function ExcessBatchCoverDialog({
  open,
  onClose,
  preview,
  loading = false,
  need = 0,
  initialPicks = null,
  onCover,
  onSow,
}) {
  const entries = useMemo(() => preview?.entries || [], [preview])
  const totalFree = Number(preview?.totalFree) || 0
  const needQty = Math.max(0, Math.floor(Number(need) || 0))
  const isFull = needQty > 0 && totalFree >= needQty
  const windowDays = preview?.windowDays ?? 5
  const [picks, setPicks] = useState({})

  useEffect(() => {
    if (!open) return
    if (initialPicks && Object.keys(initialPicks).length) setPicks(initialPicks)
    else setPicks(isFull ? autoFillPicks(entries, needQty) : {})
  }, [open, entries, needQty, isFull, initialPicks])

  const selected = useMemo(
    () =>
      Object.values(picks).reduce((s, n) => s + Math.max(0, Math.floor(Number(n) || 0)), 0),
    [picks]
  )

  const setQty = (entry, raw) => {
    const next = { ...picks }
    const n = Math.max(0, Math.floor(Number(raw) || 0))
    const capped = Math.min(n, Number(entry.freePlants) || 0)
    if (capped <= 0) delete next[entry.batchId]
    else next[entry.batchId] = capped
    setPicks(next)
  }

  const toggle = (entry, checked) => {
    const next = { ...picks }
    if (!checked) {
      delete next[entry.batchId]
      setPicks(next)
      return
    }
    const others = Object.entries(next).reduce(
      (s, [k, v]) => (k === entry.batchId ? s : s + Math.max(0, Number(v) || 0)),
      0
    )
    const take = Math.min(Number(entry.freePlants) || 0, Math.max(0, needQty - others))
    if (take > 0) next[entry.batchId] = take
    setPicks(next)
  }

  const canCover = isFull && selected === needQty && !loading
  const pct = needQty > 0 ? Math.round((totalFree / needQty) * 100) : 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
        Excess sowing available (±{windowDays} days)
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Need ${fmtNum(needQty)}`} sx={{ fontWeight: 800 }} />
            <Chip
              size="small"
              color={isFull ? "success" : "warning"}
              label={`Available ${fmtNum(totalFree)}`}
              sx={{ fontWeight: 800 }}
            />
            {isFull && (
              <Chip
                size="small"
                variant={selected === needQty ? "filled" : "outlined"}
                color={selected === needQty ? "success" : "default"}
                label={`Selected ${fmtNum(selected)}`}
                sx={{ fontWeight: 800 }}
              />
            )}
          </Stack>

          {isFull ? (
            <Alert severity="success" sx={{ py: 0.5 }}>
              Pick sowing entries that add up to {fmtNum(needQty)} plants. The order will be
              linked to them and marked <b>Sow completed</b>.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Only {fmtNum(totalFree)} of {fmtNum(needQty)} available ({pct}%). Cover needs 100%
              — this order will go through sowing.
            </Alert>
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={28} />
            </Box>
          ) : entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No free excess within ±{windowDays} days.
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {entries.map((e) => {
                const qty = Math.max(0, Math.floor(Number(picks[e.batchId]) || 0))
                const checked = qty > 0
                const off = Number(e.offsetDays) || 0
                return (
                  <Paper
                    key={e.batchId}
                    variant="outlined"
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      borderColor: checked ? "#166534" : "#e2e8f0",
                      bgcolor: checked ? "#f0fdf4" : "#fff",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ sm: "center" }}
                      spacing={1}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.75} flex={1} minWidth={0}>
                        {isFull && (
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={(ev) => toggle(e, ev.target.checked)}
                          />
                        )}
                        <Chip
                          size="small"
                          label={offsetChipLabel(off)}
                          color={off === 0 ? "primary" : off < 0 ? "success" : "warning"}
                          sx={{ fontWeight: 800, height: 22, minWidth: 52 }}
                        />
                        <Box minWidth={0}>
                          <Typography fontWeight={800} fontSize="0.88rem">
                            Ready {e.plantReadyDate || "—"}
                            {e.sowingDate ? ` · sowed ${e.sowingDate}` : ""}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {[e.shedName, e.requestNumber].filter(Boolean).join(" · ") || "—"}
                            {` · free ${fmtNum(e.freePlants)}`}
                          </Typography>
                        </Box>
                      </Stack>
                      {isFull ? (
                        <TextField
                          size="small"
                          type="number"
                          label="Take"
                          value={qty || ""}
                          onChange={(ev) => setQty(e, ev.target.value)}
                          inputProps={{ min: 0, max: e.freePlants, step: 1 }}
                          sx={{ width: 110 }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={fmtNum(e.freePlants)}
                          sx={{ fontWeight: 800 }}
                        />
                      )}
                    </Stack>
                  </Paper>
                )
              })}
            </Stack>
          )}
          {isFull && selected !== needQty && selected > 0 && (
            <Typography variant="caption" color="error.main" fontWeight={700}>
              Selected {fmtNum(selected)} — must equal {fmtNum(needQty)} to cover.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25, gap: 1, flexWrap: "wrap" }}>
        {!isFull && <Button onClick={onClose}>Back</Button>}
        <Button variant="outlined" color="warning" onClick={() => onSow?.(totalFree)}>
          {SOW_LABEL}
        </Button>
        {isFull && (
          <Button
            variant="contained"
            color="success"
            disabled={!canCover}
            onClick={() => onCover?.(picksMapToList(picks, entries), picks)}
          >
            Cover order ({fmtNum(selected)})
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
