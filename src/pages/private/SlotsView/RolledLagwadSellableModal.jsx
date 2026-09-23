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
import LagwadBatchOrderCheckPanel from "./LagwadBatchOrderCheckPanel"
const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

const RolledLagwadSellableModal = ({ open, onClose, slot }) => {
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)

  const load = useCallback(async () => {
    if (!slot?._id) return
    setLoading(true)
    try {
      const inst = NetworkManager(API.slots.GET_ROLLED_LAGWAD_SUMMARY)
      const res = await inst.request({}, [slot._id])
      const payload = res?.data?.data ?? res?.data ?? {}
      setSummary(payload)
    } catch (e) {
      console.error(e)
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [slot?._id])

  useEffect(() => {
    if (!open || !slot?._id) {
      setSummary(null)
      return
    }
    void load()
  }, [open, slot?._id, load])

  const slotLabel = slot ? `${slot.startDay} – ${slot.endDay}` : ""
  const windowDaysOpen =
    slot?.endDay && slot?.startDay
      ? moment(slot.endDay, "DD-MM-YYYY").diff(moment(slot.startDay, "DD-MM-YYYY"), "days") + 1
      : null
  const readyEntries = Array.isArray(summary?.readyRollLog) ? summary.readyRollLog : []
  const readySummary = summary?.readySummary || {}
  const actualRecent = Array.isArray(summary?.actualRollRecent) ? summary.actualRollRecent : []

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth onClick={(e) => e.stopPropagation()}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <HistoryOutlinedIcon color="primary" />
        Rolled lagwad sellable (today&apos;s slot)
        {slotLabel ? (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {slotLabel}
            {windowDaysOpen ? ` · ${windowDaysOpen}d window` : ""}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent dividers>
        {summary ? (
          <Box sx={{ mb: 2, display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip label={`Actual on slot: ${fmt(summary.actualPlants)}`} size="small" />
            <Chip label={`Ready on slot: ${fmt(summary.actualReadyPlants)}`} size="small" variant="outlined" />
            <Chip
              label={`Rolled-in ready: ${fmt(summary.rolledInActualReadyPlants)}`}
              color="primary"
              size="small"
            />
            {readySummary.totalRolledReady > 0 ? (
              <Chip
                label={`Log total ready: ${fmt(readySummary.totalRolledReady)}`}
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
        ) : !summary ? (
          <Typography color="text.secondary" textAlign="center" py={3}>
            Could not load rolled lagwad summary.
          </Typography>
        ) : (
          <>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Ready batch lines (from expired windows)
            </Typography>
            {readyEntries.length === 0 ? (
              <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                No ready roll log entries yet.
              </Typography>
            ) : (
              <Table size="small" sx={{ mb: 3 }}>
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
                  {readyEntries.map((row) => (
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

            <LagwadBatchOrderCheckPanel slot={slot} />

            {actualRecent.length > 0 ? (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Recent actual lagwad rolls (slot trail)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>When</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {actualRecent.map((row, idx) => (
                      <TableRow key={`${row.createdAt}-${idx}`}>
                        <TableCell sx={{ fontSize: 12, whiteSpace: "nowrap" }}>
                          {row.createdAt && moment(row.createdAt).isValid()
                            ? moment(row.createdAt).format("D MMM YYYY HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{row.action || "—"}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 12, fontWeight: 600 }}>
                          {fmt(row.quantity)}
                        </TableCell>
                        <TableCell sx={{ fontSize: 11 }}>{row.reason || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default RolledLagwadSellableModal
