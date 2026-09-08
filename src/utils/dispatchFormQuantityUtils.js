import { orderRemainingForDispatch } from "utils/dispatchManagerExtra"

/** Stable row key for dispatch order maps (Mongo order id). */
export function orderRowKeyFromOrder(order) {
  const id =
    order?.details?.orderid ??
    order?.details?.orderId ??
    order?._id ??
    order?.id
  return id != null && id !== "" ? String(id) : ""
}

export function orderDispatchDetailKey(orderId) {
  if (orderId == null || orderId === "") return ""
  if (typeof orderId === "object") {
    return String(orderId._id ?? orderId.id ?? "")
  }
  return String(orderId)
}

function orderQtyFallback(order) {
  const remaining = Math.max(0, Number(orderRemainingForDispatch(order)) || 0)
  const total = Math.max(0, Number(order.quantity) || 0)
  return remaining > 0 ? remaining : total
}

function detailQtyForOrder(details, order) {
  const rk = orderRowKeyFromOrder(order)
  if (!rk) return 0
  const display = order?.order
  for (const row of details) {
    const key = orderDispatchDetailKey(row?.orderId)
    if (key && key === rk) {
      return Math.max(0, Number(row.dispatchQuantity) || 0)
    }
    if (display != null && String(row?.orderId) === String(display)) {
      return Math.max(0, Number(row.dispatchQuantity) || 0)
    }
  }
  return 0
}

/**
 * Build per-order dispatch qty maps from API dispatch doc + orders on the form.
 * Skips zero-only detail rows so missing/partial details still get a fallback qty.
 */
export function buildDispatchOrderQuantityMaps(dispatchDoc, ordersArray) {
  const qtyMap = new Map()
  const shedMap = new Map()
  const details = Array.isArray(dispatchDoc?.orderDispatchDetails)
    ? dispatchDoc.orderDispatchDetails
    : []

  for (const row of details) {
    const key = orderDispatchDetailKey(row?.orderId)
    if (!key) continue
    const q = Math.max(0, Number(row.dispatchQuantity) || 0)
    if (q > 0) {
      qtyMap.set(key, q)
      shedMap.set(key, Math.max(0, Number(row.shedLoadedQuantity) || 0))
    }
  }

  const orders = Array.isArray(ordersArray) ? ordersArray : []
  for (const order of orders) {
    const rk = orderRowKeyFromOrder(order)
    if (!rk) continue
    const fromDetail = detailQtyForOrder(details, order)
    const existing = qtyMap.has(rk) ? Math.max(0, Number(qtyMap.get(rk)) || 0) : 0
    const fallback = orderQtyFallback(order)
    const qty = existing > 0 ? existing : fromDetail > 0 ? fromDetail : fallback
    qtyMap.set(rk, qty)
    if (!shedMap.has(rk)) {
      const shedRow = details.find(
        (row) => orderDispatchDetailKey(row?.orderId) === rk
      )
      shedMap.set(rk, Math.max(0, Number(shedRow?.shedLoadedQuantity) || 0))
    }
  }

  return { qtyMap, shedMap }
}

/**
 * Same resolution for qty input, validation, and save payload.
 * Empty map entry (deleted key) falls back to saved dispatch qty, then order plants.
 */
export function resolveDispatchQtyForOrder(order, orderQuantities, savedQtyMap) {
  const rk = orderRowKeyFromOrder(order)
  if (!rk) return 0

  const fallback = orderQtyFallback(order)
  const saved =
    savedQtyMap instanceof Map && savedQtyMap.has(rk)
      ? Math.max(0, Number(savedQtyMap.get(rk)) || 0)
      : 0

  if (orderQuantities instanceof Map && orderQuantities.has(rk)) {
    const fromMap = Math.max(0, Number(orderQuantities.get(rk)) || 0)
    if (fromMap > 0) return fromMap
    // Explicit 0 in map (cleared input) — prefer saved/fallback when order still has plants
    if (saved > 0) return saved
    if (fallback > 0) return fallback
    return 0
  }

  if (saved > 0) return saved
  return fallback
}

/** Merge user edits with dispatch doc — only orders still on the form (removed orders excluded). */
export function repairDispatchOrderQuantities(
  dispatchDoc,
  ordersArray,
  orderQuantities,
  savedQtyMap
) {
  const base = buildDispatchOrderQuantityMaps(dispatchDoc, ordersArray)
  const repaired = new Map()

  for (const order of ordersArray || []) {
    const rk = orderRowKeyFromOrder(order)
    if (!rk) continue
    const resolved = resolveDispatchQtyForOrder(order, orderQuantities, savedQtyMap)
    const fromBase = Math.max(0, Number(base.qtyMap.get(rk)) || 0)
    repaired.set(rk, resolved > 0 ? resolved : fromBase)
  }

  return repaired
}

/**
 * Auto-sync can return [] when view/API plants lack order cavity refs — keep existing
 * plants so driver-only edits do not fail with "No plants on this dispatch".
 */
export function withDispatchPlantFallback(syncedPlants, originalPlants) {
  if (Array.isArray(syncedPlants) && syncedPlants.length > 0) return syncedPlants
  if (Array.isArray(originalPlants) && originalPlants.length > 0) return originalPlants
  return []
}
