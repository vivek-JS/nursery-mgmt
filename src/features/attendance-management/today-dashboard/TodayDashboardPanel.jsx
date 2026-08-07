import React, { useCallback, useEffect, useState } from "react"
import { Alert, Box, Button, InputAdornment, MenuItem, Stack, TextField, Typography } from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import SearchIcon from "@mui/icons-material/Search"
import dayjs from "dayjs"
import { useSelector } from "react-redux"
import { API, NetworkManager } from "network/core"
import AttendanceKpiRow from "./AttendanceKpiRow"
import TodayAttendanceTable from "./TodayAttendanceTable"
import RecentClockInsStrip from "./RecentClockInsStrip"
import { DASHBOARD_THEME, STATUS_FILTER_OPTIONS } from "./dashboardTheme"
import { fetchDepartments, fetchTodayDashboard } from "../attendanceApi"

function unwrapList(res) {
  const body = res?.data
  return body?.data ?? body ?? []
}

export default function TodayDashboardPanel() {
  const userData = useSelector((s) => s.userData?.userData)
  const role = userData?.jobTitle || userData?.role || "Admin"

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState([])
  const [branches, setBranches] = useState([])
  const [filters, setFilters] = useState({ branch: "", department: "", status: "", search: "" })
  const [searchInput, setSearchInput] = useState("")
  const [syncedAt, setSyncedAt] = useState(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => ({ ...f, search: searchInput })), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await fetchTodayDashboard({
        branch: filters.branch || undefined,
        department: filters.department || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
      })
      setData(result)
      setSyncedAt(result?.synced_at ? new Date(result.synced_at) : new Date())
    } catch (err) {
      setError(err?.message || "Could not load today’s attendance")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [filters.branch, filters.department, filters.status, filters.search])

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => {})
    NetworkManager(API.NURSERY_SITE.LIST)
      .request()
      .then((res) => setBranches(unwrapList(res)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [load])

  const todayLabel = dayjs(data?.date || undefined).format("dddd, D MMM YYYY")
  const syncLabel = syncedAt
    ? syncedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    : "—"

  return (
    <Box>
      {/* Teal header — matches reference mockup */}
      <Box
        sx={{
          borderRadius: 3,
          mb: 2.5,
          p: { xs: 2, md: 3 },
          background: `linear-gradient(135deg, ${DASHBOARD_THEME.headerFrom} 0%, ${DASHBOARD_THEME.headerTo} 100%)`,
          color: "#fff",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 2, mb: 1 }}>
          <Typography variant="caption" sx={{ opacity: 0.85, letterSpacing: 1, fontWeight: 600 }}>
            RAM BIOTECH ERP · HR ATTENDANCE
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Synced {syncLabel}
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={load}
              disabled={loading}
              sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", boxShadow: "none", "&:hover": { bgcolor: "rgba(255,255,255,0.28)" } }}
            >
              Refresh
            </Button>
          </Box>
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
          Today Dashboard
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {todayLabel} · {role} view
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <AttendanceKpiRow kpis={data?.kpis} loading={loading && !data} />

      <Box sx={{ bgcolor: "#fff", border: `1px solid ${DASHBOARD_THEME.border}`, borderRadius: 2.5, p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="Branch"
            size="small"
            sx={{ minWidth: 160 }}
            value={filters.branch}
            onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))}
          >
            <MenuItem value="">All branches</MenuItem>
            {branches.map((b) => (
              <MenuItem key={b._id} value={b._id}>{b.name || b.code}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Department"
            size="small"
            sx={{ minWidth: 160 }}
            value={filters.department}
            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
          >
            <MenuItem value="">All departments</MenuItem>
            {departments.map((d) => (
              <MenuItem key={d._id} value={d._id}>{d.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            size="small"
            sx={{ minWidth: 140 }}
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <MenuItem key={o.value || "all"} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Search employee or code"
            size="small"
            sx={{ flex: 1, minWidth: 200 }}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: DASHBOARD_THEME.muted, fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </Box>

      <RecentClockInsStrip records={data?.records || []} />

      <TodayAttendanceTable records={data?.records || []} loading={loading} onCorrected={load} />
    </Box>
  )
}
