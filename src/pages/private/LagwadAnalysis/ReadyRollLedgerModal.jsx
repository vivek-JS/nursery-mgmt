import React from "react"
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material"
import { ArrowRight, X } from "lucide-react"
import { dialogPaperSx, fmt, getOverdueUi } from "./lagwadAnalysisUi"

const cell = "px-3 py-2 text-xs text-slate-700"
const head =
  "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500"

/**
 * Per-line trail of physical READY plants moved off expired windows.
 * Distinct from order rollover — no farmer order changes slots here.
 */
const ReadyRollLedgerModal = ({ open, onClose, rolls, slotLabel }) => {
  const entries = rolls || []
  const total = entries.reduce((s, r) => s + (Number(r.quantityReady) || 0), 0)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: { sx: dialogPaperSx },
        backdrop: { sx: { backgroundColor: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(3px)" } }
      }}>
      <DialogTitle className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-900">Ready roll ledger</p>
          <p className="text-xs font-normal text-slate-500">
            {slotLabel ? `${slotLabel} · ` : ""}
            {fmt(total)} ready plants rolled across {entries.length} entr
            {entries.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <IconButton size="small" onClick={onClose} sx={{ color: "#64748b" }}>
          <X className="h-4 w-4" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ borderColor: "rgba(15,23,42,0.08)" }}>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No ready rolls recorded for the selected slots.
          </p>
        ) : (
          <div className="lag-scroll overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className={head}>Date</th>
                  <th className={head}>Batch</th>
                  <th className={head}>Shed</th>
                  <th className={`${head} text-right`}>Ready qty</th>
                  <th className={head}>Overdue</th>
                  <th className={head}>Moved</th>
                  <th className={head}>Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((roll) => {
                  const overdue = getOverdueUi(roll.overdueDays)
                  return (
                    <tr key={roll._id} className="transition-colors hover:bg-slate-50">
                      <td className={cell}>{roll.createdAtLabel}</td>
                      <td className={`${cell} font-semibold text-slate-900`}>
                        {roll.batchNumber || "—"}
                      </td>
                      <td className={cell}>{roll.pollyhouse || "—"}</td>
                      <td className={`${cell} lag-readout text-right font-semibold text-cyan-700`}>
                        {fmt(roll.quantityReady)}
                      </td>
                      <td className={cell}>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${overdue.className}`}>
                          {overdue.label}
                        </span>
                      </td>
                      <td className={cell}>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          {roll.sourceSlotLabel || "—"}
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          {roll.targetSlotLabel || "—"}
                        </span>
                      </td>
                      <td className={cell}>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            roll.isAuto
                              ? "border-slate-200 bg-slate-50 text-slate-500"
                              : "border-violet-200 bg-violet-50 text-violet-700"
                          }`}>
                          {roll.isAuto ? "Auto" : "Manual"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          Only the ready pool moves on a roll. The sellable pool stays on the expired slot, which is
          why an expired window can still show sellable stock with ready at zero.
        </p>
      </DialogContent>
    </Dialog>
  )
}

export default ReadyRollLedgerModal
