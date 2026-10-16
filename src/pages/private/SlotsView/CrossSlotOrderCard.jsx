import React from "react"
import moment from "moment"
import { ArrowRight, CalendarDays, ExternalLink, Sprout } from "lucide-react"

const DAY = "DD-MM-YYYY"

export function fmtDay(value, withYear = false) {
  const m = moment(value, DAY, true)
  if (!m.isValid()) return value || "—"
  return m.format(withYear ? "D MMM YYYY" : "D MMM")
}

/** "15-11-2026–21-11-2026" → "15 Nov – 21 Nov". */
export function fmtWindow(label) {
  if (!label) return "—"
  const parts = String(label).split(/\s*[–→]\s*/)
  if (parts.length === 2 && parts.every((p) => moment(p, DAY, true).isValid())) {
    return `${fmtDay(parts[0])} – ${fmtDay(parts[1])}`
  }
  return fmtDay(label)
}

const STATUS_TONE = {
  ACCEPTED: "bg-blue-50 text-blue-700 ring-blue-200",
  PENDING: "bg-gray-100 text-gray-700 ring-gray-200",
  FARM_READY: "bg-lime-50 text-lime-800 ring-lime-200",
  READY_FOR_DISPATCH: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  DISPATCHED: "bg-violet-50 text-violet-700 ring-violet-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
}

function SlotPill({ label, active, caption }) {
  return (
    <div
      className={`min-w-0 rounded-lg px-2.5 py-1.5 ring-1 ${
        active ? "bg-white ring-teal-300 shadow-sm" : "bg-white/70 ring-gray-200"
      }`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-400 leading-none">{caption}</p>
      <p className={`text-xs font-bold leading-tight mt-0.5 ${active ? "text-teal-800" : "text-gray-700"}`}>
        {fmtWindow(label)}
      </p>
    </div>
  )
}

/**
 * Order row for cross-slot sowing: booked on one slot, sowing on another.
 * side "from" → card shown on the booking slot; "to" → shown on the source slot.
 */
export default function CrossSlotOrderCard({ row, side, onOpenOrder, onOpenSlot }) {
  const otherSlotId = side === "from" ? row.fromSlotId : row.toSlotId
  const otherLabel = side === "from" ? row.fromSlotLabel : row.toSlotLabel
  const status = String(row.orderStatus || "").toUpperCase()

  return (
    <li className="px-3 py-3 bg-white/70 hover:bg-white transition-colors">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-base font-extrabold text-gray-900">#{row.orderId ?? "—"}</span>
            {status ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${
                  STATUS_TONE[status] || STATUS_TONE.PENDING
                }`}>
                {status.replace(/_/g, " ")}
              </span>
            ) : null}
            {row.fromExcess ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-200">
                <Sprout className="h-3 w-3" aria-hidden />
                Covered from excess
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <SlotPill caption="Sowing slot" label={row.fromSlotLabel} active={side === "to"} />
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <SlotPill caption="Booked slot" label={row.toSlotLabel} active={side === "from"} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-gray-600">
            {row.sowingDate ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-1.5 py-0.5 ring-1 ring-gray-200">
                <CalendarDays className="h-3 w-3 text-gray-400" aria-hidden />
                Sowed {fmtDay(row.sowingDate, true)}
              </span>
            ) : null}
            {row.plantReadyDate ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-800 ring-1 ring-emerald-200">
                Ready {fmtDay(row.plantReadyDate, true)}
              </span>
            ) : null}
            {row.requestNumber ? (
              <span className="rounded-md bg-gray-50 px-1.5 py-0.5 font-mono text-[10px] text-gray-500 ring-1 ring-gray-200">
                {row.requestNumber}
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-lg font-extrabold tabular-nums text-gray-900 leading-none">
            {(Number(row.plants) || 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">plants</p>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onOpenOrder?.(row)}
          className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          Open order
        </button>
        {onOpenSlot && otherSlotId ? (
          <button
            type="button"
            onClick={() => onOpenSlot(otherSlotId, side === "from" ? "coverMovedOut" : "sowingFromOtherSlot")}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50">
            Open {side === "from" ? "sowing" : "booked"} slot {fmtWindow(otherLabel)}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
    </li>
  )
}
