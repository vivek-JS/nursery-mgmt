import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import ConfirmDialog from "components/Modals/ConfirmDialog"
import SeedPlanChip from "../Sowing/components/SeedPlanChip"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import {
  todayYmd,
  addDaysToYmd,
  daysBetweenYmd,
  ymdToDdMm,
  calcDefaultPacketsUsed,
  buildPacketDefaults,
  findSubtypeMeta,
  parseSeedPlan,
  totalPacketsUsed,
} from "./orderSowFormUtils"

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

function buildInitialDraft({
  plantsBooked,
  plantReadyDaysDefault,
  conversionFactor,
  sowingPlan,
}) {
  const sowDate = todayYmd()
  const plantReadyDays =
    plantReadyDaysDefault > 0 ? String(plantReadyDaysDefault) : ""
  const readyDate =
    plantReadyDaysDefault > 0 ? addDaysToYmd(sowDate, plantReadyDaysDefault) : ""
  const qty = plantsBooked > 0 ? String(plantsBooked) : ""
  const packets = buildPacketDefaults(sowingPlan, qty, conversionFactor)
  return {
    sowDate,
    plantReadyDays,
    readyDate,
    quantity: qty,
    companyPackets: packets.companyDefault,
    raisingPackets: packets.raisingDefault,
    batchNumber: packets.defaultBatchNumber || "",
  }
}

export default function OrderSowForm({
  orderMongoId,
  plantId,
  subtypeId,
  plantsBooked = 0,
  deliveryDate = null,
  sowingPlan = null,
  canEdit = false,
  onSowed,
}) {
  const seedPlan = useMemo(() => parseSeedPlan(sowingPlan), [sowingPlan])
  const [metaLoading, setMetaLoading] = useState(false)
  const [subtypeMeta, setSubtypeMeta] = useState({
    plantReadyDays: 0,
    conversionFactor: 1,
  })
  const [draft, setDraft] = useState(() =>
    buildInitialDraft({
      plantsBooked,
      plantReadyDaysDefault: 0,
      conversionFactor: 1,
      sowingPlan,
    })
  )
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (!plantId || !subtypeId) {
      setSubtypeMeta({ plantReadyDays: 0, conversionFactor: 1 })
      return
    }
    let cancelled = false
    ;(async () => {
      setMetaLoading(true)
      try {
        const instance = NetworkManager(API.plantCms.GET_PLANTS)
        const res = await instance.request()
        if (cancelled) return
        const list = Array.isArray(res?.data?.data) ? res.data.data : []
        setSubtypeMeta(findSubtypeMeta(list, plantId, subtypeId))
      } catch {
        if (!cancelled) setSubtypeMeta({ plantReadyDays: 0, conversionFactor: 1 })
      } finally {
        if (!cancelled) setMetaLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [plantId, subtypeId])

  useEffect(() => {
    setDraft(
      buildInitialDraft({
        plantsBooked,
        plantReadyDaysDefault: subtypeMeta.plantReadyDays,
        conversionFactor: subtypeMeta.conversionFactor,
        sowingPlan,
      })
    )
  }, [orderMongoId, plantsBooked, subtypeMeta.plantReadyDays, sowingPlan])

  const patch = useCallback((patchObj) => {
    setDraft((prev) => ({ ...prev, ...patchObj }))
  }, [])

  const readyDays = Math.max(0, Number(draft.plantReadyDays) || 0)
  const readyDate =
    draft.readyDate ||
    (draft.sowDate && readyDays >= 0 ? addDaysToYmd(draft.sowDate, readyDays) : "")
  const qty = Number(draft.quantity) || 0
  const companyPkts = Math.max(0, Number(draft.companyPackets) || 0)
  const raisingPkts = Math.max(0, Number(draft.raisingPackets) || 0)
  const totalPkts = totalPacketsUsed(companyPkts, raisingPkts)

  const raisingBlocked =
    seedPlan.hasRaising && raisingPkts > 0 && !seedPlan.raisingCollected
  const raisingShort =
    seedPlan.hasRaising &&
    seedPlan.raisingCollected &&
    seedPlan.raisingRemaining > 0 &&
    raisingPkts > seedPlan.raisingRemaining

  const canSow =
    qty > 0 &&
    totalPkts > 0 &&
    draft.sowDate &&
    readyDate &&
    daysBetweenYmd(draft.sowDate, readyDate) != null &&
    daysBetweenYmd(draft.sowDate, readyDate) >= 0 &&
    Boolean(orderMongoId) &&
    Boolean(plantId) &&
    Boolean(subtypeId) &&
    !raisingBlocked &&
    !raisingShort

  const deliveryLabel = useMemo(() => {
    if (!deliveryDate) return null
    const raw = String(deliveryDate)
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return ymdToDdMm(raw.slice(0, 10))
    return raw
  }, [deliveryDate])

  const onSowDateChange = (ymd) => {
    patch({
      sowDate: ymd,
      ...(ymd && readyDays >= 0 ? { readyDate: addDaysToYmd(ymd, readyDays) } : {}),
    })
  }

  const onReadyDaysChange = (raw) => {
    const n = Math.max(0, Number(raw) || 0)
    patch({
      plantReadyDays: raw,
      ...(draft.sowDate ? { readyDate: addDaysToYmd(draft.sowDate, n) } : {}),
    })
  }

  const onPlantsChange = (val) => {
    const next = { quantity: val }
    if (seedPlan.hasCompany && !seedPlan.hasRaising) {
      next.companyPackets = calcDefaultPacketsUsed(val, subtypeMeta.conversionFactor)
    } else if (seedPlan.hasRaising && !seedPlan.hasCompany) {
      next.raisingPackets = calcDefaultPacketsUsed(val, subtypeMeta.conversionFactor)
    }
    patch(next)
  }

  const packetConfirmLabel = useMemo(() => {
    const parts = []
    if (companyPkts > 0) parts.push(`${fmtNum(companyPkts)} co.`)
    if (raisingPkts > 0) parts.push(`${fmtNum(raisingPkts)} cust.`)
    return parts.length ? parts.join(" + ") : fmtNum(0)
  }, [companyPkts, raisingPkts])

  const handleSubmit = async () => {
    setConfirmOpen(false)
    if (!canSow) return

    const days =
      readyDate && draft.sowDate
        ? daysBetweenYmd(draft.sowDate, readyDate)
        : readyDays

    let seedSource = seedPlan.seedSource
    if (companyPkts > 0 && raisingPkts > 0) seedSource = "MIXED"
    else if (raisingPkts > 0) seedSource = "RAISING"
    else seedSource = "COMPANY"

    setSaving(true)
    try {
      const instance = NetworkManager(API.sowing.SUBMIT_ADMIN_DIRECT_SOW)
      const payload = {
        orderIds: [String(orderMongoId)],
        plantId: String(plantId),
        subtypeId: String(subtypeId),
        date: draft.sowDate,
        sowDate: draft.sowDate,
        readyDate,
        plantsSowed: qty,
        packetsUsed: totalPkts,
        packetsFromCompany: companyPkts,
        packetsFromRaising: raisingPkts,
        seedSource,
        plantReadyDays: days,
        batchNumber: String(draft.batchNumber || "").trim(),
        shedName: "Office",
        notes: deliveryLabel
          ? `Order sow · ${seedSource} · booked delivery ${deliveryLabel}`
          : `Order sow · ${seedSource}`,
      }
      const res = await instance.request(payload)
      if (res?.data?.success) {
        Toast.success(res.data.message || "Sow recorded")
        onSowed?.(res?.data)
      } else {
        Toast.error(res?.data?.message || "Failed to record sow")
      }
    } catch (e) {
      Toast.error(
        e?.response?.data?.message || e?.message || "Failed to record sow"
      )
    } finally {
      setSaving(false)
    }
  }

  if (!canEdit) {
    return (
      <Alert severity="warning" sx={{ py: 0.75 }}>
        Only Office Admin / Super Admin can record sow for this order.
      </Alert>
    )
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: "2px solid #16a34a",
        borderRadius: 1.5,
        bgcolor: "#fff",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap mb={1}>
        <Typography variant="subtitle2" fontWeight={800}>
          Record sow
        </Typography>
        {deliveryLabel ? (
          <Chip size="small" variant="outlined" label={`Booked ${deliveryLabel}`} />
        ) : null}
        {readyDate ? (
          <Chip
            size="small"
            color="success"
            variant="outlined"
            label={`Ready slot ${ymdToDdMm(readyDate)}`}
            sx={{ fontWeight: 700 }}
          />
        ) : null}
      </Stack>

      {sowingPlan ? (
        <Box mb={1}>
          <SeedPlanChip
            seedSource={seedPlan.seedSource}
            companyPackets={seedPlan.companyPackets}
            raisingPackets={seedPlan.raisingPackets}
          />
        </Box>
      ) : null}

      {seedPlan.hasRaising ? (
        seedPlan.raisingCollected ? (
          <Alert severity="success" sx={{ py: 0.5, mb: 1 }}>
            Customer seed collected
            {seedPlan.intakeNumber ? ` · ${seedPlan.intakeNumber}` : ""}
            {seedPlan.defaultBatchNumber
              ? ` · batch ${seedPlan.defaultBatchNumber}`
              : ""}
            {seedPlan.raisingRemaining > 0
              ? ` · ${fmtNum(seedPlan.raisingRemaining)} pkt in hand`
              : ""}
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ py: 0.5, mb: 1 }}>
            Collect farmer raising seed first (Order Details tab), then record sow here.
          </Alert>
        )
      ) : null}

      <Typography variant="caption" color="text.secondary" display="block" mb={1}>
        Plants go to the ready-date slot (sow date + ready days). 90% counts as
        actual (available = actual − dispatched), 10% as expected mortality, then
        this order is marked covered.
      </Typography>

      {metaLoading ? (
        <Stack direction="row" spacing={1} alignItems="center" mb={1}>
          <CircularProgress size={14} />
          <Typography variant="caption">Loading plant ready days…</Typography>
        </Stack>
      ) : null}

      <Grid container spacing={1}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="date"
            size="small"
            label="Sow date"
            value={draft.sowDate || ""}
            onChange={(e) => onSowDateChange(e.target.value)}
            InputLabelProps={{ shrink: true }}
            disabled={saving}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            size="small"
            label="Plant ready days"
            value={draft.plantReadyDays ?? ""}
            onChange={(e) => onReadyDaysChange(e.target.value)}
            disabled={saving}
            helperText="Ready date = sow + days"
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            size="small"
            label="Batch number"
            placeholder="Batch #"
            value={draft.batchNumber || ""}
            onChange={(e) => patch({ batchNumber: e.target.value })}
            disabled={saving}
            helperText={
              seedPlan.defaultBatchNumber && !draft.batchNumber
                ? `Intake batch: ${seedPlan.defaultBatchNumber}`
                : undefined
            }
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="number"
            size="small"
            label="Plants sowed"
            value={draft.quantity || ""}
            onChange={(e) => onPlantsChange(e.target.value)}
            disabled={saving}
          />
        </Grid>

        {seedPlan.hasCompany ? (
          <Grid item xs={12} sm={seedPlan.hasRaising ? 6 : 12}>
            <TextField
              fullWidth
              type="number"
              size="small"
              label="Company packets used"
              value={draft.companyPackets ?? ""}
              onChange={(e) => patch({ companyPackets: e.target.value })}
              disabled={saving}
              helperText={
                seedPlan.companyPackets > 0
                  ? `Planned ${fmtNum(seedPlan.companyPackets)} co. pkt`
                  : "Office / warehouse seed"
              }
            />
          </Grid>
        ) : null}

        {seedPlan.hasRaising ? (
          <Grid item xs={12} sm={seedPlan.hasCompany ? 6 : 12}>
            <TextField
              fullWidth
              type="number"
              size="small"
              label="Customer raising packets used"
              value={draft.raisingPackets ?? ""}
              onChange={(e) => patch({ raisingPackets: e.target.value })}
              disabled={saving || raisingBlocked}
              helperText={
                seedPlan.raisingPackets > 0
                  ? `Planned ${fmtNum(seedPlan.raisingPackets)} cust. pkt`
                  : "Farmer seed collected at office"
              }
            />
          </Grid>
        ) : null}

        {!seedPlan.hasCompany && !seedPlan.hasRaising ? (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              size="small"
              label="Packets used"
              value={draft.companyPackets ?? ""}
              onChange={(e) => patch({ companyPackets: e.target.value })}
              disabled={saving}
            />
          </Grid>
        ) : null}

        {(seedPlan.hasCompany && seedPlan.hasRaising) || totalPkts > 0 ? (
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary">
              Total packets: <strong>{fmtNum(totalPkts)}</strong>
            </Typography>
          </Grid>
        ) : null}

        {readyDate ? (
          <Grid item xs={12} sm={6}>
            <Box sx={{ py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Ready date
              </Typography>
              <Typography fontWeight={800}>{ymdToDdMm(readyDate)}</Typography>
            </Box>
          </Grid>
        ) : null}
      </Grid>

      {raisingShort ? (
        <Typography variant="caption" color="error" display="block" mt={1}>
          Only {fmtNum(seedPlan.raisingRemaining)} customer packets remaining in intake.
        </Typography>
      ) : null}

      <Button
        variant="contained"
        color="success"
        disabled={!canSow || saving || metaLoading}
        onClick={() => setConfirmOpen(true)}
        startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        sx={{ mt: 1.5, textTransform: "none", fontWeight: 800 }}
      >
        {saving ? "Saving…" : "Record sow & mark complete"}
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Record sow for this order?"
        description={`Sow ${fmtNum(qty)} plants on ${ymdToDdMm(draft.sowDate)} · ready ${ymdToDdMm(readyDate)} · ${packetConfirmLabel}${draft.batchNumber ? ` · batch ${draft.batchNumber}` : ""}?`}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </Paper>
  )
}
