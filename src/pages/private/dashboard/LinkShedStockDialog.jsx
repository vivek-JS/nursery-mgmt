import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Link2 } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import {
  normalizeDispatchOrderPlantFields,
  orderPlantDisplayLabel,
  orderPlantIds,
} from "utils/orderPlantResolve"

function lineKey(ln) {
  return [
    String(ln?.batchId ?? ""),
    String(ln?.secondaryInwardId ?? ""),
    String(ln?.batchNumber ?? "").trim(),
    String(ln?.pollyhouse ?? "").trim(),
  ].join("|")
}

function dispatchQtyForOrder(dispatch, orderId) {
  const oid = String(orderId ?? "").trim()
  const rows = Array.isArray(dispatch?.orderDispatchDetails)
    ? dispatch.orderDispatchDetails
    : []
  const row = rows.find(
    (d) => String(d?.orderId?._id ?? d?.orderId ?? "") === oid
  )
  return Math.max(0, Number(row?.dispatchQuantity) || 0)
}

const LinkShedStockDialog = ({
  open,
  onClose,
  dispatchId,
  dispatchSnapshot,
  order,
  defaultPlants,
  onLinked,
}) => {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [allSuggestions, setAllSuggestions] = useState([])
  const [showNotReady, setShowNotReady] = useState(false)
  const [selectedKey, setSelectedKey] = useState("")
  const [plants, setPlants] = useState("")

  const suggestions = useMemo(() => {
    const base = allSuggestions || []
    if (showNotReady) return base
    const ready = base.filter((ln) => ln?.dispatchEligible !== false)
    return ready.length ? ready : base
  }, [allSuggestions, showNotReady])

  const normalizedOrder = useMemo(
    () => (order ? normalizeDispatchOrderPlantFields(order) : null),
    [order]
  )
  const orderMongoId = String(normalizedOrder?._id ?? normalizedOrder?.id ?? "").trim()
  const plantLabel = normalizedOrder ? orderPlantDisplayLabel(normalizedOrder) : "Order"

  const selectedLine = useMemo(
    () => suggestions.find((ln) => lineKey(ln) === selectedKey) || null,
    [suggestions, selectedKey]
  )

  const avail = selectedLine
    ? Math.max(
        0,
        Number(selectedLine.remainingPlants ?? selectedLine.availableQuantity) || 0
      )
    : 0

  const loadSuggestions = useCallback(async () => {
    const o = order ? normalizeDispatchOrderPlantFields(order) : null
    const { plantCmsId, plantSubtypeId } = orderPlantIds(o || {})
    if (!plantCmsId || !plantSubtypeId) {
      setAllSuggestions([])
      return
    }
    setLoading(true)
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.FARMER_DISPATCH_PICKUP_BATCH_SUGGESTIONS)
      const res = await inst.request({}, {
        plantCmsId: String(plantCmsId),
        plantSubtypeId: String(plantSubtypeId),
      })
      const payload = res?.data?.data ?? res?.data
      const raw = Array.isArray(payload?.suggestions) ? payload.suggestions : []
      const withStock = raw.filter(
        (ln) => (Number(ln?.availableQuantity) || 0) > 0 || (Number(ln?.remainingPlants) || 0) > 0
      )
      setAllSuggestions(withStock.length ? withStock : raw)
    } catch (e) {
      console.error(e)
      Toast.error(e?.response?.data?.message || e?.message || "Could not load shed stock")
      setAllSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [order])

  useEffect(() => {
    if (!open) return
    setSelectedKey("")
    const dq =
      defaultPlants != null && defaultPlants !== ""
        ? Number(defaultPlants)
        : dispatchQtyForOrder(dispatchSnapshot, orderMongoId)
    setPlants(dq > 0 ? String(dq) : "")
    void loadSuggestions()
  }, [open, loadSuggestions, defaultPlants, dispatchSnapshot, orderMongoId])

  useEffect(() => {
    if (!open || selectedKey || !suggestions.length) return
    const ready = suggestions.find((ln) => ln?.dispatchEligible) || suggestions[0]
    if (ready) setSelectedKey(lineKey(ready))
  }, [open, suggestions, selectedKey])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!dispatchId || !orderMongoId) {
      Toast.error("Missing dispatch or order")
      return
    }
    if (!selectedLine?.secondaryInwardId) {
      Toast.error("Select a shed inward line to link")
      return
    }
    const n = Math.max(0, Math.floor(Number(plants) || 0))
    if (n < 1) {
      Toast.error("Enter plants to link")
      return
    }
    if (avail > 0 && n > avail) {
      Toast.error(`Cannot link more than ${avail} available in this line`)
      return
    }
    setSubmitting(true)
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_VEHICLE_LOAD)
      const res = await inst.request(
        {
          linkedOrderId: orderMongoId,
          plantRowIndex: 0,
          inwardSelections: [
            {
              secondaryInwardId: String(selectedLine.secondaryInwardId),
              ...(selectedLine.batchId ? { batchId: String(selectedLine.batchId) } : {}),
              plants: n,
            },
          ],
          remarks: "Linked from delivery complete form",
        },
        [String(dispatchId)]
      )
      const ok = res?.data?.status !== false
      if (!ok && res?.data?.message) {
        throw new Error(res.data.message)
      }
      Toast.success(res?.data?.message || "Shed stock linked to this order")
      onLinked?.()
      onClose?.()
    } catch (err) {
      console.error(err)
      Toast.error(err?.response?.data?.message || err?.message || "Link failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-3">
      <div
        role="dialog"
        aria-labelledby="link-shed-stock-title"
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 id="link-shed-stock-title" className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Link2 className="h-4 w-4 text-amber-700" />
            Link shed stock
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            <span className="font-semibold text-gray-800">{plantLabel}</span> · Order #
            {normalizedOrder?.order ?? normalizedOrder?.orderId ?? "—"}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-amber-950/90">
            Lists shed lots for this order&apos;s <strong>plant + subtype</strong> (same API as batch
            dropdown) — any lagwad batch with stock can appear (e.g. &quot;Bana G9&quot; is a lot
            name, not order #3562). Pick the lot/shed you actually loaded for this farmer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading lagwad lines…
              </p>
            ) : suggestions.length === 0 ? (
              <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                No secondary inward stock found for this plant. Mark lagwad ready in shed ops or
                enter batch manually if your process allows it.
              </p>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-gray-700">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300"
                    checked={showNotReady}
                    onChange={(e) => {
                      setShowNotReady(e.target.checked)
                      setSelectedKey("")
                    }}
                  />
                  Show lines not lagwad-ready yet (
                  {allSuggestions.filter((ln) => ln?.dispatchEligible === false).length} hidden by
                  default)
                </label>
                <div>
                  <label className="text-[11px] font-medium text-gray-600">Batch / shed line</label>
                  <select
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}>
                    <option value="">Select line</option>
                    {suggestions.map((ln) => {
                      const k = lineKey(ln)
                      const q = Math.max(
                        0,
                        Number(ln.remainingPlants ?? ln.availableQuantity) || 0
                      )
                      const bn = String(ln.batchNumber ?? "—").trim()
                      const shed = String(ln.pollyhouse ?? "").trim() || "—"
                      const lag = ln.dispatchEligible ? "lagwad ready" : "not ready"
                      const linePlant = [ln.plantLabel, ln.subtypeLabel].filter(Boolean).join(" · ")
                      return (
                        <option key={k} value={k}>
                          Lot {bn}
                          {linePlant ? ` (${linePlant})` : ""} · {shed} ·{" "}
                          {q.toLocaleString("en-IN")} pl · {lag}
                        </option>
                      )
                    })}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-600">Plants to link</label>
                  <input
                    type="number"
                    min={1}
                    max={avail > 0 ? avail : undefined}
                    className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
                    value={plants}
                    onChange={(e) => setPlants(e.target.value)}
                  />
                  {avail > 0 ? (
                    <p className="mt-1 text-[10px] text-gray-500">
                      Available on this line: {avail.toLocaleString("en-IN")}
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading || !suggestions.length || !selectedKey}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Link to order
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default LinkShedStockDialog
