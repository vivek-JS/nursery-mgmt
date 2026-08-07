import React, { useState } from "react"
import {
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material"
import EditIcon from "@mui/icons-material/Edit"
import ComputerIcon from "@mui/icons-material/Computer"
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone"
import VerifiedIcon from "@mui/icons-material/Verified"
import ManualCorrectionDialog from "../ManualCorrectionDialog"
import { formatMatchPct } from "../attendanceMedia"
import AttendancePhotoCell, { EmployeeAvatar } from "./AttendancePhotoCell"
import { DASHBOARD_THEME } from "./dashboardTheme"

function StatusPill({ label, variant = "onTime" }) {
  const v = variant === "late" ? DASHBOARD_THEME.late : variant === "absent" ? DASHBOARD_THEME.absent : DASHBOARD_THEME.onTime
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: v.bg,
        color: v.text,
        border: `1px solid ${v.border}`,
        fontWeight: 600,
        fontSize: 12,
        height: 26,
      }}
    />
  )
}

function SourceCell({ source }) {
  if (!source) return <Typography variant="body2" color="text.secondary">—</Typography>
  const isKiosk = source === "Kiosk"
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      {isKiosk ? <ComputerIcon sx={{ fontSize: 16, color: DASHBOARD_THEME.muted }} /> : <PhoneIphoneIcon sx={{ fontSize: 16, color: DASHBOARD_THEME.muted }} />}
      <Typography variant="body2" color="text.secondary">{source}</Typography>
    </Box>
  )
}

function rowBg(row) {
  if (row.row_status === "LATE") return DASHBOARD_THEME.late.row
  if (row.row_status === "ABSENT") return DASHBOARD_THEME.absent.row
  return "#fff"
}

const HEADERS = ["Employee", "Photos", "Shift", "In", "Out", "Hours", "Status", "Face", "Source", ""]

export default function TodayAttendanceTable({ records = [], loading, onCorrected }) {
  const [editRow, setEditRow] = useState(null)

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, px: 0.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Today&apos;s roster
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {records.length} employee{records.length !== 1 ? "s" : ""}
        </Typography>
      </Box>
      <TableContainer sx={{ border: `1px solid ${DASHBOARD_THEME.border}`, borderRadius: 2.5, bgcolor: "#fff", overflowX: "auto" }}>
        <Table size="small" sx={{ minWidth: 960 }}>
          <TableHead>
            <TableRow sx={{ bgcolor: "#f8fafc" }}>
              {HEADERS.map((h) => (
                <TableCell key={h || "action"} sx={{ fontWeight: 700, color: DASHBOARD_THEME.muted, fontSize: 11, letterSpacing: 0.6, py: 1.25, whiteSpace: "nowrap" }}>
                  {h.toUpperCase()}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={HEADERS.length} align="center" sx={{ py: 6 }}>Loading…</TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={HEADERS.length} align="center" sx={{ py: 6 }}>No records for today</TableCell>
              </TableRow>
            ) : (
              records.map((row) => {
                const matchLabel = formatMatchPct(row.face_match_score)
                return (
                  <TableRow key={row.employee_id} hover sx={{ bgcolor: rowBg(row) }}>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <EmployeeAvatar row={row} />
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                            <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
                            {row.is_regularized && (
                              <Tooltip title={row.correction_note || "Manually regularized"}>
                                <Chip
                                  icon={<VerifiedIcon sx={{ fontSize: "14px !important" }} />}
                                  label="Regularized"
                                  size="small"
                                  sx={{ height: 22, fontSize: 11, bgcolor: "#eff6ff", color: "#1d4ed8", fontWeight: 600 }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {[row.employee_code, row.job_title, row.branch_name].filter(Boolean).join(" · ")}
                          </Typography>
                          {row.correction_note && (
                            <Typography variant="caption" sx={{ color: "#1d4ed8", display: "block", mt: 0.25 }}>
                              Note: {row.correction_note}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><AttendancePhotoCell row={row} /></TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.shift_label}</Typography>
                      <Typography variant="caption" color="text.secondary">Exp {row.expected_in}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color={row.check_in_time ? "text.primary" : "text.secondary"}>
                        {row.check_in_time || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.in_office ? (
                        <Typography variant="body2" sx={{ color: DASHBOARD_THEME.inOffice.text, fontWeight: 700 }}>
                          • In office
                        </Typography>
                      ) : (
                        <Typography variant="body2">{row.check_out_time || "—"}</Typography>
                      )}
                    </TableCell>
                    <TableCell><Typography variant="body2" fontWeight={600}>{row.hours_label}</Typography></TableCell>
                    <TableCell>
                      <StatusPill
                        label={row.row_status === "ABSENT" ? "Absent" : row.row_status === "LATE" ? "Late" : "On time"}
                        variant={row.row_status === "ABSENT" ? "absent" : row.row_status === "LATE" ? "late" : "onTime"}
                      />
                    </TableCell>
                    <TableCell>
                      {matchLabel ? (
                        <Chip label={matchLabel} size="small" sx={{ fontWeight: 700, bgcolor: "#f0fdfa", color: "#0f766e" }} />
                      ) : (
                        <Typography variant="body2" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                    <TableCell><SourceCell source={row.source} /></TableCell>
                    <TableCell align="right">
                      {row.attendance_id && (
                        <IconButton size="small" onClick={() => setEditRow(row)} aria-label="Edit">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {editRow?.daily && (
        <ManualCorrectionDialog
          open={!!editRow}
          record={editRow.daily}
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
