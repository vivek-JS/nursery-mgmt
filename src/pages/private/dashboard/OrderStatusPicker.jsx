import React, { useLayoutEffect, useState } from "react"
import ReactDOM from "react-dom"
import { CheckIcon, ChevronDown } from "lucide-react"

/** Button only — state lives on FarmerOrdersTable so Virtuoso row recycle won't close the menu. */
export function OrderStatusTrigger({
  row,
  value,
  displayLabel,
  badgeClass,
  disabled,
  isOpen,
  onOpen,
}) {
  return (
    <div
      className="farmer-order-status-picker"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`searchable-dropdown-button status-badge-enhanced ${badgeClass} ${
          disabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
        style={{
          minHeight: 42,
          fontSize: 12,
          fontWeight: 700,
          padding: "8px 12px",
          borderRadius: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          maxWidth: "100%",
        }}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          if (disabled) return
          onOpen(row, e.currentTarget)
        }}>
        <span className="truncate flex-1 text-left">{displayLabel}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  )
}

function computeMenuPos(anchorRect) {
  if (!anchorRect) return { top: 0, left: 0, minWidth: 180, openAbove: true, maxHeight: 280 }
  const PAD = 8
  const GAP = 6
  const MIN_W = 180
  const MAX_H = 280
  const above = anchorRect.top - PAD
  const below = window.innerHeight - anchorRect.bottom - PAD
  const openAbove = above >= below && above >= 100
  const available = Math.max(80, openAbove ? above : below) - GAP
  const menuWidth = Math.max(anchorRect.width, MIN_W)
  const left = Math.max(PAD, Math.min(anchorRect.left, window.innerWidth - menuWidth - PAD))
  return {
    top: openAbove ? anchorRect.top - GAP : anchorRect.bottom + GAP,
    left,
    minWidth: menuWidth,
    openAbove,
    maxHeight: Math.min(MAX_H, available),
  }
}

/** Single portal menu — rendered once at table level. */
export function OrderStatusPickerPortal({
  picker,
  statusOptions,
  selectedValue,
  onSelect,
  onClose,
}) {
  const [pos, setPos] = useState(() => computeMenuPos(picker?.anchorRect))

  useLayoutEffect(() => {
    if (!picker?.anchorRect) return undefined
    const update = () => setPos(computeMenuPos(picker.anchorRect))
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [picker?.anchorRect, picker?.orderId])

  if (!picker) return null

  return ReactDOM.createPortal(
    <>
      <div
        aria-hidden
        style={{ position: "fixed", inset: 0, zIndex: 99998, background: "transparent" }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onClose()
        }}
      />
      <div
        role="listbox"
        className="searchable-dropdown-menu searchable-dropdown-menu-portal status-dropdown-menu"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          minWidth: pos.minWidth,
          maxHeight: pos.maxHeight,
          overflowX: "hidden",
          overflowY: "auto",
          transform: pos.openAbove ? "translateY(-100%)" : undefined,
          zIndex: 99999,
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}>
        <div className="searchable-dropdown-options">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === selectedValue}
              className={`searchable-dropdown-option w-full text-left border-0 bg-transparent cursor-pointer ${
                opt.value === selectedValue ? "selected" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                onSelect(opt.value)
              }}>
              <span className="truncate">{opt.label}</span>
              {opt.value === selectedValue && <CheckIcon size={16} />}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  )
}
