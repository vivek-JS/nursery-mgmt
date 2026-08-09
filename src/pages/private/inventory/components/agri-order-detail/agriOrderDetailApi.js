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

export async function approveAgriReturnRequest(id, reviewNotes = "") {
  const instance = NetworkManager(API.INVENTORY.APPROVE_AGRI_SALES_RETURN_REQUEST);
  return instance.request({ reviewNotes }, [id]);
}

export async function rejectAgriReturnRequest(id, reviewNotes = "") {
  const instance = NetworkManager(API.INVENTORY.REJECT_AGRI_SALES_RETURN_REQUEST);
  return instance.request({ reviewNotes }, [id]);
}
