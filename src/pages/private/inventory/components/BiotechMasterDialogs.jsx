import React from "react";
import { X, Save } from "lucide-react";
import BiotechVarietyLinkFields from "./BiotechVarietyLinkFields";

export function BiotechPlantDialog({
  open,
  loading,
  editing,
  formData,
  errors,
  onClose,
  onChange,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-800">
            {editing ? "Edit Plant" : "Add New Plant"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Plant Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.plantName}
              onChange={(e) => onChange({ ...formData, plantName: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                errors.plantName ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="e.g., Watermelon"
            />
            {errors.plantName && <p className="text-red-500 text-sm mt-1">{errors.plantName}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              List order <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min={1}
              value={formData.displayOrder}
              onChange={(e) =>
                onChange({ ...formData, displayOrder: e.target.value === "" ? "" : e.target.value })
              }
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                errors.displayOrder ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Leave blank to add at end"
            />
            {errors.displayOrder && (
              <p className="text-red-500 text-sm mt-1">{errors.displayOrder}</p>
            )}
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-500 to-brand-600 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editing ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BiotechVarietyDialog({
  open,
  loading,
  selectedPlant,
  editingVariety,
  formData,
  linkForm,
  errors,
  units,
  onClose,
  onFormChange,
  onLinkChange,
  onSubmit,
}) {
  if (!open || !selectedPlant) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-800 truncate">
              {editingVariety ? "Edit Variety / Subtype" : "Add Variety / Subtype"}
            </h2>
            <p className="text-xs text-gray-500 truncate">For: {selectedPlant.plantName}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={onSubmit} className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Variety / Subtype Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
                placeholder="e.g., Veejay"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                List order <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min={1}
                value={formData.displayOrder}
                onChange={(e) =>
                  onFormChange({
                    ...formData,
                    displayOrder: e.target.value === "" ? "" : e.target.value,
                  })
                }
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                  errors.displayOrder ? "border-red-500" : "border-gray-300"
                }`}
              />
              {errors.displayOrder && (
                <p className="text-red-500 text-xs mt-1">{errors.displayOrder}</p>
              )}
            </div>
            <div className="space-y-3 pt-3 border-t border-gray-200">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Unit of Measurement
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Primary Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.primaryUnit}
                    onChange={(e) => onFormChange({ ...formData, primaryUnit: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500 ${
                      errors.primaryUnit ? "border-red-500" : "border-gray-300"
                    }`}
                  >
                    <option value="">Select primary unit</option>
                    {units.map((unit) => (
                      <option key={unit._id} value={unit._id}>
                        {unit.name} ({unit.abbreviation})
                      </option>
                    ))}
                  </select>
                  {errors.primaryUnit && (
                    <p className="text-red-500 text-xs mt-1">{errors.primaryUnit}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Secondary Unit
                  </label>
                  <select
                    value={formData.secondaryUnit}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        secondaryUnit: e.target.value,
                        conversionFactor: e.target.value ? formData.conversionFactor : "",
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="">Optional</option>
                    {units
                      .filter((u) => u._id !== formData.primaryUnit)
                      .map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.name} ({unit.abbreviation})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              {formData.secondaryUnit && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Conversion Factor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.conversionFactor}
                    onChange={(e) =>
                      onFormChange({
                        ...formData,
                        conversionFactor: e.target.value === "" ? "" : e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    placeholder="e.g., 1000"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    1 primary unit ={" "}
                    {formData.conversionFactor === "" || formData.conversionFactor == null
                      ? "—"
                      : formData.conversionFactor}{" "}
                    secondary unit
                  </p>
                </div>
              )}
            </div>
            <BiotechVarietyLinkFields value={linkForm} onChange={onLinkChange} />
            <div className="flex space-x-3 pt-4 sticky bottom-0 bg-white border-t border-gray-100 -mx-4 px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-lg text-sm font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-brand-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {editingVariety ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
