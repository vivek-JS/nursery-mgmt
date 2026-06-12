import React from "react"
import { Tooltip } from "@mui/material"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const tileClass = "p-3 rounded-lg min-w-0"

const MonthOverviewPanel = ({ summary, bookedPercentage, isOverbooked, statusColor }) => {
  const {
    totalAvailablePlants,
    totalRealAvailablePlants,
    hasDualAvailable,
    totalBookedPlants,
    totalDispatchedPlants,
    totalDispatchedOther,
    totalAllDispatchedPlants,
    totalRemainingToDispatch,
    totalRemainingNative,
    totalRemainingRolled,
    totalActualPlants,
    totalActualRemaining,
    totalActualAvailable,
    actualGapPlants,
    actualGapPct,
    actualSurplusPlants,
    totalRolledInAvailable,
    sowingGap,
    totalPlants,
  } = summary

  const hasSurplus = actualSurplusPlants > 0
  const hasGap = actualGapPlants > 0
  const gapColor = hasSurplus ? "text-teal-700" : hasGap ? "text-orange-700" : "text-green-700"
  const gapBg = hasSurplus ? "bg-teal-50" : hasGap ? "bg-orange-50" : "bg-green-50"
  const gapPctLabel =
    totalActualPlants <= 0 && totalActualRemaining <= 0
      ? "—"
      : hasSurplus
      ? "0%"
      : `${actualGapPct}%`

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Physical vs queue (month total)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50/50 p-3">
          <Tooltip title="Sum of dispatch queue (native + rolled) across all slots this month" arrow>
            <div className={`${tileClass} bg-amber-50/80`}>
              <p className="text-[10px] text-gray-500 uppercase">Actual rem.</p>
              <p className="text-lg font-bold tabular-nums text-amber-800">{fmt(totalActualRemaining)}</p>
            </div>
          </Tooltip>
          <Tooltip title="Month total physical plants in shed" arrow>
            <div className={`${tileClass} bg-teal-50/80`}>
              <p className="text-[10px] text-gray-500 uppercase">Actual plants</p>
              <p className="text-lg font-bold tabular-nums text-teal-800">{fmt(totalActualPlants)}</p>
              <p className="text-[10px] text-teal-600">avail {fmt(totalActualAvailable)}</p>
            </div>
          </Tooltip>
          <div className={`${tileClass} ${gapBg}`}>
            <p className="text-[10px] text-gray-500 uppercase">{hasSurplus ? "Surplus" : "Gap"}</p>
            <p className={`text-lg font-bold tabular-nums ${gapColor}`}>
              {hasSurplus ? fmt(actualSurplusPlants) : fmt(actualGapPlants)}
            </p>
          </div>
          <div className={`${tileClass} ${gapBg}`}>
            <p className="text-[10px] text-gray-500 uppercase">Gap %</p>
            <p className={`text-lg font-bold tabular-nums ${gapColor}`}>{gapPctLabel}</p>
          </div>
          {totalRolledInAvailable > 0 && (
            <Tooltip title="Capacity rolled from expired slots onto today's window" arrow>
              <div className={`${tileClass} bg-violet-50`}>
                <p className="text-[10px] text-gray-500 uppercase">Rolled cap.</p>
                <p className="text-lg font-bold tabular-nums text-violet-800">
                  {fmt(totalRolledInAvailable)}
                </p>
              </div>
            </Tooltip>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Booking & dispatch (month total)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          <div className={`${tileClass} ${isOverbooked ? "bg-red-50" : "bg-emerald-50"}`}>
            <p className="text-xs text-gray-600">Available</p>
            <p className="text-[10px] text-gray-500">stored · incl. rolled</p>
            <p className={`text-xl font-bold tabular-nums ${isOverbooked ? "text-red-600" : "text-emerald-700"}`}>
              {fmt(totalAvailablePlants)}
            </p>
          </div>
          {hasDualAvailable && (
            <div className={`${tileClass} bg-lime-50`}>
              <p className="text-xs text-gray-600">Real avail</p>
              <p className="text-[10px] text-gray-500">native window</p>
              <p className="text-xl font-bold tabular-nums text-lime-800">
                {fmt(totalRealAvailablePlants)}
              </p>
            </div>
          )}
          <div className={`${tileClass} bg-blue-50`}>
            <p className="text-xs text-gray-600">Booked</p>
            <p className="text-xl font-bold tabular-nums text-blue-600">{fmt(totalBookedPlants)}</p>
          </div>
          <div className={`${tileClass} ${totalRemainingToDispatch > 0 ? "bg-rose-50" : "bg-gray-50"}`}>
            <p className="text-xs text-gray-600">Actual rem.</p>
            <p className="text-[10px] text-gray-500">full queue</p>
            <p className={`text-xl font-bold tabular-nums ${totalRemainingToDispatch > 0 ? "text-rose-700" : "text-gray-900"}`}>
              {fmt(totalRemainingToDispatch)}
            </p>
            {totalRemainingRolled > 0 && (
              <p className="text-[10px] text-orange-700">
                {fmt(totalRemainingNative)} native + {fmt(totalRemainingRolled)} rolled
              </p>
            )}
          </div>
          <div className={`${tileClass} ${totalRemainingNative > 0 ? "bg-amber-50" : "bg-gray-50"}`}>
            <p className="text-xs text-gray-600">Native rem.</p>
            <p className="text-[10px] text-gray-500">delivery window</p>
            <p className={`text-xl font-bold tabular-nums ${totalRemainingNative > 0 ? "text-amber-700" : "text-gray-900"}`}>
              {fmt(totalRemainingNative)}
            </p>
          </div>
          <div className={`${tileClass} bg-slate-50`}>
            <p className="text-xs text-gray-600">Disp. native</p>
            <p className="text-[10px] text-gray-500">delivery window</p>
            <p className="text-xl font-bold tabular-nums text-slate-700">{fmt(totalDispatchedPlants)}</p>
          </div>
          <div className={`${tileClass} ${(totalDispatchedOther ?? 0) > 0 ? "bg-indigo-50" : "bg-gray-50"}`}>
            <p className="text-xs text-gray-600">Disp. other</p>
            <p className="text-[10px] text-gray-500">incl. rolled</p>
            <p className={`text-xl font-bold tabular-nums ${(totalDispatchedOther ?? 0) > 0 ? "text-indigo-800" : "text-gray-600"}`}>
              {fmt(totalDispatchedOther ?? 0)}
            </p>
          </div>
          <div className={`${tileClass} bg-slate-100`}>
            <p className="text-xs text-gray-600">Disp. all</p>
            <p className="text-[10px] text-gray-500">total</p>
            <p className="text-xl font-bold tabular-nums text-slate-900">
              {fmt(totalAllDispatchedPlants ?? totalDispatchedPlants)}
            </p>
          </div>
          <div className={`${tileClass} ${sowingGap > 0 ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-600"}`}>
            <p className="text-xs text-gray-600">Sowing gap</p>
            <p className="text-xl font-bold tabular-nums">
              {sowingGap > 0 ? "+" : ""}
              {fmt(sowingGap)}
            </p>
          </div>
          <div className={`${tileClass} bg-gray-50`}>
            <p className="text-xs text-gray-600">Capacity</p>
            <p className="text-xl font-bold tabular-nums text-gray-900">{fmt(totalPlants)}</p>
          </div>
          <div
            className={`${tileClass} ${statusColor.bg.replace("-500", "-50")}`}>
            <p className="text-xs text-gray-600">Booking rate</p>
            <p className={`text-xl font-bold tabular-nums ${statusColor.text}`}>
              {bookedPercentage}%{isOverbooked && " (OVER)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonthOverviewPanel
