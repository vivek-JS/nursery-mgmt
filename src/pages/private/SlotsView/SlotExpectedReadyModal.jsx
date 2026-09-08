import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Chip,
  Stack,
  TextField,
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { summaryFromBreakdownPayload } from "./expectedReadyInSlot"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const SlotExpectedReadyModal = ({ open, onClose, slot, onMarkedReady }) => {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [markingId, setMarkingId] = useState(null)
  const [reason, setReason] = useState("Marked ready from slot window")

  const load = useCallback(async () => {
    if (!slot?._id) return
    setLoading(true)
    setError(null)
    try {
      const inst = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
      const res = await inst.request({}, [slot._id])
      const payload = res?.data?.data ?? res?.data ?? res
      setData(payload)
    } catch (e) {
      console.error(e)
      setError("Could not load expected ready entries")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [slot?._id])

  useEffect(() => {
    if (!open || !slot?._id) {
      setData(null)
      setError(null)
      return
    }
    load()
  }, [open, slot?._id, load])

  const summary = useMemo(
    () => (data ? summaryFromBreakdownPayload(data, slot) : { total: 0, calendarReady: 0, awaitingMark: 0, entries: [] }),
    [data, slot]
  )

  const period =
    slot?.startDay && slot?.endDay ? `${slot.startDay} – ${slot.endDay}` : "Slot"

  const markReady = async (entry) => {
    if (!entry?.batchId || !entry?.secondaryInwardId) return
    setMarkingId(String(entry.secondaryInwardId))
    try {
      const inst = NetworkManager(API.PLANT_OUTWARD.SECONDARY_INWARD_READINESS_BYPASS)
      await inst.request({ reason: reason.trim() || "Marked ready from slot window" }, [
        entry.batchId,
        entry.secondaryInwardId,
      ])
      Toast.success("Line marked ready")
      await load()
      onMarkedReady?.()
    } catch (e) {
      console.error(e)
      Toast.error(e?.response?.data?.message || "Could not mark ready")
    } finally {
      setMarkingId(null)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth onClick={(e) => e.stopPropagation()}>
      <DialogTitle sx={{ bgcolor: "#f5f3ff", borderBottom: "1px solid #ddd6fe", py: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={800} color="#5b21b6">
          Expected ready in slot window
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          {period} · plants completing ready days in this delivery window
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap", gap: 0.5 }}>
          <Chip size="small" label={`Total ${fmt(summary.total)}`} sx={{ fontWeight: 700 }} />
          <Chip
            size="small"
            label={`Ready ${fmt(summary.calendarReady)}`}
            color="success"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
          <Chip
            size="small"
            label={`Awaiting mark ${fmt(summary.awaitingMark)}`}
            color="warning"
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {loading ? (
          <Stack alignItems="center" py={6}>
            <CircularProgress size={32} />
          </Stack>
        ) : error ? (
          <Typography color="error" sx={{ p: 3 }}>
            {error}
          </Typography>
        ) : !summary.entries.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
            No synced lagwad lines with expected ready date in this slot window.
          </Typography>
        ) : (
          <>
            {summary.awaitingMark > 0 ? (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ p: 2, pb: 0 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Mark-ready reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Stack>
            ) : null}
            <Table size="small" sx={{ mt: 1 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Shed</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Size</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Exp. ready</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                    On slot
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.entries.map((ln) => {
                  const ready = ln.dispatchEligible || ln.calendarReady
                  const rowKey = ln.secondaryInwardId || `${ln.batchNumber}-${ln.pollyhouse}`
                  return (
                    <TableRow key={rowKey} hover>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700 }}>{ln.batchNumber}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{ln.pollyhouse || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{ln.size || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{ln.expectedReadyLabel || "—"}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, fontWeight: 800, tabularNums: true }}>
                        {fmt(ln.qty)}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>
                        {ready ? (
                          <Chip size="small" label="Ready" color="success" variant="outlined" />
                        ) : (
                          <Chip size="small" label="Awaiting" color="warning" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {!ready ? (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={markingId === String(ln.secondaryInwardId)}
                            onClick={() => markReady(ln)}
                            sx={{
                              textTransform: "none",
                              fontSize: "0.7rem",
                              py: 0.25,
                              bgcolor: "#7c3aed",
                              "&:hover": { bgcolor: "#6d28d9" },
                            }}>
                            {markingId === String(ln.secondaryInwardId) ? "…" : "Mark ready"}
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: "#5b21b6", "&:hover": { bgcolor: "#4c1d95" } }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SlotExpectedReadyModal
