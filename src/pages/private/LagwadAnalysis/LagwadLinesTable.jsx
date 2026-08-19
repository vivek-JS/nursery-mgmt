import React, { useMemo, useState } from "react"
import { Tooltip } from "@mui/material"
import { ChevronDown, Sprout } from "lucide-react"
import {
  tooltipSlotProps,
  fmt,
  getOverdueUi,
  getReadyStatusUi,
  GROUP_MODES,
  groupLagwadLines,
  SYNC_STATUS_UI
} from "./lagwadAnalysisUi"

const headerCell =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"
const bodyCell = "px-3 py-2 text-xs text-slate-700"

/**
 * One row per lagwad inward line. Grouping is slot-wise by default — the same lagwad
 * date can land on different delivery windows for different subtypes.
 */
const LagwadLinesTable = ({ lines, slotLabelById, defaultMode = "month" }) => {
  const [mode, setMode] = useState(defaultMode)
  const [collapsed, setCollapsed] = useState({})

  const groups = useMemo(() => groupLagwadLines(lines, mode), [lines, mode])

  const toggle = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))

  if (!lines?.length) {
    return (
      <div className="lag-rise rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <Sprout className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-semibold text-slate-700">No lagwad on these slots</p>
        <p className="mt-1 text-xs text-slate-500">
          Nothing has been recorded as secondary inward against the selected slot windows yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
            Lagwad entries
          </p>
          <p className="text-[11px] text-slate-500">One row = one batch / one lagwad inward line</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-1.5">
          {GROUP_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={`lag-chip rounded-full border px-3 py-1 text-[11px] ${
                mode === m.key
                  ? "lag-chip-on border-cyan-500 bg-cyan-500 font-semibold text-white"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:border-cyan-300 hover:text-slate-700"
              }`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {groups.map((group, index) => {
        const isCollapsed = collapsed[group.key]
        return (
          <div
            key={group.key}
            style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            className="lag-panel lag-rise overflow-hidden rounded-xl">
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full items-center gap-2 bg-slate-50 px-3 py-2 text-left transition-colors hover:bg-slate-100">
              <ChevronDown
                className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                  isCollapsed ? "-rotate-90" : ""
                }`}
              />
              <span className="text-sm font-semibold text-slate-900">{group.title}</span>
              {group.subtitle && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
                  {group.subtitle}
                </span>
              )}
              <span className="ml-auto flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                <span>
                  {group.lines.length} line{group.lines.length === 1 ? "" : "s"}
                </span>
                <span className="lag-readout font-semibold text-emerald-600">
                  {fmt(group.sell)} sellable
                </span>
                {group.overdueCount > 0 && (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">
                    avg overdue {group.avgOverdue}d
                  </span>
                )}
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-200 ease-out ${
                isCollapsed ? "max-h-0" : "max-h-[4000px]"
              }`}>
              <div className="lag-scroll overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className={headerCell}>Batch</th>
                      <th className={headerCell}>Shed</th>
                      <th className={`${headerCell} text-right`}>Gross</th>
                      <th className={`${headerCell} text-right`}>Sell 90%</th>
                      <th className={`${headerCell} text-right`}>Mort 10%</th>
                      <th className={headerCell}>Lagwad date</th>
                      <th className={headerCell}>Ready date</th>
                      <th className={headerCell}>Ready age</th>
                      <th className={headerCell}>Status</th>
                      <th className={headerCell}>Linked slot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.lines.map((line) => {
                      const overdue = getOverdueUi(line.overdueDays)
                      const status = getReadyStatusUi(line)
                      const sync = SYNC_STATUS_UI[line.slotSyncStatus]
                      return (
                        <tr
                          key={`${line.secondaryInwardId}-${line.slotId}`}
                          className="transition-colors hover:bg-slate-50">
                          <td className={`${bodyCell} font-semibold text-slate-900`}>
                            {line.batchNumber}
                            {line.size && (
                              <span className="ml-1 rounded border border-slate-200 bg-slate-50 px-1 text-[10px] text-slate-500">
                                {line.size}
                              </span>
                            )}
                          </td>
                          <td className={bodyCell}>{line.pollyhouse || "—"}</td>
                          <td className={`${bodyCell} lag-readout text-right`}>
                            {fmt(line.totalQuantity)}
                          </td>
                          <td
                            className={`${bodyCell} lag-readout text-right font-semibold text-emerald-600`}>
                            {fmt(line.sell90)}
                          </td>
                          <td className={`${bodyCell} lag-readout text-right text-rose-600`}>
                            {fmt(line.mort10)}
                          </td>
                          <td className={bodyCell}>{line.lagwadLabel || "—"}</td>
                          <td className={bodyCell}>{line.expectedReadyLabel || "—"}</td>
                          <td className={bodyCell}>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] ${overdue.className}`}>
                              {overdue.label}
                            </span>
                          </td>
                          <td className={bodyCell}>
                            <Tooltip
                              arrow
                              slotProps={tooltipSlotProps}
                              title={
                                line.pendingSlotSync > 0
                                  ? `${fmt(line.pendingSlotSync)} plants in shed not yet synced to the slot`
                                  : "Fully synced to the booking slot"
                              }>
                              <span className="inline-flex flex-col">
                                <span
                                  className={`rounded-full border px-2 py-0.5 text-[10px] ${status.className}`}>
                                  {status.label}
                                </span>
                                {sync && line.slotSyncStatus !== "synced" && (
                                  <span className={`mt-0.5 text-[9px] ${sync.className}`}>
                                    {sync.label}
                                  </span>
                                )}
                              </span>
                            </Tooltip>
                          </td>
                          <td className={`${bodyCell} text-slate-500`}>
                            {line.slotLabel || slotLabelById?.get?.(line.slotId) || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default LagwadLinesTable
