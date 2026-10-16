import React from "react"
import { Stack, TextField, MenuItem, Typography } from "@mui/material"

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

/** { hour: "1".."12", minute: "00".."59", ampm: "AM"|"PM" } -> "HH:mm" (24h), or "" when incomplete. */
export function toClock24({ hour, minute, ampm } = {}) {
  if (!hour || !minute || !ampm) return ""
  let h = Number(hour) % 12
  if (ampm === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${minute}`
}

/** "HH:mm" -> "h:mm AM/PM"; empty when invalid. */
export function clock12(hhmm) {
  const m = String(hhmm || "").trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return ""
  const h = Number(m[1])
  if (h > 23) return ""
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`
}

/** Minutes between two "HH:mm"; an end before start is treated as past midnight. */
export function machineMinutes(start, end) {
  const toMin = (t) => {
    const m = String(t || "").match(/^(\d{2}):(\d{2})$/)
    return m ? Number(m[1]) * 60 + Number(m[2]) : null
  }
  const a = toMin(start)
  const b = toMin(end)
  if (a == null || b == null) return 0
  return b - a >= 0 ? b - a : b - a + 24 * 60
}

export function durationLabel(minutes) {
  const n = Math.max(0, Number(minutes) || 0)
  const h = Math.floor(n / 60)
  const m = n % 60
  if (!h && !m) return "0m"
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ")
}

export const EMPTY_CLOCK = { hour: "", minute: "", ampm: "" }

/** Hour / minute / AM-PM selects for a machine clock time. */
export default function MachineTimeField({ label, value, onChange, disabled }) {
  const v = value || EMPTY_CLOCK
  const set = (patch) => onChange({ ...v, ...patch })
  return (
    <Stack spacing={0.5} flex={1} minWidth={0}>
      <Typography fontSize="0.75rem" fontWeight={700} color="text.secondary">
        {label}
      </Typography>
      <Stack direction="row" spacing={0.75}>
        <TextField
          select
          size="small"
          label="Hr"
          value={v.hour}
          onChange={(e) => set({ hour: e.target.value })}
          disabled={disabled}
          sx={{ flex: 1, minWidth: 64 }}
        >
          {HOURS.map((h) => (
            <MenuItem key={h} value={h}>
              {h}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Min"
          value={v.minute}
          onChange={(e) => set({ minute: e.target.value })}
          disabled={disabled}
          sx={{ flex: 1, minWidth: 64 }}
          SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 280 } } } }}
        >
          {MINUTES.map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="AM/PM"
          value={v.ampm}
          onChange={(e) => set({ ampm: e.target.value })}
          disabled={disabled}
          sx={{ flex: 1, minWidth: 72 }}
        >
          <MenuItem value="AM">AM</MenuItem>
          <MenuItem value="PM">PM</MenuItem>
        </TextField>
      </Stack>
    </Stack>
  )
}
