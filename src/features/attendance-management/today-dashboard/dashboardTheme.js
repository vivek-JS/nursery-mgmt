export const DASHBOARD_THEME = {
  headerFrom: "#0f766e",
  headerTo: "#134e4a",
  card: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  text: "#0f172a",
  onTime: { bg: "#ecfdf5", text: "#059669", border: "#6ee7b7" },
  late: { bg: "#fff1f2", text: "#e11d48", border: "#fecdd3", row: "#fff7f7" },
  absent: { bg: "#fef2f2", text: "#dc2626", border: "#fecaca", row: "#fffbfb" },
  inOffice: { text: "#0d9488" },
  kpi: {
    total: { bg: "#eef2ff", icon: "#6366f1" },
    checkedIn: { bg: "#f0fdfa", icon: "#14b8a6" },
    onTime: { bg: "#ecfdf5", icon: "#059669" },
    late: { bg: "#fff7ed", icon: "#ea580c" },
    absent: { bg: "#fef2f2", icon: "#dc2626" },
    inOffice: { bg: "#f0fdfa", icon: "#0f766e" },
  },
}

export const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "ON_TIME", label: "On time" },
  { value: "LATE", label: "Late" },
  { value: "ABSENT", label: "Absent" },
  { value: "IN_OFFICE", label: "Still in office" },
]
