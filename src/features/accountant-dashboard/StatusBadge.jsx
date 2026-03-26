import React from "react"
import { cn } from "lib/cn"

const STATUS_MAP = {
  PENDING: { label: "Pending", cls: "badge-pending" },
  COLLECTED: { label: "Completed", cls: "badge-collected" },
  COMPLETED: { label: "Completed", cls: "badge-collected" },
  REJECTED: { label: "Rejected", cls: "badge-rejected" },
  ACCEPTED: { label: "Accepted", cls: "badge-accepted" },
  BANK_VERIFIED: { label: "Bank verified", cls: "badge-accepted" }
}

export function StatusBadge({ status, size = "sm" }) {
  const cfg = STATUS_MAP[status] ?? { label: String(status), cls: "badge-pending" }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-semibold tracking-wide rounded-sm",
        size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        cfg.cls
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {cfg.label}
    </span>
  )
}
