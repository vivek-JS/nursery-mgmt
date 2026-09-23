export function fmt(n) {
  return (Number(n) || 0).toLocaleString("en-IN")
}

export function ymd(date) {
  const d = date instanceof Date ? date : new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function addDays(ymdStr, days) {
  const [y, m, d] = ymdStr.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return ymd(dt)
}

export function monthBounds(ymdStr) {
  const [y, m] = ymdStr.split("-").map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  return { from: ymd(start), to: ymd(end) }
}

export function rangeForPreset(preset, today = ymd(new Date())) {
  if (preset === "today") return { from: today, to: today }
  if (preset === "7") return { from: today, to: addDays(today, 6) }
  if (preset === "month") return monthBounds(today)
  return { from: today, to: addDays(today, 13) }
}

export const STATUS_STYLE = {
  needs_sowing: { label: "Needs sowing", bg: "#fff7ed", color: "#c2410c", border: "#fdba74" },
  saleable_excess: { label: "Saleable excess", bg: "#ecfdf5", color: "#047857", border: "#6ee7b7" },
  fulfilled: { label: "Fulfilled", bg: "#f1f5f9", color: "#475569", border: "#cbd5e1" },
}
