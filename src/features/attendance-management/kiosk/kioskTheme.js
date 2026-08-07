/** Shared visual tokens for Office Kiosk attendance UI */
export const KIOSK_THEME = {
  teal: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    900: "#134e4a",
  },
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    600: "#475569",
    800: "#1e293b",
    900: "#0f172a",
  },
  success: "#059669",
  warning: "#d97706",
  error: "#dc2626",
}

export const ATTENDANCE_MODES = {
  CHECK_IN: {
    label: "Check In",
    short: "IN",
    color: KIOSK_THEME.success,
    bg: "#ecfdf5",
    border: "#6ee7b7",
  },
  CHECK_OUT: {
    label: "Check Out",
    short: "OUT",
    color: KIOSK_THEME.warning,
    bg: "#fffbeb",
    border: "#fcd34d",
  },
}

export const MARK_STEPS = [
  { id: "face", label: "Face", hint: "Look at the camera" },
  { id: "beard", label: "Beard", hint: "Tilt chin slightly down" },
  { id: "done", label: "Done", hint: "Attendance saved" },
]
