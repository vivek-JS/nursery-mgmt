import { NetworkManager, API } from "network/core";

let giftCatalogCache = null;
let giftCatalogPromise = null;

export function isLinkedGiftAgriOrder(order) {
  if (!order || order.isRamAgriProduct || order.ramAgriCropId) return false;
  if (order.productId) return true;
  const lines = Array.isArray(order.lineItems) ? order.lineItems : [];
  return lines.some((line) => line?.productId && !line?.isRamAgriProduct && !line?.ramAgriCropId);
}

export function linkedGiftOrderToDraft(order) {
  const line = order.lineItems?.[0] || order;
  return {
    localId: `linked-${order._id}`,
    linkedAgriOrderId: String(order._id || ""),
    productId: String(line.productId?._id || line.productId || ""),
    productName: line.productName || order.productName || "",
    quantity: String(line.quantity ?? order.quantity ?? ""),
    rate: String(line.rate ?? order.rate ?? ""),
    agriLoadStatus: order.agriLoadStatus || "",
    readOnly: true,
  };
}

export function emptyGiftDraftLine() {
  return {
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    linkedAgriOrderId: "",
    productId: "",
    productName: "",
    quantity: "",
    rate: "",
    readOnly: false,
  };
}

export async function fetchGiftProductsInStock({ force = false } = {}) {
  if (!force && giftCatalogCache) return giftCatalogCache;
  if (!force && giftCatalogPromise) return giftCatalogPromise;

  giftCatalogPromise = (async () => {
    const instance = NetworkManager(API.DISPATCHED.GET_GIFT_PRODUCTS_IN_STOCK);
    const response = await instance.request();
    const payload = response?.data?.data ?? response?.data ?? [];
    const list = Array.isArray(payload) ? payload : [];
    giftCatalogCache = list.filter((p) => Number(p.currentStock) > 0);
    return giftCatalogCache;
  })();

  try {
    return await giftCatalogPromise;
  } finally {
    giftCatalogPromise = null;
  }
}

export async function fetchLinkedGiftDraftsForOrder(nurseryOrderId) {
  if (!nurseryOrderId) return [];
  const instance = NetworkManager(API.INVENTORY.GET_LINKED_AGRI_BY_NURSERY_ORDER);
  const response = await instance.request({}, [String(nurseryOrderId)]);
  const rows = response?.data?.data ?? response?.data ?? [];
  const list = Array.isArray(rows) ? rows : [];
  return list.filter(isLinkedGiftAgriOrder).map(linkedGiftOrderToDraft);
}

export function buildGiftSyncLines(giftDraftsByOrder) {
  const lines = [];
  if (!giftDraftsByOrder || typeof giftDraftsByOrder.forEach !== "function") return lines;

  giftDraftsByOrder.forEach((rows, nurseryOrderId) => {
    (rows || []).forEach((row) => {
      if (row?.readOnly || row?.linkedAgriOrderId) return;
      const productId = String(row.productId || "").trim();
      const quantity = Number(row.quantity);
      if (!productId || !Number.isFinite(quantity) || quantity <= 0) return;
      lines.push({
        nurseryOrderId: String(nurseryOrderId),
        productId,
        quantity,
        rate: Number(row.rate) > 0 ? Number(row.rate) : undefined,
      });
    });
  });

  return lines;
}

export async function syncDispatchOrderGiftLines(giftDraftsByOrder) {
  const lines = buildGiftSyncLines(giftDraftsByOrder);
  if (!lines.length) return null;
  const instance = NetworkManager(API.DISPATCHED.SYNC_ORDER_GIFTS);
  return instance.request({ lines });
}

export function giftOptionLabel(product) {
  if (!product) return "";
  const stock = Number(product.currentStock) || 0;
  const unit = product.unitAbbreviation || product.primaryUnit?.abbreviation || "";
  const code = product.code ? `${product.code} · ` : "";
  return `${code}${product.name || "Gift"} (stock ${stock}${unit ? ` ${unit}` : ""})`;
}
