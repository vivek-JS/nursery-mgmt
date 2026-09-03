import { useEffect, useMemo, useState } from "react"
import { API, NetworkManager } from "network/core"

/**
 * Order dispatch on a booking slot — batch-wise from ledger matched by order id
 * (not linkedBookingSlotId, which often points at the shed/source slot).
 */
export function useSlotReadySold(slotId, enabled = true) {
  const [payload, setPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!slotId || !enabled) {
      setPayload(null)
      setError(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const inst = NetworkManager(API.slots.GET_SLOT_ORDER_DISPATCH_BY_BATCH)
        const res = await inst.request({}, [slotId])
        const data = res?.data?.data ?? res?.data ?? res
        if (!cancelled) setPayload(data)
      } catch (e) {
        console.error(e)
        if (!cancelled) {
          setError("Could not load order dispatch")
          setPayload(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slotId, enabled])

  const items = useMemo(() => payload?.items || [], [payload])
  const byBatch = useMemo(() => payload?.byBatch || [], [payload])
  const ordersWithoutLedger = useMemo(
    () => payload?.ordersWithoutLedger || [],
    [payload]
  )
  const summary = useMemo(() => payload?.summary || {}, [payload])

  const soldTotal = useMemo(() => {
    const ledger = Number(summary.totalLedgerPlants) || 0
    if (ledger > 0) return ledger
    return Number(summary.totalOrderDispatchedPlants) || 0
  }, [summary])

  const orderCount = useMemo(
    () =>
      Number(summary.dispatchedOrderCount) ||
      new Set(items.map((ln) => ln.linkedOrderId).filter(Boolean)).size,
    [summary, items]
  )

  const dispatchedByInwardId = useMemo(() => {
    const map = new Map()
    for (const ln of items) {
      const id = ln.secondaryInwardId ? String(ln.secondaryInwardId) : null
      if (!id) continue
      map.set(id, (map.get(id) || 0) + (Number(ln.plantsAbs) || 0))
    }
    return map
  }, [items])

  const dispatchedByBatchNumber = useMemo(() => {
    const map = new Map()
    for (const b of byBatch) {
      map.set(b.batchNumber || "—", Number(b.dispatchedPlants) || 0)
    }
    return map
  }, [byBatch])

  const dispatchedByBatchShed = useMemo(() => {
    const map = new Map()
    for (const ln of items) {
      const batch = ln.batchNumber || "—"
      const shed = ln.pollyhouse || ln.metadata?.pollyhouse || ""
      const key = `${batch}|${shed}`
      map.set(key, (map.get(key) || 0) + (Number(ln.plantsAbs) || 0))
    }
    return map
  }, [items])

  return {
    items,
    loading,
    error,
    soldTotal,
    orderCount,
    byBatch,
    ordersWithoutLedger,
    summary,
    dispatchedByInwardId,
    dispatchedByBatchNumber,
    dispatchedByBatchShed,
  }
}

/** Dispatched qty for a shed line — match by inward id or batch+shed only (no batch-wide fallback). */
export function dispatchedQtyForLine(
  ln,
  dispatchedByInwardId,
  dispatchedByBatchShed,
  _dispatchedByBatchNumber,
  { allowBatchFallback = false } = {}
) {
  const inwardId = ln?.secondaryInwardId ? String(ln.secondaryInwardId) : null
  if (inwardId && dispatchedByInwardId?.has(inwardId)) {
    return dispatchedByInwardId.get(inwardId) || 0
  }
  const batch = ln?.batchNumber || "—"
  const shed = ln?.pollyhouse || ""
  const shedKey = `${batch}|${shed}`
  if (dispatchedByBatchShed?.has(shedKey) && dispatchedByBatchShed.get(shedKey) > 0) {
    return dispatchedByBatchShed.get(shedKey)
  }
  if (allowBatchFallback && _dispatchedByBatchNumber?.has(batch)) {
    return _dispatchedByBatchNumber.get(batch) || 0
  }
  return 0
}
