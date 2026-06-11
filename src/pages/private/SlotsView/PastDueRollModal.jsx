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
} from "@mui/material"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { OrderTable } from "./PastDueSlotBreakdown"

export default function PastDueRollModal({
  open,
  onClose,
  detail,
  slotLabel,
  plantId,
  subtypeId,
  canRoll = false,
  onRolled,
}) {
  const d = detail || {}
  const pendingBySlot = d.pendingBySlot || []
  const pendingTotal = d.pendingTotal || { orderCount: 0, plants: 0 }
  const [rolling, setRolling] = useState(false)

  const handleRollAll = async () => {
    if (!canRoll) {
      Toast.error("You do not have permission to run past-due rollover")
      return
    }
    if ((pendingTotal.orderCount ?? 0) < 1) {
      Toast.error("No pending orders to roll")
      return
    }
    const ok = window.confirm(
      `Move ${pendingTotal.orderCount} order(s) (${(pendingTotal.plants ?? 0).toLocaleString()} plants) from expired slot windows to today's active slot for this plant/subtype?`
    )
    if (!ok) return

    setRolling(true)
    try {
      const instance = NetworkManager(API.slots.RUN_PAST_DUE_ROLLOVER)
      const response = await instance.request({
        plantId,
        subtypeId,
        dryRun: false,
      })
      if (response?.code !== 200 && response?.success === false) {
        Toast.error(response?.data?.message || response?.message || "Rollover failed")
        return
      }
      const payload = response?.data?.data ?? response?.data ?? response
      const moved = payload?.ordersMoved ?? 0
      const skipped = payload?.ordersSkipped ?? 0
      const errors = payload?.errors?.length ?? 0

      if (moved > 0) {
        Toast.success(
          `Rolled ${moved} order${moved === 1 ? "" : "s"}${
            skipped ? ` · ${skipped} skipped` : ""
          }`
        )
        onRolled?.()
        onClose()
      } else if (errors > 0) {
        Toast.error(payload?.errors?.[0]?.reason || "Rollover completed with errors")
        onRolled?.()
      } else {
        Toast.info("No orders were moved — they may already be on the active slot")
        onRolled?.()
        onClose()
      }
    } catch (err) {
      console.error("Past-due rollover:", err)
      Toast.error(err?.message || "Past-due rollover failed")
    } finally {
      setRolling(false)
    }
  }

  return (
    <Dialog open={open} onClose={rolling ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <span>Pending roll — expired windows</span>
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Today&apos;s slot: {slotLabel}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <p className="text-sm text-gray-600 mb-4">
          These farmer orders are still booked on <strong>expired</strong> delivery windows
          (open pipeline: accepted through ready-for-dispatch). Rolling moves each order to this
          subtype&apos;s <strong>active slot</strong> and updates delivery date — not dealer-quota
          orders.
        </p>

        {(pendingTotal.orderCount ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="rounded-md border border-orange-300 bg-orange-100/80 px-2 py-1 text-xs font-semibold text-orange-950 tabular-nums">
              {pendingTotal.orderCount} orders · {pendingTotal.plants.toLocaleString()} plants
            </span>
            <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700">
              {pendingBySlot.length} expired window{pendingBySlot.length === 1 ? "" : "s"}
            </span>
          </div>
        )}

        {!pendingBySlot.length ? (
          <p className="text-sm text-gray-500 py-4">No pending orders on expired windows.</p>
        ) : (
          <div className="space-y-4">
            {pendingBySlot.map((bucket) => (
              <div
                key={bucket.slotId}
                className="rounded-lg border border-orange-200 bg-orange-50/50 overflow-hidden">
                <div className="px-3 py-2 border-b border-orange-200/80 flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Expired window</p>
                    <p className="text-xs text-gray-600">{bucket.label}</p>
                  </div>
                  <p className="text-xs font-bold text-orange-900 tabular-nums shrink-0">
                    {bucket.orderCount} orders · {bucket.plants.toLocaleString()} plants
                  </p>
                </div>
                <div className="p-2 bg-white">
                  <OrderTable orders={bucket.orders} emptyLabel="No orders" />
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, gap: 1 }}>
        <Button onClick={onClose} disabled={rolling}>
          Close
        </Button>
        {canRoll && (pendingTotal.orderCount ?? 0) > 0 ? (
          <Button
            variant="contained"
            color="warning"
            disabled={rolling}
            startIcon={
              rolling ? <CircularProgress size={18} color="inherit" /> : <RotateCcw className="w-4 h-4" />
            }
            onClick={handleRollAll}>
            {rolling ? "Rolling…" : `Roll all ${pendingTotal.orderCount} orders`}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}
