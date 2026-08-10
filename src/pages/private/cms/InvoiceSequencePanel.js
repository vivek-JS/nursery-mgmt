import React, { useState, useEffect, useCallback } from "react"
import { NetworkManager, API } from "network/core"
import { PageLoader } from "components"

function bucketDraftKey(kind, billable, field) {
  const b = billable ? "billable" : "nonBillable"
  return `_${kind}_${b}_${field}`
}

function GlobalSequenceTable({ title, help, kind, draft, savingKey, updateDraft, saveBucket }) {
  const billPrefix = draft[bucketDraftKey(kind, true, "prefix")] ?? ""
  const billNext = draft[bucketDraftKey(kind, true, "next")] ?? 1
  const nbPrefix = draft[bucketDraftKey(kind, false, "prefix")] ?? ""
  const nbNext = draft[bucketDraftKey(kind, false, "next")] ?? 1
  const billPreview = `${String(billPrefix).trim()}${Math.max(1, Math.floor(Number(billNext) || 1))}`
  const nbPreview = `${String(nbPrefix).trim()}${Math.max(1, Math.floor(Number(nbNext) || 1))}`
  const savingB = savingKey === `${kind}:billable`
  const savingNb = savingKey === `${kind}:nonBillable`
  const billFocus =
    kind === "invoice"
      ? "focus:border-blue-600 focus:ring-blue-600"
      : "focus:border-green-600 focus:ring-green-600"
  const nbFocus =
    kind === "invoice"
      ? "focus:border-indigo-600 focus:ring-indigo-600"
      : "focus:border-amber-600 focus:ring-amber-600"
  const billBtn =
    kind === "invoice" ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
  const nbBtn =
    kind === "invoice" ? "bg-indigo-700 hover:bg-indigo-800" : "bg-amber-700 hover:bg-amber-800"

  const renderBucket = (billable, prefix, next, preview, saving, btnClass, focusClass) => (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="mb-3 text-sm font-semibold text-gray-800">
        {billable ? "Billable" : "Non-billable"}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Prefix</span>
          <input
            type="text"
            className={`mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 ${focusClass}`}
            value={prefix}
            maxLength={24}
            onChange={(e) =>
              updateDraft(bucketDraftKey(kind, billable, "prefix"), e.target.value)
            }
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Next</span>
          <input
            type="number"
            min={1}
            step={1}
            className={`mt-1 block w-full rounded-md border border-gray-300 px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-1 ${focusClass}`}
            value={next}
            onChange={(e) =>
              updateDraft(bucketDraftKey(kind, billable, "next"), Number(e.target.value))
            }
          />
        </label>
      </div>
      <p className="mt-2 font-mono text-sm text-gray-600">Preview: {preview}</p>
      <button
        type="button"
        disabled={saving}
        onClick={() => void saveBucket(kind, billable)}
        className={`mt-3 inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-white shadow disabled:opacity-50 ${btnClass}`}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  )

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{help}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {renderBucket(true, billPrefix, billNext, billPreview, savingB, billBtn, billFocus)}
        {renderBucket(false, nbPrefix, nbNext, nbPreview, savingNb, nbBtn, nbFocus)}
      </div>
    </div>
  )
}

const InvoiceSequencePanel = () => {
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [draft, setDraft] = useState({})

  const applyPayload = (data) => {
    const dc = data?.dc || {}
    const invoice = data?.invoice || {}
    setDraft({
      [bucketDraftKey("dc", true, "prefix")]: dc.billable?.prefix ?? "B",
      [bucketDraftKey("dc", true, "next")]: dc.billable?.nextNumber ?? 1,
      [bucketDraftKey("dc", false, "prefix")]: dc.nonBillable?.prefix ?? "BN",
      [bucketDraftKey("dc", false, "next")]: dc.nonBillable?.nextNumber ?? 1,
      [bucketDraftKey("invoice", true, "prefix")]: invoice.billable?.prefix ?? "INV",
      [bucketDraftKey("invoice", true, "next")]: invoice.billable?.nextNumber ?? 1,
      [bucketDraftKey("invoice", false, "prefix")]: invoice.nonBillable?.prefix ?? "INN",
      [bucketDraftKey("invoice", false, "next")]: invoice.nonBillable?.nextNumber ?? 1,
    })
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const inst = NetworkManager(API.INVOICE_SEQUENCE.GET)
      const res = await inst.request()
      applyPayload(res?.data?.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateDraft = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const saveBucket = async (kind, billable) => {
    const prefix = String(draft[bucketDraftKey(kind, billable, "prefix")] || "").trim()
    const nn = Math.max(1, Math.floor(Number(draft[bucketDraftKey(kind, billable, "next")]) || 1))
    if (!prefix) {
      window.alert("Prefix is required (e.g. B or INV).")
      return
    }
    const saveKey = `${kind}:${billable ? "billable" : "nonBillable"}`
    setSavingKey(saveKey)
    try {
      const inst = NetworkManager(API.INVOICE_SEQUENCE.PUT)
      await inst.request({
        kind,
        billable,
        prefix,
        nextNumber: nn,
      })
      await load()
      window.alert(
        `Saved global ${kind === "invoice" ? "invoice" : "DC"} (${billable ? "billable" : "non-billable"}). Previously issued numbers on orders are unchanged.`
      )
    } catch (e) {
      console.error(e)
      window.alert(e?.response?.data?.message || e?.message || "Save failed")
    } finally {
      setSavingKey(null)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-gray-600">
          Global Delivery Challan and Tax Invoice sequences — billable and non-billable counters
          shared across all plants. Which bucket is used depends on the subtype{" "}
          <strong className="font-semibold text-gray-800">isBillable</strong> flag in Plant CMS.
          DC numbers are allocated on dispatch; invoice numbers when the invoice PDF is generated.
        </p>
        <p className="text-sm text-gray-600">
          Changing prefix or next number does <em>not</em> rewrite numbers already stored on orders.
          Cancelled dispatch legs do not free numbers.
        </p>
      </div>

      <GlobalSequenceTable
        title="Delivery Challan sequences"
        help="Used when creating delivery challans (billable / non-billable pages)."
        kind="dc"
        draft={draft}
        savingKey={savingKey}
        updateDraft={updateDraft}
        saveBucket={saveBucket}
      />

      <GlobalSequenceTable
        title="Tax Invoice sequences"
        help="Used when creating / duplicating complete invoices (separate from DC numbers)."
        kind="invoice"
        draft={draft}
        savingKey={savingKey}
        updateDraft={updateDraft}
        saveBucket={saveBucket}
      />
    </div>
  )
}

export default InvoiceSequencePanel
