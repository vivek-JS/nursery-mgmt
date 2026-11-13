import React from "react"
import {
  Autocomplete,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  CircularProgress,
} from "@mui/material"
import dayjs from "dayjs"
import { expectedReadyLabel, refId, secondaryReadyDaysForSize } from "../utils/lagwadWizardHelpers"
import "./LagwadWizardView.css"

const fmt = (n) => Math.max(0, Number(n) || 0).toLocaleString("en-IN")

const primaryBtnSx = {
  textTransform: "none",
  fontWeight: 700,
  borderRadius: "12px",
  px: 2.25,
  background: "linear-gradient(90deg, #10b981, #06b6d4)",
  boxShadow: "none",
  "&:hover": { background: "linear-gradient(90deg, #059669, #0891b2)" },
}

function SizeBox({ code, days, ready, value, onChange, onRemove }) {
  return (
    <div className={`lag-size lag-size-${code}`}>
      <span className="lag-size-tag">{code}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-500">{days} days</span>
          <span className="truncate text-[11px] font-semibold text-emerald-800">
            {ready ? `Ready ${ready}` : "Plants"}
          </span>
        </div>
        <TextField
          className="lag-size-input"
          fullWidth
          variant="standard"
          value={value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          InputProps={{ disableUnderline: true }}
          inputProps={{ inputMode: "numeric" }}
        />
      </div>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${code}`}
          onClick={onRemove}
          className="grid h-8 w-8 flex-none place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700">
          ×
        </button>
      ) : null}
    </div>
  )
}

export function LagwadEntryForm({
  plants,
  plantId,
  subtypeId,
  subtypeOptions,
  onPlant,
  onSubtype,
  batchOptions,
  selectedBatch,
  onClearBatch,
  onPickBatch,
  inwardDate,
  onInwardDate,
  pollyhouse,
  onPollyhouse,
  locations,
  splitForm,
  onSplit,
  showR2,
  showR3,
  onShowR2,
  onShowR3,
  onHideR2,
  onHideR3,
  readySource,
  cavity,
  onCavity,
  trayOptions,
  traysNum,
  plantsNum,
  ladies,
  gents,
  onLadies,
  onGents,
}) {
  const r1Days = secondaryReadyDaysForSize("R1", readySource)
  const r2Days = secondaryReadyDaysForSize("R2", readySource)
  const r3Days = secondaryReadyDaysForSize("R3", readySource)
  const r1Ready = Number(splitForm.R1) > 0 ? expectedReadyLabel(inwardDate, "R1", readySource) : null
  const r2Ready = Number(splitForm.R2) > 0 ? expectedReadyLabel(inwardDate, "R2", readySource) : null
  const r3Ready = Number(splitForm.R3) > 0 ? expectedReadyLabel(inwardDate, "R3", readySource) : null
  const people = Math.max(0, Number(ladies) || 0) + Math.max(0, Number(gents) || 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TextField select fullWidth size="small" label="Plant" value={plantId} onChange={(e) => onPlant(e.target.value)}>
          {plants.map((p) => (
            <MenuItem key={refId(p.plantId ?? p._id)} value={refId(p.plantId ?? p._id)}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          fullWidth
          size="small"
          label="Subtype"
          value={subtypeId}
          disabled={!plantId}
          onChange={(e) => onSubtype(e.target.value)}>
          {subtypeOptions.map((st) => (
            <MenuItem key={st.id} value={st.id}>
              {st.name}
            </MenuItem>
          ))}
        </TextField>
      </div>

      {subtypeId ? (
        <Autocomplete
          options={batchOptions}
          value={selectedBatch}
          onChange={(_, batch) => {
            if (!batch) {
              onClearBatch()
              return
            }
            onPickBatch(refId(batch._id ?? batch.id))
          }}
          getOptionLabel={(b) => String(b.batchNumber ?? b.batchNo ?? "")}
          isOptionEqualToValue={(a, b) => refId(a._id ?? a.id) === refId(b._id ?? b.id)}
          noOptionsText="No matching batch"
          openOnFocus
          autoHighlight
          renderInput={(params) => (
            <TextField {...params} required size="small" label="Batch" placeholder="Search batch" />
          )}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TextField
          fullWidth
          required
          size="small"
          type="date"
          label="Sowing date"
          InputLabelProps={{ shrink: true }}
          value={inwardDate}
          onChange={(e) => onInwardDate(e.target.value)}
        />
        <TextField
          fullWidth
          required
          select
          size="small"
          label="Shed"
          value={pollyhouse}
          onChange={(e) => onPollyhouse(e.target.value)}>
          {locations.map((loc) => (
            <MenuItem key={loc.value} value={loc.value}>
              {loc.label}
            </MenuItem>
          ))}
        </TextField>
      </div>

      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="lag-wiz-kicker">Plants</span>
          <span className="text-[11px] text-slate-400">Ready days from CMS</span>
        </div>
        <div className="space-y-2">
          <SizeBox code="R1" days={r1Days} ready={r1Ready} value={splitForm.R1} onChange={(v) => onSplit("R1", v)} />
          {showR2 ? (
            <SizeBox
              code="R2"
              days={r2Days}
              ready={r2Ready}
              value={splitForm.R2}
              onChange={(v) => onSplit("R2", v)}
              onRemove={onHideR2}
            />
          ) : null}
          {showR3 ? (
            <SizeBox
              code="R3"
              days={r3Days}
              ready={r3Ready}
              value={splitForm.R3}
              onChange={(v) => onSplit("R3", v)}
              onRemove={onHideR3}
            />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {!showR2 ? (
            <button type="button" className="lag-add" onClick={onShowR2}>
              + R2 · {r2Days}d
            </button>
          ) : null}
          {!showR3 ? (
            <button type="button" className="lag-add" onClick={onShowR3}>
              + R3 · {r3Days}d
            </button>
          ) : null}
        </div>
      </div>

      <div className="lag-tray">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Trays</span>
          <p className="lag-tray-num mt-1">{plantsNum > 0 ? fmt(traysNum) : "—"}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {plantsNum > 0 ? `${fmt(plantsNum)} plants · cavity ${cavity}` : "Enter plants and trays follow"}
          </p>
        </div>
        <TextField
          select
          size="small"
          label="Cavity"
          value={cavity}
          onChange={(e) => onCavity(e.target.value)}
          sx={{ minWidth: 108, "& .MuiInputBase-root": { background: "#fff", borderRadius: "10px" } }}>
          {trayOptions.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TextField fullWidth type="number" size="small" label="Ladies" value={ladies} onChange={(e) => onLadies(e.target.value)} />
        <TextField fullWidth type="number" size="small" label="Gents" value={gents} onChange={(e) => onGents(e.target.value)} />
      </div>
      <div className="flex items-center justify-end">
        <span className="text-right">
          <span className="lag-wiz-kicker">People</span>
          <span className="lag-wiz-num mt-1 block text-xl text-slate-900">{fmt(people)}</span>
        </span>
      </div>
    </div>
  )
}

export function LagwadReviewDialog({
  open,
  onClose,
  onConfirm,
  submitting,
  plantName,
  subtypeName,
  batchLabel,
  inwardDate,
  pollyhouse,
  splitNums,
  readySource,
  traysNum,
  cavityNum,
  plantsNum,
  ladiesNum,
  gentsNum,
}) {
  const sellable = Math.floor((plantsNum * 9) / 10)
  const rows = ["R1", "R2", "R3"].filter((code) => splitNums[code] > 0)
  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: "20px" } }}>
      <DialogContent sx={{ pt: 2.5 }}>
        <span className="lag-wiz-kicker">Review</span>
        <h2 className="mt-1 text-lg font-bold text-slate-900">
          {plantName || "Plant"}
          {subtypeName ? ` · ${subtypeName}` : ""}
        </h2>
        <p className="text-sm text-slate-500">Batch {batchLabel}</p>
        <div className="lag-tray mt-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Plants</span>
            <p className="lag-tray-num mt-1">{fmt(plantsNum)}</p>
            <p className="mt-1 text-[11px] text-slate-400">{fmt(sellable)} sellable</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Trays</span>
            <p className="lag-tray-num mt-1">{fmt(traysNum)}</p>
            <p className="mt-1 text-[11px] text-slate-400">cavity {cavityNum}</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {rows.map((code) => {
            const ready = expectedReadyLabel(inwardDate, code, readySource)
            const days = secondaryReadyDaysForSize(code, readySource)
            return (
              <div key={code} className={`lag-size lag-size-${code}`}>
                <span className="lag-size-tag">{code}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-slate-500">{days} days</p>
                  <p className="lag-wiz-num text-2xl text-slate-900">{fmt(splitNums[code])}</p>
                </div>
                <span className="text-right text-[11px] font-semibold text-emerald-800">
                  {ready ? `Ready ${ready}` : ""}
                </span>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Sown {inwardDate ? dayjs(inwardDate).format("DD MMM YYYY") : "—"} · {pollyhouse || "No shed"} ·{" "}
          {ladiesNum + gentsNum} people
        </p>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none", color: "#64748b" }}>
          Back
        </Button>
        <Button variant="contained" disabled={submitting} onClick={onConfirm} sx={primaryBtnSx}>
          {submitting ? <CircularProgress size={20} color="inherit" /> : `Save · ${fmt(plantsNum)}`}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function LagwadEntryDialog({
  open,
  onClose,
  submitting,
  catalogLoading,
  plantName,
  subtypeName,
  plantsNum,
  traysNum,
  onSave,
  children,
}) {
  const sellable = Math.floor((plantsNum * 9) / 10)
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          maxHeight: "90vh",
          background: "linear-gradient(180deg, #f4fbf8 0%, #fff 120px)",
        },
      }}>
      <DialogContent sx={{ pt: 2.5 }}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="lag-wiz-kicker">Record lagwad</span>
            <h2 className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">
              {plantName || "Choose a plant"}
            </h2>
            {subtypeName ? <p className="text-sm text-slate-500">{subtypeName}</p> : null}
          </div>
          <div className="text-right">
            <p className="lag-wiz-num text-3xl text-slate-900">{plantsNum > 0 ? fmt(plantsNum) : "—"}</p>
            <p className="text-[11px] text-slate-500">
              {plantsNum > 0 ? `${fmt(traysNum)} trays · ${fmt(sellable)} sellable` : "plants"}
            </p>
          </div>
        </div>
        {catalogLoading ? (
          <div className="flex justify-center py-10">
            <CircularProgress size={28} sx={{ color: "#10b981" }} />
          </div>
        ) : (
          children
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none", color: "#64748b" }}>
          Cancel
        </Button>
        <Button variant="contained" disabled={submitting || catalogLoading} onClick={onSave} sx={primaryBtnSx}>
          Review
        </Button>
      </DialogActions>
    </Dialog>
  )
}
