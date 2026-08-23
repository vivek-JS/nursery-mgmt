import moment from "moment"

export const PAYMENT_MODES = ["Cash", "UPI", "Cheque", "NEFT/RTGS", "Discount", "1341", "434"]

/** Mirrors RECEIPT_OPTIONAL_MODES in FINAL_NURSERY_BE/services/orderPayment.service.js */
export const RECEIPT_OPTIONAL_MODES = ["Cash", "NEFT/RTGS", "UPI", "Cheque", "Discount"]

export function isDiscountDraft(draft) {
  return Boolean(draft?.isDiscount) || draft?.modeOfPayment === "Discount"
}

/** True when this draft must carry at least one receipt photo before it can be submitted. */
export function paymentNeedsReceipt(draft) {
  if (draft?.isWalletPayment) return false
  const mode = draft?.modeOfPayment
  if (!mode) return false
  return !RECEIPT_OPTIONAL_MODES.includes(mode)
}

export function defaultPaymentDraft() {
  return {
    paidAmount: "",
    paymentDate: moment().format("YYYY-MM-DD"),
    modeOfPayment: "",
    bankName: "",
    transactionId: "",
    utrNumber: "",
    chequeNumber: "",
    remark: "",
    receiptPhoto: [],
    receiptPayeeName: "",
    isWalletPayment: false,
  }
}

export function paymentTxnOrUtrTrimmed(draft) {
  return String(draft?.utrNumber || "").trim() || String(draft?.transactionId || "").trim()
}

export function draftToApiPayload(draft) {
  const isWallet = Boolean(draft.isWalletPayment)
  const discount = isDiscountDraft(draft)
  return {
    paidAmount: Number(draft.paidAmount),
    paymentDate: draft.paymentDate,
    modeOfPayment: discount ? "Discount" : isWallet ? "Wallet" : draft.modeOfPayment,
    bankName: discount ? "" : draft.bankName || "",
    transactionId: discount ? "" : draft.transactionId || "",
    utrNumber: discount ? "" : draft.utrNumber?.trim() || "",
    chequeNumber: discount ? "" : draft.chequeNumber?.trim() || "",
    receiptPhoto: discount ? [] : draft.receiptPhoto || [],
    receiptPayeeName: discount ? "" : draft.receiptPayeeName || "",
    remark: draft.remark || "",
    isWalletPayment: discount ? false : isWallet,
    isDiscount: discount,
    paymentStatus: "PENDING",
  }
}
