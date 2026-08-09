import React from "react"
import { Tooltip } from "@mui/material"
import { Layers, AlertTriangle } from "lucide-react"
import {
  getRolledInOrdersOnCurrentSlot,
  getNativeBookedPlantsOnSlot,
  getRolledInAvailablePlants,
} from "./slotMetrics"

const ActiveSlotHighlight = ({
  slot,
  mixedRolledAndNative,
  hasPendingPastDue,
}) => {
  if (!slot?.isCurrentDateSlot) return null

  const rolledCapacity = getRolledInAvailablePlants(slot)

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <span className="inline-flex items-center gap-0.5 rounded border border-sky-300 bg-sky-100 px-1 py-0.5 text-[9px] font-bold text-sky-900">
        Today&apos;s slot
      </span>
      {slot.status === false && (
        <span className="inline-flex items-center gap-0.5 rounded border border-slate-300 bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-700">
          Off
        </span>
      )}
      {mixedRolledAndNative && (
        <Tooltip
          title={`${getRolledInOrdersOnCurrentSlot(slot)} rolled-in + native bookings (${getNativeBookedPlantsOnSlot(slot).toLocaleString()} plants native)`}
          arrow>
          <span className="inline-flex items-center gap-0.5 rounded border border-amber-300 bg-amber-100 px-1 py-0.5 text-[9px] font-bold text-amber-900">
            <Layers className="w-3 h-3" />
            Rolled + current
          </span>
        </Tooltip>
      )}
      {hasPendingPastDue && (
        <Tooltip title="Some orders still on expired slots — not rolled yet" arrow>
          <span className="inline-flex items-center gap-0.5 rounded border border-orange-300 bg-orange-100 px-1 py-0.5 text-[9px] font-bold text-orange-900">
            <AlertTriangle className="w-3 h-3" />
            Pending roll
          </span>
        </Tooltip>
      )}
      {rolledCapacity > 0 && (
        <Tooltip title="Booking capacity rolled from expired slot windows" arrow>
          <span className="inline-flex items-center gap-0.5 rounded border border-violet-300 bg-violet-100 px-1 py-0.5 text-[9px] font-bold text-violet-900">
            Rolled cap. {rolledCapacity.toLocaleString()}
          </span>
        </Tooltip>
      )}
    </div>
  )
}

export default ActiveSlotHighlight
