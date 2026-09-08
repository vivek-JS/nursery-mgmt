import moment from "moment"

export function isExpectedReadyInSlotWindow(line, slot) {
  if (!line?.expectedReadyDate || !slot?.startDay || !slot?.endDay) return false
  const exp = moment(line.expectedReadyDate).startOf("day")
  const start = moment(slot.startDay, "DD-MM-YYYY", true).startOf("day")
  const end = moment(slot.endDay, "DD-MM-YYYY", true).startOf("day")
  if (!exp.isValid() || !start.isValid() || !end.isValid()) return false
  return exp.isSameOrAfter(start, "day") && exp.isSameOrBefore(end, "day")
}

/** Lines synced on slot whose expected ready date falls in the delivery window. */
export function summarizeExpectedReadyInSlot(batches, slot) {
  let total = 0
  let calendarReady = 0
  let awaitingMark = 0
  const entries = []

  for (const batch of batches || []) {
    for (const ln of batch.lines || []) {
      if (!isExpectedReadyInSlotWindow(ln, slot)) continue
      const qty = Math.max(0, Number(ln.slotStockSyncedPlants ?? ln.onSlotPlants) || 0)
      if (qty < 1) continue
      total += qty
      if (ln.dispatchEligible || ln.calendarReady) calendarReady += qty
      else awaitingMark += qty
      entries.push({
        ...ln,
        qty,
        batchId: batch.batchId,
        batchNumber: batch.batchNumber ?? batch.batchId,
        plantLabel: batch.plantLabel,
        subtypeLabel: batch.subtypeLabel,
      })
    }
  }

  entries.sort((a, b) => {
    const da = a.expectedReadyDate ? new Date(a.expectedReadyDate).getTime() : 0
    const db = b.expectedReadyDate ? new Date(b.expectedReadyDate).getTime() : 0
    return da - db
  })

  return { total, calendarReady, awaitingMark, entries }
}

export function summaryFromBreakdownPayload(payload, slot) {
  const apiSummary = payload?.summary?.expectedReadyInSlotWindow
  if (apiSummary && Number(apiSummary.totalPlants) >= 0) {
    return {
      total: Number(apiSummary.totalPlants) || 0,
      calendarReady: Number(apiSummary.calendarReadyPlants) || 0,
      awaitingMark: Number(apiSummary.awaitingMarkPlants) || 0,
      entries: summarizeExpectedReadyInSlot(payload?.batches, slot).entries,
    }
  }
  return summarizeExpectedReadyInSlot(payload?.batches, slot)
}
