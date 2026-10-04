import React from "react"
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material"

const fmtAmount = (n) =>
  n == null || n === "" ? "—" : `₹${Number(n).toLocaleString("en-IN")}`

function resultLabel(result) {
  switch (result) {
    case "VERIFIED":
      return "Matched"
    case "NOT_FOUND":
      return "Not on the statement"
    case "AMOUNT_MISMATCH":
      return "Amount does not match"
    case "NEEDS_REVIEW":
      return "Needs review"
    case "MULTIPLE_MATCH":
      return "More than one match"
    case "ERROR":
      return "Bank check failed"
    default:
      return "Checking"
  }
}

function dialogCopy({ checking, payments, skipReason, orderPaidOff }) {
  if (checking) {
    return {
      title: "Checking with bank",
      body: "Looking up this UTR and amount on the statement.",
    }
  }
  if (skipReason === "no-id") {
    return {
      title: "Bank check",
      body: "Payment saved, but the bank check could not start (no payment id). Use Check bank on the payment row.",
    }
  }
  if (skipReason === "no-order") {
    return {
      title: "Bank check",
      body: "Payment saved, but the bank check could not start (order id missing).",
    }
  }
  const results = (payments || []).map((p) => p.result)
  const allVerified = results.length > 0 && results.every((r) => r === "VERIFIED")
  if (allVerified) {
    return {
      title: "Payment complete",
      body: orderPaidOff
        ? "This order is fully paid. The new payment matched the bank statement."
        : "The payment matched a statement credit (same UTR and amount).",
    }
  }
  return {
    title: "Bank check",
    body: "The payment is saved. This is what the statement showed.",
  }
}

/**
 * After add-payment: always shown while the bank check runs, then the result.
 * Close is always available. A match is not required to open this dialog.
 */
export default function PaymentCompleteDialog({
  open,
  onClose,
  checking = false,
  payments = [],
  orderPaidOff = false,
  skipReason = null,
}) {
  const rows = Array.isArray(payments) ? payments : []
  const { title, body } = dialogCopy({ checking, payments: rows, skipReason, orderPaidOff })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 700, pb: 1 }}>{title}</DialogTitle>
      <DialogContent>
        {checking && (
          <Typography
            variant="body2"
            sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, fontSize: 13 }}
          >
            <CircularProgress size={16} />
            {body}
          </Typography>
        )}
        {!checking && (
          <Typography variant="body2" sx={{ mb: rows.length ? 1.5 : 0, fontSize: 13 }}>
            {body}
          </Typography>
        )}
        {rows.map((p) => (
          <Typography key={String(p._id || p.utrNumber)} variant="body2" sx={{ mb: 0.75, fontSize: 13 }}>
            {fmtAmount(p.paidAmount)}
            {p.utrNumber || p.transactionId ? ` · ${p.utrNumber || p.transactionId}` : ""}
            {` — ${p.message || resultLabel(p.result)}`}
          </Typography>
        ))}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 1.5 }}>
        <Button onClick={onClose} variant="contained" size="small">
          Close
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
  if (!body || typeof body !== "object") return []
  const nested = body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : null
  if (Array.isArray(body.savedPayments) && body.savedPayments.length) return body.savedPayments
  if (Array.isArray(nested?.savedPayments) && nested.savedPayments.length) return nested.savedPayments
  if (body.savedPayment) return [body.savedPayment]
  if (nested?.savedPayment) return [nested.savedPayment]
  const order = body.updatedOrder || nested?.updatedOrder || body.data
  const list = order?.payment
  if (Array.isArray(list) && list.length) return list.slice(-Math.max(1, fallbackCount))
  return []
}
