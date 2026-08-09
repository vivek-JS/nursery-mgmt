import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Link2 } from "lucide-react";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { isApiErrorResponse } from "network/core/responseParser";

/** Link a Ram Agri master variety to a Ram Biotech seed product. */
export default function AgriVarietyBiotechLinkDialog({ open, agriVariety, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");

  useEffect(() => {
    if (!open || !agriVariety) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS).request(
          {},
          { category: "seeds", isActive: true }
        );
        if (cancelled) return;
        const body = res?.data?.data ?? res?.data;
        const list = Array.isArray(body) ? body : body?.data || [];
        setProducts(list);
        const existing = agriVariety.biotechLink?.productId;
        setProductId(existing ? String(existing) : "");
      } catch (e) {
        console.error(e);
        Toast.error("Failed to load seed products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, agriVariety]);

  const selectedProduct = useMemo(
    () => products.find((p) => String(p._id) === String(productId)),
    [products, productId]
  );

  const handleSave = async () => {
    if (!agriVariety?.cropId || !agriVariety?.varietyId || !productId) {
      Toast.error("Select a Biotech seed product");
      return;
    }
    if (selectedProduct && (!selectedProduct.plantId || !selectedProduct.subtypeId)) {
      Toast.error("Selected product must have plant and subtype assigned (edit in Biotech master)");
      return;
    }
    setSaving(true);
    try {
      const res = await NetworkManager(API.INVENTORY.PATCH_PRODUCT_AGRI_LINK).request(
        { cropId: agriVariety.cropId, varietyId: agriVariety.varietyId },
        [productId]
      );
      if (isApiErrorResponse(res)) {
        Toast.error(res.message || "Failed to save link");
        return;
      }
      Toast.success("Ram Agri variety linked to Biotech product");
      onSaved?.();
      onClose();
    } catch (e) {
      Toast.error(e?.message || "Failed to save link");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !agriVariety) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Link Ram Agri variety</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {agriVariety.cropName} · {agriVariety.varietyName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ram Biotech seed product <span className="text-red-500">*</span>
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">Select seed SKU</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.code} — {p.name}
                      {p.currentStock != null ? ` (${p.currentStock} stock)` : ""}
                      {!p.plantId || !p.subtypeId ? " · no plant/subtype" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1.5">
                  Product must have nursery plant + subtype set (Biotech master or product edit).
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-semibold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !productId}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                  Save link
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
