import React, { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Box,
} from "@mui/material"
import DeleteIcon from "@mui/icons-material/Delete"
import RefreshIcon from "@mui/icons-material/Refresh"
import { fetchFaceRegistrationStatus, resetEmployeeFace, resetEmployeeDevice } from "./attendanceApi"
import { Toast } from "helpers/toasts/toastHelper"

export default function FaceRegistrationPanel() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      setRows(await fetchFaceRegistrationStatus())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleResetFace(id) {
    if (!window.confirm("Reset face registration for this employee?")) return
    try {
      await resetEmployeeFace(id)
      Toast.success("Face profile reset")
      load()
    } catch (e) {
      Toast.error(e?.message || "Reset failed")
    }
  }

  async function handleResetDevice(id) {
    if (!window.confirm("Reset registered device for this employee?")) return
    try {
      await resetEmployeeDevice(id)
      Toast.success("Device reset")
    } catch (e) {
      Toast.error(e?.message || "Reset failed")
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
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: "#f0f4ff" }}>
            <TableCell>Code</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Department</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Quality</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((e) => (
            <TableRow key={e._id}>
              <TableCell>{e.employeeCode || "—"}</TableCell>
              <TableCell>{e.name}</TableCell>
              <TableCell>{e.department?.name || "—"}</TableCell>
              <TableCell>
                <Chip
                  size="small"
                  color={e.face_registered ? "success" : "default"}
                  label={e.faceRegistrationStatus || (e.face_registered ? "REGISTERED" : "NOT_REGISTERED")}
                />
              </TableCell>
              <TableCell>{e.face_profile?.quality_score?.toFixed?.(2) ?? "—"}</TableCell>
              <TableCell align="right">
                <IconButton size="small" title="Reset face" onClick={() => handleResetFace(e._id)}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" title="Reset device" onClick={() => handleResetDevice(e._id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
