import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material"
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined"
import SearchIcon from "@mui/icons-material/Search"
import RefreshIcon from "@mui/icons-material/Refresh"
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined"
import ViewDayOutlinedIcon from "@mui/icons-material/ViewDayOutlined"
import ViewWeekOutlinedIcon from "@mui/icons-material/ViewWeekOutlined"
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined"
import YardOutlinedIcon from "@mui/icons-material/YardOutlined"
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore"
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined"
import { useSearchParams } from "react-router-dom"
import { NetworkManager, API } from "network/core"
import SowingCapacityDrawer from "./components/SowingCapacityDrawer"
import SowingCapacityAsk from "./components/SowingCapacityAsk"
import SowingShedStockTab from "./components/SowingShedStockTab"
import SmartShedTab from "./components/SmartShedTab"
import CapacityBoardTable from "./components/CapacityBoardTable"
import CapacityBoardSummary from "./components/CapacityBoardSummary"
import StockOnlyTable from "./components/StockOnlyTable"
import ReadyPlantsMessageDialog from "./components/ReadyPlantsMessageDialog"
import { downloadSheetsXlsx } from "utils/exportExcel"
import { dayLabel } from "./capacitySheetUtils"
import {
  CUSTOM_GROUP,
  GROUP_OPTIONS,
  MAX_GROUP_DAYS,
  SHED_TAB,
  SMART_TAB,
  SHOW_OPTIONS,
  STOCK_ONLY_DAYS,
  boardColumns,
  exportSheet,
  filterRows,
  parseGroup,
  slotTabs,
  sortRows,
  stockBatchSheet,
} from "./capacityBoardUtils"

function tabIcon(days) {
  const sx = { fontSize: 18 }
  if (days === STOCK_ONLY_DAYS) return <Inventory2OutlinedIcon sx={sx} />
  return days === 1 ? <ViewDayOutlinedIcon sx={sx} /> : <ViewWeekOutlinedIcon sx={sx} />
}

const ASK_RANGE_DAYS = 30

function plusDays(ymd, days) {
  const [y, m, d] = String(ymd).split("-").map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

function Legend({ color, label }) {
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
      <Typography sx={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>{label}</Typography>
    </Stack>
  )
}

const selectSx = { minWidth: 170, bgcolor: "#fff", "& .MuiInputBase-input": { fontSize: 13, fontWeight: 700, py: 0.75 } }

export default function SowingCapacitySheet() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [board, setBoard] = useState({ today: "", rows: [], generatedAt: "", lookbackDays: 0, summary: null })
  const [search, setSearch] = useState("")
  const [crop, setCrop] = useState("")
  const [sort, setSort] = useState({ key: "urgent", dir: "asc" })
  const [expanded, setExpanded] = useState(() => new Set())
  const [detail, setDetail] = useState(null)
  const [messageOpen, setMessageOpen] = useState(false)

  const group = parseGroup(searchParams.get("group")) || 1
  const showParam = searchParams.get("show")
  const mode = showParam === "gap" || showParam === "excess" ? showParam : "all"
  const isPreset = GROUP_OPTIONS.some((option) => option.value === group)
  const [customOpen, setCustomOpen] = useState(!isPreset)
  const [customDays, setCustomDays] = useState(isPreset ? "" : String(group))
  const groupChoice = customOpen || !isPreset ? CUSTOM_GROUP : group

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await NetworkManager(API.sowing.GET_CAPACITY_BOARD).request({}, { group })
      if (res?.data?.success) {
        setBoard({
          today: res.data.today,
          rows: res.data.rows || [],
          generatedAt: res.data.generatedAt,
          lookbackDays: res.data.overdueLookbackDays || 0,
          summary: res.data.summary || null,
        })
      } else {
        setError(res?.data?.message || "Could not load capacity")
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load capacity")
    } finally {
      setLoading(false)
    }
  }, [group])

  useEffect(() => {
    load()
  }, [load])

  const tabs = useMemo(() => slotTabs(board.rows), [board.rows])
  const requested = searchParams.get("tab")
  let tab =
    requested === SHED_TAB || requested === SMART_TAB || tabs.some((t) => t.key === requested)
      ? requested
      : tabs[0]?.key
  if (!tab) tab = loading ? "" : SHED_TAB
  const activeTab = tabs.find((t) => t.key === tab)
  const stockOnly = activeTab?.days === STOCK_ONLY_DAYS

  const setParam = (name, value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set(name, String(value))
        return next
      },
      { replace: true }
    )
  }
  const setTab = (value) => setParam("tab", value)

  const onGroupChoice = (value) => {
    if (value === null) return
    if (value === CUSTOM_GROUP) {
      setCustomOpen(true)
      if (!customDays) setCustomDays(String(group))
      return
    }
    setCustomOpen(false)
    setParam("group", value)
  }
  const applyCustomDays = () => {
    const days = parseGroup(customDays)
    if (!days) {
      setCustomDays(String(group))
      return
    }
    setCustomDays(String(days))
    if (days !== group) setParam("group", days)
  }

  const tabRows = useMemo(
    () => (activeTab ? board.rows.filter((row) => (Number(row.slotDays) || 0) === activeTab.days) : []),
    [board.rows, activeTab]
  )
  const crops = useMemo(() => [...new Set(tabRows.map((row) => row.plantName))].sort(), [tabRows])
  const columns = useMemo(() => boardColumns(tabRows), [tabRows])
  const rows = useMemo(
    () =>
      sortRows(
        filterRows(tabRows, { search, crop, mode: stockOnly ? "" : mode }),
        sort.key === "urgent" && mode === "excess" ? { key: "total", dir: "desc", mode } : { ...sort, mode },
        columns
      ),
    [tabRows, search, crop, mode, sort, columns, stockOnly]
  )

  useEffect(() => {
    if (crop && !crops.includes(crop)) setCrop("")
  }, [crop, crops])

  const onSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === "asc" ? "desc" : "asc" }
      return { key, dir: key === "name" ? "asc" : key === "stock" || key === "total" ? "desc" : "asc" }
    })
  }

  const onToggle = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const allOpen = rows.length > 0 && rows.every((row) => expanded.has(`${row.plantId}-${row.subtypeId}`))
  const toggleAll = () => {
    setExpanded(allOpen ? new Set() : new Set(rows.map((row) => `${row.plantId}-${row.subtypeId}`)))
  }

  const onExport = () => {
    const sheets = tabs.map((t) => {
      const list = board.rows.filter((row) => (Number(row.slotDays) || 0) === t.days)
      if (t.days === STOCK_ONLY_DAYS) return stockBatchSheet(list, t.label)
      return exportSheet(sortRows(list, { key: "urgent" }, []), boardColumns(list), t.label)
    })
    downloadSheetsXlsx(`sowing-capacity-${board.today}`, sheets, { stamp: false })
  }

  const updatedAt = board.generatedAt
    ? new Date(board.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })
    : ""

  return (
    <Box sx={{ bgcolor: "#f6f8fb", minHeight: "100%", p: { xs: 1.5, md: 2.5 } }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        justifyContent="space-between"
        alignItems={{ lg: "center" }}
        spacing={1.5}
        mb={1.5}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="h5" fontWeight={800} color="#0f172a">
            Sowing & Booking Capacity
          </Typography>
          <Chip label="Live" size="small" sx={{ bgcolor: "#dcfce7", color: "#166534", fontWeight: 800, height: 22 }} />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ display: { xs: "none", xl: "block" }, borderLeft: "1px solid #e2e8f0", pl: 1.5 }}
          >
            Variety-wise stock, overdue and urgent slots, and slot-wise ready plants.
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder="Search crop or variety"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 230, bgcolor: "#fff" }}
          />
          {board.today ? (
            <Chip
              icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />}
              label={`Today: ${dayLabel(board.today)}`}
              sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", fontWeight: 700, color: "#334155" }}
            />
          ) : null}
          <Tooltip title={updatedAt ? `Updated ${updatedAt}` : "Refresh"}>
            <span>
              <IconButton onClick={load} disabled={loading} sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0" }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<WhatsAppIcon />}
            onClick={() => setMessageOpen(true)}
            disabled={!board.rows.length}
            sx={{ textTransform: "none", fontWeight: 800, bgcolor: "#25d366", "&:hover": { bgcolor: "#1ebe5a" } }}
          >
            Ready plants message
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadOutlinedIcon />}
            onClick={onExport}
            disabled={!board.rows.length}
            sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#fff", borderColor: "#e2e8f0", color: "#334155" }}
          >
            Export
          </Button>
          {board.today ? <SowingCapacityAsk from={board.today} to={plusDays(board.today, ASK_RANGE_DAYS)} /> : null}
        </Stack>
      </Stack>

      <Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2.5, mb: 1.5, px: 1 }}>
        <Tabs
          value={tab || false}
          onChange={(_, value) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 46,
            "& .MuiTab-root": { textTransform: "none", fontWeight: 800, minHeight: 46, color: "#64748b" },
            "& .Mui-selected": { color: "#0f172a" },
            "& .MuiTabs-indicator": { bgcolor: "#16a34a", height: 3, borderRadius: 2 },
          }}
        >
          {tabs.map((t) => (
            <Tab
              key={t.key}
              value={t.key}
              icon={tabIcon(t.days)}
              iconPosition="start"
              label={`${t.label} (${t.count})`}
            />
          ))}
          <Tab value={SHED_TAB} icon={<WarehouseOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Shed-wise stock" />
          <Tab value={SMART_TAB} icon={<YardOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Smart shed" />
        </Tabs>
      </Box>

      {tab === SHED_TAB ? <SowingShedStockTab /> : null}
      {tab === SMART_TAB ? <SmartShedTab /> : null}

      {tab !== SHED_TAB && tab !== SMART_TAB && !stockOnly && board.summary ? (
        <CapacityBoardSummary
          summary={board.summary}
          onOpen={(slotIds, focus) => setDetail({ slotIds, focus })}
        />
      ) : null}

      {tab !== SHED_TAB && tab !== SMART_TAB ? (
        <Box sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 3, overflow: "hidden", boxShadow: "0 8px 24px rgba(15,23,42,0.04)" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ md: "center" }}
            spacing={1}
            sx={{ px: 2, py: 1.25, bgcolor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <TextField select size="small" value={crop} onChange={(event) => setCrop(event.target.value)} sx={selectSx}>
                <MenuItem value="">All crops ({tabRows.length} varieties)</MenuItem>
                {crops.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
              {stockOnly ? null : (
                <>
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={groupChoice}
                    onChange={(_, value) => onGroupChoice(value)}
                    sx={{
                      bgcolor: "#fff",
                      "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700, fontSize: 12.5, px: 1.5, py: 0.6, color: "#475569" },
                      "& .Mui-selected": { bgcolor: "#0f172a !important", color: "#fff !important" },
                    }}
                  >
                    {GROUP_OPTIONS.map((option) => (
                      <ToggleButton key={option.value} value={option.value}>
                        {option.label}
                      </ToggleButton>
                    ))}
                    <ToggleButton value={CUSTOM_GROUP}>Custom</ToggleButton>
                  </ToggleButtonGroup>
                  {groupChoice === CUSTOM_GROUP ? (
                    <TextField
                      size="small"
                      type="number"
                      autoFocus={customOpen}
                      value={customDays}
                      onChange={(event) => setCustomDays(event.target.value)}
                      onBlur={applyCustomDays}
                      onKeyDown={(event) => event.key === "Enter" && applyCustomDays()}
                      inputProps={{ min: 1, max: MAX_GROUP_DAYS, "aria-label": "Custom days" }}
                      InputProps={{ endAdornment: <InputAdornment position="end">days</InputAdornment> }}
                      sx={{ width: 110, bgcolor: "#fff", "& .MuiInputBase-input": { fontSize: 13, fontWeight: 700, py: 0.75 } }}
                    />
                  ) : null}
                  <ToggleButtonGroup
                    exclusive
                    size="small"
                    value={mode}
                    onChange={(_, value) => value && setParam("show", value)}
                    sx={{
                      bgcolor: "#fff",
                      "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 800, fontSize: 12.5, px: 1.5, py: 0.6, color: "#475569" },
                    }}
                  >
                    {SHOW_OPTIONS.map((option) => (
                      <ToggleButton
                        key={option.value}
                        value={option.value}
                        sx={{
                          "&.Mui-selected, &.Mui-selected:hover": {
                            bgcolor:
                              option.value === "gap" ? "#be123c" : option.value === "all" ? "#0f172a" : "#047857",
                            color: "#fff",
                          },
                        }}
                      >
                        {option.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={allOpen ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
                    onClick={toggleAll}
                    disabled={!rows.length}
                    sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#fff", borderColor: "#e2e8f0", color: "#334155" }}
                  >
                    {allOpen ? "Collapse sheds" : "Expand sheds"}
                  </Button>
                </>
              )}
            </Stack>
            {stockOnly ? (
              <Typography sx={{ fontSize: 11.5, color: "#475569", fontWeight: 700 }}>
                Crops with no sowing slots (e.g. banana) — shed stock batch-wise
              </Typography>
            ) : (
              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
                <Typography sx={{ fontSize: 11.5, color: "#475569", fontWeight: 700 }}>
                  {mode === "gap"
                    ? "Only dates where bookings are not sown"
                    : mode === "excess"
                      ? "Only dates with free plants to sell (after 10% mortality)"
                      : "Next 30 days · free after 10% mortality, and not sown"}
                </Typography>
                <Legend color="#f59e0b" label="Now + overdue" />
                {mode !== "gap" ? <Legend color="#10b981" label="Free (after 10% mortality)" /> : null}
                {mode !== "excess" ? <Legend color="#f43f5e" label="Not sown" /> : null}
                <Legend color="#f97316" label="Sow-by date already passed" />
              </Stack>
            )}
          </Stack>

          {error ? (
            <Alert severity="error" sx={{ m: 1.5 }}>
              {error}
            </Alert>
          ) : null}

          {loading ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress size={28} />
            </Box>
          ) : rows.length === 0 ? (
            <Alert severity="info" sx={{ m: 1.5 }}>
              {stockOnly
                ? "No shed stock for this filter."
                : mode === "gap"
                  ? "Nothing is unsown — every booking is covered."
                  : mode === "excess"
                    ? "No free plants to sell for this filter."
                    : "No sowing or booking numbers for this filter."}
            </Alert>
          ) : stockOnly ? (
            <StockOnlyTable rows={rows} />
          ) : (
            <CapacityBoardTable
              rows={rows}
              mode={mode}
              sort={sort}
              onSort={onSort}
              expanded={expanded}
              onToggle={onToggle}
              onOpen={(slotIds, focus) => setDetail({ slotIds, focus })}
            />
          )}

          <Stack direction="row" justifyContent="space-between" sx={{ px: 2, py: 1, borderTop: "1px solid #e2e8f0" }}>
            <Typography variant="caption" color="text.secondary">
              Showing {rows.length} of {tabRows.length} varieties
              {board.lookbackDays && !stockOnly ? ` · overdue looks back ${board.lookbackDays} days` : ""}
            </Typography>
            {updatedAt ? (
              <Typography variant="caption" color="text.secondary">
                Updated {updatedAt}
              </Typography>
            ) : null}
          </Stack>
        </Box>
      ) : null}

      <SowingCapacityDrawer detail={detail} onClose={() => setDetail(null)} />
      <ReadyPlantsMessageDialog
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        rows={board.rows}
        today={board.today}
      />
    </Box>
  )
}
