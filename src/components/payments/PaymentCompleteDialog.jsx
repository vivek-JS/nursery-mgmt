import React from "react"
import { keyframes } from "@mui/system"
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material"


const popIn = keyframes`
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.18); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`
const ripple = keyframes`
  0% { transform: scale(0.6); opacity: 0.55; }
  100% { transform: scale(2.1); opacity: 0; }
`
const drawCheck = keyframes`
  to { stroke-dashoffset: 0; }
`
const confettiFall = keyframes`
  0% { transform: translate3d(0, -20px, 0) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translate3d(var(--dx), 150px, 0) rotate(var(--rot)); opacity: 0; }
`

const CONFETTI_COLORS = ["#2e7d32", "#fbc02d", "#e91e63", "#29b6f6", "#ff7043", "#8e24aa", "#66bb6a"]
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  dx: `${((i * 53) % 90) - 45}px`,
  rot: `${360 + ((i * 97) % 540)}deg`,
  delay: `${((i * 61) % 50) / 100}s`,
  dur: `${1.5 + ((i * 29) % 12) / 10}s`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  round: i % 3 === 0,
}))

/** Green tick that pops in, ripples and rains confetti. Pure CSS, no extra packages. */
function PaymentSuccessCelebration() {
  return (
    <Box
      aria-hidden
      sx={{
        position: "relative",
        height: 132,
        mb: 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "@media (prefers-reduced-motion: reduce)": {
          "& *": { animation: "none !important" },
        },
      }}
    >
      {CONFETTI.map((c, i) => (
        <Box
          key={i}
          sx={{
            position: "absolute",
            top: 0,
            left: c.left,
            width: 8,
            height: c.round ? 8 : 12,
            borderRadius: c.round ? "50%" : "2px",
            bgcolor: c.color,
            opacity: 0,
            "--dx": c.dx,
            "--rot": c.rot,
            animation: `${confettiFall} ${c.dur} ease-out ${c.delay} 1 forwards`,
          }}
        />
      ))}
      <Box sx={{ position: "relative", width: 76, height: 76 }}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            bgcolor: "success.main",
            opacity: 0,
            animation: `${ripple} 1.2s ease-out 0.25s 2`,
          }}
        />
        <Box
          sx={{
            position: "relative",
            width: 76,
            height: 76,
            borderRadius: "50%",
            bgcolor: "success.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 18px rgba(46,125,50,0.4)",
            animation: `${popIn} 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: 24,
                animation: `${drawCheck} 0.45s ease-out 0.4s forwards`,
              }}
            />
          </svg>
        </Box>
      </Box>
    </Box>
  )
}

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
  const celebrate = !checking && !skipReason && rows.length > 0 && rows.every((p) => p.result === "VERIFIED")

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{ fontSize: 16, fontWeight: 700, pb: 1, ...(celebrate && { textAlign: "center", color: "success.main" }) }}
      >
        {celebrate ? "🎉 Payment received!" : title}
      </DialogTitle>
      <DialogContent>
        {celebrate && <PaymentSuccessCelebration />}
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
          <Typography
            variant="body2"
            sx={{ mb: rows.length ? 1.5 : 0, fontSize: 13, ...(celebrate && { textAlign: "center" }) }}
          >
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
