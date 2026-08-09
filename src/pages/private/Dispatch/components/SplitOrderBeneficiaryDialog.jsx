import React from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Divider,
} from "@mui/material"
import { Person as PersonIcon, Close as CloseIcon } from "@mui/icons-material"
import SplitOrderBeneficiaryForm from "./SplitOrderBeneficiaryForm"

/** Standalone beneficiary dialog (used when split + beneficiary are not combined). */
const SplitOrderBeneficiaryDialog = ({
  open,
  childOrder,
  parentOrder,
  onClose,
  onSaved,
}) => {
  const childOrderNumber = childOrder?.orderId ?? childOrder?.order ?? "—"

  if (!childOrder) return null

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PersonIcon fontSize="small" />
          <Typography variant="h6" component="span">
            Set beneficiary — Order #{childOrderNumber}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        <SplitOrderBeneficiaryForm
          childOrder={childOrder}
          parentOrder={parentOrder}
          onSkip={onClose}
          onSaved={() => {
            onSaved?.()
            onClose?.()
          }}
          showSplitBanner={false}
        />
      </DialogContent>
    </Dialog>
  )
}

export default SplitOrderBeneficiaryDialog
