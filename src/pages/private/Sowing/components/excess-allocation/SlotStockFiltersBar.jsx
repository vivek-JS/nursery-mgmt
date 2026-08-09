import React from "react"
import {
  Box,
  Chip,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material"
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth"
import { monthLabel, shiftMonth, currentMonthKey } from "./slotStockFilters"

const HORIZON_OPTS = [0, 1, 2, 3, 4, 5, 6, 7]

export default function SlotStockFiltersBar({
  month,
  onMonthChange,
  showOverdue,
  onShowOverdueChange,
  showToday,
  onShowTodayChange,
  horizonDays,
  onHorizonDaysChange,
  showActiveOnly,
  onShowActiveOnlyChange,
  fullMonth,
  onFullMonthChange,
  slotCount = 0,
  disabled = false,
}) {
  const isCurrentMonth = month === currentMonthKey()

  return (
    <Box
      sx={{
        p: 1.5,
        mb: 2,
        borderRadius: 2,
        bgcolor: "#f0fdf4",
        border: "1px solid #bbf7d0",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap mb={1.25}>
        <CalendarMonthIcon sx={{ color: "#166534", fontSize: 20 }} />
        <IconButton
          size="small"
          disabled={disabled}
          onClick={() => onMonthChange(shiftMonth(month, -1))}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography fontWeight={900} color="#14532d" minWidth={140} textAlign="center">
          {monthLabel(month)}
        </Typography>
        <IconButton
          size="small"
          disabled={disabled}
          onClick={() => onMonthChange(shiftMonth(month, 1))}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </IconButton>
        {!isCurrentMonth && (
          <Chip
            size="small"
            clickable
            disabled={disabled}
            label="This month"
            onClick={() => onMonthChange(currentMonthKey())}
            sx={{ fontWeight: 700 }}
          />
        )}
        <Chip size="small" label={`${slotCount} slots`} variant="outlined" sx={{ fontWeight: 700 }} />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
        <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ mr: 0.5 }}>
          Sow window
        </Typography>
        <ToggleButtonGroup size="small" sx={{ flexWrap: "wrap" }}>
          <ToggleButton
            value="overdue"
            selected={showOverdue}
            disabled={disabled || fullMonth}
            onClick={() => onShowOverdueChange(!showOverdue)}
            sx={{ textTransform: "none", fontWeight: 800, px: 1.25 }}
          >
            Past due
          </ToggleButton>
          <ToggleButton
            value="today"
            selected={showToday}
            disabled={disabled || fullMonth}
            onClick={() => onShowTodayChange(!showToday)}
            sx={{ textTransform: "none", fontWeight: 800, px: 1.25 }}
          >
            Today
          </ToggleButton>
        </ToggleButtonGroup>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {HORIZON_OPTS.map((d) => {
            const selected = horizonDays === d
            return (
              <Chip
                key={d}
                size="small"
                clickable
                disabled={disabled || fullMonth}
                label={d === 0 ? "+0d" : `+${d}d`}
                onClick={() => onHorizonDaysChange(d)}
                sx={{
                  height: 28,
                  fontWeight: 800,
                  bgcolor: selected ? "#166534" : "#fff",
                  color: selected ? "#fff" : "#14532d",
                  border: "1.5px solid",
                  borderColor: selected ? "#166534" : "#86efac",
                }}
              />
            )
          })}
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip
          clickable
          disabled={disabled}
          label={showActiveOnly ? "Active only" : "All slots (incl. zero)"}
          color={showActiveOnly ? "warning" : "default"}
          onClick={() => onShowActiveOnlyChange(!showActiveOnly)}
          sx={{ fontWeight: 700 }}
        />
        <Chip
          clickable
          disabled={disabled}
          label={fullMonth ? "Full month view" : "Sow window only"}
          color={fullMonth ? "success" : "default"}
          variant={fullMonth ? "filled" : "outlined"}
          onClick={() => onFullMonthChange(!fullMonth)}
          sx={{ fontWeight: 700 }}
        />
      </Stack>
    </Box>
  )
}
