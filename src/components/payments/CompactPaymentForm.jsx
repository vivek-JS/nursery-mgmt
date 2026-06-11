import React, { useCallback, useState } from "react"
import { Toast } from "helpers/toasts/toastHelper"
import CompactPaymentRow from "./CompactPaymentRow"
import { defaultPaymentDraft, draftToApiPayload } from "./paymentFormDefaults"
import { canShowWalletPay, resolveWalletBalance } from "./orderWalletEligibility"
import { validatePaymentDrafts } from "./paymentFormValidation"
import { buildRemarkWithReceiptPayee } from "utils/upiReceiptOcr"

export default function CompactPaymentForm({
  order,
  user,
  balanceDue = 0,
  walletData,
  dealerWalletData,
  isDealer = false,
  loading = false,
  onSubmit,
  onUploadReceiptFile,
  onApplyOcr,
  submitLabel = "Save payments",
  hideSubmit = false,
  drafts: controlledDrafts,
  onDraftsChange,
}) {
  const [internalDrafts, setInternalDrafts] = useState([defaultPaymentDraft()])
  const [rowBusy, setRowBusy] = useState({})

  const drafts = controlledDrafts ?? internalDrafts

  const setDrafts = useCallback(
    (valueOrUpdater) => {
      if (onDraftsChange) {
        const current = controlledDrafts ?? internalDrafts
        const next =
          typeof valueOrUpdater === "function" ? valueOrUpdater(current) : valueOrUpdater
        onDraftsChange(next)
        return
      }
      setInternalDrafts(valueOrUpdater)
    },
    [onDraftsChange, controlledDrafts, internalDrafts]
  )

  const showWallet = canShowWalletPay(order, user)
  const walletAvailable = resolveWalletBalance(order, {
    walletData,
    dealerWalletData,
    isDealer,
  })

  const patchRow = useCallback(
    (index, patch) => {
      setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)))
    },
    [setDrafts]
  )

  const addRow = () => setDrafts((prev) => [...prev, defaultPaymentDraft()])

  const removeRow = (index) => {
    setDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleUpload = async (index, e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ""
    if (!files.length || !onUploadReceiptFile) return
    setRowBusy((b) => ({ ...b, [index]: { upload: true } }))
    try {
      const urls = await onUploadReceiptFile(files)
      if (urls?.length) {
        patchRow(index, {
          receiptPhoto: [...(drafts[index]?.receiptPhoto || []), ...urls],
        })
        if (onApplyOcr && urls[0]) {
          setRowBusy((b) => ({ ...b, [index]: { ocr: true } }))
          const merged = await onApplyOcr(urls[0], drafts[index])
          if (merged) patchRow(index, merged)
        }
      }
    } finally {
      setRowBusy((b) => ({ ...b, [index]: {} }))
    }
  }

  const handleRescan = async (index) => {
    const url = drafts[index]?.receiptPhoto?.[0]
    if (!url || !onApplyOcr) return
    setRowBusy((b) => ({ ...b, [index]: { ocr: true } }))
    try {
      const merged = await onApplyOcr(url, drafts[index], { overwrite: true })
      if (merged) patchRow(index, merged)
    } finally {
      setRowBusy((b) => ({ ...b, [index]: {} }))
    }
  }

  const handleSubmit = () => {
    const errors = validatePaymentDrafts(drafts, {
      balanceDue,
      walletAvailable,
      allowWallet: showWallet,
    })
    if (errors.length) {
      return { ok: false, errors }
    }
    const payloads = drafts.map((d) => {
      const base = draftToApiPayload(d)
      return {
        ...base,
        remark: buildRemarkWithReceiptPayee(d.remark, d.receiptPayeeName),
      }
    })
    onSubmit?.(payloads)
    return { ok: true }
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500">
        Compact entry · all new payments stay Pending · upload receipt to auto-fill when possible
      </p>

      {drafts.map((draft, index) => (
        <CompactPaymentRow
          key={index}
          draft={draft}
          index={index}
          canRemove={drafts.length > 1}
          showWallet={showWallet}
          walletAvailable={walletAvailable}
          balanceDue={balanceDue}
          onChange={(patch) => patchRow(index, patch)}
          onRemove={() => removeRow(index)}
          onUploadReceipt={(e) => handleUpload(index, e)}
          onRescanOcr={() => handleRescan(index)}
          receiptBusy={Boolean(rowBusy[index]?.upload)}
          ocrBusy={Boolean(rowBusy[index]?.ocr)}
        />
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={addRow}
          className="rounded border border-dashed border-gray-400 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
          + Add payment
        </button>
        {!hideSubmit && (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              const result = handleSubmit()
              if (result?.errors?.length) {
                Toast.error(result.errors[0])
              }
            }}
            className="rounded bg-green-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
            {loading ? "Saving…" : submitLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export { draftToApiPayload }
