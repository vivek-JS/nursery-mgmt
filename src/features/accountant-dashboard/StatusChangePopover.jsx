import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronDown } from "lucide-react"
import { StatusBadge } from "./StatusBadge"
import { cn } from "lib/cn"

const OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "COLLECTED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" }
]

/**
 * Click status badge → floating menu to pick a new payment status (no row accordion).
 */
export function StatusChangePopover({ status, onApply, disabled }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onScroll = () => setOpen(false)
    window.addEventListener("scroll", onScroll, true)
    return () => window.removeEventListener("scroll", onScroll, true)
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return
      if (triggerRef.current && triggerRef.current.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  const effectiveStatus = status === "BANK_VERIFIED" ? "COLLECTED" : status

  const panel =
    open &&
    rect &&
    createPortal(
      <div
        ref={panelRef}
        className="fixed z-[300] w-[min(260px,calc(100vw-24px))] rounded-xl border border-border bg-card shadow-erp-lg py-1 animate-in fade-in zoom-in-95 duration-150"
        style={{
          top: rect.bottom + 8,
          left: Math.max(12, Math.min(rect.left, window.innerWidth - 272))
        }}
      >
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Change payment status
        </div>
        {OPTIONS.map((o) => {
          const isCurrent =
            o.value === effectiveStatus || (status === "BANK_VERIFIED" && o.value === "COLLECTED")
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled || isCurrent}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                isCurrent
                  ? "bg-muted/60 text-muted-foreground cursor-default"
                  : "hover:bg-primary-light hover:text-primary"
              )}
              onClick={async () => {
                setOpen(false)
                if (!isCurrent) await onApply(o.value)
              }}
            >
              <StatusBadge status={o.value} size="sm" />
              {isCurrent && <span className="text-[11px] text-muted-foreground ml-auto">Current</span>}
            </button>
          )
        })}
      </div>,
      document.body
    )

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation()
          if (disabled) return
          const r = e.currentTarget.getBoundingClientRect()
          setRect(r)
          setOpen((v) => !v)
        }}
        className={cn(
          "inline-flex items-center gap-1 rounded-md transition-all outline-none",
          !disabled && "hover:ring-2 hover:ring-primary/25 focus-visible:ring-2 focus-visible:ring-primary/40"
        )}
      >
        <StatusBadge status={status} />
        {!disabled && <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-70" aria-hidden />}
      </button>
      {panel}
    </>
  )
}
