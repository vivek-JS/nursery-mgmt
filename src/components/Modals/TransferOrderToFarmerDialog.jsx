import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material"

const EMPTY_FORM = {
  name: "",
  mobileNumber: "",
  village: "",
  taluka: "",
  district: "",
  state: "Maharashtra",
}

export default function TransferOrderToFarmerDialog({
  open,
  onClose,
  sourceOrderDisplayId,
  existingFarmerName = "",
  submitting = false,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    setForm(EMPTY_FORM)
  }, [open, sourceOrderDisplayId])

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.({
      name: form.name.trim(),
      mobileNumber: form.mobileNumber.trim(),
      village: form.village.trim(),
      taluka: form.taluka.trim(),
      talukaName: form.taluka.trim(),
      district: form.district.trim(),
      districtName: form.district.trim(),
      state: form.state.trim() || "Maharashtra",
      stateName: form.state.trim() || "Maharashtra",
    })
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ pb: 1 }}>
          Transfer order to another farmer
          {sourceOrderDisplayId != null && (
            <Typography component="span" sx={{ display: "block", fontSize: "0.85rem", fontWeight: 500, color: "text.secondary", mt: 0.5 }}>
              Order #{sourceOrderDisplayId}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The current order will be cancelled. A new order opens with the same plant, slot, quantity, and rate — only the farmer details below change. Payment is not copied.
          </Typography>

          <Box sx={{ mb: 2, p: 1.5, borderRadius: 1.5, bgcolor: "grey.50", border: "1px solid", borderColor: "grey.200" }}>
            <Typography variant="caption" color="text.secondary">
              Current farmer
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {existingFarmerName || "—"}
            </Typography>
          </Box>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
            <TextField
              label="New farmer name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              fullWidth
              size="small"
              autoFocus
            />
            <TextField
              label="Mobile number"
              value={form.mobileNumber}
              onChange={(e) => setField("mobileNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
              required
              fullWidth
              size="small"
              inputProps={{ inputMode: "numeric" }}
            />
            <TextField
              label="Village"
              value={form.village}
              onChange={(e) => setField("village", e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Taluka"
              value={form.taluka}
              onChange={(e) => setField("taluka", e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="District"
              value={form.district}
              onChange={(e) => setField("district", e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="State"
              value={form.state}
              onChange={(e) => setField("state", e.target.value)}
              fullWidth
              size="small"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={submitting || !form.name.trim() || !form.mobileNumber.trim()}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            Cancel old &amp; open new order
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
