import React from "react"
import {
  orderMongoId,
  orderDisplayNumber,
  orderFarmerName,
  orderPlantLabel,
  orderRate,
  orderVillage,
  onVehicleQty,
} from "./reassignHelpers"

const DispositionToggle = ({ value, onChange }) => (
  <div className="inline-flex overflow-hidden rounded-md border border-gray-200 text-[11px] font-medium">
    <button
      type="button"
      onClick={() => onChange("TEMP")}
      className={`px-2.5 py-1 ${
        value === "TEMP" ? "bg-red-600 text-white" : "bg-white text-gray-600 hover:bg-red-50"
      }`}>
      Temporary cancelled
    </button>
    <button
      type="button"
      onClick={() => onChange("KEEP")}
      className={`px-2.5 py-1 ${
        value === "KEEP" ? "bg-emerald-600 text-white" : "bg-white text-gray-600 hover:bg-emerald-50"
      }`}>
      Accepted (resend)
    </button>
  </div>
)

const StepOriginalOrders = ({ orders, mode, rows, onRowChange }) => {
  const isSome = mode === "SOME"
  const isReturned = mode === "RETURNED"

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {isReturned
          ? "Sarv rope parat nursery madhe aali. Khalil order parat pathvayche ki cancel karayche te nivada."
          : "Khalil order cancelled zalya ki parat pathvayche aahe te nivada. Each order: Temporary cancelled or Accepted."}
      </p>

      <div className="space-y-2">
        {orders.map((order) => {
          const id = orderMongoId(order)
          const onVehicle = onVehicleQty(order)
          const row = rows[id] || { disposition: "TEMP", returnedQty: 0 }
          const rate = orderRate(order)
          const village = orderVillage(order)

          return (
            <div
              key={id}
              className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-white">
                      #{orderDisplayNumber(order)}
                    </span>
                    <span className="truncate text-sm font-semibold text-gray-900">
                      {orderFarmerName(order)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-600">
                    {orderPlantLabel(order)} · ₹{rate}/plant
                    {village ? ` · ${village}` : ""}
                  </p>
                </div>
                <span className="inline-flex items-center rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                  On vehicle: {onVehicle}
                </span>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <DispositionToggle
                  value={row.disposition}
                  onChange={(disposition) => onRowChange(id, { ...row, disposition })}
                />
                {isSome && (
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                    Returned to nursery
                    <input
                      type="number"
                      min={0}
                      max={onVehicle}
                      value={row.returnedQty || ""}
                      onChange={(e) => {
                        const v = Math.max(
                          0,
                          Math.min(onVehicle, Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value))
                        )
                        onRowChange(id, { ...row, returnedQty: v })
                      }}
                      placeholder="0"
                      className="w-20 rounded border border-amber-200 bg-amber-50/40 px-2 py-1 text-xs"
                    />
                  </label>
                )}
                {isReturned && (
                  <span className="text-[11px] font-medium text-amber-800">
                    Returned to nursery: {onVehicle}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StepOriginalOrders
