import moment from "moment"

export const PAYMENT_MODES = ["Cash", "UPI", "Cheque", "NEFT/RTGS", "1341", "434"]

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
  return {
    paidAmount: Number(draft.paidAmount),
    paymentDate: draft.paymentDate,
    modeOfPayment: isWallet ? "Wallet" : draft.modeOfPayment,
    bankName: draft.bankName || "",
    transactionId: draft.transactionId || "",
    utrNumber: draft.utrNumber?.trim() || "",
    chequeNumber: draft.chequeNumber?.trim() || "",
    receiptPhoto: draft.receiptPhoto || [],
    receiptPayeeName: draft.receiptPayeeName || "",
    remark: draft.remark || "",
    isWalletPayment: isWallet,
    paymentStatus: "PENDING",
  }
}
