import React, { useEffect, useState } from "react"
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import EditIcon from "@mui/icons-material/Edit"
import { Toast } from "helpers/toasts/toastHelper"
import {
  createOfficeGroup,
  fetchOfficeGroups,
  patchOfficeGroup,
} from "../attendanceApi"

const EMPTY_FORM = {
  name: "",
  code: "",
  officeStartTime: "09:30",
  officeEndTime: "18:00",
  lateGraceMinutes: 10,
}

export default function OfficeShiftsPanel() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setGroups(await fetchOfficeGroups())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  function openEdit(g) {
    setEditing(g)
    setForm({
      name: g.name || "",
      code: g.code || "",
      officeStartTime: g.officeStartTime || "09:30",
      officeEndTime: g.officeEndTime || "18:00",
      lateGraceMinutes: g.lateGraceMinutes ?? 10,
    })
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) {
      Toast.error("Name and code are required")
      return
    }
    const payload = {
      ...form,
      officeStartTime: String(form.officeStartTime).slice(0, 5),
      officeEndTime: String(form.officeEndTime).slice(0, 5),
    }
    setSaving(true)
    try {
      if (editing) {
        await patchOfficeGroup(editing._id, payload)
        Toast.success("Shift group updated")
      } else {
        await createOfficeGroup(payload)
        Toast.success("Shift group created")
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      Toast.error(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Office Hours & Shift Groups</Typography>
          <Typography variant="body2" color="text.secondary">
            Different employee groups can have different start/end times (Field 7:00, Office 9:30, Drivers 6:00).
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Group
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Office Start</TableCell>
              <TableCell>Office End</TableCell>
              <TableCell>Late Grace (min)</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center">Loading…</TableCell></TableRow>
            ) : groups.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No shift groups — create one to set office timings</TableCell></TableRow>
            ) : (
              groups.map((g) => (
                <TableRow key={g._id} hover>
                  <TableCell><Typography variant="body2" fontWeight={600}>{g.name}</Typography></TableCell>
                  <TableCell>{g.code}</TableCell>
                  <TableCell>{g.officeStartTime}</TableCell>
                  <TableCell>{g.officeEndTime}</TableCell>
                  <TableCell>{g.lateGraceMinutes}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEdit(g)}><EditIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? "Edit Shift Group" : "New Shift Group"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Group name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth />
            <TextField label="Code" value={form.code} disabled={!!editing} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Office start" type="time" InputLabelProps={{ shrink: true }} value={form.officeStartTime} onChange={(e) => setForm({ ...form, officeStartTime: e.target.value })} fullWidth />
              <TextField label="Office end" type="time" InputLabelProps={{ shrink: true }} value={form.officeEndTime} onChange={(e) => setForm({ ...form, officeEndTime: e.target.value })} fullWidth />
            </Stack>
            <TextField label="Late grace (minutes)" type="number" value={form.lateGraceMinutes} onChange={(e) => setForm({ ...form, lateGraceMinutes: Number(e.target.value) })} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
