import React from "react"
import { Bell, Landmark, Search } from "lucide-react"
import { OrgSwitcher } from "./OrgSwitcher"

const TABS = [
  { id: "payments", label: "Payments", icon: "₹" },
  { id: "advances", label: "Advances", icon: "⏳" },
  { id: "bank", label: "Bank Recon", icon: "🏦" },
  { id: "ledger-parties", label: "All farmers", icon: "👥" },
  { id: "central-ledger", label: "Central ledger", icon: "📒" }
]

export function DashboardHeader({
  selectedOrg,
  onOrgChange,
  activeTab,
  onTabChange,
  pendingCount,
  pendingAdvanceCount = 0,
  searchValue,
  onSearchChange,
  userInitials,
  agriOnly = false,
}) {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-30 shadow-erp-sm w-full min-w-0 max-w-full">
      <div className="px-5 py-2.5 flex items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Landmark className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-foreground tracking-tight">AgriERP</span>
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm text-muted-foreground font-medium">
              {agriOnly ? "Ram Agri Accounts" : "Accounts"}
            </span>
          </div>
        </div>

        <OrgSwitcher selected={selectedOrg} onChange={onOrgChange} agriOnly={agriOnly} />

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              className="erp-input pl-8 w-44 text-xs py-1.5"
              placeholder="Search farmer, order..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <button type="button" className="relative p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Bell className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full badge-pending text-[10px] font-bold flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-bold">
            {userInitials}
          </div>
        </div>
      </div>

      <div className="px-5 flex items-end gap-0 border-t border-border/50 overflow-x-auto scrollbar-hide min-w-0 max-w-full">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-all duration-150 ${
              activeTab === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.id === "payments" && pendingCount > 0 && (
              <span className="text-[10px] badge-pending px-1.5 py-0.5 rounded-full font-bold ml-0.5">{pendingCount}</span>
            )}
            {tab.id === "advances" && pendingAdvanceCount > 0 && (
              <span className="text-[10px] badge-pending px-1.5 py-0.5 rounded-full font-bold ml-0.5">{pendingAdvanceCount}</span>
            )}
          </button>
        ))}
      </div>
    </header>
  )
}
