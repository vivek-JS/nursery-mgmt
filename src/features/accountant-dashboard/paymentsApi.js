/**
 * Shared fetch helpers for accountant dashboard (same endpoints as /u/payments).
 */
import moment from "moment"
import { API, NetworkManager } from "network/core"
import { normalizeAgriPayment, normalizeFarmerPayment, mapFarmerPlantLedgerApiToPanel } from "./normalize"

/** Mongo id string for ?farmer= — never pass a plain object (would become "[object Object]"). */
export function normalizeFarmerIdForLedger(farmerId) {
  if (farmerId == null || farmerId === "") return undefined
  if (typeof farmerId === "object") {
    const id = farmerId._id ?? farmerId.id
    return id != null && id !== "" ? String(id) : undefined
  }
  const s = String(farmerId).trim()
  if (!s || s === "[object Object]") return undefined
  return s
}

export async function fetchFarmerOrderPayments({
  debouncedSearchTerm,
  page,
  rowsPerPage,
  startDate,
  endDate,
  /** When true, omit paymentStatus filter to load all statuses */
  allStatuses,
  paymentStatus
}) {
  const params = {
    search: debouncedSearchTerm,
    page,
    limit: rowsPerPage
  }
  if (!allStatuses && paymentStatus) {
    params.paymentStatus = paymentStatus
  }
  if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    params.startDate = moment(startDate).format("DD-MM-YYYY")
    params.endDate = moment(endDate).format("DD-MM-YYYY")
  }
  const instance = NetworkManager(API.ORDER.GET_PAYMENTS)
  const response = await instance.request({}, params)
  const list = Array.isArray(response?.data?.data) ? response.data.data : []
  return {
    rows: list.map((r) => normalizeFarmerPayment(r)),
    pagination: response?.data?.pagination || null
  }
}

export async function fetchAgriOrderPayments({
  debouncedSearchTerm,
  page,
  rowsPerPage,
  startDate,
  endDate,
  /** Pass empty string for all payment statuses (backend treats falsy as no filter) */
  paymentStatusFilter
}) {
  const params = {
    search: debouncedSearchTerm || "",
    page,
    limit: rowsPerPage
  }
  if (paymentStatusFilter !== undefined) {
    params.paymentStatus = paymentStatusFilter
  }
  if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    params.startDate = moment(startDate).format("DD-MM-YYYY")
    params.endDate = moment(endDate).format("DD-MM-YYYY")
  }
  const instance = NetworkManager(API.INVENTORY.GET_AGRI_SALES_PENDING_PAYMENTS)
  const response = await instance.request({}, params)
  const responseData = response?.data?.data
  const paymentsData = responseData?.data || response?.data?.data || []
  const list = Array.isArray(paymentsData) ? paymentsData : []
  return {
    rows: list.map((r) => normalizeAgriPayment(r)),
    pagination: responseData?.pagination || null
  }
}

export async function fetchBulkPaymentsList({ bulkPage, rowsPerPage, bulkStatusFilter, startDate, endDate, debouncedSearchTerm }) {
  const params = { page: bulkPage, limit: rowsPerPage }
  if (bulkStatusFilter) params.paymentStatus = bulkStatusFilter
  if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    params.startDate = moment(startDate).format("YYYY-MM-DD")
    params.endDate = moment(endDate).format("YYYY-MM-DD")
  }
  if (debouncedSearchTerm) params.search = debouncedSearchTerm
  const instance = NetworkManager(API.ORDER.GET_BULK_PAYMENTS)
  const response = await instance.request({}, params)
  const data = response?.data?.data
  const rows = data?.data && Array.isArray(data.data) ? data.data : []
  const total = data?.total ?? rows.length
  return { rows, total }
}

/**
 * Farmer plant nursery ledger (FINAL_NURSERY_BE GET /order/farmer-plant-ledger).
 * Pass farmerId (Mongo _id) and/or customerMobile (10 digits). At least one required.
 */
export async function fetchFarmerPlantLedger({
  farmerId,
  customerMobile,
  startDate,
  endDate
}) {
  /** No linesOnly query param — backend includes ledger lines by default (avoids whitelist issues on older API builds). */
  const params = {}
  const farmer = normalizeFarmerIdForLedger(farmerId)
  if (farmer) params.farmer = farmer
  if (customerMobile) {
    const m = String(customerMobile).replace(/\D/g, "")
    if (m.length >= 10) params.customerMobile = m.slice(-10)
    else if (m.length) params.customerMobile = m
  }
  if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
    params.startDate = moment(startDate).format("YYYY-MM-DD")
    params.endDate = moment(endDate).format("YYYY-MM-DD")
  }
  const instance = NetworkManager(API.ORDER.GET_FARMER_PLANT_LEDGER)
  const response = await instance.request({}, params)
  const body = response?.data
  const payload = body?.data !== undefined ? body.data : body
  return mapFarmerPlantLedgerApiToPanel(payload)
}
