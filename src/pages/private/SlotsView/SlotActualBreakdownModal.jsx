import React, { useEffect, useState } from "react"
import {
  X,
  Loader2,
  Sprout,
  Calendar,
  Warehouse,
  ChevronRight,
  Leaf
} from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"

const fmt = (iso) => {
  if (!iso) return "—"
  const m = moment(iso)
  return m.isValid() ? m.format("DD MMM YYYY") : "—"
}

const SlotActualBreakdownModal = ({ open, onClose, slotRow }) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [expandedBatch, setExpandedBatch] = useState(null)

  useEffect(() => {
    if (!open || !slotRow?._id) {
      setData(null)
      setExpandedBatch(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const instance = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
        const response = await instance.request({}, [slotRow._id])
        const payload = response?.data?.data ?? response?.data ?? response
        if (!cancelled) setData(payload)
      } catch (e) {
        console.error(e)
        Toast.error("Failed to load batch breakdown")
        if (!cancelled) setData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, slotRow?._id])

  if (!open) return null

  const summary = data?.summary || {}
  const batches = data?.batches || []
  const slot = data?.slot || {}
  const actualAvailable =
    slotRow?.actualAvailable ??
    Math.max(0, (slotRow?.actualPlants ?? 0) - (slotRow?.remainingToDispatch ?? 0))

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
                Actual available · batch detail
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {slot.startDay} – {slot.endDay}
              </h2>
              <p className="mt-1 text-sm text-emerald-50">
                {[slot.plantName, slot.subtypeName].filter(Boolean).join(" · ")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/90 hover:bg-white/15">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase text-emerald-100">Actual avail.</p>
              <p className="text-lg font-black tabular-nums">
                {actualAvailable.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase text-emerald-100">On slot</p>
              <p className="text-lg font-black tabular-nums">
                {(summary.actualPlants ?? slotRow?.actualPlants ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase text-emerald-100">Shed synced</p>
              <p className="text-lg font-black tabular-nums">
                {(summary.shedSyncedToSlot ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/15 px-3 py-2 backdrop-blur">
              <p className="text-[10px] uppercase text-emerald-100">Batches</p>
              <p className="text-lg font-black tabular-nums">{summary.batchCount ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="mt-3 text-sm">Loading batch & sowing data…</p>
            </div>
          )}

          {!loading && batches.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
              <Warehouse className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-600">
                No secondary shed stock linked to this slot yet.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Stock appears after lagwad with a matching ready date, or Mark ready on inward.
              </p>
            </div>
          )}

          {!loading &&
            batches.map((batch) => {
              const open = expandedBatch === batch.batchId
              return (
                <div
                  key={batch.batchId}
                  className="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                    onClick={() =>
                      setExpandedBatch(open ? null : batch.batchId)
                    }>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-800 font-bold text-sm">
                      {batch.batchNumber}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        Batch {batch.batchNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {batch.plantLabel} · {batch.subtypeLabel}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
                          <Sprout className="h-3 w-3" />
                          Sown {batch.anchorSowingLabel || "—"}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-sky-800">
                          <Calendar className="h-3 w-3" />
                          Ready {fmt(batch.secondaryReadyDate)}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-bold tabular-nums text-emerald-700">
                        {batch.totalSyncedToSlot.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500">synced plants</p>
                      <ChevronRight
                        className={`ml-auto mt-1 h-4 w-4 text-slate-400 transition ${
                          open ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3">
                      <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                        <MiniStat label="In shed" value={batch.totalAvailableInShed} />
                        <MiniStat label="Synced" value={batch.totalSyncedToSlot} />
                        <MiniStat label="Lines" value={batch.lines.length} />
                        <MiniStat
                          label="Primary ready"
                          value={fmt(batch.primaryReadyDate)}
                          text
                        />
                      </div>
                      <div className="space-y-2">
                        {batch.lines.map((ln) => (
                          <div
                            key={String(ln.secondaryInwardId)}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white bg-white px-3 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              <Leaf className="h-3.5 w-3.5 text-teal-600" />
                              <span className="font-medium text-slate-800">
                                {ln.pollyhouse || "—"} · {ln.size} · {ln.cavity}cav
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="tabular-nums text-slate-600">
                                Planted {fmt(ln.secondaryInwardDate)}
                              </span>
                              <span
                                className={`rounded-full px-2 py-0.5 font-semibold ${
                                  ln.dispatchEligible
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}>
                                {ln.dispatchEligible ? "Ready" : "Waiting"}
                              </span>
                              <span className="font-bold tabular-nums text-teal-700">
                                {ln.availableQuantity.toLocaleString()} avail
                              </span>
                              <span className="text-slate-500">
                                {ln.slotStockSyncedPlants.toLocaleString()} on slot
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
