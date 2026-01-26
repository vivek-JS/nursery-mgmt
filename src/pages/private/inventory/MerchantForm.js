import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Building2, X, Plus, Package, Crop, Search, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { API, NetworkManager } from 'network/core';
import { Toast } from 'helpers/toasts/toastHelper';

const MerchantForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'both',
    contactPerson: '',
    phone: '',
    email: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India',
    },
    gstin: '',
    pan: '',
    paymentTerms: 'net30',
    creditLimit: 0,
    rating: '',
    notes: '',
    linkedProducts: [],
  });

  const [errors, setErrors] = useState({});
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [crops, setCrops] = useState([]);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [expandedCrops, setExpandedCrops] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  const paymentTermsOptions = [
    { value: 'immediate', label: 'Immediate' },
    { value: 'net15', label: 'Net 15 Days' },
    { value: 'net30', label: 'Net 30 Days' },
    { value: 'net45', label: 'Net 45 Days' },
    { value: 'net60', label: 'Net 60 Days' },
    { value: 'custom', label: 'Custom' },
  ];

  const categoryOptions = [
    { value: 'supplier', label: 'Supplier' },
    { value: 'buyer', label: 'Buyer' },
    { value: 'both', label: 'Both' },
  ];

  useEffect(() => {
    if (isEditMode) {
      fetchMerchant();
    }
  }, [id]);

  const fetchCrops = async () => {
    try {
      setLoadingCrops(true);
      const instance = NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS);
      const response = await instance.request();
      if (response?.data?.success || response?.data?.status === 'Success') {
        setCrops(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching crops:', error);
      Toast.error('Error loading products');
    } finally {
      setLoadingCrops(false);
    }
  };

  useEffect(() => {
    if (productModalOpen) {
      fetchCrops();
    }
  }, [productModalOpen]);

  const fetchMerchant = async () => {
    try {
      setLoading(true);
      const instance = NetworkManager(API.INVENTORY.GET_MERCHANT_BY_ID);
      const response = await instance.request({}, [id]);
      
      if (response?.data?.success) {
        const merchant = response.data.data?.merchant || response.data.data;
        if (merchant) {
          setFormData({
            code: merchant.code || '',
            name: merchant.name || '',
            category: merchant.category || 'both',
            contactPerson: merchant.contactPerson || '',
            phone: merchant.phone || '',
            email: merchant.email || '',
            address: merchant.address || {
              street: '',
              city: '',
              state: '',
              pincode: '',
              country: 'India',
            },
            gstin: merchant.gstin || '',
            pan: merchant.pan || '',
            paymentTerms: merchant.paymentTerms || 'net30',
            creditLimit: merchant.creditLimit || 0,
            rating: merchant.rating || '',
            notes: merchant.notes || '',
            linkedProducts: merchant.linkedProducts || [],
          });
        }
      } else {
        console.error('Invalid response structure:', response);
        Toast.error('Error loading merchant details');
      }
    } catch (error) {
      console.error('Error fetching merchant:', error);
      Toast.error(error?.response?.data?.message || 'Error loading merchant details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        address: { ...formData.address, [field]: value },
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.code.trim()) newErrors.code = 'Merchant code is required';
    if (!formData.name.trim()) newErrors.name = 'Merchant name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      const payload = {
        ...formData,
        creditLimit: Number(formData.creditLimit) || 0,
        rating: formData.rating ? Number(formData.rating) : undefined,
      };

      // Validate rating range if provided
      if (payload.rating && (payload.rating < 1 || payload.rating > 5)) {
        setErrors({ ...errors, rating: 'Rating must be between 1 and 5' });
        setLoading(false);
        return;
      }

      if (isEditMode) {
        const instance = NetworkManager(API.INVENTORY.UPDATE_MERCHANT);
        await instance.request(payload, [id]);
        Toast.success('Merchant updated successfully');
      } else {
        const instance = NetworkManager(API.INVENTORY.CREATE_MERCHANT);
        await instance.request(payload);
        Toast.success('Merchant created successfully');
      }

      navigate('/u/inventory/merchants');
    } catch (error) {
      console.error('Error saving merchant:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error saving merchant';
      Toast.error(errorMessage);
      
      // Set field-specific errors if available
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/u/inventory/merchants')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Merchants</span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Building2 className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                {isEditMode ? 'Edit Merchant' : 'New Merchant'}
              </h1>
              <p className="text-gray-600">
                {isEditMode ? 'Update merchant details' : 'Add a new merchant/recipient'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Merchant Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  disabled={isEditMode}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm ${
                    errors.code ? 'border-red-500' : 'border-gray-300'
                  } ${isEditMode ? 'bg-gray-100' : ''}`}
                  placeholder="e.g., MER001"
                />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Merchant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter merchant name"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                <input
                  type="text"
                  name="contactPerson"
                  value={formData.contactPerson}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Contact person name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="10-digit phone number"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Terms</label>
                <select
                  name="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  {paymentTermsOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">GSTIN</label>
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="GST Number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">PAN</label>
                <input
                  type="text"
                  name="pan"
                  value={formData.pan}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="PAN Number"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Credit Limit (₹)</label>
                <input
                  type="number"
                  name="creditLimit"
                  value={formData.creditLimit}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rating (1-5)</label>
                <input
                  type="number"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  min="1"
                  max="5"
                  step="0.1"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-sm ${
                    errors.rating ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Optional"
                />
                {errors.rating && <p className="text-red-500 text-xs mt-1">{errors.rating}</p>}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Address</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Street</label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="City"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="State"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pincode</label>
                <input
                  type="text"
                  name="address.pincode"
                  value={formData.address.pincode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                  placeholder="Pincode"
                />
              </div>
            </div>
          </div>

          {/* Tradable Products */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Tradable Products</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Select crops and varieties this merchant can trade
                </p>
              </div>
              <button
                type="button"
                onClick={() => setProductModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Link Products</span>
              </button>
            </div>

            {formData.linkedProducts && formData.linkedProducts.length > 0 ? (
              <div className="space-y-2">
                {formData.linkedProducts.map((linkedProduct, index) => (
                  <div
                    key={`${linkedProduct.cropId}-${linkedProduct.varietyId}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Crop className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-800">{linkedProduct.cropName}</span>
                          <span className="text-gray-400">/</span>
                          <span className="text-gray-700">{linkedProduct.varietyName}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = formData.linkedProducts.filter(
                          (lp) =>
                            !(lp.cropId === linkedProduct.cropId && lp.varietyId === linkedProduct.varietyId)
                        );
                        setFormData({ ...formData, linkedProducts: updated });
                      }}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 mb-2">No products linked yet</p>
                <button
                  type="button"
                  onClick={() => setProductModalOpen(true)}
                  className="text-green-600 hover:text-green-700 text-sm font-semibold"
                >
                  Click to link products
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/u/inventory/merchants')}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Saving...' : isEditMode ? 'Update Merchant' : 'Create Merchant'}</span>
            </button>
          </div>
        </form>

        {/* Product Selection Modal */}
        {productModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Select Products</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Choose crops and varieties this merchant can trade
                  </p>
                </div>
                <button
                  onClick={() => setProductModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search crops or varieties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingCrops ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {crops
                      .filter((crop) => {
                        if (!searchTerm) return true;
                        const searchLower = searchTerm.toLowerCase();
                        return (
                          crop.cropName.toLowerCase().includes(searchLower) ||
                          crop.varieties?.some((v) => v.name.toLowerCase().includes(searchLower))
                        );
                      })
                      .map((crop) => {
                        const isExpanded = expandedCrops[crop._id];
                        return (
                          <div
                            key={crop._id}
                            className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
                          >
                            {/* Crop Header */}
                            <div
                              className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() =>
                                setExpandedCrops((prev) => ({
                                  ...prev,
                                  [crop._id]: !prev[crop._id],
                                }))
                              }
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-green-100 rounded-lg">
                                    <Crop className="w-4 h-4 text-green-600" />
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-gray-800">{crop.cropName}</h3>
                                    <p className="text-xs text-gray-500">
                                      {crop.varieties?.length || 0} variet
                                      {crop.varieties?.length !== 1 ? 'ies' : 'y'}
                                    </p>
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {/* Varieties List */}
                            {isExpanded && crop.varieties && crop.varieties.length > 0 && (
                              <div className="border-t border-gray-200 bg-white p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {crop.varieties.map((variety) => {
                                    const isSelected = formData.linkedProducts.some(
                                      (lp) =>
                                        lp.cropId === crop._id && lp.varietyId === variety._id
                                    );
                                    return (
                                      <div
                                        key={variety._id}
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                          isSelected
                                            ? 'border-green-500 bg-green-50'
                                            : 'border-gray-200 hover:border-green-300 hover:bg-gray-50'
                                        }`}
                                        onClick={() => {
                                          if (isSelected) {
                                            // Remove
                                            const updated = formData.linkedProducts.filter(
                                              (lp) =>
                                                !(lp.cropId === crop._id && lp.varietyId === variety._id)
                                            );
                                            setFormData({ ...formData, linkedProducts: updated });
                                          } else {
                                            // Add
                                            const updated = [
                                              ...formData.linkedProducts,
                                              {
                                                cropId: crop._id,
                                                varietyId: variety._id,
                                                cropName: crop.cropName,
                                                varietyName: variety.name,
                                              },
                                            ];
                                            setFormData({ ...formData, linkedProducts: updated });
                                          }
                                        }}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center space-x-2">
                                            <Package className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-800">
                                              {variety.name}
                                            </span>
                                          </div>
                                          {isSelected && (
                                            <div className="p-1 bg-green-500 rounded-full">
                                              <Check className="w-3 h-3 text-white" />
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">{formData.linkedProducts.length}</span> product
                  {formData.linkedProducts.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setProductModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setProductModalOpen(false)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MerchantForm;

