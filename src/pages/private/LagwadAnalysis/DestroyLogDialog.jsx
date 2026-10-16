import React from "react"
import moment from "moment"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material"
import { dialogPaperSx, fmt } from "./lagwadAnalysisUi"

/** Read-only history of destroyed plants on one lagwad line. */
const DestroyLogDialog = ({ line, open, onClose }) => {
  const log = [...(line?.destroyLog || [])].sort(
    (a, b) => new Date(b.recordedAt || 0) - new Date(a.recordedAt || 0)
  )
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: dialogPaperSx },
        backdrop: { sx: { backgroundColor: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(3px)" } }
      }}>
      <DialogTitle className="text-base font-bold text-slate-900">Destroyed plants log</DialogTitle>
      <DialogContent>
        <p className="mb-3 text-sm text-slate-600">
          Batch <strong className="text-slate-900">{line?.batchNumber}</strong>
          {line?.size ? ` · ${line.size}` : ""}
          {line?.pollyhouse ? ` · ${line.pollyhouse}` : ""} · total destroyed{" "}
          <strong className="text-rose-600">{fmt(line?.destroyedQuantity)}</strong>
        </p>
        {log.length === 0 ? (
          <p className="text-sm text-slate-500">No destroy entries recorded.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                <th className="py-1.5">Date</th>
                <th className="py-1.5 text-right">Plants</th>
                <th className="py-1.5">Reason</th>
                <th className="py-1.5 text-right">From 10%</th>
                <th className="py-1.5 text-right">From sellable</th>
              </tr>
            </thead>
            <tbody>
              {log.map((d, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="py-1.5">
                    {d.recordedAt ? moment(d.recordedAt).format("DD MMM YY, h:mm a") : "—"}
                  </td>
                  <td className="py-1.5 text-right font-semibold text-rose-600 tabular-nums">
                    {fmt(d.quantity)}
                  </td>
                  <td className="py-1.5">{d.reason || "—"}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-500">{fmt(d.fromMortality)}</td>
                  <td className="py-1.5 text-right tabular-nums text-slate-500">{fmt(d.fromSellable)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DialogContent>
      <DialogActions className="px-4 pb-3">
        <Button onClick={onClose} sx={{ color: "#64748b" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default DestroyLogDialog
