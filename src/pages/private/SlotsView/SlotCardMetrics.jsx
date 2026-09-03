import React, { useState } from "react"
import { Tooltip, Button, Collapse } from "@mui/material"
import { ChevronDown } from "lucide-react"
import {
  getBookedPlants,
  getActualAvailablePlants,
  getActualRemainingPlants,
  getTotalAllDispatchedPlants,
} from "./slotMetrics"
import SlotLagwadMetrics from "./SlotLagwadMetrics"
import SlotBookingCoverPanel from "./SlotBookingCoverPanel"
import SlotQueuePanel from "./SlotQueuePanel"
import SlotDispatchedPanel from "./SlotDispatchedPanel"
import SlotReadyRollHistoryModal from "./SlotReadyRollHistoryModal"

const statPillClass =
  "rounded-lg border px-2 py-1.5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer w-full"

const SlotCardMetrics = ({
  slot,
  monthName,
  onOpenOrders,
  onOpenActual,
  onSlotChanged,
  variant = "card",
}) => {
  const [showMore, setShowMore] = useState(false)
  const [rollHistoryOpen, setRollHistoryOpen] = useState(false)

  const booked = getBookedPlants(slot)
  const actualAvail = getActualAvailablePlants(slot)
  const toDispatch = getActualRemainingPlants(slot)
  const dispatched = getTotalAllDispatchedPlants(slot)
  const rolledInReady = Number(slot?.rolledInActualReadyPlants) || 0

  const labelSize = variant === "detail" ? "text-sm" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-2xl" : "text-sm"

  const open = (e, key) => {
    e?.stopPropagation?.()
    onOpenOrders?.(e, slot, monthName, key)
  }

  const isCard = variant === "card"

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <SlotLagwadMetrics
        slot={slot}
        variant={variant}
        onOpenActual={onOpenActual}
        onSlotChanged={onSlotChanged}
        onOpenRollHistory={() => setRollHistoryOpen(true)}
        className="mb-2"
      />

      <div
        className={
          variant === "detail"
            ? "grid grid-cols-2 md:grid-cols-4 gap-3 mb-2"
            : "grid grid-cols-2 gap-1.5 mb-2"
        }>
        <Tooltip title="Actual plants minus already dispatched" arrow>
          <button
            type="button"
            className={`${statPillClass} ${
              actualAvail < 0
                ? "bg-red-50 border-red-200 hover:bg-red-100"
                : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
            }`}
            onClick={(e) => open(e, "available")}>
            <p className={`${labelSize} text-gray-500 font-semibold`}>Available</p>
            <p
              className={`${valueSize} font-bold leading-tight tabular-nums ${
                actualAvail < 0 ? "text-red-700" : "text-emerald-700"
              }`}>
              {actualAvail.toLocaleString()}
            </p>
          </button>
        </Tooltip>

        <Tooltip title="Orders booked on this delivery window" arrow>
          <button
            type="button"
            className={`${statPillClass} bg-blue-50 border-blue-200 hover:bg-blue-100`}
            onClick={(e) => open(e, "booked")}>
            <p className={`${labelSize} text-gray-500 font-semibold`}>Booked</p>
            <p className={`${valueSize} font-bold text-blue-700 leading-tight tabular-nums`}>
              {booked.toLocaleString()}
            </p>
          </button>
        </Tooltip>

        <Tooltip title="Plants still to dispatch (native + rolled queue)" arrow>
          <button
            type="button"
            className={`${statPillClass} bg-amber-50 border-amber-200 hover:bg-amber-100`}
            onClick={(e) => open(e, "remainingDispatch")}>
            <p className={`${labelSize} text-gray-500 font-semibold`}>To dispatch</p>
            <p className={`${valueSize} font-bold text-amber-800 leading-tight tabular-nums`}>
              {toDispatch.toLocaleString()}
            </p>
          </button>
        </Tooltip>

        <Tooltip title="All plants dispatched from this slot" arrow>
          <button
            type="button"
            className={`${statPillClass} bg-slate-50 border-slate-200 hover:bg-slate-100`}
            onClick={(e) => open(e, "dispatchedAll")}>
            <p className={`${labelSize} text-gray-500 font-semibold`}>Dispatched</p>
            <p className={`${valueSize} font-bold text-slate-700 leading-tight tabular-nums`}>
              {dispatched.toLocaleString()}
            </p>
          </button>
        </Tooltip>
      </div>

      {isCard && rolledInReady > 0 ? (
        <button
          type="button"
          className="mb-2 w-full rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-left text-[10px] text-cyan-900 hover:bg-cyan-100"
          onClick={(e) => {
            e.stopPropagation()
            setRollHistoryOpen(true)
          }}>
          <span className="font-semibold">Rolled ready in:</span>{" "}
          <strong>{rolledInReady.toLocaleString()}</strong>
          <span className="text-cyan-700"> · tap for history</span>
        </button>
      ) : null}

      {isCard ? (
        <>
          <Button
            fullWidth
            size="small"
            variant="text"
            onClick={(e) => {
              e.stopPropagation()
              setShowMore((v) => !v)
            }}
            endIcon={
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`}
              />
            }
            sx={{ textTransform: "none", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", mb: 0.5 }}>
            {showMore ? "Less detail" : "More detail"}
          </Button>
          <Collapse in={showMore}>
            <SlotBookingCoverPanel slot={slot} monthName={monthName} onOpenOrders={onOpenOrders} />
            <SlotQueuePanel slot={slot} monthName={monthName} onOpenOrders={onOpenOrders} />
            <SlotDispatchedPanel slot={slot} monthName={monthName} onOpenOrders={onOpenOrders} />
          </Collapse>
        </>
      ) : (
        <>
          <SlotBookingCoverPanel slot={slot} monthName={monthName} onOpenOrders={onOpenOrders} variant={variant} />
          <SlotQueuePanel slot={slot} monthName={monthName} onOpenOrders={onOpenOrders} variant={variant} />
          <SlotDispatchedPanel slot={slot} monthName={monthName} onOpenOrders={onOpenOrders} variant={variant} />
        </>
      )}

      <SlotReadyRollHistoryModal
        open={rollHistoryOpen}
        onClose={() => setRollHistoryOpen(false)}
        slot={slot}
      />
    </div>
  )
}

export default SlotCardMetrics
