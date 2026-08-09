import React from "react"
import { Box, Typography, Stack, Chip, Button } from "@mui/material"
import { fmt } from "./sowingPackingUtils"

/** Compact card for accepted / issued requests — click to see linked orders / excess */
export default function SowingInProgressCard({ card, onClick, showEnterSow, onEnterSow }) {
  const req = card?.activeRequest || card?.pendingRequest || null
  const pkts =
    Number(card?.totalPacketsInProgress) ||
    Number(req?.packetsRequested) ||
    0
  const plants =
    Number(card?.totalPlantsInProgress) ||
    Math.round(pkts * (Number(card?.conversionFactor) || 1))
  const linkedCount = (req?.linkedOrderIds || []).length
  const flaggedExcess =
    Boolean(req?.isExcessiveSowing) || Boolean(card?.isExcessiveSowing)
  const excess = flaggedExcess && linkedCount === 0
  const excessWithCover = flaggedExcess && linkedCount > 0

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(card)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.(card)
        }
      }}
      sx={{
        p: 1.5,
        height: "100%",
        borderRadius: 2.5,
        border: "1.5px solid",
        borderColor: excess ? "#fbbf24" : excessWithCover ? "#86efac" : "#93c5fd",
        bgcolor: excess ? "#fffbeb" : excessWithCover ? "#f0fdf4" : "#eff6ff",
        display: "flex",
        flexDirection: "column",
        gap: 1,
        boxShadow: "0 4px 14px rgba(37,99,235,0.08)",
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 8px 20px rgba(37,99,235,0.14)",
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={0.75}>
        <Box minWidth={0}>
          <Typography fontWeight={800} fontSize="0.95rem" noWrap>
            {card.plantName}
            <Typography component="span" color="text.secondary" fontWeight={600} fontSize="0.85rem">
              {" "}
              · {card.subtypeName}
            </Typography>
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {req?.requestNumber || "—"}
            {req?.isIssuedToday ? " · issued today" : ""}
            {" · tap for "}
            {excess ? "excess" : "covered orders"}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={
            excess
              ? "Excess"
              : excessWithCover
                ? `Excess · ${linkedCount} covered`
                : "Sowing in progress"
          }
          sx={{
            height: 22,
            fontSize: "0.62rem",
            fontWeight: 800,
            bgcolor: excess ? "#f59e0b" : excessWithCover ? "#16a34a" : "#2563eb",
            color: "#fff",
          }}
        />
      </Stack>

      <Box
        sx={{
          px: 1,
          py: 0.75,
          borderRadius: 1.5,
          bgcolor: excess ? "#fef3c7" : excessWithCover ? "#dcfce7" : "#dbeafe",
          border: "1px solid",
          borderColor: excess ? "#fcd34d" : excessWithCover ? "#86efac" : "#93c5fd",
        }}
      >
        <Typography
          fontSize="0.78rem"
          fontWeight={800}
          color={excess ? "#92400e" : excessWithCover ? "#166534" : "#1d4ed8"}
        >
          {excess
            ? "Excess sowing — no farmer orders yet"
            : excessWithCover
              ? `Covered ${linkedCount} orders (±4d ready window)`
              : "Stock issued — primary team sowing"}
        </Typography>
        <Typography fontSize="0.7rem" fontWeight={600} color="text.secondary">
          {fmt(pkts, 2)} pkt
          {plants > 0 ? ` · ~${fmt(plants)} plants` : ""}
          {!excess && linkedCount > 0 ? ` · ${linkedCount} orders` : ""}
        </Typography>
      </Box>

      <Chip
        size="small"
        label={
          excess
            ? "View excess details"
            : excessWithCover
              ? "View covered orders"
              : "View orders being sowed"
        }
        sx={{
          mt: showEnterSow ? 0.5 : "auto",
          height: 28,
          fontWeight: 700,
          bgcolor: excess ? "#fef3c7" : "#dbeafe",
          color: excess ? "#92400e" : "#1d4ed8",
        }}
      />

      {showEnterSow && (
        <Button
          size="small"
          variant="contained"
          fullWidth
          onClick={(e) => {
            e.stopPropagation()
            onEnterSow?.(card)
          }}
          sx={{ mt: 0.75, textTransform: "none", fontWeight: 800 }}
        >
          Enter sow
        </Button>
      )}
    </Box>
  )
}
