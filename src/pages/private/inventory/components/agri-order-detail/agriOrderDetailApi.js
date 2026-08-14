import { API, NetworkManager } from "network/core";

export async function fetchAgriOrderDetail(orderId) {
  const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_ORDER_BY_ID);
  const res = await instance.request({}, [orderId]);
  return res?.data?.data || res?.data;
}

export async function fetchAgriOrderBatchSummary(orderId) {
  const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_ORDER_BATCH_SUMMARY);
  const res = await instance.request({}, [orderId]);
  return res?.data?.data || res?.data;
}

export async function fetchAgriReturnRequests(orderId) {
  const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_RETURN_REQUESTS_BY_ORDER);
  const res = await instance.request({}, [orderId]);
  return res?.data?.data || res?.data || [];
}

export async function listPendingAgriReturnRequests() {
  const instance = NetworkManager(API.INVENTORY.LIST_AGRI_SALES_RETURN_REQUESTS);
  const res = await instance.request({}, { status: "PENDING", limit: 100 });
  return res?.data?.data?.data || res?.data?.data || [];
}

/** Agri sell returns history (filters: status, search, dateFrom, dateTo, source, page, limit). */
export async function listAgriSellReturns(params = {}) {
  const instance = NetworkManager(API.INVENTORY.LIST_AGRI_SALES_RETURN_REQUESTS);
  const query = {
    status: params.status || "ALL",
    page: params.page || 1,
    limit: params.limit || 25,
  };
  if (params.search) query.search = params.search;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  if (params.source && params.source !== "ALL") query.source = params.source;
  const res = await instance.request({}, query);
  const body = res?.data?.data || res?.data || {};
  return {
    data: Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [],
    pagination: body?.pagination || { total: 0, page: 1, limit: 25, pages: 1 },
  };
}

export async function approveAgriReturnRequest(id, reviewNotes = "") {
  const instance = NetworkManager(API.INVENTORY.APPROVE_AGRI_SALES_RETURN_REQUEST);
  return instance.request({ reviewNotes }, [id]);
}

export async function rejectAgriReturnRequest(id, reviewNotes = "") {
  const instance = NetworkManager(API.INVENTORY.REJECT_AGRI_SALES_RETURN_REQUEST);
  return instance.request({ reviewNotes }, [id]);
}

/** Same payload as FarmerOrdersTable complete modal — completes order with optional return. */
export async function completeAgriSalesOrderWithReturn({
  orderId,
  returnQuantity = 0,
  returnReason = "",
  returnNotes = "",
}) {
  const instance = NetworkManager(API.INVENTORY.COMPLETE_AGRI_SALES_ORDERS);
  const id = String(orderId);
  const res = await instance.request({
    orderIds: [id],
    returnQuantities: { [id]: Number(returnQuantity) || 0 },
    returnReason: returnReason || "",
    returnNotes: returnNotes || "",
  });
  return res?.data?.data || res?.data;
}

export async function fetchMerchantsSimple() {
  const instance = NetworkManager(API.INVENTORY.GET_ALL_MERCHANTS_SIMPLE);
  const res = await instance.request();
  const list = res?.data?.data || res?.data || [];
  return Array.isArray(list) ? list : [];
}

export async function fetchMerchantReturnableBatches(merchantId) {
  const instance = NetworkManager(API.INVENTORY.GET_AGRI_MERCHANT_RETURNABLE_BATCHES);
  const res = await instance.request({}, { merchantId });
  return res?.data?.data || res?.data;
}

export async function processMerchantBatchSaleReturn({
  merchantId,
  batchReturns,
  returnReason = "",
  returnNotes = "",
}) {
  const instance = NetworkManager(API.INVENTORY.PROCESS_AGRI_MERCHANT_BATCH_RETURN);
  const res = await instance.request({
    merchantId,
    batchReturns,
    returnReason,
    returnNotes,
  });
  return res?.data?.data || res?.data;
}

export async function downloadSaleReturnInvoice(id) {
  const { downloadReturnInvoicePdf } = await import("../returnInvoiceDownload");
  return downloadReturnInvoicePdf(
    API.INVENTORY.DOWNLOAD_AGRI_SALES_RETURN_INVOICE,
    id,
    `sale-return-${id}.pdf`
  );
}
