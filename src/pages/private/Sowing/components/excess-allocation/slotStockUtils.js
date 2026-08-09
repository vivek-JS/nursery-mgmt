/** Flatten plants-gap-summary (board=true) — all slots including zero activity. */
export const COVER_WINDOW_DAYS = 4

export function parseSlotDay(str) {
  if (!str) return null
  const s = String(str)
  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
  return null
}

export function slotDayMs(row) {
  const d = parseSlotDay(row?.slotEndDay || row?.slotStartDay)
  if (!d || Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function daysBetweenMs(aMs, bMs) {
  if (aMs == null || bMs == null) return null
  return Math.round((aMs - bMs) / 86400000)
}

export function offsetLabel(off) {
  if (off === 0) return "delivery day"
  if (off > 0) return `+${off}d`
  return `${off}d`
}

/** Surplus slot → gap slot pairs within delivery −N…0 cover window. */
export function buildCoverSuggestions(rows = [], windowDays = COVER_WINDOW_DAYS) {
  const byKey = new Map()
  for (const r of rows) {
    const k = `${r.plantId}-${r.subtypeId}`
    if (!byKey.has(k)) {
      byKey.set(k, {
        plantId: r.plantId,
        plantName: r.plantName,
        subtypeId: r.subtypeId,
        subtypeName: r.subtypeName,
        rows: [],
      })
    }
    byKey.get(k).rows.push(r)
  }

  const out = []
  for (const group of byKey.values()) {
    const surplus = group.rows.filter((r) => r.availablePlants > 0)
    const gaps = group.rows.filter((r) => r.gap > 0)
    for (const src of surplus) {
      const srcMs = slotDayMs(src)
      if (srcMs == null) continue
      for (const tgt of gaps) {
        if (String(src.slotId) === String(tgt.slotId)) continue
        const tgtMs = slotDayMs(tgt)
        if (tgtMs == null) continue
        const offsetFromDelivery = daysBetweenMs(srcMs, tgtMs)
        if (
          offsetFromDelivery == null ||
          offsetFromDelivery > 0 ||
          offsetFromDelivery < -windowDays
        ) {
          continue
        }
        const movable = Math.min(src.availablePlants, tgt.gap)
        if (movable <= 0) continue
        out.push({
          plantId: group.plantId,
          plantName: group.plantName,
          subtypeId: group.subtypeId,
          subtypeName: group.subtypeName,
          fromSlotId: src.slotId,
          fromLabel: src.slotEndDay || src.slotStartDay,
          toSlotId: tgt.slotId,
          toLabel: tgt.slotEndDay || tgt.slotStartDay,
          available: src.availablePlants,
          gap: tgt.gap,
          movable,
          offsetDays: offsetFromDelivery,
          offsetLabel: offsetLabel(offsetFromDelivery),
        })
      }
    }
  }

  return out.sort(
    (a, b) =>
      b.offsetDays - a.offsetDays ||
      b.movable - a.movable ||
      String(a.plantName).localeCompare(String(b.plantName))
  )
}

export function isSlotEmpty(row) {
  if (!row) return true
  return (
    (Number(row.availablePlants) || 0) <= 0 &&
    (Number(row.totalBookedPlants) || 0) <= 0 &&
    (Number(row.primarySowed) || 0) <= 0 &&
    (Number(row.gap) || 0) <= 0
  )
}

export function slotStatusKind(row) {
  const avail = Number(row?.availablePlants) || 0
  const gap = Number(row?.gap) || 0
  const booked = Number(row?.totalBookedPlants) || 0
  const sowed = Number(row?.primarySowed) || 0
  if (avail > 0 && gap > 0) return "mixed"
  if (avail > 0) return "surplus"
  if (gap > 0) return "gap"
  if (sowed > 0 || booked > 0) return "balanced"
  return "open"
}

export function compareSlotsByDate(a, b) {
  const da = slotDayMs(a)
  const db = slotDayMs(b)
  if (da != null && db != null && da !== db) return da - db
  if (da != null && db == null) return -1
  if (da == null && db != null) return 1
  return String(a?.slotStartDay || "").localeCompare(String(b?.slotStartDay || ""))
}

export function flattenStockBoardSlots(plants = []) {
  const rows = []
  for (const plant of plants) {
    const plantId = plant._id?.toString?.() || plant._id
    const plantName = plant.plantName || "Unknown plant"
    for (const st of plant.subtypes || []) {
      const subtypeId = st._id?.toString?.() || st._id
      const subtypeName = st.subtypeName || "Unknown subtype"
      for (const slot of st.slots || []) {
        const available = Number(slot.availablePlants) || 0
        const booked = Number(slot.totalBookedPlants) || 0
        const sowed = Number(slot.primarySowed) || 0
        const rawGap = slot.rawGap != null ? Number(slot.rawGap) : booked - sowed
        const gap = Math.max(0, rawGap > 0 ? rawGap : booked - sowed)
        rows.push({
          slotId: slot.slotId,
          slotStartDay: slot.slotStartDay,
          slotEndDay: slot.slotEndDay,
          availablePlants: available,
          totalBookedPlants: booked,
          primarySowed: sowed,
          gap,
          rawGap,
          plantId,
          plantName,
          subtypeId,
          subtypeName,
        })
      }
    }
  }
  return rows.sort((a, b) => {
    const byDate = compareSlotsByDate(a, b)
    if (byDate !== 0) return byDate
    const score = (r) => (r.availablePlants > 0 ? 2 : 0) + (r.gap > 0 ? 1 : 0)
    return score(b) - score(a)
  })
}

/** @deprecated use flattenStockBoardSlots */
export function flattenAvailableSlots(plants = []) {
  return flattenStockBoardSlots(plants).filter((r) => r.availablePlants > 0)
}

export function filterSlotRows(rows, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase()
  if (!q) return rows
  return rows.filter(
    (r) =>
      r.plantName?.toLowerCase().includes(q) ||
      r.subtypeName?.toLowerCase().includes(q) ||
      String(r.slotStartDay || "").includes(q) ||
      String(r.slotEndDay || "").includes(q)
  )
}

export function groupSlotsByPlant(rows) {
  const map = new Map()
  for (const row of rows) {
    const key = row.plantId || row.plantName
    if (!map.has(key)) {
      map.set(key, { plantId: row.plantId, plantName: row.plantName, subtypes: new Map() })
    }
    const plant = map.get(key)
    const stKey = row.subtypeId || row.subtypeName
    if (!plant.subtypes.has(stKey)) {
      plant.subtypes.set(stKey, {
        subtypeId: row.subtypeId,
        subtypeName: row.subtypeName,
        slots: [],
        totalAvailable: 0,
        totalGap: 0,
      })
    }
    const st = plant.subtypes.get(stKey)
    st.slots.push(row)
    st.totalAvailable += row.availablePlants
    st.totalGap += row.gap
  }
  return Array.from(map.values()).map((p) => ({
    ...p,
    subtypes: Array.from(p.subtypes.values())
      .map((st) => ({
        ...st,
        slots: [...st.slots].sort(compareSlotsByDate),
        emptyCount: st.slots.filter(isSlotEmpty).length,
      }))
      .sort(
        (a, b) =>
          b.totalAvailable + b.totalGap - (a.totalAvailable + a.totalGap) ||
          String(a.subtypeName).localeCompare(String(b.subtypeName))
      ),
    totalAvailable: Array.from(p.subtypes.values()).reduce((s, st) => s + st.totalAvailable, 0),
    totalGap: Array.from(p.subtypes.values()).reduce((s, st) => s + st.totalGap, 0),
  }))
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}
