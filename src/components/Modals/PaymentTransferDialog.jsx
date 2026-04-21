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
  Radio,
  RadioGroup,
  FormControlLabel,
  Alert
} from "@mui/material"
import { Toast } from "helpers/toasts/toastHelper"
import {
  searchFarmerPlantOrdersForTransfer,
  fetchFarmerPlantOrderDetails,
  transferFarmerPlantOrderPayment
} from "features/accountant-dashboard/paymentsApi"
import { transferableFarmerPlantPayments } from "features/accountant-dashboard/farmerPlantPaymentTransfer.utils"

const fmt = (n) => `₹${Math.abs(Number(n) || 0).toLocaleString("en-IN")}`
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"

/**
 * Move a COLLECTED payment line from one farmer plant order to another (target may be a different farmer).
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} [props.onSuccess]
 * @param {string} [props.initialSourceOrderId] Mongo _id of source order (pre-fills step 1)
 * @param {string} [props.initialPaymentId] Mongo _id of payment on source order (when eligible)
 */
export default function PaymentTransferDialog({
  open,
  onClose,
  onSuccess,
  initialSourceOrderId,
  initialPaymentId
}) {
  const [sourceSearch, setSourceSearch] = useState("")
  const [sourceResults, setSourceResults] = useState([])
  const [sourceSearchLoading, setSourceSearchLoading] = useState(false)
  const [sourceOrder, setSourceOrder] = useState(null)
  const [sourceDetails, setSourceDetails] = useState(null)
  const [sourceDetailsLoading, setSourceDetailsLoading] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState("")

  const [targetSearch, setTargetSearch] = useState("")
  const [targetResults, setTargetResults] = useState([])
  const [targetSearchLoading, setTargetSearchLoading] = useState(false)
  const [targetOrder, setTargetOrder] = useState(null)

  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const sourceTimerRef = useRef(null)
  const targetTimerRef = useRef(null)
  const skipSourceDetailsFetchRef = useRef(false)

  const reset = useCallback(() => {
    skipSourceDetailsFetchRef.current = false
    setSourceSearch("")
    setSourceResults([])
    setSourceOrder(null)
    setSourceDetails(null)
    setSelectedPaymentId("")
    setTargetSearch("")
    setTargetResults([])
    setTargetOrder(null)
    setMessage("")
    setSubmitting(false)
    setSourceDetailsLoading(false)
  }, [])

  useEffect(() => {
    if (!open) return
    reset()
    const initSid =
      initialSourceOrderId != null && String(initialSourceOrderId).trim()
        ? String(initialSourceOrderId).trim()
        : ""
    if (!initSid) return
    let cancelled = false
    ;(async () => {
      try {
        const details = await fetchFarmerPlantOrderDetails(initSid)
        if (cancelled) return
        const order = details?.order
        if (!order?._id) {
          Toast.error("Could not load source order")
          return
        }
        skipSourceDetailsFetchRef.current = true
        setSourceDetails(details)
        setSourceOrder({
          _id: order._id,
          orderId: order.orderId,
          farmer: order.farmer
            ? {
                _id: order.farmer._id,
                name: order.farmer.name || "",
                mobileNumber: order.farmer.mobileNumber || "",
                village: order.farmer.village || "",
                taluka: order.farmer.taluka || "",
                district: order.farmer.district || ""
              }
            : {}
        })
        const pay = transferableFarmerPlantPayments(details?.payments)
        const initPid =
          initialPaymentId != null && String(initialPaymentId).trim()
            ? String(initialPaymentId).trim()
            : ""
        const pick =
          initPid && pay.some((p) => String(p._id) === initPid)
            ? initPid
            : pay[0]?._id
              ? String(pay[0]._id)
              : ""
        setSelectedPaymentId(pick)
      } catch (e) {
        if (!cancelled) Toast.error(e?.message || "Could not load order payments")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, initialSourceOrderId, initialPaymentId, reset])

  useEffect(() => {
    if (!open) return
    const q = String(sourceSearch || "").trim()
    if (!q) {
      setSourceResults([])
      return
    }
    let cancelled = false
    setSourceSearchLoading(true)
    clearTimeout(sourceTimerRef.current)
    sourceTimerRef.current = setTimeout(async () => {
      try {
        const rows = await searchFarmerPlantOrdersForTransfer({ q, limit: 15 })
        if (!cancelled) setSourceResults(Array.isArray(rows) ? rows : [])
      } catch (_) {
        if (!cancelled) setSourceResults([])
      } finally {
        if (!cancelled) setSourceSearchLoading(false)
      }
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(sourceTimerRef.current)
    }
  }, [open, sourceSearch])

  useEffect(() => {
    if (!open || !sourceOrder?._id) {
      setSourceDetails(null)
      setSelectedPaymentId("")
      return
    }
    if (skipSourceDetailsFetchRef.current) {
      skipSourceDetailsFetchRef.current = false
      return
    }
    let cancelled = false
    setSourceDetailsLoading(true)
    ;(async () => {
      try {
        const details = await fetchFarmerPlantOrderDetails(sourceOrder._id)
        if (cancelled) return
        setSourceDetails(details)
        const pay = transferableFarmerPlantPayments(details?.payments)
        const initPid =
          initialPaymentId != null && String(initialPaymentId).trim()
            ? String(initialPaymentId).trim()
            : ""
        const sameAsInitialSource =
          initialSourceOrderId != null &&
          String(sourceOrder._id) === String(initialSourceOrderId).trim()
        const pick =
          sameAsInitialSource && initPid && pay.some((p) => String(p._id) === initPid)
            ? initPid
            : pay[0]?._id
              ? String(pay[0]._id)
              : ""
        setSelectedPaymentId(pick)
      } catch (e) {
        if (!cancelled) {
          setSourceDetails(null)
          Toast.error(e?.message || "Could not load order payments")
        }
      } finally {
        if (!cancelled) setSourceDetailsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, sourceOrder, initialSourceOrderId, initialPaymentId])

  useEffect(() => {
    if (!open) return
    const q = String(targetSearch || "").trim()
    if (!q) {
      setTargetResults([])
      return
    }
    let cancelled = false
    setTargetSearchLoading(true)
    clearTimeout(targetTimerRef.current)
    targetTimerRef.current = setTimeout(async () => {
      try {
        const rows = await searchFarmerPlantOrdersForTransfer({ q, limit: 15 })
        if (!cancelled) setTargetResults(Array.isArray(rows) ? rows : [])
      } catch (_) {
        if (!cancelled) setTargetResults([])
      } finally {
        if (!cancelled) setTargetSearchLoading(false)
      }
    }, 280)
    return () => {
      cancelled = true
      clearTimeout(targetTimerRef.current)
    }
  }, [open, targetSearch])

  const handleClose = () => {
    reset()
    onClose()
  }

  const collected = transferableFarmerPlantPayments(sourceDetails?.payments)
  const canSubmit =
    sourceOrder?._id &&
    targetOrder?._id &&
    String(sourceOrder._id) !== String(targetOrder._id) &&
    selectedPaymentId &&
    collected.some((p) => String(p._id) === selectedPaymentId) &&
    !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    try {
      await transferFarmerPlantOrderPayment({
        sourceOrderId: sourceOrder._id,
        targetOrderId: targetOrder._id,
        paymentId: selectedPaymentId,
        message: message.trim() || undefined
      })
      Toast.success(
        "पेमेंट यशस्वीपणे transfer झाले — लक्ष्य ऑर्डरवर जमा झाले. · Payment transferred to the target order."
      )
      try {
        if (typeof onSuccess === "function") onSuccess()
      } catch (cbErr) {
        console.error(cbErr)
      }
      handleClose()
    } catch (e) {
      const raw = String(e?.message || "").trim()
      Toast.error(
        raw ? `transfer अयशस्वी — ${raw}` : "transfer अयशस्वी — पुन्हा प्रयत्न करा किंवा तपशील तपासा."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !submitting && handleClose()} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1, fontWeight: 700 }}>
        Order transfer
      </DialogTitle>
      <DialogContent dividers>
        <Alert
          severity="warning"
          variant="outlined"
          sx={{
            mb: 2,
            alignItems: "flex-start",
            borderWidth: 2,
            borderColor: "warning.dark",
            bgcolor: "rgba(255, 193, 7, 0.12)",
            "& .MuiAlert-message": { width: "100%" }
          }}
        >
          <Typography variant="subtitle2" fontWeight={800} color="warning.dark" gutterBottom>
            महत्त्वाचे — कृपया पुन्हा तपासा
          </Typography>
          <Typography variant="body2" component="div" sx={{ lineHeight: 1.55 }}>
            एक <strong>Collected</strong> पेमेंट स्रोत ऑर्डरवरून <strong>दुसऱ्या कोणत्याही</strong> शेतकऱ्याच्या प्लांट
            ऑर्डरवर transfer करू शकता (स्रोत व लक्ष्य वेगळे शेतकरी असले तरी चालेल). रद्द ऑर्डरवरील Collected पेमेंटही इथून
            transfer करता येईल. <strong>Wallet</strong> किंवा <strong>bulk</strong> लिंक केलेल्या पेमेंट इथून transfer करता येत नाहीत.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Transfer one collected line to any other farmer plant order. Wallet / bulk-linked lines are not listed here.
          </Typography>
        </Alert>

        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          1. Source order
        </Typography>
        <TextField
          size="small"
          fullWidth
          label="Search by order # or farmer name"
          value={sourceSearch}
          onChange={(e) => setSourceSearch(e.target.value)}
          disabled={submitting}
          sx={{ mb: 1 }}
        />
        {sourceSearchLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="caption">Searching…</Typography>
          </Box>
        )}
        {sourceOrder && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            Selected: <strong>#{sourceOrder.orderId}</strong> — {sourceOrder.farmer?.name || "—"} (
            {sourceOrder.farmer?.mobileNumber ?? "—"})
          </Typography>
        )}

        <Box sx={{ maxHeight: 160, overflow: "auto", mb: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          {sourceResults.map((o) => (
            <Button
              key={o._id}
              fullWidth
              sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
              variant={sourceOrder?._id === o._id ? "contained" : "text"}
              color={sourceOrder?._id === o._id ? "primary" : "inherit"}
              onClick={() => {
                setSourceOrder(o)
                setSourceSearch("")
                setSourceResults([])
              }}
              disabled={submitting}
            >
              <Box textAlign="left">
                <Typography variant="body2">
                  Order #{o.orderId} — {o.farmer?.name || "—"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {o.farmer?.village || ""} · {o.farmer?.mobileNumber ?? ""}
                </Typography>
              </Box>
            </Button>
          ))}
        </Box>

        {sourceDetailsLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="caption">Loading payments…</Typography>
          </Box>
        )}

        {sourceDetails && !sourceDetailsLoading && (
          <>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Select payment entry
            </Typography>
            {collected.length === 0 ? (
              <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                No transferable collected payments on this order.
              </Typography>
            ) : (
              <RadioGroup
                value={selectedPaymentId}
                onChange={(e) => setSelectedPaymentId(e.target.value)}
                sx={{ mb: 2 }}
              >
                {collected.map((p) => (
                  <FormControlLabel
                    key={p._id}
                    value={String(p._id)}
                    control={<Radio size="small" disabled={submitting} />}
                    label={
                      <span>
                        {fmt(p.paidAmount)} — {p.modeOfPayment || "—"} — {fmtDate(p.paymentDate)}
                        {p.remark ? (
                          <Typography component="span" variant="caption" color="text.secondary" display="block">
                            {String(p.remark).slice(0, 120)}
                            {String(p.remark).length > 120 ? "…" : ""}
                          </Typography>
                        ) : null}
                      </span>
                    }
                  />
                ))}
              </RadioGroup>
            )}
          </>
        )}

        <Typography variant="subtitle2" sx={{ mb: 0.5, mt: 1 }}>
          2. Target order
        </Typography>
        {targetOrder && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            Selected: <strong>#{targetOrder.orderId}</strong> — {targetOrder.farmer?.name || "—"} (
            {targetOrder.farmer?.mobileNumber ?? "—"})
          </Typography>
        )}
        <TextField
          size="small"
          fullWidth
          label="Search target order"
          value={targetSearch}
          onChange={(e) => setTargetSearch(e.target.value)}
          disabled={submitting}
          sx={{ mb: 1 }}
        />
        {targetSearchLoading && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <CircularProgress size={18} />
            <Typography variant="caption">Searching…</Typography>
          </Box>
        )}
        <Box sx={{ maxHeight: 160, overflow: "auto", mb: 2, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          {targetResults
            .filter((o) => !sourceOrder?._id || String(o._id) !== String(sourceOrder._id))
            .map((o) => (
              <Button
                key={o._id}
                fullWidth
                sx={{ justifyContent: "flex-start", textTransform: "none", py: 1 }}
                variant={targetOrder?._id === o._id ? "contained" : "text"}
                color={targetOrder?._id === o._id ? "primary" : "inherit"}
                onClick={() => {
                  setTargetOrder(o)
                  setTargetSearch("")
                  setTargetResults([])
                }}
                disabled={submitting}
              >
                <Box textAlign="left">
                  <Typography variant="body2">
                    Order #{o.orderId} — {o.farmer?.name || "—"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {o.farmer?.village || ""} · {o.farmer?.mobileNumber ?? ""}
                  </Typography>
                </Box>
              </Button>
            ))}
        </Box>

        <TextField
          size="small"
          fullWidth
          label="Message (optional, stored on remarks and audit log)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submitting}
          multiline
          minRows={2}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleSubmit}
          disabled={!canSubmit}
          sx={{ fontWeight: 700, px: 2.5 }}
        >
          {submitting ? <CircularProgress size={22} color="inherit" /> : "Confirm transfer"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
