import { formatOrderDateDisplay } from "./istDateFormat"
import { formatDeliveryDateDisplay } from "./deliveryDateDisplay"

function formatSlotPeriod(slot) {
  if (!slot?.startDay) return null
  const { startDay, endDay, month, year } = slot
  const yearPart = year ? ` ${year}` : ""
  return `${startDay} - ${endDay} ${month}${yearPart}`
}

function formatDateValue(value, format) {
  if (value == null || value === "") return null
  if (typeof value === "object" && value.startDay) {
    return formatSlotPeriod(value)
  }
  return formatOrderDateDisplay(value, format)
}

function isAutomaticReason(reason) {
  const r = String(reason || "").toLowerCase()
  return (
    r.includes("automatic") ||
    r.includes("past due") ||
    r.includes("rollover") ||
    r.includes("next slot") ||
    r.includes("system")
  )
}

function entryKey(entry) {
  return `${entry.previous || ""}|${entry.next || ""}|${entry.reason || ""}`
}

/**
 * Collect all delivery date / period changes for an order row (manual + automatic).
 * @param {object} order
 * @param {string} [dateFormat]
 * @returns {Array<{ previous: string|null, next: string|null, reason: string, automatic: boolean, changedAt: string|Date|null, changedBy: string|null, source: string }>}
 */
export function collectDeliveryDateChanges(order, dateFormat) {
  const details = order?.details || {}
  const entries = []
  const seen = new Set()

  const pushEntry = (entry) => {
    const key = entryKey(entry)
    if (seen.has(key)) return
    seen.add(key)
    entries.push(entry)
  }

  for (const change of details.deliveryChanges || []) {
    pushEntry({
      previous: formatSlotPeriod(change.previousDeliveryDate),
      next: formatSlotPeriod(change.newDeliveryDate),
      reason: change.reasonForChange || "Delivery period changed",
      automatic: isAutomaticReason(change.reasonForChange),
      changedAt: change.changedAt || change.createdAt || null,
      changedBy: change.changedBy?.name || change.changedBy || null,
      source: "slot",
    })
  }

  for (const edit of details.orderEditHistory || []) {
    if (edit.field !== "deliveryDate") continue
    pushEntry({
      previous: formatDateValue(edit.previousValue, dateFormat) || "Not set",
      next: formatDateValue(edit.newValue, dateFormat) || "Not set",
      reason: edit.notes || "Delivery date edited",
      automatic: false,
      changedAt: edit.createdAt || null,
      changedBy: edit.changedBy?.name || null,
      source: "edit",
    })
  }

  const oldRaw = order?.oldDeliveryDate ?? details.oldDeliveryDate ?? null
  const currentRaw =
    details.deliveryDate ?? order?.deliveryDate ?? null
  const prevFormatted = formatDateValue(oldRaw, dateFormat)
  const nextFormatted =
    formatDateValue(currentRaw, dateFormat) ||
    order?.deliveryDateDisplay?.current ||
    order?.deliveryDate ||
    null

  if (details.pastDueSlotRollover && prevFormatted && nextFormatted) {
    pushEntry({
      previous: prevFormatted,
      next: nextFormatted,
      reason: "Automatic — past due, moved to next slot",
      automatic: true,
      changedAt: details.pastDueSlotRolloverAt || null,
      changedBy: "System",
      source: "rollover",
    })
  } else if (details.dispatchedFromAnotherSlot && prevFormatted && nextFormatted) {
    pushEntry({
      previous: prevFormatted,
      next: nextFormatted,
      reason: "Automatic — dispatched from another slot",
      automatic: true,
      changedAt: null,
      changedBy: "System",
      source: "cross-slot",
    })
  } else if (prevFormatted && nextFormatted && prevFormatted !== nextFormatted) {
    const display = formatDeliveryDateDisplay(order, dateFormat)
    if (display.original && display.current && display.original !== display.current) {
      pushEntry({
        previous: display.original,
        next: display.current,
        reason: display.label || "Delivery date changed",
        automatic: display.isPastDueRollover || display.isEarlyDispatch,
        changedAt: details.pastDueSlotRolloverAt || null,
        changedBy: null,
        source: "flag",
      })
    }
  }

  return entries.sort((a, b) => {
    const ta = a.changedAt ? new Date(a.changedAt).getTime() : 0
    const tb = b.changedAt ? new Date(b.changedAt).getTime() : 0
    return tb - ta
  })
}

export function hasDeliveryDateChanges(order, dateFormat) {
  return collectDeliveryDateChanges(order, dateFormat).length > 0
}
