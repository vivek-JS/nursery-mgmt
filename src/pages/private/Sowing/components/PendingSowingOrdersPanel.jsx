import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import RefreshIcon from "@mui/icons-material/Refresh"
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate"
import GrassIcon from "@mui/icons-material/Grass"
import { NetworkManager, API } from "network/core"
import { useIsSuperAdmin, useIsOfficeAdmin } from "utils/roleUtils"
import { fmtNum, todayYmd } from "../admin-direct-sow/directSowUtils"
import PendingOrderSowDialog from "./PendingOrderSowDialog"
import PendingSubtypeSowSection from "./PendingSubtypeSowSection"

function fmtDay(d) {
  if (!d) return "—"
  const s = String(d)
  const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) {
    const dt = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  }
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return "—"
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function seedLabel(o) {
  const src = String(o.seedSource || "COMPANY").toUpperCase()
  if (src === "MIXED") return "Mixed"
  if (src === "RAISING") return "Raising"
  return "Company"
}

function groupByPlant(groups = []) {
  const map = new Map()
  for (const g of groups) {
    if ((Number(g.orderCount) || 0) <= 0) continue
    const key = String(g.plantId)
    if (!map.has(key)) {
      map.set(key, {
        plantId: g.plantId,
        plantName: g.plantName,
        subtypes: [],
        orderCount: 0,
        totalPlants: 0,
      })
    }
    const row = map.get(key)
    row.subtypes.push(g)
    row.orderCount += Number(g.orderCount) || 0
    row.totalPlants += Number(g.totalPlants) || 0
  }
  return [...map.values()]
    .map((p) => ({
      ...p,
      subtypes: [...p.subtypes].sort((a, b) =>
        String(a.subtypeName || "").localeCompare(String(b.subtypeName || ""))
      ),
    }))
    .sort((a, b) => String(a.plantName || "").localeCompare(String(b.plantName || "")))
}

function SubtypeBlock({ group, canEdit, onSowOrder, onSowed }) {
  const [open, setOpen] = useState(false)
  const orders = group.orders || []

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: open ? "#fcd34d" : "#e2e8f0",
        overflow: "hidden",
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 1.5,
          py: 1,
          cursor: "pointer",
          bgcolor: open ? "#fffbeb" : "#fafafa",
        }}
      >
        <Typography fontWeight={800} flex={1} noWrap>
          {group.subtypeName}
        </Typography>
        <Chip size="small" label={`${group.orderCount} orders`} sx={{ height: 22, fontWeight: 700 }} />
        <Chip
          size="small"
          label={`${fmtNum(group.totalPlants)} plants`}
          sx={{ height: 22, fontWeight: 800, bgcolor: "#ffedd5", color: "#9a3412" }}
        />
        <Chip
          size="small"
          variant="outlined"
          label={`+${group.plantReadyDays || 0}d ready`}
          sx={{ height: 22, fontWeight: 700 }}
        />
        {canEdit && open ? (
          <Chip
            size="small"
            icon={<GrassIcon sx={{ fontSize: "14px !important" }} />}
            label="Sow below"
            sx={{ height: 22, fontWeight: 700, bgcolor: "#dcfce7", color: "#166534" }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}
        <IconButton size="small" sx={{ transform: open ? "rotate(180deg)" : "none" }}>
          <ExpandMoreIcon fontSize="small" />
        </IconButton>
      </Box>
      <Collapse in={open} unmountOnExit>
        <TableContainer sx={{ maxHeight: 320 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>Order</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Farmer</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800 }}>
                  Plants
                </TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Delivery</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Seed</TableCell>
                {canEdit ? (
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    Sow
                  </TableCell>
                ) : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={String(o.orderId)} hover>
                  <TableCell sx={{ fontWeight: 700 }}>#{o.orderNumber}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {o.farmerName || "—"}
                    </Typography>
                    {o.farmerMobile && (
                      <Typography variant="caption" color="text.secondary">
                        {o.farmerMobile}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800 }}>
                    {fmtNum(o.plants)}
                  </TableCell>
                  <TableCell>{fmtDay(o.deliveryDate)}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={seedLabel(o)}
                      color={
                        String(o.seedSource || "").toUpperCase() === "RAISING"
                          ? "warning"
                          : String(o.seedSource || "").toUpperCase() === "MIXED"
                            ? "info"
                            : "default"
                      }
                      sx={{ height: 20, fontWeight: 700, fontSize: "0.65rem" }}
                    />
                  </TableCell>
                  {canEdit ? (
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<GrassIcon sx={{ fontSize: 16 }} />}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSowOrder(o)
                        }}
                        sx={{ textTransform: "none", fontWeight: 800, minWidth: 72 }}
                      >
                        Sow
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <PendingSubtypeSowSection group={group} canEdit={canEdit} onSowed={onSowed} />
      </Collapse>
    </Paper>
  )
}

function PlantGroup({ plant, canEdit, onSowOrder, onSowed }) {
  const [open, setOpen] = useState(true)

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid #fde68a",
        overflow: "hidden",
        bgcolor: "#fff",
      }}
    >
      <Box
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setOpen((v) => !v)
          }
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 2,
          py: 1.25,
          cursor: "pointer",
          background: "linear-gradient(90deg, #fffbeb 0%, #fef3c7 55%, #fff 100%)",
          borderBottom: open ? "1px solid #fde68a" : "none",
        }}
      >
        <AssignmentLateIcon sx={{ color: "#b45309", fontSize: 22 }} />
        <Typography fontWeight={900} fontSize="1.05rem" color="#92400e" flex={1}>
          {plant.plantName}
        </Typography>
        <Chip size="small" label={`${plant.subtypes.length} subtypes`} sx={{ fontWeight: 700 }} />
        <Chip
          size="small"
          label={`${plant.orderCount} orders · ${fmtNum(plant.totalPlants)} plants`}
          sx={{ fontWeight: 800, bgcolor: "#fed7aa", color: "#9a3412" }}
        />
        <IconButton size="small" sx={{ transform: open ? "rotate(180deg)" : "none" }}>
          <ExpandMoreIcon />
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Stack spacing={1} sx={{ p: 1.5, bgcolor: "#fffdf7" }}>
          {plant.subtypes.map((st) => (
            <SubtypeBlock
              key={`${st.plantId}-${st.subtypeId}`}
              group={st}
              canEdit={canEdit}
              onSowOrder={onSowOrder}
              onSowed={onSowed}
            />
          ))}
        </Stack>
      </Collapse>
    </Paper>
  )
}

export default function PendingSowingOrdersPanel({ refreshToken = 0, onLoaded, onSowed }) {
  const isSuperAdmin = useIsSuperAdmin()
  const isOfficeAdmin = useIsOfficeAdmin()
  const canEdit = isSuperAdmin || isOfficeAdmin

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [groups, setGroups] = useState([])
  const [search, setSearch] = useState("")
  const [sowOrder, setSowOrder] = useState(null)
  const onLoadedRef = useRef(onLoaded)
  onLoadedRef.current = onLoaded

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const instance = NetworkManager(API.sowing.GET_ADMIN_DIRECT_SOW_ORDERS)
      const res = await instance.request({}, { date: todayYmd() })
      const body = res?.data
      if (body?.success) {
        const next = (body.groups || []).filter((g) => (Number(g.orderCount) || 0) > 0)
        setGroups(next)
        onLoadedRef.current?.({
          orderCount: Number(body.total) || next.reduce((s, g) => s + (Number(g.orderCount) || 0), 0),
          subtypeCount: next.length,
          plantCount: new Set(next.map((g) => String(g.plantId))).size,
        })
      } else {
        setGroups([])
        setError(body?.message || "Failed to load pending orders")
        onLoadedRef.current?.({ orderCount: 0, subtypeCount: 0, plantCount: 0 })
      }
    } catch (e) {
      setGroups([])
      setError(e?.response?.data?.message || e?.message || "Failed to load pending orders")
      onLoadedRef.current?.({ orderCount: 0, subtypeCount: 0, plantCount: 0 })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (refreshToken > 0) load()
  }, [refreshToken, load])

  const handleSowed = useCallback(() => {
    load()
    onSowed?.()
  }, [load, onSowed])

  const plantGroups = useMemo(() => groupByPlant(groups), [groups])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return plantGroups
    return plantGroups
      .map((p) => ({
        ...p,
        subtypes: p.subtypes.filter(
          (st) =>
            String(st.subtypeName || "").toLowerCase().includes(q) ||
            String(p.plantName || "").toLowerCase().includes(q) ||
            (st.orders || []).some(
              (o) =>
                String(o.orderNumber || "").includes(q) ||
                String(o.farmerName || "").toLowerCase().includes(q) ||
                String(o.farmerMobile || "").includes(q)
            )
        ),
      }))
      .filter((p) => p.subtypes.length > 0)
  }, [plantGroups, search])

  const totals = useMemo(
    () =>
      groups.reduce(
        (acc, g) => ({
          orders: acc.orders + (Number(g.orderCount) || 0),
          plants: acc.plants + (Number(g.totalPlants) || 0),
        }),
        { orders: 0, plants: 0 }
      ),
    [groups]
  )

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={6}>
        <CircularProgress size={36} />
      </Box>
    )
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5} flexWrap="wrap" gap={1}>
        <Box>
          <Typography fontWeight={900} fontSize="1.05rem" color="#92400e">
            All orders pending sowing
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            Grouped by plant and subtype · sow → ready-date slot covers order
          </Typography>
        </Box>
        <IconButton size="small" onClick={load} sx={{ bgcolor: "#fef3c7" }}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Stack>

      {!canEdit ? (
        <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
          Sow recording is available for Office Admin / Super Admin only.
        </Alert>
      ) : null}

      <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap" useFlexGap>
        <Chip label={`${plantGroups.length} plants`} size="small" sx={{ fontWeight: 800 }} />
        <Chip label={`${groups.length} subtypes`} size="small" sx={{ fontWeight: 800 }} />
        <Chip
          label={`${totals.orders} orders`}
          size="small"
          sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e" }}
        />
        <Chip
          label={`${fmtNum(totals.plants)} plants`}
          size="small"
          sx={{ fontWeight: 800, bgcolor: "#ffedd5", color: "#9a3412" }}
        />
      </Stack>

      <TextField
        size="small"
        fullWidth
        placeholder="Search plant, subtype, order #, farmer…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && filtered.length === 0 ? (
        <Alert severity="success">No unsowed orders — all caught up.</Alert>
      ) : (
        <Stack spacing={2}>
          {filtered.map((plant) => (
            <PlantGroup
              key={String(plant.plantId)}
              plant={plant}
              canEdit={canEdit}
              onSowOrder={setSowOrder}
              onSowed={handleSowed}
            />
          ))}
        </Stack>
      )}

      <PendingOrderSowDialog
        open={Boolean(sowOrder)}
        order={sowOrder}
        canEdit={canEdit}
        onClose={() => setSowOrder(null)}
        onSowed={handleSowed}
      />
    </Box>
  )
}
