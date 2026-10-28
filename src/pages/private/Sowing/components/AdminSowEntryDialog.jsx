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
  Box,
} from "@mui/material"
import { NetworkManager, API } from "network/core"
import { cropPool, findSmartShed, shedWouldOverflow } from "../smartShedWarn"
import { Toast } from "helpers/toasts/toastHelper"
import MachineTimeField, {
  EMPTY_CLOCK,
  toClock24,
  machineMinutes,
  durationLabel,
} from "./MachineTimeField"

const TRAY_SIZE = 126

function todayYmd() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

/** Ready date label from YYYY-MM-DD sow date + days (local noon, same as BE). */
function readyDateHint(sowYmd, readyDays) {
  const days = Math.max(0, Number(readyDays) || 0)
  const m = String(sowYmd || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m || days < 1) return null
  const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), 12, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}-${mm}-${d.getFullYear()}`
}

function companyPacketCap(req) {
  const fromCompany = Number(req?.packetsFromCompany) || 0
  if (fromCompany > 0) return fromCompany
  if (String(req?.seedSource || "").toUpperCase() === "RAISING") return 0
  return Number(req?.packetsRequested) || Number(req?.packetsIssued) || 0
}

function raisingPacketCap(req) {
  return Math.max(0, Number(req?.packetsFromRaising) || 0)
}

function leftoverOf(open, used, returned) {
  return Math.max(0, Number((open - used - returned).toFixed(2)))
}

function parsePagedList(res) {
  const body = res?.data
  const nested = body?.data?.data
  if (Array.isArray(nested)) return nested
  if (Array.isArray(body?.data)) return body.data
  if (Array.isArray(body)) return body
  return []
}

/** Sowing is done only in Panhalgad (12), Vishalgad (14), Salher (15) and Kondhana (23). */
const SOWING_SHED_NUMBERS = new Set(["12", "14", "15", "23"])

function houseOption(row, group) {
  const name = String(row?.name || row?.title || row?.pollyHouseName || "").trim()
  const loc = String(row?.location || row?.number || "").trim()
  const value = name || loc || String(row?._id || "")
  if (!value) return null
  const label =
    name && loc && name !== loc ? `${name} — ${loc}` : name || loc || value
  return { value, label, group }
}

function PacketPoolCard({
  title,
  hint,
  accent,
  openPkts,
  used,
  onUsed,
  returned,
  onReturned,
  canReturn,
}) {
  const usedNum = Number(used) || 0
  const returnedNum = canReturn ? Number(returned) || 0 : 0
  const leftover = leftoverOf(openPkts, usedNum, returnedNum)
  const over = usedNum + returnedNum - openPkts > 0.001

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: "1.5px solid",
        borderColor: accent.border,
        bgcolor: accent.bg,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1} gap={1}>
        <Box minWidth={0}>
          <Typography fontWeight={800} fontSize="0.82rem" color={accent.title}>
            {title}
          </Typography>
          <Typography fontSize="0.7rem" fontWeight={600} color="text.secondary">
            {hint}
          </Typography>
        </Box>
        <Chip
          size="small"
          label={`${openPkts} pkt open`}
          sx={{
            height: 22,
            fontSize: "0.62rem",
            fontWeight: 800,
            bgcolor: accent.chip,
            color: "#fff",
          }}
        />
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.25}>
        <TextField
          label="Packets used *"
          type="number"
          value={used}
          onChange={(e) => onUsed(e.target.value)}
          fullWidth
          size="small"
          required
          inputProps={{ min: 0, max: openPkts }}
          helperText={`Open ${openPkts} pkt`}
        />
        {canReturn ? (
          <TextField
            label="Packets returned *"
            type="number"
            value={returned}
            onChange={(e) => onReturned(e.target.value)}
            fullWidth
            size="small"
            required
            inputProps={{ min: 0, max: openPkts }}
            helperText={`Required · 0 allowed · max ${openPkts}`}
          />
        ) : (
          <TextField
            label="Packets returned"
            value="—"
            fullWidth
            size="small"
            disabled
            helperText="No return on this pool"
          />
        )}
      </Stack>
      {over ? (
        <Alert severity="error" sx={{ mt: 1, py: 0.25 }}>
          Used + returned cannot exceed {openPkts} pkt still open.
        </Alert>
      ) : leftover > 0.001 ? (
        <Alert severity="warning" sx={{ mt: 1, py: 0.25 }}>
          {leftover} pkt stay on this request — it will not close from this pool.
        </Alert>
      ) : (
        <Alert severity="success" sx={{ mt: 1, py: 0.25 }}>
          Used + returned matches open — this pool is settled.
        </Alert>
      )}
    </Box>
  )
}

/**
 * Office / Super Admin sow entry — completes an issued sowing request (same complete-sow API as shed).
 * Request stays issued when company + raising used + returned < packets still open.
 */
export default function AdminSowEntryDialog({ open, request, card, onClose, onSuccess }) {
  const [plants, setPlants] = useState("")
  const [sowDate, setSowDate] = useState(todayYmd)
  const [packetsUsed, setPacketsUsed] = useState("")
  const [packetsReturned, setPacketsReturned] = useState("")
  const [raisingUsed, setRaisingUsed] = useState("")
  const [raisingReturned, setRaisingReturned] = useState("")
  const [shedName, setShedName] = useState("")
  const [shedOptions, setShedOptions] = useState([])
  const [shedsLoading, setShedsLoading] = useState(false)
  const [smartSheds, setSmartSheds] = useState([])
  const [ladies, setLadies] = useState("")
  const [gents, setGents] = useState("")
  const [notes, setNotes] = useState("")
  const [plantReadyDays, setPlantReadyDays] = useState("")
  const [machineStart, setMachineStart] = useState(EMPTY_CLOCK)
  const [machineEnd, setMachineEnd] = useState(EMPTY_CLOCK)
  const [saving, setSaving] = useState(false)

  const req = request || card?.activeRequest || card?.pendingRequest || null
  const cf = Number(card?.conversionFactor || req?.conversionFactor) || 1
  const expectedPlants = useMemo(() => {
    const pkts = Number(req?.packetsRequested) || 0
    return Math.round(pkts * cf) || Number(card?.totalPlantsInProgress) || 0
  }, [req, cf, card])
  const companyCap = companyPacketCap(req)
  const raisingCap = raisingPacketCap(req)
  const hasCompany = companyCap > 0
  const hasRaising = raisingCap > 0
  const companyOpen = useMemo(() => {
    const issued =
      Number(req?.packetsIssued) ||
      companyCap ||
      0
    const alreadyUsed = Number(req?.packetsUsed) || 0
    const alreadyReturned = Number(req?.packetsReturned) || 0
    return Math.max(0, Number((issued - alreadyUsed - alreadyReturned).toFixed(2)))
  }, [req, companyCap])
  const raisingOpen = useMemo(() => {
    const alreadyUsed = Number(req?.raisingPacketsUsed) || 0
    const alreadyReturned = Number(req?.raisingPacketsReturned) || 0
    return Math.max(0, Number((raisingCap - alreadyUsed - alreadyReturned).toFixed(2)))
  }, [req, raisingCap])

  const plantsNum = Number(plants) || 0
  const plantLabel = card?.plantName || req?.plantName || card?.name || ""
  const shedOverflow = shedWouldOverflow(findSmartShed(smartSheds, shedName), cropPool(plantLabel), plantsNum)
  const traysNum = plantsNum > 0 ? Math.ceil(plantsNum / TRAY_SIZE) : 0
  const usedNum = Number(packetsUsed) || 0
  const returnedNum = Number(packetsReturned) || 0
  const raisingUsedNum = Number(raisingUsed) || 0
  const raisingReturnedNum = Number(raisingReturned) || 0
  const leftoverCompany = hasCompany ? leftoverOf(companyOpen, usedNum, returnedNum) : 0
  const leftoverRaising = hasRaising
    ? leftoverOf(raisingOpen, raisingUsedNum, raisingReturnedNum)
    : 0
  const leftoverPkts = leftoverCompany + leftoverRaising
  const returning = (hasCompany && returnedNum > 0) || (hasRaising && raisingReturnedNum > 0)
  const willClose = leftoverPkts <= 0.001 || returning
  const companyOver = hasCompany && usedNum + returnedNum - companyOpen > 0.001
  const raisingOver = hasRaising && raisingUsedNum + raisingReturnedNum - raisingOpen > 0.001
  const packetsOver = companyOver || raisingOver
  const readyDaysNum = Math.max(0, Number(plantReadyDays) || 0)
  const defaultReady =
    Number(card?.plantReadyDays) || Number(req?.plantReadyDays) || 0
  const readyHint = useMemo(
    () => readyDateHint(sowDate, readyDaysNum),
    [sowDate, readyDaysNum]
  )

  const shadeOpts = shedOptions.filter((o) => o.group === "shed")

  useEffect(() => {
    if (!open || !req) return
    setPlants(expectedPlants > 0 ? String(expectedPlants) : "")
    setSowDate(todayYmd())
    setPacketsUsed(hasCompany && companyOpen > 0 ? String(companyOpen) : "")
    setPacketsReturned(hasCompany && companyOpen > 0 ? "0" : "")
    setRaisingUsed(hasRaising && raisingOpen > 0 ? String(raisingOpen) : "")
    setRaisingReturned(hasRaising && raisingOpen > 0 ? "0" : "")
    setShedName("")
    setLadies("")
    setGents("")
    setNotes("")
    setMachineStart(EMPTY_CLOCK)
    setMachineEnd(EMPTY_CLOCK)
    setPlantReadyDays(defaultReady > 0 ? String(defaultReady) : "")
  }, [open, req?._id, expectedPlants, companyOpen, raisingOpen, hasCompany, hasRaising, defaultReady])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setShedsLoading(true)
      try {
        const shadeRes = await NetworkManager(API.SHADE.GET_SHADES).request(
          {},
          { page: 1, limit: 500, status: "true" }
        )
        if (cancelled) return
        const shades = parsePagedList(shadeRes)
          .filter(
            (s) =>
              s?.isActive !== false &&
              SOWING_SHED_NUMBERS.has(String(s?.number ?? "").trim())
          )
          .map((s) => houseOption(s, "shed"))
          .filter(Boolean)
        const seen = new Set()
        const merged = shades.filter((o) => {
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

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await NetworkManager(API.sowing.GET_SMART_SHED).request()
        if (!cancelled && res?.data?.success) setSmartSheds(res.data.sheds || [])
      } catch {
        if (!cancelled) setSmartSheds([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  if (!open || !req?._id) return null

  const filled = (v) => String(v ?? "").trim() !== ""
  const companyPacketsFilled =
    !hasCompany || companyOpen <= 0 || (filled(packetsUsed) && filled(packetsReturned))
  const raisingPacketsFilled =
    !hasRaising || raisingOpen <= 0 || (filled(raisingUsed) && filled(raisingReturned))
  const companyTouched = hasCompany && (usedNum > 0 || returnedNum > 0)
  const raisingTouched = hasRaising && (raisingUsedNum > 0 || raisingReturnedNum > 0)
  const machineStart24 = toClock24(machineStart)
  const machineEnd24 = toClock24(machineEnd)
  const machineSet = Boolean(machineStart24 && machineEnd24)
  const machineNeeded = plantsNum > 0
  const canSubmit =
    Boolean(shedName.trim()) &&
    Boolean(String(sowDate || "").trim()) &&
    readyDaysNum >= 1 &&
    companyPacketsFilled &&
    raisingPacketsFilled &&
    (plantsNum > 0 || companyTouched || raisingTouched) &&
    (!machineNeeded || machineSet) &&
    !packetsOver

  const handleSubmit = async () => {
    if (!canSubmit) {
      Toast.error(
        "Select sow date, shed, plant ready days, machine time, plants, and packets used + returned"
      )
      return
    }
    if (companyOver) {
      Toast.error(`Company used + returned cannot exceed ${companyOpen} pkt still issued`)
      return
    }
    if (raisingOver) {
      Toast.error(`Raising used + returned cannot exceed ${raisingOpen} pkt still open`)
      return
    }
    setSaving(true)
    try {
      const payload = {
        plantsSowed: plantsNum,
        traySize: TRAY_SIZE,
        trays: traysNum,
        packetsUsed: hasCompany ? usedNum : 0,
        packetsToReturn: hasCompany ? returnedNum : 0,
        raisingPacketsUsed: hasRaising ? raisingUsedNum : 0,
        raisingPacketsToReturn: hasRaising ? raisingReturnedNum : 0,
        shedName: shedName.trim(),
        laboursLadies: Number(ladies) || 0,
        laboursGents: Number(gents) || 0,
        notes: notes.trim(),
        sowDate: String(sowDate).trim(),
        plantReadyDays: readyDaysNum,
        completeSowing: willClose,
        ...(machineSet
          ? { machineStartTime: machineStart24, machineEndTime: machineEnd24 }
          : {}),
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
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1.5px solid #93c5fd",
          boxShadow: "0 12px 36px rgba(37,99,235,0.16)",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800, pb: 0.5, bgcolor: "#eff6ff" }}>
        Enter sow
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {card?.plantName || req.plantName} · {card?.subtypeName || req.subtypeName}
          {" · "}
          {req.requestNumber}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ bgcolor: "#f8fafc" }}>
        <Stack spacing={1.75} mt={1}>
          <Box
            sx={{
              px: 1.25,
              py: 1,
              borderRadius: 2,
              bgcolor: "#dbeafe",
              border: "1px solid #93c5fd",
            }}
          >
            <Typography fontSize="0.78rem" fontWeight={800} color="#1d4ed8">
              Stock issued — enter used and return for each seed pool
            </Typography>
            <Typography fontSize="0.7rem" fontWeight={600} color="text.secondary">
              Ready date = sow date + plant ready days. Leftover packets keep the request open.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Expected ~${expectedPlants} plants`} />
            {hasCompany ? (
              <Chip
                size="small"
                label={`Company ${companyOpen} pkt`}
                sx={{ bgcolor: "#2563eb", color: "#fff", fontWeight: 700 }}
              />
            ) : null}
            {hasRaising ? (
              <Chip
                size="small"
                label={`Raising ${raisingOpen} pkt`}
                sx={{ bgcolor: "#16a34a", color: "#fff", fontWeight: 700 }}
              />
            ) : null}
            {!hasCompany && !hasRaising ? (
              <Chip size="small" label="No packets open" variant="outlined" />
            ) : null}
          </Stack>

          <TextField
            label="Plants sowed *"
            type="number"
            value={plants}
            onChange={(e) => setPlants(e.target.value)}
            fullWidth
            inputProps={{ min: 0 }}
          />

          <Stack direction="row" spacing={1.5}>
            <TextField select label="Tray" value={TRAY_SIZE} disabled fullWidth>
              <MenuItem value={TRAY_SIZE}>{TRAY_SIZE} cavity</MenuItem>
            </TextField>
            <TextField
              label="Trays"
              value={traysNum ? traysNum.toLocaleString() : ""}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText={
                plantsNum > 0 ? `${plantsNum.toLocaleString()} ÷ ${TRAY_SIZE}, rounded up` : "From plants sowed"
              }
            />
          </Stack>

          <TextField
            label="Sow date *"
            type="date"
            value={sowDate}
            onChange={(e) => setSowDate(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
            helperText="Defaults to today — change if sowing was on another day"
          />

          <Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <MachineTimeField
                label={`Machine start${machineNeeded ? " *" : ""}`}
                value={machineStart}
                onChange={setMachineStart}
              />
              <MachineTimeField
                label={`Machine end${machineNeeded ? " *" : ""}`}
                value={machineEnd}
                onChange={setMachineEnd}
              />
            </Stack>
            {machineSet ? (
              <Typography fontSize="0.72rem" fontWeight={700} color="#0f766e" mt={0.5}>
                Machine ran {durationLabel(machineMinutes(machineStart24, machineEnd24))}
              </Typography>
            ) : null}
          </Box>

          <TextField
            label="Plant ready days *"
            type="number"
            value={plantReadyDays}
            onChange={(e) => setPlantReadyDays(e.target.value)}
            fullWidth
            inputProps={{ min: 1 }}
            helperText={
              readyHint
                ? `Ready date · ${readyHint} (sow + ${readyDaysNum}d)`
                : "Ready date = sow date + days (maps to calendar slot)"
            }
          />

          {hasCompany && companyOpen > 0 ? (
            <PacketPoolCard
              title="Company seed"
              hint="Warehouse / Ram Agri issue — return unused bags"
              accent={{
                bg: "#eff6ff",
                border: "#93c5fd",
                title: "#1d4ed8",
                chip: "#2563eb",
              }}
              openPkts={companyOpen}
              used={packetsUsed}
              onUsed={setPacketsUsed}
              returned={packetsReturned}
              onReturned={setPacketsReturned}
              canReturn
            />
          ) : null}

          {hasRaising && raisingOpen > 0 ? (
            <PacketPoolCard
              title="Raising seed"
              hint="Customer seed — used vs returned to intake"
              accent={{
                bg: "#f0fdf4",
                border: "#86efac",
                title: "#166534",
                chip: "#16a34a",
              }}
              openPkts={raisingOpen}
              used={raisingUsed}
              onUsed={setRaisingUsed}
              returned={raisingReturned}
              onReturned={setRaisingReturned}
              canReturn
            />
          ) : null}

          {leftoverPkts > 0.001 && returning ? (
            <Alert severity="info" sx={{ py: 0.5 }}>
              Packets returned, so this request will close.{" "}
              {leftoverCompany > 0.001 ? `${leftoverCompany} company pkt` : null}
              {leftoverCompany > 0.001 && leftoverRaising > 0.001 ? " + " : null}
              {leftoverRaising > 0.001 ? `${leftoverRaising} raising pkt` : null}
              {" not entered will also be returned."}
            </Alert>
          ) : leftoverPkts > 0.001 ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              {leftoverCompany > 0.001 ? `${leftoverCompany} company pkt` : null}
              {leftoverCompany > 0.001 && leftoverRaising > 0.001 ? " + " : null}
              {leftoverRaising > 0.001 ? `${leftoverRaising} raising pkt` : null}
              {" stay on this request — it will not close."}
            </Alert>
          ) : hasCompany || hasRaising ? (
            <Alert severity="success" sx={{ py: 0.5 }}>
              Company and raising pools match issued — request will close.
            </Alert>
          ) : null}

          {shedOptions.length > 0 || shedsLoading ? (
          <TextField
            select
            label="Shed *"
            value={shedName}
            onChange={(e) => setShedName(e.target.value)}
            fullWidth
            disabled={shedsLoading}
            helperText={
              shedsLoading
                ? "Loading sowing sheds…"
                : "Select where sowing was done"
            }
          >
            <MenuItem value="" disabled>
              {shedsLoading ? "Loading…" : "Select shed"}
            </MenuItem>
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

          {shedOverflow ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              This sow would push {shedName} over 100% of its shared papaya and watermelon space. You can still save.
            </Alert>
          ) : null}

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
      <DialogActions sx={{ px: 3, pb: 2, bgcolor: "#eff6ff" }}>
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
