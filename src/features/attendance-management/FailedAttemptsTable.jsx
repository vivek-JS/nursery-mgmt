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
  CircularProgress,
  Box,
  Button,
} from "@mui/material"
import { fetchAttendanceAttempts } from "./attendanceApi"

export default function FailedAttemptsTable() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 25

  async function load() {
    setLoading(true)
    try {
      const data = await fetchAttendanceAttempts({ status: "FAILED", page: page + 1, limit })
      setRecords(data.records || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page])

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    )
  }

  return (
    <>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#fef2f2" }}>
              <TableCell>Time</TableCell>
              <TableCell>Employee</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Error</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Device</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{new Date(r.attempted_at).toLocaleString("en-IN")}</TableCell>
                <TableCell>{r.employee_id?.name || r.employee_id}</TableCell>
                <TableCell>{r.attendance_type || "—"}</TableCell>
                <TableCell>
                  <Chip size="small" color="error" label={r.error_code || r.failure_reason || "FAILED"} />
                </TableCell>
                <TableCell>{r.face_match_score?.toFixed?.(2) ?? "—"}</TableCell>
                <TableCell>{r.device_id || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
        <Button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Previous
        </Button>
        <Button disabled={(page + 1) * limit >= total} onClick={() => setPage((p) => p + 1)}>
          Next
        </Button>
      </Box>
    </>
  )
}
