import React, { useEffect, useState } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
  Chip,
} from "@mui/material"
import ConfirmDialog from "components/Modals/ConfirmDialog"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

function formatDoneAt(value) {
  if (!value) return "—"
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return String(value)
  }
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

function offsetLabel(off) {
  if (off === 0) return "delivery"
  if (off > 0) return `+${off}d`
  return `${off}d`
}

/**
 * One-button sow complete: transfer saleable stock from delivery−4d…0
 * onto the delivery slot, then mark sowingDone.
 */
export default function OrderSowingDetailsPanel({
  orderMongoId,
  plantsBooked = 0,
  sowingDone = false,
  sowingDoneAt = null,
  sowingDoneRequestId = null,
  sowingPlan = null,
  bookingSlotId = null,
  canEdit = false,
  onUpdated,
}) {
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [excessLoading, setExcessLoading] = useState(false)
  const [excessInfo, setExcessInfo] = useState(null)

  useEffect(() => {
    if (!orderMongoId || sowingDone) {
      setExcessInfo(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setExcessLoading(true)
      try {
        const instance = NetworkManager(API.sowing.GET_ORDER_SLOT_EXCESS)
        const res = await instance.request(null, { pathParams: [orderMongoId] })
        if (cancelled) return
        if (res?.data?.success) {
          setExcessInfo(res.data.data || null)
        } else {
          setExcessInfo(null)
          if (res?.data?.message) Toast.error(res.data.message)
        }
      } catch (e) {
        if (cancelled) return
        setExcessInfo(null)
        Toast.error(
          e?.response?.data?.message || e?.message || "Failed to load slot excess"
        )
      } finally {
        if (!cancelled) setExcessLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderMongoId, sowingDone, bookingSlotId])

  const seedSource = String(sowingPlan?.seedSource || "COMPANY").toUpperCase()
  const canCover = Boolean(excessInfo?.canCover)
  const available = Number(excessInfo?.availablePlants) || 0
  const needed =
    Number(excessInfo?.plantsNeeded) || Number(plantsBooked) || 0
  const shortfall = Number(excessInfo?.shortfall) || Math.max(0, needed - available)
  const windowLabel =
    excessInfo?.windowLabel ||
    (excessInfo?.coverFrom && excessInfo?.coverTo
      ? `${excessInfo.coverFrom} → ${excessInfo.coverTo} (delivery −${excessInfo.windowDays || 4}d…0)`
      : `delivery −${excessInfo?.windowDays || 4}d…0`)
  const destLabel =
    excessInfo?.destinationSlot?.label || excessInfo?.slotLabel || "delivery slot"
  const transfers = excessInfo?.plannedTransfers || []

  const handleConfirm = async () => {
    setConfirmOpen(false)
    if (!orderMongoId) return
    if (!canCover) {
      Toast.error(
        excessInfo?.message ||
          `Not enough saleable stock in ${windowLabel}. Available: ${fmtNum(available)}, needed: ${fmtNum(needed)}`
      )
      return
    }
    setSaving(true)
    try {
      const instance = NetworkManager(API.sowing.COMPLETE_ORDER_FROM_EXCESS)
      const res = await instance.request({}, { pathParams: [orderMongoId] })
      if (res?.data?.success) {
        Toast.success(res.data.message || "Sow completed")
        onUpdated?.(res?.data)
      } else {
        Toast.error(res?.data?.message || "Failed to mark sow complete")
      }
    } catch (e) {
      Toast.error(
        e?.response?.data?.message || e?.message || "Failed to mark sow complete"
      )
    } finally {
      setSaving(false)
    }
  }

  if (sowingDone) {
    return (
      <Box className="space-y-3">
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip label="Sow completed" color="success" size="small" sx={{ fontWeight: 700 }} />
          <Typography variant="body2" color="text.secondary">
            {formatDoneAt(sowingDoneAt)}
          </Typography>
          {sowingDoneRequestId ? (
            <Chip
              size="small"
              variant="outlined"
              label={`Req ${String(sowingDoneRequestId).slice(-8)}`}
            />
          ) : (
            <Chip size="small" variant="outlined" label="From slot transfer (−4d…0)" />
          )}
        </Stack>
        <Alert severity="success" sx={{ py: 0.75 }}>
          Marked <strong>sowingDone</strong>. Plants transferred onto the delivery
          slot as reserved (from saleable stock on delivery day and up to 4 days earlier).
        </Alert>
      </Box>
    )
  }

  return (
    <Box className="space-y-3">
      {sowingPlan ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={`Seed: ${seedSource}`} variant="outlined" />
          {Number(sowingPlan.companySeedPackets) > 0 && (
            <Chip
              size="small"
              label={`Company ${sowingPlan.companySeedPackets} pkt`}
              variant="outlined"
            />
          )}
          {Number(sowingPlan.raisingSeedPackets) > 0 && (
            <Chip
              size="small"
              label={`Raising ${sowingPlan.raisingSeedPackets} pkt`}
              variant="outlined"
            />
          )}
        </Stack>
      ) : null}

      {excessLoading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="caption">
            Checking saleable stock on delivery day and prior 4 days…
          </Typography>
        </Stack>
      ) : excessInfo ? (
        <Alert severity={canCover ? "success" : "warning"} sx={{ py: 0.75 }}>
          <Typography fontWeight={800} fontSize="0.9rem">
            Destination {destLabel} · window {windowLabel}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Saleable to transfer: <strong>{fmtNum(available)}</strong>
            {" · "}
            Needed: <strong>{fmtNum(needed)}</strong>
            {!canCover && shortfall > 0 ? (
              <>
                {" · "}
                Short by <strong>{fmtNum(shortfall)}</strong>
              </>
            ) : null}
          </Typography>
          {transfers.length > 0 && (
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {transfers.map((t) => (
                <Chip
                  key={`${t.fromSlotId}-${t.plants}`}
                  size="small"
                  label={`${t.fromLabel} ${offsetLabel(t.offsetDays)} → ${fmtNum(t.plants)}`}
                  sx={{
                    height: 22,
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    bgcolor: "#dcfce7",
                    color: "#166534",
                  }}
                />
              ))}
            </Stack>
          )}
          <Typography variant="caption" display="block" sx={{ mt: 0.75 }}>
            {excessInfo.message}
          </Typography>
        </Alert>
      ) : (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          Could not load delivery −4d stock transfer plan.
        </Alert>
      )}

      {!canEdit ? (
        <Alert severity="warning" sx={{ py: 0.75 }}>
          Only Office Admin / Super Admin can mark sow complete.
        </Alert>
      ) : (
        <Button
          variant="contained"
          color="success"
          disabled={saving || excessLoading || !canCover}
          onClick={() => setConfirmOpen(true)}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          {saving ? "Saving…" : "Transfer & sow complete"}
        </Button>
      )}

      {!canCover && !excessLoading && excessInfo ? (
        <Typography variant="caption" color="error" display="block">
          Need more saleable plants on delivery day or the prior 4 days before marking complete.
        </Typography>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Transfer & mark sow complete?"
        description={
          canCover
            ? `Transfer ${fmtNum(needed)} plants onto ${destLabel} from saleable stock (${windowLabel}) and mark this order sowingDone?`
            : excessInfo?.message || "Not enough saleable stock in delivery −4d…0 window."
        }
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  )
}
