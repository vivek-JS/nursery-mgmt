import React from "react"
import { Tooltip } from "@mui/material"
import {
  getRemainingNative,
  getRemainingRolledIn,
  getActualRemainingPlants,
  getBookedPlants,
  getDispatchedNativePlants,
  slotShowDualRemainingPipeline,
} from "./slotMetrics"

const pillClass =
  "rounded-lg border px-2 py-1.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer w-full"

const SlotQueuePanel = ({ slot, monthName, onOpenOrders, variant = "card" }) => {
  const native = getRemainingNative(slot)
  const rolled = getRemainingRolledIn(slot)
  const actualRem = getActualRemainingPlants(slot)
  const showRolled = slotShowDualRemainingPipeline(slot) || rolled > 0
  const labelSize = variant === "detail" ? "text-sm" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-2xl" : "text-sm"

  const open = (e, key) => {
    e?.stopPropagation?.()
    onOpenOrders?.(e, slot, monthName, key)
  }

  const booked = getBookedPlants(slot)
  const dispatchedNative = getDispatchedNativePlants(slot)
  const nativeTip = `Booked (excl. rolled) ${booked.toLocaleString()} = Native remaining ${native.toLocaleString()} + Native dispatched ${dispatchedNative.toLocaleString()}`
  const actualTip = `Actual remaining = Native queue ${native.toLocaleString()} + Rolled queue ${rolled.toLocaleString()}`

  return (
    <div className="border-t border-gray-200 pt-2 mt-1 mb-2" onClick={(e) => e.stopPropagation()}>
      <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1.5">
        To dispatch
      </p>
      <div className={`grid gap-1.5 ${showRolled ? "grid-cols-3" : "grid-cols-2"}`}>
        <Tooltip title={nativeTip} arrow>
          <button
            type="button"
            className={`${pillClass} ${
              native > 0
                ? "bg-amber-50 border-amber-200 hover:bg-amber-100"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
            }`}
            onClick={(e) => open(e, "remainingNative")}>
            <p className={`${labelSize} text-gray-500`}>Native</p>
            <p className={`${labelSize} text-gray-400 leading-tight`}>delivery window</p>
            <p
              className={`${valueSize} font-bold tabular-nums ${
                native > 0 ? "text-amber-700" : "text-gray-700"
              }`}>
              {native.toLocaleString()}
            </p>
          </button>
        </Tooltip>

        {showRolled && (
          <Tooltip title="Pre-dispatch queue from past-due rolled-in orders" arrow>
            <button
              type="button"
              className={`${pillClass} ${
                rolled > 0
                  ? "bg-orange-50 border-orange-200 hover:bg-orange-100"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
              onClick={(e) => open(e, "remainingRolled")}>
              <p className={`${labelSize} text-gray-500`}>Rolled</p>
              <p className={`${labelSize} text-gray-400 leading-tight`}>incl. past due</p>
              <p
                className={`${valueSize} font-bold tabular-nums ${
                  rolled > 0 ? "text-orange-700" : "text-gray-700"
                }`}>
                {rolled.toLocaleString()}
              </p>
            </button>
          </Tooltip>
        )}

        <Tooltip title={actualTip} arrow>
          <button
            type="button"
            className={`${pillClass} ${
              actualRem > 0
                ? "bg-rose-50 border-rose-200 hover:bg-rose-100"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
            }`}
            onClick={(e) => open(e, "remaining")}>
            <p className={`${labelSize} text-gray-500`}>Actual rem.</p>
            <p className={`${labelSize} text-gray-400 leading-tight`}>full queue</p>
            <p
              className={`${valueSize} font-bold tabular-nums ${
                actualRem > 0 ? "text-rose-700" : "text-gray-700"
              }`}>
              {actualRem.toLocaleString()}
            </p>
          </button>
        </Tooltip>
      </div>
    </div>
  )
}

export default SlotQueuePanel
