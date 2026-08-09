import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, Link2, Sprout, Trash2 } from "lucide-react";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { isApiErrorResponse } from "network/core/responseParser";

/**
 * Add Biotech products and/or Ram Agri varieties to the same plant + subtype (1:N both sides).
 */
export default function SubtypeSeedLinkDialog({ open, context, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [source, setSource] = useState("biotech");
  const [products, setProducts] = useState([]);
  const [crops, setCrops] = useState([]);
  const [existingLinks, setExistingLinks] = useState([]);
  const [productId, setProductId] = useState("");
  const [cropId, setCropId] = useState("");
  const [varietyId, setVarietyId] = useState("");
  const [tentativePlantsPerPacket, setTentativePlantsPerPacket] = useState("");

  const { plantId, plantName, subtypeId, subtypeName } = context || {};

  const loadExisting = async () => {
    if (!plantId || !subtypeId) return;
    try {
      const res = await NetworkManager(API.INVENTORY.GET_SUBTYPE_INVENTORY_LINKS).request(
        {},
        { plantId, subtypeId }
      );
      if (isApiErrorResponse(res)) return;
      const body = res?.data?.data ?? res?.data;
      const links = Array.isArray(body)
        ? body
        : body?.links || body?.inventoryLinks || [];
      setExistingLinks(Array.isArray(links) ? links : []);
    } catch {
      /* keep prior */
    }
  };

  useEffect(() => {
    if (!open || !plantId || !subtypeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [prodRes, cropsRes] = await Promise.all([
          NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS).request(
            {},
            { category: "seeds", isActive: true }
          ),
          NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS).request(
            {},
            { productType: "seed" }
          ),
          loadExisting(),
        ]);
        if (cancelled) return;
        const prodBody = prodRes?.data?.data ?? prodRes?.data;
        setProducts(Array.isArray(prodBody) ? prodBody : prodBody?.data || []);

        const cropsBody = cropsRes?.data?.data ?? cropsRes?.data;
        const cropList = Array.isArray(cropsBody) ? cropsBody : cropsBody?.data || [];
        setCrops(cropList.filter((c) => (c.productType || "seed") === "seed"));

        setSource("biotech");
        setProductId("");
        setCropId("");
        setVarietyId("");
        setTentativePlantsPerPacket("");
      } catch {
        Toast.error("Failed to load options");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, plantId, subtypeId]);

  const agriVarieties = useMemo(() => {
    const crop = crops.find((c) => String(c._id) === String(cropId));
    return (crop?.varieties || []).filter((v) => v.isActive !== false);
  }, [crops, cropId]);

  const linkedProductIds = useMemo(() => {
    const ids = new Set();
    for (const l of existingLinks) {
      if (l.source === "BIOTECH") {
        const id = l.productId?._id || l.productId;
        if (id) ids.add(String(id));
      }
    }
    return ids;
  }, [existingLinks]);

  const linkedVarietyIds = useMemo(() => {
    const ids = new Set();
    for (const l of existingLinks) {
      if (l.source === "RAM_AGRI" && l.ramAgriVarietyId) {
        ids.add(String(l.ramAgriVarietyId));
      }
    }
    return ids;
  }, [existingLinks]);

  const selectableProducts = useMemo(() => {
    return products.filter((p) => {
      if (linkedProductIds.has(String(p._id))) return false;
      const onHere =
        String(p.plantId) === String(plantId) && String(p.subtypeId) === String(subtypeId);
      const unassigned = !p.plantId || !p.subtypeId;
      return onHere || unassigned;
    });
  }, [products, plantId, subtypeId, linkedProductIds]);

  const handleSave = async () => {
    if (source === "biotech" && !productId) {
      Toast.error("Select a Biotech seed product");
      return;
    }
    if (source === "agri" && (!cropId || !varietyId)) {
      Toast.error("Select a Ram Agri crop and variety");
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
        Toast.error(res.message || "Failed to add link");
        return;
      }

      Toast.success(
        source === "agri" ? "Ram Agri variety linked" : "Biotech product linked"
      );
      setProductId("");
      setCropId("");
      setVarietyId("");
      setTentativePlantsPerPacket("");
      await loadExisting();
      onSaved?.();
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to add link");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (link) => {
    const linkId = link._id;
    if (!linkId) return;
    setRemovingId(String(linkId));
    try {
      const res = await NetworkManager(API.INVENTORY.REMOVE_SUBTYPE_SEED_LINK).request({
        linkId,
        plantId,
        subtypeId,
        source: link.source,
        productId: link.productId?._id || link.productId,
        cropId: link.ramAgriCropId?._id || link.ramAgriCropId,
        varietyId: link.ramAgriVarietyId,
      });
      if (isApiErrorResponse(res)) {
        Toast.error(res.message || "Failed to remove");
        return;
      }
      Toast.success("Link removed");
      await loadExisting();
      onSaved?.();
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Failed to remove");
    } finally {
      setRemovingId(null);
    }
  };

  if (!open || !context) return null;

  const canSave =
    source === "biotech" ? Boolean(productId) : Boolean(cropId && varietyId);

  const linkLabel = (link) => {
    if (link.displayName) return link.displayName;
    if (link.source === "BIOTECH") {
      const p = link.productId;
      return p?.code ? `${p.code} — ${p.name}` : p?.name || "Biotech product";
    }
    const crop = link.ramAgriCropId;
    return (
      link.ramAgriVarietyName ||
      (crop?.cropName ? `${crop.cropName}` : "Ram Agri variety")
    );
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Manage subtype seed links</h2>
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
              <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs text-blue-900">
                You can link <strong>multiple Biotech products</strong> and{" "}
                <strong>multiple Ram Agri Input varieties</strong> to the same subtype.
              </div>

              {existingLinks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-gray-500">Current links</p>
                  <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {existingLinks.map((link) => (
                      <li
                        key={link._id}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <span
                            className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              link.source === "BIOTECH"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {link.source === "BIOTECH" ? "Biotech" : "Input"}
                          </span>
                          <span className="font-medium text-gray-900">{linkLabel(link)}</span>
                          {link.availableStock != null && (
                            <span className="ml-2 text-xs text-gray-500">
                              stock {Number(link.availableStock).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemove(link)}
                          disabled={removingId === String(link._id)}
                          className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Remove link"
                        >
                          {removingId === String(link._id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setSource("biotech")}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                    source === "biotech"
                      ? "bg-white text-teal-800 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Add Biotech
                </button>
                <button
                  type="button"
                  onClick={() => setSource("agri")}
                  className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                    source === "agri"
                      ? "bg-white text-green-800 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Add Ram Agri Input
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
                    <option value="">Select product to add</option>
                    {selectableProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.code} — {p.name}
                      </option>
                    ))}
                  </select>
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
                        {agriVarieties
                          .filter((v) => !linkedVarietyIds.has(String(v._id)))
                          .map((v) => (
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
            Done
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading || !canSave}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Add link
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
