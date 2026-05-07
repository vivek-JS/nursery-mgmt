import React, { useState, useEffect, useCallback } from "react"
import { NetworkManager, API } from "network/core"
import { PageLoader } from "components"

const InvoiceSequencePanel = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [prefix, setPrefix] = useState("R")
  const [nextNumber, setNextNumber] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const inst = NetworkManager(API.INVOICE_SEQUENCE.GET)
      const res = await inst.request()
      const d = res?.data?.data
      if (d) {
        setPrefix(d.prefix != null ? String(d.prefix) : "R")
        setNextNumber(Number(d.nextNumber) > 0 ? Math.floor(Number(d.nextNumber)) : 1)
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

  const save = async () => {
    const p = String(prefix || "").trim()
    const nn = Math.max(1, Math.floor(Number(nextNumber) || 1))
    if (!p) {
      window.alert("Prefix is required (e.g. R).")
      return
    }
    setSaving(true)
    try {
      const inst = NetworkManager(API.INVOICE_SEQUENCE.PUT)
      await inst.request({ prefix: p, nextNumber: nn })
      await load()
      window.alert("Saved. Previously printed challan numbers on orders are unchanged.")
    } catch (e) {
      console.error(e)
      window.alert(e?.response?.data?.message || e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-gray-600">
        Delivery challan invoices use{" "}
        <strong className="font-semibold text-gray-800">prefix + number</strong> (e.g.{" "}
        <span className="font-mono">R640</span>, <span className="font-mono">R641</span>). Each
        order line on a vehicle dispatch gets the next number when the dispatch is saved.
      </p>
      <p className="text-sm text-gray-600">
        <strong className="font-semibold text-gray-800">Next number</strong> is the value that will
        be issued on the next dispatch leg. Changing prefix or next number does not rewrite numbers
        already stored on orders.
      </p>
      <div className="grid gap-3">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Prefix</span>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            maxLength={24}
            placeholder="R"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Next invoice number</span>
          <input
            type="number"
            min={1}
            step={1}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            value={nextNumber}
            onChange={(e) => setNextNumber(Number(e.target.value))}
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700 disabled:opacity-50">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  )
}

export default InvoiceSequencePanel
