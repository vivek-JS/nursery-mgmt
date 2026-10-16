import React from "react"
import {
  Box,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography
} from "@mui/material"
import ChevronRightIcon from "@mui/icons-material/ChevronRight"
import HistoryIcon from "@mui/icons-material/History"
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight"
import { dayLabel, fmt, signed } from "../capacitySheetUtils"
import {
  boardColumns,
  cellLabel,
  columnTotals,
  groupByCrop,
  hasOverdue,
  isUrgent,
  rowCards
} from "../capacityBoardUtils"

const C = {
  ink: "#0f172a",
  muted: "#64748b",
  faint: "#94a3b8",
  line: "#e2e8f0",
  head: "#f8fafc",
  green: "#047857",
  greenBg: "#ecfdf5",
  greenLine: "#a7f3d0",
  red: "#be123c",
  redBg: "#fff1f2",
  redLine: "#fecdd3",
  amberBg: "#fffbeb",
  amberLine: "#fcd34d"
}

const cellSx = {
  borderBottom: `1px solid ${C.line}`,
  borderRight: `1px solid ${C.line}`,
  px: 1.5,
  py: 1,
  verticalAlign: "top",
  fontVariantNumeric: "tabular-nums"
}

const stickyLeft = {
  position: "sticky",
  left: 0,
  zIndex: 2,
  boxShadow: "2px 0 4px -1px rgba(15,23,42,0.06)"
}

const sum = (rows, pick) => rows.reduce((acc, row) => acc + (Number(pick(row)) || 0), 0)

function NetChip({ net, booked }) {
  const n = Number(net) || 0
  if (n === 0 && !Number(booked)) return null
  const tone =
    n < 0
      ? { color: C.red, bg: C.redBg, border: C.redLine, text: `${fmt(n)} short` }
      : n > 0
      ? { color: C.green, bg: C.greenBg, border: C.greenLine, text: `${signed(n)} free` }
      : { color: C.muted, bg: "#f1f5f9", border: C.line, text: "Matched" }
  return (
    <Box
      component="span"
      sx={{
        px: 0.6,
        py: 0.05,
        borderRadius: 1,
        fontSize: 10.5,
        fontWeight: 800,
        whiteSpace: "nowrap",
        color: tone.color,
        bgcolor: tone.bg,
        border: `1px solid ${tone.border}`
      }}>
      {tone.text}
    </Box>
  )
}

function TipRow({ label, value, color }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <span>{label}</span>
      <Box component="span" sx={{ fontWeight: 800, color: color || "inherit" }}>
        {value}
      </Box>
    </Stack>
  )
}

function CellTip({ cell, title }) {
  const overdue = cell?.overdue
  return (
    <Box sx={{ fontSize: 12, minWidth: 190 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 0.5 }}>{title}</Typography>
      <TipRow label="Ready (sowed)" value={fmt(cell.ready)} />
      <TipRow label="Booked" value={fmt(cell.booked)} />
      {Number(cell.gap) > 0 ? (
        <TipRow label="Booked, not sowed yet" value={fmt(cell.gap)} color="#fda4af" />
      ) : null}
      {overdue && Number(overdue.booked) > 0 ? (
        <TipRow label="Overdue, not dispatched" value={fmt(overdue.booked)} color="#fda4af" />
      ) : null}
      {overdue && Number(overdue.unsold) > 0 ? (
        <TipRow label="Unsold from past slots" value={fmt(overdue.unsold)} color="#6ee7b7" />
      ) : null}
      <Box sx={{ borderTop: "1px solid rgba(255,255,255,0.2)", mt: 0.5, pt: 0.5 }}>
        <TipRow
          label={Number(cell.net) < 0 ? "Short" : "Free to sell"}
          value={signed(cell.net)}
          color={Number(cell.net) < 0 ? "#fda4af" : "#6ee7b7"}
        />
      </Box>
      <Typography sx={{ fontSize: 11, opacity: 0.7, mt: 0.5 }}>Click to see orders</Typography>
    </Box>
  )
}

function cardTone(cell) {
  const net = Number(cell.net) || 0
  if (net < 0) return C.red
  if (net > 0) return "#10b981"
  return C.line
}

/** One date for one variety: date on top, ready plants, free/short chip, booked. */
function DateCard({ cell, onOpen }) {
  const { range, sub } = cellLabel(cell)
  const ready = Number(cell.ready) || 0
  const booked = Number(cell.booked) || 0
  const overdue = cell.overdue
  const slotIds = cell.slotIds || (cell.slotId ? [cell.slotId] : [])
  const title = `${range || "Today"}${cell.isNow ? " + overdue" : ""}`
  return (
    <Tooltip arrow placement="top" enterDelay={250} title={<CellTip cell={cell} title={title} />}>
      <Box
        data-testid="date-card"
        onClick={(event) => {
          if (!slotIds.length) return
          event.stopPropagation()
          onOpen(slotIds, Number(cell.net) < 0 ? "gap" : "slot")
        }}
        sx={{
          minWidth: 104,
          px: 1,
          py: 0.6,
          borderRadius: 1.5,
          bgcolor: cell.isNow ? C.amberBg : "#fff",
          border: `1px solid ${cell.isNow ? C.amberLine : C.line}`,
          borderTop: `3px solid ${cardTone(cell)}`,
          cursor: slotIds.length ? "pointer" : "default",
          "&:hover": { boxShadow: "0 2px 8px rgba(15,23,42,0.08)" }
        }}>
        <Stack direction="row" spacing={0.5} alignItems="baseline">
          <Typography
            sx={{ fontSize: 12, fontWeight: 800, color: cell.isNow ? "#92400e" : "#334155" }}
            noWrap>
            {cell.isNow ? `Now · ${range || "today"}` : range}
          </Typography>
          {!cell.isNow && sub ? (
            <Typography sx={{ fontSize: 10.5, color: C.faint }}>{sub}</Typography>
          ) : null}
        </Stack>
        <Typography
          sx={{ fontSize: 16, fontWeight: 900, color: ready ? C.ink : C.faint, lineHeight: 1.25 }}>
          {fmt(ready)}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <NetChip net={cell.net} booked={booked} />
          {booked ? (
            <Typography sx={{ fontSize: 10.5, color: C.muted }}>{fmt(booked)} booked</Typography>
          ) : null}
        </Stack>
        {cell.isNow && (Number(overdue?.booked) > 0 || Number(overdue?.unsold) > 0) ? (
          <Stack direction="row" spacing={0.3} alignItems="center" sx={{ mt: 0.25, color: C.red }}>
            <HistoryIcon sx={{ fontSize: 12 }} />
            <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>
              {Number(overdue.booked) > 0 ? `incl. ${fmt(overdue.booked)} overdue` : ""}
              {Number(overdue.booked) > 0 && Number(overdue.unsold) > 0 ? " · " : ""}
              {Number(overdue.unsold) > 0 ? `${fmt(overdue.unsold)} unsold` : ""}
            </Typography>
          </Stack>
        ) : null}
      </Box>
    </Tooltip>
  )
}

/** Date-wise sums for several varieties (crop header and footer), only dates with plants. */
function TotalCards({ rows, dense }) {
  const columns = boardColumns(rows)
  const totals = columnTotals(rows, columns)
  const cards = columns
    .map((column, i) => ({ column, total: totals[i] }))
    .filter(({ total }) => total.ready || total.booked)
  if (!cards.length) return null
  return (
    <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
      {cards.map(({ column, total }) => {
        const now = column.key === "now"
        return (
          <Box
            key={column.key}
            sx={{
              px: 0.8,
              py: dense ? 0.25 : 0.4,
              borderRadius: 1.25,
              bgcolor: now ? "#fef3c7" : "#fff",
              border: `1px solid ${now ? C.amberLine : C.line}`
            }}>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Typography
                sx={{ fontSize: 11, fontWeight: 800, color: now ? "#92400e" : C.muted }}
                noWrap>
                {now ? "Now" : column.range}
              </Typography>
              <Typography sx={{ fontSize: 12.5, fontWeight: 900, color: C.ink }}>
                {fmt(total.ready)}
              </Typography>
              <NetChip net={total.net} booked={total.booked} />
            </Stack>
          </Box>
        )
      })}
    </Stack>
  )
}

function HeadCell({ children, sortKey, sort, onSort, align = "left", sx }) {
  const active = sort.key === sortKey
  const body = sortKey ? (
    <TableSortLabel
      active={active}
      direction={active ? sort.dir : "asc"}
      onClick={() => onSort(sortKey)}
      sx={{
        color: "inherit",
        alignItems: "flex-start",
        "& .MuiTableSortLabel-icon": { mt: 0.25 }
      }}>
      <Box>{children}</Box>
    </TableSortLabel>
  ) : (
    children
  )
  return (
    <TableCell
      align={align}
      sx={{ ...cellSx, bgcolor: C.head, color: C.muted, py: 1, whiteSpace: "nowrap", ...sx }}
      sortDirection={active ? sort.dir : false}>
      {body}
    </TableCell>
  )
}

function HeadText({ title, sub }) {
  return (
    <>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
          color: C.ink,
          textTransform: "uppercase",
          letterSpacing: 0.3
        }}>
        {title}
      </Typography>
      {sub ? (
        <Typography sx={{ fontSize: 10.5, color: C.faint, fontWeight: 500 }}>{sub}</Typography>
      ) : null}
    </>
  )
}

function StockBadge({ stock }) {
  if (!(Number(stock?.inShed) > 0))
    return <Typography sx={{ color: "#cbd5e1", fontWeight: 700 }}>—</Typography>
  return (
    <>
      <Box
        component="span"
        sx={{
          px: 0.75,
          py: 0.2,
          borderRadius: 1,
          fontSize: 12,
          fontWeight: 800,
          color: C.green,
          bgcolor: C.greenBg,
          border: `1px solid ${C.greenLine}`
        }}>
        {fmt(stock.inShed)}
      </Box>
      {Number(stock.readyNow) !== Number(stock.inShed) ? (
        <Typography sx={{ fontSize: 10.5, color: C.muted, mt: 0.5 }}>
          {fmt(stock.readyNow)} ready now
        </Typography>
      ) : null}
    </>
  )
}

function ShedBatches({ stock }) {
  const batches = stock?.batches || []
  return (
    <TableRow>
      <TableCell sx={{ ...cellSx, ...stickyLeft, bgcolor: "#f8fafc", pl: 5 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <SubdirectoryArrowRightIcon sx={{ fontSize: 15, color: "#2563eb" }} />
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: "#334155" }}>
            Shed batches ({batches.length})
          </Typography>
        </Stack>
      </TableCell>
      <TableCell colSpan={3} sx={{ ...cellSx, bgcolor: "#f8fafc", py: 1 }}>
        {batches.length === 0 ? (
          <Typography sx={{ fontSize: 12, color: C.muted }}>
            No lagwad stock in any shed for this variety.
          </Typography>
        ) : (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 1 }}>
            {batches.map((batch) => (
              <Stack
                key={`${batch.shed}-${batch.batchNumber}`}
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={1}
                sx={{
                  bgcolor: "#fff",
                  border: `1px solid ${C.line}`,
                  borderRadius: 1,
                  px: 1.25,
                  py: 0.75
                }}>
                <Typography sx={{ fontSize: 12, color: C.muted }}>
                  <Box component="span" sx={{ fontWeight: 800, color: C.ink }}>
                    {batch.shed}
                  </Box>
                  {batch.batchNumber ? ` · Batch ${batch.batchNumber}` : ""}
                  {batch.lagwadDate ? ` · Lagwad ${dayLabel(batch.lagwadDate)}` : ""}
                  {batch.readyDate ? ` · Ready ${dayLabel(batch.readyDate)}` : ""}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.ink }}>
                    {fmt(batch.inShed)} in shed
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: batch.readyNow ? C.green : C.faint
                    }}>
                    {fmt(batch.readyNow)} ready
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Box>
        )}
      </TableCell>
    </TableRow>
  )
}

function CropRow({ crop, rows }) {
  const urgent = rows.filter(isUrgent).length
  const bg = "#f1f5f9"
  return (
    <TableRow>
      <TableCell sx={{ ...cellSx, ...stickyLeft, bgcolor: bg }}>
        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 900,
            color: C.ink,
            textTransform: "uppercase",
            letterSpacing: 0.4
          }}>
          {crop}
        </Typography>
        <Typography sx={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>
          {rows.length} variet{rows.length === 1 ? "y" : "ies"}
          {urgent ? ` · ${urgent} urgent` : ""}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ ...cellSx, bgcolor: bg, fontWeight: 800, color: C.green }}>
        {sum(rows, (row) => row.stock?.inShed) ? fmt(sum(rows, (row) => row.stock?.inShed)) : ""}
      </TableCell>
      <TableCell sx={{ ...cellSx, bgcolor: bg }}>
        <TotalCards rows={rows} dense />
      </TableCell>
      <TableCell
        align="right"
        sx={{ ...cellSx, bgcolor: "#e2e8f0", fontWeight: 800, color: C.ink }}>
        {fmt(sum(rows, (row) => row.totals?.ready))}
      </TableCell>
    </TableRow>
  )
}

function VarietyRow({ row, open, onToggle, onOpen }) {
  const urgent = isUrgent(row)
  const cards = rowCards(row)
  const batches = row.stock?.batches?.length || 0
  const bg = open ? "#f8fafc" : "#fff"
  return (
    <TableRow hover sx={{ cursor: "pointer" }} onClick={onToggle}>
      <TableCell
        sx={{
          ...cellSx,
          ...stickyLeft,
          bgcolor: bg,
          borderLeft: `4px solid ${urgent ? "#f43f5e" : "transparent"}`,
          pl: 2.5
        }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <IconButton size="small" sx={{ p: 0.25 }} aria-label={open ? "Hide sheds" : "Show sheds"}>
            <ChevronRightIcon
              sx={{ fontSize: 18, transform: open ? "rotate(90deg)" : "none", transition: "0.15s" }}
            />
          </IconButton>
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              flexShrink: 0,
              bgcolor: urgent ? "#f43f5e" : hasOverdue(row) ? "#f59e0b" : "#10b981"
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{ fontSize: 13, fontWeight: 800, color: C.ink }}
              noWrap
              title={`${row.plantName} – ${row.subtypeName}`}>
              {row.subtypeName}
            </Typography>
            <Typography sx={{ fontSize: 11, color: C.muted }} noWrap>
              {batches ? `${batches} shed batch${batches === 1 ? "" : "es"}` : "No shed stock"}
            </Typography>
          </Box>
        </Stack>
      </TableCell>
      <TableCell align="right" sx={{ ...cellSx, bgcolor: bg }}>
        <StockBadge stock={row.stock} />
      </TableCell>
      <TableCell sx={{ ...cellSx, bgcolor: bg }}>
        {cards.length ? (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {cards.map((cell) => (
              <DateCard key={cell.key} cell={cell} onOpen={onOpen} />
            ))}
          </Stack>
        ) : (
          <Typography sx={{ fontSize: 12, color: C.faint, py: 0.5 }}>
            No plants due in the next slots
          </Typography>
        )}
      </TableCell>
      <TableCell
        align="right"
        sx={{ ...cellSx, bgcolor: "#f8fafc", fontWeight: 800, fontSize: 14, color: C.ink }}>
        {fmt(row.totals?.ready)}
      </TableCell>
    </TableRow>
  )
}

/**
 * Crop → variety board. Each variety lists only its own dates with plants, packed left
 * (Now + overdue first), so there are no empty boxes.
 */
export default function CapacityBoardTable({ rows, sort, onSort, expanded, onToggle, onOpen }) {
  const crops = groupByCrop(rows)
  return (
    <Box sx={{ overflow: "auto", maxHeight: "calc(100vh - 300px)" }}>
      <Table
        size="small"
        stickyHeader
        sx={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 820 }}>
        <TableHead>
          <TableRow>
            <HeadCell
              sortKey="name"
              sort={sort}
              onSort={onSort}
              sx={{ ...stickyLeft, zIndex: 4, minWidth: 220 }}>
              <HeadText title="Crop / Variety" sub="Click a variety to see sheds" />
            </HeadCell>
            <HeadCell sortKey="stock" sort={sort} onSort={onSort} align="right">
              <HeadText title="Stock" sub="In sheds" />
            </HeadCell>
            <HeadCell sort={sort} onSort={onSort} sx={{ width: "100%" }}>
              <HeadText
                title="Ready plants by date"
                sub="Now + overdue first, then only dates with plants"
              />
            </HeadCell>
            <HeadCell
              sortKey="total"
              sort={sort}
              onSort={onSort}
              align="right"
              sx={{ bgcolor: "#f1f5f9" }}>
              <HeadText title="Total ready" />
            </HeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {crops.map((group) => (
            <React.Fragment key={group.crop}>
              <CropRow crop={group.crop} rows={group.rows} />
              {group.rows.map((row) => {
                const key = `${row.plantId}-${row.subtypeId}`
                const open = expanded.has(key)
                return (
                  <React.Fragment key={key}>
                    <VarietyRow
                      row={row}
                      open={open}
                      onToggle={() => onToggle(key)}
                      onOpen={onOpen}
                    />
                    {open ? <ShedBatches stock={row.stock} /> : null}
                  </React.Fragment>
                )
              })}
            </React.Fragment>
          ))}
        </TableBody>
        {rows.length ? (
          <TableFooter>
            <TableRow
              sx={{
                "& td": {
                  position: "sticky",
                  bottom: 0,
                  zIndex: 1,
                  bgcolor: "#f1f5f9",
                  borderTop: "2px solid #cbd5e1"
                }
              }}>
              <TableCell sx={{ ...cellSx, ...stickyLeft, zIndex: 3 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 800, color: C.ink }}>
                  TOTAL ({rows.length} varieties)
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ ...cellSx, fontWeight: 800, color: C.green }}>
                {fmt(sum(rows, (row) => row.stock?.inShed))}
              </TableCell>
              <TableCell sx={cellSx}>
                <TotalCards rows={rows} dense />
              </TableCell>
              <TableCell
                align="right"
                sx={{ ...cellSx, fontWeight: 800, fontSize: 14, color: C.ink }}>
                {fmt(sum(rows, (row) => row.totals?.ready))}
              </TableCell>
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </Box>
  )
}
