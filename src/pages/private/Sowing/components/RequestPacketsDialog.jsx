import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Chip,
} from "@mui/material"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import RaisingIntakeModal from "./RaisingIntakeModal"
import RequestPacketsStats from "./RequestPacketsStats"
import RequestPacketsLinkedStock from "./RequestPacketsLinkedStock"
import RequestPacketsStockUpdateDialog from "./RequestPacketsStockUpdateDialog"
import RequestPacketsExtras from "./RequestPacketsExtras"
import {
  buildSelectedOrderRequestScope,
  computeRequestPlantsGap,
  distributePackets,
  fmt,
  packKey,
  packingIsRequestable,
  packingStockPlants,
  packingsOf,
  pickPackingsForGap,
  plantsFromAlloc,
  plantsPerPacket,
} from "./sowingPackingUtils"

const neutral = {
  border: "1px solid #e5e7eb",
  sectionBg: "#f9fafb",
  radius: 1.5,
}

export default function RequestPacketsDialog({
  open,
  onClose,
  card,
  initialPackings = null,
  orderRows = [],
  selectedOrderIds = [],
  onSuccess,
  onCardReload,
}) {
  const cardPackings = useMemo(() => packingsOf(card), [card])
  const [allPackings, setAllPackings] = useState(cardPackings)
  useEffect(() => {
    setAllPackings(cardPackings)
  }, [cardPackings, open])
  const selectable = useMemo(
    () => allPackings.filter(packingIsRequestable),
    [allPackings]
  )
  const [selectedKeys, setSelectedKeys] = useState([])
  const [alloc, setAlloc] = useState({}) // packKey → company packets for gap
  const [excessPkts, setExcessPkts] = useState("0")
  const [raisingPkts, setRaisingPkts] = useState("0")
  const [notes, setNotes] = useState("")
  const [intakeIds, setIntakeIds] = useState([])
  const [attachedIntakes, setAttachedIntakes] = useState([])
  const [showRaising, setShowRaising] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showOtherPackings, setShowOtherPackings] = useState(false)
  const [shortStock, setShortStock] = useState(null)
  const packingPickLocked = useRef(false)
  const multi = selectable.length > 1

  const requestPool = useMemo(() => {
    const prefer = (initialPackings || []).filter(packingIsRequestable)
    return prefer.length ? prefer : selectable
  }, [initialPackings, selectable])

  const selectedPackings = useMemo(
    () => selectable.filter((p) => selectedKeys.includes(packKey(p))),
    [selectable, selectedKeys]
  )

  const firstCfSelected =
    plantsPerPacket(selectedPackings[0]) || plantsPerPacket(card) || 1
  const raisingNum = parseFloat(raisingPkts) || 0
  const requestScope = useMemo(
    () =>
      buildSelectedOrderRequestScope(card, orderRows, selectedOrderIds),
    [card, orderRows, selectedOrderIds]
  )
  const selectedRows = requestScope.selectedRows
  const scopedRaisingIntakes = useMemo(
    () =>
      selectedRows.flatMap((row) =>
        (row.raisingIntakes || []).map((intake) => ({
          ...intake,
          orderId: row.orderId,
          farmerName: row.farmerName,
        }))
      ),
    [selectedRows]
  )
  const gapMetrics = useMemo(
    () =>
      computeRequestPlantsGap({
        card: requestScope.gapCard,
        raisingPackets: raisingNum,
        conversionFactor: firstCfSelected,
      }),
    [requestScope.gapCard, raisingNum, firstCfSelected]
  )
  const plantsGap = gapMetrics.requestGap
  const companyPlantsTarget = gapMetrics.companyBuffered

  const planRaising = useMemo(() => {
    const inHandFromOrders = selectedRows.reduce((s, o) => {
      const collected = Boolean(
        o?.raisingCollected ||
          o?.sowingPlan?.raisingIntakeCollected ||
          o?.sowingPlan?.raisingIntakeId ||
          Number(o?.raisingInHandPackets) > 0
      )
      if (!collected) return s
      return s + (Number(o.raisingInHandPackets) || 0)
    }, 0)
    // When explicit orders are supplied, never borrow raising stock from
    // unselected orders via the card-level aggregate.
    if (orderRows.length > 0) return inHandFromOrders
    return (
      Number(card?.raisingInHandPackets) ||
      Number(card?.orderSeedSummary?.raisingInHandPackets) ||
      0
    )
  }, [orderRows, selectedRows, card])

  const applyDistribution = (keys, mode = "stockFirst") => {
    const packs = selectable.filter((p) => keys.includes(packKey(p)))
    setAlloc(distributePackets(companyPlantsTarget, packs, mode))
  }

  const applyAutoPick = (raisingPackets = Number(raisingPkts) || 0) => {
    const ranked = [...requestPool].sort(
      (a, b) => packingStockPlants(b) - packingStockPlants(a)
    )
    const preview = computeRequestPlantsGap({
      card: requestScope.gapCard,
      raisingPackets,
      conversionFactor: plantsPerPacket(ranked[0]) || plantsPerPacket(card) || 1,
    })
    const picked = pickPackingsForGap(preview.companyBuffered, requestPool)
    const use = picked.length ? picked : requestPool.slice(0, 1)
    const keys = use.map(packKey)
    setSelectedKeys((prev) =>
      prev.length === keys.length && prev.every((k, i) => k === keys[i]) ? prev : keys
    )
    setAlloc(distributePackets(preview.companyBuffered, use, "stockFirst"))
  }

  useEffect(() => {
    if (!open) return
    packingPickLocked.current = false
    setShowOtherPackings(false)
    const raisingStart = Number((planRaising || 0).toFixed(2))
    setRaisingPkts(String(raisingStart))
    setExcessPkts("0")
    setNotes("")
    setIntakeIds(scopedRaisingIntakes.map((intake) => intake._id).filter(Boolean))
    setAttachedIntakes(scopedRaisingIntakes)
    applyAutoPick(raisingStart)
  }, [open, card?.plantId, card?.subtypeId, selectedOrderIds.join("|")])

  useEffect(() => {
    if (!open || packingPickLocked.current) return
    applyAutoPick(Number(raisingPkts) || 0)
  }, [raisingPkts])

  useEffect(() => {
    if (!open || !packingPickLocked.current || selectedKeys.length === 0) return
    applyDistribution(selectedKeys, "stockFirst")
  }, [companyPlantsTarget])

  const togglePacking = (key) => {
    packingPickLocked.current = true
    setShowOtherPackings(true)
    setSelectedKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      if (next.length === 0) return prev
      const packs = selectable.filter((p) => next.includes(packKey(p)))
      setAlloc(distributePackets(companyPlantsTarget, packs, "stockFirst"))
      return next
    })
  }

  const setPackAlloc = (key, value) => {
    setAlloc((prev) => ({ ...prev, [key]: value }))
  }

  const companyPlants = plantsFromAlloc(selectedPackings, alloc)
  const raising = raisingNum
  const raisingPlants = gapMetrics.raisingPlants
  const coveredPlants = companyPlants + raisingPlants
  const gapLeft = Math.max(0, plantsGap - coveredPlants)

  // Excess is added to first packing → cap by that packing's leftover stock only
  const firstPacking = selectedPackings[0]
  const firstAlloc = Number(alloc[packKey(firstPacking)]) || 0
  const firstAvail = Number(firstPacking?.availablePackets) || 0
  const maxExcess = Number(Math.max(0, firstAvail - firstAlloc).toFixed(2))
  const excessRaw = Math.max(0, parseFloat(excessPkts) || 0)
  const excess = Math.min(excessRaw, maxExcess)

  // Keep excess field clamped when alloc/stock room shrinks
  useEffect(() => {
    if (!open) return
    if (excessRaw > maxExcess) {
      setExcessPkts(String(maxExcess))
    }
  }, [open, excessRaw, maxExcess])

  // Excess packets go to first selected packing (company)
  const totalCompanyPkts =
    selectedPackings.reduce((s, p) => s + (Number(alloc[packKey(p)]) || 0), 0) + excess
  const totalPkts = totalCompanyPkts + raising

  const seedSource =
    raising > 0 && totalCompanyPkts > 0 ? "MIXED" : raising > 0 ? "RAISING" : "COMPANY"

  const coverPct =
    plantsGap > 0 ? Math.min(100, Math.round((coveredPlants / plantsGap) * 100)) : 100

  const setExcessClamped = (value) => {
    const n = Math.max(0, Number(value) || 0)
    setExcessPkts(String(Number(Math.min(n, maxExcess).toFixed(2))))
  }

  const bumpExcess = (delta) => {
    setExcessClamped(excess + delta)
  }

  const handleSubmit = async (directIssue = false) => {
    if (selectedPackings.length === 0) {
      Toast.error("Select at least one packing")
      return
    }
    const lines = selectedPackings
      .map((p, idx) => {
        const key = packKey(p)
        let company = Number(alloc[key]) || 0
        if (idx === 0) company += excess
        const raise = idx === 0 ? raising : 0
        return { packing: p, company, raise, total: company + raise }
      })
      .filter((l) => l.total > 0)

    if (!lines.length) {
      Toast.error("Enter packets for at least one packing")
      return
    }
    if (lines.length > 1) {
      Toast.error("Only one product can be requested. Keep a single packing.")
      return
    }

    const line = lines[0]
    const packingStock = Number(line.packing.availablePackets) || 0
    if (line.company > packingStock + 0.001 && line.packing.productId) {
      setShortStock({
        packing: line.packing,
        shortfall: line.company - packingStock,
      })
      Toast.error("Packets exceed stock — add stock on the packing, then request")
      return
    }

    try {
      setSaving(true)
      if (orderRows.length > 0 && requestScope.linkedOrderIds.length === 0) {
        Toast.error(
          "All selected orders were already requested. Cannot request again for the same order."
        )
        return
      }

      const cf = plantsPerPacket(line.packing)
      const packetsNeeded = Number((plantsGap / cf).toFixed(2))
      const source =
        line.raise > 0 && line.company > 0
          ? "MIXED"
          : line.raise > 0
            ? "RAISING"
            : "COMPANY"
      const noteParts = [
        directIssue ? "Direct sowing request" : "Request packets",
        line.packing.name || line.packing.code || "Seed",
        `1 pkt ≈ ${cf} plants`,
        `gap ${plantsGap} plants`,
        notes || null,
      ].filter(Boolean)

      const body = {
        plantId: card.plantId,
        subtypeId: card.subtypeId,
        packetsNeeded,
        packetsRequested: line.total,
        packetsFromCompany: line.company,
        packetsFromRaising: line.raise,
        seedSource: source,
        raisingIntakeIds: line.raise > 0 ? intakeIds : [],
        linkedOrderIds: requestScope.linkedOrderIds,
        slotIds: requestScope.slotIds,
        notes: noteParts.join(" · "),
        directIssue: Boolean(directIssue),
      }
      if (line.packing.productId) body.productId = line.packing.productId

      const instance = NetworkManager(API.sowing.CREATE_SOWING_REQUEST)
      const res = await instance.request(body)
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || `Failed for ${line.packing.name}`)
      }
      const created = res.data.data
      Toast.success(
        directIssue
          ? `Request ${created.requestNumber} issued — use Enter sow when sowing`
          : `Request ${created.requestNumber} created`
      )
      onSuccess?.([created])
      onClose?.()
    } catch (e) {
      Toast.error(e?.response?.data?.message || e.message || "Request failed")
    } finally {
      setSaving(false)
    }
  }

  const bufferPct = Number(card?.sowingBuffer) || gapMetrics.bufferPct || 0
  const mortalityPct = Number(card?.sowingMortality) || 10
  const orderCount =
    requestScope.linkedOrderIds?.length ||
    selectedRows.length ||
    Number(card?.orderCount) ||
    0

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2, border: neutral.border },
        }}
      >
        <DialogTitle sx={{ pb: 1.5, borderBottom: neutral.border }}>
          <Typography fontWeight={600} fontSize="1.1rem" color="text.primary">
            Request packets
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {card?.plantName} · {card?.subtypeName}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5}>
            <RequestPacketsStats
              orderCount={orderCount}
              rawPlants={gapMetrics.rawTotal}
              bufferPct={bufferPct}
              mortalityPct={mortalityPct}
              packets={totalPkts}
              coveredPlants={coveredPlants}
              gapLeft={gapLeft}
              plantsGap={plantsGap}
              coverPct={coverPct}
              seedSource={seedSource}
              companyPackets={totalCompanyPkts}
              raisingPackets={raising}
              fmt={fmt}
            />

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5} gap={1}>
                <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                  {selectedPackings.length > 1 ? "Packings" : "Packing"}
                </Typography>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Button
                    size="small"
                    variant="contained"
                    disableElevation
                    disabled={saving || selectedPackings.length === 0}
                    onClick={() => handleSubmit(true)}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Create sowing request
                  </Button>
                  {multi && (
                    <Stack direction="row" spacing={0.75}>
                      <Chip
                        size="small"
                        variant="outlined"
                        label="Stock first"
                        clickable
                        onClick={() => {
                          packingPickLocked.current = false
                          applyAutoPick(Number(raisingPkts) || 0)
                        }}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label="Select all"
                        clickable
                        onClick={() => {
                          packingPickLocked.current = true
                          setShowOtherPackings(true)
                          const keys = selectable.map(packKey)
                          setSelectedKeys(keys)
                          applyDistribution(keys, "stockFirst")
                        }}
                      />
                    </Stack>
                  )}
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Request first. Enter sow is a separate step after stock is issued.
              </Typography>
              <RequestPacketsLinkedStock
                card={card}
                packings={allPackings}
                selectedKeys={selectedKeys}
                alloc={alloc}
                showOtherPackings={showOtherPackings}
                multi={multi}
                onToggle={togglePacking}
                onAlloc={setPackAlloc}
                onShowOthers={() => setShowOtherPackings(true)}
                onPackingsRefresh={(patch) => {
                  if (patch?.productId) {
                    setAllPackings((prev) =>
                      prev.map((p) =>
                        String(p.productId) === String(patch.productId)
                          ? { ...p, availablePackets: patch.availablePackets }
                          : p
                      )
                    )
                  }
                  if (patch?.merge?.length) {
                    setAllPackings((prev) => {
                      const known = new Set(prev.map((p) => String(p.productId || "")))
                      const add = patch.merge.filter(
                        (p) => p.productId && !known.has(String(p.productId))
                      )
                      return add.length ? [...prev, ...add] : prev
                    })
                    return
                  }
                  if (!patch?.productId) onCardReload?.()
                }}
                fmt={fmt}
              />
            </Box>

            <RequestPacketsExtras
              fmt={fmt}
              maxExcess={maxExcess}
              firstPackingName={firstPacking?.name}
              excess={excess}
              excessPkts={excessPkts}
              onBump={bumpExcess}
              onClamp={setExcessClamped}
              raisingPkts={raisingPkts}
              onShowRaising={() => setShowRaising(true)}
              attachedIntakes={attachedIntakes}
            />

            <Divider />
            <TextField
              label="Notes (optional)"
              size="small"
              fullWidth
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: neutral.border }}>
          <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disableElevation
            onClick={() => handleSubmit(false)}
            disabled={saving || selectedPackings.length === 0}
            sx={{ textTransform: "none", fontWeight: 600, px: 2.5 }}
          >
            {saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              `Confirm · ${fmt(totalPkts, 2)} pkt`
            )}
          </Button>
        </DialogActions>
      </Dialog>

      <RaisingIntakeModal
        open={showRaising}
        onClose={() => setShowRaising(false)}
        plantId={card?.plantId}
        subtypeId={card?.subtypeId}
        orderId={selectedRows[0]?.orderId}
        farmerName={selectedRows[0]?.farmerName}
        defaultPackets={raising || 1}
        slotIds={requestScope.slotIds}
        onCreated={(intake) => {
          setIntakeIds((prev) => [...new Set([...prev, intake._id])])
          setAttachedIntakes((prev) => {
            const next = [
              ...prev.filter((row) => String(row._id) !== String(intake._id)),
              intake,
            ]
            const packets = next.reduce(
              (sum, row) =>
                sum +
                (Number(row.packetsRemaining ?? row.packetsReceived) || 0),
              0
            )
            setRaisingPkts(String(Number(packets.toFixed(2))))
            return next
          })
        }}
      />

      <RequestPacketsStockUpdateDialog
        open={Boolean(shortStock)}
        packing={shortStock?.packing}
        shortfall={shortStock?.shortfall}
        onClose={() => setShortStock(null)}
        onUpdated={(next) => {
          const pid = shortStock?.packing?.productId
          if (pid) {
            setAllPackings((prev) =>
              prev.map((p) =>
                String(p.productId) === String(pid)
                  ? { ...p, availablePackets: next }
                  : p
              )
            )
          }
        }}
      />
    </>
  )
}
