import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";

/**
 * Resolve agri DC PDF URL from an order / row shape used in dashboard tables.
 */
export function getAgriDeliveryChallanUrl(orderOrRow) {
  return String(
    orderOrRow?.deliveryChallanPdfUrl ||
      orderOrRow?.details?.deliveryChallanPdfUrl ||
      ""
  ).trim();
}

/**
 * Open existing URL or POST regenerate/fetch challan PDF for agri order.
 * @returns {Promise<string|null>} PDF URL if opened/available
 */
export async function openOrGenerateAgriDeliveryChallan(orderId, options = {}) {
  const { force = false, open = true, existingUrl = "" } = options;
  const known = String(existingUrl || "").trim();
  if (known && !force) {
    if (open) window.open(known, "_blank", "noopener,noreferrer");
    return known;
  }
  if (!orderId) {
    Toast.error("Missing order id for delivery challan");
    return null;
  }

  try {
    const instance = NetworkManager(API.INVENTORY.GENERATE_AGRI_DELIVERY_CHALLAN_PDF);
    const res = await instance.request(force ? { force: true } : {}, [orderId]);
    const data = res?.data?.data || res?.data || {};
    const url = String(data.deliveryChallanPdfUrl || "").trim();
    if (!url) {
      Toast.error(data?.error || "Delivery challan not ready yet. Try again in a moment.");
      return null;
    }
    if (open) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return url;
  } catch (e) {
    console.error("Agri DC open/generate failed:", e);
    Toast.error(e?.response?.data?.message || e?.message || "Failed to open delivery challan");
    return null;
  }
}
