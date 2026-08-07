import { APIConfig } from "network/config/serverConfig"

/** Absolute URL for attendance selfie paths from the API. */
export function resolveAttendanceMediaUrl(url) {
  const s = String(url || "").trim()
  if (!s) return ""
  if (/^https?:\/\//i.test(s)) return s
  const base = String(APIConfig.BASE_URL || "")
    .replace(/\/api\/v1\/?$/i, "")
    .replace(/\/+$/, "")
  return s.startsWith("/") ? `${base}${s}` : `${base}/${s}`
}

export function formatMatchPct(score) {
  if (score == null || Number.isNaN(Number(score))) return null
  return `${Math.round(Number(score) * 100)}%`
}
