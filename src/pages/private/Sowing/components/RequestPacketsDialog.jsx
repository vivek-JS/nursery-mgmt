import React, { useEffect, useMemo, useState } from "react"
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
  Alert,
  Chip,
  IconButton,
  Checkbox,
} from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import RemoveIcon from "@mui/icons-material/Remove"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import SeedPlanChip from "./SeedPlanChip"
import RaisingIntakeModal from "./RaisingIntakeModal"
import {
  computeRequestPlantsGap,
  distributePackets,
  fmt,
  packKey,
  packingsOf,
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
}) {
  const allPackings = useMemo(() => packingsOf(card), [card])
  const selectable = useMemo(
    () => allPackings.filter((p) => !p.pendingRequest),
    [allPackings]
  )
  const multi = selectable.length > 1

  const [selectedKeys, setSelectedKeys] = useState([])
  const [alloc, setAlloc] = useState({}) // packKey → company packets for gap
  const [excessPkts, setExcessPkts] = useState("0")
  const [raisingPkts, setRaisingPkts] = useState("0")
  const [notes, setNotes] = useState("")
  const [intakeIds, setIntakeIds] = useState([])
  const [showRaising, setShowRaising] = useState(false)
  const [saving, setSaving] = useState(false)

  const selectedPackings = useMemo(
    () => selectable.filter((p) => selectedKeys.includes(packKey(p))),
    [selectable, selectedKeys]
  )

  const firstCfSelected =
    plantsPerPacket(selectedPackings[0]) || plantsPerPacket(card) || 1
  const raisingNum = parseFloat(raisingPkts) || 0
  const gapMetrics = useMemo(
    () =>
      computeRequestPlantsGap({
        card,
        raisingPackets: raisingNum,
        conversionFactor: firstCfSelected,
      }),
    [card, raisingNum, firstCfSelected]
  )
  const plantsGap = gapMetrics.requestGap
  const companyPlantsTarget = gapMetrics.companyBuffered

  const planRaising = useMemo(() => {
    const rows = orderRows.filter(
      (o) => !selectedOrderIds.length || selectedOrderIds.includes(String(o.orderId))
    )
    const sourceRows = rows.length ? rows : orderRows
    const inHandFromOrders = sourceRows.reduce((s, o) => {
      const collected = Boolean(
        o?.raisingCollected ||
          o?.sowingPlan?.raisingIntakeCollected ||
          o?.sowingPlan?.raisingIntakeId ||
          Number(o?.raisingInHandPackets) > 0
      )
      if (!collected) return s
      return s + (Number(o.raisingInHandPackets) || 0)
    }, 0)
    if (inHandFromOrders > 0) return inHandFromOrders
    return (
      Number(card?.raisingInHandPackets) ||
      Number(card?.orderSeedSummary?.raisingInHandPackets) ||
      0
    )
  }, [orderRows, selectedOrderIds, card])

  const applyDistribution = (keys, mode = "stockFirst") => {
    const packs = selectable.filter((p) => keys.includes(packKey(p)))
    setAlloc(distributePackets(companyPlantsTarget, packs, mode))
  }

  useEffect(() => {
    if (!open) return
    const prefer = (initialPackings || []).filter((p) => !p?.pendingRequest)
    const start =
      prefer.length > 0
        ? prefer.map(packKey)
        : selectable.map(packKey)
    const keys = start.length ? start : selectable.slice(0, 1).map(packKey)
    setSelectedKeys(keys)
    setRaisingPkts(String(Number((planRaising || 0).toFixed(2))))
    setExcessPkts("0")
    setNotes("")
    setIntakeIds([])
    applyDistribution(keys, "stockFirst")
  }, [open, initialPackings, selectable, planRaising, companyPlantsTarget])

  const togglePacking = (key) => {
    setSelectedKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
      if (next.length === 0) return prev // keep at least one
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

  const handleSubmit = async () => {
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

    // Remaining plant gap after raising must request company packets when co. stock can cover.
    const coStock = Number(card?.availablePackets) || 0
    const companyTotal = lines.reduce((s, l) => s + l.company, 0)
    if (gapLeft > 0.5 && companyTotal < 0.01 && coStock > 0.01) {
      Toast.error(
        `Gap still uncovered (${fmt(gapLeft)} plants). Add company seed packets so Inventory can issue them.`
      )
      applyDistribution(selectedKeys, "stockFirst")
      return
    }

    try {
      setSaving(true)
      const slotIds = (card.slotIds || card.slots || [])
        .map((s) => (typeof s === "object" ? s._id || s.slotId : s))
        .filter(Boolean)
      const openOrderIds = orderRows
        .filter((o) => !o.alreadyRequested)
        .map((o) => String(o.orderId))
      const linkedOrderIds =
        selectedOrderIds.length > 0
          ? selectedOrderIds.filter((id) =>
              openOrderIds.length
                ? openOrderIds.includes(String(id))
                : true
            )
          : openOrderIds

      if (orderRows.length > 0 && linkedOrderIds.length === 0) {
        Toast.error(
          "All selected orders were already requested. Cannot request again for the same order."
        )
        return
      }

      const instance = NetworkManager(API.sowing.CREATE_SOWING_REQUEST)
      const created = []
      const transferNotes = []

      for (const line of lines) {
        const cf = plantsPerPacket(line.packing)
        const packetsNeeded = Number((plantsGap / cf).toFixed(2))
        const source =
          line.raise > 0 && line.company > 0
            ? "MIXED"
            : line.raise > 0
              ? "RAISING"
              : "COMPANY"
        const noteParts = [
          lines.length > 1 ? "Combined packing request" : "Request packets",
          line.packing.name || line.packing.code || "Seed",
          `1 pkt ≈ ${cf} plants`,
          `gap ${plantsGap} plants`,
          line.company > packetsNeeded
            ? `excess ${(line.company - packetsNeeded).toFixed(2)} pkt`
            : null,
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
          linkedOrderIds,
          slotIds,
          notes: noteParts.join(" · "),
        }
        if (line.packing.productId) body.productId = line.packing.productId

        const res = await instance.request(body)
        if (!res?.data?.success) {
          throw new Error(res?.data?.message || `Failed for ${line.packing.name}`)
        }
        created.push(res.data.data)
        const tr = res.data.transfer
        if (tr?.poNumber) {
          transferNotes.push(`PO ${tr.poNumber} (${tr.shortfall} pkt shortfall)`)
        } else if (tr?.skipReason) {
          transferNotes.push(tr.skipReason)
        } else if (tr?.error) {
          transferNotes.push(tr.error)
        }
      }

      const baseMsg =
        created.length > 1
          ? `${created.length} requests created (combined packings)`
          : `Request ${created[0].requestNumber} created`
      Toast.success(
        transferNotes.length ? `${baseMsg} · ${transferNotes.join(" · ")}` : baseMsg
      )
      onSuccess?.(created)
      onClose?.()
    } catch (e) {
      Toast.error(e?.response?.data?.message || e.message || "Request failed")
    } finally {
      setSaving(false)
    }
  }

  const statItems = [
    { label: "Gap", value: fmt(plantsGap) },
    { label: "Covered", value: fmt(coveredPlants) },
    { label: "Remaining", value: fmt(gapLeft), warn: gapLeft > 0 },
    { label: "Request", value: `${fmt(totalPkts, 2)} pkt` },
  ]

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
            {multi ? "Combine packings & request" : "Request packets"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {card?.plantName} · {card?.subtypeName}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5}>
            <Box
              sx={{
                p: 2,
                borderRadius: neutral.radius,
                bgcolor: neutral.sectionBg,
                border: neutral.border,
              }}
            >
              <Stack
                direction="row"
                spacing={0}
                divider={<Divider orientation="vertical" flexItem />}
                flexWrap="wrap"
              >
                {statItems.map((item) => (
                  <Box key={item.label} sx={{ flex: "1 1 22%", minWidth: 72, px: 1.5, py: 0.5 }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={500}
                      letterSpacing={0.3}
                      display="block"
                    >
                      {item.label}
                    </Typography>
                    <Typography
                      fontWeight={600}
                      fontSize="1.125rem"
                      color={item.warn ? "warning.dark" : "text.primary"}
                    >
                      {item.value}
                    </Typography>
                  </Box>
                ))}
              </Stack>
              <Box
                sx={{
                  mt: 1.5,
                  height: 4,
                  borderRadius: 1,
                  bgcolor: "#e5e7eb",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${coverPct}%`,
                    bgcolor: "primary.main",
                    transition: "width 0.2s ease",
                  }}
                />
              </Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                flexWrap="wrap"
                gap={1}
                mt={1.25}
              >
                <Typography variant="caption" color="text.secondary">
                  {coverPct}% of gap covered · buffer on company seed only
                </Typography>
                <SeedPlanChip
                  seedSource={seedSource}
                  companyPackets={totalCompanyPkts}
                  raisingPackets={raising}
                />
              </Stack>
            </Box>

            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                  {multi ? "Packings" : "Packing"}
                </Typography>
                {multi && (
                  <Stack direction="row" spacing={0.75}>
                    <Chip
                      size="small"
                      variant="outlined"
                      label="Stock first"
                      clickable
                      onClick={() => applyDistribution(selectedKeys, "stockFirst")}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label="Equal split"
                      clickable
                      onClick={() => applyDistribution(selectedKeys, "equal")}
                    />
                    <Chip
                      size="small"
                      variant="outlined"
                      label="Select all"
                      clickable
                      onClick={() => {
                        const keys = selectable.map(packKey)
                        setSelectedKeys(keys)
                        applyDistribution(keys, "stockFirst")
                      }}
                    />
                  </Stack>
                )}
              </Stack>

              <Stack spacing={1}>
                {allPackings.map((p) => {
                  const key = packKey(p)
                  const blocked = Boolean(p.pendingRequest)
                  const checked = selectedKeys.includes(key)
                  const pkts = alloc[key] ?? ""
                  const plants = (Number(pkts) || 0) * plantsPerPacket(p)
                  return (
                    <Box
                      key={key}
                      sx={{
                        p: 1.5,
                        borderRadius: neutral.radius,
                        bgcolor: "#fff",
                        border: neutral.border,
                        borderColor: checked && !blocked ? "primary.main" : neutral.border,
                        opacity: blocked ? 0.55 : 1,
                      }}
                    >
                      <Stack direction="row" alignItems="flex-start" gap={0.5}>
                        {multi && (
                          <Checkbox
                            size="small"
                            checked={checked}
                            disabled={blocked}
                            onChange={() => togglePacking(key)}
                            sx={{ p: 0.5, mt: -0.25 }}
                          />
                        )}
                        <Box flex={1} minWidth={0}>
                          <Typography fontWeight={600} fontSize="0.875rem">
                            {p.name || p.code || "Seed"}
                            {p.code ? (
                              <Typography component="span" color="text.secondary" fontWeight={400}>
                                {" "}
                                ({p.code})
                              </Typography>
                            ) : null}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            1 pkt ≈ {plantsPerPacket(p)} plants · stock {fmt(p.availablePackets, 2)}
                            {blocked ? ` · pending ${p.pendingRequest.requestNumber}` : ""}
                          </Typography>
                          {checked && !blocked && (
                            <Stack direction="row" spacing={1} alignItems="center" mt={1.25}>
                              <TextField
                                size="small"
                                type="number"
                                label="Company packets"
                                value={pkts}
                                onChange={(e) => setPackAlloc(key, e.target.value)}
                                inputProps={{ min: 0, step: 0.01 }}
                                sx={{ width: 140 }}
                              />
                              <Typography variant="caption" color="text.secondary">
                                ≈ {fmt(plants)} plants
                              </Typography>
                            </Stack>
                          )}
                        </Box>
                      </Stack>
                    </Box>
                  )
                })}
              </Stack>
            </Box>

            <Box
              sx={{
                p: 1.5,
                borderRadius: neutral.radius,
                border: neutral.border,
                bgcolor: "#fff",
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography fontWeight={600} fontSize="0.875rem">
                    Excess sowing
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Max {fmt(maxExcess, 2)} pkt on {firstPacking?.name || "first packing"}
                    {maxExcess <= 0 ? " (no stock left)" : ""}
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={0.25}>
                  <IconButton size="small" onClick={() => bumpExcess(-1)} disabled={excess <= 0}>
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <TextField
                    size="small"
                    type="number"
                    value={excessPkts}
                    onChange={(e) => setExcessClamped(e.target.value)}
                    disabled={maxExcess <= 0}
                    inputProps={{
                      min: 0,
                      max: maxExcess,
                      step: 0.01,
                      style: { textAlign: "center", width: 64 },
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => bumpExcess(1)}
                    disabled={excess >= maxExcess}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>

            <TextField
              label="Customer seed packets"
              type="number"
              size="small"
              fullWidth
              value={raisingPkts}
              onChange={(e) => setRaisingPkts(e.target.value)}
              onBlur={() => applyDistribution(selectedKeys, "stockFirst")}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Applied to plant cover using first packing conversion"
            />

            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowRaising(true)}
              sx={{ alignSelf: "flex-start", textTransform: "none" }}
            >
              Add customer seed (photo + batch)
            </Button>
            {intakeIds.length > 0 && (
              <Alert severity="info" variant="outlined" sx={{ py: 0 }}>
                {intakeIds.length} customer seed batch(es) attached
              </Alert>
            )}

            {gapLeft > 1 && (
              <Alert severity="warning" variant="outlined" sx={{ py: 0 }}>
                Still short ~{fmt(gapLeft)} plants — add packets or select more packings
              </Alert>
            )}

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
            disabled={saving || selectedPackings.length === 0}
            sx={{ textTransform: "none", fontWeight: 600, px: 2.5 }}
          >
            {saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : multi && selectedPackings.length > 1 ? (
              `Confirm · ${selectedPackings.length} packings · ${fmt(totalPkts, 2)} pkt`
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
        orderId={selectedOrderIds[0]}
        farmerName={
          orderRows.find((o) => String(o.orderId) === String(selectedOrderIds[0]))?.farmerName
        }
        defaultPackets={raising || 1}
        slotIds={(card?.slotIds || card?.slots || [])
          .map((s) => (typeof s === "object" ? s._id || s.slotId : s))
          .filter(Boolean)}
        onCreated={(intake) => {
          setIntakeIds((prev) => [...prev, intake._id])
          if (!(raising > 0)) {
            setRaisingPkts(String(intake.packetsReceived))
          }
        }}
      />
    </>
  )
}
