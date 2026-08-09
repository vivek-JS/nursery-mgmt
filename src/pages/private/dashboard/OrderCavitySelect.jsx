import React from "react"
import { getTrayOptionId, getTrayOptionLabel } from "utils/dispatchOrderCavityUtils"

const OrderCavitySelect = ({
  value,
  trays,
  disabled = false,
  saving = false,
  onChange,
  getId,
  className = "",
  size = "sm",
}) => {
  const resolveId = typeof getId === "function" ? getId : getTrayOptionId
  const pad = size === "sm" ? "py-1 px-2 text-xs" : "py-2 px-2 text-sm"

  return (
    <select
      value={value || ""}
      disabled={disabled || saving}
      onChange={(e) => onChange?.(e.target.value)}
      className={`border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-500 ${pad} ${className}`}>
      <option value="">{saving ? "Saving..." : "Select tray"}</option>
      {(trays || []).map((tray) => {
        const tid = resolveId(tray)
        if (!tid) return null
        return (
          <option key={tid} value={tid}>
            {getTrayOptionLabel(tray)}
          </option>
        )
      })}
    </select>
  )
}

export default OrderCavitySelect
