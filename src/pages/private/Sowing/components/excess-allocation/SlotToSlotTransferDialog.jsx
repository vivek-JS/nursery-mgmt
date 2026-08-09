import React, { useCallback, useEffect, useState } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import { Toast } from "helpers/toasts/toastHelper"
import {
  fetchSlotTransferTargets,
  transferSlotToSlot,
  fmtNum,
} from "./excessAllocationApi"

/**
 * Move available plants between slots (same plant/subtype). No order cover in this step.
 */
export default function SlotToSlotTransferDialog({
  open,
  onClose,
  onDone,
  slotId,
  slotLabel = "",
  mode = "out",
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState(null)
  const [peerId, setPeerId] = useState("")
  const [qty, setQty] = useState("")
  const [error, setError] = useState("")

  const isIn = mode === "in"
  const options = isIn ? data?.sources || [] : data?.destinations || []
  const sourceAvail = isIn
    ? options.find((o) => o.slotId === peerId)?.availablePlants || 0
    : data?.slot?.availablePlants || 0

  const load = useCallback(async () => {
    if (!slotId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetchSlotTransferTargets(slotId)
      setData(res)
      const list = isIn ? res?.sources || [] : res?.destinations || []
      setPeerId(list[0]?.slotId || "")
    } catch (e) {
      setData(null)
      setError(e?.message || "Failed to load slots")
    } finally {
      setLoading(false)
    }
  }, [slotId, isIn])

  useEffect(() => {
    if (open && slotId) load()
    if (!open) {
      setData(null)
      setPeerId("")
      setQty("")
      setError("")
    }
  }, [open, slotId, load])

  const fromSlotId = isIn ? peerId : slotId
  const toSlotId = isIn ? slotId : peerId
  const maxQty = isIn ? sourceAvail : data?.slot?.availablePlants || 0

  const handleSubmit = async () => {
    const plants = Math.max(0, Math.floor(Number(qty) || 0))
    if (!fromSlotId || !toSlotId) {
      Toast.error("Pick a slot")
      return
    }
    if (plants <= 0 || plants > maxQty) {
      Toast.error(`Enter 1–${fmtNum(maxQty)} plants`)
      return
    }
    setSaving(true)
    try {
      const res = await transferSlotToSlot(fromSlotId, { toSlotId, plants })
      Toast.success(res.message || "Transferred")
      onDone?.()
      onClose?.()
    } catch (e) {
      Toast.error(e?.message || "Transfer failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SwapHorizIcon color="primary" />
          <span>{isIn ? "Receive plants into slot" : "Move plants out of slot"}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {slotLabel || "This slot"} · slot-to-slot only (no order cover yet)
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <Stack spacing={2}>
            {!isIn && (
              <Alert severity="info" icon={false} sx={{ py: 0.75 }}>
                Available here: <strong>{fmtNum(data?.slot?.availablePlants || 0)}</strong>
              </Alert>
            )}
            <FormControl fullWidth size="small">
              <InputLabel>{isIn ? "From slot (has stock)" : "To slot"}</InputLabel>
              <Select
                value={peerId}
                label={isIn ? "From slot (has stock)" : "To slot"}
                onChange={(e) => setPeerId(e.target.value)}
              >
                {options.map((o) => (
                  <MenuItem key={o.slotId} value={o.slotId}>
                    {o.label}
                    {o.availablePlants > 0 ? ` · ${fmtNum(o.availablePlants)} avail` : ""}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {options.length === 0 && (
              <Alert severity="warning">
                {isIn ? "No other slot has available stock." : "No destination slots found."}
              </Alert>
            )}
            <TextField
              size="small"
              label="Plants to move"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              inputProps={{ min: 1, max: maxQty }}
              helperText={`Max ${fmtNum(maxQty)}`}
              fullWidth
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || loading || !peerId || options.length === 0}
        >
          {saving ? "Moving…" : "Transfer"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
