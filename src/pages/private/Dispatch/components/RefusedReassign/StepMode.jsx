import React from "react"
import { Check } from "lucide-react"
import { REASSIGN_MODES } from "./reassignHelpers"

const StepMode = ({ mode, onSelect, vehiclePlants }) => (
  <div className="space-y-3">
    <p className="text-sm text-gray-600">
      Gadi dispatch zali pan shetkaryane rope ghetli nahit. Khali nivad kara kay zale.
      <span className="ml-1 font-medium text-gray-800">
        (Plants on vehicle: {vehiclePlants})
      </span>
    </p>
    <div className="grid gap-2.5">
      {REASSIGN_MODES.map((opt) => {
        const active = mode === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
              active
                ? "border-green-500 bg-green-50 ring-1 ring-green-500"
                : "border-gray-200 bg-white hover:border-green-300 hover:bg-green-50/40"
            }`}>
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                active ? "border-green-600 bg-green-600 text-white" : "border-gray-300"
              }`}>
              {active && <Check className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900">{opt.title}</span>
              <span className="mt-0.5 block text-xs text-gray-500">{opt.subtitle}</span>
            </span>
          </button>
        )
      })}
    </div>
  </div>
)

export default StepMode
