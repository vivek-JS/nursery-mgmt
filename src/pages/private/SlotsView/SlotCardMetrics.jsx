import React from "react"
import { Tooltip } from "@mui/material"
import { Package } from "lucide-react"
import {
  getBookedPlants,
  getActualAvailablePlants,
  getActualRemainingPlants,
  getRolledInPlantsOnCurrentSlot,
  slotShowDualAvailableCards,
  getAvailableMinusRolledIn,
} from "./slotMetrics"
import SlotLagwadMetrics from "./SlotLagwadMetrics"

const statPillClass =
  "rounded-lg border px-2 py-1.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer"

const SlotCardMetrics = ({
  slot,
  monthName,
  onOpenOrders,
  onOpenActual,
  onSlotChanged,
  variant = "card",
}) => {
  const booked = getBookedPlants(slot)
  const actualAvail = getActualAvailablePlants(slot)
  const orderQueueRem = getActualRemainingPlants(slot)
  const showDual = slotShowDualAvailableCards(slot)
  const realAvail = getAvailableMinusRolledIn(slot)
  const labelSize = variant === "detail" ? "text-sm" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-2xl" : "text-sm"

  const open = (e, key) => {
    e?.stopPropagation?.()
    onOpenOrders?.(e, slot, monthName, key)
  }

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <SlotLagwadMetrics
        slot={slot}
        variant={variant}
        onOpenActual={onOpenActual}
        onSlotChanged={onSlotChanged}
        className="mb-2"
      />

      <div
        className={
          variant === "detail"
            ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-2"
            : "grid grid-cols-2 gap-1.5 mb-2"
        }>
        <Tooltip title="Actual plants minus already dispatched — still in nursery even if next days are booked" arrow>
          <button
            type="button"
            className={`${statPillClass} ${
              actualAvail < 0
                ? "bg-red-50 border-red-200 hover:bg-red-100"
                : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            }`}
            onClick={(e) => open(e, "available")}>
            <p className={`${labelSize} text-gray-500`}>Available</p>
            <p className={`${labelSize} text-gray-400 leading-tight`}>actual − dispatched</p>
            <p
              className={`${valueSize} font-bold leading-tight tabular-nums ${
                actualAvail < 0 ? "text-red-700" : "text-emerald-700"
              }`}>
              {actualAvail.toLocaleString()}
            </p>
          </button>
        </Tooltip>

        {showDual && (
          <Tooltip
            title={`Rolled-in on this window ${getRolledInPlantsOnCurrentSlot(slot).toLocaleString()} · native avail ${realAvail.toLocaleString()}`}
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
          title="Order dispatch queue (native + rolled) vs actual plants — click for lagwad breakdown"
          arrow>
          <button
            type="button"
            className={`${statPillClass} bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:from-amber-100 hover:to-orange-100`}
            onClick={(e) => {
              e.stopPropagation()
              onOpenActual?.(slot)
            }}>
            <p className={`${labelSize} text-amber-800 flex items-center gap-0.5`}>
              <Package className="w-3 h-3" />
              Queue rem.
            </p>
            <p className={`${valueSize} font-bold text-amber-900 leading-tight tabular-nums`}>
              {orderQueueRem.toLocaleString()}
            </p>
            <p className={`${labelSize} text-amber-700 leading-tight`}>
              avail {actualAvail.toLocaleString()}
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
    </div>
  )
}

export default SlotCardMetrics
