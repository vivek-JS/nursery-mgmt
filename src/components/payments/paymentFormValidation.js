import { paymentTxnOrUtrTrimmed } from "./paymentFormDefaults"

export function validatePaymentDrafts(drafts, { balanceDue, walletAvailable, allowWallet }) {
  const errors = []
  if (!drafts?.length) {
    return ["Add at least one payment row"]
  }

  let walletTotal = 0

  drafts.forEach((d, i) => {
    const row = i + 1
    const amt = Number(d.paidAmount)
    if (!d.paidAmount || Number.isNaN(amt) || amt <= 0) {
      errors.push(`Row ${row}: enter amount`)
      return
    }
    if (!d.isWalletPayment && !d.modeOfPayment) {
      errors.push(`Row ${row}: select payment mode`)
    }
    const mode = d.isWalletPayment ? "Wallet" : d.modeOfPayment
    if (
      !d.isWalletPayment &&
      mode &&
      mode !== "Cash" &&
      mode !== "NEFT/RTGS" &&
      mode !== "UPI" &&
      !(d.receiptPhoto?.length)
    ) {
      errors.push(`Row ${row}: receipt required for ${mode}`)
    }
    if (mode === "UPI" && !d.isWalletPayment && !paymentTxnOrUtrTrimmed(d)) {
      errors.push(`Row ${row}: UTR required for UPI`)
    }
    if (d.isWalletPayment) walletTotal += amt
  })

  if (allowWallet && walletTotal > 0 && walletTotal > walletAvailable + 0.001) {
    errors.push(
      `Insufficient wallet balance (need ₹${walletTotal.toLocaleString()}, available ₹${walletAvailable.toLocaleString()})`
    )
  }

  const cashTotal = drafts.reduce((s, d) => s + (Number(d.paidAmount) || 0), 0)
  if (balanceDue > 0 && cashTotal > balanceDue * 1.5) {
    // soft warning only — no error
  }

  return errors
}
