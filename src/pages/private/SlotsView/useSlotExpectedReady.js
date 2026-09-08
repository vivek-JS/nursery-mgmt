import { useEffect, useState } from "react"
import { API, NetworkManager } from "network/core"
import { summaryFromBreakdownPayload } from "./expectedReadyInSlot"

/** Expected ready pipeline in slot delivery window (from shed breakdown). */
export function useSlotExpectedReady(slot, enabled = true) {
  const [summary, setSummary] = useState({ total: 0, calendarReady: 0, awaitingMark: 0 })

  useEffect(() => {
    if (!slot?._id || !enabled) {
      setSummary({ total: 0, calendarReady: 0, awaitingMark: 0 })
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const inst = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
        const res = await inst.request({}, [slot._id])
        const payload = res?.data?.data ?? res?.data ?? res
        if (cancelled) return
        const s = summaryFromBreakdownPayload(payload, slot)
        setSummary({
          total: s.total,
          calendarReady: s.calendarReady,
          awaitingMark: s.awaitingMark,
        })
      } catch {
        if (!cancelled) setSummary({ total: 0, calendarReady: 0, awaitingMark: 0 })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slot?._id, slot?.startDay, slot?.endDay, enabled])

  return summary
}
