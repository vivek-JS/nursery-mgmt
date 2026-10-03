import React from "react"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material"

const fmtAmount = (n) =>
  n == null || n === "" ? "—" : `₹${Number(n).toLocaleString("en-IN")}`

/**
 * Shown after add-payment + bank check when the UTR and amount match the statement.
 */
export default function PaymentCompleteDialog({ open, onClose, payments = [], orderPaidOff = false }) {
  const rows = Array.isArray(payments) ? payments : []
  const title = "Payment complete"

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {orderPaidOff && (
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            This order is fully paid. The new payment matched the bank statement.
          </Typography>
        )}
        {!orderPaidOff && (
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            The payment matched a statement credit (same UTR and amount).
          </Typography>
        )}
        {rows.map((p) => (
          <Typography key={String(p._id || p.utrNumber)} variant="body2" sx={{ mb: 0.5 }}>
            {fmtAmount(p.paidAmount)}
            {p.utrNumber || p.transactionId ? ` · ${p.utrNumber || p.transactionId}` : ""}
            {p.message ? ` — ${p.message}` : ""}
          </Typography>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export function paymentHasBankRef(p) {
  if (!p || p.isWalletPayment) return false
  const mode = String(p.modeOfPayment || "").toLowerCase()
  if (mode === "cash" || mode === "discount" || mode === "wallet") return false
  return Boolean(
    String(p.utrNumber || "").trim() ||
      String(p.transactionId || "").trim() ||
      String(p.chequeNumber || "").trim()
  )
}

export function paymentsFromAddResponse(body, fallbackCount = 1) {
  if (Array.isArray(body?.savedPayments) && body.savedPayments.length) return body.savedPayments
  if (body?.savedPayment) return [body.savedPayment]
  const order = body?.updatedOrder || body?.data
  const list = order?.payment
  if (Array.isArray(list) && list.length) return list.slice(-Math.max(1, fallbackCount))
  return []
}
