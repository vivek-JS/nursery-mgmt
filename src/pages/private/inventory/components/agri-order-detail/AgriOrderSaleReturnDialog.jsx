import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { Close, Undo } from "@mui/icons-material";
import { Toast } from "helpers/toasts/toastHelper";
import { completeAgriSalesOrderWithReturn } from "./agriOrderDetailApi";

function clampReturnQty(value, max) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, max);
}

export function canSaleReturnOrder(order) {
  if (!order) return false;
  const status = String(order.orderStatus || "").toUpperCase();
  const dispatch = String(order.dispatchStatus || "").toUpperCase();
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  return (
    status === "DISPATCHED" ||
    dispatch === "DISPATCHED" ||
    dispatch === "IN_TRANSIT"
  );
}

export default function AgriOrderSaleReturnDialog({ open, order, onClose, onSuccess }) {
  const orderId = order?._id || order?.id;
  const orderQty = Number(order?.quantity || 0);
  const alreadyReturned = Number(order?.returnQuantity || order?.salesReturnQuantity || 0);
  const maxReturn = Math.max(0, orderQty - alreadyReturned);

  const [returnQty, setReturnQty] = useState(0);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReturnQty(0);
    setReturnReason("");
    setReturnNotes("");
  }, [open, orderId]);

  const deliveringQty = useMemo(
    () => Math.max(0, orderQty - alreadyReturned - returnQty),
    [orderQty, alreadyReturned, returnQty]
  );

  const customerLabel =
    order?.customerName ||
    order?.details?.farmer?.name ||
    order?.farmerName ||
    "—";

  const handleSubmit = async () => {
    if (!orderId) return;
    if (returnQty <= 0) {
      Toast.error("Enter a sale return quantity greater than 0");
      return;
    }
    if (returnQty > maxReturn) {
      Toast.error(`Return qty cannot exceed ${maxReturn}`);
      return;
    }
    if (!returnReason.trim()) {
      Toast.error("Return reason is required");
      return;
    }

    setSubmitting(true);
    try {
      await completeAgriSalesOrderWithReturn({
        orderId,
        returnQuantity: returnQty,
        returnReason: returnReason.trim(),
        returnNotes: returnNotes.trim(),
      });
      Toast.success(
        `Sale return recorded for #${order?.orderNumber || ""} — payment adjusted to delivered qty`
      );
      onSuccess?.();
      onClose?.();
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Sale return failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "linear-gradient(90deg, #e65100 0%, #ef6c00 100%)",
          background: "linear-gradient(90deg, #e65100 0%, #ef6c00 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pr: 6,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Undo />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
            Sale Return
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Order #{order?.orderNumber || "—"} · Mark delivered with returns
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={submitting}
          sx={{ position: "absolute", right: 8, top: 8, color: "#fff" }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "#fafafa" }}>
        <Box
          sx={{
            p: 2,
            mb: 2,
            bgcolor: "#fff",
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                {order?.orderNumber || "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {customerLabel}
                {order?.customerVillage || order?.customerTaluka
                  ? ` · ${[order.customerTaluka, order.customerVillage].filter(Boolean).join(" → ")}`
                  : ""}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={`Qty: ${orderQty}`}
              sx={{ bgcolor: "#fff3e0", color: "#e65100", fontWeight: 700 }}
            />
          </Box>

          {alreadyReturned > 0 && (
            <Typography variant="caption" color="warning.dark" display="block" sx={{ mb: 1 }}>
              Already returned: {alreadyReturned}
            </Typography>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 88 }}>
              Return Qty
            </Typography>
            <TextField
              size="small"
              type="number"
              value={returnQty}
              onChange={(e) => setReturnQty(clampReturnQty(e.target.value, maxReturn))}
              inputProps={{ min: 0, max: maxReturn }}
              sx={{ width: 110 }}
            />
            <Typography variant="caption" color="text.secondary">
              / {maxReturn} max
            </Typography>
            {returnQty > 0 && (
              <Chip
                size="small"
                color="success"
                variant="outlined"
                label={`Delivering: ${deliveringQty}`}
              />
            )}
          </Box>
        </Box>

        {returnQty > 0 && (
          <TextField
            fullWidth
            size="small"
            required
            label="Return Reason"
            placeholder="e.g., Damaged, Wrong product, Customer refused"
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            sx={{ mb: 2, bgcolor: "#fff" }}
          />
        )}

        <TextField
          fullWidth
          size="small"
          label="Notes (optional)"
          placeholder="Any additional notes..."
          value={returnNotes}
          onChange={(e) => setReturnNotes(e.target.value)}
          multiline
          minRows={2}
          sx={{ mb: 2, bgcolor: "#fff" }}
        />

        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            bgcolor: "#fff8e1",
            border: "1px solid #ffe082",
          }}
        >
          <Typography variant="caption" fontWeight={700} color="#e65100" display="block" sx={{ mb: 0.5 }}>
            SUMMARY
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Order qty: {orderQty}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Sale return: {returnQty}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Final: {deliveringQty}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          {returnQty > 0 && (
            <Alert severity="warning" sx={{ py: 0, mb: 1 }}>
              Returned stock may be added back to inventory (office / manager roles).
            </Alert>
          )}
          <Typography variant="caption" color="primary.main" fontWeight={600}>
            Payment will be adjusted based on final delivered quantity (original − returns).
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, bgcolor: "#f5f5f5" }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || maxReturn <= 0 || returnQty <= 0}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Undo />}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            bgcolor: "#ef6c00",
            "&:hover": { bgcolor: "#e65100" },
          }}
        >
          {submitting ? "Processing…" : "Confirm Sale Return"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
