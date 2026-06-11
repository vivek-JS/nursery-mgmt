import React, { useState } from "react"
import { ChevronDown, ChevronRight, ExternalLink, RotateCcw } from "lucide-react"
import { useNavigate } from "react-router-dom"

const EMPTY = {
  rolledInOnCurrentSlot: { orderCount: 0, plants: 0, orders: [] },
  rolledInOnOtherSlots: { orderCount: 0, plants: 0, orders: [] },
  pendingBySlot: [],
  pendingTotal: { orderCount: 0, plants: 0 },
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
        <div className="text-right shrink-0 tabular-nums">
          <p className="text-lg font-bold text-gray-900">{orderCount.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">
            order{orderCount === 1 ? "" : "s"}
          </p>
          <p className="text-sm font-semibold text-gray-700 mt-0.5">{plants.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">plants</p>
        </div>
      </div>
    </button>
  )
}

export default function PastDueSlotBreakdown({
  detail,
  slotLabel,
  expandKey,
  onExpandKey,
  onOpenPendingRoll,
  canRoll = false,
}) {
  const d = detail || EMPTY
  const [internalExpanded, setInternalExpanded] = useState(null)
  const expanded = expandKey !== undefined ? expandKey : internalExpanded
  const setExpanded = onExpandKey || setInternalExpanded

  const toggle = (key) => setExpanded(expanded === key ? null : key)

  const hasRolledCurrent = (d.rolledInOnCurrentSlot?.orderCount ?? 0) > 0
  const hasRolledOther = (d.rolledInOnOtherSlots?.orderCount ?? 0) > 0
  const hasPending = (d.pendingBySlot?.length ?? 0) > 0
  const pendingOrders = d.pendingTotal?.orderCount ?? 0
  const pendingPlants = d.pendingTotal?.plants ?? 0

  if (!hasRolledCurrent && !hasRolledOther && !hasPending) return null

  const rolledPlants =
    (d.rolledInOnCurrentSlot?.plants ?? 0) + (d.rolledInOnOtherSlots?.plants ?? 0)
  const rolledOrders =
    (d.rolledInOnCurrentSlot?.orderCount ?? 0) + (d.rolledInOnOtherSlots?.orderCount ?? 0)

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-4">
      <div className="mb-3">
        <h4 className="text-base font-semibold text-gray-900">Past due — breakdown</h4>
        <p className="text-xs text-gray-600">
          Today&apos;s slot ({slotLabel}) · rolled-in rows expand for order list
        </p>
        <div className="flex flex-wrap gap-2 mt-2 text-xs">
          {rolledOrders > 0 && (
            <span className="rounded-md border border-amber-300 bg-amber-100/80 px-2 py-1 text-amber-950 font-medium tabular-nums">
              Rolled in orders: {rolledOrders} · {rolledPlants.toLocaleString()} plants
            </span>
          )}
          {pendingOrders > 0 && (
            <span className="rounded-md border border-orange-300 bg-orange-100/80 px-2 py-1 text-orange-950 font-medium tabular-nums">
              Pending roll: {pendingOrders} · {pendingPlants.toLocaleString()} plants
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
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
