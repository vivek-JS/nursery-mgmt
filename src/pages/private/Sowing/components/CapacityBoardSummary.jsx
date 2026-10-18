import React from "react"
import { Box, Stack, Typography } from "@mui/material"
import { fmt, slotRangeLabel } from "../capacitySheetUtils"

const C = {
  ink: "#0f172a",
  muted: "#64748b",
  line: "#e2e8f0",
}

function Card({ label, value, hint, color, bg, bar, children }) {
  return (
    <Box
      sx={{
        flex: "1 1 180px",
        minWidth: 160,
        px: 1.5,
        py: 1.1,
        borderRadius: 2,
        bgcolor: bg,
        border: `1px solid ${C.line}`,
        borderTop: `3px solid ${bar}`,
      }}
    >
      <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: 0.3 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>
        {fmt(value)}
      </Typography>
      {hint ? (
        <Typography sx={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{hint}</Typography>
      ) : null}
      {children}
    </Box>
  )
}

export default function CapacityBoardSummary({ summary, onOpen }) {
  if (!summary) return null
  const due = summary.dueSow || []
  const byDate = []
  const seen = new Map()
  for (const item of due) {
    const key = item.sowBy || item.startDay
    if (!seen.has(key)) {
      seen.set(key, { sowBy: item.sowBy, startDay: item.startDay, plants: 0, items: [] })
      byDate.push(seen.get(key))
    }
    const bucket = seen.get(key)
    bucket.plants += Number(item.plants) || 0
    bucket.items.push(item)
  }

  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} sx={{ mb: 1.5 }} useFlexGap flexWrap="wrap">
      <Card
        label="Sellable excess"
        value={summary.totalExcess}
        hint={`Next ${summary.tableDays || 30} days · after 10% mortality`}
        color="#047857"
        bg="#ecfdf5"
        bar="#10b981"
      />
      <Card
        label="Not sown"
        value={summary.totalUnsown}
        hint="Booked orders still waiting to sow"
        color="#be123c"
        bg="#fff1f2"
        bar="#f43f5e"
      />
      <Card
        label="Should have been sown"
        value={summary.dueSowPlants}
        hint="Sow-by date is today or already past"
        color="#b45309"
        bg="#fffbeb"
        bar="#f59e0b"
      >
        {byDate.length ? (
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mt: 0.75 }}>
            {byDate.slice(0, 8).map((bucket) => (
              <Box
                key={bucket.sowBy || bucket.startDay}
                onClick={() => {
                  const slotIds = bucket.items.flatMap((item) => item.slotIds || []).filter(Boolean)
                  if (slotIds.length) onOpen?.(slotIds, "gap")
                }}
                sx={{
                  px: 0.75,
                  py: 0.35,
                  borderRadius: 1,
                  bgcolor: "#fff",
                  border: "1px solid #fcd34d",
                  cursor: bucket.items.some((item) => item.slotIds?.length) ? "pointer" : "default",
                }}
              >
                <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: "#92400e" }}>
                  {slotRangeLabel(bucket.sowBy, bucket.sowBy)} · {fmt(bucket.plants)}
                </Typography>
                <Typography sx={{ fontSize: 10, color: C.muted }} noWrap>
                  {bucket.items
                    .slice(0, 2)
                    .map((item) => item.subtypeName)
                    .join(", ")}
                  {bucket.items.length > 2 ? ` +${bucket.items.length - 2}` : ""}
                </Typography>
              </Box>
            ))}
          </Stack>
        ) : null}
      </Card>
    </Stack>
  )
}
