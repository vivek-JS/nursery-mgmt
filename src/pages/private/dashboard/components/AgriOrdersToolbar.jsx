import React from "react"

const STATUS_TABS = [
  { id: "ALL", label: "All", active: "border-slate-700 text-slate-800 bg-slate-50" },
  { id: "ACCEPTED", label: "Accepted", active: "border-sky-600 text-sky-700 bg-sky-50" },
  { id: "ASSIGNED", label: "Assigned", active: "border-violet-600 text-violet-700 bg-violet-50" },
  { id: "DISPATCHED", label: "Dispatched", active: "border-emerald-600 text-emerald-700 bg-emerald-50" },
  {
    id: "PENDING_RETURNS",
    label: "Pending Returns",
    active: "border-amber-600 text-amber-800 bg-amber-50",
    hideCount: true,
  },
  { id: "CANCELLED", label: "Cancelled", active: "border-rose-600 text-rose-700 bg-rose-50" },
]

/**
 * Ram Agri orders toolbar: view toggle, actions, status tabs (no Completed).
 */
export default function AgriOrdersToolbar({
  viewType,
  setViewType,
  forceAgriOrdersOnly,
  showAgriSalesOrders,
  setShowAgriSalesOrders,
  agriSalesPendingCount = 0,
  agriDispatchStatusFilter,
  setAgriDispatchStatusFilter,
  agriStatusCounts = {},
  onAddOrder,
  onCreateSellReturn,
  hidePaymentDetails,
  setHidePaymentDetails,
  onGuide,
  showOldAgriOrders,
  setShowOldAgriOrders,
}) {
  const pendingBadge =
    agriSalesPendingCount > 0 ? (
      <span className="absolute -top-1.5 -right-1.5 min-w-[1.25rem] h-5 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
        {agriSalesPendingCount > 99 ? "99+" : agriSalesPendingCount}
      </span>
    ) : null

  return (
    <div className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
      <div className="px-3 sm:px-4 py-3 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setViewType("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewType === "table"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewType("grid")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewType === "grid"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Grid
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {forceAgriOrdersOnly ? (
            <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 text-white shadow-sm">
              Ram Agri Inputs
              {pendingBadge}
            </span>
          ) : (
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setShowAgriSalesOrders(false)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  !showAgriSalesOrders
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Regular Orders
              </button>
              <button
                type="button"
                id="ram-agri-inputs-btn"
                onClick={() => setShowAgriSalesOrders(true)}
                className={`relative px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  showAgriSalesOrders
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Ram Agri Inputs
                {showAgriSalesOrders ? pendingBadge : null}
              </button>
            </div>
          )}

          {showAgriSalesOrders && (
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onAddOrder}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              >
                <span aria-hidden>+</span> Add Order
              </button>
              <button
                type="button"
                onClick={onCreateSellReturn}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-600 text-white shadow-sm hover:bg-orange-700"
              >
                Create Sell Return
              </button>
              <label className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 cursor-pointer select-none rounded-md hover:bg-slate-100">
                <input
                  type="checkbox"
                  id="hidePayment"
                  checked={hidePaymentDetails}
                  onChange={(e) => setHidePaymentDetails(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600"
                />
                Hide Payment
              </label>
              <button
                id="agri-tour-help-btn"
                type="button"
                onClick={onGuide}
                title="How to use Ram Agri dispatch"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-orange-700 border border-orange-200 bg-orange-50 hover:bg-orange-100"
              >
                Guide
              </button>
              <button
                type="button"
                onClick={() => setShowOldAgriOrders((v) => !v)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  showOldAgriOrders
                    ? "bg-stone-700 text-white border-stone-800"
                    : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                }`}
                title={
                  showOldAgriOrders
                    ? "Showing archived orders. Click for current orders."
                    : "Show archived orders"
                }
              >
                Old
              </button>
            </div>
          )}
        </div>

        {showAgriSalesOrders && (
          <div className="overflow-x-auto -mx-1 px-1">
            <div
              role="tablist"
              aria-label="Order status"
              className="inline-flex min-w-full sm:min-w-0 gap-0 border-b border-slate-200"
            >
              {STATUS_TABS.map((tab) => {
                const active = agriDispatchStatusFilter === tab.id
                const count = agriStatusCounts[tab.id]
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setAgriDispatchStatusFilter(tab.id)}
                    className={`px-3 sm:px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
                      active
                        ? tab.active
                        : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                    }`}
                  >
                    {tab.label}
                    {!tab.hideCount && count != null ? (
                      <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
