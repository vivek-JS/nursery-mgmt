import React from "react"
import moment from "moment"
import {
  Calendar,
  Edit2,
  Shield,
  TrendingUp,
  ArrowRightLeft,
  X,
  Zap,
  AlertTriangle,
  Package,
  Activity,
  History,
} from "lucide-react"
import {
  Modal,
  Backdrop,
  Fade,
  Box,
  Chip,
  Tooltip,
  IconButton,
  Button,
  Card,
  CardContent,
} from "@mui/material"
import FarmerOrdersTable from "../dashboard/FarmerOrdersTable"
import SlotBufferPanel from "./SlotBufferPanel"
import PastDueSlotBreakdown from "./PastDueSlotBreakdown"
import SlotCardMetrics from "./SlotCardMetrics"
import SlotBookingCoverPanel from "./SlotBookingCoverPanel"
import SlotQueuePanel from "./SlotQueuePanel"
import SlotDispatchedPanel from "./SlotDispatchedPanel"
import { getBufferStatusMeta } from "./bufferUi"
import {
  getSellableCapacity,
  getBookedPlants,
  getUtilizationPct,
  getSowingGap,
  isSlotOverbooked,
  getEffectiveBufferPct,
} from "./slotMetrics"

const SlotDetailModal = ({
  open,
  slot,
  pastDueExpandKey,
  onExpandKey,
  canRollPastDue,
  onClose,
  onStartEditing,
  onOpenBuffer,
  onOpenReleaseBuffer,
  onOpenTransfer,
  onOpenStockHistory,
  onOpenOrdersDrawer,
  onOpenActual,
  onSlotChanged,
  onOpenPendingRoll,
  onOpenRollExpired,
}) => {
  if (!slot) return null

  const start = moment(slot.startDay, "DD-MM-YYYY").format("MMM D")
  const end = moment(slot.endDay, "DD-MM-YYYY").format("MMM D")
  const year = moment(slot.startDay, "DD-MM-YYYY").format("YYYY")
  const effectiveTotalCapacity = getSellableCapacity(slot)
  const slotBookedPercentage = getUtilizationPct(getBookedPlants(slot), effectiveTotalCapacity)
  const slotIsOverbooked = isSlotOverbooked(slot)

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition BackdropComponent={Backdrop} BackdropProps={{ timeout: 500 }}>
      <Fade in={open}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: "1000px",
            height: "80%",
            bgcolor: "background.paper",
            borderRadius: "16px",
            boxShadow: 24,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}>
          <div className={`p-6 border-b ${slotIsOverbooked ? "bg-red-50" : "bg-blue-50"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-xl ${slotIsOverbooked ? "bg-red-500" : "bg-blue-500"}`}>
                  {slotIsOverbooked ? (
                    <AlertTriangle className="w-6 h-6 text-white" />
                  ) : (
                    <Calendar className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {start} - {end}, {year}
                  </h3>
                  <p className="text-gray-600">{slot.monthName}</p>
                </div>
                {slot.isManual && (
                  <Chip icon={<Zap className="w-3 h-3" />} label="Manual Slot" size="small" color="warning" variant="outlined" />
                )}
                {slotIsOverbooked && (
                  <Chip icon={<AlertTriangle className="w-3 h-3" />} label="OVERBOOKED" size="small" color="error" variant="filled" />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Tooltip title="Edit Plants">
                  <IconButton onClick={(e) => { onStartEditing(e, slot); onClose() }} sx={{ color: "#3b82f6" }}>
                    <Edit2 className="w-5 h-5" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Update Buffer">
                  <IconButton onClick={(e) => { onOpenBuffer(e, slot, getEffectiveBufferPct(slot)); onClose() }} sx={{ color: "#8b5cf6" }}>
                    <Shield className="w-5 h-5" />
                  </IconButton>
                </Tooltip>
                {getBufferStatusMeta(slot).releasable > 0 && (
                  <Tooltip title="Release buffer plants to available">
                    <IconButton onClick={(e) => { onOpenReleaseBuffer(e, slot); onClose() }} sx={{ color: "#7c3aed" }}>
                      <TrendingUp className="w-5 h-5" />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Transfer Plants">
                  <IconButton onClick={(e) => { e.stopPropagation(); onOpenTransfer(slot) }} sx={{ color: "#16a34a" }}>
                    <ArrowRightLeft className="w-5 h-5" />
                  </IconButton>
                </Tooltip>
                <IconButton onClick={onClose}>
                  <X className="w-6 h-6" />
                </IconButton>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Slot stats</p>
            <SlotCardMetrics
              slot={slot}
              monthName={slot.monthName}
              variant="detail"
              onOpenOrders={(e, s, month, key) => {
                e?.stopPropagation?.()
                onOpenOrdersDrawer({ slot: s, monthName: month, statKey: key })
              }}
              onOpenActual={onOpenActual}
              onSlotChanged={onSlotChanged}
            />
            <SlotBookingCoverPanel
              slot={slot}
              monthName={slot.monthName}
              variant="detail"
              onOpenOrders={(e, s, month, key) => {
                e?.stopPropagation?.()
                onOpenOrdersDrawer({ slot: s, monthName: month, statKey: key })
              }}
            />
            <SlotQueuePanel
              slot={slot}
              monthName={slot.monthName}
              variant="detail"
              onOpenOrders={(e, s, month, key) => {
                e?.stopPropagation?.()
                onOpenOrdersDrawer({ slot: s, monthName: month, statKey: key })
              }}
            />
            <SlotDispatchedPanel
              slot={slot}
              monthName={slot.monthName}
              variant="detail"
              onOpenOrders={(e, s, month, key) => {
                e?.stopPropagation?.()
                onOpenOrdersDrawer({ slot: s, monthName: month, statKey: key })
              }}
            />
            {slot.isCurrentDateSlot && canRollPastDue && (
              <Button variant="outlined" color="secondary" size="small" className="mb-4" onClick={() => onOpenRollExpired(slot)} sx={{ textTransform: "none" }}>
                {slot.status === false
                  ? "Roll expired available (slot Off)"
                  : "Roll expired available"}
              </Button>
            )}

            {((slot.pastDueRolledInPlants ?? 0) > 0 || (slot.pastDuePendingOnSlot ?? 0) > 0) && (
              <>
                <div className="border-t border-gray-200 my-5" role="separator" />
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-3">Past due</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  {(slot.pastDueRolledInPlants ?? 0) > 0 && (
                    <Card className="cursor-pointer hover:shadow-md border-amber-200" onClick={() => onOpenOrdersDrawer({ slot, monthName: slot.monthName, statKey: "pastDueRolled" })}>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Rolled in (past due)</p>
                        <p className="text-2xl font-bold text-amber-700 tabular-nums">{(slot.pastDueRolledInPlants ?? 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  )}
                  {(slot.pastDuePendingOnSlot ?? 0) > 0 && (
                    <Card className="cursor-pointer hover:shadow-md border-orange-200" onClick={() => onOpenPendingRoll(slot)}>
                      <CardContent className="p-4">
                        <p className="text-sm text-gray-600">Pending roll</p>
                        <p className="text-2xl font-bold text-orange-700 tabular-nums">{(slot.pastDuePendingOrders ?? 0).toLocaleString()}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </>
            )}

            <div className="border-t border-gray-200 my-5" role="separator" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Other metrics</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Sowing Gap</p>
                  <p className={`text-2xl font-bold ${getSowingGap(slot) > 0 ? "text-orange-600" : "text-gray-900"}`}>
                    {getSowingGap(slot) > 0 ? "+" : ""}{getSowingGap(slot).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Booking Rate</p>
                  <p className={`text-2xl font-bold ${slotIsOverbooked ? "text-red-600" : "text-gray-900"}`}>{slotBookedPercentage}%</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md" onClick={() => onOpenActual(slot)}>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Actual Plants</p>
                  <p className="text-2xl font-bold text-teal-600">{(slot.actualPlants ?? 0).toLocaleString()}</p>
                  <Package className="w-6 h-6 text-teal-500 mt-1" />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">Closing Stock</p>
                  <p className="text-2xl font-bold text-amber-600">{(slot.closingStock ?? 0).toLocaleString()}</p>
                  <Activity className="w-6 h-6 text-amber-500 mt-1" />
                </CardContent>
              </Card>
            </div>

            {slot.isCurrentDateSlot && slot.pastDueDetail ? (
              <PastDueSlotBreakdown
                detail={slot.pastDueDetail}
                slotLabel={`${start} – ${end}, ${year}`}
                expandKey={pastDueExpandKey}
                onExpandKey={onExpandKey}
                canRoll={canRollPastDue}
                onOpenPendingRoll={() => onOpenPendingRoll(slot)}
              />
            ) : null}

            <div className="mb-6">
              <SlotBufferPanel
                slot={slot}
                compact={false}
                onEditBuffer={(s, e) => { onOpenBuffer(e, s, getEffectiveBufferPct(s)); onClose() }}
                onReleaseBuffer={(s) => { onOpenReleaseBuffer(null, s); onClose() }}
              />
            </div>

            <div className="mb-6 flex justify-end">
              <Button variant="outlined" size="small" onClick={(e) => onOpenStockHistory(e, slot)} startIcon={<History className="w-4 h-4" />}>
                View stock change log
              </Button>
            </div>

            <div className="bg-white rounded-lg border">
              <div className="p-4 border-b">
                <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-500" />
                  Farmer Orders
                </h4>
              </div>
              <FarmerOrdersTable
                slotId={slot._id}
                monthName={slot.monthName}
                startDay={slot.startDay}
                endDay={slot.endDay}
                slotOrderFilter="all_active"
              />
            </div>
          </div>
        </Box>
      </Fade>
    </Modal>
  )
}

export default SlotDetailModal
