import React, { useState } from "react"
import { StatusBadge } from "./StatusBadge"
import { cn } from "lib/cn"

const OPTIONS = ["PENDING", "COLLECTED", "REJECTED"]

export function PaymentStatusEditor({ currentStatus, remark = "", onSave, onCancel }) {
  const [selected, setSelected] = useState(currentStatus)
  const [note, setNote] = useState(remark)

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Update Payment Status
        </div>
        <div className="flex gap-2">
          {OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSelected(s)}
              className={cn(
                "px-3 py-1.5 rounded-sm border text-xs font-semibold transition-all",
                selected === s
                  ? s === "PENDING"
                    ? "badge-pending border-status-pending"
                    : s === "COLLECTED"
                      ? "badge-collected border-status-collected"
                      : "badge-rejected border-status-rejected"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              )}
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-w-[180px]">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Remark</div>
        <input
          className="erp-input w-full"
          placeholder="Add remark (optional)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs px-3 py-1.5 border border-border rounded-sm hover:bg-muted transition-colors text-muted-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={async () => {
            await onSave(selected)
          }}
          className="btn-primary text-xs"
          disabled={selected === currentStatus}
        >
          Save — <StatusBadge status={selected} size="sm" />
        </button>
      </div>
    </div>
  )
}
