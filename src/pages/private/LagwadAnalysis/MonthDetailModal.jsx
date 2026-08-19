import React, { useMemo } from "react"
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material"
import { X } from "lucide-react"
import { dialogPaperSx, fmt } from "./lagwadAnalysisUi"
import LagwadLinesTable from "./LagwadLinesTable"
import SelectedSlotsGrid from "./SelectedSlotsGrid"

const Summary = ({ label, value, valueClass = "text-slate-900" }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
    <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{label}</p>
    <p className={`lag-readout text-base font-bold ${valueClass}`}>{fmt(value)}</p>
  </div>
)

/**
 * Drill-down for one month: the slot windows it contains plus the lagwad lines that
 * landed on them. Keeps the main page month-wise while the detail stays one click away.
 */
const MonthDetailModal = ({ month, lines, open, onClose, onOpenRolls, onTransferMortality }) => {
  const slotIds = useMemo(() => new Set((month?.slots || []).map((s) => s._id)), [month])
  const monthLines = useMemo(
    () => (lines || []).filter((l) => slotIds.has(l.slotId)),
    [lines, slotIds]
  )

  if (!month) return null

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xl"
      fullWidth
      slotProps={{
        paper: { sx: { ...dialogPaperSx, maxHeight: "92vh" } },
        backdrop: { sx: { backgroundColor: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(3px)" } }
      }}>
      <DialogTitle className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-slate-900">{month.month}</p>
          <p className="text-xs font-normal text-slate-500">
            {month.slotCount} slot window{month.slotCount === 1 ? "" : "s"} ·{" "}
            {monthLines.length} lagwad line{monthLines.length === 1 ? "" : "s"}
          </p>
        </div>
        <IconButton size="small" onClick={onClose} sx={{ color: "#64748b" }}>
          <X className="h-4 w-4" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: "rgba(15,23,42,0.08)" }}>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Summary label="Sellable 90%" value={month.sellable} valueClass="lag-glow-sellable" />
          <Summary label="Exp. mortality" value={month.mortality} valueClass="lag-glow-mortality" />
          <Summary label="Ready" value={month.ready} valueClass="lag-glow-ready" />
          <Summary label="Delivery needed" value={month.delivery} valueClass="lag-glow-delivery" />
          <Summary label="Booked" value={month.booked} />
          <Summary label="Dispatched" value={month.dispatched} />
          <Summary
            label="Available"
            value={month.available}
            valueClass={month.isOverbooked ? "text-rose-600" : "text-emerald-600"}
          />
        </div>

        <p className="mb-2 mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-700">
          Slot windows in {month.month}
        </p>
        <SelectedSlotsGrid
          slots={month.slots}
          onOpenRolls={onOpenRolls}
          onTransferMortality={onTransferMortality}
        />

        <div className="mt-5">
          <LagwadLinesTable lines={monthLines} defaultMode="slot" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default MonthDetailModal
