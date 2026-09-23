import React from "react"
import { Divider, Tooltip } from "@mui/material"
import {
  getBookedPlants,
  getDisplayAvailablePlants,
  getActualRemainingPlants,
  getTotalAllDispatchedPlants,
  getExcessAvailableForBooking,
  getDisplaySowingGap,
  hasSowingCoverDetail,
  hasSowingFromOtherSlot,
  isSlotSowingAllowed,
} from "./slotMetrics"
import SlotLagwadMetrics from "./SlotLagwadMetrics"
import SlotSowingCrossTiles from "./SlotSowingCrossTiles"
import MetricDefinitionIcon from "./MetricDefinitionIcon"

const statPillClass =
  "relative rounded-lg border px-2 py-1.5 pr-5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer w-full"

const SlotCardMetrics = ({
  slot,
  monthName,
  onOpenOrders,
  onOpenActual,
  onSlotChanged,
  onOpenRolledLagwad,
  variant = "card",
  compact = false,
  sowingAllowed = false,
}) => {
  const allowed = isSlotSowingAllowed(slot, sowingAllowed)
  const booked = getBookedPlants(slot)
  const bookingAvail = getDisplayAvailablePlants(slot)
  const excessAvail = getExcessAvailableForBooking(slot)
  const sowingGap = getDisplaySowingGap(slot, allowed)
  const hasCoverDetail = hasSowingCoverDetail(slot)
  const dispatched = getTotalAllDispatchedPlants(slot)
  const toDispatch = getActualRemainingPlants(slot)
  const labelSize = variant === "detail" ? "text-sm" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-2xl" : "text-sm"
  const gridOrder = compact
    ? "grid grid-cols-2 gap-1"
    : variant === "detail"
      ? "grid grid-cols-2 md:grid-cols-3 gap-2"
      : "grid grid-cols-2 gap-1"

  const open = (e, key) => {
    e?.stopPropagation?.()
    onOpenOrders?.(e, slot, monthName, key)
  }

  const bookedCell = {
    key: "booked",
    definitionKey: "slotBooked",
    label: "Booked",
    sub: "excl. rolled",
    value: booked,
    className: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    valueClass: "text-blue-700",
    title: "Booked plants on this delivery window",
    onClick: (e) => open(e, "booked"),
  }

  const openSowingGap = (e) => {
    if (sowingGap <= 0 && hasSowingFromOtherSlot(slot)) {
      open(e, "sowingFromOtherSlot")
      return
    }
    open(e, "sowingGap")
  }

  const sowingGapCell = {
    key: "sowingGap",
    definitionKey: "slotSowingGap",
    label: "Sowing gap",
    sub:
      sowingGap > 0
        ? "need sow"
        : hasSowingFromOtherSlot(slot)
          ? "sowed elsewhere"
          : hasCoverDetail
            ? "covered here"
            : "need sow",
    value: sowingGap,
    className:
      sowingGap > 0
        ? "bg-orange-50 border-orange-200 hover:bg-orange-100"
        : hasSowingFromOtherSlot(slot)
          ? "bg-sky-50 border-sky-200 hover:bg-sky-100"
          : hasCoverDetail
            ? "bg-teal-50 border-teal-200 hover:bg-teal-100"
            : "bg-gray-50 border-gray-200",
    valueClass:
      sowingGap > 0
        ? "text-orange-800"
        : hasSowingFromOtherSlot(slot)
          ? "text-sky-900"
          : hasCoverDetail
            ? "text-teal-800"
            : "text-gray-700",
    title:
      sowingGap > 0
        ? "Orders still needing sow — click for date-wise cover breakdown"
        : hasSowingFromOtherSlot(slot)
          ? "Gap 0 — sowing done on another slot. Click to see orders."
          : "Sowing gap — click for order cover breakdown",
    onClick: openSowingGap,
  }

  const canBookCell = allowed
    ? {
        key: "excessAvail",
        definitionKey: "slotExcess",
        label: "Can book",
        sub: "after orders",
        value: excessAvail,
        className: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
        valueClass: "text-emerald-700",
        title: "Saleable plants after gross order cover (sowing-allowed)",
        onClick: (e) => open(e, "available"),
      }
    : {
        key: "available",
        definitionKey: "slotAvailable",
        label: "Can book",
        sub: "this slot",
        value: bookingAvail,
        className:
          bookingAvail < 0
            ? "bg-red-50 border-red-200 hover:bg-red-100"
            : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
        valueClass: bookingAvail < 0 ? "text-red-700" : "text-emerald-700",
        title: "Plants open for new bookings on this slot",
        onClick: (e) => open(e, "available"),
      }

  const remainingCell = {
    key: "remaining",
    definitionKey: "slotRemaining",
    label: "Delivery to dispatch",
    sub: "queue left",
    value: toDispatch,
    className: "bg-amber-50 border-amber-200 hover:bg-amber-100",
    valueClass: "text-amber-900",
    title: "Orders still waiting to dispatch from this slot",
    onClick: (e) => open(e, "remaining"),
  }

  const dispatchedCell = {
    key: "dispatched",
    definitionKey: "slotDispatched",
    label: "Dispatched",
    sub: "orders loaded",
    value: dispatched,
    className: "bg-violet-50 border-violet-200 hover:bg-violet-100",
    valueClass: "text-violet-800",
    title: "Plants already dispatched on orders for this slot",
    onClick: (e) => open(e, "dispatched"),
  }

  // Can book, gap beside it, then Booked, then the rest.
  const orderCells = [
    canBookCell,
    ...(allowed ? [sowingGapCell] : []),
    bookedCell,
    ...(!allowed && !compact ? [dispatchedCell] : []),
    remainingCell,
  ]

  return (
    <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <div className={gridOrder}>
        {orderCells.map((c) => (
          <Tooltip key={c.key} title={c.title} arrow>
            <button
              type="button"
              className={`${statPillClass} ${c.className}`}
              onClick={c.onClick}>
              <p className={`${labelSize} text-gray-500 leading-tight flex items-center gap-0.5`}>
                {c.label}
                <MetricDefinitionIcon definitionKey={c.definitionKey} />
              </p>
              {c.sub ? (
                <p className={`${labelSize} text-gray-400 leading-tight`}>{c.sub}</p>
              ) : null}
              <div className="flex items-center gap-1">
                <p className={`${valueSize} font-bold leading-tight tabular-nums ${c.valueClass}`}>
                  {c.value.toLocaleString()}
                </p>
                {c.trailingIcon}
              </div>
            </button>
          </Tooltip>
        ))}
      </div>

      <SlotSowingCrossTiles
        slot={slot}
        monthName={monthName}
        onOpenOrders={onOpenOrders}
        sowingAllowed={sowingAllowed}
        variant={variant}
      />

      <Divider sx={{ my: variant === "detail" ? 1.5 : 1, borderColor: "#e2e8f0" }} />

      <SlotLagwadMetrics
        slot={slot}
        variant={variant}
        compact={compact}
        sowingAllowed={sowingAllowed}
        onOpenActual={onOpenActual}
        onSlotChanged={onSlotChanged}
        onOpenRolledLagwad={onOpenRolledLagwad}
      />
    </div>
  )
}

export default SlotCardMetrics
