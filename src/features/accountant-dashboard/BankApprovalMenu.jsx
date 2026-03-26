import React, { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CheckCircle2, ChevronDown, XCircle } from "lucide-react"
import { cn } from "lib/cn"

/**
 * Single control: open menu to approve or reject (bank-verified queue).
 */
export function BankApprovalMenu({ disabled, busy, onApprove, onReject }) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

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

  const panel =
    open &&
    rect &&
    createPortal(
      <div
        ref={panelRef}
        className="fixed z-[300] w-[min(220px,calc(100vw-24px))] rounded-xl border border-border bg-card shadow-erp-lg py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          top: rect.bottom + 8,
          left: Math.max(12, Math.min(rect.left, window.innerWidth - 232))
        }}
      >
        <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Bank verified — decision
        </div>
        <button
          type="button"
          disabled={disabled || busy}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-status-collected-bg/80 transition-colors"
          onClick={() => {
            setOpen(false)
            onApprove()
          }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-collected-bg text-status-collected">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <span>
            <span className="font-semibold text-foreground block">Approve</span>
            <span className="text-[11px] text-muted-foreground">Mark as collected</span>
          </span>
        </button>
        <button
          type="button"
          disabled={disabled || busy}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-status-rejected-bg/50 transition-colors border-t border-border"
          onClick={() => {
            setOpen(false)
            onReject()
          }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-status-rejected-bg text-status-rejected">
            <XCircle className="h-4 w-4" />
          </span>
          <span>
            <span className="font-semibold text-foreground block">Reject</span>
            <span className="text-[11px] text-muted-foreground">Decline this payment</span>
          </span>
        </button>
      </div>,
      document.body
    )

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        disabled={disabled || busy}
        onClick={(e) => {
          e.stopPropagation()
          const r = e.currentTarget.getBoundingClientRect()
          setRect(r)
          setOpen((v) => !v)
        }}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground shadow-erp-sm transition-all",
          "hover:border-primary/40 hover:bg-primary-light/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
          (disabled || busy) && "opacity-50 cursor-not-allowed"
        )}
      >
        {busy ? (
          <span className="tabular">…</span>
        ) : (
          <>
            <span>Decision</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </>
        )}
      </button>
      {panel}
    </>
  )
}
