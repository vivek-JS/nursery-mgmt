import moment from "moment"

const dayKey = (iso) => {
  if (!iso) return ""
  const m = moment(iso)
  return m.isValid() ? m.format("YYYY-MM-DD") : ""
}

/** Roll up shed lines into day-wise lagwad → expected-ready rows. */
export function buildDayWiseRows(batches = []) {
  const map = new Map()

  for (const batch of batches) {
    for (const ln of batch.lines || []) {
      const planted = dayKey(ln.secondaryInwardDate || ln.lagwadDate)
      const expected = dayKey(ln.expectedReadyDate)
      const key = `${planted}|${expected}`
      const onSlot = Number(ln.onSlotPlants ?? ln.slotStockSyncedPlants) || 0
      const pending = Number(ln.pendingSlotSync) || 0
      const avail = Number(ln.availableQuantity) || 0
      if (!onSlot && !pending && !avail) continue

      const existing = map.get(key) || {
        plantedIso: ln.secondaryInwardDate || ln.lagwadDate || null,
        expectedIso: ln.expectedReadyDate || null,
        onSlot: 0,
        pending: 0,
        avail: 0,
        lineCount: 0,
        batches: new Set(),
        syncedLines: 0,
        pendingLines: 0,
      }
      existing.onSlot += onSlot
      existing.pending += pending
      existing.avail += avail
      existing.lineCount += 1
      if (batch.batchNumber != null) existing.batches.add(batch.batchNumber)
      if (ln.slotSyncStatus === "synced" || ln.slotSyncStatus === "partial") {
        existing.syncedLines += 1
      }
      if (ln.slotSyncStatus === "pending" || ln.slotSyncStatus === "partial") {
        existing.pendingLines += 1
      }
      map.set(key, existing)
    }
  }

  return [...map.values()]
    .map((row) => ({
      plantedIso: row.plantedIso,
      expectedIso: row.expectedIso,
      onSlot: row.onSlot,
      pending: row.pending,
      avail: row.avail,
      lineCount: row.lineCount,
      batchNumbers: [...row.batches].sort((a, b) => String(a).localeCompare(String(b))),
      syncedLines: row.syncedLines,
      pendingLines: row.pendingLines,
    }))
    .sort((a, b) => {
      const pa = dayKey(a.plantedIso) || "9999"
      const pb = dayKey(b.plantedIso) || "9999"
      if (pa !== pb) return pa.localeCompare(pb)
      return (dayKey(a.expectedIso) || "9999").localeCompare(dayKey(b.expectedIso) || "9999")
    })
}

export function slotSyncStatusLabel(status) {
  switch (status) {
    case "synced":
      return "On slot"
    case "partial":
      return "Partial sync"
    case "pending":
      return "Pending sync"
    default:
      return "—"
  }
}

export function slotSyncStatusClass(status) {
  switch (status) {
    case "synced":
      return "bg-emerald-100 text-emerald-800"
    case "partial":
      return "bg-sky-100 text-sky-800"
    case "pending":
      return "bg-amber-100 text-amber-800"
    default:
      return "bg-slate-100 text-slate-600"
  }
}
