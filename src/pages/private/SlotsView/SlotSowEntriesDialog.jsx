import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material"
import moment from "moment"
import { API, NetworkManager } from "network/core"

const fmt = (n) => (Number(n) || 0).toLocaleString()
const fmtPkt = (n) => String(Math.round((Number(n) || 0) * 100) / 100)

/** Sow entries applied to one ready slot (CMS unlimited-booking plants are stocked by sowing, not lagwad). */
const SlotSowEntriesDialog = ({ open, onClose, slot }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    if (!open || !slot?._id) return undefined
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const inst = NetworkManager(API.sowing.GET_SOWING_COMPLETIONS)
        const res = await inst.request(
          {},
          { view: "entries", slotId: slot._id, page: 1, limit: 100, sort: "sowDate", dir: "desc" }
        )
        if (cancelled) return
        const body = res?.data
        if (body?.success) {
          setItems(body.items || [])
          setTotal(body.total || 0)
        } else {
          setItems([])
          setError(body?.message || "Failed to load sowing entries")
        }
      } catch (e) {
        if (!cancelled) {
          setItems([])
          setError(e?.message || "Failed to load sowing entries")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, slot?._id])

  const start = slot ? moment(slot.startDay, "DD-MM-YYYY").format("MMM D") : ""
  const end = slot ? moment(slot.endDay, "DD-MM-YYYY").format("MMM D, YYYY") : ""
  const plants = items.reduce((s, r) => s + (Number(r.sowedQuantity) || 0), 0)
  const packets = items.reduce((s, r) => s + (Number(r.packetsUsed) || 0), 0)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      onClick={(e) => e.stopPropagation()}
      maxWidth="md"
      fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        <p className="text-base font-bold text-slate-900">Sowing entries on this slot</p>
        <p className="text-xs font-medium text-slate-500">
          {start} – {end} · unlimited booking plant, stock comes from sowing (not shed lagwad)
        </p>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <div className="flex justify-center py-8">
            <CircularProgress size={26} />
          </div>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : items.length === 0 ? (
          <Alert severity="info">No sowing entries applied to this slot yet.</Alert>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="rounded-full bg-teal-100 text-teal-900 px-3 py-1 text-xs font-bold tabular-nums">
                {total} entr{total === 1 ? "y" : "ies"}
              </span>
              <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-bold tabular-nums">
                {fmt(plants)} plants sowed
              </span>
              <span className="rounded-full bg-emerald-100 text-emerald-900 px-3 py-1 text-xs font-bold tabular-nums">
                {fmt(Math.round(plants * 0.9))} sellable (90%)
              </span>
              <span className="rounded-full bg-slate-100 text-slate-800 px-3 py-1 text-xs font-bold tabular-nums">
                {fmtPkt(packets)} pkt used
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-teal-700 text-white text-xs">
                  <tr>
                    <th className="px-2 py-2 text-left">Sow date</th>
                    <th className="px-2 py-2 text-left">Request</th>
                    <th className="px-2 py-2 text-left">Plant</th>
                    <th className="px-2 py-2 text-right">Plants</th>
                    <th className="px-2 py-2 text-right">Pkt used / ret</th>
                    <th className="px-2 py-2 text-left">Shed</th>
                    <th className="px-2 py-2 text-left">Batch</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r, i) => (
                    <tr key={r._id} className={i % 2 ? "bg-teal-50/50" : "bg-white"}>
                      <td className="px-2 py-1.5 font-semibold text-emerald-800 whitespace-nowrap">
                        {r.sowingDate ? moment(r.sowingDate).format("DD MMM YYYY") : "—"}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{r.requestNumber}</span>
                        {r.entryCount > 1 ? (
                          <span className="text-slate-500"> · {r.entryNo}/{r.entryCount}</span>
                        ) : null}{" "}
                        <Chip
                          size="small"
                          label={r.requestCompleted ? "Completed" : "Open"}
                          sx={{
                            height: 18,
                            fontSize: "0.62rem",
                            fontWeight: 800,
                            bgcolor: r.requestCompleted ? "#dcfce7" : "#fef3c7",
                            color: r.requestCompleted ? "#166534" : "#92400e",
                          }}
                        />
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {r.plantName} <span className="text-slate-500">· {r.subtypeName}</span>
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold text-amber-700 tabular-nums">
                        {fmt(r.sowedQuantity)}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums">
                        {fmtPkt(r.packetsUsed)} / {fmtPkt(r.packetsReturned)}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">{r.shedName || "—"}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap font-mono text-xs">
                        {r.batchNumber || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default SlotSowEntriesDialog
