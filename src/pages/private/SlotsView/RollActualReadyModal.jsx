import React, { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Box,
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { getActualReadyPlants } from "./slotMetrics"

const RollActualReadyModal = ({ open, onClose, slot, onSuccess }) => {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState(null)
  const [reason, setReason] = useState("")
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!open || !slot?._id) return
    setReason("")
    setRows([])
    setData(null)
    void fetchSources()
  }, [open, slot?._id])

  const fetchSources = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_ROLL_EXPIRED_AVAILABLE_SOURCES)
      const response = await instance.request({}, { targetSlotId: slot._id })
      if (response?.data?.success) {
        const payload = response.data.data
        setData(payload)
        setRows(
          (payload.sources || [])
            .filter((s) => (s.actualReadyPlants || 0) > 0)
            .map((s) => ({
              ...s,
              selected: false,
              readyQty: String(s.actualReadyPlants || 0),
            }))
        )
      } else {
        Toast.error(response?.data?.message || "Failed to load expired slots")
      }
    } catch (err) {
      Toast.error(err?.response?.data?.message || err?.message || "Failed to load")
    }
    setLoading(false)
  }

  const totalReady = useMemo(() => {
    let n = 0
    for (const r of rows) {
      if (!r.selected) continue
      n += Number(r.readyQty) || 0
    }
    return n
  }, [rows])

  const toggleRow = (slotId) => {
    setRows((prev) =>
      prev.map((r) => (r.slotId === slotId ? { ...r, selected: !r.selected } : r))
    )
  }

  const updateRow = (slotId, patch) => {
    setRows((prev) => prev.map((r) => (r.slotId === slotId ? { ...r, ...patch } : r)))
  }

  const handleSubmit = async () => {
    const transfers = rows
      .filter((r) => r.selected)
      .map((r) => ({
        sourceSlotId: r.slotId,
        availableQty: 0,
        actualQty: 0,
        readyQty: Math.floor(Number(r.readyQty) || 0),
      }))
      .filter((t) => t.readyQty > 0)

    if (transfers.length === 0) {
      Toast.error("Select at least one expired slot with actual ready")
      return
    }
    if (!reason.trim()) {
      Toast.error("Reason is required")
      return
    }

    setSubmitting(true)
    try {
      const instance = NetworkManager(API.slots.POST_ROLL_EXPIRED_AVAILABLE)
      const response = await instance.request({
        targetSlotId: slot._id,
        transfers,
        reason: reason.trim(),
      })
      if (response?.data?.success) {
        Toast.success(response?.data?.message || "Actual ready rolled successfully")
        onSuccess?.()
        onClose()
      } else {
        Toast.error(response?.data?.message || "Roll failed")
      }
    } catch (err) {
      Toast.error(err?.response?.data?.message || err?.message || "Roll failed")
    }
    setSubmitting(false)
  }

  const targetReady = slot ? getActualReadyPlants(slot) : 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth onClick={(e) => e.stopPropagation()}>
      <DialogTitle>Roll actual ready → today&apos;s slot</DialogTitle>
      <DialogContent dividers>
        {slot && (
          <Box className="mb-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
            <Typography variant="subtitle2" className="font-bold text-sky-900">
              Target: {data?.target?.label || `${slot.startDay} – ${slot.endDay}`}
            </Typography>
            <Typography variant="caption" className="text-sky-800">
              Actual ready now: <strong>{targetReady.toLocaleString()}</strong>
            </Typography>
          </Box>
        )}

        {loading ? (
          <Box className="flex justify-center py-8">
            <CircularProgress size={32} />
          </Box>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" className="py-4 text-center text-sm">
            No expired slots with actual ready plants to roll.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Expired slot</TableCell>
                <TableCell align="right">Actual ready</TableCell>
                <TableCell align="right">Roll qty</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.slotId} selected={r.selected}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={r.selected} onChange={() => toggleRow(r.slotId)} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" className="font-medium">
                      {r.label}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{r.actualReadyPlants?.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={r.readyQty}
                      disabled={!r.selected}
                      onChange={(e) => updateRow(r.slotId, { readyQty: e.target.value })}
                      inputProps={{ min: 0, max: r.actualReadyPlants }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {totalReady > 0 ? (
          <Typography variant="body2" className="mt-3 text-gray-700">
            Rolling in: <strong>{totalReady.toLocaleString()}</strong> actual ready
          </Typography>
        ) : null}

        <TextField
          label="Reason (required)"
          fullWidth
          multiline
          minRows={2}
          className="mt-4"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" color="secondary" onClick={handleSubmit} disabled={submitting || loading}>
          {submitting ? "Rolling…" : "Roll actual ready"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RollActualReadyModal
