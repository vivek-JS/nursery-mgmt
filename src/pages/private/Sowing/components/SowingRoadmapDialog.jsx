import React, { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Stack,
  Typography,
  Chip,
  Checkbox,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  CircularProgress,
  Alert,
  Tooltip,
} from "@mui/material"
import MapRoundedIcon from "@mui/icons-material/MapRounded"
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded"
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import {
  buildRoadmapLines,
  colorForIndex,
  fmt,
  maxExcessForLine,
  redistributeSubtypeLines,
} from "./sowingPackingUtils"

const STEPS = [
  { key: "gap", label: "Gap", hint: "Plants due" },
  { key: "stock", label: "Stock", hint: "Packings" },
  { key: "plan", label: "Plan", hint: "Edit table" },
  { key: "go", label: "Confirm", hint: "Batch request" },
]

export default function SowingRoadmapDialog({ open, onClose, cards = [], onSuccess }) {
  const [lines, setLines] = useState([])
  const [step, setStep] = useState(2) // land on Plan
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  useEffect(() => {
    if (!open) return
    setLines(buildRoadmapLines(cards))
    setStep(2)
    setProgress({ done: 0, total: 0 })
  }, [open, cards])

  const included = useMemo(() => lines.filter((l) => l.included), [lines])

  const totals = useMemo(() => {
    let requestPkts = 0
    let excessPkts = 0
    let raisingPkts = 0
    let coverPlants = 0
    let gapPlants = 0
    const subtypes = new Set()
    const raisingSeen = new Set()
    included.forEach((l) => {
      subtypes.add(`${l.plantId}-${l.subtypeId}`)
      const req = Number(l.requestPkts) || 0
      const ex = Math.min(Number(l.excessPkts) || 0, maxExcessForLine(l))
      requestPkts += req + ex
      excessPkts += ex
      coverPlants += (req + ex) * (Number(l.conversionFactor) || 1)
      const sk = `${l.plantId}-${l.subtypeId}`
      if (l.isRaisingRow && !raisingSeen.has(sk)) {
        raisingSeen.add(sk)
        const r = Number(l.raisingPkts) || 0
        raisingPkts += r
        coverPlants += r * (Number(l.conversionFactor) || 1)
      }
    })
    const seen = new Set()
    included.forEach((l) => {
      const k = `${l.plantId}-${l.subtypeId}`
      if (seen.has(k)) return
      seen.add(k)
      gapPlants += Number(l.plantsGap) || 0
    })
    return {
      lines: included.length,
      subtypes: subtypes.size,
      requestPkts: requestPkts + raisingPkts,
      companyPkts: requestPkts,
      excessPkts,
      raisingPkts,
      coverPlants,
      gapPlants,
      coverPct:
        gapPlants > 0 ? Math.min(100, Math.round((coverPlants / gapPlants) * 100)) : 100,
    }
  }, [included])

  const patchLine = (id, patch) => {
    setLines((prev) => {
      const target = prev.find((l) => l.id === id)
      if (!target) return prev
      if (patch.raisingPkts != null && target.isRaisingRow) {
        return redistributeSubtypeLines(
          prev,
          target.plantId,
          target.subtypeId,
          patch.raisingPkts
        )
      }
      return prev.map((l) => {
        if (l.id !== id) return l
        const next = { ...l, ...patch }
        if (patch.requestPkts != null || patch.excessPkts != null) {
          const maxEx = maxExcessForLine(next)
          next.excessPkts = Math.min(Number(next.excessPkts) || 0, maxEx)
        }
        return next
      })
    })
  }

  const toggleAll = (on) => {
    setLines((prev) => prev.map((l) => ({ ...l, included: on })))
  }

  const refillStockFirst = () => {
    setLines(buildRoadmapLines(cards))
    Toast.success("Refilled with stock-first plan")
  }

  const handleConfirmAll = async () => {
    // Group by subtype so raising attaches once (card dialog parity)
    const bySubtype = new Map()
    included.forEach((l) => {
      const k = `${l.plantId}-${l.subtypeId}`
      if (!bySubtype.has(k)) bySubtype.set(k, [])
      bySubtype.get(k).push(l)
    })

    const jobs = []
    bySubtype.forEach((group) => {
      const raisingRow = group.find((l) => l.isRaisingRow) || group[0]
      const raising = Number(raisingRow?.raisingPkts) || 0
      group.forEach((l, idx) => {
        const excess = Math.min(Number(l.excessPkts) || 0, maxExcessForLine(l))
        const company = (Number(l.requestPkts) || 0) + excess
        const raise = idx === 0 ? raising : 0
        if (company + raise <= 0) return
        jobs.push({ line: l, company, raise, excess })
      })
    })

    if (!jobs.length) {
      Toast.error("Select lines with packets to request")
      return
    }
    try {
      setSaving(true)
      setStep(3)
      setProgress({ done: 0, total: jobs.length })
      const instance = NetworkManager(API.sowing.CREATE_SOWING_REQUEST)
      const created = []
      const errors = []

      for (let i = 0; i < jobs.length; i++) {
        const { line: l, company, raise, excess } = jobs[i]
        const cf = Number(l.conversionFactor) || 1
        const packetsNeeded = Number((l.plantsGap / cf).toFixed(2))
        const total = company + raise
        const source =
          raise > 0 && company > 0 ? "MIXED" : raise > 0 ? "RAISING" : "COMPANY"
        const slotIds = (l.slotIds || l.slots || [])
          .map((s) => (typeof s === "object" ? s._id || s.slotId : s))
          .filter(Boolean)

        const body = {
          plantId: l.plantId,
          subtypeId: l.subtypeId,
          packetsNeeded,
          packetsRequested: total,
          packetsFromCompany: company,
          packetsFromRaising: raise,
          seedSource: source,
          raisingIntakeIds: [],
          linkedOrderIds: [],
          slotIds,
          notes: [
            "Sowing roadmap batch",
            l.packingName,
            `1 pkt ≈ ${cf} plants`,
            `gap ${l.plantsGap} plants`,
            raise > 0 ? `customer seed ${raise} pkt` : null,
            excess > 0 ? `excess ${excess} pkt` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        }
        if (l.productId) body.productId = l.productId

        try {
          const res = await instance.request(body)
          if (res?.data?.success) created.push(res.data.data)
          else errors.push(res?.data?.message || l.packingName)
        } catch (e) {
          errors.push(e?.response?.data?.message || e.message || l.packingName)
        }
        setProgress({ done: i + 1, total: jobs.length })
      }

      if (created.length) {
        Toast.success(
          errors.length
            ? `${created.length} created · ${errors.length} failed`
            : `Roadmap done · ${created.length} requests created`
        )
        onSuccess?.(created)
        if (!errors.length) onClose?.()
      } else {
        Toast.error(errors[0] || "Batch request failed")
      }
    } finally {
      setSaving(false)
    }
  }

  // Journey chips — one per subtype
  const journey = useMemo(() => {
    const map = new Map()
    lines.forEach((l) => {
      const k = `${l.plantId}-${l.subtypeId}`
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label: `${l.plantName}`,
          sub: l.subtypeName,
          plants: l.plantsGap,
          ready: l.plantReadyDays,
          included: false,
          lines: 0,
        })
      }
      const g = map.get(k)
      g.lines += 1
      if (l.included) g.included = true
    })
    return Array.from(map.values())
  }, [lines])

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          pb: 1.5,
          background: "linear-gradient(125deg, #0e7490 0%, #0f766e 40%, #ca8a04 130%)",
          color: "#fff",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25}>
          <MapRoundedIcon />
          <Box>
            <Typography fontWeight={900} fontSize="1.25rem">
              Sowing roadmap
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.95 }}>
              All plants & packings in one plan · review → tweak → confirm batch
            </Typography>
          </Box>
        </Stack>

        {/* Step rail */}
        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
          {STEPS.map((s, i) => {
            const active = step === i
            const done = step > i
            return (
              <Chip
                key={s.key}
                size="small"
                icon={done ? <CheckCircleRoundedIcon /> : undefined}
                label={`${i + 1}. ${s.label}`}
                onClick={() => !saving && setStep(i)}
                sx={{
                  fontWeight: 800,
                  bgcolor: active ? "#fef08a" : done ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.12)",
                  color: active ? "#854d0e" : "#fff",
                  cursor: "pointer",
                }}
              />
            )
          })}
        </Stack>

        {/* Plant journey strip */}
        <Box
          sx={{
            mt: 1.75,
            display: "flex",
            gap: 1,
            overflowX: "auto",
            pb: 0.5,
            "&::-webkit-scrollbar": { height: 4 },
          }}
        >
          {journey.map((g, i) => {
            const c = colorForIndex(i)
            return (
              <Box
                key={g.key}
                sx={{
                  minWidth: 128,
                  px: 1.25,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: g.included ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.12)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  position: "relative",
                  "&:not(:last-child)::after": {
                    content: '"→"',
                    position: "absolute",
                    right: -14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    opacity: 0.7,
                    fontWeight: 900,
                  },
                }}
              >
                <Typography fontWeight={800} fontSize="0.8rem" noWrap>
                  {g.label}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.9 }} noWrap>
                  {g.sub} · {fmt(g.plants)} plt
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    height: 4,
                    borderRadius: 2,
                    bgcolor: "rgba(255,255,255,0.25)",
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ width: g.included ? "100%" : "30%", height: "100%", bgcolor: c.bar }} />
                </Box>
              </Box>
            )
          })}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ bgcolor: "#ecfeff", pt: 2 }}>
        {lines.length === 0 ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Nothing open to request — all gaps covered or already pending.
          </Alert>
        ) : (
          <>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={1}
              mb={1.5}
              mt={0.5}
            >
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" color="primary" label={`${totals.subtypes} subtypes`} sx={{ fontWeight: 700 }} />
                <Chip size="small" label={`${totals.lines} lines`} sx={{ fontWeight: 700, bgcolor: "#a5f3fc" }} />
                <Chip
                  size="small"
                  label={`Gap ${fmt(totals.gapPlants)} plants`}
                  sx={{ fontWeight: 700, bgcolor: "#bbf7d0" }}
                />
                <Chip
                  size="small"
                  label={`Cover ~${fmt(totals.coverPlants)} (${totals.coverPct}%)`}
                  sx={{ fontWeight: 700, bgcolor: "#fef08a" }}
                />
                <Chip
                  size="small"
                  label={`${fmt(totals.requestPkts, 2)} pkt total`}
                  sx={{ fontWeight: 800, bgcolor: "#ddd6fe" }}
                />
                {totals.raisingPkts > 0 && (
                  <Chip
                    size="small"
                    label={`${fmt(totals.raisingPkts, 2)} cust. seed`}
                    sx={{ fontWeight: 800, bgcolor: "#ffedd5", color: "#9a3412" }}
                  />
                )}
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  startIcon={<AutoFixHighRoundedIcon />}
                  onClick={refillStockFirst}
                  disabled={saving}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Stock-first refill
                </Button>
                <Button size="small" onClick={() => toggleAll(true)} sx={{ textTransform: "none" }}>
                  Select all
                </Button>
                <Button size="small" onClick={() => toggleAll(false)} sx={{ textTransform: "none" }}>
                  Clear
                </Button>
              </Stack>
            </Stack>

            <Box
              sx={{
                mb: 1.5,
                height: 10,
                borderRadius: 5,
                bgcolor: "#fff",
                border: "1px solid #99f6e4",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  width: `${totals.coverPct}%`,
                  background: "linear-gradient(90deg, #06b6d4, #14b8a6, #84cc16, #eab308)",
                  transition: "width .25s",
                }}
              />
            </Box>

            <TableContainer
              sx={{
                maxHeight: 420,
                borderRadius: 2,
                border: "1.5px solid #67e8f9",
                bgcolor: "#fff",
              }}
            >
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox" />
                    <TableCell sx={{ fontWeight: 800 }}>Plant / subtype</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Packing</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Gap
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      1 pkt ≈
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Stock
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Request
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Cust. seed
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Excess
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800 }}>
                      Plants
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((l) => {
                    const c = colorForIndex(l.colorIdx + l.plantName.length)
                    const maxEx = maxExcessForLine(l)
                    const ex = Math.min(Number(l.excessPkts) || 0, maxEx)
                    const totalPkts = (Number(l.requestPkts) || 0) + ex
                    const plants = totalPkts * (Number(l.conversionFactor) || 1)
                    const stockOk = (Number(l.availablePackets) || 0) >= (Number(l.requestPkts) || 0)
                    return (
                      <TableRow
                        key={l.id}
                        hover
                        selected={l.included}
                        sx={{
                          bgcolor: l.included ? `${c.bg}99` : undefined,
                          opacity: l.included ? 1 : 0.55,
                          "& td": { borderColor: "#e0f2fe" },
                        }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={l.included}
                            onChange={(e) => patchLine(l.id, { included: e.target.checked })}
                            disabled={saving}
                            sx={{ color: c.bar, "&.Mui-checked": { color: c.bar } }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight={800} fontSize="0.85rem" color={c.text}>
                            {l.plantName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {l.subtypeName}
                            {l.plantReadyDays != null ? ` · ${l.plantReadyDays}d` : ""}
                            {l.orderCount ? ` · ${l.orderCount} orders` : ""}
                          </Typography>
                          {l.seedHint && l.seedHint !== "COMPANY" && (
                            <Chip
                              size="small"
                              label={l.seedHint === "MIXED" ? "Mixed plan" : "Customer seed plan"}
                              sx={{
                                mt: 0.35,
                                height: 20,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                bgcolor: l.seedHint === "MIXED" ? "#f3e5f5" : "#fff3e0",
                                color: l.seedHint === "MIXED" ? "#6a1b9a" : "#e65100",
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={l.packingName}
                            sx={{ bgcolor: c.bg, color: c.text, fontWeight: 700, maxWidth: 160 }}
                          />
                          {l.packingCode ? (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {l.packingCode}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700}>{fmt(l.plantsGap)}</Typography>
                        </TableCell>
                        <TableCell align="right">{fmt(l.conversionFactor, 2)}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700} color={stockOk ? "success.main" : "warning.main"}>
                            {fmt(l.availablePackets, 2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ minWidth: 100 }}>
                          <TextField
                            size="small"
                            type="number"
                            value={l.requestPkts}
                            disabled={saving || !l.included}
                            onChange={(e) =>
                              patchLine(l.id, {
                                requestPkts: e.target.value,
                              })
                            }
                            inputProps={{ min: 0, step: 0.01, style: { textAlign: "right", width: 72 } }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ minWidth: 96 }}>
                          {l.isRaisingRow ? (
                            <Tooltip title="One raising field per subtype (same as card modal)">
                              <TextField
                                size="small"
                                type="number"
                                value={l.raisingPkts}
                                disabled={saving || !l.included}
                                onChange={(e) =>
                                  patchLine(l.id, { raisingPkts: e.target.value })
                                }
                                inputProps={{
                                  min: 0,
                                  step: 0.01,
                                  style: { textAlign: "right", width: 64 },
                                }}
                              />
                            </Tooltip>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ minWidth: 100 }}>
                          <Tooltip title={`Max leftover stock: ${fmt(maxEx, 2)}`}>
                            <TextField
                              size="small"
                              type="number"
                              value={l.excessPkts}
                              disabled={saving || !l.included || maxEx <= 0}
                              onChange={(e) =>
                                patchLine(l.id, {
                                  excessPkts: Math.min(Number(e.target.value) || 0, maxEx),
                                })
                              }
                              inputProps={{
                                min: 0,
                                max: maxEx,
                                step: 0.01,
                                style: { textAlign: "right", width: 64 },
                              }}
                            />
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={800} color={c.text}>
                            {fmt(
                              plants +
                                (l.isRaisingRow
                                  ? (Number(l.raisingPkts) || 0) * (Number(l.conversionFactor) || 1)
                                  : 0)
                            )}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            {saving && (
              <Box mt={2}>
                <Stack direction="row" justifyContent="space-between" mb={0.5}>
                  <Typography variant="caption" fontWeight={700}>
                    Creating requests…
                  </Typography>
                  <Typography variant="caption" fontWeight={700}>
                    {progress.done}/{progress.total}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress.total ? (progress.done / progress.total) * 100 : 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: "#cffafe",
                    "& .MuiLinearProgress-bar": {
                      background: "linear-gradient(90deg, #0891b2, #16a34a)",
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          bgcolor: "#ecfeff",
          borderTop: "1px solid #a5f3fc",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {totals.subtypes} subtypes · {fmt(totals.requestPkts, 2)} pkt · covers ~{fmt(totals.coverPlants)} /{" "}
          {fmt(totals.gapPlants)} plants
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            disabled={saving || included.length === 0}
            onClick={handleConfirmAll}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <MapRoundedIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 900,
              px: 2.5,
              background: "linear-gradient(90deg, #0e7490, #0f766e 50%, #ca8a04)",
              "&:hover": {
                background: "linear-gradient(90deg, #0891b2, #14b8a6 50%, #eab308)",
              },
            }}
          >
            {saving
              ? `Confirming ${progress.done}/${progress.total}…`
              : `Confirm roadmap · ${totals.lines} lines`}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  )
}
