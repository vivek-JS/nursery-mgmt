import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ButtonBase,
  Paper,
} from "@mui/material"
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
import { groupDaysByOffset } from "./SowHorizonContext"

function fmtNum(n) {
  const v = Number(n) || 0
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return v.toLocaleString("en-IN")
}

/** red = shortage, yellow = sow needed, green = ok */
export function subtypeStatus(st) {
  const shortage = Number(st?.summary?.shortage) || 0
  const sowNeed = Number(st?.summary?.sowingNeeded) || 0
  if (shortage > 0) return "red"
  if (sowNeed > 0) return "yellow"
  return "green"
}

const STATUS_META = {
  red: { color: "#dc2626", label: "Shortage", bg: "#fef2f2", border: "#fecaca" },
  yellow: { color: "#d97706", label: "Sow needed", bg: "#fffbeb", border: "#fde68a" },
  green: { color: "#16a34a", label: "OK", bg: "#f0fdf4", border: "#bbf7d0" },
}

function StatusCircle({ status, size = 10 }) {
  const meta = STATUS_META[status] || STATUS_META.green
  return (
    <Box
      component="span"
      title={meta.label}
      sx={{
        width: size,
        height: size,
        borderRadius: "50%",
        bgcolor: meta.color,
        display: "inline-block",
        flexShrink: 0,
        boxShadow: `0 0 0 2px ${meta.color}33`,
      }}
    />
  )
}

function DayTable({ days, todayKey = null }) {
  const groups = groupDaysByOffset(days || [], todayKey)
  return (
    <Box
      sx={{
        maxHeight: 320,
        overflow: "auto",
        borderRadius: 1.5,
        border: "1px solid #e2e8f0",
      }}
    >
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Day</TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
              Delivery
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
              Ready
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
              Shortage
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
              Sow need
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
              Slot stock
            </TableCell>
            <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
              ●
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((g) => (
            <React.Fragment key={g.label}>
              <TableRow>
                <TableCell
                  colSpan={7}
                  sx={{
                    py: 0.5,
                    bgcolor: g.label === "Today" ? "#fef3c7" : "#ecfdf5",
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <Typography fontWeight={900} fontSize="0.72rem" color="#14532d">
                    {g.label}
                  </Typography>
                </TableCell>
              </TableRow>
              {g.rows.map((r) => {
                const dayStatus =
                  (r.shortage || 0) > 0
                    ? "red"
                    : (r.sowingNeeded || 0) > 0
                      ? "yellow"
                      : "green"
                return (
                  <TableRow
                    key={r.date}
                    sx={{
                      bgcolor: r.isToday
                        ? "#fffbeb"
                        : dayStatus === "red"
                          ? "#fff7ed"
                          : "inherit",
                    }}
                  >
                    <TableCell>
                      <Typography fontWeight={700} fontSize="0.78rem">
                        {r.label}
                        {r.isToday ? " · Today" : ""}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{fmtNum(r.delivery)}</TableCell>
                    <TableCell align="right">{fmtNum(r.readyAvailable)}</TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight={700}
                        fontSize="0.8rem"
                        color={r.shortage > 0 ? "error.main" : "text.primary"}
                      >
                        {fmtNum(r.shortage)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        fontWeight={700}
                        fontSize="0.8rem"
                        color={r.sowingNeeded > 0 ? "warning.dark" : "text.primary"}
                      >
                        {fmtNum(r.sowingNeeded)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{fmtNum(r.stockAvailable)}</TableCell>
                    <TableCell align="center">
                      <StatusCircle status={dayStatus} />
                    </TableCell>
                  </TableRow>
                )
              })}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
}

function SubtypeLineGraph({ subtype }) {
  const days = subtype?.days || []
  const todayLabel = days.find((d) => d.isToday)?.label

  if (!days.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No day rows for this subtype.
      </Typography>
    )
  }

  return (
    <Box sx={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={days} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtNum(v)} width={48} />
          <Tooltip
            formatter={(value, name) => [fmtNum(value), name]}
            labelFormatter={(label, payload) => {
              const row = payload?.[0]?.payload
              if (!row) return label
              return `${row.date}${
                row.shortage > 0 ? ` · short ${fmtNum(row.shortage)}` : ""
              }`
            }}
          />
          <Legend />
          {todayLabel ? (
            <ReferenceLine
              x={todayLabel}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              label={{ value: "Today", fill: "#b45309", fontSize: 10 }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="delivery"
            name="Delivery"
            stroke="#ea580c"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="readyAvailable"
            name="Ready / Available"
            stroke="#059669"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="sowingNeeded"
            name="Sow need"
            stroke="#ca8a04"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  )
}

/**
 * Subtype buttons (scrollable) + status circles + graph for selected subtype.
 * Days already scoped to shared sow window; listing grouped Today / +Nd.
 */
export function SubtypeHorizonTables({
  bySubtype = [],
  horizonDays = 0,
  todayKey = null,
}) {
  const [selectedKey, setSelectedKey] = useState("")
  const windowLabel =
    horizonDays === 0 ? "Today" : `Today → +${horizonDays}d`

  useEffect(() => {
    if (!bySubtype.length) {
      setSelectedKey("")
      return
    }
    const still = bySubtype.some(
      (st) => `${st.plantId}-${st.subtypeId}` === selectedKey
    )
    if (!still) {
      setSelectedKey(`${bySubtype[0].plantId}-${bySubtype[0].subtypeId}`)
    }
  }, [bySubtype, selectedKey])

  const selected = useMemo(
    () =>
      bySubtype.find((st) => `${st.plantId}-${st.subtypeId}` === selectedKey) ||
      null,
    [bySubtype, selectedKey]
  )

  const counts = useMemo(() => {
    const c = { red: 0, yellow: 0, green: 0 }
    bySubtype.forEach((st) => {
      c[subtypeStatus(st)] += 1
    })
    return c
  }, [bySubtype])

  if (!bySubtype.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No subtype outlook rows for the horizon.
      </Typography>
    )
  }

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" mb={1} flexWrap="wrap">
        <Stack direction="row" spacing={0.5} alignItems="center">
          <StatusCircle status="red" />
          <Typography variant="caption" fontWeight={700}>
            Shortage {counts.red}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <StatusCircle status="yellow" />
          <Typography variant="caption" fontWeight={700}>
            Sow need {counts.yellow}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <StatusCircle status="green" />
          <Typography variant="caption" fontWeight={700}>
            OK {counts.green}
          </Typography>
        </Stack>
      </Stack>

      {/* Scrollable subtype buttons */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          overflowX: "auto",
          pb: 1,
          mb: 1.5,
          scrollSnapType: "x proximity",
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "#cbd5e1",
            borderRadius: 3,
          },
        }}
      >
        {bySubtype.map((st) => {
          const key = `${st.plantId}-${st.subtypeId}`
          const status = subtypeStatus(st)
          const meta = STATUS_META[status]
          const active = key === selectedKey
          return (
            <ButtonBase
              key={key}
              onClick={() => setSelectedKey(key)}
              sx={{
                scrollSnapAlign: "start",
                flex: "0 0 auto",
                minWidth: 168,
                maxWidth: 220,
                px: 1.25,
                py: 1,
                borderRadius: 2,
                border: `2px solid ${active ? meta.color : meta.border}`,
                bgcolor: active ? meta.bg : "#fff",
                textAlign: "left",
                boxShadow: active ? `0 0 0 1px ${meta.color}44` : "none",
              }}
            >
              <Stack spacing={0.4} width="100%">
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <StatusCircle status={status} size={11} />
                  <Typography
                    fontWeight={900}
                    fontSize="0.78rem"
                    noWrap
                    title={`${st.plantName} · ${st.subtypeName}`}
                  >
                    {st.subtypeName}
                  </Typography>
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  fontSize="0.65rem"
                >
                  {st.plantName}
                </Typography>
                <Typography fontSize="0.65rem" fontWeight={700} color="text.secondary">
                  {windowLabel} · sow {fmtNum(st.summary?.sowingNeeded)} · short{" "}
                  {fmtNum(st.summary?.shortage)}
                </Typography>
              </Stack>
            </ButtonBase>
          )
        })}
      </Box>

      {selected && (
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            borderRadius: 2,
            borderColor: STATUS_META[subtypeStatus(selected)].border,
            bgcolor: "#fff",
          }}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            spacing={1}
            mb={1}
          >
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <StatusCircle status={subtypeStatus(selected)} size={12} />
                <Typography fontWeight={900}>
                  {selected.plantName} · {selected.subtypeName}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Graph for this subtype · {windowLabel}
                {selected.plantReadyDays
                  ? ` · plant ready ${selected.plantReadyDays}d`
                  : ""}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                label={`Sow ${fmtNum(selected.summary?.sowingNeeded)}`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                color="error"
                variant="outlined"
                label={`Short ${fmtNum(selected.summary?.shortage)}`}
                sx={{ fontWeight: 700 }}
              />
              <Chip
                size="small"
                variant="outlined"
                label={`Seed ${fmtNum(selected.availablePackets)} pkt`}
                sx={{ fontWeight: 700 }}
              />
            </Stack>
          </Stack>

          <SubtypeLineGraph subtype={selected} />

          <Typography fontWeight={800} fontSize="0.85rem" mt={1.5} mb={0.75}>
            Day listing (scroll) · grouped {windowLabel}
          </Typography>
          <DayTable days={selected.days} todayKey={todayKey} />
        </Paper>
      )}
    </Box>
  )
}

/**
 * Sow-window days: sowing plants + available seed packets (projected),
 * grouped Today / +1d / +2d …
 */
export function Next7PacketsTable({
  rows = [],
  summary = null,
  horizonDays = 0,
  todayKey = null,
}) {
  const groups = groupDaysByOffset(rows || [], todayKey)
  const windowLabel =
    horizonDays === 0 ? "Today" : `Today → +${horizonDays}d`
  return (
    <Box>
      {summary && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.25 }}>
          <Chip
            size="small"
            color="warning"
            label={`${windowLabel} sow plants ${fmtNum(summary.sowingNeededPlants)}`}
            sx={{ fontWeight: 700 }}
          />
          <Chip
            size="small"
            color="primary"
            label={`${windowLabel} pkt need ${fmtNum(summary.packetsNeeded)}`}
            sx={{ fontWeight: 700 }}
          />
          <Chip
            size="small"
            variant="outlined"
            label={`Seed now ${fmtNum(summary.availablePacketsNow)} pkt`}
            sx={{ fontWeight: 700 }}
          />
          <Chip
            size="small"
            color="error"
            variant="outlined"
            label={`Pkt short ${fmtNum(summary.packetShortage)}`}
            sx={{ fontWeight: 700 }}
          />
        </Stack>
      )}
      <Box
        sx={{
          maxHeight: 320,
          overflow: "auto",
          borderRadius: 2,
          border: "1px solid #e2e8f0",
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>Day</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
                Sow plants
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
                Packets need
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
                Seed avail
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
                Pkt short
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
                After
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 800, bgcolor: "#f8fafc" }}>
                ●
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groups.map((g) => (
              <React.Fragment key={g.label}>
                <TableRow>
                  <TableCell
                    colSpan={7}
                    sx={{
                      py: 0.5,
                      bgcolor: g.label === "Today" ? "#fef3c7" : "#ecfdf5",
                      borderBottom: "1px solid #e2e8f0",
                    }}
                  >
                    <Typography fontWeight={900} fontSize="0.72rem" color="#14532d">
                      {g.label}
                    </Typography>
                  </TableCell>
                </TableRow>
                {g.rows.map((r) => {
                  const status =
                    (r.packetShortage || 0) > 0
                      ? "red"
                      : (r.sowingNeededPlants || 0) > 0
                        ? "yellow"
                        : "green"
                  return (
                    <TableRow
                      key={r.date}
                      sx={{
                        bgcolor: r.isToday
                          ? "#fffbeb"
                          : status === "red"
                            ? "#fef2f2"
                            : "inherit",
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight={700} fontSize="0.8rem">
                          {r.label}
                          {r.isToday ? " · Today" : ""}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fmtNum(r.sowingNeededPlants)}</TableCell>
                      <TableCell align="right">{fmtNum(r.packetsNeeded)}</TableCell>
                      <TableCell align="right">{fmtNum(r.availablePackets)}</TableCell>
                      <TableCell align="right">
                        <Typography
                          fontWeight={800}
                          fontSize="0.85rem"
                          color={r.packetShortage > 0 ? "error.main" : "text.primary"}
                        >
                          {fmtNum(r.packetShortage)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fmtNum(r.packetsAfter)}</TableCell>
                      <TableCell align="center">
                        <StatusCircle status={status} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Box>
  )
}
