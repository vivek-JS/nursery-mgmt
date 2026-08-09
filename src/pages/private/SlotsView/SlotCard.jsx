import React from "react"
import moment from "moment"
import {
  Calendar,
  Edit2,
  Trash2,
  Zap,
  AlertTriangle,
  History,
  Shield,
  Sprout,
  ArrowRightLeft,
  Package,
} from "lucide-react"
import { Switch, Tooltip, IconButton, Button, Card, CardContent } from "@mui/material"
import SlotBufferPanel from "./SlotBufferPanel"
import SlotCardMetrics from "./SlotCardMetrics"
import SlotQueuePanel from "./SlotQueuePanel"
import SlotDispatchedPanel from "./SlotDispatchedPanel"
import ActiveSlotHighlight from "./ActiveSlotHighlight"
import {
  getSellableCapacity,
  getTotalCapacity,
  getUtilizationPct,
  getBookedPlants,
  getSowingGap,
  isSlotOverbooked,
  getEffectiveBufferPct,
  slotHasMixedRolledAndNativeOrders,
  slotHasPendingPastDueOnSubtype,
} from "./slotMetrics"

const SlotCard = ({
  slot,
  monthName,
  getStatusColor,
  onOpenDetails,
  onOpenOrders,
  onOpenPastDue,
  onOpenActual,
  onPendingRoll,
  onRollExpiredAvailable,
  canRollExpired,
  onTrail,
  onEdit,
  onBuffer,
  onReleaseBuffer,
  onSowing,
  onTransfer,
  onStockHistory,
  onSalesmen,
  onToggleStatus,
  onDelete,
}) => {
  const { startDay, endDay, status, _id, isManual } = slot || {}
  const start = moment(startDay, "DD-MM-YYYY").format("MMM D")
  const end = moment(endDay, "DD-MM-YYYY").format("MMM D")
  const yearLbl = moment(startDay, "DD-MM-YYYY").format("YYYY")

  const effectiveTotalCapacity = getSellableCapacity(slot)
  const bookedPlants = getBookedPlants(slot)
  const totalCapacity = getTotalCapacity(slot)
  const sowingGap = getSowingGap(slot)
  const slotBookedPercentage = getUtilizationPct(bookedPlants, effectiveTotalCapacity)
  const slotStatusColor = getStatusColor(slotBookedPercentage, getBookedPlants(slot))
  const slotIsOverbooked = isSlotOverbooked(slot)
  const mixedRolledAndNative = slotHasMixedRolledAndNativeOrders(slot)
  const hasPendingPastDue = slotHasPendingPastDueOnSubtype(slot)
  return (
    <Card
      className={`transition-all duration-200 hover:shadow-lg rounded-xl border ${
        slot?.isCurrentDateSlot ? "ring-2 ring-sky-200 border-sky-300 " : ""
      }${
        slotIsOverbooked
          ? "border-red-300 ring-1 ring-red-200"
          : slotBookedPercentage > 70
          ? "border-orange-200 hover:border-orange-300"
          : "border-gray-200 hover:border-blue-300"
      } ${status ? "" : "opacity-60"}`}>
      <CardContent
        className={`p-3 ${
          slotIsOverbooked
            ? "bg-gradient-to-br from-red-50/80 to-white"
            : slotBookedPercentage > 70
            ? "bg-gradient-to-br from-orange-50/60 to-white"
            : slot?.isCurrentDateSlot
            ? "bg-gradient-to-br from-sky-50/40 to-white"
            : "bg-white"
        }`}>
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 mb-2">
          <div
            role="button"
            tabIndex={0}
            className="flex items-start gap-2 min-w-[11rem] flex-1 cursor-pointer rounded-lg -m-1 p-1 hover:bg-black/[0.03]"
            onClick={() => onOpenDetails(slot, monthName)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onOpenDetails(slot, monthName)
              }
            }}>
            <div
              className={`shrink-0 p-1.5 rounded-lg mt-0.5 ${
                slotIsOverbooked
                  ? "bg-red-500"
                  : slotBookedPercentage > 70
                  ? "bg-orange-500"
                  : "bg-blue-500"
              }`}>
              <Calendar className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-gray-900 text-sm leading-snug whitespace-normal">
                {start} – {end}, {yearLbl}
              </h4>
              <ActiveSlotHighlight
                slot={slot}
                mixedRolledAndNative={mixedRolledAndNative}
                hasPendingPastDue={hasPendingPastDue}
              />
            </div>
            {isManual && (
              <Tooltip title="Manual slot" arrow>
                <Zap className="w-3 h-3 text-amber-500 shrink-0 mt-1" />
              </Tooltip>
            )}
            {slotIsOverbooked && (
              <Tooltip title="Overbooked" arrow>
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 animate-pulse mt-1" />
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-0.5 shrink-0 ml-auto">
            <Tooltip title="History" arrow>
              <IconButton size="small" onClick={(e) => onTrail(e, slot)} sx={{ width: 24, height: 24 }}>
                <History className="w-3 h-3 text-blue-600" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit available" arrow>
              <IconButton size="small" onClick={(e) => onEdit(e, slot)} sx={{ width: 24, height: 24 }}>
                <Edit2 className="w-3 h-3 text-green-600" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Buffer" arrow>
              <IconButton
                size="small"
                onClick={(e) => onBuffer(e, slot, getEffectiveBufferPct(slot))}
                sx={{ width: 24, height: 24 }}>
                <Shield className="w-3 h-3 text-purple-600" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Sowing" arrow>
              <IconButton size="small" onClick={(e) => onSowing(e, slot)} sx={{ width: 24, height: 24 }}>
                <Sprout className="w-3 h-3 text-emerald-600" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Transfer" arrow>
              <IconButton size="small" onClick={(e) => onTransfer(e, slot)} sx={{ width: 24, height: 24 }}>
                <ArrowRightLeft className="w-3 h-3 text-green-600" />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        <div className="mb-2.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
              Util {slotBookedPercentage}%
            </span>
            <span className="text-[10px] text-gray-500">Cap {totalCapacity.toLocaleString()}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all ${slotStatusColor.bg} ${
                slotIsOverbooked ? "animate-pulse" : ""
              }`}
              style={{ width: `${Math.min(slotBookedPercentage, 100)}%` }}
            />
          </div>
        </div>

        <SlotCardMetrics
          slot={slot}
          monthName={monthName}
          onOpenOrders={onOpenOrders}
          onOpenActual={onOpenActual}
        />

        <SlotQueuePanel slot={slot} monthName={monthName} onOpenOrders={onOpenOrders} />

        <SlotDispatchedPanel
          slot={slot}
          monthName={monthName}
          onOpenOrders={onOpenOrders}
        />

        {((slot.pastDueRolledInPlants ?? 0) > 0 || (slot.pastDuePendingOnSlot ?? 0) > 0) && (
          <div className="border-t border-gray-200 pt-2 mt-1 mb-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wide mb-1.5">
              Past due
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(slot.pastDueRolledInPlants ?? 0) > 0 && (
                <button
                  type="button"
                  className="rounded-lg border px-2 py-1.5 text-left bg-amber-50 border-amber-200 hover:bg-amber-100"
                  onClick={(e) => onOpenPastDue(e, slot, monthName, "pastDueRolled")}>
                  <p className="text-[10px] text-gray-500">Rolled in (past due)</p>
                  <p className="text-sm font-bold text-amber-800 tabular-nums">
                    {(slot.pastDueRolledInPlants ?? 0).toLocaleString()}
                  </p>
                </button>
              )}
              {(slot.pastDuePendingOnSlot ?? 0) > 0 && (
                <button
                  type="button"
                  className="rounded-lg border px-2 py-1.5 text-left bg-orange-50 border-orange-200 hover:bg-orange-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPendingRoll(slot)
                  }}>
                  <p className="text-[10px] text-gray-500">Pending roll</p>
                  <p className="text-sm font-bold text-orange-800">
                    {(slot.pastDuePendingOrders ?? 0).toLocaleString()}
                  </p>
                </button>
              )}
            </div>
          </div>
        )}

        {((slot.dispatchedFromOtherSlots ?? 0) > 0 || (slot.releasedForEarlyDispatch ?? 0) > 0) && (
          <div className="flex flex-wrap gap-2 mb-2 text-[10px]" onClick={(e) => e.stopPropagation()}>
            {(slot.dispatchedFromOtherSlots ?? 0) > 0 && (
              <button
                type="button"
                className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-sky-800 hover:bg-sky-100"
                onClick={(e) => onOpenOrders(e, slot, monthName, "crossSlotEarlyIn")}>
                Early dispatch: <strong>{(slot.dispatchedFromOtherSlots ?? 0).toLocaleString()}</strong>
              </button>
            )}
            {(slot.releasedForEarlyDispatch ?? 0) > 0 && (
              <button
                type="button"
                className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-violet-800 hover:bg-violet-100"
                onClick={(e) => onOpenOrders(e, slot, monthName, "crossSlotReleased")}>
                Released: <strong>{(slot.releasedForEarlyDispatch ?? 0).toLocaleString()}</strong>
              </button>
            )}
          </div>
        )}

        {slot?.isCurrentDateSlot && canRollExpired && (
          <div className="mb-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              fullWidth
              onClick={() => onRollExpiredAvailable(slot)}
              sx={{ textTransform: "none", fontSize: "0.7rem", py: 0.5 }}>
              {slot.status === false
                ? "Roll expired available (slot Off)"
                : "Roll expired available"}
            </Button>
          </div>
        )}

        <SlotBufferPanel
          slot={slot}
          onEditBuffer={onBuffer}
          onReleaseBuffer={onReleaseBuffer}
          onStopPropagation={(e) => e.stopPropagation()}
        />

        {sowingGap !== 0 && (
          <div className="text-[10px] text-gray-500 mb-2">
            Sowing gap{" "}
            <strong className={sowingGap > 0 ? "text-orange-600" : "text-gray-700"}>
              {sowingGap > 0 ? "+" : ""}
              {sowingGap.toLocaleString()}
            </strong>
          </div>
        )}

        <div
          className="flex items-center justify-between pt-2 border-t border-gray-100"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <Switch
              size="small"
              checked={status}
              onChange={(e) => onToggleStatus(e, _id, status)}
              color="success"
            />
            <span className="text-[10px] text-gray-500">{status ? "Active" : "Off"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip title="Stock log" arrow>
              <IconButton size="small" onClick={(e) => onStockHistory(e, slot)} sx={{ width: 22, height: 22 }}>
                <Package className="w-3 h-3 text-teal-600" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Allow only salespeople" arrow>
              <Button
                size="small"
                variant={slot.restrictToSalesmen ? "contained" : "outlined"}
                onClick={(e) => onSalesmen(e, slot)}
                sx={{ minWidth: "auto", px: 1, py: 0.25, fontSize: "0.65rem", textTransform: "none" }}>
                Allow
                {slot.restrictToSalesmen && slot.allowedSalesmen?.length
                  ? ` (${slot.allowedSalesmen.length})`
                  : ""}
              </Button>
            </Tooltip>
            {isManual && bookedPlants === 0 && (
              <IconButton size="small" onClick={(e) => onDelete(e, _id)} sx={{ width: 22, height: 22, color: "#dc2626" }}>
                <Trash2 className="w-3 h-3" />
              </IconButton>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SlotCard
