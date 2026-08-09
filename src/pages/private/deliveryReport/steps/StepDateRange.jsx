import React from "react"
import { Box, Button, Chip, FormControlLabel, Switch, Typography } from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import dayjs from "dayjs"
import { MIS_DATE_PICKER_FORMAT } from "../../adminStats/misIstDate"
import { formatIstYmd } from "utils/istCalendar"

export default function StepDateRange({
  startDate,
  endDate,
  includePastDueBeyondRange,
  onStartChange,
  onEndChange,
  onBacklogToggle,
}) {
  const applyToday = () => {
    const today = dayjs()
    onStartChange(today)
    onEndChange(today)
  }

  const rangeLabel =
    startDate && endDate
      ? `${formatIstYmd(startDate) || "—"} → ${formatIstYmd(endDate) || "—"}`
      : "—"

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        कुठल्या तारखेमधील delivery?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Filter uses <strong>delivery date</strong> (not booking date). फक्त या तारखेमधील delivery दिसतील.
      </Typography>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
        <Button size="small" variant="outlined" onClick={applyToday}>
          Today only
        </Button>
        <Chip size="small" label={`Selected: ${rangeLabel}`} color="primary" variant="outlined" />
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <DatePicker
          label="Start date"
          format={MIS_DATE_PICKER_FORMAT}
          value={startDate}
          onChange={(v) => {
            onStartChange(v)
            if (v && endDate && v.isAfter(endDate, "day")) onEndChange(v)
          }}
          slotProps={{ textField: { size: "small", sx: { minWidth: 160 } } }}
        />
        <DatePicker
          label="End date"
          format={MIS_DATE_PICKER_FORMAT}
          value={endDate}
          minDate={startDate}
          onChange={onEndChange}
          slotProps={{ textField: { size: "small", sx: { minWidth: 160 } } }}
        />
      </Box>

      <FormControlLabel
        control={
          <Switch
            checked={includePastDueBeyondRange}
            onChange={(e) => onBacklogToggle(e.target.checked)}
          />
        }
        label="Include backlog before range (past-due still in pipeline)"
      />
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, ml: 4 }}>
        Range पूर्वीची delivery date असलेले pending orders देखील दाखवा.
      </Typography>
    </Box>
  )
}
