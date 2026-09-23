import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import { Link as RouterLink } from "react-router-dom"
import { NetworkManager, API } from "network/core"
import SowingCapacityDrawer from "./components/SowingCapacityDrawer"
import { fmt, rangeForPreset, STATUS_STYLE, ymd } from "./capacitySheetUtils"

const PRESETS = [
  { id: "today", label: "Today" },
  { id: "7", label: "Next 7 days" },
  { id: "14", label: "Next 14 days" },
  { id: "month", label: "This month" },
]

function StatusChip({ status }) {
  const meta = STATUS_STYLE[status] || STATUS_STYLE.fulfilled
  return (
    <Chip
      size="small"
      label={meta.label}
      sx={{ fontWeight: 800, bgcolor: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
    />
  )
}

function NumButton({ value, color, onClick }) {
  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{ minWidth: 0, fontWeight: 800, color: color || "inherit", textTransform: "none" }}
    >
      {fmt(value)}
    </Button>
  )
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return plants
    return plants
      .map((plant) => ({
        ...plant,
        subtypes: (plant.subtypes || []).filter(
          (st) =>
            plant.plantName.toLowerCase().includes(q) ||
            String(st.subtypeName || "").toLowerCase().includes(q)
        ),
      }))
      .filter((plant) => plant.subtypes.length)
  }, [plants, search])

  return (
    <Box p={3} sx={{ bgcolor: "#f8fafc", minHeight: "100vh" }}>
      <Typography variant="h4" fontWeight={800} color="#0f172a">
        Sowing & booking capacity
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Sowing-allowed plants. Numbers are live booked, sowed, gap, excess, and remaining bookable capacity.
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
        {PRESETS.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            clickable
            color={!custom && preset === item.id ? "success" : "default"}
            onClick={() => applyPreset(item.id)}
            sx={{ fontWeight: 700 }}
          />
        ))}
        <Chip
          label="Custom range"
          clickable
          color={custom ? "success" : "default"}
          onClick={() => setCustom(true)}
          sx={{ fontWeight: 700 }}
        />
      </Stack>

      {custom ? (
        <Stack direction="row" spacing={1} mb={2} alignItems="center">
          <TextField size="small" type="date" label="From" value={from} onChange={(e) => setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="To" value={to} onChange={(e) => setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        </Stack>
      ) : (
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          {from} → {to}
        </Typography>
      )}

      {totals ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
          <Chip label={`Booked ${fmt(totals.booked)}`} />
          <Chip label={`Sowed ${fmt(totals.sowed)}`} />
          <Chip label={`Gap ${fmt(totals.gap)}`} sx={{ bgcolor: "#fff7ed", color: "#c2410c", fontWeight: 800 }} />
          <Chip label={`Excess ${fmt(totals.excess)}`} sx={{ bgcolor: "#ecfdf5", color: "#047857", fontWeight: 800 }} />
          <Chip label={`Can book ${fmt(totals.canBook)}`} sx={{ fontWeight: 800 }} />
        </Stack>
      ) : null}

      <TextField
        size="small"
        placeholder="Search plant or subtype"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2, maxWidth: 360 }}
      />

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <Alert severity="info">No sowing-allowed slots in this range.</Alert>
      ) : null}

      <Stack spacing={1.5}>
        {filtered.map((plant) => (
          <Box key={plant.plantId} sx={{ bgcolor: "#fff", border: "1px solid #e2e8f0", borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ px: 2, py: 1.25, bgcolor: "#f0fdf4" }}>
              <Typography fontWeight={800}>{plant.plantName}</Typography>
              <Typography variant="caption" color="text.secondary">
                Booked {fmt(plant.booked)} · sowed {fmt(plant.sowed)} · gap {fmt(plant.gap)} · excess {fmt(plant.excess)} · can book {fmt(plant.canBook)}
              </Typography>
            </Box>
            {(plant.subtypes || []).map((subtype) => {
              const key = `${plant.plantId}-${subtype.subtypeId}`
              const open = openSubtype === key
              return (
                <Box key={key} sx={{ borderTop: "1px solid #e2e8f0" }}>
                  <Box display="flex" alignItems="center" gap={1} px={1.5} py={1}>
                    <IconButton size="small" onClick={() => setOpenSubtype(open ? "" : key)} aria-label="Show slots">
                      <ExpandMoreIcon sx={{ transform: open ? "rotate(180deg)" : "none" }} />
                    </IconButton>
                    <Box flex={1} minWidth={140}>
                      <Typography
                        component={RouterLink}
                        to={`/u/sowing-capacity/${plant.plantId}/${subtype.subtypeId}?from=${from}&to=${to}`}
                        fontWeight={800}
                        color="#0f766e"
                        sx={{ textDecoration: "none" }}
                      >
                        {subtype.subtypeName}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        {subtype.seedPlanLabel} · {subtype.deliveryFrom} → {subtype.deliveryTo}
                      </Typography>
                    </Box>
                    <NumButton value={subtype.booked} onClick={() => subtype.slots[0] && setSlotId(subtype.slots[0].slotId)} />
                    <NumButton value={subtype.sowed} onClick={() => subtype.slots[0] && setSlotId(subtype.slots[0].slotId)} />
                    <NumButton value={subtype.gap} color="#c2410c" onClick={() => subtype.slots[0] && setSlotId(subtype.slots[0].slotId)} />
                    <NumButton value={subtype.excess} color="#047857" onClick={() => subtype.slots[0] && setSlotId(subtype.slots[0].slotId)} />
                    <NumButton value={subtype.canBook} onClick={() => subtype.slots[0] && setSlotId(subtype.slots[0].slotId)} />
                    <StatusChip status={subtype.status} />
                  </Box>
                  <Collapse in={open}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Delivery</TableCell>
                          <TableCell>Seed</TableCell>
                          <TableCell align="right">Booked</TableCell>
                          <TableCell align="right">Sowed</TableCell>
                          <TableCell align="right">Gap</TableCell>
                          <TableCell align="right">Excess</TableCell>
                          <TableCell align="right">Can book</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {subtype.slots.map((slot) => (
                          <TableRow key={slot.slotId} hover>
                            <TableCell>{slot.startDay === slot.endDay ? slot.startDay : `${slot.startDay} → ${slot.endDay}`}</TableCell>
                            <TableCell>{slot.seedPlanLabel}</TableCell>
                            <TableCell align="right"><NumButton value={slot.booked} onClick={() => setSlotId(slot.slotId)} /></TableCell>
                            <TableCell align="right"><NumButton value={slot.sowed} onClick={() => setSlotId(slot.slotId)} /></TableCell>
                            <TableCell align="right"><NumButton value={slot.gap} color="#c2410c" onClick={() => setSlotId(slot.slotId)} /></TableCell>
                            <TableCell align="right"><NumButton value={slot.excess} color="#047857" onClick={() => setSlotId(slot.slotId)} /></TableCell>
                            <TableCell align="right"><NumButton value={slot.canBook} onClick={() => setSlotId(slot.slotId)} /></TableCell>
                            <TableCell><StatusChip status={slot.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Collapse>
                </Box>
              )
            })}
          </Box>
        ))}
      </Stack>

      <SowingCapacityDrawer slotId={slotId} onClose={() => setSlotId(null)} />
    </Box>
  )
}
