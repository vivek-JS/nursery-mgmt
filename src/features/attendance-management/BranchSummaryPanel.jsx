import React, { useEffect, useState } from "react"
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Button, Stack, CircularProgress, Box } from "@mui/material"
import dayjs from "dayjs"
import { fetchBranchSummary } from "./attendanceApi"

export default function BranchSummaryPanel() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"))
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await fetchBranchSummary({ date })
      setSummary(data?.summary || [])
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
        <TextField label="Date" type="date" size="small" InputLabelProps={{ shrink: true }} value={date} onChange={(e) => setDate(e.target.value)} />
        <Button variant="contained" onClick={load}>
          Load
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
                <TableCell>Branch ID</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Present</TableCell>
                <TableCell>Late</TableCell>
                <TableCell>Absent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.map((s) => (
                <TableRow key={String(s._id)}>
                  <TableCell>{String(s._id)}</TableCell>
                  <TableCell>{s.total}</TableCell>
                  <TableCell>{s.present}</TableCell>
                  <TableCell>{s.late}</TableCell>
                  <TableCell>{s.absent}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  )
}
