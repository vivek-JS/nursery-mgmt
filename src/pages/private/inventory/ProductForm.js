import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Package } from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [units, setUnits] = useState([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'raw_material',
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

  const categories = [
    { value: 'raw_material', label: 'Raw Material' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'finished_good', label: 'Finished Good' },
    { value: 'consumable', label: 'Consumable' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchUnits();
    if (isEditMode) {
      fetchProduct();
    }
  }, [id]);

  const fetchUnits = async () => {
    try {
      const response = await axiosInstance.get('/inventory/units');
      if (response.data.success) {
        setUnits(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/inventory/products/${id}`);
      if (response.data.success) {
        const product = response.data.data.product;
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
      };

      if (isEditMode) {
        await axiosInstance.put(`/inventory/products/${id}`, payload);
        alert('Product updated successfully');
      } else {
        await axiosInstance.post('/inventory/products', payload);
        alert('Product created successfully');
      }

      navigate('/u/inventory/products');
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.response?.data?.message || 'Error saving product');
    } finally {
      setLoading(false);
    }
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
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Product Code */}
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
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              } ${isEditMode ? 'bg-gray-100' : ''}`}
              placeholder="e.g., PROD001"
            />
            {errors.code && <p className="text-red-500 text-sm mt-1">{errors.code}</p>}
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter product name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>

          {/* Primary Unit */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Primary Unit <span className="text-red-500">*</span>
            </label>
            <select
              name="primaryUnit"
              value={formData.primaryUnit}
              onChange={handleChange}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
            {errors.primaryUnit && <p className="text-red-500 text-sm mt-1">{errors.primaryUnit}</p>}
          </div>

          {/* Secondary Unit */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Secondary Unit
            </label>
            <select
              name="secondaryUnit"
              value={formData.secondaryUnit}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">None</option>
              {units.map((unit) => (
                <option key={unit._id} value={unit._id}>
                  {unit.name} ({unit.abbreviation})
                </option>
              ))}
            </select>
          </div>

          {/* Conversion Factor */}
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="1 secondary = ? primary"
              />
              <p className="text-xs text-gray-500 mt-1">
                1 secondary unit = {formData.conversionFactor} primary units
              </p>
            </div>
          )}

          {/* HSN Code */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">HSN Code</label>
            <input
              type="text"
              name="hsn"
              value={formData.hsn}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter HSN code"
            />
          </div>

          {/* GST */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">GST (%)</label>
            <input
              type="number"
              name="gst"
              value={formData.gst}
              onChange={handleChange}
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Min Stock Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Minimum Stock Level
            </label>
            <input
              type="number"
              name="minStockLevel"
              value={formData.minStockLevel}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Reorder Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Reorder Level
            </label>
            <input
              type="number"
              name="reorderLevel"
              value={formData.reorderLevel}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Max Stock Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Maximum Stock Level
            </label>
            <input
              type="number"
              name="maxStockLevel"
              value={formData.maxStockLevel}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter product description..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 mt-8">
          <button
            type="button"
            onClick={() => navigate('/u/inventory/products')}
            className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
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

