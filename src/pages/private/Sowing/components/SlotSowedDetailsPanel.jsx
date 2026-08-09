import React from "react"
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper,
} from "@mui/material"

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

/**
 * Slot click: sow batches + reserved vs saleable chips.
 */
export default function SlotSowedDetailsPanel({
  sowBatches = [],
  summary = {},
  onChipClick,
}) {
  const batches = Array.isArray(sowBatches) ? sowBatches : []
  const reserved =
    Number(summary.orderReservedPlants) ||
    Number(summary.coveredPlants) ||
    0
  const available =
    Number(summary.availableForSale ?? summary.availablePlants) || 0

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1 }}>
        Sowed details
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        <Chip
          size="small"
          clickable={Boolean(onChipClick)}
          onClick={() => onChipClick?.("reserved")}
          label={`Reserved (orders): ${fmtNum(reserved)}`}
          sx={{ fontWeight: 800, bgcolor: "#dcfce7", color: "#166534" }}
        />
        <Chip
          size="small"
          clickable={Boolean(onChipClick)}
          color="success"
          variant="outlined"
          onClick={() => onChipClick?.("available")}
          label={`Available (sale): ${fmtNum(available)}`}
          sx={{ fontWeight: 700 }}
        />
        <Chip
          size="small"
          color="primary"
          variant="outlined"
          label={`Sowed: ${fmtNum(summary.totalSowedPlants)}`}
          sx={{ fontWeight: 700 }}
        />
        <Chip
          size="small"
          variant="outlined"
          label={`Packets used: ${fmtNum(summary.totalPacketsUsed)}`}
          sx={{ fontWeight: 700 }}
        />
        {summary.plantReadyDate ? (
          <Chip
            size="small"
            color="info"
            variant="outlined"
            label={`Ready: ${summary.plantReadyDate}${
              summary.plantReadyDays
                ? ` (+${summary.plantReadyDays}d)`
                : ""
            }`}
            sx={{ fontWeight: 700 }}
          />
        ) : null}
        {summary.sowingDate ? (
          <Chip
            size="small"
            variant="outlined"
            label={`Last sow: ${summary.sowingDate}`}
            sx={{ fontWeight: 700 }}
          />
        ) : null}
      </Stack>

      {batches.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No sow batches recorded on this slot yet.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ maxHeight: 280, overflowY: "auto" }}>
          {batches.map((b, i) => (
            <Paper
              key={b._id || `${b.requestNumber}-${b.sowingDate}-${i}`}
              variant="outlined"
              sx={{ p: 1.25, borderRadius: 2, bgcolor: "#f8fafc" }}
            >
              <Typography fontWeight={800} fontSize="0.85rem">
                {b.sowingDate || "—"} · {fmtNum(b.plantsSowed)} plants
                {b.packetsUsed ? ` · ${fmtNum(b.packetsUsed)} pkt` : ""}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {b.shedName ? `Shed ${b.shedName} · ` : ""}
                Ready {b.plantReadyDate || "—"}
                {b.plantReadyDays != null ? ` (sow + ${b.plantReadyDays}d)` : ""}
                {b.requestNumber ? ` · ${b.requestNumber}` : ""}
              </Typography>
              <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap" useFlexGap>
                {(Number(b.orderCoveredPlants) || 0) > 0 && (
                  <Chip
                    size="small"
                    label={`Reserved ${fmtNum(b.orderCoveredPlants)}`}
                    sx={{
                      height: 20,
                      fontWeight: 800,
                      fontSize: "0.65rem",
                      bgcolor: "#dcfce7",
                      color: "#166534",
                    }}
                  />
                )}
                {(Number(b.excessPlants) || 0) > 0 && (
                  <Chip
                    size="small"
                    label={`Excess ${fmtNum(b.excessPlants)}`}
                    sx={{
                      height: 20,
                      fontWeight: 800,
                      fontSize: "0.65rem",
                      bgcolor: "#fef3c7",
                      color: "#92400e",
                    }}
                  />
                )}
                {b.isExcessiveSowing ? (
                  <Chip
                    size="small"
                    label="EXCESS REQ"
                    sx={{
                      height: 20,
                      fontWeight: 800,
                      fontSize: "0.65rem",
                      bgcolor: "#f59e0b",
                      color: "#fff",
                    }}
                  />
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  )
}
