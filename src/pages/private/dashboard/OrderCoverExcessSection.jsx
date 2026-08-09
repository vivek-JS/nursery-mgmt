import React, { useEffect, useState } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
  Chip,
} from "@mui/material"
import ConfirmDialog from "components/Modals/ConfirmDialog"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-IN")
}

function offsetLabel(off) {
  if (off === 0) return "delivery"
  if (off > 0) return `+${off}d`
  return `${off}d`
}

export default function OrderCoverExcessSection({
  orderMongoId,
  plantsBooked = 0,
  bookingSlotId = null,
  canEdit = false,
  onUpdated,
}) {
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [excessLoading, setExcessLoading] = useState(false)
  const [excessInfo, setExcessInfo] = useState(null)

  useEffect(() => {
    if (!orderMongoId) {
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
        }
      } catch {
        if (!cancelled) setExcessInfo(null)
      } finally {
        if (!cancelled) setExcessLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderMongoId, bookingSlotId])

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
        Toast.success(res.data.message || "Reserved from existing stock")
        onUpdated?.(res?.data)
      } else {
        Toast.error(res?.data?.message || "Failed to reserve from stock")
      }
    } catch (e) {
      Toast.error(
        e?.response?.data?.message || e?.message || "Failed to reserve from stock"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box className="space-y-3">
      <Divider sx={{ my: 0.5 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}>
          Or reserve from existing stock
        </Typography>
      </Divider>

      {excessLoading ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography variant="caption">
            Checking saleable stock on delivery day and prior 4 days…
          </Typography>
        </Stack>
      ) : excessInfo ? (
        <Alert severity={canCover ? "success" : "info"} sx={{ py: 0.75 }}>
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
        <Alert severity="info" sx={{ py: 0.5 }}>
          No saleable stock preview for delivery −4d window.
        </Alert>
      )}

      {canEdit && canCover ? (
        <Button
          variant="outlined"
          color="success"
          disabled={saving || excessLoading}
          onClick={() => setConfirmOpen(true)}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {saving ? "Saving…" : "Transfer from existing stock"}
        </Button>
      ) : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Reserve from existing stock?"
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
