import React, { useCallback, useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
} from "@mui/material"
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined"
import { API, NetworkManager } from "network/core"
import moment from "moment"

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

const SlotReadyRollHistoryModal = ({ open, onClose, slot }) => {
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)

  const load = useCallback(async () => {
    if (!slot?._id) return
    setLoading(true)
    try {
      const inst = NetworkManager(API.slots.GET_SLOT_READY_ROLL_LOG)
      const res = await inst.request({}, [slot._id])
      const payload = res?.data?.data ?? res?.data ?? {}
      setEntries(Array.isArray(payload.entries) ? payload.entries : [])
      setSummary(payload.summary || null)
    } catch (e) {
      console.error(e)
      setEntries([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [slot?._id])

  useEffect(() => {
    if (!open || !slot?._id) {
      setEntries([])
      setSummary(null)
      return
    }
    void load()
  }, [open, slot?._id, load])

  const slotLabel = slot ? `${slot.startDay} – ${slot.endDay}` : ""

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth onClick={(e) => e.stopPropagation()}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <HistoryOutlinedIcon color="primary" />
        Ready roll history
        {slotLabel ? (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {slotLabel}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent dividers>
        {summary ? (
          <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip label={`Total rolled in: ${fmt(summary.totalRolledReady)}`} color="primary" size="small" />
            {(slot?.rolledInActualReadyPlants ?? 0) > 0 ? (
              <Chip
                label={`On slot now: ${fmt(slot.rolledInActualReadyPlants)}`}
                variant="outlined"
                size="small"
              />
            ) : null}
          </Box>
        ) : null}

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : entries.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" py={3}>
            No ready rolls recorded for this slot yet.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>When</TableCell>
                <TableCell>From slot</TableCell>
                <TableCell>Batch / Shed</TableCell>
                <TableCell align="right">Plants</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((row) => (
                <TableRow key={row._id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap", fontSize: 12 }}>
                    {row.createdAt && moment(row.createdAt).isValid()
                      ? moment(row.createdAt).format("D MMM YYYY HH:mm")
                      : "—"}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {row.sourceSlotLabel || "—"}
                    {row.overdueDays > 0 ? (
                      <Typography variant="caption" display="block" color="warning.main">
                        {row.overdueDays}d overdue
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {row.batchNumber || "—"}
                    {row.pollyhouse ? (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {row.pollyhouse}
                      </Typography>
                    ) : null}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13 }}>
                    {fmt(row.quantityReady)}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11, maxWidth: 160 }}>
                    {row.reason || row.rollKind || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default SlotReadyRollHistoryModal
