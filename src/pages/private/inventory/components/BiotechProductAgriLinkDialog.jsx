import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Link2, Unlink } from "lucide-react";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { isApiErrorResponse } from "network/core/responseParser";

export default function BiotechProductAgriLinkDialog({
  open,
  onClose,
  product,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [linkData, setLinkData] = useState(null);
  const [crops, setCrops] = useState([]);
  const [cropId, setCropId] = useState("");
  const [varietyId, setVarietyId] = useState("");

  useEffect(() => {
    if (!open || !product?._id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [linkRes, cropsRes] = await Promise.all([
          NetworkManager(API.INVENTORY.GET_PRODUCT_AGRI_LINK).request({}, [product._id]),
          NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS).request({}, { productType: "seed" }),
        ]);
        if (cancelled) return;
        const linkBody = linkRes?.data?.data ?? linkRes?.data;
        setLinkData(linkBody);
        if (linkBody?.agri) {
          setCropId(String(linkBody.agri.cropId));
          setVarietyId(String(linkBody.agri.varietyId));
        } else {
          setCropId("");
          setVarietyId("");
        }
        const cropsBody = cropsRes?.data?.data ?? cropsRes?.data;
        const list = Array.isArray(cropsBody) ? cropsBody : cropsBody?.data || [];
        setCrops(list.filter((c) => (c.productType || "seed") === "seed"));
      } catch (e) {
        console.error(e);
        Toast.error("Failed to load link data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, product?._id]);

  const varieties = useMemo(() => {
    const crop = crops.find((c) => String(c._id) === String(cropId));
    return (crop?.varieties || []).filter((v) => v.isActive !== false);
  }, [crops, cropId]);

  const handleSave = async () => {
    if (!product?._id || !cropId || !varietyId) {
      Toast.error("Select Ram Agri crop and variety");
      return;
    }
    setSaving(true);
    try {
      const instance = NetworkManager(API.INVENTORY.PATCH_PRODUCT_AGRI_LINK);
      const res = await instance.request({ cropId, varietyId }, [product._id]);
      if (isApiErrorResponse(res)) {
        Toast.error(res.message || "Failed to save link");
        return;
      }
      Toast.success("Linked to Ram Agri variety");
      onSaved?.();
      onClose();
    } catch (e) {
      Toast.error(e?.message || "Failed to save link");
    } finally {
      setSaving(false);
    }
  };

  const handleUnlink = async () => {
    if (!product?._id) return;
    setSaving(true);
    try {
      const instance = NetworkManager(API.INVENTORY.PATCH_PRODUCT_AGRI_LINK);
      const res = await instance.request({ clearLink: true }, [product._id]);
      if (isApiErrorResponse(res)) {
        Toast.error(res.message || "Failed to remove link");
        return;
      }
      Toast.success("Agri link removed");
      onSaved?.();
      onClose();
    } catch (e) {
      Toast.error(e?.message || "Failed to remove link");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const transfers = linkData?.transferHistory || [];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Link Ram Agri variety</h2>
            <p className="text-sm text-gray-600">
              {product?.code} · {product?.name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : (
            <>
              <p className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Separate inventories — stock moves from Ram Agri to Ram Biotech only via sowing
                internal transfer (not auto-sync).
              </p>

              {linkData?.agri && (
                <div className="mb-4 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm">
                  <p className="font-semibold text-violet-900">Currently linked</p>
                  <p className="text-violet-800">
                    {linkData.agri.cropName} · {linkData.agri.varietyName}
                  </p>
                  <p className="mt-1 text-xs text-violet-700">
                    Agri stock: {(linkData.agri.agriStock ?? 0).toLocaleString("en-IN")} · Biotech
                    stock: {(product?.currentStock ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Ram Agri crop</label>
                  <select
                    value={cropId}
                    onChange={(e) => {
                      setCropId(e.target.value);
                      setVarietyId("");
                    }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select crop</option>
                    {crops.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.cropName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Variety</label>
                  <select
                    value={varietyId}
                    onChange={(e) => setVarietyId(e.target.value)}
                    disabled={!cropId}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50"
                  >
                    <option value="">Select variety</option>
                    {varieties.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {transfers.length > 0 && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold text-gray-800">Recent Agri → Biotech transfers</p>
                  <ul className="max-h-40 space-y-2 overflow-y-auto text-xs text-gray-600">
                    {transfers.map((t, i) => (
                      <li key={i} className="rounded border border-gray-100 bg-gray-50 px-2 py-1.5">
                        {t.date ? new Date(t.date).toLocaleDateString("en-IN") : "—"} · +
                        {Number(t.quantity || 0).toLocaleString("en-IN")} · {t.grnNumber || t.transactionNumber}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-6 py-4">
          {linkData?.linked && (
            <button
              type="button"
              onClick={handleUnlink}
              disabled={saving || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Unlink className="h-4 w-4" />
              Unlink
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || !cropId || !varietyId}
            className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            {saving ? "Saving…" : "Save link"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
