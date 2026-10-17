/** Mongo ObjectId string (24 hex chars) — matches backend mongoose.isValidObjectId. */
export const MONGO_OBJECT_ID_RE = /^[a-f\d]{24}$/i

/** Mirror FINAL_NURSERY_BE utility/orderTransferEligibility.js */
export const ORDER_TRANSFER_EXCLUDED_STATUSES = [
  "DISPATCHED",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "CANCELLED",
  "REJECTED"
]

/** Allowed statuses for transfer order search (remaining / in-progress only). */
export const ORDER_TRANSFER_SEARCH_STATUS_QUERY = [
  "PENDING",
  "ACCEPTED",
  "ASSIGNED",
  "FARM_READY",
  "READY_FOR_DISPATCH",
  "DISPATCH_PROCESS"
].join(",")

/**
 * The receiving order may also be DISPATCHED (farmer settling the balance after the vehicle left);
 * money still cannot move out of a dispatched order.
 */
export const ORDER_TRANSFER_TARGET_EXCLUDED_STATUSES = ORDER_TRANSFER_EXCLUDED_STATUSES.filter(
  (st) => st !== "DISPATCHED"
)

export const ORDER_TRANSFER_TARGET_SEARCH_STATUS_QUERY = `${ORDER_TRANSFER_SEARCH_STATUS_QUERY},DISPATCHED`

/**
 * @param {{ orderStatus?: string }|string|null|undefined} orderOrStatus
 * @param {"source"|"target"} [role]
 * @returns {boolean}
 */
export function isOrderEligibleForPlantTransfer(orderOrStatus, role = "source") {
  const st =
    typeof orderOrStatus === "string"
      ? orderOrStatus
      : String(orderOrStatus?.orderStatus || "")
  const normalized = st.trim().toUpperCase()
  if (!normalized) return false
  const excluded =
    role === "target" ? ORDER_TRANSFER_TARGET_EXCLUDED_STATUSES : ORDER_TRANSFER_EXCLUDED_STATUSES
  return !excluded.includes(normalized)
}

/**
 * @param {unknown} value
 * @param {string} fieldLabel
 * @returns {string}
 */
export function normalizeMongoObjectId(value, fieldLabel = "Id") {
  const s = value != null ? String(value).trim() : ""
  if (!MONGO_OBJECT_ID_RE.test(s)) {
    throw new Error(`${fieldLabel} must be a valid id`)
  }
  return s
}

/**
 * Body for POST /order/farmer-plant-ledger/transfer-order-payment
 * (must match FINAL_NURSERY_BE transferFarmerPlantOrderPayment).
 * @param {{ sourceOrderId: string, targetOrderId: string, paymentId: string, message?: string }} params
 */
export function buildFarmerPlantOrderPaymentTransferPayload({
  sourceOrderId,
  targetOrderId,
  paymentId,
  message
}) {
  const payload = {
    sourceOrderId: normalizeMongoObjectId(sourceOrderId, "Source order"),
    targetOrderId: normalizeMongoObjectId(targetOrderId, "Target order"),
    paymentId: normalizeMongoObjectId(paymentId, "Payment")
  }
  if (payload.sourceOrderId === payload.targetOrderId) {
    throw new Error("Source and target orders must be different")
  }
  const msg = message != null ? String(message).trim() : ""
  if (msg) payload.message = msg
  return payload
}

/**
 * Farmer plant order payments eligible for POST /order/farmer-plant-ledger/transfer-order-payment
 * (must match backend rules in farmerPlantOrderLedger.controller.js).
 * @param {unknown[]} payments
 * @returns {unknown[]}
 */
/**
 * Body for POST /order/farmer-plant-ledger/transfer-requests (or dealer-plant variant).
 * @param {{ fromOrderId: string, toOrderId: string, requestedAmount: number|string, note?: string }} params
 */
export function buildFarmerOrderTransferRequestPayload({
  fromOrderId,
  toOrderId,
  requestedAmount,
  note
}) {
  const payload = {
    fromOrderId: normalizeMongoObjectId(fromOrderId, "From order"),
    toOrderId: normalizeMongoObjectId(toOrderId, "To order"),
    requestedAmount: roundTransferAmount(requestedAmount)
  }
  if (payload.fromOrderId === payload.toOrderId) {
    throw new Error("From and to orders must be different")
  }
  const msg = note != null ? String(note).trim() : ""
  if (msg) payload.note = msg
  return payload
}

function roundTransferAmount(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Amount must be greater than zero")
  }
  return Math.round(n * 100) / 100
}

/** Pending transfer-request line on target order (approve = COLLECTED, reject = REJECTED via updatePaymentStatus). */
export function isTransferRequestPendingPayment(payment) {
  return Boolean(payment?.transferRequestId && payment?.paymentStatus === "PENDING")
}

/** Approved transfer-in; reject via updatePaymentStatus restores source (backend undo). */
export function isApprovedTransferRequestPayment(payment) {
  return Boolean(
    payment?.transferRequestId &&
    payment?.paymentStatus === "COLLECTED" &&
    payment?.transferredFromOrderId
  )
}

export function transferableFarmerPlantPayments(payments) {
  const list = Array.isArray(payments) ? payments : []
  return list.filter(
    (p) =>
      p?.paymentStatus === "COLLECTED" &&
      !p?.isWalletPayment &&
      !p?.mainPaymentId &&
      Number(p?.paidAmount) > 0
  )
}
