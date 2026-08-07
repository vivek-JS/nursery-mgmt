import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Tabs, Tab, Box } from "@mui/material"
import dayjs from "dayjs"
import { useSelector } from "react-redux"
import TodayDashboardPanel from "features/attendance-management/today-dashboard/TodayDashboardPanel"
import AttendanceLogsFilters from "features/attendance-management/AttendanceLogsFilters"
import AttendanceLogsTable from "features/attendance-management/AttendanceLogsTable"
import FailedAttemptsTable from "features/attendance-management/FailedAttemptsTable"
import FaceRegistrationPanel from "features/attendance-management/FaceRegistrationPanel"
import BranchLocationPanel from "features/attendance-management/BranchLocationPanel"
import LateEarlyReport from "features/attendance-management/LateEarlyReport"
import BranchSummaryPanel from "features/attendance-management/BranchSummaryPanel"
import KioskAttendancePanel from "features/attendance-management/KioskAttendancePanel"
import OfficeShiftsPanel from "features/attendance-management/shifts/OfficeShiftsPanel"
import { fetchDailyAttendance, fetchDepartments } from "features/attendance-management/attendanceApi"
import { downloadAttendanceCsv } from "features/attendance-management/attendanceExport"

const ACCESS_ROLES = ["ADMIN", "SUPER_ADMIN", "SUPERADMIN", "OFFICE_ADMIN", "OFFICEADMIN"]

export default function AttendanceManagementPage() {
  const navigate = useNavigate()
  const userData = useSelector((s) => s.userData?.userData)
  const role = userData?.jobTitle || userData?.role || ""
  const canAccess = ACCESS_ROLES.some((r) => String(role).toUpperCase().includes(r.replace("_", "")) || role === r)

  const [tab, setTab] = useState(0)
  const [filters, setFilters] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    from: dayjs().startOf("month").format("YYYY-MM-DD"),
    to: dayjs().format("YYYY-MM-DD"),
    page: 0,
    limit: 25,
  })
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (userData && !canAccess) navigate("/u/dashboard", { replace: true })
  }, [userData, canAccess, navigate])

  async function loadAttendance(page = filters.page) {
    setLoading(true)
    try {
      const params = {
        from: filters.from,
        to: filters.to,
        date: filters.from && filters.to ? undefined : filters.date,
        department: filters.department,
        status: filters.status,
        page: page + 1,
        limit: filters.limit,
      }
      const data = await fetchDailyAttendance(params)
      setRecords(data.records || [])
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments().then(setDepartments).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab === 1) loadAttendance()
  }, [tab, filters.from, filters.to, filters.date, filters.department, filters.status, filters.page])

  async function handleExport() {
    setExporting(true)
    try {
      await downloadAttendanceCsv({
        from: filters.from,
        to: filters.to,
        date: filters.date,
        department: filters.department,
        status: filters.status,
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Today Dashboard" />
          <Tab label="Monthly Register" />
          <Tab label="Regularisation" />
          <Tab label="Shifts" />
          <Tab label="Reports" />
          <Tab label="Office Kiosk" />
          <Tab label="Setup" />
        </Tabs>
      </Box>

      {tab === 0 && <TodayDashboardPanel />}

      {tab === 1 && (
        <>
          <AttendanceLogsFilters
            filters={filters}
            onChange={(f) => setFilters({ ...f, page: 0 })}
            departments={departments}
            onExport={handleExport}
            exporting={exporting}
          />
          <AttendanceLogsTable
            records={records}
            total={total}
            page={filters.page}
            limit={filters.limit}
            loading={loading}
            onPageChange={(p) => {
              setFilters((f) => ({ ...f, page: p }))
              loadAttendance(p)
            }}
            onCorrected={() => loadAttendance(filters.page)}
          />
        </>
      )}

      {tab === 2 && (
        <Box>
          <FailedAttemptsTable />
        </Box>
      )}

      {tab === 3 && <OfficeShiftsPanel />}

      {tab === 4 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <LateEarlyReport />
          <BranchSummaryPanel />
        </Box>
      )}

      {tab === 5 && <KioskAttendancePanel />}

      {tab === 6 && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <FaceRegistrationPanel />
          <BranchLocationPanel />
        </Box>
      )}
    </div>
  )
}
