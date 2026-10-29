import React, { useEffect, useMemo, useState } from "react"
import { Box, Button, InputAdornment, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded"
import { fitAfter } from "../../smartShedWarn"
import { CROP, CROP_KEYS, INK, LINE, MUTED, fmt, pctLabel } from "./smartShedFormat"

const poolOf = (crop) => (crop === "papaya" ? "papaya" : "melon")
const digits = (text) => String(text || "").replace(/[^\d]/g, "").slice(0, 9)

/** Will this sow fit? Runs on the loaded numbers, same formula as the sow form warning. */
export default function FitCheck({ sheds }) {
  const [shedKey, setShedKey] = useState("")
  const [crop, setCrop] = useState("papaya")
  const [raw, setRaw] = useState("")

  useEffect(() => {
    if (!shedKey && sheds?.length) setShedKey(sheds[0].key)
  }, [sheds, shedKey])

  const shed = (sheds || []).find((s) => s.key === shedKey) || null
  const plants = Number(raw) || 0
  const fit = useMemo(() => (shed ? fitAfter(shed, poolOf(crop), plants) : null), [shed, crop, plants])

  return (
    <Box sx={{ bgcolor: "#fff", border: `1px solid ${LINE}`, borderRadius: 3, p: { xs: 1.75, sm: 2 } }}>
      <Typography sx={{ fontWeight: 900, fontSize: 15, color: INK }}>Will it fit?</Typography>
      <Typography sx={{ fontSize: 12.5, color: MUTED, fontWeight: 600, mb: 1.5 }}>
        Check a sow before you plan it. Uses the numbers on this screen.
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} alignItems={{ md: "center" }}>
        <TextField select size="small" label="Fort" value={shedKey} onChange={(e) => setShedKey(e.target.value)} sx={{ minWidth: 200 }}>
          {(sheds || []).map((s) => (
            <MenuItem key={s.key} value={s.key}>
              {s.label} · {s.labelMr} ({pctLabel(s.used)})
            </MenuItem>
          ))}
        </TextField>
        <ToggleButtonGroup size="small" exclusive value={crop} onChange={(_, v) => v && setCrop(v)}>
          {CROP_KEYS.map((key) => (
            <ToggleButton
              key={key}
              value={key}
              sx={{
                fontWeight: 800,
                textTransform: "none",
                px: 1.5,
                "&.Mui-selected": { bgcolor: CROP[key].soft, color: CROP[key].ink },
                "&.Mui-selected:hover": { bgcolor: CROP[key].soft },
              }}
            >
              {CROP[key].label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <TextField
          size="small"
          label="Plants"
          value={raw ? fmt(raw) : ""}
          onChange={(e) => setRaw(digits(e.target.value))}
          inputProps={{ inputMode: "numeric" }}
          InputProps={{ endAdornment: <InputAdornment position="end">plants</InputAdornment> }}
          sx={{ minWidth: 190 }}
        />
        {fit && fit.maxAdd > 0 ? (
          <Button size="small" onClick={() => setRaw(String(fit.maxAdd))} sx={{ fontWeight: 800, textTransform: "none", whiteSpace: "nowrap" }}>
            Fill to 100% ({fmt(fit.maxAdd)})
          </Button>
        ) : null}
      </Stack>

      {shed && fit && plants > 0 ? <FitResult shed={shed} crop={crop} plants={plants} fit={fit} /> : null}
    </Box>
  )
}

function FitResult({ shed, crop, plants, fit }) {
  const ok = !fit.over
  const short = Math.max(0, plants - fit.maxAdd)
  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="flex-start"
      sx={{
        mt: 1.5,
        p: 1.5,
        borderRadius: 2,
        bgcolor: ok ? "#ecfdf5" : "#fef2f2",
        border: `1px solid ${ok ? "#a7f3d0" : "#fecaca"}`,
      }}
    >
      {ok ? <CheckCircleRoundedIcon sx={{ color: "#059669", mt: 0.1 }} /> : <ErrorRoundedIcon sx={{ color: "#dc2626", mt: 0.1 }} />}
      <Box>
        <Typography sx={{ fontWeight: 900, fontSize: 14.5, color: ok ? "#065f46" : "#991b1b" }}>
          {ok
            ? `Fits. ${shed.label} goes from ${pctLabel(fit.before)} to ${pctLabel(fit.used)} full.`
            : `Does not fit. ${shed.label} would be ${pctLabel(fit.used)} full.`}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: ok ? "#047857" : "#b91c1c", mt: 0.25 }}>
          {ok
            ? fit.papayaRoom < 1
              ? `${fmt(plants)} ${CROP[crop].label.toLowerCase()} fills the shed. Nothing else fits after this.`
              : `After ${fmt(plants)} ${CROP[crop].label.toLowerCase()}, it can still take ${fmt(fit.papayaRoom)} papaya or ${fmt(fit.melonRoom)} watermelon.`
            : fit.maxAdd > 0
              ? `Only ${fmt(fit.maxAdd)} ${CROP[crop].label.toLowerCase()} fit. That is ${fmt(short)} short. You can still save a sow; this is a warning.`
              : "This shed has no room left. You can still save a sow; this is a warning."}
        </Typography>
      </Box>
    </Stack>
  )
}
