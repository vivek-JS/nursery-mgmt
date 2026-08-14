import React, { useEffect, useMemo, useState } from "react"
import { listInvoiceNumberRows } from "./invoiceNumberUtils"

export default function DuplicateInvoiceDialog({ open, dispatch, onConfirm, onClose }) {
  const seedRows = useMemo(
    () => (open && dispatch ? listInvoiceNumberRows(dispatch) : []),
    [dispatch, open]
  )
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!open) return
    setRows(seedRows.map((r) => ({ ...r })))
  }, [open, seedRows])

  if (!open) return null

  const updateRow = (orderId, patch) => {
    setRows((prev) =>
      prev.map((r) => (String(r.orderId) === String(orderId) ? { ...r, ...patch } : r))
    )
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">Duplicate invoice</h2>
          <p className="mt-1 text-sm text-gray-600">
            Invoice numbers are prefilled with the current values. Edit if needed, then generate a
            new PDF (previous PDF stays in history). Sequence counters are not consumed for manual
            overrides.
          </p>
        </div>
        <div className="space-y-4 px-5 py-4">
          {rows.length === 0 ? (
            <p className="text-sm text-gray-500">No orders found on this dispatch.</p>
          ) : (
            rows.map((row) => (
              <div
                key={row.orderId}
                className="rounded-lg border border-gray-200 bg-gray-50/60 p-3 space-y-2">
                <div className="text-sm font-medium text-gray-900">
                  Order #{row.orderLabel} · {row.farmerName}
                </div>
                {row.showBillable ? (
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Billable invoice no.
                    </span>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      value={row.billable}
                      onChange={(e) => updateRow(row.orderId, { billable: e.target.value })}
                    />
                  </label>
                ) : null}
                {row.showNonBillable ? (
                  <label className="block">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Non-billable invoice no.
                    </span>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      value={row.nonBillable}
                      onChange={(e) => updateRow(row.orderId, { nonBillable: e.target.value })}
                    />
                  </label>
                ) : null}
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => onConfirm?.(rows)}>
            Generate duplicate PDF
          </button>
        </div>
      </div>
    </div>
  )
}
