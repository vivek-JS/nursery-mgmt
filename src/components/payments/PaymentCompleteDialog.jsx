import React, { useEffect, useRef, useState } from "react"
import { keyframes } from "@mui/system"
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material"

// ---------------------------------------------------------------------------------------------
// Celebration shown when the bank statement confirms a payment (same UTR and amount).
// Pure CSS / SVG animation, no extra packages. Honors prefers-reduced-motion.
// ---------------------------------------------------------------------------------------------
const popIn = keyframes`
  0% { transform: scale(0) rotate(-30deg); opacity: 0; }
  55% { transform: scale(1.22) rotate(6deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
`
const ringOut = keyframes`
  0% { transform: scale(0.55); opacity: 0.7; }
  100% { transform: scale(2.8); opacity: 0; }
`
const draw = keyframes`
  to { stroke-dashoffset: 0; }
`
const glowPulse = keyframes`
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 0.95; transform: scale(1.12); }
`
const burst = keyframes`
  0% { transform: translate(0, 0) scale(0) rotate(0deg); opacity: 0; }
  12% { opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(1) rotate(var(--rot)); opacity: 0; }
`
const confettiFall = keyframes`
  0% { transform: translate3d(0, -24px, 0) rotate(0deg); opacity: 0; }
  12% { opacity: 1; }
  100% { transform: translate3d(var(--dx), 230px, 0) rotate(var(--rot)); opacity: 0; }
`
const riseIn = keyframes`
  0% { transform: translateY(14px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
`
const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const CONFETTI_COLORS = ["#ffd54f", "#ffffff", "#ff80ab", "#80d8ff", "#b9f6ca", "#ffab40", "#ea80fc"]
const BURST = Array.from({ length: 44 }, (_, i) => {
  const angle = (i / 44) * Math.PI * 2 + (i % 2 ? 0.07 : -0.05)
  const dist = 78 + ((i * 41) % 70)
  return {
    tx: `${Math.round(Math.cos(angle) * dist)}px`,
    ty: `${Math.round(Math.sin(angle) * dist)}px`,
    rot: `${(i * 83) % 720}deg`,
    delay: `${0.28 + ((i * 17) % 18) / 100}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + ((i * 7) % 6),
    round: i % 3 !== 0,
  }
})
const RAIN = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 37 + 5) % 100}%`,
  dx: `${((i * 53) % 80) - 40}px`,
  rot: `${300 + ((i * 97) % 600)}deg`,
  delay: `${0.7 + ((i * 61) % 90) / 100}s`,
  dur: `${1.8 + ((i * 29) % 14) / 10}s`,
  color: CONFETTI_COLORS[(i + 2) % CONFETTI_COLORS.length],
  round: i % 4 === 0,
}))

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

/** Counts 0 -> target with an ease-out, so the rupee amount "lands". */
function useCountUp(target, active, duration = 1100) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!active) return undefined
    if (prefersReducedMotion()) {
      setValue(target)
      return undefined
    }
    let raf
    const t0 = performance.now()
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration)
      setValue(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return value
}

/** Two soft rising notes, like a payment-received chime. Silent if audio is not allowed. */
function playChime() {
  try {
    if (prefersReducedMotion()) return
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const now = ctx.currentTime
    ;[
      [659.25, 0],
      [987.77, 0.14],
    ].forEach(([freq, at]) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + at)
      gain.gain.exponentialRampToValueAtTime(0.16, now + at + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.45)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + at)
      osc.stop(now + at + 0.5)
    })
    setTimeout(() => ctx.close().catch(() => {}), 1200)
  } catch {
    /* audio is a nicety, never a blocker */
  }
}

function SuccessHero() {
  return (
    <Box
      aria-hidden
      sx={{
        position: "relative",
        height: 230,
        overflow: "hidden",
        background: "linear-gradient(160deg, #1b5e20 0%, #2e7d32 42%, #43a047 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        "@media (prefers-reduced-motion: reduce)": { "& *": { animation: "none !important" } },
      }}
    >
      {/* soft glow behind the badge */}
      <Box
        sx={{
          position: "absolute",
          width: 230,
          height: 230,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 68%)",
          animation: `${glowPulse} 2.4s ease-in-out infinite`,
        }}
      />
      {/* confetti rain */}
      {RAIN.map((c, i) => (
        <Box
          key={`r${i}`}
          sx={{
            position: "absolute",
            top: 0,
            left: c.left,
            width: c.round ? 7 : 6,
            height: c.round ? 7 : 12,
            borderRadius: c.round ? "50%" : "2px",
            bgcolor: c.color,
            opacity: 0,
            "--dx": c.dx,
            "--rot": c.rot,
            animation: `${confettiFall} ${c.dur} ease-in ${c.delay} 1 forwards`,
          }}
        />
      ))}
      {/* expanding rings */}
      {[0.2, 0.55, 0.9].map((d) => (
        <Box
          key={d}
          sx={{
            position: "absolute",
            width: 84,
            height: 84,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.8)",
            opacity: 0,
            animation: `${ringOut} 1.6s ease-out ${d}s 1 forwards`,
          }}
        />
      ))}
      {/* radial burst from the badge */}
      {BURST.map((c, i) => (
        <Box
          key={`b${i}`}
          sx={{
            position: "absolute",
            width: c.size,
            height: c.round ? c.size : c.size * 1.7,
            borderRadius: c.round ? "50%" : "2px",
            bgcolor: c.color,
            opacity: 0,
            "--tx": c.tx,
            "--ty": c.ty,
            "--rot": c.rot,
            animation: `${burst} 1.25s cubic-bezier(0.15, 0.7, 0.3, 1) ${c.delay} 1 forwards`,
          }}
        />
      ))}
      {/* the badge */}
      <Box
        sx={{
          position: "relative",
          width: 92,
          height: 92,
          borderRadius: "50%",
          bgcolor: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.28), 0 0 0 8px rgba(255,255,255,0.22)",
          animation: `${popIn} 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both`,
        }}
      >
        <svg width="62" height="62" viewBox="0 0 52 52" fill="none">
          <circle
            cx="26"
            cy="26"
            r="23"
            stroke="#2e7d32"
            strokeWidth="3.5"
            strokeLinecap="round"
            style={{ strokeDasharray: 145, strokeDashoffset: 145, animation: `${draw} 0.7s ease-out 0.25s forwards` }}
          />
          <path
            d="M15 27.5l8 8L37.5 19"
            stroke="#2e7d32"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ strokeDasharray: 36, strokeDashoffset: 36, animation: `${draw} 0.45s ease-out 0.75s forwards` }}
          />
        </svg>
      </Box>
    </Box>
  )
}

function PaymentSuccessPanel({ rows, orderPaidOff }) {
  const total = rows.reduce((s, p) => s + (Number(p.paidAmount) || 0), 0)
  const shown = useCountUp(total, true)
  const chimed = useRef(false)

  useEffect(() => {
    if (chimed.current) return
    chimed.current = true
    playChime()
  }, [])

  const amountText = `₹${shown.toLocaleString("en-IN", {
    minimumFractionDigits: total % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  })}`

  return (
    <Box>
      <SuccessHero />
      <Box sx={{ px: 3, pt: 2.5, pb: 1, textAlign: "center" }}>
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: 0.2,
            color: "success.dark",
            animation: `${riseIn} 0.5s ease-out 0.8s both`,
          }}
        >
          Payment received!
        </Typography>
        <Typography
          sx={{
            mt: 0.5,
            fontSize: 38,
            fontWeight: 800,
            lineHeight: 1.15,
            fontVariantNumeric: "tabular-nums",
            background: "linear-gradient(90deg, #1b5e20, #43a047, #1b5e20)",
            backgroundSize: "200% 100%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: `${riseIn} 0.5s ease-out 0.9s both, ${shimmer} 3s linear 1.6s infinite`,
          }}
        >
          {amountText}
        </Typography>
        <Box sx={{ mt: 1.25, animation: `${riseIn} 0.5s ease-out 1.05s both` }}>
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label="✓ Verified with the bank statement"
            sx={{ fontWeight: 600, bgcolor: "rgba(46,125,50,0.06)" }}
          />
        </Box>
        {orderPaidOff && (
          <Typography
            sx={{ mt: 1.25, fontSize: 14, fontWeight: 700, color: "success.main", animation: `${riseIn} 0.5s ease-out 1.15s both` }}
          >
            🎉 This order is now fully paid
          </Typography>
        )}
        <Box sx={{ mt: 1.5, animation: `${riseIn} 0.5s ease-out 1.2s both` }}>
          {rows.map((p) => (
            <Typography
              key={String(p._id || p.utrNumber)}
              sx={{ fontSize: 12.5, color: "text.secondary", fontFamily: "monospace" }}
            >
              {rows.length > 1 ? `${fmtAmount(p.paidAmount)} · ` : ""}
              UTR {p.utrNumber || p.transactionId || "—"}
            </Typography>
          ))}
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

  if (celebrate) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <PaymentSuccessPanel rows={rows} orderPaidOff={orderPaidOff} />
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, justifyContent: "center" }}>
          <Button
            onClick={onClose}
            variant="contained"
            color="success"
            sx={{ minWidth: 160, borderRadius: 5, fontWeight: 700, textTransform: "none", boxShadow: "0 6px 16px rgba(46,125,50,0.35)" }}
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>
    )
  }

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
