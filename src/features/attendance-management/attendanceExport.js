import axios from "axios"
import { APIConfig } from "network/config/serverConfig"
import { CookieKeys } from "constants/cookieKeys"
import { downloadCsvResponseAsXlsx } from "utils/exportExcel"

export async function downloadAttendanceCsv(params = {}) {
  const base = String(APIConfig.BASE_URL || "").replace(/\/+$/u, "")
  const token = localStorage.getItem(CookieKeys.Auth)
  const response = await axios.get(`${base}/api/v1/admin/attendance/export.csv`, {
    params,
    responseType: "blob",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  await downloadCsvResponseAsXlsx(`attendance-${params.date || "export"}-${Date.now()}`, response.data, {
    stamp: false,
  })
}
