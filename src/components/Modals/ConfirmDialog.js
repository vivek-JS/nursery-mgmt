import React from "react"
import Dialog from "@mui/material/Dialog"
import DialogActions from "@mui/material/DialogActions"
import DialogContent from "@mui/material/DialogContent"
import DialogTitle from "@mui/material/DialogTitle"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"

const ConfirmDialog = ({ open, title, description, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      {title && <DialogTitle>{title}</DialogTitle>}
      <DialogContent>
        <Typography variant="body1">{description}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="secondary" variant="outlined">
          No
        </Button>
        <Button onClick={onConfirm} color="primary" variant="contained">
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmDialog
