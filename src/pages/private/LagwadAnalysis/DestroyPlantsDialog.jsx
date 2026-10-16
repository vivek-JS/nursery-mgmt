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
    "&.Mui-focused fieldset": { borderColor: "#e11d48" }
  },
  "& .MuiInputLabel-root.Mui-focused": { color: "#be123c" }
}

const REASONS = ["Dead", "Damaged", "Disease", "Weak / rejected"]

/** Records destroyed plants on one lagwad line; the 10% mortality reserve absorbs them first. */
const DestroyPlantsDialog = ({ line, open, onClose, onDone }) => {
  const max = Number(line?.availableQuantity) || 0
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
    if (!line?.batchId || !line?.secondaryInwardId || invalid) return
    setSubmitting(true)
    try {
      const instance = NetworkManager(API.PLANT_OUTWARD.SECONDARY_INWARD_DESTROY)
      await instance.request(
        { quantity: value, reason },
        { pathParams: [String(line.batchId), String(line.secondaryInwardId)] }
      )
      Toast.success(`${fmt(value)} plants marked destroyed`)
      onClose?.()
      onDone?.()
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Could not save")
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
      <DialogTitle className="text-base font-bold text-slate-900">Destroyed plants</DialogTitle>
      <DialogContent>
        <p className="mb-3 text-sm text-slate-600">
          Batch <strong className="text-slate-900">{line?.batchNumber}</strong>
          {line?.size ? ` · ${line.size}` : ""}
          {line?.pollyhouse ? ` · ${line.pollyhouse}` : ""}
        </p>
        <p className="mb-3 text-xs text-slate-500">
          Left in shed: <strong className="text-slate-900">{fmt(max)}</strong>
          {Number(line?.destroyedQuantity) > 0 && (
            <>
              {" "}
              · already destroyed{" "}
              <strong className="text-rose-600">{fmt(line.destroyedQuantity)}</strong>
            </>
          )}
        </p>
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
          sx={fieldSx}
        />
        <div className="mt-1 flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                reason === r
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}>
              {r}
            </button>
          ))}
        </div>
      </DialogContent>
      <DialogActions className="gap-2 px-4 pb-3">
        <Button onClick={onClose} disabled={submitting} sx={{ color: "#64748b" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={submitting || invalid}
          onClick={submit}
          sx={{ backgroundColor: "#e11d48", "&:hover": { backgroundColor: "#be123c" } }}>
          Mark destroyed
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DestroyPlantsDialog
