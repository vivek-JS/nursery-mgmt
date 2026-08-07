import React from "react"
import { Box, Typography } from "@mui/material"
import GroupsIcon from "@mui/icons-material/Groups"
import LoginIcon from "@mui/icons-material/Login"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import ScheduleIcon from "@mui/icons-material/Schedule"
import PersonOffIcon from "@mui/icons-material/PersonOff"
import BusinessIcon from "@mui/icons-material/Business"
import { DASHBOARD_THEME } from "./dashboardTheme"

const KPI_CONFIG = [
  { key: "total_staff", label: "Total Staff", sub: "Active on payroll", icon: GroupsIcon, theme: "total" },
  { key: "checked_in", label: "Checked In", subKey: "checked_in_pct", subSuffix: "% of workforce", icon: LoginIcon, theme: "checkedIn" },
  { key: "on_time", label: "On Time", sub: "Before grace window", icon: CheckCircleIcon, theme: "onTime" },
  { key: "late", label: "Late", sub: "After grace period", icon: ScheduleIcon, theme: "late" },
  { key: "absent", label: "Absent", sub: "No punch recorded", icon: PersonOffIcon, theme: "absent" },
  { key: "still_in_office", label: "Still In Office", sub: "No check-out yet", icon: BusinessIcon, theme: "inOffice" },
]

function KpiCard({ label, value, sub, icon: Icon, themeKey, loading = false }) {
  const t = DASHBOARD_THEME.kpi[themeKey]
  return (
    <Box
      sx={{
        bgcolor: DASHBOARD_THEME.card,
        border: `1px solid ${DASHBOARD_THEME.border}`,
        borderRadius: 2.5,
        p: 2,
        minHeight: 108,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Typography variant="caption" sx={{ color: DASHBOARD_THEME.muted, fontWeight: 600, letterSpacing: 0.5 }}>
          {label.toUpperCase()}
        </Typography>
        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon sx={{ fontSize: 20, color: t.icon }} />
        </Box>
      </Box>
      <Box>
        <Typography variant="h4" fontWeight={800} sx={{ color: DASHBOARD_THEME.text, lineHeight: 1.1 }}>
          {loading ? "…" : (value ?? 0)}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: DASHBOARD_THEME.muted, mt: 0.5, display: "block" }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default function AttendanceKpiRow({ kpis = {}, loading = false }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)", xl: "repeat(6, 1fr)" },
        gap: 2,
        mb: 2.5,
      }}
    >
      {KPI_CONFIG.map((cfg) => {
        let sub = cfg.sub
        if (cfg.subKey && kpis[cfg.subKey] != null) {
          sub = `${kpis[cfg.subKey]}${cfg.subSuffix || ""}`
        }
        return (
          <KpiCard
            key={cfg.key}
            label={cfg.label}
            value={kpis[cfg.key]}
            sub={sub}
            icon={cfg.icon}
            themeKey={cfg.theme}
            loading={loading}
          />
        )
      })}
    </Box>
  )
}
