import React from "react"
import { Tooltip } from "@mui/material"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const tileClass = "p-3 rounded-lg min-w-0"

const MonthOverviewPanel = ({ summary, isOverbooked }) => {
  const {
    totalAvailablePlants,
    totalRealAvailablePlants,
    hasDualAvailable,
    totalActualPlants,
    totalActualRemaining,
    totalActualAvailable,
    totalQueueAvailable,
    totalActualReadyPlants,
    totalShedReadyInShed,
    totalExpectedMortality,
    actualGapPlants,
    actualGapPct,
    actualSurplusPlants,
    totalRolledInAvailable,
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
          Lagwad physical (month total)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-teal-50/80 to-sky-50/50 p-3">
          <Tooltip title="Sellable lagwad on slots = 90% actual only (excludes mortality reserve)" arrow>
            <div className={`${tileClass} bg-emerald-50/90`}>
              <p className="text-[10px] text-gray-500 uppercase">Sellable</p>
              <p className="text-lg font-bold tabular-nums text-emerald-900">
                {fmt(totalActualPlants)}
              </p>
              <p className="text-[10px] text-emerald-700">90% actual</p>
            </div>
          </Tooltip>
          <Tooltip title="10% lagwad reserve — not sellable until transferred to ready" arrow>
            <div className={`${tileClass} bg-rose-50/90`}>
              <p className="text-[10px] text-gray-500 uppercase">Exp. mortality</p>
              <p className="text-lg font-bold tabular-nums text-rose-800">
                {fmt(totalExpectedMortality)}
              </p>
            </div>
          </Tooltip>
          <Tooltip title="Calendar-ready or manually marked — vehicle load subtracts here" arrow>
            <div className={`${tileClass} bg-sky-50/90`}>
              <p className="text-[10px] text-gray-500 uppercase">Actual ready</p>
              <p className="text-lg font-bold tabular-nums text-sky-800">
                {fmt(totalActualReadyPlants)}
              </p>
              {totalShedReadyInShed > totalActualReadyPlants && (
                <p className="text-[10px] text-sky-600">in shed {fmt(totalShedReadyInShed)}</p>
              )}
              <p className="text-[10px] text-sky-600">calendar / manual</p>
            </div>
          </Tooltip>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Booking & order queue (month total)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-amber-50/40 p-3">
          <Tooltip title="Sellable remaining = actual plants minus already dispatched" arrow>
            <div className={`${tileClass} ${isOverbooked ? "bg-red-50" : "bg-emerald-50/80"}`}>
              <p className="text-[10px] text-gray-500 uppercase">Available</p>
              <p
                className={`text-lg font-bold tabular-nums ${
                  isOverbooked ? "text-red-600" : "text-emerald-700"
                }`}>
                {fmt(totalActualAvailable)}
              </p>
              <p className="text-[10px] text-emerald-700">actual − dispatched</p>
              {hasDualAvailable && (
                <p className="text-[10px] text-lime-700">real {fmt(totalRealAvailablePlants)}</p>
              )}
            </div>
          </Tooltip>
          <Tooltip title="Sum of dispatch queue (native + rolled) across all slots this month" arrow>
            <div className={`${tileClass} bg-amber-50/80`}>
              <p className="text-[10px] text-gray-500 uppercase">Queue rem.</p>
              <p className="text-lg font-bold tabular-nums text-amber-800">
                {fmt(totalActualRemaining)}
              </p>
            </div>
          </Tooltip>
          <Tooltip title="Actual minus dispatch queue — 0 when nearby booked days cover this slot" arrow>
            <div className={`${tileClass} bg-teal-50/60`}>
              <p className="text-[10px] text-gray-500 uppercase">Queue avail.</p>
              <p className="text-lg font-bold tabular-nums text-teal-800">
                {fmt(totalQueueAvailable)}
              </p>
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
    </div>
  )
}

export default MonthOverviewPanel
