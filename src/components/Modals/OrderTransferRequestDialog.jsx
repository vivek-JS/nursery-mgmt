import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Alert
} from "@mui/material"
import { Toast } from "helpers/toasts/toastHelper"
import {
  searchFarmerPlantOrdersForTransfer,
  createFarmerOrderTransferRequest
} from "features/accountant-dashboard/paymentsApi"

const fmt = (n) => `₹${Math.abs(Number(n) || 0).toLocaleString("en-IN")}`

/**
 * Create a transfer request (PENDING on target). Approve = mark payment COLLECTED; Reject = REJECTED.
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} [props.onSuccess]
 * @param {string} [props.initialFromOrderId] Mongo _id
 */
export default function OrderTransferRequestDialog({
  open,
  onClose,
  onSuccess,
  initialFromOrderId
}) {
  const [fromSearch, setFromSearch] = useState("")
  const [fromResults, setFromResults] = useState([])
  const [fromSearchLoading, setFromSearchLoading] = useState(false)
  const [fromOrder, setFromOrder] = useState(null)

  const [toSearch, setToSearch] = useState("")
  const [toResults, setToResults] = useState([])
  const [toSearchLoading, setToSearchLoading] = useState(false)
  const [toOrder, setToOrder] = useState(null)

  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fromTimerRef = useRef(null)
  const toTimerRef = useRef(null)

  const reset = useCallback(() => {
    setFromSearch("")
    setFromResults([])
    setFromOrder(null)
    setToSearch("")
    setToResults([])
    setToOrder(null)
    setAmount("")
    setNote("")
    setSubmitting(false)
  }, [])

  useEffect(() => {
    if (!open) return
    reset()
    const init = initialFromOrderId != null ? String(initialFromOrderId).trim() : ""
    if (!init) return
    let cancelled = false
    ;(async () => {
      try {
        const rows = await searchFarmerPlantOrdersForTransfer({ q: init, limit: 5 })
        const hit = rows.find((o) => String(o._id) === init)
        if (!cancelled && hit) setFromOrder(hit)
      } catch {
        // prefetch is optional
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, initialFromOrderId, reset])

  useEffect(() => {
    if (!open) return
    const q = String(fromSearch || "").trim()
    if (!q) {
      setFromResults([])
      return
    }
    let cancelled = false
    setFromSearchLoading(true)
    clearTimeout(fromTimerRef.current)
    fromTimerRef.current = setTimeout(async () => {
      try {
        const rows = await searchFarmerPlantOrdersForTransfer({ q, limit: 15 })
        if (!cancelled) setFromResults(Array.isArray(rows) ? rows : [])
      } catch (_) {
        if (!cancelled) setFromResults([])
      } finally {
        if (!cancelled) setFromSearchLoading(false)
      }
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(fromTimerRef.current)
    }
  }, [open, fromSearch])

  useEffect(() => {
    if (!open) return
    const q = String(toSearch || "").trim()
    if (!q) {
      setToResults([])
      return
    }
    let cancelled = false
    setToSearchLoading(true)
    clearTimeout(toTimerRef.current)
    toTimerRef.current = setTimeout(async () => {
      try {
        const rows = await searchFarmerPlantOrdersForTransfer({ q, limit: 15 })
        if (!cancelled) setToResults(Array.isArray(rows) ? rows : [])
      } catch (_) {
        if (!cancelled) setToResults([])
      } finally {
        if (!cancelled) setToSearchLoading(false)
      }
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(toTimerRef.current)
    }
  }, [open, toSearch])

  const handleClose = () => {
    reset()
    onClose()
  }

  const amountNum = Number(amount)
  const canSubmit =
    fromOrder?._id &&
    toOrder?._id &&
    String(fromOrder._id) !== String(toOrder._id) &&
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await createFarmerOrderTransferRequest({
        fromOrderId: fromOrder._id,
        toOrderId: toOrder._id,
        requestedAmount: amountNum,
        note: note.trim() || undefined
      })
      Toast.success(
        "Transfer request created — target order has a PENDING payment. Approve (Completed) or Reject from payments."
      )
      if (typeof onSuccess === "function") onSuccess()
      handleClose()
    } catch (e) {
      Toast.error(e?.message || "Transfer request failed")
    } finally {
      setSubmitting(false)
    }
  }

  const renderOrderPick = (label, selected, setSelected, search, setSearch, loading, results) => (
    <>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        {label}
      </Typography>
      {selected && (
        <Typography variant="body2" sx={{ mb: 1 }}>
          Selected: <strong>#{selected.orderId}</strong> — {selected.farmer?.name || "—"}
        </Typography>
      )}
      <TextField
        size="small"
        fullWidth
        label="Search by order # or farmer name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        disabled={submitting}
        sx={{ mb: 1 }}
      />
      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <CircularProgress size={18} />
          <Typography variant="caption">Searching…</Typography>
        </Box>
      )}
      <Box
        sx={{
          maxHeight: 140,
          overflow: "auto",
          mb: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1
        }}
      >
        {results.map((o) => (
          <Button
            key={o._id}
            fullWidth
            sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
            variant={selected?._id === o._id ? "contained" : "text"}
            onClick={() => {
              setSelected(o)
              setSearch("")
            }}
            disabled={submitting}
          >
            <Box textAlign="left">
              <Typography variant="body2">
                Order #{o.orderId} — {o.farmer?.name || "—"}
              </Typography>
            </Box>
          </Button>
        ))}
      </Box>
    </>
  )

  return (
    <Dialog open={open} onClose={() => !submitting && handleClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>New transfer request</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          <Typography variant="body2" component="div" sx={{ lineHeight: 1.55 }}>
            Creates a <strong>PENDING</strong> payment on the target order. An accountant approves it
            (Completed) or rejects it from the payments list — same as other payments.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            For instant move of one collected line (no approval), use <strong>Order transfer</strong> instead.
          </Typography>
        </Alert>

        {renderOrderPick(
          "1. From order (source of funds)",
          fromOrder,
          setFromOrder,
          fromSearch,
          setFromSearch,
          fromSearchLoading,
          fromResults
        )}

        {renderOrderPick(
          "2. To order (receives transfer)",
          toOrder,
          setToOrder,
          toSearch,
          setToSearch,
          toSearchLoading,
          toResults.filter((o) => !fromOrder?._id || String(o._id) !== String(fromOrder._id))
        )}

        <TextField
          size="small"
          fullWidth
          type="number"
          label="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={submitting}
          inputProps={{ min: 1, step: "any" }}
          sx={{ mb: 2 }}
          helperText={amountNum > 0 ? `Requesting ${fmt(amountNum)}` : "Enter amount to transfer"}
        />

        <TextField
          size="small"
          fullWidth
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={submitting}
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting ? <CircularProgress size={22} color="inherit" /> : "Create request"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
