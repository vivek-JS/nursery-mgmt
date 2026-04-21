import React, { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Stack,
  Grid,
} from "@mui/material"
import { API, NetworkManager } from "network/core"

const VoiceFeedbackList = () => {
  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const sumNm = NetworkManager(API.VOICE_FEEDBACK.DASHBOARD_SUMMARY)
      const listNm = NetworkManager(API.VOICE_FEEDBACK.LIST_CALLS)
      const [sumRes, listRes] = await Promise.all([
        sumNm.request({}, { limit: 50, skip: 0 }),
        listNm.request({}, { limit: 50, skip: 0 }),
      ])
      if (!sumRes.success) throw new Error(sumRes.error || sumRes.message || "Summary failed")
      if (!listRes.success) throw new Error(listRes.error || listRes.message || "List failed")
      const sumBody = sumRes.data || {}
      const listBody = listRes.data || {}
      setSummary(sumBody.data ?? sumBody)
      const payload = listBody.data ?? listBody
      setItems(payload?.items || [])
      setTotal(payload?.total ?? 0)
    } catch (e) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={2}>
        <Typography color="error">{error}</Typography>
        <Button onClick={load} sx={{ mt: 1 }}>
          Retry
        </Button>
      </Box>
    )
  }

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Voice feedback calls
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Post-dispatch Marathi feedback (Exotel + AI). Requires SUPER_ADMIN / OFFICE_ADMIN / ADMIN.
      </Typography>

      {summary && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            ["Total", summary.totalCalls],
            ["Connected", summary.connectedCalls],
            ["Completed", summary.completedCalls],
            ["Avg rating", summary.averageRating != null ? summary.averageRating.toFixed(2) : "—"],
            ["Satisfied %", summary.satisfiedPercent != null ? `${summary.satisfiedPercent}%` : "—"],
            ["Callbacks", summary.callbackRequired],
            ["Failed / busy / NA", summary.failedBusyNoAnswer],
          ].map(([label, val]) => (
            <Grid item xs={6} sm={4} md={2} key={label}>
              <Card variant="outlined">
                <CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="h6">{val ?? "—"}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Recent calls ({total})
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Customer</TableCell>
            <TableCell>Phone</TableCell>
            <TableCell>Order #</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Rating</TableCell>
            <TableCell>Sentiment</TableCell>
            <TableCell>Callback</TableCell>
            <TableCell>Duration</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((row) => (
            <TableRow key={row._id} hover>
              <TableCell>{row.customerName}</TableCell>
              <TableCell>{row.phone}</TableCell>
              <TableCell>{row.orderNumber ?? "—"}</TableCell>
              <TableCell>
                <Chip size="small" label={row.callStatus} />
              </TableCell>
              <TableCell>{row.rating ?? "—"}</TableCell>
              <TableCell>{row.sentiment ?? "—"}</TableCell>
              <TableCell>{row.wantsCallback ? "Yes" : "—"}</TableCell>
              <TableCell>{row.durationSec != null ? `${row.durationSec}s` : "—"}</TableCell>
              <TableCell>
                <Button component={Link} to={`/u/voice-feedback/${row._id}`} size="small">
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={load}>
          Refresh
        </Button>
      </Stack>
    </Box>
  )
}

export default VoiceFeedbackList
