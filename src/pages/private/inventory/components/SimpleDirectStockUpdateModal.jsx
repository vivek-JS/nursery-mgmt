import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Layers3, Save, X } from "lucide-react";

/**
 * Quantity-based direct stock update — batch # and expiry optional (increases only).
 */
export default function SimpleDirectStockUpdateModal({
  open,
  onClose,
  onSubmit,
  title = "",
  subtitle = "",
  currentStock = 0,
  unit = "",
  saving = false,
}) {
  const [quantityDelta, setQuantityDelta] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [error, setError] = useState("");

  const existing = Number(currentStock) || 0;

  useEffect(() => {
    if (!open) return;
    setQuantityDelta("");
    setBatchNumber("");
    setExpiryDate("");
    setError("");
  }, [open, existing]);

  if (!open) return null;

  const delta = Number(quantityDelta);
  const preview =
    Number.isFinite(delta) && delta !== 0 ? Math.max(0, existing + delta) : null;

  const handleSubmit = async () => {
    setError("");
    if (!Number.isFinite(delta) || delta === 0) {
      setError("Enter a non-zero quantity (+ add, − reduce)");
      return;
    }
    if (existing + delta < 0) {
      setError("Stock cannot go below zero");
      return;
    }
    await onSubmit?.({
      quantityDelta: delta,
      batchNumber: String(batchNumber || "").trim() || undefined,
      expiryDate: expiryDate || undefined,
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={saving ? undefined : onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Layers3 className="h-5 w-5 text-brand-600" />
              Update stock
            </h2>
            {title ? <p className="mt-0.5 text-sm font-medium text-slate-800">{title}</p> : null}
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
            <p className="mt-1 text-xs text-slate-500">
              Current: {existing.toLocaleString("en-IN")}
              {unit ? ` ${unit}` : ""}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quantity change *
            </label>
            <input
              type="number"
              step="0.01"
              value={quantityDelta}
              onChange={(e) => setQuantityDelta(e.target.value)}
              placeholder="e.g. 100 or -50"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-500">Positive adds stock; negative removes (FEFO).</p>
            {preview != null ? (
              <p className="mt-1 text-xs font-semibold text-emerald-700">
                After: {preview.toLocaleString("en-IN")}
                {unit ? ` ${unit}` : ""}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Batch # <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              placeholder="Auto-generated if empty on add"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Expiry <span className="font-normal normal-case text-slate-400">(optional)</span>
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save className={`h-4 w-4 ${saving ? "animate-pulse" : ""}`} />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
