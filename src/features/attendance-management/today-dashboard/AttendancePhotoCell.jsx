import React, { useState } from "react"
import { Avatar, Box, Dialog, DialogContent, DialogTitle, IconButton, Tooltip, Typography } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import PersonIcon from "@mui/icons-material/Person"
import { resolveAttendanceMediaUrl } from "../attendanceMedia"
import { DASHBOARD_THEME } from "./dashboardTheme"

function PhotoThumb({ label, url, time, onClick }) {
  const src = resolveAttendanceMediaUrl(url)
  if (!src) {
    return (
      <Tooltip title={`No ${label.toLowerCase()} photo`}>
        <Box
          sx={{
            width: 44,
            height: 56,
            borderRadius: 1.5,
            border: `1px dashed ${DASHBOARD_THEME.border}`,
            bgcolor: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PersonIcon sx={{ fontSize: 20, color: DASHBOARD_THEME.muted }} />
        </Box>
      </Tooltip>
    )
  }

  return (
    <Tooltip title={`${label}${time ? ` · ${time}` : ""} — click to enlarge`}>
      <Box
        component="button"
        type="button"
        onClick={onClick}
        sx={{
          p: 0,
          border: `2px solid ${DASHBOARD_THEME.border}`,
          borderRadius: 1.5,
          overflow: "hidden",
          cursor: "pointer",
          bgcolor: "#fff",
          "&:hover": { borderColor: DASHBOARD_THEME.headerFrom, boxShadow: "0 2px 8px rgba(15,118,110,0.2)" },
        }}
      >
        <Box component="img" src={src} alt={label} sx={{ width: 44, height: 56, objectFit: "cover", display: "block" }} />
      </Box>
    </Tooltip>
  )
}

export default function AttendancePhotoCell({ row }) {
  const [preview, setPreview] = useState(null)

  const inSrc = resolveAttendanceMediaUrl(row.check_in_photo_url)
  const outSrc = resolveAttendanceMediaUrl(row.check_out_photo_url)

  return (
    <>
      <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
        <PhotoThumb
          label="Clock in"
          url={row.check_in_photo_url}
          time={row.check_in_time}
          onClick={() => inSrc && setPreview({ title: "Clock in", src: inSrc, time: row.check_in_time })}
        />
        <PhotoThumb
          label="Clock out"
          url={row.check_out_photo_url}
          time={row.check_out_time}
          onClick={() => outSrc && setPreview({ title: "Clock out", src: outSrc, time: row.check_out_time })}
        />
      </Box>

      <Dialog open={!!preview} onClose={() => setPreview(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>{preview?.title}</Typography>
            {preview?.time && (
              <Typography variant="caption" color="text.secondary">{preview.time}</Typography>
            )}
          </Box>
          <IconButton onClick={() => setPreview(null)} size="small"><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          {preview?.src && (
            <Box
              component="img"
              src={preview.src}
              alt={preview.title}
              sx={{ width: "100%", borderRadius: 2, border: `1px solid ${DASHBOARD_THEME.border}` }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export function EmployeeAvatar({ row }) {
  const photo = resolveAttendanceMediaUrl(row.check_in_photo_url)
  if (photo) {
    return (
      <Avatar src={photo} alt={row.name} sx={{ width: 40, height: 40, border: "2px solid #99f6e4" }} />
    )
  }
  return (
    <Avatar sx={{ width: 40, height: 40, bgcolor: "#0d9488", fontSize: 14, fontWeight: 700 }}>
      {row.initials}
    </Avatar>
  )
}
