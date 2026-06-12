import React from "react"
import { Tooltip } from "@mui/material"
import {
  getActualRemainingPlants,
  getActualGapPlantsPositive,
  getActualGapPct,
  getActualSurplusPlants,
} from "./slotMetrics"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const SlotPhysicalSummary = ({ slot, variant = "card", emphasize = false }) => {
  const actualRem = getActualRemainingPlants(slot)
  const gap = getActualGapPlantsPositive(slot)
  const gapPct = getActualGapPct(slot)
  const surplus = getActualSurplusPlants(slot)
  const actualPlants = Number(slot?.actualPlants) || 0
  const hasSurplus = surplus > 0
  const hasGap = gap > 0

  const gapColor = hasSurplus
    ? "text-teal-700"
    : hasGap
    ? "text-orange-700"
    : "text-green-700"
  const bgClass = emphasize
    ? "bg-gradient-to-r from-slate-50 to-teal-50/80 border-teal-200"
    : "bg-slate-50/90 border-slate-200"
  const textSize = variant === "detail" ? "text-base" : "text-sm"
  const labelSize = variant === "detail" ? "text-xs" : "text-[10px]"

  return (
    <div
      className={`grid grid-cols-3 gap-1 rounded-lg border px-2 py-1.5 mb-2 ${bgClass}`}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}>
      <Tooltip
        title={`${fmt(actualRem)} plants still to dispatch (native + rolled queue)`}
        arrow>
        <div className="text-left min-w-0">
          <p className={`${labelSize} text-gray-500 uppercase tracking-wide`}>Actual rem.</p>
          <p className={`${textSize} font-bold tabular-nums text-amber-700`}>{fmt(actualRem)}</p>
          <p className={`${labelSize} text-gray-400 leading-tight`}>native + rolled</p>
        </div>
      </Tooltip>
      <Tooltip
        title={
          hasSurplus
            ? `${fmt(surplus)} surplus physical vs dispatch queue`
            : hasGap
            ? `Queue exceeds actualPlants by ${fmt(gap)}`
            : "Physical stock covers dispatch queue"
        }
        arrow>
        <div className="text-left min-w-0">
          <p className={`${labelSize} text-gray-500 uppercase tracking-wide`}>
            {hasSurplus ? "Surplus" : "Gap"}
          </p>
          <p className={`${textSize} font-bold tabular-nums ${gapColor}`}>
            {hasSurplus ? fmt(surplus) : fmt(gap)}
          </p>
        </div>
      </Tooltip>
      <Tooltip
        title={
          actualPlants <= 0 && actualRem <= 0
            ? "No physical stock on slot"
            : hasSurplus
            ? "Physical stock exceeds queue"
            : `${gapPct}% shortfall vs actualPlants`
        }
        arrow>
        <div className="text-left min-w-0">
          <p className={`${labelSize} text-gray-500 uppercase tracking-wide`}>Gap %</p>
          <p className={`${textSize} font-bold tabular-nums ${gapColor}`}>
            {actualPlants <= 0 && actualRem <= 0 ? "—" : hasSurplus ? "0%" : `${gapPct}%`}
          </p>
        </div>
      </Tooltip>
    </div>
  )
}

export default SlotPhysicalSummary
