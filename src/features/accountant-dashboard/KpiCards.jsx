import React from "react"
import { IndianRupee, CheckCircle, Layers, Bell } from "lucide-react"
import { cn } from "lib/cn"

const fmt = (n) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)}Cr`
    : n >= 100000
      ? `₹${(n / 100000).toFixed(2)}L`
      : `₹${n.toLocaleString("en-IN")}`

export function KpiCards({ orderPayments, bulkPayments, totals }) {
  const pendingCount =
    totals?.pendingCount != null
      ? Number(totals.pendingCount) || 0
      : orderPayments.filter((p) => p.orderPaymentStatus === "PENDING").length +
        bulkPayments.filter((b) => b.paymentStatus === "PENDING").length
  const collectedCount =
    totals?.collectedCount != null
      ? Number(totals.collectedCount) || 0
      : orderPayments.filter((p) => p.orderPaymentStatus === "COLLECTED" || p.orderPaymentStatus === "BANK_VERIFIED").length +
        bulkPayments.filter((b) => b.paymentStatus === "ACCEPTED").length
  const rejectedCount =
    totals?.rejectedCount != null
      ? Number(totals.rejectedCount) || 0
      : orderPayments.filter((p) => p.orderPaymentStatus === "REJECTED").length

  const totalOutstanding =
    totals?.outstandingSum != null
      ? Number(totals.outstandingSum) || 0
      : orderPayments.reduce((s, p) => s + Math.max(0, p.totalOrderAmount - (p.payment?.paidAmount || 0)), 0)
  const totalCollected =
    totals?.collectedSum != null
      ? Number(totals.collectedSum) || 0
      : orderPayments.reduce((s, p) => s + (p.payment?.paidAmount || 0), 0) +
        bulkPayments.filter((b) => b.paymentStatus === "ACCEPTED").reduce((s, b) => s + b.totalAmount, 0)
  const totalEntries =
    totals?.totalEntries != null
      ? Number(totals.totalEntries) || 0
      : orderPayments.length + bulkPayments.length

  const fromServer = Boolean(totals?.fromServer)

  return (
    <div className="erp-card animate-fade-up stagger-1 overflow-hidden">
      {pendingCount > 0 && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-2.5 border-b border-amber-500/25 bg-amber-500/10 text-amber-950 dark:text-amber-100"
        >
          <Bell className="w-4 h-4 shrink-0 opacity-90" aria-hidden />
          <p className="text-xs font-medium leading-snug">
            <span className="font-semibold">{pendingCount}</span> payment{pendingCount !== 1 ? "s" : ""} pending — click a status in the table below to update.
          </p>
        </div>
      )}
      <div className="flex items-stretch divide-x divide-border flex-wrap">
        <StatCell
          icon={<IndianRupee className="w-4 h-4" />}
          iconBg="bg-status-pending-bg"
          iconColor="text-status-pending"
          label="Outstanding"
          value={fmt(totalOutstanding)}
          valueColor="text-status-pending"
          delay="stagger-1"
        />

        <StatCell
          icon={<CheckCircle className="w-4 h-4" />}
          iconBg="bg-status-collected-bg"
          iconColor="text-status-collected"
          label="Collected"
          value={fmt(totalCollected)}
          valueColor="text-status-collected"
          delay="stagger-2"
        />

        <StatCell
          icon={<Layers className="w-4 h-4" />}
          iconBg="bg-primary-light"
          iconColor="text-primary"
          label="Total Entries"
          value={totalEntries.toLocaleString("en-IN")}
          valueColor="text-primary"
          delay="stagger-3"
          hint={fromServer ? "Server total" : "Loaded rows"}
        />

        <div className="flex-1 px-5 py-3 flex items-center justify-between gap-4 min-w-[200px] animate-fade-up stagger-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Payment Status
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            <StatusPill label="Pending" count={pendingCount} cls="badge-pending" />
            <StatusPill label="Collected" count={collectedCount} cls="badge-collected" />
            <StatusPill label="Rejected" count={rejectedCount} cls="badge-rejected" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCell({ icon, iconBg, iconColor, label, value, valueColor, delay, hint }) {
  return (
    <div className={cn("flex items-center gap-3 px-5 py-3 min-w-[160px] animate-fade-up", delay)}>
      <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
        <span className={iconColor}>{icon}</span>
      </span>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
          {hint ? <span className="ml-1 font-normal normal-case tracking-normal opacity-70">· {hint}</span> : null}
        </div>
        <div className={cn("text-xl font-bold tabular tracking-tight leading-tight mt-0.5", valueColor)}>{value}</div>
      </div>
    </div>
  )
}

function StatusPill({ label, count, cls }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={cn("inline-flex items-center gap-1.5 font-semibold tracking-wide rounded-sm text-[11px] px-2.5 py-1", cls)}>
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
        {count}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}
