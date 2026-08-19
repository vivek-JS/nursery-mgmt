import { useCallback, useEffect, useRef, useState } from "react"
import { API, NetworkManager } from "network/core"

const EMPTY = {
  context: null,
  meta: { availableMonths: [], selectedMonths: [], selectedSlotIds: [], currentSlotId: null },
  slots: [],
  lines: [],
  rolls: [],
  totals: null
}

/**
 * Combined lagwad analysis for a plant subtype across any set of months / slot windows.
 * Months and slots are sent comma-separated; an empty months list means "whole year".
 */
export const useLagwadAnalysis = ({ plantId, subtypeId, year, months, slotIds, metaOnly }) => {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const requestRef = useRef(0)

  const monthsKey = (months || []).join(",")
  const slotsKey = (slotIds || []).join(",")

  const fetchAnalysis = useCallback(async () => {
    if (!plantId || !subtypeId || !year) {
      setData(EMPTY)
      return
    }
    const requestId = ++requestRef.current
    setLoading(true)
    setError(null)
    try {
      const instance = NetworkManager(API.slots.GET_LAGWAD_ANALYSIS)
      const params = { plantId, subtypeId, year }
      if (monthsKey) params.months = monthsKey
      if (slotsKey) params.slotIds = slotsKey
      if (metaOnly) params.metaOnly = "1"
      const response = await instance.request({}, params)
      if (requestId !== requestRef.current) return
      const payload = response?.data?.data ?? response?.data ?? null
      setData(payload && payload.totals ? payload : EMPTY)
    } catch (e) {
      if (requestId !== requestRef.current) return
      console.error("Lagwad analysis failed:", e)
      setError(e?.message || "Failed to load lagwad analysis")
      setData(EMPTY)
    } finally {
      if (requestId === requestRef.current) setLoading(false)
    }
  }, [plantId, subtypeId, year, monthsKey, slotsKey, metaOnly])

  useEffect(() => {
    const timer = setTimeout(fetchAnalysis, 120)
    return () => clearTimeout(timer)
  }, [fetchAnalysis])

  return { data, loading, error, refetch: fetchAnalysis }
}

export default useLagwadAnalysis
