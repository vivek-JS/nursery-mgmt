/**
 * Shared app color scheme (teal palette).
 * Used by Payments, dashboards, theme, and global styles.
 * Keep in sync across MUI theme, Tailwind, and SCSS.
 */
export const colorScheme = {
  // Primary teal
  primary: "#0f766e",
  primaryLight: "#14b8a6",
  primaryDark: "#0d9488",
  // Accents
  accent: "#99f6e4",
  accentMuted: "#f0fdfa",
  // Gradients
  gradientHeader: "linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #14b8a6 100%)",
  gradientButton: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
  gradientBg: "linear-gradient(180deg, #f0f4ff 0%, #e8eeff 40%, #f8fafc 100%)",
  // Surfaces
  surface: "#ffffff",
  surfaceMuted: "#f8fafc",
  surfaceHover: "#f1f5f9",
  surfaceInput: "#f8fafc",
  // Borders
  border: "#e2e8f0",
  borderFocus: "rgba(15, 118, 110, 0.15)",
  borderCard: "rgba(15, 118, 110, 0.12)",
  borderCardHover: "rgba(15, 118, 110, 0.3)",
  // Shadows
  shadowCard: "0 2px 12px rgba(0,0,0,0.06)",
  shadowCardHover: "0 8px 24px rgba(15, 118, 110, 0.12)",
  shadowHeader: "0 8px 24px rgba(15, 118, 110, 0.25)",
  shadowButton: "0 4px 12px rgba(15, 118, 110, 0.3)",
  // Text
  textPrimary: "#0f172a",
  textSecondary: "#64748b",
  textOnPrimary: "#ffffff",
  // Status (keep distinct)
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#dc2626",
  info: "#0ea5e9",
}

export default colorScheme
