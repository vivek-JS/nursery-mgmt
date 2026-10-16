import React, { useEffect, useState } from "react"
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { dialogPaperSx, fmt } from "./lagwadAnalysisUi"

const REASONS = ["Old stock", "Dead", "Damaged", "Disease", "Weak / rejected"]

const SummaryCell = ({ label, value, tone }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className={`text-lg font-bold tabular-nums ${tone}`}>{value}</p>
  </div>
)

/**
 * Destroy every plant left of a batch — only in this line's shed, or in all sheds —
 * then show the final Planted / Sold / Destroyed / Mortality numbers.
 * `estimate` = { shed, batch } plants left as seen in the current table.
 */
const DestroyRemainingDialog = ({ line, estimate, open, onClose, onDone }) => {
  const [scope, setScope] = useState("shed")
  const [reason, setReason] = useState(REASONS[0])
  const [typed, setTyped] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (open) {
      setScope("shed")
      setReason(REASONS[0])
      setTyped("")
      setResult(null)
    }
  }, [open])

  const count = scope === "shed" ? Number(estimate?.shed) || 0 : Number(estimate?.batch) || 0
  const confirmed = typed.trim().toUpperCase() === "DESTROY"

  const submit = async () => {
    if (!line?.batchId || !confirmed) return
    setSubmitting(true)
    try {
      const instance = NetworkManager(API.PLANT_OUTWARD.SECONDARY_DESTROY_REMAINING)
      const res = await instance.request(
        { reason, ...(scope === "shed" ? { pollyhouse: line.pollyhouse } : {}) },
        { pathParams: [String(line.batchId)] }
      )
      const data = res?.data?.data || {}
      setResult(data)
      Toast.success(`${fmt(data.destroyedNow)} remaining plants destroyed`)
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Could not destroy")
    } finally {
      setSubmitting(false)
    }
  }

  const close = () => {
    if (submitting) return
    onClose?.()
    if (result) onDone?.()
  }

  const s = result?.summary
  return (
    <Dialog
      open={open}
      onClose={close}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: { sx: dialogPaperSx },
        backdrop: { sx: { backgroundColor: "rgba(15, 23, 42, 0.35)", backdropFilter: "blur(3px)" } }
      }}>
      <DialogTitle className="text-base font-bold text-slate-900">
        {s ? "Final summary" : "Destroy all remaining"}
      </DialogTitle>
      <DialogContent>
        <p className="mb-3 text-sm text-slate-600">
          Batch <strong className="text-slate-900">{line?.batchNumber}</strong>
          {s
            ? ` · ${result.pollyhouse || "all sheds"}`
            : scope === "shed" && line?.pollyhouse
              ? ` · ${line.pollyhouse}`
              : " · all sheds"}
        </p>
        {s ? (
          <>
            <p className="mb-2 text-xs text-slate-500">
              Destroyed now: <strong className="text-rose-600">{fmt(result.destroyedNow)}</strong> on{" "}
              {fmt(result.linesClosed)} entries
            </p>
            <div className="grid grid-cols-2 gap-2">
              <SummaryCell label="Planted" value={fmt(s.gross)} tone="text-slate-900" />
              <SummaryCell label="Sold" value={fmt(s.sold)} tone="text-indigo-600" />
              <SummaryCell label="Destroyed" value={fmt(s.destroyed)} tone="text-rose-600" />
              <SummaryCell
                label="Mortality"
                value={`${Number(s.mortalityPct || 0).toFixed(1)}%`}
                tone="text-rose-600"
              />
              {Number(s.returned) > 0 && (
                <SummaryCell label="Returned" value={fmt(s.returned)} tone="text-amber-600" />
              )}
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 flex gap-1.5">
              {[
                ["shed", `This shed${line?.pollyhouse ? ` (${line.pollyhouse})` : ""}`],
                ["batch", "Whole batch (all sheds)"]
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setScope(key)}
                  className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold ${
                    scope === key
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
              About <strong>{fmt(count)}</strong> plants left will be marked destroyed and these
              entries closed. This cannot be undone.
            </p>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    reason === r
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            <TextField
              fullWidth
              size="small"
              label='Type "DESTROY" to confirm'
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </>
        )}
      </DialogContent>
      <DialogActions className="gap-2 px-4 pb-3">
        <Button onClick={close} disabled={submitting} sx={{ color: "#64748b" }}>
          {s ? "Close" : "Cancel"}
        </Button>
        {!s && (
          <Button
            variant="contained"
            disabled={submitting || !confirmed || count < 1}
            onClick={submit}
            sx={{ backgroundColor: "#e11d48", "&:hover": { backgroundColor: "#be123c" } }}>
            Destroy all
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default DestroyRemainingDialog
