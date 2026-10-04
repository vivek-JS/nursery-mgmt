import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  ButtonBase,
  Chip,
  CircularProgress,
  Collapse,
  Drawer,
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
import CloseIcon from "@mui/icons-material/Close"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import RefreshIcon from "@mui/icons-material/Refresh"
import SearchIcon from "@mui/icons-material/Search"
import WarehouseOutlinedIcon from "@mui/icons-material/WarehouseOutlined"
import { NetworkManager, API } from "network/core"
import { fmt } from "../capacitySheetUtils"

const C = {
  ink: "#0f172a",
  muted: "#64748b",
  faint: "#cbd5e1",
  line: "#e8edf3",
  sowed: "#0f766e",
  remaining: "#16a34a",
  orders: "#2563eb",
  other: "#f59e0b",
  soft: "#f0fdf4",
}

const FILTERS = [
  { value: "stock", label: "With stock" },
  { value: "ready", label: "Ready now" },
  { value: "all", label: "All (incl. finished)" },
]

const SORTS = [
  { value: "remaining", label: "Most remaining" },
  { value: "sowed", label: "Most sowed" },
  { value: "gone", label: "Most gone" },
  { value: "name", label: "Name A–Z" },
]

const n = (value) => Number(value) || 0

function formatDate(value) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
}

function batchVisible(batch, filter) {
  if (filter === "all") return true
  if (filter === "ready") return n(batch.readyRemaining) > 0
  return n(batch.remaining) > 0
}

function shedVisible(shed, filter) {
  if (filter === "all") return true
  if (filter === "ready") return n(shed.readyRemaining) > 0
  return n(shed.remaining) > 0
}

function matchesSearch(batch, q) {
  const hay = `${batch.batchNumber} ${batch.plantName} ${batch.subtypeName}`.toLowerCase()
  return hay.includes(q)
}

function Figure({ label, value, color, big = false, hint }) {
  const body = (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, color: C.muted, textTransform: "uppercase" }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: big ? 26 : 17,
          lineHeight: 1.15,
          color: n(value) ? color : C.faint,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fmt(value)}
      </Typography>
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

/** Remaining / to-orders / other-gone as a share of everything sowed. */
function StockBar({ sowed, remaining, toOrders, otherGone, height = 8 }) {
  const total = Math.max(1, n(sowed))
  const pct = (value) => `${Math.min(100, (n(value) / total) * 100)}%`
  return (
    <Box sx={{ display: "flex", height, borderRadius: 99, overflow: "hidden", bgcolor: "#eef2f6" }}>
      <Box sx={{ width: pct(remaining), bgcolor: C.remaining }} />
      <Box sx={{ width: pct(toOrders), bgcolor: C.orders }} />
      <Box sx={{ width: pct(otherGone), bgcolor: C.other }} />
    </Box>
  )
}

function BarLegend() {
  const items = [
    ["Remaining", C.remaining],
    ["Orders", C.orders],
    ["Other gone", C.other],
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

function SummaryStrip({ totals }) {
  if (!totals) return null
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(5, 1fr)" },
        gap: 1.25,
        mb: 2,
      }}
    >
      {[
        { label: "Sheds", value: totals.sheds, color: C.ink },
        { label: "Sowed", value: totals.sowed, color: C.sowed, hint: "Plants lagwad-ed into sheds (active batches)." },
        {
          label: "Remaining",
          value: totals.remaining,
          color: C.remaining,
          hint: `Still in sheds. ${fmt(totals.readyRemaining)} are ready for dispatch today.`,
        },
        { label: "Gone", value: totals.gone, color: C.other, hint: "Sowed minus remaining." },
        { label: "To orders", value: totals.toOrders, color: C.orders, hint: "Gone plants that were loaded or delivered against an order." },
      ].map((item) => (
        <Box key={item.label} sx={{ bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: 2.5, px: 2, py: 1.25 }}>
          <Figure {...item} big />
        </Box>
      ))}
    </Box>
  )
}

function ShedCard({ shed, filter, onOpen }) {
  const batchLabel = filter === "all" ? shed.batchCount : shed.activeBatchCount
  return (
    <ButtonBase
      onClick={onOpen}
      sx={{
        display: "block",
        textAlign: "left",
        width: "100%",
        bgcolor: "#fff",
        border: `1px solid ${C.line}`,
        borderRadius: 3,
        p: 2,
        boxShadow: "0 6px 20px rgba(15, 23, 42, 0.04)",
        transition: "transform .15s ease, box-shadow .15s ease, border-color .15s ease",
        "&:hover": { transform: "translateY(-2px)", borderColor: "#86efac", boxShadow: "0 12px 28px rgba(22, 163, 74, 0.12)" },
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" mb={1.5}>
        <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: C.soft, color: C.remaining, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <WarehouseOutlinedIcon fontSize="small" />
        </Box>
        <Box minWidth={0} flex={1}>
          <Typography fontWeight={900} color={C.ink} noWrap>
            {shed.shed}
          </Typography>
          <Typography variant="caption" fontWeight={700} color={C.muted}>
            {batchLabel} {filter === "all" ? "batch" : "active batch"}
            {batchLabel === 1 ? "" : "es"}
          </Typography>
        </Box>
        {n(shed.readyRemaining) > 0 ? (
          <Chip size="small" label={`${fmt(shed.readyRemaining)} ready`} sx={{ height: 22, fontWeight: 800, bgcolor: "#dcfce7", color: "#166534" }} />
        ) : null}
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={1}>
        <Figure label="Remaining" value={shed.remaining} color={C.remaining} big />
        <Stack direction="row" spacing={2}>
          <Figure label="Sowed" value={shed.sowed} color={C.sowed} />
          <Figure label="Gone" value={shed.gone} color={C.other} />
          <Figure label="Orders" value={shed.toOrders} color={C.orders} />
        </Stack>
      </Stack>

      <StockBar sowed={shed.sowed} remaining={shed.remaining} toOrders={shed.toOrders} otherGone={shed.otherGone} />
    </ButtonBase>
  )
}

function OrdersList({ orders }) {
  if (!orders.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No order has taken plants from this batch in this shed yet.
      </Typography>
    )
  }
  return (
    <Stack spacing={0.75}>
      {orders.map((order) => (
        <Stack
          key={order.orderId}
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          sx={{ bgcolor: "#fff", border: "1px solid #dbeafe", borderRadius: 1.75, px: 1.25, py: 0.9 }}
        >
          <Box minWidth={0}>
            <Typography fontWeight={800} fontSize={13} noWrap>
              {order.orderNumber ? `#${order.orderNumber}` : "Order"} · {order.farmerName || "Farmer"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDate(order.lastAt)}
              {order.farmerMobile ? ` · ${order.farmerMobile}` : ""}
            </Typography>
          </Box>
          <Typography fontWeight={900} color={C.orders} sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
            −{fmt(order.plants)}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}

function LinesList({ lines }) {
  return (
    <Stack spacing={0.75}>
      {lines.map((line) => (
        <Box key={line.inwardId} sx={{ bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: 1.75, px: 1.25, py: 0.9 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
            <Typography fontWeight={800} fontSize={13}>
              {line.size || "—"}
              {line.cavity ? ` · ${line.cavity} cavity` : ""}
            </Typography>
            <Chip
              size="small"
              label={line.ready ? "Ready" : `Ready ${formatDate(line.readyDate)}`}
              sx={{
                height: 20,
                fontSize: 11,
                fontWeight: 800,
                bgcolor: line.ready ? "#dcfce7" : "#f1f5f9",
                color: line.ready ? "#166534" : C.muted,
              }}
            />
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block">
            Lagwad {formatDate(line.lagwadDate)}
          </Typography>
          <Stack direction="row" spacing={2.5} mt={0.5}>
            <Figure label="Sowed" value={line.sowed} color={C.sowed} />
            <Figure label="Left" value={line.remaining} color={C.remaining} />
            <Figure label="Gone" value={line.gone} color={C.other} />
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}

function BatchCard({ batch, open, onToggle }) {
  const [panel, setPanel] = useState("orders")
  const finished = n(batch.remaining) === 0

  return (
    <Box
      sx={{
        borderRadius: 2.75,
        border: `1px solid ${open ? "#86efac" : C.line}`,
        bgcolor: open ? C.soft : "#fff",
        overflow: "hidden",
        opacity: finished && !open ? 0.8 : 1,
        transition: "border-color .15s ease, background-color .15s ease",
      }}
    >
      <ButtonBase onClick={onToggle} sx={{ display: "block", width: "100%", textAlign: "left", px: 1.75, py: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <ExpandMoreIcon sx={{ mt: 0.3, color: C.muted, transform: open ? "rotate(180deg)" : "none", transition: "0.2s" }} />
          <Box flex={1} minWidth={0}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography fontWeight={900} color={C.ink}>
                {batch.batchNumber || "Batch"}
              </Typography>
              {finished ? (
                <Chip size="small" label="Finished" sx={{ height: 20, fontWeight: 800, bgcolor: "#f1f5f9", color: C.muted }} />
              ) : n(batch.readyRemaining) > 0 ? (
                <Chip size="small" label={`${fmt(batch.readyRemaining)} ready`} sx={{ height: 20, fontWeight: 800, bgcolor: "#dcfce7", color: "#166534" }} />
              ) : (
                <Chip size="small" label="Not ready yet" variant="outlined" sx={{ height: 20, fontWeight: 700 }} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {[batch.plantName, batch.subtypeName].filter(Boolean).join(" · ") || "Plant"}
            </Typography>
            <Stack direction="row" spacing={2.5} mt={1} mb={1}>
              <Figure label="Sowed" value={batch.sowed} color={C.sowed} />
              <Figure label="Remaining" value={batch.remaining} color={C.remaining} />
              <Figure label="Gone" value={batch.gone} color={C.other} />
              <Figure label="Orders" value={batch.toOrders} color={C.orders} />
            </Stack>
            <StockBar sowed={batch.sowed} remaining={batch.remaining} toOrders={batch.toOrders} otherGone={batch.otherGone} height={6} />
          </Box>
        </Stack>
      </ButtonBase>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 1.75, pb: 1.75 }}>
          <Tabs
            value={panel}
            onChange={(_, value) => setPanel(value)}
            sx={{
              minHeight: 36,
              mb: 1,
              "& .MuiTab-root": { minHeight: 36, textTransform: "none", fontWeight: 800, fontSize: 13 },
              "& .MuiTabs-indicator": { bgcolor: panel === "orders" ? C.orders : C.remaining },
            }}
          >
            <Tab value="orders" label={`Orders (${batch.orders.length})`} />
            <Tab value="lines" label={`Lagwad lines (${batch.lines.length})`} />
          </Tabs>
          {panel === "orders" ? <OrdersList orders={batch.orders} /> : <LinesList lines={batch.lines} />}
          {n(batch.otherGone) > 0 && panel === "orders" ? (
            <Typography variant="caption" color={C.muted} display="block" mt={1}>
              {fmt(batch.otherGone)} more plants are gone without an order link (mortality, transfers or manual adjustments).
            </Typography>
          ) : null}
        </Box>
      </Collapse>
    </Box>
  )
}

function ShedDrawer({ shed, filter, onClose }) {
  const [openBatch, setOpenBatch] = useState("")
  const [batchSearch, setBatchSearch] = useState("")
  const shedKey = shed?.shed

  useEffect(() => {
    setOpenBatch("")
    setBatchSearch("")
  }, [shedKey])

  const batches = useMemo(() => {
    const q = batchSearch.trim().toLowerCase()
    return (shed?.batches || []).filter((batch) => batchVisible(batch, filter) && (!q || matchesSearch(batch, q)))
  }, [shed, filter, batchSearch])

  return (
    <Drawer anchor="right" open={Boolean(shed)} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, bgcolor: "#f8fafc" } }}>
      {shed ? (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ p: 2, bgcolor: "#fff", borderBottom: `1px solid ${C.line}` }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="overline" fontWeight={800} color={C.muted}>
                  Shed
                </Typography>
                <Typography variant="h6" fontWeight={900} color={C.ink} lineHeight={1.2}>
                  {shed.shed}
                </Typography>
              </Box>
              <IconButton onClick={onClose} aria-label="Close">
                <CloseIcon />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={3} my={1.5}>
              <Figure label="Sowed" value={shed.sowed} color={C.sowed} big />
              <Figure label="Remaining" value={shed.remaining} color={C.remaining} big />
              <Figure label="Gone" value={shed.gone} color={C.other} big />
              <Figure label="Orders" value={shed.toOrders} color={C.orders} big />
            </Stack>
            <StockBar sowed={shed.sowed} remaining={shed.remaining} toOrders={shed.toOrders} otherGone={shed.otherGone} height={10} />
            <Box mt={1}>
              <BarLegend />
            </Box>
          </Box>

          <Box sx={{ p: 2, pb: 1 }}>
            <TextField
              size="small"
              fullWidth
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
              sx={{ bgcolor: "#fff", borderRadius: 2 }}
            />
            <Typography variant="caption" color={C.muted} fontWeight={700} display="block" mt={0.75}>
              {batches.length} batch{batches.length === 1 ? "" : "es"} · tap a batch for orders and lagwad lines
            </Typography>
          </Box>

          <Stack spacing={1.25} sx={{ px: 2, pb: 3, overflowY: "auto", flex: 1 }}>
            {batches.map((batch) => (
              <BatchCard
                key={batch.batchId}
                batch={batch}
                open={openBatch === batch.batchId}
                onToggle={() => setOpenBatch((prev) => (prev === batch.batchId ? "" : batch.batchId))}
              />
            ))}
            {!batches.length ? <Alert severity="info">No batches match this view.</Alert> : null}
          </Stack>
        </Box>
      ) : null}
    </Drawer>
  )
}

export default function SowingShedStockTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [data, setData] = useState({ totals: null, sheds: [] })
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("stock")
  const [sortKey, setSortKey] = useState("remaining")
  const [selectedName, setSelectedName] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.sowing.GET_CAPACITY_SHED_STOCK)
      const res = await instance.request({}, {})
      if (!res?.data?.success) throw new Error(res?.data?.message || "Could not load shed stock")
      setData({ totals: res.data.totals || null, sheds: res.data.sheds || [] })
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

  const sheds = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = data.sheds.filter((shed) => {
      if (!shedVisible(shed, filter)) return false
      if (!q) return true
      if (shed.shed.toLowerCase().includes(q)) return true
      return shed.batches.some((batch) => batchVisible(batch, filter) && matchesSearch(batch, q))
    })
    const compare = {
      remaining: (a, b) => n(b.remaining) - n(a.remaining),
      sowed: (a, b) => n(b.sowed) - n(a.sowed),
      gone: (a, b) => n(b.gone) - n(a.gone),
      name: (a, b) => a.shed.localeCompare(b.shed),
    }[sortKey]
    return rows.slice().sort(compare)
  }, [data.sheds, search, filter, sortKey])

  const selected = useMemo(() => data.sheds.find((shed) => shed.shed === selectedName) || null, [data.sheds, selectedName])

  return (
    <Box>
      <SummaryStrip totals={data.totals} />

      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25} alignItems={{ lg: "center" }} justifyContent="space-between" mb={2}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_, value) => value && setFilter(value)}
          sx={{
            bgcolor: "#fff",
            "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 800, px: 1.75, color: C.muted },
            "& .Mui-selected": { bgcolor: `${C.soft} !important`, color: "#166534 !important" },
          }}
        >
          {FILTERS.map((item) => (
            <ToggleButton key={item.value} value={item.value}>
              {item.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

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
            sx={{ minWidth: 230, bgcolor: "#fff", borderRadius: 2 }}
          />
          <TextField select size="small" value={sortKey} onChange={(event) => setSortKey(event.target.value)} sx={{ minWidth: 160, bgcolor: "#fff", borderRadius: 2 }}>
            {SORTS.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={load} disabled={loading} aria-label="Refresh shed stock" sx={{ bgcolor: "#fff", border: `1px solid ${C.line}` }}>
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Stack>

      <Box mb={1.5}>
        <BarLegend />
      </Box>

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

      {!loading && !error && sheds.length === 0 ? <Alert severity="info">No sheds match this view.</Alert> : null}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", xl: "repeat(3, minmax(0, 1fr))" },
          gap: 1.5,
        }}
      >
        {!loading
          ? sheds.map((shed) => <ShedCard key={shed.shed} shed={shed} filter={filter} onOpen={() => setSelectedName(shed.shed)} />)
          : null}
      </Box>

      <ShedDrawer shed={selected} filter={filter} onClose={() => setSelectedName("")} />
    </Box>
  )
}
