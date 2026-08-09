import React, { useEffect, useState } from "react"
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
  CircularProgress,
  Alert,
} from "@mui/material"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

function toDateInput(v) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

export default function RaisingIntakeModal({
  open,
  onClose,
  plantId,
  subtypeId,
  orderId,
  farmerName,
  defaultPackets = 1,
  slotIds = [],
  onCreated,
}) {
  const [packets, setPackets] = useState(String(defaultPackets || 1))
  const [batchNumber, setBatchNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [notes, setNotes] = useState("")
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [existing, setExisting] = useState(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setFiles([])
      setExisting(null)
      if (orderId) {
        try {
          setLoadingExisting(true)
          const instance = NetworkManager(API.sowing.GET_RAISING_BY_ORDER)
          const res = await instance.request({}, [orderId])
          if (cancelled) return
          const intake = res?.data?.success ? res.data.data : null
          if (intake) {
            setExisting(intake)
            setPackets(String(intake.packetsReceived ?? defaultPackets ?? 1))
            setBatchNumber(intake.batchNumber || "")
            setExpiryDate(toDateInput(intake.expiryDate))
            setNotes(intake.notes || "")
            return
          }
        } catch {
          /* create mode */
        } finally {
          if (!cancelled) setLoadingExisting(false)
        }
      }
      if (cancelled) return
      setPackets(String(defaultPackets || 1))
      setBatchNumber("")
      setExpiryDate("")
      setNotes("")
      setLoadingExisting(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open, orderId, defaultPackets])

  const isEdit = Boolean(existing?._id)

  const handleSave = async () => {
    const pkt = parseFloat(packets)
    if (!batchNumber.trim() || !Number.isFinite(pkt) || pkt <= 0) {
      Toast.error("Enter batch number and packets")
      return
    }
    try {
      setSaving(true)
      const fd = new FormData()
      fd.append("packetsReceived", String(pkt))
      fd.append("batchNumber", batchNumber.trim())
      if (expiryDate) fd.append("expiryDate", expiryDate)
      else if (isEdit) fd.append("expiryDate", "")
      if (farmerName) fd.append("farmerName", farmerName)
      if (notes) fd.append("notes", notes)
      if (slotIds?.length) fd.append("linkedSlotIds", JSON.stringify(slotIds))
      files.forEach((f) => fd.append("photos", f))

      let res
      if (isEdit) {
        const instance = NetworkManager(API.sowing.UPDATE_RAISING_INTAKE)
        res = await instance.request(fd, [existing._id])
      } else {
        fd.append("plantId", plantId)
        fd.append("subtypeId", subtypeId)
        if (orderId) fd.append("orderId", orderId)
        const instance = NetworkManager(API.sowing.CREATE_RAISING_INTAKE)
        res = await instance.request(fd)
      }

      if (res?.data?.success) {
        Toast.success(
          isEdit
            ? `Updated · ${res.data.data.intakeNumber || "intake"}`
            : `Customer seed saved · ${res.data.data.intakeNumber}`
        )
        onCreated?.(res.data.data)
        onClose?.()
      } else {
        Toast.error(res?.data?.message || "Failed to save")
      }
    } catch (e) {
      Toast.error(e?.response?.data?.message || e.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        {isEdit ? "Edit raising seed" : "Collect raising seed"}
      </DialogTitle>
      <DialogContent>
        {loadingExisting ? (
          <Box py={4} textAlign="center">
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {isEdit
                ? "Already collected for this order — edit only (one intake per order)."
                : "Record packets the farmer gave at the office. Photos optional."}
              {farmerName ? ` · ${farmerName}` : ""}
            </Typography>
            {isEdit && (
              <Alert severity="info" sx={{ mb: 2 }}>
                {existing.intakeNumber} · one collect per order
              </Alert>
            )}
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Packets received"
                type="number"
                size="small"
                fullWidth
                value={packets}
                onChange={(e) => setPackets(e.target.value)}
                inputProps={{ min: 0.01, step: 0.01 }}
              />
              <TextField
                label="Batch / lot number"
                size="small"
                fullWidth
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                required
              />
              <TextField
                label="Expiry date (optional)"
                type="date"
                size="small"
                fullWidth
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Notes (optional)"
                size="small"
                fullWidth
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  Photos (optional)
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  {files.length ? `${files.length} file(s)` : "Choose photos"}
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  />
                </Button>
              </Box>
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loadingExisting}
          sx={{ textTransform: "none", fontWeight: 700, bgcolor: "#0f766e" }}
        >
          {saving ? (
            <CircularProgress size={20} color="inherit" />
          ) : isEdit ? (
            "Update intake"
          ) : (
            "Save intake"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
