import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import {
  parseGeneratePdfsResponse,
  openDispatchPdfUrl,
  preparePdfTab,
  closePdfTab,
} from "utils/dispatchPdfHelpers";
import { canShowInvoice } from "./dispatchVehiclesUtils";
import { buildInvoiceNumberOverrides } from "./invoiceNumberUtils";

const MOCK_PDF_HOST = /mock-reports\.example\.com/i;

function orderHasDcNumber(order) {
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

function getOrderDcPdfUrl(order) {
  return String(order?.deliveryChallanPdfUrl || order?.details?.deliveryChallanPdfUrl || "").trim();
}

async function fetchOrdersForDispatch(dispatch) {
  let list = Array.isArray(dispatch?.orderIds) ? dispatch.orderIds : [];
  const orderIds = list.map((o) => o?._id).filter(Boolean);
  if (!orderIds.length) return list;
  try {
    const instance = NetworkManager(API.ORDER.GET_ORDERS);
    const response = await instance.request({}, { orderIds: orderIds.join(","), limit: 1000 });
    const raw = response?.data;
    let fetched = null;
    if (raw?.data?.data && Array.isArray(raw.data.data)) fetched = raw.data.data;
    else if (raw?.data && Array.isArray(raw.data)) fetched = raw.data;
    else if (Array.isArray(raw)) fetched = raw;
    if (fetched?.length) return fetched;
  } catch {
    /* keep existing */
  }
  return list;
}

function mergeOrderDcNumbers(orders, orderDcNumbers = []) {
  if (!Array.isArray(orders) || !Array.isArray(orderDcNumbers) || !orderDcNumbers.length) {
    return orders;
  }
  const byId = new Map(orderDcNumbers.map((o) => [String(o?._id ?? ""), o]));
  return orders.map((item) => {
    const fresh = byId.get(String(item?._id ?? ""));
    if (!fresh) return item;
    const official = String(fresh.officialDeliveryChallanNumber || "").trim();
    const manual = String(fresh.deliveryChallanInvoiceNumber || "").trim();
    const officialNb = String(fresh.officialNonBillableDeliveryChallanNumber || "").trim();
    return {
      ...item,
      ...(official ? { officialDeliveryChallanNumber: official } : {}),
      ...(officialNb ? { officialNonBillableDeliveryChallanNumber: officialNb } : {}),
      ...(manual ? { deliveryChallanInvoiceNumber: manual } : {}),
      details: {
        ...(item.details || {}),
        ...(official ? { officialDeliveryChallanNumber: official } : {}),
        ...(officialNb ? { officialNonBillableDeliveryChallanNumber: officialNb } : {}),
        ...(manual ? { deliveryChallanInvoiceNumber: manual } : {}),
      },
    };
  });
}

export async function ensureDispatchDcNumbers(dispatch) {
  const dispatchId = String(dispatch?._id || "").trim();
  if (!dispatchId) return dispatch;
  try {
    const inst = NetworkManager(API.DISPATCHED.ENSURE_DC_NUMBERS);
    const res = await inst.request({}, [dispatchId]);
    const payload = res?.data?.data ?? res?.data;
    const orderDcNumbers = Array.isArray(payload?.orderDcNumbers) ? payload.orderDcNumbers : [];
    const orderIds = mergeOrderDcNumbers(dispatch.orderIds || [], orderDcNumbers);
    return { ...dispatch, orderIds };
  } catch {
    return dispatch;
  }
}

/**
 * Same as DispatchAccordion Delivery Challan:
 * generate missing per-order DC PDFs only, then open browser DC preview.
 */
export async function runDeliveryChallanFlow(dispatch, { onOpenDcPreview, agriLoadBlocked } = {}) {
  if (agriLoadBlocked) {
    Toast.error("Agri Input pending load — delivery challan is blocked until loaded");
    return;
  }

  try {
    let list = await fetchOrdersForDispatch(dispatch);
    const dispatchWithDc = await ensureDispatchDcNumbers({
      ...dispatch,
      orderIds: list.length > 0 ? list : dispatch.orderIds || [],
    });
    list = Array.isArray(dispatchWithDc.orderIds) ? dispatchWithDc.orderIds : list;
    const missing = (list || []).filter((o) => orderHasDcNumber(o) && !getOrderDcPdfUrl(o));
    let generated = 0;
    let failed = 0;
    const pdfUpdates = new Map();

    for (const order of missing) {
      const orderId = String(order?._id || "");
      if (!orderId) continue;
      try {
        const inst = NetworkManager(API.ORDER.GENERATE_DELIVERY_CHALLAN_PDF);
        const res = await inst.request({}, [orderId]);
        const data = res?.data?.data || res?.data;
        if (String(data?.deliveryChallanPdfUrl || "").trim()) {
          generated += 1;
          pdfUpdates.set(orderId, data);
        }
      } catch {
        failed += 1;
      }
    }

    if (pdfUpdates.size) {
      list = (list || []).map((item) => {
        const data = pdfUpdates.get(String(item?._id || ""));
        if (!data) return item;
        return {
          ...item,
          deliveryChallanPdfUrl: data.deliveryChallanPdfUrl,
          deliveryChallanPdfGeneratedAt: data.deliveryChallanPdfGeneratedAt,
          deliveryChallanPdfHistory: data.deliveryChallanPdfHistory,
        };
      });
    }

    if (generated > 0) {
      Toast.success(
        failed > 0
          ? `Generated DC PDF for ${generated} order(s); ${failed} failed`
          : `Generated DC PDF for ${generated} order(s)`
      );
    } else if (missing.length > 0 && failed > 0) {
      Toast.error("Could not generate DC PDFs for orders on this dispatch");
    }

    await onOpenDcPreview?.({
      ...dispatch,
      orderIds: list.length > 0 ? list : dispatch.orderIds || [],
    });
  } catch (error) {
    Toast.error(
      error?.response?.data?.message || error?.message || "Failed to prepare delivery challan"
    );
    await onOpenDcPreview?.({
      ...dispatch,
      orderIds: dispatch.orderIds || [],
    });
  }
}

/**
 * Invoice PDF flow.
 * - First generate: allocate invoice sequences server-side.
 * - Duplicate (force): prompt editable prefilled invoice numbers, then regenerate PDF.
 */
export async function runInvoiceFlow(
  dispatch,
  {
    force = false,
    promptInvoiceAadhar,
    promptDuplicateInvoice,
    onPatchPdfFields,
    onOpenInvoicePreview,
    onRefresh,
  } = {}
) {
  if (!canShowInvoice(dispatch)) {
    Toast.error("Complete the order form first to generate the invoice");
    return;
  }

  const existing = String(dispatch?.completeInvoicePdfUrl || "").trim();
  if (existing && !force) {
    if (MOCK_PDF_HOST.test(existing)) {
      Toast.error(
        "Invoice PDF is a mock URL (S3/Spaces not configured). Opening browser preview."
      );
      const { confirmed, aadharByOrderId } = await promptInvoiceAadhar(dispatch);
      if (!confirmed) return;
      await onOpenInvoicePreview?.(dispatch, aadharByOrderId);
      return;
    }
    const ok = openDispatchPdfUrl(existing);
    if (!ok) Toast.error("Could not open invoice PDF");
    return;
  }

  let invoiceNumberOverrides = undefined;
  if (force) {
    let merged = dispatch;
    try {
      const list = await fetchOrdersForDispatch(dispatch);
      if (list?.length) merged = { ...dispatch, orderIds: list };
    } catch {
      /* keep */
    }
    if (typeof promptDuplicateInvoice === "function") {
      const { confirmed, rows } = await promptDuplicateInvoice(merged);
      if (!confirmed) return;
      invoiceNumberOverrides = buildInvoiceNumberOverrides(rows);
    } else {
      const ok = window.confirm(
        "Duplicate invoice PDF? Numbers stay the same unless you edit them later. Previous PDF will be kept in history."
      );
      if (!ok) return;
    }
  }

  const { confirmed, aadharByOrderId } = await promptInvoiceAadhar(dispatch);
  if (!confirmed) return;

  const preparedTab = preparePdfTab();
  try {
    const inst = NetworkManager(API.DISPATCHED.GENERATE_PDFS);
    const body = {
      types: ["complete_invoice"],
      invoiceAadhars: aadharByOrderId || {},
      force: Boolean(force),
    };
    if (invoiceNumberOverrides && Object.keys(invoiceNumberOverrides).length) {
      body.invoiceNumberOverrides = invoiceNumberOverrides;
    }
    const res = await inst.request(body, [String(dispatch._id)]);
    const data = parseGeneratePdfsResponse(res);
    const url = String(data?.completeInvoicePdfUrl || "").trim();
    if (data && typeof data === "object") {
      onPatchPdfFields?.(String(dispatch._id), {
        completeInvoicePdfUrl: data.completeInvoicePdfUrl || "",
        completeInvoicePdfGeneratedAt: data.completeInvoicePdfGeneratedAt ?? null,
        completeInvoicePdfHistory: data.completeInvoicePdfHistory,
      });
    }
    if (url && MOCK_PDF_HOST.test(url)) {
      closePdfTab(preparedTab);
      Toast.error(
        "Invoice saved with a mock URL (S3/Spaces not configured). Opening browser preview."
      );
      await onOpenInvoicePreview?.(dispatch, aadharByOrderId);
    } else if (url && openDispatchPdfUrl(url, preparedTab)) {
      Toast.success(force ? "Invoice PDF duplicated" : "Invoice PDF opened");
    } else {
      closePdfTab(preparedTab);
      Toast.success(force ? "Invoice PDF duplicated" : "Invoice PDF generated");
    }
    void onRefresh?.();
  } catch (error) {
    closePdfTab(preparedTab);
    Toast.error(
      error?.response?.data?.message || error?.message || "Failed to generate invoice PDF"
    );
  }
}
