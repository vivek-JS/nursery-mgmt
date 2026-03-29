/**
 * Indian English labels for bank reconciliation state on a payment subdocument.
 */
export function getStatementMatchPresentation(payment) {
  if (!payment) {
    return { label: "—", className: "text-muted-foreground" }
  }
  if (payment.bankReconciliationConflict) {
    return {
      label: "Conflict (multiple bank lines)",
      className: "text-amber-700 dark:text-amber-300 font-medium",
    }
  }
  const b = payment.bankVerificationStatus
  const src = payment.bankVerificationSource
  const by = payment.bankVerificationMatchedBy

  if (b === "BANK_VERIFIED") {
    const srcBit =
      src === "STATEMENT_API"
        ? "Statement"
        : src === "TXN_STATUS_API"
          ? "QR status"
          : src === "MANUAL"
            ? "Manual"
            : "Bank"
    const byBit = by ? ` · ${by}` : ""
    return {
      label: `Matched (${srcBit}${byBit})`,
      className: "text-emerald-700 dark:text-emerald-300 font-medium",
    }
  }
  if (b === "VERIFY_FAILED") {
    return {
      label: "Not matched in statement",
      className: "text-red-700 dark:text-red-300 font-medium",
    }
  }
  if (b === "NOT_REQUIRED") {
    return { label: "Not required", className: "text-muted-foreground text-xs" }
  }
  return {
    label: "Pending bank check",
    className: "text-amber-800 dark:text-amber-200 text-xs font-medium",
  }
}
