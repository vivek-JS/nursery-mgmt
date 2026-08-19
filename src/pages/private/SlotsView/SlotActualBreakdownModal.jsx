import React, { useCallback, useEffect, useState } from "react"
import {
  X,
  Loader2,
  Sprout,
  Calendar,
  Warehouse,
  ChevronRight,
  Leaf,
  AlertTriangle,
  ShoppingBag,
  CheckCircle2,
} from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"
import {
  buildDayWiseRows,
  slotSyncStatusClass,
  slotSyncStatusLabel,
} from "./slotActualDayWise"

const fmt = (iso) => {
  if (!iso) return "—"
  const m = moment(iso)
  return m.isValid() ? m.format("DD MMM YYYY") : "—"
}

const SlotActualBreakdownModal = ({ open, onClose, slotRow, onSlotChanged }) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [expandedBatch, setExpandedBatch] = useState(null)
  const [bypassOpen, setBypassOpen] = useState(false)
  const [bypassLine, setBypassLine] = useState(null)
  const [bypassBatchId, setBypassBatchId] = useState("")
  const [bypassReason, setBypassReason] = useState("")
  const [bypassSubmitting, setBypassSubmitting] = useState(false)

  const loadBreakdown = useCallback(async () => {
    if (!slotRow?._id) {
      setData(null)
      return
    }
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
      const response = await instance.request({}, [slotRow._id])
      const payload = response?.data?.data ?? response?.data ?? response
      setData(payload)
    } catch (e) {
      console.error(e)
      Toast.error("Failed to load batch breakdown")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slotRow?._id])

  useEffect(() => {
    if (!open || !slotRow?._id) {
      setData(null)
      setExpandedBatch(null)
      setBypassOpen(false)
      setBypassLine(null)
      return
    }
    void loadBreakdown()
  }, [open, slotRow?._id, loadBreakdown])

  const openMarkReady = (line, batchId) => {
    setBypassLine(line)
    setBypassBatchId(String(batchId))
    setBypassReason("")
    setBypassOpen(true)
  }

  const submitMarkReadyForSell = async () => {
    if (!bypassLine?.secondaryInwardId || !bypassBatchId) return
    setBypassSubmitting(true)
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_INWARD_READINESS_BYPASS)
      await inst.request(
        { reason: bypassReason.trim() || "Marked ready from slot breakdown" },
        {
          pathParams: [
            bypassBatchId,
            String(bypassLine.secondaryInwardId),
          ],
        }
      )
      Toast.success("Marked ready for sell / dispatch")
      setBypassOpen(false)
      setBypassLine(null)
      await loadBreakdown()
      onSlotChanged?.()
    } catch (e) {
      Toast.error(
        e?.response?.data?.message || e?.message || "Failed to mark ready"
      )
    } finally {
      setBypassSubmitting(false)
    }
  }

  if (!open) return null

  const summary = data?.summary || {}
  const batches = data?.batches || []
  const dayWiseRows = buildDayWiseRows(batches)
  const slot = data?.slot || {}
  const pendingSync = Number(summary.pendingSlotSync) || 0
  const actualPlants =
    Number(slotRow?.actualPlants ?? summary.actualPlants ?? slot.actualPlants) || 0
  const expectedMortality =
    Number(slotRow?.expectedMortality ?? summary.expectedMortality ?? slot.expectedMortality) || 0
  const actualReadyPlants =
    Number(
      slotRow?.actualReadyPlants ?? summary.actualReadyPlantsStored ?? slot.actualReadyPlants
    ) || 0
  const orderQueueRem = Number(slotRow?.remainingToDispatch) || 0
  const actualAvailable =
    slotRow?.actualAvailable ??
    Math.max(0, actualPlants - orderQueueRem)

  const subtypeLabel =
    slot.subtypeName ||
    batches[0]?.subtypeLabel ||
    slotRow?.subtypeName ||
    ""

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 px-5 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
                Actual plants · secondary lagwad
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {slot.startDay} – {slot.endDay}
              </h2>
              <p className="mt-1 text-sm text-emerald-50">
                {[slot.plantName, subtypeLabel].filter(Boolean).join(" · ")}
                {slot.year ? ` · ${slot.year}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/90 hover:bg-white/15">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-white/20 px-3 py-2 backdrop-blur ring-1 ring-white/25">
              <p className="text-[10px] uppercase text-emerald-100">Sellable (90%)</p>
              <p className="text-lg font-black tabular-nums">{actualPlants.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-100">excludes mortality</p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase text-emerald-100">Exp. mortality</p>
              <p className="text-lg font-black tabular-nums">
                {expectedMortality.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase text-emerald-100">Actual ready</p>
              <p className="text-lg font-black tabular-nums">
                {actualReadyPlants.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-100">calendar / manual</p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase text-emerald-100">Queue avail.</p>
              <p className="text-base font-bold tabular-nums">
                {actualAvailable.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase text-emerald-100">Shed synced</p>
              <p className="text-base font-bold tabular-nums">
                {(summary.shedSyncedToSlot ?? 0).toLocaleString()}
              </p>
            </div>
            <div
              className={`rounded-xl px-3 py-2 backdrop-blur ${
                pendingSync > 0 ? "bg-amber-400/20 ring-1 ring-amber-200/30" : "bg-white/10"
              }`}>
              <p className="text-[10px] uppercase text-emerald-100">Pending sync</p>
              <p className="text-base font-bold tabular-nums">{pendingSync.toLocaleString()}</p>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase text-emerald-100">In shed</p>
              <p className="text-base font-bold tabular-nums">
                {(summary.shedAvailableInShed ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {pendingSync > 0 && (
            <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                <span className="font-semibold">{pendingSync.toLocaleString()} plants</span> are
                in the shed but not yet on slot actual — re-run lagwad sync or use readiness
                bypass if needed.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="mt-3 text-sm">Loading lagwad & batch data…</p>
            </div>
          )}

          {!loading && batches.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
              <Warehouse className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                No secondary lagwad lines linked to this slot yet.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Actual {actualPlants.toLocaleString()} · mortality{" "}
                {expectedMortality.toLocaleString()} · ready{" "}
                {actualReadyPlants.toLocaleString()}
              </p>
            </div>
          )}

          {!loading && dayWiseRows.length > 0 && (
            <div className="mb-5">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                <Calendar className="h-4 w-4 text-teal-600" />
                Day-wise lagwad → expected ready
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Lagwad</th>
                      <th className="px-3 py-2 font-semibold">Expected ready</th>
                      <th className="px-3 py-2 font-semibold text-right">On slot</th>
                      <th className="px-3 py-2 font-semibold text-right">Pending</th>
                      <th className="px-3 py-2 font-semibold text-right">In shed</th>
                      <th className="px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dayWiseRows.map((row) => {
                      const rowKey = `${row.plantedIso}|${row.expectedIso}`
                      const allSynced = row.pending <= 0 && row.onSlot > 0
                      const hasPending = row.pending > 0
                      return (
                        <tr key={rowKey} className="bg-white hover:bg-teal-50/40">
                          <td className="px-3 py-2.5 font-medium text-slate-800 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <Sprout className="h-3 w-3 text-amber-600" />
                              {fmt(row.plantedIso)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                            {fmt(row.expectedIso)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold tabular-nums text-teal-700">
                            {row.onSlot.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-amber-700">
                            {row.pending.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">
                            {row.avail.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                allSynced
                                  ? "bg-emerald-100 text-emerald-800"
                                  : hasPending && row.onSlot > 0
                                    ? "bg-sky-100 text-sky-800"
                                    : "bg-amber-100 text-amber-800"
                              }`}>
                              {allSynced ? "On slot" : hasPending && row.onSlot > 0 ? "Partial" : "Pending sync"}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && batches.length > 0 && (
            <h3 className="mb-2 text-sm font-bold text-slate-800">Batch detail</h3>
          )}

          {!loading &&
            batches.map((batch) => {
              const openBatch = expandedBatch === batch.batchId
              const sowLabel =
                batch.anchorSowingLabel ||
                batch.lagwadAnchorLabel ||
                "—"
              const readyLabel =
                batch.secondaryReadyLabel ||
                fmt(batch.secondaryReadyDate) ||
                "—"
              return (
                <div
                  key={batch.batchId}
                  className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    onClick={() =>
                      setExpandedBatch(openBatch ? null : batch.batchId)
                    }>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-800 font-bold text-xs px-1 text-center leading-tight">
                      {batch.batchNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">
                        Batch {batch.batchNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {batch.plantLabel} · {batch.subtypeLabel}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-900">
                          <Sprout className="h-3 w-3" />
                          Lagwad {sowLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-900">
                          <Calendar className="h-3 w-3" />
                          Ready {readyLabel}
                        </span>
                        {batch.anchorSowingLabel && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-900">
                            Sown {batch.anchorSowingLabel}
                          </span>
                        )}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                          +{batch.secondaryPlantReadyDays ?? 0}d secondary
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold tabular-nums text-emerald-700">
                        {batch.totalSyncedToSlot.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500">on slot</p>
                      {(batch.totalAvailableInShed ?? 0) > (batch.totalSyncedToSlot ?? 0) && (
                        <p className="text-[10px] font-medium text-amber-700">
                          +{((batch.totalAvailableInShed ?? 0) - (batch.totalSyncedToSlot ?? 0)).toLocaleString()} pending
                        </p>
                      )}
                      <ChevronRight
                        className={`ml-auto mt-1 h-4 w-4 text-slate-400 transition ${
                          openBatch ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {openBatch && (
                    <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3">
                      <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <MiniStat label="In shed" value={batch.totalAvailableInShed} />
                        <MiniStat label="On slot" value={batch.totalSyncedToSlot} />
                        <MiniStat label="Lines" value={batch.lines.length} />
                        <MiniStat
                          label="Primary ready"
                          value={batch.primaryReadyLabel || fmt(batch.primaryReadyDate)}
                          text
                        />
                      </div>
                      <div className="space-y-2">
                        {batch.lines.map((ln) => (
                          <div
                            key={String(ln.secondaryInwardId)}
                            className="rounded-lg border border-white bg-white px-3 py-2.5 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Leaf className="h-3.5 w-3.5 text-teal-600" />
                                <span className="font-semibold text-slate-800">
                                  {ln.pollyhouse || "—"}
                                </span>
                                <span className="text-slate-500">
                                  {ln.size} · {ln.cavity}cav · {ln.numberOfTrays} trays
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 font-semibold ${slotSyncStatusClass(
                                    ln.slotSyncStatus
                                  )}`}>
                                  {slotSyncStatusLabel(ln.slotSyncStatus)}
                                </span>
                                {ln.dispatchEligible || ln.readinessBypassAt ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Ready for sell
                                  </span>
                                ) : (ln.availableQuantity ?? 0) > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => openMarkReady(ln, batch.batchId)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100">
                                    <ShoppingBag className="h-3 w-3" />
                                    Mark ready for sell
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 text-slate-600">
                              <span>
                                <span className="text-slate-400">Lagwad </span>
                                {ln.lagwadLabel || fmt(ln.secondaryInwardDate)}
                              </span>
                              <span>
                                <span className="text-slate-400">Ready </span>
                                {ln.expectedReadyLabel || fmt(ln.expectedReadyDate)}
                              </span>
                              <span>
                                <span className="text-slate-400">Dispatch </span>
                                {ln.dateOfDispatchLabel || fmt(ln.dateOfDispatch) || "—"}
                              </span>
                              <span>
                                <span className="text-slate-400">Vehicle </span>
                                {ln.dispatchEligible ? "Ready to sell" : "Not yet"}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-3 font-medium tabular-nums">
                              <span className="text-teal-700">
                                {(ln.onSlotPlants ?? ln.slotStockSyncedPlants ?? 0).toLocaleString()} on slot
                              </span>
                              {(ln.pendingSlotSync ?? 0) > 0 && (
                                <span className="text-amber-700">
                                  {(ln.pendingSlotSync ?? 0).toLocaleString()} pending
                                </span>
                              )}
                              <span className="text-slate-500">
                                {(ln.availableQuantity ?? 0).toLocaleString()} in shed
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-900">
            Close
          </button>
        </div>
      </div>

      {bypassOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close mark ready dialog"
            onClick={() => {
              if (bypassSubmitting) return
              setBypassOpen(false)
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Mark ready for sell</h3>
            <p className="mt-1 text-sm text-slate-600">
              Bypasses the calendar rule (lagwad + secondary-ready days). Stock becomes eligible
              for vehicle dispatch and sow-ready lists.
            </p>
            {bypassLine && (
              <p className="mt-3 text-sm text-slate-700">
                <span className="font-semibold">{bypassLine.pollyhouse || "—"}</span>
                {" · "}
                {bypassLine.size}
                {" · "}
                {(bypassLine.availableQuantity ?? 0).toLocaleString()} in shed
              </p>
            )}
            <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Reason (optional)
            </label>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
              rows={3}
              value={bypassReason}
              onChange={(e) => setBypassReason(e.target.value)}
              placeholder="e.g. quality check done, early sell"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={bypassSubmitting}
                onClick={() => setBypassOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={bypassSubmitting}
                onClick={() => void submitMarkReadyForSell()}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
                {bypassSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
                Confirm ready for sell
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, text = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
      <p className="text-[10px] uppercase text-slate-500">{label}</p>
      <p className="font-semibold tabular-nums text-slate-900">
        {text ? value : Number(value || 0).toLocaleString()}
      </p>
    </div>
  )
}

export default SlotActualBreakdownModal
