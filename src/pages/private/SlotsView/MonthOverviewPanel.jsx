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
          Physical vs queue (month total)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-teal-50/50 p-3">
          <Tooltip title="Sellable available plants across all slots this month (stored, incl. rolled)" arrow>
            <div className={`${tileClass} ${isOverbooked ? "bg-red-50" : "bg-emerald-50/80"}`}>
              <p className="text-[10px] text-gray-500 uppercase">Available</p>
              <p className={`text-lg font-bold tabular-nums ${isOverbooked ? "text-red-600" : "text-emerald-700"}`}>
                {fmt(totalAvailablePlants)}
              </p>
              {hasDualAvailable && (
                <p className="text-[10px] text-lime-700">real {fmt(totalRealAvailablePlants)}</p>
              )}
            </div>
          </Tooltip>
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
    </div>
  )
}

export default MonthOverviewPanel
