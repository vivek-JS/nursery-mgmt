import React, { useEffect, useMemo, useState, useCallback } from "react"
import { History, Save, RotateCcw, Loader2, Layers, Sprout } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"
import StockChangeHistoryModal from "./StockChangeHistoryModal"
import SlotActualBreakdownModal from "./SlotActualBreakdownModal"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
]

const rowKey = (slot) => slot._id

const isPastSlot = (row) => {
  const end = moment(row.endDay, "DD-MM-YYYY", true)
  return end.isValid() && end.isBefore(moment(), "day")
}

const SlotStockPanel = ({ plants = [], defaultYear }) => {
  const years = useMemo(() => {
    const y = new Date().getFullYear()
    return [y - 1, y, y + 1, y + 2].map(String)
  }, [])

  const [plantId, setPlantId] = useState("")
  const [subtypeId, setSubtypeId] = useState("")
  const [year, setYear] = useState(
    defaultYear ? String(defaultYear) : String(new Date().getFullYear())
  )
  const [month, setMonth] = useState("")
  const [rows, setRows] = useState([])
  const [serverRows, setServerRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState(null)
  const [historySlot, setHistorySlot] = useState(null)
  const [breakdownSlot, setBreakdownSlot] = useState(null)

  const subtypes = useMemo(() => {
    const plant = plants.find((p) => String(p._id) === String(plantId))
    return plant?.subtypes || []
  }, [plants, plantId])

  useEffect(() => {
    setSubtypeId("")
  }, [plantId])

  const rowFieldsMatch = (a, b) =>
    String(a.actualPlants) === String(b.actualPlants) &&
    String(a.closingStock) === String(b.closingStock) &&
    String(a.availablePlants) === String(b.availablePlants)

  const dirtyCount = useMemo(() => {
    return rows.filter((r) => {
      const orig = serverRows.find((s) => rowKey(s) === rowKey(r))
      if (!orig) return false
      return !rowFieldsMatch(r, orig)
    }).length
  }, [rows, serverRows])

  const stockSummary = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.actualAvailable += Number(r.actualAvailable) || 0
        acc.actualPlants += Number(r.actualPlants) || 0
        acc.shedSynced += Number(r.shedSyncedPlants) || 0
        acc.batches += Number(r.linkedBatchCount) || 0
        return acc
      },
      { actualAvailable: 0, actualPlants: 0, shedSynced: 0, batches: 0 }
    )
  }, [rows])

  const fetchSlots = useCallback(async () => {
    if (!plantId || !subtypeId || !year) {
      setRows([])
      setServerRows([])
      return
    }
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_STOCK_ENTRY)
      const params = { plantId, subtypeId, year }
      if (month) params.month = month
      const response = await instance.request({}, params)
      const slots = (response?.data?.slots || []).filter((s) => !isPastSlot(s))
      setRows(slots.map((s) => ({ ...s })))
      setServerRows(slots.map((s) => ({ ...s })))
    } catch (error) {
      console.error("Error loading stock entry slots:", error)
      Toast.error("Failed to load slots")
      setRows([])
      setServerRows([])
    } finally {
      setLoading(false)
    }
  }, [plantId, subtypeId, year, month])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  const updateRow = (id, field, value) => {
    if (value !== "" && !/^\d*$/.test(value)) return
    setRows((prev) =>
      prev.map((r) => (rowKey(r) === id ? { ...r, [field]: value } : r))
    )
  }

  const isRowDirty = (row) => {
    const orig = serverRows.find((s) => rowKey(s) === rowKey(row))
    if (!orig) return false
    return !rowFieldsMatch(row, orig)
  }

  const handleDiscard = () => {
    setRows(serverRows.map((s) => ({ ...s })))
    Toast.success("Changes discarded")
  }

  const handleToggleStatus = async (row) => {
    const nextStatus = !row.status
    setTogglingId(row._id)
    try {
      const instance = NetworkManager(API.slots.UPDATE_SLOT)
      const response = await instance.request({ status: nextStatus }, [row._id])
      if (response?.code === 200 || response?.data?.message) {
        Toast.success(nextStatus ? "Slot enabled" : "Slot disabled")
        setRows((prev) =>
          prev.map((r) => (rowKey(r) === rowKey(row) ? { ...r, status: nextStatus } : r))
        )
        setServerRows((prev) =>
          prev.map((r) => (rowKey(r) === rowKey(row) ? { ...r, status: nextStatus } : r))
        )
      } else {
        Toast.error(response?.data?.message || "Failed to update slot status")
      }
    } catch (error) {
      console.error("Error toggling slot status:", error)
      Toast.error("Failed to update slot status")
    } finally {
      setTogglingId(null)
    }
  }

  const handleSave = async () => {
    const updates = rows.filter(isRowDirty).map((r) => {
      const orig = serverRows.find((s) => rowKey(s) === rowKey(r))
      const payload = { slotId: r._id }
      if (String(r.actualPlants) !== String(orig?.actualPlants)) {
        payload.actualPlants = Math.max(0, parseInt(r.actualPlants, 10) || 0)
      }
      if (String(r.closingStock) !== String(orig?.closingStock)) {
        payload.closingStock = Math.max(0, parseInt(r.closingStock, 10) || 0)
      }
      if (String(r.availablePlants) !== String(orig?.availablePlants)) {
        payload.availablePlants = Math.max(0, parseInt(r.availablePlants, 10) || 0)
      }
      return payload
    })

    if (updates.length === 0) {
      Toast.error("No changes to save")
      return
    }

    setSaving(true)
    try {
      const instance = NetworkManager(API.slots.BULK_UPDATE_STOCK_ENTRY)
      const response = await instance.request({ updates })
      const data = response?.data?.data ?? response?.data ?? response
      if (data?.updatedCount > 0 || data?.success) {
        Toast.success(data?.message || `Saved ${data.updatedCount} slot(s)`)
        await fetchSlots()
      }
      if (data?.errors?.length) {
        console.warn("Bulk stock errors:", data.errors)
        Toast.error(`${data.errors.length} row(s) failed to save`)
      }
    } catch (error) {
      console.error("Error saving stock:", error)
      Toast.error("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-gradient-to-r from-teal-50 to-emerald-50 px-6 py-5">
        <h2 className="text-xl font-bold text-slate-900">Slot stock entry</h2>
        <p className="text-sm text-slate-600 mt-1">
          Update available, actual plants, and closing stock for current and upcoming slots. Past slots are hidden. Slot on/off applies immediately.
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Actual available = actual plants − remaining to dispatch. Tap a row to see batch sowing
          dates and secondary shed lines.
        </p>
      </div>

      <div className="p-6 space-y-4">
        {rows.length > 0 && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              label="Actual available"
              value={stockSummary.actualAvailable}
              accent="emerald"
              icon={Layers}
            />
            <SummaryCard
              label="Actual plants (slot)"
              value={stockSummary.actualPlants}
              accent="teal"
              icon={Sprout}
            />
            <SummaryCard
              label="From secondary shed"
              value={stockSummary.shedSynced}
              accent="sky"
              sub={`${stockSummary.batches} batch(es) linked`}
            />
            <SummaryCard
              label="Slots in view"
              value={rows.length}
              accent="slate"
              sub="Current & upcoming"
            />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Plant</label>
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select plant</option>
              {plants.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Subtype</label>
            <select
              value={subtypeId}
              onChange={(e) => setSubtypeId(e.target.value)}
              disabled={!plantId}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
              <option value="">Select subtype</option>
              {subtypes.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Month (optional)</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">All months</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            {rows.length} slot{rows.length !== 1 ? "s" : ""} (current & upcoming)
          </span>
          {dirtyCount > 0 && (
            <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800">
              {dirtyCount} unsaved change{dirtyCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {!plantId || !subtypeId ? (
          <p className="text-center text-slate-500 py-16 text-sm">
            Select a plant and subtype to load slots.
          </p>
        ) : loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-center text-slate-500 py-16 text-sm">
            No current or upcoming slots for this selection.
          </p>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-sm min-w-[1400px]">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-600">
                  <th className="px-3 py-3">Date range</th>
                  <th className="px-3 py-3">Month</th>
                  <th className="px-3 py-3 text-center">Slot</th>
                  <th className="px-3 py-3 text-right">Capacity</th>
                  <th className="px-3 py-3 text-right">Booked</th>
                  <th className="px-3 py-3 text-right">Dispatched & completed</th>
                  <th className="px-3 py-3 text-right">Remaining to dispatch</th>
                  <th className="px-3 py-3 text-right">Available</th>
                  <th className="px-3 py-3 text-right">Sowed</th>
                  <th className="px-3 py-3 text-right">Actual plants</th>
                  <th className="px-3 py-3 text-right bg-emerald-50/80">Actual avail.</th>
                  <th className="px-3 py-3 text-center">Batches</th>
                  <th className="px-3 py-3 text-right">Closing stock</th>
                  <th className="px-3 py-3 text-center">History</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const dirty = isRowDirty(row)
                  const isActive = Boolean(row.status)
                  return (
                    <tr
                      key={row._id}
                      className={`border-t ${dirty ? "bg-amber-50/80" : "hover:bg-slate-50"} ${
                        !isActive ? "opacity-60" : ""
                      }`}>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800">
                        {row.startDay} – {row.endDay}
                      </td>
                      <td className="px-3 py-2 text-slate-600">{row.month}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          disabled={togglingId === row._id}
                          onClick={() => handleToggleStatus(row)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 ${
                            isActive ? "bg-teal-600" : "bg-slate-300"
                          }`}
                          aria-pressed={isActive}
                          title={isActive ? "Slot on — click to turn off" : "Slot off — click to turn on"}>
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                              isActive ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="block text-[10px] font-medium text-slate-500 mt-0.5">
                          {isActive ? "On" : "Off"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {(row.totalPlants ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-800">
                        {(row.totalBookedPlants ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {(row.totalDispatchedPlants ?? 0).toLocaleString()}
                      </td>
                      <td
                        className={`px-3 py-2 text-right tabular-nums font-medium ${
                          (row.remainingToDispatch ?? 0) > 0
                            ? "text-amber-700"
                            : "text-slate-600"
                        }`}>
                        {(row.remainingToDispatch ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.availablePlants ?? ""}
                          onChange={(e) =>
                            updateRow(row._id, "availablePlants", e.target.value)
                          }
                          className="w-full max-w-[120px] ml-auto block rounded-lg border border-emerald-200 px-2 py-1.5 text-right text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                        {(row.plantsSowed ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.actualPlants ?? ""}
                          onChange={(e) =>
                            updateRow(row._id, "actualPlants", e.target.value)
                          }
                          className="w-full max-w-[120px] ml-auto block rounded-lg border border-teal-200 px-2 py-1.5 text-right text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        />
                      </td>
                      <td className="px-3 py-2 bg-emerald-50/50">
                        <button
                          type="button"
                          onClick={() => setBreakdownSlot(row)}
                          className="group ml-auto flex w-full max-w-[130px] flex-col items-end rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-right shadow-sm transition hover:border-emerald-400 hover:shadow-md">
                          <span className="text-base font-bold tabular-nums text-emerald-800">
                            {(row.actualAvailable ?? 0).toLocaleString()}
                          </span>
                          {(row.linkedBatchCount ?? 0) > 0 && (
                            <span className="text-[10px] font-medium text-emerald-600 group-hover:underline">
                              {row.linkedBatchCount} batch · tap detail
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {(row.linkedBatchCount ?? 0) > 0 ? (
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                            {row.linkedBatchCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.closingStock ?? ""}
                          onChange={(e) =>
                            updateRow(row._id, "closingStock", e.target.value)
                          }
                          className="w-full max-w-[120px] ml-auto block rounded-lg border border-amber-200 px-2 py-1.5 text-right text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setHistorySlot(row)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200">
                          <History className="h-3.5 w-3.5" />
                          Log
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={saving || dirtyCount === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RotateCcw className="h-4 w-4" />
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || dirtyCount === 0 || !plantId || !subtypeId}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </button>
        </div>
      </div>

      <StockChangeHistoryModal
        open={Boolean(historySlot)}
        onClose={() => setHistorySlot(null)}
        slot={historySlot}
      />

      <SlotActualBreakdownModal
        open={Boolean(breakdownSlot)}
        onClose={() => setBreakdownSlot(null)}
        slotRow={breakdownSlot}
        onSlotChanged={fetchSlots}
      />
    </div>
  )
}

function SummaryCard({ label, value, accent = "slate", icon: Icon, sub }) {
  const accents = {
    emerald: "from-emerald-50 to-green-50 border-emerald-100 text-emerald-800",
    teal: "from-teal-50 to-cyan-50 border-teal-100 text-teal-800",
    sky: "from-sky-50 to-blue-50 border-sky-100 text-sky-800",
    slate: "from-slate-50 to-gray-50 border-slate-200 text-slate-800"
  }
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${accents[accent] || accents.slate}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
          <p className="mt-1 text-2xl font-black tabular-nums">
            {Number(value || 0).toLocaleString()}
          </p>
          {sub && <p className="mt-1 text-[11px] opacity-80">{sub}</p>}
        </div>
        {Icon && <Icon className="h-6 w-6 shrink-0 opacity-50" />}
      </div>
    </div>
  )
}

export default SlotStockPanel
