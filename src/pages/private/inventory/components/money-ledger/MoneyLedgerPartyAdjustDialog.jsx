import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Close, LocalOffer, Payments } from "@mui/icons-material";
import { Toast } from "helpers/toasts/toastHelper";
import { addMoneyLedgerPartyPayment, addMoneyLedgerPartyDiscount } from "./moneyLedgerApi";

const MODES = ["Cash", "UPI", "Cheque", "NEFT/RTGS", "Card", "Bank Transfer"];

function todayIstYmd() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Party-scoped Payment or Discount on Ram Agri unified ledger (no document required).
 * Discount / payment auto posts on the minus side of net balance.
 */
export default function MoneyLedgerPartyAdjustDialog({
  open,
  onClose,
  onSuccess,
  kind = "PAYMENT", // PAYMENT | DISCOUNT
  book = "RAM_AGRI",
  partyType,
  partyId,
  partyName = "",
  netBalance = 0,
}) {
  const [amount, setAmount] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("Cash");
  const [entryDate, setEntryDate] = useState(() => todayIstYmd());
  const [remark, setRemark] = useState("");
  const [direction, setDirection] = useState("AUTO");
  const [submitting, setSubmitting] = useState(false);

  const isDiscount = String(kind).toUpperCase() === "DISCOUNT";
  const net = Number(netBalance) || 0;
  const bookId = String(book || "RAM_AGRI").toUpperCase() === "BIOTECH" ? "BIOTECH" : "RAM_AGRI";
  const bookLabel = bookId === "BIOTECH" ? "Biotech Master" : "Ram Agri Input";

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setRemark("");
    setModeOfPayment("Cash");
    setDirection("AUTO");
    setEntryDate(todayIstYmd());
  }, [open, kind, partyId, bookId]);

  const autoHint =
    net < 0
      ? isDiscount
        ? "Auto: Debit AP — purchase discount (we owe ↓)"
        : "Auto: Debit AP — we pay the party"
      : isDiscount
        ? "Auto: Credit AR — sale discount (they owe ↓)"
        : "Auto: Credit AR — collect from party";

  const handleSubmit = async () => {
    const amt = Number.parseFloat(amount);
    if (!partyType || !partyId) {
      Toast.error("Select a party first");
      return;
    }
    if (!(amt > 0)) {
      Toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        partyType,
        partyId,
        amount: amt,
        entryDate,
        remark: remark.trim(),
        book: bookId,
        direction,
      };
      if (isDiscount) {
        await addMoneyLedgerPartyDiscount(payload);
        Toast.success(`Discount submitted for approval (${bookLabel})`);
      } else {
        await addMoneyLedgerPartyPayment({
          ...payload,
          modeOfPayment,
          kind: "PAYMENT",
        });
        Toast.success(`Payment submitted for approval (${bookLabel})`);
      }
      onSuccess?.();
      onClose?.();
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 6 }}>
        {isDiscount ? <LocalOffer color="warning" /> : <Payments color="primary" />}
        <Box>
          <Typography fontWeight={800}>{isDiscount ? "Add Discount" : "Add Payment"}</Typography>
          <Typography variant="caption" color="text.secondary">
            {partyName || "Party"} · {bookLabel}
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ position: "absolute", right: 8, top: 8, minWidth: 0 }}
        >
          <Close />
        </Button>
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity={isDiscount ? "warning" : "info"} sx={{ mb: 2 }}>
          {autoHint}
          <br />
          Current net: ₹{net.toLocaleString("en-IN")}{" "}
          {net > 0 ? "(they owe)" : net < 0 ? "(we owe)" : "(settled)"}
          <br />
          Goes to Accounting Dashboard first — accepted by Accountant / Super Admin / Agri Input
          Master, then posts to Money Ledger.
        </Alert>

        <TextField
          fullWidth
          size="small"
          type="number"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={{ mb: 2 }}
          inputProps={{ min: 0, step: "any" }}
        />

        {!isDiscount && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Mode</InputLabel>
            <Select
              label="Mode"
              value={modeOfPayment}
              onChange={(e) => setModeOfPayment(e.target.value)}
            >
              {MODES.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Direction</InputLabel>
          <Select
            label="Direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
          >
            <MenuItem value="AUTO">Auto (− reduces balance)</MenuItem>
            <MenuItem value="COLLECT">Collect / discount given (Credit AR)</MenuItem>
            <MenuItem value="PAY">Pay / purchase discount (Debit AP)</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          size="small"
          type="date"
          label="Date"
          InputLabelProps={{ shrink: true }}
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Remark"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={isDiscount ? "warning" : "primary"}
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {submitting ? (
            <CircularProgress size={20} color="inherit" />
          ) : isDiscount ? (
            "Confirm discount"
          ) : (
            "Confirm payment"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
