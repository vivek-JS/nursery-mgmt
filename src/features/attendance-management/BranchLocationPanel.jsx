import React, { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Box,
} from "@mui/material"
import { fetchBranchLocations, saveBranchLocation } from "./attendanceApi"
import { Toast } from "helpers/toasts/toastHelper"

export default function BranchLocationPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    branch_id: "",
    latitude: "",
    longitude: "",
    allowed_radius_meters: 200,
    max_gps_accuracy_meters: 50,
  })

  async function load() {
    setLoading(true)
    try {
      setRows(await fetchBranchLocations())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleSave() {
    try {
      await saveBranchLocation({
        branch_id: form.branch_id,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        allowed_radius_meters: Number(form.allowed_radius_meters),
        max_gps_accuracy_meters: Number(form.max_gps_accuracy_meters),
        is_attendance_enabled: true,
      })
      Toast.success("Branch location saved")
      load()
    } catch (e) {
      Toast.error(e?.message || "Save failed")
    }
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap">
          <TextField label="Branch ID" size="small" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} />
          <TextField label="Latitude" size="small" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
          <TextField label="Longitude" size="small" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
          <TextField label="Radius (m)" size="small" type="number" value={form.allowed_radius_meters} onChange={(e) => setForm({ ...form, allowed_radius_meters: e.target.value })} />
          <Button variant="contained" onClick={handleSave}>
            Save location
          </Button>
        </Stack>
      </Paper>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Branch</TableCell>
              <TableCell>Lat</TableCell>
              <TableCell>Lng</TableCell>
              <TableCell>Radius</TableCell>
              <TableCell>Enabled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{r.branch_id?.name || r.branch_id}</TableCell>
                <TableCell>{r.latitude}</TableCell>
                <TableCell>{r.longitude}</TableCell>
                <TableCell>{r.allowed_radius_meters}m</TableCell>
                <TableCell>{r.is_attendance_enabled ? "Yes" : "No"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  )
}
