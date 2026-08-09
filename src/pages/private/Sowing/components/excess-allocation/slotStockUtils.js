/** Flatten plants-gap-summary (board=true) — all slots with sow/booking/available activity. */
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
    const score = (r) => (r.availablePlants > 0 ? 2 : 0) + (r.gap > 0 ? 1 : 0)
    return score(b) - score(a) || b.availablePlants - a.availablePlants || b.gap - a.gap
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
    subtypes: Array.from(p.subtypes.values()).sort(
      (a, b) => b.totalAvailable + b.totalGap - (a.totalAvailable + a.totalGap)
    ),
    totalAvailable: Array.from(p.subtypes.values()).reduce((s, st) => s + st.totalAvailable, 0),
    totalGap: Array.from(p.subtypes.values()).reduce((s, st) => s + st.totalGap, 0),
  }))
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}
