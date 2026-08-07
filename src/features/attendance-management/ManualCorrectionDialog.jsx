import React, { useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  MenuItem,
} from "@mui/material"
import { patchAttendance } from "./attendanceApi"
import { Toast } from "helpers/toasts/toastHelper"

const STATUS_OPTIONS = ["PRESENT", "LATE", "ABSENT", "HALF_DAY", "ON_LEAVE", "WEEKLY_OFF", "HOLIDAY"]

export default function ManualCorrectionDialog({ open, record, onClose, onSaved }) {
  const [attendanceStatus, setAttendanceStatus] = useState(record?.attendance_status || "PRESENT")
  const [correctionReason, setCorrectionReason] = useState("")
  const [checkIn, setCheckIn] = useState(
    record?.check_in?.timestamp ? new Date(record.check_in.timestamp).toISOString().slice(0, 16) : ""
  )
  const [checkOut, setCheckOut] = useState(
    record?.check_out?.timestamp ? new Date(record.check_out.timestamp).toISOString().slice(0, 16) : ""
  )
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!correctionReason.trim()) {
      Toast.error("Correction reason is required")
      return
    }
    setSaving(true)
    try {
      await patchAttendance(record._id, {
        attendance_status: attendanceStatus,
        correction_reason: correctionReason,
        check_in: checkIn ? { timestamp: new Date(checkIn).toISOString() } : undefined,
        check_out: checkOut ? { timestamp: new Date(checkOut).toISOString() } : undefined,
      })
      Toast.success("Attendance corrected")
      onSaved?.()
    } catch (e) {
      Toast.error(e?.message || "Failed to save correction")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Manual attendance correction</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Status"
            value={attendanceStatus}
            onChange={(e) => setAttendanceStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Check-in"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
          <TextField
            label="Check-out"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
          <TextField
            label="Reason"
            multiline
            minRows={2}
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
