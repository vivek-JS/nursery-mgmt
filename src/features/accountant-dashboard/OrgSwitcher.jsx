import React from "react"
import { cn } from "lib/cn"

const ORGS = [
  { id: "ram-biotech", name: "Ram Biotech", short: "RB", color: "hsl(152 55% 24%)" },
  { id: "ram-agri", name: "Ram Agri Inputs", short: "RA", color: "hsl(38 82% 48%)" }
]

/**
 * @param {{ selected: string, onChange: (id: string) => void, agriOnly?: boolean }} props
 * agriOnly: Ram Agri Inputs workspace / Master — hide Biotech org.
 */
export function OrgSwitcher({ selected, onChange, agriOnly = false }) {
  const orgs = agriOnly ? ORGS.filter((o) => o.id === "ram-agri") : ORGS

  if (agriOnly && orgs.length === 1) {
    const org = orgs[0]
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-border shadow-erp-sm">
        <span
          className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0"
          style={{ background: org.color }}
        >
          {org.short}
        </span>
        <span className="text-sm font-semibold text-foreground">{org.name}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted border border-border">
      {orgs.map((org) => (
        <button
          key={org.id}
          type="button"
          onClick={() => onChange(org.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all duration-150",
            selected === org.id ? "bg-card shadow-erp-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <span
            className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0"
            style={{ background: selected === org.id ? org.color : "hsl(var(--subtle))" }}
          >
            {org.short}
          </span>
          {org.name}
        </button>
      ))}
    </div>
  )
}
