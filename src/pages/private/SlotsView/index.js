import React, { useEffect, useState, useMemo } from "react"
import SlotAccordionView from "./slots"
import { API, NetworkManager } from "network/core"
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Plus,
  Calendar,
  Package,
  TrendingUp,
  Leaf,
  BarChart3,
  Clock,
  Loader2
} from "lucide-react"
import AddManualSlotModal from "./AddManualSlotModal"

const getSectionStats = (section, rollupByPlantId) => {
  const pid = section?.plantId
  const r = pid != null ? rollupByPlantId[pid] : undefined
  if (r) {
    return {
      totalCapacity: r.total,
      bookedPlants: r.booked,
      availablePlants: r.available,
      fromRollup: true
    }
  }
  const totalCapacity = Number(section?.totalPlants) || 0
  const bookedPlants = Number(section?.totalBookedPlants) || 0
  return {
    totalCapacity,
    bookedPlants,
    availablePlants: Math.max(0, totalCapacity - bookedPlants),
    fromRollup: false
  }
}

const ParentAccordion = () => {
  const [expandedSections, setExpandedSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [months, setMonths] = useState([])
  const [selectedYear, setSelectedYear] = useState("2026")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [plants, setPlants] = useState([])
  const [rollupByPlantId, setRollupByPlantId] = useState({})
  const [rollupLoading, setRollupLoading] = useState(false)

  const years = ["2026", "2027"]

  const toggleSection = (sectionIndex) => {
    setExpandedSections((prev) =>
      prev.includes(sectionIndex)
        ? prev.filter((index) => index !== sectionIndex)
        : [...prev, sectionIndex]
    )
  }

  useEffect(() => {
    fetchPlants()
    fetchAllPlants()
  }, [selectedYear])

  useEffect(() => {
    if (loading) {
      setRollupByPlantId({})
      return
    }
    if (!months.length) {
      setRollupByPlantId({})
      setRollupLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      setRollupLoading(true)
      const map = {}
      await Promise.all(
        months.map(async (section) => {
          const pid = section?.plantId
          if (pid == null) return
          try {
            const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
            const response = await instance.request({}, { plantId: pid, year: selectedYear })
            const subtypes = response?.data?.subtypes ?? []
            let total = 0
            let booked = 0
            for (const st of subtypes) {
              total += Number(st?.totalPlants) || 0
              booked += Number(st?.totalBookedPlants) || 0
            }
            map[pid] = {
              total,
              booked,
              available: Math.max(0, total - booked)
            }
          } catch (error) {
            console.error("Subtype rollup failed for plant", pid, error)
          }
        })
      )
      if (!cancelled) {
        setRollupByPlantId(map)
        setRollupLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [months, selectedYear, loading])

  const fetchPlants = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS)
      const response = await instance.request({}, { year: selectedYear })
      if (response?.data) {
        setMonths(response?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }

  const fetchAllPlants = async () => {
    try {
      const instance = NetworkManager(API.plantCms.GET_PLANTS)
      const response = await instance.request()

      if (response?.data?.message) {
        setPlants(response?.data?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
  }

  const isSectionExpanded = (sectionIndex) => expandedSections.includes(sectionIndex)

  const handleAddSuccess = () => {
    fetchPlants()
    setIsModalOpen(false)
  }

  const totalStats = useMemo(() => {
    return months.reduce(
      (acc, section) => {
        const { totalCapacity, bookedPlants, availablePlants } = getSectionStats(
          section,
          rollupByPlantId
        )
        return {
          available: acc.available + availablePlants,
          booked: acc.booked + bookedPlants,
          total: acc.total + totalCapacity
        }
      },
      { available: 0, booked: 0, total: 0 }
    )
  }, [months, rollupByPlantId])

  const rollupCoverage =
    months.length > 0 ? Object.keys(rollupByPlantId).length / months.length : 0

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                  <Leaf className="h-5 w-5" />
                </span>
                Plant Slot Management
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Capacity and bookings aligned with subtype rollups (same source as slot tables)
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2">
              <Plus className="h-4 w-4" />
              Add Manual Slot
            </button>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={`inline-flex items-center gap-2 rounded-md px-6 py-2 text-sm font-semibold transition ${
                  selectedYear === year
                    ? "bg-white text-emerald-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}>
                <Calendar className="h-4 w-4" />
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {loading ? (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-slate-200 bg-slate-100"
              />
            ))}
          </div>
        ) : (
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total capacity
                  </p>
                  <p className="mt-1 tabular-nums text-3xl font-bold text-slate-900">
                    {totalStats.total.toLocaleString()}
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    {rollupLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                        Syncing subtype totals…
                      </>
                    ) : (
                      <>
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        {rollupCoverage >= 1
                          ? "Sum of all subtype capacities"
                          : "Includes API fallback where needed"}
                      </>
                    )}
                  </p>
                </div>
                <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
                  <BarChart3 className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Available
                  </p>
                  <p className="mt-1 tabular-nums text-3xl font-bold text-emerald-700">
                    {totalStats.available.toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {totalStats.total > 0
                      ? `${((totalStats.available / totalStats.total) * 100).toFixed(1)}% of capacity`
                      : "No capacity"}
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Booked
                  </p>
                  <p className="mt-1 tabular-nums text-3xl font-bold text-amber-700">
                    {totalStats.booked.toLocaleString()}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {totalStats.total > 0
                      ? `${((totalStats.booked / totalStats.total) * 100).toFixed(1)}% utilized`
                      : "No bookings"}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 shadow-sm">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-600" />
            <p className="font-medium text-slate-600">Loading plant data…</p>
          </div>
        ) : months.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center shadow-sm">
            <Package className="mx-auto mb-4 h-12 w-12 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-800">No plants found</h3>
            <p className="mt-1 text-slate-500">No plant slots for {selectedYear}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-slate-800">Plants overview</span>
              </div>
              <span className="text-xs text-slate-500">
                {months.length} row{months.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 sm:px-5">Plant</th>
                    <th className="px-3 py-3 text-right tabular-nums">Available</th>
                    <th className="px-3 py-3 text-right tabular-nums">Booked</th>
                    <th className="px-3 py-3 text-right tabular-nums">Capacity</th>
                    <th className="hidden px-3 py-3 text-right sm:table-cell tabular-nums">
                      Utilization
                    </th>
                    <th className="hidden w-40 px-3 py-3 md:table-cell">Load</th>
                    <th className="w-12 px-3 py-3 text-center" aria-label="Expand" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {months.map((section, sectionIndex) => {
                    const { totalCapacity, bookedPlants, availablePlants, fromRollup } =
                      getSectionStats(section, rollupByPlantId)
                    const utilizationRate =
                      totalCapacity > 0 ? (bookedPlants / totalCapacity) * 100 : 0
                    const isExpanded = isSectionExpanded(sectionIndex)
                    const rowKey = section?.plantId ?? `idx-${sectionIndex}`

                    return (
                      <React.Fragment key={rowKey}>
                        <tr
                          className={`cursor-pointer transition-colors hover:bg-slate-50/90 ${
                            isExpanded ? "bg-emerald-50/40" : ""
                          }`}
                          onClick={() => toggleSection(sectionIndex)}>
                          <td className="px-4 py-4 sm:px-5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                                  utilizationRate > 80
                                    ? "bg-orange-100 text-orange-700"
                                    : utilizationRate > 50
                                      ? "bg-sky-100 text-sky-700"
                                      : "bg-emerald-100 text-emerald-700"
                                }`}>
                                <Leaf className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900">{section?.name}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                  {rollupLoading && !fromRollup ? (
                                    <span className="inline-flex items-center gap-1">
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      Totals updating…
                                    </span>
                                  ) : fromRollup ? (
                                    <span className="text-emerald-700">Subtype rollup</span>
                                  ) : (
                                    <span className="text-amber-700">List API</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-right tabular-nums font-medium text-emerald-700">
                            {availablePlants.toLocaleString()}
                          </td>
                          <td className="px-3 py-4 text-right tabular-nums font-medium text-amber-800">
                            {bookedPlants.toLocaleString()}
                          </td>
                          <td className="px-3 py-4 text-right tabular-nums font-semibold text-slate-900">
                            {totalCapacity.toLocaleString()}
                          </td>
                          <td className="hidden px-3 py-4 text-right tabular-nums sm:table-cell">
                            <span
                              className={
                                utilizationRate > 80
                                  ? "font-semibold text-orange-600"
                                  : utilizationRate > 50
                                    ? "font-semibold text-sky-600"
                                    : "font-semibold text-emerald-700"
                              }>
                              {utilizationRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="hidden px-3 py-4 md:table-cell">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  utilizationRate > 80
                                    ? "bg-orange-500"
                                    : utilizationRate > 50
                                      ? "bg-sky-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-4 text-center text-slate-400">
                            {isExpanded ? (
                              <ChevronUp className="mx-auto h-5 w-5" />
                            ) : (
                              <ChevronDown className="mx-auto h-5 w-5" />
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${rowKey}-detail`} className="bg-slate-50">
                            <td colSpan={7} className="border-t border-slate-100 p-0">
                              <SlotAccordionView plantId={section?.plantId} year={selectedYear} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <AddManualSlotModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          plants={plants}
          selectedYear={selectedYear}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  )
}

export default ParentAccordion
