import React, { useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from "@mui/material"
import { NetworkManager, API } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"

function companyPacketCap(req) {
  const fromCompany = Number(req?.packetsFromCompany) || 0
  if (fromCompany > 0) return fromCompany
  if (String(req?.seedSource || "").toUpperCase() === "RAISING") return 0
  return Number(req?.packetsRequested) || Number(req?.packetsIssued) || 0
}

/**
 * Office / Super Admin sow entry — completes an issued sowing request (same complete-sow API as shed).
 */
export default function AdminSowEntryDialog({ open, request, card, onClose, onSuccess }) {
  const [plants, setPlants] = useState("")
  const [packetsUsed, setPacketsUsed] = useState("")
  const [packetsReturned, setPacketsReturned] = useState("")
  const [shedName, setShedName] = useState("")
  const [shedOptions, setShedOptions] = useState([])
  const [ladies, setLadies] = useState("")
  const [gents, setGents] = useState("")
  const [notes, setNotes] = useState("")
  const [plantReadyDays, setPlantReadyDays] = useState("")
  const [saving, setSaving] = useState(false)

  const req = request || card?.activeRequest || card?.pendingRequest || null
  const cf = Number(card?.conversionFactor || req?.conversionFactor) || 1
  const expectedPlants = useMemo(() => {
    const pkts = Number(req?.packetsRequested) || 0
    return Math.round(pkts * cf) || Number(card?.totalPlantsInProgress) || 0
  }, [req, cf, card])
  const returnable = companyPacketCap(req)
  const canReturn = returnable > 0
  const plantsNum = Number(plants) || 0
  const usedNum = Number(packetsUsed) || 0
  const returnedNum = Number(packetsReturned) || 0
  const readyDaysNum = Math.max(0, Number(plantReadyDays) || 0)
  const defaultReady =
    Number(card?.plantReadyDays) || Number(req?.plantReadyDays) || 0

  useEffect(() => {
    if (!open || !req) return
    setPlants(expectedPlants > 0 ? String(expectedPlants) : "")
    setPacketsUsed(returnable > 0 ? String(returnable) : String(Number(req.packetsRequested) || ""))
    setPacketsReturned("")
    setShedName("")
    setLadies("")
    setGents("")
    setNotes("")
    setPlantReadyDays(defaultReady > 0 ? String(defaultReady) : "")
  }, [open, req?._id, expectedPlants, returnable, defaultReady])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const instance = NetworkManager(API.POLLY_HOUSE.GET_HOUSES)
        const res = await instance.request()
        const list = res?.data?.data || res?.data || []
        const names = (Array.isArray(list) ? list : [])
          .map((h) => h?.name || h?.pollyHouseName || h?.label || "")
          .filter(Boolean)
        if (!cancelled) setShedOptions([...new Set(names)])
      } catch {
        if (!cancelled) setShedOptions([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  // Keep used = issued - returned when return changes (company packets)
  useEffect(() => {
    if (!canReturn || packetsReturned === "") return
    const ret = Math.min(returnable, Math.max(0, Number(packetsReturned) || 0))
    setPacketsUsed(String(Math.max(0, returnable - ret)))
  }, [packetsReturned, canReturn, returnable])

  if (!open || !req?._id) return null

  const canSubmit =
    Boolean(shedName.trim()) &&
    readyDaysNum >= 1 &&
    (plantsNum > 0 || (canReturn && returnedNum > 0))

  const handleSubmit = async () => {
    if (!canSubmit) {
      Toast.error("Enter shed, plant ready days, plants sowed, and/or packets returned")
      return
    }
    setSaving(true)
    try {
      const payload = {
        plantsSowed: plantsNum,
        packetsUsed: usedNum,
        packetsToReturn: canReturn ? returnedNum : 0,
        shedName: shedName.trim(),
        laboursLadies: Number(ladies) || 0,
        laboursGents: Number(gents) || 0,
        notes: notes.trim(),
        plantReadyDays: readyDaysNum,
        completeSowing: true,
      }
      const instance = NetworkManager(API.sowing.COMPLETE_SOWING_REQUEST)
      const res = await instance.request(payload, { pathParams: [req._id] })
      if (res?.data?.success || res?.data?.message) {
        Toast.success(res?.data?.message || "Sow entry saved")
        onSuccess?.(res?.data)
        onClose?.()
      } else {
        Toast.error(res?.data?.message || "Failed to complete sow")
      }
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to complete sow")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5 }}>
        Enter sow
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {card?.plantName || req.plantName} · {card?.subtypeName || req.subtypeName}
          {" · "}
          {req.requestNumber}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.75} mt={1}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Expected ~${expectedPlants} plants`} />
            <Chip size="small" label={`${Number(req.packetsRequested) || 0} pkt issued`} color="primary" variant="outlined" />
            {canReturn ? (
              <Chip size="small" label={`Company cap ${returnable} pkt`} variant="outlined" />
            ) : (
              <Chip size="small" label="Raising / no return" variant="outlined" />
            )}
          </Stack>

          <Alert severity="info" sx={{ py: 0.5 }}>
            Same complete-sow flow as shed. Slot gets plantReadyDate = sow day + plant ready days.
          </Alert>

          <TextField
            label="Plants sowed *"
            type="number"
            value={plants}
            onChange={(e) => setPlants(e.target.value)}
            fullWidth
            inputProps={{ min: 0 }}
          />

          <TextField
            label="Plant ready days *"
            type="number"
            value={plantReadyDays}
            onChange={(e) => setPlantReadyDays(e.target.value)}
            fullWidth
            inputProps={{ min: 1 }}
            helperText="Ready date = sow day + days (maps to calendar slot)"
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="Packets used *"
              type="number"
              value={packetsUsed}
              onChange={(e) => setPacketsUsed(e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
            {canReturn && (
              <TextField
                label="Packets returned"
                type="number"
                value={packetsReturned}
                onChange={(e) => setPacketsReturned(e.target.value)}
                fullWidth
                inputProps={{ min: 0, max: returnable }}
                helperText={`Max ${returnable}`}
              />
            )}
          </Stack>

          {shedOptions.length > 0 ? (
            <TextField
              select
              label="Shed / pollyhouse *"
              value={shedName}
              onChange={(e) => setShedName(e.target.value)}
              fullWidth
            >
              {shedOptions.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </TextField>
          ) : (
            <TextField
              label="Shed / pollyhouse *"
              value={shedName}
              onChange={(e) => setShedName(e.target.value)}
              fullWidth
              placeholder="e.g. Shed A"
            />
          )}

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              label="Labour (ladies)"
              type="number"
              value={ladies}
              onChange={(e) => setLadies(e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Labour (gents)"
              type="number"
              value={gents}
              onChange={(e) => setGents(e.target.value)}
              fullWidth
              inputProps={{ min: 0 }}
            />
          </Stack>

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          {plantsNum > 0 && expectedPlants > 0 && plantsNum > expectedPlants * 1.25 && (
            <Alert severity="warning">Plants exceed expected by &gt;25% — double-check before saving.</Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving || !canSubmit}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? "Saving…" : "Complete sow"}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
