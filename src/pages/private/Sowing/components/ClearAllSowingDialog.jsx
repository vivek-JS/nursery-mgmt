import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  TextField,
  CircularProgress,
  Divider,
  Stack,
} from "@mui/material";
import {
  Warning,
  DeleteForever,
  Close,
  CheckCircle,
} from "@mui/icons-material";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";

const ClearAllSowingDialog = ({ open, onClose, onSuccess, sowingCount = 0 }) => {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const requiredText = "DELETE ALL";

  const handleClear = async () => {
    if (confirmText !== requiredText) {
      Toast.error(`Please type "${requiredText}" to confirm`);
      return;
    }

    setDeleting(true);
    try {
      const instance = NetworkManager(API.sowing.DELETE_ALL_SOWINGS);
      const response = await instance.request();

      if (response?.data) {
        Toast.success(
          `Successfully deleted ${response.data.deletedCount || sowingCount} sowing record${(response.data.deletedCount || sowingCount) !== 1 ? "s" : ""}`
        );
        onSuccess?.();
        onClose();
        setConfirmText("");
      }
    } catch (error) {
      console.error("Error clearing all sowings:", error);
      Toast.error(error?.response?.data?.message || "Failed to clear all sowings");
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setConfirmText("");
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={deleting}>
      <DialogTitle
        sx={{
          bgcolor: "#d32f2f",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <DeleteForever />
          Clear All Sowing Records
        </Box>
        {!deleting && (
          <Button
            onClick={handleClose}
            sx={{ color: "white", minWidth: "auto", p: 0.5 }}>
            <Close />
          </Button>
        )}
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        <Alert severity="error" icon={<Warning />} sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            ⚠️ Warning: This action cannot be undone!
          </Typography>
          <Typography variant="body2">
            This will permanently delete <strong>all {sowingCount.toLocaleString()} sowing records</strong> from
            the database.
          </Typography>
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            This action will:
          </Typography>
          <Stack spacing={1} sx={{ ml: 2 }}>
            <Typography variant="body2" color="textSecondary">
              • Delete all sowing records
            </Typography>
            <Typography variant="body2" color="textSecondary">
              • Remove all sowing history
            </Typography>
            <Typography variant="body2" color="textSecondary">
              • Clear all reminders and alerts
            </Typography>
            <Typography variant="body2" color="textSecondary">
              • Note: Slot data (primarySowed, officeSowed) will remain unchanged
            </Typography>
          </Stack>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            To confirm, please type <strong>&quot;{requiredText}&quot;</strong> below:
          </Typography>
          <TextField
            fullWidth
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder={requiredText}
            disabled={deleting}
            error={confirmText && confirmText !== requiredText}
            helperText={
              confirmText && confirmText !== requiredText
                ? `Please type "${requiredText}" exactly`
                : confirmText === requiredText
                ? "✓ Confirmation text matches"
                : ""
            }
            sx={{
              "& .MuiOutlinedInput-root": {
                fontWeight: 600,
                fontSize: "1.1rem",
              },
            }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
        <Button onClick={handleClose} variant="outlined" disabled={deleting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleClear}
          disabled={deleting || confirmText !== requiredText}
          startIcon={deleting ? <CircularProgress size={20} color="inherit" /> : <DeleteForever />}
          sx={{
            bgcolor: "#d32f2f",
            "&:hover": { bgcolor: "#b71c1c" },
          }}>
          {deleting ? "Deleting..." : "Delete All Sowing Records"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClearAllSowingDialog;






