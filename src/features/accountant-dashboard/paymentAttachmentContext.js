import { resolveOrderCustomerCell } from "./orderCustomerDisplay"
import { resolvePaymentMediaUrl } from "components/Modals/AttachmentViewerModal"

function orderAttachmentUrlsFromPayment(p) {
  const r = Array.isArray(p.payment?.receiptPhoto) ? p.payment.receiptPhoto : []
  const s = Array.isArray(p.screenshots) ? p.screenshots : []
  return [...r, ...s].filter(Boolean).map(resolvePaymentMediaUrl)
}

export function buildOrderAttachmentContext(p) {
  const customer = resolveOrderCustomerCell({ orderFor: p.orderFor, farmer: p.farmer })
  const urls = orderAttachmentUrlsFromPayment(p)
  return {
    key: `order-${p.id}-${p.payment?._id || ""}`,
    kind: "order",
    title: `Order #${p.orderId}`,
    subtitle: customer.primaryName,
    refLabel: `#${p.orderId}`,
    customerName: customer.primaryName,
    customerSub: customer.locationLine || undefined,
    bookingFarmerName: customer.secondaryLine ? customer.bookingFarmer?.name : undefined,
    salesPersonName: p.salesPerson?.name || "—",
    salesPersonPhone: p.salesPerson?.phoneNumber ? String(p.salesPerson.phoneNumber) : undefined,
    plantDetail: p.plantType?.name || "—",
    plantSub: `${(p.numberOfPlants || 0).toLocaleString("en-IN")} × ₹${p.rate}`,
    paidAmount: p.payment?.paidAmount,
    totalAmount: p.totalOrderAmount,
    paymentMode: p.payment?.modeOfPayment,
    paymentDate: p.payment?.paymentDate || p.createdAt,
    status: p.orderPaymentStatus,
    remark: p.payment?.remark,
    urls
  }
}

export function buildBulkAttachmentContext(b) {
  const a = Array.isArray(b.allocations) && b.allocations[0]
  const urls = (Array.isArray(b.receiptPhoto) ? b.receiptPhoto : []).filter(Boolean).map(resolvePaymentMediaUrl)
  return {
    key: `bulk-${b._id}`,
    kind: "bulk",
    title: `Bulk payment ${String(b._id).slice(-8).toUpperCase()}`,
    subtitle: a?.customerName,
    refLabel: String(b._id).slice(-6).toUpperCase(),
    customerName: a?.customerName || "—",
    customerSub: a?.village,
    salesPersonName: b.createdBy?.name,
    plantDetail: `${b.allocations?.length || 0} order allocation(s)`,
    paidAmount: b.paymentStatus === "ACCEPTED" ? b.totalAmount : undefined,
    totalAmount: b.totalAmount,
    paymentMode: b.modeOfPayment,
    paymentDate: b.paymentDate,
    status: b.paymentStatus === "ACCEPTED" ? "ACCEPTED" : b.paymentStatus,
    remark: b.remark,
    urls
  }
}
