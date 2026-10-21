import React, { useEffect, useMemo, useState } from "react"
import { Box, Button, Chip, Stack, TextField, Typography } from "@mui/material"
import AddIcon from "@mui/icons-material/Add"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

const QUICK = [1, 5, 10, 25]

export default function RequestPacketsAddStockPanel({
  packing,
  shortfall = 0,
  onSaved,
  onCancel,
}) {
  const stock = Number(packing?.availablePackets) || 0
  const need = Math.max(0, Number(shortfall) || 0)
  const [qty, setQty] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [more, setMore] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setQty(need > 0 ? String(Number(need.toFixed(2))) : "")
    setBatchNumber("")
    setExpiryDate("")
    setMore(false)
  }, [packing?.productId, need])

  const delta = Number(qty)
  const after = Number.isFinite(delta) && delta > 0 ? stock + delta : null
  const chips = useMemo(() => {
    const set = new Set(QUICK)
    if (need > 0) set.add(Number(need.toFixed(2)))
    return [...set].sort((a, b) => a - b)
  }, [need])

  const handleSave = async () => {
    if (!packing?.productId) {
      Toast.error("This link has no product to add stock to")
      return
    }
    if (!Number.isFinite(delta) || delta <= 0) {
      Toast.error("Enter packets to add")
      return
    }
    try {
      setSaving(true)
      const instance = NetworkManager(API.INVENTORY.POST_PRODUCT_MANUAL_STOCK)
      const res = await instance.request(
        {
          quantityDelta: delta,
          batchNumber: String(batchNumber || "").trim() || undefined,
          expiryDate: expiryDate || undefined,
        },
        [packing.productId]
      )
      const body = res?.data
      if (!(body?.status === "Success" || body?.success)) {
        throw new Error(body?.message || "Stock update failed")
      }
      Toast.success(`Added ${delta} pkt`)
      onSaved?.(stock + delta)
    } catch (e) {
      Toast.error(e?.response?.data?.message || e.message || "Stock update failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box
      sx={{
        mt: 1.25,
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: "#f0fdfa",
        border: "1px solid #99f6e4",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
        <Typography fontWeight={700} fontSize="0.8rem" color="#0f766e">
          Add stock
        </Typography>
        <Typography variant="caption" color="text.secondary">
          now {stock} pkt
          {after != null ? ` → ${Number(after.toFixed(2))} pkt` : ""}
          {need > 0 ? ` · short ${need}` : ""}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={1}>
        {chips.map((n) => (
          <Chip
            key={n}
            size="small"
            label={`+${n}`}
            clickable
            onClick={() => setQty(String(n))}
            sx={{
              height: 24,
              fontWeight: 700,
              bgcolor: Number(qty) === n ? "#0f766e" : "#fff",
              color: Number(qty) === n ? "#fff" : "#0f766e",
              border: "1px solid #99f6e4",
            }}
          />
        ))}
      </Stack>

      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          size="small"
          type="number"
          label="Packets to add"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          inputProps={{ min: 0.01, step: 0.01 }}
          sx={{ flex: 1, bgcolor: "#fff" }}
        />
        <Button
          variant="contained"
          disableElevation
          startIcon={<AddIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            bgcolor: "#0f766e",
            height: 40,
            "&:hover": { bgcolor: "#115e59" },
          }}
        >
          Add
        </Button>
      </Stack>

      <Stack direction="row" spacing={1} mt={0.75}>
        <Button
          size="small"
          onClick={() => setMore((v) => !v)}
          sx={{ textTransform: "none", px: 0 }}
        >
          {more ? "Hide batch" : "Batch / expiry"}
        </Button>
        {onCancel ? (
          <Button size="small" onClick={onCancel} sx={{ textTransform: "none" }}>
            Close
          </Button>
        ) : null}
      </Stack>

      {more && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} mt={1}>
          <TextField
            size="small"
            label="Batch #"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            sx={{ flex: 1, bgcolor: "#fff" }}
          />
          <TextField
            size="small"
            type="date"
            label="Expiry"
            InputLabelProps={{ shrink: true }}
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            sx={{ flex: 1, bgcolor: "#fff" }}
          />
        </Stack>
      )}
    </Box>
  )
}
