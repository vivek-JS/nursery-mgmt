import React from "react"
import { Tooltip } from "@mui/material"
import { Package } from "lucide-react"
import {
  getAvailablePlants,
  getAvailableMinusRolledIn,
  getBookedPlants,
  getActualAvailablePlants,
  getActualRemainingPlants,
  getRolledInPlantsOnCurrentSlot,
  slotShowDualAvailableCards,
} from "./slotMetrics"

const statPillClass =
  "rounded-lg border px-2 py-1.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"

const SlotCardMetrics = ({
  slot,
  monthName,
  onOpenOrders,
  onOpenActual,
  variant = "card",
}) => {
  const storedAvailable = getAvailablePlants(slot)
  const showDual = slotShowDualAvailableCards(slot)
  const realAvail = getAvailableMinusRolledIn(slot)
  const booked = getBookedPlants(slot)
  const actualPlants = Number(slot?.actualPlants) || 0
  const actualAvail = getActualAvailablePlants(slot)
  const actualRem = getActualRemainingPlants(slot)
  const labelSize = variant === "detail" ? "text-sm" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-2xl" : "text-sm"

  const open = (e, key) => {
    e?.stopPropagation?.()
    onOpenOrders?.(e, slot, monthName, key)
  }

  return (
    <div
      className={
        variant === "detail"
          ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-2"
          : "grid grid-cols-2 gap-1.5 mb-2"
      }
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}>
      <Tooltip title="Stored available (incl. rolled-in bookings)" arrow>
        <button
          type="button"
          className={`${statPillClass} ${
            storedAvailable < 0
              ? "bg-red-50 border-red-200 hover:bg-red-100"
              : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
          }`}
          onClick={(e) => open(e, "available")}>
          <p className={`${labelSize} text-gray-500`}>Available</p>
          <p className={`${labelSize} text-gray-400 leading-tight`}>incl. rolled</p>
          <p
            className={`${valueSize} font-bold leading-tight tabular-nums ${
              storedAvailable < 0 ? "text-red-700" : "text-emerald-700"
            }`}>
            {storedAvailable.toLocaleString()}
          </p>
        </button>
      </Tooltip>

      {showDual && (
        <Tooltip
          title={`Real available = stored ${storedAvailable.toLocaleString()} − rolled ${getRolledInPlantsOnCurrentSlot(slot).toLocaleString()}`}
          arrow>
          <button
            type="button"
            className={`${statPillClass} bg-lime-50 border-lime-200 hover:bg-lime-100`}
            onClick={(e) => open(e, "available")}>
            <p className={`${labelSize} text-gray-500`}>Real avail</p>
            <p className={`${labelSize} text-gray-400 leading-tight`}>native window</p>
            <p className={`${valueSize} font-bold text-lime-800 leading-tight tabular-nums`}>
              {realAvail.toLocaleString()}
            </p>
          </button>
        </Tooltip>
      )}

      <Tooltip
        title={`Physical stock on slot — rem. queue ${actualRem.toLocaleString()}, sellable ${actualAvail.toLocaleString()}. Click for sowing breakdown.`}
        arrow>
        <button
          type="button"
          className={`${statPillClass} bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-300 hover:from-teal-100 hover:to-emerald-100 ring-1 ring-teal-100`}
          onClick={(e) => {
            e.stopPropagation()
            onOpenActual?.(slot)
          }}>
          <p className={`${labelSize} text-teal-700 flex items-center gap-0.5`}>
            <Package className="w-3 h-3" />
            Actual
          </p>
          <p className={`${valueSize} font-bold text-teal-800 leading-tight tabular-nums`}>
            {actualPlants.toLocaleString()}
          </p>
          <p className={`${labelSize} text-teal-600 leading-tight`}>
            rem {actualRem.toLocaleString()} · avail {actualAvail.toLocaleString()}
          </p>
        </button>
      </Tooltip>

      <button
        type="button"
        className={`${statPillClass} bg-blue-50 border-blue-200 hover:bg-blue-100`}
        onClick={(e) => open(e, "booked")}>
        <p className={`${labelSize} text-gray-500`}>Booked</p>
        <p className={`${labelSize} text-gray-400 leading-tight`}>excl. rolled</p>
        <p className={`${valueSize} font-bold text-blue-700 leading-tight tabular-nums`}>
          {booked.toLocaleString()}
        </p>
      </button>

    </div>
  )
}

export default SlotCardMetrics
