import React from "react"
import { Box, Typography } from "@mui/material"
import CheckCircleIcon from "@mui/icons-material/CheckCircle"
import { KIOSK_THEME } from "./kioskTheme"

export default function KioskStepBar({ steps, activeIndex }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
      {steps.map((step, idx) => {
        const done = idx < activeIndex
        const active = idx === activeIndex
        return (
          <React.Fragment key={step.id}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.5,
                py: 0.75,
                borderRadius: 999,
                bgcolor: done ? KIOSK_THEME.teal[100] : active ? KIOSK_THEME.teal[50] : KIOSK_THEME.slate[100],
                border: "1px solid",
                borderColor: done || active ? KIOSK_THEME.teal[500] : "#e2e8f0",
              }}
            >
              {done ? (
                <CheckCircleIcon sx={{ fontSize: 18, color: KIOSK_THEME.teal[600] }} />
              ) : (
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: active ? KIOSK_THEME.teal[600] : "#cbd5e1",
                    color: "#fff",
                  }}
                >
                  {idx + 1}
                </Box>
              )}
              <Typography variant="caption" fontWeight={active ? 700 : 500} color={active ? KIOSK_THEME.teal[900] : KIOSK_THEME.slate[600]}>
                {step.label}
              </Typography>
            </Box>
            {idx < steps.length - 1 && (
              <Box sx={{ width: 24, height: 2, bgcolor: done ? KIOSK_THEME.teal[500] : "#e2e8f0", borderRadius: 1 }} />
            )}
          </React.Fragment>
        )
      })}
    </Box>
  )
}
