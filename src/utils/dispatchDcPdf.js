import { NetworkManager, API } from "network/core";

/**
 * Generate (or open existing) per-order delivery challan PDF.
 * Backend also triggers one-time farmer dispatch WhatsApp when applicable.
 */
export async function generateOrderDeliveryChallanPdfClient(orderId, { force = false } = {}) {
  const id = String(orderId || "").trim();
  if (!id) throw new Error("Order id missing");
  const inst = NetworkManager(API.ORDER.GENERATE_DELIVERY_CHALLAN_PDF);
  const res = await inst.request(force ? { force: true } : {}, [id]);
  const body = res?.data;
  if (body?.status && body.status !== "Success") {
    throw new Error(body?.message || "Failed to generate DC PDF");
  }
  return body?.data || body;
}

export function orderHasDcNumber(order) {
  return Boolean(
    String(
      order?.officialDeliveryChallanNumber ??
        order?.details?.officialDeliveryChallanNumber ??
        order?.deliveryChallanInvoiceNumber ??
        order?.details?.deliveryChallanInvoiceNumber ??
        ""
    ).trim()
  );
}

export function orderDcPdfUrl(order) {
  return String(
    order?.deliveryChallanPdfUrl ?? order?.details?.deliveryChallanPdfUrl ?? ""
  ).trim();
}

export async function saveOrderDcNumber(orderId, deliveryChallanInvoiceNumber) {
  const id = String(orderId || "").trim();
  if (!id) throw new Error("Order id missing");
  const nextValue = String(deliveryChallanInvoiceNumber ?? "").trim();
  const instance = NetworkManager(API.ORDER.UPDATE_ORDER);
  const response = await instance.request({
    id,
    deliveryChallanInvoiceNumber: nextValue === "" ? null : nextValue,
  });
  if (response?.data?.status !== "Success") {
    throw new Error(response?.data?.message || "Could not update DC number");
  }
  const rejected = Array.isArray(response?.data?.rejectedFields)
    ? response.data.rejectedFields
    : [];
  const dcRejected = rejected.find((r) => r?.field === "deliveryChallanInvoiceNumber");
  if (dcRejected) {
    throw new Error(dcRejected.detail || dcRejected.reason || "DC label was not saved");
  }
  return nextValue === "" ? null : nextValue;
}

export function dcPdfSuccessMessage(data) {
  const wa = data?.whatsappDispatch;
  if (wa?.sent) return "DC PDF ready · Farmer WhatsApp sent";
  if (wa?.alreadySent) return "DC PDF ready · WhatsApp already sent";
  if (wa?.skipped && wa?.reason === "no_dispatch_recorded") {
    return "DC PDF ready · WhatsApp skipped (no dispatch on order)";
  }
  return "DC PDF generated";
}
