import React from "react"
import { Dialog, DialogContent, DialogTitle, Typography } from "@mui/material"
import RequestPacketsAddStockPanel from "./RequestPacketsAddStockPanel"

export default function RequestPacketsStockUpdateDialog({
  open,
  packing,
  shortfall,
  onClose,
  onUpdated,
}) {
  if (!open || !packing?.productId) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        Add stock
        <Typography variant="body2" color="text.secondary">
          {packing.name || packing.code || "Seed"}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 2.5 }}>
        <RequestPacketsAddStockPanel
          packing={packing}
          shortfall={shortfall}
          onSaved={(next) => {
            onUpdated?.(next)
            onClose?.()
          }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
