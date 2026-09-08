import moment from "moment"

export function monthKeyFromSlotEnd(slot) {
  const end = slot?.slotEndDay || slot?.endDay
  const m = moment(end, "DD-MM-YYYY", true)
  if (!m.isValid()) return null
  return m.format("YYYY-MM")
}

export function monthLabelFromKey(key) {
  const m = moment(key, "YYYY-MM", true)
  return m.isValid() ? m.format("MMM YYYY") : key
}

export function slotGapValue(slot) {
  return Math.max(0, Number(slot.slotGap) || 0)
}

/** Excess = sowed − booking cover from API; never fall back to raw capacity. */
export function slotExcessValue(slot) {
  return Math.max(0, Number(slot.excessAvailableForBooking) || 0)
}

export function slotLabel(slot) {
  const start = slot?.slotStartDay || slot?.startDay
  const end = slot?.slotEndDay || slot?.endDay
  if (start && end) return start === end ? start : `${start} – ${end}`
  return "—"
}

/** Months with nested slots that have gap or excess. */
export function groupSlotsByMonth(slots) {
  const byMonth = new Map()
  for (const slot of slots || []) {
    const gap = slotGapValue(slot)
    const excess = slotExcessValue(slot)
    if (gap <= 0 && excess <= 0) continue
    const key = monthKeyFromSlotEnd(slot)
    if (!key) continue
    if (!byMonth.has(key)) {
      byMonth.set(key, {
        key,
        label: monthLabelFromKey(key),
        gap: 0,
        excess: 0,
        slots: [],
      })
    }
    const row = byMonth.get(key)
    row.gap += gap
    row.excess += excess
    row.slots.push({
      id: slot.slotId,
      label: slotLabel(slot),
      gap,
      excess,
      booked: Number(slot.totalBookedPlants) || 0,
      sowed: Number(slot.primarySowed) || 0,
      overdue: Boolean(slot.isOverdue),
      sowByDate: slot.sowByDate || "",
    })
  }

  return [...byMonth.values()]
    .map((month) => ({
      ...month,
      slots: month.slots.sort((a, b) => b.gap + b.excess - (a.gap + a.excess)),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

export function rollupSlotsByMonth(slots) {
  return groupSlotsByMonth(slots).map(({ key, label, gap, excess, slots: monthSlots }) => ({
    key,
    label,
    gap,
    excess,
    slotCount: monthSlots.length,
  }))
}
