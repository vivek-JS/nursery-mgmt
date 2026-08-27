import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import SearchIcon from "@mui/icons-material/Search"
import RefreshIcon from "@mui/icons-material/Refresh"
import FileDownloadIcon from "@mui/icons-material/FileDownload"
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart"
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined"
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline"
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined"
import ViewListIcon from "@mui/icons-material/ViewList"
import ViewModuleIcon from "@mui/icons-material/ViewModule"
import EventIcon from "@mui/icons-material/Event"
import LocalFloristOutlinedIcon from "@mui/icons-material/LocalFloristOutlined"
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined"
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined"
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined"
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined"
import { API, NetworkManager } from "network/core"
import useDebounce from "hooks/useDebounce"
import StockLagwadBreakdown from "./components/StockLagwadBreakdown"
import {
  fmt,
  formatSlotPeriod,
  plantAccentFor,
  downloadStockCsv,
  groupRowsIntoMonthSections,
  sortStockRowsBy,
  filterStockRows,
  extractStockFilterOptions,
  SORT_OPTIONS,
  MONTH_OPTIONS,
  combineSlotsBySubtype,
  getNextThreeCalendarMonths,
  getAllMonthsForYear,
  isPastCalendarMonth,
  filterRowsByMonthKeys,
  formatMonthKeysLabel,
  monthYearKey,
  parseSlotDate,
} from "./availableStockUtils"

const YEAR_OPTIONS = [2026, 2027]

const palette = {
  pageBg: "#f0f4f0",
  card: "#ffffff",
  border: "#e2e8e2",
  text: "#1a2e1a",
  muted: "#5c6f5c",
  accent: "#15803d",
  accentLight: "#dcfce7",
  accentHover: "#166534",
  rowHover: "#f7faf7",
  availableBg: "#ecfdf5",
  availableBorder: "#6ee7b7",
  availableText: "#047857",
  negativeBg: "#fef2f2",
  negativeBorder: "#fca5a5",
  negativeText: "#b91c1c",
  zeroBg: "#f5f5f5",
  zeroBorder: "#d4d4d4",
  zeroText: "#737373",
  shedBg: "#eff6ff",
  shedBorder: "#93c5fd",
  shedText: "#1d4ed8",
  readyBg: "#ecfeff",
  readyBorder: "#67e8f9",
  readyText: "#0e7490",
}

function MetricPill({ label, value, tone = "default", icon: Icon }) {
  const tones = {
    default: { bg: palette.card, border: palette.border, text: palette.text },
    available: { bg: palette.availableBg, border: palette.availableBorder, text: palette.availableText },
    shed: { bg: palette.shedBg, border: palette.shedBorder, text: palette.shedText },
    ready: { bg: palette.readyBg, border: palette.readyBorder, text: palette.readyText },
    orders: { bg: "#fff7ed", border: "#fdba74", text: "#c2410c" },
  }
  const t = tones[tone] || tones.default
  return (
    <Box
      sx={{
        flex: "1 1 140px",
        minWidth: 130,
        px: 1.75,
        py: 1.25,
        borderRadius: 2.5,
        bgcolor: t.bg,
        border: `1px solid ${t.border}`,
      }}>
      <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5}>
        {Icon ? <Icon sx={{ fontSize: 16, color: t.text }} /> : null}
        <Typography variant="caption" fontWeight={700} sx={{ color: t.text, textTransform: "uppercase", letterSpacing: 0.6 }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="h6" fontWeight={900} sx={{ color: t.text, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        {fmt(value)}
      </Typography>
    </Box>
  )
}

function StockKpiStrip({ rows, summary }) {
  const totals = useMemo(() => {
    if (summary && typeof summary === "object") {
      return {
        slotAvailable: summary.available ?? 0,
        actualAvailable: summary.actualAvailable ?? 0,
        inShed: summary.shedAvailableInShed ?? 0,
        ready: summary.actualReadyPlants ?? 0,
        toDispatch: summary.remainingToDispatch ?? 0,
        batches: summary.linkedBatchCount ?? 0,
      }
    }
    return rows.reduce(
      (acc, r) => ({
        slotAvailable: acc.slotAvailable + (r.availablePlants || 0),
        actualAvailable: acc.actualAvailable + (r.actualAvailable || 0),
        inShed: acc.inShed + (r.shedAvailableInShed || 0),
        ready: acc.ready + (r.actualReadyPlants || 0),
        toDispatch: acc.toDispatch + (r.remainingToDispatch || 0),
        batches: acc.batches + (r.linkedBatchCount || 0),
      }),
      { slotAvailable: 0, actualAvailable: 0, inShed: 0, ready: 0, toDispatch: 0, batches: 0 }
    )
  }, [rows, summary])

  return (
    <Stack direction="row" flexWrap="wrap" gap={1.25} sx={{ mb: 2 }}>
      <MetricPill label="Slot open" value={totals.slotAvailable} tone="available" icon={LocalFloristOutlinedIcon} />
      <MetricPill label="Actual avail" value={totals.actualAvailable} tone="available" icon={LocalFloristOutlinedIcon} />
      <MetricPill label="In shed" value={totals.inShed} tone="shed" icon={WarehouseOutlinedIcon} />
      <MetricPill label="Ready dispatch" value={totals.ready} tone="ready" icon={EventIcon} />
      <MetricPill label="Orders to go" value={totals.toDispatch} tone="orders" icon={ListAltOutlinedIcon} />
      <MetricPill label="Batch lines" value={totals.batches} tone="default" icon={Inventory2OutlinedIcon} />
    </Stack>
  )
}

/** Highlighted available plants count (positive / zero / negative) */
function AvailableHighlight({ value, size = "md" }) {
  const n = Number(value)
  const num = Number.isFinite(n) ? n : 0
  const isLarge = size === "lg"
  const tone =
    num < 0
      ? { bg: palette.negativeBg, border: palette.negativeBorder, text: palette.negativeText }
      : num === 0
        ? { bg: palette.zeroBg, border: palette.zeroBorder, text: palette.zeroText }
        : { bg: palette.availableBg, border: palette.availableBorder, text: palette.availableText }

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: isLarge ? "center" : "flex-end",
        gap: 0.5,
        px: isLarge ? 2 : 1.25,
        py: isLarge ? 1.25 : 0.5,
        borderRadius: 2,
        bgcolor: tone.bg,
        border: `2px solid ${tone.border}`,
        boxShadow: num > 0 ? `0 0 0 3px ${alpha(tone.border, 0.2)}` : "none",
        minWidth: isLarge ? 100 : 56,
      }}>
      <LocalFloristOutlinedIcon
        sx={{ fontSize: isLarge ? 20 : 16, color: tone.text, opacity: 0.9 }}
      />
      <Typography
        component="span"
        sx={{
          fontWeight: 900,
          fontSize: isLarge ? 22 : 15,
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
          color: tone.text,
          letterSpacing: "-0.02em",
        }}>
        {fmt(num)}
      </Typography>
    </Box>
  )
}

function MonthPill({ label, active, onClick, count, faded }) {
  return (
    <Chip
      label={count != null && count > 0 ? `${label} (${count})` : label}
      onClick={onClick}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: 13,
        height: 32,
        borderRadius: "999px",
        bgcolor: active ? palette.accent : palette.card,
        color: active ? "#fff" : palette.text,
        border: `1px solid ${active ? palette.accent : palette.border}`,
        opacity: faded && !active ? 0.5 : 1,
        "&:hover": { bgcolor: active ? palette.accentHover : palette.rowHover },
      }}
    />
  )
}

function PlantChip({ name, selected, onClick }) {
  const accent = plantAccentFor(name)
  return (
    <Chip
      label={name}
      onClick={onClick}
      sx={{
        height: 48,
        px: 2,
        fontSize: 16,
        fontWeight: 800,
        borderRadius: 3,
        bgcolor: selected ? accent : palette.card,
        color: selected ? "#fff" : palette.text,
        border: `2px solid ${selected ? accent : palette.border}`,
        boxShadow: selected ? `0 4px 14px ${alpha(accent, 0.35)}` : "none",
        transition: "all 0.2s ease",
        "&:hover": {
          bgcolor: selected ? accent : alpha(accent, 0.08),
          borderColor: accent,
          transform: "translateY(-1px)",
        },
      }}
    />
  )
}

function SubtypeChip({ label, active, onClick }) {
  return (
    <Chip
      label={label}
      onClick={onClick}
      size="medium"
      sx={{
        fontWeight: 600,
        fontSize: 13,
        height: 36,
        borderRadius: 2,
        bgcolor: active ? palette.accentLight : palette.card,
        color: active ? palette.accent : palette.text,
        border: `1px solid ${active ? palette.accent : palette.border}`,
        "&:hover": { bgcolor: palette.accentLight },
      }}
    />
  )
}

function SlotCard({ row, showBook, onBook }) {
  const accent = plantAccentFor(row.plantName)

  return (
    <Box
      sx={{
        height: "100%",
        borderRadius: 3,
        bgcolor: palette.card,
        border: `1px solid ${palette.border}`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.22s ease, box-shadow 0.22s ease",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: `0 14px 28px ${alpha(accent, 0.14)}`,
          borderColor: alpha(accent, 0.45),
        },
      }}>
      <Box
        sx={{
          height: 5,
          background: `linear-gradient(90deg, ${accent} 0%, ${alpha(accent, 0.45)} 100%)`,
        }}
      />
      <Box sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} mb={1}>
          <Box minWidth={0}>
            <Typography variant="subtitle2" fontWeight={800} noWrap title={row.plantName} sx={{ color: accent }}>
              {row.plantName}
            </Typography>
            <Typography variant="body2" color={palette.muted} fontWeight={600} noWrap title={row.subtypeName}>
              {row.subtypeName}
            </Typography>
          </Box>
        </Stack>

        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" fontWeight={700} color={palette.muted}>
              Slot open
            </Typography>
            <AvailableHighlight value={row.availablePlants} />
          </Stack>
          {(row.actualAvailable > 0 || row.shedAvailableInShed > 0) && (
            <Stack direction="row" flexWrap="wrap" gap={0.5}>
              {row.actualAvailable != null ? (
                <Chip size="small" label={`Actual ${fmt(row.actualAvailable)}`} sx={{ fontWeight: 700, bgcolor: palette.availableBg, color: palette.availableText }} />
              ) : null}
              {row.shedAvailableInShed > 0 ? (
                <Chip size="small" label={`Shed ${fmt(row.shedAvailableInShed)}`} sx={{ fontWeight: 700, bgcolor: palette.shedBg, color: palette.shedText }} />
              ) : null}
              {row.remainingToDispatch > 0 ? (
                <Chip size="small" label={`${fmt(row.remainingToDispatch)} to dispatch`} sx={{ fontWeight: 700, bgcolor: "#fff7ed", color: "#c2410c" }} />
              ) : null}
              {row.linkedBatchCount > 0 ? (
                <Chip size="small" label={`${row.linkedBatchCount} batches`} variant="outlined" sx={{ fontWeight: 600 }} />
              ) : null}
            </Stack>
          )}
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          spacing={0.75}
          sx={{
            py: 1,
            px: 1.25,
            mb: 1.5,
            borderRadius: 2,
            bgcolor: palette.pageBg,
          }}>
          <EventIcon sx={{ fontSize: 16, color: palette.muted }} />
          <Typography variant="body2" fontWeight={600} color={palette.text} sx={{ lineHeight: 1.3 }}>
            {formatSlotPeriod(row.startDay, row.endDay)}
          </Typography>
        </Stack>

        {showBook ? (
          <Button
            fullWidth
            variant="contained"
            disableElevation
            startIcon={<AddShoppingCartIcon />}
            onClick={() => onBook?.(row)}
            sx={{
              mt: "auto",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: 2,
              py: 1,
              bgcolor: accent,
              "&:hover": { bgcolor: alpha(accent, 0.88) },
            }}>
            Book order
          </Button>
        ) : null}
      </Box>
    </Box>
  )
}

function SlotCardGrid({ rows, showBook, onBook, onViewOrders }) {
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {rows.map((row) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={row.slotId}>
            <Stack spacing={1}>
              <SlotCard row={row} showBook={showBook} onBook={onBook} />
              {onViewOrders ? (
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<ListAltOutlinedIcon />}
                  onClick={() => onViewOrders(row)}
                  sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}>
                  View orders ({fmt(row.remainingToDispatch)} to dispatch)
                </Button>
              ) : null}
            </Stack>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}

function SlotTable({
  rows,
  showBook,
  onBook,
  onViewOrders,
  expandedLagwad,
  onToggleLagwad,
}) {
  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 960 }}>
        <TableHead>
          <TableRow
            sx={{
              "& th": {
                fontWeight: 700,
                fontSize: 11,
                color: palette.muted,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                bgcolor: "#fafcfa",
                borderBottom: `2px solid ${palette.border}`,
                py: 1.25,
                whiteSpace: "nowrap",
              },
            }}>
            <TableCell width={36} padding="checkbox" />
            <TableCell>Plant / Variety</TableCell>
            <TableCell>Delivery</TableCell>
            <TableCell align="right">Slot open</TableCell>
            <TableCell align="right">Booked</TableCell>
            <TableCell align="right">To dispatch</TableCell>
            <TableCell align="right" sx={{ bgcolor: alpha(palette.availableBg, 0.5) }}>
              Actual avail
            </TableCell>
            <TableCell align="right" sx={{ bgcolor: alpha(palette.shedBg, 0.5) }}>
              In shed
            </TableCell>
            <TableCell align="right">Ready</TableCell>
            <TableCell align="center">Batch</TableCell>
            {showBook || onViewOrders ? <TableCell align="center">Actions</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const accent = plantAccentFor(row.plantName)
            const isCombined = row._combined
            const lagwadOpen = expandedLagwad?.has(row.slotId)
            const hasLagwad = (row.shedLineCount || row.linkedBatchCount || row.shedAvailableInShed) > 0
            return (
              <React.Fragment key={row.slotId}>
                <TableRow
                  hover
                  sx={{
                    "&:last-child td": { borderBottom: lagwadOpen ? 0 : undefined },
                    "&:hover": { bgcolor: palette.rowHover },
                    bgcolor: isCombined
                      ? alpha(palette.availableBg, 0.35)
                      : (row.availablePlants ?? 0) < 0
                        ? alpha(palette.negativeBg, 0.5)
                        : undefined,
                  }}>
                  <TableCell padding="checkbox">
                    {!isCombined && hasLagwad ? (
                      <IconButton
                        size="small"
                        onClick={() => onToggleLagwad?.(row.slotId)}
                        sx={{
                          transform: lagwadOpen ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }}>
                        <ExpandMoreOutlinedIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    <Typography component="span" fontWeight={700} color={accent} display="block">
                      {row.plantName}
                    </Typography>
                    <Typography component="span" variant="body2" color={palette.muted} fontWeight={600}>
                      {row.subtypeName}
                      {isCombined ? ` · ${row._slotCount} slots` : ""}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13 }}>
                    {isCombined
                      ? row._rangeLabel || formatSlotPeriod(row.startDay, row.endDay)
                      : formatSlotPeriod(row.startDay, row.endDay)}
                  </TableCell>
                  <TableCell align="right">
                    <AvailableHighlight value={row.availablePlants} />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13 }}>
                    {fmt(row.totalBookedPlants ?? row.bookedPlants)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: 13, color: row.remainingToDispatch > 0 ? "#c2410c" : palette.muted }}>
                    {fmt(row.remainingToDispatch)}
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: alpha(palette.availableBg, 0.45) }}>
                    <Typography fontWeight={800} fontSize={13} color={palette.availableText}>
                      {fmt(row.actualAvailable)}
                    </Typography>
                    <Typography variant="caption" color={palette.muted}>
                      act {fmt(row.actualPlants)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ bgcolor: alpha(palette.shedBg, 0.45), fontWeight: 800, fontSize: 13, color: palette.shedText }}>
                    {fmt(row.shedAvailableInShed)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: 13, color: palette.readyText }}>
                    {fmt(row.actualReadyPlants)}
                  </TableCell>
                  <TableCell align="center">
                    {row.linkedBatchCount > 0 ? (
                      <Chip size="small" label={row.linkedBatchCount} sx={{ fontWeight: 800, minWidth: 32 }} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  {showBook || onViewOrders ? (
                    <TableCell align="center" padding="checkbox">
                      <Stack direction="row" spacing={0.5} justifyContent="center" flexWrap="wrap">
                        {onViewOrders && !isCombined ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ListAltOutlinedIcon sx={{ fontSize: 14 }} />}
                            onClick={() => onViewOrders(row)}
                            sx={{ textTransform: "none", fontWeight: 600, fontSize: 11, borderRadius: 2 }}>
                            Orders
                          </Button>
                        ) : null}
                        {showBook && !isCombined ? (
                          <Button
                            size="small"
                            variant="contained"
                            disableElevation
                            startIcon={<AddShoppingCartIcon sx={{ fontSize: 16 }} />}
                            onClick={() => onBook?.(row)}
                            sx={{
                              textTransform: "none",
                              fontWeight: 600,
                              fontSize: 11,
                              borderRadius: 2,
                              bgcolor: palette.accent,
                              boxShadow: "none",
                              "&:hover": { bgcolor: palette.accentHover, boxShadow: "none" },
                            }}>
                            Book
                          </Button>
                        ) : null}
                      </Stack>
                    </TableCell>
                  ) : null}
                </TableRow>
                {!isCombined ? (
                  <TableRow>
                    <TableCell colSpan={showBook || onViewOrders ? 11 : 10} sx={{ p: 0, border: 0 }}>
                      <StockLagwadBreakdown slotId={row.slotId} open={lagwadOpen} />
                    </TableCell>
                  </TableRow>
                ) : null}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function MonthsCombinedSection({ rows, monthLabel, plantName }) {
  const combined = useMemo(
    () => combineSlotsBySubtype(rows, null, null, monthLabel),
    [rows, monthLabel]
  )
  const totalAvail = combined.reduce((s, r) => s + (r.availablePlants || 0), 0)

  if (!combined.length) return null

  return (
    <Box
      sx={{
        mb: 2,
        borderRadius: 2.5,
        overflow: "hidden",
        border: `2px solid ${palette.availableBorder}`,
        bgcolor: palette.card,
      }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: palette.availableBg,
          borderBottom: `1px solid ${palette.availableBorder}`,
        }}>
        <Typography variant="subtitle2" fontWeight={800} color={palette.availableText}>
          Combined · {monthLabel}
        </Typography>
        <Typography variant="body2" color={palette.muted} sx={{ mt: 0.25 }}>
          {plantName} · {fmt(rows.length)} slots ·{" "}
          <Box component="span" sx={{ fontWeight: 800, color: palette.availableText }}>
            {fmt(totalAvail)} plants total
          </Box>
        </Typography>
      </Box>
      <SlotTable rows={combined} showBook={false} />
    </Box>
  )
}

function MonthSections({
  sections,
  expanded,
  onAccordion,
  viewMode,
  showBookAction,
  onBookSlot,
  onViewOrders,
  expandedLagwad,
  onToggleLagwad,
  expandAll,
  collapseAll,
}) {
  const tableProps = {
    showBook: showBookAction,
    onBook: onBookSlot,
    onViewOrders,
    expandedLagwad,
    onToggleLagwad,
  }
  const SectionBody = viewMode === "cards" ? SlotCardGrid : SlotTable

  return (
    <Stack spacing={1.5}>
      {sections.length > 1 && (
        <Stack direction="row" spacing={1} sx={{ px: 0.5 }}>
          <Button size="small" onClick={expandAll} sx={{ textTransform: "none", fontWeight: 600 }}>
            Expand all
          </Button>
          <Button size="small" onClick={collapseAll} sx={{ textTransform: "none", fontWeight: 600 }}>
            Collapse all
          </Button>
        </Stack>
      )}
      {sections.map((section) => {
        const isExpanded = expanded.includes(section.id)
        return (
          <Accordion
            key={section.id}
            expanded={isExpanded}
            onChange={onAccordion(section.id)}
            disableGutters
            elevation={0}
            sx={{
              bgcolor: palette.card,
              border: `1px solid ${palette.border}`,
              borderRadius: "12px !important",
              overflow: "hidden",
              "&:before": { display: "none" },
            }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: palette.accent }} />}
              sx={{
                px: 2,
                minHeight: 52,
                bgcolor: isExpanded ? palette.accentLight : "transparent",
                "& .MuiAccordionSummary-content": { my: 1 },
              }}>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Typography fontWeight={800} fontSize={15} color={palette.text}>
                  {section.title}
                </Typography>
                <Chip size="small" label={`${section.slotCount} slots`} sx={{ fontWeight: 600 }} />
                <Chip
                  size="small"
                  label={`${fmt(section.monthAvail)} available`}
                  sx={{
                    fontWeight: 800,
                    bgcolor: palette.availableBg,
                    color: palette.availableText,
                    border: `1px solid ${palette.availableBorder}`,
                  }}
                />
              </Stack>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0, borderTop: `1px solid ${palette.border}` }}>
              <SectionBody rows={section.rows} {...tableProps} />
            </AccordionDetails>
          </Accordion>
        )
      })}
    </Stack>
  )
}

export default function AvailableStockView({
  onBookSlot,
  onViewOrders,
  variant = "dashboard",
  refreshKey = 0,
  showBookAction = true,
}) {
  const isMis = variant === "mis"
  const [search, setSearch] = useState("")
  const [selectedPlantId, setSelectedPlantId] = useState("")
  const [subtypeFilter, setSubtypeFilter] = useState("")
  const [sortBy, setSortBy] = useState("date-asc")
  const [viewMode, setViewMode] = useState("table")
  const [viewYear, setViewYear] = useState(() => getNextThreeCalendarMonths()[0]?.year || 2026)
  const [selectedMonthKeys, setSelectedMonthKeys] = useState(() =>
    getNextThreeCalendarMonths().map((m) => m.key)
  )
  const [expanded, setExpanded] = useState([])
  const [plants, setPlants] = useState([])
  const [loadingPlants, setLoadingPlants] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rows, setRows] = useState([])
  const [summary, setSummary] = useState(null)
  const [expandedLagwad, setExpandedLagwad] = useState(() => new Set())

  const debouncedSearch = useDebounce(search, 300)

  const selectedPlant = useMemo(
    () => plants.find((p) => p.id === selectedPlantId),
    [plants, selectedPlantId]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadingPlants(true)
      try {
        const instance = NetworkManager(API.slots.GET_PLANTS)
        const response = await instance.request()
        if (cancelled) return
        const list = (response?.data ?? [])
          .map((p) => ({ id: String(p.plantId), name: p.name || "Unknown" }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setPlants(list)
      } catch (err) {
        console.error("Load plants:", err)
        if (!cancelled) setPlants([])
      } finally {
        if (!cancelled) setLoadingPlants(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const allMonthsForYear = useMemo(() => getAllMonthsForYear(viewYear), [viewYear])

  const defaultMonthKeys = useMemo(() => getNextThreeCalendarMonths().map((m) => m.key), [])

  const yearsToFetch = useMemo(() => {
    const keys = selectedMonthKeys.length ? selectedMonthKeys : defaultMonthKeys
    const years = keys.map((k) => Number(k.slice(k.lastIndexOf("-") + 1)))
    const set = new Set([viewYear, ...years.filter(Number.isFinite)])
    return [...set]
  }, [selectedMonthKeys, defaultMonthKeys, viewYear])

  const monthCounts = useMemo(() => {
    const map = {}
    for (const row of rows) {
      const d = parseSlotDate(row.startDay)
      const monthName = row.month || (d ? MONTH_OPTIONS[d.month()] : null)
      const y = d?.year() ?? viewYear
      if (!monthName) continue
      const key = monthYearKey(monthName, y)
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [rows, viewYear])

  const displayYear = yearsToFetch[0] || new Date().getFullYear()

  const fetchOverview = useCallback(async () => {
    if (!selectedPlantId) return
    setLoading(true)
    setError(null)
    try {
      const instance = NetworkManager(API.slots.GET_AVAILABILITY_OVERVIEW)
      const allRows = []

      for (const y of yearsToFetch) {
        const params = {
          year: String(y),
          plantId: selectedPlantId,
        }
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim()

        const response = await instance.request({}, params)
        const data = response?.data?.data ?? response?.data
        allRows.push(...(data?.rows ?? []))
      }

      const seen = new Set()
      const merged = allRows.filter((r) => {
        const id = r.slotId || `${r.plantId}-${r.subtypeId}-${r.startDay}`
        if (seen.has(id)) return false
        seen.add(id)
        return true
      })
      setRows(merged)
      setSummary(null)
      if (merged.length > 0) {
        setSummary({
          available: merged.reduce((s, r) => s + (r.availablePlants || 0), 0),
          actualAvailable: merged.reduce((s, r) => s + (r.actualAvailable || 0), 0),
          shedAvailableInShed: merged.reduce((s, r) => s + (r.shedAvailableInShed || 0), 0),
          actualReadyPlants: merged.reduce((s, r) => s + (r.actualReadyPlants || 0), 0),
          remainingToDispatch: merged.reduce((s, r) => s + (r.remainingToDispatch || 0), 0),
          linkedBatchCount: merged.reduce((s, r) => s + (r.linkedBatchCount || 0), 0),
        })
      }
    } catch (err) {
      console.error("Availability overview:", err)
      setError("Could not load slots. Please try again.")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, selectedPlantId, yearsToFetch])

  useEffect(() => {
    if (!selectedPlantId) {
      setRows([])
      setError(null)
      setLoading(false)
      return
    }
    fetchOverview()
  }, [fetchOverview, refreshKey, selectedPlantId])

  const filterOptions = useMemo(() => extractStockFilterOptions(rows), [rows])

  const subtypeFilteredRows = useMemo(() => {
    if (!subtypeFilter) return rows
    if (subtypeFilter.includes(":")) {
      const [, sid] = subtypeFilter.split(":")
      return filterStockRows(rows, { subtypeId: sid })
    }
    return filterStockRows(rows, { subtypeId: subtypeFilter })
  }, [rows, subtypeFilter])

  const monthKeysActive = selectedMonthKeys.length > 0

  const filteredRows = useMemo(() => {
    if (!monthKeysActive) return subtypeFilteredRows
    return filterRowsByMonthKeys(subtypeFilteredRows, selectedMonthKeys)
  }, [subtypeFilteredRows, selectedMonthKeys, monthKeysActive])

  const monthLabel = useMemo(() => formatMonthKeysLabel(selectedMonthKeys), [selectedMonthKeys])

  const sortedRows = useMemo(() => sortStockRowsBy(filteredRows, sortBy), [filteredRows, sortBy])

  const sections = useMemo(
    () => groupRowsIntoMonthSections(sortedRows, displayYear),
    [sortedRows, displayYear]
  )

  useEffect(() => {
    if (!sections.length) {
      setExpanded([])
      return
    }
    setExpanded((prev) => {
      const valid = prev.filter((id) => sections.some((s) => s.id === id))
      return valid.length ? valid : [sections[0].id]
    })
  }, [sections])

  const handleAccordion = (id) => (_, isOpen) => {
    setExpanded((prev) => (isOpen ? [...prev, id] : prev.filter((x) => x !== id)))
  }

  const expandAll = () => setExpanded(sections.map((s) => s.id))
  const collapseAll = () => setExpanded([])

  const toggleLagwad = useCallback((slotId) => {
    setExpandedLagwad((prev) => {
      const next = new Set(prev)
      if (next.has(slotId)) next.delete(slotId)
      else next.add(slotId)
      return next
    })
  }, [])

  const applyDefaultMonths = () => {
    const defaults = getNextThreeCalendarMonths()
    setSelectedMonthKeys(defaults.map((m) => m.key))
    if (defaults[0]) setViewYear(defaults[0].year)
  }

  const toggleMonthKey = (key) => {
    setSelectedMonthKeys((prev) => {
      if (prev.includes(key)) {
        if (prev.length <= 1) return prev
        return prev.filter((k) => k !== key)
      }
      return [...prev, key]
    })
    setExpanded([])
  }

  const selectPlant = (plantId) => {
    setSelectedPlantId(plantId)
    setSubtypeFilter("")
    setSearch("")
    setExpanded([])
    setRows([])
    applyDefaultMonths()
  }

  const clearLocalFilters = () => {
    setSubtypeFilter("")
    setSearch("")
    applyDefaultMonths()
  }

  const totalSlots = filteredRows.length
  const totalPlants = filteredRows.reduce((s, r) => s + (r.availablePlants || 0), 0)
  const hasLocalFilters = Boolean(subtypeFilter || search.trim())

  const selectSx = {
    borderRadius: 2,
    bgcolor: palette.pageBg,
    "& .MuiOutlinedInput-notchedOutline": { borderColor: palette.border },
  }

  return (
    <Box
      data-tour={isMis ? "mis-stock-wrap" : undefined}
      sx={{ bgcolor: palette.pageBg, borderRadius: 3, p: { xs: 1.5, sm: 2.5 }, minHeight: isMis ? 480 : 520 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "flex-start" }}
        spacing={2}
        sx={{ mb: 2 }}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: palette.accentLight,
                display: "grid",
                placeItems: "center",
              }}>
              <CalendarMonthOutlinedIcon sx={{ color: palette.accent }} />
            </Box>
            <Typography variant="h5" fontWeight={800} color={palette.text}>
              Stock & lagwad
            </Typography>
          </Stack>
          <Typography variant="body2" color={palette.muted} sx={{ mt: 0.5, pl: 6 }}>
            {selectedPlant
              ? `${selectedPlant.name} · slot open, actual available, shed-wise batch lagwad · ${monthLabel || "pick months"}`
              : "Choose a plant — slot booking capacity plus shed lagwad & batch breakdown"}
          </Typography>
        </Box>
        {selectedPlantId && !loading && !error && totalSlots > 0 && (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={`${fmt(totalSlots)} slots`} sx={{ fontWeight: 700 }} />
            <Chip
              label={`${fmt(totalPlants)} available`}
              sx={{
                fontWeight: 800,
                bgcolor: palette.availableBg,
                color: palette.availableText,
                border: `2px solid ${palette.availableBorder}`,
              }}
            />
          </Stack>
        )}
      </Stack>

      {/* Step 1 — Plant chips (required) */}
      <Box
        sx={{
          bgcolor: palette.card,
          borderRadius: 2.5,
          border: `2px solid ${selectedPlantId ? alpha(palette.accent, 0.35) : palette.border}`,
          p: 2.5,
          mb: 2,
        }}>
        <Typography variant="subtitle2" fontWeight={800} color={palette.text} sx={{ mb: 0.5 }}>
          1. Select plant
        </Typography>
        <Typography variant="body2" color={palette.muted} sx={{ mb: 2 }}>
          Pick a crop to load open slots (Banana, Papaya, Muskmelon, …)
        </Typography>
        {loadingPlants ? (
          <Box display="flex" justifyContent="center" py={2}>
            <CircularProgress size={28} sx={{ color: palette.accent }} />
          </Box>
        ) : plants.length === 0 ? (
          <Typography color="error" variant="body2">
            Could not load plants. Refresh the page.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
            {plants.map((p) => (
              <PlantChip
                key={p.id}
                name={p.name}
                selected={selectedPlantId === p.id}
                onClick={() => selectPlant(p.id)}
              />
            ))}
          </Box>
        )}
      </Box>

      {selectedPlantId && (
        <Box
          sx={{
            bgcolor: palette.card,
            borderRadius: 2.5,
            border: `1px solid ${palette.border}`,
            p: 2,
            mb: 2,
          }}>
          <Typography variant="subtitle2" fontWeight={800} color={palette.text} sx={{ mb: 1.5 }}>
            2. Filters & view
          </Typography>
          <Stack spacing={2}>
            <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
              <Typography variant="caption" fontWeight={700} color={palette.muted}>
                Year
              </Typography>
              {YEAR_OPTIONS.map((y) => (
                <MonthPill
                  key={y}
                  label={String(y)}
                  active={viewYear === y}
                  onClick={() => {
                    setViewYear(y)
                    setExpanded([])
                  }}
                />
              ))}
            </Stack>

            <Box>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color={palette.muted}>
                  Months (3 selected by default — tap to change)
                </Typography>
                <Button size="small" onClick={applyDefaultMonths} sx={{ textTransform: "none", fontWeight: 600 }}>
                  Reset 3 months
                </Button>
              </Stack>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {allMonthsForYear.map(({ month, year: y, key }) => (
                  <MonthPill
                    key={key}
                    label={month.slice(0, 3)}
                    active={selectedMonthKeys.includes(key)}
                    count={monthCounts[key]}
                    faded={isPastCalendarMonth(month, y)}
                    onClick={() => toggleMonthKey(key)}
                  />
                ))}
              </Box>
              <Typography variant="caption" color={palette.muted} sx={{ mt: 0.75, display: "block" }}>
                All months for {viewYear}. Starts with this month + next 2 selected (e.g. May, Jun, Jul).
              </Typography>
            </Box>

            {filterOptions.subtypes.length > 0 && (
              <Box>
                <Typography variant="caption" fontWeight={700} color={palette.muted} sx={{ mb: 0.75, display: "block" }}>
                  Variety
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                  <SubtypeChip label="All varieties" active={!subtypeFilter} onClick={() => setSubtypeFilter("")} />
                  {filterOptions.subtypes.map((s) => (
                    <SubtypeChip
                      key={s.key}
                      label={s.subtypeName}
                      active={subtypeFilter === s.key}
                      onClick={() => setSubtypeFilter(subtypeFilter === s.key ? "" : s.key)}
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort by</InputLabel>
                  <Select label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)} sx={selectSx}>
                    {SORT_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <ToggleButtonGroup
                  fullWidth
                  size="small"
                  value={viewMode}
                  exclusive
                  onChange={(_, v) => v && setViewMode(v)}
                  sx={{ height: 40 }}>
                  <ToggleButton value="table" sx={{ textTransform: "none", fontWeight: 600, flex: 1 }}>
                    <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} /> Table
                  </ToggleButton>
                  <ToggleButton value="cards" sx={{ textTransform: "none", fontWeight: 600, flex: 1 }}>
                    <ViewModuleIcon fontSize="small" sx={{ mr: 0.5 }} /> Cards
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                fullWidth
                size="small"
                placeholder="Search variety or date…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, bgcolor: palette.pageBg } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: palette.muted }} />
                    </InputAdornment>
                  ),
                }}
              />
              {hasLocalFilters && (
                <Button
                  size="small"
                  onClick={clearLocalFilters}
                  sx={{ textTransform: "none", fontWeight: 600, flexShrink: 0 }}>
                  Clear
                </Button>
              )}
              <Tooltip title="Export CSV">
                <span>
                  <IconButton
                    onClick={() => downloadStockCsv(sortedRows, displayYear)}
                    disabled={!sortedRows.length}
                    sx={{ border: `1px solid ${palette.border}`, borderRadius: 2 }}>
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={fetchOverview}
                  disabled={loading}
                  sx={{ border: `1px solid ${palette.border}`, borderRadius: 2 }}>
                  {loading ? <CircularProgress size={20} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Box>
      )}

      {!selectedPlantId ? (
        <Box
          sx={{
            textAlign: "center",
            py: 8,
            bgcolor: palette.card,
            borderRadius: 2.5,
            border: `1px dashed ${palette.border}`,
          }}>
          <LocalFloristOutlinedIcon sx={{ fontSize: 56, color: palette.muted, mb: 1, opacity: 0.45 }} />
          <Typography fontWeight={700} color={palette.text}>
            Select a plant above
          </Typography>
          <Typography variant="body2" color={palette.muted} sx={{ mt: 0.5 }}>
            Slots load after you choose Banana, Papaya, Muskmelon, or another crop.
          </Typography>
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: "center", py: 8, bgcolor: palette.card, borderRadius: 2.5 }}>
          <ErrorOutlineIcon color="error" sx={{ mb: 1 }} />
          <Typography color="error" fontWeight={600}>{error}</Typography>
          <Button variant="contained" onClick={fetchOverview} sx={{ mt: 2, textTransform: "none", bgcolor: palette.accent }}>
            Retry
          </Button>
        </Box>
      ) : loading && rows.length === 0 ? (
        <Box display="flex" flexDirection="column" alignItems="center" py={12} gap={1}>
          <CircularProgress sx={{ color: palette.accent }} />
          <Typography variant="body2" color={palette.muted} fontWeight={600}>
            Loading {selectedPlant?.name} slots…
          </Typography>
        </Box>
      ) : monthKeysActive && filteredRows.length === 0 && rows.length > 0 ? (
        <Box sx={{ textAlign: "center", py: 8, bgcolor: palette.card, borderRadius: 2.5, border: `1px dashed ${palette.border}` }}>
          <Typography fontWeight={700}>No slots in selected months</Typography>
          <Typography variant="body2" color={palette.muted} sx={{ mt: 0.5 }}>
            Select another month chip or reset to the next 3 months.
          </Typography>
          <Button sx={{ mt: 2, textTransform: "none" }} onClick={applyDefaultMonths}>
            Reset months
          </Button>
        </Box>
      ) : sections.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 10, bgcolor: palette.card, borderRadius: 2.5, border: `1px dashed ${palette.border}` }}>
          <InboxOutlinedIcon sx={{ fontSize: 56, color: palette.muted, mb: 1, opacity: 0.5 }} />
          <Typography fontWeight={700}>No slots for {selectedPlant?.name}</Typography>
          <Typography variant="body2" color={palette.muted} sx={{ mt: 0.5 }}>
            Try another year, month, or variety.
          </Typography>
          {hasLocalFilters && (
            <Button sx={{ mt: 2, textTransform: "none" }} onClick={clearLocalFilters}>
              Clear filters
            </Button>
          )}
        </Box>
      ) : (
        <>
          <StockKpiStrip rows={filteredRows} summary={summary} />
          {monthKeysActive && selectedMonthKeys.length > 0 && (
            <MonthsCombinedSection
              rows={filteredRows}
              monthLabel={monthLabel}
              plantName={selectedPlant?.name}
            />
          )}
          {monthKeysActive && filteredRows.length > 0 && (
            <Typography variant="subtitle2" fontWeight={800} color={palette.text} sx={{ mb: 1 }}>
              Slots by month
            </Typography>
          )}
          {viewMode === "cards" && sections.length === 1 ? (
            <Box sx={{ bgcolor: palette.card, borderRadius: 2.5, border: `1px solid ${palette.border}`, overflow: "hidden" }}>
              <SlotCardGrid
                rows={sections[0].rows}
                showBook={showBookAction}
                onBook={onBookSlot}
                onViewOrders={onViewOrders}
              />
            </Box>
          ) : (
            <MonthSections
          sections={sections}
          expanded={expanded}
          onAccordion={handleAccordion}
          viewMode={viewMode}
          showBookAction={showBookAction}
          onBookSlot={onBookSlot}
          onViewOrders={onViewOrders}
          expandedLagwad={expandedLagwad}
          onToggleLagwad={toggleLagwad}
          expandAll={expandAll}
          collapseAll={collapseAll}
            />
          )}
        </>
      )}
    </Box>
  )
}
