import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";

const PAYMENT_QR_MODAL_TITLE = "Payment QR";

/**
 * Shared modal for displaying payment QR: image or string (UPI), order details, amount, 30-min countdown.
 * On expiry shows "Expired" and hides QR.
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {string} qrImageOrString - base64 image, data URL, or UPI string
 * @param {number} amount
 * @param {string} orderId
 * @param {string} customerName
 * @param {string} mobileNumber
 * @param {string|Date} expiresAt - ISO string or Date
 */
export default function PaymentQRModal({
  open,
  onClose,
  qrImageOrString,
  amount,
  orderId,
  customerName,
  mobileNumber,
  expiresAt,
}) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [expired, setExpired] = useState(false);

  const expiryDate = expiresAt ? new Date(expiresAt) : null;

  useEffect(() => {
    if (!open || !expiryDate) return;
    const tick = () => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((expiryDate - now) / 1000));
      setSecondsLeft(diff);
      setExpired(diff <= 0);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [open, expiryDate]);

  const qrImgSrc = (() => {
    if (!qrImageOrString || typeof qrImageOrString !== "string") return null;
    const s = qrImageOrString.trim();
    if (s.startsWith("data:image")) return s;
    if (s.startsWith("upi://") || s.startsWith("http")) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(s)}`;
    }
    if (s.length > 100 && !s.includes(" ")) {
      return `data:image/png;base64,${s}`;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(s)}`;
  })();

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{PAYMENT_QR_MODAL_TITLE}</DialogTitle>
      <DialogContent>
        <Box sx={{ textAlign: "center", py: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Order: {orderId}
          </Typography>
          {customerName && (
            <Typography variant="body2" color="text.secondary">
              {customerName}
              {mobileNumber ? ` · ${mobileNumber}` : ""}
            </Typography>
          )}
          <Typography variant="h6" sx={{ mt: 1, fontWeight: 700 }}>
            ₹{Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </Typography>
          {expired ? (
            <Box sx={{ py: 3, bgcolor: "action.hover", borderRadius: 2 }}>
              <Typography color="text.secondary">QR expired</Typography>
              <Typography variant="caption" color="text.secondary">
                Generate a new QR if needed
              </Typography>
            </Box>
          ) : (
            <>
              {qrImgSrc && (
                <Box
                  component="img"
                  src={qrImgSrc}
                  alt="Payment QR"
                  sx={{ maxWidth: 220, height: "auto", display: "block", mx: "auto", mt: 1 }}
                />
              )}
              {expiryDate && secondsLeft != null && (
                <Typography variant="body2" color="primary" sx={{ mt: 1, fontWeight: 600 }}>
                  Expires in {formatTime(secondsLeft)}
                </Typography>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
