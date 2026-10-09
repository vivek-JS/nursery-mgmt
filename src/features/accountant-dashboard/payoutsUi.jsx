import React, { useState } from "react"
import moment from "moment"
import { X } from "lucide-react"

/** Shared building blocks for the Payouts tab (payments and payee register). */

export const PAYEE_TYPE_LABEL = {
  VENDOR: "Vendor",
  FARMER: "Farmer",
  DEALER: "Dealer",
  EMPLOYEE: "Employee",
  OTHER: "Other"
}

export const TONE_CLASS = {
  ok: "border-emerald-600/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  bad: "border-rose-600/30 bg-rose-500/10 text-rose-900 dark:text-rose-100",
  info: "border-sky-600/30 bg-sky-500/10 text-sky-900 dark:text-sky-100",
  muted: "border-border bg-muted/40 text-muted-foreground"
}

export const NAME_RE = /^[A-Za-z0-9 ]+$/
export const REMARKS_RE = /^[A-Za-z0-9 ]*$/
export const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/
export const ACCOUNT_RE = /^[A-Z0-9]{6,34}$/
export const AMOUNT_RE = /^\d+(\.\d{1,2})?$/

export const fmtAmount = (n) =>
  n == null || n === ""
    ? "—"
    : `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export const fmtShortAmount = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
export const fmtDateTime = (d) => (d ? moment(d).format("DD MMM YYYY, hh:mm A") : "—")
export const fmtDate = (d) => (d ? moment(d).format("DD MMM YY") : "—")
export const maskAcc = (a) => {
  const s = String(a || "")
  return s.length <= 4 ? s : `•••• ${s.slice(-4)}`
}

export function Pill({ tone = "muted", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  )
}

export function Overlay({ onClose, children, side = false }) {
  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/30 ${side ? "justify-end" : "items-center justify-center p-4"}`}
      onClick={onClose}
    >
      <div
        className={
          side
            ? "h-full w-full max-w-xl bg-card shadow-xl overflow-y-auto"
            : "w-full max-w-lg bg-card rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        }
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}

export function PanelHeader({ title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
      <div>
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="p-1 rounded hover:bg-muted text-muted-foreground"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? (
        <span className="block text-[11px] text-rose-700 mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>
      ) : null}
    </label>
  )
}

export function SelfApprovalWarning({ what }) {
  return (
    <div className="rounded-md bg-amber-500/10 border border-amber-500/40 px-3 py-2 text-[11px] text-amber-950">
      You created this {what}. As super admin you can approve it yourself; it will be recorded as
      self-approved{what === "payment" ? ", and ICICI net-banking approval is the only other check" : ""}.
    </div>
  )
}

export function DetailRow({ label, children, mono }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/60 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-xs text-foreground text-right ${mono ? "font-mono" : ""}`}>{children || "—"}</span>
    </div>
  )
}

export function ReasonDialog({ title, subtitle, actionLabel, required, onClose, onSubmit }) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    try {
      await onSubmit(reason.trim())
    } finally {
      setBusy(false)
    }
  }
  return (
    <Overlay onClose={onClose}>
      <PanelHeader title={title} subtitle={subtitle} onClose={onClose} />
      <div className="p-5 space-y-4">
        <Field label={required ? "Reason (shown to the maker)" : "Reason (optional)"}>
          <textarea
            className="erp-input w-full text-xs min-h-[80px]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted/50"
            onClick={onClose}
          >
            Back
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-xs font-semibold rounded-md border border-rose-600 bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
            disabled={busy || (required && !reason.trim())}
            onClick={go}
          >
            {busy ? "…" : actionLabel}
          </button>
        </div>
      </div>
    </Overlay>
  )
}

