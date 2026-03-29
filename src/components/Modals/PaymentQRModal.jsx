import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
} from "@mui/material"
import ChatIcon from "@mui/icons-material/Chat"
import ContentCopyIcon from "@mui/icons-material/ContentCopy"
import ShareIcon from "@mui/icons-material/Share"
import axiosInstance from "services/axiosConfig"
import { Toast } from "helpers/toasts/toastHelper"

const PAYMENT_QR_MODAL_TITLE = "Payment QR"

/** Digits only; 10-digit India mobile → 91… for wa.me */
function whatsappChatDigits(mobile) {
  if (!mobile) return ""
  let d = String(mobile).replace(/\D/g, "")
  if (d.length === 10) d = `91${d}`
  return d.length >= 11 ? d : ""
}

async function copyTextToClipboard(text) {
  const t = String(text ?? "")
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(t)
    return
  }
  const ta = document.createElement("textarea")
  ta.value = t
  ta.setAttribute("readonly", "")
  ta.style.position = "fixed"
  ta.style.left = "-9999px"
  document.body.appendChild(ta)
  ta.select()
  try {
    const ok = document.execCommand("copy")
    if (!ok) throw new Error("copy failed")
  } finally {
    document.body.removeChild(ta)
  }
}

function openWhatsAppShareUrl(text) {
  const q = encodeURIComponent(text)
  // wa.me text limit is tight on some clients — keep message reasonable
  const max = 3500
  const body = q.length > max ? encodeURIComponent(text.slice(0, max) + "…") : q
  window.open(`https://wa.me/?text=${body}`, "_blank", "noopener,noreferrer")
}

function openWhatsAppToNumber(digits, text) {
  const q = encodeURIComponent(text)
  const max = 3500
  const body = q.length > max ? encodeURIComponent(text.slice(0, max) + "…") : q
  window.open(`https://wa.me/${digits}?text=${body}`, "_blank", "noopener,noreferrer")
}

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
 * @param {string} [merchantTranId] - ICICI merchant transaction id (same as qrReferenceId for QR flows)
 * @param {string} [qrReferenceId] - alias for merchantTranId when only ref id is passed
 * @param {() => void|Promise<void>} [onVerified] - called after successful ICICI status check (e.g. refresh order)
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
  merchantTranId,
  qrReferenceId,
  onVerified,
}) {
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [expired, setExpired] = useState(false)
  const [iciciChecking, setIciciChecking] = useState(false)
  const [copyBusy, setCopyBusy] = useState(false)

  const refId =
    (merchantTranId && String(merchantTranId).trim()) ||
    (qrReferenceId && String(qrReferenceId).trim()) ||
    ""

  const expiryDate = expiresAt ? new Date(expiresAt) : null

  useEffect(() => {
    if (!open || !expiryDate) return
    const tick = () => {
      const now = new Date()
      const diff = Math.max(0, Math.floor((expiryDate - now) / 1000))
      setSecondsLeft(diff)
      setExpired(diff <= 0)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [open, expiryDate])

  const handleCheckIciciStatus = async () => {
    if (!refId) {
      Toast.error("No ICICI transaction reference for this QR")
      return
    }
    setIciciChecking(true)
    try {
      await axiosInstance.get(`/api/payments/icici/status/${encodeURIComponent(refId)}`)
      Toast.success("ICICI payment status checked — bank fields updated if matched")
      if (typeof onVerified === "function") {
        await onVerified()
      }
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "ICICI status check failed"
      Toast.error(msg)
    } finally {
      setIciciChecking(false)
    }
  }

  const qrImgSrc = (() => {
    if (!qrImageOrString || typeof qrImageOrString !== "string") return null
    const s = qrImageOrString.trim()
    if (s.startsWith("data:image")) return s
    if (s.startsWith("upi://") || s.startsWith("http")) {
      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(s)}`
    }
    if (s.length > 100 && !s.includes(" ")) {
      return `data:image/png;base64,${s}`
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(s)}`
  })()

  const buildShareMessage = () => {
    const amt = Number(amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })
    const lines = [
      "Ram Nursery — payment request",
      `Order: ${orderId ?? "—"}`,
      `Amount: ₹${amt}`,
    ]
    if (customerName) lines.push(`Customer: ${customerName}`)
    if (expired) {
      lines.push("Note: This QR session may have expired — ask for a new QR if needed.")
    }
    const raw = String(qrImageOrString || "").trim()
    if (raw.startsWith("upi://") || /^https?:\/\//i.test(raw)) {
      lines.push("Pay using this link:", raw)
    } else if (!expired && qrImgSrc && /^https?:\/\//i.test(qrImgSrc)) {
      lines.push("Open this link to view the payment QR:", qrImgSrc)
    } else if (!expired && raw.startsWith("data:image")) {
      lines.push("Scan the QR shown in the app, or use Copy message below.")
    }
    if (refId) lines.push(`Ref: ${refId}`)
    return lines.join("\n")
  }

  const handleWhatsApp = () => {
    const msg = buildShareMessage()
    const digits = whatsappChatDigits(mobileNumber)
    if (digits) {
      openWhatsAppToNumber(digits, msg)
    } else {
      openWhatsAppShareUrl(msg)
    }
  }

  const handleCopyShareMessage = async () => {
    setCopyBusy(true)
    try {
      await copyTextToClipboard(buildShareMessage())
      Toast.success("Copied — paste in WhatsApp or any chat")
    } catch {
      Toast.error("Could not copy")
    } finally {
      setCopyBusy(false)
    }
  }

  const handleSystemShare = async () => {
    const msg = buildShareMessage()
    const raw = String(qrImageOrString || "").trim()
    let url = ""
    if (raw.startsWith("upi://") || /^https?:\/\//i.test(raw)) url = raw
    else if (!expired && qrImgSrc && /^https?:\/\//i.test(qrImgSrc)) url = qrImgSrc

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "Payment QR",
          text: msg,
          url: url || undefined,
        })
      } catch (e) {
        if (e?.name !== "AbortError") {
          await handleCopyShareMessage()
        }
      }
    } else {
      await handleCopyShareMessage()
    }
  }

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  const waDigits = whatsappChatDigits(mobileNumber)

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
          {refId && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, wordBreak: "break-all" }}>
              Ref: {refId}
            </Typography>
          )}

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              mt: 2,
              width: "100%",
              alignItems: "stretch",
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", px: 0.5 }}>
              Share this payment (WhatsApp, SMS, etc.) — no WATI; uses your WhatsApp app.
            </Typography>
            <Button
              variant="contained"
              color="success"
              size="medium"
              startIcon={<ChatIcon />}
              onClick={handleWhatsApp}
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              {waDigits ? "WhatsApp customer" : "WhatsApp (choose contact)"}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              disabled={copyBusy}
              onClick={handleCopyShareMessage}
              sx={{ textTransform: "none" }}
            >
              {copyBusy ? "Copying…" : "Copy message"}
            </Button>
            {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
              <Button
                variant="text"
                size="small"
                startIcon={<ShareIcon />}
                onClick={handleSystemShare}
                sx={{ textTransform: "none" }}
              >
                Share via phone…
              </Button>
            )}
          </Box>

          {refId && (
            <Button
              variant="outlined"
              size="small"
              disabled={iciciChecking}
              onClick={handleCheckIciciStatus}
              sx={{ mt: 1.5 }}
            >
              {iciciChecking ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Checking…
                </>
              ) : (
                "Check payment status (ICICI)"
              )}
            </Button>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}
