import React, { useEffect, useState } from "react"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, Button, Stack, CircularProgress, Box } from "@mui/material"
import dayjs from "dayjs"
import { fetchLateEarlyReport } from "./attendanceApi"

export default function LateEarlyReport() {
  const [from, setFrom] = useState(dayjs().startOf("month").format("YYYY-MM-DD"))
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"))
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      setRows(await fetchLateEarlyReport({ from, to }))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        <TextField label="From" type="date" size="small" InputLabelProps={{ shrink: true }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <TextField label="To" type="date" size="small" InputLabelProps={{ shrink: true }} value={to} onChange={(e) => setTo(e.target.value)} />
        <Button variant="contained" onClick={load}>
          Apply
        </Button>
      </Stack>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Late (min)</TableCell>
                <TableCell>Early exit (min)</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r._id}>
                  <TableCell>{r.attendance_date}</TableCell>
                  <TableCell>{r.employee_id?.name || r.employee_code}</TableCell>
                  <TableCell>{r.late_by_minutes || 0}</TableCell>
                  <TableCell>{r.early_exit_minutes || 0}</TableCell>
                  <TableCell>{r.attendance_status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}
