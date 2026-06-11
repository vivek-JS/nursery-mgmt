import { momentInIst, ORDER_DATE_DISPLAY_FORMAT } from "./istDateFormat"

const DEFAULT_FORMAT = ORDER_DATE_DISPLAY_FORMAT

/**
 * @param {object} order - row or API order with deliveryDate, oldDeliveryDate, dispatchedFromAnotherSlot
 * @param {string} [format]
 */
export function formatDeliveryDateDisplay(order, format = DEFAULT_FORMAT) {
  const currentRaw =
    order?.deliveryDate ?? order?.details?.deliveryDate ?? null
  const oldRaw =
    order?.oldDeliveryDate ?? order?.details?.oldDeliveryDate ?? null
  const flagged =
    order?.dispatchedFromAnotherSlot === true ||
    order?.details?.dispatchedFromAnotherSlot === true
  const isPastDueRollover =
    order?.pastDueSlotRollover === true ||
    order?.details?.pastDueSlotRollover === true

  const currentM = momentInIst(currentRaw)
  const originalM = momentInIst(oldRaw)
  const current = currentM ? currentM.format(format) : null
  const original = originalM ? originalM.format(format) : null

  const todayIst = momentInIst(new Date())?.startOf("day")
  const isOverdue =
    (flagged || isPastDueRollover) &&
    originalM &&
    todayIst &&
    originalM.startOf("day").isBefore(todayIst)

  let label = null
  if (isPastDueRollover) {
    label = "Past due → next slot"
  } else if (flagged) {
    label = "From another slot"
  }

  return {
    current: current || "-",
    original: original || null,
    isEarlyDispatch: flagged,
    isPastDueRollover,
    isOverdue,
    label,
    overdueHint: isOverdue
      ? isPastDueRollover
        ? "Past due — moved to next slot"
        : "Overdue — dispatching today"
      : null,
  }
}
