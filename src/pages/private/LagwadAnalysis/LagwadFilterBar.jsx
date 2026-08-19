import React from "react"
import { CircularProgress, Tooltip } from "@mui/material"
import { CalendarRange, Check, Layers, RefreshCw } from "lucide-react"
import { tooltipSlotProps, fmt, getWindowStateUi, MONTH_SHORT } from "./lagwadAnalysisUi"

const selectClass =
  "lag-select h-9 rounded-lg px-3 text-sm disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"

const chipBase =
  "lag-chip inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"

const ToggleAll = ({ label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="text-[11px] font-semibold text-cyan-700 underline-offset-2 transition-colors hover:text-cyan-800 hover:underline disabled:text-slate-400 disabled:no-underline">
    {label}
  </button>
)

/**
 * Plant / subtype / year context, then month multi-select, then slot multi-select.
 * Slot chips only ever list windows from the chosen months.
 */
const LagwadFilterBar = ({
  plants,
  subtypes,
  years,
  plantId,
  subtypeId,
  year,
  onPlantChange,
  onSubtypeChange,
  onYearChange,
  availableMonths,
  selectedMonths,
  onToggleMonth,
  onSelectAllMonths,
  onClearMonths,
  slots,
  selectedSlotIds,
  onToggleSlot,
  onSelectAllSlots,
  onClearSlots,
  loading,
  onRefresh
}) => {
  const allMonthsSelected =
    availableMonths.length > 0 && selectedMonths.length === availableMonths.length

  return (
    <div className="lag-panel lag-rise rounded-2xl p-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Plant</span>
          <select
            className={selectClass}
            value={plantId}
            onChange={(e) => onPlantChange(e.target.value)}>
            <option value="">Select plant</option>
            {plants.map((p) => (
              <option key={p.plantId} value={p.plantId}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Subtype</span>
          <select
            className={selectClass}
            value={subtypeId}
            disabled={!plantId || subtypes.length === 0}
            onChange={(e) => onSubtypeChange(e.target.value)}>
            <option value="">Select subtype</option>
            {subtypes.map((s) => (
              <option key={s.subtypeId} value={s.subtypeId}>
                {s.subtypeName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Year</span>
          <select className={selectClass} value={year} onChange={(e) => onYearChange(e.target.value)}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-2">
          {loading && <CircularProgress size={16} sx={{ color: "#2dd4bf" }} />}
          <Tooltip title="Reload analysis" arrow slotProps={tooltipSlotProps}>
            <button
              type="button"
              onClick={onRefresh}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <div className="mb-2 flex items-center gap-2">
          <CalendarRange className="h-3.5 w-3.5 text-slate-500" />
          <span className={labelClass}>Months</span>
          <span className="text-[10px] text-slate-500">
            {selectedMonths.length === 0 ? "whole year" : `${selectedMonths.length} selected`}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <ToggleAll
              label="Select all"
              onClick={onSelectAllMonths}
              disabled={allMonthsSelected || availableMonths.length === 0}
            />
            <ToggleAll label="Clear" onClick={onClearMonths} disabled={selectedMonths.length === 0} />
          </div>
        </div>

        {availableMonths.length === 0 ? (
          <p className="text-xs text-slate-500">No slot months for this subtype and year.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {availableMonths.map((m) => {
              const active = selectedMonths.includes(m.month)
              return (
                <Tooltip
                  key={m.month}
                  arrow
                  slotProps={tooltipSlotProps}
                  title={`${m.slotCount} slot${m.slotCount === 1 ? "" : "s"} · sellable ${fmt(
                    m.actualPlants
                  )} · ready ${fmt(m.actualReadyPlants)}`}>
                  <button
                    type="button"
                    onClick={() => onToggleMonth(m.month)}
                    className={`${chipBase} ${
                      active
                        ? "lag-chip-on border-cyan-500 bg-cyan-500 font-semibold text-white"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-cyan-300 hover:text-slate-700"
                    }`}>
                    {active && <Check className="h-3 w-3" />}
                    {MONTH_SHORT[m.month] || m.month}
                    {m.hasCurrentSlot && (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    )}
                    <span className={active ? "text-cyan-700/80" : "text-slate-400"}>
                      {m.slotCount}
                    </span>
                  </button>
                </Tooltip>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <div className="mb-2 flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-slate-500" />
          <span className={labelClass}>Slot windows</span>
          <span className="text-[10px] text-slate-500">
            {selectedSlotIds.length === 0
              ? "all slots in selected months"
              : `${selectedSlotIds.length} of ${slots.length} selected`}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <ToggleAll
              label="Select all"
              onClick={onSelectAllSlots}
              disabled={slots.length === 0 || selectedSlotIds.length === 0}
            />
            <ToggleAll
              label="Reset filter"
              onClick={onClearSlots}
              disabled={selectedSlotIds.length === 0}
            />
          </div>
        </div>

        {slots.length === 0 ? (
          <p className="text-xs text-slate-500">Pick a month to list its slot windows.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {slots.map((slot) => {
              const active = selectedSlotIds.length === 0 || selectedSlotIds.includes(slot._id)
              const stateUi = getWindowStateUi(slot.windowState)
              return (
                <Tooltip
                  key={slot._id}
                  arrow
                  slotProps={tooltipSlotProps}
                  title={`${stateUi.label} · sellable ${fmt(slot.actualPlants)} · ready ${fmt(
                    slot.actualReadyPlants
                  )}`}>
                  <button
                    type="button"
                    onClick={() => onToggleSlot(slot._id)}
                    className={`${chipBase} ${
                      active
                        ? "border-slate-300 bg-slate-100 text-slate-900"
                        : "border-slate-200 bg-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${stateUi.dot}`} />
                    {slot.label}
                    <span className={active ? "text-slate-500" : "text-slate-400"}>
                      {fmt(slot.actualPlants)}
                    </span>
                  </button>
                </Tooltip>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default LagwadFilterBar
