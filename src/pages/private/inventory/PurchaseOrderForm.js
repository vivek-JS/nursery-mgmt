import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';
import { formatDecimal, formatCurrency } from '../../../utils/numberUtils';

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  // Use only merchants as suppliers (filter for both or supplier category)
  const allSuppliers = React.useMemo(() => {
    const filtered = merchants
      .filter(m => m.category === 'both' || m.category === 'supplier')
      .map(m => ({
        ...m,
        type: 'merchant',
        displayName: m.name,
        contact: m.contactPerson || m.phone || '',
        gstNumber: m.gstin || '',
        address: typeof m.address === 'string' ? m.address : 
          m.address ? `${m.address.street || ''} ${m.address.city || ''} ${m.address.state || ''} ${m.address.pincode || ''}`.trim() : '',
      }));
    console.log('All suppliers (merchants) filtered:', filtered.length, filtered);
    return filtered;
  }, [merchants]);
  const [orderItems, setOrderItems] = useState([]);
  const [formData, setFormData] = useState({
    supplier: {
      name: '',
      contact: '',
      email: '',
      address: '',
      gstNumber: '',
    },
    expectedDeliveryDate: '',
    notes: '',
  });

  useEffect(() => {
    loadProducts();
    loadMerchants();
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [filterCategory]);

  const loadProducts = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS);
      const params = { limit: 1000, isActive: true };
      if (filterCategory) params.category = filterCategory;
      const response = await instance.request({}, params);
      
      if (response?.data) {
        const apiResponse = response.data;
        // Handle both response formats: {success: true, data: [...]} or {status: "Success", data: {data: [...]}}
        if (apiResponse.status === 'Success' && apiResponse.data) {
          const productsData = Array.isArray(apiResponse.data.data) 
            ? apiResponse.data.data 
            : Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setProducts(productsData);
        } else if (apiResponse.success && apiResponse.data) {
          const productsData = Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setProducts(productsData);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadMerchants = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_MERCHANTS_SIMPLE);
      const response = await instance.request({}, { limit: 1000 });
      
      if (response?.data) {
        const apiResponse = response.data;
        // Handle format: {success: true, data: [...], pagination: {...}}
        if (apiResponse.success && apiResponse.data) {
          const merchantsData = Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setMerchants(merchantsData);
          console.log('Merchants loaded:', merchantsData.length, merchantsData);
        } 
        // Handle format: {status: "Success", data: {data: [...], pagination: {...}}}
        else if (apiResponse.status === 'Success' && apiResponse.data) {
          const merchantsData = Array.isArray(apiResponse.data.data) 
            ? apiResponse.data.data 
            : Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setMerchants(merchantsData);
          console.log('Merchants loaded:', merchantsData.length, merchantsData);
        }
      }
    } catch (error) {
      console.error('Error loading merchants:', error);
      alert('Error loading merchants: ' + (error.response?.data?.message || error.message));
    }
  };

  const loadCategories = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_CATEGORIES);
      const response = await instance.request({}, { isActive: true });
      
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' && apiResponse.data) {
          const categoriesData = Array.isArray(apiResponse.data.data) 
            ? apiResponse.data.data 
            : Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setCategories(categoriesData);
        } else if (apiResponse.success && apiResponse.data) {
          const categoriesData = Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setCategories(categoriesData);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = allSuppliers.find(s => s._id === supplierId);
    if (supplier) {
      setSelectedSupplier(supplier);
      setFormData(prev => ({
        ...prev,
        supplier: {
          name: supplier.name,
          contact: supplier.contact || supplier.contactPerson || supplier.phone || '',
          email: supplier.email || '',
          address: supplier.address || '',
          gstNumber: supplier.gstNumber || supplier.gstin || '',
        }
      }));
    }
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      productId: '',
      quantity: 1,
      rate: 0, // Optional, can be 0
      amount: 0,
    }]);
  };

  const updateOrderItem = (index, field, value) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    // Calculate amount only if both quantity and rate are provided
    if (field === 'quantity' || field === 'rate') {
      const quantity = updatedItems[index].quantity || 0;
      const rate = updatedItems[index].rate || 0;
      updatedItems[index].amount = quantity * rate;
    }
    
    // If product is selected, we can auto-populate unit from product's primaryUnit
    // (This is handled in the submit transformation)

    setOrderItems(updatedItems);
  };

  const removeOrderItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + item.amount, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only merchant (supplier) and expected delivery date are mandatory
    if (!selectedSupplier || !selectedSupplier._id) {
      alert('Please select a merchant');
      return;
    }

    if (!formData.expectedDeliveryDate) {
      alert('Please select expected delivery date');
      return;
    }

    if (orderItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    // Only product and quantity are required in order items
    if (orderItems.some(item => !item.productId || !item.quantity || item.quantity <= 0)) {
      alert('Please select product and enter quantity for all items');
      return;
    }

    try {
      setLoading(true);
      
      // Transform items: productId -> product, add unit from product's primaryUnit
      const transformedItems = orderItems.map(item => {
        const product = products.find(p => p._id === item.productId);
        if (!product) {
          throw new Error(`Product not found for item: ${item.productId}`);
        }
        
        // Get unit - handle both populated and non-populated cases
        let unitId = null;
        if (product.primaryUnit) {
          unitId = typeof product.primaryUnit === 'object' 
            ? product.primaryUnit._id 
            : product.primaryUnit;
        }
        
        if (!unitId) {
          throw new Error(`Product ${product.name} (${product.code}) does not have a primary unit assigned`);
        }
        
        return {
          product: item.productId, // Use productId as product ObjectId
          unit: unitId, // Get unit from product's primaryUnit
          quantity: item.quantity,
          rate: item.rate || 0, // Default to 0 if not provided
          amount: (item.quantity || 0) * (item.rate || 0), // Calculate amount
          gst: 0, // Default GST
          discount: 0, // Default discount
        };
      });
      
      // Following FarmerOrdersTable.js pattern - use NetworkManager
      const instance = NetworkManager(API.INVENTORY.CREATE_PURCHASE_ORDER);
      const response = await instance.request({
        supplier: selectedSupplier._id, // Send supplier ObjectId, not object
        expectedDeliveryDate: formData.expectedDeliveryDate,
        items: transformedItems,
        notes: formData.notes,
      });

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          alert('Purchase order created successfully!');
          navigate('/u/inventory/purchase-orders');
        } else {
          alert('Error creating purchase order: ' + (apiResponse.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Error creating purchase order: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || product.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/u/inventory/purchase-orders')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Create Purchase Order</h1>
              <p className="text-gray-600">Add new purchase order for inventory</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Supplier Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Supplier Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Supplier / Merchant <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSupplier?._id || ''}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a merchant</option>
                  {allSuppliers.map(supplier => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.displayName || supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    expectedDeliveryDate: e.target.value
                  }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.supplier.contact}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Auto-filled from merchant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.supplier.email}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  placeholder="Auto-filled from merchant"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.supplier.address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    supplier: { ...prev.supplier, address: e.target.value }
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter supplier address"
                />
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Order Items</h2>
              <button
                type="button"
                onClick={addOrderItem}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Product Search and Filter */}
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category._id || category.name} value={category.name || category.displayName}>
                      {category.displayName || category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items Table */}
            {orderItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate (Optional)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-4">
                          <select
                            value={item.productId}
                            onChange={(e) => updateOrderItem(index, 'productId', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Product</option>
                            {filteredProducts.map(product => (
                              <option key={product._id} value={product._id}>
                                {product.name} ({product.category})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="1"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateOrderItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            placeholder="Optional"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(formatDecimal(item.amount) || 0)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => removeOrderItem(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No items added yet. Click &quot;Add Item&quot; to get started.</p>
              </div>
            )}

            {/* Total Amount */}
            {orderItems.length > 0 && (
              <div className="mt-6 flex justify-end">
                <div className="bg-gray-50 px-6 py-4 rounded-lg">
                  <div className="text-lg font-semibold text-gray-800">
                    Total Amount: {formatCurrency(formatDecimal(getTotalAmount()) || 0)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Notes</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                notes: e.target.value
              }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter any additional notes or special instructions..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/u/inventory/purchase-orders')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || orderItems.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{loading ? 'Creating...' : 'Create Purchase Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;