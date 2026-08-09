import React, { createContext, useContext, useMemo, useState } from "react"
import { Chip, Stack } from "@mui/material"

export const SOW_HORIZON_OPTIONS = [
  { days: 0, label: "Today" },
  { days: 1, label: "+1d" },
  { days: 2, label: "+2d" },
  { days: 3, label: "+3d" },
  { days: 4, label: "+4d" },
  { days: 5, label: "+5d" },
  { days: 6, label: "+6d" },
  { days: 7, label: "+7d" },
]

const SowHorizonContext = createContext({
  sowHorizonDays: 0,
  setSowHorizonDays: () => {},
  dayCount: 1,
})

export function SowHorizonProvider({ children, defaultDays = 0 }) {
  const [sowHorizonDays, setSowHorizonDays] = useState(
    Math.max(0, Math.min(7, Number(defaultDays) || 0))
  )
  const value = useMemo(
    () => ({
      sowHorizonDays,
      setSowHorizonDays: (n) =>
        setSowHorizonDays(Math.max(0, Math.min(7, Number(n) || 0))),
      dayCount: sowHorizonDays + 1,
    }),
    [sowHorizonDays]
  )
  return (
    <SowHorizonContext.Provider value={value}>{children}</SowHorizonContext.Provider>
  )
}

export function useSowHorizon() {
  return useContext(SowHorizonContext)
}

/** Shared Today / +1d … +7d chips — same state across Inventory Requests + outlook */
export function SowHorizonChips({ disabled = false, onReselect = null, size = "small" }) {
  const { sowHorizonDays, setSowHorizonDays } = useSowHorizon()
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
      {SOW_HORIZON_OPTIONS.map((opt) => {
        const selected = sowHorizonDays === opt.days
        return (
          <Chip
            key={opt.days}
            size={size}
            clickable
            disabled={disabled}
            label={opt.label}
            onClick={() => {
              if (selected) {
                onReselect?.(opt.days)
                return
              }
              setSowHorizonDays(opt.days)
            }}
            sx={{
              height: size === "small" ? 28 : 32,
              fontWeight: 800,
              fontSize: "0.75rem",
              bgcolor: selected ? "#166534" : "#fff",
              color: selected ? "#fff" : "#14532d",
              border: "1.5px solid",
              borderColor: selected ? "#166534" : "#86efac",
              "&:hover": {
                bgcolor: selected ? "#14532d" : "#f0fdf4",
              },
            }}
          />
        )
      })}
    </Stack>
  )
}

/** Keep only calendar rows within Today .. +horizonDays */
export function sliceDaysByHorizon(days = [], horizonDays = 0, todayKey = null) {
  if (!Array.isArray(days) || !days.length) return []
  const today =
    todayKey ||
    days.find((d) => d.isToday)?.date ||
    days[0]?.date
  if (!today) return days.slice(0, horizonDays + 1)

  const todayMs = Date.parse(`${today}T00:00:00`)
  if (Number.isNaN(todayMs)) return days.slice(0, horizonDays + 1)

  return days.filter((d) => {
    const ms = Date.parse(`${d.date}T00:00:00`)
    if (Number.isNaN(ms)) return false
    const offset = Math.round((ms - todayMs) / 86400000)
    return offset >= 0 && offset <= horizonDays
  })
}

export function dayOffsetLabel(dateStr, todayKey) {
  if (!dateStr || !todayKey) return "Day"
  const a = Date.parse(`${todayKey}T00:00:00`)
  const b = Date.parse(`${dateStr}T00:00:00`)
  if (Number.isNaN(a) || Number.isNaN(b)) return dateStr
  const n = Math.round((b - a) / 86400000)
  if (n === 0) return "Today"
  if (n > 0) return `+${n}d`
  return `${n}d`
}

/** Group day rows: Today, +1d, +2d … */
export function groupDaysByOffset(days = [], todayKey = null) {
  const today =
    todayKey ||
    days.find((d) => d.isToday)?.date ||
    days[0]?.date
  const map = new Map()
  for (const row of days) {
    const label = dayOffsetLabel(row.date, today)
    if (!map.has(label)) map.set(label, [])
    map.get(label).push(row)
  }
  return [...map.entries()].map(([label, rows]) => ({ label, rows }))
}

export function summarizeDayRows(days = []) {
  return (days || []).reduce(
    (a, r) => {
      a.delivery += Number(r.delivery) || 0
      a.readyAvailable += Number(r.readyAvailable) || 0
      a.stockAvailable += Number(r.stockAvailable) || 0
      a.sowingNeeded += Number(r.sowingNeeded) || 0
      a.shortage += Number(r.shortage) || 0
      a.sowingNeededPlants += Number(r.sowingNeededPlants) || 0
      a.packetsNeeded += Number(r.packetsNeeded) || 0
      a.packetShortage += Number(r.packetShortage) || 0
      return a
    },
    {
      delivery: 0,
      readyAvailable: 0,
      stockAvailable: 0,
      sowingNeeded: 0,
      shortage: 0,
      sowingNeededPlants: 0,
      packetsNeeded: 0,
      packetShortage: 0,
    }
  )
}
