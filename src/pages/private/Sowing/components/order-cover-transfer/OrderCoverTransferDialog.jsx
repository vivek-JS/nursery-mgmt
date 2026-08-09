import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
  Paper,
  Chip,
  FormControlLabel,
  Switch,
} from "@mui/material"
import ConfirmDialog from "components/Modals/ConfirmDialog"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import OrderCoverPreview from "./OrderCoverPreview"
import {
  completeOrderCoverTransfer,
  fetchOrderCoverPreview,
  fetchUnsowedOrdersForPlant,
  todayYmd,
  fmtNum,
  picksToTransfers,
  plannedTransfersToPicks,
  sumPicks,
} from "./orderCoverApi"

/**
 * Gap Analysis: plant → subtype → unsowed order → transfer preview → confirm.
 * Prefill via initialOrderMongoId / initialPlantId / initialSubtypeId.
 */
export default function OrderCoverTransferDialog({
  open,
  onClose,
  onDone,
  initialOrderMongoId = null,
  initialPlantId = null,
  initialSubtypeId = null,
}) {
  const [plants, setPlants] = useState([])
  const [plantsLoading, setPlantsLoading] = useState(false)
  const [plantId, setPlantId] = useState("")
  const [subtypeId, setSubtypeId] = useState("")
  const [groups, setGroups] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState("")
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  /** Multi source: { [slotId]: plants } → one destination */
  const [picks, setPicks] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState("")
  const [includeAllAvailable, setIncludeAllAvailable] = useState(false)

  const sowDate = todayYmd()

  const subtypes = useMemo(() => {
    const p = plants.find((x) => String(x._id) === String(plantId))
    return p?.subtypes || []
  }, [plants, plantId])

  const activeGroup = useMemo(
    () =>
      groups.find(
        (g) =>
          String(g.plantId) === String(plantId) &&
          String(g.subtypeId) === String(subtypeId)
      ) || null,
    [groups, plantId, subtypeId]
  )

  const orders = activeGroup?.orders || []
  const selectedOrder = orders.find(
    (o) => String(o.orderId) === String(selectedOrderId)
  )

  const loadPlants = useCallback(async () => {
    setPlantsLoading(true)
    try {
      const instance = NetworkManager(API.plantCms.GET_PLANTS)
      const res = await instance.request()
      const list = Array.isArray(res?.data?.data) ? res.data.data : []
      setPlants(
        list
          .filter((p) => p?.sowingAllowed)
          .sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""))
          )
      )
    } catch (e) {
      setPlants([])
      setError(e?.message || "Failed to load plants")
    } finally {
      setPlantsLoading(false)
    }
  }, [])

  const loadGroups = useCallback(async () => {
    if (!plantId) {
      setGroups([])
      return
    }
    setOrdersLoading(true)
    setError("")
    try {
      const next = await fetchUnsowedOrdersForPlant(plantId, sowDate)
      setGroups(next)
    } catch (e) {
      setGroups([])
      setError(e?.message || "Failed to load orders")
    } finally {
      setOrdersLoading(false)
    }
  }, [plantId, sowDate])

  const loadPreview = useCallback(async (mongoId, allAvailable = false) => {
    if (!mongoId) {
      setPreview(null)
      setPicks({})
      return
    }
    setPreviewLoading(true)
    try {
      const data = await fetchOrderCoverPreview(mongoId, {
        includeAllAvailable: allAvailable,
      })
      setPreview(data)
      // Seed with auto plan; user can edit multi-slot picks
      setPicks(plannedTransfersToPicks(data?.plannedTransfers))
    } catch (e) {
      setPreview(null)
      setPicks({})
      Toast.error(e?.message || "Failed to load cover preview")
    } finally {
      setPreviewLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    loadPlants()
  }, [open, loadPlants])

  useEffect(() => {
    if (!open) return
    if (initialPlantId) setPlantId(String(initialPlantId))
    if (initialSubtypeId) setSubtypeId(String(initialSubtypeId))
    if (initialOrderMongoId) setSelectedOrderId(String(initialOrderMongoId))
  }, [open, initialPlantId, initialSubtypeId, initialOrderMongoId])

  useEffect(() => {
    if (!open || !plantId) return
    loadGroups()
  }, [open, plantId, loadGroups])

  useEffect(() => {
    if (!open) return
    if (initialOrderMongoId) {
      loadPreview(initialOrderMongoId, includeAllAvailable)
      return
    }
    if (selectedOrderId) loadPreview(selectedOrderId, includeAllAvailable)
    else {
      setPreview(null)
      setPicks({})
    }
  }, [open, selectedOrderId, initialOrderMongoId, includeAllAvailable, loadPreview])

  const handleClose = () => {
    if (saving) return
    setConfirmOpen(false)
    setPreview(null)
    setPicks({})
    setSelectedOrderId("")
    setError("")
    onClose?.()
  }

  const selectedTotal = sumPicks(picks)
  const need = Math.max(0, Math.floor(Number(preview?.plantsNeeded) || 0))
  const picksExact =
    need > 0 &&
    selectedTotal === need &&
    Boolean(preview?.destinationSlot?.slotId)

  const handleConfirm = async () => {
    setConfirmOpen(false)
    const id = selectedOrderId || initialOrderMongoId
    const transfers = picksToTransfers(picks)
    if (!id || !picksExact || !transfers.length) return
    setSaving(true)
    try {
      const res = await completeOrderCoverTransfer(id, { transfers })
      Toast.success(res?.message || "Order sow completed")
      onDone?.(res)
      handleClose()
    } catch (e) {
      Toast.error(e?.message || "Failed to cover order")
      if (e?.data) {
        setPreview(e.data)
        setPicks(plannedTransfersToPicks(e.data?.plannedTransfers))
      }
    } finally {
      setSaving(false)
    }
  }

  const canSubmit = Boolean(
    (selectedOrderId || initialOrderMongoId) && picksExact && !saving
  )

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900, pb: 1 }}>
          Cover order from slot stock
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info" sx={{ py: 0.75 }}>
              Choose one or more source slots (delivery −4d…0), set how many
              plants to take from each, and transfer them onto the{" "}
              <strong>one</strong> delivery/booking slot as reserved. Then the
              order is marked sow completed. One audit covers all slots.
            </Alert>

            {error && <Alert severity="error">{error}</Alert>}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <FormControl size="small" fullWidth disabled={plantsLoading || Boolean(initialOrderMongoId)}>
                <InputLabel id="oct-plant">Plant</InputLabel>
                <Select
                  labelId="oct-plant"
                  label="Plant"
                  value={plantId}
                  onChange={(e) => {
                    setPlantId(e.target.value)
                    setSubtypeId("")
                    setSelectedOrderId("")
                    setPreview(null)
                    setPicks({})
                  }}
                >
                  {plants.map((p) => (
                    <MenuItem key={String(p._id)} value={String(p._id)}>
                      {p.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl
                size="small"
                fullWidth
                disabled={!plantId || Boolean(initialOrderMongoId)}
              >
                <InputLabel id="oct-sub">Subtype</InputLabel>
                <Select
                  labelId="oct-sub"
                  label="Subtype"
                  value={subtypeId}
                  onChange={(e) => {
                    setSubtypeId(e.target.value)
                    setSelectedOrderId("")
                    setPreview(null)
                    setPicks({})
                  }}
                >
                  {subtypes.map((st) => (
                    <MenuItem key={String(st._id)} value={String(st._id)}>
                      {st.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            {!initialOrderMongoId && (
              <Box>
                <Typography fontWeight={800} mb={1}>
                  Unsowed orders
                  {ordersLoading ? "…" : ` (${orders.length})`}
                </Typography>
                {ordersLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={28} />
                  </Box>
                ) : !subtypeId ? (
                  <Typography variant="body2" color="text.secondary">
                    Select a subtype to list unsowed orders.
                  </Typography>
                ) : orders.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No unsowed orders for this subtype.
                  </Typography>
                ) : (
                  <Stack spacing={0.75} maxHeight={220} overflow="auto">
                    {orders.map((o) => {
                      const active =
                        String(o.orderId) === String(selectedOrderId)
                      return (
                        <Paper
                          key={String(o.orderId)}
                          variant="outlined"
                          onClick={() => setSelectedOrderId(String(o.orderId))}
                          sx={{
                            p: 1.25,
                            cursor: "pointer",
                            borderColor: active ? "#166534" : "#e2e8f0",
                            bgcolor: active ? "#f0fdf4" : "#fff",
                            borderWidth: active ? 2 : 1,
                          }}
                        >
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            gap={1}
                          >
                            <Box minWidth={0}>
                              <Typography fontWeight={800} noWrap>
                                #{o.orderNumber} · {o.farmerName || "Farmer"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {fmtNum(o.plants)} plants
                                {o.deliveryDate
                                  ? ` · delivery ${new Date(
                                      o.deliveryDate
                                    ).toLocaleDateString("en-IN")}`
                                  : ""}
                              </Typography>
                            </Box>
                            {active && (
                              <Chip
                                size="small"
                                color="success"
                                label="Selected"
                                sx={{ fontWeight: 800 }}
                              />
                            )}
                          </Stack>
                        </Paper>
                      )
                    })}
                  </Stack>
                )}
              </Box>
            )}

            {(selectedOrder || initialOrderMongoId) && (
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  mb={1}
                  flexWrap="wrap"
                  gap={1}
                >
                  <Typography fontWeight={800}>
                    Choose slots & amounts
                    {selectedOrder ? ` · #${selectedOrder.orderNumber}` : ""}
                  </Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={includeAllAvailable}
                        onChange={(e) => setIncludeAllAvailable(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="caption" fontWeight={700}>
                        Show all available slots
                      </Typography>
                    }
                  />
                </Stack>
                <OrderCoverPreview
                  preview={preview}
                  loading={previewLoading}
                  picks={picks}
                  onPicksChange={setPicks}
                  includeAllAvailable={includeAllAvailable}
                />
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, py: 1.5 }}>
          <Button onClick={handleClose} disabled={saving} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
            startIcon={
              saving ? <CircularProgress size={16} color="inherit" /> : null
            }
            sx={{ textTransform: "none", fontWeight: 800 }}
          >
            {saving ? "Saving…" : "Transfer & mark sow complete"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirm transfer & sow complete?"
        description={`Transfer ${fmtNum(selectedTotal)} plants from ${
          picksToTransfers(picks).length
        } source slot(s) onto ${
          preview?.destinationSlot?.label || "delivery slot"
        } as reserved, then mark the order sow completed.`}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
