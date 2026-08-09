import React from "react"
import { cn } from "lib/cn"

const TYPE_OPTIONS = [
  { id: "ALL", label: "All types" },
  { id: "ORDER", label: "Order-wise" },
  { id: "BULK", label: "Bulk" }
]

const STATUS_OPTIONS = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "COLLECTED", label: "Collected" },
  { id: "REJECTED", label: "Rejected" }
]

const ADVANCE_OPTIONS = [
  { id: "pending_advance", label: "All Pending Advance" },
  { id: "all_advance", label: "All Advance" },
  { id: "PENDING", label: "Pending" },
  { id: "COLLECTED", label: "Collected" },
  { id: "REJECTED", label: "Rejected" },
  { id: "ALL", label: "All statuses" }
]

function FilterButton({ active, onClick, children, activeClass }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-[11px] font-semibold px-2.5 py-1 rounded-sm transition-all whitespace-nowrap",
        active
          ? activeClass || "bg-primary text-primary-foreground shadow-erp-sm"
          : "bg-muted text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

/** Horizontal filter chips — left-aligned in the table header (not a sidebar). */
export function PaymentsTableFilters({
  advancesMode,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  advanceViewFilter,
  onAdvanceViewFilterChange,
  totals
}) {
  if (advancesMode) {
    return (
      <div className="flex items-center gap-1 flex-wrap justify-start">
        {ADVANCE_OPTIONS.map(({ id, label }) => (
          <FilterButton
            key={id}
            active={advanceViewFilter === id}
            onClick={() => onAdvanceViewFilterChange?.(id)}
            activeClass={
              id === "pending_advance"
                ? "badge-pending"
                : "bg-primary text-primary-foreground"
            }
          >
            {label}
          </FilterButton>
        ))}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 flex-wrap justify-start">
      <div className="flex gap-1 bg-muted rounded-sm p-0.5">
        {TYPE_OPTIONS.map(({ id, label }) => (
          <FilterButton
            key={id}
            active={typeFilter === id}
            onClick={() => onTypeFilterChange?.(id)}
            activeClass="bg-card shadow-erp-sm text-foreground"
          >
            {label}
            {totals?.byType?.[id] != null ? (
              <span className="ml-1 tabular opacity-70">({totals.byType[id]})</span>
            ) : null}
          </FilterButton>
        ))}
      </div>

      <div className="flex gap-1 flex-wrap">
        {STATUS_OPTIONS.map(({ id, label }) => (
          <FilterButton
            key={id}
            active={statusFilter === id}
            onClick={() => onStatusFilterChange?.(id)}
            activeClass={
              id === "ALL"
                ? "bg-primary text-primary-foreground"
                : id === "PENDING"
                  ? "badge-pending"
                  : id === "COLLECTED"
                    ? "badge-collected"
                    : "badge-rejected"
            }
          >
            {label}
          </FilterButton>
        ))}
      </div>
    </div>
  )
}
