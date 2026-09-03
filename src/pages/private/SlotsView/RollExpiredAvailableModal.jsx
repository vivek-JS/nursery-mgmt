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
import {
  getAvailablePlants,
  getAvailableMinusRolledIn,
  slotShowDualAvailableCards,
} from "./slotMetrics"

const RollExpiredAvailableModal = ({ open, onClose, slot, onSuccess }) => {
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
    fetchSources()
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
          (payload.sources || []).map((s) => ({
            ...s,
            selected: false,
            availableQty: String(s.availablePlants || 0),
            rollActual: false,
            actualQty: String(Math.min(s.actualPlants || 0, s.availablePlants || 0)),
            rollReady: (s.actualReadyPlants || 0) > 0,
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

  const totals = useMemo(() => {
    let avail = 0
    let actual = 0
    let ready = 0
    for (const r of rows) {
      if (!r.selected) continue
      avail += Number(r.availableQty) || 0
      if (r.rollActual) actual += Number(r.actualQty) || 0
      if (r.rollReady) ready += Number(r.readyQty) || 0
    }
    return { avail, actual, ready }
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
        availableQty: Math.floor(Number(r.availableQty) || 0),
        actualQty: r.rollActual ? Math.floor(Number(r.actualQty) || 0) : 0,
        readyQty: r.rollReady ? Math.floor(Number(r.readyQty) || 0) : 0,
      }))
      .filter((t) => t.availableQty > 0 || t.actualQty > 0 || t.readyQty > 0)

    if (transfers.length === 0) {
      Toast.error("Select at least one expired slot")
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
        Toast.success(response?.data?.message || "Rolled successfully")
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

  const showDual = slot && slotShowDualAvailableCards(slot)
  const storedAvail = slot ? getAvailablePlants(slot) : 0
  const realAvail = slot ? getAvailableMinusRolledIn(slot) : 0

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Roll expired available → today&apos;s slot</DialogTitle>
      <DialogContent dividers>
        {slot && (
          <Box className="mb-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
            <Typography variant="subtitle2" className="font-bold text-sky-900">
              Target: {data?.target?.label || `${slot.startDay} – ${slot.endDay}`}
            </Typography>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-sky-800">
              <span>Available (stored): {storedAvail.toLocaleString()}</span>
              {showDual && <span>Real avail: {realAvail.toLocaleString()}</span>}
              <span>Actual: {(slot.actualPlants ?? 0).toLocaleString()}</span>
              {(slot.rolledInAvailablePlants ?? 0) > 0 && (
                <span>Rolled cap.: {slot.rolledInAvailablePlants.toLocaleString()}</span>
              )}
            </div>
          </Box>
        )}

        {loading ? (
          <Box className="flex justify-center py-8">
            <CircularProgress size={32} />
          </Box>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" className="py-4 text-center text-sm">
            No expired slots with available or actual plants to roll.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                <TableCell>Expired slot</TableCell>
                <TableCell align="right">Available</TableCell>
                <TableCell align="right">Roll qty</TableCell>
                <TableCell align="right">Actual</TableCell>
                <TableCell align="center">Also actual</TableCell>
                <TableCell align="right">Actual qty</TableCell>
                <TableCell align="right">Ready</TableCell>
                <TableCell align="center">Roll ready</TableCell>
                <TableCell align="right">Ready qty</TableCell>
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
                  <TableCell align="right">{r.availablePlants?.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={r.availableQty}
                      disabled={!r.selected}
                      onChange={(e) => updateRow(r.slotId, { availableQty: e.target.value })}
                      inputProps={{ min: 0, max: r.availablePlants }}
                    />
                  </TableCell>
                  <TableCell align="right">{r.actualPlants?.toLocaleString()}</TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={r.rollActual}
                      disabled={!r.selected || !(r.actualPlants > 0)}
                      onChange={(e) =>
                        updateRow(r.slotId, {
                          rollActual: e.target.checked,
                          actualQty: String(
                            Math.min(
                              r.actualPlants || 0,
                              Number(r.availableQty) || r.availablePlants || 0
                            )
                          ),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={r.actualQty}
                      disabled={!r.selected || !r.rollActual}
                      onChange={(e) => updateRow(r.slotId, { actualQty: e.target.value })}
                      inputProps={{ min: 0, max: r.actualPlants }}
                    />
                  </TableCell>
                  <TableCell align="right">{r.actualReadyPlants?.toLocaleString() ?? "0"}</TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={r.rollReady}
                      disabled={!r.selected || !(r.actualReadyPlants > 0)}
                      onChange={(e) =>
                        updateRow(r.slotId, {
                          rollReady: e.target.checked,
                          readyQty: String(r.actualReadyPlants || 0),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ width: 100 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={r.readyQty}
                      disabled={!r.selected || !r.rollReady}
                      onChange={(e) => updateRow(r.slotId, { readyQty: e.target.value })}
                      inputProps={{ min: 0, max: r.actualReadyPlants }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {totals.avail > 0 || totals.actual > 0 || totals.ready > 0 ? (
          <Typography variant="body2" className="mt-3 text-gray-700">
            Rolling in: <strong>{totals.avail.toLocaleString()}</strong> available
            {totals.actual > 0 && (
              <>
                {" "}
                + <strong>{totals.actual.toLocaleString()}</strong> actual
              </>
            )}
            {totals.ready > 0 && (
              <>
                {" "}
                + <strong>{totals.ready.toLocaleString()}</strong> actual ready
              </>
            )}
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
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || loading || rows.length === 0}>
          {submitting ? "Rolling…" : "Roll selected"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default RollExpiredAvailableModal
