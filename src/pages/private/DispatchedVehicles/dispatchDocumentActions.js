import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import {
  parseGeneratePdfsResponse,
  openDispatchPdfUrl,
  preparePdfTab,
  closePdfTab,
} from "utils/dispatchPdfHelpers";
import { canShowInvoice } from "./dispatchVehiclesUtils";

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
 * Same as DispatchAccordion Invoice:
 * blocked until DELIVERED; reuse server URL; generate once; regenerate only with force.
 */
export async function runInvoiceFlow(
  dispatch,
  {
    force = false,
    promptInvoiceAadhar,
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

  if (force) {
    const ok = window.confirm(
      "Regenerate invoice PDF? Previous PDF will be kept in history."
    );
    if (!ok) return;
  }

  const { confirmed, aadharByOrderId } = await promptInvoiceAadhar(dispatch);
  if (!confirmed) return;

  const preparedTab = preparePdfTab();
  try {
    const inst = NetworkManager(API.DISPATCHED.GENERATE_PDFS);
    const res = await inst.request(
      {
        types: ["complete_invoice"],
        invoiceAadhars: aadharByOrderId || {},
        force: Boolean(force),
      },
      [String(dispatch._id)]
    );
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
      Toast.success(force ? "Invoice PDF regenerated" : "Invoice PDF opened");
    } else {
      closePdfTab(preparedTab);
      Toast.success(force ? "Invoice PDF regenerated" : "Invoice PDF generated");
    }
    void onRefresh?.();
  } catch (error) {
    closePdfTab(preparedTab);
    Toast.error(
      error?.response?.data?.message || error?.message || "Failed to generate invoice PDF"
    );
  }
}
