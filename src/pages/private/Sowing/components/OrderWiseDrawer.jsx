import React, { useEffect, useState } from "react"
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Stack,
  CircularProgress,
  Button,
  Divider,
  Chip,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import { NetworkManager, API } from "network/core"
import SeedPlanChip from "./SeedPlanChip"
import RaisingIntakeModal from "./RaisingIntakeModal"
import { useSowHorizon } from "./SowHorizonContext"

function isRaisingCollected(o) {
  return Boolean(
    o?.raisingCollected ||
      o?.sowingPlan?.raisingIntakeCollected ||
      o?.sowingPlan?.raisingIntakeId ||
      Number(o?.raisingInHandPackets) > 0
  )
}

function isRaisingOrder(o, collectedOnly = false) {
  const src = o?.sowingPlan?.seedSource
  const planned = src === "RAISING" || src === "MIXED"
  if (!planned) return false
  if (collectedOnly) return isRaisingCollected(o)
  return true
}

function isRaisingLinked(o) {
  return Boolean(
    o?.sowingPlan?.raisingIntakeId ||
      (Array.isArray(o?.raisingIntakes) && o.raisingIntakes.length > 0)
  )
}

function raisingRowStatus(o) {
  if (!isRaisingOrder(o)) return null
  const packets = Number(o?.raisingInHandPackets) || 0
  const linked = isRaisingLinked(o)
  const collected = isRaisingCollected(o)
  if (packets > 0) {
    return {
      key: "ready",
      label: `Collected · ${packets} pkt available`,
      bgcolor: "#ecfdf5",
      borderColor: "#6ee7b7",
      chipBg: "#d1fae5",
      chipColor: "#047857",
    }
  }
  if (linked || collected) {
    return {
      key: "empty",
      label: "Collected · no packets remaining",
      bgcolor: "#fff1f2",
      borderColor: "#fda4af",
      chipBg: "#ffe4e6",
      chipColor: "#be123c",
    }
  }
  return {
    key: "unlinked",
    label: "Seed not linked · not collected",
    bgcolor: "#fffbeb",
    borderColor: "#fcd34d",
    chipBg: "#fef3c7",
    chipColor: "#b45309",
  }
}

function isSelectionLocked(o) {
  return Boolean(o?.alreadyRequested || raisingRowStatus(o)?.key === "empty")
}

function fmtDelivery(d) {
  if (!d) return null
  // DD-MM-YYYY from API (sowByDate)
  const dmy = String(d).match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (dmy) {
    const dt = new Date(
      Number(dmy[3]),
      Number(dmy[2]) - 1,
      Number(dmy[1]),
      12,
      0,
      0
    )
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

/** Chip: +N green (time left), 0 amber (today), −N red (overdue) */
function SowDaysChip({ daysUntilSow }) {
  if (daysUntilSow == null || !Number.isFinite(Number(daysUntilSow))) return null
  const n = Number(daysUntilSow)
  let label
  let bgcolor
  let color
  if (n < 0) {
    label = `${n}d` // e.g. -3d
    bgcolor = "#fee2e2"
    color = "#991b1b"
  } else if (n === 0) {
    label = "0d · today"
    bgcolor = "#fef3c7"
    color = "#92400e"
  } else {
    label = `+${n}d`
    bgcolor = "#dcfce7"
    color = "#166534"
  }
  return (
    <Chip
      size="small"
      label={label}
      title={
        n < 0
          ? `${Math.abs(n)} days overdue to sow`
          : n === 0
            ? "Sow by today"
            : `${n} days remaining to sow`
      }
      sx={{ height: 22, fontWeight: 900, fontSize: "0.68rem", bgcolor, color }}
    />
  )
}

export default function OrderWiseDrawer({
  open,
  onClose,
  card,
  onRequestPackets,
  onUseCompanySeed,
  onSeedCollected,
  raisingOnly = false,
}) {
  const { sowHorizonDays } = useSowHorizon()
  const [loading, setLoading] = useState(false)
  const [rows, setRows] = useState([])
  const [selected, setSelected] = useState([])
  const [confirmCompanyOpen, setConfirmCompanyOpen] = useState(false)
  const [converting, setConverting] = useState(false)
  const [collectRow, setCollectRow] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!open || !card) return
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        const slotIds = (card.slotIds || card.slots || [])
          .map((s) => (typeof s === "object" ? s._id || s.slotId : s))
          .filter(Boolean)
          .join(",")
        const instance = NetworkManager(API.sowing.GET_ORDER_WISE_SOWING)
        const res = await instance.request({}, {
          plantId: card.plantId,
          subtypeId: card.subtypeId,
          slotIds,
          days: sowHorizonDays,
        })
        if (!cancelled) {
          const data = res?.data?.data || []
          const filtered = raisingOnly ? data.filter((o) => isRaisingOrder(o)) : data
          setRows(filtered)
          // Exclude active requests and collected intakes with no seed remaining.
          setSelected(
            filtered
              .filter((o) => !isSelectionLocked(o))
              .map((o) => String(o.orderId))
          )
          setConfirmCompanyOpen(false)
        }
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [open, card, raisingOnly, sowHorizonDays, reloadKey])

  const openRows = rows.filter((o) => !isSelectionLocked(o))
  const visibleRaisingInHand = rows.reduce(
    (sum, row) => sum + (Number(row.raisingInHandPackets) || 0),
    0
  )
  const toggle = (id) => {
    const row = rows.find((o) => String(o.orderId) === id)
    if (!row || isSelectionLocked(row)) return
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const selectedRows = rows.filter((o) =>
    selected.includes(String(o.orderId))
  )
  const companyFallbackRows = selectedRows.filter(
    (o) =>
      isRaisingOrder(o) &&
      !isRaisingCollected(o) &&
      !isRaisingLinked(o)
  )

  const requestSelected = () => {
    if (companyFallbackRows.length > 0) {
      setConfirmCompanyOpen(true)
      return
    }
    onRequestPackets?.(rows, selected)
  }

  const confirmCompanySeed = async () => {
    try {
      setConverting(true)
      const updatedRows = await onUseCompanySeed?.(
        rows,
        companyFallbackRows.map((o) => String(o.orderId))
      )
      setConfirmCompanyOpen(false)
      onRequestPackets?.(updatedRows || rows, selected)
    } catch {
      // Parent displays the API error; keep this confirmation open for retry/cancel.
    } finally {
      setConverting(false)
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 420 } } }}>
      <Box sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {raisingOnly ? "Farmer seed orders" : "Orders"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {card?.plantName} · {card?.subtypeName}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>

        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {raisingOnly ? (
            <>
              Farmer seed orders · gap{" "}
              {Number(card?.totalPlantsToSowRaw) ||
                card?.totalPlantsToSowWithBuffer ||
                card?.totalGap ||
                0}{" "}
              plants (no buffer)
              {visibleRaisingInHand > 0
                ? ` · ${visibleRaisingInHand} pkt in hand`
                : " · none in hand"}
            </>
          ) : (
            <>
              Need ~{card?.packetsNeeded?.toFixed?.(2) ?? card?.packetsNeeded} packets ·{" "}
              {card?.totalPlantsToSowWithBuffer || card?.totalGap || 0} plants
            </>
          )}
        </Typography>
        <Divider sx={{ mb: 1.5 }} />

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary">
              {raisingOnly
              ? "No eligible farmer-seed orders for this plant / subtype."
              : "No active orders for these slots."}
          </Typography>
        ) : (
          <Stack spacing={1.25} sx={{ flex: 1, overflow: "auto", pb: 2 }}>
            {rows.map((o) => {
              const id = String(o.orderId)
              const raisingStatus = raisingRowStatus(o)
              const locked = isSelectionLocked(o)
              return (
                <Box
                  key={id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: locked
                      ? raisingStatus?.borderColor || "#e5e7eb"
                      : raisingStatus?.borderColor || "#e6ebf1",
                    bgcolor: locked
                      ? raisingStatus?.bgcolor || "#f9fafb"
                      : selected.includes(id)
                        ? raisingStatus?.bgcolor || "#f0f7ff"
                        : raisingStatus?.bgcolor || "#fff",
                    opacity: locked ? 0.85 : 1,
                  }}
                >
                  <Stack direction="row" alignItems="flex-start" spacing={0.5}>
                    <Checkbox
                      size="small"
                      checked={selected.includes(id)}
                      disabled={locked}
                      onChange={() => toggle(id)}
                      sx={{ pt: 0 }}
                    />
                    <Box flex={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={0.75}>
                        <Typography fontWeight={700} variant="body2">
                          #{o.orderNumber} · {o.farmerName || "Farmer"}
                        </Typography>
                        <SowDaysChip daysUntilSow={o.daysUntilSow} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {o.numberOfPlants} plants · suggest {o.suggestedPackets} pkt
                      </Typography>
                      <Typography variant="caption" fontWeight={700} display="block" sx={{ mt: 0.25 }}>
                        Delivery:{" "}
                        {fmtDelivery(o.deliveryDate) || o.slotStartDay || "—"}
                      </Typography>
                      {(o.sowByDate ||
                        (o.plantReadyDays != null && o.plantReadyDays > 0)) && (
                        <Typography
                          variant="caption"
                          fontWeight={800}
                          display="block"
                          sx={{
                            mt: 0.15,
                            color:
                              Number(o.daysUntilSow) < 0
                                ? "#b91c1c"
                                : Number(o.daysUntilSow) === 0
                                  ? "#b45309"
                                  : "#15803d",
                          }}
                        >
                          Sow by:{" "}
                          {fmtDelivery(o.sowByDate) ||
                            (o.deliveryDate && o.plantReadyDays
                              ? fmtDelivery(
                                  new Date(
                                    new Date(o.deliveryDate).getTime() -
                                      Number(o.plantReadyDays) * 86400000
                                  )
                                )
                              : "—")}
                          {o.plantReadyDays != null && o.plantReadyDays > 0
                            ? ` (delivery − ${o.plantReadyDays}d)`
                            : ""}
                        </Typography>
                      )}
                      <Box mt={0.75} display="flex" flexWrap="wrap" gap={0.5}>
                        <SeedPlanChip
                          seedSource={o.sowingPlan?.seedSource}
                          companyPackets={o.sowingPlan?.companySeedPackets}
                          raisingPackets={
                            isRaisingCollected(o)
                              ? o.raisingInHandPackets || o.sowingPlan?.raisingSeedPackets
                              : 0
                          }
                          collected={isRaisingCollected(o)}
                        />
                        {raisingStatus && (
                          <Chip
                            size="small"
                            label={raisingStatus.label}
                            sx={{
                              height: 22,
                              fontWeight: 800,
                              bgcolor: raisingStatus.chipBg,
                              color: raisingStatus.chipColor,
                            }}
                          />
                        )}
                        {o.alreadyRequested && (
                          <Chip
                            size="small"
                            label={`Already requested · ${o.existingRequestNumber || "—"}`}
                            sx={{
                              height: 22,
                              fontWeight: 700,
                              bgcolor: "#e5e7eb",
                              color: "#374151",
                            }}
                          />
                        )}
                        {o.raisingInHandPackets > 0 && !locked && (
                          <Chip
                            size="small"
                            label={`${o.raisingInHandPackets} cust. in hand`}
                            sx={{ bgcolor: "#fff8e1", height: 22 }}
                          />
                        )}
                        {raisingStatus?.key === "unlinked" && !o.alreadyRequested && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setCollectRow(o)}
                            sx={{
                              minHeight: 22,
                              py: 0,
                              textTransform: "none",
                              fontWeight: 800,
                            }}
                          >
                            Collect seed
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Stack>
                </Box>
              )
            })}
          </Stack>
        )}

        <Box sx={{ pt: 1.5, borderTop: "1px solid #eee" }}>
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={
                  openRows.length > 0 && selected.length === openRows.length
                }
                disabled={!openRows.length}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? openRows.map((o) => String(o.orderId))
                      : []
                  )
                }
              />
            }
            label={`Select all open (${openRows.length})`}
          />
          <Button
            fullWidth
            variant="contained"
            disabled={!selected.length}
            onClick={requestSelected}
            sx={{ mt: 1 }}
          >
            Request packets ({selected.length})
          </Button>
        </Box>
      </Box>
      <Dialog
        open={confirmCompanyOpen}
        onClose={converting ? undefined : () => setConfirmCompanyOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Company seed confirmation</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 0.5 }}>
            शेतकऱ्याचे रायझिंग बियाणे आलेले नाही. कंपनीचे बियाणे वापरायचे का?
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {companyFallbackRows.length} selected order(s) will be permanently
            changed from farmer seed to company seed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmCompanyOpen(false)}
            disabled={converting}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={confirmCompanySeed}
            disabled={converting || !onUseCompanySeed}
          >
            {converting ? "Changing…" : "Use company seed"}
          </Button>
        </DialogActions>
      </Dialog>
      <RaisingIntakeModal
        open={Boolean(collectRow)}
        onClose={() => setCollectRow(null)}
        plantId={card?.plantId}
        subtypeId={card?.subtypeId}
        orderId={collectRow?.orderId}
        farmerName={collectRow?.farmerName}
        defaultPackets={
          collectRow?.sowingPlan?.raisingSeedPackets ||
          collectRow?.suggestedPackets ||
          1
        }
        slotIds={collectRow?.bookingSlot ? [collectRow.bookingSlot] : []}
        onCreated={(intake) => {
          setCollectRow(null)
          setReloadKey((value) => value + 1)
          onSeedCollected?.(intake)
        }}
      />
    </Drawer>
  )
}
