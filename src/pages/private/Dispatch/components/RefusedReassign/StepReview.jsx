import React from "react"
import {
  REASSIGN_MODES,
  orderMongoId,
  orderDisplayNumber,
  orderFarmerName,
  round2,
} from "./reassignHelpers"

const StepReview = ({ mode, orders, rows, farmers, vehiclePlants, totalReturned, totalReassigned }) => {
  const modeMeta = REASSIGN_MODES.find((m) => m.id === mode)
  const orderById = (id) => orders.find((o) => orderMongoId(o) === id)

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">Mode</p>
        <p className="mt-0.5 font-medium text-gray-900">{modeMeta?.title}</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Original orders
        </p>
        <ul className="space-y-1">
          {orders.map((o) => {
            const id = orderMongoId(o)
            const row = rows[id] || { disposition: "TEMP", returnedQty: 0 }
            return (
              <li key={id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-gray-700">
                  #{orderDisplayNumber(o)} · {orderFarmerName(o)}
                </span>
                <span className="shrink-0 font-medium">
                  {row.disposition === "KEEP" ? "Accepted (resend)" : "Temp cancelled"}
                  {row.returnedQty > 0 ? ` · ${row.returnedQty} returned` : ""}
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      {mode !== "RETURNED" && (
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
            New field orders
          </p>
          <ul className="space-y-1">
            {farmers.map((f) => {
              const src = orderById(f.sourceOrderId)
              const amt = round2(Number(f.numberOfPlants || 0) * Number(f.rate || 0))
              const paid = Number(f.payment?.paidAmount || 0)
              return (
                <li key={f.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-gray-700">
                    {f.name || "—"} · {f.village || "—"}
                    {src ? ` · from #${orderDisplayNumber(src)}` : ""}
                  </span>
                  <span className="shrink-0 font-medium">
                    {f.numberOfPlants || 0} pl · ₹{amt.toLocaleString()}
                    {paid > 0 ? ` · paid ₹${paid.toLocaleString()}` : ""}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-xs">
        <div>
          <p className="text-gray-500">On vehicle</p>
          <p className="text-base font-semibold text-gray-900">{vehiclePlants}</p>
        </div>
        <div>
          <p className="text-gray-500">Reassigned</p>
          <p className="text-base font-semibold text-emerald-700">{totalReassigned}</p>
        </div>
        <div>
          <p className="text-gray-500">Returned</p>
          <p className="text-base font-semibold text-amber-700">{totalReturned}</p>
        </div>
      </div>
    </div>
  )
}

export default StepReview
