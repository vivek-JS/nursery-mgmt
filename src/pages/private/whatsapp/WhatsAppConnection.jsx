import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  Chip,
} from "@mui/material"
import { Link2, LogOut, QrCode, RefreshCw, Send, Shield } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { API, NetworkManager } from "network/core"
import { useHasWhatsAppAccess } from "utils/roleUtils"

const STATUS_LABEL = {
  connected: { label: "Connected", color: "success" },
  qr: { label: "Scan QR", color: "warning" },
  connecting: { label: "Connecting…", color: "info" },
  reconnecting: { label: "Reconnecting…", color: "info" },
  needs_scan: { label: "Needs scan", color: "warning" },
  logged_out: { label: "Logged out", color: "default" },
  replaced: { label: "Taken over by another server", color: "error" },
  disabled: { label: "Disabled", color: "default" },
  idle: { label: "Idle", color: "default" },
}

const WhatsAppConnection = () => {
  const hasAccess = useHasWhatsAppAccess()
  const [data, setData] = useState(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")
  const [pairingPhone, setPairingPhone] = useState("")
  const [pairingCode, setPairingCode] = useState("")
  const [info, setInfo] = useState("")
  const mounted = useRef(true)

  const fetchStatus = useCallback(async () => {
    try {
      const instance = NetworkManager(API.WHATSAPP_CONNECTION.STATUS)
      const res = await instance.request({}, { watch: 1 })
      if (!mounted.current) return
      if (res?.success) {
        setData(res.data?.data || res.data)
        setError("")
      } else {
        setError(res?.message || "Failed to load WhatsApp status")
      }
    } catch (err) {
      if (!mounted.current) return
      setError(err?.response?.data?.message || err?.message || "Failed to load status")
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    if (!hasAccess) return undefined
    fetchStatus()
    const timer = setInterval(fetchStatus, 3000)
    return () => {
      mounted.current = false
      clearInterval(timer)
    }
  }, [hasAccess, fetchStatus])

  const runAction = async (key, api, body = {}) => {
    setBusy(key)
    setInfo("")
    setError("")
    try {
      const instance = NetworkManager(api)
      const res = await instance.request(body)
      if (!res?.success) {
        setError(res?.message || "Request failed")
        return null
      }
      if (res.data?.data) setData(res.data.data)
      else await fetchStatus()
      return res
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Request failed")
      return null
    } finally {
      setBusy("")
    }
  }

  const onConnect = () => runAction("connect", API.WHATSAPP_CONNECTION.CONNECT)
  const onTest = async () => {
    const res = await runAction("test", API.WHATSAPP_CONNECTION.TEST, {})
    if (res?.success) setInfo(res.data?.message || res.message || "Test sent")
  }
  const onLogout = async () => {
    if (!window.confirm("Unlink this WhatsApp from the server? You will need to scan a new QR.")) return
    await runAction("logout", API.WHATSAPP_CONNECTION.LOGOUT)
    setPairingCode("")
  }
  const onPairing = async () => {
    setBusy("pairing")
    setError("")
    setPairingCode("")
    try {
      const instance = NetworkManager(API.WHATSAPP_CONNECTION.PAIRING_CODE)
      const res = await instance.request({ phone: pairingPhone })
      if (res?.success) {
        setPairingCode(res.data?.data?.code || res.data?.code || "")
        setInfo("Enter this code on the phone: Linked devices → Link with phone number")
      } else {
        setError(res?.message || "Could not create pairing code")
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Pairing failed")
    } finally {
      setBusy("")
    }
  }

  if (!hasAccess) {
    return (
      <Box sx={{ p: 3 }}>
        <Card sx={{ maxWidth: 560, mx: "auto", mt: 4 }}>
          <CardContent sx={{ textAlign: "center", p: 4 }}>
            <Shield size={56} color="#f44336" style={{ marginBottom: 12 }} />
            <Typography variant="h5" color="error" gutterBottom>
              Access Denied
            </Typography>
            <Typography color="text.secondary">
              WhatsApp Connection (QR link) is only available to Super Admin.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    )
  }

  const statusMeta = STATUS_LABEL[data?.status] || { label: data?.status || "…", color: "default" }
  const showQr = Boolean(data?.qr) && data?.status === "qr"

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720, mx: "auto" }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
        <QrCode size={28} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            WhatsApp Connection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Link one phone (like WhatsApp Web). Order alerts use this number. WATI business stays separate.
          </Typography>
        </Box>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      ) : null}
      {info ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo("")}>
          {info}
        </Alert>
      ) : null}

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Chip size="small" color={statusMeta.color} label={statusMeta.label} />
                {data?.whatsappReady ? <Chip size="small" color="success" label="Ready" /> : null}
              </Stack>
              <Typography variant="body1">
                Linked phone:{" "}
                <strong>{data?.linkedPhone ? `+${data.linkedPhone}` : "—"}</strong>
                {data?.linkedName ? ` (${data.linkedName})` : ""}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Session saved: {data?.sessionSaved ? "yes" : "no"} · Alerts:{" "}
                {data?.alertsEnabled ? "on" : "off"} · Pending queue: {data?.pendingAlertCount ?? 0}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                size="small"
                variant="outlined"
                startIcon={busy === "connect" ? <CircularProgress size={14} /> : <RefreshCw size={16} />}
                disabled={Boolean(busy)}
                onClick={onConnect}
              >
                Connect / QR
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={busy === "test" ? <CircularProgress size={14} /> : <Send size={16} />}
                disabled={Boolean(busy) || !data?.whatsappReady}
                onClick={onTest}
              >
                Test
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={busy === "logout" ? <CircularProgress size={14} /> : <LogOut size={16} />}
                disabled={Boolean(busy)}
                onClick={onLogout}
              >
                Unlink
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent sx={{ textAlign: "center" }}>
          {showQr ? (
            <>
              <Box
                sx={{
                  display: "inline-block",
                  p: 2,
                  bgcolor: "#fff",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <QRCodeSVG value={data.qr} size={260} level="M" includeMargin />
              </Box>
              <Typography variant="body2" sx={{ mt: 2 }}>
                On phone: WhatsApp → Settings → Linked devices → Link a device
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Code refreshes often — scan within a few seconds of it appearing.
              </Typography>
            </>
          ) : data?.whatsappReady ? (
            <Typography color="success.main" fontWeight={600}>
              Connected. No scan needed until you unlink or WhatsApp logs this device out.
            </Typography>
          ) : (
            <Stack alignItems="center" spacing={1} sx={{ py: 3 }}>
              <CircularProgress size={28} />
              <Typography color="text.secondary">
                {data?.status === "needs_scan" || data?.status === "logged_out"
                  ? "Click Connect / QR to show a code"
                  : "Waiting for connection…"}
              </Typography>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
            <Link2 size={18} />
            <Typography fontWeight={600}>Link with phone number (no camera)</Typography>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              size="small"
              label="WhatsApp number"
              placeholder="9876543210 or 919876543210"
              value={pairingPhone}
              onChange={(e) => setPairingPhone(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              disabled={Boolean(busy) || !pairingPhone.trim()}
              onClick={onPairing}
              sx={{ whiteSpace: "nowrap" }}
            >
              {busy === "pairing" ? <CircularProgress size={18} color="inherit" /> : "Get code"}
            </Button>
          </Stack>
          {pairingCode ? (
            <Typography variant="h4" sx={{ mt: 2, letterSpacing: 4, fontFamily: "monospace" }}>
              {pairingCode}
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  )
}

export default WhatsAppConnection
