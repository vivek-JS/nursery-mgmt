import React from "react"
import { CalendarCheck } from "lucide-react"

/** Compact ready-date cover chips in expanded slot card. */
const SlotBookingCoverPanel = ({ slot, monthName, onOpenOrders }) => {
  const sections = slot?.sowingGapDetail?.coveredByReadyDate || []
  const uncovered = slot?.sowingGapDetail?.uncovered?.plants ?? 0

  if (!sections.length && uncovered <= 0) return null

  return (
    <div className="mb-2" onClick={(e) => e.stopPropagation()}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-800 mb-1.5">
        Order cover by ready date
      </p>
      <div className="flex flex-wrap gap-1.5">
        {sections.map((section) => (
          <button
            key={`${section.dateLabel}-${section.slotLabel}`}
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1 text-left hover:bg-teal-100"
            onClick={(e) => onOpenOrders?.(e, slot, monthName, "sowingGap")}>
            <CalendarCheck className="h-3 w-3 shrink-0 text-teal-700" />
            <span className="text-[10px] font-semibold text-teal-900">{section.dateLabel}</span>
            <span className="text-[10px] tabular-nums text-teal-700">
              {(section.plants ?? 0).toLocaleString()}
            </span>
          </button>
        ))}
        {uncovered > 0 ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-orange-50 px-2 py-1 hover:bg-orange-100"
            onClick={(e) => onOpenOrders?.(e, slot, monthName, "sowingGap")}>
            <span className="text-[10px] font-semibold text-orange-900">Need sow</span>
            <span className="text-[10px] tabular-nums text-orange-800">
              {uncovered.toLocaleString()}
            </span>
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default SlotBookingCoverPanel
