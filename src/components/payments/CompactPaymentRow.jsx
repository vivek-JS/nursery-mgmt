import React, { useState } from "react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import { getStatementMatchPresentation } from "lib/bankMatchLabels"
import { PAYMENT_MODES, isDiscountDraft, paymentTxnOrUtrTrimmed } from "./paymentFormDefaults"

/**
 * Translate a /banking/payments/verify outcome into the payment-subdocument shape
 * getStatementMatchPresentation reads, so this row labels a result exactly the way
 * the order modal labels a stored payment.
 */
function checkOutcomeAsPaymentShape(outcome) {
  switch (outcome?.result) {
    case "VERIFIED":
      return {
        bankVerificationStatus: "BANK_VERIFIED",
        bankVerificationSource: outcome.matchedBy ? "STATEMENT_API" : "TXN_STATUS_API",
        bankVerificationMatchedBy: outcome.matchedBy || null,
      }
    case "MULTIPLE_MATCH":
    case "NEEDS_REVIEW":
      return { bankReconciliationConflict: true }
    case "AMOUNT_MISMATCH":
    case "NOT_FOUND":
      return { bankVerificationStatus: "VERIFY_FAILED" }
    default:
      return null
  }
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      <div className="mt-0.5">{children}</div>
    </label>
  )
}

export default function CompactPaymentRow({
  draft,
  index,
  canRemove,
  showWallet,
  walletAvailable,
  balanceDue,
  onChange,
  onRemove,
  onUploadReceipt,
  onRescanOcr,
  receiptBusy,
  ocrBusy,
}) {
  const inputCls =
    "w-full min-w-0 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
  const mode = draft.isWalletPayment ? "Wallet" : draft.modeOfPayment
  const isDiscount = isDiscountDraft(draft)
  const bankEnabled = !isDiscount && (mode === "Cheque" || mode === "NEFT/RTGS")

  const [bankChecking, setBankChecking] = useState(false)
  const [bankOutcome, setBankOutcome] = useState(null)

  const savedPaymentId = draft._id || draft.paymentId
  const canCheckBank = Boolean(
    savedPaymentId &&
      draft.orderMongoId &&
      draft.source &&
      !isDiscount &&
      !draft.isWalletPayment &&
      paymentTxnOrUtrTrimmed(draft) &&
      Number(draft.paidAmount) > 0
  )

  const handleCheckBank = async () => {
    setBankChecking(true)
    try {
      const res = await NetworkManager(API.BANKING.POST_VERIFY_PAYMENT).request({
        source: draft.source,
        orderMongoId: String(draft.orderMongoId),
        paymentId: String(savedPaymentId),
      })
      const outcome = res?.data?.data ?? {}
      setBankOutcome(outcome)
      if (outcome.message) Toast.info(outcome.message)
    } catch (e) {
      setBankOutcome(null)
      Toast.error(e?.response?.data?.message || e?.message || "Bank check failed")
    } finally {
      setBankChecking(false)
    }
  }

  const bankShape = checkOutcomeAsPaymentShape(bankOutcome)
  const bankPres = bankShape ? getStatementMatchPresentation(bankShape) : null

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
            {index + 1}
          </span>
          {showWallet && (
            <button
              type="button"
              title={draft.isWalletPayment ? "Wallet pay ON" : "Pay from wallet"}
              onClick={() =>
                onChange({
                  isWalletPayment: !draft.isWalletPayment,
                  modeOfPayment: !draft.isWalletPayment ? "" : draft.modeOfPayment,
                })
              }
              className={`h-3 w-3 rounded-full border-2 transition-colors ${
                draft.isWalletPayment
                  ? "border-amber-600 bg-amber-500 shadow-[0_0_0_2px_rgba(245,158,11,0.35)]"
                  : "border-gray-300 bg-white hover:border-amber-400"
              }`}
            />
          )}
          {showWallet && (
            <span className="text-[10px] text-gray-500">
              Wallet {draft.isWalletPayment ? "on" : "off"}
              {walletAvailable != null ? ` · ₹${walletAvailable.toLocaleString()}` : ""}
            </span>
          )}
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50">
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-12">
        <Field label={isDiscount ? "Receipt (not needed)" : "Receipt or screenshot"} className="md:col-span-2">
          <div className="flex min-h-[34px] flex-wrap items-center gap-1">
            <label
              className={`inline-flex cursor-pointer items-center rounded border border-gray-300 bg-white px-2 py-1 text-[10px] font-semibold text-gray-700 hover:bg-gray-50 ${
                receiptBusy || ocrBusy || isDiscount ? "pointer-events-none opacity-50" : ""
              }`}>
              {receiptBusy ? "Uploading…" : ocrBusy ? "Scanning…" : "Upload receipt or screenshot"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                disabled={receiptBusy || ocrBusy}
                onChange={onUploadReceipt}
              />
            </label>
            {draft.receiptPhoto?.[0] && (
              <button
                type="button"
                disabled={receiptBusy || ocrBusy}
                onClick={onRescanOcr}
                className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-[10px] font-semibold text-indigo-700 disabled:opacity-50">
                Scan
              </button>
            )}
            {(draft.receiptPhoto || []).map((url, i) => (
              <img key={`${url}-${i}`} src={url} alt="" className="h-8 w-8 rounded border object-cover" />
            ))}
          </div>
        </Field>
        <Field label="Payee" className="md:col-span-2">
          <input
            type="text"
            value={draft.receiptPayeeName || ""}
            onChange={(e) => onChange({ receiptPayeeName: e.target.value })}
            className={inputCls}
            placeholder="From receipt"
          />
        </Field>
        <Field label="Amount ₹" className="md:col-span-2">
          <input
            type="number"
            value={draft.paidAmount}
            onChange={(e) => onChange({ paidAmount: e.target.value })}
            className={inputCls}
            placeholder="0"
          />
          {balanceDue > 0 && index === 0 && (
            <button
              type="button"
              onClick={() => onChange({ paidAmount: String(balanceDue) })}
              className="mt-0.5 text-[10px] font-semibold text-amber-800 hover:underline">
              Fill due ₹{balanceDue.toLocaleString()}
            </button>
          )}
        </Field>
        <Field label="Date" className="md:col-span-2">
          <input
            type="date"
            value={draft.paymentDate}
            onChange={(e) => onChange({ paymentDate: e.target.value })}
            className={inputCls}
          />
        </Field>
        <Field label="Mode" className="md:col-span-2">
          <select
            value={draft.isWalletPayment ? "" : draft.modeOfPayment}
            disabled={draft.isWalletPayment}
            onChange={(e) =>
              onChange({
                modeOfPayment: e.target.value,
                ...(e.target.value === "Discount" ? { isWalletPayment: false } : {}),
              })
            }
            className={inputCls}>
            <option value="">{draft.isWalletPayment ? "Wallet" : "Mode"}</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bank" className="md:col-span-2">
          <input
            type="text"
            value={draft.bankName}
            disabled={!bankEnabled || draft.isWalletPayment}
            onChange={(e) => onChange({ bankName: e.target.value })}
            className={inputCls}
            placeholder={bankEnabled ? "Bank" : "—"}
          />
        </Field>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
        <Field label="Txn / UTR">
          <div className="flex min-w-0 items-center gap-1">
            <input
              type="text"
              value={draft.utrNumber || draft.transactionId || ""}
              disabled={draft.isWalletPayment || isDiscount || mode === "Cash"}
              onChange={(e) => onChange({ utrNumber: e.target.value, transactionId: e.target.value })}
              className={inputCls}
              placeholder={mode === "UPI" ? "UTR required" : "Optional"}
            />
            {canCheckBank && (
              <button
                type="button"
                disabled={bankChecking}
                onClick={handleCheckBank}
                title="Match this UTR and amount against the bank statement"
                className="shrink-0 rounded border border-teal-600 px-2 py-1.5 text-[10px] font-semibold text-teal-700 hover:bg-teal-50 disabled:opacity-50">
                {bankChecking ? "Checking…" : "Check bank"}
              </button>
            )}
          </div>
          {bankPres && <div className={`mt-0.5 text-[10px] ${bankPres.className}`}>{bankPres.label}</div>}
        </Field>
        {mode === "Cheque" && !draft.isWalletPayment && (
          <Field label="Cheque #">
            <input
              type="text"
              value={draft.chequeNumber || ""}
              onChange={(e) => onChange({ chequeNumber: e.target.value })}
              className={inputCls}
            />
          </Field>
        )}
        <Field label="Remark" className={mode === "Cheque" ? "" : "md:col-span-2"}>
          <input
            type="text"
            value={draft.remark}
            onChange={(e) => onChange({ remark: e.target.value })}
            className={inputCls}
            placeholder={isDiscount ? "Required — reason for discount" : "Optional"}
          />
        </Field>
      </div>

      {isDiscount && !String(draft.remark || "").trim() && (
        <p className="mt-1 text-[10px] text-red-600">Remark required for Discount</p>
      )}
      {mode === "UPI" && !draft.isWalletPayment && !paymentTxnOrUtrTrimmed(draft) && (
        <p className="mt-1 text-[10px] text-red-600">UTR required for UPI</p>
      )}
    </div>
  )
}
