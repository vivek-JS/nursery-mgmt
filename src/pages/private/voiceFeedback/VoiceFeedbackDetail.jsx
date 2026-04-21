import React, { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Typography,
  Stack,
} from "@mui/material"
import { API, NetworkManager } from "network/core"

const VoiceFeedbackDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [call, setCall] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState(null)

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const callNm = NetworkManager(API.VOICE_FEEDBACK.GET_CALL)
      const evNm = NetworkManager(API.VOICE_FEEDBACK.GET_EVENTS)
      const [cRes, eRes] = await Promise.all([
        callNm.request({}, { pathParams: [id] }),
        evNm.request({}, { pathParams: [id] }),
      ])
      if (!cRes.success) throw new Error(cRes.error || cRes.message || "Load failed")
      if (!eRes.success) throw new Error(eRes.error || eRes.message || "Events failed")
      const cBody = cRes.data || {}
      const eBody = eRes.data || {}
      setCall(cBody.data ?? cBody)
      const ev = eBody.data ?? eBody
      setEvents(Array.isArray(ev) ? ev : [])
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const startCall = async () => {
    setActionLoading(true)
    try {
      const nm = NetworkManager(API.VOICE_FEEDBACK.START_CALL)
      const res = await nm.request({}, { pathParams: [id] })
      if (!res.success) throw new Error(res.error || res.message || "Start failed")
      await load()
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setActionLoading(false)
    }
  }

  const resolveCb = async () => {
    setActionLoading(true)
    try {
      const nm = NetworkManager(API.VOICE_FEEDBACK.RESOLVE_CALLBACK)
      const res = await nm.request({}, { pathParams: [id] })
      if (!res.success) throw new Error(res.error || res.message || "Update failed")
      await load()
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error && !call) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
        <Button onClick={() => navigate("/u/voice-feedback")} sx={{ mt: 1 }}>
          Back
        </Button>
      </Box>
    )
  }

  return (
    <Box p={2}>
      <Button onClick={() => navigate("/u/voice-feedback")} sx={{ mb: 2 }}>
        Back to list
      </Button>
      <Typography variant="h5" gutterBottom>
        Feedback call
      </Typography>
      {error && (
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      )}

      {call && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Chip label={call.callStatus} />
            {call.wantsCallback && <Chip color="warning" label="Callback requested" />}
            <Chip label={`Order #${call.orderNumber ?? "—"}`} variant="outlined" />
          </Stack>
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2">Customer</Typography>
              <Typography gutterBottom>
                {call.customerName} · {call.phone}
              </Typography>
              <Typography variant="subtitle2">Rating / sentiment</Typography>
              <Typography gutterBottom>
                {call.rating ?? "—"} · {call.sentiment ?? "—"} · {call.satisfaction ?? "—"}
              </Typography>
              <Typography variant="subtitle2">Recording</Typography>
              {call.recordingUrl ? (
                <audio controls src={call.recordingUrl} style={{ width: "100%", maxWidth: 480 }} />
              ) : (
                <Typography color="text.secondary">No recording URL yet</Typography>
              )}
            </CardContent>
          </Card>

          {(call.issues?.length > 0 || call.suggestions?.length > 0) && (
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                {call.issues?.length > 0 && (
                  <>
                    <Typography variant="subtitle2">Issues</Typography>
                    <ul>
                      {call.issues.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </>
                )}
                {call.suggestions?.length > 0 && (
                  <>
                    <Typography variant="subtitle2">Suggestions</Typography>
                    <ul>
                      {call.suggestions.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Transcript
              </Typography>
              <Typography
                component="pre"
                sx={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 14, m: 0 }}
              >
                {call.transcriptText || "—"}
              </Typography>
            </CardContent>
          </Card>

          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Button variant="contained" disabled={actionLoading} onClick={startCall}>
              Start / retry Exotel call
            </Button>
            <Button variant="outlined" disabled={actionLoading} onClick={resolveCb}>
              Mark callback resolved
            </Button>
          </Stack>

          <Typography variant="subtitle2" gutterBottom>
            Event log
          </Typography>
          {events.map((ev) => (
            <Box key={ev._id} sx={{ py: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {ev.type} · {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ""}
              </Typography>
              <Divider sx={{ my: 0.5 }} />
            </Box>
          ))}
        </>
      )}
    </Box>
  )
}

export default VoiceFeedbackDetail
