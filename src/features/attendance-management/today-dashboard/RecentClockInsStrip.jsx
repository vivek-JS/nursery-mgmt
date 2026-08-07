import React from "react"
import { Box, Chip, Typography } from "@mui/material"
import { DASHBOARD_THEME } from "./dashboardTheme"
import { resolveAttendanceMediaUrl, formatMatchPct } from "../attendanceMedia"

function ClockCard({ row }) {
  const photo = resolveAttendanceMediaUrl(row.check_in_photo_url)
  const match = formatMatchPct(row.face_match_score)

  return (
    <Box
      sx={{
        minWidth: 148,
        maxWidth: 168,
        flex: "0 0 auto",
        borderRadius: 2.5,
        border: `1px solid ${DASHBOARD_THEME.border}`,
        bgcolor: "#fff",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(15,23,42,0.06)",
      }}
    >
      <Box sx={{ height: 120, bgcolor: "#f1f5f9", position: "relative" }}>
        {photo ? (
          <Box component="img" src={photo} alt={row.name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography variant="caption" color="text.secondary">No photo</Typography>
          </Box>
        )}
        {match && (
          <Chip
            label={match}
            size="small"
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              bgcolor: "rgba(15,118,110,0.92)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 11,
              height: 22,
            }}
          />
        )}
      </Box>
      <Box sx={{ p: 1.25 }}>
        <Typography variant="body2" fontWeight={700} noWrap>{row.name}</Typography>
        <Typography variant="caption" color="text.secondary" display="block" noWrap>
          {row.employee_code || "—"}
        </Typography>
        <Typography variant="body2" sx={{ color: DASHBOARD_THEME.headerFrom, fontWeight: 700, mt: 0.5 }}>
          {row.check_in_time || "—"}
        </Typography>
      </Box>
    </Box>
  )
}

export default function RecentClockInsStrip({ records = [] }) {
  const clockedIn = records
    .filter((r) => r.check_in_raw)
    .sort((a, b) => new Date(b.check_in_raw) - new Date(a.check_in_raw))
    .slice(0, 12)

  if (clockedIn.length === 0) return null

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.25, px: 0.5 }}>
        Recently clocked in
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          overflowX: "auto",
          pb: 1,
          px: 0.5,
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "#cbd5e1", borderRadius: 3 },
        }}
      >
        {clockedIn.map((row) => (
          <ClockCard key={row.employee_id} row={row} />
        ))}
      </Box>
    </Box>
  )
}
