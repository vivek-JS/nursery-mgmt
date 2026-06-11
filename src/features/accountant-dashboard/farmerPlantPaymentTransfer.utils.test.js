import {
  buildFarmerPlantOrderPaymentTransferPayload,
  buildFarmerOrderTransferRequestPayload,
  normalizeMongoObjectId,
  transferableFarmerPlantPayments,
  isTransferRequestPendingPayment,
  isApprovedTransferRequestPayment,
  isOrderEligibleForPlantTransfer,
  ORDER_TRANSFER_EXCLUDED_STATUSES
} from "./farmerPlantPaymentTransfer.utils"

const OID_A = "507f1f77bcf86cd799439011"
const OID_B = "507f1f77bcf86cd799439012"
const OID_PAY = "507f1f77bcf86cd799439013"

describe("farmerPlantPaymentTransfer.utils", () => {
  describe("normalizeMongoObjectId", () => {
    it("accepts 24-char hex ids", () => {
      expect(normalizeMongoObjectId(OID_A, "Order")).toBe(OID_A)
    })

    it("rejects numeric business order ids", () => {
      expect(() => normalizeMongoObjectId("1931", "Order")).toThrow(/valid id/i)
    })

    it("rejects empty values", () => {
      expect(() => normalizeMongoObjectId("", "Order")).toThrow(/valid id/i)
    })
  })

  describe("buildFarmerPlantOrderPaymentTransferPayload", () => {
    it("builds required fields for transfer-order-payment API", () => {
      expect(
        buildFarmerPlantOrderPaymentTransferPayload({
          sourceOrderId: OID_A,
          targetOrderId: OID_B,
          paymentId: OID_PAY
        })
      ).toEqual({
        sourceOrderId: OID_A,
        targetOrderId: OID_B,
        paymentId: OID_PAY
      })
    })

    it("omits message when blank", () => {
      const payload = buildFarmerPlantOrderPaymentTransferPayload({
        sourceOrderId: OID_A,
        targetOrderId: OID_B,
        paymentId: OID_PAY,
        message: "   "
      })
      expect(payload.message).toBeUndefined()
    })

    it("includes trimmed message when provided", () => {
      expect(
        buildFarmerPlantOrderPaymentTransferPayload({
          sourceOrderId: OID_A,
          targetOrderId: OID_B,
          paymentId: OID_PAY,
          message: "  moved to sibling order  "
        }).message
      ).toBe("moved to sibling order")
    })

    it("rejects same source and target", () => {
      expect(() =>
        buildFarmerPlantOrderPaymentTransferPayload({
          sourceOrderId: OID_A,
          targetOrderId: OID_A,
          paymentId: OID_PAY
        })
      ).toThrow(/different/i)
    })
  })

  describe("buildFarmerOrderTransferRequestPayload", () => {
    it("builds fromOrderId, toOrderId, requestedAmount", () => {
      expect(
        buildFarmerOrderTransferRequestPayload({
          fromOrderId: OID_A,
          toOrderId: OID_B,
          requestedAmount: 500
        })
      ).toEqual({
        fromOrderId: OID_A,
        toOrderId: OID_B,
        requestedAmount: 500
      })
    })

    it("rejects non-positive amount", () => {
      expect(() =>
        buildFarmerOrderTransferRequestPayload({
          fromOrderId: OID_A,
          toOrderId: OID_B,
          requestedAmount: 0
        })
      ).toThrow(/greater than zero/i)
    })
  })

  describe("transfer request payment hints", () => {
    it("detects pending transfer-request payment", () => {
      expect(
        isTransferRequestPendingPayment({
          transferRequestId: "507f1f77bcf86cd799439014",
          paymentStatus: "PENDING"
        })
      ).toBe(true)
    })

    it("detects approved transfer-request payment", () => {
      expect(
        isApprovedTransferRequestPayment({
          transferRequestId: "507f1f77bcf86cd799439014",
          paymentStatus: "COLLECTED",
          transferredFromOrderId: OID_A
        })
      ).toBe(true)
    })
  })

  describe("isOrderEligibleForPlantTransfer", () => {
    it("blocks DISPATCHED and COMPLETED", () => {
      expect(ORDER_TRANSFER_EXCLUDED_STATUSES).toContain("DISPATCHED")
      expect(ORDER_TRANSFER_EXCLUDED_STATUSES).toContain("COMPLETED")
      expect(isOrderEligibleForPlantTransfer({ orderStatus: "DISPATCHED" })).toBe(false)
      expect(isOrderEligibleForPlantTransfer({ orderStatus: "COMPLETED" })).toBe(false)
      expect(isOrderEligibleForPlantTransfer({ orderStatus: "ACCEPTED" })).toBe(true)
    })
  })

  describe("transferableFarmerPlantPayments", () => {
    it("includes COLLECTED non-wallet non-bulk payments with amount > 0", () => {
      const rows = transferableFarmerPlantPayments([
        { _id: "1", paymentStatus: "COLLECTED", paidAmount: 500, modeOfPayment: "Cash" },
        { _id: "2", paymentStatus: "PENDING", paidAmount: 100 },
        { _id: "3", paymentStatus: "COLLECTED", paidAmount: 200, isWalletPayment: true },
        { _id: "4", paymentStatus: "COLLECTED", paidAmount: 300, mainPaymentId: "bulk1" },
        { _id: "5", paymentStatus: "COLLECTED", paidAmount: 0 }
      ])
      expect(rows).toHaveLength(1)
      expect(rows[0]._id).toBe("1")
    })
  })
})
