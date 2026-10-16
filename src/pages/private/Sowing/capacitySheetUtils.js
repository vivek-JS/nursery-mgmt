export function fmt(n) {
  return (Number(n) || 0).toLocaleString("en-IN")
}

export function signed(n) {
  const v = Number(n) || 0
  return v > 0 ? `+${fmt(v)}` : fmt(v)
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function parseDay(value) {
  const text = String(value || "")
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const [y, m, d] = text.slice(0, 10).split("-").map(Number)
    return { y, m, d }
  }
  const [d, m, y] = text.split("-").map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

/** "16 Oct", "16–18 Oct", "30 Oct–5 Nov" from DD-MM-YYYY or YYYY-MM-DD days. */
export function slotRangeLabel(start, end) {
  const a = parseDay(start)
  if (!a) return ""
  const b = parseDay(end) || a
  if (a.y === b.y && a.m === b.m && a.d === b.d) return `${a.d} ${MONTHS[a.m - 1]}`
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m - 1]}`
  return `${a.d} ${MONTHS[a.m - 1]}–${b.d} ${MONTHS[b.m - 1]}`
}

/** "16 Oct 2026" for an ISO date / timestamp. */
export function dayLabel(value) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
}

export const STATUS_STYLE = {
  needs_sowing: {
    label: "Needs Sowing",
    bg: "#fff7ed",
    color: "#c2410c",
    border: "#fdba74",
    dot: "#f59e0b",
  },
  saleable_excess: {
    label: "Saleable Excess",
    bg: "#eff6ff",
    color: "#1d4ed8",
    border: "#93c5fd",
    dot: "#3b82f6",
  },
  fulfilled: {
    label: "Fulfilled",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#86efac",
    dot: "#22c55e",
  },
}
