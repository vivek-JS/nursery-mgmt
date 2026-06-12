import moment from "moment"

const dayKey = (iso) => {
  if (!iso) return ""
  const m = moment(iso)
  return m.isValid() ? m.format("YYYY-MM-DD") : ""
}

/** Roll up shed lines into day-wise planted → expected-ready rows. */
export function buildDayWiseRows(batches = []) {
  const map = new Map()

  for (const batch of batches) {
    for (const ln of batch.lines || []) {
      const planted = dayKey(ln.secondaryInwardDate)
      const expected = dayKey(ln.expectedReadyDate)
      const key = `${planted}|${expected}`
      const plants = Number(ln.slotStockSyncedPlants) || Number(ln.availableQuantity) || 0
      if (!plants) continue

      const existing = map.get(key) || {
        plantedIso: ln.secondaryInwardDate || null,
        expectedIso: ln.expectedReadyDate || null,
        plants: 0,
        avail: 0,
        batches: new Set(),
        readyCount: 0,
        waitingCount: 0,
      }
      existing.plants += plants
      existing.avail += Number(ln.availableQuantity) || 0
      if (batch.batchNumber != null) existing.batches.add(batch.batchNumber)
      if (ln.dispatchEligible) existing.readyCount += 1
      else existing.waitingCount += 1
      map.set(key, existing)
    }
  }

  return [...map.values()]
    .map((row) => ({
      plantedIso: row.plantedIso,
      expectedIso: row.expectedIso,
      plants: row.plants,
      avail: row.avail,
      batchNumbers: [...row.batches].sort((a, b) => a - b),
      readyCount: row.readyCount,
      waitingCount: row.waitingCount,
    }))
    .sort((a, b) => {
      const pa = dayKey(a.plantedIso) || "9999"
      const pb = dayKey(b.plantedIso) || "9999"
      if (pa !== pb) return pa.localeCompare(pb)
      return (dayKey(a.expectedIso) || "9999").localeCompare(dayKey(b.expectedIso) || "9999")
    })
}
