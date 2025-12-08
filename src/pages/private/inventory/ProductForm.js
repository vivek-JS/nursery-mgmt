import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Package, Plus, X } from 'lucide-react';
import { API, NetworkManager } from 'network/core';

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
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
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUnits();
    fetchCategories();
    if (isEditMode) {
      fetchProduct();
    }
  }, [id]);

  const fetchUnits = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager
      const instance = NetworkManager(API.INVENTORY.GET_ALL_UNITS);
      const response = await instance.request();
      // Handle response format: {data: {success: true, data: [...]}}
      if (response?.data) {
        const apiResponse = response.data;
        // Units API returns: {success: true, data: [...]}
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
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_CATEGORIES);
      const response = await instance.request({}, { isActive: true });
      // Handle response format: {data: {status: "Success", data: [...]}}
      if (response?.data) {
        const apiResponse = response.data;
        // Categories API returns: {status: "Success", message: "...", data: [...]}
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

  const fetchProduct = async () => {
    try {
      setLoading(true);
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params array
      const instance = NetworkManager(API.INVENTORY.GET_PRODUCT_BY_ID);
      const response = await instance.request({}, [id]);
      if (response?.data) {
        const apiResponse = response.data;
        // Product API returns: {success: true, data: {product: {...}}}
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
          });
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      alert('Error loading product details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    
    // If primary unit changes, check if secondary should be enabled
    if (name === 'primaryUnit') {
      const selectedUnit = units.find(u => u._id === value);
      if (selectedUnit && (selectedUnit.name.toLowerCase() === 'bag' || selectedUnit.name.toLowerCase() === 'box')) {
        // Keep secondary unit enabled
      } else {
        // Clear secondary unit if not Bag or Box
        setFormData(prev => ({ ...prev, secondaryUnit: '', conversionFactor: 1 }));
      }
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

  const addNewCategory = async () => {
    if (newCategory.trim()) {
      try {
        const categoryName = newCategory.trim();
        // Following FarmerOrdersTable.js pattern - use NetworkManager
        const instance = NetworkManager(API.INVENTORY.CREATE_CATEGORY);
        const response = await instance.request({
          name: categoryName.toLowerCase(),
          displayName: categoryName,
          description: '',
        });
        
        // Handle response format: {data: {status: "Success", data: {...}}}
        if (response?.data) {
          const apiResponse = response.data;
          // Category creation API returns: {status: "Success", data: {...}}
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
        // Convert empty string to null for secondaryUnit (backend expects null, not empty string)
        secondaryUnit: formData.secondaryUnit || null,
      };

      if (isEditMode) {
        // Following FarmerOrdersTable.js pattern - use NetworkManager with params array
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
        // Following FarmerOrdersTable.js pattern - use NetworkManager
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
  const allowSecondaryUnit = selectedPrimaryUnit && 
    (selectedPrimaryUnit.name.toLowerCase() === 'bag' || selectedPrimaryUnit.name.toLowerCase() === 'box');

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

      {/* Form - Compact Layout */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
        {/* Row 1: Code, Name, Category */}
        <div className="grid grid-cols-3 gap-4 mb-4">
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              } ${isEditMode ? 'bg-gray-100' : ''}`}
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
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
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
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addNewCategory())}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter new category"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={addNewCategory}
                  className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategory('');
                  }}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <select
                name="category"
                value={formData.category}
                onChange={handleCategoryChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
                <option value="__new__">+ Enter New Category</option>
              </select>
            )}
            {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
          </div>
        </div>

        {/* Row 2: Primary Unit, Secondary Unit (conditional), HSN */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Primary Unit <span className="text-red-500">*</span>
            </label>
            <select
              name="primaryUnit"
              value={formData.primaryUnit}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.primaryUnit ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select unit</option>
              {units.map((unit) => (
                <option key={unit._id} value={unit._id}>
                  {unit.name} ({unit.abbreviation})
                </option>
              ))}
            </select>
            {errors.primaryUnit && <p className="text-red-500 text-xs mt-1">{errors.primaryUnit}</p>}
          </div>

          {allowSecondaryUnit ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Secondary Unit
                </label>
                <select
                  name="secondaryUnit"
                  value={formData.secondaryUnit}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {units.map((unit) => (
                    <option key={unit._id} value={unit._id}>
                      {unit.name} ({unit.abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              {formData.secondaryUnit && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Conversion Factor
                  </label>
                  <input
                    type="number"
                    name="conversionFactor"
                    value={formData.conversionFactor}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1 secondary = ? primary"
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">HSN Code</label>
                <input
                  type="text"
                  name="hsn"
                  value={formData.hsn}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter HSN code"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">GST (%)</label>
                <input
                  type="number"
                  name="gst"
                  value={formData.gst}
                  onChange={handleChange}
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </>
          )}
        </div>

        {/* Row 3: Stock Levels */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Minimum Stock Level
            </label>
            <input
              type="number"
              name="minStockLevel"
              value={formData.minStockLevel}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Row 4: Description */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Enter product description..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 mt-6">
          <button
            type="button"
            onClick={() => navigate('/u/inventory/products')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
