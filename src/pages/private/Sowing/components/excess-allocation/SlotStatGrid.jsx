import React from "react"
import { Box, Typography } from "@mui/material"
import { fmtNum } from "./slotStockUtils"

const STATS = [
  { key: "available", label: "Avail", accent: "#166534", bg: "#dcfce7" },
  { key: "booked", label: "Booked", accent: "#475569", bg: "#f1f5f9" },
  { key: "sowed", label: "Sowed", accent: "#1d4ed8", bg: "#dbeafe" },
  { key: "gap", label: "Gap", accent: "#92400e", bg: "#fef3c7" },
]

export default function SlotStatGrid({ available = 0, booked = 0, sowed = 0, gap = 0 }) {
  const values = { available, booked, sowed, gap }

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: 0.75,
        mt: 1,
      }}
    >
      {STATS.map(({ key, label, accent, bg }) => {
        const n = Number(values[key]) || 0
        const hot =
          (key === "available" && n > 0) ||
          (key === "gap" && n > 0) ||
          (key === "booked" && n > 0) ||
          (key === "sowed" && n > 0)
        return (
          <Box
            key={key}
            sx={{
              px: 1,
              py: 0.75,
              borderRadius: 1.25,
              bgcolor: hot ? bg : "#f8fafc",
              border: "1px solid",
              borderColor: hot ? `${accent}33` : "#e2e8f0",
              textAlign: "center",
            }}
          >
            <Typography
              variant="caption"
              display="block"
              fontWeight={700}
              color="text.secondary"
              lineHeight={1.2}
              fontSize="0.62rem"
            >
              {label}
            </Typography>
            <Typography
              fontWeight={900}
              fontSize="0.95rem"
              color={hot ? accent : "#94a3b8"}
              lineHeight={1.3}
            >
              {fmtNum(n)}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}
