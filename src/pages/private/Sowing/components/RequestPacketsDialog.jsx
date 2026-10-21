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
} from "@mui/material"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import RaisingIntakeModal from "./RaisingIntakeModal"
import RequestPacketsStats from "./RequestPacketsStats"
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
  const [companyPkts, setCompanyPkts] = useState("0")
  const packingPickLocked = useRef(false)

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
    const dist = distributePackets(preview.companyBuffered, use, "stockFirst")
    setAlloc(dist)
    const company = use.reduce((s, p) => s + (Number(dist[packKey(p)]) || 0), 0)
    setCompanyPkts(String(Number(company.toFixed(2))))
  }

  useEffect(() => {
    if (!open) return
    packingPickLocked.current = false
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

  const companyQty = Math.max(0, Number(companyPkts) || 0)
  const companyPlants = companyQty * firstCfSelected
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

  const totalCompanyPkts = companyQty
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

  const handleSubmit = async () => {
    const packing = selectedPackings[0] || selectable[0] || allPackings[0]
    const company = companyQty
    const raise = raising
    const total = company + raise
    if (total <= 0) {
      Toast.error("Enter packet quantity")
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

      const cf = plantsPerPacket(packing) || plantsPerPacket(card) || 1
      const packetsNeeded = Number((plantsGap / cf).toFixed(2))
      const source =
        raise > 0 && company > 0 ? "MIXED" : raise > 0 ? "RAISING" : "COMPANY"
      const noteParts = [
        "Request packets",
        packing?.name || packing?.code || "Seed",
        `1 pkt ≈ ${cf} plants`,
        `gap ${plantsGap} plants`,
        notes || null,
      ].filter(Boolean)

      const body = {
        plantId: card.plantId,
        subtypeId: card.subtypeId,
        packetsNeeded,
        packetsRequested: total,
        packetsFromCompany: company,
        packetsFromRaising: raise,
        seedSource: source,
        raisingIntakeIds: raise > 0 ? intakeIds : [],
        linkedOrderIds: requestScope.linkedOrderIds,
        slotIds: requestScope.slotIds,
        notes: noteParts.join(" · "),
        directIssue: true,
        skipStockIssue: true,
      }
      if (packing?.productId) body.productId = packing.productId

      const instance = NetworkManager(API.sowing.CREATE_SOWING_REQUEST)
      const res = await instance.request(body)
      if (!res?.data?.success) {
        throw new Error(res?.data?.message || `Failed for ${packing?.name || "request"}`)
      }
      const created = res.data.data
      Toast.success(`${created.requestNumber} is now sowing in progress`)
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
              <Typography variant="subtitle2" fontWeight={600} color="text.primary" mb={0.5}>
                Quantity
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Confirm starts sowing in progress. Linked stock is not deducted.
              </Typography>
              <TextField
                label="Packets"
                type="number"
                size="small"
                fullWidth
                value={companyPkts}
                onChange={(e) => setCompanyPkts(e.target.value)}
                inputProps={{ min: 0, step: 0.01 }}
                helperText={`1 pkt ≈ ${fmt(firstCfSelected)} plants`}
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
              showExcess={false}
              showRaising={raising > 0 || attachedIntakes.length > 0}
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
            onClick={handleSubmit}
            disabled={saving || totalPkts <= 0}
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

    </>
  )
}
