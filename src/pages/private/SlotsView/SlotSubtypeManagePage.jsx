import React, { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, Calendar, Leaf, Loader2 } from "lucide-react"
import { API, NetworkManager } from "network/core"
import Subtypes from "./Subtypes"

const SlotSubtypeManagePage = () => {
  const { plantId, subtypeId } = useParams()
  const [searchParams] = useSearchParams()
  const year = searchParams.get("year") || "2026"

  const [loading, setLoading] = useState(true)
  const [plantName, setPlantName] = useState("")
  const [subtypeName, setSubtypeName] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
        const response = await instance.request({}, { plantId, year })
        const subtypes = response?.data?.subtypes ?? []
        const match = subtypes.find(
          (st) => String(st.subtypeId) === String(subtypeId)
        )
        if (!cancelled) {
          setPlantName(response?.data?.plantName || response?.data?.name || "Plant")
          setSubtypeName(match?.subtypeName || "Subtype")
        }
      } catch (error) {
        console.error("Failed to load subtype header:", error)
        if (!cancelled) {
          setPlantName("Plant")
          setSubtypeName("Subtype")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [plantId, subtypeId, year])

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <Link
            to="/u/slots"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-emerald-700">
            <ArrowLeft className="h-4 w-4" />
            Back to slot overview
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Leaf className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              {loading ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    {plantName}
                    <span className="mx-2 text-slate-300">/</span>
                    {subtypeName}
                  </h1>
                  <p className="text-sm text-slate-500">Slot management</p>
                </>
              )}
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
              <Calendar className="h-3.5 w-3.5" />
              {year}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Subtypes plantId={plantId} plantSubId={subtypeId} year={Number(year) || year} />
      </div>
    </div>
  )
}

export default SlotSubtypeManagePage
