import React from "react"
import { Box, Typography } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { useWorkspace } from "./WorkspaceContext"
import { AGRI_HOME_PATH, WORKSPACE_AGRI, WORKSPACE_BIOTECH } from "./agriAccess"

const MODES = [
  {
    id: WORKSPACE_BIOTECH,
    short: "RB",
    name: "Ram Biotech",
    color: "#166534",
    home: "/u/dashboard",
  },
  {
    id: WORKSPACE_AGRI,
    short: "RA",
    name: "Ram Agri Inputs",
    color: "#b45309",
    home: AGRI_HOME_PATH,
  },
]

/**
 * Animated Biotech ↔ Agri workspace switch. Persists via WorkspaceContext.
 */
export default function WorkspaceSwitcher() {
  const { mode, setMode, canSwitch, isAgriLocked } = useWorkspace()
  const navigate = useNavigate()

  if (!canSwitch && !isAgriLocked) return null

  const activeIndex = mode === WORKSPACE_AGRI ? 1 : 0

  return (
    <Box
      sx={{
        position: "relative",
        display: "flex",
        p: 0.4,
        borderRadius: 999,
        bgcolor: "rgba(15,23,42,0.06)",
        border: "1px solid rgba(15,23,42,0.08)",
        minWidth: { xs: 200, sm: 260 },
        userSelect: "none",
      }}
      aria-label="Workspace switcher"
    >
      <Box
        sx={{
          position: "absolute",
          top: 3,
          bottom: 3,
          left: 3,
          width: "calc(50% - 3px)",
          borderRadius: 999,
          bgcolor: "#fff",
          boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
          transform: `translateX(${activeIndex * 100}%)`,
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          zIndex: 0,
        }}
      />
      {MODES.map((m) => {
        const active = mode === m.id
        const disabled = isAgriLocked && m.id === WORKSPACE_BIOTECH
        return (
          <Box
            key={m.id}
            component="button"
            type="button"
            disabled={disabled || (!canSwitch && !isAgriLocked)}
            onClick={() => {
              if (disabled) return
              setMode(m.id)
              navigate(m.home)
            }}
            sx={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              py: 0.85,
              px: 1,
              border: 0,
              background: "transparent",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.45 : 1,
              transition: "color 200ms ease",
            }}
          >
            <Box
              sx={{
                width: 22,
                height: 22,
                borderRadius: 1,
                display: "grid",
                placeItems: "center",
                fontSize: 10,
                fontWeight: 800,
                color: "#fff",
                bgcolor: active ? m.color : "#94a3b8",
                transition: "background-color 220ms ease, transform 220ms ease",
                transform: active ? "scale(1.05)" : "scale(1)",
              }}
            >
              {m.short}
            </Box>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: active ? 800 : 600,
                color: active ? "text.primary" : "text.secondary",
                display: { xs: "none", sm: "block" },
                whiteSpace: "nowrap",
              }}
            >
              {m.name}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
