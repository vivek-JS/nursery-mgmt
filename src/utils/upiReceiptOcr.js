/**
 * UPI receipt OCR — same API base as other routes: /api/v1/ocr/...
 * Use after media upload returns a public image URL.
 */

import moment from "moment"

/** e.g. http://localhost:8000/api/v1/ocr */
export function getOcrApiPrefix() {
  const base = (process.env.REACT_APP_BASE_URL || "http://localhost:8000/api/v1").replace(/\/+$/, "")
  return `${base}/ocr`
}

/**
 * @param {string} imageUrl — HTTPS URL from media upload (e.g. Cloudinary)
 * @returns {Promise<{ success: boolean, data?: object, error?: string }>}
 */
export async function extractUpiFromReceiptImageUrl(imageUrl) {
  const res = await fetch(`${getOcrApiPrefix()}/upi-receipt-by-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ imageUrl }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || `OCR failed (${res.status})`)
  }
  return json
}

/** True when OCR returned a positive amount we can apply to paidAmount. */
export function ocrDataHasAmount(d) {
  if (!d || d.amount == null) return false
  const raw = String(d.amount).replace(/[^\d.]/g, "")
  const n = Number(raw)
  return raw !== "" && Number.isFinite(n) && n > 0
}

/** True when OCR payload has any field we can use (receipt scan succeeded with content). */
export function ocrDataHasUsableSignal(d) {
  if (!d || typeof d !== "object") return false
  return Boolean(
    (d.app_name != null && String(d.app_name).trim()) ||
      (d.utr_number != null && String(d.utr_number).trim()) ||
      (d.transaction_id != null && String(d.transaction_id).trim()) ||
      (d.amount != null && String(d.amount).trim()) ||
      (d.name != null && String(d.name).trim()) ||
      (d.date != null && String(d.date).trim())
  )
}

/**
 * Merge OCR `data` into payment-like state. Fills `transactionId` (bank/app ref) and `utrNumber` (UTR) when present.
 * If state has no `utrNumber` key (legacy), falls back to a single `transactionId` string.
 * Sets `ocrAppliedFromReceipt` when scan returned usable data; defaults mode to UPI if mode was empty.
 * Supports `paidAmount` or `totalAmount` (bulk).
 * @param {object} prev
 * @param {object} d — ocr.data
 * @param {{ fillAmount?: boolean, overwrite?: boolean }} [options]
 *   - fillAmount: when true, set amount from receipt if OCR returned one (use only after successful scan)
 *   - overwrite: when true (rescan), replace payee/date/UTR even if already filled
 */
export function mergeUpiOcrIntoPaymentState(prev, d, options = {}) {
  if (!d || typeof d !== "object") return prev
  const { fillAmount = false, overwrite = false } = options
  const ocrSignal = ocrDataHasUsableSignal(d)
  const utr = d.utr_number != null && String(d.utr_number).trim() ? String(d.utr_number).trim() : ""
  const tid = d.transaction_id != null && String(d.transaction_id).trim() ? String(d.transaction_id).trim() : ""

  let paymentDate = prev.paymentDate
  if (d.date && typeof d.date === "string" && d.date.trim()) {
    const m = moment(d.date.trim(), ["DD MMM YYYY", "D MMM YYYY", "DD/MM/YYYY", "YYYY-MM-DD"], true)
    if (m.isValid()) {
      const empty =
        prev.paymentDate == null || String(prev.paymentDate).trim() === ""
      if (empty || overwrite) paymentDate = m.format("YYYY-MM-DD")
    }
  }

  const nameEmpty = !(prev.receiptPayeeName != null && String(prev.receiptPayeeName).trim())
  const receiptPayeeName =
    (overwrite || nameEmpty) && d.name != null && String(d.name).trim()
      ? String(d.name).trim()
      : prev.receiptPayeeName

  const amountKey =
    "paidAmount" in prev ? "paidAmount" : "totalAmount" in prev ? "totalAmount" : null
  const next = {
    ...prev,
    receiptPayeeName,
    paymentDate,
    ocrAppliedFromReceipt: ocrSignal || Boolean(prev.ocrAppliedFromReceipt),
  }
  if (amountKey && fillAmount) {
    const raw = d.amount != null ? String(d.amount).replace(/[^\d.]/g, "") : ""
    if (raw) {
      const amountEmpty = prev[amountKey] === "" || prev[amountKey] == null
      if (overwrite || amountEmpty) next[amountKey] = raw
    }
  }
  const prevTxnEmpty = !(prev.transactionId && String(prev.transactionId).trim())
  const hasUtrField = Object.prototype.hasOwnProperty.call(prev, "utrNumber")
  const prevUtrEmpty =
    !hasUtrField || !(prev.utrNumber != null && String(prev.utrNumber).trim())

  if (hasUtrField) {
    next.transactionId =
      (overwrite || prevTxnEmpty) && tid ? tid : prev.transactionId
    next.utrNumber = (overwrite || prevUtrEmpty) && utr ? utr : prev.utrNumber
  } else {
    next.transactionId =
      overwrite || prevTxnEmpty
        ? tid && utr && tid !== utr
          ? `${tid} · UTR ${utr}`
          : tid || utr || ""
        : prev.transactionId
  }
  const modeEmpty = !(prev.modeOfPayment != null && String(prev.modeOfPayment).trim())
  next.modeOfPayment =
    prev.modeOfPayment ||
    (ocrSignal && modeEmpty ? "UPI" : prev.modeOfPayment || "")

  return next
}

/** Append payee line to remark when submitting (no DB field for payee name). */
export function buildRemarkWithReceiptPayee(remark, receiptPayeeName) {
  const r = (remark || "").trim()
  const p = (receiptPayeeName || "").trim()
  if (!p) return r
  const payeeLine = `Payee (receipt): ${p}`
  if (r.includes(payeeLine)) return r
  return r ? `${r}\n${payeeLine}` : payeeLine
}
