import React, { useEffect, useState } from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions, Switch, CircularProgress } from "@mui/material"
import { Plus, Trash2, X } from "lucide-react"
import {
  SLAB_CONDITIONS,
  DEFAULT_CROPS,
  DEFAULT_LOAD_TYPES,
  emptyCard,
  emptySlab,
  cropsOfCard
} from "./freightRate.utils"

const inputCls =
  "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
const labelCls = "text-xs font-medium text-slate-600"

const toCodeFromName = (name) =>
  String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

const blankIfNull = (v) => (v === null || v === undefined ? "" : v)

function cardToForm(card) {
  if (!card) return emptyCard()
  return {
    name: card.name || "",
    code: card.code || "",
    sortOrder: card.sortOrder ?? 0,
    isActive: card.isActive !== false,
    localMarketRatePerPlant: blankIfNull(card.localMarketRatePerPlant),
    shortTripMaxKm: blankIfNull(card.shortTripMaxKm),
    shortTripRatePerKm: blankIfNull(card.shortTripRatePerKm),
    notes: card.notes || "",
    loadTypes: (card.loadTypes || []).map((lt) => ({
      _id: lt._id,
      name: lt.name || "",
      slabs: (lt.slabs || []).map((s) => ({
        _id: s._id,
        crop: s.crop || "",
        condition: s.condition || "BELOW",
        value: blankIfNull(s.value),
        from: blankIfNull(s.from),
        to: blankIfNull(s.to),
        ratePerKm: blankIfNull(s.ratePerKm)
      }))
    }))
  }
}

function formToPayload(form) {
  return {
    name: form.name.trim(),
    code: form.code.trim() || toCodeFromName(form.name),
    sortOrder: Number(form.sortOrder) || 0,
    isActive: Boolean(form.isActive),
    localMarketRatePerPlant: form.localMarketRatePerPlant,
    shortTripMaxKm: form.shortTripMaxKm,
    shortTripRatePerKm: form.shortTripRatePerKm,
    notes: form.notes,
    loadTypes: form.loadTypes.map((lt, i) => ({
      ...(lt._id ? { _id: lt._id } : {}),
      name: lt.name.trim(),
      sortOrder: i + 1,
      slabs: lt.slabs.map((s) => ({
        ...(s._id ? { _id: s._id } : {}),
        crop: s.crop.trim(),
        condition: s.condition,
        ...(s.condition === "BETWEEN" ? { from: s.from, to: s.to } : { value: s.value }),
        ratePerKm: s.ratePerKm
      }))
    }))
  }
}

function validate(form) {
  if (!form.name.trim()) return "Vehicle name is required"
  if ((String(form.shortTripMaxKm).trim() === "") !== (String(form.shortTripRatePerKm).trim() === "")) {
    return "Short trip needs both km and rate, or leave both empty"
  }
  const names = new Set()
  for (const lt of form.loadTypes) {
    const n = lt.name.trim()
    if (!n) return "Every load type needs a name"
    if (names.has(n.toLowerCase())) return `Load type "${n}" is listed twice`
    names.add(n.toLowerCase())
    for (const [i, s] of lt.slabs.entries()) {
      const where = `${n} · row ${i + 1}`
      if (!s.crop.trim()) return `${where}: crop is required`
      if (String(s.ratePerKm).trim() === "" || Number(s.ratePerKm) < 0) return `${where}: rate per km is required`
      if (s.condition === "BETWEEN") {
        if (String(s.from).trim() === "" || String(s.to).trim() === "") return `${where}: enter crates from and to`
        if (Number(s.to) < Number(s.from)) return `${where}: "to" must be ≥ "from"`
      } else if (String(s.value).trim() === "") {
        return `${where}: enter number of crates`
      }
    }
  }
  return ""
}

export default function FreightRateEditorDialog({ open, card, onClose, onSave }) {
  const [form, setForm] = useState(emptyCard())
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(cardToForm(card))
    setError("")
    setSaving(false)
  }, [open, card])

  const cropOptions = Array.from(new Set([...DEFAULT_CROPS, ...cropsOfCard(form)]))
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const setLoadType = (li, patch) =>
    setForm((f) => ({ ...f, loadTypes: f.loadTypes.map((lt, i) => (i === li ? { ...lt, ...patch } : lt)) }))
  const setSlab = (li, si, patch) =>
    setForm((f) => ({
      ...f,
      loadTypes: f.loadTypes.map((lt, i) =>
        i === li ? { ...lt, slabs: lt.slabs.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : lt
      )
    }))
  const addSlab = (li) =>
    setForm((f) => ({
      ...f,
      loadTypes: f.loadTypes.map((lt, i) => {
        if (i !== li) return lt
        const last = lt.slabs[lt.slabs.length - 1]
        return { ...lt, slabs: [...lt.slabs, emptySlab(last?.crop || "Banana")] }
      })
    }))
  const removeSlab = (li, si) =>
    setForm((f) => ({
      ...f,
      loadTypes: f.loadTypes.map((lt, i) => (i === li ? { ...lt, slabs: lt.slabs.filter((_, j) => j !== si) } : lt))
    }))
  const addLoadType = (name = "") => setForm((f) => ({ ...f, loadTypes: [...f.loadTypes, { name, slabs: [emptySlab()] }] }))
  const removeLoadType = (li) => setForm((f) => ({ ...f, loadTypes: f.loadTypes.filter((_, i) => i !== li) }))

  const missingDefaultLoadTypes = DEFAULT_LOAD_TYPES.filter(
    (n) => !form.loadTypes.some((lt) => lt.name.trim().toLowerCase() === n.toLowerCase())
  )

  const handleSave = async () => {
    const msg = validate(form)
    if (msg) {
      setError(msg)
      return
    }
    setError("")
    setSaving(true)
    try {
      await onSave(formToPayload(form))
    } catch (e) {
      setError(e?.message || "Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>{card?._id ? `Edit ${card.name}` : "Add vehicle rate card"}</DialogTitle>
      <DialogContent dividers>
        <datalist id="freight-crop-options">
          {cropOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Vehicle name *</label>
            <input
              className={inputCls}
              value={form.name}
              placeholder="e.g. Chota Hathi"
              onChange={(e) => set({ name: e.target.value, ...(card?._id ? {} : { code: toCodeFromName(e.target.value) }) })}
            />
          </div>
          <div>
            <label className={labelCls}>Code</label>
            <input
              className={`${inputCls} font-mono uppercase`}
              value={form.code}
              onChange={(e) => set({ code: e.target.value.toUpperCase() })}
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className={labelCls}>Sort</label>
              <input type="number" className={inputCls} value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} />
            </div>
            <label className="flex flex-col items-center text-xs font-medium text-slate-600">
              Active
              <Switch size="small" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
            </label>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Local market — ₹ per plant</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
              value={form.localMarketRatePerPlant}
              onChange={(e) => set({ localMarketRatePerPlant: e.target.value })}
            />
            <p className="mt-0.5 text-[11px] text-slate-500">0.50 = 50 paise per plant</p>
          </div>
          <div>
            <label className={labelCls}>Short trip — below (km)</label>
            <input
              type="number"
              min="0"
              className={inputCls}
              value={form.shortTripMaxKm}
              placeholder="optional, e.g. 100"
              onChange={(e) => set({ shortTripMaxKm: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Short trip — ₹ per km</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className={inputCls}
              value={form.shortTripRatePerKm}
              placeholder="e.g. 12.75"
              onChange={(e) => set({ shortTripRatePerKm: e.target.value })}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={labelCls}>Notes (shown on the rate card)</label>
            <input className={inputCls} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {form.loadTypes.map((lt, li) => (
            <div key={lt._id || `new-${li}`} className="rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 rounded-t-xl border-b border-slate-200 bg-amber-50 px-3 py-2">
                <input
                  className="w-48 rounded-md border border-amber-300 bg-white px-2 py-1 text-sm font-semibold"
                  value={lt.name}
                  placeholder="Load type (e.g. Regular)"
                  onChange={(e) => setLoadType(li, { name: e.target.value })}
                />
                <span className="text-xs text-slate-500">{lt.slabs.length} slab(s)</span>
                <button
                  type="button"
                  onClick={() => removeLoadType(li)}
                  className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                  <Trash2 size={14} /> Remove load type
                </button>
              </div>
              <div className="overflow-x-auto p-2">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-[11px] uppercase text-slate-500">
                    <tr>
                      <th className="px-1.5 py-1">Crop</th>
                      <th className="px-1.5 py-1">Crates</th>
                      <th className="px-1.5 py-1">Count</th>
                      <th className="px-1.5 py-1">₹ / km</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {lt.slabs.map((s, si) => (
                      <tr key={s._id || `s-${si}`} className="border-t border-slate-100">
                        <td className="px-1.5 py-1 w-40">
                          <input
                            list="freight-crop-options"
                            className={inputCls}
                            value={s.crop}
                            onChange={(e) => setSlab(li, si, { crop: e.target.value })}
                          />
                        </td>
                        <td className="px-1.5 py-1 w-40">
                          <select
                            className={inputCls}
                            value={s.condition}
                            onChange={(e) => setSlab(li, si, { condition: e.target.value })}>
                            {SLAB_CONDITIONS.map((c) => (
                              <option key={c.value} value={c.value}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-1.5 py-1 w-48">
                          {s.condition === "BETWEEN" ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                className={inputCls}
                                value={s.from}
                                placeholder="from"
                                onChange={(e) => setSlab(li, si, { from: e.target.value })}
                              />
                              <span className="text-slate-400">–</span>
                              <input
                                type="number"
                                min="0"
                                className={inputCls}
                                value={s.to}
                                placeholder="to"
                                onChange={(e) => setSlab(li, si, { to: e.target.value })}
                              />
                            </div>
                          ) : (
                            <input
                              type="number"
                              min="0"
                              className={inputCls}
                              value={s.value}
                              placeholder="crates"
                              onChange={(e) => setSlab(li, si, { value: e.target.value })}
                            />
                          )}
                        </td>
                        <td className="px-1.5 py-1 w-32">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className={inputCls}
                            value={s.ratePerKm}
                            placeholder="11.75"
                            onChange={(e) => setSlab(li, si, { ratePerKm: e.target.value })}
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => removeSlab(li, si)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Remove slab">
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  onClick={() => addSlab(li)}
                  className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50">
                  <Plus size={14} /> Add slab
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            {missingDefaultLoadTypes.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => addLoadType(n)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-amber-400 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50">
                <Plus size={14} /> {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => addLoadType("")}
              className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
              <Plus size={14} /> Custom load type
            </button>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex min-w-[96px] items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
          {saving ? <CircularProgress size={18} color="inherit" /> : "Save"}
        </button>
      </DialogActions>
    </Dialog>
  )
}
