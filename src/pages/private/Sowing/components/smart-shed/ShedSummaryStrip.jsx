import React from "react"
import { Box, ButtonBase, Stack, Typography } from "@mui/material"
import ShedFillBar from "./ShedFillBar"
import { INK, LINE, MUTED, fmt, pctLabel, toneOf } from "./smartShedFormat"

/** One tile per fort: % full and room left. Tap scrolls to that fort's card. */
export default function ShedSummaryStrip({ sheds, onSelect }) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.25,
        gridAutoFlow: { xs: "column", md: "row" },
        gridAutoColumns: { xs: "78%", sm: "44%", md: "auto" },
        gridTemplateColumns: { md: "repeat(4, minmax(0, 1fr))" },
        overflowX: { xs: "auto", md: "visible" },
        scrollSnapType: { xs: "x mandatory", md: "none" },
        pb: { xs: 0.5, md: 0 },
      }}
    >
      {(sheds || []).map((shed) => {
        const tone = toneOf(shed.used)
        return (
          <ButtonBase
            key={shed.key}
            onClick={() => onSelect?.(shed.key)}
            sx={{
              display: "block",
              textAlign: "left",
              scrollSnapAlign: "start",
              bgcolor: "#fff",
              border: `1px solid ${LINE}`,
              borderTop: `4px solid ${tone.bar}`,
              borderRadius: 2.5,
              p: 1.5,
              transition: "box-shadow 0.15s, transform 0.15s",
              "&:hover": { boxShadow: "0 6px 18px rgba(15,23,42,0.08)", transform: "translateY(-1px)" },
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 800, fontSize: 15, color: INK }}>
                  {shed.label}
                </Typography>
                <Typography noWrap sx={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>
                  {shed.labelMr} · {shed.number}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 900, fontSize: 22, color: tone.fg, fontVariantNumeric: "tabular-nums" }}>
                {pctLabel(shed.used)}
              </Typography>
            </Stack>
            <Box sx={{ my: 1 }}>
              <ShedFillBar shed={shed} height={8} showLegend={false} />
            </Box>
            {shed.over || shed.papayaRoom < 1 ? (
              <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: tone.fg }}>No room left</Typography>
            ) : (
              <Typography sx={{ fontSize: 12.5, color: MUTED, fontWeight: 600, lineHeight: 1.35 }}>
                Room <b style={{ color: INK }}>{fmt(shed.papayaRoom)}</b> papaya
                <br />
                or <b style={{ color: INK }}>{fmt(shed.melonRoom)}</b> watermelon
              </Typography>
            )}
          </ButtonBase>
        )
      })}
    </Box>
  )
}
