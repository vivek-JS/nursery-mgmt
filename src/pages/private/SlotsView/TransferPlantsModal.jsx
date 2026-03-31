import React, { useState, useEffect, useMemo } from "react"
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
  Checkbox,
  FormControlLabel,
  FormGroup,
  Divider,
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const TransferPlantsModal = ({ open, onClose, slot, onSuccess }) => {
  const [mode, setMode] = useState("capacity")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const [capacityData, setCapacityData] = useState(null)
  const [ordersData, setOrdersData] = useState(null)

  const [targetSlotId, setTargetSlotId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")

  /** Set of order _id strings eligible for transfer */
  const [selectedOrderIds, setSelectedOrderIds] = useState(() => new Set())

  useEffect(() => {
    if (!open || !slot?._id) return
    setTargetSlotId("")
    setQuantity("")
    setReason("")
    setError("")
    setCapacityData(null)
    setOrdersData(null)
    setSelectedOrderIds(new Set())
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
        const data = response.data.data
        setOrdersData(data)
        const list = data.orders || []
        setSelectedOrderIds(new Set(list.map((o) => o._id).filter(Boolean)))
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
    setSelectedOrderIds(new Set())
  }

  const ordersList = ordersData?.orders || []

  const sourceOrdersCount = ordersData?.source?.ordersCount ?? 0
  const sourceTotalPlants = Number(ordersData?.source?.totalPlantsToTransfer) || 0
  /** Older API or missing `orders` array: slot still has orders per `source` */
  const legacyNoOrderList = sourceOrdersCount > 0 && ordersList.length === 0

  const selectedPlantsTotal = useMemo(() => {
    let sum = 0
    for (const o of ordersList) {
      if (selectedOrderIds.has(o._id)) {
        sum += Number(o.numberOfPlants) || 0
      }
    }
    return sum
  }, [ordersList, selectedOrderIds])

  /** Plant total used to filter target slots (selected subset, or full slot total in legacy mode). */
  const plantsForTargetFilter = useMemo(() => {
    if (ordersList.length > 0) return selectedPlantsTotal
    if (legacyNoOrderList && sourceTotalPlants > 0) return sourceTotalPlants
    return 0
  }, [ordersList.length, selectedPlantsTotal, legacyNoOrderList, sourceTotalPlants])

  const eligibleTargetOptions = useMemo(() => {
    const opts = ordersData?.options || []
    if (plantsForTargetFilter <= 0) return []
    return opts.filter((o) => (Number(o.availableCapacity) || 0) >= plantsForTargetFilter)
  }, [ordersData?.options, plantsForTargetFilter])

  const toggleOrder = (orderId) => {
    if (!orderId) return
    setSelectedOrderIds((prev) => {
      const next = new Set(prev)
      if (next.has(orderId)) next.delete(orderId)
      else next.add(orderId)
      return next
    })
    setTargetSlotId("")
  }

  const selectAllOrders = () => {
    setSelectedOrderIds(new Set(ordersList.map((o) => o._id).filter(Boolean)))
    setTargetSlotId("")
  }

  const clearOrderSelection = () => {
    setSelectedOrderIds(new Set())
    setTargetSlotId("")
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
    if (!legacyNoOrderList && selectedOrderIds.size === 0) {
      Toast.error("Select at least one order to transfer")
      return
    }
    const ids = Array.from(selectedOrderIds)
    const transferAll =
      legacyNoOrderList ||
      (ordersList.length > 0 &&
        ids.length === ordersList.length &&
        ordersList.every((o) => ids.includes(o._id)))

    setSubmitting(true)
    setError("")
    try {
      const instance = NetworkManager(API.slots.TRANSFER_ORDERS)
      const payload = {
        sourceSlotId: slot._id,
        targetSlotId,
        reason,
      }
      if (!transferAll) {
        payload.orderIds = ids
      }
      const response = await instance.request(payload)
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

  const canSubmitOrders =
    mode === "orders" &&
    targetSlotId &&
    plantsForTargetFilter > 0 &&
    eligibleTargetOptions.some((o) => o.slotId === targetSlotId)

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
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

                {legacyNoOrderList && (
                  <Typography variant="body2" color="textSecondary">
                    Per-order selection requires the latest API. This transfer will move{" "}
                    <strong>all {sourceOrdersCount.toLocaleString()} order(s)</strong> (
                    {sourceTotalPlants.toLocaleString()} plants) to the target slot.
                  </Typography>
                )}

                {ordersList.length > 0 && (
                  <>
                    <Box className="flex flex-wrap items-center justify-between gap-2">
                      <Typography variant="subtitle2" fontWeight={600}>
                        Orders to transfer
                      </Typography>
                      <Box className="flex gap-1">
                        <Button size="small" onClick={selectAllOrders}>
                          Select all
                        </Button>
                        <Button size="small" onClick={clearOrderSelection}>
                          Clear
                        </Button>
                      </Box>
                    </Box>
                    <Typography variant="caption" color="textSecondary">
                      Selected: {selectedOrderIds.size} order(s), {selectedPlantsTotal.toLocaleString()} plants
                    </Typography>
                    <FormGroup sx={{ maxHeight: 220, overflow: "auto", border: "1px solid #eee", borderRadius: 1, p: 1 }}>
                      {ordersList.map((o) => (
                        <FormControlLabel
                          key={o._id}
                          control={
                            <Checkbox
                              size="small"
                              checked={selectedOrderIds.has(o._id)}
                              onChange={() => toggleOrder(o._id)}
                            />
                          }
                          label={
                            <span>
                              <strong>#{o.orderId}</strong>
                              {o.farmerName ? ` — ${o.farmerName}` : ""}
                              {o.farmerMobileNumber ? ` (${o.farmerMobileNumber})` : ""} —{" "}
                              {(Number(o.numberOfPlants) || 0).toLocaleString()} plants
                            </span>
                          }
                        />
                      ))}
                    </FormGroup>
                    <Divider />
                  </>
                )}

                {(ordersData.options?.length ?? 0) > 0 &&
                  eligibleTargetOptions.length === 0 &&
                  plantsForTargetFilter > 0 && (
                  <Typography variant="body2" color="warning.main">
                    No target slot has enough free capacity for the selected {plantsForTargetFilter.toLocaleString()}{" "}
                    plants. Select fewer orders or pick another slot window.
                  </Typography>
                )}

                {eligibleTargetOptions.length > 0 ? (
                  <>
                    <TextField
                      select
                      label="Target Slot"
                      size="small"
                      value={targetSlotId}
                      onChange={(e) => setTargetSlotId(e.target.value)}
                      fullWidth
                    >
                      {eligibleTargetOptions.map((opt) => (
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
                ) : sourceOrdersCount === 0 || sourceTotalPlants <= 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No eligible orders in this slot (nothing to transfer).
                  </Typography>
                ) : legacyNoOrderList ? (
                  <Typography variant="body2" color="textSecondary">
                    {(ordersData.options?.length ?? 0) === 0
                      ? "No target slots with free capacity in the date window."
                      : "Pick a target slot with enough free capacity for all orders in this slot."}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    {(ordersData.options?.length ?? 0) === 0
                      ? "No target slots with free capacity in the date window."
                      : "Select orders above, then choose a target slot."}
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
