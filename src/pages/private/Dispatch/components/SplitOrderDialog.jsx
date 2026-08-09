import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Divider,
  Chip,
} from "@mui/material"
import {
  ContentCut as ScissorsIcon,
  Close as CloseIcon,
  ArrowForward as ArrowRightIcon,
} from "@mui/icons-material"
import { API, NetworkManager } from "network/core"
import { isApiErrorResponse } from "network/core/responseParser"
import { Toast } from "helpers/toasts/toastHelper"
import {
  emptyOrderForEditShape,
  buildSplitOrderRequestPayload,
  resolveBookedByName,
} from "../../dashboard/orderEditUtils"
import SplitOrderAssignFarmerSection, {
  validateSplitAssignDraft,
} from "./SplitOrderAssignFarmerSection"
import SplitOrderAttributionSection from "./SplitOrderAttributionSection"

const SplitOrderDialog = ({ open, onClose, order, onSplitSuccess }) => {
  const [splitQty, setSplitQty] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [assignEnabled, setAssignEnabled] = useState(false)
  const [assignMode, setAssignMode] = useState("existing")
  const [assignDraft, setAssignDraft] = useState(() => ({ ...emptyOrderForEditShape() }))
  const [assignError, setAssignError] = useState("")
  const [attribution, setAttribution] = useState(null)

  useEffect(() => {
    if (open) {
      setSplitQty("")
      setNotes("")
      setError("")
      setAssignEnabled(false)
      setAssignMode("existing")
      setAssignDraft({ ...emptyOrderForEditShape() })
      setAssignError("")
      setAttribution(null)
      setLoading(false)
    }
  }, [open])

  if (!order) return null

  const farmerName = resolveBookedByName(
    order?.farmer,
    order?.farmerName || order?.details?.farmerName
  )
  const plantLabel = [
    order?.plantName?.name || order?.plantType?.name || order?.plantName || "",
    order?.plantSubtype?.name || order?.plantSubtype || "",
  ]
    .filter(Boolean)
    .join(" – ")
  const remaining = order?.remainingPlants ?? order?.numberOfPlants ?? 0
  const qty = parseInt(splitQty, 10)
  const isQtyValid = !isNaN(qty) && qty >= 1 && qty < remaining
  const parentRemainsAfter = isQtyValid ? remaining - qty : null
  const childGets = isQtyValid ? qty : null

  const handleSubmit = async () => {
    if (!isQtyValid) {
      setError(`Enter a quantity between 1 and ${remaining - 1}`)
      return
    }

    if (assignEnabled) {
      const assignCheck = validateSplitAssignDraft(assignEnabled, assignMode, assignDraft)
      if (!assignCheck.ok) {
        setAssignError(assignCheck.message || "Complete farmer details")
        return
      }
    }

    const splitBody = buildSplitOrderRequestPayload({
      splitQuantity: qty,
      notes,
      assignEnabled,
      assignMode,
      assignDraft,
      attributionMode: attribution?.attributionMode,
      attributionId: attribution?.attributionId,
      dealerOrder: attribution?.dealerOrder,
    })
    if (!splitBody.ok) {
      setAssignError(splitBody.message || "Complete farmer details")
      return
    }

    setError("")
    setAssignError("")
    setLoading(true)
    try {
      const orderId = order?._id || order?.id
      const instance = NetworkManager(API.ORDER.SPLIT_ORDER)
      const response = await instance.request(splitBody.payload, [orderId])
      if (isApiErrorResponse(response)) {
        setError(response.error || "Failed to split order. Please try again.")
        return
      }

      const { parentOrder, childOrder } = response?.data?.data || {}
      if (!childOrder?._id && !childOrder?.id) {
        setError("Split response missing child order. Please refresh and verify.")
        return
      }

      Toast.success(
        assignEnabled
          ? `Order split! #${childOrder?.orderId} assigned to new farmer.`
          : `Order split! New order #${childOrder?.orderId} created.`
      )
      onSplitSuccess?.(parentOrder, childOrder)
      onClose()
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to split order. Please try again."
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ScissorsIcon fontSize="small" />
          <Typography variant="h6" component="span">Split Order</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={loading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Farmer
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {farmerName}
          </Typography>
          {plantLabel && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {plantLabel}
            </Typography>
          )}
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Remaining plants: <strong>{remaining}</strong>
          </Typography>
        </Box>

        <TextField
          label="Plants to split off"
          type="number"
          value={splitQty}
          onChange={(e) => {
            setSplitQty(e.target.value)
            setError("")
          }}
          fullWidth
          size="small"
          inputProps={{ min: 1, max: remaining - 1 }}
          helperText={`Must be between 1 and ${remaining - 1}`}
          sx={{ mb: 2 }}
          disabled={loading}
        />

        {isQtyValid && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
            <Chip label={`${parentRemainsAfter} stays`} color="primary" variant="outlined" size="small" />
            <ArrowRightIcon fontSize="small" color="action" />
            <Chip label={`${childGets} new order`} color="success" variant="outlined" size="small" />
          </Box>
        )}

        <TextField
          label="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          size="small"
          multiline
          rows={2}
          disabled={loading}
          sx={{ mb: 1 }}
        />

        <SplitOrderAttributionSection
          order={order}
          value={attribution}
          onChange={setAttribution}
        />

        <SplitOrderAssignFarmerSection
          enabled={assignEnabled}
          onEnabledChange={setAssignEnabled}
          bookingFarmerName={farmerName}
          bookingFarmer={order?.farmer}
          draft={assignDraft}
          onDraftChange={setAssignDraft}
          assignMode={assignMode}
          onAssignModeChange={setAssignMode}
          disabled={loading}
          error={assignError}
          onErrorClear={() => setAssignError("")}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !isQtyValid}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <ScissorsIcon />}>
          {loading ? "Splitting…" : "Split Order"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SplitOrderDialog
