import React, { useState, useCallback, useEffect, useRef } from "react"
import { FileImage, ChevronDown, ChevronUp, BookOpen, Layers, Users, ArrowUpRight, Loader2, Truck, RefreshCw } from "lucide-react"
import { StatusBadge } from "./StatusBadge"
import { StatusChangePopover } from "./StatusChangePopover"
import { PaymentsTableFilters } from "./PaymentsTableFilters"
import { cn } from "lib/cn"
import {
  normalizeFarmerIdForLedger,
  fetchFarmerPlantOrderDetails,
  fetchOrderPaymentTransferContext
} from "./paymentsApi"
import PaymentAttachmentModal, {
  buildBulkAttachmentContext,
  buildOrderAttachmentContext
} from "./PaymentAttachmentModal"
import OrderTimeline from "components/OrderTimeline"
import { resolveOrderCustomerCell } from "./orderCustomerDisplay"

const fmt = (n) => `₹${n.toLocaleString("en-IN")}`
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

function orderLedgerContact(p) {
  const f = p.farmer
  if (!f) return { mobile: "", name: "" }
  const name = String(f.name || "").trim()
  const mobile = String(f.mobileNumber ?? f.mobile ?? f.phone ?? "").trim()
  return { mobile, name }
}

function bulkLedgerContact(b) {
  const a = Array.isArray(b.allocations) && b.allocations[0]
  if (!a) return { mobile: "", name: "" }
  const name = String(a.customerName || "").trim()
  const mobile = String(a.customerMobile ?? a.mobileNumber ?? "").trim()
  return { mobile, name }
}

/** Row-level hint for order payment transfer (cross-order); listing + expand details. */
function farmerOrderPaymentTransferHint(p) {
  const pay = p?.payment || {}
  if (pay.transferRequestId && pay.paymentStatus === "PENDING") {
    return {
      role: "transfer-pending",
      label: "Transfer pending",
      mr: "मंजूर: Completed · नाकार: Rejected",
      short: "Awaiting approval"
    }
  }
  if (
    pay.transferRequestId &&
    pay.paymentStatus === "REJECTED" &&
    /Transfer request undone/i.test(String(pay.remark || ""))
  ) {
    return {
      role: "transfer-undone",
      label: "Transfer undone",
      mr: "हा transfer रद्द झाला — पुन्हा Completed करू नका; नवीन transfer request तयार करा",
      short: "Create new transfer request — do not collect again"
    }
  }
  if (pay.transferRequestId && pay.paymentStatus === "COLLECTED" && pay.transferredFromOrderId) {
    return {
      role: "transfer-approved",
      label: "Transfer approved",
      mr: "मंजूर transfer — Rejected केल्यास स्रोत ऑर्डरवर रक्कम परत",
      short: "Reject to undo and restore source"
    }
  }
  if (pay.transferredFromOrderId) {
    return {
      role: "in",
      label: "Transferred in",
      mr: "इतर ऑर्डरवरून पेमेंट transfer (येथे जमा)",
      short: "From another order"
    }
  }
  if (pay.paymentStatus === "REJECTED" && /Transferred to order/i.test(String(pay.remark || ""))) {
    return {
      role: "out",
      label: "Transferred out",
      mr: "पेमेंट इतर ऑर्डरला transfer (येथून बाहेर)",
      short: "Moved to another order"
    }
  }
  return null
}

function formatActorRole(role) {
  if (!role) return ""
  return String(role).replace(/_/g, " ")
}

function PaymentActorCell({ actor, emptyLabel = "—" }) {
  if (!actor?.name) {
    return <span className="text-[11px] text-muted-foreground">{emptyLabel}</span>
  }
  return (
    <div className="space-y-0.5">
      <div className="font-medium text-foreground">{actor.name}</div>
      {actor.role ? (
        <div className="text-[10px] font-semibold uppercase tracking-wide text-violet-800">
          {formatActorRole(actor.role)}
        </div>
      ) : null}
      {actor.phoneNumber ? (
        <div className="text-[11px] text-muted-foreground">{actor.phoneNumber}</div>
      ) : null}
    </div>
  )
}

function PaymentTimingBadge({ timing }) {
  if (timing !== "advance" && timing !== "balance") return null
  const isAdvance = timing === "advance"
  return (
    <span
      className={cn(
        "text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wide",
        isAdvance ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"
      )}
    >
      {isAdvance ? "Advance" : "Balance"}
    </span>
  )
}

export function UnifiedPaymentsTable({
  orderPayments,
  bulkPayments,
  onOrderStatusSave,
  onBulkAccept,
  onViewLedger,
  acceptingBulkId,
  canEditStatus,
  statusFilter,
  onStatusFilterChange,
  typeFilter: typeFilterProp,
  onTypeFilterChange,
  advancesMode = false,
  advanceViewFilter = "pending_advance",
  onAdvanceViewFilterChange,
  /** Backend pagination total for current filters */
  totalCount,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  /** Optional { byType: { ALL, ORDER, BULK } } */
  filterTotals,
  onRefresh,
  refreshing = false
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [localTypeFilter, setLocalTypeFilter] = useState("ALL")
  const typeFilter = typeFilterProp ?? localTypeFilter
  const setTypeFilter = onTypeFilterChange || setLocalTypeFilter
  const [attachModal, setAttachModal] = useState(null)
  const [orderDetailsCache, setOrderDetailsCache] = useState({})
  const [orderDetailsLoading, setOrderDetailsLoading] = useState({})
  const [transferContextCache, setTransferContextCache] = useState({})
  const [transferContextLoading, setTransferContextLoading] = useState({})
  const scrollRef = useRef(null)
  const sentinelRef = useRef(null)

  const handleRefresh = useCallback(() => {
    setExpandedId(null)
    setAttachModal(null)
    setOrderDetailsCache({})
    setOrderDetailsLoading({})
    setTransferContextCache({})
    setTransferContextLoading({})
    onRefresh?.()
  }, [onRefresh])

  const handleOrderExpand = useCallback(
    async (id, p) => {
      const next = expandedId === id ? null : id
      setExpandedId(next)
      if (!next || p.dealerOrder) return
      const mongoId = p.__raw?._id
      if (!mongoId) return

      const transferHint = farmerOrderPaymentTransferHint(p)
      const loadDetails = !orderDetailsCache[id]
      const loadTransfer = transferHint && transferContextCache[id] === undefined

      if (!loadDetails && !loadTransfer) return

      if (loadDetails) {
        setOrderDetailsLoading((prev) => ({ ...prev, [id]: true }))
        try {
          const details = await fetchFarmerPlantOrderDetails(mongoId)
          setOrderDetailsCache((prev) => ({ ...prev, [id]: details }))
        } catch {
          setOrderDetailsCache((prev) => ({ ...prev, [id]: null }))
        } finally {
          setOrderDetailsLoading((prev) => ({ ...prev, [id]: false }))
        }
      }

      if (loadTransfer && p.payment?._id) {
        setTransferContextLoading((prev) => ({ ...prev, [id]: true }))
        try {
          const ctx = await fetchOrderPaymentTransferContext(mongoId, p.payment._id)
          setTransferContextCache((prev) => ({ ...prev, [id]: ctx }))
        } catch {
          setTransferContextCache((prev) => ({ ...prev, [id]: null }))
        } finally {
          setTransferContextLoading((prev) => ({ ...prev, [id]: false }))
        }
      }
    },
    [expandedId, orderDetailsCache, transferContextCache]
  )

  const rows = [...orderPayments.map((d) => ({ kind: "order", data: d })), ...bulkPayments.map((d) => ({ kind: "bulk", data: d }))]

  const activeStatusFilter = statusFilter || "ALL"

  const resolveSortTimestamp = (row) => {
    if (row.kind === "order") {
      const payment = row.data.payment || {}
      const ts = payment.updatedAt || payment.paymentDate || payment.createdAt || row.data.createdAt
      const parsed = new Date(ts).getTime()
      return Number.isFinite(parsed) ? parsed : 0
    }
    const ts = row.data.updatedAt || row.data.paymentDate || row.data.createdAt
    const parsed = new Date(ts).getTime()
    return Number.isFinite(parsed) ? parsed : 0
  }

  const sorted = [...rows].sort((a, b) => {
    return resolveSortTimestamp(b) - resolveSortTimestamp(a)
  })

  const filtered = sorted.filter((r) => {
    if (advancesMode) return r.kind === "order"
    const statusMatch =
      activeStatusFilter === "ALL"
        ? true
        : r.kind === "order"
          ? r.data.orderPaymentStatus === activeStatusFilter
          : r.data.paymentStatus === activeStatusFilter || (activeStatusFilter === "COLLECTED" && r.data.paymentStatus === "ACCEPTED")
    const typeMatch = typeFilter === "ALL" ? true : typeFilter === "ORDER" ? r.kind === "order" : r.kind === "bulk"
    return statusMatch && typeMatch
  })

  const getRowId = (r) => (r.kind === "order" ? r.data.id : r.data._id)
  const tableColSpan = advancesMode ? 13 : 14
  const displayTotal =
    typeof totalCount === "number" && Number.isFinite(totalCount) ? totalCount : filtered.length

  useEffect(() => {
    const root = scrollRef.current
    const target = sentinelRef.current
    if (!root || !target || !onLoadMore) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        if (!hasMore || loadingMore) return
        onLoadMore()
      },
      { root, rootMargin: "160px 0px", threshold: 0 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, onLoadMore, filtered.length])

  return (
    <>
    <div className="erp-card animate-fade-up stagger-2 min-w-0 max-w-full flex flex-col overflow-hidden h-[min(68vh,720px)]">
      <div className="shrink-0 px-4 py-2.5 border-b border-border flex items-center gap-3 flex-wrap">
        <PaymentsTableFilters
          advancesMode={advancesMode}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          statusFilter={activeStatusFilter}
          onStatusFilterChange={onStatusFilterChange}
          advanceViewFilter={advanceViewFilter}
          onAdvanceViewFilterChange={onAdvanceViewFilterChange}
          totals={filterTotals}
        />
        <div className="ml-auto flex items-center gap-2 min-w-0">
          {onRefresh ? (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              onClick={handleRefresh}
              disabled={refreshing}
              title="Refresh payments"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
              Refresh
            </button>
          ) : null}
          <div className="text-right min-w-0">
            <h2 className="text-sm font-semibold text-foreground">{advancesMode ? "Advances" : "All Payments"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {advancesMode
                ? `${filtered.length} loaded · ${displayTotal.toLocaleString("en-IN")} total`
                : `${filtered.length.toLocaleString("en-IN")} loaded · ${displayTotal.toLocaleString("en-IN")} total from server`}
            </p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto">
        <table className="data-table">
          <thead className="sticky top-0 z-[1] bg-card shadow-sm">
            <tr>
              {!advancesMode && <th>Timing</th>}
              <th>Ref #</th>
              <th>Customer / Party</th>
              <th>Detail</th>
              <th>Sales / Ref By</th>
              <th>Updated By</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Mode</th>
              <th>Date</th>
              <th>Status</th>
              <th>Attach</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const id = getRowId(r)
              const isExpanded = expandedId === id

              if (r.kind === "order") {
                const p = r.data
                const balance = p.totalOrderAmount - (p.payment?.paidAmount || 0)
                return (
                  <React.Fragment key={id}>
                    <tr>
                      {!advancesMode && (
                        <td>
                          <PaymentTimingBadge timing={p.paymentTiming || p.payment?.paymentTiming} />
                        </td>
                      )}
                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            className="p-0.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title={isExpanded ? "Hide details" : "Show details"}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOrderExpand(id, p)
                            }}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-primary-light text-primary uppercase tracking-wide shrink-0">
                            <Layers className="w-3 h-3" /> Order
                          </span>
                          <span className="font-mono text-xs font-semibold text-primary">#{p.orderId}</span>
                          {advancesMode && (
                            <PaymentTimingBadge timing={p.paymentTiming || p.payment?.paymentTiming} />
                          )}
                          {p.dealerOrder && (
                            <span className="text-[10px] bg-accent-light text-accent font-semibold px-1 rounded-sm">Dealer</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const c = resolveOrderCustomerCell({ orderFor: p.orderFor, farmer: p.farmer })
                          return (
                            <div className="space-y-0.5">
                              <div className="font-medium text-foreground">{c.primaryName}</div>
                              {c.secondaryLine ? (
                                <div className="text-[11px] font-medium inline-flex flex-wrap items-baseline gap-x-0.5 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 max-w-full">
                                  <span className="text-sky-600 font-semibold shrink-0">Booking:</span>
                                  <span className="text-sky-900">{c.bookingFarmer?.name || "Unknown"}</span>
                                </div>
                              ) : null}
                              {c.locationLine ? (
                                <div className="text-[11px] text-muted-foreground">{c.locationLine}</div>
                              ) : !c.secondaryLine ? (
                                <div className="text-[11px] text-muted-foreground">—</div>
                              ) : null}
                            </div>
                          )
                        })()}
                      </td>
                      <td>
                        <span className="font-medium">{p.plantType?.name || "—"}</span>
                        <div className="text-[11px] text-muted-foreground tabular">
                          {(p.numberOfPlants || 0).toLocaleString("en-IN")} × ₹{p.rate}
                        </div>
                        {(() => {
                          const th = farmerOrderPaymentTransferHint(p)
                          if (!th) return null
                          return (
                            <div className="mt-1.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold leading-tight",
                                  th.role === "in"
                                    ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                                    : "border-amber-700 bg-amber-50 text-amber-950"
                                )}
                                title={th.mr}
                              >
                                <span>{th.label}</span>
                                {th.short ? (
                                  <span className="font-medium opacity-80">· {th.short}</span>
                                ) : null}
                              </span>
                            </div>
                          )
                        })()}
                        {(p.returnedPlants > 0 || p.damagedPlants > 0) && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 tabular">
                            {p.returnedPlants > 0 && (
                              <span className="text-amber-800 font-medium">
                                Ret {p.returnedPlants.toLocaleString("en-IN")}
                              </span>
                            )}
                            {p.returnedPlants > 0 && p.damagedPlants > 0 && <span className="mx-1 text-gray-400">·</span>}
                            {p.damagedPlants > 0 && (
                              <span className="text-red-800 font-medium">
                                Dmg {p.damagedPlants.toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="font-medium text-foreground">{p.salesPerson?.name || "—"}</div>
                        {p.salesPerson?.phoneNumber && (
                          <div className="text-[11px] text-muted-foreground">{p.salesPerson.phoneNumber}</div>
                        )}
                      </td>
                      <td>
                        <PaymentActorCell actor={p.paymentUpdatedBy || p.paymentRecordedBy} />
                      </td>
                      <td className="tabular font-semibold">{fmt(p.totalOrderAmount)}</td>
                      <td className="tabular text-status-collected font-semibold">{fmt(p.payment?.paidAmount || 0)}</td>
                      <td className={cn("tabular font-semibold", balance > 0 ? "text-status-rejected" : "text-status-collected")}>
                        {balance > 0 ? `-${fmt(balance)}` : "✓ Clear"}
                      </td>
                      <td>
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-sm font-medium">{p.payment?.modeOfPayment || "—"}</span>
                      </td>
                      <td className="text-xs text-muted-foreground tabular">{fmtDate(p.payment?.paymentDate || p.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {canEditStatus ? (
                          <StatusChangePopover
                            status={p.orderPaymentStatus}
                            disabled={false}
                            onApply={async (newStatus) => {
                              await onOrderStatusSave(p, newStatus)
                            }}
                          />
                        ) : (
                          <StatusBadge status={p.orderPaymentStatus} />
                        )}
                      </td>
                      <td>
                        {(() => {
                          const ctx = buildOrderAttachmentContext(p)
                          const n = ctx.urls.length
                          return n > 0 ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] text-primary font-semibold hover:bg-primary/10 transition-colors"
                              title="View attachments & details"
                              onClick={(e) => {
                                e.stopPropagation()
                                setAttachModal(ctx)
                              }}
                            >
                              <FileImage className="w-3.5 h-3.5" />
                              View ({n})
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )
                        })()}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1 flex-wrap">
                          {(() => {
                            const c = orderLedgerContact(p)
                            if (!c.name && !c.mobile) return null
                            const farmerId = normalizeFarmerIdForLedger(
                              p.farmer?._id ?? p.farmer?.id ?? p.farmer
                            )
                            return (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                                title="View farmer plant ledger"
                                onClick={() =>
                                  onViewLedger(c.mobile, c.name, farmerId)
                                }
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                Ledger
                              </button>
                            )
                          })()}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={tableColSpan} className="p-0 border-0">
                          <div className="bg-muted/40 border-b border-border">
                            {/* Static summary grid */}
                            <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-border/60">
                              <DetailCell label="Sales Person" value={p.salesPerson?.name || "—"} sub={String(p.salesPerson?.phoneNumber ?? "")} />
                              <DetailCell
                                label="Payment updated by"
                                value={p.paymentUpdatedBy?.name || "—"}
                                sub={
                                  p.paymentUpdatedBy?.role
                                    ? formatActorRole(p.paymentUpdatedBy.role)
                                    : p.paymentUpdatedBy?.phoneNumber || ""
                                }
                              />
                              <DetailCell label="Booking Date" value={fmtDate(p.orderBookingDate)} />
                              <DetailCell label="Remark" value={p.payment?.remark || "—"} />
                              <DetailCell label="Order Status" value={<StatusBadge status={String(p.orderStatus)} />} />
                              <DetailCell label="Vehicle" value={p.dispatch?.vehicleName || "—"} sub={p.dispatch?.vehicleNumber || ""} />
                              <DetailCell label="Driver" value={p.dispatch?.driverName || "—"} sub={p.dispatch?.driverMobile || ""} />
                              {(() => {
                                const th = farmerOrderPaymentTransferHint(p)
                                if (!th) return null
                                return (
                                  <DetailCell
                                    label="Order transfer"
                                    value={
                                      <div className="space-y-0.5">
                                        <div className="font-semibold">{th.label}</div>
                                        <div className="text-xs text-muted-foreground">{th.short || th.mr}</div>
                                      </div>
                                    }
                                  />
                                )
                              })()}
                            </div>

                            {farmerOrderPaymentTransferHint(p) ? (
                              <div className="px-5 py-3 border-b border-border/60">
                                <TransferContextPanel
                                  loading={Boolean(transferContextLoading[id])}
                                  context={transferContextCache[id]}
                                  rowOrderId={p.orderId}
                                />
                              </div>
                            ) : null}

                            {/* API-fetched details */}
                            {orderDetailsLoading[id] ? (
                              <div className="flex items-center gap-2 px-5 py-4 text-xs text-muted-foreground">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Loading order details…
                              </div>
                            ) : orderDetailsCache[id] === null ? (
                              <div className="px-5 py-3 text-xs text-muted-foreground">Could not load full order details.</div>
                            ) : orderDetailsCache[id] ? (
                              <OrderDetailsPanel details={orderDetailsCache[id]} />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              }

              const b = r.data
              const primaryCustomer = b.allocations[0]?.customerName ?? "—"
              return (
                <React.Fragment key={id}>
                  <tr>
                    {!advancesMode && <td className="text-[11px] text-muted-foreground">—</td>}
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          className="p-0.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title={isExpanded ? "Hide allocations" : "Show allocations"}
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedId(isExpanded ? null : id)
                          }}
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-accent-light text-accent uppercase tracking-wide shrink-0">
                          <Users className="w-3 h-3" /> Bulk
                        </span>
                        <span className="font-mono text-xs font-semibold text-accent">{b._id.slice(-6).toUpperCase()}</span>
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-foreground">{primaryCustomer}</div>
                      <div className="text-[11px] text-muted-foreground">{b.allocations[0]?.village ?? ""}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium">
                          {b.allocations.length} order{b.allocations.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </td>
                    <td className="text-[11px] text-muted-foreground">—</td>
                    <td>
                      <PaymentActorCell actor={b.acceptedBy || b.createdBy} emptyLabel="—" />
                    </td>
                    <td className="tabular font-bold">{fmt(b.totalAmount)}</td>
                    <td className="tabular text-status-collected font-semibold">
                      {b.paymentStatus === "ACCEPTED" ? fmt(b.totalAmount) : "—"}
                    </td>
                    <td className={cn("tabular font-semibold", b.paymentStatus !== "ACCEPTED" ? "text-status-rejected" : "text-status-collected")}>
                      {b.paymentStatus !== "ACCEPTED" ? `-${fmt(b.totalAmount)}` : "✓ Clear"}
                    </td>
                    <td>
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded-sm font-medium">{b.modeOfPayment}</span>
                    </td>
                    <td className="text-xs text-muted-foreground tabular">{fmtDate(b.paymentDate)}</td>
                    <td>
                      <StatusBadge status={b.paymentStatus === "ACCEPTED" ? "ACCEPTED" : b.paymentStatus} />
                    </td>
                    <td>
                      {(() => {
                        const ctx = buildBulkAttachmentContext(b)
                        const n = ctx.urls.length
                        return n > 0 ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] text-primary font-semibold hover:bg-primary/10 transition-colors"
                            title="View attachments & details"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAttachModal(ctx)
                            }}
                          >
                            <FileImage className="w-3.5 h-3.5" />
                            View ({n})
                          </button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )
                      })()}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 flex-wrap">
                        {b.paymentStatus === "PENDING" && canEditStatus && (
                          <button
                            type="button"
                            title="Accept bulk payment"
                            onClick={() => onBulkAccept(b._id)}
                            disabled={acceptingBulkId === b._id}
                            className="text-[11px] font-semibold px-2 py-1 rounded-sm bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50"
                          >
                            {acceptingBulkId === b._id ? "…" : "Accept"}
                          </button>
                        )}
                        {(() => {
                          const c = bulkLedgerContact(b)
                          if (!c.name && !c.mobile) return null
                          return (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                              title="View ledger for primary customer"
                              onClick={() => onViewLedger(c.mobile, c.name)}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Ledger
                            </button>
                          )
                        })()}
                        <ActionBtn
                          title="View allocations"
                          onClick={() => setExpandedId(isExpanded ? null : id)}
                          icon={<ArrowUpRight className="w-3.5 h-3.5" />}
                          variant="accepted"
                        />
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr>
                      <td colSpan={tableColSpan} className="p-0 border-0">
                        <div className="px-5 py-3 bg-muted/40 border-b border-border space-y-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Allocation Breakdown</span>
                            <span className="text-[11px] text-muted-foreground">
                              Created by {b.createdBy?.name}
                              {b.acceptedBy ? ` · Accepted by ${b.acceptedBy.name}` : ""}
                            </span>
                          </div>
                          {b.allocations.map((a) => (
                            <div key={a.orderId} className="flex items-center justify-between bg-card border border-border rounded px-3 py-2 text-sm">
                              <div className="flex items-center gap-3">
                                <span className="font-mono text-[11px] font-semibold text-primary">#{a.orderNumber}</span>
                                <span className="font-medium">{a.customerName}</span>
                                <span className="text-muted-foreground text-xs">{a.village}</span>
                              </div>
                              <span className="tabular font-bold text-status-collected">{fmt(a.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={tableColSpan} className="text-center text-muted-foreground py-10 text-sm">
                  No entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div ref={sentinelRef} className="h-8 w-full flex items-center justify-center py-3 text-xs text-muted-foreground">
          {loadingMore
            ? (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading more…
              </span>
            )
            : hasMore
              ? "Scroll for more"
              : filtered.length > 0
                ? "All matching payments loaded"
                : null}
        </div>
      </div>
    </div>

    <PaymentAttachmentModal
      open={Boolean(attachModal)}
      onClose={() => setAttachModal(null)}
      context={attachModal}
    />
    </>
  )
}

function ActionBtn({ title, onClick, icon, variant }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors text-muted-foreground",
        variant === "primary" ? "hover:bg-primary-light hover:text-primary" : "hover:bg-status-accepted-bg hover:text-status-accepted"
      )}
    >
      {icon}
    </button>
  )
}

function DetailCell({ label, value, sub }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-medium">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

function TransferOrderCard({ title, order, highlight }) {
  if (!order?.orderMongoId) {
    return (
      <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
        {title}: not found
      </div>
    )
  }
  const f = order.farmer || {}
  const pay = order.payment || {}
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-xs space-y-1.5",
        highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      )}
    >
      <div className="font-semibold text-[11px] uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="font-bold text-sm">Order #{order.orderNumber ?? "—"}</div>
      <div>{f.name || "—"}</div>
      <div className="text-muted-foreground">{f.mobileNumber || "—"}</div>
      <div className="text-muted-foreground">
        {[f.village, f.district].filter(Boolean).join(", ") || "—"}
      </div>
      <div className="pt-1 border-t border-border/50">
        <span className="text-muted-foreground">Payment: </span>
        <span className="font-semibold tabular">{fmt(Number(pay.paidAmount) || 0)}</span>
        <span className="mx-1">·</span>
        <StatusBadge status={pay.paymentStatus || "PENDING"} />
      </div>
      {pay.remark ? (
        <div className="text-[11px] text-muted-foreground line-clamp-2">{pay.remark}</div>
      ) : null}
    </div>
  )
}

function TransferContextPanel({ loading, context, rowOrderId }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading transfer details…
      </div>
    )
  }
  if (!context) {
    return <div className="text-xs text-muted-foreground">Could not load transfer details.</div>
  }

  const current = context.currentOrder
  const peer = context.peerOrder
  const currentIsRow =
    current?.orderNumber != null && Number(current.orderNumber) === Number(rowOrderId)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Order payment transfer
        </span>
        {context.amount > 0 ? (
          <span className="text-sm font-bold tabular">{fmt(context.amount)}</span>
        ) : null}
        {context.transferId ? (
          <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[200px]">
            id {String(context.transferId).slice(-8)}
          </span>
        ) : null}
      </div>
      {context.rejectUndoHint ? (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          {context.rejectUndoHint}
        </p>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TransferOrderCard
          title={context.direction === "in" ? "This order (target)" : "This order (source)"}
          order={current}
          highlight={currentIsRow}
        />
        <TransferOrderCard
          title={context.direction === "in" ? "Source order" : "Target order"}
          order={peer}
          highlight={!currentIsRow}
        />
      </div>
    </div>
  )
}

function OrderDetailsPanel({ details }) {
  const payments = Array.isArray(details?.payments) ? details.payments : []
  const dispatchHistory = Array.isArray(details?.order?.dispatchHistory) ? details.order.dispatchHistory : []
  const order = details?.order || {}
  const notes = order.notes || (Array.isArray(order.orderRemarks) ? order.orderRemarks.join(", ") : order.orderRemarks) || ""

  // Compute totals client-side (backend computed may be {} if not awaited)
  const totalOrderedPlants = (Number(order.numberOfPlants) || 0) + (Number(order.additionalPlants) || 0)
  const orderTotal = Math.round((Number(order.rate) || 0) * totalOrderedPlants * 100) / 100
  const totalCollected = payments
    .filter((p) => p.paymentStatus === "COLLECTED")
    .reduce((sum, p) => sum + (Number(p.paidAmount) || 0), 0)
  const outstanding = Math.round((orderTotal - totalCollected) * 100) / 100

  const plantName = order.plantName?.name || "—"
  const returned = Number(order.returnedPlants) || 0
  const damaged = Number(order.damagedPlants) || 0

  return (
    <div className="divide-y divide-border/60">
      {/* Order summary strip */}
      <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-2 text-xs">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Plant</div>
          <div className="font-semibold">{plantName}</div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Ordered</div>
          <div className="font-semibold tabular">{totalOrderedPlants.toLocaleString("en-IN")} plants × ₹{order.rate}</div>
        </div>
        {returned > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Returned</div>
            <div className="font-semibold tabular text-amber-700">{returned.toLocaleString("en-IN")} plants</div>
          </div>
        )}
        {damaged > 0 && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Damaged</div>
            <div className="font-semibold tabular text-red-700">{damaged.toLocaleString("en-IN")} plants</div>
          </div>
        )}
        {order.deliveryDate && (
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Delivery Date</div>
            <div className="font-semibold">{fmtDate(order.deliveryDate)}</div>
          </div>
        )}
        {notes && (
          <div className="col-span-2 sm:col-span-3 lg:col-span-5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Notes</div>
            <div className="italic text-muted-foreground">{notes}</div>
          </div>
        )}
      </div>

      {/* Totals bar */}
      <div className="px-5 py-2.5 flex items-center gap-6 flex-wrap text-xs bg-muted/30">
        <span className="font-semibold text-muted-foreground uppercase tracking-wider">Totals</span>
        <span className="tabular">
          <span className="text-muted-foreground mr-1">Billed</span>
          <span className="font-bold">{fmt(orderTotal)}</span>
        </span>
        <span className="tabular">
          <span className="text-muted-foreground mr-1">Collected</span>
          <span className="font-bold text-status-collected">{fmt(totalCollected)}</span>
        </span>
        <span className="tabular">
          <span className="text-muted-foreground mr-1">Outstanding</span>
          <span className={cn("font-bold", outstanding > 0 ? "text-status-rejected" : "text-status-collected")}>
            {outstanding > 0 ? `-${fmt(outstanding)}` : "✓ Clear"}
          </span>
        </span>
      </div>

      {order._id && (
        <div className="px-5 py-3 border-b border-border/60">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Order activity timeline
          </div>
          <OrderTimeline orderId={String(order._id)} orderDomain="PLANT" limit={15} />
        </div>
      )}

      {/* All payments */}
      {payments.length > 0 && (
        <div className="px-5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Payment History ({payments.length})
          </div>
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">#</th>
                  <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</th>
                  <th className="text-right px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Amount</th>
                  <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mode</th>
                  <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</th>
                  <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {payments.map((pay, i) => (
                  <tr key={String(pay._id || i)} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-1.5 text-muted-foreground tabular">{i + 1}</td>
                    <td className="px-3 py-1.5 tabular text-muted-foreground">{fmtDate(pay.paymentDate || pay.createdAt)}</td>
                    <td className="px-3 py-1.5 tabular font-semibold text-right">{fmt(Number(pay.paidAmount) || 0)}</td>
                    <td className="px-3 py-1.5">
                      <span className="bg-muted px-1.5 py-0.5 rounded-sm font-medium">{pay.modeOfPayment || "—"}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <StatusBadge status={pay.paymentStatus || "PENDING"} />
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground max-w-[200px] truncate">{pay.remark || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatch history */}
      {dispatchHistory.length > 0 && (
        <div className="px-5 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5" /> Dispatch History ({dispatchHistory.length})
          </div>
          <div className="rounded border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</th>
                  <th className="text-right px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Qty Dispatched</th>
                  <th className="text-right px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Remaining</th>
                  <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Vehicle</th>
                  <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Driver</th>
                  <th className="text-left px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Invoice #</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {dispatchHistory.map((d, i) => (
                  <tr key={String(d._id || i)} className="bg-card hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-1.5 tabular text-muted-foreground">{d.date ? fmtDate(d.date) : "—"}</td>
                    <td className="px-3 py-1.5 tabular font-semibold text-right">{(d.quantity || 0).toLocaleString("en-IN")}</td>
                    <td className="px-3 py-1.5 tabular text-muted-foreground text-right">{(d.remainingAfterDispatch ?? "—").toLocaleString ? (d.remainingAfterDispatch ?? 0).toLocaleString("en-IN") : "—"}</td>
                    <td className="px-3 py-1.5 font-medium">{d.vehicleName || "—"}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{d.driverName || "—"}</td>
                    <td className="px-3 py-1.5 font-mono text-primary">{d.invoiceNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
