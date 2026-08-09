import React from "react"
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
  Button,
} from "@mui/material"
import { fmtNum, summarizeDeliveryMonths } from "./directSowUtils"

/**
 * Subtype cards for one plant — click opens sow panel.
 */
export default function PlantSubtypeSowList({
  groups = [],
  selectedSubtypeId = null,
  onSelect,
}) {
  if (!groups.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No subtypes for this plant (or no unsowed orders yet). You can still sow
        excess on a subtype with zero orders.
      </Typography>
    )
  }

  return (
    <Stack spacing={1}>
      {groups.map((g) => {
        const active = String(g.subtypeId) === String(selectedSubtypeId)
        const needed = Number(g.totalPlants) || 0
        const orders = Number(g.orderCount) || 0
        const monthRows = summarizeDeliveryMonths(g.orders || [], g.slotDays || [])
        return (
          <Paper
            key={String(g.subtypeId)}
            variant="outlined"
            onClick={() => onSelect?.(g)}
            sx={{
              p: 1.5,
              cursor: "pointer",
              borderColor: active ? "#166534" : "#e2e8f0",
              bgcolor: active ? "#f0fdf4" : "#fff",
              borderWidth: active ? 2 : 1,
              "&:hover": { boxShadow: "0 4px 14px rgba(0,0,0,0.06)" },
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              gap={1}
            >
              <Box minWidth={0}>
                <Typography fontWeight={900} noWrap>
                  {g.subtypeName}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Ready {g.readyDate || "—"}
                </Typography>
                <Stack direction="row" spacing={0.75} mt={0.75} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`${orders} orders`}
                    sx={{ height: 22, fontWeight: 700 }}
                  />
                  <Chip
                    size="small"
                    label={`Need ${fmtNum(needed)}`}
                    sx={{
                      height: 22,
                      fontWeight: 800,
                      bgcolor: needed > 0 ? "#ffedd5" : "#f1f5f9",
                      color: needed > 0 ? "#9a3412" : "#64748b",
                    }}
                  />
                  <Chip
                    size="small"
                    label={`+${g.plantReadyDays || 0}d`}
                    color="info"
                    variant="outlined"
                    sx={{ height: 22, fontWeight: 700 }}
                  />
                  {monthRows.map((m) => (
                    <Chip
                      key={m.monthKey}
                      size="small"
                      label={
                        m.plants > 0
                          ? `${m.label} · ${fmtNum(m.plants)}`
                          : `${m.label} · slot`
                      }
                      sx={{ height: 22, fontWeight: 700, bgcolor: "#e0f2fe", color: "#0369a1" }}
                    />
                  ))}
                </Stack>
              </Box>
              <Button
                size="small"
                variant={active ? "contained" : "outlined"}
                color="success"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect?.(g)
                }}
                sx={{ textTransform: "none", fontWeight: 800, flexShrink: 0 }}
              >
                Sow
              </Button>
            </Stack>
          </Paper>
        )
      })}
    </Stack>
  )
}
