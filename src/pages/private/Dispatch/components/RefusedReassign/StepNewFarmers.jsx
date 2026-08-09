import React from "react"
import { Plus, Trash2 } from "lucide-react"
import LocationSelector from "components/LocationSelector/LocationSelector"
import { PAYMENT_MODES } from "components/payments/paymentFormDefaults"
import {
  orderMongoId,
  orderDisplayNumber,
  orderFarmerName,
  orderRate,
} from "./reassignHelpers"

const StepNewFarmers = ({ farmers, onChange, orders, remainingToAssign }) => {
  const update = (idx, patch) => {
    const next = farmers.map((f, i) => (i === idx ? { ...f, ...patch } : f))
    onChange(next)
  }

  const updatePayment = (idx, patch) => {
    const next = farmers.map((f, i) =>
      i === idx ? { ...f, payment: { ...f.payment, ...patch } } : f
    )
    onChange(next)
  }

  const addRow = () => {
    const firstOrder = orders[0]
    onChange([
      ...farmers,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: "",
        mobileNumber: "",
        state: "",
        district: "",
        taluka: "",
        village: "",
        sourceOrderId: firstOrder ? orderMongoId(firstOrder) : "",
        numberOfPlants: "",
        rate: firstOrder ? orderRate(firstOrder) : "",
        payment: { paidAmount: "", modeOfPayment: "", utrNumber: "", remark: "" },
      },
    ])
  }

  const removeRow = (idx) => onChange(farmers.filter((_, i) => i !== idx))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Kunala hi rope geli? Naav, gaav ani sankhya bhara. (Whoever received the plants)
        </p>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            remainingToAssign === 0
              ? "bg-emerald-100 text-emerald-900"
              : "bg-amber-100 text-amber-900"
          }`}>
          To assign: {remainingToAssign}
        </span>
      </div>

      {farmers.map((f, idx) => {
        const onSourceChange = (e) => {
          const sid = e.target.value
          const src = orders.find((o) => orderMongoId(o) === sid)
          update(idx, {
            sourceOrderId: sid,
            rate: f.rate || (src ? orderRate(src) : ""),
          })
        }
        return (
          <div key={f.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">Farmer {idx + 1}</span>
              {farmers.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="text-[11px] font-medium text-gray-600">Name *</label>
                <input
                  type="text"
                  value={f.name}
                  onChange={(e) => update(idx, { name: e.target.value })}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="Farmer name"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-600">Mobile (optional)</label>
                <input
                  type="tel"
                  value={f.mobileNumber}
                  onChange={(e) => update(idx, { mobileNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="10-digit number"
                />
              </div>
            </div>

            <div className="mt-2">
              <LocationSelector
                compact
                showLabels
                selectedState={f.state}
                selectedDistrict={f.district}
                selectedTaluka={f.taluka}
                selectedVillage={f.village}
                onStateChange={(v) => update(idx, { state: v, district: "", taluka: "", village: "" })}
                onDistrictChange={(v) => update(idx, { district: v, taluka: "", village: "" })}
                onTalukaChange={(v) => update(idx, { taluka: v, village: "" })}
                onVillageChange={(v) => update(idx, { village: v })}
              />
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <div>
                <label className="text-[11px] font-medium text-gray-600">From order (plants)</label>
                <select
                  value={f.sourceOrderId}
                  onChange={onSourceChange}
                  className="mt-0.5 w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm">
                  {orders.map((o) => (
                    <option key={orderMongoId(o)} value={orderMongoId(o)}>
                      #{orderDisplayNumber(o)} · {orderFarmerName(o)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-600">Plants *</label>
                <input
                  type="number"
                  min={1}
                  value={f.numberOfPlants}
                  onChange={(e) => update(idx, { numberOfPlants: e.target.value })}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-600">Rate (₹) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={f.rate}
                  onChange={(e) => update(idx, { rate: e.target.value })}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Optional payment collected on the field */}
            <div className="mt-2 rounded-md border border-gray-100 bg-gray-50/70 p-2">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Payment collected (optional)
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="number"
                  min={0}
                  value={f.payment?.paidAmount || ""}
                  onChange={(e) => updatePayment(idx, { paidAmount: e.target.value })}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="Amount ₹"
                />
                <select
                  value={f.payment?.modeOfPayment || ""}
                  onChange={(e) => updatePayment(idx, { modeOfPayment: e.target.value })}
                  className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm">
                  <option value="">Mode</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={f.payment?.utrNumber || ""}
                  onChange={(e) => updatePayment(idx, { utrNumber: e.target.value })}
                  className="rounded border border-gray-300 px-2 py-1.5 text-sm"
                  placeholder="UTR / Txn (if UPI)"
                />
              </div>
            </div>
          </div>
        )
      })}

      <button
        type="button"
        onClick={addRow}
        className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800 hover:bg-blue-100">
        <Plus className="h-4 w-4" /> Add farmer
      </button>
    </div>
  )
}

export default StepNewFarmers
