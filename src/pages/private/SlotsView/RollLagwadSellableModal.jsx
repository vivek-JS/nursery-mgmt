import React, { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  Collapse,
} from "@mui/material"
import { AlertTriangle, RotateCcw, ChevronDown, ChevronRight } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"
import { daysPastSlotEnd } from "./lagwadWindowDays"
import { LagwadLineBatchTable } from "./LagwadBatchOrderCheckPanel"
import LagwadBatchOrderCheckPanel from "./LagwadBatchOrderCheckPanel"

function LagwadWindowCard({ bucket }) {
  const [open, setOpen] = useState(false)
  const batches = bucket.batches || []
  const hasBatches = batches.length > 0
  const daysPast = daysPastSlotEnd(bucket.endDay)
  const windowLen =
    bucket.startDay && bucket.endDay
      ? moment(bucket.endDay, "DD-MM-YYYY").diff(moment(bucket.startDay, "DD-MM-YYYY"), "days") + 1
      : null

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/50 overflow-hidden">
      <div className="px-3 py-2 border-b border-teal-200/80 flex justify-between gap-2 items-start">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">Expired window</p>
          <p className="text-xs text-gray-600">{bucket.label}</p>
          <p className="text-[10px] font-semibold text-amber-800 mt-0.5">
            {daysPast > 0 ? `${daysPast} day${daysPast === 1 ? "" : "s"} past end` : "Ended today or active"}
            {windowLen ? ` · ${windowLen}d window` : ""}
          </p>
        </div>
        <div className="text-xs font-bold text-teal-950 tabular-nums shrink-0 text-right">
          <p>Ready to roll {(bucket.actualReadyPlants ?? 0).toLocaleString()}</p>
          {(bucket.sowRecordPlants ?? 0) > 0 ? (
            <p className="text-[10px] font-semibold text-amber-800 mt-0.5">
              Sow {(bucket.sowRecordPlants ?? 0).toLocaleString()} stays here
            </p>
          ) : null}
        </div>
      </div>
      {hasBatches ? (
        <div className="bg-white">
          <button
            type="button"
            className="w-full flex items-center gap-1 px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50/80"
            onClick={() => setOpen((v) => !v)}>
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Batch preview ({batches.length})
          </button>
          <Collapse in={open}>
            <div className="overflow-auto max-h-52 border-t border-gray-100 px-1 py-1">
              <LagwadLineBatchTable lines={batches} compact />
            </div>
          </Collapse>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 px-3 py-2 bg-white border-t border-gray-100">
          No batch lines on preview — ready qty still rolls with shed transfer when present.
        </p>
      )}
    </div>
  )
}

export default function RollLagwadSellableModal({
  open,
  onClose,
  detail,
  slotLabel,
  verifySlot,
  plantId,
  subtypeId,
  canRoll = false,
  onRolled,
}) {
  const d = detail || {}
  const pendingBySlot = d.pendingLagwadBySlot || []
  const pendingTotal = d.pendingLagwadTotal || { slotCount: 0, actualPlants: 0, readyPlants: 0 }
  const [rolling, setRolling] = useState(false)

  const totalPlants = pendingTotal.readyPlants ?? 0
  const hasPending = pendingBySlot.length > 0 && totalPlants > 0

  const handleRollAll = async () => {
    if (!canRoll) {
      Toast.error("You do not have permission to roll lagwad sellable")
      return
    }
    if (!hasPending) {
      Toast.error("No pending lagwad to roll")
      return
    }
    const ok = window.confirm(
      `Move ready lagwad only (${(pendingTotal.readyPlants ?? 0).toLocaleString()} plants) from ${pendingBySlot.length} expired window(s) to today's slot? Sow (90% actual) stays on the original windows. Booking capacity is not moved.`
    )
    if (!ok) return

    setRolling(true)
    try {
      const instance = NetworkManager(API.slots.POST_ROLL_EXPIRED_LAGWAD_ALL)
      const response = await instance.request({
        plantId,
        subtypeId,
      })
      if (response?.code !== 200 && response?.success === false) {
        Toast.error(response?.data?.message || response?.message || "Lagwad roll failed")
        return
      }
      const payload = response?.data?.data ?? response?.data ?? response
      const slotsRolled = payload?.slotsRolled ?? 0
      const errors = payload?.errors?.length ?? 0

      if (slotsRolled > 0) {
        Toast.success(
          `Rolled lagwad from ${slotsRolled} window${slotsRolled === 1 ? "" : "s"} · actual ${(payload?.actualMoved ?? 0).toLocaleString()} · ready ${(payload?.readyMoved ?? 0).toLocaleString()}`
        )
        onRolled?.()
        onClose()
      } else if (errors > 0) {
        Toast.error(payload?.errors?.[0]?.reason || "Roll completed with errors")
        onRolled?.()
      } else {
        Toast.info("Nothing moved — expired windows may already be cleared")
        onRolled?.()
        onClose()
      }
    } catch (err) {
      console.error("Roll lagwad:", err)
      Toast.error(err?.response?.data?.message || err?.message || "Lagwad roll failed")
    } finally {
      setRolling(false)
    }
  }

  return (
    <Dialog open={open} onClose={rolling ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AlertTriangle className="w-5 h-5 text-teal-700" />
          <span>Pending lagwad roll — expired windows</span>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Today&apos;s slot: {slotLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Rolls <strong>ready lagwad</strong> only. <strong>Sow (90% actual)</strong> stays on the expired
          window as a delayed sow record — not moved. Booking capacity is not rolled.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {hasPending && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="rounded-md border border-teal-300 bg-teal-100/80 px-2 py-1 text-xs font-semibold text-teal-950 tabular-nums">
              Ready to roll {(pendingTotal.readyPlants ?? 0).toLocaleString()}
              {(pendingTotal.sowRecordPlants ?? 0) > 0
                ? ` · Sow record on expired (stays): ${(pendingTotal.sowRecordPlants ?? 0).toLocaleString()}`
                : ""}
            </span>
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700">
              {pendingBySlot.length} expired window{pendingBySlot.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        {!hasPending ? (
          <p className="text-sm text-gray-500 py-4">No lagwad sellable left on expired windows.</p>
        ) : (
          <div className="space-y-4">
            {pendingBySlot.map((bucket) => (
              <LagwadWindowCard key={bucket.slotId} bucket={bucket} />
            ))}
          </div>
        )}

        {verifySlot?._id ? (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <LagwadBatchOrderCheckPanel
              slot={verifySlot}
              title="Today's slot — batch − order check"
            />
          </div>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        <Button onClick={onClose} disabled={rolling}>
          Close
        </Button>
        {canRoll && hasPending ? (
          <Button
            variant="contained"
            color="secondary"
            disabled={rolling}
            startIcon={
              rolling ? <CircularProgress size={18} color="inherit" /> : <RotateCcw className="w-4 h-4" />
            }
            onClick={handleRollAll}>
            {rolling ? "Rolling…" : "Roll all lagwad sellable"}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
