import React, { useEffect, useMemo, useState } from "react"
import { Truck, Plus, X, ShieldCheck, Route } from "lucide-react"
import { NetworkManager, API } from "network/core"

export const emptyFreightEntry = () => ({
  enabled: true,
  km: "",
  rateCardId: "",
  loadType: "",
  bhattas: [{ name: "", amount: "" }],
  otherAmount: "",
  remarks: "",
  villages: null
})

const inr = (n) =>
  `₹${(Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

/** Validates the entry; returns an error message or "" when ok / skipped. */
export function freightEntryError(value) {
  if (!value?.enabled) return ""
  if (!(Number(value.km) > 0)) return "Enter tentative distance (KM) or choose “Fill in app later”"
  if (!value.rateCardId) return "Select a vehicle rate card for the freight slip"
  return ""
}

/** Request body for createDispatch `freightSlip` / PUT tentative. */
export function freightEntryPayload(value, fallbackVillages = []) {
  if (!value?.enabled) return null
  const villages = (value.villages ?? fallbackVillages).map((v, i) => ({
    name: v.name,
    plants: Number(v.plants) || 0,
    seq: i + 1
  }))
  const bhattas = (Array.isArray(value.bhattas) ? value.bhattas : [])
    .map((b) => ({ name: String(b?.name || "").trim(), amount: Number(b?.amount) || 0 }))
    .filter((b) => b.name || b.amount > 0)
  const bhatta =
    bhattas.reduce((s, b) => s + b.amount, 0) || (Number(value.bhatta) || 0)
  return {
    km: Number(value.km),
    rateCardId: value.rateCardId,
    loadType: value.loadType || undefined,
    bhatta,
    bhattas,
    otherAmount: Number(value.otherAmount) || 0,
    remarks: value.remarks || "",
    villages
  }
}

/**
 * Tentative freight slip fields shown while creating a dispatch.
 * `loadSummary` [{crop, plants, crates}] and `villages` [{name, plants}] come from the selected orders.
 */
export default function TentativeFreightEntry({ value, onChange, loadSummary = [], villages = [], disabled }) {
  const [cards, setCards] = useState([])
  const [quote, setQuote] = useState(null)
  const [newVillage, setNewVillage] = useState("")
  const set = (patch) => onChange({ ...value, ...patch })

  const stops = value.villages ?? villages
  const totalCrates = loadSummary.reduce((s, l) => s + (Number(l.crates) || 0), 0)
  const dominant = useMemo(
    () => loadSummary.reduce((best, l) => (!best || (l.crates || 0) > (best.crates || 0) ? l : best), null),
    [loadSummary]
  )
  const card = cards.find((c) => c._id === value.rateCardId)

  useEffect(() => {
    let alive = true
    NetworkManager(API.FREIGHT_RATE.LIST)
      .request({}, { activeOnly: true })
      .then((res) => {
        if (!alive) return
        const rows = res?.data?.data || []
        setCards(Array.isArray(rows) ? rows : [])
      })
      .catch(() => alive && setCards([]))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!value.enabled || !value.rateCardId || !(Number(value.km) > 0) || !dominant) {
      setQuote(null)
      return
    }
    let alive = true
    const t = setTimeout(() => {
      NetworkManager(API.FREIGHT_SLIP.QUOTE)
        .request(
          {},
          {
            rateCardId: value.rateCardId,
            loadType: value.loadType || "",
            crop: dominant.crop,
            crates: totalCrates,
            km: value.km
          },
          { silent: true }
        )
        .then((res) => alive && setQuote(res?.data?.data || null))
        .catch((e) => alive && setQuote({ ok: false, message: e?.response?.data?.message || "Rate not found" }))
    }, 300)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [value.enabled, value.rateCardId, value.loadType, value.km, dominant, totalCrates])

  const bhattaLines = Array.isArray(value.bhattas) && value.bhattas.length ? value.bhattas : [{ name: "", amount: "" }]
  const bhattaTotal = bhattaLines.reduce((s, b) => s + (Number(b.amount) || 0), 0)
  const freight = quote?.ok ? Number(quote.amount) || 0 : 0
  const total = freight + bhattaTotal + (Number(value.otherAmount) || 0)

  const setBhatta = (index, patch) => {
    const next = bhattaLines.map((b, i) => (i === index ? { ...b, ...patch } : b))
    set({ bhattas: next })
  }

  const addVillage = () => {
    const name = newVillage.trim()
    if (!name) return
    set({ villages: [...stops, { name, plants: 0 }] })
    setNewVillage("")
  }

  return (
    <div className="rounded-xl border-2 border-emerald-700/30 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white">
            <Route size={18} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Tentative Freight Entry</div>
            <div className="text-xs text-slate-500">अंदाजित भाडे आणि भत्ता · printed as freight slip</div>
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={!value.enabled}
            disabled={disabled}
            onChange={(e) => set({ enabled: !e.target.checked })}
          />
          Fill in app later
        </label>
      </div>

      {value.enabled && (
        <div className="space-y-4 p-4">
          {loadSummary.length > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-emerald-900">
                Vehicle load · plant wise
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {loadSummary.map((l) => (
                  <div
                    key={l.crop}
                    className="min-w-[140px] rounded-lg border-2 border-emerald-700 bg-white px-3 py-2">
                    <div className="text-sm font-bold text-slate-900">{l.crop || "Plants"}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="rounded bg-emerald-700 px-2 py-0.5 text-xs font-bold text-white">
                        {Number(l.plants || 0).toLocaleString("en-IN")} plants
                      </span>
                      <span className="rounded bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                        {Number(l.crates || 0).toLocaleString("en-IN")} crates
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Delivery villages</span>
              <span className="text-xs text-slate-400">From orders · add or remove stops</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {stops.map((v, i) => (
                <span
                  key={`${v.name}-${i}`}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                    i === stops.length - 1 ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"
                  }`}>
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-800 text-[10px] text-white">
                    {i + 1}
                  </span>
                  {v.name}
                  {v.plants ? <span className="font-normal text-slate-400">({Number(v.plants).toLocaleString("en-IN")})</span> : null}
                  {!disabled && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => set({ villages: stops.filter((_, j) => j !== i) })}>
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
              {!disabled && (
                <span className="inline-flex items-center gap-1">
                  <input
                    className="w-28 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                    placeholder="Add village"
                    value={newVillage}
                    onChange={(e) => setNewVillage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addVillage())}
                  />
                  <button
                    type="button"
                    onClick={addVillage}
                    className="rounded-lg border border-emerald-700/30 bg-emerald-50 p-1 text-emerald-800">
                    <Plus size={14} />
                  </button>
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-600">
              1. Tentative distance (KM) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                className="h-12 w-full rounded-lg border border-slate-300 pl-3 pr-12 text-lg font-bold text-emerald-900"
                value={value.km}
                disabled={disabled}
                onChange={(e) => set({ km: e.target.value })}
                placeholder="Estimated route KM"
              />
              <span className="pointer-events-none absolute right-3 top-3 text-sm font-bold text-slate-400">KM</span>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600">2. Vehicle rate (CMS) *</label>
              <span className="text-xs text-slate-400">
                {dominant ? `${dominant.crop} · ${totalCrates} crates` : "No crates yet"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {cards.map((c) => {
                const active = c._id === value.rateCardId
                return (
                  <button
                    key={c._id}
                    type="button"
                    disabled={disabled}
                    onClick={() => set({ rateCardId: c._id, loadType: c.loadTypes?.[0]?.name || "" })}
                    className={`rounded-lg p-2 text-center ${
                      active ? "border-2 border-emerald-800 bg-emerald-50" : "border border-slate-200 bg-white"
                    }`}>
                    <Truck size={16} className={`mx-auto ${active ? "text-emerald-800" : "text-slate-400"}`} />
                    <div className={`mt-0.5 text-xs font-bold ${active ? "text-emerald-900" : "text-slate-800"}`}>{c.name}</div>
                  </button>
                )
              })}
            </div>
            {card?.loadTypes?.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {card.loadTypes.map((lt) => (
                  <button
                    key={lt.name}
                    type="button"
                    disabled={disabled}
                    onClick={() => set({ loadType: lt.name })}
                    className={`rounded-full border px-3 py-0.5 text-xs ${
                      (value.loadType || card.loadTypes[0].name) === lt.name
                        ? "border-emerald-800 bg-emerald-800 font-bold text-white"
                        : "border-slate-300"
                    }`}>
                    {lt.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-600">3. Driver bhatta</label>
              <span className="text-xs font-semibold text-emerald-900">{inr(bhattaTotal)}</span>
            </div>
            <div className="space-y-2">
              {bhattaLines.map((b, i) => (
                <div key={i} className="grid grid-cols-[1fr_7.5rem_auto] gap-2">
                  <input
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
                    placeholder="Bhatta name"
                    value={b.name}
                    disabled={disabled}
                    onChange={(e) => setBhatta(i, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    className="h-10 rounded-lg border border-slate-300 px-3 text-sm font-bold"
                    placeholder="Cost"
                    value={b.amount}
                    disabled={disabled}
                    onChange={(e) => setBhatta(i, { amount: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={disabled || bhattaLines.length === 1}
                    onClick={() => set({ bhattas: bhattaLines.filter((_, j) => j !== i) })}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-600 disabled:opacity-40">
                    <X size={14} />
                  </button>
                </div>
              ))}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => set({ bhattas: [...bhattaLines, { name: "", amount: "" }] })}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-700/30 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  <Plus size={12} /> Add bhatta
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">4. Other advance / toll (optional)</label>
              <input
                type="number"
                min="0"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                value={value.otherAmount}
                disabled={disabled}
                onChange={(e) => set({ otherAmount: e.target.value })}
                placeholder="₹ 0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">5. Departure remarks</label>
              <input
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                value={value.remarks}
                disabled={disabled}
                onChange={(e) => set({ remarks: e.target.value })}
                placeholder="e.g. Morning dispatch, route clear via highway"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <ShieldCheck size={14} className="text-emerald-800" />
              {quote?.ok ? (
                <span>
                  Rate: <b className="text-emerald-900">{inr(quote.ratePerKm)}/KM</b> ({quote.rateCardName}
                  {quote.loadTypeName ? ` · ${quote.loadTypeName}` : ""}) · Freight <b>{inr(freight)}</b>
                </span>
              ) : (
                <span className={quote && !quote.ok ? "text-red-600" : ""}>
                  {quote?.message || "Select KM and vehicle to see the CMS rate"}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-emerald-900">Total {inr(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
