import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Button,
  TextField,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Paper,
} from "@mui/material"
import AddRoundedIcon from "@mui/icons-material/AddRounded"
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded"
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

function toDateInput(v) {
  if (!v) return ""
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return ""
  return d.toISOString().slice(0, 10)
}

function emptyBatch() {
  return { key: `${Date.now()}-${Math.random()}`, batchNumber: "", packets: "1", expiryDate: "" }
}

function batchesFromIntake(existing) {
  if (Array.isArray(existing?.batches) && existing.batches.length) {
    return existing.batches.map((b, i) => ({
      key: String(b._id || `b-${i}`),
      batchNumber: b.batchNumber || "",
      packets: String(b.packets ?? b.packetsReceived ?? "1"),
      expiryDate: toDateInput(b.expiryDate),
    }))
  }
  if (existing?.batchNumber) {
    return [
      {
        key: "legacy-0",
        batchNumber: existing.batchNumber || "",
        packets: String(existing.packetsReceived ?? "1"),
        expiryDate: toDateInput(existing.expiryDate),
      },
    ]
  }
  return [emptyBatch()]
}

/**
 * Collect OR edit raising seed — supports multiple batches with per-batch expiry.
 */
export default function RaisingCollectForm({
  order,
  intake = null,
  onSuccess,
  onCancel,
}) {
  const existing = intake || null
  const isEdit = Boolean(existing?._id)

  const [batches, setBatches] = useState(() => batchesFromIntake(existing))
  const [farmerName, setFarmerName] = useState(order?.farmerName || "")
  const [notes, setNotes] = useState("")
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setBatches(batchesFromIntake(existing))
    setFarmerName(existing?.farmerName || order?.farmerName || "")
    setNotes(existing?.notes || "")
    setFiles([])
  }, [existing, order?.farmerName, order?.orderId])

  const totalPackets = useMemo(
    () =>
      batches.reduce((s, b) => {
        const n = parseFloat(b.packets)
        return s + (Number.isFinite(n) && n > 0 ? n : 0)
      }, 0),
    [batches]
  )

  const updateBatch = (key, patch) => {
    setBatches((prev) =>
      prev.map((b) => (b.key === key ? { ...b, ...patch } : b))
    )
  }

  const addBatch = () => setBatches((prev) => [...prev, emptyBatch()])

  const removeBatch = (key) => {
    setBatches((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.key !== key)))
  }

  const handleSave = async () => {
    if (!order?.plantId || !order?.subtypeId) {
      Toast.error("Order missing plant/subtype")
      return
    }
    const payloadBatches = []
    for (const b of batches) {
      const pkt = parseFloat(b.packets)
      if (!b.batchNumber.trim() || !Number.isFinite(pkt) || pkt <= 0) {
        Toast.error("Each batch needs a batch number and packets > 0")
        return
      }
      payloadBatches.push({
        batchNumber: b.batchNumber.trim(),
        packets: pkt,
        expiryDate: b.expiryDate || "",
      })
    }
    try {
      setSaving(true)
      const fd = new FormData()
      fd.append("batches", JSON.stringify(payloadBatches))
      fd.append("packetsReceived", String(totalPackets))
      fd.append("batchNumber", payloadBatches.map((b) => b.batchNumber).join(" · "))
      if (payloadBatches[0]?.expiryDate) {
        fd.append("expiryDate", payloadBatches[0].expiryDate)
      } else if (isEdit) {
        fd.append("expiryDate", "")
      }
      if (farmerName) fd.append("farmerName", farmerName.trim())
      if (notes) fd.append("notes", notes)
      if (order.bookingSlot) {
        const slot =
          typeof order.bookingSlot === "object"
            ? order.bookingSlot._id || order.bookingSlot
            : order.bookingSlot
        if (slot) fd.append("linkedSlotIds", JSON.stringify([slot]))
      }
      files.forEach((f) => fd.append("photos", f))

      let res
      if (isEdit) {
        const instance = NetworkManager(API.sowing.UPDATE_RAISING_INTAKE)
        res = await instance.request(fd, [existing._id])
      } else {
        fd.append("plantId", order.plantId)
        fd.append("subtypeId", order.subtypeId)
        fd.append("orderId", order.orderId)
        const instance = NetworkManager(API.sowing.CREATE_RAISING_INTAKE)
        res = await instance.request(fd)
      }

      if (res?.data?.success) {
        Toast.success(
          isEdit
            ? `Updated ${res.data.data.intakeNumber || "intake"}`
            : `Saved ${res.data.data.intakeNumber}`
        )
        onSuccess?.(res.data.data)
      } else {
        Toast.error(res?.data?.message || res?.message || "Save failed")
      }
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 2, md: 2.75 },
        borderRadius: 3,
        border: "1px solid rgba(16,185,129,0.35)",
        background:
          "linear-gradient(160deg, #ecfdf5 0%, #f0fdf4 45%, #ffffff 100%)",
        boxShadow: "0 12px 40px rgba(6,95,70,0.08)",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ sm: "flex-start" }}
        mb={2}
        gap={1.25}
      >
        <Box>
          <Typography fontWeight={900} fontSize="1.15rem" color="#064e3b">
            {isEdit ? "Edit raising intake" : "Collect raising seeds"}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Order #{order.orderNumber} · {order.farmerName} ·{" "}
            {order.farmerMobile || "—"}
            {order.village ? ` · ${order.village}` : ""}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
            {order.plantName} / {order.subtypeName} · {order.numberOfPlants} plants ·{" "}
            {order.seedSource}
            {existing?.intakeNumber ? ` · ${existing.intakeNumber}` : ""}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={`${batches.length} batch${batches.length === 1 ? "" : "es"}`}
            sx={{ fontWeight: 800, bgcolor: "#d1fae5", color: "#065f46" }}
          />
          <Chip
            size="small"
            label={`${totalPackets || 0} pkt total`}
            sx={{ fontWeight: 800, bgcolor: "#a7f3d0", color: "#064e3b" }}
          />
          <Chip
            size="small"
            label={isEdit ? "Edit mode" : "New collect"}
            sx={{
              fontWeight: 800,
              bgcolor: isEdit ? "#fef3c7" : "#e0e7ff",
              color: isEdit ? "#92400e" : "#3730a3",
            }}
          />
        </Stack>
      </Stack>

      {isEdit && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Already collected for this order — update batches below (no second intake).
        </Alert>
      )}

      {!order.plantId || !order.subtypeId ? (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          This order is missing plant/subtype — cannot collect.
        </Alert>
      ) : (
        <Stack spacing={2}>
          <TextField
            label="Farmer / giver name"
            size="small"
            fullWidth
            value={farmerName}
            onChange={(e) => setFarmerName(e.target.value)}
            sx={{ bgcolor: "#fff", borderRadius: 1 }}
          />

          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              mb={1}
            >
              <Typography fontWeight={800} color="#065f46" fontSize="0.95rem">
                Batches & expiry
              </Typography>
              <Button
                size="small"
                startIcon={<AddRoundedIcon />}
                onClick={addBatch}
                sx={{
                  textTransform: "none",
                  fontWeight: 800,
                  color: "#047857",
                  bgcolor: "#d1fae5",
                  "&:hover": { bgcolor: "#a7f3d0" },
                }}
              >
                Add batch
              </Button>
            </Stack>

            <Stack spacing={1.25}>
              {batches.map((b, idx) => (
                <Box
                  key={b.key}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "#fff",
                    border: "1px solid #d1fae5",
                    position: "relative",
                    transition: "box-shadow 180ms ease, border-color 180ms ease",
                    "&:hover": {
                      borderColor: "#6ee7b7",
                      boxShadow: "0 6px 20px rgba(16,185,129,0.12)",
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    mb={1}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={800}
                      color="#059669"
                      letterSpacing={0.4}
                    >
                      BATCH {idx + 1}
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={batches.length <= 1}
                      onClick={() => removeBatch(b.key)}
                      aria-label="Remove batch"
                      sx={{ color: "#b91c1c" }}
                    >
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
                    <TextField
                      label="Batch number"
                      size="small"
                      fullWidth
                      required
                      value={b.batchNumber}
                      onChange={(e) =>
                        updateBatch(b.key, { batchNumber: e.target.value })
                      }
                      placeholder="e.g. LOT-042"
                    />
                    <TextField
                      label="Packets"
                      type="number"
                      size="small"
                      fullWidth
                      value={b.packets}
                      onChange={(e) =>
                        updateBatch(b.key, { packets: e.target.value })
                      }
                      inputProps={{ min: 0.01, step: 0.01 }}
                      sx={{ maxWidth: { sm: 140 } }}
                    />
                    <TextField
                      label="Expiry"
                      type="date"
                      size="small"
                      fullWidth
                      value={b.expiryDate}
                      onChange={(e) =>
                        updateBatch(b.key, { expiryDate: e.target.value })
                      }
                      InputLabelProps={{ shrink: true }}
                      helperText="Optional"
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>

          <TextField
            label="Notes (optional)"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ bgcolor: "#fff", borderRadius: 1 }}
          />

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.25}
            alignItems={{ sm: "center" }}
            justifyContent="space-between"
          >
            <Button
              variant="outlined"
              component="label"
              size="small"
              startIcon={<PhotoCameraOutlinedIcon />}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderColor: "#6ee7b7",
                color: "#065f46",
                bgcolor: "#fff",
              }}
            >
              {files.length
                ? `${files.length} photo(s) selected`
                : isEdit
                  ? "Add photos"
                  : "Photos (optional)"}
              <input
                hidden
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </Button>

            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                onClick={onCancel}
                disabled={saving}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                disableElevation
                onClick={handleSave}
                disabled={saving}
                sx={{
                  textTransform: "none",
                  fontWeight: 900,
                  px: 2.5,
                  bgcolor: "#059669",
                  borderRadius: 2,
                  boxShadow: "0 8px 20px rgba(5,150,105,0.35)",
                  "&:hover": { bgcolor: "#047857" },
                }}
              >
                {saving ? (
                  <CircularProgress size={20} color="inherit" />
                ) : isEdit ? (
                  "Update intake"
                ) : (
                  `Save · ${totalPackets || 0} pkt`
                )}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      )}
    </Paper>
  )
}
