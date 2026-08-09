import { buildCopyOrderPrefillFromRow } from "./copyOrderPrefill"

const TRANSFER_ORDER_BLOCKED_STATUSES = new Set([
  "DISPATCHED",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "CANCELLED",
  "REJECTED",
  "TEMPORARY_CANCELLED",
])

export function canTransferOrderToFarmer(row) {
  if (!row || row.isAgriSalesOrder || row.details?.isRamAgriProduct) return false
  const status = String(row.orderStatus || "").toUpperCase()
  return Boolean(status) && !TRANSFER_ORDER_BLOCKED_STATUSES.has(status)
}

export function getTransferSourceFarmerName(row) {
  if (!row) return ""
  return String(row.farmerName || row.details?.farmer?.name || "").trim()
}

export function buildTransferOrderPrefillFromRow(row, newFarmer = {}) {
  const base = buildCopyOrderPrefillFromRow(row)
  if (!base) return null

  const name = String(newFarmer.name || "").trim()
  const mobileNumber = String(newFarmer.mobileNumber || "").trim()
  if (!name || !mobileNumber) return null

  const village = String(newFarmer.village || "").trim()
  const taluka = String(newFarmer.taluka || newFarmer.talukaName || "").trim()
  const district = String(newFarmer.district || newFarmer.districtName || "").trim()
  const state = String(newFarmer.state || newFarmer.stateName || "Maharashtra").trim() || "Maharashtra"

  base.formData = {
    ...base.formData,
    name,
    mobileNumber,
    village,
    taluka,
    talukaName: String(newFarmer.talukaName || taluka).trim(),
    district,
    districtName: String(newFarmer.districtName || district).trim(),
    state,
    stateName: String(newFarmer.stateName || state).trim(),
  }

  base.transferFromOrderId = row.details?.orderid ?? row.order ?? null
  base.transferFromOrderDisplayId = row.order ?? row.details?.orderId ?? null

  return base
}

export function buildTransferCancelRemark(newFarmer, sourceOrderDisplayId) {
  const name = String(newFarmer?.name || "").trim()
  const mobile = String(newFarmer?.mobileNumber || "").trim()
  const who = [name, mobile].filter(Boolean).join(" · ")
  const from = sourceOrderDisplayId != null ? `Order #${sourceOrderDisplayId}` : "order"
  return who
    ? `Transferred ${from} to ${who} — replaced with new booking`
    : `Transferred ${from} to another farmer — replaced with new booking`
}
