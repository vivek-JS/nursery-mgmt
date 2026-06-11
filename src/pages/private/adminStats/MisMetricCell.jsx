import React from "react"
import { TableCell, Typography, Tooltip, Box } from "@mui/material"
import { fmt, formatDeliveryTotalDuePlus } from "./misConstants"
import { getCellGuide } from "./misGuide"

/** Plants = primary metric; order count = secondary line. */
export default function MetricCell({
  orders,
  plants,
  onClick,
  tint,
  duePlusBacklog,
  guideKey,
}) {
  const zero = (orders || 0) === 0 && (plants || 0) === 0 && !duePlusBacklog

  let primary = fmt(plants)
  let secondary = `${fmt(orders)} orders`
  let primaryColor = zero ? "text.disabled" : "success.dark"

  if (duePlusBacklog) {
    const d = formatDeliveryTotalDuePlus(duePlusBacklog, plants)
    if (d) {
      primary = d.primary
      secondary = d.secondary
      primaryColor = "warning.dark"
    }
  }

  const cellSx = {
    cursor: onClick ? "pointer" : "default",
    py: 1,
    px: 0.5,
    opacity: zero ? 0.38 : 1,
    bgcolor: tint || "transparent",
    transition: "transform 0.12s, box-shadow 0.12s, background-color 0.12s",
    "&:hover": onClick
      ? {
          bgcolor: duePlusBacklog ? "rgba(255, 152, 0, 0.12)" : "rgba(46, 125, 50, 0.12)",
          transform: "scale(1.02)",
          boxShadow: duePlusBacklog
            ? "inset 0 0 0 1px rgba(255,152,0,0.35)"
            : "inset 0 0 0 1px rgba(46,125,50,0.35)",
        }
      : {},
    verticalAlign: "middle",
  }

  const inner = (
    <>
      <Typography
        component="div"
        fontWeight={800}
        lineHeight={1.15}
        fontSize={duePlusBacklog ? 14 : 16}
        color={primaryColor}
        sx={{ letterSpacing: -0.3 }}>
        {primary}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.2} fontSize={10} fontWeight={500}>
        {secondary}
      </Typography>
    </>
  )

  const guideText = guideKey ? getCellGuide(guideKey, { includeBacklogPlus: Boolean(duePlusBacklog) }) : null

  const body = guideText ? (
    <Tooltip
      title={
        <Box sx={{ maxWidth: 300, fontSize: 12, lineHeight: 1.45 }}>
          {guideText}
        </Box>
      }
      arrow
      placement="top"
      enterDelay={350}
      disableInteractive>
      <Box component="span" sx={{ display: "block", width: "100%" }}>
        {inner}
      </Box>
    </Tooltip>
  ) : (
    inner
  )

  return (
    <TableCell align="center" onClick={onClick} sx={cellSx}>
      {body}
    </TableCell>
  )
}

export function TotalMetricCell({ orders, plants, duePlusBacklog }) {
  let primary = fmt(plants)
  let secondary = `${fmt(orders)} orders`

  if (duePlusBacklog) {
    const d = formatDeliveryTotalDuePlus(duePlusBacklog, plants)
    if (d) {
      primary = d.primary
      secondary = d.secondary
    }
  }

  return (
    <TableCell align="center" sx={{ color: "#fff", py: 1 }}>
      <Typography fontWeight={800} lineHeight={1.15} fontSize={14} color="inherit">
        {primary}
      </Typography>
      <Typography
        variant="caption"
        display="block"
        lineHeight={1.2}
        fontSize={10}
        sx={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>
        {secondary}
      </Typography>
    </TableCell>
  )
}
