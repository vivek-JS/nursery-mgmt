import React, { useMemo } from "react"
import {
  Drawer,
  IconButton,
  Typography,
  Box,
  Divider,
  Chip
} from "@mui/material"
import { X, ExternalLink, RotateCcw } from "lucide-react"
import { Button } from "@mui/material"
import { useNavigate } from "react-router-dom"
import FarmerOrdersTable from "../dashboard/FarmerOrdersTable"
import moment from "moment"
import {
  getAvailablePlants,
  getDisplayAvailablePlants,
  getBookedPlants,
  getSellableCapacity,
  getTotalCapacity,
  getDisplayBufferAmount,
  getEffectiveBufferPct,
  getSlotStatPlantsTotal,
  getAvailableMinusRolledIn,
  getRolledInPlantsOnCurrentSlot,
  slotShowDualAvailableCards,
} from "./slotMetrics"

export const SLOT_ORDER_FILTERS = {
  ALL_ACTIVE: "all_active",
  DISPATCHED_COMPLETED: "dispatched_completed",
  DISPATCHED_NATIVE: "dispatched_native",
  DISPATCHED_ROLLED: "dispatched_rolled",
  DISPATCHED_OTHER: "dispatched_other",
  DISPATCHED_ALL: "dispatched_all",
  REMAINING_DISPATCH: "remaining_dispatch",
  REMAINING_NATIVE_DISPATCH: "remaining_native_dispatch",
  REMAINING_ROLLED_DISPATCH: "remaining_rolled_dispatch"
}

export const SLOT_STAT_ORDER_VIEWS = {
  available: {
    kind: "capacity",
    title: "Available plants",
    subtitle: "Sellable capacity remaining on this slot",
    accent: "#059669"
  },
  booked: {
    kind: "orders",
    filter: SLOT_ORDER_FILTERS.ALL_ACTIVE,
    title: "Booked orders",
    subtitle: "Delivery date in this slot window — excludes past-due rolled-in orders",
    accent: "#2563eb"
  },
  dispatched: {
    kind: "orders",
    filter: SLOT_ORDER_FILTERS.DISPATCHED_COMPLETED,
    title: "Dispatched",
    subtitle: "Native delivery-window orders — Dispatched or Completed (excl. rolled-in)",
    accent: "#475569"
  },
  dispatchedNative: {
    kind: "orders",
    filter: SLOT_ORDER_FILTERS.DISPATCHED_NATIVE,
    title: "Native dispatched",
    subtitle:
      "Delivery in this slot window, originally booked here — Dispatched or Completed",
    accent: "#475569"
  },
  dispatchedRolled: {
    kind: "orders",
    filter: SLOT_ORDER_FILTERS.DISPATCHED_ROLLED,
    title: "Rolled dispatched",
    subtitle: "Past-due rolled-in orders on this slot — Dispatched or Completed",
    accent: "#6366f1"
  },
  dispatchedOther: {
    kind: "orders",
    filter: SLOT_ORDER_FILTERS.DISPATCHED_OTHER,
    title: "Other dispatched",
    subtitle: "Rolled-in + cross-slot early dispatch — Dispatched or Completed",
    accent: "#6366f1"
  },
  dispatchedAll: {
    kind: "orders",
    filter: SLOT_ORDER_FILTERS.DISPATCHED_ALL,
    title: "All dispatched",
    subtitle: "Every Dispatched or Completed order tied to this slot window",
    accent: "#334155"
  },
  remaining: {
    kind: "orders",
    filter: SLOT_ORDER_FILTERS.REMAINING_DISPATCH,
    title: "Actual remaining",
    subtitle:
      "Full pre-dispatch queue on this slot — native delivery window + rolled-in",
    accent: "#e11d48"
  },
  remainingNative: {
    kind: "orders",
    filter: SLOT_ORDER_FILTERS.REMAINING_NATIVE_DISPATCH,
    title: "Native remaining",
    subtitle:
      "Pre-dispatch queue on this slot excluding past-due rolled-in orders (originally booked here)",
    accent: "#0891b2"
  },
  remainingRolled: {
    kind: "orders",
    filter: SLOT_ORDER_FILTERS.REMAINING_ROLLED_DISPATCH,
    title: "Rolled remaining",
    subtitle: "Pre-dispatch queue from orders moved here by past-due rollover",
    accent: "#b45309"
  },
  pastDueRolled: {
    kind: "pastDue",
    title: "Rolled in orders",
    subtitle:
      "Were on an expired slot window; booking slot and delivery date were updated to today’s active slot",
    accent: "#d97706"
  },
  pastDuePending: {
    kind: "pastDue",
    title: "Pending orders",
    subtitle: "Still on expired slots — awaiting rollover",
    accent: "#ea580c"
  },
  crossSlotEarlyIn: {
    kind: "crossSlot",
    crossKey: "earlyDispatchIn",
    title: "Early dispatch (other slot)",
    subtitle: "Originally booked elsewhere — now on this slot for cross-slot dispatch",
    accent: "#0284c7"
  },
  crossSlotReleased: {
    kind: "crossSlot",
    crossKey: "releasedOut",
    title: "Released (cross-slot)",
    subtitle: "Originally booked on this slot — moved to another slot for dispatch",
    accent: "#7c3aed"
  }
}

function resolvePastDueSections(slot, statKey, pendingSlotId) {
  const d = slot?.pastDueDetail
  if (!d) return []

  if (statKey === "pastDueRolled") {
    const sections = []
    if ((d.rolledInOnCurrentSlot?.orders?.length ?? 0) > 0) {
      sections.push({
        id: "current",
        label: "On today’s active slot",
        subtitle: "Rolled from an expired window — now assigned here (not originally booked here)",
        orders: d.rolledInOnCurrentSlot.orders,
        orderCount: d.rolledInOnCurrentSlot.orderCount,
        plants: d.rolledInOnCurrentSlot.plants,
        tone: "amber"
      })
    }
    if ((d.rolledInOnOtherSlots?.orders?.length ?? 0) > 0) {
      sections.push({
        id: "other",
        label: "Still on old slot",
        subtitle: "Marked rolled-in but booking slot not updated yet — re-run rollover",
        orders: d.rolledInOnOtherSlots.orders,
        orderCount: d.rolledInOnOtherSlots.orderCount,
        plants: d.rolledInOnOtherSlots.plants,
        tone: "violet"
      })
    }
    return sections
  }

  if (statKey === "pastDuePending") {
    const buckets = d.pendingBySlot || []
    if (pendingSlotId) {
      const bucket = buckets.find((b) => String(b.slotId) === String(pendingSlotId))
      if (!bucket?.orders?.length) return []
      return [
        {
          id: bucket.slotId,
          label: `Expired ${bucket.label}`,
          subtitle: "Pending rollover",
          orders: bucket.orders,
          orderCount: bucket.orderCount,
          plants: bucket.plants,
          tone: "orange"
        }
      ]
    }
    return buckets
      .filter((b) => (b.orders?.length ?? 0) > 0)
      .map((b) => ({
        id: b.slotId,
        label: `Expired ${b.label}`,
        subtitle: `${b.orderCount} order${b.orderCount === 1 ? "" : "s"}`,
        orders: b.orders,
        orderCount: b.orderCount,
        plants: b.plants,
        tone: "orange"
      }))
  }

  return []
}

const toneStyles = {
  amber: { border: "border-amber-200", bg: "bg-amber-50", chip: "bg-amber-100 text-amber-900" },
  violet: { border: "border-violet-200", bg: "bg-violet-50", chip: "bg-violet-100 text-violet-900" },
  orange: { border: "border-orange-200", bg: "bg-orange-50", chip: "bg-orange-100 text-orange-900" },
  sky: { border: "border-sky-200", bg: "bg-sky-50", chip: "bg-sky-100 text-sky-900" }
}

function resolveCrossSlotSections(slot, statKey) {
  const d = slot?.crossSlotDetail
  if (!d) return []
  const bucket =
    statKey === "crossSlotEarlyIn"
      ? d.earlyDispatchIn
      : statKey === "crossSlotReleased"
        ? d.releasedOut
        : null
  if (!bucket?.orders?.length) return []
  const tone = statKey === "crossSlotEarlyIn" ? "sky" : "violet"
  return [
    {
      id: statKey,
      label: statKey === "crossSlotEarlyIn" ? "Arrived from other slots" : "Released to other slots",
      subtitle:
        statKey === "crossSlotEarlyIn"
          ? "Cross-slot early dispatch — not past-due rollover"
          : "Left this slot window for dispatch elsewhere",
      orders: bucket.orders,
      orderCount: bucket.orderCount,
      plants: bucket.plants,
      tone,
      showSlotHint: true
    }
  ]
}

function PastDueOrdersPanel({ sections }) {
  const navigate = useNavigate()

  if (!sections.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="body2" color="text.secondary">
          No past-due orders in this view.
        </Typography>
      </Box>
    )
  }

  const totalOrders = sections.reduce((s, sec) => s + (sec.orderCount ?? sec.orders?.length ?? 0), 0)
  const totalPlants = sections.reduce((s, sec) => s + (sec.plants ?? 0), 0)

  return (
    <Box sx={{ p: 2 }}>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-semibold tabular-nums">
          {totalOrders} order{totalOrders === 1 ? "" : "s"}
        </span>
        <span className="rounded-full bg-gray-100 text-gray-800 px-3 py-1 text-xs font-semibold tabular-nums">
          {totalPlants.toLocaleString()} plants
        </span>
      </div>

      <div className="space-y-4">
        {sections.map((sec) => {
          const style = toneStyles[sec.tone] || toneStyles.amber
          return (
            <div
              key={sec.id}
              className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
              <div className="px-3 py-2 border-b border-black/5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{sec.label}</p>
                  {sec.subtitle ? (
                    <p className="text-xs text-gray-600">{sec.subtitle}</p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>
                  {(sec.orderCount ?? sec.orders?.length ?? 0).toLocaleString()} orders ·{" "}
                  {(sec.plants ?? 0).toLocaleString()} plants
                </span>
              </div>
              <ul className="divide-y divide-black/5">
                {sec.orders.map((row) => (
                  <li
                    key={row._id}
                    className="flex items-center gap-2 px-3 py-2.5 bg-white/60 hover:bg-white transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        #{row.orderId ?? "—"}
                      </p>
                      <p className="text-xs text-gray-600">{row.orderStatus ?? "—"}</p>
                      {sec.showSlotHint && row.fromSlotLabel ? (
                        <p className="text-[10px] text-sky-700">From {row.fromSlotLabel}</p>
                      ) : null}
                      {sec.showSlotHint && row.toSlotLabel ? (
                        <p className="text-[10px] text-violet-700">To {row.toSlotLabel}</p>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 tabular-nums shrink-0">
                      {(row.plants ?? 0).toLocaleString()}
                    </p>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 shrink-0"
                      title="Open on dashboard"
                      onClick={() =>
                        navigate(`/u/dashboard?search=${encodeURIComponent(row.orderId || "")}`)
                      }>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </Box>
  )
}

const SlotAvailableSummary = ({ slot }) => {
  const storedAvailable = getAvailablePlants(slot)
  const available = getDisplayAvailablePlants(slot)
  const availMinusRolled = getAvailableMinusRolledIn(slot)
  const rolledHere = getRolledInPlantsOnCurrentSlot(slot)
  const showDual = slotShowDualAvailableCards(slot)
  const booked = getBookedPlants(slot)
  const total = getTotalCapacity(slot)
  const sellable = getSellableCapacity(slot)
  const buffer = getDisplayBufferAmount(slot)
  const bufferPct = getEffectiveBufferPct(slot)

  const rows = [
    ...(showDual
      ? [
          {
            label: "Real available",
            value: availMinusRolled,
            color: availMinusRolled < 0 ? "text-red-700" : "text-emerald-700"
          },
          {
            label: "Stored (incl. rolled)",
            value: storedAvailable,
            color: storedAvailable < 0 ? "text-red-700" : "text-gray-800",
            hint: `${rolledHere.toLocaleString()} plants rolled-in on slot`
          }
        ]
      : [
          {
            label: "Available",
            value: available,
            color: available < 0 ? "text-red-700" : "text-emerald-700"
          }
        ]),
    { label: "Booked", value: booked, color: "text-blue-700" },
    { label: "Capacity", value: total, color: "text-indigo-700" },
    { label: "Sellable", value: sellable, color: "text-indigo-600" },
    {
      label: buffer > 0 ? "Buffer (stored)" : `Buffer (${bufferPct}%)`,
      value: buffer,
      color: "text-purple-700"
    }
  ]

  return (
    <Box sx={{ p: 2.5 }}>
      <Typography
        variant="h4"
        sx={{
          fontWeight: 800,
          color: available < 0 ? "error.main" : "success.dark",
          mb: 0.5,
          fontSize: { xs: "1.75rem", sm: "2rem" }
        }}>
        {available.toLocaleString()}
        <Typography component="span" variant="body1" sx={{ ml: 1, fontWeight: 600, color: "text.secondary" }}>
          plants available
        </Typography>
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Capacity = available + booked. Buffer reduces sellable headroom.
      </Typography>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {rows.map((row, i) => (
          <div
            key={`${row.label}-${i}`}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{row.label}</p>
            <p className={`text-lg font-bold tabular-nums ${row.color}`}>{row.value.toLocaleString()}</p>
            {row.hint ? <p className="text-[10px] text-amber-700 mt-0.5">{row.hint}</p> : null}
          </div>
        ))}
      </div>
    </Box>
  )
}

const SlotOrdersDrawer = ({
  open,
  onClose,
  slot,
  monthName,
  statKey,
  pendingSlotId,
  plantId,
  subtypeId,
  canRollPastDue = false,
  onOpenPendingRoll,
}) => {
  const view = SLOT_STAT_ORDER_VIEWS[statKey] || SLOT_STAT_ORDER_VIEWS.booked

  const start = slot ? moment(slot.startDay, "DD-MM-YYYY").format("MMM D") : ""
  const end = slot ? moment(slot.endDay, "DD-MM-YYYY").format("MMM D") : ""
  const yearLabel = slot ? moment(slot.startDay, "DD-MM-YYYY").format("YYYY") : ""

  const cardPlantsTotal = slot ? getSlotStatPlantsTotal(slot, statKey) : 0

  const pastDueSections = useMemo(
    () => (slot && view.kind === "pastDue" ? resolvePastDueSections(slot, statKey, pendingSlotId) : []),
    [slot, statKey, pendingSlotId, view.kind]
  )

  const crossSlotSections = useMemo(
    () => (slot && view.kind === "crossSlot" ? resolveCrossSlotSections(slot, statKey) : []),
    [slot, statKey, view.kind]
  )

  const headerCounts = useMemo(() => {
    if (!slot || view.kind === "capacity" || view.kind === "orders") return null
    if (view.kind === "crossSlot") {
      const bucket =
        statKey === "crossSlotEarlyIn"
          ? slot.crossSlotDetail?.earlyDispatchIn
          : slot.crossSlotDetail?.releasedOut
      return {
        orders: bucket?.orderCount ?? 0,
        plants: bucket?.plants ?? 0,
      }
    }
    if (view.kind !== "pastDue") return null
    if (statKey === "pastDueRolled") {
      const rolled = slot.pastDueDetail?.rolledInOnCurrentSlot
      return {
        orders: rolled?.orderCount ?? slot.pastDueRolledInOrders ?? 0,
        plants: rolled?.plants ?? slot.pastDueRolledInPlants ?? 0
      }
    }
    if (statKey === "pastDuePending") {
      if (pendingSlotId && pastDueSections[0]) {
        return {
          orders: pastDueSections[0].orderCount ?? 0,
          plants: pastDueSections[0].plants ?? 0
        }
      }
      return {
        orders: slot.pastDuePendingOrders ?? 0,
        plants: slot.pastDuePendingOnSlot ?? 0
      }
    }
    return null
  }, [slot, statKey, pendingSlotId, view.kind, pastDueSections])

  if (!slot) return null

  const accent = view.accent || "#0d9488"

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: 1400 }}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: view.kind === "capacity" ? 420 : "min(960px, 94vw)" },
          maxWidth: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(180deg, ${accent}14 0%, #f8fafc 140px, #f1f5f9 100%)`,
          boxShadow: "-8px 0 32px rgba(15,23,42,0.12)"
        }
      }}>
      {/* Header */}
      <Box
        sx={{
          flexShrink: 0,
          px: 2,
          pt: 2,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)"
        }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="overline" sx={{ fontWeight: 700, color: accent, lineHeight: 1.2 }}>
              Slot orders
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.25, pr: 1 }}>
              {view.title}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75, mt: 0.75 }}>
              <Chip
                size="small"
                label={`${start} – ${end}, ${yearLabel}`}
                sx={{ height: 24, fontSize: 11, fontWeight: 600 }}
              />
              {monthName ? (
                <Chip size="small" label={monthName} sx={{ height: 24, fontSize: 11 }} variant="outlined" />
              ) : null}
              {slot.isCurrentDateSlot ? (
                <Chip
                  size="small"
                  label="Today’s slot"
                  color="success"
                  variant="outlined"
                  sx={{ height: 24, fontSize: 10, fontWeight: 700 }}
                />
              ) : null}
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              {view.subtitle}
            </Typography>
          </Box>
          <IconButton aria-label="Close" onClick={onClose} size="small" sx={{ mt: 0.5 }}>
            <X className="w-5 h-5" />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
          {headerCounts && (view.kind === "pastDue" || view.kind === "crossSlot") ? (
            <>
              <Chip
                size="small"
                label={`${headerCounts.orders.toLocaleString()} orders`}
                sx={{ fontWeight: 700, bgcolor: `${accent}22` }}
              />
              <Chip
                size="small"
                label={`${headerCounts.plants.toLocaleString()} plants`}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </>
          ) : view.kind === "orders" ? (
            <Chip
              size="small"
              label={`${cardPlantsTotal.toLocaleString()} plants on card`}
              sx={{ fontWeight: 700, bgcolor: `${accent}18`, color: accent }}
            />
          ) : null}
          {statKey === "pastDuePending" ? (
            <>
              <Chip
                size="small"
                label="Past due"
                color="warning"
                variant="outlined"
                sx={{ height: 24, fontSize: 10 }}
              />
              {canRollPastDue && (slot?.pastDuePendingOrders ?? 0) > 0 ? (
                <Button
                  size="small"
                  variant="contained"
                  color="warning"
                  startIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  onClick={() => onOpenPendingRoll?.(slot)}
                  sx={{ textTransform: "none", fontWeight: 700, fontSize: 12 }}>
                  Roll all pending
                </Button>
              ) : null}
            </>
          ) : null}
        </Box>
      </Box>

      <Divider />

      {/* Body */}
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          minHeight: 0,
          WebkitOverflowScrolling: "touch"
        }}>
        {view.kind === "capacity" ? (
          <SlotAvailableSummary slot={slot} />
        ) : view.kind === "pastDue" ? (
          <PastDueOrdersPanel sections={pastDueSections} />
        ) : view.kind === "crossSlot" ? (
          <PastDueOrdersPanel sections={crossSlotSections} />
        ) : (
          <Box
            sx={{
              p: { xs: 1, sm: 1.5 },
              "& .farmer-orders-slot-embed": { minHeight: "min(70vh, 720px)" }
            }}>
            <div className="farmer-orders-slot-embed rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <FarmerOrdersTable
                key={`${slot._id}-${view.filter}-${plantId || ""}-${subtypeId || ""}`}
                slotId={slot._id}
                monthName={monthName}
                startDay={slot.startDay}
                endDay={slot.endDay}
                plantId={plantId}
                subtypeId={subtypeId}
                slotOrderFilter={view.filter}
                expectedPlantsTotal={cardPlantsTotal}
              />
            </div>
          </Box>
        )}
      </Box>
    </Drawer>
  )
}

export default SlotOrdersDrawer
