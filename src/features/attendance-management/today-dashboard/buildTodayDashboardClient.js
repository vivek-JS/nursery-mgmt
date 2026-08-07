import dayjs from "dayjs"
import { API, NetworkManager } from "network/core"

function unwrapList(response) {
  if (response?.success === false) {
    throw new Error(response.message || response.error || "Request failed")
  }
  const body = response?.data
  if (body?.data !== undefined) return body.data
  return body
}

function cleanQuery(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null && value !== "")
  )
}

async function loadEmployees() {
  const res = await NetworkManager(API.EMPLOYEE.GET_EMPLOYEE).request({}, { limit: 5000 })
  const data = unwrapList(res)
  return Array.isArray(data) ? data : data?.employees || []
}

async function loadDailyForDate(dateYmd) {
  const res = await NetworkManager(API.ATTENDANCE.GET_DAILY).request({}, { date: dateYmd, limit: 500 })
  const data = unwrapList(res)
  return data?.records || []
}

function formatIstTime(ts) {
  if (!ts) return null
  return new Date(ts).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return "—"
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function initials(name) {
  if (!name) return "?"
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function punchSource(punch) {
  const src = punch?.source || "MOBILE"
  return src === "KIOSK" ? "Kiosk" : "Mobile"
}

function resolveOfficeHours(employee) {
  const dept = employee?.department && typeof employee.department === "object" ? employee.department : null
  const start = employee?.officeStartTimeOverride || dept?.officeStartTime || dept?.shiftStartTime || "09:30"
  const end = employee?.officeEndTimeOverride || dept?.officeEndTime || dept?.shiftEndTime || "18:00"
  return { officeStartTime: start, officeEndTime: end }
}

function formatShiftRange(start, end) {
  if (!start) return "—"
  const s = start.replace(":", ".")
  const e = end ? end.replace(":", ".") : ""
  return e ? `${s} – ${e}` : s
}

function mapRow(employee, daily) {
  const hours = resolveOfficeHours(employee)
  const checkInTs = daily?.check_in?.timestamp || null
  const checkOutTs = daily?.check_out?.timestamp || null
  const lateMinutes = daily?.late_by_minutes ?? 0
  const hasCheckIn = !!checkInTs
  const hasCheckOut = !!checkOutTs

  let rowStatus = "ABSENT"
  if (!hasCheckIn) rowStatus = "ABSENT"
  else if (lateMinutes > 0 || daily?.attendance_status === "LATE") rowStatus = "LATE"
  else rowStatus = "PRESENT"

  const onTime = hasCheckIn && lateMinutes === 0

  let workingMinutes = daily?.total_working_minutes ?? 0
  if (hasCheckIn && !hasCheckOut) {
    workingMinutes = Math.max(0, Math.round((Date.now() - new Date(checkInTs).getTime()) / 60000))
  }

  const branchName =
    employee?.nurserySite?.name ||
    (typeof employee?.nurserySite === "object" ? employee.nurserySite?.name : null) ||
    daily?.branch_id?.name ||
    null

  return {
    employee_id: String(employee._id || employee.id),
    attendance_id: daily?._id ? String(daily._id) : null,
    name: employee.name,
    employee_code: employee.employeeCode || null,
    job_title: employee.jobTitle || null,
    branch_name: branchName,
    department_name: employee.department?.name || daily?.shift_id?.name || null,
    initials: initials(employee.name),
    shift_label: formatShiftRange(hours.officeStartTime, hours.officeEndTime),
    expected_in: daily?.office_start_time || hours.officeStartTime,
    check_in_time: formatIstTime(checkInTs),
    check_in_raw: checkInTs,
    check_out_time: hasCheckOut ? formatIstTime(checkOutTs) : null,
    check_out_raw: checkOutTs,
    in_office: hasCheckIn && !hasCheckOut,
    on_time: onTime,
    late_minutes: lateMinutes,
    hours_label: formatDuration(workingMinutes),
    working_minutes: workingMinutes,
    row_status: rowStatus,
    attendance_status: daily?.attendance_status || rowStatus,
    source: hasCheckIn ? punchSource(daily.check_in) : null,
    face_match_score: daily?.check_in?.face_match_score ?? null,
    daily,
    employee,
  }
}

function applyFilters(rows, { branch, department, status, search }) {
  let out = rows
  if (branch) {
    out = out.filter(
      (r) =>
        String(r.employee?.nurserySite?._id || r.employee?.nurserySite || "") === String(branch) ||
        String(r.daily?.branch_id?._id || r.daily?.branch_id || "") === String(branch)
    )
  }
  if (department) {
    out = out.filter(
      (r) =>
        String(r.employee?.department?._id || r.employee?.department || "") === String(department) ||
        String(r.daily?.shift_id?._id || r.daily?.shift_id || "") === String(department)
    )
  }
  if (status === "ON_TIME") out = out.filter((r) => r.on_time)
  else if (status === "LATE") out = out.filter((r) => r.row_status === "LATE")
  else if (status === "ABSENT") out = out.filter((r) => r.row_status === "ABSENT")
  else if (status === "IN_OFFICE") out = out.filter((r) => r.in_office)
  if (search) {
    const q = String(search).trim().toLowerCase()
    out = out.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.employee_code?.toLowerCase().includes(q) ||
        r.job_title?.toLowerCase().includes(q)
    )
  }
  return out
}

function isStaff(employee) {
  return employee?.jobTitle && employee.role !== "FARMER" && employee.isDisabled !== true
}

/** Build today dashboard from employee + daily attendance APIs when dedicated endpoint is unavailable. */
export async function buildTodayDashboardClient(params = {}) {
  const query = cleanQuery(params)
  const dateYmd = query.date || dayjs().format("YYYY-MM-DD")

  const [employees, dailyRecords] = await Promise.all([loadEmployees(), loadDailyForDate(dateYmd)])

  const staff = employees.filter(isStaff)
  const dailyByEmployee = new Map(
    dailyRecords.map((d) => [String(d.employee_id?._id || d.employee_id), d])
  )

  const allRows = staff.map((emp) => {
    const id = String(emp._id || emp.id)
    return mapRow(emp, dailyByEmployee.get(id) || null)
  })

  const filtered = applyFilters(allRows, query)
  const checkedIn = allRows.filter((r) => r.check_in_raw).length
  const totalStaff = staff.length

  return {
    date: dateYmd,
    synced_at: new Date().toISOString(),
    source: "client_fallback",
    kpis: {
      total_staff: totalStaff,
      checked_in: checkedIn,
      on_time: allRows.filter((r) => r.on_time).length,
      late: allRows.filter((r) => r.row_status === "LATE").length,
      absent: allRows.filter((r) => r.row_status === "ABSENT").length,
      still_in_office: allRows.filter((r) => r.in_office).length,
      checked_in_pct: totalStaff ? Math.round((checkedIn / totalStaff) * 100) : 0,
    },
    records: filtered.map(({ employee, ...rest }) => rest),
    total: filtered.length,
  }
}
