import React, { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink, History, RotateCcw } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { API, NetworkManager } from "network/core"

const EMPTY = {
  rolledInOnCurrentSlot: { orderCount: 0, plants: 0, orders: [] },
  rolledInOnOtherSlots: { orderCount: 0, plants: 0, orders: [] },
  pendingBySlot: [],
  pendingTotal: { orderCount: 0, plants: 0 },
  rolledInCapacity: { availablePlants: 0, readyPlants: 0 },
}

export function OrderTable({ orders, emptyLabel }) {
  const navigate = useNavigate()
  if (!orders?.length) {
    return <p className="text-sm text-gray-500 py-2">{emptyLabel}</p>
  }
  return (
    <div className="overflow-auto max-h-56 border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Order #</th>
            <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
            <th className="text-right px-3 py-2 font-medium text-gray-600">Plants</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {orders.map((row) => (
            <tr key={row._id} className="border-t border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{row.orderId ?? "—"}</td>
              <td className="px-3 py-2 text-gray-700">{row.orderStatus ?? "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.plants?.toLocaleString()}</td>
              <td className="px-2 py-2">
                <button
                  type="button"
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  title="Open order"
                  onClick={() =>
                    navigate(`/u/dashboard?search=${encodeURIComponent(row.orderId || "")}`)
                  }>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BreakdownRow({ id, active, onToggle, label, subtitle, orderCount, plants, tone }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50/80",
    orange: "border-orange-200 bg-orange-50/80",
    violet: "border-violet-200 bg-violet-50/80",
    sky: "border-sky-200 bg-sky-50/80",
  }
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`w-full text-left rounded-lg border px-4 py-3 transition ${
        tones[tone] || tones.amber
      } ${active ? "ring-2 ring-offset-1 ring-amber-400" : "hover:brightness-[0.98]"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {active ? (
            <ChevronDown className="w-4 h-4 shrink-0 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0 text-gray-600" />
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm">{label}</p>
            {subtitle ? <p className="text-xs text-gray-600 truncate">{subtitle}</p> : null}
          </div>
        </div>
        {orderCount != null || plants != null ? (
          <div className="text-right shrink-0 tabular-nums">
            {orderCount != null ? (
              <>
                <p className="text-lg font-bold text-gray-900">{orderCount.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                  order{orderCount === 1 ? "" : "s"}
                </p>
              </>
            ) : null}
            {plants != null ? (
              <>
                <p className="text-sm font-semibold text-gray-700 mt-0.5">{plants.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">plants</p>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  )
}

function MovableSourcesTable({ sources, loading, error }) {
  if (loading) {
    return <p className="text-sm text-gray-500 py-3 px-1">Loading movable capacity…</p>
  }
  if (error) {
    return <p className="text-sm text-red-600 py-2 px-1">{error}</p>
  }
  if (!sources?.length) {
    return (
      <p className="text-sm text-gray-500 py-2 px-1">
        No expired slots with available or ready plants to roll.
      </p>
    )
  }
  const totals = sources.reduce(
    (acc, s) => ({
      available: acc.available + (Number(s.availablePlants) || 0),
      actual: acc.actual + (Number(s.actualPlants) || 0),
      ready: acc.ready + (Number(s.actualReadyPlants) || 0),
    }),
    { available: 0, actual: 0, ready: 0 }
  )
  return (
    <div className="rounded-lg border border-sky-200 bg-white overflow-hidden">
      <div className="overflow-auto max-h-48">
        <table className="w-full text-xs">
          <thead className="bg-sky-50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 font-semibold text-gray-700">Expired window</th>
              <th className="text-right px-2 py-2 font-semibold text-gray-700">Sellable</th>
              <th className="text-right px-2 py-2 font-semibold text-gray-700">Actual</th>
              <th className="text-right px-3 py-2 font-semibold text-gray-700">Ready</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.slotId} className="border-t border-gray-100">
                <td className="px-3 py-2 text-gray-900">{s.label || `${s.startDay}–${s.endDay}`}</td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {(s.availablePlants ?? 0).toLocaleString()}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {(s.actualPlants ?? 0).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {(s.actualReadyPlants ?? 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-sky-100 bg-sky-50/80 text-xs font-semibold text-sky-950 tabular-nums flex flex-wrap gap-x-4">
        <span>Totals — sellable: {totals.available.toLocaleString()}</span>
        <span>actual: {totals.actual.toLocaleString()}</span>
        <span>ready: {totals.ready.toLocaleString()}</span>
      </div>
    </div>
  )
}

export default function PastDueSlotBreakdown({
  detail,
  slot,
  slotLabel,
  expandKey,
  onExpandKey,
  onOpenPendingRoll,
  onOpenRollExpired,
  onOpenReadyRollHistory,
  onRunSlotEndNightly,
  canRoll = false,
}) {
  const d = detail || EMPTY
  const [internalExpanded, setInternalExpanded] = useState(null)
  const expanded = expandKey !== undefined ? expandKey : internalExpanded
  const setExpanded = onExpandKey || setInternalExpanded

  const [movableSources, setMovableSources] = useState(null)
  const [movableLoading, setMovableLoading] = useState(false)
  const [movableError, setMovableError] = useState(null)
  const [nightlyRunning, setNightlyRunning] = useState(false)

  const toggle = (key) => setExpanded(expanded === key ? null : key)

  const hasRolledCurrent = (d.rolledInOnCurrentSlot?.orderCount ?? 0) > 0
  const hasRolledOther = (d.rolledInOnOtherSlots?.orderCount ?? 0) > 0
  const hasPending = (d.pendingBySlot?.length ?? 0) > 0
  const pendingOrders = d.pendingTotal?.orderCount ?? 0
  const pendingPlants = d.pendingTotal?.plants ?? 0

  const rolledInAvail =
    Number(slot?.rolledInAvailablePlants ?? d.rolledInCapacity?.availablePlants) || 0
  const rolledInReady =
    Number(slot?.rolledInActualReadyPlants ?? d.rolledInCapacity?.readyPlants) || 0
  const readyRollTotal = Number(slot?.readyRollSummary?.totalRolledReady) || 0
  const hasRolledCapacity = rolledInAvail > 0 || rolledInReady > 0

  const showBreakdown =
    slot?.isCurrentDateSlot &&
    (hasRolledCurrent ||
      hasRolledOther ||
      hasPending ||
      hasRolledCapacity ||
      canRoll)

  useEffect(() => {
    if (expanded !== "movable" || !slot?._id) return
    let cancelled = false
    const load = async () => {
      setMovableLoading(true)
      setMovableError(null)
      try {
        const instance = NetworkManager(API.slots.GET_ROLL_EXPIRED_AVAILABLE_SOURCES)
        const response = await instance.request({}, { targetSlotId: slot._id })
        if (cancelled) return
        if (response?.data?.success) {
          setMovableSources(response.data.data?.sources || [])
        } else {
          setMovableSources([])
          setMovableError(response?.data?.message || "Could not load movable plants")
        }
      } catch (err) {
        if (!cancelled) {
          setMovableSources([])
          setMovableError(err?.response?.data?.message || err?.message || "Could not load")
        }
      } finally {
        if (!cancelled) setMovableLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [expanded, slot?._id])

  const movableCount = useMemo(() => {
    if (!movableSources?.length) return 0
    return movableSources.filter(
      (s) =>
        (Number(s.availablePlants) || 0) > 0 ||
        (Number(s.actualPlants) || 0) > 0 ||
        (Number(s.actualReadyPlants) || 0) > 0
    ).length
  }, [movableSources])

  if (!showBreakdown) return null

  const rolledPlants =
    (d.rolledInOnCurrentSlot?.plants ?? 0) + (d.rolledInOnOtherSlots?.plants ?? 0)
  const rolledOrders =
    (d.rolledInOnCurrentSlot?.orderCount ?? 0) + (d.rolledInOnOtherSlots?.orderCount ?? 0)

  const runNightly = async (dryRun) => {
    if (!onRunSlotEndNightly) return
    const msg = dryRun
      ? "Dry-run slot-end for this plant/subtype? (Orders preview only; capacity/lagwad skipped.)"
      : "Run full slot-end now for this plant/subtype? Order rollover, then expired capacity roll, then lagwad relocate (same as nightly cron)."
    if (!window.confirm(msg)) return
    setNightlyRunning(true)
    try {
      await onRunSlotEndNightly({ dryRun })
    } finally {
      setNightlyRunning(false)
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-4">
      <div className="mb-3">
        <h4 className="text-base font-semibold text-gray-900">Past due — breakdown</h4>
        <p className="text-xs text-gray-600">
          Today&apos;s slot ({slotLabel}) · orders, rolled capacity, and movable plants
        </p>
        {canRoll ? (
          <p className="text-[10px] text-gray-500 mt-1">
            Nightly auto when server has SLOT_END_NIGHTLY_ENABLED=true
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          {rolledOrders > 0 && (
            <span className="rounded-md border border-amber-300 bg-amber-100/80 px-2 py-1 text-amber-950 font-medium tabular-nums">
              Rolled in orders: {rolledOrders} · {rolledPlants.toLocaleString()} plants
            </span>
          )}
          {hasRolledCapacity && (
            <span className="rounded-md border border-teal-300 bg-teal-100/80 px-2 py-1 text-teal-950 font-medium tabular-nums">
              Rolled capacity: sellable {rolledInAvail.toLocaleString()}
              {rolledInReady > 0 ? ` · ready ${rolledInReady.toLocaleString()}` : ""}
            </span>
          )}
          {pendingOrders > 0 && (
            <span className="rounded-md border border-orange-300 bg-orange-100/80 px-2 py-1 text-orange-950 font-medium tabular-nums">
              Pending roll: {pendingOrders} · {pendingPlants.toLocaleString()} plants
            </span>
          )}
        </div>
      </div>

      {(hasRolledCapacity || canRoll) && (
        <div className="mb-3 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2">
          <p className="text-xs font-semibold text-teal-950 mb-1">Rolled-in capacity (on this slot)</p>
          <p className="text-[11px] text-gray-600 mb-2">
            From expired windows; source slots may show 0 after roll or cron.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs tabular-nums font-bold text-gray-900">
              Sellable rolled in: {rolledInAvail.toLocaleString()}
            </span>
            <span className="text-xs tabular-nums font-bold text-gray-900">
              Ready rolled in: {rolledInReady.toLocaleString()}
            </span>
            {readyRollTotal > 0 ? (
              <span className="text-[10px] text-gray-600">Log total: {readyRollTotal.toLocaleString()}</span>
            ) : null}
            {(rolledInReady > 0 || readyRollTotal > 0) && onOpenReadyRollHistory ? (
              <button
                type="button"
                onClick={() => onOpenReadyRollHistory(slot)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:underline">
                <History className="w-3.5 h-3.5" />
                Batch / shed history
              </button>
            ) : null}
          </div>
        </div>
      )}

      {canRoll ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {hasPending ? (
            <button
              type="button"
              disabled={nightlyRunning}
              onClick={() => onOpenPendingRoll?.()}
              className="rounded-lg border border-orange-400 bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-950 hover:bg-orange-200 disabled:opacity-50">
              Roll pending orders
            </button>
          ) : null}
          <button
            type="button"
            disabled={nightlyRunning}
            onClick={() => onOpenRollExpired?.(slot)}
            className="rounded-lg border border-sky-400 bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-950 hover:bg-sky-200 disabled:opacity-50">
            Roll capacity
          </button>
          {onRunSlotEndNightly ? (
            <>
              <button
                type="button"
                disabled={nightlyRunning}
                onClick={() => runNightly(true)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-50">
                Dry run slot-end
              </button>
              <button
                type="button"
                disabled={nightlyRunning}
                onClick={() => runNightly(false)}
                className="rounded-lg border border-violet-500 bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50">
                {nightlyRunning ? "Running…" : "Run slot-end now"}
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        {canRoll ? (
          <>
            <BreakdownRow
              id="movable"
              active={expanded === "movable"}
              onToggle={toggle}
              label="Movable from expired slots"
              subtitle="Preview sellable / actual / ready before rolling capacity"
              orderCount={
                movableLoading ? null : movableSources ? movableCount : null
              }
              plants={null}
              tone="sky"
            />
            {expanded === "movable" && (
              <div className="pb-1">
                <MovableSourcesTable
                  sources={movableSources}
                  loading={movableLoading}
                  error={movableError}
                />
                <button
                  type="button"
                  onClick={() => onOpenRollExpired?.(slot)}
                  className="mt-2 text-xs font-bold text-sky-800 hover:underline">
                  Open roll capacity dialog →
                </button>
              </div>
            )}
          </>
        ) : null}

        {hasRolledCurrent && (
          <>
            <BreakdownRow
              id="rolled-current"
              active={expanded === "rolled-current"}
              onToggle={toggle}
              label="Rolled in — on active slot"
              subtitle="From expired window; slot & delivery updated here"
              orderCount={d.rolledInOnCurrentSlot.orderCount}
              plants={d.rolledInOnCurrentSlot.plants}
              tone="amber"
            />
            {expanded === "rolled-current" && (
              <OrderTable orders={d.rolledInOnCurrentSlot.orders} emptyLabel="No orders" />
            )}
          </>
        )}

        {hasRolledOther && (
          <>
            <BreakdownRow
              id="rolled-other"
              active={expanded === "rolled-other"}
              onToggle={toggle}
              label="Rolled in — still on old slot"
              subtitle="Not moved to active slot yet — use Pending roll below"
              orderCount={d.rolledInOnOtherSlots.orderCount}
              plants={d.rolledInOnOtherSlots.plants}
              tone="violet"
            />
            {expanded === "rolled-other" && (
              <OrderTable orders={d.rolledInOnOtherSlots.orders} emptyLabel="No orders" />
            )}
          </>
        )}

        {hasPending && (
          <button
            type="button"
            onClick={() => onOpenPendingRoll?.()}
            className="w-full text-left rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 transition hover:bg-orange-100/90 ring-offset-1 focus:outline-none focus:ring-2 focus:ring-orange-400">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <RotateCcw className="w-4 h-4 shrink-0 text-orange-700" />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">Pending roll</p>
                  <p className="text-xs text-gray-600">
                    {d.pendingBySlot.length} expired window
                    {d.pendingBySlot.length === 1 ? "" : "s"} — open to review & roll all
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 tabular-nums">
                <p className="text-lg font-bold text-orange-900">{pendingOrders.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">orders</p>
                <p className="text-sm font-semibold text-orange-800 mt-0.5">
                  {pendingPlants.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">plants</p>
              </div>
            </div>
            {canRoll ? (
              <p className="text-[10px] font-semibold text-orange-800 mt-2 uppercase tracking-wide">
                Click to open roll popup
              </p>
            ) : null}
          </button>
        )}
      </div>
    </div>
  )
}
