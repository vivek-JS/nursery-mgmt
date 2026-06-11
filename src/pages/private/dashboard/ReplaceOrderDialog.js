import React, { useState, useEffect, useCallback } from "react"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

/** Only these orders may be linked from this dialog (quick add to vehicle). */
const READY_STATUSES = ["READY_FOR_DISPATCH"]

/**
 * Search nursery orders (ready for dispatch only) and link one to the open dispatch.
 */
const ReplaceOrderDialog = ({
  open,
  onClose,
  dispatchId,
  defaultCavityId,
  defaultShadeId,
  defaultDispatchQuantity,
  onLinked,
}) => {
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [linkingId, setLinkingId] = useState(null)
  const [qty, setQty] = useState(defaultDispatchQuantity || "")

  useEffect(() => {
    if (!open) return
    setSearch("")
    setResults([])
    setQty(defaultDispatchQuantity || "")
  }, [open, defaultDispatchQuantity])

  const runSearch = useCallback(async () => {
    const q = String(search || "").trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const inst = NetworkManager(API.ORDER.GET_ORDERS_BY_STATUS)
      const res = await inst.request(
        {},
        {
          status: READY_STATUSES.join(","),
          search: q,
          page: 1,
          limit: 25,
        }
      )
      const payload = res?.data?.data
      const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []
      setResults(list)
    } catch (e) {
      console.error(e)
      Toast.error("Search failed")
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      void runSearch()
    }, 350)
    return () => clearTimeout(t)
  }, [search, open, runSearch])

  const linkOrder = async (order) => {
    const oid = order?._id || order?.id
    if (!oid || !dispatchId) {
      Toast.error("Missing order or dispatch")
      return
    }
    const q = Math.max(1, parseInt(qty, 10) || parseInt(order?.remainingPlants ?? order?.numberOfPlants, 10) || 0)
    if (!q) {
      Toast.error("Enter quantity to dispatch")
      return
    }
    if (!defaultCavityId || !defaultShadeId) {
      Toast.error("This dispatch has no default cavity/shade — add from dispatch editor.")
      return
    }
    setLinkingId(String(oid))
    try {
      const inst = NetworkManager(API.DISPATCHED.ADD_ORDER_TO_DISPATCH)
      await inst.request(
        {
          orderId: oid,
          dispatchQuantity: q,
          cavityId: defaultCavityId,
          shadeId: defaultShadeId,
        },
        [String(dispatchId)]
      )
      Toast.success("Order linked to dispatch")
      onLinked?.()
      onClose?.()
    } catch (e) {
      console.error(e)
      Toast.error(e?.response?.data?.message || e?.message || "Could not add order")
    } finally {
      setLinkingId(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-xl flex flex-col">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">Link existing order</h3>
          <p className="mt-1 text-xs text-gray-500">
            Search by farmer name, mobile, or order # — link a {READY_STATUSES.join(" / ")} order already in the system.
          </p>
        </div>
        <div className="p-4 space-y-3 shrink-0">
          <input
            type="text"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            placeholder="Search (min 2 characters)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div>
            <label className="text-xs font-medium text-gray-600">Plants to put on vehicle</label>
            <input
              type="number"
              min={1}
              className="mt-0.5 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading && <p className="text-sm text-gray-500 py-2">Searching…</p>}
          {!loading && search.trim().length >= 2 && results.length === 0 && (
            <p className="text-sm text-gray-500 py-2">No matching orders.</p>
          )}
          <ul className="space-y-2">
            {results.map((o) => {
              const id = String(o._id || o.id || "")
              const label = o?.farmer?.name || o?.customerName || "—"
              const mob = o?.farmer?.mobileNumber || o?.customerMobile || ""
              const st = o?.orderStatus || ""
              const rem = Number(o?.remainingPlants ?? o?.numberOfPlants ?? 0) || 0
              return (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      #{o?.orderId ?? id.slice(-6)} · {label}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {mob} · {st} · remaining {rem}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={linkingId === id}
                    onClick={() => linkOrder(o)}
                    className="shrink-0 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {linkingId === id ? "…" : "Add"}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="border-t border-gray-200 px-4 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ReplaceOrderDialog
