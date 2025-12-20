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
  Info,
} from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';
import { formatDecimal, formatCurrency } from '../../../utils/numberUtils';

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
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
  const [productSlots, setProductSlots] = useState({}); // Store slots for each product
  const [loadingSlots, setLoadingSlots] = useState({}); // Track loading state for each product
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
    autoGRN: false, // Auto GRN toggle
  });

  useEffect(() => {
    loadProducts();
    loadMerchants();
    loadCategories();
    loadUnits();
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

  const loadUnits = async () => {
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
      console.error('Error loading units:', error);
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
      secondaryQuantity: '', // For secondary unit
      rate: 0, // Optional, can be 0
      amount: 0,
      batchNumber: '', // For auto GRN
      expiryDate: '', // For auto GRN
      slotId: '', // For slot selection when autoGRN is enabled
    }]);
  };

  // Fetch slots for a product when it has plantId and subtypeId
  const fetchSlotsForProduct = async (productId) => {
    const product = products.find(p => p._id === productId);
    if (!product || !product.plantId || !product.subtypeId) {
      return;
    }

    const plantId = typeof product.plantId === 'object' ? product.plantId._id : product.plantId;
    const subtypeId = product.subtypeId;

    setLoadingSlots(prev => ({ ...prev, [productId]: true }));
    try {
      const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
      
      const yearPromises = years.map(year => 
        instance.request({}, { plantId, subtypeId, year })
          .catch(error => {
            console.error(`Error fetching slots for year ${year}:`, error);
            return null;
          })
      );
      
      const responses = await Promise.all(yearPromises);
      const mergedSlots = [];
      
      responses.forEach((response) => {
        if (response) {
          const slotsData = response?.data?.data?.slots || response?.data?.slots || [];
          if (Array.isArray(slotsData) && slotsData.length > 0) {
            mergedSlots.push(...slotsData);
          }
        }
      });

      // Format slots for dropdown
      const formattedSlots = mergedSlots
        .filter(slot => slot.startDay && slot.endDay && slot.status)
        .map((slot) => {
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const parts = dateStr.split('-');
            if (parts.length === 3) {
              return `${parts[0]}-${parts[1]}-${parts[2]}`;
            }
            return dateStr;
          };
          
          const available = slot.availablePlants || 0;
          const startDate = formatDate(slot.startDay);
          const endDate = formatDate(slot.endDay);
          
          return {
            label: `${startDate} to ${endDate} (${available} available)`,
            value: slot._id,
            availableQuantity: available,
            startDay: slot.startDay,
            endDay: slot.endDay,
          };
        });

      setProductSlots(prev => ({ ...prev, [productId]: formattedSlots }));
    } catch (error) {
      console.error(`Error fetching slots for product ${productId}:`, error);
      setProductSlots(prev => ({ ...prev, [productId]: [] }));
    } finally {
      setLoadingSlots(prev => ({ ...prev, [productId]: false }));
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

  const updateOrderItem = (index, field, value) => {
    const updatedItems = [...orderItems];
    const currentItem = updatedItems[index];
    
    updatedItems[index] = {
      ...currentItem,
      [field]: value,
    };

    // When product is selected, check if it needs secondary unit and fetch slots if needed
    if (field === 'productId' && value) {
      const product = products.find(p => p._id === value);
      if (product) {
        const primaryUnit = typeof product.primaryUnit === 'object' 
          ? product.primaryUnit 
          : units.find(u => u._id === product.primaryUnit);
        
        if (primaryUnit && requiresSecondaryUnit(primaryUnit)) {
          // Product requires secondary unit - keep secondary quantity field
          // Auto-calculate secondary quantity if primary quantity exists
          if (currentItem.quantity && product.conversionFactor) {
            updatedItems[index].secondaryQuantity = (currentItem.quantity / product.conversionFactor).toFixed(2);
          }
        } else {
          // Clear secondary quantity if not needed
          updatedItems[index].secondaryQuantity = '';
        }

        // If autoGRN is enabled and product has plantId/subtypeId, fetch slots
        if (formData.autoGRN && product.plantId && product.subtypeId) {
          fetchSlotsForProduct(value);
        } else {
          // Clear slot selection if conditions not met
          updatedItems[index].slotId = '';
        }
      }
    }


    // Auto-calculate secondary quantity when primary quantity changes
    // Secondary is dependent on primary: Secondary = Primary * Conversion Factor
    if (field === 'quantity' && value) {
      const product = products.find(p => p._id === currentItem.productId);
      if (product && product.conversionFactor && product.conversionFactor > 0) {
        const primaryUnit = typeof product.primaryUnit === 'object' 
          ? product.primaryUnit 
          : units.find(u => u._id === product.primaryUnit);
        
        if (primaryUnit && requiresSecondaryUnit(primaryUnit)) {
          // Calculate secondary quantity: primary * conversionFactor
          const secondaryQty = (parseFloat(value) * product.conversionFactor).toFixed(2);
          updatedItems[index].secondaryQuantity = parseFloat(secondaryQty);
        }
      }
    }

    // Calculate amount only if both quantity and rate are provided
    if (field === 'quantity' || field === 'rate' || field === 'secondaryQuantity') {
      const quantity = updatedItems[index].quantity || 0;
      const rate = updatedItems[index].rate || 0;
      updatedItems[index].amount = quantity * rate;
    }

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
        
        const itemData = {
          product: item.productId, // Use productId as product ObjectId
          unit: unitId, // Get unit from product's primaryUnit
          quantity: item.quantity,
          rate: item.rate || 0, // Default to 0 if not provided
          amount: (item.quantity || 0) * (item.rate || 0), // Calculate amount
          gst: 0, // Default GST
          discount: 0, // Default discount
        };

        // Add batch number, expiry date, and slotId if auto GRN is enabled
        if (formData.autoGRN) {
          itemData.batchNumber = item.batchNumber || ''; // Will be auto-generated in backend if empty
          itemData.expiryDate = item.expiryDate || null;
          itemData.slotId = item.slotId || null; // Slot ID for updating availablePlants
        }

        return itemData;
      });
      
      // Following FarmerOrdersTable.js pattern - use NetworkManager
      const instance = NetworkManager(API.INVENTORY.CREATE_PURCHASE_ORDER);
      const response = await instance.request({
        supplier: selectedSupplier._id, // Send supplier ObjectId, not object
        expectedDeliveryDate: formData.expectedDeliveryDate,
        items: transformedItems,
        notes: formData.notes,
        autoGRN: formData.autoGRN || false, // Include auto GRN flag
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

            {/* Auto GRN Toggle */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoGRN}
                  onChange={(e) => {
                    const newAutoGRN = e.target.checked;
                    setFormData(prev => ({
                      ...prev,
                      autoGRN: newAutoGRN
                    }));
                    // When autoGRN is enabled, fetch slots for products that have plantId/subtypeId
                    if (newAutoGRN) {
                      orderItems.forEach((item) => {
                        if (item.productId) {
                          const product = products.find(p => p._id === item.productId);
                          if (product && product.plantId && product.subtypeId) {
                            fetchSlotsForProduct(item.productId);
                          }
                        }
                      });
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Auto-create GRN when order is approved
                </span>
              </label>
              <p className="text-xs text-gray-600 mt-1 ml-6">
                When enabled, a GRN will be automatically created once this purchase order is approved. You can add batch numbers, expiry dates, and select slots below.
              </p>
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
                        Primary Qty <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Secondary Qty
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate (Optional)
                      </th>
                      {formData.autoGRN && (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Batch/Lot No.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Expiry Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Slot (Optional)
                          </th>
                        </>
                      )}
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
                            placeholder="Primary quantity"
                          />
                          {(() => {
                            const product = products.find(p => p._id === item.productId);
                            if (product) {
                              const primaryUnit = typeof product.primaryUnit === 'object' 
                                ? product.primaryUnit 
                                : units.find(u => u._id === product.primaryUnit);
                              const secondaryUnit = product.secondaryUnit 
                                ? (typeof product.secondaryUnit === 'object'
                                  ? product.secondaryUnit
                                  : units.find(u => u._id === product.secondaryUnit))
                                : null;
                              const conversionFactor = product.conversionFactor;
                              
                              if (primaryUnit) {
                                return (
                                  <div className="mt-1 space-y-1">
                                    <p className="text-xs text-gray-500">
                                      {primaryUnit.name} ({primaryUnit.abbreviation})
                                    </p>
                                    {secondaryUnit && conversionFactor && conversionFactor !== 1 && (
                                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded-md">
                                        <Info className="w-3 h-3 text-purple-600" />
                                        <span className="text-xs font-medium text-purple-700">
                                          1 {primaryUnit.abbreviation} = {conversionFactor} {secondaryUnit.abbreviation}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                            return null;
                          })()}
                        </td>
                        <td className="px-4 py-4">
                          {(() => {
                            const product = products.find(p => p._id === item.productId);
                            if (product) {
                              const primaryUnit = typeof product.primaryUnit === 'object' 
                                ? product.primaryUnit 
                                : units.find(u => u._id === product.primaryUnit);
                              
                              if (primaryUnit && requiresSecondaryUnit(primaryUnit)) {
                                const secondaryUnit = typeof product.secondaryUnit === 'object'
                                  ? product.secondaryUnit
                                  : units.find(u => u._id === product.secondaryUnit);
                                
                                const conversionFactor = product.conversionFactor || 1;
                                
                                return (
                                  <div>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.secondaryQuantity || ''}
                                      onChange={(e) => updateOrderItem(index, 'secondaryQuantity', parseFloat(e.target.value) || '')}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      placeholder="Secondary quantity"
                                    />
                                    {secondaryUnit && (
                                      <div className="mt-1 space-y-0.5">
                                        <p className="text-xs text-gray-500">
                                          {secondaryUnit.name} ({secondaryUnit.abbreviation})
                                        </p>
                                        {conversionFactor && conversionFactor !== 1 && (
                                          <div className="inline-flex items-center px-2 py-0.5 bg-blue-50 border border-blue-200 rounded-md">
                                            <span className="text-xs font-medium text-blue-700">
                                              1 {primaryUnit?.abbreviation || ''} = {conversionFactor} {secondaryUnit.abbreviation}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                            return <span className="text-xs text-gray-400">N/A</span>;
                          })()}
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
                        {formData.autoGRN && (
                          <>
                            <td className="px-4 py-4">
                              <input
                                type="text"
                                value={item.batchNumber || ''}
                                onChange={(e) => updateOrderItem(index, 'batchNumber', e.target.value)}
                                placeholder="Auto-generated if empty"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <p className="text-xs text-gray-500 mt-1">Will be auto-generated if left empty</p>
                            </td>
                            <td className="px-4 py-4">
                              <input
                                type="date"
                                value={item.expiryDate || ''}
                                onChange={(e) => updateOrderItem(index, 'expiryDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-4 py-4">
                              {(() => {
                                const product = products.find(p => p._id === item.productId);
                                const hasPlantLink = product && product.plantId && product.subtypeId;
                                const slots = productSlots[item.productId] || [];
                                const isLoading = loadingSlots[item.productId];

                                if (!hasPlantLink) {
                                  return (
                                    <span className="text-xs text-gray-400">
                                      Product not linked to plant
                                    </span>
                                  );
                                }

                                if (isLoading) {
                                  return (
                                    <div className="text-xs text-gray-500">Loading slots...</div>
                                  );
                                }

                                if (slots.length === 0) {
                                  return (
                                    <span className="text-xs text-gray-400">No slots available</span>
                                  );
                                }

                                return (
                                  <select
                                    value={item.slotId || ''}
                                    onChange={(e) => updateOrderItem(index, 'slotId', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                  >
                                    <option value="">Select slot (optional)</option>
                                    {slots.map((slot) => (
                                      <option key={slot.value} value={slot.value}>
                                        {slot.label}
                                      </option>
                                    ))}
                                  </select>
                                );
                              })()}
                            </td>
                          </>
                        )}
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