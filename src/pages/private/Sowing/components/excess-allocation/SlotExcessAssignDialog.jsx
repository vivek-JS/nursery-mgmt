import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material"
import ConfirmDialog from "components/Modals/ConfirmDialog"
import { Toast } from "helpers/toasts/toastHelper"
import {
  allocateSlotToOrders,
  fetchSlotCoverableOrders,
  fmtDay,
  fmtNum,
} from "./excessAllocationApi"

/**
 * Slot-first: assign availablePlants from a surplus slot to pending orders.
 */
export default function SlotExcessAssignDialog({
  open,
  onClose,
  onDone,
  slotId = null,
  slotLabel = "",
  availablePlants = 0,
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState(null)
  const [picks, setPicks] = useState({})
  const [error, setError] = useState("")
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = useCallback(async () => {
    if (!slotId) return
    setLoading(true)
    setError("")
    try {
      const res = await fetchSlotCoverableOrders(slotId)
      setData(res)
      const initial = {}
      let remaining = Number(res?.sourceSlot?.availablePlants) || 0
      for (const o of res?.orders || []) {
        if (remaining <= 0) break
        const take = Math.min(
          o.plantsNeeded,
          Math.max(0, Number(o.suggestedTake) || 0),
          remaining
        )
        if (take > 0) {
          initial[o.orderMongoId] = take
          remaining -= take
        }
      }
      setPicks(initial)
    } catch (e) {
      setData(null)
      setPicks({})
      setError(e?.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [slotId])

  useEffect(() => {
    if (open && slotId) load()
    if (!open) {
      setData(null)
      setPicks({})
      setError("")
    }
  }, [open, slotId, load])

  const orders = data?.orders || []
  const sourceAvail =
    Number(data?.sourceSlot?.availablePlants) || Number(availablePlants) || 0

  const selectedTotal = useMemo(
    () =>
      Object.values(picks).reduce(
        (s, n) => s + Math.max(0, Math.floor(Number(n) || 0)),
        0
      ),
    [picks]
  )

  const remainingSource = Math.max(0, sourceAvail - selectedTotal)

  const setQty = (orderMongoId, raw, maxNeed) => {
    const next = { ...picks }
    const n = Math.max(0, Math.floor(Number(raw) || 0))
    const capped = Math.min(n, maxNeed, sourceAvail)
    if (capped <= 0) delete next[orderMongoId]
    else next[orderMongoId] = capped
    setPicks(next)
  }

  const toggleOrder = (o, checked) => {
    const id = o.orderMongoId
    const next = { ...picks }
    if (!checked) {
      delete next[id]
      setPicks(next)
      return
    }
    const already = Object.entries(next).reduce(
      (s, [k, v]) => (k === id ? s : s + Math.max(0, Number(v) || 0)),
      0
    )
    const room = Math.max(0, sourceAvail - already)
    const take = Math.min(o.plantsNeeded, room)
    if (take > 0) next[id] = take
    else delete next[id]
    setPicks(next)
  }

  const handleClose = () => {
    setConfirmOpen(false)
    onClose?.()
  }

  const handleConfirm = async () => {
    setConfirmOpen(false)
    const allocations = Object.entries(picks)
      .map(([orderId, plants]) => ({
        orderId,
        plants: Math.max(0, Math.floor(Number(plants) || 0)),
      }))
      .filter((a) => a.plants > 0)

    if (!slotId || !allocations.length) return
    setSaving(true)
    try {
      const res = await allocateSlotToOrders(slotId, { allocations })
      Toast.success(res?.message || "Plants allocated to orders")
      onDone?.(res)
      handleClose()
    } catch (e) {
      Toast.error(e?.message || "Allocation failed")
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = selectedTotal > 0 && selectedTotal <= sourceAvail && !saving

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Assign available plants to orders
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info" sx={{ py: 0.75 }}>
              Transfer saleable plants from this slot to pending orders&apos;
              booking slots (delivery −4d…0 prioritized). Orders are marked sow
              complete only when fully covered; partial allocation leaves them pending.
            </Alert>

            {data?.windowDays != null && (
              <Chip
                size="small"
                label={`Cover window: delivery −${data.windowDays}d…0 · ${data.inWindowCount ?? 0} in window`}
                sx={{ fontWeight: 700, alignSelf: "flex-start" }}
              />
            )}

            {error && <Alert severity="error">{error}</Alert>}

            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "#f0fdf4" }}>
              <Typography variant="caption" fontWeight={800} color="text.secondary">
                Source slot
              </Typography>
              <Typography fontWeight={900}>
                {data?.sourceSlot?.label || slotLabel || "—"}
              </Typography>
              <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={`Available ${fmtNum(sourceAvail)}`}
                  color="success"
                  sx={{ fontWeight: 800 }}
                />
                <Chip
                  size="small"
                  label={`Selected ${fmtNum(selectedTotal)}`}
                  sx={{ fontWeight: 800 }}
                />
                <Chip
                  size="small"
                  label={`Remaining ${fmtNum(remainingSource)}`}
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Paper>

            {loading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={32} />
              </Box>
            ) : orders.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                No pending unsowed orders for this plant/subtype.
              </Typography>
            ) : (
              <Stack spacing={0.75}>
                <Typography variant="caption" fontWeight={800} color="text.secondary">
                  Pending orders ({orders.length})
                </Typography>
                {orders.map((o) => {
                  const qty = Math.max(0, Math.floor(Number(picks[o.orderMongoId]) || 0))
                  const checked = qty > 0
                  const fully = qty >= o.plantsNeeded

                  return (
                    <Paper
                      key={o.orderMongoId}
                      variant="outlined"
                      sx={{
                        p: 1,
                        borderRadius: 1.5,
                        borderColor: checked ? "#166534" : "#e2e8f0",
                        bgcolor: checked ? "#f0fdf4" : "#fff",
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        alignItems={{ sm: "center" }}
                        spacing={1}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.5} flex={1}>
                          <Checkbox
                            size="small"
                            checked={checked}
                            onChange={(e) => toggleOrder(o, e.target.checked)}
                          />
                          <Box minWidth={0}>
                            <Typography fontWeight={800} fontSize="0.9rem">
                              #{o.orderId} · {o.farmerName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Need {fmtNum(o.plantsNeeded)} · delivery {fmtDay(o.deliveryDate)}
                              {o.bookingSlotLabel ? ` · booked ${o.bookingSlotLabel}` : ""}
                              {o.offsetLabel ? ` · ${o.offsetLabel}` : ""}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {o.inCoverWindow && (
                            <Chip size="small" label="In window" color="primary" sx={{ height: 20 }} />
                          )}
                          {!o.inCoverWindow && o.offsetDays != null && (
                            <Chip size="small" label="Outside window" variant="outlined" sx={{ height: 20 }} />
                          )}
                          <TextField
                            size="small"
                            type="number"
                            label="Allocate"
                            value={qty || ""}
                            onChange={(e) =>
                              setQty(o.orderMongoId, e.target.value, o.plantsNeeded)
                            }
                            inputProps={{ min: 0, max: o.plantsNeeded, step: 1 }}
                            sx={{ width: 120 }}
                          />
                          {fully && qty > 0 && (
                            <Chip size="small" label="Full → sow done" color="success" />
                          )}
                          {checked && qty > 0 && !fully && (
                            <Chip size="small" label="Partial" color="warning" />
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  )
                })}
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
          >
            {saving ? "Saving…" : `Allocate ${fmtNum(selectedTotal)} plants`}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm allocation"
        message={`Transfer ${fmtNum(selectedTotal)} plants from this slot to ${Object.keys(picks).filter((k) => picks[k] > 0).length} order(s)? Fully covered orders will be marked sow complete.`}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
