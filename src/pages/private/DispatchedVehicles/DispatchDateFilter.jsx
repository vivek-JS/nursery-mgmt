import React from "react";
import { CalendarDays } from "lucide-react";
import { DATE_PRESETS, toYmd } from "./dispatchVehiclesUtils";

export default function DispatchDateFilter({ startDate, endDate, activePreset, onPreset, onRangeChange }) {
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-gray-500 shrink-0">
        <CalendarDays size={14} className="text-green-700" />
        Dispatch date
      </div>
      <div className="flex flex-wrap gap-1.5">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPreset(preset.id)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition ${
              activePreset === preset.id
                ? "bg-green-600 text-white border-green-600"
                : "bg-gray-50 text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          From
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => onRangeChange(e.target.value, endDate, "custom")}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          To
          <input
            type="date"
            value={endDate}
            min={startDate}
            max={toYmd(new Date())}
            onChange={(e) => onRangeChange(startDate, e.target.value, "custom")}
            className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </label>
      </div>
    </div>
  );
}
