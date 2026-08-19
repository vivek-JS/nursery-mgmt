import React, { useState } from "react"
import { Tooltip, Popover } from "@mui/material"
import { Info } from "lucide-react"
import {
  getBookedPlants,
  getBookedCoveredPlants,
  getBookedUncoveredPlants,
  getSowingEntries,
} from "./slotMetrics"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const pillClass =
  "rounded-lg border px-2 py-1.5 text-left min-w-0 w-full"

/**
 * Booked vs sowing cover on this ready-date slot.
 * Covered = dispatched + sowingDone. Gap = still need sow.
 * Info lists sowing batches that landed on this slot (may cover nearby delivery days).
 */
const SlotBookingCoverPanel = ({ slot, monthName, onOpenOrders, variant = "card" }) => {
  const booked = getBookedPlants(slot)
  const covered = getBookedCoveredPlants(slot)
  const gap = getBookedUncoveredPlants(slot)
  const entries = getSowingEntries(slot)
  const labelSize = variant === "detail" ? "text-sm" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-2xl" : "text-sm"
  const [anchor, setAnchor] = useState(null)

  const open = (e, key) => {
    e?.stopPropagation?.()
    onOpenOrders?.(e, slot, monthName, key)
  }

  return (
    <div className="border-t border-gray-200 pt-2 mt-1 mb-2" onClick={(e) => e.stopPropagation()}>
      <p className="text-[10px] font-semibold text-blue-900 uppercase tracking-wide mb-1.5 flex items-center gap-1">
        Booking cover
        <button
          type="button"
          className="inline-flex p-0 text-teal-700 hover:text-teal-900"
          aria-label="Covered sow entries"
          onClick={(e) => {
            e.stopPropagation()
            setAnchor(e.currentTarget)
          }}>
          <Info className="w-3 h-3" />
        </button>
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        <Tooltip title="Orders booked on this delivery window" arrow>
          <button
            type="button"
            className={`${pillClass} bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer`}
            onClick={(e) => open(e, "booked")}>
            <p className={`${labelSize} text-gray-500`}>Booked</p>
            <p className={`${valueSize} font-bold text-blue-700 tabular-nums`}>{fmt(booked)}</p>
          </button>
        </Tooltip>
        <Tooltip title="Booked plants already sowingDone or dispatched" arrow>
          <div className={`${pillClass} bg-emerald-50 border-emerald-200`}>
            <p className={`${labelSize} text-gray-500`}>Covered</p>
            <p className={`${valueSize} font-bold text-emerald-800 tabular-nums`}>{fmt(covered)}</p>
          </div>
        </Tooltip>
        <Tooltip title="Booked plants still needing sow (not sowingDone, not dispatched)" arrow>
          <div
            className={`${pillClass} ${
              gap > 0 ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"
            }`}>
            <p className={`${labelSize} text-gray-500`}>Gap</p>
            <p
              className={`${valueSize} font-bold tabular-nums ${
                gap > 0 ? "text-orange-800" : "text-gray-700"
              }`}>
              {fmt(gap)}
            </p>
          </div>
        </Tooltip>
      </div>

      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { className: "max-w-sm w-80" } }}>
        <div className="px-3 py-2 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-800">Sowed entries on this slot</p>
          <p className="text-[10px] text-slate-500">
            Plants land on the ready-date slot. Nearby delivery days can be covered from here.
          </p>
        </div>
        <div className="max-h-64 overflow-y-auto px-3 py-2">
          {entries.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No sowing batches on this slot.</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, idx) => (
                <li
                  key={`${entry.requestNumber || "sow"}-${idx}`}
                  className="text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex justify-between gap-2 font-semibold text-slate-800">
                    <span>
                      {entry.sowingDate || "—"}
                      {entry.plantReadyDate ? ` → ${entry.plantReadyDate}` : ""}
                    </span>
                    <span className="tabular-nums text-teal-700">{fmt(entry.plantsSowed)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {entry.requestNumber || "sow"}
                    {entry.packetsUsed ? ` · ${entry.packetsUsed} pkt` : ""}
                    {` · covered ${fmt(entry.orderCoveredPlants)} · excess ${fmt(entry.excessPlants)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Popover>
    </div>
  )
}

export default SlotBookingCoverPanel
