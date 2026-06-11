import React, { useState, useEffect, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Chip,
  Tooltip,
  IconButton
} from "@mui/material"
import { useNavigate } from "react-router-dom"
import { NetworkManager, API } from "../../network/core"
import {
  History,
  ExternalLink,
  ChevronRight
} from "lucide-react"
import { Toast } from "../../helpers/toasts/toastHelper"
import moment from "moment"

const TRANSFER_ACTIONS = new Set([
  "SOWING_TRANSFER_OUT",
  "SOWING_TRANSFER_IN",
  "CAPACITY_TRANSFER_OUT",
  "CAPACITY_TRANSFER_IN",
  "ORDER_SLOT_TRANSFER_OUT",
  "ORDER_SLOT_TRANSFER_IN"
])

const ORDER_TRANSFER_ACTIONS = new Set([
  "ORDER_SLOT_TRANSFER_OUT",
  "ORDER_SLOT_TRANSFER_IN"
])

const STOCK_ACTIONS = new Set([
  "ACTUAL_PLANTS_UPDATED",
  "CLOSING_STOCK_UPDATED",
  "AVAILABLE_PLANTS_UPDATED"
])

const OUT_ACTIONS = new Set([
  "SUBTRACT",
  "CAPACITY_TRANSFER_OUT",
  "SOWING_TRANSFER_OUT",
  "ORDER_SLOT_TRANSFER_OUT"
])

const IN_ACTIONS = new Set([
  "ADD",
  "CAPACITY_TRANSFER_IN",
  "SOWING_TRANSFER_IN",
  "ORDER_SLOT_TRANSFER_IN"
])

const ACTION_STYLES = {
  ORDER_SLOT_TRANSFER_OUT: "border-l-violet-500 bg-violet-50/80",
  ORDER_SLOT_TRANSFER_IN: "border-l-violet-500 bg-violet-50/80",
  SOWING_TRANSFER_OUT: "border-l-emerald-500 bg-emerald-50/70",
  SOWING_TRANSFER_IN: "border-l-emerald-500 bg-emerald-50/70",
  CAPACITY_TRANSFER_OUT: "border-l-indigo-500 bg-indigo-50/70",
  CAPACITY_TRANSFER_IN: "border-l-indigo-500 bg-indigo-50/70",
  ADD: "border-l-green-500 bg-green-50/60",
  SUBTRACT: "border-l-red-500 bg-red-50/60",
  BUFFER_APPLIED: "border-l-blue-500 bg-blue-50/60",
  BUFFER_RELEASED: "border-l-orange-500 bg-orange-50/60",
  ACTUAL_PLANTS_UPDATED: "border-l-teal-500 bg-teal-50/60",
  CLOSING_STOCK_UPDATED: "border-l-amber-500 bg-amber-50/60",
  AVAILABLE_PLANTS_UPDATED: "border-l-sky-500 bg-sky-50/60",
  default: "border-l-gray-400 bg-gray-50/80"
}

const formatQty = (action, quantity) => {
  const n = Number(quantity) || 0
  if (OUT_ACTIONS.has(action)) return `−${n.toLocaleString()}`
  if (IN_ACTIONS.has(action)) return `+${n.toLocaleString()}`
  return n.toLocaleString()
}

const formatAvail = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return "—"
  return n.toLocaleString()
}

const entryKey = (entry, index) =>
  `${entry.action}-${entry.createdAt}-${entry.orderMongoId || entry.orderId || ""}-${index}`

const SlotTrailModal = ({ open, onClose, slotId, slotInfo, onOpenOrder }) => {
  const navigate = useNavigate()
  const [trail, setTrail] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState("all")

  useEffect(() => {
    if (open && slotId) {
      fetchSlotTrail(tab)
    } else {
      setTrail([])
      setTab("all")
    }
  }, [open, slotId, tab])

  const fetchSlotTrail = async (activeTab) => {
    try {
      setLoading(true)
      const instance = NetworkManager(API.SLOTS.GET_SLOT_TRAIL)
      const query = {}
      if (activeTab === "stock") query.types = "stock"
      if (activeTab === "transfer") query.types = "transfer"

      const response = await instance.request({}, { pathParams: [slotId], ...query })

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
    if (tab === "transfer") return trail.filter((e) => TRANSFER_ACTIONS.has(e.action))
    if (tab === "stock") return trail.filter((e) => STOCK_ACTIONS.has(e.action))
    return trail
  }, [trail, tab])

  const counts = useMemo(
    () => ({
      all: trail.length,
      transfer: trail.filter((e) => TRANSFER_ACTIONS.has(e.action)).length,
      stock: trail.filter((e) => STOCK_ACTIONS.has(e.action)).length
    }),
    [trail]
  )

  const openOrderFromEntry = useCallback(
    (entry) => {
      const orderNum = entry.orderNumber
      const mongoId = entry.orderMongoId || entry.orderId

      if (onOpenOrder) {
        onOpenOrder({ orderNumber: orderNum, orderMongoId: mongoId, entry })
        return
      }

      const search = orderNum != null && orderNum !== "" ? String(orderNum) : mongoId ? String(mongoId) : ""
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
    ORDER_TRANSFER_ACTIONS.has(entry.action) &&
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
            <div className="col-span-2">
              <span className="text-gray-500">Buffer </span>
              <span className="font-medium">{slotInfo.effectiveBuffer ?? slotInfo.buffer ?? 0}%</span>
            </div>
          </div>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ minHeight: 36, mb: 1, "& .MuiTab-root": { minHeight: 36, py: 0.5, fontSize: "0.8rem" } }}>
          <Tab label={`All (${counts.all})`} value="all" />
          <Tab label={`Transfers (${counts.transfer})`} value="transfer" />
          <Tab label={`Stock (${counts.stock})`} value="stock" />
        </Tabs>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          </div>
        ) : displayEntries.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-500">
            {tab === "transfer"
              ? "No transfer activity yet."
              : tab === "stock"
                ? "No stock changes yet."
                : "No activity recorded yet."}
          </div>
        ) : (
          <ul className="space-y-1 max-h-[52vh] overflow-y-auto pr-0.5">
            {displayEntries.map((entry, index) => {
              const action = entry?.action || "UNKNOWN"
              const style = ACTION_STYLES[action] || ACTION_STYLES.default
              const activityName = entry?.activityName || action.replace(/_/g, " ")
              const createdAt = entry?.createdAt ? moment(entry.createdAt) : null
              const prevAvail =
                entry?.previousAvailablePlants ?? entry?.before?.availablePlants
              const newAvail = entry?.newAvailablePlants ?? entry?.after?.availablePlants
              const prevBooked = entry?.before?.totalBookedPlants
              const newBooked = entry?.after?.totalBookedPlants
              const showBooked =
                prevBooked !== undefined &&
                newBooked !== undefined &&
                prevBooked !== newBooked
              const peerWindow = entry?.metadata?.peerSlotWindow
              const peerSlotId = entry?.metadata?.peerSlotId
              const performer = entry?.performedBy?.name || "System"
              const clickable = isOrderClickable(entry)
              const orderLabel =
                entry.orderNumber != null && entry.orderNumber !== ""
                  ? `#${entry.orderNumber}`
                  : null
              const newAvailNegative = Number(newAvail) < 0

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
                    className={`border-l-[3px] rounded-r-md px-2 py-1.5 text-xs ${style} ${
                      clickable
                        ? "cursor-pointer hover:brightness-[0.97] active:scale-[0.99] transition-all"
                        : ""
                    }`}>
                    <div className="flex items-start gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-gray-900 leading-tight">
                            {activityName}
                          </span>
                          <span
                            className={`tabular-nums font-bold ${
                              OUT_ACTIONS.has(action)
                                ? "text-red-700"
                                : IN_ACTIONS.has(action)
                                  ? "text-green-700"
                                  : "text-gray-700"
                            }`}>
                            {formatQty(action, entry?.quantity)}
                          </span>
                          {orderLabel && (
                            <span className="inline-flex items-center gap-0.5 text-violet-800 font-semibold">
                              {orderLabel}
                              {clickable && <ExternalLink size={11} className="opacity-70" />}
                            </span>
                          )}
                        </div>

                        <div className="mt-0.5 text-[11px] text-gray-600 leading-snug space-y-0.5">
                          {(entry.farmerName || entry.farmerMobile) && (
                            <div className="truncate">
                              {entry.farmerName}
                              {entry.farmerMobile ? ` · ${entry.farmerMobile}` : ""}
                            </div>
                          )}
                          {(peerWindow || peerSlotId) && (
                            <div className="truncate text-gray-500">
                              {TRANSFER_ACTIONS.has(action) ? "↔ " : ""}
                              {peerWindow || `Slot ${String(peerSlotId).slice(-6)}`}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-x-2 gap-y-0 tabular-nums">
                            <span>
                              Avail {formatAvail(prevAvail)}
                              <ChevronRight className="inline w-3 h-3 -mt-px mx-0.5 opacity-50" />
                              <span className={newAvailNegative ? "text-red-600 font-semibold" : ""}>
                                {formatAvail(newAvail)}
                              </span>
                            </span>
                            {showBooked && (
                              <span>
                                Booked {formatAvail(prevBooked)}
                                <ChevronRight className="inline w-3 h-3 -mt-px mx-0.5 opacity-50" />
                                {formatAvail(newBooked)}
                              </span>
                            )}
                          </div>
                          {entry.reason && entry.reason !== activityName && (
                            <div className="truncate text-gray-500 italic">{entry.reason}</div>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-gray-500 whitespace-nowrap">
                          {createdAt?.isValid() ? createdAt.format("DD/MM/YY HH:mm") : "—"}
                        </span>
                        <span className="text-[10px] text-gray-500 max-w-[72px] truncate" title={performer}>
                          {performer}
                        </span>
                        {clickable && (
                          <Tooltip title="Open order on dashboard">
                            <IconButton
                              size="small"
                              sx={{ p: 0.25 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                openOrderFromEntry(entry)
                              }}>
                              <ExternalLink size={14} className="text-violet-700" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </div>
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
