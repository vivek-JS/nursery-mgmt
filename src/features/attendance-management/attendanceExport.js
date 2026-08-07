import axios from "axios"
import { APIConfig } from "network/config/serverConfig"
import { CookieKeys } from "constants/cookieKeys"

export async function downloadAttendanceCsv(params = {}) {
  const base = String(APIConfig.BASE_URL || "").replace(/\/+$/u, "")
  const token = localStorage.getItem(CookieKeys.Auth)
  const response = await axios.get(`${base}/api/v1/admin/attendance/export.csv`, {
    params,
    responseType: "blob",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `attendance-${params.date || "export"}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
