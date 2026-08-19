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
  ListSubheader,
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

function parsePagedList(res) {
  const body = res?.data
  const nested = body?.data?.data
  if (Array.isArray(nested)) return nested
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body)) return body
  return []
}

function houseOption(row, group) {
  const name = String(row?.name || row?.title || row?.pollyHouseName || "").trim()
  const loc = String(row?.location || row?.number || "").trim()
  const value = name || loc || String(row?._id || "")
  if (!value) return null
  const label =
    name && loc && name !== loc ? `${name} — ${loc}` : name || loc || value
  return { value, label, group }
}

/**
 * Office / Super Admin sow entry — completes an issued sowing request (same complete-sow API as shed).
 * Request stays issued when used + returned < packets still open.
 */
export default function AdminSowEntryDialog({ open, request, card, onClose, onSuccess }) {
  const [plants, setPlants] = useState("")
  const [packetsUsed, setPacketsUsed] = useState("")
  const [packetsReturned, setPacketsReturned] = useState("")
  const [shedName, setShedName] = useState("")
  const [shedOptions, setShedOptions] = useState([])
  const [shedsLoading, setShedsLoading] = useState(false)
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
  const issuedOpen = useMemo(() => {
    const issued =
      Number(req?.packetsIssued) ||
      returnable ||
      Number(req?.packetsRequested) ||
      0
    const alreadyUsed = Number(req?.packetsUsed) || 0
    const alreadyReturned = Number(req?.packetsReturned) || 0
    return Math.max(0, issued - alreadyUsed - alreadyReturned)
  }, [req, returnable])
  const plantsNum = Number(plants) || 0
  const usedNum = Number(packetsUsed) || 0
  const returnedNum = Number(packetsReturned) || 0
  const leftoverPkts = Math.max(0, Number((issuedOpen - usedNum - (canReturn ? returnedNum : 0)).toFixed(2)))
  const willClose = leftoverPkts <= 0.001
  const readyDaysNum = Math.max(0, Number(plantReadyDays) || 0)
  const defaultReady =
    Number(card?.plantReadyDays) || Number(req?.plantReadyDays) || 0

  const pollyOpts = shedOptions.filter((o) => o.group === "pollyhouse")
  const shadeOpts = shedOptions.filter((o) => o.group === "shed")

  useEffect(() => {
    if (!open || !req) return
    setPlants(expectedPlants > 0 ? String(expectedPlants) : "")
    setPacketsUsed(issuedOpen > 0 ? String(issuedOpen) : "")
    setPacketsReturned("")
    setShedName("")
    setLadies("")
    setGents("")
    setNotes("")
    setPlantReadyDays(defaultReady > 0 ? String(defaultReady) : "")
  }, [open, req?._id, expectedPlants, issuedOpen, defaultReady])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setShedsLoading(true)
      try {
        const pollyInst = NetworkManager(API.POLLY_HOUSE.GET_HOUSES)
        const shadeInst = NetworkManager(API.SHADE.GET_SHADES)
        const query = { page: 1, limit: 500, status: "true" }
        const [pollyRes, shadeRes] = await Promise.all([
          pollyInst.request({}, query),
          shadeInst.request({}, query),
        ])
        if (cancelled) return
        const polly = parsePagedList(pollyRes)
          .filter((p) => p?.isActive !== false)
          .map((p) => houseOption(p, "pollyhouse"))
          .filter(Boolean)
        const shades = parsePagedList(shadeRes)
          .filter((s) => s?.isActive !== false)
          .map((s) => houseOption(s, "shed"))
          .filter(Boolean)
        const seen = new Set()
        const merged = [...polly, ...shades].filter((o) => {
          if (seen.has(o.value)) return false
          seen.add(o.value)
          return true
        })
        setShedOptions(merged)
      } catch {
        if (!cancelled) setShedOptions([])
      } finally {
        if (!cancelled) setShedsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open || !req?._id) return null

  const usedPlusReturned = usedNum + (canReturn ? returnedNum : 0)
  const packetsOver = usedPlusReturned - issuedOpen > 0.001
  const canSubmit =
    Boolean(shedName.trim()) &&
    readyDaysNum >= 1 &&
    (plantsNum > 0 || (canReturn && returnedNum > 0)) &&
    !packetsOver &&
    (issuedOpen <= 0 || usedPlusReturned > 0 || plantsNum > 0)

  const handleSubmit = async () => {
    if (!canSubmit) {
      Toast.error("Select pollyhouse/shed, plant ready days, and plants / packets")
      return
    }
    if (packetsOver) {
      Toast.error(`Used + returned cannot exceed ${issuedOpen} pkt still issued`)
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
        completeSowing: willClose,
      }
      const instance = NetworkManager(API.sowing.COMPLETE_SOWING_REQUEST)
      const res = await instance.request(payload, { pathParams: [req._id] })
      if (res?.data?.success || res?.data?.message) {
        const remaining = Number(res?.data?.data?.packetsRemaining)
        const closed = Boolean(res?.data?.data?.sowingCompleted)
        Toast.success(
          closed
            ? res?.data?.message || "Sow entry saved — request closed"
            : remaining > 0
              ? `Sow saved · ${remaining} pkt still on request (not closed)`
              : res?.data?.message || "Sowing progress saved"
        )
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
            <Chip
              size="small"
              label={`${issuedOpen} pkt still issued`}
              color="primary"
              variant="outlined"
            />
            {canReturn ? (
              <Chip size="small" label={`Company cap ${returnable} pkt`} variant="outlined" />
            ) : (
              <Chip size="small" label="Raising / no return" variant="outlined" />
            )}
          </Stack>

          <Alert severity="info" sx={{ py: 0.5 }}>
            Ready date = sow day + plant ready days. If used + returned is less than issued,
            the request stays open with leftover packets.
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
              inputProps={{ min: 0, max: issuedOpen }}
              helperText={`Open ${issuedOpen} pkt`}
            />
            {canReturn && (
              <TextField
                label="Packets returned"
                type="number"
                value={packetsReturned}
                onChange={(e) => setPacketsReturned(e.target.value)}
                fullWidth
                inputProps={{ min: 0, max: issuedOpen }}
                helperText={`Max ${issuedOpen}`}
              />
            )}
          </Stack>

          {issuedOpen > 0 ? (
            leftoverPkts > 0.001 ? (
              <Alert severity="warning" sx={{ py: 0.5 }}>
                Used {usedNum} + returned {canReturn ? returnedNum : 0} = {usedPlusReturned} of{" "}
                {issuedOpen} issued. <strong>{leftoverPkts} pkt stay on this request</strong> — it
                will not close.
              </Alert>
            ) : (
              <Alert severity="success" sx={{ py: 0.5 }}>
                Used + returned matches issued — request will close.
              </Alert>
            )
          ) : null}

          {packetsOver ? (
            <Alert severity="error" sx={{ py: 0.5 }}>
              Used + returned cannot be more than {issuedOpen} pkt still issued.
            </Alert>
          ) : null}

          {shedOptions.length > 0 || shedsLoading ? (
          <TextField
            select
            label="Pollyhouse / shed *"
            value={shedName}
            onChange={(e) => setShedName(e.target.value)}
            fullWidth
            disabled={shedsLoading}
            helperText={
              shedsLoading
                ? "Loading pollyhouses and sheds…"
                : "Select where sowing was done"
            }
          >
            <MenuItem value="" disabled>
              {shedsLoading ? "Loading…" : "Select pollyhouse or shed"}
            </MenuItem>
            {pollyOpts.length > 0 ? <ListSubheader disableSticky>Pollyhouse</ListSubheader> : null}
            {pollyOpts.map((o) => (
              <MenuItem key={`p-${o.value}`} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
            {shadeOpts.length > 0 ? <ListSubheader disableSticky>Shed</ListSubheader> : null}
            {shadeOpts.map((o) => (
              <MenuItem key={`s-${o.value}`} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          ) : (
            <TextField
              label="Pollyhouse / shed *"
              value={shedName}
              onChange={(e) => setShedName(e.target.value)}
              fullWidth
              placeholder="e.g. Shed A"
              helperText="No CMS list loaded — type the shed name"
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
          {saving
            ? "Saving…"
            : willClose
              ? "Complete sow"
              : `Save progress · ${leftoverPkts} pkt remain`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
