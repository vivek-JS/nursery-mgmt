import { draftToApiPayload } from "components/payments/paymentFormDefaults"

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100

/** Merge complete-dialog drafts into order rows for invoice preview (before submit). */
export function buildCompletePreviewDispatch(
  dispatch,
  {
    returnedPlants = {},
    damagedPlants = {},
    paymentDraftByOrder = {},
    freightByOrder = {},
    additionalPlantInputs = {},
    batchNumbers = {},
    batchShedByOrder = {},
    rowKey,
    computePlantQuantities,
    getExistingReturnedPlants,
    getExistingDamagedPlants,
    getOrderPayments,
    getPaymentDraftsForOrder,
    previewFlag = true,
  }
) {
  if (!dispatch?.orderIds) return dispatch

  const orders = dispatch.orderIds.map((order) => {
    const k = rowKey(order)
    const { totalPlants } = computePlantQuantities(order, additionalPlantInputs)
    const retAdd = Math.max(0, Number(returnedPlants[k]) || 0)
    const dmgAdd = Math.max(0, Number(damagedPlants[k]) || 0)
    const prevRet = getExistingReturnedPlants(order)
    const prevDmg = getExistingDamagedPlants(order)

    const freightDraft = freightByOrder[k] || {}
    const farmerFreight = Math.max(0, Number(freightDraft.farmerShareAmount) || 0)
    const freightObj = {
      totalAmount: Math.max(0, Number(freightDraft.totalAmount) || 0),
      farmerShareAmount: farmerFreight,
      companyShareAmount: Math.max(0, Number(freightDraft.companyShareAmount) || 0),
      farmerSharePercent: Number(freightDraft.farmerSharePercent) || 0,
      paidBy: freightDraft.paidBy || "FARMER",
    }

    const existingPayments = getOrderPayments(order)
    const draftRows = getPaymentDraftsForOrder(k)
    const previewPayments = []
    draftRows.forEach((draft) => {
      const amt = Number(draft.paidAmount)
      if (!draft.paidAmount || Number.isNaN(amt) || amt <= 0) return
      if (!draft.isWalletPayment && !draft.modeOfPayment) return
      const payload = draftToApiPayload(draft)
      previewPayments.push({
        paidAmount: amt,
        paymentStatus: "PENDING",
        paymentDate: payload.paymentDate ? new Date(payload.paymentDate) : new Date(),
        modeOfPayment: payload.modeOfPayment,
        isWalletPayment: payload.isWalletPayment,
        remark: payload.remark || "Complete form (preview)",
        isPreviewDraft: true,
      })
    })

    const bn = batchNumbers[k] != null ? String(batchNumbers[k]).trim() : ""
    const shed = batchShedByOrder[k] != null ? String(batchShedByOrder[k]).trim() : ""

    return {
      ...order,
      numberOfPlants: totalPlants,
      totalPlants,
      returnedPlants: prevRet + retAdd,
      damagedPlants: prevDmg + dmgAdd,
      freightCharges: farmerFreight,
      freight: freightObj,
      batchNumber: bn,
      deliveryCompleteBatch: bn ? { batchNumber: bn, pollyhouse: shed } : order.deliveryCompleteBatch,
      payment: [...existingPayments, ...previewPayments],
    }
  })

  return {
    ...dispatch,
    orderIds: orders,
    __completePreview: previewFlag !== false,
  }
}

export { round2 }
