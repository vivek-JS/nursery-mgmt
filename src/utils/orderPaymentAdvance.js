/**
 * Advance vs balance payment timing for farmer plant orders (mirrors FINAL_NURSERY_BE/utils/paymentTiming.js).
 */

function getFirstDispatchAt(row) {
  const hist = row?.dispatchHistory
  if (Array.isArray(hist) && hist.length) {
    const dates = hist
      .map((h) => h?.date || h?.dispatchDate || h?.dispatchedAt || h?.createdAt)
      .filter(Boolean)
      .map((d) => new Date(d))
      .filter((d) => !Number.isNaN(d.getTime()))
    if (dates.length) {
      dates.sort((a, b) => a - b)
      return dates[0]
    }
  }
  const changes = row?.statusChanges
  if (Array.isArray(changes)) {
    const dispatched = changes
      .filter((c) => c?.newStatus === "DISPATCHED" && c?.createdAt)
      .map((c) => new Date(c.createdAt))
      .filter((d) => !Number.isNaN(d.getTime()))
    if (dispatched.length) {
      dispatched.sort((a, b) => a - b)
      return dispatched[0]
    }
  }
  if (row?.dispatchTargetDate) return new Date(row.dispatchTargetDate)
  return null
}

function firstDispatchAtIso(row) {
  const dt = getFirstDispatchAt(row)
  if (!dt || Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}

function isAdvancePayment(payment, dispatchIso) {
  if (!payment || payment.paymentStatus !== "COLLECTED") return false
  if (!(Number(payment.paidAmount) > 0)) return false
  if (!dispatchIso) return true
  const payDt = payment.paymentDate ? new Date(payment.paymentDate) : null
  const dispDt = new Date(dispatchIso)
  if (!payDt || Number.isNaN(payDt.getTime()) || Number.isNaN(dispDt.getTime())) {
    return true
  }
  return payDt.getTime() < dispDt.getTime()
}

function isBalancePayment(payment, dispatchIso) {
  if (!payment || payment.paymentStatus !== "COLLECTED") return false
  if (!(Number(payment.paidAmount) > 0)) return false
  if (!dispatchIso) return false
  const payDt = payment.paymentDate ? new Date(payment.paymentDate) : null
  const dispDt = new Date(dispatchIso)
  if (!payDt || Number.isNaN(payDt.getTime()) || Number.isNaN(dispDt.getTime())) {
    return false
  }
  return payDt.getTime() >= dispDt.getTime()
}

function derivePaymentTiming(payment, dispatchIso) {
  if (payment?.paymentStatus === "PENDING") {
    return dispatchIso ? "balance" : "advance"
  }
  if (isAdvancePayment(payment, dispatchIso)) return "advance"
  if (isBalancePayment(payment, dispatchIso)) return "balance"
  return "other"
}

function resolvePaymentTiming(payment, dispatchIso) {
  const stored = payment?.paymentTiming
  if (stored === "advance" || stored === "balance") return stored
  return derivePaymentTiming(payment, dispatchIso)
}

function orderPayments(order) {
  if (Array.isArray(order?.payment)) return order.payment
  if (Array.isArray(order?.details?.payment)) return order.details.payment
  return []
}

/** Sum advance payment amounts: collected (completed) and pending (awaiting approval). */
export function sumOrderAdvancePayments(order) {
  const dispatchIso = firstDispatchAtIso(order)
  let completed = 0
  let pending = 0
  for (const payment of orderPayments(order)) {
    if (resolvePaymentTiming(payment, dispatchIso) !== "advance") continue
    const amt = Number(payment?.paidAmount) || 0
    if (!(amt > 0)) continue
    if (payment.paymentStatus === "COLLECTED") completed += amt
    else if (payment.paymentStatus === "PENDING") pending += amt
  }
  return { completed, pending }
}
