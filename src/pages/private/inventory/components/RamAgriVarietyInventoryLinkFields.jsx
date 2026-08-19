import React, { useEffect, useMemo, useState } from "react";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";

/**
 * Sowing link for a Ram Agri seed variety (plant + subtype → request packets).
 * Stock is not mirrored here; inventory approve of a packet request creates an internal PO.
 */
export default function RamAgriVarietyInventoryLinkFields({
  cropId,
  varietyId,
  enabled,
  value,
  onChange,
  errors = {},
}) {
  const [plants, setPlants] = useState([]);
  const [loadingLink, setLoadingLink] = useState(false);
  const [linkedProduct, setLinkedProduct] = useState(null);

  const selectedPlant = useMemo(
    () => plants.find((p) => String(p._id) === String(value.plantId)) || null,
    [plants, value.plantId]
  );

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      try {
        const instance = NetworkManager(API.plantCms.GET_PLANTS);
        const response = await instance.request();
        const apiResponse = response?.data;
        const list =
          apiResponse?.data ||
          (apiResponse?.success ? apiResponse.data : []) ||
          [];
        setPlants(Array.isArray(list) ? list.filter((p) => p.sowingAllowed !== false) : []);
      } catch (e) {
        console.error("Failed to load plants for link", e);
      }
    })();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !cropId || !varietyId) {
      setLinkedProduct(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingLink(true);
      try {
        const instance = NetworkManager(API.INVENTORY.GET_VARIETY_INVENTORY_LINK);
        const response = await instance.request({}, [cropId, varietyId]);
        const data = response?.data?.data || response?.data;
        if (cancelled) return;
        if (data?.linked) {
          setLinkedProduct(data.product);
          onChange({
            plantId: data.plantId || "",
            subtypeId: data.subtypeId || "",
            tentativePlantsPerPacket:
              data.product?.tentativePlantsPerPacket != null
                ? String(data.product.tentativePlantsPerPacket)
                : "",
          });
        } else {
          setLinkedProduct(null);
        }
      } catch (e) {
        if (!cancelled) console.error("Failed to load inventory link", e);
      } finally {
        if (!cancelled) setLoadingLink(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, cropId, varietyId, onChange]);

  if (!enabled) return null;

  return (
    <div className="space-y-3 pt-3 border-t border-emerald-200 bg-emerald-50/50 rounded-lg p-3 -mx-1">
      <div>
        <h3 className="text-xs font-semibold text-emerald-900 uppercase tracking-wide">
          Sowing / inventory link
        </h3>
        <p className="text-[11px] text-emerald-800/80 mt-0.5">
          Map this variety to nursery plant + subtype so sowing can request packets. When inventory
          approves that request, an internal PO moves stock Ram Agri → Ram Biotech.
        </p>
        {loadingLink && (
          <p className="text-[11px] text-gray-500 mt-1">Loading existing link…</p>
        )}
        {linkedProduct && (
          <p className="text-[11px] text-emerald-700 mt-1 font-medium">
            Linked product: {linkedProduct.code} — {linkedProduct.name}
            {linkedProduct.availablePackets != null && linkedProduct.availablePackets > 0
              ? ` · ${linkedProduct.availablePackets} pkt available`
              : linkedProduct.currentStock != null
                ? ` · stock ${linkedProduct.currentStock}`
                : " · 0 pkt available"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Nursery plant <span className="text-red-500">*</span>
          </label>
          <select
            value={value.plantId || ""}
            onChange={(e) =>
              onChange({
                ...value,
                plantId: e.target.value,
                subtypeId: "",
              })
            }
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 ${
              errors.plantId ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select plant</option>
            {plants.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.plantId && <p className="text-red-500 text-xs mt-1">{errors.plantId}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1.5">
            Subtype <span className="text-red-500">*</span>
          </label>
          <select
            value={value.subtypeId || ""}
            onChange={(e) => onChange({ ...value, subtypeId: e.target.value })}
            disabled={!value.plantId}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 ${
              errors.subtypeId ? "border-red-500" : "border-gray-300"
            }`}
          >
            <option value="">Select subtype</option>
            {(selectedPlant?.subtypes || []).map((st) => (
              <option key={st._id} value={st._id}>
                {st.name}
              </option>
            ))}
          </select>
          {errors.subtypeId && <p className="text-red-500 text-xs mt-1">{errors.subtypeId}</p>}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
          Tentative plants per packet
        </label>
        <input
          type="number"
          min={1}
          value={value.tentativePlantsPerPacket || ""}
          onChange={(e) =>
            onChange({ ...value, tentativePlantsPerPacket: e.target.value })
          }
          className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          placeholder="e.g. 1000"
        />
      </div>
    </div>
  );
}

/** Persist link after variety is saved. Returns true on success. */
export async function saveVarietyInventoryLink(cropId, varietyId, linkForm) {
  if (!cropId || !varietyId) return true;
  const plantId = linkForm?.plantId?.trim?.() || linkForm?.plantId;
  const subtypeId = linkForm?.subtypeId?.trim?.() || linkForm?.subtypeId;
  if (!plantId || !subtypeId) return true;

  try {
    const instance = NetworkManager(API.INVENTORY.UPSERT_VARIETY_INVENTORY_LINK);
    const payload = {
      plantId,
      subtypeId,
      tentativePlantsPerPacket: linkForm.tentativePlantsPerPacket
        ? Number(linkForm.tentativePlantsPerPacket)
        : undefined,
    };
    const response = await instance.request(payload, [cropId, varietyId]);
    if (response?.data?.success || response?.data?.status === "Success") {
      Toast.success("Sowing inventory link saved");
      return true;
    }
    Toast.error(response?.data?.message || "Failed to save inventory link");
    return false;
  } catch (error) {
    Toast.error(error?.response?.data?.message || "Failed to save inventory link");
    return false;
  }
}

/** Remove sowing plant/subtype mapping for a variety. */
export async function clearVarietyInventoryLink(cropId, varietyId) {
  if (!cropId || !varietyId) return true;
  try {
    const instance = NetworkManager(API.INVENTORY.UPSERT_VARIETY_INVENTORY_LINK);
    const response = await instance.request({ clearLink: true }, [cropId, varietyId]);
    if (response?.data?.success || response?.data?.status === "Success") {
      Toast.success("Sowing link removed");
      return true;
    }
    Toast.error(response?.data?.message || "Failed to remove link");
    return false;
  } catch (error) {
    Toast.error(error?.response?.data?.message || "Failed to remove link");
    return false;
  }
}

export const emptyLinkForm = () => ({
  plantId: "",
  subtypeId: "",
  tentativePlantsPerPacket: "",
});
