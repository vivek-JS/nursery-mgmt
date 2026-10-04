import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight"
import RefreshIcon from "@mui/icons-material/Refresh"
import SearchIcon from "@mui/icons-material/Search"
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined"
import { NetworkManager, API } from "network/core"
import DrawerExportButton from "components/DrawerExportButton"
import { fmt } from "../capacitySheetUtils"

/* ───────────────────────── look & feel ───────────────────────── */

const C = {
  ink: "#0f172a",
  muted: "#64748b",
  faint: "#cbd5e1",
  line: "#e3e8ee",
  grid: "#d5dbe3",
  head: "#eef2f7",
  sowed: "#0f766e",
  remaining: "#15803d",
  orders: "#2563eb",
  gone: "#b45309",
  current: "#15803d",
  currentBg: "#f0fdf4",
  expected: "#0369a1",
  expectedBg: "#f0f9ff",
}

const FILTERS = [
  { value: "stock", label: "With stock" },
  { value: "ready", label: "Current (ready)" },
  { value: "expected", label: "Expected (not ready)" },
  { value: "all", label: "All" },
]

const VIEWS = [
  { value: "shed", label: "By shed" },
  { value: "batch", label: "All batches" },
]

/* ───────────────────────── helpers ───────────────────────── */

const n = (value) => Number(value) || 0

const IST_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" })

/** `YYYY-MM-DD` for the Indian calendar day of a date (null if it is not a date). */
function istDay(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : IST_DAY.format(date)
}

function dayDiff(fromDay, toDay) {
  return Math.round((Date.parse(`${toDay}T00:00:00Z`) - Date.parse(`${fromDay}T00:00:00Z`)) / 86400000)
}

function formatDate(value) {
  const day = istDay(value)
  if (!day) return "—"
  return new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
}

function relDays(days) {
  if (days == null) return ""
  if (days === 0) return "today"
  return days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`
}

/** Expected plants grouped by the day they become ready, earliest first. */
function buildSchedule(lines, today) {
  const byDay = new Map()
  lines.forEach((line) => {
    if (line.expected <= 0) return
    const key = line.readyDay || "none"
    const entry = byDay.get(key) || { day: line.readyDay, qty: 0, days: line.readyDay ? dayDiff(today, line.readyDay) : null }
    entry.qty += line.expected
    byDay.set(key, entry)
  })
  return [...byDay.values()].sort((a, b) => (a.day && b.day ? a.day.localeCompare(b.day) : a.day ? -1 : b.day ? 1 : 0))
}

/**
 * Adds the figures the table needs to what the API returns.
 * Current  = plants in the shed that are ready today.
 * Expected = plants in the shed that are not ready yet (they become ready on the line's ready date).
 */
function enrichData(sheds) {
  const today = istDay(new Date())
  return sheds.map((shed) => {
    const batches = (shed.batches || []).map((batch) => {
      const lines = (batch.lines || []).map((line) => {
        const remaining = n(line.remaining)
        const ready = Boolean(line.ready)
        const readyDay = istDay(line.readyDate)
        return {
          ...line,
          current: ready ? remaining : 0,
          expected: ready ? 0 : remaining,
          readyDay,
          daysToReady: ready ? 0 : readyDay ? dayDiff(today, readyDay) : null,
        }
      })
      const current = n(batch.readyRemaining)
      const schedule = buildSchedule(lines, today)
      const nextReady = schedule.find((item) => item.day) || null
      return {
        ...batch,
        shed: shed.shed,
        lines,
        orders: batch.orders || [],
        current,
        expected: Math.max(0, n(batch.remaining) - current),
        schedule,
        nextReady,
        nextReadyDay: nextReady ? nextReady.day : null,
      }
    })
    const schedule = buildSchedule(
      batches.flatMap((batch) => batch.lines),
      today
    )
    const nextReady = schedule.find((item) => item.day) || null
    const current = n(shed.readyRemaining)
    return {
      ...shed,
      batches,
      current,
      expected: Math.max(0, n(shed.remaining) - current),
      schedule,
      nextReady,
      nextReadyDay: nextReady ? nextReady.day : null,
    }
  })
}

function batchVisible(batch, filter) {
  if (filter === "all") return true
  if (filter === "ready") return batch.current > 0
  if (filter === "expected") return batch.expected > 0
  return n(batch.remaining) > 0
}

function shedVisible(shed, filter) {
  if (filter === "all") return true
  if (filter === "ready") return shed.current > 0
  if (filter === "expected") return shed.expected > 0
  return n(shed.remaining) > 0
}

function matchesSearch(batch, q) {
  return `${batch.shed} ${batch.batchNumber} ${batch.plantName} ${batch.subtypeName}`.toLowerCase().includes(q)
}

const sumOf = (rows, key) => rows.reduce((total, row) => total + n(row[key]), 0)
const batchTitle = (batch) => [batch.batchNumber, batch.plantName, batch.subtypeName].filter(Boolean).join(" · ")

function nextReadyText(item) {
  return item ? `${formatDate(item.day)} (${relDays(item.days)})` : ""
}

/* ───────────────────────── small pieces ───────────────────────── */

function Num({ value, color }) {
  const v = n(value)
  return (
    <Box component="span" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: v ? 800 : 500, color: v ? color : C.faint }}>
      {v ? fmt(v) : "–"}
    </Box>
  )
}

function NextReady({ item }) {
  if (!item) {
    return (
      <Box component="span" sx={{ color: C.faint }}>
        —
      </Box>
    )
  }
  return (
    <Box component="span" sx={{ whiteSpace: "nowrap" }}>
      <Box component="span" sx={{ fontWeight: 800, color: C.ink }}>
        {formatDate(item.day)}
      </Box>{" "}
      <Box component="span" sx={{ fontSize: 11, fontWeight: 700, color: C.expected }}>
        {relDays(item.days)}
      </Box>
    </Box>
  )
}

/** Remaining / orders / other gone as a share of everything sowed. */
function FlowBar({ row }) {
  const total = Math.max(1, n(row.sowed))
  const pct = (value) => `${Math.min(100, (n(value) / total) * 100)}%`
  return (
    <Tooltip arrow placement="top" title={`Remaining ${fmt(row.remaining)} · Orders ${fmt(row.toOrders)} · Other gone ${fmt(row.otherGone)}`}>
      <Box sx={{ display: "flex", height: 8, minWidth: 90, borderRadius: 99, overflow: "hidden", bgcolor: "#eef2f6" }}>
        <Box sx={{ width: pct(row.remaining), bgcolor: "#22c55e" }} />
        <Box sx={{ width: pct(row.toOrders), bgcolor: C.orders }} />
        <Box sx={{ width: pct(row.otherGone), bgcolor: "#f59e0b" }} />
      </Box>
    </Tooltip>
  )
}

function Legend() {
  const items = [
    ["Remaining", "#22c55e"],
    ["To orders", C.orders],
    ["Other gone", "#f59e0b"],
  ]
  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
      {items.map(([label, color]) => (
        <Stack key={label} direction="row" spacing={0.6} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
          <Typography variant="caption" fontWeight={700} color={C.muted}>
            {label}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}

function Tile({ label, value, color, hint }) {
  const body = (
    <Box sx={{ bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: 2, px: 1.75, py: 1 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: C.muted, textTransform: "uppercase" }}>{label}</Typography>
      <Typography sx={{ fontWeight: 900, fontSize: 22, lineHeight: 1.2, color: n(value) ? color : C.faint, fontVariantNumeric: "tabular-nums" }}>{fmt(value)}</Typography>
    </Box>
  )
  return hint ? (
    <Tooltip arrow placement="top" title={hint}>
      {body}
    </Tooltip>
  ) : (
    body
  )
}

function SummaryStrip({ totals }) {
  if (!totals) return null
  const current = n(totals.readyRemaining)
  const expected = Math.max(0, n(totals.remaining) - current)
  const tiles = [
    { label: "Sheds", value: totals.sheds, color: C.ink },
    { label: "Sowed", value: totals.sowed, color: C.sowed, hint: "Plants lagwad-ed into sheds (active batches)." },
    { label: "Gone", value: totals.gone, color: C.gone, hint: "Sowed minus remaining." },
    { label: "To orders", value: totals.toOrders, color: C.orders, hint: "Gone plants that were loaded or delivered against an order." },
    { label: "Remaining", value: totals.remaining, color: C.remaining, hint: "Still in sheds = current + expected." },
    { label: "Current", value: current, color: C.current, hint: "Ready now and can be sold or dispatched today." },
    { label: "Expected", value: expected, color: C.expected, hint: "In the shed but not ready yet. Open a row to see the date each entry gets ready." },
  ]
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)", xl: "repeat(7, 1fr)" }, gap: 1.25, mb: 2 }}>
      {tiles.map((tile) => (
        <Tile key={tile.label} {...tile} />
      ))}
    </Box>
  )
}

/** "850 on 12 Oct (in 8d) · 2,000 on 20 Oct (in 16d)" — when the expected plants become ready. */
function ReadySchedule({ schedule, dense = false }) {
  if (!schedule.length) {
    return (
      <Typography variant="caption" color={C.muted} fontWeight={700}>
        Nothing is waiting to get ready.
      </Typography>
    )
  }
  return (
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
      <Typography variant="caption" fontWeight={800} color={C.expected} sx={{ mr: 0.5 }}>
        Gets ready:
      </Typography>
      {schedule.map((item) => (
        <Chip
          key={item.day || "none"}
          size="small"
          label={item.day ? `${fmt(item.qty)} on ${formatDate(item.day)} · ${relDays(item.days)}` : `${fmt(item.qty)} · date not set`}
          sx={{ height: dense ? 22 : 24, fontWeight: 800, fontSize: 11.5, bgcolor: C.expectedBg, color: C.expected, border: "1px solid #bae6fd" }}
        />
      ))}
    </Stack>
  )
}

/* ───────────────────────── the Excel-like table ───────────────────────── */

const cellSx = {
  borderRight: `1px solid ${C.line}`,
  borderBottom: `1px solid ${C.line}`,
  py: 0.7,
  px: 1.25,
  fontSize: 13,
  color: C.ink,
}

/**
 * columns: [{ key, label, numeric?, align?, minWidth?, bg?, sortValue?(row), render(row), total?(rows) }]
 * Click a header to sort (click again to reverse). Rows are clickable when `onRowClick` / `renderExpanded` is set.
 */
function SortableTable({ columns, rows, rowKey, defaultSort, onRowClick, expandedKey, renderExpanded, showTotals = false, maxHeight, emptyText = "Nothing to show." }) {
  const [sort, setSort] = useState(defaultSort || null)

  const sorted = useMemo(() => {
    const column = sort && columns.find((item) => item.key === sort.key)
    if (!column) return rows
    const read = column.sortValue || ((row) => row[column.key])
    const dir = sort.dir === "asc" ? 1 : -1
    return rows.slice().sort((a, b) => {
      const x = read(a)
      const y = read(b)
      const xEmpty = x == null || x === ""
      const yEmpty = y == null || y === ""
      if (xEmpty && yEmpty) return 0
      if (xEmpty) return 1
      if (yEmpty) return -1
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir
      return String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: "base" }) * dir
    })
  }, [rows, columns, sort])

  const toggleSort = (column) => {
    setSort((prev) =>
      prev && prev.key === column.key ? { key: column.key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key: column.key, dir: column.numeric ? "desc" : "asc" }
    )
  }

  const clickable = Boolean(onRowClick || renderExpanded)
  const colSpan = columns.length + 1

  return (
    <TableContainer sx={{ maxHeight, border: `1px solid ${C.grid}`, borderRadius: 2, bgcolor: "#fff" }}>
      <Table size="small" stickyHeader sx={{ borderCollapse: "separate" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ ...cellSx, bgcolor: C.head, width: 56, fontWeight: 800, color: C.muted, textAlign: "center" }}>#</TableCell>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.align || (column.numeric ? "right" : "left")}
                sortDirection={sort && sort.key === column.key ? sort.dir : false}
                sx={{
                  ...cellSx,
                  bgcolor: C.head,
                  fontWeight: 800,
                  fontSize: 11.5,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  minWidth: column.minWidth,
                }}
              >
                {column.sortable === false ? (
                  column.label
                ) : (
                  <TableSortLabel active={Boolean(sort && sort.key === column.key)} direction={sort && sort.key === column.key ? sort.dir : "asc"} onClick={() => toggleSort(column)}>
                    {column.label}
                  </TableSortLabel>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row, index) => {
            const key = rowKey(row)
            const open = expandedKey === key
            return (
              <React.Fragment key={key}>
                <TableRow
                  hover={clickable}
                  onClick={clickable ? () => onRowClick && onRowClick(row) : undefined}
                  sx={{
                    cursor: clickable ? "pointer" : "default",
                    bgcolor: open ? "#ecfdf5" : index % 2 ? "#fafbfd" : "#fff",
                    "&:hover td": clickable ? { bgcolor: open ? "#dcfce7" : "#f1f7ff" } : undefined,
                  }}
                >
                  <TableCell sx={{ ...cellSx, textAlign: "center", color: C.muted, fontWeight: 700 }}>
                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.25}>
                      {renderExpanded ? (
                        <KeyboardArrowRightIcon sx={{ fontSize: 18, transform: open ? "rotate(90deg)" : "none", transition: "0.15s", color: open ? C.remaining : C.muted }} />
                      ) : null}
                      <span>{index + 1}</span>
                    </Stack>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align || (column.numeric ? "right" : "left")}
                      sx={{ ...cellSx, bgcolor: column.bg || undefined, whiteSpace: column.wrap ? "normal" : "nowrap" }}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
                {open && renderExpanded ? (
                  <TableRow>
                    <TableCell colSpan={colSpan} sx={{ p: 0, bgcolor: "#f8fafc", borderBottom: `2px solid ${C.grid}` }}>
                      {renderExpanded(row)}
                    </TableCell>
                  </TableRow>
                ) : null}
              </React.Fragment>
            )
          })}
          {!sorted.length ? (
            <TableRow>
              <TableCell colSpan={colSpan} sx={{ ...cellSx, textAlign: "center", color: C.muted, py: 3 }}>
                {emptyText}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
        {showTotals && sorted.length ? (
          <TableFooter>
            <TableRow>
              <TableCell sx={{ ...cellSx, bgcolor: C.head, position: "sticky", bottom: 0, fontWeight: 900 }} />
              {columns.map((column, index) => (
                <TableCell
                  key={column.key}
                  align={column.align || (column.numeric ? "right" : "left")}
                  sx={{ ...cellSx, bgcolor: C.head, position: "sticky", bottom: 0, fontWeight: 900, whiteSpace: "nowrap" }}
                >
                  {column.total ? column.total(sorted) : index === 0 ? `Total · ${sorted.length}` : ""}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </TableContainer>
  )
}

/* ───────────────────────── batch detail (entries + orders) ───────────────────────── */

const entryColumns = [
  { key: "size", label: "Size", sortValue: (r) => r.size || "", render: (r) => r.size || "—" },
  { key: "cavity", label: "Cavity", sortValue: (r) => r.cavity || "", render: (r) => r.cavity || "—" },
  { key: "lagwadDate", label: "Lagwad date", sortValue: (r) => istDay(r.lagwadDate), render: (r) => formatDate(r.lagwadDate) },
  { key: "readyDay", label: "Ready on", sortValue: (r) => r.readyDay, render: (r) => formatDate(r.readyDate) },
  {
    key: "status",
    label: "Status",
    sortValue: (r) => (r.ready ? -1 : r.daysToReady == null ? 99999 : r.daysToReady),
    render: (r) =>
      r.ready ? (
        <Chip size="small" label="Ready" sx={{ height: 20, fontWeight: 800, bgcolor: "#dcfce7", color: "#166534" }} />
      ) : (
        <Chip
          size="small"
          label={r.daysToReady == null ? "Date not set" : `Ready ${relDays(r.daysToReady)}`}
          sx={{ height: 20, fontWeight: 800, bgcolor: C.expectedBg, color: C.expected, border: "1px solid #bae6fd" }}
        />
      ),
  },
  { key: "sowed", label: "Sowed", numeric: true, render: (r) => <Num value={r.sowed} color={C.sowed} />, total: (rows) => fmt(sumOf(rows, "sowed")) },
  { key: "gone", label: "Gone", numeric: true, render: (r) => <Num value={r.gone} color={C.gone} />, total: (rows) => fmt(sumOf(rows, "gone")) },
  { key: "remaining", label: "Remaining", numeric: true, render: (r) => <Num value={r.remaining} color={C.remaining} />, total: (rows) => fmt(sumOf(rows, "remaining")) },
  { key: "current", label: "Current", numeric: true, bg: C.currentBg, render: (r) => <Num value={r.current} color={C.current} />, total: (rows) => fmt(sumOf(rows, "current")) },
  { key: "expected", label: "Expected", numeric: true, bg: C.expectedBg, render: (r) => <Num value={r.expected} color={C.expected} />, total: (rows) => fmt(sumOf(rows, "expected")) },
]

const orderColumns = [
  { key: "orderNumber", label: "Order", sortValue: (r) => r.orderNumber ?? r.orderId, render: (r) => (r.orderNumber ? `#${r.orderNumber}` : r.orderId || "—") },
  { key: "farmerName", label: "Farmer", sortValue: (r) => r.farmerName || "", render: (r) => r.farmerName || "—" },
  { key: "farmerMobile", label: "Mobile", sortValue: (r) => r.farmerMobile || "", render: (r) => r.farmerMobile || "—" },
  { key: "lastAt", label: "Last taken", sortValue: (r) => r.lastAt || "", render: (r) => formatDate(r.lastAt) },
  { key: "plants", label: "Plants", numeric: true, render: (r) => <Num value={r.plants} color={C.orders} />, total: (rows) => fmt(sumOf(rows, "plants")) },
]

function BatchDetail({ batch }) {
  const [panel, setPanel] = useState("entries")
  // Entries that still hold plants first; finished (empty) entries are kept but sorted to the bottom by default.
  const lines = useMemo(() => batch.lines.slice().sort((a, b) => Number(b.remaining > 0) - Number(a.remaining > 0)), [batch.lines])
  return (
    <Box sx={{ p: 1.5 }} onClick={(event) => event.stopPropagation()}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between" alignItems={{ md: "center" }} mb={1}>
        <Tabs
          value={panel}
          onChange={(_, value) => setPanel(value)}
          sx={{ minHeight: 34, "& .MuiTab-root": { minHeight: 34, textTransform: "none", fontWeight: 800, fontSize: 13 } }}
        >
          <Tab value="entries" label={`Entries (${batch.lines.length})`} />
          <Tab value="orders" label={`Orders (${batch.orders.length})`} />
        </Tabs>
        <ReadySchedule schedule={batch.schedule} dense />
      </Stack>
      {panel === "entries" ? (
        <SortableTable columns={entryColumns} rows={lines} rowKey={(r) => r.inwardId} maxHeight={320} showTotals emptyText="No lagwad entries for this batch." />
      ) : (
        <>
          <SortableTable
            columns={orderColumns}
            rows={batch.orders}
            rowKey={(r) => r.orderId}
            defaultSort={{ key: "lastAt", dir: "desc" }}
            maxHeight={320}
            showTotals
            emptyText="No order has taken plants from this batch in this shed yet."
          />
          {n(batch.otherGone) > 0 ? (
            <Typography variant="caption" color={C.muted} display="block" mt={0.75}>
              {fmt(batch.otherGone)} more plants are gone without an order link (mortality, transfers or manual adjustments).
            </Typography>
          ) : null}
        </>
      )}
    </Box>
  )
}

/* ───────────────────────── batch table (used in the shed panel and the "All batches" view) ───────────────────────── */

function BatchTable({ batches, showShed = false, maxHeight }) {
  const [openKey, setOpenKey] = useState("")

  const columns = useMemo(() => {
    const list = []
    if (showShed) list.push({ key: "shed", label: "Shed", minWidth: 110, sortValue: (r) => r.shed, render: (r) => <b>{r.shed}</b> })
    list.push(
      { key: "batchNumber", label: "Batch", minWidth: 120, sortValue: (r) => r.batchNumber || "", render: (r) => <b>{r.batchNumber || "Batch"}</b> },
      {
        key: "plant",
        label: "Plant · subtype",
        minWidth: 170,
        sortValue: (r) => `${r.plantName || ""} ${r.subtypeName || ""}`,
        render: (r) => [r.plantName, r.subtypeName].filter(Boolean).join(" · ") || "—",
      },
      { key: "sowed", label: "Sowed", numeric: true, render: (r) => <Num value={r.sowed} color={C.sowed} />, total: (rows) => fmt(sumOf(rows, "sowed")) },
      { key: "gone", label: "Gone", numeric: true, render: (r) => <Num value={r.gone} color={C.gone} />, total: (rows) => fmt(sumOf(rows, "gone")) },
      { key: "toOrders", label: "To orders", numeric: true, render: (r) => <Num value={r.toOrders} color={C.orders} />, total: (rows) => fmt(sumOf(rows, "toOrders")) },
      { key: "remaining", label: "Remaining", numeric: true, render: (r) => <Num value={r.remaining} color={C.remaining} />, total: (rows) => fmt(sumOf(rows, "remaining")) },
      {
        key: "current",
        label: "Current (ready)",
        numeric: true,
        bg: C.currentBg,
        render: (r) => <Num value={r.current} color={C.current} />,
        total: (rows) => fmt(sumOf(rows, "current")),
      },
      {
        key: "expected",
        label: "Expected (not ready)",
        numeric: true,
        bg: C.expectedBg,
        render: (r) => <Num value={r.expected} color={C.expected} />,
        total: (rows) => fmt(sumOf(rows, "expected")),
      },
      { key: "nextReady", label: "Next ready", minWidth: 150, sortValue: (r) => r.nextReadyDay, render: (r) => <NextReady item={r.nextReady} /> },
      { key: "flow", label: "Flow", sortValue: (r) => (n(r.sowed) ? n(r.remaining) / n(r.sowed) : null), render: (r) => <FlowBar row={r} /> }
    )
    return list
  }, [showShed])

  return (
    <SortableTable
      columns={columns}
      rows={batches}
      rowKey={(r) => r.batchId}
      defaultSort={{ key: "remaining", dir: "desc" }}
      expandedKey={openKey}
      onRowClick={(row) => setOpenKey((prev) => (prev === row.batchId ? "" : row.batchId))}
      renderExpanded={(row) => <BatchDetail batch={row} />}
      showTotals
      maxHeight={maxHeight}
      emptyText="No batches match this view."
    />
  )
}

/* ───────────────────────── export ───────────────────────── */

function batchSheets(batches, withShed) {
  const shedCol = withShed ? ["Shed"] : []
  const shedVal = (b) => (withShed ? [b.shed] : [])
  return [
    {
      title: "Batches",
      headers: [...shedCol, "Batch", "Plant", "Subtype", "Sowed", "Gone", "To orders", "Remaining", "Current (ready)", "Expected (not ready)", "Next ready"],
      rows: batches.map((b) => [...shedVal(b), b.batchNumber, b.plantName, b.subtypeName, b.sowed, b.gone, b.toOrders, b.remaining, b.current, b.expected, nextReadyText(b.nextReady)]),
    },
    {
      title: "Entries (lagwad lines)",
      headers: [...shedCol, "Batch", "Size", "Cavity", "Lagwad date", "Ready on", "Status", "Sowed", "Gone", "Remaining", "Current (ready)", "Expected (not ready)"],
      rows: batches.flatMap((b) =>
        b.lines.map((l) => [
          ...shedVal(b),
          batchTitle(b),
          l.size,
          l.cavity,
          formatDate(l.lagwadDate),
          formatDate(l.readyDate),
          l.ready ? "Ready" : l.daysToReady == null ? "Date not set" : `Ready ${relDays(l.daysToReady)}`,
          l.sowed,
          l.gone,
          l.remaining,
          l.current,
          l.expected,
        ])
      ),
    },
    {
      title: "Orders served",
      headers: [...shedCol, "Batch", "Order", "Farmer", "Mobile", "Plants", "Last taken"],
      rows: batches.flatMap((b) => b.orders.map((o) => [...shedVal(b), batchTitle(b), o.orderNumber ?? o.orderId, o.farmerName, o.farmerMobile, o.plants, formatDate(o.lastAt)])),
    },
  ]
}

/* ───────────────────────── shed side panel ───────────────────────── */

function ShedDrawer({ shed, filter, onClose }) {
  const [batchSearch, setBatchSearch] = useState("")
  const shedKey = shed ? shed.shed : ""

  useEffect(() => {
    setBatchSearch("")
  }, [shedKey])

  const batches = useMemo(() => {
    const q = batchSearch.trim().toLowerCase()
    return (shed ? shed.batches : []).filter((batch) => batchVisible(batch, filter) && (!q || matchesSearch(batch, q)))
  }, [shed, filter, batchSearch])

  const getExportSheets = () => [
    {
      title: `Shed ${shed.shed}`,
      headers: ["Shed", "Sowed", "Gone", "To orders", "Remaining", "Current (ready)", "Expected (not ready)", "Next ready"],
      rows: [[shed.shed, shed.sowed, shed.gone, shed.toOrders, shed.remaining, shed.current, shed.expected, nextReadyText(shed.nextReady)]],
    },
    ...batchSheets(batches, false),
  ]

  return (
    <Drawer anchor="right" open={Boolean(shed)} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", md: "min(1180px, 96vw)" }, bgcolor: "#f8fafc" } }}>
      {shed ? (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ p: 2, bgcolor: "#fff", borderBottom: `1px solid ${C.line}` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: C.currentBg, color: C.remaining, display: "grid", placeItems: "center" }}>
                  <WarehouseOutlinedIcon />
                </Box>
                <Box>
                  <Typography variant="overline" fontWeight={800} color={C.muted} lineHeight={1}>
                    Shed
                  </Typography>
                  <Typography variant="h6" fontWeight={900} color={C.ink} lineHeight={1.2}>
                    {shed.shed}
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <DrawerExportButton getSheets={getExportSheets} fileName={`shed-stock-${shed.shed}`} />
                <IconButton onClick={onClose} aria-label="Close">
                  <CloseIcon />
                </IconButton>
              </Stack>
            </Stack>

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(6, 1fr)" }, gap: 1, mt: 1.5 }}>
              <Tile label="Sowed" value={shed.sowed} color={C.sowed} />
              <Tile label="Gone" value={shed.gone} color={C.gone} />
              <Tile label="To orders" value={shed.toOrders} color={C.orders} />
              <Tile label="Remaining" value={shed.remaining} color={C.remaining} />
              <Tile label="Current" value={shed.current} color={C.current} hint="Ready now." />
              <Tile label="Expected" value={shed.expected} color={C.expected} hint="Not ready yet — gets ready on the dates below." />
            </Box>
            <Box mt={1.25}>
              <ReadySchedule schedule={shed.schedule} />
            </Box>
          </Box>

          <Box sx={{ p: 2, pb: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between">
              <TextField
                size="small"
                placeholder="Search batch, plant, subtype"
                value={batchSearch}
                onChange={(event) => setBatchSearch(event.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ width: 300, bgcolor: "#fff", borderRadius: 2 }}
              />
              <Typography variant="caption" color={C.muted} fontWeight={700}>
                {batches.length} batch{batches.length === 1 ? "" : "es"} · click a batch for its entries, ready dates and orders
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ px: 2, pb: 2, flex: 1, minHeight: 0, overflow: "auto" }}>
            <BatchTable batches={batches} />
          </Box>
        </Box>
      ) : null}
    </Drawer>
  )
}

/* ───────────────────────── the tab ───────────────────────── */

export default function SowingShedStockTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState({ totals: null, sheds: [] })
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("stock")
  const [view, setView] = useState("shed")
  const [selectedName, setSelectedName] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.sowing.GET_CAPACITY_SHED_STOCK)
      const res = await instance.request({}, {})
      if (!res?.data?.success) throw new Error(res?.data?.message || "Could not load shed stock")
      setData({ totals: res.data.totals || null, sheds: enrichData(res.data.sheds || []) })
    } catch (err) {
      setData({ totals: null, sheds: [] })
      setError(err?.response?.data?.message || err?.message || "Could not load shed stock")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const q = search.trim().toLowerCase()

  const shedRows = useMemo(
    () =>
      data.sheds.filter((shed) => {
        if (!shedVisible(shed, filter)) return false
        if (!q) return true
        return shed.shed.toLowerCase().includes(q) || shed.batches.some((batch) => batchVisible(batch, filter) && matchesSearch(batch, q))
      }),
    [data.sheds, filter, q]
  )

  const batchRows = useMemo(() => shedRows.flatMap((shed) => shed.batches.filter((batch) => batchVisible(batch, filter) && (!q || shed.shed.toLowerCase().includes(q) || matchesSearch(batch, q)))), [shedRows, filter, q])

  const shedColumns = useMemo(
    () => [
      {
        key: "shed",
        label: "Shed",
        minWidth: 160,
        sortValue: (r) => r.shed,
        render: (r) => (
          <Stack direction="row" spacing={0.75} alignItems="center">
            <WarehouseOutlinedIcon sx={{ fontSize: 17, color: C.remaining }} />
            <b>{r.shed}</b>
          </Stack>
        ),
      },
      {
        key: "batches",
        label: "Batches",
        numeric: true,
        sortValue: (r) => (filter === "all" ? r.batchCount : r.activeBatchCount),
        render: (r) => <Num value={filter === "all" ? r.batchCount : r.activeBatchCount} color={C.ink} />,
        total: (rows) => fmt(rows.reduce((total, row) => total + n(filter === "all" ? row.batchCount : row.activeBatchCount), 0)),
      },
      { key: "sowed", label: "Sowed", numeric: true, render: (r) => <Num value={r.sowed} color={C.sowed} />, total: (rows) => fmt(sumOf(rows, "sowed")) },
      { key: "gone", label: "Gone", numeric: true, render: (r) => <Num value={r.gone} color={C.gone} />, total: (rows) => fmt(sumOf(rows, "gone")) },
      { key: "toOrders", label: "To orders", numeric: true, render: (r) => <Num value={r.toOrders} color={C.orders} />, total: (rows) => fmt(sumOf(rows, "toOrders")) },
      { key: "remaining", label: "Remaining", numeric: true, render: (r) => <Num value={r.remaining} color={C.remaining} />, total: (rows) => fmt(sumOf(rows, "remaining")) },
      {
        key: "current",
        label: "Current (ready)",
        numeric: true,
        bg: C.currentBg,
        render: (r) => <Num value={r.current} color={C.current} />,
        total: (rows) => fmt(sumOf(rows, "current")),
      },
      {
        key: "expected",
        label: "Expected (not ready)",
        numeric: true,
        bg: C.expectedBg,
        render: (r) => <Num value={r.expected} color={C.expected} />,
        total: (rows) => fmt(sumOf(rows, "expected")),
      },
      { key: "nextReady", label: "Next ready", minWidth: 150, sortValue: (r) => r.nextReadyDay, render: (r) => <NextReady item={r.nextReady} /> },
      { key: "flow", label: "Flow", sortValue: (r) => (n(r.sowed) ? n(r.remaining) / n(r.sowed) : null), render: (r) => <FlowBar row={r} /> },
    ],
    [filter]
  )

  const selected = useMemo(() => data.sheds.find((shed) => shed.shed === selectedName) || null, [data.sheds, selectedName])

  const getExportSheets = () => [
    {
      title: "Sheds",
      headers: ["Shed", "Sowed", "Gone", "To orders", "Remaining", "Current (ready)", "Expected (not ready)", "Next ready"],
      rows: shedRows.map((s) => [s.shed, s.sowed, s.gone, s.toOrders, s.remaining, s.current, s.expected, nextReadyText(s.nextReady)]),
    },
    ...batchSheets(batchRows, true),
  ]

  return (
    <Box>
      <SummaryStrip totals={data.totals} />

      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25} alignItems={{ lg: "center" }} justifyContent="space-between" mb={1.5}>
        <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap alignItems="center">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_, value) => value && setView(value)}
            sx={{
              bgcolor: "#fff",
              "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 800, px: 1.75, color: C.muted },
              "& .Mui-selected": { bgcolor: "#0f172a !important", color: "#fff !important" },
            }}
          >
            {VIEWS.map((item) => (
              <ToggleButton key={item.value} value={item.value}>
                {item.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={filter}
            onChange={(_, value) => value && setFilter(value)}
            sx={{
              bgcolor: "#fff",
              "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 800, px: 1.5, color: C.muted },
              "& .Mui-selected": { bgcolor: `${C.currentBg} !important`, color: "#166534 !important" },
            }}
          >
            {FILTERS.map((item) => (
              <ToggleButton key={item.value} value={item.value}>
                {item.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search shed, batch, plant"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 240, bgcolor: "#fff", borderRadius: 2 }}
          />
          <DrawerExportButton getSheets={getExportSheets} fileName="shed-wise-stock" disabled={loading || !shedRows.length} />
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={load} disabled={loading} aria-label="Refresh shed stock" sx={{ bgcolor: "#fff", border: `1px solid ${C.line}` }}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" mb={1.25}>
        <Legend />
        <Typography variant="caption" color={C.muted} fontWeight={700}>
          <b style={{ color: C.current }}>Current</b> = ready now · <b style={{ color: C.expected }}>Expected</b> = in the shed but not ready yet ·{" "}
          {view === "shed" ? "click a shed to open its batches" : "click a batch for its entries, ready dates and orders"} · click a column to sort
        </Typography>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress size={28} />
        </Box>
      ) : null}

      {!loading && !error ? (
        view === "shed" ? (
          <SortableTable
            columns={shedColumns}
            rows={shedRows}
            rowKey={(r) => r.shed}
            defaultSort={{ key: "remaining", dir: "desc" }}
            onRowClick={(row) => setSelectedName(row.shed)}
            showTotals
            maxHeight="calc(100vh - 380px)"
            emptyText="No sheds match this view."
          />
        ) : (
          <BatchTable batches={batchRows} showShed maxHeight="calc(100vh - 380px)" />
        )
      ) : null}

      <ShedDrawer shed={selected} filter={filter} onClose={() => setSelectedName("")} />
    </Box>
  )
}
