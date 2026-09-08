import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Skeleton,
  Typography,
} from "@mui/material"
import {
  ExpandLess,
  ExpandMore,
  TrendingDown,
  Inventory2Outlined,
  LocalFloristOutlined,
} from "@mui/icons-material"
import { NetworkManager, API } from "network/core"
import SowingGapSubtypeDialog from "./SowingGapSubtypeDialog"
import { groupSlotsByMonth, rollupSlotsByMonth } from "./sowingGapMonthRollup"

const fmt = (n) => (Number(n) || 0).toLocaleString("en-IN")

function ExcessGapPair({ gap, excess, compact = false }) {
  return (
    <Box display="flex" gap={compact ? 1 : 1.25} flexWrap="wrap" justifyContent="flex-end">
      {excess > 0 ? (
        <Box
          sx={{
            px: compact ? 1 : 1.25,
            py: compact ? 0.5 : 0.65,
            borderRadius: 2,
            border: "1px solid #6ee7b7",
            bgcolor: "#ecfdf5",
            minWidth: compact ? 84 : 100,
          }}>
          <Typography sx={{ fontSize: compact ? 9 : 10, fontWeight: 700, color: "#047857" }}>
            Excess
          </Typography>
          <Typography sx={{ fontSize: compact ? 13 : 15, fontWeight: 800, color: "#047857" }}>
            {fmt(excess)}
          </Typography>
        </Box>
      ) : null}
      {gap > 0 ? (
        <Box
          sx={{
            px: compact ? 1 : 1.25,
            py: compact ? 0.5 : 0.65,
            borderRadius: 2,
            border: "1px solid #fdba74",
            bgcolor: "#fff7ed",
            minWidth: compact ? 84 : 100,
          }}>
          <Typography sx={{ fontSize: compact ? 9 : 10, fontWeight: 700, color: "#c2410c" }}>
            Gap
          </Typography>
          <Typography sx={{ fontSize: compact ? 13 : 15, fontWeight: 800, color: "#c2410c" }}>
            {fmt(gap)}
          </Typography>
        </Box>
      ) : null}
    </Box>
  )
}

function computeSubtypeMetrics(subtype) {
  const slots = Array.isArray(subtype?.slots) ? subtype.slots : []
  if (slots.length > 0) {
    const gapToCover = slots.reduce(
      (sum, slot) => sum + Math.max(0, Number(slot.slotGap) || 0),
      0
    )
    const excessAvailable = slots.reduce(
      (sum, slot) => sum + Math.max(0, Number(slot.excessAvailableForBooking) || 0),
      0
    )
    return { gapToCover, excessAvailable, slotCount: slots.length }
  }

  const gapToCover = Math.max(
    0,
    Number(subtype.totalBookingGapRaw ?? subtype.baseSowingQty ?? subtype.totalBookingGap) || 0
  )
  const excessAvailable = Math.max(0, Number(subtype.totalAvailableGap) || 0)
  return {
    gapToCover,
    excessAvailable,
    slotCount: Number(subtype.slotCount) || 0,
  }
}

function buildOverviewRows(plants) {
  const rows = []
  for (const plant of plants || []) {
    const subtypes = []
    for (const subtype of plant.subtypes || []) {
      const metrics = computeSubtypeMetrics(subtype)
      if (metrics.gapToCover <= 0 && metrics.excessAvailable <= 0) continue
      subtypes.push({
        id: subtype._id,
        name: subtype.subtypeName || "Unknown",
        slots: subtype.slots || [],
        months: groupSlotsByMonth(subtype.slots || []),
        monthBreakdown: rollupSlotsByMonth(subtype.slots || []),
        ...metrics,
        overdueSlotCount: subtype.overdueSlotCount || 0,
      })
    }
    if (!subtypes.length) continue
    subtypes.sort(
      (a, b) => b.gapToCover + b.excessAvailable - (a.gapToCover + a.excessAvailable)
    )
    rows.push({
      plantId: plant._id,
      plantName: plant.plantName,
      subtypes,
      gapToCover: subtypes.reduce((s, st) => s + st.gapToCover, 0),
      excessAvailable: subtypes.reduce((s, st) => s + st.excessAvailable, 0),
    })
  }
  rows.sort(
    (a, b) => b.gapToCover + b.excessAvailable - (a.gapToCover + a.excessAvailable)
  )
  return rows
}

export default function SowingGapOverviewPanel({ refreshToken = 0 }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [plants, setPlants] = useState([])
  const [expanded, setExpanded] = useState(() => new Set())
  const [expandedMonths, setExpandedMonths] = useState(() => new Set())
  const [subtypeDialog, setSubtypeDialog] = useState(null)
  const year = new Date().getFullYear()

  const fetchOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const instance = NetworkManager(API.sowing.GET_PLANTS_GAP_SUMMARY)
      const response = await instance.request(
        {},
        { board: "true", includeEmpty: "false", fullMonth: "true", _t: Date.now() }
      )
      if (response?.data?.success) {
        setPlants(response.data.plants || [])
      } else {
        setError("Could not load sowing overview")
        setPlants([])
      }
    } catch (err) {
      console.error("[SowingGapOverviewPanel]", err)
      setError("Could not load sowing overview")
      setPlants([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()
  }, [fetchOverview, refreshToken])

  const rows = useMemo(() => buildOverviewRows(plants), [plants])

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          gapToCover: acc.gapToCover + row.gapToCover,
          excessAvailable: acc.excessAvailable + row.excessAvailable,
          plantCount: acc.plantCount + 1,
          subtypeCount: acc.subtypeCount + row.subtypes.length,
        }),
        { gapToCover: 0, excessAvailable: 0, plantCount: 0, subtypeCount: 0 }
      ),
    [rows]
  )

  const togglePlant = (plantId) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(plantId)) next.delete(plantId)
      else next.add(plantId)
      return next
    })
  }

  const toggleMonth = (monthKey) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(monthKey)) next.delete(monthKey)
      else next.add(monthKey)
      return next
    })
  }

  const openSubtypeDialog = (plant, subtype) => {
    setSubtypeDialog({
      plantId: plant.plantId,
      plantName: plant.plantName,
      subtypeId: subtype.id,
      subtypeName: subtype.name,
      gapToCover: subtype.gapToCover,
      excessAvailable: subtype.excessAvailable,
      slots: subtype.slots || [],
    })
  }

  if (loading) {
    return (
      <Card sx={{ mb: 3, borderRadius: 3, overflow: "hidden" }}>
        <CardContent>
          <Skeleton height={28} width="40%" />
          <Skeleton height={64} sx={{ mt: 2 }} />
          <Skeleton height={48} sx={{ mt: 1 }} />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card sx={{ mb: 3, borderRadius: 3, border: "1px solid #fecaca", bgcolor: "#fef2f2" }}>
        <CardContent>
          <Typography color="error" fontWeight={600}>
            {error}
          </Typography>
        </CardContent>
      </Card>
    )
  }

  if (!rows.length) {
    return (
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #ffffff 100%)",
          border: "1px solid #bbf7d0",
        }}>
        <CardContent sx={{ py: 2.5 }}>
          <Typography fontWeight={700} color="#166534">
            All caught up — no sowing gap or excess stock to show right now.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      sx={{
        mb: 3,
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
        boxShadow: "0 8px 32px rgba(15, 118, 110, 0.08)",
        background: "linear-gradient(160deg, #f0fdfa 0%, #ffffff 45%, #fffbeb 100%)",
      }}>
      <Box
        sx={{
          px: { xs: 2, md: 2.5 },
          py: 2,
          borderBottom: "1px solid rgba(15, 118, 110, 0.12)",
          background: "linear-gradient(90deg, rgba(15,118,110,0.06) 0%, transparent 100%)",
        }}>
        <Box display="flex" flexWrap="wrap" alignItems="flex-start" justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="overline" sx={{ color: "#0f766e", fontWeight: 800, letterSpacing: 1.2 }}>
              Plant → month → slot
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#134e4a", lineHeight: 1.25 }}>
              Excess & gap to cover
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Excess = sowed − booking cover · Gap = pipeline orders not sowed · {totals.plantCount} plant
              {totals.plantCount === 1 ? "" : "s"}
            </Typography>
          </Box>

          <Box display="flex" flexWrap="wrap" gap={1.25}>
            {totals.excessAvailable > 0 ? (
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 2.5,
                  bgcolor: "#ecfdf5",
                  border: "1px solid #6ee7b7",
                  minWidth: 140,
                }}>
                <Box display="flex" alignItems="center" gap={0.75} mb={0.25}>
                  <Inventory2Outlined sx={{ fontSize: 18, color: "#059669" }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#047857" }}>
                    Excess available
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 22, fontWeight: 900, color: "#065f46", lineHeight: 1 }}>
                  {fmt(totals.excessAvailable)}
                </Typography>
              </Box>
            ) : null}
            {totals.gapToCover > 0 ? (
              <Box
                sx={{
                  px: 2,
                  py: 1.25,
                  borderRadius: 2.5,
                  bgcolor: "#fff7ed",
                  border: "1px solid #fdba74",
                  minWidth: 140,
                }}>
                <Box display="flex" alignItems="center" gap={0.75} mb={0.25}>
                  <TrendingDown sx={{ fontSize: 18, color: "#ea580c" }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: "#c2410c" }}>
                    Gap to cover
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 22, fontWeight: 900, color: "#9a3412", lineHeight: 1 }}>
                  {fmt(totals.gapToCover)}
                </Typography>
              </Box>
            ) : null}
          </Box>
        </Box>
      </Box>

      <CardContent sx={{ p: { xs: 1.5, md: 2 }, pt: 1.5 }}>
        <Box display="flex" flexDirection="column" gap={1.25}>
          {rows.map((plant) => {
            const isOpen = expanded.has(plant.plantId)
            return (
              <Box
                key={plant.plantId}
                sx={{
                  borderRadius: 2.5,
                  border: "1px solid #e2e8f0",
                  bgcolor: "rgba(255,255,255,0.85)",
                  overflow: "hidden",
                }}>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "rgba(240,253,250,0.8)" },
                  }}
                  onClick={() => togglePlant(plant.plantId)}>
                  <LocalFloristOutlined sx={{ color: "#0f766e", fontSize: 22 }} />
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={800} color="#0f172a" noWrap>
                      {plant.plantName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {plant.subtypes.length} subtype{plant.subtypes.length === 1 ? "" : "s"}
                    </Typography>
                  </Box>
                  <ExcessGapPair gap={plant.gapToCover} excess={plant.excessAvailable} />
                  <IconButton size="small" aria-label={isOpen ? "Collapse" : "Expand"}>
                    {isOpen ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>

                <Collapse in={isOpen}>
                  <Box sx={{ px: 1.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
                    {plant.subtypes.map((subtype) => (
                      <Box
                        key={subtype.id}
                        sx={{
                          borderRadius: 2,
                          border: "1px solid #f1f5f9",
                          bgcolor: "#fafafa",
                          overflow: "hidden",
                        }}>
                        <Box
                          role="button"
                          tabIndex={0}
                          onClick={() => openSubtypeDialog(plant, subtype)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              openSubtypeDialog(plant, subtype)
                            }
                          }}
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 1.25,
                            px: 1.25,
                            py: 1,
                            cursor: "pointer",
                            "&:hover": { bgcolor: "#f0fdfa" },
                          }}>
                          <Box flex={1} minWidth={120}>
                            <Typography fontWeight={700} fontSize={14} color="#334155">
                              {subtype.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {subtype.months.length} month
                              {subtype.months.length === 1 ? "" : "s"} · tap full view
                            </Typography>
                          </Box>
                          <ExcessGapPair
                            gap={subtype.gapToCover}
                            excess={subtype.excessAvailable}
                            compact
                          />
                        </Box>

                        {subtype.months.map((month) => {
                          const monthKey = `${subtype.id}-${month.key}`
                          const monthOpen = expandedMonths.has(monthKey)
                          return (
                            <Box key={monthKey} sx={{ borderTop: "1px solid #e2e8f0" }}>
                              <Box
                                display="flex"
                                alignItems="center"
                                gap={1}
                                sx={{
                                  px: 1.25,
                                  py: 0.85,
                                  cursor: "pointer",
                                  bgcolor: "#fff",
                                  "&:hover": { bgcolor: "#f8fafc" },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleMonth(monthKey)
                                }}>
                                <Box flex={1}>
                                  <Typography fontWeight={700} fontSize={13}>
                                    {month.label}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {month.slots.length} slot
                                    {month.slots.length === 1 ? "" : "s"}
                                  </Typography>
                                </Box>
                                <ExcessGapPair gap={month.gap} excess={month.excess} compact />
                                <IconButton size="small">
                                  {monthOpen ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                </IconButton>
                              </Box>
                              <Collapse in={monthOpen}>
                                <Box sx={{ px: 1.25, pb: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
                                  {month.slots.map((slot) => (
                                    <Box
                                      key={slot.id}
                                      display="flex"
                                      alignItems="center"
                                      gap={1}
                                      sx={{
                                        px: 1,
                                        py: 0.65,
                                        borderRadius: 1.5,
                                        bgcolor: "#f8fafc",
                                        border: "1px solid #f1f5f9",
                                      }}>
                                      <Box flex={1} minWidth={0}>
                                        <Typography fontWeight={600} fontSize={12} noWrap>
                                          {slot.label}
                                        </Typography>
                                        {slot.overdue ? (
                                          <Typography variant="caption" sx={{ color: "#dc2626", fontWeight: 700 }}>
                                            Overdue
                                          </Typography>
                                        ) : null}
                                      </Box>
                                      <ExcessGapPair gap={slot.gap} excess={slot.excess} compact />
                                    </Box>
                                  ))}
                                </Box>
                              </Collapse>
                            </Box>
                          )
                        })}
                      </Box>
                    ))}
                  </Box>
                </Collapse>
              </Box>
            )
          })}
        </Box>
      </CardContent>

      <SowingGapSubtypeDialog
        open={Boolean(subtypeDialog)}
        onClose={() => setSubtypeDialog(null)}
        selection={subtypeDialog}
        year={year}
      />
    </Card>
  )
}
