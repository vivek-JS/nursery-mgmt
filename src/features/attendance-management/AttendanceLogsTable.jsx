import React, { useState } from "react"
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
  TablePagination,
  CircularProgress,
  Box,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import ManualCorrectionDialog from "./ManualCorrectionDialog"
import { resolveAttendanceMediaUrl } from "./attendanceMedia"

function formatTime(ts) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
}

export default function AttendanceLogsTable({
  records = [],
  total = 0,
  page,
  limit,
  loading,
  onPageChange,
  onCorrected,
}) {
  const [editRow, setEditRow] = useState(null)

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
            <TableRow sx={{ bgcolor: "#f0f4ff" }}>
              <TableCell>Date</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Branch</TableCell>
              <TableCell>Shift</TableCell>
              <TableCell>Check-in</TableCell>
              <TableCell>Photos</TableCell>
              <TableCell>Check-out</TableCell>
              <TableCell>Hours</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Late</TableCell>
              <TableCell>Early exit</TableCell>
              <TableCell>Face score</TableCell>
              <TableCell>Location</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={15} align="center">
                  No records
                </TableCell>
              </TableRow>
            ) : (
              records.map((row) => (
                <TableRow key={row._id} hover>
                  <TableCell>{row.attendance_date}</TableCell>
                  <TableCell>{row.employee_code || row.employee_id?.employeeCode}</TableCell>
                  <TableCell>{row.employee_id?.name}</TableCell>
                  <TableCell>{row.branch_id?.name || "—"}</TableCell>
                  <TableCell>{row.shift_id?.code || "—"}</TableCell>
                  <TableCell>{formatTime(row.check_in?.timestamp)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      {[row.check_in?.audit_image_url, row.check_out?.audit_image_url].map((url, i) => {
                        const src = resolveAttendanceMediaUrl(url)
                        if (!src) return null
                        return (
                          <Box
                            key={i}
                            component="a"
                            href={src}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ display: "block", borderRadius: 1, overflow: "hidden", border: "1px solid #e2e8f0" }}
                          >
                            <Box component="img" src={src} alt="" sx={{ width: 36, height: 46, objectFit: "cover", display: "block" }} />
                          </Box>
                        )
                      })}
                      {!row.check_in?.audit_image_url && !row.check_out?.audit_image_url && "—"}
                    </Box>
                  </TableCell>
                  <TableCell>{formatTime(row.check_out?.timestamp)}</TableCell>
                  <TableCell>
                    {row.total_working_minutes != null
                      ? `${Math.floor(row.total_working_minutes / 60)}h ${row.total_working_minutes % 60}m`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={row.attendance_status} color={row.attendance_status === "LATE" ? "warning" : "default"} />
                  </TableCell>
                  <TableCell>{row.late_by_minutes || 0}m</TableCell>
                  <TableCell>{row.early_exit_minutes || 0}m</TableCell>
                  <TableCell>
                    {row.check_in?.face_match_score?.toFixed?.(2) ??
                      row.check_out?.face_match_score?.toFixed?.(2) ??
                      "—"}
                  </TableCell>
                  <TableCell>
                    {row.check_in?.location_verified === false ? (
                      <Chip size="small" color="error" label="Outside" />
                    ) : (
                      <Chip size="small" color="success" label="OK" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => setEditRow(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={total}
        page={page}
        onPageChange={(_, p) => onPageChange(p)}
        rowsPerPage={limit}
        rowsPerPageOptions={[limit]}
      />
      {editRow && (
        <ManualCorrectionDialog
          open={!!editRow}
          record={editRow}
          onClose={() => setEditRow(null)}
          onSaved={() => {
            setEditRow(null)
            onCorrected?.()
          }}
        />
      )}
    </>
  )
}
