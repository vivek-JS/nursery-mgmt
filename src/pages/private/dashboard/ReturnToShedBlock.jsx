import React, { useEffect } from "react"
import { Plus, Trash2, Undo2 } from "lucide-react"

const num = (v) => Math.max(0, Math.floor(Number(v) || 0))
const capOf = (l) => num(l?.returnablePlants ?? l?.plants)

export function lineLabel(l) {
  return [
    l.batchNumber ? `Batch ${l.batchNumber}` : "Batch",
    l.size,
    l.pollyhouse ? `from ${l.pollyhouse}` : "",
    `loaded ${num(l.plants)}`,
    num(l.returnedPlants) > 0 ? `${num(l.returnedPlants)} back` : "",
  ]
    .filter(Boolean)
    .join(" · ")
}

/** Plants of this order already put back to a shed from the shed app. */
export function appShedReturnedForOrder(shedReturns, orderId) {
  return (shedReturns || [])
    .filter((r) => String(r.orderId || "") === String(orderId))
    .reduce((s, r) => s + num(r.quantity), 0)
}

/** Rows → API payload; rows without quantity are dropped. */
export function returnToShedPayload(rows) {
  return (rows || [])
    .filter((r) => num(r.quantity) > 0)
    .map((r) => ({
      batchId: r.batchId,
      sourceOutwardId: r.sourceOutwardId,
      pollyhouse: String(r.pollyhouse || "").trim(),
      quantity: num(r.quantity),
    }))
}

function rowFromLine(line, quantity) {
  return {
    sourceOutwardId: line.secondaryOutwardId,
    batchId: line.batchId,
    pollyhouse: line.pollyhouse || "",
    quantity,
  }
}

/**
 * Delivery complete: put returned plants of a shed-loaded order back into a shed.
 * Defaults to the batch and shed the order was loaded from; both can be changed.
 * Shown only when the order was loaded from a shed on this vehicle (office-loaded
 * orders never left shed stock for the returned plants).
 */
export default function ReturnToShedBlock({
  orderKey,
  lines,
  sheds,
  returnedQuantity,
  appReturned,
  rows,
  onRowsChange,
}) {
  const toRestock = Math.max(0, num(returnedQuantity) - num(appReturned))

  // Until the user edits it, the single default row follows the Returned quantity.
  useEffect(() => {
    const usable = (lines || []).filter((l) => capOf(l) > 0)
    if (!usable.length) return
    if (rows === undefined) {
      if (toRestock < 1) return
      const best = [...usable].sort((a, b) => capOf(b) - capOf(a))[0]
      onRowsChange(orderKey, [
        { ...rowFromLine(best, Math.min(toRestock, capOf(best))), auto: true },
      ])
      return
    }
    if (rows.length === 1 && rows[0].auto) {
      const line = usable.find((l) => l.secondaryOutwardId === rows[0].sourceOutwardId)
      const want = Math.min(toRestock, capOf(line))
      if (num(rows[0].quantity) !== want) onRowsChange(orderKey, [{ ...rows[0], quantity: want }])
    }
  }, [rows, toRestock, lines, orderKey, onRowsChange])

  if (!lines?.length) return null
  if (num(returnedQuantity) < 1 && num(appReturned) < 1) return null

  const usable = lines.filter((l) => capOf(l) > 0)
  const list = rows || []
  const total = list.reduce((s, r) => s + num(r.quantity), 0)
  const over = total > toRestock
  const shedOptions = [
    ...new Set([...(sheds || []), ...lines.map((l) => l.pollyhouse).filter(Boolean)]),
  ]

  const onChange = (next) => onRowsChange(orderKey, next)
  const update = (i, patch) =>
    onChange(list.map((r, j) => (j === i ? { ...r, ...patch, auto: false } : r)))

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900">
        <Undo2 className="h-3.5 w-3.5" />
        Return to shed (stock only)
      </div>
      {num(appReturned) > 0 && (
        <p className="mt-0.5 text-[10px] text-amber-800">
          Already returned to shed from app: <b>{num(appReturned)}</b>
        </p>
      )}
      <p className="mt-0.5 text-[10px] text-gray-600">
        To restock now: <b>{toRestock}</b>
        {list.length > 0 ? ` · entered ${total}` : ""}
      </p>
      {toRestock > 0 &&
        list.map((r, i) => {
          const line = lines.find((l) => l.secondaryOutwardId === r.sourceOutwardId)
          const cap = capOf(line)
          return (
            <div key={i} className="mt-1.5 grid grid-cols-12 gap-1">
              <select
                className="col-span-5 rounded border border-gray-300 bg-white px-1 py-1 text-[11px]"
                value={r.sourceOutwardId || ""}
                onChange={(e) => {
                  const l = lines.find((x) => x.secondaryOutwardId === e.target.value)
                  if (l) update(i, { ...rowFromLine(l, r.quantity) })
                }}>
                {lines.map((l) => (
                  <option key={l.secondaryOutwardId} value={l.secondaryOutwardId}>
                    {lineLabel(l)}
                  </option>
                ))}
              </select>
              <select
                className="col-span-4 rounded border border-gray-300 bg-white px-1 py-1 text-[11px]"
                value={r.pollyhouse || ""}
                onChange={(e) => update(i, { pollyhouse: e.target.value })}>
                <option value="">Shed…</option>
                {shedOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                    {s === line?.pollyhouse ? " (loaded from)" : ""}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                max={cap}
                className="col-span-2 rounded border border-gray-300 px-1 py-1 text-[11px]"
                value={r.quantity || ""}
                placeholder="0"
                onChange={(e) => update(i, { quantity: Math.min(cap, num(e.target.value)) })}
              />
              <button
                type="button"
                className="col-span-1 flex items-center justify-center text-red-600"
                onClick={() => onChange(list.filter((_, j) => j !== i))}
                aria-label="Remove return row">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      {toRestock > 0 && total < toRestock && usable.length > 0 && (
        <button
          type="button"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-amber-900"
          onClick={() =>
            onChange([
              ...list.map((r) => ({ ...r, auto: false })),
              rowFromLine(usable[0], Math.min(capOf(usable[0]), toRestock - total)),
            ])
          }>
          <Plus className="h-3 w-3" /> Add batch / shed
        </button>
      )}
      {over && (
        <p className="mt-1 text-[10px] font-semibold text-red-700">
          Return to shed is more than {toRestock} returned plants.
        </p>
      )}
    </div>
  )
}
