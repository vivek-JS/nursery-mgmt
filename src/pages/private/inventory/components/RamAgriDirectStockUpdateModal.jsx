import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Trash2, X, Save, Layers3 } from "lucide-react";

function emptyBatchRow() {
  return { batchNumber: "", expiryDate: "", quantity: "" };
}

/**
 * Direct stock update modal: increase → multiple batch # + expiry + qty rows.
 * Decrease → absolute new stock only (FEFO out).
 */
export default function RamAgriDirectStockUpdateModal({
  open,
  onClose,
  onSubmit,
  cropName = "",
  varietyName = "",
  currentStock = 0,
  unit = "",
  saving = false,
}) {
  const [newStock, setNewStock] = useState("");
  const [batches, setBatches] = useState([emptyBatchRow()]);
  const [error, setError] = useState("");

  const existing = Number(currentStock) || 0;

  useEffect(() => {
    if (!open) return;
    setNewStock(String(existing));
    setBatches([emptyBatchRow()]);
    setError("");
  }, [open, existing]);

  const nextStock = Number(newStock);
  const delta = Number.isFinite(nextStock) ? nextStock - existing : 0;
  const isIncrease = delta > 0;
  const isDecrease = delta < 0;

  const batchQtySum = useMemo(
    () =>
      batches.reduce((s, r) => {
        const q = Number(r.quantity);
        return s + (Number.isFinite(q) && q > 0 ? q : 0);
      }, 0),
    [batches]
  );

  if (!open) return null;

  const updateRow = (idx, field, value) => {
    setBatches((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async () => {
    setError("");
    if (!Number.isFinite(nextStock) || nextStock < 0) {
      setError("New stock must be a non-negative number");
      return;
    }
    if (delta === 0) {
      setError("No stock change to save");
      return;
    }
    if (isIncrease) {
      if (!batches.length) {
        setError("Add at least one batch");
        return;
      }
      for (const [i, row] of batches.entries()) {
        if (!String(row.batchNumber || "").trim()) {
          setError(`Batch # required on row ${i + 1}`);
          return;
        }
        if (!row.expiryDate) {
          setError(`Expiry required on row ${i + 1}`);
          return;
        }
        const q = Number(row.quantity);
        if (!Number.isFinite(q) || q <= 0) {
          setError(`Quantity must be > 0 on row ${i + 1}`);
          return;
        }
      }
      if (Math.abs(batchQtySum - delta) > 0.001) {
        setError(
          `Batch qty total (${batchQtySum}) must equal increase (+${delta})`
        );
        return;
      }
    }

    const payload = {
      currentStock: nextStock,
      batches: isIncrease
        ? batches.map((r) => ({
            batchNumber: String(r.batchNumber).trim(),
            expiryDate: r.expiryDate,
            quantity: Number(r.quantity),
          }))
        : [],
    };
    await onSubmit?.(payload);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={saving ? undefined : onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-brand-600" />
              Direct stock update
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              {cropName} · {varietyName}
            </p>
            <p className="text-xs text-slate-500 mt-1">
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

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              New stock
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={newStock}
              onChange={(e) => setNewStock(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {Number.isFinite(delta) && delta !== 0 ? (
              <p
                className={`mt-1 text-xs font-semibold ${
                  isIncrease ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {isIncrease ? `Increase +${delta}` : `Decrease ${delta}`}
                {unit ? ` ${unit}` : ""}
              </p>
            ) : null}
          </div>

          {isIncrease && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Inbound batches</p>
                  <p className="text-xs text-slate-500">
                    Required: batch #, expiry, qty. Total qty must equal +{delta}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBatches((prev) => [...prev, emptyBatchRow()])}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add batch
                </button>
              </div>

              {batches.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Batch #
                    </label>
                    <input
                      type="text"
                      value={row.batchNumber}
                      onChange={(e) => updateRow(idx, "batchNumber", e.target.value)}
                      placeholder="LOT / batch"
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Expiry *
                    </label>
                    <input
                      type="date"
                      value={row.expiryDate}
                      onChange={(e) => updateRow(idx, "expiryDate", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                      Qty *
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      type="button"
                      disabled={batches.length <= 1}
                      onClick={() => setBatches((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                      title="Remove row"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <p
                className={`text-xs font-semibold ${
                  Math.abs(batchQtySum - delta) < 0.001
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                Batch total: {batchQtySum.toLocaleString("en-IN")} / need{" "}
                {delta.toLocaleString("en-IN")}
              </p>
            </div>
          )}

          {isDecrease && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Decrease uses FEFO (nearest expiry first). No batch pick needed.
            </div>
          )}

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 bg-slate-50">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60"
          >
            <Save className={`h-4 w-4 ${saving ? "animate-pulse" : ""}`} />
            {saving ? "Saving…" : "Save stock"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
