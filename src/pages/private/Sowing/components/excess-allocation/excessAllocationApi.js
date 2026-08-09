import { NetworkManager, API } from "network/core"

export async function fetchSlotCoverableOrders(slotId) {
  const instance = NetworkManager(API.sowing.GET_SLOT_COVERABLE_ORDERS)
  const res = await instance.request(null, { pathParams: [slotId] })
  if (!res?.data?.success) {
    throw new Error(res?.data?.message || "Failed to load coverable orders")
  }
  return res.data.data || null
}

/**
 * @param {string} slotId
 * @param {{ allocations: Array<{ orderId: string, plants: number }> }} body
 */
export async function allocateSlotToOrders(slotId, body) {
  const instance = NetworkManager(API.sowing.ALLOCATE_SLOT_TO_ORDERS)
  const res = await instance.request(body, { pathParams: [slotId] })
  if (!res?.data?.success) {
    throw new Error(res?.data?.message || "Failed to allocate plants to orders")
  }
  return res.data
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

export function fmtDay(d) {
  if (!d) return "—"
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

export async function fetchSlotTransferTargets(slotId) {
  const instance = NetworkManager(API.sowing.GET_SLOT_TRANSFER_TARGETS)
  const res = await instance.request(null, { pathParams: [slotId] })
  if (!res?.data?.success) {
    throw new Error(res?.data?.message || "Failed to load transfer targets")
  }
  return res.data.data || null
}

export async function transferSlotToSlot(fromSlotId, { toSlotId, plants }) {
  const instance = NetworkManager(API.sowing.TRANSFER_SLOT_TO_SLOT)
  const res = await instance.request({ toSlotId, plants }, { pathParams: [fromSlotId] })
  if (!res?.data?.success) {
    throw new Error(res?.data?.message || "Transfer failed")
  }
  return res.data
}
