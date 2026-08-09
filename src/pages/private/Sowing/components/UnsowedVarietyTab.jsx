import React, { useMemo } from "react"
import {
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  Paper,
} from "@mui/material"
import { fmt, packingsOf, colorForIndex } from "./sowingPackingUtils"

/**
 * Variety-wise unsowed ranking: highest need-to-sow plants first.
 */
export default function UnsowedVarietyTab({
  cards = [],
  onOrders,
  onRequest,
  onGapClick,
}) {
  const ranked = useMemo(() => {
    return [...(cards || [])]
      .map((card) => {
        const unsowed =
          Number(card.totalPlantsToSowWithBuffer) ||
          Number(card.totalGap) ||
          0
        const orderCount = Number(card.orderCount) || 0
        return { card, unsowed, orderCount }
      })
      .filter((r) => r.unsowed > 0 || r.orderCount > 0)
      .sort(
        (a, b) =>
          b.unsowed - a.unsowed ||
          b.orderCount - a.orderCount ||
          String(a.card.subtypeName || "").localeCompare(
            String(b.card.subtypeName || "")
          )
      )
  }, [cards])

  if (!ranked.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No unsowed order plants in this sow window.
      </Typography>
    )
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={1.25}>
        Varieties by unsowed order plants (highest first) · gap = need to sow
      </Typography>
      <Stack spacing={1}>
        {ranked.map(({ card, unsowed, orderCount }, idx) => {
          const packs = packingsOf(card)
          const open = packs.filter((p) => !p.pendingRequest && !p.activeRequest)
          const c = colorForIndex(idx)
          const due = Number(card.dueGap) || 0
          const today = Number(card.todayGap) || 0
          const upcoming = Number(card.upcomingGap) || 0
          return (
            <Paper
              key={`${card.plantId}-${card.subtypeId}`}
              variant="outlined"
              sx={{
                p: 1.5,
                borderRadius: 2,
                borderColor: c.border,
                bgcolor: c.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                flexWrap: "wrap",
                cursor: "pointer",
                "&:hover": { boxShadow: "0 4px 14px rgba(0,0,0,0.06)" },
              }}
              onClick={() => onOrders?.(card)}
            >
              <Box minWidth={0} flex={1}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`#${idx + 1}`}
                    sx={{
                      height: 22,
                      fontWeight: 900,
                      bgcolor: "#14532d",
                      color: "#fff",
                      fontSize: "0.7rem",
                    }}
                  />
                  <Typography fontWeight={900} color={c.text} noWrap>
                    {card.plantName} · {card.subtypeName}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.75} mt={0.75} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`${fmt(unsowed)} unsowed`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onGapClick?.(card)
                    }}
                    sx={{
                      height: 22,
                      fontWeight: 800,
                      bgcolor: "#ffedd5",
                      color: "#9a3412",
                    }}
                  />
                  <Chip
                    size="small"
                    label={`${orderCount} orders`}
                    sx={{ height: 22, fontWeight: 700 }}
                  />
                  {due > 0 && (
                    <Chip
                      size="small"
                      label={`Overdue ${fmt(due)}`}
                      sx={{
                        height: 22,
                        fontWeight: 700,
                        bgcolor: "#fee2e2",
                        color: "#991b1b",
                      }}
                    />
                  )}
                  {today > 0 && (
                    <Chip
                      size="small"
                      label={`Today ${fmt(today)}`}
                      sx={{
                        height: 22,
                        fontWeight: 700,
                        bgcolor: "#dbeafe",
                        color: "#1d4ed8",
                      }}
                    />
                  )}
                  {upcoming > 0 && (
                    <Chip
                      size="small"
                      label={`Upcoming ${fmt(upcoming)}`}
                      sx={{
                        height: 22,
                        fontWeight: 700,
                        bgcolor: "#dcfce7",
                        color: "#166534",
                      }}
                    />
                  )}
                </Stack>
              </Box>
              <Stack direction="row" spacing={1} onClick={(e) => e.stopPropagation()}>
                <Button
                  size="small"
                  onClick={() => onOrders?.(card)}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Orders
                </Button>
                {open.length > 0 && (
                  <Button
                    size="small"
                    variant="contained"
                    disableElevation
                    onClick={() => onRequest?.(card, open)}
                    sx={{
                      textTransform: "none",
                      fontWeight: 800,
                      bgcolor: c.bar,
                    }}
                  >
                    {open.length > 1 ? "Combine" : "Request"}
                  </Button>
                )}
              </Stack>
            </Paper>
          )
        })}
      </Stack>
    </Box>
  )
}
