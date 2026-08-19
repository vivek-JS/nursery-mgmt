import React, { useEffect, useState } from "react"
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { dialogPaperSx, fmt } from "./lagwadAnalysisUi"

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    "&.Mui-focused fieldset": { borderColor: "#06b6d4" }
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#0e7490" }
}

/**
 * Moves plants from the 10% mortality reserve into the ready pool on the same slot.
 * The sellable pool is untouched — those plants were already counted at lagwad.
 */
const MortalityTransferDialog = ({ slot, open, onClose, onDone }) => {
  const max = Number(slot?.expectedMortality) || 0
  const [qty, setQty] = useState(String(max))
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setQty(String(max))
  }, [open, max])

  const submit = async (override) => {
    if (!slot?._id) return
    const value = Math.min(max, Math.max(1, Math.floor(Number(override ?? qty) || 0)))
    if (value < 1 || max < 1) {
      Toast.error("No mortality to transfer")
      return
    }
    setSubmitting(true)
    try {
      const instance = NetworkManager(API.slots.TRANSFER_EXPECTED_MORTALITY)
      await instance.request({ quantity: value }, [slot._id])
      Toast.success(`Transferred ${fmt(value)} to ready`)
      onClose?.()
      onDone?.()
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Transfer failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onClose?.()}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: { sx: dialogPaperSx },
        backdrop: { sx: { backgroundColor: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(3px)" } }
      }}>
      <DialogTitle className="text-base font-bold text-slate-900">
        Transfer expected mortality to ready
      </DialogTitle>
      <DialogContent>
        <p className="mb-3 text-sm text-slate-600">
          Slot <strong className="text-slate-900">{slot?.label}</strong>. Moves plants from the{" "}
          <strong className="text-rose-600">10% mortality reserve</strong> into{" "}
          <strong className="text-cyan-700">ready to dispatch</strong> once they are confirmed to
          have survived.
        </p>
        <p className="mb-2 text-xs text-slate-500">
          Available to transfer: <strong className="text-slate-900">{fmt(max)}</strong>
        </p>
        <TextField
          fullWidth
          size="small"
          type="number"
          label="Plants to transfer"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputProps={{ min: 1, max }}
          sx={fieldSx}
        />
      </DialogContent>
      <DialogActions className="gap-2 px-4 pb-3">
        <Button onClick={onClose} disabled={submitting} sx={{ color: "#64748b" }}>
          Cancel
        </Button>
        <Button
          variant="outlined"
          disabled={submitting || max < 1}
          onClick={() => submit(max)}
          sx={{ color: "#0e7490", borderColor: "#a5f3fc" }}>
          Transfer all
        </Button>
        <Button
          variant="contained"
          disabled={submitting}
          onClick={() => submit()}
          sx={{ backgroundColor: "#0891b2", "&:hover": { backgroundColor: "#0e7490" } }}>
          Transfer
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default MortalityTransferDialog
