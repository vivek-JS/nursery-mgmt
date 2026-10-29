import React, { useMemo } from "react"
import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Typography } from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import { CROP, CROP_KEYS, INK, fmt } from "./smartShedFormat"

/** Sowing whose shed name is not one of the four forts. Grouped by shed name, collapsed by default. */
export default function UnmatchedSection({ unmatched }) {
  const groups = useMemo(() => {
    const byShed = new Map()
    for (const batch of unmatched?.batches || []) {
      const name = String(batch.shedName || "").trim() || "No shed name"
      const row = byShed.get(name) || { name, total: 0, batches: 0, papaya: 0, watermelon: 0, muskmelon: 0 }
      const plants = Number(batch.occupied) || 0
      row.total += plants
      row.batches += 1
      if (row[batch.crop] != null) row[batch.crop] += plants
      byShed.set(name, row)
    }
    return [...byShed.values()].sort((a, b) => b.total - a.total)
  }, [unmatched])

  if (!(unmatched?.occupied > 0)) return null

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{ bgcolor: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "12px !important", "&:before": { display: "none" } }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 900, color: "#78350f" }}>
            {fmt(unmatched.occupied)} plants not on these four forts
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: "#92400e", fontWeight: 600 }}>
            {groups.length} shed name{groups.length === 1 ? "" : "s"} · not counted against any ceiling
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 2, pt: 0 }}>
        <Typography sx={{ fontSize: 12.5, color: "#92400e", fontWeight: 600, mb: 1.25 }}>
          The shed name on these batches is not Panhalgad, Kondhana, Vishalgad, or Salher (or their numbers 12, 23, 14, 15).
          Use one of those names on the sow entry and the plants will count on that fort.
        </Typography>
        <Stack spacing={0.75}>
          {groups.map((g) => (
            <Stack
              key={g.name}
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={0.5}
              sx={{ bgcolor: "#fff", border: "1px solid #fde68a", borderRadius: 1.5, px: 1.5, py: 1 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ fontWeight: 800, fontSize: 13.5, color: INK }}>
                  {g.name}
                </Typography>
                <Typography sx={{ fontSize: 12, color: "#92400e", fontWeight: 600 }}>
                  {CROP_KEYS.filter((key) => g[key] > 0)
                    .map((key) => `${CROP[key].label} ${fmt(g[key])}`)
                    .join(" · ")}
                  {` · ${g.batches} batch${g.batches === 1 ? "" : "es"}`}
                </Typography>
              </Box>
              <Typography sx={{ fontWeight: 900, fontSize: 15, color: INK, fontVariantNumeric: "tabular-nums" }}>{fmt(g.total)}</Typography>
            </Stack>
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  )
}
