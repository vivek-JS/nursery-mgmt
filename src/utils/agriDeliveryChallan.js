import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";

/** Reject mock/unreachable hosts that were saved when Spaces wasn't configured. */
export function isUsableAgriDeliveryChallanUrl(url) {
  const u = String(url || "").trim();
  if (!u) return false;
  if (!/^https?:\/\//i.test(u)) return false;
  if (/mock-reports\.example\.com|example\.com|YOUR_DOMAIN|localhost|127\.0\.0\.1/i.test(u)) {
    return false;
  }
  return true;
}

/**
 * Resolve agri DC PDF URL from an order / row shape used in dashboard tables.
 */
export function getAgriDeliveryChallanUrl(orderOrRow) {
  const raw = String(
    orderOrRow?.deliveryChallanPdfUrl ||
      orderOrRow?.details?.deliveryChallanPdfUrl ||
      ""
  ).trim();
  return isUsableAgriDeliveryChallanUrl(raw) ? raw : "";
}

/**
 * Open existing URL or POST regenerate/fetch challan PDF for agri order.
 * Back-dated rows with mock example.com URLs force regenerate + save.
 * @returns {Promise<string|null>} PDF URL if opened/available
 */
export async function openOrGenerateAgriDeliveryChallan(orderId, options = {}) {
  const { force = false, open = true, existingUrl = "" } = options;
  const known = String(existingUrl || "").trim();
  const knownOk = isUsableAgriDeliveryChallanUrl(known);
  if (knownOk && !force) {
    if (open) window.open(known, "_blank", "noopener,noreferrer");
    return known;
  }
  if (!orderId) {
    Toast.error("Missing order id for delivery challan");
    return null;
  }

  try {
    const instance = NetworkManager(API.INVENTORY.GENERATE_AGRI_DELIVERY_CHALLAN_PDF);
    // Always force when stored URL was unusable (back-dated mock example.com)
    const body = force || !knownOk ? { force: true } : {};
    const res = await instance.request(body, [orderId]);
    const data = res?.data?.data || res?.data || {};
    const url = String(data.deliveryChallanPdfUrl || "").trim();
    if (!isUsableAgriDeliveryChallanUrl(url)) {
      Toast.error(
        data?.error ||
          "Delivery challan could not be saved to a reachable URL. Check server file storage."
      );
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
