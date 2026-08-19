import React from "react"
import { Tooltip } from "@mui/material"
import { ArrowRightLeft, CalendarClock, Clock, Truck } from "lucide-react"
import { tooltipSlotProps, fmt, getWindowStateUi } from "./lagwadAnalysisUi"

const Stat = ({ label, value, valueClass = "text-slate-900" }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
    <p className={`lag-readout text-sm font-bold ${valueClass}`}>{fmt(value)}</p>
  </div>
)

const Pool = ({ label, sub, value, tone, onClick, title }) => {
  const clickable = Boolean(onClick)
  const Wrapper = clickable ? "button" : "div"
  return (
    <Tooltip title={title} arrow slotProps={tooltipSlotProps}>
      <Wrapper
        type={clickable ? "button" : undefined}
        onClick={onClick}
        className={`relative w-full overflow-hidden rounded-lg border p-2 text-left transition-all duration-200 ${tone.box} ${
          clickable ? "cursor-pointer hover:brightness-[0.97]" : ""
        }`}>
        <span className={`lag-rail ${tone.rail}`} />
        <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-slate-500">
          {clickable && <ArrowRightLeft className="h-2.5 w-2.5" />}
          {label}
        </p>
        <p className={`lag-readout text-base font-bold ${tone.value}`}>{fmt(value)}</p>
        <p className="text-[10px] text-slate-500">{sub}</p>
      </Wrapper>
    </Tooltip>
  )
}

const Pill = ({ icon: Icon, children, className, onClick, title }) => {
  const clickable = Boolean(onClick)
  const content = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${className} ${
        clickable ? "cursor-pointer hover:brightness-[0.97]" : ""
      }`}>
      <Icon className="h-3 w-3" />
      {children}
    </span>
  )
  if (!clickable)
    return (
      <Tooltip title={title} arrow slotProps={tooltipSlotProps}>
        {content}
      </Tooltip>
    )
  return (
    <Tooltip title={title} arrow slotProps={tooltipSlotProps}>
      <button type="button" onClick={onClick} className="p-0">
        {content}
      </button>
    </Tooltip>
  )
}

/**
 * One card per selected slot window. Booking numbers (orders) stay visually separate
 * from the three physical lagwad pools so they are never added together by mistake.
 */
const SelectedSlotsGrid = ({ slots, onOpenRolls, onTransferMortality, onFocusSlot }) => {
  if (!slots?.length) return null

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {slots.map((slot, index) => {
        const stateUi = getWindowStateUi(slot.windowState)
        const capacity = slot.availablePlants + slot.totalBookedPlants
        const expiredWithReady = slot.windowState === "expired" && slot.actualReadyPlants > 0
        const awaitingReady = slot.actualReadyPlants === 0 && slot.actualPlants > 0

        return (
          <div
            key={slot._id}
            style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
            className={`lag-panel lag-panel-hover lag-rise rounded-2xl p-4 ${
              slot.isOverbooked ? "!border-rose-300" : ""
            }`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                {onFocusSlot ? (
                  <button
                    type="button"
                    onClick={() => onFocusSlot(slot)}
                    className="text-left text-lg font-bold text-slate-900 transition-colors hover:text-cyan-700">
                    {slot.label}
                  </button>
                ) : (
                  <p className="text-lg font-bold text-slate-900">{slot.label}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${stateUi.chip}`}>
                    {stateUi.label}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">
                    {slot.month}
                  </span>
                  {slot.isOverbooked && (
                    <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                      Overbooked
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Lines</p>
                <p className="lag-readout text-sm font-semibold text-slate-700">
                  {slot.lineCount} · {slot.batchCount} batch
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Stat label="Booked" value={slot.totalBookedPlants} />
              <Stat label="Capacity" value={capacity} />
              <Stat label="Dispatched" value={slot.totalDispatchedPlants} />
              <Stat
                label="Available"
                value={slot.availablePlants}
                valueClass={slot.isOverbooked ? "text-rose-600" : "text-emerald-600"}
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Pool
                label="Sellable 90%"
                sub="actualPlants"
                value={slot.actualPlants}
                title="Sellable lagwad pool on this slot — stays put when only ready rolls off an expired window."
                tone={{
                  box: "border-emerald-200 bg-emerald-50",
                  rail: "lag-rail-sellable",
                  value: "lag-glow-sellable"
                }}
              />
              <Pool
                label="Exp. mortality"
                sub={slot.expectedMortality > 0 ? "click to transfer" : "10% reserve"}
                value={slot.expectedMortality}
                onClick={slot.expectedMortality > 0 ? () => onTransferMortality?.(slot) : undefined}
                title="10% reserve. Transfer to ready once the plants are confirmed to have survived."
                tone={{
                  box: "border-rose-200 bg-rose-50",
                  rail: "lag-rail-mortality",
                  value: "lag-glow-mortality"
                }}
              />
              <Pool
                label="Ready"
                sub="dispatch-ready"
                value={slot.actualReadyPlants}
                title="Only this pool goes on trucks. Vehicle dispatch subtracts here; the sellable pool is unchanged."
                tone={{
                  box: "border-cyan-200 bg-cyan-50",
                  rail: "lag-rail-ready",
                  value: "lag-glow-ready"
                }}
              />
            </div>

            {slot.overdueLineCount > 0 && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-600">
                  <Clock className="h-3 w-3" />
                  Ready age
                </p>
                <p className="text-xs font-semibold text-amber-900">
                  Average {slot.avgOverdueDays} day{slot.avgOverdueDays === 1 ? "" : "s"} overdue ·{" "}
                  {slot.overdueLineCount} line{slot.overdueLineCount === 1 ? "" : "s"} past ready date
                </p>
                <p className="text-[10px] text-amber-600/80">
                  overdue days = today minus expected ready date · worst line +{slot.maxOverdueDays}d
                </p>
              </div>
            )}

            {awaitingReady && slot.overdueLineCount === 0 && (
              <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                Awaiting ready date — stock sits on this slot but nothing can be loaded yet.
              </p>
            )}

            {expiredWithReady && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                Expired window still holding {fmt(slot.actualReadyPlants)} ready — roll it to the
                current slot.
              </p>
            )}

            {(slot.rolledInActualReadyPlants > 0 ||
              slot.rolledInOrderPlants > 0 ||
              slot.readyGap > 0) && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {slot.rolledInActualReadyPlants > 0 && (
                  <Pill
                    icon={Truck}
                    onClick={() => onOpenRolls?.(slot)}
                    title="Physical ready plants rolled in from expired windows. Click for the roll ledger."
                    className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {fmt(slot.rolledInActualReadyPlants)} ready rolled
                  </Pill>
                )}
                {slot.rolledInOrderPlants > 0 && (
                  <Pill
                    icon={CalendarClock}
                    title={`${slot.rolledInOrderCount} past-due order(s) moved onto this window. This is order rollover, not physical stock.`}
                    className="border-sky-200 bg-sky-50 text-sky-700">
                    {fmt(slot.rolledInOrderPlants)} orders rolled
                  </Pill>
                )}
                {slot.readyGap > 0 && (
                  <Pill
                    icon={Clock}
                    title="Delivery queue on this slot minus its ready pool."
                    className="border-orange-200 bg-orange-50 text-orange-700">
                    {fmt(slot.readyGap)} ready gap
                  </Pill>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default SelectedSlotsGrid
