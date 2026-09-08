import React, { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ExternalLink, Sprout } from "lucide-react"
import {
  getDisplaySowingGap,
  hasSowingCoverDetail,
} from "./slotMetrics"
import { resolveSowingGapSections, sowingGapToneStyles } from "./sowingGapSections"

const SlotSowingGapPanel = ({
  slot,
  monthName,
  onOpenOrders,
  variant = "card",
  sowingAllowed = false,
}) => {
  const navigate = useNavigate()
  const gap = getDisplaySowingGap(slot, sowingAllowed)
  const sections = useMemo(() => resolveSowingGapSections(slot), [slot])
  const hasDetail = hasSowingCoverDetail(slot) || gap > 0 || sections.length > 0

  if (!hasDetail && gap === 0) return null

  const labelSize = variant === "detail" ? "text-sm" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-2xl" : "text-sm"

  const openDrawer = (e) => {
    e?.stopPropagation?.()
    onOpenOrders?.(e, slot, monthName, "sowingGap")
  }

  if (variant === "card") {
    return (
      <div className="border-t border-gray-200 pt-2 mt-1 mb-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="w-full rounded-lg border border-orange-200 bg-orange-50 px-2 py-1.5 text-left hover:bg-orange-100 transition-all"
          onClick={openDrawer}>
          <p className={`${labelSize} font-semibold uppercase tracking-wide text-orange-800`}>
            Sowing gap & order cover
          </p>
          <p className={`${valueSize} font-bold tabular-nums text-orange-900`}>{gap.toLocaleString()}</p>
          {sections.length > 0 ? (
            <p className="text-[10px] text-orange-700 mt-0.5">
              {sections.length} date group{sections.length === 1 ? "" : "s"} — tap for orders
            </p>
          ) : null}
        </button>
      </div>
    )
  }

  return (
    <div className="mb-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-orange-600" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-800">
              Sowing gap & order cover
            </p>
            <p className="text-xs text-gray-600">By ready date — delivery window orders</p>
          </div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-right">
          <p className="text-[10px] uppercase text-orange-700">Gap</p>
          <p className="text-2xl font-bold tabular-nums text-orange-900">{gap.toLocaleString()}</p>
        </div>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-200 p-4">
          No order cover breakdown for this delivery window.
        </p>
      ) : (
        <div className="space-y-3">
          {sections.map((sec) => {
            const style = sowingGapToneStyles[sec.tone] || sowingGapToneStyles.teal
            return (
              <div
                key={sec.id}
                className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
                <div className="px-3 py-2 border-b border-black/5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{sec.label}</p>
                    {sec.subtitle ? (
                      <p className="text-xs text-gray-600">{sec.subtitle}</p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>
                    {(sec.orderCount ?? 0).toLocaleString()} orders ·{" "}
                    {(sec.plants ?? 0).toLocaleString()} plants
                  </span>
                </div>
                {sec.plantsOnly ? (
                  <div className="px-3 py-2.5 bg-white/60 text-sm text-gray-700">
                    {(sec.plants ?? 0).toLocaleString()} plants covered from this ready date
                  </div>
                ) : (
                  <ul className="divide-y divide-black/5">
                    {sec.orders.map((row) => (
                      <li
                        key={row._id}
                        className="flex items-center gap-2 px-3 py-2.5 bg-white/60 hover:bg-white transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            #{row.orderId ?? "—"}
                          </p>
                          <p className="text-xs text-gray-600">{row.orderStatus ?? "—"}</p>
                          {sec.showSowingHint && row.fromSlotLabel ? (
                            <p className="text-[10px] text-teal-700">Sowed on {row.fromSlotLabel}</p>
                          ) : null}
                          {sec.showSowingHint && row.requestNumber ? (
                            <p className="text-[10px] text-gray-500">{row.requestNumber}</p>
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 tabular-nums shrink-0">
                          {(row.plants ?? 0).toLocaleString()}
                        </p>
                        <button
                          type="button"
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 shrink-0"
                          title="Open on dashboard"
                          onClick={() =>
                            navigate(`/u/dashboard?search=${encodeURIComponent(row.orderId || "")}`)
                          }>
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SlotSowingGapPanel
