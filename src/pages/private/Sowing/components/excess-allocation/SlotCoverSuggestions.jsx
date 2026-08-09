import React from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material"
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh"
import SwapHorizIcon from "@mui/icons-material/SwapHoriz"
import { fmtNum, offsetLabel, COVER_WINDOW_DAYS } from "./slotStockUtils"

export default function SlotCoverSuggestions({
  suggestions = [],
  canAct = false,
  onTransfer,
  onAssign,
}) {
  if (!suggestions.length) return null

  const top = suggestions.slice(0, 8)

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        mb: 2,
        borderRadius: 2,
        borderColor: "#93c5fd",
        bgcolor: "#eff6ff",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <AutoFixHighIcon sx={{ color: "#1d4ed8", fontSize: 20 }} />
        <Typography fontWeight={900} color="#1e40af" fontSize="0.95rem">
          Smart cover · delivery −{COVER_WINDOW_DAYS}d…0
        </Typography>
        <Chip size="small" label={`${suggestions.length} match(es)`} sx={{ fontWeight: 700 }} />
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" mb={1.25}>
        Move surplus from ready slots to nearby gap slots, then assign to mark orders sow complete.
        Partial cover keeps orders pending until fully allocated.
      </Typography>
      <Stack spacing={0.75}>
        {top.map((s) => (
          <Box
            key={`${s.fromSlotId}-${s.toSlotId}`}
            sx={{
              px: 1.25,
              py: 0.85,
              borderRadius: 1.5,
              bgcolor: "#fff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Box minWidth={0}>
              <Typography variant="body2" fontWeight={800} noWrap>
                {s.plantName} · {s.subtypeName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {s.fromLabel} → {s.toLabel} · move up to {fmtNum(s.movable)} · gap {fmtNum(s.gap)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={s.offsetLabel || offsetLabel(s.offsetDays)}
                sx={{ height: 22, fontWeight: 700, bgcolor: "#dbeafe", color: "#1d4ed8" }}
              />
              {canAct && onTransfer && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<SwapHorizIcon sx={{ fontSize: 14 }} />}
                  onClick={() =>
                    onTransfer({
                      slotId: s.fromSlotId,
                      slotLabel: s.fromLabel,
                      mode: "out",
                      peerSlotId: s.toSlotId,
                      suggestedQty: s.movable,
                    })
                  }
                  sx={{ textTransform: "none", fontWeight: 700, fontSize: "0.7rem" }}
                >
                  Transfer
                </Button>
              )}
              {canAct && onAssign && (
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  onClick={() =>
                    onAssign({
                      slotId: s.fromSlotId,
                      slotLabel: s.fromLabel,
                      availablePlants: s.available,
                      plantId: s.plantId,
                      subtypeId: s.subtypeId,
                    })
                  }
                  sx={{ textTransform: "none", fontWeight: 800, fontSize: "0.7rem" }}
                >
                  Assign orders
                </Button>
              )}
            </Stack>
          </Box>
        ))}
      </Stack>
      {suggestions.length > top.length && (
        <Alert severity="info" sx={{ mt: 1, py: 0.25 }}>
          +{suggestions.length - top.length} more matches — search or expand plant groups below.
        </Alert>
      )}
    </Paper>
  )
}
