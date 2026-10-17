import React, { useCallback, useEffect, useMemo, useState } from "react"
import { NetworkManager, API } from "network/core"
import { Plus, Pencil, Trash2, Truck, RotateCcw, Calculator, MapPin, Info } from "lucide-react"
import { PageLoader } from "components"
import { Toast } from "helpers/toasts/toastHelper"
import FreightRateEditorDialog from "./FreightRateEditorDialog"
import { cropsOfCard, slabsForCrop, slabLabel, quoteFreight, formatRupee } from "./freightRate.utils"

const LOAD_TYPE_COLORS = [
  { head: "bg-amber-400 text-amber-950", soft: "bg-amber-50" },
  { head: "bg-lime-500 text-lime-950", soft: "bg-lime-50" },
  { head: "bg-sky-400 text-sky-950", soft: "bg-sky-50" },
  { head: "bg-violet-400 text-violet-950", soft: "bg-violet-50" }
]

const apiError = (e, fallback) => e?.response?.data?.message || e?.message || fallback

async function callApi(endpoint, body = {}, params) {
  const res = await NetworkManager(endpoint).request(body, params)
  if (res && res.success === false) throw new Error(res.error || res.message || "Request failed")
  return res?.data?.data
}

function RateMatrix({ card }) {
  const crops = cropsOfCard(card)
  const loadTypes = card.loadTypes || []
  if (!loadTypes.length) {
    return <p className="px-4 py-6 text-sm text-slate-400">No load types yet. Click Edit to add Regular / Mini Jumbo rates.</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-36 border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs uppercase text-slate-500">
              Crop
            </th>
            {loadTypes.map((lt, i) => (
              <th
                key={lt._id || lt.name}
                className={`border border-slate-200 px-3 py-2 text-center font-semibold ${
                  LOAD_TYPE_COLORS[i % LOAD_TYPE_COLORS.length].head
                }`}>
                {lt.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {crops.length === 0 ? (
            <tr>
              <td colSpan={loadTypes.length + 1} className="border border-slate-200 px-3 py-6 text-center text-slate-400">
                No slabs yet.
              </td>
            </tr>
          ) : (
            crops.map((crop) => (
              <tr key={crop}>
                <td className="border border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-700">{crop}</td>
                {loadTypes.map((lt, i) => {
                  const slabs = slabsForCrop(lt, crop)
                  return (
                    <td
                      key={lt._id || lt.name}
                      className={`border border-slate-200 px-2 py-2 align-top ${
                        slabs.length ? LOAD_TYPE_COLORS[i % LOAD_TYPE_COLORS.length].soft : ""
                      }`}>
                      {slabs.length === 0 ? (
                        <span className="block text-center text-slate-300">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {slabs.map((s) => (
                            <span
                              key={s._id || `${s.condition}-${s.value}-${s.from}`}
                              className="inline-flex items-center overflow-hidden rounded-md border border-slate-200 bg-white text-xs shadow-sm">
                              <span className="px-2 py-1 text-slate-600">{slabLabel(s)} crates</span>
                              <span className="bg-slate-800 px-2 py-1 font-semibold text-white">
                                {formatRupee(s.ratePerKm)}/km
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function QuickCalculator({ card }) {
  const loadTypes = card.loadTypes || []
  const crops = cropsOfCard(card)
  const [loadTypeName, setLoadTypeName] = useState(loadTypes[0]?.name || "")
  const [crop, setCrop] = useState(crops[0] || "")
  const [crates, setCrates] = useState("")
  const [km, setKm] = useState("")
  const [localMarket, setLocalMarket] = useState(false)
  const [plants, setPlants] = useState("")

  useEffect(() => {
    setLoadTypeName(card.loadTypes?.[0]?.name || "")
    setCrop(cropsOfCard(card)[0] || "")
    setCrates("")
    setKm("")
    setPlants("")
    setLocalMarket(false)
  }, [card])

  const quote = quoteFreight(card, { loadTypeName, crop, crates, km, localMarket, plants })
  const field = "w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm"

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Calculator size={16} className="text-emerald-600" /> Quick freight calculator
      </div>
      <div className="mb-3 flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => setLocalMarket(false)}
          className={`flex-1 rounded-md px-2 py-1.5 ${!localMarket ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>
          Per km (crates)
        </button>
        <button
          type="button"
          onClick={() => setLocalMarket(true)}
          className={`flex-1 rounded-md px-2 py-1.5 ${localMarket ? "bg-white shadow text-slate-900" : "text-slate-500"}`}>
          Local market
        </button>
      </div>

      {localMarket ? (
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Number of plants</label>
          <input type="number" min="0" className={field} value={plants} onChange={(e) => setPlants(e.target.value)} />
          <p className="text-[11px] text-slate-500">Rate: {formatRupee(card.localMarketRatePerPlant)} per plant</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-slate-600">Load type</label>
            <select className={field} value={loadTypeName} onChange={(e) => setLoadTypeName(e.target.value)}>
              {loadTypes.map((lt) => (
                <option key={lt._id || lt.name} value={lt.name}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Crop</label>
            <select className={field} value={crop} onChange={(e) => setCrop(e.target.value)}>
              {crops.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Crates</label>
            <input type="number" min="0" className={field} value={crates} onChange={(e) => setCrates(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Distance (km)</label>
            <input type="number" min="0" className={field} value={km} onChange={(e) => setKm(e.target.value)} />
          </div>
        </div>
      )}

      <div
        className={`mt-4 rounded-lg px-3 py-3 ${
          quote.ok ? (quote.inGap ? "bg-amber-50 border border-amber-200" : "bg-emerald-50 border border-emerald-200") : "bg-slate-50 border border-slate-200"
        }`}>
        {quote.ok ? (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium uppercase text-slate-500">
                {quote.mode === "LOCAL_MARKET" ? "Rate / plant" : "Rate / km"}
              </span>
              <span className="text-lg font-bold text-slate-900">
                {formatRupee(quote.mode === "LOCAL_MARKET" ? quote.ratePerPlant : quote.ratePerKm)}
              </span>
            </div>
            {quote.amount != null && (
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className="text-xs font-medium uppercase text-slate-500">Freight</span>
                <span className="text-2xl font-extrabold text-emerald-700">{formatRupee(quote.amount)}</span>
              </div>
            )}
            <p className={`mt-1 text-xs ${quote.inGap ? "text-amber-700" : "text-slate-600"}`}>{quote.message}</p>
          </>
        ) : (
          <p className="text-sm text-slate-500">{quote.message}</p>
        )}
      </div>
    </div>
  )
}

export default function FreightRateManager() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [editor, setEditor] = useState({ open: false, card: null })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await callApi(API.FREIGHT_RATE.LIST, {}, { activeOnly: "false" })
      const list = Array.isArray(rows) ? rows : []
      setCards(list)
      setSelectedId((prev) => (prev && list.some((c) => c._id === prev) ? prev : list[0]?._id || ""))
    } catch (e) {
      Toast.error(apiError(e, "Could not load freight rates"))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const selected = useMemo(() => cards.find((c) => c._id === selectedId) || null, [cards, selectedId])

  const save = async (payload) => {
    const editing = editor.card
    try {
      const doc = editing?._id
        ? await callApi(API.FREIGHT_RATE.UPDATE, payload, [String(editing._id)])
        : await callApi(API.FREIGHT_RATE.CREATE, payload)
      Toast.success(editing?._id ? "Rate card updated" : "Vehicle added")
      setEditor({ open: false, card: null })
      if (doc?._id) setSelectedId(doc._id)
      await load()
    } catch (e) {
      throw new Error(apiError(e, "Save failed"))
    }
  }

  const remove = async (card) => {
    if (!window.confirm(`Delete the "${card.name}" rate card? You can turn it inactive instead from Edit.`)) return
    try {
      await callApi(API.FREIGHT_RATE.DELETE, {}, [String(card._id)])
      Toast.success("Rate card deleted")
      await load()
    } catch (e) {
      Toast.error(apiError(e, "Delete failed"))
    }
  }

  const restoreDefaults = async () => {
    try {
      const res = await NetworkManager(API.FREIGHT_RATE.RESTORE_DEFAULTS).request({})
      if (res && res.success === false) throw new Error(res.error || res.message)
      Toast.success(res?.data?.message || "Defaults checked")
      await load()
    } catch (e) {
      Toast.error(apiError(e, "Could not restore defaults"))
    }
  }

  if (loading && !cards.length) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Vehicle freight rates</h2>
          <p className="text-sm text-slate-600">
            Per-km rate by vehicle, load type and crates for each crop. Local market is charged per plant.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={restoreDefaults}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            title="Adds back any default vehicle (Chota Hathi, Pick Up, 14 Feet Eicher, Eicher) that is missing">
            <RotateCcw size={15} /> Restore defaults
          </button>
          <button
            type="button"
            onClick={() => setEditor({ open: true, card: null })}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            <Plus size={16} /> Add vehicle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => {
          const active = c._id === selectedId
          return (
            <button
              key={c._id}
              type="button"
              onClick={() => setSelectedId(c._id)}
              className={`rounded-xl border p-3 text-left transition ${
                active
                  ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/30"
                  : "border-slate-200 bg-white hover:border-emerald-300 hover:shadow-sm"
              } ${c.isActive ? "" : "opacity-60"}`}>
              <div className="flex items-center gap-2">
                <span className={`rounded-lg p-1.5 ${active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  <Truck size={18} />
                </span>
                <span className="font-semibold text-slate-900">{c.name}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(c.loadTypes || []).map((lt) => (
                  <span key={lt._id || lt.name} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                    {lt.name}
                  </span>
                ))}
                {!c.isActive && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] text-red-700">Inactive</span>}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">Local market {formatRupee(c.localMarketRatePerPlant)}/plant</p>
            </button>
          )
        })}
      </div>

      {selected ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Truck size={18} className="text-emerald-600" />
              <h3 className="text-base font-semibold text-slate-900">{selected.name}</h3>
              <span className="font-mono text-xs text-slate-400">{selected.code}</span>
              <div className="ml-auto flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditor({ open: true, card: selected })}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50">
                  <Pencil size={14} /> Edit rates
                </button>
                <button
                  type="button"
                  onClick={() => remove(selected)}
                  className="inline-flex items-center rounded-lg border border-red-200 px-2.5 py-1.5 text-red-600 hover:bg-red-50"
                  title="Delete rate card">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 px-4 pt-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                <MapPin size={13} /> Local market {formatRupee(selected.localMarketRatePerPlant)} per plant
              </span>
              {selected.shortTripMaxKm != null && selected.shortTripRatePerKm != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">
                  Below {selected.shortTripMaxKm} km = {formatRupee(selected.shortTripRatePerKm)}/km
                </span>
              )}
            </div>

            <div className="p-4">
              <RateMatrix card={selected} />
            </div>

            {selected.notes && (
              <div className="mx-4 mb-4 flex items-start gap-2 rounded-lg bg-lime-50 px-3 py-2 text-sm text-lime-900">
                <Info size={15} className="mt-0.5 shrink-0" /> {selected.notes}
              </div>
            )}
            {selected.updatedAt && (
              <p className="px-4 pb-3 text-[11px] text-slate-400">
                Last updated {new Date(selected.updatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                {selected.updatedBy?.name ? ` by ${selected.updatedBy.name}` : ""}
              </p>
            )}
          </div>

          <QuickCalculator card={selected} />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No vehicle rate cards. Click “Restore defaults” or “Add vehicle”.
        </p>
      )}

      <FreightRateEditorDialog
        open={editor.open}
        card={editor.card}
        onClose={() => setEditor({ open: false, card: null })}
        onSave={save}
      />
    </div>
  )
}
