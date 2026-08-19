import React from "react"
import { CalendarClock, ChevronRight, Clock, Truck } from "lucide-react"
import { fmt } from "./lagwadAnalysisUi"

const Stat = ({ label, value, valueClass = "text-slate-900" }) => (
  <div className="min-w-0">
    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
    <p className={`lag-readout text-sm font-bold ${valueClass}`}>{fmt(value)}</p>
  </div>
)

const Pool = ({ label, sub, value, tone }) => (
  <div className={`relative overflow-hidden rounded-lg border p-2 ${tone.box}`}>
    <span className={`lag-rail ${tone.rail}`} />
    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
    <p className={`lag-readout text-base font-bold ${tone.value}`}>{fmt(value)}</p>
    <p className="text-[10px] text-slate-500">{sub}</p>
  </div>
)

const Pill = ({ icon: Icon, children, className }) => (
  <span
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${className}`}>
    <Icon className="h-3 w-3" />
    {children}
  </span>
)

/**
 * One card per month. Individual slot windows live behind the card — clicking opens the
 * month detail popup rather than spilling every window onto the page.
 */
const MonthCardsGrid = ({ months, onOpenMonth }) => {
  if (!months?.length) return null

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
      {months.map((m, index) => (
        <button
          key={m.month}
          type="button"
          onClick={() => onOpenMonth?.(m)}
          style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
          className={`lag-panel lag-panel-hover lag-rise group w-full p-4 text-left ${
            m.isOverbooked ? "!border-rose-300" : ""
          }`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-2 text-lg font-bold text-slate-900">
                {m.month}
                {m.hasCurrent && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-700">
                    <span className="lag-live relative inline-block h-1.5 w-1.5 rounded-full bg-cyan-500" />
                    Live
                  </span>
                )}
                {m.isOverbooked && (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                    Overbooked
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {m.slotCount} window{m.slotCount === 1 ? "" : "s"} · {m.lineCount} line
                {m.lineCount === 1 ? "" : "s"} · {m.batchCount} batch
              </p>
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-700 transition-transform group-hover:translate-x-0.5">
              Details
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <Stat label="Booked" value={m.booked} />
            <Stat label="Capacity" value={m.capacity} />
            <Stat label="Dispatched" value={m.dispatched} />
            <Stat
              label="Available"
              value={m.available}
              valueClass={m.isOverbooked ? "text-rose-600" : "text-emerald-600"}
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Pool
              label="Sellable 90%"
              sub="actualPlants"
              value={m.sellable}
              tone={{
                box: "border-emerald-200 bg-emerald-50",
                rail: "lag-rail-sellable",
                value: "lag-glow-sellable"
              }}
            />
            <Pool
              label="Exp. mortality"
              sub="10% reserve"
              value={m.mortality}
              tone={{
                box: "border-rose-200 bg-rose-50",
                rail: "lag-rail-mortality",
                value: "lag-glow-mortality"
              }}
            />
            <Pool
              label="Ready"
              sub="dispatch-ready"
              value={m.ready}
              tone={{
                box: "border-cyan-200 bg-cyan-50",
                rail: "lag-rail-ready",
                value: "lag-glow-ready"
              }}
            />
          </div>

          {m.overdueLineCount > 0 && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              <span className="font-semibold">
                {m.overdueLineCount} line{m.overdueLineCount === 1 ? "" : "s"} past ready date
              </span>{" "}
              · average {m.avgOverdueDays}d overdue · worst +{m.maxOverdueDays}d
            </p>
          )}

          {m.expiredReady > 0 && (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
              {fmt(m.expiredReady)} ready still parked on expired windows in this month.
            </p>
          )}

          {(m.rolledInReady > 0 || m.rolledInOrders > 0 || m.readyGap > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.rolledInReady > 0 && (
                <Pill icon={Truck} className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  {fmt(m.rolledInReady)} ready rolled
                </Pill>
              )}
              {m.rolledInOrders > 0 && (
                <Pill icon={CalendarClock} className="border-sky-200 bg-sky-50 text-sky-700">
                  {fmt(m.rolledInOrders)} orders rolled
                </Pill>
              )}
              {m.readyGap > 0 && (
                <Pill icon={Clock} className="border-orange-200 bg-orange-50 text-orange-700">
                  {fmt(m.readyGap)} ready gap
                </Pill>
              )}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

export default MonthCardsGrid
