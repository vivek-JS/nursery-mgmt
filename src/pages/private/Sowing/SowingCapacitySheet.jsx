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
  { key: "delivery", label: "Date range", align: "left", type: "date" },
  { key: "gap", label: "Gap", align: "right", type: "number" },
  { key: "canBook", label: "Can book", align: "right", type: "number" },
  { key: "booked", label: "Booked", align: "right", type: "number" },
  { key: "sowed", label: "Sowed", align: "right", type: "number" },
  { key: "status", label: "Status", align: "left", type: "text" },
]

const SLOT_COLUMNS = [
  { key: "delivery", label: "Date range", align: "left", type: "date" },
  { key: "gap", label: "Gap", align: "right", type: "number" },
  { key: "canBook", label: "Can book", align: "right", type: "number" },
  { key: "booked", label: "Booked", align: "right", type: "number" },
  { key: "sowed", label: "Sowed", align: "right", type: "number" },
  { key: "status", label: "Status", align: "left", type: "text" },
]

const STATUS_RANK = { needs_sowing: 0, saleable_excess: 1, fulfilled: 2 }

const NUM_COLOR = {
  booked: "#111827",
  sowed: "#059669",
  gap: "#ea580c",
  canBook: "#047857",
}

const excelCell = {
  borderBottom: "1px solid #eef2f6",
  borderRight: "1px solid #f1f5f9",
  fontSize: 13,
  py: 1,
  px: 1.25,
  whiteSpace: "nowrap",
  fontVariantNumeric: "tabular-nums",
}

const excelHead = {
  ...excelCell,
  bgcolor: "#f8fafc",
  color: "#64748b",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  position: "sticky",
  top: 0,
  zIndex: 2,
}

function numberColor(key, value) {
  if (!hasAmount(value)) return { color: "transparent" }
  return { color: NUM_COLOR[key] || "#111827", fontWeight: 700 }
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
        color: "inherit",
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
        <TableCell
          key={column.key}
          align={column.align}
          sx={excelHead}
          sortDirection={sort.key === column.key ? sort.dir : false}
        >
          <TableSortLabel
            active={sort.key === column.key}
            direction={sort.key === column.key ? sort.dir : "asc"}
            onClick={() => onSort(column)}
            sx={{
              color: "inherit",
              width: column.align === "right" ? "100%" : undefined,
              flexDirection: column.align === "right" ? "row-reverse" : "row",
              "& .MuiTableSortLabel-icon": { color: "#94a3b8 !important" },
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
            <TableCell align="right" sx={{ ...excelCell, ...numberColor("gap", slot.gap) }}>
              {hasAmount(slot.gap) ? fmt(slot.gap) : ""}
            </TableCell>
            <TableCell align="right" sx={{ ...excelCell, ...numberColor("canBook", slot.canBook) }}>
              {hasAmount(slot.canBook) ? fmt(slot.canBook) : ""}
            </TableCell>
            <TableCell align="right" sx={{ ...excelCell, ...numberColor("booked", slot.booked) }}>{hasAmount(slot.booked) ? fmt(slot.booked) : ""}</TableCell>
            <TableCell align="right" sx={{ ...excelCell, ...numberColor("sowed", slot.sowed) }}>
              {hasAmount(slot.sowed) ? fmt(slot.sowed) : ""}
            </TableCell>
            <TableCell sx={{ ...excelCell, color: (STATUS_STYLE[slot.status] || STATUS_STYLE.fulfilled).color, fontWeight: 700 }}>
              {(STATUS_STYLE[slot.status] || STATUS_STYLE.fulfilled).label}
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
    "Delivery from",
    "Delivery to",
    "Gap",
    "Can book",
    "Booked",
    "Sowed",
    "Status",
  ]
  const lines = [header.join(",")]
  rows.forEach((row) => {
    const meta = STATUS_STYLE[row.status] || STATUS_STYLE.fulfilled
    lines.push(
      [
        row.plantName,
        row.subtypeName,
        row.deliveryFrom,
        row.deliveryTo,
        row.gap,
        row.canBook,
        row.booked,
        row.sowed,
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
  const [seedSources, setSeedSources] = useState(null)
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
        setSeedSources(res.data.seedSources || null)
      } else {
        setPlants([])
        setSeedSources(null)
        setError(res?.data?.message || "Could not load capacity")
      }
    } catch (err) {
      setPlants([])
      setSeedSources(null)
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
    <Box sx={{ bgcolor: "#f6f8fb", minHeight: "100%", p: { xs: 1.5, md: 2.5 } }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1.5} mb={2}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={800} color="#0f172a">
              Sowing & Booking Capacity
            </Typography>
            <Chip label="Live" size="small" sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 800, height: 22 }} />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Sowing-allowed plants. Gap, plants you can still book from sowed excess, then booked and sowed.
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

      <SeedSourceStrip sources={seedSources} />

      {error ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ bgcolor: "#fff", border: "1px solid #e8edf3", borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" px={2} py={1.25} flexWrap="wrap" useFlexGap>
          <Typography fontWeight={800}>
            Plant & Subtype Capacity Master{" "}
            <Typography component="span" variant="body2" color="text.secondary" fontWeight={600}>
              ({rows.length} varieties active)
            </Typography>
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Legend swatch={NUM_COLOR.gap} label="Gap" />
            <Legend swatch={NUM_COLOR.canBook} label="Can book" />
          </Stack>
        </Stack>

        <Box sx={{ overflow: "auto", maxHeight: "calc(100vh - 280px)" }}>
          <Table size="small" stickyHeader sx={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: 1100 }}>
            <TableHead>
              <SortHead columns={SHEET_COLUMNS} sort={sort} onSort={onSort} withLead />
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} sx={excelCell}>
                    <Box display="flex" justifyContent="center" py={4}>
                      <CircularProgress size={28} />
                    </Box>
                  </TableCell>
                </TableRow>
              ) : null}
              {!loading && sortedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={excelCell}>
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
                          <Typography fontWeight={700} fontSize={13.5} color="#0f172a">
                            {row.plantName} - {row.subtypeName}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ ...excelCell, color: "#475569" }}>{formatShortRange(row.deliveryFrom, row.deliveryTo)}</TableCell>
                      <TableCell align="right" sx={{ ...excelCell, ...numberColor("gap", row.gap) }}>
                        <MetricButton onClick={openSlot}>{hasAmount(row.gap) ? fmt(row.gap) : ""}</MetricButton>
                      </TableCell>
                      <TableCell align="right" sx={{ ...excelCell, ...numberColor("canBook", row.canBook) }}>
                        <MetricButton onClick={openSlot}>{hasAmount(row.canBook) ? fmt(row.canBook) : ""}</MetricButton>
                      </TableCell>
                      <TableCell align="right" sx={{ ...excelCell, ...numberColor("booked", row.booked) }}>
                        <MetricButton onClick={openSlot}>{hasAmount(row.booked) ? fmt(row.booked) : ""}</MetricButton>
                      </TableCell>
                      <TableCell align="right" sx={{ ...excelCell, ...numberColor("sowed", row.sowed) }}>
                        <MetricButton onClick={openSlot}>{hasAmount(row.sowed) ? fmt(row.sowed) : ""}</MetricButton>
                      </TableCell>
                      <TableCell sx={{ ...excelCell, color: meta.color, fontWeight: 700 }}>
                        {meta.label}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 0, borderBottom: open ? "1px solid #eef2f6" : 0, bgcolor: "#fafbfc" }}>
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
                  {hasAmount(visibleTotals.gap) ? <FooterStat label="Gap" value={fmt(visibleTotals.gap)} color="#c2410c" /> : null}
                  {hasAmount(visibleTotals.canBook) ? <FooterStat label="Can book" value={fmt(visibleTotals.canBook)} color="#047857" /> : null}
                  {hasAmount(visibleTotals.booked) ? <FooterStat label="Booked" value={fmt(visibleTotals.booked)} /> : null}
                  {hasAmount(visibleTotals.sowed) ? <FooterStat label="Sowed" value={fmt(visibleTotals.sowed)} color="#059669" /> : null}
                </Stack>
              </Stack>
            ) : null}
      </Box>

      <SowingCapacityDrawer slotId={slotId} onClose={() => setSlotId(null)} />
    </Box>
  )
}

const SEED_LABELS = [
  ["COMPANY", "Company seed"],
  ["RAISING", "Raising seed"],
  ["MIXED", "Mixed seed"],
]

function SeedSourceStrip({ sources }) {
  if (!sources) return null
  const cards = SEED_LABELS.map(([key, label]) => ({ key, label, bucket: sources[key] })).filter(
    (item) => hasAmount(item.bucket?.plants) || hasAmount(item.bucket?.covered) || hasAmount(item.bucket?.gap)
  )
  if (!cards.length) return null
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} mb={1.5}>
      {cards.map(({ key, label, bucket }) => (
        <Box
          key={key}
          sx={{
            flex: 1,
            bgcolor: "#fff",
            border: "1px solid #e8edf3",
            borderRadius: 2.5,
            px: 2,
            py: 1.25,
            boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)",
          }}
        >
          <Typography variant="caption" fontWeight={800} color="#64748b" letterSpacing={0.4}>
            {label.toUpperCase()}
          </Typography>
          <Stack direction="row" spacing={2.5} mt={0.75}>
            <SeedStat label="Booked" value={bucket.plants} color={NUM_COLOR.booked} />
            <SeedStat label="Sowed" value={bucket.covered} color={NUM_COLOR.sowed} />
            <SeedStat label="Gap" value={bucket.gap} color={NUM_COLOR.gap} />
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}

function SeedStat({ label, value, color }) {
  return (
    <Box>
      <Typography variant="caption" color="#94a3b8" fontWeight={700}>
        {label}
      </Typography>
      <Typography fontWeight={800} fontSize={18} color={hasAmount(value) ? color : "#cbd5e1"} sx={{ fontVariantNumeric: "tabular-nums" }}>
        {hasAmount(value) ? fmt(value) : "—"}
      </Typography>
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
