import { API, NetworkManager } from "network/core"

function unwrapData(response) {
  const body = response?.data
  if (body?.data !== undefined) return body.data
  return body
}

export async function fetchCommissionRates() {
  const res = await NetworkManager(API.COMMISSION.GET_RATES).request()
  const data = unwrapData(res)
  return Array.isArray(data) ? data : []
}

export async function patchCommissionRate(id, payload) {
  const res = await NetworkManager(API.COMMISSION.PATCH_RATE).request(payload, [id])
  return unwrapData(res)
}

export async function syncCommissionRatesFromPlants() {
  const res = await NetworkManager(API.COMMISSION.SYNC_RATES).request({})
  return unwrapData(res)
}

export async function bulkDefaultCommissionRates() {
  const res = await NetworkManager(API.COMMISSION.BULK_DEFAULT).request({})
  return unwrapData(res)
}

export async function fetchDealerCommissionAnalysis(dealerId, { startDate, endDate } = {}) {
  const params = {}
  if (startDate) params.startDate = startDate
  if (endDate) params.endDate = endDate
  const res = await NetworkManager(API.COMMISSION.GET_DEALER_ANALYSIS).request({}, [dealerId], {
    params,
  })
  return unwrapData(res)
}

export async function fetchDealerCommissionSettlements(dealerId) {
  const res = await NetworkManager(API.COMMISSION.GET_SETTLEMENTS).request({}, [dealerId])
  const data = unwrapData(res)
  return Array.isArray(data) ? data : []
}

export async function settleDealerCommission(dealerId, body) {
  const res = await NetworkManager(API.COMMISSION.SETTLE).request(body, [dealerId])
  return unwrapData(res)
}

export function formatInr(value) {
  const n = Number(value || 0)
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
}
