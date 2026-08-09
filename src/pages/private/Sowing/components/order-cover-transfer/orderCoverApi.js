import { NetworkManager, API } from "network/core"

export async function fetchOrderCoverPreview(orderMongoId, { includeAllAvailable = false } = {}) {
  const instance = NetworkManager(API.sowing.GET_ORDER_SLOT_EXCESS)
  const res = await instance.request(null, {
    ...(includeAllAvailable ? { includeAllAvailable: "true" } : {}),
    pathParams: [orderMongoId],
  })
  if (!res?.data?.success) {
    throw new Error(res?.data?.message || "Failed to load cover preview")
  }
  return res.data.data || null
}

/**
 * @param {string} orderMongoId
 * @param {{ transfers?: Array<{ fromSlotId: string, plants: number }> }} [body]
 * Multi source slots → one destination; transfers required for manual pick flow.
 */
export async function completeOrderCoverTransfer(orderMongoId, body = {}) {
  const instance = NetworkManager(API.sowing.COMPLETE_ORDER_FROM_EXCESS)
  const payload = {
    transfers: Array.isArray(body.transfers) ? body.transfers : undefined,
  }
  const res = await instance.request(payload, { pathParams: [orderMongoId] })
  if (!res?.data?.success) {
    const err = new Error(res?.data?.message || "Failed to cover order")
    err.code = res?.data?.code
    err.data = res?.data?.data
    throw err
  }
  return res.data
}

/** Build POST transfers from { [slotId]: plants }. */
export function picksToTransfers(picks) {
  return Object.entries(picks || {})
    .map(([fromSlotId, plants]) => ({
      fromSlotId: String(fromSlotId),
      plants: Math.max(0, Math.floor(Number(plants) || 0)),
    }))
    .filter((t) => t.fromSlotId && t.plants > 0)
}

export function sumPicks(picks) {
  return Object.values(picks || {}).reduce(
    (s, n) => s + Math.max(0, Math.floor(Number(n) || 0)),
    0
  )
}

/** Seed picks from BE auto plan. */
export function plannedTransfersToPicks(planned = []) {
  const next = {}
  for (const t of planned || []) {
    const id = String(t.fromSlotId || "")
    const plants = Math.max(0, Math.floor(Number(t.plants) || 0))
    if (id && plants > 0) next[id] = plants
  }
  return next
}

/** Unsowed orders for plant (optional subtype) via admin-direct-sow list. */
export async function fetchUnsowedOrdersForPlant(plantId, sowDate) {
  const instance = NetworkManager(API.sowing.GET_ADMIN_DIRECT_SOW_ORDERS)
  const res = await instance.request({}, { date: sowDate, plantId })
  if (!res?.data?.success) {
    throw new Error(res?.data?.message || "Failed to load unsowed orders")
  }
  return res.data.groups || []
}

export function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

export function offsetLabel(off) {
  if (off === 0) return "delivery"
  if (off > 0) return `+${off}d`
  return `${off}d`
}
