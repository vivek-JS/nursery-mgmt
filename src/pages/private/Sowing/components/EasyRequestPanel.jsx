import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Grid,
  Button,
  Stack,
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Skeleton,
} from "@mui/material"
import RefreshIcon from "@mui/icons-material/Refresh"
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded"
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded"
import MapRoundedIcon from "@mui/icons-material/MapRounded"
import PrintIcon from "@mui/icons-material/Print"
import OrderWiseDrawer from "./OrderWiseDrawer"
import RequestPacketsDialog from "./RequestPacketsDialog"
import SowingRoadmapDialog from "./SowingRoadmapDialog"
import EasyRequestPlantGroup from "./EasyRequestPlantGroup"
import SowingInProgressCard from "./SowingInProgressCard"
import SowingLinkedOrdersDrawer from "./SowingLinkedOrdersDrawer"
import AdminSowEntryDialog from "./AdminSowEntryDialog"
import GapDaysDrawer from "./GapDaysDrawer"
import UnsowedVarietyTab from "./UnsowedVarietyTab"
import { SowHorizonChips, useSowHorizon } from "./SowHorizonContext"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { colorForIndex, fmt, packingsOf } from "./sowingPackingUtils"
import { groupCardsByPlant } from "./easyRequestRowMetrics"
import { printEasyRequestReport } from "./easyRequestPrint"
import { useIsSuperAdmin, useIsOfficeAdmin } from "utils/roleUtils"

export default function EasyRequestPanel({
  canCoverFromStock = false,
  onCoverFromStock = null,
  refreshToken = 0,
  embedded = false,
}) {
  const isSuperAdmin = useIsSuperAdmin()
  const isOfficeAdmin = useIsOfficeAdmin()
  const canEnterSow = isSuperAdmin || isOfficeAdmin
  const { sowHorizonDays } = useSowHorizon()
  const [view, setView] = useState("cards")
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState([])
  const [inProgressCards, setInProgressCards] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadMs, setLoadMs] = useState(null)
  const [drawerCard, setDrawerCard] = useState(null)
  const [drawerRaisingOnly, setDrawerRaisingOnly] = useState(false)
  const [linkedDrawerCard, setLinkedDrawerCard] = useState(null)
  const [requestCtx, setRequestCtx] = useState(null)
  const [roadmapOpen, setRoadmapOpen] = useState(false)
  const [sowEntryCard, setSowEntryCard] = useState(null)
  const [gapCard, setGapCard] = useState(null)
  const [excessSowPrompt, setExcessSowPrompt] = useState(null)

  const load = useCallback(async (force = false) => {
    try {
      setLoading(true)
      const instance = NetworkManager(API.sowing.GET_TODAY_SOWING_CARDS_LITE)
      const res = await instance.request(
        {},
        { days: sowHorizonDays },
        force ? { headers: { "x-sowing-cache-bust": "1" } } : {}
      )
      const body = res?.data
      if (body?.success) {
        setCards(body.requestCards || body.subtypeCards || [])
        setInProgressCards(body.inProgressCards || [])
        setSummary(body.summary || null)
        setLoadMs(body.ms ?? null)
      } else {
        setCards([])
        setInProgressCards([])
      }
    } catch {
      setCards([])
      setInProgressCards([])
    } finally {
      setLoading(false)
    }
  }, [sowHorizonDays])

  useEffect(() => {
    load(false)
  }, [load])

  useEffect(() => {
    if (refreshToken > 0) load(true)
  }, [refreshToken, load])

  const cancelPendingRequest = useCallback(
    async (req, card) => {
      const requestId = req?._id
      if (!requestId) {
        Toast.error("Request id missing")
        return
      }
      const label = req.requestNumber || "this request"
      const plant = card ? `${card.plantName} · ${card.subtypeName}` : ""
      if (
        !window.confirm(
          `Cancel ${label}${plant ? ` (${plant})` : ""}?\n\nYou can create a new request after cancelling.`
        )
      ) {
        return
      }
      try {
        const instance = NetworkManager(API.sowing.CANCEL_SOWING_REQUEST)
        const res = await instance.request(
          { reason: "Cancelled from Easy Request before stock issue" },
          [requestId]
        )
        const msg = res?.message || res?.data?.message || ""
        const ok =
          res?.data?.success ||
          res?.success ||
          /already cancelled/i.test(String(msg))
        if (ok) {
          Toast.success(
            res?.data?.alreadyCancelled || /already cancelled/i.test(String(msg))
              ? `${label} already cancelled — refreshed`
              : `${label} cancelled`
          )
          await load(true)
        } else {
          Toast.error(msg || "Cancel failed")
          await load(true)
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Cancel failed"
        if (/already cancelled/i.test(String(msg))) {
          Toast.success(`${label} already cancelled — refreshed`)
        } else {
          Toast.error(msg)
        }
        await load(true)
      }
    },
    [load]
  )

  const openRequest = async (card, preferredPackings = null, orderRows = [], selectedOrderIds = []) => {
    let rows = orderRows
    let selected = selectedOrderIds
    if (!rows.length && card) {
      try {
        const slotIds = (card.slotIds || card.slots || [])
          .map((s) => (typeof s === "object" ? s._id || s.slotId : s))
          .filter(Boolean)
          .join(",")
        const instance = NetworkManager(API.sowing.GET_ORDER_WISE_SOWING)
        const res = await instance.request(
          {},
          {
            plantId: card.plantId,
            subtypeId: card.subtypeId,
            slotIds,
            days: sowHorizonDays,
          }
        )
        rows = res?.data?.data || []
        selected = rows
          .filter((o) => !o.alreadyRequested)
          .map((o) => String(o.orderId))
      } catch {
        rows = []
      }
    } else if (selected.length) {
      // Drop any already-requested ids if caller passed a stale selection
      const locked = new Set(
        rows.filter((o) => o.alreadyRequested).map((o) => String(o.orderId))
      )
      selected = selected.filter((id) => !locked.has(String(id)))
    }
    const list = Array.isArray(preferredPackings)
      ? preferredPackings
      : preferredPackings
        ? [preferredPackings]
        : null
    setRequestCtx({
      card,
      packings: list,
      orderRows: rows,
      selectedOrderIds: selected,
    })
  }

  const plantsNeeded =
    summary?.totalPlantsNeeded ??
    cards.reduce((s, c) => s + (c.totalPlantsToSowWithBuffer || c.totalGap || 0), 0)
  const plantsStock =
    summary?.totalAvailablePlants ??
    cards.reduce((s, c) => s + (c.availablePlants || 0), 0)
  const totalRaising = cards.reduce(
    (s, c) =>
      s +
      (Number(c.raisingInHandPackets) ||
        Number(c.orderSeedSummary?.raisingInHandPackets) ||
        0),
    0
  )
  const totalRaisingOrders = cards.reduce((s, c) => {
    const n =
      Number(c.raisingOrderCount) ||
      Number(c.orderSeedSummary?.mixedOrderCount) ||
      0
    return s + n
  }, 0)
  const raisingAwaitingCollect = cards.filter((c) => {
    const orders =
      Number(c.raisingOrderCount) ||
      Number(c.orderSeedSummary?.mixedOrderCount) ||
      0
    const pkt =
      Number(c.raisingInHandPackets) ||
      Number(c.orderSeedSummary?.raisingInHandPackets) ||
      0
    return orders > 0 && pkt <= 0
  }).length
  const inProgressCount = inProgressCards.length
  const pendingReqCount = cards.filter(
    (c) =>
      c.requestPending ||
      c.activeRequest?.status === "pending" ||
      c.activeRequest?.status === "processing"
  ).length

  const plantGroups = useMemo(() => groupCardsByPlant(cards), [cards])
  const subtypeTotal = summary?.totalSubtypes || cards.length

  const handlePrint = () => {
    if (!cards.length && !inProgressCards.length) {
      Toast.error("Nothing to print")
      return
    }
    printEasyRequestReport({
      cards,
      inProgressCards,
      summary,
      sowHorizonDays,
    })
  }

  return (
    <Box
      sx={{
        mb: embedded ? 0 : 3,
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #bbf7d0",
        boxShadow: "0 10px 32px rgba(15, 118, 110, 0.12)",
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          background: "linear-gradient(120deg, #0f766e 0%, #15803d 45%, #ca8a04 120%)",
          color: "#fff",
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box>
            <Typography variant="h6" fontWeight={900}>
              Inventory Requests
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.95 }}>
              Company + raising seed · combine packings
              {loadMs != null ? ` · ${loadMs}ms` : ""}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Button
              size="small"
              variant="outlined"
              disableElevation
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              disabled={loading || (!cards.length && !inProgressCards.length)}
              sx={{
                textTransform: "none",
                fontWeight: 800,
                color: "#fff",
                borderColor: "rgba(255,255,255,0.45)",
                "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.12)" },
              }}
            >
              Print
            </Button>
            <Button
              size="small"
              variant="contained"
              disableElevation
              startIcon={<MapRoundedIcon />}
              onClick={() => setRoadmapOpen(true)}
              disabled={loading || cards.length === 0}
              sx={{
                textTransform: "none",
                fontWeight: 900,
                bgcolor: "#fef08a",
                color: "#854d0e",
                "&:hover": { bgcolor: "#fde047" },
              }}
            >
              Sowing roadmap
            </Button>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={view}
              onChange={(_, v) => v && setView(v)}
              sx={{
                bgcolor: "rgba(255,255,255,0.14)",
                "& .MuiToggleButton-root": {
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.28)",
                  textTransform: "none",
                  px: 1.5,
                  "&.Mui-selected": { bgcolor: "rgba(255,255,255,0.28)", color: "#fff" },
                },
              }}
            >
              <ToggleButton value="cards">By plant</ToggleButton>
              <ToggleButton value="variety">By variety</ToggleButton>
              <ToggleButton value="orders">By order</ToggleButton>
            </ToggleButtonGroup>
            <Button
              size="small"
              startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <RefreshIcon />}
              onClick={() => load(true)}
              variant="outlined"
              sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.45)", textTransform: "none" }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={`${subtypeTotal} of ${subtypeTotal} subtypes`}
            sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }}
          />
          <Chip
            size="small"
            icon={<LocalFloristRoundedIcon sx={{ color: "#fff !important" }} />}
            label={`${fmt(plantsNeeded)} plants`}
            sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }}
          />
          <Chip
            size="small"
            icon={<Inventory2RoundedIcon sx={{ color: "#fff !important" }} />}
            label={`~${fmt(plantsStock)} in stock`}
            sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "#fff", fontWeight: 700 }}
          />
          {inProgressCount > 0 && (
            <Chip
              size="small"
              label={`${inProgressCount} sowing in progress`}
              sx={{ bgcolor: "#bfdbfe", color: "#1e40af", fontWeight: 800 }}
            />
          )}
          {pendingReqCount > 0 && (
            <Chip
              size="small"
              label={`${pendingReqCount} request pending`}
              sx={{ bgcolor: "#fde68a", color: "#92400e", fontWeight: 800 }}
            />
          )}
          {totalRaisingOrders > 0 && (
            <Chip
              size="small"
              label={`${totalRaisingOrders} raising orders`}
              sx={{ bgcolor: "#fef08a", color: "#854d0e", fontWeight: 800 }}
            />
          )}
          {totalRaising > 0 ? (
            <Chip
              size="small"
              label={`${fmt(totalRaising, 1)} raising pkt available`}
              sx={{ bgcolor: "#a7f3d0", color: "#065f46", fontWeight: 800 }}
            />
          ) : totalRaisingOrders > 0 ? (
            <Chip
              size="small"
              label={
                raisingAwaitingCollect > 0
                  ? `${raisingAwaitingCollect} awaiting collect`
                  : "Raising pkt not available"
              }
              sx={{ bgcolor: "#fed7aa", color: "#9a3412", fontWeight: 800 }}
            />
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ p: 2, bgcolor: "#f4faf5" }}>
        {!loading && summary && (
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "#fef2f2", border: "1px solid #fecaca" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Due (overdue)
                </Typography>
                <Typography variant="h6" fontWeight={900} color="#b91c1c">
                  {fmt(summary.totalDueGap || 0)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "#fffbeb", border: "1px solid #fde68a" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Today
                </Typography>
                <Typography variant="h6" fontWeight={900} color="#b45309">
                  {fmt(summary.totalTodayGap || 0)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Plants to sow
                </Typography>
                <Typography variant="h6" fontWeight={900} color="#15803d">
                  {fmt(summary.totalPlantsNeeded || plantsNeeded)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: "#eff6ff", border: "1px solid #bfdbfe" }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Sowing in progress
                </Typography>
                <Typography variant="h6" fontWeight={900} color="#1d4ed8">
                  {inProgressCount}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}
        {loading ? (
          <Stack spacing={1.5}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 3 }} />
            ))}
          </Stack>
        ) : (
          <Stack spacing={2.5}>
            {/* Inventory Requests — plant-grouped table */}
            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                mb={1.25}
                flexWrap="wrap"
                useFlexGap
                gap={1}
              >
                <Box>
                  <Typography fontWeight={900} fontSize="1.05rem" color="#14532d">
                    Inventory Requests
                  </Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    Sow window: overdue + today
                    {sowHorizonDays > 0 ? ` through +${sowHorizonDays}d` : ""}
                    {" · "}combine orders across selected days
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
                  <SowHorizonChips disabled={loading} onReselect={() => load(true)} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ ml: 0.5 }}>
                    {subtypeTotal} subtypes
                  </Typography>
                </Stack>
              </Stack>
              {cards.length > 0 ? (
              view === "cards" ? (
                <Stack spacing={2}>
                  {plantGroups.map((group) => (
                    <EasyRequestPlantGroup
                      key={String(group.plantId || group.plantName)}
                      group={group}
                      onOrders={(card) => {
                        setDrawerRaisingOnly(false)
                        setDrawerCard(card)
                      }}
                      onRaisingOrders={(card) => {
                        setDrawerRaisingOnly(true)
                        setDrawerCard(card)
                      }}
                      onRequest={(card, packs) => openRequest(card, packs)}
                      onCancelRequest={cancelPendingRequest}
                      onGapClick={(c) => setGapCard(c)}
                      onRowClick={(card) => {
                        const req = card.activeRequest || card.pendingRequest
                        if (req) {
                          setLinkedDrawerCard(card)
                        } else {
                          setDrawerRaisingOnly(false)
                          setDrawerCard(card)
                        }
                      }}
                    />
                  ))}
                </Stack>
              ) : view === "variety" ? (
                <UnsowedVarietyTab
                  cards={cards}
                  onOrders={(card) => {
                    setDrawerRaisingOnly(false)
                    setDrawerCard(card)
                  }}
                  onRequest={(card, packs) => openRequest(card, packs)}
                  onGapClick={(c) => setGapCard(c)}
                />
              ) : (
                <Stack spacing={1}>
                  {cards.map((card, idx) => {
                    const packs = packingsOf(card)
                    const open = packs.filter((p) => !p.pendingRequest && !p.activeRequest)
                    const c = colorForIndex(idx)
                    const raising =
                      Number(card.raisingInHandPackets) ||
                      Number(card.orderSeedSummary?.raisingInHandPackets) ||
                      0
                    const raisingOrders =
                      Number(card.raisingOrderCount) ||
                      Number(card.orderSeedSummary?.mixedOrderCount) ||
                      0
                    const raisingAvailable = raising > 0
                    const requestPending =
                      Boolean(card.requestPending) ||
                      card.activeRequest?.status === "pending" ||
                      card.activeRequest?.status === "processing"
                    return (
                      <Box
                        key={`ord-${card.plantId}-${card.subtypeId}`}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: `1.5px solid ${
                            requestPending
                              ? "#fcd34d"
                              : raisingAvailable
                                ? "#6ee7b7"
                                : c.border
                          }`,
                          bgcolor: requestPending
                            ? "#fffbeb"
                            : raisingAvailable
                              ? "#ecfdf5"
                              : c.bg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1.5,
                          flexWrap: "wrap",
                        }}
                      >
                        <Box>
                          <Typography fontWeight={800} color={c.text}>
                            {card.plantName} · {card.subtypeName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            {fmt(card.totalPlantsToSowWithBuffer || card.totalGap)} plants · co{" "}
                            {fmt(card.availablePackets, 1)} pkt
                            {raisingOrders > 0
                              ? raisingAvailable
                                ? ` · raising ${fmt(raising, 1)} pkt`
                                : " · raising not collected"
                              : ""}
                          </Typography>
                        </Box>
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            onClick={() => {
                              setDrawerRaisingOnly(false)
                              setDrawerCard(card)
                            }}
                            sx={{ textTransform: "none" }}
                          >
                            Orders
                          </Button>
                          {open.length > 0 && (
                            <Button
                              size="small"
                              variant="contained"
                              disableElevation
                              onClick={() => openRequest(card, open)}
                              sx={{ textTransform: "none", fontWeight: 800, bgcolor: c.bar }}
                            >
                              {open.length > 1 ? "Combine" : "Request"}
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    )
                  })}
                </Stack>
              )
              ) : cards.length === 0 && inProgressCards.length === 0 ? (
                <Alert severity="info" sx={{ py: 0.5 }}>
                  No gaps in this sow window — try +1d…+7d to include upcoming sow-by dates.
                </Alert>
              ) : (
                <Alert severity="success" sx={{ py: 0.5 }}>
                  Nothing to request — open gaps are covered.
                </Alert>
              )}
            </Box>

            {/* Always show accepted / issued sowing-in-progress cards */}
            {inProgressCards.length > 0 && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2.5,
                  bgcolor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} mb={1.25}>
                  <Typography fontWeight={900} fontSize="0.95rem" color="#1d4ed8">
                    Sowing in progress
                  </Typography>
                  <Chip
                    size="small"
                    label={`${inProgressCards.length}`}
                    sx={{ height: 22, fontWeight: 800, bgcolor: "#2563eb", color: "#fff" }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block" mb={1.25}>
                  Stock issued — no new packet request needed until primary sowing completes.
                </Typography>
                <Grid container spacing={1.5}>
                  {inProgressCards.map((card) => (
                    <Grid
                      item
                      xs={12}
                      sm={6}
                      md={4}
                      key={`prog-${card.plantId}-${card.subtypeId}-${card.activeRequest?._id || ""}`}
                    >
                      <SowingInProgressCard
                        card={card}
                        onClick={() => setLinkedDrawerCard(card)}
                        showEnterSow={canEnterSow}
                        onEnterSow={(c) => setSowEntryCard(c)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

          </Stack>
        )}
      </Box>

      <SowingLinkedOrdersDrawer
        open={Boolean(linkedDrawerCard)}
        onClose={() => setLinkedDrawerCard(null)}
        card={linkedDrawerCard}
        canCoverFromStock={canCoverFromStock}
        onCoverOrder={
          canCoverFromStock && onCoverFromStock
            ? (orderMongoId) =>
                onCoverFromStock({
                  orderMongoId,
                  plantId: linkedDrawerCard?.plantId,
                  subtypeId: linkedDrawerCard?.subtypeId,
                })
            : undefined
        }
      />

      <OrderWiseDrawer
        open={Boolean(drawerCard)}
        onClose={() => {
          setDrawerCard(null)
          setDrawerRaisingOnly(false)
        }}
        card={drawerCard}
        raisingOnly={drawerRaisingOnly}
        onRequestPackets={(orderRows, selectedOrderIds) => {
          const packs = packingsOf(drawerCard).filter((p) => !p.pendingRequest && !p.activeRequest)
          openRequest(drawerCard, packs, orderRows, selectedOrderIds)
          setDrawerCard(null)
          setDrawerRaisingOnly(false)
        }}
      />

      {requestCtx && (
        <RequestPacketsDialog
          open={Boolean(requestCtx)}
          onClose={() => setRequestCtx(null)}
          card={requestCtx.card}
          initialPackings={requestCtx.packings}
          orderRows={requestCtx.orderRows}
          selectedOrderIds={requestCtx.selectedOrderIds}
          onSuccess={() => load(true)}
        />
      )}

      <SowingRoadmapDialog
        open={roadmapOpen}
        onClose={() => setRoadmapOpen(false)}
        cards={cards}
        onSuccess={() => load(true)}
      />

      <AdminSowEntryDialog
        open={Boolean(sowEntryCard)}
        card={sowEntryCard}
        request={sowEntryCard?.activeRequest || sowEntryCard?.pendingRequest}
        onClose={() => setSowEntryCard(null)}
        onSuccess={(res) => {
          load(true)
          const d = res?.data
          if (d?.suggestCoverFromStock && Number(d?.excessPlants) > 0) {
            setExcessSowPrompt({
              excessPlants: d.excessPlants,
              uncoveredLinkedOrders: d.uncoveredLinkedOrders || [],
              plantId: sowEntryCard?.plantId,
              subtypeId: sowEntryCard?.subtypeId,
            })
          }
        }}
      />

      {excessSowPrompt && canCoverFromStock && onCoverFromStock && (
        <Alert
          severity="success"
          sx={{ mx: 2, mb: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => {
                const first = excessSowPrompt.uncoveredLinkedOrders?.[0]
                onCoverFromStock({
                  orderMongoId: first?.orderMongoId || null,
                  plantId: excessSowPrompt.plantId,
                  subtypeId: excessSowPrompt.subtypeId,
                })
                setExcessSowPrompt(null)
              }}
              sx={{ fontWeight: 800, textTransform: "none" }}
            >
              Cover from stock
            </Button>
          }
        >
          Sowing complete with {Number(excessSowPrompt.excessPlants).toLocaleString("en-IN")}{" "}
          excess plants available.
          {excessSowPrompt.uncoveredLinkedOrders?.length
            ? ` ${excessSowPrompt.uncoveredLinkedOrders.length} linked order(s) still need cover.`
            : " Assign to pending orders when ready."}
        </Alert>
      )}

      <GapDaysDrawer
        open={Boolean(gapCard)}
        card={gapCard}
        onClose={() => setGapCard(null)}
      />
    </Box>
  )
}
