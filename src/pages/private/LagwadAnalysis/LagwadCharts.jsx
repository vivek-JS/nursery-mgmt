import React, { useMemo, useState } from "react"
import {
  Area,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts"
import {
  buildLagwadLineSeries,
  firstWhereAbove,
  fmt,
  rollupSlotsByMonth
} from "./lagwadAnalysisUi"

// Five clearly separated hues — green / pink / cyan / violet / amber. Emerald and teal
// sat too close together to tell the sellable bar from the ready bar at a glance.
const C = {
  sellable: "#10b981",
  mortality: "#f43f5e",
  ready: "#06b6d4",
  delivery: "#8b5cf6",
  gap: "#f59e0b",
  grid: "rgba(15,23,42,0.07)",
  axis: "#64748b"
}

const compact = (v) => {
  const n = Number(v) || 0
  if (Math.abs(n) >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`
  if (Math.abs(n) >= 1e5) return `${(n / 1e5).toFixed(1)}L`
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`
  return String(n)
}

const axisProps = {
  tick: { fontSize: 11, fill: C.axis },
  axisLine: { stroke: "rgba(15,23,42,0.12)" },
  tickLine: false
}

const ChartCard = ({ title, hint, right, children, className = "" }) => (
  <div className={`lag-panel lag-rise p-4 ${className}`}>
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
          {title}
        </p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
      </div>
      {right}
    </div>
    {children}
  </div>
)

/** Recharts' default tooltip is a white box — this keeps it inside the dark shell. */
const DarkTooltip = ({ active, payload, label, footer }) => {
  if (!active || !payload?.length) return null
  const heading = payload[0]?.payload?.full || label
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="mb-1 text-[11px] font-semibold text-slate-900">{heading}</p>
      {payload
        .filter((p) => typeof p.value === "number")
        .map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
          {p.name}
          <span className="lag-readout ml-auto pl-3 font-semibold text-slate-900">
            {fmt(p.value)}
          </span>
        </p>
      ))}
      {footer?.(payload[0]?.payload)}
    </div>
  )
}

const legendStyle = { fontSize: 11, color: "#475569" }

const lineSwatch = (value, color, dashed) => ({
  value,
  color,
  type: "plainline",
  id: value,
  payload: { strokeDasharray: dashed ? "6 4" : "0" }
})

const crossoverLegend = [
  lineSwatch("Delivery", C.delivery),
  lineSwatch("Actual", C.sellable),
  lineSwatch("Ready", C.ready),
  lineSwatch("Future need", C.gap, true),
  { value: "Short of ready", color: C.mortality, type: "rect", id: "short" },
  { value: "Ready to spare", color: C.ready, type: "rect", id: "spare" }
]

const ModeToggle = ({ value, onChange }) => (
  <div className="flex gap-1.5">
    {[
      { key: "month", label: "This month" },
      { key: "running", label: "Running total" }
    ].map((o) => (
      <button
        key={o.key}
        type="button"
        onClick={() => onChange(o.key)}
        className={`lag-chip rounded-full border px-3 py-1 text-[11px] ${
          value === o.key
            ? "lag-chip-on border-cyan-500 bg-cyan-500 font-semibold text-white"
            : "border-slate-200 bg-white text-slate-500 hover:border-cyan-300 hover:text-slate-900"
        }`}>
        {o.label}
      </button>
    ))}
  </div>
)

const dot = (color) => ({ r: 4, fill: color, stroke: "#fff", strokeWidth: 2 })

/**
 * The analytical core of the page: what physically exists versus what farmers are still
 * owed, read three ways — per month, as crossing cumulative lines, and as a coverage split.
 */
const LagwadCharts = ({ slots, totals, onSelectMonth }) => {
  const [mode, setMode] = useState("month")
  const months = useMemo(() => rollupSlotsByMonth(slots), [slots])

  const rows = useMemo(
    () => buildLagwadLineSeries(months, { cumulative: mode === "running" }),
    [months, mode]
  )

  const crossReady = useMemo(() => firstWhereAbove(rows, "delivery", "ready"), [rows])
  const crossActual = useMemo(() => firstWhereAbove(rows, "delivery", "actual"), [rows])

  const t = totals || {}
  const delivery = Number(t.deliveryNeeded) || 0
  const covered = Number(t.readyCoveredByReady) || 0
  const physicalGap = Number(t.physicalGap) || 0
  const needMoreReady = Math.max(0, (Number(t.readyGap) || 0) - physicalGap)
  const coveragePct = delivery > 0 ? Math.round((covered / delivery) * 100) : 100

  const coverageData = [
    { name: "Loadable today", value: covered, fill: C.ready },
    { name: "Waiting to mature", value: needMoreReady, fill: C.gap },
    { name: "Not in stock at all", value: physicalGap, fill: C.mortality }
  ].filter((d) => d.value > 0)

  const poolData = [
    { name: "Sellable 90%", value: Number(t.sellablePool) || 0, fill: C.sellable },
    { name: "Exp. mortality 10%", value: Number(t.expectedMortality) || 0, fill: C.mortality }
  ].filter((d) => d.value > 0)

  if (!rows.length) return null

  const coveredHint = mode === "running"
    ? "Ready stays above delivery all the way through, so the order book is covered."
    : "Ready covers delivery in every selected month."
  const shortHint = mode === "running"
    ? `Running totals. Delivery crosses above ready in ${crossReady?.label} — from there the order book is short of loadable plants.`
    : `Delivery sits above ready in ${crossReady?.label}. The shaded band is the leftover need. Click a month for its windows.`

  return (
    <div className="space-y-3">
      <ChartCard
        title="Delivery · actual · ready · future need"
        hint={crossReady ? shortHint : coveredHint}
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            {crossReady && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                Ready crossed · {crossReady.label}
              </span>
            )}
            {crossActual && (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700">
                Stock crossed · {crossActual.label}
              </span>
            )}
            <ModeToggle value={mode} onChange={setMode} />
          </div>
        }>
        <div className="lag-scroll overflow-x-auto">
          <div style={{ minWidth: Math.max(rows.length * 140, 560), height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={rows}
                margin={{ top: 22, right: 28, left: 0, bottom: 4 }}
                onClick={(e) => {
                  const month = e?.activePayload?.[0]?.payload?.month
                  if (month) onSelectMonth?.(month)
                }}
                style={{ cursor: onSelectMonth ? "pointer" : "default" }}>
                <defs>
                  <linearGradient id="lagShortFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.mortality} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={C.mortality} stopOpacity={0.04} />
                  </linearGradient>
                  <linearGradient id="lagSpareFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.ready} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={C.ready} stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={0} dy={6} height={32} />
                <YAxis {...axisProps} tickFormatter={compact} width={52} />
                <Tooltip
                  cursor={{ stroke: "rgba(15,23,42,0.18)", strokeDasharray: "4 4" }}
                  content={
                    <DarkTooltip
                      footer={(row) =>
                        row?.shortfall > 0 ? (
                          <p className="mt-1 border-t border-slate-200 pt-1 text-[10px] text-amber-600">
                            future need {fmt(row.futureNeed)} · short of loadable plants
                          </p>
                        ) : row?.surplus > 0 ? (
                          <p className="mt-1 border-t border-slate-200 pt-1 text-[10px] text-emerald-600">
                            {fmt(row.surplus)} ready to spare this month
                          </p>
                        ) : null
                      }
                    />
                  }
                />
                <Legend wrapperStyle={legendStyle} iconSize={14} payload={crossoverLegend} />

                <Area
                  type="monotone"
                  dataKey="surplusBand"
                  stroke="none"
                  fill="url(#lagSpareFill)"
                  legendType="none"
                  tooltipType="none"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="shortBand"
                  stroke="none"
                  fill="url(#lagShortFill)"
                  legendType="none"
                  tooltipType="none"
                  isAnimationActive={false}
                />

                {crossReady && (
                  <ReferenceLine
                    x={crossReady.label}
                    stroke={C.gap}
                    strokeDasharray="4 4"
                    label={{
                      value: "ready runs short",
                      fill: C.gap,
                      fontSize: 10,
                      position: "top"
                    }}
                  />
                )}
                {crossActual && (
                  <ReferenceLine
                    x={crossActual.label}
                    stroke={C.mortality}
                    strokeDasharray="4 4"
                    label={{
                      value: "stock runs short",
                      fill: C.mortality,
                      fontSize: 10,
                      position:
                        crossReady && crossActual.label === crossReady.label
                          ? "insideBottomRight"
                          : "insideTopRight"
                    }}
                  />
                )}
                {crossReady && (
                  <ReferenceDot
                    x={crossReady.label}
                    y={crossReady.delivery}
                    r={7}
                    fill={C.gap}
                    stroke="#fff"
                    strokeWidth={2}
                    isFront
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="delivery"
                  name="Delivery"
                  stroke={C.delivery}
                  strokeWidth={3.2}
                  dot={dot(C.delivery)}
                  activeDot={{ r: 7 }}
                  animationDuration={1100}
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke={C.sellable}
                  strokeWidth={2.6}
                  dot={dot(C.sellable)}
                  activeDot={{ r: 7 }}
                  animationBegin={120}
                  animationDuration={1100}
                />
                <Line
                  type="monotone"
                  dataKey="ready"
                  name="Ready"
                  stroke={C.ready}
                  strokeWidth={2.6}
                  dot={dot(C.ready)}
                  activeDot={{ r: 7 }}
                  animationBegin={240}
                  animationDuration={1100}
                />
                <Line
                  type="monotone"
                  dataKey="futureNeed"
                  name="Future need"
                  stroke={C.gap}
                  strokeWidth={2.4}
                  strokeDasharray="7 4"
                  dot={dot(C.gap)}
                  activeDot={{ r: 6 }}
                  animationBegin={360}
                  animationDuration={1100}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </ChartCard>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ChartCard
          title="Delivery coverage"
          hint="How much of the order book today's ready pool can actually satisfy">
          {delivery === 0 ? (
            <p className="py-12 text-center text-xs text-slate-500">
              No pending delivery on this selection — every booked order is dispatched.
            </p>
          ) : (
            <>
              <div className="relative" style={{ height: 190 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={coverageData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={2}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                      animationDuration={900}>
                      {coverageData.map((d) => (
                        <Cell key={d.name} fill={d.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p
                    className={`lag-readout text-3xl font-bold ${
                      coveragePct >= 100 ? "lag-glow-ready" : "lag-glow-mortality"
                    }`}>
                    {coveragePct}%
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">covered</p>
                </div>
              </div>
              <div className="mt-2 space-y-1.5">
                {coverageData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-[11px]">
                    <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                    <span className="text-slate-500">{d.name}</span>
                    <span className="lag-readout ml-auto font-semibold text-slate-900">
                      {fmt(d.value)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

        </ChartCard>

        <ChartCard
          title="Lagwad split"
          hint="How the gross inward quantity divides into the sellable pool and the mortality reserve">
          {poolData.length > 0 && (
            <div className="pt-1">
              <div className="flex items-center gap-5">
                <div style={{ width: 168, height: 168 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={poolData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="none"
                        animationDuration={900}>
                        {poolData.map((d) => (
                          <Cell key={d.name} fill={d.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {poolData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: d.fill }} />
                      <span className="truncate text-slate-500">{d.name}</span>
                      <span className="lag-readout ml-auto font-semibold text-slate-900">
                        {fmt(d.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  )
}

export default LagwadCharts
