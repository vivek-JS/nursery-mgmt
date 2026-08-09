import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Chip
} from "@mui/material"
import { useNavigate } from "react-router-dom"
import { NetworkManager, API } from "../../network/core"
import { History, ExternalLink, ChevronRight } from "lucide-react"
import { Toast } from "../../helpers/toasts/toastHelper"
import moment from "moment"

const PAST_DUE_ROLL_ACTIONS = new Set([
  "PAST_DUE_ROLLOUT_OUT",
  "PAST_DUE_ROLLOUT_IN",
  "EXPIRED_ACTUAL_ROLL_OUT",
  "EXPIRED_ACTUAL_ROLL_IN"
])

const CAPACITY_ACTIONS = new Set(["CAPACITY_TRANSFER_OUT", "CAPACITY_TRANSFER_IN"])

const TRANSFER_ACTIONS = new Set([
  "SOWING_TRANSFER_OUT",
  "SOWING_TRANSFER_IN",
  "ORDER_SLOT_TRANSFER_OUT",
  "ORDER_SLOT_TRANSFER_IN",
  "EARLY_DISPATCH_OUT",
  "EARLY_DISPATCH_IN",
  "EARLY_DISPATCH_REVERT_OUT",
  "EARLY_DISPATCH_REVERT_IN",
  "CAPACITY_TRANSFER_OUT",
  "CAPACITY_TRANSFER_IN"
])

const ORDER_TRANSFER_ACTIONS = new Set([
  "ORDER_SLOT_TRANSFER_OUT",
  "ORDER_SLOT_TRANSFER_IN",
  "PAST_DUE_ROLLOUT_OUT",
  "PAST_DUE_ROLLOUT_IN"
])

const ORDER_BOOKING_ACTIONS = new Set([
  "ORDER_BOOKED",
  "ORDER_CANCELLED",
  "ORDER_RETURNED",
  "SUBTRACT"
])

const STOCK_ACTIONS = new Set([
  "ACTUAL_PLANTS_UPDATED",
  "CLOSING_STOCK_UPDATED",
  "AVAILABLE_PLANTS_UPDATED"
])

const OUT_ACTIONS = new Set([
  "SUBTRACT",
  "ORDER_CANCELLED",
  "ORDER_RETURNED",
  "ORDER_SLOT_TRANSFER_OUT",
  "PAST_DUE_ROLLOUT_OUT",
  "CAPACITY_TRANSFER_OUT",
  "SOWING_TRANSFER_OUT",
  "EXPIRED_ACTUAL_ROLL_OUT",
  "EARLY_DISPATCH_OUT",
  "EARLY_DISPATCH_REVERT_OUT"
])

const IN_ACTIONS = new Set([
  "ADD",
  "ORDER_BOOKED",
  "ORDER_SLOT_TRANSFER_IN",
  "PAST_DUE_ROLLOUT_IN",
  "CAPACITY_TRANSFER_IN",
  "SOWING_TRANSFER_IN",
  "EXPIRED_ACTUAL_ROLL_IN",
  "EARLY_DISPATCH_IN",
  "EARLY_DISPATCH_REVERT_IN"
])

const ACTION_STYLES = {
  PAST_DUE_ROLLOUT_OUT: "border-l-orange-500 bg-orange-50/80",
  PAST_DUE_ROLLOUT_IN: "border-l-orange-500 bg-orange-50/80",
  EXPIRED_ACTUAL_ROLL_OUT: "border-l-amber-500 bg-amber-50/70",
  EXPIRED_ACTUAL_ROLL_IN: "border-l-amber-500 bg-amber-50/70",
  ORDER_SLOT_TRANSFER_OUT: "border-l-violet-500 bg-violet-50/80",
  ORDER_SLOT_TRANSFER_IN: "border-l-violet-500 bg-violet-50/80",
  SOWING_TRANSFER_OUT: "border-l-emerald-500 bg-emerald-50/70",
  SOWING_TRANSFER_IN: "border-l-emerald-500 bg-emerald-50/70",
  CAPACITY_TRANSFER_OUT: "border-l-indigo-500 bg-indigo-50/70",
  CAPACITY_TRANSFER_IN: "border-l-indigo-500 bg-indigo-50/70",
  EARLY_DISPATCH_OUT: "border-l-fuchsia-500 bg-fuchsia-50/70",
  EARLY_DISPATCH_IN: "border-l-fuchsia-500 bg-fuchsia-50/70",
  ADD: "border-l-green-500 bg-green-50/60",
  SUBTRACT: "border-l-red-500 bg-red-50/60",
  ORDER_BOOKED: "border-l-blue-600 bg-blue-50/70",
  ORDER_CANCELLED: "border-l-rose-500 bg-rose-50/70",
  ORDER_RETURNED: "border-l-rose-400 bg-rose-50/60",
  BUFFER_APPLIED: "border-l-blue-500 bg-blue-50/60",
  BUFFER_RELEASED: "border-l-orange-500 bg-orange-50/60",
  ACTUAL_PLANTS_UPDATED: "border-l-teal-500 bg-teal-50/60",
  CLOSING_STOCK_UPDATED: "border-l-amber-500 bg-amber-50/60",
  AVAILABLE_PLANTS_UPDATED: "border-l-sky-500 bg-sky-50/60",
  default: "border-l-gray-400 bg-gray-50/80"
}

const PRIMARY_METRIC = {
  ADD: "totalPlants",
  SUBTRACT: "totalPlants",
  CAPACITY_TRANSFER_IN: "totalPlants",
  CAPACITY_TRANSFER_OUT: "totalPlants",
  SOWING_TRANSFER_IN: "totalPlants",
  SOWING_TRANSFER_OUT: "totalPlants",
  ORDER_SLOT_TRANSFER_IN: "totalBookedPlants",
  ORDER_SLOT_TRANSFER_OUT: "totalBookedPlants",
  ORDER_BOOKED: "totalBookedPlants",
  ORDER_CANCELLED: "totalBookedPlants",
  ORDER_RETURNED: "totalBookedPlants",
  BUFFER_APPLIED: "availablePlants",
  BUFFER_RELEASED: "availablePlants",
  ACTUAL_PLANTS_UPDATED: "actualPlants",
  CLOSING_STOCK_UPDATED: "closingStock",
  AVAILABLE_PLANTS_UPDATED: "availablePlants",
  PAST_DUE_ROLLOUT_IN: "totalBookedPlants",
  PAST_DUE_ROLLOUT_OUT: "totalBookedPlants",
  EXPIRED_ACTUAL_ROLL_IN: "actualPlants",
  EXPIRED_ACTUAL_ROLL_OUT: "actualPlants"
}

const METRIC_LABEL = {
  totalPlants: "Capacity",
  availablePlants: "Available",
  totalBookedPlants: "Booked",
  actualPlants: "Actual stock",
  closingStock: "Closing stock"
}

const isRollEntry = (entry) => {
  if (PAST_DUE_ROLL_ACTIONS.has(entry?.action)) return true
  if (
    CAPACITY_ACTIONS.has(entry?.action) &&
    entry?.metadata?.transferType === "expired_available_roll"
  ) {
    return true
  }
  return false
}

const isTransferEntry = (entry) => {
  if (isRollEntry(entry)) return false
  return TRANSFER_ACTIONS.has(entry?.action)
}

const isStockEntry = (entry) => STOCK_ACTIONS.has(entry?.action)

const isOrderEntry = (entry) =>
  ORDER_BOOKING_ACTIONS.has(entry?.action) ||
  ORDER_TRANSFER_ACTIONS.has(entry?.action) ||
  Boolean(entry.orderNumber || entry.orderMongoId || entry.orderId)

const isOtherEntry = (entry) =>
  !isRollEntry(entry) && !isTransferEntry(entry) && !isStockEntry(entry) && !isOrderEntry(entry)

const formatQty = (action, quantity, entry = null) => {
  const n = Number(quantity) || 0
  const hasOrder =
    entry &&
    (entry.orderId || entry.orderMongoId || entry.orderNumber || entry.metadata?.orderNumber)

  if (action === "ORDER_BOOKED") return `+${n.toLocaleString()}`
  if (action === "ORDER_CANCELLED" || action === "ORDER_RETURNED") {
    return `−${n.toLocaleString()}`
  }
  if (action === "SUBTRACT" && hasOrder) return `+${n.toLocaleString()}`
  if (action === "ADD" && hasOrder) return `−${n.toLocaleString()}`

  if (OUT_ACTIONS.has(action)) return `−${n.toLocaleString()}`
  if (IN_ACTIONS.has(action)) return `+${n.toLocaleString()}`
  return n.toLocaleString()
}

const isOrderBookAction = (entry) => {
  const action = entry?.action
  const hasOrder =
    entry?.orderId || entry?.orderMongoId || entry?.orderNumber || entry?.metadata?.orderNumber
  return (
    action === "ORDER_BOOKED" ||
    (action === "SUBTRACT" && hasOrder) ||
    action === "ORDER_SLOT_TRANSFER_IN" ||
    action === "PAST_DUE_ROLLOUT_IN"
  )
}

const isOrderReleaseAction = (entry) => {
  const action = entry?.action
  const hasOrder =
    entry?.orderId || entry?.orderMongoId || entry?.orderNumber || entry?.metadata?.orderNumber
  return (
    action === "ORDER_CANCELLED" ||
    action === "ORDER_RETURNED" ||
    (action === "ADD" && hasOrder) ||
    action === "ORDER_SLOT_TRANSFER_OUT" ||
    action === "PAST_DUE_ROLLOUT_OUT"
  )
}

const formatAvail = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString()
}

const num = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const buildMetricRows = (entry) => {
  const before = entry?.before || {}
  const after = entry?.after || {}
  let primary = PRIMARY_METRIC[entry?.action] || "availablePlants"
  if (
    entry?.action === "SUBTRACT" &&
    (entry.orderId || entry.orderMongoId || entry.orderNumber)
  ) {
    primary = "totalBookedPlants"
  }
  const fields =
    primary === "availablePlants"
      ? ["availablePlants", "totalBookedPlants"]
      : primary === "totalBookedPlants"
        ? ["totalBookedPlants", "availablePlants"]
        : [primary, "availablePlants"]
  const rows = []
  for (const f of fields) {
    let b = num(before[f])
    let a = num(after[f])
    if (f === "availablePlants") {
      b = b ?? num(entry?.previousAvailablePlants)
      a = a ?? num(entry?.newAvailablePlants)
    }
    if (f === "totalPlants") {
      b = b ?? num(entry?.previousTotalPlants)
      a = a ?? num(entry?.newTotalPlants)
    }
    if (a == null && b == null) continue
    if (a === b) continue
    rows.push({ key: f, label: METRIC_LABEL[f] || f, before: b, after: a })
  }
  return rows
}

/** Unique per hop — never collapse multiple rolls for the same order. */
const entryKey = (entry, index) =>
  `${entry.action}-${entry.createdAt}-${entry.orderMongoId || entry.orderId || ""}-${index}`

const emptyCopy = {
  rolls: "No roll activity yet.",
  transfer: "No transfer activity yet.",
  stock: "No stock changes yet.",
  other: "No other activity yet.",
  orders: "No order booking activity yet.",
  all: "No activity recorded yet."
}

const SlotTrailModal = ({
  open,
  onClose,
  slotId,
  slotInfo,
  onOpenOrder,
  initialTab = "all"
}) => {
  const navigate = useNavigate()
  const [trail, setTrail] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    if (open && slotId) {
      setTab(initialTab || "all")
      fetchSlotTrail()
    } else {
      setTrail([])
      setTab(initialTab || "all")
    }
  }, [open, slotId, initialTab])

  const fetchSlotTrail = async () => {
    try {
      setLoading(true)
      const instance = NetworkManager(API.SLOTS.GET_SLOT_TRAIL)
      const response = await instance.request({}, { pathParams: [slotId] })
      if (response?.data?.success) {
        setTrail(response.data.data || [])
      } else {
        Toast.error("Failed to load slot trail")
      }
    } catch (error) {
      console.error("Error fetching slot trail:", error)
      Toast.error("Failed to load slot trail")
    } finally {
      setLoading(false)
    }
  }

  const displayEntries = useMemo(() => {
    if (tab === "rolls") return trail.filter(isRollEntry)
    if (tab === "transfer") return trail.filter(isTransferEntry)
    if (tab === "stock") return trail.filter(isStockEntry)
    if (tab === "orders") return trail.filter(isOrderEntry)
    if (tab === "other") return trail.filter(isOtherEntry)
    return trail
  }, [trail, tab])

  const counts = useMemo(
    () => ({
      all: trail.length,
      rolls: trail.filter(isRollEntry).length,
      transfer: trail.filter(isTransferEntry).length,
      stock: trail.filter(isStockEntry).length,
      orders: trail.filter(isOrderEntry).length,
      other: trail.filter(isOtherEntry).length
    }),
    [trail]
  )

  const ordersTally = useMemo(() => {
    const entries = trail.filter(isOrderEntry)
    let bookedIn = 0
    let released = 0
    const seenOrders = new Set()

    const bookActions = new Set([
      "ORDER_BOOKED",
      "ORDER_SLOT_TRANSFER_IN",
      "PAST_DUE_ROLLOUT_IN"
    ])
    const releaseActions = new Set([
      "ORDER_CANCELLED",
      "ORDER_RETURNED",
      "ORDER_SLOT_TRANSFER_OUT",
      "PAST_DUE_ROLLOUT_OUT"
    ])

    for (const entry of entries) {
      const qty = Number(entry.quantity) || 0
      const orderKey =
        entry.orderMongoId || entry.orderId || entry.orderNumber || entry.metadata?.orderNumber
      if (orderKey != null && orderKey !== "") seenOrders.add(String(orderKey))

      if (bookActions.has(entry.action)) {
        bookedIn += qty
      } else if (releaseActions.has(entry.action)) {
        released += qty
      } else if (
        entry.action === "SUBTRACT" &&
        (entry.orderId || entry.orderMongoId || entry.orderNumber)
      ) {
        bookedIn += qty
      } else if (
        entry.action === "ADD" &&
        (entry.orderId || entry.orderMongoId || entry.orderNumber)
      ) {
        released += qty
      }
    }

    const slotBooked = num(
      slotInfo?.totalBookedPlants ?? slotInfo?.bookedPlants ?? slotInfo?.booked
    )
    const netFromTrail = bookedIn - released

    return {
      bookedIn,
      released,
      netFromTrail,
      uniqueOrders: seenOrders.size,
      slotBooked,
      matches: slotBooked != null && netFromTrail === slotBooked
    }
  }, [trail, slotInfo])

  const openOrderFromEntry = useCallback(
    (entry) => {
      const orderNum = entry.orderNumber
      const mongoId = entry.orderMongoId || entry.orderId

      if (onOpenOrder) {
        onOpenOrder({ orderNumber: orderNum, orderMongoId: mongoId, entry })
        return
      }

      const search =
        orderNum != null && orderNum !== ""
          ? String(orderNum)
          : mongoId
            ? String(mongoId)
            : ""
      if (!search) {
        Toast.info("No order linked to this entry")
        return
      }

      navigate(`/u/dashboard?search=${encodeURIComponent(search)}`)
      onClose?.()
    },
    [navigate, onClose, onOpenOrder]
  )

  const isOrderClickable = (entry) =>
    (ORDER_TRANSFER_ACTIONS.has(entry.action) ||
      ORDER_BOOKING_ACTIONS.has(entry.action)) &&
    (entry.orderNumber != null || entry.orderMongoId || entry.orderId)

  const availableNow = Number(slotInfo?.availablePlants)
  const isOverCapacity = Number.isFinite(availableNow) && availableNow < 0

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { maxHeight: "88vh" } }}>
      <DialogTitle sx={{ py: 1.5, px: 2, borderBottom: 1, borderColor: "divider" }}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <History className="text-blue-600 shrink-0" size={20} />
            <span className="text-base font-semibold text-gray-900 truncate">Slot history</span>
          </div>
          {displayEntries.length > 0 && (
            <Chip size="small" label={`${displayEntries.length} events`} variant="outlined" />
          )}
        </div>
      </DialogTitle>

      <DialogContent sx={{ px: 2, py: 1.5 }}>
        {slotInfo && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs mb-2 py-2 px-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="col-span-2 font-medium text-gray-800">
              {slotInfo.startDay} – {slotInfo.endDay}
              {slotInfo.month ? ` · ${slotInfo.month}` : ""}
            </div>
            <div>
              <span className="text-gray-500">Capacity </span>
              <span className="font-semibold tabular-nums">
                {(slotInfo.totalPlants ?? 0).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Available </span>
              <span
                className={`font-semibold tabular-nums ${
                  isOverCapacity ? "text-red-600" : "text-gray-900"
                }`}>
                {formatAvail(slotInfo.availablePlants)}
                {isOverCapacity ? " (over)" : ""}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Booked </span>
              <span className="font-semibold tabular-nums text-blue-800">
                {formatAvail(
                  slotInfo.totalBookedPlants ?? slotInfo.bookedPlants ?? slotInfo.booked
                )}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Buffer </span>
              <span className="font-medium">
                {slotInfo.effectiveBuffer ?? slotInfo.buffer ?? 0}%
              </span>
            </div>
          </div>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 36,
            mb: 1,
            "& .MuiTab-root": { minHeight: 36, py: 0.5, fontSize: "0.75rem", minWidth: 64 }
          }}>
          <Tab label={`All (${counts.all})`} value="all" />
          <Tab label={`Orders (${counts.orders})`} value="orders" />
          <Tab label={`Rolls (${counts.rolls})`} value="rolls" />
          <Tab label={`Transfers (${counts.transfer})`} value="transfer" />
          <Tab label={`Stock (${counts.stock})`} value="stock" />
          <Tab label={`Other (${counts.other})`} value="other" />
        </Tabs>

        {(tab === "orders" || tab === "all") && counts.orders > 0 && (
          <div className="mb-2 rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-2 text-[11px]">
            <div className="font-semibold text-blue-900 mb-1">Order booking tally</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 tabular-nums">
              <div>
                <span className="text-gray-600">Booked in trail </span>
                <span className="font-bold text-green-700">
                  +{ordersTally.bookedIn.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Released in trail </span>
                <span className="font-bold text-red-700">
                  −{ordersTally.released.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Net from history </span>
                <span className="font-bold text-blue-900">
                  {ordersTally.netFromTrail.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Slot booked now </span>
                <span
                  className={`font-bold ${
                    ordersTally.matches ? "text-green-700" : "text-amber-700"
                  }`}>
                  {formatAvail(ordersTally.slotBooked)}
                  {ordersTally.slotBooked != null && !ordersTally.matches ? " ≠" : ""}
                </span>
              </div>
            </div>
            <div className="mt-1 text-gray-600">
              {ordersTally.uniqueOrders} order{ordersTally.uniqueOrders === 1 ? "" : "s"} in history
              {ordersTally.matches
                ? " · tally matches slot booked"
                : ordersTally.slotBooked != null
                  ? " · older bookings may predate trail"
                  : ""}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : displayEntries.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500">
            {emptyCopy[tab] || emptyCopy.all}
          </div>
        ) : (
          <ul className="space-y-1 max-h-[52vh] overflow-y-auto pr-0.5">
            {displayEntries.map((entry, index) => {
              const action = entry?.action || "UNKNOWN"
              const style = ACTION_STYLES[action] || ACTION_STYLES.default
              const activityName = entry?.activityName || action.replace(/_/g, " ")
              const createdAt = entry?.createdAt ? moment(entry.createdAt) : null
              const peerWindow = entry?.metadata?.peerSlotWindow
              const peerSlotId = entry?.metadata?.peerSlotId
              const performer = entry?.performedBy?.name || "System"
              const clickable = isOrderClickable(entry)
              const orderLabel =
                entry.orderNumber != null && entry.orderNumber !== ""
                  ? `#${entry.orderNumber}`
                  : null
              const isOut = isOrderReleaseAction(entry) || OUT_ACTIONS.has(action)
              const isIn = isOrderBookAction(entry) || IN_ACTIONS.has(action)
              const qtyColor = isOrderBookAction(entry)
                ? "text-green-700"
                : isOrderReleaseAction(entry)
                  ? "text-red-700"
                  : isOut
                    ? "text-red-700"
                    : isIn
                      ? "text-green-700"
                      : "text-gray-700"
              const metricRows = buildMetricRows(entry)
              const whoFor =
                entry.customerLine ||
                [entry.customerDisplayName, entry.orderForName && entry.bookingFarmerName
                  ? `${entry.orderForName} · Booking: ${entry.bookingFarmerName}`
                  : null]
                  .filter(Boolean)
                  .join(" · ") ||
                [entry.farmerName, entry.farmerMobile].filter(Boolean).join(" · ")

              return (
                <li key={entryKey(entry, index)}>
                  <div
                    role={clickable ? "button" : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    onClick={() => clickable && openOrderFromEntry(entry)}
                    onKeyDown={(e) => {
                      if (clickable && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault()
                        openOrderFromEntry(entry)
                      }
                    }}
                    className={`border-l-[3px] rounded-r-md px-2.5 py-2 ${style} ${
                      clickable
                        ? "cursor-pointer hover:brightness-[0.97] active:scale-[0.99] transition-all"
                        : ""
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-900 text-[13px] leading-tight truncate">
                        {activityName}
                      </span>
                      <span
                        className={`tabular-nums font-extrabold text-sm shrink-0 ${qtyColor}`}>
                        {formatQty(action, entry?.quantity, entry)}
                      </span>
                    </div>

                    {(orderLabel || whoFor || peerWindow || peerSlotId) && (
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px]">
                        {orderLabel && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1.5 py-0.5 font-semibold text-violet-800">
                            {orderLabel}
                            {clickable && <ExternalLink size={10} className="opacity-70" />}
                          </span>
                        )}
                        {whoFor && (
                          <span className="text-gray-700 truncate">{whoFor}</span>
                        )}
                        {(peerWindow || peerSlotId) && (
                          <span className="text-gray-500 truncate">
                            ↔ {peerWindow || `Slot …${String(peerSlotId).slice(-6)}`}
                          </span>
                        )}
                      </div>
                    )}

                    {metricRows.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {metricRows.map((m) => {
                          const afterNeg = Number(m.after) < 0
                          return (
                            <span
                              key={m.key}
                              className="inline-flex items-center gap-1 rounded-md bg-white/70 border border-black/5 px-1.5 py-0.5 text-[11px] tabular-nums">
                              <span className="text-gray-500">{m.label}</span>
                              <span className="text-gray-400">{formatAvail(m.before)}</span>
                              <ChevronRight className="w-3 h-3 opacity-40" />
                              <span
                                className={`font-bold ${
                                  afterNeg ? "text-red-600" : "text-gray-900"
                                }`}>
                                {formatAvail(m.after)}
                              </span>
                            </span>
                          )
                        })}
                      </div>
                    )}

                    <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-gray-500">
                      <span className="truncate italic">
                        {entry.reason && entry.reason !== activityName ? entry.reason : ""}
                      </span>
                      <span className="shrink-0 whitespace-nowrap">
                        {performer} ·{" "}
                        {createdAt?.isValid() ? createdAt.format("DD/MM HH:mm") : "—"}
                      </span>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose} size="small" variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SlotTrailModal
