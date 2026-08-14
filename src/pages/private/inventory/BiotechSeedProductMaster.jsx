import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  Sprout,
  Package,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers3,
} from "lucide-react";
import { API, NetworkManager } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { BiotechPlantDialog, BiotechVarietyDialog } from "./components/BiotechMasterDialogs";
import {
  emptyBiotechLinkForm,
  linkFormFromVariety,
  saveBiotechAgriLink,
  clearBiotechAgriLink,
} from "./components/BiotechVarietyLinkFields";
import BiotechBatchModal from "./components/BiotechBatchModal";
import BiotechProductStockLedgerModal from "./components/BiotechProductStockLedgerModal";
import { isApiErrorResponse } from "network/core/responseParser";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");

const parseOptionalDisplayOrder = (value) => {
  const t = String(value ?? "").trim();
  if (t === "" || t === "0") return undefined;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return "invalid";
  return n;
};

export default function BiotechSeedProductMaster() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plants, setPlants] = useState([]);
  const [units, setUnits] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [unlinkedOnly, setUnlinkedOnly] = useState(false);
  const [expandedPlants, setExpandedPlants] = useState({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [varietyDialogOpen, setVarietyDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteVarietyDialogOpen, setDeleteVarietyDialogOpen] = useState(false);

  const [editingPlant, setEditingPlant] = useState(null);
  const [editingVariety, setEditingVariety] = useState(null);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteVarietyTarget, setDeleteVarietyTarget] = useState(null);

  const [formData, setFormData] = useState({ plantName: "", description: "", displayOrder: "" });
  const [varietyFormData, setVarietyFormData] = useState({
    name: "",
    description: "",
    displayOrder: "",
    primaryUnit: "",
    secondaryUnit: "",
    conversionFactor: "",
  });
  const [linkForm, setLinkForm] = useState(emptyBiotechLinkForm());
  const [errors, setErrors] = useState({});

  const [batchProduct, setBatchProduct] = useState(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);

  const fetchPlants = async () => {
    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.GET_ALL_BIOTECH_SEED_PRODUCTS);
      const response = await instance.request({}, { search: searchTerm });
      if (response?.data?.success || response?.data?.status === "Success") {
        const data = response.data.data?.data || response.data.data || [];
        setPlants(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error(error);
      Toast.error("Error loading seed plants");
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_UNITS);
      const response = await instance.request();
      const body = response?.data;
      if (body?.success && body.data) setUnits(body.data);
      else if (body?.status === "Success" && body.data) setUnits(body.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchPlants, searchTerm ? 300 : 0);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const filteredPlants = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let rows = plants;
    if (q) {
      rows = plants.filter(
        (p) =>
          p.plantName?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.varieties?.some((v) => v.name?.toLowerCase().includes(q))
      );
    }
    if (!unlinkedOnly) return rows;
    return rows
      .map((p) => ({
        ...p,
        varieties: (p.varieties || []).filter(
          (v) => v.isActive !== false && !v.agriLink?.linked
        ),
      }))
      .filter((p) => p.varieties.length > 0);
  }, [plants, searchTerm, unlinkedOnly]);

  const stats = useMemo(() => {
    const totalVarieties = plants.reduce((s, p) => s + (p.varieties?.length || 0), 0);
    const linked = plants.reduce(
      (s, p) => s + (p.varieties || []).filter((v) => v.agriLink?.linked).length,
      0
    );
    return { plants: plants.length, varieties: totalVarieties, linked, unlinked: totalVarieties - linked };
  }, [plants]);

  const togglePlant = (id) => setExpandedPlants((p) => ({ ...p, [id]: !p[id] }));

  const openCreateDialog = () => {
    setEditingPlant(null);
    setFormData({ plantName: "", description: "", displayOrder: "" });
    setErrors({});
    setDialogOpen(true);
  };

  const openEditDialog = (plant) => {
    setEditingPlant(plant);
    setFormData({
      plantName: plant.plantName,
      description: plant.description || "",
      displayOrder:
        plant.displayOrder != null && plant.displayOrder !== ""
          ? String(plant.displayOrder)
          : "",
    });
    setErrors({});
    setDialogOpen(true);
  };

  const openVarietyDialog = (plant, variety = null) => {
    setSelectedPlant(plant);
    setEditingVariety(variety);
    setLinkForm(linkFormFromVariety(variety));
    if (variety) {
      setVarietyFormData({
        name: variety.name,
        description: variety.description || "",
        displayOrder:
          variety.displayOrder != null && variety.displayOrder !== ""
            ? String(variety.displayOrder)
            : "",
        primaryUnit: variety.primaryUnit?._id || variety.primaryUnit || "",
        secondaryUnit: variety.secondaryUnit?._id || variety.secondaryUnit || "",
        conversionFactor:
          variety.conversionFactor != null && variety.conversionFactor !== ""
            ? String(variety.conversionFactor)
            : "",
      });
    } else {
      setVarietyFormData({
        name: "",
        description: "",
        displayOrder: "",
        primaryUnit: "",
        secondaryUnit: "",
        conversionFactor: "",
      });
    }
    setErrors({});
    setVarietyDialogOpen(true);
  };

  const handlePlantSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!formData.plantName.trim()) nextErrors.plantName = "Plant name is required";
    const ord = parseOptionalDisplayOrder(formData.displayOrder);
    if (ord === "invalid") nextErrors.displayOrder = "Enter a whole number ≥ 1, or leave blank";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        plantName: formData.plantName.trim(),
        description: formData.description.trim(),
      };
      if (ord !== undefined && ord !== "invalid") payload.displayOrder = ord;

      let response;
      if (editingPlant) {
        response = await NetworkManager(API.INVENTORY.UPDATE_BIOTECH_SEED_PLANT).request(
          payload,
          [editingPlant._id]
        );
      } else {
        response = await NetworkManager(API.INVENTORY.CREATE_BIOTECH_SEED_PLANT).request(payload);
      }

      if (response?.data?.success || response?.data?.status === "Success") {
        Toast.success(`Plant ${editingPlant ? "updated" : "created"} successfully`);
        setDialogOpen(false);
        fetchPlants();
      } else {
        Toast.error(response?.data?.message || "Operation failed");
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || "Error saving plant");
    } finally {
      setLoading(false);
    }
  };

  const handleVarietySubmit = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!varietyFormData.name.trim()) nextErrors.name = "Variety name is required";
    if (!varietyFormData.primaryUnit) nextErrors.primaryUnit = "Primary unit is required";
    const vOrd = parseOptionalDisplayOrder(varietyFormData.displayOrder);
    if (vOrd === "invalid") nextErrors.displayOrder = "Enter a whole number ≥ 1, or leave blank";
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: varietyFormData.name.trim(),
        description: varietyFormData.description.trim(),
        primaryUnit: varietyFormData.primaryUnit,
        secondaryUnit: varietyFormData.secondaryUnit || undefined,
        conversionFactor:
          varietyFormData.conversionFactor === "" || varietyFormData.conversionFactor == null
            ? 1
            : Number(varietyFormData.conversionFactor),
        sowingPlantId: linkForm.sowingPlantId || undefined,
        sowingSubtypeId: linkForm.sowingSubtypeId || undefined,
        tentativePlantsPerPacket: linkForm.tentativePlantsPerPacket
          ? Number(linkForm.tentativePlantsPerPacket)
          : undefined,
      };
      if (vOrd !== undefined && vOrd !== "invalid") payload.displayOrder = vOrd;

      let response;
      if (editingVariety) {
        response = await NetworkManager(API.INVENTORY.UPDATE_BIOTECH_VARIETY).request(payload, [
          selectedPlant._id,
          editingVariety._id,
        ]);
      } else {
        response = await NetworkManager(API.INVENTORY.ADD_BIOTECH_VARIETY).request(payload, [
          selectedPlant._id,
        ]);
      }

      if (!(response?.data?.success || response?.data?.status === "Success")) {
        Toast.error(response?.data?.message || "Operation failed");
        return;
      }

      const saved = response.data.data;
      const matchVariety =
        editingVariety ||
        (saved?.varieties || []).find(
          (v) => String(v.name || "").toLowerCase() === payload.name.toLowerCase()
        );
      const productId =
        matchVariety?.inventoryLink?.productId ||
        matchVariety?.linkedInventoryProductId;

      if (productId && linkForm.agriCropId && linkForm.agriVarietyId) {
        const ok = await saveBiotechAgriLink(productId, linkForm);
        if (!ok) {
          setLoading(false);
          return;
        }
      } else if (productId && editingVariety?.agriLink?.linked && !linkForm.agriCropId) {
        await clearBiotechAgriLink(productId);
      }

      Toast.success(`Variety ${editingVariety ? "updated" : "added"} successfully`);
      setVarietyDialogOpen(false);
      fetchPlants();
    } catch (error) {
      Toast.error(error?.response?.data?.message || "Error saving variety");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeletePlant = async () => {
    if (!deleteTarget) return;
    try {
      setLoading(true);
      const response = await NetworkManager(API.INVENTORY.DELETE_BIOTECH_SEED_PLANT).request(
        {},
        [deleteTarget._id]
      );
      if (response?.data?.success || response?.data?.status === "Success") {
        Toast.success("Plant deleted");
        setDeleteDialogOpen(false);
        fetchPlants();
      } else {
        Toast.error(response?.data?.message || "Delete failed");
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteVariety = async () => {
    if (!deleteVarietyTarget) return;
    const { plant, variety } = deleteVarietyTarget;
    try {
      setLoading(true);
      const response = await NetworkManager(API.INVENTORY.DELETE_BIOTECH_VARIETY).request({}, [
        plant._id,
        variety._id,
      ]);
      if (response?.data?.success || response?.data?.status === "Success") {
        Toast.success("Variety deleted");
        setDeleteVarietyDialogOpen(false);
        fetchPlants();
      } else {
        Toast.error(response?.data?.message || "Delete failed");
      }
    } catch (error) {
      Toast.error(error?.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const openLedger = async (productId) => {
    setLedgerOpen(true);
    setLedgerData(null);
    setLedgerLoading(true);
    try {
      const res = await NetworkManager(API.INVENTORY.GET_PRODUCT_STOCK_LEDGER).request({}, [
        productId,
      ]);
      if (isApiErrorResponse(res)) {
        Toast.error(res.message || "Failed to load ledger");
        return;
      }
      setLedgerData(res?.data?.data ?? res?.data);
    } catch {
      Toast.error("Failed to load ledger");
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate("/u/inventory")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Inventory
        </button>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-brand-600 rounded-xl shadow-lg">
              <Sprout className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Ram Biotech Seed Master</h1>
              <p className="text-gray-600">
                Manage plants and variety/subtypes — same layout as Ram Agri Inputs master ·{" "}
                <button
                  type="button"
                  onClick={() => navigate("/u/inventory/seed-dual-links")}
                  className="font-semibold text-violet-700 hover:underline"
                >
                  view all sowing links
                </button>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreateDialog}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-brand-600 text-white px-6 py-3 rounded-xl shadow-lg font-semibold"
          >
            <Plus className="w-5 h-5" />
            Add Plant
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-teal-500">
          <p className="text-sm text-gray-600">Plants</p>
          <p className="text-3xl font-bold">{stats.plants}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-blue-500">
          <p className="text-sm text-gray-600">Varieties / Subtypes</p>
          <p className="text-3xl font-bold">{stats.varieties}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-violet-500">
          <p className="text-sm text-gray-600">Linked to Agri</p>
          <p className="text-3xl font-bold">{stats.linked}</p>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-5 border-l-4 border-amber-500">
          <p className="text-sm text-gray-600">Unlinked</p>
          <p className="text-3xl font-bold">{stats.unlinked}</p>
        </div>
      </div>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search plants or varieties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={unlinkedOnly}
            onChange={(e) => setUnlinkedOnly(e.target.checked)}
            className="rounded border-gray-300 text-teal-600"
          />
          Show unlinked varieties only
        </label>
      </div>

      {loading && plants.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlants.map((plant) => {
            const isExpanded = expandedPlants[plant._id] !== false;
            const varietiesCount = plant.varieties?.length || 0;
            return (
              <div
                key={plant._id}
                className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
              >
                <div
                  className="p-5 cursor-pointer hover:bg-gray-50"
                  onClick={() => togglePlant(plant._id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="p-2 bg-teal-100 rounded-lg">
                        <Sprout className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-800">{plant.plantName}</h3>
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                            {varietiesCount} Variet{varietiesCount !== 1 ? "ies" : "y"}
                          </span>
                        </div>
                        {plant.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-1">{plant.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(plant);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(plant);
                          setDeleteDialogOpen(true);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-gray-50 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        Varieties / Subtypes
                      </h4>
                      <button
                        type="button"
                        onClick={() => openVarietyDialog(plant)}
                        className="flex items-center gap-1.5 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-teal-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Variety
                      </button>
                    </div>

                    {plant.varieties?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {plant.varieties.map((variety) => (
                          <div
                            key={variety._id}
                            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-teal-300 group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <Package className="w-4 h-4 text-gray-400" />
                                  <span className="font-semibold text-gray-800 text-sm">{variety.name}</span>
                                  {variety.isActive !== false ? (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                      Inactive
                                    </span>
                                  )}
                                  {variety.inventoryLink?.linked && (
                                    <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs rounded-full">
                                      {variety.inventoryLink.productCode} · {fmt(variety.inventoryLink.currentStock)} stock
                                    </span>
                                  )}
                                  {variety.agriLink?.linked ? (
                                    <span className="px-2 py-0.5 bg-violet-100 text-violet-800 text-xs rounded-full">
                                      Agri: {variety.agriLink.cropName} · {variety.agriLink.varietyName}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-full">
                                      Agri unlinked
                                    </span>
                                  )}
                                </div>
                                {variety.description && (
                                  <p className="text-xs text-gray-500 ml-6 line-clamp-2">{variety.description}</p>
                                )}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => openVarietyDialog(plant, variety)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteVarietyTarget({ plant, variety });
                                    setDeleteVarietyDialogOpen(true);
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {variety.inventoryLink?.productId && (
                              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openLedger(variety.inventoryLink.productId)
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  Ledger
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setBatchProduct({
                                      id: variety.inventoryLink.productId,
                                      name: `${variety.inventoryLink.productCode} · ${variety.name}`,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 border border-teal-200 bg-teal-50 px-2 py-1 rounded-lg hover:bg-teal-100"
                                >
                                  <Layers3 className="w-3.5 h-3.5" />
                                  Batches ({variety.inventoryLink.batchCount ?? 0})
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500 mb-4">No varieties added yet</p>
                        <button
                          type="button"
                          onClick={() => openVarietyDialog(plant)}
                          className="inline-flex items-center gap-2 bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                        >
                          <Plus className="w-4 h-4" />
                          Add First Variety
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredPlants.length === 0 && (
            <div className="text-center py-20">
              <Sprout className="w-20 h-20 mx-auto text-gray-300 mb-4" />
              <p className="text-xl text-gray-500 mb-2">No plants found</p>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={openCreateDialog}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-brand-600 text-white px-6 py-3 rounded-xl font-semibold mt-4"
                >
                  <Plus className="w-5 h-5" />
                  Add Plant
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <BiotechPlantDialog
        open={dialogOpen}
        loading={loading}
        editing={editingPlant}
        formData={formData}
        errors={errors}
        onClose={() => setDialogOpen(false)}
        onChange={setFormData}
        onSubmit={handlePlantSubmit}
      />

      <BiotechVarietyDialog
        open={varietyDialogOpen}
        loading={loading}
        selectedPlant={selectedPlant}
        editingVariety={editingVariety}
        formData={varietyFormData}
        linkForm={linkForm}
        errors={errors}
        units={units}
        onClose={() => setVarietyDialogOpen(false)}
        onFormChange={setVarietyFormData}
        onLinkChange={setLinkForm}
        onSubmit={handleVarietySubmit}
      />

      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-semibold text-gray-800 mb-2">Delete plant?</p>
            <p className="text-sm text-gray-600 mb-4">
              Delete &quot;{deleteTarget?.plantName}&quot; and all its varieties?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="flex-1 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePlant}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteVarietyDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-semibold text-gray-800 mb-2">Delete variety?</p>
            <p className="text-sm text-gray-600 mb-4">
              Remove &quot;{deleteVarietyTarget?.variety?.name}&quot; from master?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteVarietyDialogOpen(false)}
                className="flex-1 py-2 border rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteVariety}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <BiotechBatchModal
        open={Boolean(batchProduct)}
        productId={batchProduct?.id}
        productName={batchProduct?.name}
        onClose={() => setBatchProduct(null)}
      />
      <BiotechProductStockLedgerModal
        open={ledgerOpen}
        onClose={() => {
          setLedgerOpen(false);
          setLedgerData(null);
        }}
        loading={ledgerLoading}
        data={ledgerData}
      />
    </div>
  );
}
