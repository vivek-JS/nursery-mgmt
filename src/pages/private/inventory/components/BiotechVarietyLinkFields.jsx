import React, { useEffect, useMemo, useState } from "react";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";

export const emptyBiotechLinkForm = () => ({
  sowingPlantId: "",
  sowingSubtypeId: "",
  tentativePlantsPerPacket: "",
  agriCropId: "",
  agriVarietyId: "",
});

export const linkFormFromVariety = (variety) => {
  if (!variety) return emptyBiotechLinkForm();
  return {
    sowingPlantId: variety.sowingPlantId ? String(variety.sowingPlantId) : "",
    sowingSubtypeId: variety.sowingSubtypeId ? String(variety.sowingSubtypeId) : "",
    tentativePlantsPerPacket:
      variety.tentativePlantsPerPacket != null ? String(variety.tentativePlantsPerPacket) : "",
    agriCropId: variety.agriLink?.linked ? String(variety.agriLink.cropId) : "",
    agriVarietyId: variety.agriLink?.linked ? String(variety.agriLink.varietyId) : "",
  };
};

export async function saveBiotechAgriLink(productId, { agriCropId, agriVarietyId }) {
  if (!productId) return true;
  if (!agriCropId || !agriVarietyId) return true;
  try {
    const instance = NetworkManager(API.INVENTORY.PATCH_PRODUCT_AGRI_LINK);
    const response = await instance.request(
      { cropId: agriCropId, varietyId: agriVarietyId },
      [productId]
    );
    if (response?.data?.success || response?.data?.status === "Success") {
      Toast.success("Linked to Ram Agri variety");
      return true;
    }
    Toast.error(response?.data?.message || "Failed to save Agri link");
    return false;
  } catch (error) {
    Toast.error(error?.response?.data?.message || "Failed to save Agri link");
    return false;
  }
}

export async function clearBiotechAgriLink(productId) {
  if (!productId) return true;
  try {
    const instance = NetworkManager(API.INVENTORY.PATCH_PRODUCT_AGRI_LINK);
    const response = await instance.request({ clearLink: true }, [productId]);
    if (response?.data?.success || response?.data?.status === "Success") {
      Toast.success("Ram Agri link removed");
      return true;
    }
    Toast.error(response?.data?.message || "Failed to remove Agri link");
    return false;
  } catch (error) {
    Toast.error(error?.response?.data?.message || "Failed to remove Agri link");
    return false;
  }
}

export default function BiotechVarietyLinkFields({ value, onChange }) {
  const [plants, setPlants] = useState([]);
  const [agriCrops, setAgriCrops] = useState([]);

  const selectedPlant = useMemo(
    () => plants.find((p) => String(p._id) === String(value.sowingPlantId)) || null,
    [plants, value.sowingPlantId]
  );

  const agriVarieties = useMemo(() => {
    const crop = agriCrops.find((c) => String(c._id) === String(value.agriCropId));
    return (crop?.varieties || []).filter((v) => v.isActive !== false);
  }, [agriCrops, value.agriCropId]);

  useEffect(() => {
    (async () => {
      try {
        const [plantsRes, cropsRes] = await Promise.all([
          NetworkManager(API.plantCms.GET_PLANTS).request(),
          NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS).request({}, { productType: "seed" }),
        ]);
        const plantList =
          plantsRes?.data?.data ||
          (plantsRes?.data?.success ? plantsRes?.data?.data : []) ||
          [];
        setPlants(Array.isArray(plantList) ? plantList.filter((p) => p.sowingAllowed !== false) : []);

        const cropsBody = cropsRes?.data?.data ?? cropsRes?.data;
        const list = Array.isArray(cropsBody) ? cropsBody : cropsBody?.data || [];
        setAgriCrops(list.filter((c) => (c.productType || "seed") === "seed"));
      } catch (e) {
        console.error("Failed to load link options", e);
      }
    })();
  }, []);

  return (
    <>
      <div className="space-y-3 pt-3 border-t border-teal-200 bg-teal-50/50 rounded-lg p-3 -mx-1">
        <div>
          <h3 className="text-xs font-semibold text-teal-900 uppercase tracking-wide">
            Nursery plant / subtype
          </h3>
          <p className="text-[11px] text-teal-800/80 mt-0.5">
            Optional sowing mapping (same as Ram Agri master plant + subtype link).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Nursery plant</label>
            <select
              value={value.sowingPlantId || ""}
              onChange={(e) =>
                onChange({ ...value, sowingPlantId: e.target.value, sowingSubtypeId: "" })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select plant</option>
              {plants.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Subtype</label>
            <select
              value={value.sowingSubtypeId || ""}
              onChange={(e) => onChange({ ...value, sowingSubtypeId: e.target.value })}
              disabled={!value.sowingPlantId}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
            >
              <option value="">Select subtype</option>
              {(selectedPlant?.subtypes || []).map((st) => (
                <option key={st._id} value={st._id}>
                  {st.name}
                </option>
              ))}
            </select>
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
            onChange={(e) => onChange({ ...value, tentativePlantsPerPacket: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
            placeholder="e.g. 1000"
          />
        </div>
      </div>

      <div className="space-y-3 pt-3 border-t border-violet-200 bg-violet-50/50 rounded-lg p-3 -mx-1">
        <div>
          <h3 className="text-xs font-semibold text-violet-900 uppercase tracking-wide">
            Ram Agri Input link
          </h3>
          <p className="text-[11px] text-violet-800/80 mt-0.5">
            Link this Biotech seed to a Ram Agri crop + variety (separate stock bins).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Agri crop</label>
            <select
              value={value.agriCropId || ""}
              onChange={(e) =>
                onChange({ ...value, agriCropId: e.target.value, agriVarietyId: "" })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select crop</option>
              {agriCrops.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.cropName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Agri variety</label>
            <select
              value={value.agriVarietyId || ""}
              onChange={(e) => onChange({ ...value, agriVarietyId: e.target.value })}
              disabled={!value.agriCropId}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 disabled:bg-gray-100"
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
      </div>
    </>
  );
}
