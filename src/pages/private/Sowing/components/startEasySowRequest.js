import { NetworkManager, API } from "network/core"
import { isApiErrorResponse } from "network/core/responseParser"
import {
  buildSelectedOrderRequestScope,
  computeRequestPlantsGap,
  packingIsRequestable,
  packingsOf,
  plantsPerPacket,
} from "./sowingPackingUtils"

export function issuedRequestOf(card) {
  const req = card?.activeRequest || card?.pendingRequest
  if (!req?._id) return null
  const st = String(req.status || req.displayStatus || "").toLowerCase()
  if (st === "issued" || st === "sowing_in_progress" || st.includes("progress")) {
    return req
  }
  return null
}

function raisingPacketsOf(rows = [], card) {
  const fromRows = (rows || []).reduce((sum, row) => {
    const collected = Boolean(
      row?.raisingCollected ||
        row?.sowingPlan?.raisingIntakeCollected ||
        row?.sowingPlan?.raisingIntakeId ||
        Number(row?.raisingInHandPackets) > 0
    )
    if (!collected) return sum
    return sum + (Number(row.raisingInHandPackets) || 0)
  }, 0)
  if (rows.length) return fromRows
  return (
    Number(card?.raisingInHandPackets) ||
    Number(card?.orderSeedSummary?.raisingInHandPackets) ||
    0
  )
}

/** Create (or reuse) an issued sowing request and return it for Enter sow. */
export async function createEasySowRequest({
  card,
  orderRows = [],
  selectedOrderIds = [],
}) {
  const existing = issuedRequestOf(card)
  if (existing) return existing

  const packing =
    packingsOf(card).find(packingIsRequestable) || packingsOf(card)[0] || null
  const cf = plantsPerPacket(packing) || plantsPerPacket(card) || 1000
  const scope = buildSelectedOrderRequestScope(card, orderRows, selectedOrderIds)
  if ((orderRows || []).length && !scope.linkedOrderIds.length) {
    throw new Error(
      "All selected orders were already requested. Cannot request again for the same order."
    )
  }
  const raise = Number(raisingPacketsOf(scope.selectedRows, card).toFixed(2))
  const gap = computeRequestPlantsGap({
    card: scope.gapCard,
    raisingPackets: raise,
    conversionFactor: cf,
  })
  const packetsNeeded = Math.max(
    0.01,
    Number((gap.requestGap / cf).toFixed(2))
  )
  const company = Math.max(0, Number((packetsNeeded - raise).toFixed(2)))
  const total = Number((company + raise).toFixed(2))
  const source =
    raise > 0 && company > 0 ? "MIXED" : raise > 0 ? "RAISING" : "COMPANY"
  const intakes = (scope.selectedRows || [])
    .flatMap((row) => row.raisingIntakes || [])
    .map((intake) => intake._id)
    .filter(Boolean)

  const body = {
    plantId: card.plantId,
    subtypeId: card.subtypeId,
    packetsNeeded,
    packetsRequested: total,
    packetsFromCompany: company,
    packetsFromRaising: raise,
    seedSource: source,
    raisingIntakeIds: raise > 0 ? intakes : [],
    linkedOrderIds: scope.linkedOrderIds,
    slotIds: scope.slotIds,
    notes: `Direct sowing · gap ${gap.requestGap} plants`,
    directIssue: true,
    skipStockIssue: true,
  }
  if (packing?.productId) body.productId = packing.productId

  const res = await NetworkManager(API.sowing.CREATE_SOWING_REQUEST).request(body)
  if (isApiErrorResponse(res) || !res?.data?.success) {
    throw new Error(res?.data?.message || "Could not start sow entry")
  }
  return res.data.data
}
