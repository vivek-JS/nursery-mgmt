import React from "react"
import {
  orderMongoId,
  orderDisplayNumber,
  orderFarmerName,
  orderPlantLabel,
  orderRate,
  orderVillage,
  onVehicleQty,
  keptQtyForRow,
  toOtherFarmersQtyForRow,
} from "./reassignHelpers"

const DISPOSITION_OPTIONS = [
  {
    id: "TEMP",
    label: "Temporary cancelled",
    hint: "Resend later — temp cancel on ledger",
    active: "bg-red-600 text-white",
    idle: "bg-white text-gray-600 hover:bg-red-50",
  },
  {
    id: "KEEP",
    label: "Accepted (resend)",
    hint: "Farmer still wants plants — back to accepted",
    active: "bg-emerald-600 text-white",
    idle: "bg-white text-gray-600 hover:bg-emerald-50",
  },
  {
    id: "DISPATCH",
    label: "Complete (delivered)",
    hint: "All on vehicle delivered to this farmer (or set kept qty below for partial)",
    active: "bg-blue-600 text-white",
    idle: "bg-white text-gray-600 hover:bg-blue-50",
  },
  {
    id: "CANCEL_COMPLETE",
    label: "Cancel complete",
    hint: "Final cancel — will not resend this order",
    active: "bg-slate-700 text-white",
    idle: "bg-white text-gray-600 hover:bg-slate-100",
  },
]

const DispositionPicker = ({ value, onChange }) => (
  <div className="grid gap-1.5 sm:grid-cols-2">
    {DISPOSITION_OPTIONS.map((opt) => {
      const selected = value === opt.id
      return (
        <button
          key={opt.id}
          type="button"
          title={opt.hint}
          onClick={() => onChange(opt.id)}
          className={`rounded-md border border-gray-200 px-2 py-1.5 text-left text-[11px] font-medium leading-snug ${
            selected ? opt.active : opt.idle
          }`}>
          {opt.label}
        </button>
      )
    })}
  </div>
)

const StepOriginalOrders = ({ orders, mode, rows, onRowChange }) => {
  const isSome = mode === "SOME"
  const isAll = mode === "ALL"
  const isReturned = mode === "RETURNED"
  const showSplit = isSome || isAll

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {isReturned
          ? "Sarv rope parat nursery madhe aali. Khalil order parat pathvayche ki cancel karayche te nivada."
          : "Khalil order cancelled zalya ki parat pathvayche aahe te nivada — pratyek order sathi khali ek nivad."}
      </p>
      {showSplit && (
        <p className="rounded-md border border-blue-100 bg-blue-50/80 px-2.5 py-2 text-[11px] leading-snug text-blue-950">
          Example: <span className="font-semibold">2800</span> on vehicle — farmer keeps{" "}
          <span className="font-semibold">2000</span>,{" "}
          <span className="font-semibold">800</span> to other farmers (step 3), return{" "}
          <span className="font-semibold">0</span>. Kept + returned + to others must equal on
          vehicle.
        </p>
      )}

      <div className="space-y-2">
        {orders.map((order) => {
          const id = orderMongoId(order)
          const onVehicle = onVehicleQty(order)
          const row = rows[id] || { disposition: "TEMP", returnedQty: 0, keptQty: 0 }
          const rate = orderRate(order)
          const village = orderVillage(order)
          const kept = keptQtyForRow(order, row)
          const toOthers = toOtherFarmersQtyForRow(order, row)
          const ret = Math.max(0, Number(row.returnedQty) || 0)
          const overSplit = ret + kept > onVehicle

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

              <div className="mt-2.5 space-y-2">
                <DispositionPicker
                  value={row.disposition || "TEMP"}
                  onChange={(disposition) => onRowChange(id, { ...row, disposition })}
                />
                {showSplit && !isReturned && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="text-[11px] font-medium text-gray-600">
                      Kept by this farmer
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, onVehicle - ret)}
                        value={
                          row.keptQty != null && row.keptQty !== "" ? row.keptQty : kept || ""
                        }
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === "") {
                            onRowChange(id, { ...row, keptQty: "" })
                            return
                          }
                          const v = Math.max(
                            0,
                            Math.min(
                              onVehicle - ret,
                              Number.isNaN(Number(raw)) ? 0 : Number(raw)
                            )
                          )
                          onRowChange(id, { ...row, keptQty: v })
                        }}
                        placeholder="0"
                        className="mt-0.5 w-full rounded border border-blue-200 bg-blue-50/40 px-2 py-1 text-xs"
                      />
                    </label>
                    <label className="text-[11px] font-medium text-gray-600">
                      Returned to nursery
                      <input
                        type="number"
                        min={0}
                        max={Math.max(0, onVehicle - kept)}
                        value={row.returnedQty || ""}
                        onChange={(e) => {
                          const v = Math.max(
                            0,
                            Math.min(
                              onVehicle,
                              Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value)
                            )
                          )
                          onRowChange(id, { ...row, returnedQty: v })
                        }}
                        placeholder="0"
                        className="mt-0.5 w-full rounded border border-amber-200 bg-amber-50/40 px-2 py-1 text-xs"
                      />
                    </label>
                  </div>
                )}
                {showSplit && !isReturned && (
                  <p
                    className={`text-[10px] font-medium leading-snug ${
                      overSplit ? "text-red-700" : "text-gray-700"
                    }`}>
                    Split: kept {kept.toLocaleString("en-IN")} + returned {ret.toLocaleString("en-IN")}{" "}
                    + to other farmers{" "}
                    <span className="text-emerald-800">{toOthers.toLocaleString("en-IN")}</span>
                    {overSplit ? " — exceeds on vehicle" : ` = ${onVehicle.toLocaleString("en-IN")}`}
                  </p>
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
