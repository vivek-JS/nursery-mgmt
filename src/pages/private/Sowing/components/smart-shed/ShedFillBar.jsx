import React from "react"
import { Box, Stack, Tooltip, Typography } from "@mui/material"
import { CROP, CROP_KEYS, MUTED, VACANT, cropShares, fmt, pctLabel } from "./smartShedFormat"

/**
 * Shared floor as one bar. Segments are share of floor, not plant counts:
 * one papaya does not take the same space as one watermelon.
 * Overfull sheds compress the track and show the part past 100% in red.
 */
export default function ShedFillBar({ shed, height = 22, showLegend = true }) {
  const shares = cropShares(shed)
  const used = Number(shed?.used) || 0
  const scale = Math.max(1, used)
  const fullMark = 100 / scale

  return (
    <Box>
      <Box sx={{ position: "relative", height, borderRadius: 99, bgcolor: VACANT, overflow: "hidden" }}>
        <Stack direction="row" sx={{ position: "absolute", inset: 0 }}>
          {CROP_KEYS.map((key) => {
            const width = (shares[key] / scale) * 100
            if (!(width > 0)) return null
            const occupied = key === "papaya" ? shed.papayaOccupied : shed[key]?.occupied
            return (
              <Tooltip
                key={key}
                arrow
                title={`${CROP[key].label}: ${fmt(occupied)} plants · ${pctLabel(shares[key])} of floor`}
              >
                <Box
                  sx={{
                    width: `${width}%`,
                    minWidth: 3,
                    bgcolor: CROP[key].color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRight: "1.5px solid rgba(255,255,255,0.7)",
                    transition: "width 0.4s ease",
                  }}
                >
                  {width >= 11 && height >= 18 ? (
                    <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#fff", whiteSpace: "nowrap" }}>
                      {pctLabel(shares[key])}
                    </Typography>
                  ) : null}
                </Box>
              </Tooltip>
            )
          })}
        </Stack>
        {used > 1 ? (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${fullMark}%`,
              right: 0,
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(185,28,28,0.55) 0 6px, rgba(185,28,28,0.18) 6px 12px)",
            }}
          />
        ) : null}
        {used > 1 ? (
          <Box sx={{ position: "absolute", top: -2, bottom: -2, left: `calc(${fullMark}% - 1px)`, width: 2, bgcolor: "#7f1d1d" }} />
        ) : null}
      </Box>

      {showLegend ? (
        <Stack direction="row" sx={{ mt: 0.85, columnGap: 1.75, rowGap: 0.5 }} flexWrap="wrap">
          {CROP_KEYS.filter((key) => key !== "muskmelon" || shares.muskmelon > 0).map((key) => (
            <Legend key={key} color={CROP[key].color} label={`${CROP[key].label} ${pctLabel(shares[key])}`} />
          ))}
          <Legend color={VACANT} label={`Vacant ${pctLabel(Number(shed?.vacant) || 0)}`} outlined />
          {used > 1 ? <Legend color="#dc2626" label={`Over by ${pctLabel(used - 1)}`} /> : null}
        </Stack>
      ) : null}
    </Box>
  )
}

function Legend({ color, label, outlined = false }) {
  return (
    <Stack direction="row" spacing={0.6} alignItems="center">
      <Box sx={{ width: 10, height: 10, borderRadius: 0.75, bgcolor: color, border: outlined ? "1px solid #cbd5e1" : "none" }} />
      <Typography sx={{ fontSize: 12, color: MUTED, fontWeight: 700 }}>{label}</Typography>
    </Stack>
  )
}
