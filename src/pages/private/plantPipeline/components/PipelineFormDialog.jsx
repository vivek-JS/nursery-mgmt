import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function PipelineFormDialog({
  open,
  onClose,
  title,
  subtitle,
  stageColor = "#059669",
  onSubmit,
  submitLabel = "Save",
  submitting = false,
  children,
  maxWidth = "sm",
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, overflow: "hidden" },
      }}
    >
      <Box
        component="form"
        onSubmit={onSubmit}
        sx={{ display: "flex", flexDirection: "column", maxHeight: "90vh" }}
      >
        <DialogTitle
          sx={{
            m: 0,
            py: 2,
            px: 2.5,
            bgcolor: `${stageColor}12`,
            borderBottom: `3px solid ${stageColor}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box flex={1}>
              <Typography variant="h6" fontWeight={700}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
            <IconButton size="small" onClick={onClose} aria-label="Close">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2.5, py: 2 }}>
          {children}
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={submitting} sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{
              borderRadius: 2,
              px: 3,
              bgcolor: stageColor,
              "&:hover": { bgcolor: stageColor, filter: "brightness(0.92)" },
            }}
          >
            {submitting ? "Saving…" : submitLabel}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
