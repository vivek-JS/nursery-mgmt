import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Package, Plus, X, Info } from 'lucide-react';
import { API, NetworkManager } from 'network/core';
import UnitModal from 'components/Modals/UnitModal';

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [unitModalType, setUnitModalType] = useState('primary'); // 'primary' or 'secondary'
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: '',
    primaryUnit: '',
    secondaryUnit: '',
    conversionFactor: 1,
    minStockLevel: 0,
    maxStockLevel: '',
    reorderLevel: 0,
    hsn: '',
    gst: 0,
    plantId: '',
    subtypeId: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUnits();
    fetchCategories();
    if (formData.category === 'seeds' || formData.category === 'plants') {
      fetchPlants();
    }
    if (isEditMode) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    // Fetch plants when category changes to "seeds" or "plants"
    if (formData.category === 'seeds' || formData.category === 'plants') {
      fetchPlants();
    } else {
      // Clear plant and subtype when category is not "seeds" or "plants"
      setSelectedPlant(null);
      setFormData(prev => ({ ...prev, plantId: '', subtypeId: '' }));
    }
  }, [formData.category]);

  const fetchUnits = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_UNITS);
      const response = await instance.request();
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success && apiResponse.data) {
          setUnits(apiResponse.data);
        } else if (apiResponse.status === 'Success' && apiResponse.data) {
          setUnits(apiResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_CATEGORIES);
      const response = await instance.request({}, { isActive: true });
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' && apiResponse.data) {
          const categoryNames = apiResponse.data.map(cat => cat.name || cat.displayName);
          setCategories(categoryNames);
        } else if (apiResponse.success && apiResponse.data) {
          const categoryNames = apiResponse.data.map(cat => cat.name || cat.displayName);
          setCategories(categoryNames);
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      alert('Error loading categories. Please refresh the page.');
    }
  };

  const fetchPlants = async () => {
    try {
      const instance = NetworkManager(API.plantCms.GET_PLANTS);
      const response = await instance.request();
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success && apiResponse.data) {
          setPlants(apiResponse.data);
        } else if (apiResponse.status === 'Success' && apiResponse.data) {
          setPlants(apiResponse.data);
        }
      }
    } catch (error) {
      console.error('Error fetching plants:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.GET_PRODUCT_BY_ID);
      const response = await instance.request({}, [id]);
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success && apiResponse.data) {
          const product = apiResponse.data.product || apiResponse.data;
          setFormData({
            code: product.code,
            name: product.name,
            description: product.description || '',
            category: product.category,
            primaryUnit: product.primaryUnit?._id || '',
            secondaryUnit: product.secondaryUnit?._id || '',
            conversionFactor: product.conversionFactor || 1,
            minStockLevel: product.minStockLevel || 0,
            maxStockLevel: product.maxStockLevel || '',
            reorderLevel: product.reorderLevel || 0,
            hsn: product.hsn || '',
            gst: product.gst || 0,
            plantId: product.plantId?._id || product.plantId || '',
            subtypeId: product.subtypeId || '',
          });
          
          // If category is seeds or plants and plantId exists, set selected plant
          if ((product.category === 'seeds' || product.category === 'plants') && product.plantId) {
            const plantId = product.plantId._id || product.plantId;
            if (plants.length > 0) {
              const plant = plants.find(p => p._id === plantId);
              if (plant) {
                setSelectedPlant(plant);
              }
            } else {
              // Fetch plants first, then set selected plant
              await fetchPlants();
              const plant = plants.find(p => p._id === plantId);
              if (plant) {
                setSelectedPlant(plant);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Error loading product details');
    } finally {
      setLoading(false);
    }
  };

  // Check if a unit requires secondary UOM
  const requiresSecondaryUnit = (unit) => {
    if (!unit) return false;
    if (unit.requiresSecondaryUnit === true) return true;
    const unitName = unit.name?.toLowerCase() || '';
    const unitsRequiringSecondary = ['bag', 'box', 'seeds'];
    return unitsRequiringSecondary.includes(unitName);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle unit selection separately (for primary and secondary)
    if (name === 'primaryUnit' || name === 'secondaryUnit') {
      if (value === '__new__') {
        setUnitModalType(name === 'primaryUnit' ? 'primary' : 'secondary');
        setShowUnitModal(true);
        return;
      } else {
        // Update the form data
        if (name === 'primaryUnit') {
          const selectedUnit = units.find(u => u._id === value);
          if (selectedUnit && requiresSecondaryUnit(selectedUnit)) {
            // Keep secondary unit enabled - it's required
            setFormData({ ...formData, primaryUnit: value });
          } else {
            setFormData(prev => ({ ...prev, primaryUnit: value, secondaryUnit: '', conversionFactor: 1 }));
          }
        } else {
          setFormData({ ...formData, [name]: value });
        }
        
        // Clear errors
        if (errors[name]) {
          setErrors({ ...errors, [name]: '' });
        }
        return;
      }
    }
    
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value === '__new__') {
      setShowNewCategory(true);
      setFormData({ ...formData, category: '' });
    } else {
      setShowNewCategory(false);
      setFormData({ ...formData, category: value });
    }
  };

  const handlePlantChange = (e) => {
    const plantId = e.target.value;
    const plant = plants.find(p => p._id === plantId);
    setSelectedPlant(plant || null);
    setFormData({ 
      ...formData, 
      plantId: plantId || '', 
      subtypeId: '' // Clear subtype when plant changes
    });
  };

  const handleSubtypeChange = (e) => {
    const subtypeId = e.target.value;
    setFormData({ ...formData, subtypeId: subtypeId || '' });
  };


  const handleUnitCreated = (newUnit) => {
    // Refresh units list and select the newly created unit
    fetchUnits().then(() => {
      if (unitModalType === 'primary') {
        setFormData({ ...formData, primaryUnit: newUnit._id });
      } else {
        setFormData({ ...formData, secondaryUnit: newUnit._id });
      }
    });
  };

  const addNewCategory = async () => {
    if (newCategory.trim()) {
      try {
        const categoryName = newCategory.trim();
        const instance = NetworkManager(API.INVENTORY.CREATE_CATEGORY);
        const response = await instance.request({
          name: categoryName.toLowerCase(),
          displayName: categoryName,
          description: '',
        });
        
        if (response?.data) {
          const apiResponse = response.data;
          if (apiResponse.status === 'Success' || apiResponse.success) {
            const categoryData = apiResponse.data || {};
            const categoryValue = categoryData.name || categoryName.toLowerCase();
            if (!categories.includes(categoryValue)) {
              setCategories([...categories, categoryValue]);
            }
            setFormData({ ...formData, category: categoryValue });
            setShowNewCategory(false);
            setNewCategory('');
            alert('Category created successfully!');
          }
        }
      } catch (error) {
        console.error('Error creating category:', error);
        alert(error?.data?.message || error?.message || 'Error creating category');
      }
    }
  };


  const validate = () => {
    const newErrors = {};

    if (!formData.code.trim()) newErrors.code = 'Product code is required';
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.category) newErrors.category = 'Category is required';
    if (!formData.primaryUnit) newErrors.primaryUnit = 'Primary unit is required';

    // Validate plant and subtype for seeds or plants category
    if (formData.category === 'seeds' || formData.category === 'plants') {
      if (!formData.plantId) newErrors.plantId = `Plant is required for ${formData.category} products`;
      if (!formData.subtypeId) newErrors.subtypeId = `Subtype is required for ${formData.category} products`;
    }

    if (formData.primaryUnit) {
      const selectedUnit = units.find(u => u._id === formData.primaryUnit);
      if (selectedUnit && requiresSecondaryUnit(selectedUnit)) {
        if (!formData.secondaryUnit) {
          newErrors.secondaryUnit = 'Secondary unit is required for this primary unit';
        } else if (!formData.conversionFactor || formData.conversionFactor <= 0) {
          newErrors.conversionFactor = 'Conversion factor is required and must be greater than 0';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        minStockLevel: Number(formData.minStockLevel),
        maxStockLevel: formData.maxStockLevel ? Number(formData.maxStockLevel) : undefined,
        reorderLevel: Number(formData.reorderLevel),
        gst: Number(formData.gst),
        conversionFactor: Number(formData.conversionFactor),
        secondaryUnit: formData.secondaryUnit || null,
      };
      
      // Include plantId and subtypeId if category is "seeds" or "plants"
      // Always include them (even if null) so backend can handle them properly
      if (formData.category === 'seeds' || formData.category === 'plants') {
        payload.plantId = formData.plantId && formData.plantId.trim() !== '' ? formData.plantId : null;
        payload.subtypeId = formData.subtypeId && formData.subtypeId.trim() !== '' ? formData.subtypeId : null;
      } else {
        // Explicitly set to null for non-seeds/plants products
        payload.plantId = null;
        payload.subtypeId = null;
      }
      
      // Debug logging
      console.log('Product payload:', JSON.stringify(payload, null, 2));

      if (isEditMode) {
        const instance = NetworkManager(API.INVENTORY.UPDATE_PRODUCT);
        const response = await instance.request(payload, [id]);
        if (response?.data) {
          const apiResponse = response.data;
          if (apiResponse.success || apiResponse.status === 'Success') {
            alert('Product updated successfully');
            navigate('/u/inventory/products');
          } else {
            alert('Error updating product: ' + (apiResponse.message || 'Unknown error'));
          }
        }
      } else {
        const instance = NetworkManager(API.INVENTORY.CREATE_PRODUCT);
        const response = await instance.request(payload);
        if (response?.data) {
          const apiResponse = response.data;
          if (apiResponse.success || apiResponse.status === 'Success') {
            alert('Product created successfully');
            navigate('/u/inventory/products');
          } else {
            alert('Error creating product: ' + (apiResponse.message || 'Unknown error'));
          }
        }
      }
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.response?.data?.message || 'Error saving product');
    } finally {
      setLoading(false);
    }
  };

  const selectedPrimaryUnit = units.find(u => u._id === formData.primaryUnit);
  const allowSecondaryUnit = selectedPrimaryUnit && requiresSecondaryUnit(selectedPrimaryUnit);
  
  // Get available secondary units (filter by compatible units if available)
  const getAvailableSecondaryUnits = () => {
    if (!selectedPrimaryUnit) return [];
    const allUnits = units.filter(unit => unit._id !== formData.primaryUnit);
    
    // If primary unit has compatibleSecondaryUnits defined, filter by those
    if (selectedPrimaryUnit.compatibleSecondaryUnits && selectedPrimaryUnit.compatibleSecondaryUnits.length > 0) {
      const compatibleIds = selectedPrimaryUnit.compatibleSecondaryUnits.map(u => 
        typeof u === 'object' ? u._id : u
      );
      return allUnits.filter(unit => compatibleIds.includes(unit._id));
    }
    
    // Otherwise, return all units except the primary
    return allUnits;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/u/inventory/products')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Products</span>
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-800">
              {isEditMode ? 'Edit Product' : 'New Product'}
            </h1>
            <p className="text-gray-600">
              {isEditMode ? 'Update product details' : 'Add a new product to inventory'}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-gray-200">
            <Info className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Basic Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                disabled={isEditMode}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.code ? 'border-red-500' : 'border-gray-300'
                } ${isEditMode ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                placeholder="e.g., PROD001"
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter product name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              {showNewCategory ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewCategory())}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter new category"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={addNewCategory}
                      className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      title="Add Category"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategory('');
                      }}
                      className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      title="Cancel"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleCategoryChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                  <option value="__new__">+ Add New Category</option>
                </select>
              )}
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>

            {/* Plant and Subtype Selection - Only for Seeds or Plants Category */}
            {(formData.category === 'seeds' || formData.category === 'plants') && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Plant <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="plantId"
                    value={formData.plantId}
                    onChange={handlePlantChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.plantId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select plant</option>
                    {plants.map((plant) => (
                      <option key={plant._id} value={plant._id}>
                        {plant.name}
                      </option>
                    ))}
                  </select>
                  {errors.plantId && <p className="text-red-500 text-xs mt-1">{errors.plantId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Subtype <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="subtypeId"
                    value={formData.subtypeId}
                    onChange={handleSubtypeChange}
                    disabled={!selectedPlant}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.subtypeId ? 'border-red-500' : 'border-gray-300'
                    } ${!selectedPlant ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                  >
                    <option value="">Select subtype</option>
                    {selectedPlant?.subtypes?.map((subtype) => (
                      <option key={subtype._id} value={subtype._id}>
                        {subtype.name}
                      </option>
                    ))}
                  </select>
                  {errors.subtypeId && <p className="text-red-500 text-xs mt-1">{errors.subtypeId}</p>}
                  {!selectedPlant && (
                    <p className="text-gray-500 text-xs mt-1">Please select a plant first</p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mt-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
              placeholder="Enter product description..."
            />
          </div>
        </div>

        {/* Unit of Measurement Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-gray-200">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Unit of Measurement</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Primary Unit <span className="text-red-500">*</span>
              </label>
              <select
                name="primaryUnit"
                value={formData.primaryUnit}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                  errors.primaryUnit ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select primary unit</option>
                {units.map((unit) => (
                  <option key={unit._id} value={unit._id}>
                    {unit.name} ({unit.abbreviation})
                  </option>
                ))}
                <option value="__new__">+ Add New Unit</option>
              </select>
              {errors.primaryUnit && (
                <p className="text-red-500 text-xs mt-1">{errors.primaryUnit}</p>
              )}
            </div>

            {allowSecondaryUnit ? (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Secondary Unit <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="secondaryUnit"
                    value={formData.secondaryUnit}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.secondaryUnit ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select secondary unit</option>
                    {getAvailableSecondaryUnits().map((unit) => (
                      <option key={unit._id} value={unit._id}>
                        {unit.name} ({unit.abbreviation})
                      </option>
                    ))}
                    <option value="__new__">+ Add New Unit</option>
                  </select>
                  {selectedPrimaryUnit?.compatibleSecondaryUnits?.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Showing compatible secondary units only
                    </p>
                  )}
                  {errors.secondaryUnit && (
                    <p className="text-red-500 text-xs mt-1">{errors.secondaryUnit}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Conversion Factor <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="conversionFactor"
                    value={formData.conversionFactor}
                    onChange={handleChange}
                    step="0.01"
                    min="0.01"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      errors.conversionFactor ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., 1200"
                  />
                  {errors.conversionFactor && (
                    <p className="text-red-500 text-xs mt-1">{errors.conversionFactor}</p>
                  )}
                  {(() => {
                    const secondaryUnit = formData.secondaryUnit 
                      ? units.find(u => u._id === formData.secondaryUnit)
                      : null;
                    return (
                      <p className="text-xs text-gray-500 mt-1">
                        1 {selectedPrimaryUnit?.name || 'primary unit'} = {formData.conversionFactor || '?'} {secondaryUnit?.name || 'secondary unit'}
                        {formData.conversionFactor && secondaryUnit && (
                          <span className="block mt-1 text-blue-600 font-medium">
                            (1 {selectedPrimaryUnit?.abbreviation || 'primary'} contains {formData.conversionFactor} {secondaryUnit.abbreviation})
                          </span>
                        )}
                      </p>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    name="hsn"
                    value={formData.hsn}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Enter HSN code"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    GST (%)
                  </label>
                  <input
                    type="number"
                    name="gst"
                    value={formData.gst}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="0"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stock Management Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6 pb-4 border-b border-gray-200">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-800">Stock Management</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Minimum Stock Level
              </label>
              <input
                type="number"
                name="minStockLevel"
                value={formData.minStockLevel}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reorder Level
              </label>
              <input
                type="number"
                name="reorderLevel"
                value={formData.reorderLevel}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Maximum Stock Level
              </label>
              <input
                type="number"
                name="maxStockLevel"
                value={formData.maxStockLevel}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/u/inventory/products')}
            className="px-8 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}</span>
          </button>
        </div>
      </form>

      {/* Unit Modal */}
      <UnitModal
        open={showUnitModal}
        onClose={() => setShowUnitModal(false)}
        onSuccess={handleUnitCreated}
        existingUnits={units}
        unitType={unitModalType}
      />
    </div>
  );
};

export default ProductForm;
