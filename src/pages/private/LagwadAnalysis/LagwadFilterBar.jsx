import React from "react"
import { CircularProgress, Tooltip } from "@mui/material"
import { RefreshCw } from "lucide-react"
import { tooltipSlotProps } from "./lagwadAnalysisUi"

const selectClass =
  "lag-select h-9 rounded-lg px-3 text-sm disabled:cursor-not-allowed disabled:text-slate-400 disabled:opacity-60"

const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500"

/** Plant / subtype / year — full year data loads automatically (no month or slot filters). */
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
  loading,
  onRefresh
}) => (
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
  </div>
)

export default LagwadFilterBar
