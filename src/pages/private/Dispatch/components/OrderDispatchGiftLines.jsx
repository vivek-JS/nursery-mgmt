import React from "react";
import { giftOptionLabel } from "utils/dispatchOrderGifts";

export default function OrderDispatchGiftLines({
  orderKey,
  lines = [],
  giftCatalog = [],
  giftsLoading = false,
  disabled = false,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
}) {
  if (!orderKey) return null;

  const editable = !disabled;
  const catalog = (giftCatalog || []).filter((p) => Number(p.currentStock) > 0);

  return (
    <div className="mt-2 pt-2 border-t border-violet-100 rounded-lg bg-violet-50/60 px-2 py-2">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <p className="text-xs font-semibold text-violet-900">Gift products (linked load)</p>
        {editable && catalog.length > 0 && (
          <button
            type="button"
            onClick={() => onAddLine?.(orderKey)}
            className="text-xs font-semibold text-violet-700 hover:text-violet-900 underline">
            + Add gift
          </button>
        )}
      </div>

      {giftsLoading && lines.length === 0 ? (
        <p className="text-xs text-violet-700">Loading gifts…</p>
      ) : null}

      {!giftsLoading && catalog.length === 0 ? (
        <p className="text-xs text-violet-700">No gift products in stock.</p>
      ) : null}

      {lines.length === 0 && catalog.length > 0 && !giftsLoading ? (
        <p className="text-xs text-violet-600">Optional — add promotional gifts for this order.</p>
      ) : null}

      <div className="space-y-2">
        {lines.map((row) => {
          const selected = catalog.find((p) => String(p._id) === String(row.productId));
          const maxQty = selected ? Number(selected.currentStock) || 0 : null;
          const unit = selected?.unitAbbreviation || selected?.primaryUnit?.abbreviation || "";

          return (
            <div
              key={row.localId}
              className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-end bg-white/80 border border-violet-100 rounded-md p-2">
              <div className="sm:col-span-7">
                <label className="block text-[10px] uppercase tracking-wide text-violet-700 mb-0.5">
                  Gift product
                </label>
                {row.readOnly ? (
                  <p className="text-xs font-medium text-slate-800">{row.productName || "Gift"}</p>
                ) : (
                  <select
                    className="w-full text-xs border border-violet-200 rounded px-2 py-1.5 bg-white"
                    value={row.productId || ""}
                    disabled={disabled || catalog.length === 0}
                    onChange={(e) => {
                      const product = catalog.find((p) => String(p._id) === e.target.value);
                      onUpdateLine?.(orderKey, row.localId, {
                        productId: e.target.value,
                        productName: product?.name || "",
                        rate:
                          product?.averagePrice > 0
                            ? String(product.averagePrice)
                            : row.rate || "",
                      });
                    }}>
                    <option value="">Select gift…</option>
                    {catalog.map((product) => (
                      <option key={product._id} value={product._id}>
                        {giftOptionLabel(product)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-wide text-violet-700 mb-0.5">
                  Qty{unit ? ` (${unit})` : ""}
                </label>
                {row.readOnly ? (
                  <p className="text-xs font-medium text-slate-800">{row.quantity}</p>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={maxQty || undefined}
                    className="w-full text-xs border border-violet-200 rounded px-2 py-1.5"
                    value={row.quantity}
                    disabled={disabled || !row.productId}
                    onChange={(e) =>
                      onUpdateLine?.(orderKey, row.localId, { quantity: e.target.value })
                    }
                  />
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] uppercase tracking-wide text-violet-700 mb-0.5">
                  Rate
                </label>
                {row.readOnly ? (
                  <p className="text-xs font-medium text-slate-800">{row.rate}</p>
                ) : (
                  <input
                    type="number"
                    min={0}
                    className="w-full text-xs border border-violet-200 rounded px-2 py-1.5"
                    value={row.rate}
                    disabled={disabled || !row.productId}
                    onChange={(e) => onUpdateLine?.(orderKey, row.localId, { rate: e.target.value })}
                  />
                )}
              </div>

              <div className="sm:col-span-2 flex items-center justify-between gap-1">
                {row.readOnly ? (
                  <span className="text-[10px] font-semibold text-emerald-700 uppercase">
                    {row.agriLoadStatus === "LOADED" ? "Loaded" : "Linked"}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onRemoveLine?.(orderKey, row.localId)}
                    className="text-xs text-red-600 hover:text-red-800 underline"
                    disabled={disabled}>
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
