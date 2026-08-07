import React from "react"
import { Box, TextField, MenuItem, Button, Stack } from "@mui/material"
import dayjs from "dayjs"

const STATUS_OPTIONS = ["", "PRESENT", "LATE", "ABSENT", "HALF_DAY", "ON_LEAVE", "WEEKLY_OFF", "HOLIDAY"]

export default function AttendanceLogsFilters({
  filters,
  onChange,
  departments = [],
  onExport,
  exporting,
}) {
  return (
    <Box sx={{ mb: 2, p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} flexWrap="wrap" useFlexGap>
        <TextField
          label="Date"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.date || dayjs().format("YYYY-MM-DD")}
          onChange={(e) => onChange({ ...filters, date: e.target.value })}
        />
        <TextField
          label="From"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.from || ""}
          onChange={(e) => onChange({ ...filters, from: e.target.value })}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          InputLabelProps={{ shrink: true }}
          value={filters.to || ""}
          onChange={(e) => onChange({ ...filters, to: e.target.value })}
        />
        <TextField
          select
          label="Department"
          size="small"
          sx={{ minWidth: 160 }}
          value={filters.department || ""}
          onChange={(e) => onChange({ ...filters, department: e.target.value })}
        >
          <MenuItem value="">All</MenuItem>
          {departments.map((d) => (
            <MenuItem key={d._id} value={d._id}>
              {d.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          size="small"
          sx={{ minWidth: 140 }}
          value={filters.status || ""}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
        >
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s || "all"} value={s}>
              {s || "All"}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" onClick={onExport} disabled={exporting}>
          Export CSV
        </Button>
      </Stack>
    </Box>
  )
}
