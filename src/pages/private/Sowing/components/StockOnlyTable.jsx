import React from "react"
import { Box, Stack, Table, TableBody, TableCell, TableFooter, TableHead, TableRow, Typography } from "@mui/material"
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight"
import { dayLabel, fmt } from "../capacitySheetUtils"

const C = {
  ink: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  head: "#f8fafc",
  green: "#047857",
  blue: "#1d4ed8",
  amber: "#b45309",
}

const cellSx = {
  borderBottom: `1px solid ${C.line}`,
  borderRight: `1px solid ${C.line}`,
  px: 1.5,
  py: 1,
  fontVariantNumeric: "tabular-nums",
  fontSize: 13,
}

const HEADERS = [
  { label: "Crop – Variety / Shed batch", align: "left" },
  { label: "Lagwad date", align: "left" },
  { label: "Ready on", align: "left" },
  { label: "In shed", align: "right" },
  { label: "Ready now", align: "right" },
  { label: "Not ready yet", align: "right" },
  { label: "Next ready", align: "left" },
]

const num = (value) => Number(value) || 0

function Qty({ value, color, bold }) {
  const n = num(value)
  return (
    <Typography component="span" sx={{ fontSize: 13, fontWeight: bold ? 800 : 700, color: n ? color || C.ink : "#cbd5e1" }}>
      {n ? fmt(n) : "—"}
    </Typography>
  )
}

function Day({ value }) {
  return value ? dayLabel(value) : <Box component="span" sx={{ color: "#cbd5e1" }}>—</Box>
}

function VarietyRows({ row }) {
  const batches = row.stock?.batches || []
  const notReady = batches.reduce((acc, batch) => acc + num(batch.notReady), 0)
  return (
    <>
      <TableRow sx={{ bgcolor: "#f8fafc" }}>
        <TableCell sx={{ ...cellSx, borderLeft: `4px solid ${row.sowingAllowed ? "#94a3b8" : "#2563eb"}` }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: C.ink }}>
              {row.plantName} – {row.subtypeName}
            </Typography>
            <Box
              component="span"
              sx={{
                fontSize: 10.5,
                fontWeight: 800,
                px: 0.75,
                borderRadius: 0.75,
                whiteSpace: "nowrap",
                color: row.sowingAllowed ? C.muted : C.blue,
                bgcolor: row.sowingAllowed ? "#f1f5f9" : "#eff6ff",
                border: `1px solid ${row.sowingAllowed ? C.line : "#bfdbfe"}`,
              }}
            >
              {row.sowingAllowed ? "No slots in range" : "Sowing not required"}
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 11, color: C.muted }}>
            {batches.length} shed batch{batches.length === 1 ? "" : "es"}
          </Typography>
        </TableCell>
        <TableCell sx={cellSx} />
        <TableCell sx={cellSx} />
        <TableCell align="right" sx={cellSx}>
          <Qty value={row.stock?.inShed} bold />
        </TableCell>
        <TableCell align="right" sx={cellSx}>
          <Qty value={row.stock?.readyNow} color={C.green} bold />
        </TableCell>
        <TableCell align="right" sx={cellSx}>
          <Qty value={notReady} color={C.amber} bold />
        </TableCell>
        <TableCell sx={cellSx} />
      </TableRow>
      {batches.map((batch) => (
        <TableRow key={`${batch.shed}-${batch.batchNumber}`} hover>
          <TableCell sx={{ ...cellSx, pl: 4 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <SubdirectoryArrowRightIcon sx={{ fontSize: 15, color: C.faint }} />
              <Typography sx={{ fontSize: 13, color: C.muted }}>
                <Box component="span" sx={{ fontWeight: 800, color: C.ink }}>
                  {batch.shed}
                </Box>
                {batch.batchNumber ? ` · Batch ${batch.batchNumber}` : ""}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell sx={cellSx}>
            <Day value={batch.lagwadDate} />
          </TableCell>
          <TableCell sx={cellSx}>
            <Day value={batch.readyDate} />
          </TableCell>
          <TableCell align="right" sx={cellSx}>
            <Qty value={batch.inShed} />
          </TableCell>
          <TableCell align="right" sx={cellSx}>
            <Qty value={batch.readyNow} color={C.green} />
          </TableCell>
          <TableCell align="right" sx={cellSx}>
            <Qty value={batch.notReady} color={C.amber} />
          </TableCell>
          <TableCell sx={cellSx}>
            <Day value={batch.nextReadyDate} />
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

export default function StockOnlyTable({ rows }) {
  const sorted = [...rows].sort(
    (a, b) => String(a.plantName).localeCompare(String(b.plantName)) || String(a.subtypeName).localeCompare(String(b.subtypeName))
  )
  const total = (pick) => sorted.reduce((acc, row) => acc + pick(row), 0)
  const inShed = total((row) => num(row.stock?.inShed))
  const readyNow = total((row) => num(row.stock?.readyNow))
  const notReady = total((row) => (row.stock?.batches || []).reduce((acc, batch) => acc + num(batch.notReady), 0))
  const batchCount = total((row) => row.stock?.batches?.length || 0)

  return (
    <Box sx={{ overflow: "auto", maxHeight: "calc(100vh - 300px)" }}>
      <Table size="small" stickyHeader sx={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 820 }}>
        <TableHead>
          <TableRow>
            {HEADERS.map((head) => (
              <TableCell
                key={head.label}
                align={head.align}
                sx={{ ...cellSx, bgcolor: C.head, color: C.muted, fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.3, whiteSpace: "nowrap" }}
              >
                {head.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row) => (
            <VarietyRows key={`${row.plantId}-${row.subtypeId}`} row={row} />
          ))}
        </TableBody>
        {sorted.length ? (
          <TableFooter>
            <TableRow sx={{ "& td": { position: "sticky", bottom: 0, zIndex: 1, bgcolor: "#f1f5f9", borderTop: "2px solid #cbd5e1" } }}>
              <TableCell sx={cellSx}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.ink }}>
                  TOTAL ({sorted.length} varieties · {batchCount} batches)
                </Typography>
              </TableCell>
              <TableCell sx={cellSx} />
              <TableCell sx={cellSx} />
              <TableCell align="right" sx={cellSx}>
                <Qty value={inShed} bold />
              </TableCell>
              <TableCell align="right" sx={cellSx}>
                <Qty value={readyNow} color={C.green} bold />
              </TableCell>
              <TableCell align="right" sx={cellSx}>
                <Qty value={notReady} color={C.amber} bold />
              </TableCell>
              <TableCell sx={cellSx} />
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </Box>
  )
}
