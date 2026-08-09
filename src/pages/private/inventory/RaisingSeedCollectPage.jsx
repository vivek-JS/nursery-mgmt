import React, { useCallback, useEffect, useState } from "react"
import {
  Box,
  Typography,
  TextField,
  Stack,
  Button,
  Chip,
  CircularProgress,
  Alert,
  InputAdornment,
  Paper,
  Fade,
} from "@mui/material"
import SearchIcon from "@mui/icons-material/Search"
import SpaIcon from "@mui/icons-material/Spa"
import RefreshIcon from "@mui/icons-material/Refresh"
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined"
import { NetworkManager, API } from "network/core"
import RaisingCollectForm from "./RaisingCollectForm"

function fmtExp(d) {
  if (!d) return ""
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return ""
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export default function RaisingSeedCollectPage() {
  const [q, setQ] = useState("")
  const [orders, setOrders] = useState([])
  const [intakes, setIntakes] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [selectedIntake, setSelectedIntake] = useState(null)
  const [intakeLoading, setIntakeLoading] = useState(false)
  const [loadMs, setLoadMs] = useState(null)

  const loadOrders = useCallback(async (search = "") => {
    try {
      setLoading(true)
      const instance = NetworkManager(API.sowing.GET_RAISING_PENDING_ORDERS)
      const res = await instance.request({}, search ? { q: search } : {})
      if (res?.data?.success) {
        setOrders(res.data.data || [])
        setLoadMs(res.data.ms ?? null)
      } else {
        setOrders([])
      }
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRecentIntakes = useCallback(async () => {
    try {
      const instance = NetworkManager(API.sowing.GET_RAISING_AVAILABLE)
      const res = await instance.request({})
      if (res?.data?.success) setIntakes((res.data.data || []).slice(0, 12))
    } catch {
      setIntakes([])
    }
  }, [])

  const selectOrder = useCallback(async (o) => {
    setSelected(o)
    setSelectedIntake(null)
    if (!o?.raisingCollected && !o?.raisingIntakeId) return
    try {
      setIntakeLoading(true)
      const instance = NetworkManager(API.sowing.GET_RAISING_BY_ORDER)
      const res = await instance.request({}, [o.orderId])
      if (res?.data?.success && res.data.data) {
        setSelectedIntake(res.data.data)
      } else if (o.raisingIntakeId) {
        const byId = NetworkManager(API.sowing.GET_RAISING_INTAKE)
        const r2 = await byId.request({}, [o.raisingIntakeId])
        if (r2?.data?.success) setSelectedIntake(r2.data.data)
      }
    } catch {
      setSelectedIntake(null)
    } finally {
      setIntakeLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders("")
    loadRecentIntakes()
  }, [loadOrders, loadRecentIntakes])

  useEffect(() => {
    const t = setTimeout(() => loadOrders(q.trim()), 320)
    return () => clearTimeout(t)
  }, [q, loadOrders])

  const awaiting = orders.filter(
    (o) => !o.raisingCollected && !(o.intakeCount > 0)
  ).length

  return (
    <Box
      sx={{
        minHeight: "100%",
        background:
          "radial-gradient(1200px 480px at 10% -10%, #d1fae5 0%, transparent 55%), radial-gradient(900px 400px at 100% 0%, #fef3c7 0%, transparent 50%), #f8fafc",
        pb: 4,
      }}
    >
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1120, mx: "auto" }}>
        <Paper
          elevation={0}
          sx={{
            mb: 2.5,
            p: { xs: 2, md: 2.5 },
            borderRadius: 3,
            border: "1px solid rgba(16,185,129,0.25)",
            background:
              "linear-gradient(120deg, #064e3b 0%, #047857 48%, #059669 100%)",
            color: "#ecfdf5",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              right: -40,
              top: -40,
              width: 180,
              height: 180,
              borderRadius: "50%",
              bgcolor: "rgba(255,255,255,0.08)",
            }}
          />
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
            spacing={1.5}
            position="relative"
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2.5,
                  bgcolor: "rgba(255,255,255,0.15)",
                  display: "grid",
                  placeItems: "center",
                  backdropFilter: "blur(6px)",
                }}
              >
                <SpaIcon sx={{ color: "#a7f3d0", fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={900} letterSpacing={-0.3}>
                  Collect raising seeds
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.88 }}>
                  Multi-batch collect · per-batch expiry · one intake per order
                  {loadMs != null ? ` · ${loadMs}ms` : ""}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                label={`${awaiting} awaiting`}
                sx={{ fontWeight: 800, bgcolor: "#fef3c7", color: "#92400e" }}
              />
              <Chip
                size="small"
                label={`${orders.length} listed`}
                sx={{ fontWeight: 800, bgcolor: "rgba(255,255,255,0.2)", color: "#fff" }}
              />
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => {
                  loadOrders(q.trim())
                  loadRecentIntakes()
                }}
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  color: "#064e3b",
                  bgcolor: "#ecfdf5",
                  "&:hover": { bgcolor: "#d1fae5" },
                }}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>
        </Paper>

        {selected ? (
          <Fade in>
            <Box mb={3}>
              {intakeLoading ? (
                <Box py={4} textAlign="center">
                  <CircularProgress size={28} sx={{ color: "#059669" }} />
                </Box>
              ) : (
                <RaisingCollectForm
                  order={selected}
                  intake={selectedIntake}
                  onCancel={() => {
                    setSelected(null)
                    setSelectedIntake(null)
                  }}
                  onSuccess={() => {
                    setSelected(null)
                    setSelectedIntake(null)
                    loadOrders(q.trim())
                    loadRecentIntakes()
                  }}
                />
              )}
            </Box>
          </Fade>
        ) : (
          <Alert
            severity="info"
            sx={{
              mb: 2,
              borderRadius: 2,
              border: "1px solid #bae6fd",
              bgcolor: "#f0f9ff",
            }}
          >
            Select a RAISING / MIXED order. Add multiple batches with their own
            expiry. Already collected orders open in edit mode.
          </Alert>
        )}

        <TextField
          fullWidth
          size="small"
          placeholder="Search order #, farmer name, mobile…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "#059669" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 2,
            bgcolor: "#fff",
            borderRadius: 2,
            "& .MuiOutlinedInput-root": { borderRadius: 2 },
          }}
        />

        {loading ? (
          <Box py={5} textAlign="center">
            <CircularProgress size={30} sx={{ color: "#059669" }} />
          </Box>
        ) : orders.length === 0 ? (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            No pending raising orders match.
          </Alert>
        ) : (
          <Stack spacing={1.25} mb={4}>
            {orders.map((o) => {
              const collected = Boolean(o.raisingCollected || o.intakeCount > 0)
              const active =
                selected && String(selected.orderId) === String(o.orderId)
              const batchHint =
                o.raisingIntake?.batches?.length ||
                (o.raisingIntake?.batchNumber ? 1 : 0)
              return (
                <Paper
                  key={String(o.orderId)}
                  elevation={0}
                  onClick={() => selectOrder(o)}
                  sx={{
                    p: 1.75,
                    borderRadius: 2.5,
                    cursor: "pointer",
                    border: "1.5px solid",
                    borderColor: active ? "#10b981" : "#e2e8f0",
                    bgcolor: active ? "#ecfdf5" : "#fff",
                    transition:
                      "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
                    "&:hover": {
                      borderColor: "#6ee7b7",
                      transform: "translateY(-1px)",
                      boxShadow: "0 10px 28px rgba(6,95,70,0.08)",
                    },
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ sm: "center" }}
                    gap={1.25}
                  >
                    <Box minWidth={0}>
                      <Typography fontWeight={900} color="#0f172a" noWrap>
                        #{o.orderNumber} · {o.farmerName || "—"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {o.farmerMobile || "—"}
                        {o.village ? ` · ${o.village}` : ""} · {o.plantName}/
                        {o.subtypeName} · {o.numberOfPlants} plants
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip
                        size="small"
                        label={o.seedSource}
                        sx={{ fontWeight: 800, height: 24, bgcolor: "#f1f5f9" }}
                      />
                      {batchHint > 0 && (
                        <Chip
                          size="small"
                          icon={<Inventory2OutlinedIcon sx={{ fontSize: 14 }} />}
                          label={`${batchHint} batch`}
                          sx={{ fontWeight: 700, height: 24 }}
                        />
                      )}
                      <Chip
                        size="small"
                        label={
                          collected
                            ? o.packetsInHand > 0
                              ? `Collected · ${o.packetsInHand} in hand`
                              : "Collected"
                            : "Awaiting collect"
                        }
                        sx={{
                          height: 24,
                          fontWeight: 800,
                          bgcolor: collected ? "#a7f3d0" : "#fef3c7",
                          color: collected ? "#065f46" : "#92400e",
                        }}
                      />
                      <Button
                        size="small"
                        variant="contained"
                        disableElevation
                        onClick={(e) => {
                          e.stopPropagation()
                          selectOrder(o)
                        }}
                        sx={{
                          textTransform: "none",
                          fontWeight: 900,
                          borderRadius: 2,
                          px: 1.75,
                          bgcolor: collected ? "#0f766e" : "#059669",
                          "&:hover": {
                            bgcolor: collected ? "#115e59" : "#047857",
                          },
                        }}
                      >
                        {collected ? "Edit" : "Collect"}
                      </Button>
                    </Stack>
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        )}

        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            border: "1px solid #bbf7d0",
            bgcolor: "rgba(240,253,244,0.7)",
          }}
        >
          <Typography fontWeight={900} mb={1.25} color="#065f46">
            Recent intakes in hand
          </Typography>
          {intakes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No raising stock with remaining packets.
            </Typography>
          ) : (
            <Stack spacing={0.85}>
              {intakes.map((i) => {
                const batchLines =
                  Array.isArray(i.batches) && i.batches.length
                    ? i.batches
                    : [
                        {
                          batchNumber: i.batchNumber,
                          packets: i.packetsReceived,
                          expiryDate: i.expiryDate,
                        },
                      ]
                return (
                  <Box
                    key={String(i._id)}
                    sx={{
                      px: 1.5,
                      py: 1.1,
                      borderRadius: 2,
                      bgcolor: "#fff",
                      border: "1px solid #d1fae5",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      gap={0.5}
                    >
                      <Typography fontSize="0.88rem" fontWeight={800}>
                        {i.intakeNumber} · {i.farmerName || "—"} · {i.plantName}/
                        {i.subtypeName}
                      </Typography>
                      <Typography fontSize="0.8rem" color="text.secondary" fontWeight={700}>
                        {i.packetsRemaining}/{i.packetsReceived} pkt left
                      </Typography>
                    </Stack>
                    <Stack direction="row" flexWrap="wrap" gap={0.6} mt={0.75}>
                      {batchLines.map((b, idx) => (
                        <Chip
                          key={`${i._id}-${idx}`}
                          size="small"
                          label={`${b.batchNumber || "—"} · ${b.packets ?? "?"} pkt${
                            b.expiryDate ? ` · exp ${fmtExp(b.expiryDate)}` : ""
                          }`}
                          sx={{
                            height: 22,
                            fontSize: 11,
                            fontWeight: 700,
                            bgcolor: "#ecfdf5",
                            color: "#065f46",
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                )
              })}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  )
}
