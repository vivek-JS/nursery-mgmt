import React from "react"
import { Tooltip } from "@mui/material"
import { ArrowRightLeft, ArrowUpRight, Sprout } from "lucide-react"
import {
  getCoverMovedOutPlants,
  getSowedForOtherDeliveryPlants,
  isSlotSowingAllowed,
} from "./slotMetrics"

/** Only orders the server listed as sowed on another slot — same rows the drawer shows. */
const sowedOnOtherSlotPlants = (slot) => {
  const d = slot?.sowingFromOtherSlotDetail
  if (!d?.orders?.length) return 0
  return Math.max(0, Number(d.plants) || 0)
}

const tileClass =
  "rounded-xl border px-2.5 py-2 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer w-full min-h-[4.25rem]"

const SlotSowingCrossTiles = ({
  slot,
  monthName,
  onOpenOrders,
  sowingAllowed = false,
  variant = "card",
}) => {
  if (!isSlotSowingAllowed(slot, sowingAllowed)) return null

  const onOtherSlot = sowedOnOtherSlotPlants(slot)
  const otherSowing = getSowedForOtherDeliveryPlants(slot)
  const movedOut = getCoverMovedOutPlants(slot)
  if (onOtherSlot <= 0 && otherSowing <= 0 && movedOut <= 0) return null

  const labelSize = variant === "detail" ? "text-sm" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-xl" : "text-sm"

  const open = (e, key) => {
    e?.stopPropagation?.()
    onOpenOrders?.(e, slot, monthName, key)
  }

  const tiles = [
    onOtherSlot > 0
      ? {
          key: "sowingFromOtherSlot",
          label: "Sowed on other slot",
          sub: slot?.sowingFromOtherSlotDetail?.orders?.some((o) => o.fromExcess)
            ? "covered from excess"
            : "covered elsewhere",
          hint: "Orders on this delivery date — sowing done on another ready slot. Click to see list.",
          value: onOtherSlot,
          className: "bg-sky-50 border-sky-200 hover:bg-sky-100",
          valueClass: "text-sky-900",
          icon: ArrowRightLeft,
          iconClass: "text-sky-600",
        }
      : null,
    otherSowing > 0
      ? {
          key: "sowedForOtherDelivery",
          label: "Other sowing",
          sub: "for other delivery",
          hint: "Plants sowed on this ready slot for orders on other delivery dates. Click to see batches.",
          value: otherSowing,
          className: "bg-violet-50 border-violet-200 hover:bg-violet-100",
          valueClass: "text-violet-900",
          icon: Sprout,
          iconClass: "text-violet-600",
        }
      : null,
    movedOut > 0
      ? {
          key: "coverMovedOut",
          label: "Given to other slot",
          sub: "excess covers their orders",
          hint: "Sowing from this slot moved to cover orders booked on another slot. Click to see orders.",
          value: movedOut,
          className: "bg-amber-50 border-amber-200 hover:bg-amber-100",
          valueClass: "text-amber-900",
          icon: ArrowUpRight,
          iconClass: "text-amber-600",
        }
      : null,
  ].filter(Boolean)

  return (
    <div
      className="mt-1.5 mb-0.5"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}>
      <p className={`${labelSize} font-semibold uppercase tracking-wide text-gray-400 mb-1 px-0.5`}>
        Cross-slot sowing
      </p>
      <div className={`grid gap-1 ${tiles.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {tiles.map((tile) => {
          const Icon = tile.icon
          return (
            <Tooltip key={tile.key} title={tile.hint} arrow>
              <button
                type="button"
                className={`${tileClass} ${tile.className}`}
                onClick={(e) => open(e, tile.key)}>
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className={`${labelSize} font-semibold text-gray-700 leading-tight`}>
                      {tile.label}
                    </p>
                    <p className={`${labelSize} text-gray-500 leading-tight`}>{tile.sub}</p>
                  </div>
                  <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${tile.iconClass}`} aria-hidden />
                </div>
                <p className={`${valueSize} font-bold tabular-nums mt-1 ${tile.valueClass}`}>
                  {tile.value.toLocaleString()}
                </p>
              </button>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}

export default SlotSowingCrossTiles
