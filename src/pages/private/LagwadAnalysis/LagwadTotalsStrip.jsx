import React from "react"
import { Tooltip } from "@mui/material"
import { fmt, tooltipSlotProps } from "./lagwadAnalysisUi"
import { useCountUp, useReducedMotion } from "./useCountUp"

const CountTile = ({ tile, pulse, index = 0 }) => {
  const value = useCountUp(tile.value, 700)
  return (
    <Tooltip title={tile.help} arrow slotProps={tooltipSlotProps}>
      <div
        className={`lag-panel lag-panel-hover lag-rise relative cursor-default overflow-hidden p-4 ${
          pulse ? "lag-alert" : ""
        }`}
        style={{ animationDelay: `${index * 70}ms` }}>
        <span className={`lag-rail ${tile.rail}`} />
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${tile.dot}`} />
          {tile.label}
        </p>
        <p className={`lag-readout mt-1.5 text-3xl font-extrabold ${tile.glow}`}>{fmt(value)}</p>
        <p className="mt-1 text-[11px] text-slate-500">{tile.sub}</p>
      </div>
    </Tooltip>
  )
}

/**
 * The four numbers a dispatch planner reads first, then the active-window cut below.
 * Sellable, mortality and ready are three separate pools — only READY can go on a truck.
 */
const LagwadTotalsStrip = ({ totals }) => {
  const reduced = useReducedMotion()
  const t = totals || {}

  const tiles = [
    {
      key: "sellable",
      label: "Sellable pool",
      value: t.sellablePool,
      sub: "90% actual on slot ledger",
      help: "Sum of the 90% lagwad share synced onto the selected slots. Not all of it is dispatchable today.",
      rail: "lag-rail-sellable",
      dot: "bg-emerald-500",
      glow: "lag-glow-sellable"
    },
    {
      key: "mortality",
      label: "Exp. mortality",
      value: t.expectedMortality,
      sub: "10% reserve · transferable",
      help: "The 10% reserve held back at lagwad. Transfer to ready once the plants are confirmed to have survived.",
      rail: "lag-rail-mortality",
      dot: "bg-rose-500",
      glow: "lag-glow-mortality"
    },
    {
      key: "ready",
      label: "Ready to dispatch",
      value: t.readyToDispatch,
      sub: "vehicle load uses this",
      help: "Calendar-ready plants on the selected slots. Truck loads subtract from here only.",
      rail: "lag-rail-ready",
      dot: "bg-cyan-500",
      glow: "lag-glow-ready"
    },
    {
      key: "delivery",
      label: "Delivery still needed",
      value: t.deliveryNeeded,
      sub: "orders not yet dispatched",
      help: "Farmer orders booked on the selected slots that have not been dispatched yet.",
      rail: "lag-rail-delivery",
      dot: "bg-violet-500",
      glow: "lag-glow-delivery"
    }
  ]

  const activeTiles = [
    {
      key: "activeAvailable",
      label: "Available now",
      value: t.activeAvailablePlants,
      sub: `bookable on ${t.activeSlotCount || 0} active slot${t.activeSlotCount === 1 ? "" : "s"}`,
      help: "Booking capacity still open on active windows. Expired slots are excluded — you cannot book against a window that has already ended.",
      rail: "lag-rail-delivery",
      dot: "bg-sky-500",
      glow: "lag-glow-delivery"
    },
    {
      key: "activeReady",
      label: "Ready now",
      value: t.activeReadyPlants,
      sub: "loadable on active slots",
      help: "Ready-to-dispatch plants sitting on active windows only. This is what trucks can actually load today.",
      rail: "lag-rail-ready",
      dot: "bg-cyan-500",
      glow: "lag-glow-ready"
    },
    {
      key: "activeMortality",
      label: "Exp. mortality",
      value: t.activeExpectedMortality,
      sub: "10% reserve on active slots",
      help: "The 10% reserve still held on active windows. Transfer it into ready once the plants are confirmed to have survived.",
      rail: "lag-rail-mortality",
      dot: "bg-rose-500",
      glow: "lag-glow-mortality"
    },
    {
      key: "activeTotal",
      label: "Total plants",
      value: t.activeLagwadGross,
      sub: "sellable + mortality",
      help: "Every plant standing on active windows — the 90% sellable pool plus the 10% mortality reserve. Ready is a subset of the sellable pool, so it is not added again here.",
      rail: "lag-rail-sellable",
      dot: "bg-emerald-500",
      glow: "lag-glow-sellable"
    }
  ]

  const pulseReady = !reduced && (t.overdueLineCount || 0) > 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile, i) => (
          <CountTile
            key={tile.key}
            tile={tile}
            index={i}
            pulse={tile.key === "ready" && pulseReady}
          />
        ))}
      </div>

      <div className="lag-panel lag-rise p-3">
        <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          <span className="lag-live relative inline-block h-1.5 w-1.5 rounded-full bg-cyan-500" />
          Active slots only · expired windows excluded
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {activeTiles.map((tile, i) => (
            <CountTile key={tile.key} tile={tile} index={i} />
          ))}
        </div>
        {(t.expiredReadyPlants || 0) > 0 && (
          <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] text-rose-700">
            {fmt(t.expiredReadyPlants)} ready plants are parked on expired windows — roll them to
            the current slot to make them loadable.
          </p>
        )}
      </div>
    </div>
  )
}

export default LagwadTotalsStrip
