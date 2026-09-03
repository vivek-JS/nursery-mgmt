import React, { useState } from "react"
import moment from "moment"
import {
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Popover,
  CircularProgress,
} from "@mui/material"
import { ArrowRightLeft, Info } from "lucide-react"
import RemoveShoppingCartOutlinedIcon from "@mui/icons-material/RemoveShoppingCartOutlined"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import {
  SlotReadySoldBox,
  SlotReadySoldContent,
} from "../dashboard/components/SlotReadySoldPanel"
import SlotActualReadyBreakdownModal from "./SlotActualReadyBreakdownModal"
import RollActualReadyModal from "./RollActualReadyModal"
import {
  getActualReadyPlants,
  getExpectedMortality,
} from "./slotMetrics"

const fmt = (n) => (Number(n) || 0).toLocaleString()

const tileBase =
  "rounded-lg border text-left transition-all min-w-0"

/**
 * Lagwad-derived slot fields: 90% actual, 10% mortality, ready (dispatch subtracts ready).
 */
const SlotLagwadMetrics = ({
  slot,
  variant = "card",
  onOpenActual,
  onSlotChanged,
  onOpenRollHistory,
  className = "",
}) => {
  const actualPlants = Number(slot?.actualPlants) || 0
  const mortality = getExpectedMortality(slot)
  const actualReady = getActualReadyPlants(slot)
  const hasLagwad = actualPlants > 0 || mortality > 0 || actualReady > 0

  const [transferOpen, setTransferOpen] = useState(false)
  const [transferQty, setTransferQty] = useState("")
  const [transferring, setTransferring] = useState(false)
  const [soldOpen, setSoldOpen] = useState(false)
  const [readyBreakdownOpen, setReadyBreakdownOpen] = useState(false)
  const [rollReadyOpen, setRollReadyOpen] = useState(false)

  const [sowAnchor, setSowAnchor] = useState(null)
  const [sowLoading, setSowLoading] = useState(false)
  const [sowEntries, setSowEntries] = useState([])

  const labelSize = variant === "detail" ? "text-xs" : "text-[10px]"
  const valueSize = variant === "detail" ? "text-xl" : "text-sm"
  const pad = variant === "detail" ? "px-3 py-2" : "px-2 py-1.5"

  const openActual = (e) => {
    e?.stopPropagation?.()
    onOpenActual?.(slot)
  }

  const openReadyBreakdown = (e) => {
    e?.stopPropagation?.()
    setReadyBreakdownOpen(true)
  }

  const openTransfer = (e) => {
    e?.stopPropagation?.()
    setTransferQty(String(mortality))
    setTransferOpen(true)
  }

  const loadSowEntries = async () => {
    if (!slot?._id) return
    setSowLoading(true)
    try {
      const inst = NetworkManager(API.slots.GET_SLOT_SECONDARY_SHED_BREAKDOWN)
      const response = await inst.request({}, [slot._id])
      const payload = response?.data?.data ?? response?.data ?? response
      const batches = payload?.batches || []
      const lines = []
      for (const batch of batches) {
        for (const ln of batch.lines || []) {
          const dateIso = ln.secondaryInwardDate || ln.lagwadDate || null
          lines.push({
            dateIso,
            label:
              ln.lagwadLabel ||
              (dateIso && moment(dateIso).isValid()
                ? moment(dateIso).format("DD MMM YYYY")
                : "—"),
            batchNumber: batch.batchNumber ?? batch.batchId,
            plants:
              Number(ln.onSlotPlants ?? ln.slotStockSyncedPlants ?? ln.availableQuantity) || 0,
            pollyhouse: ln.pollyhouse || "",
            size: ln.size || "",
          })
        }
      }
      lines.sort((a, b) => {
        const ta = a.dateIso ? moment(a.dateIso).valueOf() : 0
        const tb = b.dateIso ? moment(b.dateIso).valueOf() : 0
        return tb - ta
      })
      setSowEntries(lines)
    } catch (e) {
      console.error(e)
      Toast.error("Failed to load lagwad entries")
      setSowEntries([])
    } finally {
      setSowLoading(false)
    }
  }

  const openSowPopover = (e) => {
    e?.stopPropagation?.()
    setSowAnchor(e.currentTarget)
    void loadSowEntries()
  }

  const closeSowPopover = () => setSowAnchor(null)

  const submitTransfer = async (qtyOverride) => {
    if (!slot?._id) return
    const max = mortality
    const qty = Math.min(
      max,
      Math.max(1, Math.floor(Number(qtyOverride ?? transferQty) || 0))
    )
    if (qty < 1 || max < 1) {
      Toast.error("No mortality to transfer")
      return
    }
    setTransferring(true)
    try {
      const inst = NetworkManager(API.slots.TRANSFER_EXPECTED_MORTALITY)
      await inst.request({ quantity: qty }, [slot._id])
      Toast.success(`Transferred ${qty.toLocaleString()} to actual ready`)
      setTransferOpen(false)
      onSlotChanged?.()
    } catch (e) {
      Toast.error(
        e?.response?.data?.message || e?.message || "Transfer failed"
      )
    } finally {
      setTransferring(false)
    }
  }

  const cells = [
    {
      key: "sellable",
      label: "Sowed",
      sub: "90% sellable",
      value: actualPlants,
      className: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
      valueClass: "text-emerald-900",
      title: "Sellable lagwad on slot = 90% actual plants only (excludes 10% mortality reserve)",
      clickable: Boolean(onOpenActual),
      onClick: openActual,
      showSowInfo: actualPlants > 0,
    },
    {
      key: "mortality",
      label: "Exp. mort.",
      sub: mortality > 0 ? "tap → transfer" : "10% reserve",
      value: mortality,
      className:
        mortality > 0
          ? "bg-rose-50 border-rose-200 hover:bg-rose-100 cursor-pointer"
          : "bg-rose-50 border-rose-200",
      valueClass: "text-rose-800",
      title:
        mortality > 0
          ? "Transfer expected mortality → actual ready"
          : "10% lagwad expected mortality reserve",
      clickable: mortality > 0 && Boolean(onSlotChanged),
      onClick: openTransfer,
    },
    {
      key: "ready",
      label: "Actual ready",
      sub:
        (Number(slot?.rolledInActualReadyPlants) || 0) > 0
          ? "tap → batch / history"
          : "tap → batch & shed",
      value: actualReady,
      className: "bg-sky-50 border-sky-200 hover:bg-sky-100 cursor-pointer",
      valueClass: "text-sky-800",
      title: "Actual ready on slot — click for batch-wise and shed-wise breakdown",
      clickable: true,
      onClick: (e) => {
        if (e?.shiftKey && onOpenRollHistory) {
          e.stopPropagation?.()
          onOpenRollHistory()
          return
        }
        openReadyBreakdown(e)
      },
    },
  ]

  return (
    <div className={className} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      {variant === "detail" && (
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
          Lagwad physical
          {mortality > 0 && onSlotChanged && (
            <span className="text-rose-600 normal-case font-normal text-[10px]">
              · mortality can transfer to ready
            </span>
          )}
        </p>
      )}
      {!hasLagwad && variant === "card" && (
        <p className={`${labelSize} text-slate-400 mb-1`}>Lagwad: no stock on slot</p>
      )}
      <div
        className={
          variant === "detail"
            ? "grid grid-cols-1 sm:grid-cols-3 gap-2"
            : "grid grid-cols-3 gap-1"
        }>
        {cells.map((c) => {
          const inner = (
            <>
              <p className={`${labelSize} text-gray-500 leading-tight flex items-center gap-0.5`}>
                {c.key === "mortality" && c.clickable && (
                  <ArrowRightLeft className="w-2.5 h-2.5 text-rose-500" />
                )}
                {c.label}
                {c.showSowInfo && (
                  <button
                    type="button"
                    className="inline-flex p-0 leading-none text-teal-600 hover:text-teal-800"
                    aria-label="Lagwad sow entries"
                    onClick={openSowPopover}>
                    <Info className="w-2.5 h-2.5" />
                  </button>
                )}
              </p>
              {c.sub && (
                <p className={`${labelSize} text-gray-400 leading-tight`}>{c.sub}</p>
              )}
              <p className={`${valueSize} font-bold tabular-nums leading-tight ${c.valueClass}`}>
                {fmt(c.value)}
              </p>
            </>
          )
          if (c.clickable) {
            return (
              <Tooltip key={c.key} title={c.title} arrow>
                <button
                  type="button"
                  className={`${tileBase} ${pad} ${c.className} cursor-pointer hover:shadow-sm w-full`}
                  onClick={c.onClick}>
                  {inner}
                </button>
              </Tooltip>
            )
          }
          return (
            <Tooltip key={c.key} title={c.title} arrow>
              <div className={`${tileBase} ${pad} ${c.className}`}>{inner}</div>
            </Tooltip>
          )
        })}
      </div>

      {variant !== "card" && slot?._id ? (
        <SlotReadySoldBox
          slotId={slot._id}
          actualReadyNow={actualReady}
          onOpen={() => setSoldOpen(true)}
        />
      ) : null}

      {variant !== "card" && slot?.isCurrentDateSlot ? (
        <Button
          fullWidth
          size="small"
          variant="outlined"
          color="info"
          onClick={(e) => {
            e.stopPropagation()
            setRollReadyOpen(true)
          }}
          sx={{ mt: 1, textTransform: "none", fontSize: "0.7rem", py: 0.5, fontWeight: 700 }}>
          Roll actual ready from expired slots
        </Button>
      ) : null}

      <SlotActualReadyBreakdownModal
        open={readyBreakdownOpen}
        onClose={() => setReadyBreakdownOpen(false)}
        slot={slot}
      />

      <RollActualReadyModal
        open={rollReadyOpen}
        onClose={() => setRollReadyOpen(false)}
        slot={slot}
        onSuccess={onSlotChanged}
      />

      <Dialog
        open={soldOpen}
        onClose={() => setSoldOpen(false)}
        onClick={(e) => e.stopPropagation()}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}>
        <DialogTitle
          sx={{
            bgcolor: "#fffbeb",
            borderBottom: "1px solid #fcd34d",
            py: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}>
          <RemoveShoppingCartOutlinedIcon sx={{ color: "#b45309" }} />
          <span className="text-base font-bold text-amber-900">Actual ready sold</span>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <SlotReadySoldContent
            slotId={slot._id}
            open={soldOpen}
            actualReadyNow={actualReady}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5, bgcolor: "#fffbeb", borderTop: "1px solid #fde68a" }}>
          <Button onClick={() => setSoldOpen(false)} variant="contained" sx={{ bgcolor: "#b45309", "&:hover": { bgcolor: "#92400e" } }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Popover
        open={Boolean(sowAnchor)}
        anchorEl={sowAnchor}
        onClose={closeSowPopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        onClick={(e) => e.stopPropagation()}
        slotProps={{ paper: { className: "max-w-xs w-72" } }}>
        <div className="px-3 py-2 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-800">Lagwad entries</p>
          <p className="text-[10px] text-slate-500">Newest first</p>
        </div>
        <div className="max-h-56 overflow-y-auto px-3 py-2">
          {sowLoading ? (
            <div className="flex justify-center py-4">
              <CircularProgress size={22} />
            </div>
          ) : sowEntries.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No lagwad lines on this slot.</p>
          ) : (
            <ul className="space-y-2">
              {sowEntries.map((entry, idx) => (
                <li
                  key={`${entry.batchNumber}-${entry.label}-${idx}`}
                  className="text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                  <div className="flex justify-between gap-2 font-semibold text-slate-800">
                    <span>{entry.label}</span>
                    <span className="tabular-nums text-teal-700">
                      {fmt(entry.plants)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Batch {entry.batchNumber}
                    {entry.pollyhouse ? ` · ${entry.pollyhouse}` : ""}
                    {entry.size ? ` · ${entry.size}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Popover>

      <Dialog
        open={transferOpen}
        onClose={() => !transferring && setTransferOpen(false)}
        onClick={(e) => e.stopPropagation()}
        maxWidth="xs"
        fullWidth>
        <DialogTitle className="text-base font-bold">
          Transfer expected mortality → ready
        </DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600 mb-3">
            Moves plants from <strong>10% mortality reserve</strong> to{" "}
            <strong>actual ready</strong> when plants survived.
          </p>
          <p className="text-xs text-gray-500 mb-2">
            Available to transfer: <strong>{fmt(mortality)}</strong>
          </p>
          <TextField
            fullWidth
            size="small"
            type="number"
            label="Plants to transfer"
            value={transferQty}
            onChange={(e) => setTransferQty(e.target.value)}
            inputProps={{ min: 1, max: mortality }}
          />
        </DialogContent>
        <DialogActions className="px-4 pb-3 gap-2">
          <Button onClick={() => setTransferOpen(false)} disabled={transferring}>
            Cancel
          </Button>
          <Button
            variant="outlined"
            disabled={transferring || mortality < 1}
            onClick={() => submitTransfer(mortality)}>
            Transfer all
          </Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={transferring}
            onClick={() => submitTransfer()}>
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default SlotLagwadMetrics
