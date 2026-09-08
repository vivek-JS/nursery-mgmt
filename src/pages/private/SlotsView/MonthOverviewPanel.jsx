import React from "react"
import { Tooltip } from "@mui/material"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const tileClass = "p-3 rounded-xl min-w-0 border"

const SplitFootnote = ({ native, rolled, nativeLabel = "Native", rolledLabel = "Rollover" }) => (
  <p className="text-[10px] leading-snug mt-1 tabular-nums">
    <span className="font-semibold text-slate-600">{nativeLabel}</span>{" "}
    <span className="text-slate-800">{fmt(native)}</span>
    <span className="mx-1 text-slate-300">·</span>
    <span className="font-semibold text-slate-600">{rolledLabel}</span>{" "}
    <span className="text-slate-800">{fmt(rolled)}</span>
  </p>
)

const MonthOverviewPanel = ({ summary, isOverbooked, sowingAllowed = false }) => {
  const {
    totalAvailablePlants,
    totalExcessAvailableForBooking,
    totalSowingGapPlants,
    totalExpectedInSlots,
    totalDeliveryThisMonth,
    totalDeliveryNative,
    totalDeliveryRolled,
    totalRemainingToDispatch,
    totalRemainingNative,
    totalRemainingRolled,
    totalAllDispatchedPlants,
    totalDispatchedNative,
    totalDispatchedRolled,
    totalDispatchedOther,
  } = summary

  const dispatchedRollover =
    totalDispatchedRolled + Math.max(0, (totalDispatchedOther || 0) - (totalDispatchedRolled || 0))

  const deliveryCrossCheck = (totalRemainingToDispatch || 0) + (totalAllDispatchedPlants || 0)

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
        sowingAllowed ? "xl:grid-cols-6" : "xl:grid-cols-5"
      } gap-3`}>
      {sowingAllowed ? (
        <>
          <Tooltip
            title="Saleable excess after gross order cover on each slot this month"
            arrow>
            <div className={`${tileClass} bg-green-50 border-green-200`}>
              <p className="text-[10px] font-semibold uppercase text-green-800">Excess available</p>
              <p className="text-xl font-bold tabular-nums text-green-900">
                {fmt(totalExcessAvailableForBooking)}
              </p>
              <p className="text-[10px] text-green-700">Open for new bookings (sowing-allowed)</p>
            </div>
          </Tooltip>
          <Tooltip title="Booked orders on delivery windows still needing sow this month" arrow>
            <div
              className={`${tileClass} ${
                (totalSowingGapPlants || 0) > 0
                  ? "bg-orange-50 border-orange-200"
                  : "bg-gray-50 border-gray-200"
              }`}>
              <p className="text-[10px] font-semibold uppercase text-orange-800">Sowing gap</p>
              <p
                className={`text-xl font-bold tabular-nums ${
                  (totalSowingGapPlants || 0) > 0 ? "text-orange-900" : "text-gray-800"
                }`}>
                {fmt(totalSowingGapPlants)}
              </p>
              <p className="text-[10px] text-orange-700">Orders not sown yet</p>
            </div>
          </Tooltip>
        </>
      ) : (
        <Tooltip title="Sum of Available for booking on each slot this month — new orders can take this many plants" arrow>
          <div className={`${tileClass} ${isOverbooked ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
            <p className="text-[10px] font-semibold uppercase text-green-800">Available for booking</p>
            <p
              className={`text-xl font-bold tabular-nums ${
                isOverbooked ? "text-red-700" : "text-green-900"
              }`}>
              {fmt(totalAvailablePlants)}
            </p>
            <p className="text-[10px] text-green-700">Open for new bookings this month</p>
          </div>
        </Tooltip>
      )}

      <Tooltip title="Lagwad synced in slot windows this month" arrow>
        <div className={`${tileClass} bg-violet-50 border-violet-200`}>
          <p className="text-[10px] font-semibold uppercase text-violet-800">Expected in month</p>
          <p className="text-xl font-bold tabular-nums text-violet-900">
            {fmt(totalExpectedInSlots)}
          </p>
          <p className="text-[10px] text-violet-700">Lagwad synced in slot windows</p>
        </div>
      </Tooltip>

      <Tooltip
        title={`Plants booked for delivery this month = Remaining dispatch (${fmt(totalRemainingToDispatch)}) + Dispatched (${fmt(totalAllDispatchedPlants)}). Native = delivery-window orders; Rollover = past-due rolled-in + cross-slot loads.`}
        arrow>
        <div className={`${tileClass} bg-blue-50 border-blue-200`}>
          <p className="text-[10px] font-semibold uppercase text-blue-800">Delivery this month</p>
          <p className="text-xl font-bold tabular-nums text-blue-900">
            {fmt(totalDeliveryThisMonth ?? deliveryCrossCheck)}
          </p>
          <SplitFootnote
            native={totalDeliveryNative}
            rolled={totalDeliveryRolled}
            rolledLabel="Rollover & other"
          />
          <p className="text-[10px] text-blue-600 mt-0.5">= Remaining + Dispatched</p>
        </div>
      </Tooltip>

      <Tooltip
        title="Pre-dispatch queue across all slots — native delivery window plus past-due rolled-in orders"
        arrow>
        <div className={`${tileClass} bg-amber-50 border-amber-200`}>
          <p className="text-[10px] font-semibold uppercase text-amber-800">Remaining dispatch</p>
          <p className="text-xl font-bold tabular-nums text-amber-900">
            {fmt(totalRemainingToDispatch)}
          </p>
          <SplitFootnote native={totalRemainingNative} rolled={totalRemainingRolled} />
        </div>
      </Tooltip>

      <Tooltip
        title="Dispatched & completed plants this month — native delivery-window orders plus rollover / cross-slot loads"
        arrow>
        <div className={`${tileClass} bg-slate-50 border-slate-200`}>
          <p className="text-[10px] font-semibold uppercase text-slate-700">Dispatched this month</p>
          <p className="text-xl font-bold tabular-nums text-slate-900">
            {fmt(totalAllDispatchedPlants)}
          </p>
          <SplitFootnote
            native={totalDispatchedNative}
            rolled={dispatchedRollover}
            rolledLabel="Rollover & other"
          />
        </div>
      </Tooltip>
    </div>
  )
}

export default MonthOverviewPanel
