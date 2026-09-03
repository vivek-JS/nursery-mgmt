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

/**
 * Build per-order dispatch qty maps from API dispatch doc + orders on the form.
 * Ensures every order on the dispatch has a qty entry (fixes edit save when
 * orderDispatchDetails is partial but UI falls back to remaining qty).
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
    qtyMap.set(key, Math.max(0, Number(row.dispatchQuantity) || 0))
    shedMap.set(key, Math.max(0, Number(row.shedLoadedQuantity) || 0))
  }

  const orders = Array.isArray(ordersArray) ? ordersArray : []
  for (const order of orders) {
    const rk = orderRowKeyFromOrder(order)
    if (!rk || qtyMap.has(rk)) continue
    const remaining = Math.max(0, Number(orderRemainingForDispatch(order)) || 0)
    const total = Math.max(0, Number(order.quantity) || 0)
    qtyMap.set(rk, remaining > 0 ? remaining : total)
  }

  return { qtyMap, shedMap }
}

/** Same resolution as the qty input — validation and save must use this. */
export function resolveDispatchQtyForOrder(order, orderQuantities, savedQtyMap) {
  const rk = orderRowKeyFromOrder(order)
  if (!rk) return 0
  if (orderQuantities instanceof Map && orderQuantities.has(rk)) {
    return Math.max(0, Number(orderQuantities.get(rk)) || 0)
  }
  if (savedQtyMap instanceof Map && savedQtyMap.has(rk)) {
    return Math.max(0, Number(savedQtyMap.get(rk)) || 0)
  }
  const remaining = Math.max(0, Number(orderRemainingForDispatch(order)) || 0)
  const total = Math.max(0, Number(order.quantity) || 0)
  return remaining > 0 ? remaining : total
}
