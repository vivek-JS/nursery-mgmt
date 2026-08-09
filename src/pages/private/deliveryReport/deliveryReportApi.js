import { API, NetworkManager } from "network/core"
import { toApiIstDateRange } from "utils/istCalendar"
import { isValidMongoId } from "./deliveryReportConstants"

export function buildDeliveryReportParams(filters, { page, limit } = {}) {
  const plantId = String(filters.plantId || "").trim()
  if (!isValidMongoId(plantId)) {
    throw new Error("Please select a valid plant.")
  }
  const { startDate, endDate } = toApiIstDateRange(filters.startDate, filters.endDate)
  const params = {
    plantId,
    startDate,
    endDate,
    cohorts: (filters.cohorts || []).join(","),
    status: (filters.statuses || []).join(","),
    includePastDueBeyondRange: filters.includePastDueBeyondRange ? "true" : "false",
  }
  const subtypeId = String(filters.subtypeId || "").trim()
  if (isValidMongoId(subtypeId)) params.subtypeId = subtypeId
  if (filters.advancePayment?.length) {
    params.advancePayment = filters.advancePayment.join(",")
  }
  if (page != null) params.page = String(page)
  if (limit != null) params.limit = String(limit)
  return params
}

export async function fetchDeliveryReportSummary(filters) {
  const instance = NetworkManager(API.ORDER.DELIVERY_REPORT_SUMMARY)
  const res = await instance.request({}, buildDeliveryReportParams(filters))
  if (!res?.success) throw new Error(res?.message || "Failed to load summary")
  return res.data?.data || res.data
}

export async function fetchDeliveryReportOrders(filters, page = 1, limit = 50) {
  const instance = NetworkManager(API.ORDER.DELIVERY_REPORT_ORDERS)
  const res = await instance.request(
    {},
    buildDeliveryReportParams(filters, { page, limit })
  )
  if (!res?.success) throw new Error(res?.message || "Failed to load orders")
  return res.data?.data || res.data
}

/** Fetch all pages for export (cap 10k rows). */
export async function fetchAllDeliveryReportOrders(filters, pageSize = 100) {
  const first = await fetchDeliveryReportOrders(filters, 1, pageSize)
  const total = first.total || 0
  let orders = [...(first.orders || [])]
  const maxPages = Math.min(Math.ceil(total / pageSize), 100)
  for (let p = 2; p <= maxPages; p += 1) {
    const data = await fetchDeliveryReportOrders(filters, p, pageSize)
    orders = orders.concat(data.orders || [])
    if (orders.length >= total) break
  }
  return { orders, total }
}
