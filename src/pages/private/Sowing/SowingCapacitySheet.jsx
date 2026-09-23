import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined"
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined"
import SearchIcon from "@mui/icons-material/Search"
import { NetworkManager, API } from "network/core"
import SowingCapacityDrawer from "./components/SowingCapacityDrawer"
import {
  fmt,
  formatShortRange,
  rangeForPreset,
  seedPlanDetail,
  STATUS_STYLE,
  ymd,
} from "./capacitySheetUtils"

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "7", label: "Next 7 Days" },
  { id: "14", label: "Next 14 Days" },
  { id: "month", label: "This Month" },
]

const SHEET_COLUMNS = [
  { key: "plant", label: "Plant & subtype", align: "left", type: "text" },
  { key: "seed", label: "Seed plan", align: "left", type: "text" },
  { key: "delivery", label: "Delivery", align: "left", type: "date" },
  { key: "booked", label: "Booked", align: "right", type: "number" },
  { key: "sowed", label: "Sowed", align: "right", type: "number" },
  { key: "gap", label: "Gap", align: "right", type: "number" },
  { key: "excess", label: "Excess", align: "right", type: "number" },
  { key: "canBook", label: "Can book", align: "right", type: "number" },
  { key: "status", label: "Status", align: "left", type: "text" },
]

const SLOT_COLUMNS = [
  { key: "delivery", label: "Delivery", align: "left", type: "date" },
  { key: "booked", label: "Booked", align: "right", type: "number" },
  { key: "sowed", label: "Sowed", align: "right", type: "number" },
  { key: "gap", label: "Gap", align: "right", type: "number" },
  { key: "excess", label: "Excess", align: "right", type: "number" },
  { key: "canBook", label: "Can book", align: "right", type: "number" },
  { key: "status", label: "Status", align: "left", type: "text" },
]

const STATUS_RANK = { needs_sowing: 0, saleable_excess: 1, fulfilled: 2 }

const excelCell = {
  border: "1px solid #d0d7de",
  fontSize: 13,
  py: 0.6,
  px: 1,
  whiteSpace: "nowrap",
}

const excelHead = {
  ...excelCell,
  bgcolor: "#f3f4f6",
  fontWeight: 800,
  color: "#374151",
  position: "sticky",
  top: 0,
  zIndex: 2,
}

function dayKey(value) {
  const text = String(value || "")
  if (/^\d{2}-\d{2}-\d{4}$/.test(text)) {
    const [d, m, y] = text.split("-")
    return Number(`${y}${m}${d}`)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return Number(text.replace(/-/g, ""))
  return 0
}

function sheetSortValue(row, key) {
  if (key === "plant") return `${row.plantName || ""} ${row.subtypeName || ""}`.toLowerCase()
  if (key === "seed") return String(row.seedPlanLabel || "").toLowerCase()
  if (key === "delivery") return dayKey(row.deliveryFrom || row.startDay)
  if (key === "status") return STATUS_RANK[row.status] ?? 9
  return Number(row[key]) || 0
}

function compareRows(a, b, sort) {
  const av = sheetSortValue(a, sort.key)
  const bv = sheetSortValue(b, sort.key)
  let order = 0
  if (typeof av === "string" || typeof bv === "string") order = String(av).localeCompare(String(bv))
  else order = av - bv
  if (order === 0) order = `${a.plantName || ""} ${a.subtypeName || ""}`.localeCompare(`${b.plantName || ""} ${b.subtypeName || ""}`)
  return sort.dir === "desc" ? -order : order
}

function StatusChip({ status }) {
  const meta = STATUS_STYLE[status] || STATUS_STYLE.fulfilled
  return (
    <Chip
      size="small"
      label={meta.label}
      sx={{
        height: 26,
        fontWeight: 700,
        fontSize: 12,
        bgcolor: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.border}`,
        "& .MuiChip-label": { px: 1.1 },
      }}
    />
  )
}

function MetricButton({ children, onClick, sx }) {
  return (
    <Button
      size="small"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      sx={{
        minWidth: 0,
        p: 0,
        fontWeight: 800,
        fontSize: 14,
        color: "#0f172a",
        textTransform: "none",
        width: "100%",
        justifyContent: "flex-end",
        "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
        ...sx,
      }}
    >
      {children}
    </Button>
  )
}

function hasAmount(value) {
  return Number(value) > 0
}

function GapValue({ value }) {
  if (!hasAmount(value)) return null
  return (
    <Box
      sx={{
        display: "inline-flex",
        px: 1,
        py: 0.25,
        borderRadius: 1,
        border: "1px solid #fdba74",
        bgcolor: "#fff7ed",
        color: "#c2410c",
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      {fmt(value)}
    </Box>
  )
}

function PillValue({ value, color, bg, border, prefix = "" }) {
  if (!hasAmount(value)) return null
  return (
    <Box
      sx={{
        display: "inline-flex",
        px: 1,
        py: 0.25,
        borderRadius: 1,
        border: `1px solid ${border}`,
        bgcolor: bg,
        color,
        fontWeight: 800,
        fontSize: 13,
      }}
    >
      {prefix}
      {fmt(value)}
    </Box>
  )
}

function rowHasNumbers(row) {
  return (
    hasAmount(row?.booked) ||
    hasAmount(row?.sowed) ||
    hasAmount(row?.gap) ||
    hasAmount(row?.excess) ||
    hasAmount(row?.canBook)
  )
}

function SortHead({ columns, sort, onSort, withLead = false }) {
  return (
    <TableRow>
      {withLead ? <TableCell sx={{ ...excelHead, width: 36 }} /> : null}
      {columns.map((column) => (
        <TableCell key={column.key} align={column.align} sx={excelHead} sortDirection={sort.key === column.key ? sort.dir : false}>
          <TableSortLabel
            active={sort.key === column.key}
            direction={sort.key === column.key ? sort.dir : "asc"}
            onClick={() => onSort(column)}
            sx={{
              color: "inherit",
              "& .MuiTableSortLabel-icon": { color: "#16a34a !important" },
            }}
          >
            {column.label}
          </TableSortLabel>
        </TableCell>
      ))}
    </TableRow>
  )
}

function SlotTable({ slots, onOpen }) {
  const [sort, setSort] = useState({ key: "delivery", dir: "asc" })
  const visible = useMemo(() => {
    return (slots || []).filter(rowHasNumbers).slice().sort((a, b) => compareRows(a, b, sort))
  }, [slots, sort])
  const onSort = (column) => {
    setSort((prev) => {
      if (prev.key === column.key) return { key: column.key, dir: prev.dir === "asc" ? "desc" : "asc" }
      return { key: column.key, dir: column.type === "number" ? "desc" : "asc" }
    })
  }
  if (!visible.length) return null
  return (
    <Table size="small" sx={{ bgcolor: "#fff", borderCollapse: "collapse" }}>
      <TableHead>
        <SortHead columns={SLOT_COLUMNS} sort={sort} onSort={onSort} />
      </TableHead>
      <TableBody>
        {visible.map((slot, index) => (
          <TableRow
            key={slot.slotId}
            hover
            onClick={() => onOpen(slot.slotId)}
            sx={{ cursor: "pointer", bgcolor: index % 2 ? "#f8fafc" : "#fff" }}
          >
            <TableCell sx={{ ...excelCell, fontWeight: 700 }}>{formatShortRange(slot.startDay, slot.endDay)}</TableCell>
            <TableCell align="right" sx={excelCell}>{hasAmount(slot.booked) ? fmt(slot.booked) : ""}</TableCell>
            <TableCell align="right" sx={{ ...excelCell, color: "#15803d", fontWeight: 700 }}>
              {hasAmount(slot.sowed) ? fmt(slot.sowed) : ""}
            </TableCell>
            <TableCell align="right" sx={{ ...excelCell, color: "#c2410c", fontWeight: 800 }}>
              {hasAmount(slot.gap) ? fmt(slot.gap) : ""}
            </TableCell>
            <TableCell align="right" sx={{ ...excelCell, color: "#1d4ed8", fontWeight: 800 }}>
              {hasAmount(slot.excess) ? `+${fmt(slot.excess)}` : ""}
            </TableCell>
            <TableCell align="right" sx={{ ...excelCell, color: "#15803d", fontWeight: 800 }}>
              {hasAmount(slot.canBook) ? fmt(slot.canBook) : ""}
            </TableCell>
            <TableCell sx={excelCell}>
              <StatusChip status={slot.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function csvEscape(value) {
  const text = String(value ?? "")
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

function downloadCsv(rows, from, to) {
  const header = [
    "Plant",
    "Subtype",
    "Seed plan",
    "Delivery from",
    "Delivery to",
    "Booked",
    "Sowed",
    "Gap",
    "Excess",
    "Can book",
    "Status",
  ]
  const lines = [header.join(",")]
  rows.forEach((row) => {
    const meta = STATUS_STYLE[row.status] || STATUS_STYLE.fulfilled
    lines.push(
      [
        row.plantName,
        row.subtypeName,
        row.seedPlanLabel,
        row.deliveryFrom,
        row.deliveryTo,
        row.booked,
        row.sowed,
        row.gap,
        row.excess,
        row.canBook,
        meta.label,
      ]
        .map(csvEscape)
        .join(",")
    )
  })
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `sowing-capacity-${from}-to-${to}.csv`
  link.click()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

export default function SowingCapacitySheet() {
  const [preset, setPreset] = useState("14")
  const [custom, setCustom] = useState(false)
  const [from, setFrom] = useState(() => rangeForPreset("14").from)
  const [to, setTo] = useState(() => rangeForPreset("14").to)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [plants, setPlants] = useState([])
  const [totals, setTotals] = useState(null)
  const [openSubtype, setOpenSubtype] = useState("")
  const [slotId, setSlotId] = useState(null)
  const [sort, setSort] = useState({ key: "plant", dir: "asc" })

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.sowing.GET_CAPACITY_SHEET)
      const res = await instance.request({}, { from, to })
      if (res?.data?.success) {
        setPlants(res.data.plants || [])
        setTotals(res.data.totals || null)
      } else {
        setPlants([])
        setError(res?.data?.message || "Could not load capacity")
      }
    } catch (err) {
      setPlants([])
      setError(err?.response?.data?.message || err?.message || "Could not load capacity")
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const applyPreset = (id) => {
    const range = rangeForPreset(id, ymd(new Date()))
    setPreset(id)
    setCustom(false)
    setFrom(range.from)
    setTo(range.to)
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return plants.flatMap((plant) =>
      (plant.subtypes || [])
        .filter((subtype) => {
          if (!q) return true
          return (
            plant.plantName.toLowerCase().includes(q) ||
            String(subtype.subtypeName || "").toLowerCase().includes(q)
          )
        })
        .map((subtype) => ({
          ...subtype,
          plantId: plant.plantId,
          plantName: plant.plantName,
        }))
        .filter(rowHasNumbers)
    )
  }, [plants, search])

  const sortedRows = useMemo(() => rows.slice().sort((a, b) => compareRows(a, b, sort)), [rows, sort])

  const onSort = (column) => {
    setSort((prev) => {
      if (prev.key === column.key) return { key: column.key, dir: prev.dir === "asc" ? "desc" : "asc" }
      return { key: column.key, dir: column.type === "number" ? "desc" : "asc" }
    })
  }

  const visibleTotals = useMemo(() => {
    if (!search.trim()) return totals
    return rows.reduce(
      (acc, row) => ({
        booked: acc.booked + (Number(row.booked) || 0),
        sowed: acc.sowed + (Number(row.sowed) || 0),
        gap: acc.gap + (Number(row.gap) || 0),
        excess: acc.excess + (Number(row.excess) || 0),
        canBook: acc.canBook + (Number(row.canBook) || 0),
      }),
      { booked: 0, sowed: 0, gap: 0, excess: 0, canBook: 0 }
    )
  }, [rows, search, totals])

  return (
    <Box sx={{ bgcolor: "#f4f7fb", minHeight: "100%", p: { xs: 1.5, md: 2.5 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5} mb={2}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={800} color="#0f172a">
              Sowing & Booking Capacity
            </Typography>
            <Chip label="Live" size="small" sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 800, height: 22 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Sowing-allowed plants. Booked, sowed, gap, excess, and remaining bookable capacity.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            placeholder="Search plant or subtype"
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
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={() => downloadCsv(rows, from, to)}
            disabled={!rows.length}
            sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#fff", borderColor: "#e2e8f0", color: "#334155" }}
          >
            Export
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: "column", lg: "row" }}
        justifyContent="space-between"
        alignItems={{ lg: "center" }}
        spacing={1.5}
        sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, px: 1.5, py: 1, mb: 1.5 }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" fontWeight={800} color="text.secondary" letterSpacing={0.4}>
            DELIVERY PERIOD
          </Typography>
          <Button
            size="small"
            startIcon={<CalendarMonthOutlinedIcon />}
            onClick={() => setCustom(true)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              color: "#0f172a",
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              px: 1.25,
            }}
          >
            {formatShortRange(from, to)}
          </Button>
          {custom ? (
            <>
              <TextField size="small" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              <TextField size="small" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {PRESETS.map((item) => {
            const selected = !custom && preset === item.id
            return (
              <Button
                key={item.id}
                size="small"
                onClick={() => applyPreset(item.id)}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  color: selected ? "#fff" : "#475569",
                  bgcolor: selected ? "#16a34a" : "transparent",
                  "&:hover": { bgcolor: selected ? "#15803d" : "#f1f5f9" },
                }}
              >
                {item.label}
              </Button>
            )
          })}
          <Button
            size="small"
            onClick={() => setCustom(true)}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              border: "1px solid #e2e8f0",
              color: custom ? "#166534" : "#475569",
              bgcolor: custom ? "#f0fdf4" : "#fff",
            }}
          >
            Custom Range
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2.5, overflow: "hidden" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1.25} flexWrap="wrap" useFlexGap>
          <Typography fontWeight={800}>
            Plant & Subtype Capacity Master{" "}
            <Typography component="span" variant="body2" color="text.secondary" fontWeight={600}>
              ({rows.length} varieties active)
            </Typography>
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Legend swatch="#fdba74" label="Gap to Sow" />
            <Legend swatch="#93c5fd" label="Saleable Excess" />
            <Legend swatch="#86efac" label="Booking Open" />
          </Stack>
        </Stack>

        <Box sx={{ overflow: "auto", maxHeight: "calc(100vh - 280px)" }}>
          <Table size="small" stickyHeader sx={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 1100 }}>
            <TableHead>
              <SortHead columns={SHEET_COLUMNS} sort={sort} onSort={onSort} withLead />
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} sx={excelCell}>
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress size={28} />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading && sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={excelCell}>
                    <Alert severity="info">No sowing-allowed slots in this range.</Alert>
                  </TableCell>
                </TableRow>
              ) : null}
              {sortedRows.map((row, index) => {
                const key = `${row.plantId}-${row.subtypeId}`
                const open = openSubtype === key
                const meta = STATUS_STYLE[row.status] || STATUS_STYLE.fulfilled
                const openSlot = () => row.slots?.[0] && setSlotId(row.slots[0].slotId)
                const rowBg = open ? "#f0fdf4" : index % 2 ? "#f8fafc" : "#fff"
                return (
                  <React.Fragment key={key}>
                    <TableRow hover sx={{ bgcolor: rowBg, cursor: "pointer" }} onClick={() => setOpenSubtype(open ? "" : key)}>
                      <TableCell sx={excelCell}>
                        <IconButton
                          size="small"
                          aria-label={open ? "Hide slots" : "Show slots"}
                          onClick={(event) => {
                            event.stopPropagation()
                            setOpenSubtype(open ? "" : key)
                          }}
                        >
                          <ExpandMoreIcon sx={{ transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
                        </IconButton>
                      </TableCell>
                      <TableCell sx={excelCell}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: meta.dot, flexShrink: 0 }} />
                          <Typography fontWeight={800} fontSize={13}>
                            {row.plantName} - {row.subtypeName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={excelCell}>
                        <Typography fontWeight={700} fontSize={13}>{row.seedPlanLabel}</Typography>
                        <Typography variant="caption" color="text.secondary">{seedPlanDetail(row.seedPlanLabel)}</Typography>
                      </TableCell>
                      <TableCell sx={excelCell}>{formatShortRange(row.deliveryFrom, row.deliveryTo)}</TableCell>
                      <TableCell align="right" sx={excelCell}>
                        <MetricButton onClick={openSlot}>{hasAmount(row.booked) ? fmt(row.booked) : ""}</MetricButton>
                      </TableCell>
                      <TableCell align="right" sx={excelCell}>
                        <MetricButton onClick={openSlot}>{hasAmount(row.sowed) ? fmt(row.sowed) : ""}</MetricButton>
                      </TableCell>
                      <TableCell align="right" sx={excelCell}>
                        <MetricButton onClick={openSlot}><GapValue value={row.gap} /></MetricButton>
                      </TableCell>
                      <TableCell align="right" sx={excelCell}>
                        <MetricButton onClick={openSlot}>
                          <PillValue value={row.excess} prefix="+" color="#1d4ed8" bg="#eff6ff" border="#bfdbfe" />
                        </MetricButton>
                      </TableCell>
                      <TableCell align="right" sx={excelCell}>
                        <MetricButton onClick={openSlot}>
                          <PillValue value={row.canBook} color="#15803d" bg="#f0fdf4" border="#bbf7d0" />
                        </MetricButton>
                      </TableCell>
                      <TableCell sx={excelCell}>
                        <StatusChip status={row.status} />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={10} sx={{ p: 0, border: open ? "1px solid #d0d7de" : 0, bgcolor: "#f8fafc" }}>
                        <Collapse in={open} unmountOnExit>
                          <Box sx={{ p: 1.25 }}>
                            <SlotTable slots={row.slots} onOpen={setSlotId} />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </Box>

            {visibleTotals ? (
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                sx={{ px: 2, py: 1.25, bgcolor: "#f8fafc" }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total varieties: <b>{rows.length}</b>
                  {"  ·  "}
                  Delivery window: <b>{formatShortRange(from, to)}</b>
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {hasAmount(visibleTotals.booked) ? <FooterStat label="Booked" value={fmt(visibleTotals.booked)} /> : null}
                  {hasAmount(visibleTotals.sowed) ? <FooterStat label="Sowed" value={fmt(visibleTotals.sowed)} /> : null}
                  {hasAmount(visibleTotals.gap) ? <FooterStat label="Gap" value={fmt(visibleTotals.gap)} color="#c2410c" /> : null}
                  {hasAmount(visibleTotals.excess) ? <FooterStat label="Excess" value={signed(visibleTotals.excess)} color="#1d4ed8" /> : null}
                  {hasAmount(visibleTotals.canBook) ? <FooterStat label="Can Book" value={signed(visibleTotals.canBook)} color="#15803d" /> : null}
                </Stack>
              </Stack>
            ) : null}
      </Box>

      <SowingCapacityDrawer slotId={slotId} onClose={() => setSlotId(null)} />
    </Box>
  )
}

function Legend({ swatch, label }) {
  return (
    <Stack direction="row" spacing={0.6} alignItems="center">
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: swatch }} />
      <Typography variant="caption" color="text.secondary" fontWeight={700}>
        {label}
      </Typography>
    </Stack>
  )
}

function signed(value) {
  const n = Number(value) || 0
  return n > 0 ? `+${fmt(n)}` : fmt(n)
}

function FooterStat({ label, value, color = "#0f172a" }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {label}:{" "}
      <Typography component="span" fontWeight={800} color={color}>
        {value}
      </Typography>
    </Typography>
  )
}
