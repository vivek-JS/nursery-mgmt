import { API, NetworkManager } from "network/core"
import { buildTodayDashboardClient } from "./today-dashboard/buildTodayDashboardClient"

function cleanQuery(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value != null && value !== "")
  )
}

function unwrapData(response) {
  if (response?.success === false) {
    throw new Error(response.message || response.error || "Request failed")
  }
  const body = response?.data
  if (body?.data !== undefined) return body.data
  return body
}

export async function fetchDailyAttendance(params = {}) {
  const res = await NetworkManager(API.ATTENDANCE.GET_DAILY).request({}, cleanQuery(params))
  return unwrapData(res) || { records: [], total: 0 }
}

export async function fetchAttendanceDetail(id) {
  const res = await NetworkManager(API.ATTENDANCE.GET_DETAIL).request({}, [id])
  return unwrapData(res)
}

export async function patchAttendance(id, payload) {
  const res = await NetworkManager(API.ATTENDANCE.PATCH).request(payload, [id])
  return unwrapData(res)
}

export async function fetchAttendanceAttempts(params = {}) {
  const res = await NetworkManager(API.ATTENDANCE.GET_ATTEMPTS).request({}, cleanQuery(params))
  return unwrapData(res) || { records: [], total: 0 }
}

export async function fetchFaceRegistrationStatus(params = {}) {
  const res = await NetworkManager(API.ATTENDANCE.GET_FACE_STATUS).request({}, cleanQuery(params))
  const data = unwrapData(res)
  return Array.isArray(data) ? data : []
}

export async function fetchBranchSummary(params = {}) {
  const res = await NetworkManager(API.ATTENDANCE.GET_BRANCH_SUMMARY).request({}, cleanQuery(params))
  return unwrapData(res)
}

export async function fetchLateEarlyReport(params = {}) {
  const res = await NetworkManager(API.ATTENDANCE.GET_LATE_EARLY).request({}, cleanQuery(params))
  const data = unwrapData(res)
  return Array.isArray(data) ? data : []
}

export async function fetchBranchLocations() {
  const res = await NetworkManager(API.ATTENDANCE.GET_BRANCH_LOCATIONS).request()
  const data = unwrapData(res)
  return Array.isArray(data) ? data : []
}

export async function saveBranchLocation(payload) {
  const res = await NetworkManager(API.ATTENDANCE.SAVE_BRANCH_LOCATION).request(payload)
  return unwrapData(res)
}

export async function deleteBranchLocation(id) {
  const res = await NetworkManager(API.ATTENDANCE.DELETE_BRANCH_LOCATION).request({}, [id])
  return unwrapData(res)
}

export async function resetEmployeeFace(employeeId) {
  const res = await NetworkManager(API.ATTENDANCE.RESET_FACE).request({}, [employeeId])
  return unwrapData(res)
}

export async function resetEmployeeDevice(employeeId) {
  const res = await NetworkManager(API.ATTENDANCE.RESET_DEVICE).request({}, [employeeId])
  return unwrapData(res)
}

export async function fetchDepartments() {
  const res = await NetworkManager(API.FACE_ATTENDANCE.GET_DEPARTMENTS).request()
  const data = unwrapData(res)
  return Array.isArray(data) ? data : []
}

export async function fetchEmployees(params = {}) {
  const res = await NetworkManager(API.EMPLOYEE.GET_EMPLOYEE).request({}, cleanQuery(params))
  const data = unwrapData(res)
  return Array.isArray(data) ? data : data?.employees || []
}

function unwrapKioskBody(response) {
  const body = response?.data
  if (body?.status === false) {
    const err = new Error(body.message || "Request failed")
    err.errorCode = body.error_code
    err.payload = body.data
    throw err
  }
  return body?.data ?? body
}

export async function fetchTodayDashboard(params = {}) {
  const query = cleanQuery(params)
  try {
    const res = await NetworkManager(API.ATTENDANCE.GET_TODAY_DASHBOARD).request({}, query)
    const data = unwrapData(res)
    if (data?.records && Array.isArray(data.records)) return data
  } catch (_) {
    // Dedicated endpoint unavailable — build from employee + daily attendance APIs
  }
  return buildTodayDashboardClient(query)
}

export async function fetchOfficeGroups() {
  const res = await NetworkManager(API.ATTENDANCE.GET_OFFICE_GROUPS).request()
  const data = unwrapData(res)
  return Array.isArray(data) ? data : []
}

export async function createOfficeGroup(payload) {
  const res = await NetworkManager(API.ATTENDANCE.CREATE_OFFICE_GROUP).request(payload)
  return unwrapData(res)
}

export async function patchOfficeGroup(id, payload) {
  const res = await NetworkManager(API.ATTENDANCE.PATCH_OFFICE_GROUP).request(payload, [id])
  return unwrapData(res)
}

export async function kioskIdentifyFace(faceBlob) {
  const form = new FormData()
  form.append("image", faceBlob, "face.jpg")
  const res = await NetworkManager(API.ATTENDANCE.KIOSK_IDENTIFY).request(form)
  if (res?.data?.status === false) {
    return { message: res.data.message, ...res.data.data }
  }
  return unwrapKioskBody(res)
}

export async function kioskVerifyAndMark(faceBlob, beardBlob = null) {
  const form = new FormData()
  form.append("image", faceBlob, "face.jpg")
  if (beardBlob) form.append("beard_image", beardBlob, "beard.jpg")
  const res = await NetworkManager(API.ATTENDANCE.KIOSK_VERIFY_MARK).request(form)
  if (res?.data?.status === false) {
    return {
      message: res.data.message,
      error_code: res.data.error_code,
      requires_beard_capture: res.data.data?.requires_beard_capture,
      employee: res.data.data?.employee,
      next_attendance_type: res.data.data?.next_attendance_type,
    }
  }
  return unwrapKioskBody(res)
}

export async function kioskRegisterFace({ employeeId, faceBlob, beardBlob, hasBeard, consent }) {
  const form = new FormData()
  form.append("employee_id", employeeId)
  form.append("has_beard", hasBeard ? "true" : "false")
  form.append("consent", consent ? "true" : "false")
  form.append("image", faceBlob, "face.jpg")
  if (beardBlob) form.append("beard_image", beardBlob, "beard.jpg")
  const res = await NetworkManager(API.ATTENDANCE.KIOSK_REGISTER_FACE).request(form)
  return unwrapKioskBody(res)
}
