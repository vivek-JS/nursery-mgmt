const IST = "Asia/Kolkata"
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export const TRAY_SIZE = 126

function parseDayString(d) {
  if (typeof d !== "string") return null
  const ymd = d.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (ymd) return { y: ymd[1], m: ymd[2], d: ymd[3] }
  const dmy = d.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) return { y: dmy[3], m: dmy[2], d: dmy[1] }
  return null
}

export function fmtDate(d) {
  if (!d) return "—"
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function fmtAdded(d) {
  if (!d) return "—"
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function fmtTime(d) {
  if (!d) return ""
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleTimeString("en-IN", {
    timeZone: IST,
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function fmtDay(d) {
  if (!d) return "—"
  const day = parseDayString(d)
  if (day) return `${Number(day.d)} ${MONTHS[Number(day.m) - 1] || day.m} ${day.y}`
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function sowDayKey(d) {
  if (!d) return ""
  const day = parseDayString(d)
  if (day) return `${day.y}-${day.m}-${day.d}`
  const date = new Date(d)
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-CA", { timeZone: IST })
}

export function traysOf(row) {
  if (row?.trays != null && Number.isFinite(Number(row.trays))) return Number(row.trays)
  const p = Number(row?.sowedQuantity) || 0
  return p > 0 ? Math.ceil(p / (Number(row?.traySize) || TRAY_SIZE)) : 0
}

export function fmtPkt(n) {
  const v = Number(n)
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : "0"
}

export function mortalityOf(row) {
  const s = row?.affectedSlot
  if (!s?.batchId) return null
  if (s.bufferPlants != null) {
    return Math.max(0, Number(s.bufferPlants) - (Number(s.mortalityMovedToExcess) || 0))
  }
  return Number(s.batchExpectedMortality) || 0
}

export function reserveOf(row) {
  const s = row?.affectedSlot
  if (!s?.batchId) return 0
  if (s.mortalityReserve != null) return Math.max(0, Number(s.mortalityReserve) || 0)
  return Number(s.batchExpectedMortality) || 0
}

/** Excess = sowed − exp. mortality − cover (+ mortality already moved is in mortalityOf). */
export function excessOf(row) {
  if (row?.isIrrelevant || row?.affectedSlot?.isIrrelevant) return 0
  const sowed =
    Number(row?.sowedQuantity) ||
    Number(row?.affectedSlot?.batchPlantsSowed) ||
    0
  const mort = mortalityOf(row)
  if (sowed > 0 && mort != null && row?.affectedSlot?.batchId) {
    return Math.max(0, sowed - mort - coverOf(row))
  }
  if (row?.affectedSlot?.batchId) return Math.max(0, Number(row.affectedSlot.excessPlants) || 0)
  return Math.max(0, Number(row?.excessPlants) || 0)
}

export function coverOf(row) {
  const n = Number(row?.bookedPlants ?? row?.affectedSlot?.bookedPlants)
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function readyDateOf(row) {
  return row?.affectedSlot?.plantReadyDate || row?.plantReadyDate || ""
}

export function fmtNum(n) {
  return (Number(n) || 0).toLocaleString("en-IN")
}

export function addedByOf(row) {
  return row?.addedByName || row?.completedBy?.name || ""
}

export function sowBatchOf(row) {
  const s = row?.affectedSlot || {}
  const sowed = Number(s.batchPlantsSowed) || 0
  const destroyed = Number(s.batchDestroyedPlants) || 0
  return {
    slotId: s.slotId,
    batchId: s.batchId,
    plantsSowed: sowed,
    destroyedPlants: destroyed,
    plantsLeft: Math.max(0, sowed - destroyed),
    requestNumber: row?.requestNumber,
    sowingDate: s.sowingDate,
    shedName: s.shedName,
  }
}
