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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function parseDay(value) {
  const text = String(value || "")
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [y, m, d] = text.split("-").map(Number)
    return { y, m, d }
  }
  const [d, m, y] = text.split("-").map(Number)
  if (!y || !m || !d) return null
  return { y, m, d }
}

export function formatLongDay(value) {
  const day = parseDay(value)
  if (!day) return value || ""
  return `${day.d}-${MONTHS[day.m - 1]}-${day.y}`
}

export function formatShortRange(start, end) {
  const a = parseDay(start)
  const b = parseDay(end)
  if (!a) return ""
  if (!b) return formatLongDay(start)
  const left = `${a.d}-${MONTHS[a.m - 1]}`
  const right = `${b.d}-${MONTHS[b.m - 1]}`
  if (a.y === b.y && a.m === b.m && a.d === b.d) return `${left}-${a.y}`
  if (a.y === b.y) return `${left} to ${right}`
  return `${left}-${a.y} to ${right}-${b.y}`
}

export function seedPlanDetail(label) {
  if (label === "Raising") return "Raising seed"
  if (label === "Mixed") return "Mixed seed"
  return "Company seed"
}

export function slotCardTone(slot) {
  if (Number(slot?.gap) > 0) {
    return {
      key: "deficit",
      badge: `Deficit -${fmt(slot.gap)}`,
      border: "#fdba74",
      badgeBg: "#ffedd5",
      badgeColor: "#c2410c",
    }
  }
  if (Number(slot?.excess) > 0) {
    return {
      key: "excess",
      badge: "Ready excess",
      border: "#93c5fd",
      badgeBg: "#eff6ff",
      badgeColor: "#1d4ed8",
    }
  }
  if (Number(slot?.canBook) > 0) {
    return {
      key: "open",
      badge: "Capacity open",
      border: "#86efac",
      badgeBg: "#f0fdf4",
      badgeColor: "#15803d",
    }
  }
  return {
    key: "fulfilled",
    badge: "Fulfilled",
    border: "#bbf7d0",
    badgeBg: "#f0fdf4",
    badgeColor: "#047857",
  }
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
