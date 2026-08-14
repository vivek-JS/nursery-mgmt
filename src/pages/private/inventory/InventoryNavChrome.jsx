import React from "react"
import { ArrowLeft, LayoutGrid } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"
import { useWorkspace } from "workspace/WorkspaceContext"
import { AGRI_HOME_PATH, AGRI_HUB_PATH } from "workspace/agriAccess"

const LIST_LABELS = {
  products: "Products",
  grn: "GRN",
  "raising-seeds": "Raising seeds",
  "purchase-orders": "Purchase orders",
  outward: "Stock outward",
  suppliers: "Suppliers",
  merchants: "Merchants",
  "sell-orders": "Sell orders",
  transactions: "Transactions",
  ledger: "Money Ledger",
  "sowing-requests": "Sowing requests",
  "return-requests": "Return requests",
  "purchase-returns": "Purchase returns",
  "agri-sales-returns": "Sell returns",
  "ram-agri-inputs-master": "Ram Agri Inputs Master",
  "biotech-seed-master": "Biotech Seed Master",
  "seed-dual-links": "Subtype → Seed Links",
  "ram-agri-input-order": "Ram Agri orders",
  "ram-agri-sales-dashboard": "Sales dashboard",
  "old-sales-analytics": "Old sales analytics",
}

/** Modules with forms/details but no list route under /u/inventory/{module}. */
const NO_LIST_MODULE = new Set(["ram-agri-input-order"])

/**
 * Resolve a predictable inventory back target (no browser-history chaos).
 * list → inventory hub; detail/form → module list; hub → agri home / dashboard.
 */
export function resolveInventoryBack(pathname) {
  const p = String(pathname || "")
  if (p === "/u/inventory" || p === "/u/inventory/") {
    return { to: AGRI_HOME_PATH, label: "Home" }
  }
  if (p.startsWith(AGRI_HUB_PATH)) {
    return { to: "/u/inventory", label: "Inventory" }
  }
  if (!p.startsWith("/u/inventory/")) return null

  const rest = p.slice("/u/inventory/".length)
  const parts = rest.split("/").filter(Boolean)
  if (!parts.length) return { to: AGRI_HOME_PATH, label: "Home" }

  if (parts.length === 1 || NO_LIST_MODULE.has(parts[0])) {
    return { to: "/u/inventory", label: "Inventory" }
  }

  const moduleKey = parts[0]
  return {
    to: `/u/inventory/${moduleKey}`,
    label: LIST_LABELS[moduleKey] || "Back",
  }
}

/**
 * Sticky back/nav chrome for all inventory + agri hub routes (biotech & agri).
 */
export default function InventoryNavChrome() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAgriMode } = useWorkspace()
  const target = resolveInventoryBack(location.pathname)

  const onInventory =
    location.pathname === "/u/inventory" ||
    location.pathname.startsWith("/u/inventory/") ||
    location.pathname.startsWith(AGRI_HUB_PATH)

  if (!onInventory || !target) return null

  const isHub =
    location.pathname === "/u/inventory" || location.pathname === "/u/inventory/"
  const showHubShortcut = !isHub && target.to !== "/u/inventory"

  return (
    <div
      className={`sticky top-0 z-30 mx-2 sm:mx-4 mb-2 rounded-xl border px-2.5 py-1.5 flex flex-wrap items-center gap-2 ${
        isAgriMode
          ? "bg-amber-50/95 border-amber-200"
          : "bg-white/95 border-slate-200 shadow-sm"
      }`}
    >
      <button
        type="button"
        onClick={() => navigate(target.to)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
          isAgriMode
            ? "bg-amber-100 text-amber-950 hover:bg-amber-200"
            : "bg-slate-100 text-slate-800 hover:bg-slate-200"
        }`}
      >
        <ArrowLeft className="w-4 h-4 shrink-0" />
        Back{target.label ? ` · ${target.label}` : ""}
      </button>

      {showHubShortcut ? (
        <button
          type="button"
          onClick={() => navigate("/u/inventory")}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Inventory home
        </button>
      ) : null}

      {isAgriMode && !location.pathname.startsWith(AGRI_HUB_PATH) ? (
        <button
          type="button"
          onClick={() => navigate(AGRI_HUB_PATH)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-amber-900/80 hover:bg-amber-100 transition ml-auto"
        >
          Agri hub
        </button>
      ) : null}
    </div>
  )
}
