import React from "react"
import { Tooltip } from "@mui/material"
import {
  getActualRemainingPlants,
  getActualGapPlantsPositive,
  getActualGapPct,
  getActualSurplusPlants,
} from "./slotMetrics"
import SlotLagwadMetrics from "./SlotLagwadMetrics"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const SlotPhysicalSummary = ({ slot, variant = "card", emphasize = false, onOpenActual }) => {
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
    <div className="mb-2" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <SlotLagwadMetrics
        slot={slot}
        variant={variant}
        onOpenActual={onOpenActual}
        className="mb-2"
      />

      <div
        className={`grid grid-cols-3 gap-1 rounded-lg border px-2 py-1.5 ${bgClass}`}>
        <p
          className={`${labelSize} text-gray-500 uppercase tracking-wide col-span-3 -mb-0.5`}
        >
          Order queue vs actual
        </p>
        <Tooltip
          title={`${fmt(actualRem)} plants still to dispatch (native + rolled queue)`}
          arrow>
          <div className="text-left min-w-0">
            <p className={`${labelSize} text-gray-500 uppercase tracking-wide`}>Queue rem.</p>
            <p className={`${textSize} font-bold tabular-nums text-amber-700`}>{fmt(actualRem)}</p>
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
    </div>
  )
}

export default SlotPhysicalSummary
