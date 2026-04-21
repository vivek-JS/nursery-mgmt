/**
 * Farmer plant order payments eligible for POST /order/farmer-plant-ledger/transfer-order-payment
 * (must match backend rules in farmerPlantOrderLedger.controller.js).
 * @param {unknown[]} payments
 * @returns {unknown[]}
 */
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
