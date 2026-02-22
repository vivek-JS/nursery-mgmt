import React, { useState, useEffect } from "react"
import { ArrowRightLeft, Package, Users, X } from "lucide-react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  Box,
  Typography,
  CircularProgress,
  Stack,
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const TransferPlantsModal = ({ open, onClose, slot, plantId, subtypeId, year, onSuccess }) => {
  const [mode, setMode] = useState("capacity")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [capacityData, setCapacityData] = useState(null)
  const [ordersData, setOrdersData] = useState(null)

  const [targetSlotId, setTargetSlotId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (!open || !slot?._id) return
    setTargetSlotId("")
    setQuantity("")
    setReason("")
    setError("")
    setCapacityData(null)
    setOrdersData(null)
    if (mode === "capacity") {
      fetchCapacityOptions()
    } else {
      fetchOrdersTargets()
    }
  }, [open, slot?._id, mode])

  const fetchCapacityOptions = async () => {
    if (!slot?._id) return
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.slots.GET_TRANSFER_CAPACITY_OPTIONS)
      const response = await instance.request({}, { slotId: slot._id })
      if (response?.data?.success && response?.data?.data) {
        setCapacityData(response.data.data)
      } else {
        setError(response?.data?.message || "Failed to load transfer options")
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load transfer options")
    }
    setLoading(false)
  }

  const fetchOrdersTargets = async () => {
    if (!slot?._id) return
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.slots.GET_ORDERS_TRANSFER_TARGETS)
      const response = await instance.request({}, { slotId: slot._id })
      if (response?.data?.success && response?.data?.data) {
        setOrdersData(response.data.data)
      } else {
        setError(response?.data?.message || "Failed to load order transfer targets")
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load order transfer targets")
    }
    setLoading(false)
  }

  const handleModeChange = (_, newMode) => {
    setMode(newMode)
    setTargetSlotId("")
    setQuantity("")
    setCapacityData(null)
    setOrdersData(null)
  }

  const handleCapacitySubmit = async () => {
    if (!targetSlotId || !quantity || quantity <= 0) {
      Toast.error("Select target slot and enter quantity")
      return
    }
    const maxQty = Math.min(
      capacityData?.source?.availablePlants || 0,
      capacityData?.options?.find((o) => o.slotId === targetSlotId)?.availableCapacity ?? Infinity
    )
    if (Number(quantity) > maxQty) {
      Toast.error(`Maximum transferable: ${maxQty.toLocaleString()} plants`)
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const instance = NetworkManager(API.slots.TRANSFER_CAPACITY)
      const response = await instance.request({
        sourceSlotId: slot._id,
        targetSlotId,
        quantity: Number(quantity),
        reason,
      })
      if (response?.data?.success) {
        Toast.success(response?.data?.message || "Capacity transferred successfully")
        onSuccess?.()
        onClose()
      } else {
        const msg = response?.data?.message || response?.data?.error || "Transfer failed"
        setError(msg)
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Transfer failed"
      setError(msg)
    }
    setSubmitting(false)
  }

  const handleOrdersSubmit = async () => {
    if (!targetSlotId) {
      Toast.error("Select target slot")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const instance = NetworkManager(API.slots.TRANSFER_ORDERS)
      const response = await instance.request({
        sourceSlotId: slot._id,
        targetSlotId,
        reason,
      })
      if (response?.data?.success) {
        Toast.success(response?.data?.message || "Orders transferred successfully")
        onSuccess?.()
        onClose()
      } else {
        setError(response?.data?.message || "Transfer failed")
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Transfer failed")
    }
    setSubmitting(false)
  }

  const selectedCapacityOption = capacityData?.options?.find((o) => o.slotId === targetSlotId)
  const maxCapacityQty = selectedCapacityOption
    ? Math.min(
        capacityData?.source?.availablePlants || 0,
        selectedCapacityOption.availableCapacity ?? Infinity
      )
    : capacityData?.source?.availablePlants || 0

  const canSubmitCapacity =
    mode === "capacity" &&
    targetSlotId &&
    quantity &&
    Number(quantity) > 0 &&
    Number(quantity) <= maxCapacityQty

  const canSubmitOrders = mode === "orders" && targetSlotId && (ordersData?.options?.length ?? 0) > 0

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-green-600" />
          Transfer Plants
        </span>
        <button
          onClick={onClose}
          disabled={submitting}
          className="p-1 rounded hover:bg-gray-100 text-gray-500">
          <X className="w-5 h-5" />
        </button>
      </DialogTitle>
      <DialogContent>
        <Tabs value={mode} onChange={handleModeChange} sx={{ mb: 2 }}>
          <Tab label="Transfer Capacity" value="capacity" />
          <Tab label="Transfer Orders" value="orders" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Stack spacing={2}>
            {mode === "capacity" && capacityData && (
              <>
                <Box className="p-3 bg-gray-50 rounded-lg">
                  <Typography variant="subtitle2" fontWeight={600}>
                    Source Slot
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {capacityData.source?.subtypeName} • {capacityData.source?.startDay} –{" "}
                    {capacityData.source?.endDay} ({capacityData.source?.month})
                  </Typography>
                  <Typography variant="body2" className="flex items-center gap-1 mt-1">
                    <Package className="w-4 h-4 text-green-600" />
                    Available: {capacityData.source?.availablePlants?.toLocaleString() ?? 0} plants
                  </Typography>
                </Box>

                {capacityData.options?.length > 0 ? (
                  <>
                    <TextField
                      select
                      label="Target Slot"
                      size="small"
                      value={targetSlotId}
                      onChange={(e) => setTargetSlotId(e.target.value)}
                      fullWidth
                    >
                      {capacityData.options.map((opt) => (
                        <MenuItem key={opt.slotId} value={opt.slotId}>
                          {opt.startDay} – {opt.endDay} ({opt.month}) • Capacity:{" "}
                          {opt.availableCapacity?.toLocaleString() ?? 0}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Quantity to transfer"
                      type="number"
                      size="small"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      fullWidth
                      inputProps={{ min: 1, max: maxCapacityQty }}
                      helperText={`Max ${maxCapacityQty.toLocaleString()} plants`}
                    />
                    <TextField
                      label="Reason (optional)"
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No target slots found within date range.
                  </Typography>
                )}
              </>
            )}

            {mode === "orders" && ordersData && (
              <>
                <Box className="p-3 bg-gray-50 rounded-lg">
                  <Typography variant="subtitle2" fontWeight={600}>
                    Source Slot
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {ordersData.source?.subtypeName} • {ordersData.source?.startDay} –{" "}
                    {ordersData.source?.endDay} ({ordersData.source?.month})
                  </Typography>
                  <Typography variant="body2" className="flex items-center gap-1 mt-1">
                    <Users className="w-4 h-4 text-blue-600" />
                    {ordersData.source?.ordersCount ?? 0} order(s) •{" "}
                    {ordersData.source?.totalPlantsToTransfer?.toLocaleString() ?? 0} plants
                  </Typography>
                </Box>

                {ordersData.options?.length > 0 ? (
                  <>
                    <TextField
                      select
                      label="Target Slot"
                      size="small"
                      value={targetSlotId}
                      onChange={(e) => setTargetSlotId(e.target.value)}
                      fullWidth
                    >
                      {ordersData.options.map((opt) => (
                        <MenuItem key={opt.slotId} value={opt.slotId}>
                          {opt.startDay} – {opt.endDay} ({opt.month}) • Available:{" "}
                          {opt.availableCapacity?.toLocaleString() ?? 0}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      label="Reason (optional)"
                      size="small"
                      fullWidth
                      multiline
                      rows={2}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No target slots with sufficient capacity found.
                  </Typography>
                )}
              </>
            )}
          </Stack>
        )}

        {error && (
          <Typography variant="body2" color="error" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={mode === "capacity" ? handleCapacitySubmit : handleOrdersSubmit}
          disabled={
            submitting ||
            loading ||
            (mode === "capacity" ? !canSubmitCapacity : !canSubmitOrders)
          }
          sx={{ bgcolor: "#16a34a" }}
        >
          {submitting ? <CircularProgress size={20} /> : "Confirm Transfer"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TransferPlantsModal
