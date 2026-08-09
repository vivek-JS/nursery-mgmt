import React, { useState, useEffect, useCallback } from "react"
import { NetworkManager, API } from "network/core"
import { PageLoader } from "components"

const InvoiceSequencePanel = () => {
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [rows, setRows] = useState([])
  const [fallback, setFallback] = useState({ prefix: "R", nextNumber: 1 })
  const [savingFallback, setSavingFallback] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const plantsInst = NetworkManager(API.INVOICE_SEQUENCE.GET_PLANTS)
      const globalInst = NetworkManager(API.INVOICE_SEQUENCE.GET)
      const [plantsRes, globalRes] = await Promise.all([
        plantsInst.request(),
        globalInst.request().catch(() => null),
      ])
      const list = plantsRes?.data?.data
      setRows(Array.isArray(list) ? list.map((r) => ({ ...r, _draftPrefix: r.prefix, _draftNext: r.nextNumber })) : [])
      const g = globalRes?.data?.data
      if (g) {
        setFallback({
          prefix: g.prefix != null ? String(g.prefix) : "R",
          nextNumber: Number(g.nextNumber) > 0 ? Math.floor(Number(g.nextNumber)) : 1,
        })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateDraft = (plantId, patch) => {
    setRows((prev) =>
      prev.map((r) => (String(r.plantId) === String(plantId) ? { ...r, ...patch } : r))
    )
  }

  const savePlant = async (row) => {
    const p = String(row._draftPrefix || "").trim()
    const nn = Math.max(1, Math.floor(Number(row._draftNext) || 1))
    if (!p) {
      window.alert("Prefix is required (e.g. B).")
      return
    }
    setSavingId(row.plantId)
    try {
      const inst = NetworkManager(API.INVOICE_SEQUENCE.PUT_PLANT)
      await inst.request({ plantId: row.plantId, prefix: p, nextNumber: nn })
      await load()
      window.alert(
        `Saved ${row.plantName}. Previously printed challan numbers on orders are unchanged. Cancelled legs do not free numbers.`
      )
    } catch (e) {
      console.error(e)
      window.alert(e?.response?.data?.message || e?.message || "Save failed")
    } finally {
      setSavingId(null)
    }
  }

  const saveFallback = async () => {
    const p = String(fallback.prefix || "").trim()
    const nn = Math.max(1, Math.floor(Number(fallback.nextNumber) || 1))
    if (!p) {
      window.alert("Fallback prefix is required.")
      return
    }
    setSavingFallback(true)
    try {
      const inst = NetworkManager(API.INVOICE_SEQUENCE.PUT)
      await inst.request({ prefix: p, nextNumber: nn })
      await load()
      window.alert("Fallback (global) sequence saved. Used only if plant id is missing.")
    } catch (e) {
      console.error(e)
      window.alert(e?.response?.data?.message || e?.message || "Save failed")
    } finally {
      setSavingFallback(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Each <strong className="font-semibold text-gray-800">plant</strong> (Banana, Papaya,
          Muskmelon, …) has its own delivery challan sequence:{" "}
          <strong className="font-semibold text-gray-800">prefix + number</strong> (e.g.{" "}
          <span className="font-mono">B640</span>, <span className="font-mono">P120</span>). The
          next number is issued when an order is fully dispatched (or instant DISPATCHED).
        </p>
        <p className="text-sm text-gray-600">
          Changing prefix or next number does <em>not</em> rewrite numbers already stored on
          orders. Cancelled dispatch legs do not free numbers.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
            <tr>
              <th className="px-3 py-2">Plant</th>
              <th className="px-3 py-2">Prefix</th>
              <th className="px-3 py-2">Next number</th>
              <th className="px-3 py-2">Preview</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                  No plants found in Plant CMS.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const preview = `${String(row._draftPrefix || "").trim()}${Math.max(
                  1,
                  Math.floor(Number(row._draftNext) || 1)
                )}`
                return (
                  <tr key={row.plantId} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900">{row.plantName}</td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        className="w-24 rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                        value={row._draftPrefix ?? ""}
                        maxLength={24}
                        onChange={(e) => updateDraft(row.plantId, { _draftPrefix: e.target.value })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="w-28 rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
                        value={row._draftNext ?? 1}
                        onChange={(e) =>
                          updateDraft(row.plantId, { _draftNext: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-700">{preview}</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        disabled={savingId === row.plantId}
                        onClick={() => void savePlant(row)}
                        className="inline-flex items-center rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-green-700 disabled:opacity-50">
                        {savingId === row.plantId ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <details className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-amber-900">
          Fallback global sequence (rare — only if plant id missing)
        </summary>
        <div className="mt-3 grid max-w-md gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Prefix</span>
            <input
              type="text"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              value={fallback.prefix}
              onChange={(e) => setFallback((f) => ({ ...f, prefix: e.target.value }))}
              maxLength={24}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Next invoice number</span>
            <input
              type="number"
              min={1}
              step={1}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              value={fallback.nextNumber}
              onChange={(e) =>
                setFallback((f) => ({ ...f, nextNumber: Number(e.target.value) }))
              }
            />
          </label>
          <button
            type="button"
            disabled={savingFallback}
            onClick={() => void saveFallback()}
            className="inline-flex items-center rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white shadow hover:bg-amber-800 disabled:opacity-50">
            {savingFallback ? "Saving…" : "Save fallback"}
          </button>
        </div>
      </details>
    </div>
  )
}

export default InvoiceSequencePanel
