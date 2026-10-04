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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined"
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined"
import SearchIcon from "@mui/icons-material/Search"
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded"
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined"
import { useSearchParams } from "react-router-dom"
import { NetworkManager, API } from "network/core"
import SowingCapacityDrawer from "./components/SowingCapacityDrawer"
import SowingCapacityAsk from "./components/SowingCapacityAsk"
import SowingShedStockTab from "./components/SowingShedStockTab"
import {
  fmt,
  formatShortRange,
  rangeForPreset,
  STATUS_STYLE,
} from "./capacitySheetUtils"

const COLUMN_HINT = {
  plant:
    "ही ओळ त्या वनस्पती आणि उपप्रकारातील सर्व स्लॉटची बेरीज दाखवते.",
  delivery:
    "रोपे तयार होण्याची तारीख या स्लॉटच्या सुरुवातीपासून शेवटापर्यंत.",
  canBook:
    "कॅन बुक = जास्तीची पेरणी − गॅप. जास्ती म्हणजे प्रत्यक्ष पेरलेली रोपे वजा ऑर्डरसाठी आधीच वापरलेली रोपे. धन आकडा म्हणजे एवढी रोपे नवीन बुकिंगसाठी मोकळी आहेत. उणे आकडा म्हणजे गॅप जास्त आहे, आधी पेरणी करा. स्लॉटची साईज किंवा स्लॉटवरील उपलब्ध स्टॉक यात धरला जात नाही.",
  gap:
    "गॅप = बुकिंग झालेली पण अजून पेरणी न झालेली रोपे. लाल आकडा म्हणजे या तारखेसाठी पेरणी बाकी आहे. क्लिक केल्यावर त्या बुकिंग स्लॉटवरील ऑर्डर दिसतात.",
  booked:
    "बुक = रद्द न केलेल्या ऑर्डरमधील एकूण रोपे.",
  sowed:
    "पेरलेली रोपे. ऑर्डर कव्हर झाली असेल तर ती संख्या, नाहीतर प्राथमिक पेरणी. पेरणी पूर्ण झाली तरी ही ओळ दिसते.",
  status:
    "पेरणी हवी — गॅप शिल्लक आहे. विक्रीयोग्य जास्ती — पेरणी ऑर्डरपेक्षा जास्त, बुकिंग घेता येते. पूर्ण — गॅप नाही आणि मोकळी जास्ती नाही.",
}

const SHEET_COLUMNS = [
  { key: "plant", label: "Plant & subtype", align: "left", type: "text" },
  { key: "delivery", label: "Date range", align: "left", type: "date" },
  { key: "canBook", label: "Can book", align: "right", type: "number" },
  { key: "gap", label: "Gap", align: "right", type: "number" },
  { key: "booked", label: "Booked", align: "right", type: "number" },
  { key: "sowed", label: "Sowed", align: "right", type: "number" },
  { key: "status", label: "Status", align: "left", type: "text" },
]

const SLOT_COLUMNS = [
  { key: "delivery", label: "Date range", align: "left", type: "date" },
  { key: "canBook", label: "Can book", align: "right", type: "number" },
  { key: "gap", label: "Gap", align: "right", type: "number" },
  { key: "booked", label: "Booked", align: "right", type: "number" },
  { key: "sowed", label: "Sowed", align: "right", type: "number" },
  { key: "status", label: "Status", align: "left", type: "text" },
]

const STATUS_RANK = { needs_sowing: 0, saleable_excess: 1, fulfilled: 2 }

const NUM_COLOR = {
  booked: "#111827",
  sowed: "#059669",
  gap: "#e11d48",
  canBook: "#047857",
}

const NEED_SOW = "#e11d48"
const NEED_HOVER = "#fff1f2"
const BOOK_HOVER = "#f0fdf4"

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

function metricSx(key, value, columnHover) {
  const n = Number(value) || 0
  const needsSow = (key === "gap" && n > 0) || (key === "canBook" && n < 0)
  const canSell = key === "canBook" && n > 0
  return {
    ...excelCell,
    color: n === 0 ? "transparent" : needsSow ? NEED_SOW : NUM_COLOR[key] || "#111827",
    fontWeight: n === 0 ? 400 : 700,
    bgcolor: columnHover ? (needsSow ? NEED_HOVER : canSell ? BOOK_HOVER : "#f8fafc") : undefined,
    transition: "background-color 0.15s ease",
  }
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

function metricText(value) {
  const n = Number(value) || 0
  return n === 0 ? "" : fmt(n)
}

function rowHasNumbers(row) {
  return (
    hasAmount(row?.booked) ||
    hasAmount(row?.sowed) ||
    hasAmount(row?.primarySowed) ||
    hasAmount(row?.gap) ||
    hasAmount(row?.excess) ||
    Number(row?.canBook) !== 0
  )
}

function hintTitle(columnKey) {
  const text = COLUMN_HINT[columnKey]
  if (!text) return ""
  return (
    <Typography sx={{ fontSize: 13, lineHeight: 1.5, fontWeight: 600, maxWidth: 280 }}>
      {text}
    </Typography>
  )
}

function HeadHint({ columnKey }) {
  if (!COLUMN_HINT[columnKey]) return null
  return (
    <Tooltip arrow placement="top" enterTouchDelay={0} title={hintTitle(columnKey)}>
      <InfoOutlinedIcon
        sx={{ fontSize: 14, ml: 0.35, color: "#94a3b8", cursor: "help", verticalAlign: "middle" }}
        onClick={(event) => event.stopPropagation()}
      />
    </Tooltip>
  )
}

function CellHint({ columnKey, children }) {
  if (!COLUMN_HINT[columnKey]) return children
  return (
    <Tooltip arrow placement="top" enterTouchDelay={200} title={hintTitle(columnKey)}>
      <Box component="span" sx={{ display: "block", width: "100%" }}>
        {children}
      </Box>
    </Tooltip>
  )
}

function SortHead({ columns, sort, onSort, withLead = false, hoverCol = "", onHover }) {
  return (
    <TableRow>
      {withLead ? <TableCell sx={{ ...excelHead, width: 36 }} /> : null}
      {columns.map((column) => (
        <TableCell
          key={column.key}
          align={column.align}
          sx={{
            ...excelHead,
            bgcolor:
              hoverCol === column.key
                ? column.key === "gap"
                  ? NEED_HOVER
                  : column.key === "canBook"
                    ? BOOK_HOVER
                    : "#f1f5f9"
                : excelHead.bgcolor,
          }}
          sortDirection={sort.key === column.key ? sort.dir : false}
          onMouseEnter={() => onHover?.(column.key)}
          onMouseLeave={() => onHover?.("")}
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
            <HeadHint columnKey={column.key} />
          </TableSortLabel>
        </TableCell>
      ))}
    </TableRow>
  )
}

function SlotTable({ slots, onOpen }) {
  const [sort, setSort] = useState({ key: "delivery", dir: "asc" })
  const [hoverCol, setHoverCol] = useState("")
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
        <SortHead columns={SLOT_COLUMNS} sort={sort} onSort={onSort} hoverCol={hoverCol} onHover={setHoverCol} />
      </TableHead>
      <TableBody>
        {visible.map((slot, index) => (
          <TableRow
            key={slot.slotId}
            hover
            onClick={() => onOpen(slot.slotId, "slot")}
            sx={{ cursor: "pointer", bgcolor: index % 2 ? "#f8fafc" : "#fff" }}
          >
            <TableCell sx={{ ...excelCell, fontWeight: 700 }}>
              <CellHint columnKey="delivery">{formatShortRange(slot.startDay, slot.endDay)}</CellHint>
            </TableCell>
            <TableCell
              align="right"
              sx={metricSx("canBook", slot.canBook, hoverCol === "canBook")}
              onMouseEnter={() => setHoverCol("canBook")}
              onMouseLeave={() => setHoverCol("")}
              onClick={(event) => {
                event.stopPropagation()
                onOpen(slot.slotId, "canBook")
              }}
            >
              <CellHint columnKey="canBook">{metricText(slot.canBook)}</CellHint>
            </TableCell>
            <TableCell
              align="right"
              sx={metricSx("gap", slot.gap, hoverCol === "gap")}
              onMouseEnter={() => setHoverCol("gap")}
              onMouseLeave={() => setHoverCol("")}
              onClick={(event) => {
                event.stopPropagation()
                onOpen(slot.slotId, "gap")
              }}
            >
              <CellHint columnKey="gap">{metricText(slot.gap)}</CellHint>
            </TableCell>
            <TableCell align="right" sx={metricSx("booked", slot.booked, hoverCol === "booked")} onMouseEnter={() => setHoverCol("booked")} onMouseLeave={() => setHoverCol("")}>
              <CellHint columnKey="booked">{metricText(slot.booked)}</CellHint>
            </TableCell>
            <TableCell align="right" sx={metricSx("sowed", slot.sowed, hoverCol === "sowed")} onMouseEnter={() => setHoverCol("sowed")} onMouseLeave={() => setHoverCol("")}>
              <CellHint columnKey="sowed">{metricText(slot.sowed)}</CellHint>
            </TableCell>
            <TableCell sx={{ ...excelCell, color: (STATUS_STYLE[slot.status] || STATUS_STYLE.fulfilled).color, fontWeight: 700 }}>
              <CellHint columnKey="status">{(STATUS_STYLE[slot.status] || STATUS_STYLE.fulfilled).label}</CellHint>
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
    "Can book",
    "Gap",
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
        row.canBook,
        row.gap,
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

const MAIN_TABS = ["capacity", "shed"]

export default function SowingCapacitySheet() {
  const [searchParams, setSearchParams] = useSearchParams()
  const mainTab = MAIN_TABS.includes(searchParams.get("tab")) ? searchParams.get("tab") : "capacity"
  const setMainTab = useCallback(
    (value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === "capacity") next.delete("tab")
          else next.set("tab", value)
          return next
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )
  const initialRange = rangeForPreset("14")
  const [from, setFrom] = useState(initialRange.from)
  const [to, setTo] = useState(initialRange.to)
  const [applied, setApplied] = useState({ from: initialRange.from, to: initialRange.to, n: 0 })
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [plants, setPlants] = useState([])
  const [totals, setTotals] = useState(null)
  const [seedSources, setSeedSources] = useState(null)
  const [openSubtype, setOpenSubtype] = useState("")
  const [detail, setDetail] = useState(null)
  const [sort, setSort] = useState({ key: "plant", dir: "asc" })
  const [hoverCol, setHoverCol] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.sowing.GET_CAPACITY_SHEET)
      const query = applied.from && applied.to ? { from: applied.from, to: applied.to } : { all: "1" }
      const res = await instance.request({}, query)
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
  }, [applied])

  useEffect(() => {
    if (mainTab !== "capacity") return undefined
    load()
    return undefined
  }, [load, mainTab])

  const fetchSheet = () => {
    if ((from && !to) || (!from && to)) {
      setError("Choose both dates, or clear both.")
      return
    }
    if (from && to && to < from) {
      setError("The end date has to be on or after the start date.")
      return
    }
    setError("")
    setApplied((prev) => ({ from, to, n: prev.n + 1 }))
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
            {mainTab === "shed"
              ? "Shed-wise stock. Open a shed to see each batch: sowed, remaining, gone and the orders it went to."
              : "Sowing-allowed plants. Gap, plants you can still book from sowed excess, then booked and sowed."}
          </Typography>
        </Box>
        {mainTab === "capacity" ? (
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
              onClick={() => downloadCsv(rows, applied.from || "all", applied.to || "all")}
              disabled={!rows.length}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#fff", borderColor: "#e2e8f0", color: "#334155" }}
            >
              Export
            </Button>
            <SowingCapacityAsk from={applied.from} to={applied.to} />
          </Stack>
        ) : null}
      </Stack>

      <Box
        sx={{
          bgcolor: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 2.5,
          mb: 1.5,
          px: 1,
          boxShadow: "0 4px 16px rgba(15, 23, 42, 0.03)",
        }}
      >
        <Tabs
          value={mainTab}
          onChange={(_, value) => setMainTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 800,
              minHeight: 48,
              color: "#64748b",
            },
            "& .Mui-selected": { color: "#0f172a" },
            "& .MuiTabs-indicator": { bgcolor: "#16a34a", height: 3, borderRadius: 2 },
          }}
        >
          <Tab
            value="capacity"
            icon={<GridViewRoundedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Capacity sheet"
          />
          <Tab
            value="shed"
            icon={<WarehouseOutlinedIcon sx={{ fontSize: 18 }} />}
            iconPosition="start"
            label="Shed-wise stock"
          />
        </Tabs>
      </Box>

      {mainTab === "shed" ? <SowingShedStockTab /> : null}

      {mainTab === "capacity" ? (
        <>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, px: 1.5, py: 1, mb: 1.5 }}
          >
            <TextField
              size="small"
              type="date"
              label="From"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: "#fff", minWidth: 160 }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ bgcolor: "#fff", minWidth: 160 }}
            />
            <Button
              variant="outlined"
              onClick={() => {
                setFrom("")
                setTo("")
              }}
              disabled={!from && !to}
              sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#fff", borderColor: "#e2e8f0", color: "#334155" }}
            >
              Clear
            </Button>
            <Button
              variant="contained"
              onClick={fetchSheet}
              disabled={loading}
              sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#0f172a" }}
            >
              Fetch
            </Button>
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
                  ({rows.length} varieties)
                </Typography>
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <Legend swatch={NUM_COLOR.canBook} label="Can book" />
                <Legend swatch={NUM_COLOR.gap} label="Gap" />
              </Stack>
            </Stack>

            <Box sx={{ overflow: "auto", maxHeight: "calc(100vh - 320px)" }}>
              <Table size="small" stickyHeader sx={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", minWidth: 1100 }}>
                <TableHead>
                  <SortHead columns={SHEET_COLUMNS} sort={sort} onSort={onSort} withLead hoverCol={hoverCol} onHover={setHoverCol} />
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
                    const idsFor = (focus) => {
                      const slots = row.slots || []
                      const picked = slots.filter((slot) => {
                        if (focus === "gap") return hasAmount(slot.gap)
                        if (focus === "canBook") return Number(slot.canBook) !== 0 || hasAmount(slot.excess)
                        return true
                      })
                      return (picked.length ? picked : slots).map((slot) => slot.slotId).filter(Boolean)
                    }
                    const openDetail = (focus) => {
                      const slotIds = idsFor(focus)
                      if (slotIds.length) setDetail({ slotIds, focus })
                    }
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
                            <CellHint columnKey="plant">
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: meta.dot, flexShrink: 0 }} />
                                <Typography fontWeight={700} fontSize={13.5} color="#0f172a">
                                  {row.plantName} - {row.subtypeName}
                                </Typography>
                              </Stack>
                            </CellHint>
                          </TableCell>
                          <TableCell sx={{ ...excelCell, color: "#475569" }}>
                            <CellHint columnKey="delivery">{formatShortRange(row.deliveryFrom, row.deliveryTo)}</CellHint>
                          </TableCell>
                          <TableCell align="right" sx={metricSx("canBook", row.canBook, hoverCol === "canBook")} onMouseEnter={() => setHoverCol("canBook")} onMouseLeave={() => setHoverCol("")}>
                            <CellHint columnKey="canBook">
                              <MetricButton onClick={() => openDetail("canBook")}>{metricText(row.canBook)}</MetricButton>
                            </CellHint>
                          </TableCell>
                          <TableCell align="right" sx={metricSx("gap", row.gap, hoverCol === "gap")} onMouseEnter={() => setHoverCol("gap")} onMouseLeave={() => setHoverCol("")}>
                            <CellHint columnKey="gap">
                              <MetricButton onClick={() => openDetail("gap")}>{metricText(row.gap)}</MetricButton>
                            </CellHint>
                          </TableCell>
                          <TableCell align="right" sx={metricSx("booked", row.booked, hoverCol === "booked")} onMouseEnter={() => setHoverCol("booked")} onMouseLeave={() => setHoverCol("")}>
                            <CellHint columnKey="booked">
                              <MetricButton onClick={() => openDetail("slot")}>{metricText(row.booked)}</MetricButton>
                            </CellHint>
                          </TableCell>
                          <TableCell align="right" sx={metricSx("sowed", row.sowed, hoverCol === "sowed")} onMouseEnter={() => setHoverCol("sowed")} onMouseLeave={() => setHoverCol("")}>
                            <CellHint columnKey="sowed">
                              <MetricButton onClick={() => openDetail("slot")}>{metricText(row.sowed)}</MetricButton>
                            </CellHint>
                          </TableCell>
                          <TableCell sx={{ ...excelCell, color: meta.color, fontWeight: 700 }}>
                            <CellHint columnKey="status">{meta.label}</CellHint>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={8} sx={{ p: 0, borderBottom: open ? "1px solid #eef2f6" : 0, bgcolor: "#fafbfc" }}>
                            <Collapse in={open} unmountOnExit>
                              <Box sx={{ p: 1.25 }}>
                                <SlotTable slots={row.slots} onOpen={(slotId, focus) => setDetail({ slotIds: [slotId], focus: focus || "slot" })} />
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
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                  {Number(visibleTotals.canBook) !== 0 ? (
                    <FooterStat hintKey="canBook" label="Can book" value={fmt(visibleTotals.canBook)} color={Number(visibleTotals.canBook) < 0 ? NEED_SOW : "#047857"} />
                  ) : null}
                  {hasAmount(visibleTotals.gap) ? <FooterStat hintKey="gap" label="Gap" value={fmt(visibleTotals.gap)} color={NEED_SOW} /> : null}
                  {hasAmount(visibleTotals.booked) ? <FooterStat hintKey="booked" label="Booked" value={fmt(visibleTotals.booked)} /> : null}
                  {hasAmount(visibleTotals.sowed) ? <FooterStat hintKey="sowed" label="Sowed" value={fmt(visibleTotals.sowed)} color="#059669" /> : null}
                </Stack>
              </Stack>
            ) : null}
          </Box>

          <SowingCapacityDrawer detail={detail} onClose={() => setDetail(null)} />
        </>
      ) : null}
    </Box>
  )
}

const SEED_LABELS = [
  ["COMPANY", "Company seed", "कंपनीचे बियाणे. खाली बुक, पेरले आणि गॅप फक्त या बियाण्याच्या ऑर्डर आहेत."],
  ["RAISING", "Raising seed", "शेतकरी वाढवणीचे बियाणे. खाली बुक, पेरले आणि गॅप फक्त या ऑर्डर आहेत."],
  ["MIXED", "Mixed seed", "कंपनी आणि वाढवणी दोन्ही मिळून. खाली बुक, पेरले आणि गॅप या मिश्र ऑर्डर आहेत."],
]

function SeedSourceStrip({ sources }) {
  if (!sources) return null
  const cards = SEED_LABELS.map(([key, label, hint]) => ({ key, label, hint, bucket: sources[key] })).filter(
    (item) => hasAmount(item.bucket?.plants) || hasAmount(item.bucket?.covered) || hasAmount(item.bucket?.gap)
  )
  if (!cards.length) return null
  return (
    <Stack direction={{ xs: "column", md: "row" }} spacing={1.25} mb={1.5}>
      {cards.map(({ key, label, hint, bucket }) => (
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
          <Stack direction="row" spacing={0.4} alignItems="center">
            <Typography variant="caption" fontWeight={800} color="#64748b" letterSpacing={0.4}>
              {label.toUpperCase()}
            </Typography>
            <Tooltip arrow placement="top" title={<Typography sx={{ fontSize: 13, lineHeight: 1.5, fontWeight: 600, maxWidth: 280 }}>{hint}</Typography>}>
              <InfoOutlinedIcon sx={{ fontSize: 14, color: "#94a3b8", cursor: "help" }} />
            </Tooltip>
          </Stack>
          <Stack direction="row" spacing={2.5} mt={0.75}>
            <SeedStat hintKey="booked" label="Booked" value={bucket.plants} color={NUM_COLOR.booked} />
            <SeedStat hintKey="sowed" label="Sowed" value={bucket.covered} color={NUM_COLOR.sowed} />
            <SeedStat hintKey="gap" label="Gap" value={bucket.gap} color={NUM_COLOR.gap} />
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}

function SeedStat({ label, value, color, hintKey }) {
  const body = (
    <Box>
      <Typography variant="caption" color="#94a3b8" fontWeight={700}>
        {label}
      </Typography>
      <Typography fontWeight={800} fontSize={18} color={hasAmount(value) ? color : "#cbd5e1"} sx={{ fontVariantNumeric: "tabular-nums" }}>
        {hasAmount(value) ? fmt(value) : "—"}
      </Typography>
    </Box>
  )
  if (!hintKey) return body
  return (
    <Tooltip arrow placement="top" title={hintTitle(hintKey)}>
      {body}
    </Tooltip>
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

function FooterStat({ label, value, color = "#0f172a", hintKey }) {
  const body = (
    <Typography variant="body2" color="text.secondary" sx={{ cursor: hintKey ? "help" : "default" }}>
      {label}:{" "}
      <Typography component="span" fontWeight={800} color={color}>
        {value}
      </Typography>
    </Typography>
  )
  if (!hintKey) return body
  return (
    <Tooltip arrow placement="top" title={hintTitle(hintKey)}>
      {body}
    </Tooltip>
  )
}
