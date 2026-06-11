/**
 * Central ledger (FINAL_NURSERY_BE /api/v1/finance).
 */
import moment from "moment"
import { API, NetworkManager } from "network/core"

function unwrap(res) {
  const body = res?.data
  if (body?.status === "Success" || body?.success) return body.data
  return body?.data ?? body
}

export async function fetchCentralPartyStatement({
  partyType,
  partyId,
  accountCode,
  startDate,
  endDate,
  includeTransfers = true
}) {
  const params = { partyType, partyId: String(partyId) }
  if (includeTransfers) params.includeTransfers = "true"
  if (accountCode) params.accountCode = accountCode
  if (startDate && endDate) {
    params.startDate = moment(startDate).format("YYYY-MM-DD")
    params.endDate = moment(endDate).format("YYYY-MM-DD")
  }
  const instance = NetworkManager(API.FINANCE.PARTY_STATEMENT)
  const res = await instance.request({}, params)
  return unwrap(res)
}

export async function fetchCentralLedgerLines({
  partyType,
  partyId,
  accountCode,
  startDate,
  endDate,
  page = 1,
  limit = 50
}) {
  const params = { page, limit }
  if (partyType) params.partyType = partyType
  if (partyId) params.partyId = String(partyId)
  if (accountCode) params.accountCode = accountCode
  if (startDate && endDate) {
    params.startDate = moment(startDate).format("YYYY-MM-DD")
    params.endDate = moment(endDate).format("YYYY-MM-DD")
  }
  const instance = NetworkManager(API.FINANCE.LEDGER_LINES)
  const res = await instance.request({}, params)
  return unwrap(res)
}

export async function startCentralLedgerSync(body = {}) {
  const instance = NetworkManager(API.FINANCE.REPLAY_SUBLEDGERS)
  const res = await instance.request(body)
  return unwrap(res)
}

export async function fetchCentralLedgerSyncStatus() {
  const instance = NetworkManager(API.FINANCE.REPLAY_SUBLEDGERS_STATUS)
  const res = await instance.request()
  return unwrap(res)
}
