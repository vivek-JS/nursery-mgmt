import React, { useState, useEffect } from 'react';
import { X, Plus, Package, Check } from 'lucide-react';
import { API, NetworkManager } from 'network/core';

const UnitModal = ({ open, onClose, onSuccess, existingUnits = [], unitType = 'primary' }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    abbreviation: '',
    type: 'quantity',
    requiresSecondaryUnit: false,
    compatibleSecondaryUnits: [], // Array of unit IDs that can be used as secondary
  });
  const [errors, setErrors] = useState({});
  const [availableUnits, setAvailableUnits] = useState([]);
  const [showNestedUnitModal, setShowNestedUnitModal] = useState(false);
  const [nestedUnitData, setNestedUnitData] = useState({
    name: '',
    abbreviation: '',
    type: 'quantity',
  });
  const [nestedUnitErrors, setNestedUnitErrors] = useState({});
  const [creatingNestedUnit, setCreatingNestedUnit] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAvailableUnits();
      resetForm();
    }
  }, [open]);

  const fetchAvailableUnits = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_UNITS);
      const response = await instance.request();
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success && apiResponse.data) {
          setAvailableUnits(apiResponse.data);
        } else if (apiResponse.status === 'Success' && apiResponse.data) {
          setAvailableUnits(apiResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      abbreviation: '',
      type: 'quantity',
      requiresSecondaryUnit: false,
      compatibleSecondaryUnits: [],
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSecondaryUnitToggle = (unitId) => {
    if (unitId === '__new__') {
      setShowNestedUnitModal(true);
      return;
    }
    setFormData({
      ...formData,
      compatibleSecondaryUnits: formData.compatibleSecondaryUnits.includes(unitId)
        ? formData.compatibleSecondaryUnits.filter(id => id !== unitId)
        : [...formData.compatibleSecondaryUnits, unitId],
    });
  };

  const handleNestedUnitChange = (e) => {
    const { name, value } = e.target;
    setNestedUnitData({
      ...nestedUnitData,
      [name]: value,
    });
    if (nestedUnitErrors[name]) {
      setNestedUnitErrors({ ...nestedUnitErrors, [name]: '' });
    }
  };

  const validateNestedUnit = () => {
    const newErrors = {};
    if (!nestedUnitData.name.trim()) newErrors.name = 'Unit name is required';
    if (!nestedUnitData.abbreviation.trim()) newErrors.abbreviation = 'Abbreviation is required';
    
    const duplicateName = existingUnits.find(
      u => u.name?.toLowerCase() === nestedUnitData.name.trim().toLowerCase()
    );
    if (duplicateName) newErrors.name = 'Unit with this name already exists';
    
    const duplicateAbbr = existingUnits.find(
      u => u.abbreviation?.toLowerCase() === nestedUnitData.abbreviation.trim().toLowerCase()
    );
    if (duplicateAbbr) newErrors.abbreviation = 'Unit with this abbreviation already exists';

    setNestedUnitErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createNestedUnit = async () => {
    if (!validateNestedUnit()) return;

    setCreatingNestedUnit(true);
    try {
      const instance = NetworkManager(API.INVENTORY.CREATE_UNIT);
      const response = await instance.request({
        name: nestedUnitData.name.trim(),
        abbreviation: nestedUnitData.abbreviation.trim(),
        type: nestedUnitData.type,
        conversionToBase: 1,
        requiresSecondaryUnit: false,
      });

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          const createdUnit = apiResponse.data;
          // Refresh available units
          await fetchAvailableUnits();
          // Automatically add to compatible secondary units
          setFormData({
            ...formData,
            compatibleSecondaryUnits: [...formData.compatibleSecondaryUnits, createdUnit._id],
          });
          // Reset nested form
          setNestedUnitData({
            name: '',
            abbreviation: '',
            type: 'quantity',
          });
          setNestedUnitErrors({});
          setShowNestedUnitModal(false);
        } else {
          alert('Error creating unit: ' + (apiResponse.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error creating nested unit:', error);
      alert(error?.response?.data?.message || error?.message || 'Error creating unit');
    } finally {
      setCreatingNestedUnit(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Unit name is required';
    if (!formData.abbreviation.trim()) newErrors.abbreviation = 'Abbreviation is required';
    if (formData.name.trim().length < 2) newErrors.name = 'Unit name must be at least 2 characters';
    if (formData.abbreviation.trim().length < 1) newErrors.abbreviation = 'Abbreviation is required';
    
    // Check for duplicate name
    const duplicateName = existingUnits.find(
      u => u.name?.toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (duplicateName) newErrors.name = 'Unit with this name already exists';
    
    // Check for duplicate abbreviation
    const duplicateAbbr = existingUnits.find(
      u => u.abbreviation?.toLowerCase() === formData.abbreviation.trim().toLowerCase()
    );
    if (duplicateAbbr) newErrors.abbreviation = 'Unit with this abbreviation already exists';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const instance = NetworkManager(API.INVENTORY.CREATE_UNIT);
      const response = await instance.request({
        name: formData.name.trim(),
        abbreviation: formData.abbreviation.trim(),
        type: formData.type,
        conversionToBase: 1,
        requiresSecondaryUnit: formData.requiresSecondaryUnit,
        // Store compatible secondary units as metadata (we'll enhance backend later)
        compatibleSecondaryUnits: formData.compatibleSecondaryUnits,
      });

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          const createdUnit = apiResponse.data;
          if (onSuccess) {
            onSuccess(createdUnit);
          }
          resetForm();
          onClose();
        } else {
          alert('Error creating unit: ' + (apiResponse.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error creating unit:', error);
      alert(error?.response?.data?.message || error?.message || 'Error creating unit');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Add New Unit</h2>
                <p className="text-sm text-gray-600">
                  Create a new measurement unit for{' '}
                  <span className="font-semibold text-blue-600 capitalize">
                    {unitType === 'primary' ? 'Primary' : 'Secondary'} Unit
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Unit Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Kilogram"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Abbreviation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="abbreviation"
                      value={formData.abbreviation}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.abbreviation ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., kg"
                      maxLength={10}
                    />
                    {errors.abbreviation && (
                      <p className="text-red-500 text-xs mt-1">{errors.abbreviation}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Unit Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="quantity">Quantity</option>
                    <option value="weight">Weight</option>
                    <option value="volume">Volume</option>
                    <option value="length">Length</option>
                    <option value="area">Area</option>
                  </select>
                </div>
              </div>

              {/* Secondary Unit Configuration */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    name="requiresSecondaryUnit"
                    checked={formData.requiresSecondaryUnit}
                    onChange={handleChange}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="text-sm font-semibold text-gray-700">
                    This unit requires a secondary unit
                  </label>
                </div>

                {formData.requiresSecondaryUnit && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Compatible Secondary Units
                      <span className="text-xs font-normal text-gray-500 ml-2">
                        (Select units that can be used as secondary units with this unit)
                      </span>
                    </label>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {availableUnits.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No other units available. Create more units first.
                        </p>
                      ) : (
                        <>
                          {availableUnits.map((unit) => (
                            <label
                              key={unit._id}
                              className="flex items-center space-x-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={formData.compatibleSecondaryUnits.includes(unit._id)}
                                onChange={() => handleSecondaryUnitToggle(unit._id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-800">
                                  {unit.name}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  ({unit.abbreviation})
                                </span>
                                <span className="text-xs text-gray-400 ml-2 capitalize">
                                  {unit.type}
                                </span>
                              </div>
                              {formData.compatibleSecondaryUnits.includes(unit._id) && (
                                <Check className="w-4 h-4 text-green-500" />
                              )}
                            </label>
                          ))}
                          {/* Add New Unit Option */}
                          <button
                            type="button"
                            onClick={() => setShowNestedUnitModal(true)}
                            className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-400 hover:from-blue-100 hover:to-blue-200 transition-all cursor-pointer"
                          >
                            <Plus className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-600">
                              Add New Unit
                            </span>
                          </button>
                        </>
                      )}
                    </div>
                    {formData.compatibleSecondaryUnits.length > 0 && (
                      <p className="text-xs text-gray-500 mt-3">
                        {formData.compatibleSecondaryUnits.length} secondary unit(s) selected
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Create Unit</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Nested Unit Creation Modal */}
      {showNestedUnitModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-60 transition-opacity"
            onClick={() => setShowNestedUnitModal(false)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Nested Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
                <div className="flex items-center space-x-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-800">Create New Unit</h3>
                </div>
                <button
                  onClick={() => {
                    setShowNestedUnitModal(false);
                    setNestedUnitData({ name: '', abbreviation: '', type: 'quantity' });
                    setNestedUnitErrors({});
                  }}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Nested Modal Content */}
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Unit Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={nestedUnitData.name}
                    onChange={handleNestedUnitChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      nestedUnitErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Seeds"
                  />
                  {nestedUnitErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{nestedUnitErrors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Abbreviation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="abbreviation"
                    value={nestedUnitData.abbreviation}
                    onChange={handleNestedUnitChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      nestedUnitErrors.abbreviation ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., seeds"
                    maxLength={10}
                  />
                  {nestedUnitErrors.abbreviation && (
                    <p className="text-red-500 text-xs mt-1">{nestedUnitErrors.abbreviation}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Unit Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    value={nestedUnitData.type}
                    onChange={handleNestedUnitChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="quantity">Quantity</option>
                    <option value="weight">Weight</option>
                    <option value="volume">Volume</option>
                    <option value="length">Length</option>
                    <option value="area">Area</option>
                  </select>
                </div>
              </div>

              {/* Nested Modal Footer */}
              <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    setShowNestedUnitModal(false);
                    setNestedUnitData({ name: '', abbreviation: '', type: 'quantity' });
                    setNestedUnitErrors({});
                  }}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={createNestedUnit}
                  disabled={creatingNestedUnit}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
                >
                  {creatingNestedUnit ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create & Add</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitModal;

