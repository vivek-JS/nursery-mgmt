import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Link2, Sprout } from "lucide-react";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { isApiErrorResponse } from "network/core/responseParser";

/**
 * One seed per plant + subtype — from Ram Biotech SKU OR Ram Agri Input variety (not both).
 */
export default function SubtypeSeedLinkDialog({ open, context, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState("biotech");
  const [products, setProducts] = useState([]);
  const [crops, setCrops] = useState([]);
  const [productId, setProductId] = useState("");
  const [cropId, setCropId] = useState("");
  const [varietyId, setVarietyId] = useState("");
  const [tentativePlantsPerPacket, setTentativePlantsPerPacket] = useState("");

  const { plantId, plantName, subtypeId, subtypeName, products: existingProducts = [] } =
    context || {};

  useEffect(() => {
    if (!open || !plantId || !subtypeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [prodRes, cropsRes] = await Promise.all([
          NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS).request({}, { category: "seeds", isActive: true }),
          NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS).request({}, { productType: "seed" }),
        ]);
        if (cancelled) return;
        const prodBody = prodRes?.data?.data ?? prodRes?.data;
        setProducts(Array.isArray(prodBody) ? prodBody : prodBody?.data || []);

        const cropsBody = cropsRes?.data?.data ?? cropsRes?.data;
        const cropList = Array.isArray(cropsBody) ? cropsBody : cropsBody?.data || [];
        setCrops(cropList.filter((c) => (c.productType || "seed") === "seed"));

        const primary = existingProducts[0];
        if (primary?.agriLink?.linked) {
          setSource("agri");
          setCropId(String(primary.agriLink.cropId));
          setVarietyId(String(primary.agriLink.varietyId));
          setProductId(String(primary._id));
        } else if (primary?._id) {
          setSource("biotech");
          setProductId(String(primary._id));
          setCropId("");
          setVarietyId("");
        } else {
          setSource("biotech");
          setProductId("");
          setCropId("");
          setVarietyId("");
        }
        setTentativePlantsPerPacket("");
      } catch (e) {
        Toast.error("Failed to load options");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, plantId, subtypeId, existingProducts]);

  const agriVarieties = useMemo(() => {
    const crop = crops.find((c) => String(c._id) === String(cropId));
    return (crop?.varieties || []).filter((v) => v.isActive !== false);
  }, [crops, cropId]);

  const selectableProducts = useMemo(() => {
    return products.filter((p) => {
      const onHere =
        String(p.plantId) === String(plantId) && String(p.subtypeId) === String(subtypeId);
      const unassigned = !p.plantId || !p.subtypeId;
      return onHere || unassigned;
    });
  }, [products, plantId, subtypeId]);

  const handleSourceChange = (next) => {
    setSource(next);
    if (next === "biotech") {
      setCropId("");
      setVarietyId("");
    } else {
      setProductId("");
    }
  };

  const handleSave = async () => {
    if (source === "biotech" && !productId) {
      Toast.error("Select one Biotech seed product");
      return;
    }
    if (source === "agri" && (!cropId || !varietyId)) {
      Toast.error("Select one Ram Agri crop and variety");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        plantId,
        subtypeId,
        source,
        ...(source === "biotech" ? { productId } : { cropId, varietyId }),
        ...(source === "agri" && tentativePlantsPerPacket
          ? { tentativePlantsPerPacket: Number(tentativePlantsPerPacket) }
          : {}),
      };

      const res = await NetworkManager(API.INVENTORY.ASSIGN_SUBTYPE_SEED).request(payload);
      if (isApiErrorResponse(res)) {
        Toast.error(res.message || "Failed to save");
        return;
      }

      Toast.success(
        source === "agri"
          ? "Ram Agri variety linked to this subtype (one seed only)"
          : "Biotech seed assigned to this subtype (one seed only)"
      );
      onSaved?.();
      onClose();
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !context) return null;

  const canSave =
    source === "biotech" ? Boolean(productId) : Boolean(cropId && varietyId);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Link one seed to subtype</h2>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Sprout className="h-3.5 w-3.5" />
              {plantName} · {subtypeName}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
                Only <strong>one seed</strong> per subtype — choose either a <strong>Biotech</strong> SKU
                or a <strong>Ram Agri Input</strong> variety. Linking a new one replaces the previous seed.
              </div>

              <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  type="button"
                  onClick={() => handleSourceChange("biotech")}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                    source === "biotech"
                      ? "bg-white text-teal-800 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  From Ram Biotech
                </button>
                <button
                  type="button"
                  onClick={() => handleSourceChange("agri")}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                    source === "agri"
                      ? "bg-white text-green-800 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  From Ram Agri Input
                </button>
              </div>

              {source === "biotech" ? (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Biotech seed SKU <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Select one seed product</option>
                    {selectableProducts.map((p) => {
                      const onHere =
                        String(p.plantId) === String(plantId) &&
                        String(p.subtypeId) === String(subtypeId);
                      return (
                        <option key={p._id} value={p._id}>
                          {p.code} — {p.name}
                          {onHere ? " (current)" : " (unassigned)"}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 mt-1.5">
                    Products already linked to another subtype are hidden.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Agri crop <span className="text-red-500">*</span>
                      </label>
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
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Agri variety <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={varietyId}
                        onChange={(e) => setVarietyId(e.target.value)}
                        disabled={!cropId}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100"
                      >
                        <option value="">Select variety</option>
                        {agriVarieties.map((v) => (
                          <option key={v._id} value={v._id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Tentative plants per packet
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={tentativePlantsPerPacket}
                      onChange={(e) => setTentativePlantsPerPacket(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      placeholder="e.g. 1000"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Creates or reuses one Biotech seed SKU for this subtype automatically.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-4 flex gap-3 shrink-0">
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
            disabled={saving || loading || !canSave}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Save seed link
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
