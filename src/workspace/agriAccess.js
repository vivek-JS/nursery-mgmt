/** Shared Ram Agri workspace + role allowlists. */

export const WORKSPACE_STORAGE_KEY = "erp_workspace"
export const WORKSPACE_BIOTECH = "biotech"
export const WORKSPACE_AGRI = "agri"

export const JOB_RAM_AGRI_MASTER = "RAM_AGRI_MASTER"
export const JOB_RAM_AGRI_INPUT_ADMIN = "RAM_AGRI_INPUT_ADMIN"
export const JOB_RAM_AGRI_SALES_MANAGER = "RAM_AGRI_SALES_MANAGER"
export const JOB_RAM_AGRI_SALES_OFFICE_MANAGER = "RAM_AGRI_SALES_OFFICE_MANAGER"

/** Base agri ops tabs — Overview embed is Master + Super Admin. */
export const AGRI_ADMIN_TABS = [
  "inventory",
  "stock",
  "purchase-orders",
  "raising-seeds",
  "sowing-requests",
  "agri-order",
  "sell-returns",
  "purchase-returns",
  "money-ledger",
]

/** Master = Admin + Inputs Master + Agri Payments. */
export const AGRI_MASTER_TABS = [
  ...AGRI_ADMIN_TABS,
  "inputs-master",
  "agri-payments",
]

/** Ram Biotech seed catalog — programme leads in agri workspace. */
export const AGRI_BIOTECH_SEED_TAB = "biotech-seed-master"
export const BIOTECH_SEED_MASTER_PATH = "/u/inventory/biotech-seed-master"

export const AGRI_HUB_PATH = "/u/ram-agri-input"
/** Default landing in Ram Agri workspace — Orders dashboard (Ram Agri Input list). */
export const AGRI_HOME_PATH = "/u/dashboard"
/** Deep link: opens Orders + Ram Agri add-order modal. */
export const AGRI_INPUT_ORDER_NEW_PATH = "/u/inventory/ram-agri-input-order/new"
export const AGRI_OPEN_ADD_ORDER_STATE = { openAgriSalesOrder: true }
export const ACCOUNTING_PATH = "/u/accountant-dashboard"

/** Paths allowed in agri workspace (hub + deep links + agri accounting). */
export const AGRI_ALLOWED_PATH_PREFIXES = [
  AGRI_HUB_PATH,
  ACCOUNTING_PATH,
  "/u/inventory",
  "/u/dashboard",
]

/**
 * Inventory modules hidden in Ram Agri workspace
 * (GRN, suppliers, merchants, sell orders, transactions, issue stock, new product).
 * Money ledger + sell returns are allowed in agri sidebar.
 */
export const AGRI_BLOCKED_INVENTORY_PREFIXES = [
  "/u/inventory/grn",
  "/u/inventory/suppliers",
  "/u/inventory/merchants",
  "/u/inventory/sell-orders",
  "/u/inventory/transactions",
  "/u/inventory/outward",
  "/u/inventory/products/new",
]

export function normalizeJob(user) {
  return String(user?.jobTitle || user?.role || "")
    .trim()
    .toUpperCase()
}

export function isSuperAdminUser(user) {
  const j = normalizeJob({ jobTitle: user?.jobTitle })
  const r = normalizeJob({ jobTitle: user?.role })
  return (
    j === "SUPER_ADMIN" ||
    j === "SUPERADMIN" ||
    r === "SUPER_ADMIN" ||
    r === "SUPERADMIN"
  )
}

export function isRamAgriMaster(user) {
  const j = normalizeJob({ jobTitle: user?.jobTitle })
  const r = normalizeJob({ jobTitle: user?.role })
  return j === JOB_RAM_AGRI_MASTER || r === JOB_RAM_AGRI_MASTER
}

export function isRamAgriInputAdmin(user) {
  const j = normalizeJob({ jobTitle: user?.jobTitle })
  const r = normalizeJob({ jobTitle: user?.role })
  return j === JOB_RAM_AGRI_INPUT_ADMIN || r === JOB_RAM_AGRI_INPUT_ADMIN
}

export function isRamAgriSalesManager(user) {
  const j = normalizeJob({ jobTitle: user?.jobTitle })
  const r = normalizeJob({ jobTitle: user?.role })
  return j === JOB_RAM_AGRI_SALES_MANAGER || r === JOB_RAM_AGRI_SALES_MANAGER
}

export function isRamAgriSalesOfficeManager(user) {
  const j = normalizeJob({ jobTitle: user?.jobTitle })
  const r = normalizeJob({ jobTitle: user?.role })
  return j === JOB_RAM_AGRI_SALES_OFFICE_MANAGER || r === JOB_RAM_AGRI_SALES_OFFICE_MANAGER
}

/** Sales manager + office manager — full Ram Agri workspace (collect blocked elsewhere). */
export function isRamAgriSalesProgramLead(user) {
  return (
    isRamAgriSalesManager(user) ||
    isRamAgriSalesOfficeManager(user) ||
    isRamAgriMaster(user)
  )
}

/** Biotech Seed Master in agri workspace — sales programme leads + super admin. */
export function canSeeBiotechSeedMaster(user) {
  return isRamAgriSalesProgramLead(user) || isSuperAdminUser(user)
}

/**
 * Inventory PO auto-approve + auto GRN on create.
 * Super Admin, Ram Agri Master (inputs/biotech master), Ram Agri Sales Manager.
 */
export function canPurchaseOrderAutoAccept(user) {
  if (isSuperAdminUser(user) || isRamAgriSalesProgramLead(user)) return true
  return false
}

/** Forced agri-only (no biotech sidebar / no switch back). */
export function isAgriLockedRole(user) {
  return (
    isRamAgriMaster(user) ||
    isRamAgriInputAdmin(user) ||
    isRamAgriSalesManager(user) ||
    isRamAgriSalesOfficeManager(user)
  )
}

export function canUseWorkspaceSwitch(user) {
  if (isAgriLockedRole(user)) return false
  const j = normalizeJob({ jobTitle: user?.jobTitle })
  const r = normalizeJob({ jobTitle: user?.role })
  const titles = new Set([j, r])
  return (
    titles.has("SUPER_ADMIN") ||
    titles.has("SUPERADMIN") ||
    titles.has("ADMIN") ||
    titles.has("OFFICE_ADMIN") ||
    titles.has("OFFICEADMIN")
  )
}

/** Accounting Dashboard visible in agri workspace (Ram Agri org only). */
export function canSeeAgriAccounting(user) {
  if (isRamAgriMaster(user) || isSuperAdminUser(user)) return true
  const j = normalizeJob({ jobTitle: user?.jobTitle })
  const r = normalizeJob({ jobTitle: user?.role })
  return j === "ADMIN" || r === "ADMIN" || j === "ACCOUNTANT" || r === "ACCOUNTANT"
}

/** Force Accounting org = Ram Agri (Master always, or agri workspace switch). */
export function forceRamAgriAccountingOrg(user, isAgriMode) {
  return Boolean(isAgriMode || isRamAgriMaster(user))
}

export function tabsForUser(user) {
  let tabs
  if (isRamAgriSalesProgramLead(user)) {
    tabs = [...AGRI_MASTER_TABS]
  } else if (isRamAgriInputAdmin(user)) tabs = [...AGRI_ADMIN_TABS]
  else {
    const j = normalizeJob({ jobTitle: user?.jobTitle })
    const r = normalizeJob({ jobTitle: user?.role })
    if (
      j === "SUPER_ADMIN" ||
      j === "SUPERADMIN" ||
      j === "ADMIN" ||
      r === "SUPER_ADMIN" ||
      r === "SUPERADMIN" ||
      r === "ADMIN"
    ) {
      tabs = [...AGRI_MASTER_TABS]
    } else {
      // OFFICE_ADMIN: ops + master, no agri-payments
      tabs = [...AGRI_ADMIN_TABS, "inputs-master"]
    }
  }
  // Overview (sales dashboard embed) — programme leads + Super Admin
  if (isRamAgriSalesProgramLead(user) || isSuperAdminUser(user)) {
    tabs = ["overview", ...tabs.filter((t) => t !== "overview")]
  }
  if (canSeeBiotechSeedMaster(user) && !tabs.includes(AGRI_BIOTECH_SEED_TAB)) {
    tabs = [...tabs, AGRI_BIOTECH_SEED_TAB]
  }
  return tabs
}

export function isAgriInventoryPathBlocked(pathname) {
  const p = String(pathname || "")
  return AGRI_BLOCKED_INVENTORY_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  )
}

export function isAgriPathAllowed(pathname) {
  const p = String(pathname || "")
  if (isAgriInventoryPathBlocked(p)) return false
  return AGRI_ALLOWED_PATH_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`)
  )
}

/** Master / accountant / super may collect agri sales payments — not RAM_AGRI_SALES_MANAGER. */
export function hasAgriPaymentCollectAccess(user) {
  if (isRamAgriMaster(user)) return true
  const j = normalizeJob({ jobTitle: user?.jobTitle })
  const r = normalizeJob({ jobTitle: user?.role })
  return (
    j === "ACCOUNTANT" ||
    r === "ACCOUNTANT" ||
    j === "SUPER_ADMIN" ||
    j === "SUPERADMIN" ||
    r === "SUPER_ADMIN" ||
    r === "SUPERADMIN"
  )
}

export const TAB_META = [
  { id: "overview", label: "Overview", path: null },
  { id: "inventory", label: "Inventory", path: "/u/inventory" },
  { id: "stock", label: "Stock", path: "/u/inventory/ram-agri-stock" },
  { id: "purchase-orders", label: "Purchase orders", path: "/u/inventory/purchase-orders" },
  { id: "raising-seeds", label: "Raising seeds", path: "/u/inventory/raising-seeds" },
  { id: "sowing-requests", label: "Sowing requests", path: "/u/inventory/sowing-requests" },
  { id: "agri-order", label: "Orders", path: AGRI_HOME_PATH },
  { id: "sell-returns", label: "Sell returns", path: "/u/inventory/agri-sales-returns" },
  { id: "purchase-returns", label: "Purchase returns", path: "/u/inventory/purchase-returns" },
  { id: "money-ledger", label: "Money Ledger", path: "/u/inventory/ledger" },
  { id: "inputs-master", label: "Inputs master", path: "/u/inventory/ram-agri-inputs-master" },
  { id: "agri-payments", label: "Agri payments", path: null },
  {
    id: AGRI_BIOTECH_SEED_TAB,
    label: "Biotech seed master",
    path: BIOTECH_SEED_MASTER_PATH,
  },
]

/** Inventory hub cards/actions allowed in agri workspace (by path). */
export function isAgriInventoryMenuPathAllowed(path) {
  const p = String(path || "")
  if (isAgriInventoryPathBlocked(p)) return false
  // Keep products list (not /new), PO, raising seeds, sowing, ram agri, returns
  const allowed = [
    "/u/inventory",
    "/u/inventory/products",
    "/u/inventory/purchase-orders",
    "/u/inventory/raising-seeds",
    "/u/inventory/sowing-requests",
    "/u/inventory/return-requests",
    "/u/inventory/agri-sales-returns",
    "/u/inventory/ledger",
    "/u/inventory/purchase-returns",
    "/u/inventory/ram-agri-stock",
    "/u/inventory/ram-agri-inputs-master",
    "/u/inventory/ram-agri-input-order",
    "/u/inventory/ram-agri-sales-dashboard",
    BIOTECH_SEED_MASTER_PATH,
    "/u/inventory/seed-dual-links",
  ]
  if (p === "/u/inventory/products/new") return false
  return allowed.some((a) => p === a || p.startsWith(`${a}/`) || p.startsWith(a))
}
