import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Typography,
  Box,
  Alert,
} from "@mui/material"
import { Toast } from "helpers/toasts/toastHelper"
import { formatInr, settleDealerCommission } from "features/commission-management/commissionApi"

const paymentModeOptions = ["Cash", "UPI", "Cheque", "NEFT/RTGS"]

export default function CommissionSettleDialog({
  open,
  onClose,
  onSuccess,
  dealer,
  unsettled = 0,
  totalPaymentOutstanding = 0,
  actualCommission = 0,
  alreadySettled = 0,
  startDate = "",
  endDate = "",
}) {
  const [form, setForm] = useState({
    amount: "",
    remark: "",
    modeOfPayment: "",
    transactionId: "",
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        amount: unsettled > 0 ? String(unsettled) : "",
        remark: "",
        modeOfPayment: "",
        transactionId: "",
      })
    }
  }, [open, unsettled])

  const handleSubmit = async () => {
    if (!dealer?._id) {
      Toast.error("Select a dealer")
      return
    }
    if (unsettled <= 0) {
      Toast.error("Nothing to settle")
      return
    }

    const amt = Number(form.amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      Toast.error("Enter a valid settlement amount")
      return
    }
    if (amt > unsettled) {
      Toast.error(`Amount cannot exceed unsettled balance (${formatInr(unsettled)})`)
      return
    }

    setSubmitting(true)
    try {
      await settleDealerCommission(dealer._id, {
        amount: amt,
        remark: form.remark,
        modeOfPayment: form.modeOfPayment,
        transactionId: form.transactionId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      Toast.success(`Commission settled — ${formatInr(amt)} recorded (not added to wallet)`)
      onSuccess?.()
      onClose()
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Settlement failed")
    } finally {
      setSubmitting(false)
    }
  }

  const fillMax = () => setForm((f) => ({ ...f, amount: String(unsettled) }))

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Settle commission</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 1.5, fontSize: "0.9rem" }}>
          Dealer: <strong>{dealer?.name || "—"}</strong>
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box component="span" sx={{ display: "block" }}>
            Commission unsettled (max pay now): <strong>{formatInr(unsettled)}</strong>
          </Box>
          <Box component="span" sx={{ display: "block", mt: 0.75, fontSize: "0.85rem" }}>
            Farmer payment still outstanding (orders): <strong>{formatInr(totalPaymentOutstanding)}</strong>
          </Box>
          <Box component="span" sx={{ display: "block", mt: 0.5, fontSize: "0.8rem", color: "text.secondary" }}>
            Actual commission: {formatInr(actualCommission)} · Already settled: {formatInr(alreadySettled)}
          </Box>
          <Box component="span" sx={{ display: "block", mt: 0.5, fontSize: "0.78rem", color: "text.secondary" }}>
            Settlement is recorded on the dealer <strong>ledger</strong> only — it does not change wallet cash.
          </Box>
          {(startDate || endDate) && (
            <Box component="span" sx={{ display: "block", mt: 0.5, fontSize: "0.8rem" }}>
              Period: {startDate || "—"} to {endDate || "—"}
            </Box>
          )}
        </Alert>
        <Box sx={{ display: "flex", gap: 1, mb: 1.5, alignItems: "flex-start" }}>
          <TextField
            fullWidth
            size="small"
            label="Settlement amount (₹)"
            type="number"
            inputProps={{ min: 0, step: 1 }}
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            helperText="Partial settlement allowed — up to unsettled balance"
          />
          <Button size="small" variant="outlined" onClick={fillMax} sx={{ mt: 0.5, flexShrink: 0, whiteSpace: "nowrap" }}>
            Max
          </Button>
        </Box>
        <TextField
          select
          fullWidth
          size="small"
          label="Payment mode"
          value={form.modeOfPayment}
          onChange={(e) => setForm((f) => ({ ...f, modeOfPayment: e.target.value }))}
          SelectProps={{ native: true }}
          sx={{ mb: 1.5 }}
        >
          <option value="" />
          {paymentModeOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </TextField>
        <TextField
          fullWidth
          size="small"
          label="Transaction ID / UTR"
          value={form.transactionId}
          onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
          sx={{ mb: 1.5 }}
        />
        <TextField
          fullWidth
          size="small"
          multiline
          minRows={2}
          label="Remark"
          value={form.remark}
          onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || unsettled <= 0}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {submitting ? "Settling…" : "Confirm settlement"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
