import React, { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  Divider
} from "@mui/material"
import { Send, X, MessageSquare } from "lucide-react"
import { sendExotelSms } from "network/core/exotel"

const formatPhoneNumber = (phone) => {
  const cleaned = String(phone).replace(/\D/g, "")
  if (cleaned.startsWith("91") && cleaned.length === 12) return cleaned
  if (cleaned.length === 10) return "91" + cleaned
  if (cleaned.length === 11 && cleaned.startsWith("0")) return "91" + cleaned.slice(1)
  return cleaned
}

const SendSmsModal = ({ open, onClose }) => {
  const [to, setTo] = useState("")
  const [body, setBody] = useState("")
  const [from, setFrom] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const handleSend = async () => {
    const trimmedTo = to.trim()
    const trimmedBody = body.trim()
    if (!trimmedTo) {
      setError("Please enter a mobile number.")
      return
    }
    if (!trimmedBody) {
      setError("Please enter the SMS message body.")
      return
    }
    const phoneRegex = /^[+]?[0-9]{10,15}$/
    if (!phoneRegex.test(trimmedTo.replace(/\s/g, ""))) {
      setError("Please enter a valid 10–15 digit phone number.")
      return
    }
    if (trimmedBody.length > 2000) {
      setError("Message body cannot exceed 2000 characters.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const payload = {
        to: formatPhoneNumber(trimmedTo),
        body: trimmedBody
      }
      if (from.trim()) payload.from = from.trim()

      const response = await sendExotelSms(payload)

      if (response.success) {
        setSuccess(true)
        setTimeout(() => {
          onClose()
          setTo("")
          setBody("")
          setFrom("")
          setSuccess(false)
        }, 2500)
      } else {
        setError(response.error || "Failed to send SMS.")
      }
    } catch (err) {
      setError(err?.message || "Failed to send SMS. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setTo("")
    setBody("")
    setFrom("")
    setError(null)
    setSuccess(false)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <MessageSquare size={24} color="#6366f1" />
            <Box>
              <Typography variant="h6" fontWeight="bold">
                Send SMS (Exotel)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Send an SMS to any mobile number via Exotel
              </Typography>
            </Box>
          </Stack>
          <Button onClick={handleClose} size="small" sx={{ minWidth: "auto", p: 1 }}>
            <X size={20} />
          </Button>
        </Stack>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ pt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
            SMS sent successfully.
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            fullWidth
            label="To (mobile number)"
            placeholder="9876543210 or 919876543210"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            helperText="10-digit number; optional country code"
            disabled={loading}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            label="Message (Body)"
            placeholder="Enter your SMS text..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            multiline
            rows={4}
            helperText={`${body.length}/2000 characters`}
            disabled={loading}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
          <TextField
            fullWidth
            label="From (Sender ID, optional)"
            placeholder="EXOTEL or leave blank for default"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            helperText="Uses server default if empty (e.g. EXOTEL, 600XXX)"
            disabled={loading}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
          />
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={handleClose} disabled={loading} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
          onClick={handleSend}
          disabled={loading || !to.trim() || !body.trim()}
          sx={{
            borderRadius: 2,
            px: 3,
            bgcolor: "#6366f1",
            "&:hover": { bgcolor: "#4f46e5" }
          }}
        >
          {loading ? "Sending..." : "Send SMS"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SendSmsModal
