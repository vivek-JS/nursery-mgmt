import React from "react"
import { Tooltip } from "@mui/material"
import {
  getDispatchedNativePlants,
  getDispatchedRolledInPlants,
  getDispatchedCrossSlotInPlants,
  getDispatchedOtherPlants,
  getTotalAllDispatchedPlants,
  getBookedPlants,
  getRemainingNative,
} from "./slotMetrics"

const pillClass =
  "rounded-lg border px-2 py-1.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer w-full"

const SlotDispatchedPanel = ({ slot, monthName, onOpenOrders, variant = "card" }) => {
  const native = getDispatchedNativePlants(slot)
  const other = getDispatchedOtherPlants(slot)
  const all = getTotalAllDispatchedPlants(slot)
  const rolledDisp = getDispatchedRolledInPlants(slot)
  const crossDisp = getDispatchedCrossSlotInPlants(slot)
  const booked = getBookedPlants(slot)
  const remainingNative = getRemainingNative(slot)
  const labelSize = variant === "detail" ? "text-sm" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-2xl" : "text-sm"

  const open = (e, key) => {
    e?.stopPropagation?.()
    onOpenOrders?.(e, slot, monthName, key)
  }

  const nativeTip = `Booked (excl. rolled) ${booked.toLocaleString()} = Remaining ${remainingNative.toLocaleString()} + Native dispatched ${native.toLocaleString()}`
  const otherTip =
    other > 0
      ? `Rolled dispatched ${rolledDisp.toLocaleString()} + Cross-slot ${crossDisp.toLocaleString()}`
      : "Rolled-in and cross-slot early dispatch — shows 0 when none completed yet"

  return (
    <div className="border-t border-gray-200 pt-2 mt-1 mb-2" onClick={(e) => e.stopPropagation()}>
      <p className="text-[10px] font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
        Dispatched
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        <Tooltip title={nativeTip} arrow>
          <button
            type="button"
            className={`${pillClass} bg-slate-50 border-slate-200 hover:bg-slate-100`}
            onClick={(e) => open(e, "dispatchedNative")}>
            <p className={`${labelSize} text-gray-500`}>Native</p>
            <p className={`${labelSize} text-gray-400 leading-tight`}>delivery window</p>
            <p className={`${valueSize} font-bold text-slate-700 tabular-nums`}>
              {native.toLocaleString()}
            </p>
          </button>
        </Tooltip>

        <Tooltip title={otherTip} arrow>
          <button
            type="button"
            className={`${pillClass} ${
              other > 0
                ? "bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
            }`}
            onClick={(e) => open(e, "dispatchedOther")}>
            <p className={`${labelSize} text-gray-500`}>Other</p>
            <p className={`${labelSize} text-gray-400 leading-tight`}>incl. rolled</p>
            <p
              className={`${valueSize} font-bold tabular-nums ${
                other > 0 ? "text-indigo-800" : "text-gray-600"
              }`}>
              {other.toLocaleString()}
            </p>
          </button>
        </Tooltip>

        <Tooltip title="Native + other dispatched on this slot" arrow>
          <button
            type="button"
            className={`${pillClass} ${
              all > 0
                ? "bg-slate-100 border-slate-300 hover:bg-slate-200"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
            }`}
            onClick={(e) => open(e, "dispatchedAll")}>
            <p className={`${labelSize} text-gray-500`}>All</p>
            <p className={`${labelSize} text-gray-400 leading-tight`}>total</p>
            <p
              className={`${valueSize} font-bold tabular-nums ${
                all > 0 ? "text-slate-900" : "text-gray-600"
              }`}>
              {all.toLocaleString()}
            </p>
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

export default SlotDispatchedPanel
