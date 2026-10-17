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
import { CalendarX, Sprout } from "lucide-react"
import { NetworkManager, API } from "network/core"

export const SOW_LABEL = "या order ची पूर्ण sowing करू"
export const COVER_LABEL = "Excess मधून cover करू"

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
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** GET /sowing/excess-batches — free excess per sowing batch within delivery ±windowDays. */
export async function fetchExcessBatches({
  plantId,
  subtypeId,
  deliveryDate,
  need,
  windowDays = 5,
  releaseOrderId = null
}) {
  const instance = NetworkManager(API.sowing.GET_EXCESS_BATCHES)
  const query = { plantId, subtypeId, deliveryDate: toYmd(deliveryDate), need, windowDays }
  if (releaseOrderId) query.releaseOrderId = releaseOrderId
  const res = await instance.request({}, query)
  if (!res?.data?.success) {
    throw new Error(res?.data?.message || "Failed to load excess sowing")
  }
  return res.data.data || null
}

export const NEAR_WINDOW_DAYS = 5
export const WIDE_WINDOW_DAYS = 15

/**
 * Excess near delivery (±5d); when that cannot cover the whole order, widen to ±15d.
 * Returns { preview, windowDays, widened, nearFree }.
 */
export async function fetchExcessWithFallback({
  plantId,
  subtypeId,
  deliveryDate,
  need,
  releaseOrderId = null
}) {
  const needQty = Math.max(0, Math.floor(Number(need) || 0))
  const near = await fetchExcessBatches({
    plantId,
    subtypeId,
    deliveryDate,
    need: needQty,
    windowDays: NEAR_WINDOW_DAYS,
    releaseOrderId
  })
  const nearFree = Number(near?.totalFree) || 0
  if ((needQty > 0 && nearFree >= needQty) || near?.ownSow?.withinTolerance) {
    return { preview: near, windowDays: NEAR_WINDOW_DAYS, widened: false, nearFree }
  }
  const wide = await fetchExcessBatches({
    plantId,
    subtypeId,
    deliveryDate,
    need: needQty,
    windowDays: WIDE_WINDOW_DAYS,
    releaseOrderId
  })
  return { preview: wide, windowDays: WIDE_WINDOW_DAYS, widened: true, nearFree }
}

/**
 * One row per sowing date: batches of the same slot, sowing date, ready date and shed
 * are merged. Batch order inside a row is kept (oldest first) for splitting picks.
 */
export function groupExcessEntries(entries = []) {
  const byKey = new Map()
  for (const e of entries) {
    const key = [e.slotId, e.sowingDate, e.plantReadyDate, e.shedName].join("|")
    let row = byKey.get(key)
    if (!row) {
      row = {
        key,
        slotId: String(e.slotId),
        sowingDate: e.sowingDate || "",
        plantReadyDate: e.plantReadyDate || "",
        offsetDays: Number(e.offsetDays) || 0,
        shedName: e.shedName || "",
        freePlants: 0,
        batches: [],
      }
      byKey.set(key, row)
    }
    row.freePlants += Math.max(0, Number(e.freePlants) || 0)
    row.batches.push(e)
  }
  return [...byKey.values()]
}

/** Nearest-first auto fill up to need. Returns { [rowKey]: plants }. */
export function autoFillPicks(rows = [], need = 0) {
  const next = {}
  let left = Math.max(0, Math.floor(Number(need) || 0))
  for (const r of rows) {
    if (left <= 0) break
    const take = Math.min(left, Math.max(0, Number(r.freePlants) || 0))
    if (take > 0) {
      next[r.key] = take
      left -= take
    }
  }
  return next
}

/** Row picks → per-batch picks for the API (each row split across its batches in order). */
export function picksMapToList(picks = {}, rows = []) {
  const byKey = new Map(rows.map((r) => [r.key, r]))
  const list = []
  for (const [key, raw] of Object.entries(picks)) {
    const row = byKey.get(key)
    let left = Math.max(0, Math.floor(Number(raw) || 0))
    if (!row || left <= 0) continue
    for (const b of row.batches) {
      if (left <= 0) break
      const take = Math.min(left, Math.max(0, Number(b.freePlants) || 0))
      if (take <= 0) continue
      list.push({
        batchId: String(b.batchId),
        slotId: String(b.slotId),
        plants: take,
        sowingDate: row.sowingDate,
        plantReadyDate: row.plantReadyDate,
        offsetDays: row.offsetDays,
        shedName: row.shedName,
      })
      left -= take
    }
  }
  return list
}

/** Per-batch picks → one line per sowing date (for summaries). */
export function summarizePicks(picks = []) {
  const byKey = new Map()
  for (const p of picks) {
    const key = [p.sowingDate, p.plantReadyDate, p.shedName].join("|")
    const prev = byKey.get(key)
    if (prev) prev.plants += Number(p.plants) || 0
    else byKey.set(key, { ...p, key, plants: Number(p.plants) || 0 })
  }
  return [...byKey.values()]
}

const SHORTFALL_TONES = {
  sow: { bg: "#fffbeb", border: "#fcd34d", iconBg: "#fef3c7", fg: "#92400e" },
  blocked: { bg: "#fef2f2", border: "#fca5a5", iconBg: "#fee2e2", fg: "#991b1b" },
}

/** Excess cannot cover the order: new sowing needed, or not enough time to grow one. */
function ShortfallPanel({
  totalFree,
  needQty,
  windowDays,
  sowPossible,
  readyDays,
  readyBy,
  blocked,
  plantsOnly = false,
}) {
  const tone = sowPossible && !plantsOnly ? SHORTFALL_TONES.sow : SHORTFALL_TONES.blocked
  const pct = needQty > 0 ? Math.round((totalFree / needQty) * 100) : 0
  const Icon = sowPossible && !plantsOnly ? Sprout : CalendarX
  const none = totalFree <= 0

  let title
  let body
  if (plantsOnly) {
    title = none
      ? {
          en: `No plants available within ±${windowDays} days of this date`,
          mr: `या तारखेच्या ±${windowDays} दिवसांत रोपे उपलब्ध नाहीत`,
        }
      : {
          en: `Only ${fmtNum(totalFree)} of ${fmtNum(needQty)} plants available (${pct}%)`,
          mr: `${fmtNum(needQty)} पैकी फक्त ${fmtNum(totalFree)} रोपे उपलब्ध (${pct}%)`,
        }
    body = {
      en: "The delivery date can only move to a day where sowed plants are ready for the whole order. Choose another day below.",
      mr: "संपूर्ण order साठी रोपे तयार असतील त्याच दिवशी डिलिव्हरी तारीख बदलता येते. खालील दुसरा दिवस निवडा.",
    }
  } else {
    title = none
      ? {
          en: `No excess sowing within ±${windowDays} days`,
          mr: `±${windowDays} दिवसांत जास्तीची पेरणी उपलब्ध नाही`,
        }
      : {
          en: `Only ${fmtNum(totalFree)} of ${fmtNum(needQty)} plants in excess (${pct}%)`,
          mr: `${fmtNum(needQty)} पैकी फक्त ${fmtNum(totalFree)} जास्तीची रोपे (${pct}%)`,
        }
    body = sowPossible
      ? {
          en: `New sowing needs to be created for this order${
            readyBy ? ` — a sowing started today is ready by ${readyBy}` : ""
          }.`,
          mr: `या order साठी नवीन पेरणी करावी लागेल${
            readyBy ? ` — आज पेरणी केल्यास रोपे ${readyBy} ला तयार होतील` : ""
          }.`,
        }
      : {
          en: `Not enough time for a new sowing${
            readyDays ? ` — it needs ${readyDays} days (earliest ready ${readyBy || "—"})` : ""
          }.`,
          mr: `नवीन पेरणीसाठी पुरेसा वेळ नाही${
            readyDays ? ` — ${readyDays} दिवस लागतात (लवकरात लवकर ${readyBy || "—"} ला तयार)` : ""
          }.`,
        }
  }

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px solid",
        borderColor: tone.border,
        bgcolor: tone.bg,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: tone.iconBg,
            color: tone.fg,
          }}
        >
          <Icon size={20} />
        </Box>
        <Box minWidth={0}>
          <Typography fontWeight={900} sx={{ color: tone.fg }}>
            {title.en}
          </Typography>
          <Typography fontWeight={800} fontSize="0.85rem" sx={{ color: tone.fg }}>
            {title.mr}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.75, color: "#334155" }}>
            {body.en}
          </Typography>
          <Typography variant="body2" sx={{ color: "#334155" }}>
            {body.mr}
          </Typography>
          {blocked && !plantsOnly && (
            <>
              <Typography variant="body2" fontWeight={800} sx={{ mt: 1, color: tone.fg }}>
                The delivery date cannot be changed to this date. Choose another day below.
              </Typography>
              <Typography variant="body2" fontWeight={800} sx={{ color: tone.fg }}>
                या तारखेला डिलिव्हरी बदलता येणार नाही. खालील दुसरा दिवस निवडा.
              </Typography>
            </>
          )}
        </Box>
      </Stack>
    </Box>
  )
}

function dayLabel(ymd) {
  const d = new Date(`${ymd}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ymd
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })
}

/** Other delivery days whose excess (±5 days) covers the whole order. */
function SuggestedDays({ days = [], onPickDate, isDatePickable }) {
  return (
    <Box>
      <Typography fontWeight={900} fontSize="0.9rem">
        Other days with enough excess
      </Typography>
      <Typography fontWeight={800} fontSize="0.82rem" color="text.secondary" sx={{ mb: 0.75 }}>
        पुरेशी रोपे तयार असलेले इतर दिवस
      </Typography>
      {days.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No other day within ±45 days has enough excess for this order.
          <br />
          ±45 दिवसांत या order साठी पुरेशी रोपे असलेला दुसरा दिवस नाही.
        </Typography>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
          {days.map((d) => {
            const pickable = isDatePickable ? isDatePickable(d.date) : true
            return (
              <Paper
                key={d.date}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 1.5,
                  borderColor: pickable ? "#86efac" : "#e2e8f0",
                  bgcolor: pickable ? "#f0fdf4" : "#f8fafc",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <Typography fontWeight={900} fontSize="0.9rem">
                        {dayLabel(d.date)}
                      </Typography>
                      <Chip
                        size="small"
                        label={offsetChipLabel(d.offsetDays)}
                        color={d.offsetDays < 0 ? "success" : "warning"}
                        sx={{ height: 20, fontWeight: 800 }}
                      />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {fmtNum(d.freePlants)} रोपे · {d.entryCount} पेरणी नोंदी
                      {pickable ? "" : " · slot नाही"}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={!pickable}
                    onClick={() => onPickDate(d.date)}
                    sx={{ fontWeight: 800, textTransform: "none", flexShrink: 0 }}
                  >
                    Use
                  </Button>
                </Stack>
              </Paper>
            )
          })}
        </Box>
      )}
    </Box>
  )
}

/**
 * Booking-time popup: excess from sowing batches within delivery ±5 days.
 * Full mode → pick sowing dates summing to need, then cover or SOW_LABEL.
 * Partial mode → read-only list, only SOW_LABEL.
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
  widened = false,
  nearFree = 0,
  newSowingPossible,
  newSowingReadyBy,
  plantReadyDays,
  coverLabel = COVER_LABEL,
  sowLabel = SOW_LABEL,
  blockWhenNoSowing = false,
  requireFullCover = false,
  onPickDate,
  isDatePickable,
}) {
  const rows = useMemo(() => groupExcessEntries(preview?.entries || []), [preview])
  const sowPossible = (newSowingPossible ?? preview?.newSowingPossible) !== false
  const readyDays = plantReadyDays ?? preview?.plantReadyDays
  const readyBy = newSowingReadyBy ?? preview?.newSowingReadyBy
  const totalFree = Number(preview?.totalFree) || 0
  const needQty = Math.max(0, Math.floor(Number(need) || 0))
  const isFull = needQty > 0 && totalFree >= needQty
  const windowDays = preview?.windowDays ?? 5
  const blocked =
    !loading && !isFull && (requireFullCover || (blockWhenNoSowing && !sowPossible))
  const [picks, setPicks] = useState({})

  useEffect(() => {
    if (!open) return
    if (initialPicks && Object.keys(initialPicks).length) setPicks(initialPicks)
    else setPicks(isFull ? autoFillPicks(rows, needQty) : {})
  }, [open, rows, needQty, isFull, initialPicks])

  const selected = useMemo(
    () =>
      Object.values(picks).reduce((s, n) => s + Math.max(0, Math.floor(Number(n) || 0)), 0),
    [picks]
  )

  const setQty = (row, raw) => {
    const next = { ...picks }
    const n = Math.max(0, Math.floor(Number(raw) || 0))
    const capped = Math.min(n, Number(row.freePlants) || 0)
    if (capped <= 0) delete next[row.key]
    else next[row.key] = capped
    setPicks(next)
  }

  const toggle = (row, checked) => {
    const next = { ...picks }
    if (!checked) {
      delete next[row.key]
      setPicks(next)
      return
    }
    const others = Object.entries(next).reduce(
      (s, [k, v]) => (k === row.key ? s : s + Math.max(0, Number(v) || 0)),
      0
    )
    const take = Math.min(Number(row.freePlants) || 0, Math.max(0, needQty - others))
    if (take > 0) next[row.key] = take
    setPicks(next)
  }

  const canCover = isFull && selected === needQty && !loading

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
        {blocked
          ? "Delivery date cannot be changed"
          : totalFree > 0 || loading
            ? `Excess sowing available (±${windowDays} days)`
            : "Excess sowing check"}
        <Typography component="div" fontWeight={800} fontSize="0.9rem" color="text.secondary">
          {blocked
            ? "डिलिव्हरी तारीख बदलता येणार नाही"
            : totalFree > 0 || loading
              ? `जास्तीची पेरणी उपलब्ध (±${windowDays} दिवस)`
              : "जास्तीची पेरणी तपासणी"}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Need · गरज ${fmtNum(needQty)}`} sx={{ fontWeight: 800 }} />
            <Chip
              size="small"
              color={isFull ? "success" : "warning"}
              label={`Available · उपलब्ध ${fmtNum(totalFree)}`}
              sx={{ fontWeight: 800 }}
            />
            {isFull && (
              <Chip
                size="small"
                variant={selected === needQty ? "filled" : "outlined"}
                color={selected === needQty ? "success" : "default"}
                label={`Selected · निवडले ${fmtNum(selected)}`}
                sx={{ fontWeight: 800 }}
              />
            )}
          </Stack>

          {widened && !loading && (
            <Alert severity="warning" variant="outlined" sx={{ py: 0.5 }}>
              {nearFree > 0
                ? `Only ${fmtNum(nearFree)} excess within ±${NEAR_WINDOW_DAYS} days of delivery`
                : `No excess within ±${NEAR_WINDOW_DAYS} days of delivery`}
              {totalFree > 0
                ? ` — showing sowing entries within ±${windowDays} days (day-wise). Select entries to cover.`
                : "."}
              <Box component="div" sx={{ mt: 0.25 }}>
                {nearFree > 0
                  ? `डिलिव्हरीच्या ±${NEAR_WINDOW_DAYS} दिवसांत फक्त ${fmtNum(nearFree)} जास्तीची रोपे`
                  : `डिलिव्हरीच्या ±${NEAR_WINDOW_DAYS} दिवसांत जास्तीची रोपे नाहीत`}
                {totalFree > 0 ? ` — ±${windowDays} दिवसांतील पेरणी नोंदी दाखवत आहोत.` : "."}
              </Box>
            </Alert>
          )}

          {loading ? null : isFull ? (
            <Alert severity="success" sx={{ py: 0.5 }}>
              {requireFullCover ? (
                <>
                  Select the sowing entries for this order (adds up to {fmtNum(needQty)} plants),
                  then <b>{coverLabel}</b>.
                  <Box component="div" sx={{ mt: 0.25 }}>
                    या order साठी पेरणी नोंदी निवडा (एकूण {fmtNum(needQty)} रोपे), मग{" "}
                    <b>{coverLabel}</b>.
                  </Box>
                </>
              ) : (
                <>
                  Choose one: cover this order from the sowing below (adds up to {fmtNum(needQty)}{" "}
                  plants, order is marked <b>Sow completed</b>), or <b>{sowLabel}</b>.
                  <Box component="div" sx={{ mt: 0.25 }}>
                    खालील पेरणीतून हा order पूर्ण करा (एकूण {fmtNum(needQty)} रोपे, order{" "}
                    <b>Sow completed</b> होईल), किंवा <b>{sowLabel}</b>.
                  </Box>
                </>
              )}
            </Alert>
          ) : (
            <ShortfallPanel
              totalFree={totalFree}
              needQty={needQty}
              windowDays={windowDays}
              sowPossible={sowPossible}
              readyDays={readyDays}
              readyBy={readyBy}
              blocked={blocked}
              plantsOnly={requireFullCover}
            />
          )}

          {!loading && !isFull && onPickDate && Array.isArray(preview?.suggestedDays) && (
            <SuggestedDays
              days={preview.suggestedDays}
              onPickDate={onPickDate}
              isDatePickable={isDatePickable}
            />
          )}

          {loading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={28} />
            </Box>
          ) : rows.length === 0 ? null : (
            <Stack spacing={0.75}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Delivery is based on the ready date · ±days = ready date vs delivery
                <br />
                डिलिव्हरी रोपे तयार होण्याच्या तारखेवर ठरते · ±दिवस = तयार तारीख व डिलिव्हरीमधील फरक
              </Typography>
              {rows.map((r) => {
                const qty = Math.max(0, Math.floor(Number(picks[r.key]) || 0))
                const checked = qty > 0
                const off = r.offsetDays
                return (
                  <Paper
                    key={r.key}
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
                            onChange={(ev) => toggle(r, ev.target.checked)}
                          />
                        )}
                        <Chip
                          size="small"
                          label={offsetChipLabel(off)}
                          color={off === 0 ? "primary" : off < 0 ? "success" : "warning"}
                          sx={{ fontWeight: 800, height: 22, minWidth: 52 }}
                        />
                        <Box minWidth={0}>
                          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={700}
                                display="block"
                                lineHeight={1.2}
                              >
                                Sow date · पेरणी
                              </Typography>
                              <Typography fontWeight={800} fontSize="0.88rem">
                                {r.sowingDate || "—"}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography
                                variant="caption"
                                fontWeight={800}
                                display="block"
                                lineHeight={1.2}
                                sx={{ color: "#166534" }}
                              >
                                Ready date · तयार
                              </Typography>
                              <Typography fontWeight={900} fontSize="0.88rem" sx={{ color: "#166534" }}>
                                {r.plantReadyDate || "—"}
                              </Typography>
                            </Box>
                          </Stack>
                          <Typography variant="caption" color="text.secondary">
                            {[r.shedName, `free · मोकळी ${fmtNum(r.freePlants)}`]
                              .filter(Boolean)
                              .join(" · ")}
                          </Typography>
                        </Box>
                      </Stack>
                      {isFull ? (
                        <TextField
                          size="small"
                          type="number"
                          label="Take"
                          value={qty || ""}
                          onChange={(ev) => setQty(r, ev.target.value)}
                          inputProps={{ min: 0, max: r.freePlants, step: 1 }}
                          sx={{ width: 120 }}
                        />
                      ) : (
                        <Chip
                          size="small"
                          variant="outlined"
                          label={fmtNum(r.freePlants)}
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
              Selected {fmtNum(selected)} — must equal {fmtNum(needQty)} to cover. · निवडलेली रोपे{" "}
              {fmtNum(needQty)} इतकी असावीत.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.25, gap: 1, flexWrap: "wrap" }}>
        <Button onClick={onClose} variant={blocked ? "contained" : "text"}>
          {blocked ? "Pick another date" : "Back"}
        </Button>
        {!blocked && !requireFullCover && (
          <Button variant="outlined" color="warning" onClick={() => onSow?.(totalFree)}>
            {sowLabel}
          </Button>
        )}
        {isFull && (
          <Button
            variant="contained"
            color="success"
            disabled={!canCover}
            onClick={() => onCover?.(picksMapToList(picks, rows), picks, windowDays)}
          >
            {coverLabel} ({fmtNum(selected)})
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
