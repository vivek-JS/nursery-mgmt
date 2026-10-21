import React, { useEffect, useState } from "react"
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

export default function RequestPacketsStockUpdateDialog({
  open,
  packing,
  shortfall,
  onClose,
  onUpdated,
}) {
  const [quantityDelta, setQuantityDelta] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const need = Math.max(0, Number(shortfall) || 0)
    setQuantityDelta(need > 0 ? String(Number(need.toFixed(2))) : "")
    setBatchNumber("")
    setExpiryDate("")
  }, [open, shortfall])

  if (!open || !packing?.productId) return null

  const stock = Number(packing.availablePackets) || 0
  const delta = Number(quantityDelta)
  const preview = Number.isFinite(delta) && delta !== 0 ? Math.max(0, stock + delta) : null

  const handleSave = async () => {
    if (!Number.isFinite(delta) || delta === 0) {
      Toast.error("Enter a non-zero quantity")
      return
    }
    if (stock + delta < 0) {
      Toast.error("Stock cannot go below zero")
      return
    }
    try {
      setSaving(true)
      const instance = NetworkManager(API.INVENTORY.POST_PRODUCT_MANUAL_STOCK)
      const res = await instance.request(
        {
          quantityDelta: delta,
          batchNumber: String(batchNumber || "").trim() || undefined,
          expiryDate: expiryDate || undefined,
        },
        [packing.productId]
      )
      const body = res?.data
      if (!(body?.status === "Success" || body?.success)) {
        throw new Error(body?.message || "Stock update failed")
      }
      Toast.success("Stock updated")
      onUpdated?.(stock + delta)
      onClose?.()
    } catch (e) {
      Toast.error(e?.response?.data?.message || e.message || "Stock update failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Update stock
        <Typography variant="body2" color="text.secondary">
          {packing.name || packing.code || "Seed"} · now {stock} pkt
          {shortfall > 0 ? ` · short ${Number(shortfall).toFixed(2)} pkt` : ""}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <TextField
            size="small"
            type="number"
            label="Quantity change"
            value={quantityDelta}
            onChange={(e) => setQuantityDelta(e.target.value)}
            helperText={preview != null ? `After: ${preview} pkt` : "Positive adds stock"}
          />
          <TextField
            size="small"
            label="Batch # (optional)"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
          />
          <TextField
            size="small"
            type="date"
            label="Expiry (optional)"
            InputLabelProps={{ shrink: true }}
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disableElevation
          onClick={handleSave}
          disabled={saving}
          sx={{ textTransform: "none", bgcolor: "teal", "&:hover": { bgcolor: "#0f766e" } }}
        >
          Save stock
        </Button>
      </DialogActions>
    </Dialog>
  )
}
