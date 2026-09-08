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

/** Full-year lagwad analysis for one plant subtype (no month/slot filters). */
export const useLagwadAnalysis = ({ plantId, subtypeId, year }) => {
  const [data, setData] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const requestRef = useRef(0)

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
      const response = await instance.request({}, { plantId, subtypeId, year })
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
  }, [plantId, subtypeId, year])

  useEffect(() => {
    const timer = setTimeout(fetchAnalysis, 120)
    return () => clearTimeout(timer)
  }, [fetchAnalysis])

  return { data, loading, error, refetch: fetchAnalysis }
}

export default useLagwadAnalysis
