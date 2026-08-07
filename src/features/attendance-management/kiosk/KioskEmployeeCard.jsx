import React from "react"
import { Avatar, Box, Chip, Typography } from "@mui/material"
import LoginIcon from "@mui/icons-material/Login"
import LogoutIcon from "@mui/icons-material/Logout"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import { ATTENDANCE_MODES, KIOSK_THEME } from "./kioskTheme"

function getInitials(name) {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

export default function KioskEmployeeCard({
  dataUrl,
  name,
  employeeCode,
  department,
  nextType,
  faceScore,
  success,
  successLabel,
  subtitle,
  compact = false,
}) {
  const mode = nextType ? ATTENDANCE_MODES[nextType] : null

  if (success) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 4,
          px: 2,
          borderRadius: 3,
          bgcolor: "#ecfdf5",
          border: `2px solid ${KIOSK_THEME.success}`,
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 56, color: KIOSK_THEME.success, mb: 1 }} />
        <Typography variant="h5" fontWeight={800} color={KIOSK_THEME.teal[900]}>
          {name}
        </Typography>
        <Typography variant="h6" sx={{ color: KIOSK_THEME.success, mt: 0.5, fontWeight: 700 }}>
          {successLabel}
        </Typography>
      </Box>
    )
  }

  if (!dataUrl && !name) {
    return (
      <Box
        sx={{
          textAlign: "center",
          py: 6,
          px: 3,
          borderRadius: 3,
          bgcolor: KIOSK_THEME.slate[50],
          border: "2px dashed #cbd5e1",
        }}
      >
        <Avatar sx={{ width: 72, height: 72, mx: "auto", mb: 2, bgcolor: KIOSK_THEME.teal[100], color: KIOSK_THEME.teal[700], fontSize: 28 }}>
          ?
        </Avatar>
        <Typography variant="h6" color={KIOSK_THEME.slate[800]} fontWeight={600}>
          Waiting for capture
        </Typography>
        <Typography variant="body2" color={KIOSK_THEME.slate[600]} sx={{ mt: 0.5 }}>
          Employee name will appear here after face scan
        </Typography>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        bgcolor: "#fff",
        boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
      }}
    >
      {dataUrl && (
        <Box sx={{ position: "relative", bgcolor: KIOSK_THEME.slate[900] }}>
          <Box
            component="img"
            src={dataUrl}
            alt={name || "Capture"}
            sx={{ width: "100%", maxHeight: compact ? 200 : 280, objectFit: "cover", display: "block" }}
          />
          {mode && (
            <Chip
              icon={nextType === "CHECK_IN" ? <LoginIcon /> : <LogoutIcon />}
              label={`Next: ${mode.label}`}
              sx={{
                position: "absolute",
                top: 12,
                right: 12,
                fontWeight: 700,
                bgcolor: mode.bg,
                color: mode.color,
                border: `1px solid ${mode.border}`,
              }}
            />
          )}
        </Box>
      )}
      <Box sx={{ p: compact ? 2 : 2.5, textAlign: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.5, mb: name && !dataUrl ? 0 : 1 }}>
          {!dataUrl && name && (
            <Avatar sx={{ width: 48, height: 48, bgcolor: KIOSK_THEME.teal[600] }}>
              {getInitials(name)}
            </Avatar>
          )}
          <Box>
            {name && (
              <Typography variant={compact ? "h6" : "h5"} fontWeight={800} color={KIOSK_THEME.slate[900]} lineHeight={1.2}>
                {name}
              </Typography>
            )}
            {employeeCode && (
              <Typography variant="body2" color={KIOSK_THEME.slate[600]} fontWeight={500}>
                {employeeCode}
              </Typography>
            )}
          </Box>
        </Box>
        {department && (
          <Typography variant="caption" color={KIOSK_THEME.slate[600]}>
            {department}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
        {faceScore != null && (
          <Chip
            size="small"
            label={`Match ${Math.round(faceScore * 100)}%`}
            sx={{ mt: 1.5, bgcolor: KIOSK_THEME.teal[50], color: KIOSK_THEME.teal[700], fontWeight: 600 }}
          />
        )}
      </Box>
    </Box>
  )
}
