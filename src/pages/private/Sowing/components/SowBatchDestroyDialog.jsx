import React, { useEffect, useState } from "react"
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { fmt } from "../capacitySheetUtils"

const REASONS = ["Dead", "Damaged", "Disease", "Germination failed"]

/** Destroy sown plants of one slot sowing batch: lowers the slot's sowed, survivors and free stock. */
export default function SowBatchDestroyDialog({ batch, open, onClose, onDone }) {
  const max = Number(batch?.plantsLeft) || 0
  const [qty, setQty] = useState("")
  const [reason, setReason] = useState(REASONS[0])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setQty("")
      setReason(REASONS[0])
    }
  }, [open])

  const value = Math.floor(Number(qty) || 0)
  const invalid = value < 1 || value > max

  const submit = async () => {
    if (!batch?.slotId || !batch?.batchId || invalid) return
    setSubmitting(true)
    try {
      const instance = NetworkManager(API.sowing.DESTROY_SOW_BATCH)
      await instance.request({
        slotId: batch.slotId,
        batchId: batch.batchId,
        quantity: value,
        reason
      })
      Toast.success(`${fmt(value)} sown plants destroyed`)
      onClose?.()
      onDone?.()
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Could not save")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !submitting && onClose?.()} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Destroy sown plants</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" mb={1}>
          {batch?.requestNumber || "Sowing batch"}
          {batch?.sowingDate ? ` · sown ${batch.sowingDate}` : ""}
          {batch?.shedName ? ` · ${batch.shedName}` : ""}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Left <b>{fmt(max)}</b> of {fmt(batch?.plantsSowed)} sown
          {Number(batch?.destroyedPlants) > 0
            ? ` · already destroyed ${fmt(batch.destroyedPlants)}`
            : ""}
        </Typography>
        <TextField
          autoFocus
          fullWidth
          size="small"
          type="number"
          label="Plants destroyed"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          error={qty !== "" && invalid}
          helperText={qty !== "" && value > max ? `Max ${fmt(max)}` : " "}
          inputProps={{ min: 1, max }}
        />
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {REASONS.map((r) => (
            <Button
              key={r}
              size="small"
              variant={reason === r ? "contained" : "outlined"}
              color="error"
              onClick={() => setReason(r)}
              sx={{ textTransform: "none", fontWeight: 700, borderRadius: 99, boxShadow: "none" }}>
              {r}
            </Button>
          ))}
        </Stack>
        <Alert severity="info" sx={{ mt: 1.5, py: 0 }}>
          Slot sowed and free-to-sell stock go down by this amount.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ color: "#64748b" }}>
          Cancel
        </Button>
        <Button variant="contained" color="error" disabled={submitting || invalid} onClick={submit}>
          Mark destroyed
        </Button>
      </DialogActions>
    </Dialog>
  )
}
