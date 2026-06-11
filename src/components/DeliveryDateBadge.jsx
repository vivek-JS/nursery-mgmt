import React from "react"
import { Chip } from "@mui/material"
import { formatDeliveryDateDisplay } from "utils/deliveryDateDisplay"

export function DeliveryDateBadge({ order, format, className = "" }) {
  const d = formatDeliveryDateDisplay(order, format)

  if (!d.current || d.current === "-") {
    return <span className={`text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 ${className}`}>-</span>
  }

  return (
    <div className={`flex flex-col gap-0.5 items-start ${className}`}>
      <div className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-1.5 py-0.5">
        <span className="text-[10px] font-semibold text-amber-800">📅</span>
        <span className="text-[10px] font-bold text-amber-900">{d.current}</span>
      </div>
      {(d.isEarlyDispatch || d.isPastDueRollover) && d.original && (
        <span className="text-[9px] text-gray-500 leading-tight">Was: {d.original}</span>
      )}
      {(d.isEarlyDispatch || d.isPastDueRollover) && d.label && (
        <Chip
          label={d.label}
          size="small"
          sx={{
            height: 16,
            fontSize: "9px",
            "& .MuiChip-label": { px: 0.5 },
          }}
          color={d.isPastDueRollover ? "warning" : "info"}
          variant="outlined"
        />
      )}
      {d.overdueHint && (
        <span className="text-[9px] text-orange-700 font-medium">{d.overdueHint}</span>
      )}
    </div>
  )
}

export default DeliveryDateBadge
