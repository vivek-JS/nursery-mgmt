export const CROP = {
  papaya: { label: "Papaya", labelMr: "पपई", color: "#d97706", soft: "#fef3c7", ink: "#92400e" },
  watermelon: { label: "Watermelon", labelMr: "टरबूज", color: "#16a34a", soft: "#dcfce7", ink: "#166534" },
  muskmelon: { label: "Muskmelon", labelMr: "खरबूज", color: "#0d9488", soft: "#ccfbf1", ink: "#115e59" },
}

export const CROP_KEYS = ["papaya", "watermelon", "muskmelon"]

export const INK = "#0f172a"
export const MUTED = "#64748b"
export const LINE = "#e2e8f0"
export const VACANT = "#eef2f7"

export function fmt(n) {
  return (Number(n) || 0).toLocaleString("en-IN")
}

export function pctLabel(share) {
  const n = Number(share) || 0
  if (!Number.isFinite(n)) return "—"
  const p = n * 100
  if (p > 0 && p < 1) return "<1%"
  return `${Math.round(p)}%`
}

/** Fill tone for a shared-floor share: room, tight (80%+), full or over. */
export function toneOf(share) {
  const used = Number(share) || 0
  if (used > 1) return { key: "over", label: "Overfull", fg: "#b91c1c", bg: "#fef2f2", border: "#fecaca", bar: "#dc2626" }
  if (used >= 0.995) return { key: "full", label: "Full", fg: "#b91c1c", bg: "#fef2f2", border: "#fecaca", bar: "#dc2626" }
  if (used >= 0.8) return { key: "tight", label: "Almost full", fg: "#b45309", bg: "#fffbeb", border: "#fde68a", bar: "#f59e0b" }
  return { key: "room", label: "Has room", fg: "#047857", bg: "#ecfdf5", border: "#a7f3d0", bar: "#10b981" }
}

/** Share of the floor each crop takes. Muskmelon and watermelon both spend the melon ceiling. */
export function cropShares(shed) {
  const papayaMax = Number(shed?.papayaMax) || 0
  const melonMax = Number(shed?.melonMax) || 0
  return {
    papaya: papayaMax > 0 ? (Number(shed?.papayaOccupied) || 0) / papayaMax : 0,
    watermelon: melonMax > 0 ? (Number(shed?.watermelon?.occupied) || 0) / melonMax : 0,
    muskmelon: melonMax > 0 ? (Number(shed?.muskmelon?.occupied) || 0) / melonMax : 0,
  }
}

export function dayLabel(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" })
}

export function timeLabel(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })
}

export function sowTime(value) {
  const t = new Date(value || 0).getTime()
  return Number.isFinite(t) ? t : 0
}
