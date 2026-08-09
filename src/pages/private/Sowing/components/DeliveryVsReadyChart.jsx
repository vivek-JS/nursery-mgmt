import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Grid,
  Paper,
  Stack,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import WarningAmberIcon from "@mui/icons-material/WarningAmber"
import LocalShippingIcon from "@mui/icons-material/LocalShipping"
import SpaIcon from "@mui/icons-material/Spa"
import Inventory2Icon from "@mui/icons-material/Inventory2"
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  ReferenceLine,
} from "recharts"
import { NetworkManager, API } from "network/core"
import {
  Next7PacketsTable,
  SubtypeHorizonTables,
} from "./SubtypeOutlookTables"
import {
  SowHorizonChips,
  sliceDaysByHorizon,
  summarizeDayRows,
  useSowHorizon,
} from "./SowHorizonContext"

function fmtNum(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return v.toLocaleString("en-IN")
}

function KpiCard({ icon, label, value, sub, color = "#0f766e", bg = "#ecfdf5" }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        height: "100%",
        borderRadius: 2,
        border: `1px solid ${color}33`,
        bgcolor: bg,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <Box sx={{ color, mt: 0.25 }}>{icon}</Box>
        <Box minWidth={0}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight={900} sx={{ color, lineHeight: 1.2 }}>
            {fmtNum(value)}
          </Typography>
          {sub ? (
            <Typography variant="caption" color="text.secondary" display="block">
              {sub}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  )
}

/**
 * Complete Gap Analysis sowing analytics:
 * - intersecting dual line (Delivery vs Ready/Available)
 * - urgent / due KPIs
 * - next 7 days sowing needed + stock availability
 */
export default function DeliveryVsReadyChart({ plantId, subtypeId }) {
  const { sowHorizonDays, dayCount } = useSowHorizon()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [days, setDays] = useState([])
  const [today, setToday] = useState(null)
  const [urgent, setUrgent] = useState(null)
  const [next7Summary, setNext7Summary] = useState(null)
  const [bySubtype, setBySubtype] = useState([])
  const [next7Packets, setNext7Packets] = useState([])
  const [next7PacketsSummary, setNext7PacketsSummary] = useState(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const instance = NetworkManager(API.sowing.GET_DELIVERY_VS_READY)
      const res = await instance.request(
        {},
        {
          ...(plantId ? { plantId } : {}),
          ...(subtypeId ? { subtypeId } : {}),
        }
      )
      const body = res?.data
      if (body?.success) {
        setDays(body.days || [])
        setToday(body.today || null)
        setUrgent(body.urgent || null)
        setNext7Summary(body.next7Summary || null)
        setBySubtype(body.bySubtype || [])
        setNext7Packets(body.next7Packets || [])
        setNext7PacketsSummary(body.next7PacketsSummary || null)
      } else {
        setDays([])
        setToday(null)
        setUrgent(null)
        setNext7Summary(null)
        setBySubtype([])
        setNext7Packets([])
        setNext7PacketsSummary(null)
        setError(body?.message || "Failed to load analytics")
      }
    } catch (e) {
      setDays([])
      setToday(null)
      setUrgent(null)
      setNext7Summary(null)
      setBySubtype([])
      setNext7Packets([])
      setNext7PacketsSummary(null)
      setError(e?.message || "Failed to load analytics")
    } finally {
      setLoading(false)
    }
  }, [plantId, subtypeId])

  useEffect(() => {
    load()
  }, [load])

  const todayLabel = useMemo(
    () => days.find((d) => d.isToday)?.label,
    [days]
  )

  const todayKey = useMemo(
    () => today?.date || days.find((d) => d.isToday)?.date || null,
    [today, days]
  )

  const windowLabel =
    sowHorizonDays === 0 ? "Today" : `Today → +${sowHorizonDays}d`

  const scopedBySubtype = useMemo(
    () =>
      (bySubtype || []).map((st) => {
        const sliced = sliceDaysByHorizon(st.days || [], sowHorizonDays, todayKey)
        const summary = summarizeDayRows(sliced)
        return {
          ...st,
          days: sliced,
          summary: {
            delivery: summary.delivery,
            readyAvailable: summary.readyAvailable,
            stockAvailable: summary.stockAvailable,
            sowingNeeded: summary.sowingNeeded,
            shortage: summary.shortage,
          },
          horizonDays: dayCount,
        }
      }),
    [bySubtype, sowHorizonDays, todayKey, dayCount]
  )

  const scopedPackets = useMemo(
    () => sliceDaysByHorizon(next7Packets || [], sowHorizonDays, todayKey),
    [next7Packets, sowHorizonDays, todayKey]
  )

  const scopedPacketsSummary = useMemo(() => {
    const s = summarizeDayRows(scopedPackets)
    return {
      sowingNeededPlants: s.sowingNeededPlants,
      packetsNeeded: Number(s.packetsNeeded.toFixed(2)),
      packetShortage: Number(s.packetShortage.toFixed(2)),
      availablePacketsNow:
        next7PacketsSummary?.availablePacketsNow ??
        scopedPackets[0]?.availablePackets ??
        0,
    }
  }, [scopedPackets, next7PacketsSummary])

  const scopedSowNeed = useMemo(() => {
    const fromPackets = scopedPackets.reduce(
      (n, r) => n + (Number(r.sowingNeededPlants) || 0),
      0
    )
    if (fromPackets > 0) return fromPackets
    return scopedBySubtype.reduce(
      (n, st) => n + (Number(st.summary?.sowingNeeded) || 0),
      0
    )
  }, [scopedPackets, scopedBySubtype])

  return (
    <Card
      sx={{
        boxShadow: 3,
        borderRadius: 2,
        background: "linear-gradient(145deg, #ecfeff 0%, #ffffff 45%, #f0fdf4 100%)",
        border: "1px solid #99f6e4",
      }}
    >
      <CardContent>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={1.5}
          gap={1}
          flexWrap="wrap"
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 900, color: "#0f766e" }}>
              Sowing analytics · Delivery vs Ready
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Two lines: delivery demand vs plants becoming ready (sow + plantReadyDays).
              Cross = shortage / surplus day. Tables below follow the same sow window as
              Inventory Requests.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <SowHorizonChips disabled={loading} onReselect={() => load()} />
            <IconButton size="small" onClick={() => load()} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6} sm={3}>
                <KpiCard
                  icon={<WarningAmberIcon />}
                  label="Urgent + Due sow"
                  value={urgent?.totalUrgentPlants || 0}
                  sub={`${urgent?.dueSlots || 0} due · ${urgent?.urgentSlots || 0} today slots`}
                  color="#b45309"
                  bg="#fffbeb"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard
                  icon={<LocalShippingIcon />}
                  label="Today delivery"
                  value={today?.deliveryToday || 0}
                  sub={
                    today?.shortageToday > 0
                      ? `Shortage ${fmtNum(today.shortageToday)}`
                      : "Covered by ready"
                  }
                  color="#c2410c"
                  bg="#fff7ed"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard
                  icon={<SpaIcon />}
                  label="Today ready"
                  value={today?.readyToday || 0}
                  sub={`Sowed today ${fmtNum(today?.sowedToday || 0)}`}
                  color="#047857"
                  bg="#ecfdf5"
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <KpiCard
                  icon={<Inventory2Icon />}
                  label={`${windowLabel} sowing need`}
                  value={scopedSowNeed || next7Summary?.sowingNeeded || 0}
                  sub={`Window ${dayCount}d · stock ${fmtNum(next7Summary?.stockAvailable || 0)}`}
                  color="#1d4ed8"
                  bg="#eff6ff"
                />
              </Grid>
            </Grid>

            {(urgent?.duePlants > 0 || urgent?.urgentPlants > 0) && (
              <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningAmberIcon />}>
                <strong>Urgent:</strong> {fmtNum(urgent.duePlants)} plants overdue to sow
                ({urgent.dueSlots} slots)
                {urgent.urgentPlants > 0
                  ? ` · ${fmtNum(urgent.urgentPlants)} due today (${urgent.urgentSlots} slots)`
                  : ""}
                {urgent.shortageToday > 0
                  ? ` · Today delivery shortage ${fmtNum(urgent.shortageToday)}`
                  : ""}
              </Alert>
            )}

            {days.length === 0 ? (
              <Alert severity="info">No chart data in range.</Alert>
            ) : (
              <Box sx={{ mb: 2.5 }}>
                <Typography fontWeight={800} fontSize="0.9rem" mb={0.5}>
                  Intersecting lines · Delivery vs Ready/Available
                </Typography>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart
                    data={days}
                    margin={{ top: 12, right: 16, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtNum(v)} />
                    <Tooltip
                      formatter={(value, name) => [fmtNum(value), name]}
                      labelFormatter={(label, payload) => {
                        const row = payload?.[0]?.payload
                        if (!row) return label
                        return `${row.date}${
                          row.shortage > 0 ? ` · shortage ${fmtNum(row.shortage)}` : ""
                        }${row.surplus > 0 ? ` · surplus ${fmtNum(row.surplus)}` : ""}`
                      }}
                    />
                    <Legend />
                    {todayLabel ? (
                      <ReferenceLine
                        x={todayLabel}
                        stroke="#f59e0b"
                        strokeDasharray="4 4"
                        label={{ value: "Today", fill: "#b45309", fontSize: 11 }}
                      />
                    ) : null}
                    <Line
                      type="monotone"
                      dataKey="delivery"
                      name="Delivery"
                      stroke="#ea580c"
                      strokeWidth={2.75}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="readyAvailable"
                      name="Ready / Available"
                      stroke="#059669"
                      strokeWidth={2.75}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sowed"
                      name="Sowed (that day)"
                      stroke="#2563eb"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}

            <Typography fontWeight={900} fontSize="0.95rem" mb={0.5}>
              Subtype · pick button → graph & day list
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Scroll subtypes · ● red shortage · yellow sow need · green OK.
              Day list grouped by {windowLabel} (same chips as Inventory Requests).
              {scopedSowNeed
                ? ` Window sow need ${fmtNum(scopedSowNeed)}.`
                : ""}
            </Typography>
            <Box sx={{ mb: 3 }}>
              <SubtypeHorizonTables
                bySubtype={scopedBySubtype}
                horizonDays={sowHorizonDays}
                todayKey={todayKey}
              />
            </Box>

            <Typography fontWeight={900} fontSize="0.95rem" mb={0.5}>
              {windowLabel} · sowing & available seed packets
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>
              Packets need = sow plants ÷ conversion factor. Seed avail projects remaining
              after each day’s need. Rows grouped Today / +1d / +2d…
            </Typography>
            <Next7PacketsTable
              rows={scopedPackets}
              summary={scopedPacketsSummary}
              horizonDays={sowHorizonDays}
              todayKey={todayKey}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}
