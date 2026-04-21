import React, { useState } from "react"
import { FileImage, ChevronDown, ChevronUp, BookOpen, Layers, Users, ArrowUpRight } from "lucide-react"
import { StatusBadge } from "./StatusBadge"
import { StatusChangePopover } from "./StatusChangePopover"
import { cn } from "lib/cn"
import { getStatementMatchPresentation } from "lib/bankMatchLabels"
import { normalizeFarmerIdForLedger } from "./paymentsApi"
import AttachmentViewerModal, { resolvePaymentMediaUrl } from "components/Modals/AttachmentViewerModal"

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

function orderAttachmentUrls(p) {
  const r = Array.isArray(p.payment?.receiptPhoto) ? p.payment.receiptPhoto : []
  const s = Array.isArray(p.screenshots) ? p.screenshots : []
  return [...r, ...s].filter(Boolean).map(resolvePaymentMediaUrl)
}

/** Row-level hint for order payment transfer (cross-order); listing + expand details. */
function farmerOrderPaymentTransferHint(p) {
  const pay = p?.payment || {}
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

export function UnifiedPaymentsTable({
  orderPayments,
  bulkPayments,
  onOrderStatusSave,
  onBulkAccept,
  onViewLedger,
  acceptingBulkId,
  canEditStatus,
  statusFilter,
  onStatusFilterChange
}) {
  const [expandedId, setExpandedId] = useState(null)
  const [typeFilter, setTypeFilter] = useState("ALL")
  const [attachModal, setAttachModal] = useState(null)

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

  return (
    <div className="erp-card animate-fade-up stagger-2">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-foreground">All Payments</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} entries · order-wise &amp; bulk combined</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-muted rounded-sm p-0.5">
            {["ALL", "ORDER", "BULK"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-sm transition-all",
                  typeFilter === t ? "bg-card shadow-erp-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t === "ALL" ? "All types" : t === "ORDER" ? "Order-wise" : "Bulk"}
              </button>
            ))}
          </div>

          <div className="flex gap-1 flex-wrap">
            {["ALL", "PENDING", "COLLECTED", "REJECTED"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onStatusFilterChange?.(s)}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-sm",
                  activeStatusFilter === s
                    ? s === "ALL"
                      ? "bg-primary text-primary-foreground"
                      : s === "PENDING"
                        ? "badge-pending"
                        : s === "COLLECTED"
                          ? "badge-collected"
                          : "badge-rejected"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Ref #</th>
              <th>Customer / Party</th>
              <th>Detail</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Mode</th>
              <th>Date</th>
              <th>Status</th>
              <th>Bank / statement</th>
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
                      <td>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-primary-light text-primary uppercase tracking-wide">
                          <Layers className="w-3 h-3" /> Order
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            className="p-0.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            title={isExpanded ? "Hide details" : "Show details"}
                            onClick={(e) => {
                              e.stopPropagation()
                              setExpandedId(isExpanded ? null : id)
                            }}
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                          <span className="font-mono text-xs font-semibold text-primary">#{p.orderId}</span>
                          {p.dealerOrder && (
                            <span className="text-[10px] bg-accent-light text-accent font-semibold px-1 rounded-sm">Dealer</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium text-foreground">{p.farmer?.name ?? "—"}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {p.farmer ? `${p.farmer.village || ""}${p.farmer.village && p.farmer.district ? ", " : ""}${p.farmer.district || ""}` : "—"}
                        </div>
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
                                  "inline-flex flex-col gap-0.5 rounded border px-1.5 py-1 text-[10px] font-bold leading-tight",
                                  th.role === "in"
                                    ? "border-emerald-600 bg-emerald-50 text-emerald-950"
                                    : "border-amber-700 bg-amber-50 text-amber-950"
                                )}
                                title={`${th.mr} · ${th.short}`}
                              >
                                <span>{th.label}</span>
                                <span className="font-semibold opacity-90">{th.mr}</span>
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
                      <td className="max-w-[160px]">
                        {(() => {
                          const pres = getStatementMatchPresentation(p.payment)
                          return (
                            <span className={cn("text-[11px] leading-snug", pres.className)}>{pres.label}</span>
                          )
                        })()}
                      </td>
                      <td>
                        {(() => {
                          const urls = orderAttachmentUrls(p)
                          const n = urls.length
                          return n > 0 ? (
                            <button
                              type="button"
                              className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
                              title="View attachments"
                              onClick={(e) => {
                                e.stopPropagation()
                                setAttachModal({
                                  title: `Order #${p.orderId} · attachments`,
                                  urls
                                })
                              }}
                            >
                              <FileImage className="w-3.5 h-3.5" />
                              {n}
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
                        <td colSpan={13} className="p-0 border-0">
                          <div className="px-5 py-3 bg-muted/40 border-b border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <DetailCell label="Sales Person" value={p.salesPerson?.name || "—"} sub={String(p.salesPerson?.phoneNumber ?? "")} />
                            <DetailCell label="Booking Date" value={fmtDate(p.orderBookingDate)} />
                            <DetailCell label="Remark" value={p.payment?.remark || "—"} />
                            {(() => {
                              const th = farmerOrderPaymentTransferHint(p)
                              if (!th) return null
                              return (
                                <DetailCell
                                  label="Order transfer"
                                  value={
                                    <div className="space-y-1">
                                      <div className="font-semibold">{th.label}</div>
                                      <div className="text-xs text-muted-foreground">{th.mr}</div>
                                      <div className="text-xs">{th.short}</div>
                                      {p.payment?.transferredFromOrderId ? (
                                        <div className="text-[11px] font-mono text-muted-foreground">
                                          from order _id: {p.payment.transferredFromOrderId}
                                        </div>
                                      ) : null}
                                    </div>
                                  }
                                />
                              )
                            })()}
                            <DetailCell label="Order Status" value={<StatusBadge status={String(p.orderStatus)} />} />
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
                    <td>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-accent-light text-accent uppercase tracking-wide">
                        <Users className="w-3 h-3" /> Bulk
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
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
                    <td className="text-[11px] text-muted-foreground">—</td>
                    <td>
                      {(() => {
                        const urls = (Array.isArray(b.receiptPhoto) ? b.receiptPhoto : []).filter(Boolean).map(resolvePaymentMediaUrl)
                        return urls.length > 0 ? (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-[11px] text-primary font-medium hover:underline"
                            title="View attachments"
                            onClick={(e) => {
                              e.stopPropagation()
                              setAttachModal({
                                title: `Bulk ${String(b._id).slice(-8)} · attachments`,
                                urls
                              })
                            }}
                          >
                            <FileImage className="w-3.5 h-3.5" />
                            {urls.length}
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
                      <td colSpan={13} className="p-0 border-0">
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
                <td colSpan={13} className="text-center text-muted-foreground py-10 text-sm">
                  No entries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AttachmentViewerModal
        open={Boolean(attachModal)}
        onClose={() => setAttachModal(null)}
        title={attachModal?.title}
        urls={attachModal?.urls || []}
      />
    </div>
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
