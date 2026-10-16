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
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline"
import SubdirectoryArrowRightIcon from "@mui/icons-material/SubdirectoryArrowRight"
import { dayLabel, fmt, signed, slotRangeLabel } from "../capacitySheetUtils"
import { cellFor, columnTotals, groupByCrop, hasOverdue, isUrgent } from "../capacityBoardUtils"

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
  amberHead: "#fef3c7",
  amberLine: "#fcd34d"
}

const cellSx = {
  borderBottom: `1px solid ${C.line}`,
  borderRight: `1px solid ${C.line}`,
  px: 1.5,
  py: 1.25,
  verticalAlign: "top",
  fontVariantNumeric: "tabular-nums"
}

const stickyLeft = {
  position: "sticky",
  left: 0,
  zIndex: 2,
  boxShadow: "2px 0 4px -1px rgba(15,23,42,0.06)"
}

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
        px: 0.75,
        py: 0.1,
        borderRadius: 1,
        fontSize: 11,
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

function SlotCell({ cell, column, isCurrent, onOpen }) {
  const empty = !cell || (!Number(cell.ready) && !Number(cell.booked) && !Number(cell.net))
  const base = {
    ...cellSx,
    minWidth: isCurrent ? 150 : 118,
    bgcolor: isCurrent ? C.amberBg : undefined,
    borderRight: isCurrent ? `1px solid ${C.amberLine}` : cellSx.borderRight
  }
  if (empty) {
    return (
      <TableCell sx={base}>
        <Typography sx={{ color: "#e2e8f0", fontWeight: 700, fontSize: 12 }}>·</Typography>
      </TableCell>
    )
  }
  const ready = Number(cell.ready) || 0
  const booked = Number(cell.booked) || 0
  const pct = ready > 0 ? Math.round((booked / ready) * 100) : null
  const overdue = cell.overdue
  const slotIds = cell.slotIds || (cell.slotId ? [cell.slotId] : [])
  const title = `${cell.startDay ? slotRangeLabel(cell.startDay, cell.endDay) : "Today"}${
    isCurrent ? " + overdue" : ""
  }`
  return (
    <Tooltip arrow placement="top" enterDelay={250} title={<CellTip cell={cell} title={title} />}>
      <TableCell
        sx={{
          ...base,
          cursor: slotIds.length ? "pointer" : "default",
          "&:hover": { bgcolor: isCurrent ? "#fef3c7" : "#f8fafc" }
        }}
        onClick={(event) => {
          if (!slotIds.length) return
          event.stopPropagation()
          onOpen(slotIds, Number(cell.net) < 0 ? "gap" : "slot")
        }}>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography sx={{ fontWeight: 800, fontSize: 14, color: ready ? C.ink : C.faint }}>
            {fmt(ready)}
          </Typography>
          <NetChip net={cell.net} booked={booked} />
        </Stack>
        {booked ? (
          <Typography sx={{ fontSize: 11, color: C.muted, mt: 0.25 }}>
            {fmt(booked)} booked{pct != null ? ` (${pct}%)` : ""}
          </Typography>
        ) : null}
        {!column.shared && cell.startDay ? (
          <Typography sx={{ fontSize: 10.5, color: C.faint }}>
            {slotRangeLabel(cell.startDay, cell.endDay)}
          </Typography>
        ) : null}
        {isCurrent ? (
          Number(overdue?.booked) > 0 || Number(overdue?.unsold) > 0 ? (
            <Stack
              direction="row"
              spacing={0.4}
              alignItems="center"
              sx={{ mt: 0.25, color: C.red }}>
              <HistoryIcon sx={{ fontSize: 13 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
                {Number(overdue.booked) > 0 ? `incl. ${fmt(overdue.booked)} overdue` : ""}
                {Number(overdue.booked) > 0 && Number(overdue.unsold) > 0 ? " · " : ""}
                {Number(overdue.unsold) > 0 ? `${fmt(overdue.unsold)} unsold` : ""}
              </Typography>
            </Stack>
          ) : (
            <Stack
              direction="row"
              spacing={0.4}
              alignItems="center"
              sx={{ mt: 0.25, color: "#059669" }}>
              <CheckCircleOutlineIcon sx={{ fontSize: 13 }} />
              <Typography sx={{ fontSize: 11, fontWeight: 600 }}>no overdue</Typography>
            </Stack>
          )
        ) : null}
      </TableCell>
    </Tooltip>
  )
}

function HeadCell({ children, sortKey, sort, onSort, align = "left", sx }) {
  const active = sort.key === sortKey
  return (
    <TableCell
      align={align}
      sx={{ ...cellSx, bgcolor: C.head, color: C.muted, py: 1, whiteSpace: "nowrap", ...sx }}
      sortDirection={active ? sort.dir : false}>
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
    </TableCell>
  )
}

function HeadText({ title, sub, color }) {
  return (
    <>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
          color: color || C.ink,
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

function ShedBatches({ stock, colSpan }) {
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
      <TableCell colSpan={colSpan} sx={{ ...cellSx, bgcolor: "#f8fafc", py: 1 }}>
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

function CropRow({ crop, rows, columns }) {
  const totals = columnTotals(rows, columns)
  const stock = rows.reduce((acc, row) => acc + (Number(row.stock?.inShed) || 0), 0)
  const ready = rows.reduce((acc, row) => acc + (Number(row.totals?.ready) || 0), 0)
  const urgent = rows.filter(isUrgent).length
  const bg = "#f1f5f9"
  return (
    <TableRow>
      <TableCell sx={{ ...cellSx, ...stickyLeft, bgcolor: bg, py: 0.75 }}>
        <Stack direction="row" spacing={1} alignItems="baseline">
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
        </Stack>
      </TableCell>
      <TableCell
        align="right"
        sx={{ ...cellSx, bgcolor: bg, py: 0.75, fontWeight: 800, color: C.green }}>
        {stock ? fmt(stock) : ""}
      </TableCell>
      {columns.map((column, i) => (
        <TableCell
          key={column.key}
          sx={{
            ...cellSx,
            bgcolor: column.key === "now" ? "#fdf0c4" : bg,
            py: 0.75,
            borderRight: column.key === "now" ? `1px solid ${C.amberLine}` : cellSx.borderRight
          }}>
          {totals[i].ready || totals[i].booked ? (
            <Stack direction="row" spacing={0.6} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontWeight: 800, fontSize: 12.5, color: C.ink }}>
                {fmt(totals[i].ready)}
              </Typography>
              <NetChip net={totals[i].net} booked={totals[i].booked} />
            </Stack>
          ) : null}
        </TableCell>
      ))}
      <TableCell
        align="right"
        sx={{ ...cellSx, bgcolor: "#e2e8f0", py: 0.75, fontWeight: 800, color: C.ink }}>
        {fmt(ready)}
      </TableCell>
    </TableRow>
  )
}

export default function CapacityBoardTable({
  rows,
  columns,
  sort,
  onSort,
  expanded,
  onToggle,
  onOpen
}) {
  const totals = columnTotals(rows, columns)
  const stockTotal = rows.reduce((acc, row) => acc + (Number(row.stock?.inShed) || 0), 0)
  const readyTotal = rows.reduce((acc, row) => acc + (Number(row.totals?.ready) || 0), 0)
  const restSpan = columns.length + 2
  const crops = groupByCrop(rows)

  return (
    <Box sx={{ overflow: "auto", maxHeight: "calc(100vh - 300px)" }}>
      <Table
        size="small"
        stickyHeader
        sx={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 900 }}>
        <TableHead>
          <TableRow>
            <HeadCell
              sortKey="name"
              sort={sort}
              onSort={onSort}
              sx={{ ...stickyLeft, zIndex: 4, minWidth: 240 }}>
              <HeadText title="Crop / Variety" sub="Click a variety to see sheds" />
            </HeadCell>
            <HeadCell sortKey="stock" sort={sort} onSort={onSort} align="right">
              <HeadText title="Stock" sub="In sheds" />
            </HeadCell>
            {columns.map((column) => {
              const current = column.key === "now"
              return (
                <HeadCell
                  key={column.key}
                  sortKey={column.key}
                  sort={sort}
                  onSort={onSort}
                  sx={
                    current
                      ? { bgcolor: C.amberHead, borderRight: `1px solid ${C.amberLine}` }
                      : undefined
                  }>
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    {current ? (
                      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                    ) : null}
                    <HeadText
                      title={
                        column.shared && column.range
                          ? column.range
                          : current
                          ? "Current slot"
                          : column.range
                      }
                      color={current ? "#78350f" : undefined}
                    />
                    {current ? (
                      <Box
                        component="span"
                        sx={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          color: C.red,
                          bgcolor: C.redBg,
                          border: `1px solid ${C.redLine}`,
                          px: 0.5,
                          borderRadius: 0.75
                        }}>
                        + OVERDUE
                      </Box>
                    ) : null}
                  </Stack>
                  <Typography sx={{ fontSize: 10.5, color: current ? "#92400e" : C.faint }}>
                    {column.shared ? column.sub : "Dates vary by variety"}
                  </Typography>
                </HeadCell>
              )
            })}
            <HeadCell
              sortKey="total"
              sort={sort}
              onSort={onSort}
              align="right"
              sx={{ bgcolor: "#f1f5f9" }}>
              <HeadText
                title="Total ready"
                sub={`${columns.length} slot${columns.length === 1 ? "" : "s"}`}
              />
            </HeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {crops.map((group) => (
            <React.Fragment key={group.crop}>
              <CropRow crop={group.crop} rows={group.rows} columns={columns} />
              {group.rows.map((row) => {
                const key = `${row.plantId}-${row.subtypeId}`
                const open = expanded.has(key)
                const urgent = isUrgent(row)
                const batches = row.stock?.batches?.length || 0
                const bg = open ? "#f8fafc" : "#fff"
                return (
                  <React.Fragment key={key}>
                    <TableRow hover sx={{ cursor: "pointer" }} onClick={() => onToggle(key)}>
                      <TableCell
                        sx={{
                          ...cellSx,
                          ...stickyLeft,
                          bgcolor: bg,
                          borderLeft: `4px solid ${urgent ? "#f43f5e" : "transparent"}`,
                          pl: 2.5
                        }}>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <IconButton
                            size="small"
                            sx={{ p: 0.25 }}
                            aria-label={open ? "Hide sheds" : "Show sheds"}>
                            <ChevronRightIcon
                              sx={{
                                fontSize: 18,
                                transform: open ? "rotate(90deg)" : "none",
                                transition: "0.15s"
                              }}
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
                              {batches
                                ? `${batches} shed batch${batches === 1 ? "" : "es"}`
                                : "No shed stock"}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ ...cellSx, bgcolor: bg }}>
                        {Number(row.stock?.inShed) > 0 ? (
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
                              {fmt(row.stock.inShed)}
                            </Box>
                            {Number(row.stock.readyNow) !== Number(row.stock.inShed) ? (
                              <Typography sx={{ fontSize: 10.5, color: C.muted, mt: 0.5 }}>
                                {fmt(row.stock.readyNow)} ready now
                              </Typography>
                            ) : null}
                          </>
                        ) : (
                          <Typography sx={{ color: "#cbd5e1", fontWeight: 700 }}>—</Typography>
                        )}
                      </TableCell>
                      {columns.map((column) => (
                        <SlotCell
                          key={column.key}
                          cell={cellFor(row, column)}
                          column={column}
                          isCurrent={column.key === "now"}
                          onOpen={(ids, focus) => onOpen(ids, focus)}
                        />
                      ))}
                      <TableCell
                        align="right"
                        sx={{
                          ...cellSx,
                          bgcolor: "#f8fafc",
                          fontWeight: 800,
                          fontSize: 14,
                          color: C.ink
                        }}>
                        {fmt(row.totals?.ready)}
                      </TableCell>
                    </TableRow>
                    {open ? <ShedBatches stock={row.stock} colSpan={restSpan} /> : null}
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
                {fmt(stockTotal)}
              </TableCell>
              {columns.map((column, i) => (
                <TableCell
                  key={column.key}
                  sx={{
                    ...cellSx,
                    ...(column.key === "now"
                      ? { bgcolor: "#fef3c7 !important", borderRight: `1px solid ${C.amberLine}` }
                      : null)
                  }}>
                  <Stack
                    direction="row"
                    spacing={0.75}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, color: C.ink }}>
                      {fmt(totals[i].ready)}
                    </Typography>
                    <NetChip net={totals[i].net} booked={totals[i].booked} />
                  </Stack>
                  {column.key === "now" && totals[i].overdue ? (
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.red }}>
                      {fmt(totals[i].overdue)} overdue
                    </Typography>
                  ) : null}
                </TableCell>
              ))}
              <TableCell
                align="right"
                sx={{ ...cellSx, fontWeight: 800, fontSize: 14, color: C.ink }}>
                {fmt(readyTotal)}
              </TableCell>
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </Box>
  )
}
