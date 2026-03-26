import React, { useState } from "react"
import { BookOpen } from "lucide-react"

/**
 * Standalone “open ledger” by name/mobile (same APIs as row actions).
 */
export function LedgerQuickOpen({ selectedOrg, onOpen }) {
  const [name, setName] = useState("")
  const [mobile, setMobile] = useState("")
  const [farmerId, setFarmerId] = useState("")

  return (
    <div className="erp-card px-4 py-3 mb-3 flex flex-wrap items-end gap-3 animate-fade-up stagger-1">
      <div className="min-w-[160px]">
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {selectedOrg === "ram-agri" ? "Ram Agri customer ledger" : "Farmer plant ledger (nursery orders)"}
        </p>
      </div>
      <label className="text-[11px] font-semibold text-muted-foreground">
        Name
        <input
          className="erp-input block mt-1 text-xs min-w-[150px]"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer / farmer name (Ram Agri)"
        />
      </label>
      <label className="text-[11px] font-semibold text-muted-foreground">
        Mobile
        <input
          className="erp-input block mt-1 text-xs min-w-[130px]"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="10-digit mobile"
          inputMode="numeric"
        />
      </label>
      {selectedOrg === "ram-biotech" && (
        <label className="text-[11px] font-semibold text-muted-foreground">
          Farmer ID
          <input
            className="erp-input block mt-1 text-xs min-w-[200px] font-mono"
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value.trim())}
            placeholder="Mongo _id (optional if mobile set)"
          />
        </label>
      )}
      <button
        type="button"
        className="btn-primary text-xs inline-flex items-center gap-1.5"
        onClick={() => onOpen(mobile.trim(), name.trim(), farmerId || undefined)}
      >
        <BookOpen className="w-3.5 h-3.5" />
        Open ledger
      </button>
    </div>
  )
}
