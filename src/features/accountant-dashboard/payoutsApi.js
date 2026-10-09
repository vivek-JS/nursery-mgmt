import { API, NetworkManager } from "network/core"
import { isApiErrorResponse } from "network/core/responseParser"

/**
 * NetworkManager resolves with an APIError instead of throwing; turn that into
 * a thrown Error carrying the server's field errors (`fields`).
 */
async function call(router, body = {}, params = {}, { silent = true } = {}) {
  const res = await NetworkManager(router).request(body, params, { silent })
  if (isApiErrorResponse(res)) {
    const err = new Error(res.message || "Request failed")
    err.fields = res.colError || {}
    throw err
  }
  return res?.data ?? {}
}

const byId = (id) => ({ pathParams: [String(id)] })

export async function fetchPayoutConfig() {
  return (await call(API.BANKING.GET_PAYOUT_CONFIG, {}, {}, { silent: false })).data
}

export async function fetchPayoutSummary() {
  return (await call(API.BANKING.GET_PAYOUT_SUMMARY)).data
}

export async function fetchPayouts({ view = "approval", search = "", batchId = "", limit = 50, skip = 0 } = {}) {
  const params = { view, limit, skip }
  if (search) params.search = search
  if (batchId) params.batchId = batchId
  const body = await call(API.BANKING.GET_PAYOUTS, {}, params, { silent: false })
  return { items: body.data || [], total: body.total || 0, hasMore: Boolean(body.hasMore) }
}

export async function fetchPayout(id) {
  return (await call(API.BANKING.GET_PAYOUT, {}, byId(id))).data
}

export async function createPayout(input) {
  return (await call(API.BANKING.POST_PAYOUT, input)).data
}

export async function approvePayout(id, note) {
  return (await call(API.BANKING.POST_APPROVE_PAYOUT, { note }, byId(id))).data
}

export async function rejectPayout(id, reason) {
  return (await call(API.BANKING.POST_REJECT_PAYOUT, { reason }, byId(id))).data
}

export async function cancelPayout(id, reason) {
  return (await call(API.BANKING.POST_CANCEL_PAYOUT, { reason }, byId(id))).data
}

export async function refreshPayout(id) {
  const body = await call(API.BANKING.POST_REFRESH_PAYOUT, {}, byId(id))
  return { payout: body.data, checked: body.checked, warning: body.warning }
}

export async function resendPayout(id) {
  return (await call(API.BANKING.POST_RESEND_PAYOUT, {}, byId(id))).data
}

/** status: comma-separated, e.g. "ACTIVE" or "PENDING_APPROVAL,ACTIVE"; empty = all. */
export async function fetchBeneficiaries({ status = "", search = "", limit = 200 } = {}) {
  const params = { limit }
  if (status) params.status = status
  if (search) params.search = search
  const body = await call(API.BANKING.GET_BENEFICIARIES, {}, params)
  return { items: body.data || [], total: body.total || 0, counts: body.counts || {} }
}

export async function createBeneficiary(input) {
  return (await call(API.BANKING.POST_BENEFICIARY, input)).data
}

export async function approveBeneficiary(id, note) {
  return (await call(API.BANKING.POST_APPROVE_BENEFICIARY, { note }, byId(id))).data
}

export async function rejectBeneficiary(id, reason) {
  return (await call(API.BANKING.POST_REJECT_BENEFICIARY, { reason }, byId(id))).data
}

export async function disableBeneficiary(id, reason) {
  return (await call(API.BANKING.POST_DISABLE_BENEFICIARY, { reason }, byId(id))).data
}

/** Excel rows → { summary, rows[] } (dryRun) or the created batch. */
export async function bulkCreatePayouts(rows, { dryRun = true, confirmDuplicates = false, batchName } = {}) {
  return (await call(API.BANKING.POST_BULK_PAYOUTS, { rows, dryRun, confirmDuplicates, batchName })).data
}

export async function bulkCreateBeneficiaries(rows, { dryRun = true } = {}) {
  return (await call(API.BANKING.POST_BULK_BENEFICIARIES, { rows, dryRun })).data
}

/** Each returns { items: [{ id, ok, status?, error? }], done, failed }. */
export async function bulkApprovePayouts(ids, note) {
  return (await call(API.BANKING.POST_BULK_APPROVE_PAYOUTS, { ids, note })).data
}

export async function bulkRejectPayouts(ids, reason) {
  return (await call(API.BANKING.POST_BULK_REJECT_PAYOUTS, { ids, reason })).data
}

export async function bulkApproveBeneficiaries(ids, note) {
  return (await call(API.BANKING.POST_BULK_APPROVE_BENEFICIARIES, { ids, note })).data
}

export async function bulkRejectBeneficiaries(ids, reason) {
  return (await call(API.BANKING.POST_BULK_REJECT_BENEFICIARIES, { ids, reason })).data
}
