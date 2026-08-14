import {
  partitionOrderLinesByBillable,
  resolveTaxInvoiceLabel,
} from "shared/dispatch-documents"

export function getOrderIdKey(order) {
  return String(order?._id ?? order?.details?.orderid ?? "").trim()
}

/** Prefill billable / non-billable invoice numbers for duplicate dialog. */
export function getOrderInvoiceNumberPrefills(order) {
  const { billable: billableLines, nonBillable: nonBillableLines } =
    partitionOrderLinesByBillable(order)
  const hasBillable = billableLines.length > 0
  const hasNonBillable = nonBillableLines.length > 0
  // Legacy single-line orders: treat as billable only
  const showBillable = hasBillable || (!hasBillable && !hasNonBillable)
  const showNonBillable = hasNonBillable

  const billable = showBillable ? resolveTaxInvoiceLabel(order, { billable: true }) : ""
  const nonBillable = showNonBillable
    ? resolveTaxInvoiceLabel(order, { billable: false })
    : ""

  return {
    orderId: getOrderIdKey(order),
    orderLabel:
      order?.order != null
        ? String(order.order)
        : order?.orderId != null
          ? String(order.orderId)
          : order?.details?.orderid != null
            ? String(order.details.orderid)
            : getOrderIdKey(order).slice(-6),
    farmerName:
      order?.farmer?.name ||
      order?.farmerName ||
      order?.details?.farmer?.name ||
      "—",
    showBillable,
    showNonBillable,
    billable,
    nonBillable,
  }
}

export function listInvoiceNumberRows(dispatch) {
  const orders = Array.isArray(dispatch?.orderIds) ? dispatch.orderIds : []
  return orders
    .filter((o) => o && typeof o === "object")
    .map(getOrderInvoiceNumberPrefills)
    .filter((r) => r.orderId)
}

/**
 * Build API body.invoiceNumberOverrides from dialog drafts.
 * @param {Array<{orderId:string,showBillable:boolean,showNonBillable:boolean,billable:string,nonBillable:string}>} rows
 */
export function buildInvoiceNumberOverrides(rows) {
  const out = {}
  for (const row of rows || []) {
    const id = String(row.orderId || "").trim()
    if (!id) continue
    const entry = {}
    if (row.showBillable && String(row.billable || "").trim()) {
      entry.billable = String(row.billable).trim()
    }
    if (row.showNonBillable && String(row.nonBillable || "").trim()) {
      entry.nonBillable = String(row.nonBillable).trim()
    }
    if (entry.billable || entry.nonBillable) out[id] = entry
  }
  return out
}
