import { API, NetworkManager } from "network/core";

function unwrap(res) {
  const body = res?.data;
  if (!body) return null;
  if (body.data !== undefined) return body.data;
  return body;
}

export async function fetchEligibleSuppliersForReturn(params = {}) {
  const instance = NetworkManager(API.INVENTORY.LIST_ELIGIBLE_SUPPLIERS_FOR_PURCHASE_RETURN);
  const res = await instance.request({}, params);
  const data = unwrap(res);
  return Array.isArray(data) ? data : data?.data || [];
}

export async function fetchEligiblePurchaseOrdersForReturn(params = {}) {
  const instance = NetworkManager(API.INVENTORY.LIST_ELIGIBLE_POS_FOR_PURCHASE_RETURN);
  const res = await instance.request({}, params);
  const data = unwrap(res);
  return Array.isArray(data) ? data : data?.data || [];
}

export async function fetchPurchaseReturnableBatches({ supplierId, purchaseOrderId } = {}) {
  const instance = NetworkManager(API.INVENTORY.GET_PURCHASE_RETURNABLE_BATCHES);
  const query = {};
  if (supplierId) query.supplierId = supplierId;
  if (purchaseOrderId) query.purchaseOrderId = purchaseOrderId;
  const res = await instance.request({}, query);
  return unwrap(res) || { supplier: null, purchaseOrder: null, batches: [] };
}

export async function createPurchaseReturn(payload) {
  const instance = NetworkManager(API.INVENTORY.CREATE_PURCHASE_RETURN);
  const res = await instance.request(payload);
  return unwrap(res);
}

export async function listPurchaseReturns(params = {}) {
  const instance = NetworkManager(API.INVENTORY.LIST_PURCHASE_RETURNS);
  const res = await instance.request({}, params);
  const data = unwrap(res);
  if (Array.isArray(data)) return { data, pagination: { total: data.length } };
  return {
    data: data?.data || [],
    pagination: data?.pagination || { total: 0 },
  };
}

export async function downloadPurchaseReturnInvoice(id) {
  const { downloadReturnInvoicePdf } = await import("../returnInvoiceDownload");
  return downloadReturnInvoicePdf(
    API.INVENTORY.DOWNLOAD_PURCHASE_RETURN_INVOICE,
    id,
    `purchase-return-${id}.pdf`
  );
}
