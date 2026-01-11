import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Package,
  ShoppingCart,
} from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';
import { formatCurrency } from '../../../utils/numberUtils';

const RamAgriInputOrderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [merchants, setMerchants] = useState([]);
  const [ramAgriCrops, setRamAgriCrops] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [formData, setFormData] = useState({
    supplier: {
      name: '',
      contact: '',
      email: '',
      address: '',
    },
    expectedDeliveryDate: '',
    notes: '',
    autoGRN: true, // Auto GRN toggle - pre-ticked by default
  });

  useEffect(() => {
    loadMerchants();
    loadRamAgriCrops();
    loadUnits();
  }, []);

  const loadMerchants = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_MERCHANTS_SIMPLE);
      const response = await instance.request({}, { limit: 1000 });
      if (response?.data) {
        const apiResponse = response.data;
        let merchantsData = [];
        
        if (apiResponse.success && apiResponse.data) {
          merchantsData = Array.isArray(apiResponse.data) ? apiResponse.data : [];
        } else if (apiResponse.status === 'Success' && apiResponse.data) {
          merchantsData = Array.isArray(apiResponse.data.data) 
            ? apiResponse.data.data 
            : Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
        }
        
        // Filter: Only show merchants that have linkedProducts (Ram Agri products)
        // linkedProducts is an array field in the merchant model
        const merchantsWithLinkedProducts = merchantsData.filter(merchant => {
          // Check if linkedProducts exists and is a non-empty array
          const hasLinkedProducts = merchant.linkedProducts && 
                 Array.isArray(merchant.linkedProducts) && 
                 merchant.linkedProducts.length > 0;
          return hasLinkedProducts;
        });
        
        console.log(`Ram Agri Order: Total merchants from API: ${merchantsData.length}`);
        console.log(`Ram Agri Order: Merchants with linked products: ${merchantsWithLinkedProducts.length}`);
        if (merchantsData.length > 0) {
          console.log('Ram Agri Order: Sample merchant linkedProducts:', merchantsData[0]?.linkedProducts);
        }
        
        setMerchants(merchantsWithLinkedProducts);
      }
    } catch (error) {
      console.error('Error loading merchants:', error);
    }
  };

  const loadRamAgriCrops = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_RAM_AGRI_INPUTS);
      const response = await instance.request();
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.status === 'Success' && apiResponse.data) {
          const data = Array.isArray(apiResponse.data) ? apiResponse.data : [];
          setRamAgriCrops(data);
        } else if (apiResponse.success && apiResponse.data) {
          const data = Array.isArray(apiResponse.data) ? apiResponse.data : [];
          setRamAgriCrops(data);
        }
      }
    } catch (error) {
      console.error('Error loading Ram Agri crops:', error);
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

  const handleMerchantChange = (merchantId) => {
    const merchant = merchants.find(m => m._id === merchantId);
    if (merchant) {
      setSelectedMerchant(merchant);
      setFormData(prev => ({
        ...prev,
        supplier: {
          name: merchant.name,
          contact: merchant.contactPerson || merchant.phone || '',
          email: merchant.email || '',
          address: typeof merchant.address === 'string' 
            ? merchant.address 
            : merchant.address 
            ? `${merchant.address.street || ''} ${merchant.address.city || ''} ${merchant.address.state || ''} ${merchant.address.pincode || ''}`.trim() 
            : '',
        }
      }));
      // Clear order items when merchant changes
      setOrderItems([]);
    }
  };

  // Get available crops/varieties for selected merchant (filtered by linkedProducts)
  const getAvailableCropsForMerchant = () => {
    if (!selectedMerchant || !selectedMerchant.linkedProducts || !Array.isArray(selectedMerchant.linkedProducts) || selectedMerchant.linkedProducts.length === 0) {
      return [];
    }

    // Get unique crop IDs from merchant's linkedProducts
    const linkedCropIds = [...new Set(selectedMerchant.linkedProducts.map(lp => lp.cropId?.toString() || lp.cropId))];
    
    // Filter crops that are in the merchant's linkedProducts
    const availableCrops = ramAgriCrops.filter(crop => 
      linkedCropIds.includes(crop._id?.toString() || crop._id)
    ).map(crop => {
      // Filter varieties to only show those in merchant's linkedProducts
      const linkedVarietyIds = selectedMerchant.linkedProducts
        .filter(lp => (lp.cropId?.toString() || lp.cropId) === (crop._id?.toString() || crop._id))
        .map(lp => lp.varietyId?.toString() || lp.varietyId);
      
      return {
        ...crop,
        varieties: crop.varieties?.filter(variety => 
          linkedVarietyIds.includes(variety._id?.toString() || variety._id)
        ) || []
      };
    }).filter(crop => crop.varieties && crop.varieties.length > 0);

    return availableCrops;
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      ramAgriCropId: '',
      ramAgriVarietyId: '',
      ramAgriCropName: '',
      ramAgriVarietyName: '',
      primaryUnit: '',
      secondaryUnit: '',
      conversionFactor: 1,
      selectedUnit: 'primary', // 'primary' or 'secondary'
      quantity: 1,
      rate: 0,
      amount: 0,
    }]);
  };

  const updateOrderItem = (index, field, value) => {
    const updatedItems = [...orderItems];
    const currentItem = updatedItems[index];
    
    updatedItems[index] = {
      ...currentItem,
      [field]: value,
    };

    // Handle crop selection
    if (field === 'ramAgriCropId') {
      if (value) {
        const availableCrops = getAvailableCropsForMerchant();
        const crop = availableCrops.find(c => c._id === value) || ramAgriCrops.find(c => c._id === value);
        if (crop) {
          updatedItems[index].ramAgriCropName = crop.cropName || '';
        }
      } else {
        updatedItems[index].ramAgriCropName = '';
        updatedItems[index].ramAgriVarietyId = '';
        updatedItems[index].ramAgriVarietyName = '';
      }
    }

    // Handle variety selection
    if (field === 'ramAgriVarietyId') {
      if (value && updatedItems[index].ramAgriCropId) {
        const availableCrops = getAvailableCropsForMerchant();
        const crop = availableCrops.find(c => c._id === updatedItems[index].ramAgriCropId) || ramAgriCrops.find(c => c._id === updatedItems[index].ramAgriCropId);
        if (crop && crop.varieties) {
          const variety = crop.varieties.find(v => v._id === value);
          if (variety) {
            updatedItems[index].ramAgriVarietyName = variety.name || '';
            // Set UOM from variety
            updatedItems[index].primaryUnit = variety.primaryUnit?._id || variety.primaryUnit || '';
            updatedItems[index].secondaryUnit = variety.secondaryUnit?._id || variety.secondaryUnit || '';
            updatedItems[index].conversionFactor = variety.conversionFactor || 1;
            updatedItems[index].selectedUnit = 'primary'; // Default to primary unit
            // Auto-set rate from purchasePrice
            if (variety.purchasePrice !== undefined && variety.purchasePrice !== null) {
              updatedItems[index].rate = Number(variety.purchasePrice);
            } else {
              updatedItems[index].rate = 0;
            }
          }
        }
      } else {
        updatedItems[index].ramAgriVarietyName = '';
        updatedItems[index].primaryUnit = '';
        updatedItems[index].secondaryUnit = '';
        updatedItems[index].conversionFactor = 1;
        updatedItems[index].selectedUnit = 'primary';
      }
    }

    // Handle unit selection change
    if (field === 'selectedUnit') {
      // When unit changes, quantity stays the same (conversion happens on backend)
      updatedItems[index].selectedUnit = value;
    }

    // Calculate amount
    if (field === 'quantity' || field === 'rate') {
      const quantity = updatedItems[index].quantity || 0;
      const rate = updatedItems[index].rate || 0;
      updatedItems[index].amount = quantity * rate;
    }

    setOrderItems(updatedItems);
  };

  const removeOrderItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const getCurrentRateForVariety = (variety) => {
    if (!variety || !variety.rates || variety.rates.length === 0) {
      return variety?.defaultRate ? { rate: variety.defaultRate } : null;
    }
    const currentDate = new Date();
    const activeRate = variety.rates.find(
      (r) => new Date(r.startDate) <= currentDate && new Date(r.endDate) >= currentDate
    );
    if (activeRate) return activeRate;
    return variety.rates.sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
  };

  const formatRateDisplay = (rateObj) => {
    if (!rateObj) return 'N/A';
    if (rateObj.minRate !== undefined && rateObj.maxRate !== undefined) {
      const minRate = Number(rateObj.minRate);
      const maxRate = Number(rateObj.maxRate);
      if (minRate === maxRate) {
        return `₹${minRate.toFixed(2)}`;
      } else {
        return `₹${minRate.toFixed(2)} - ₹${maxRate.toFixed(2)}`;
      }
    }
    const rate = rateObj.rate !== undefined ? rateObj.rate : rateObj;
    if (typeof rate === 'number') {
      return `₹${rate.toFixed(2)}`;
    }
    return 'N/A';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMerchant || !selectedMerchant._id) {
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

    // Validate order items
    for (const item of orderItems) {
      if (!item.ramAgriCropId || !item.ramAgriVarietyId) {
        alert('Please select crop and variety for all items');
        return;
      }
      if (!item.quantity || item.quantity <= 0) {
        alert('Please enter quantity for all items');
        return;
      }
    }

    try {
      setLoading(true);
      
      const transformedItems = orderItems.map(item => {
        // Determine which unit is selected (primary or secondary)
        const selectedUnitType = item.selectedUnit || 'primary';
        let unitId;
        
        if (selectedUnitType === 'secondary' && item.secondaryUnit) {
          // If secondary unit is selected, use secondary unit ID
          unitId = item.secondaryUnit;
        } else {
          // Primary unit is selected
          unitId = item.primaryUnit;
        }
        
        // Fallback to variety's primary unit if not found
        if (!unitId) {
          const crop = ramAgriCrops.find(c => c._id === item.ramAgriCropId);
          if (crop && crop.varieties) {
            const variety = crop.varieties.find(v => v._id === item.ramAgriVarietyId);
            if (variety) {
              unitId = variety.primaryUnit?._id || variety.primaryUnit;
            }
          }
        }
        
        if (!unitId) {
          throw new Error(`Unit not found for variety "${item.ramAgriVarietyName}". Please ensure the variety has a primary unit defined.`);
        }
        
        return {
          isRamAgriProduct: true,
          ramAgriCropId: item.ramAgriCropId,
          ramAgriVarietyId: item.ramAgriVarietyId,
          ramAgriCropName: item.ramAgriCropName || '',
          ramAgriVarietyName: item.ramAgriVarietyName || '',
          unit: unitId, // Send the selected unit (primary or secondary)
          quantity: item.quantity, // Quantity in selected unit
          selectedUnitType: selectedUnitType, // 'primary' or 'secondary' - for backend conversion
          conversionFactor: item.conversionFactor || 1, // Conversion factor for backend
          rate: item.rate || 0,
          amount: (item.quantity || 0) * (item.rate || 0),
          gst: 0,
          discount: 0,
        };
      });
      
      const instance = NetworkManager(API.INVENTORY.CREATE_PURCHASE_ORDER);
      const response = await instance.request({
        supplier: selectedMerchant._id,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        items: transformedItems,
        notes: formData.notes,
        autoGRN: formData.autoGRN || false, // Include auto GRN flag
        isRamAgriOrder: true,
      });

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          alert('Ram Agri Input Order created successfully!');
          navigate('/u/inventory/purchase-orders');
        } else {
          alert('Error creating order: ' + (apiResponse.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error creating order: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + item.amount, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/u/inventory')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Ram Agri Input Order</h1>
              <p className="text-gray-600">Create order for Ram Agri products</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Merchant Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Merchant Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Merchant <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMerchant?._id || ''}
                  onChange={(e) => handleMerchantChange(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select a merchant</option>
                  {merchants.map(merchant => (
                    <option key={merchant._id} value={merchant._id}>
                      {merchant.name}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
                <input
                  type="text"
                  value={formData.supplier.contact}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Auto-filled from merchant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.supplier.email}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  placeholder="Auto-filled from merchant"
                />
              </div>
            </div>
            
            {/* Auto GRN Toggle */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={formData.autoGRN}
                  onChange={(e) => setFormData(prev => ({ ...prev, autoGRN: e.target.checked }))}
                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    Auto GRN (Automatically create GRN when order is approved)
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.autoGRN 
                      ? 'GRN will be automatically created and approved when the purchase order is approved. Stock will be updated immediately.'
                      : 'GRN can be created separately later from the purchase order details page. Stock will be updated when GRN is approved.'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Order Items</h2>
                {selectedMerchant && (
                  <p className="text-sm text-gray-600 mt-1">
                    Only products linked to <strong>{selectedMerchant.name}</strong> are available
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={addOrderItem}
                disabled={!selectedMerchant}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedMerchant
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
            {!selectedMerchant && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please select a merchant first to add order items
                </p>
              </div>
            )}

            {orderItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Crop & Variety <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate (₹)
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
                          <div className="space-y-2">
                            <select
                              value={item.ramAgriCropId || ''}
                              onChange={(e) => updateOrderItem(index, 'ramAgriCropId', e.target.value)}
                              required
                              disabled={!selectedMerchant}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                              <option value="">Select Crop</option>
                              {(() => {
                                const availableCrops = getAvailableCropsForMerchant();
                                if (!selectedMerchant) {
                                  return (
                                    <option disabled>Please select a merchant first</option>
                                  );
                                }
                                if (availableCrops.length === 0) {
                                  return (
                                    <option disabled>No linked products available for this merchant</option>
                                  );
                                }
                                return availableCrops.map(crop => (
                                  <option key={crop._id} value={crop._id}>
                                    {crop.cropName} ({crop.varieties?.length || 0} varieties)
                                  </option>
                                ));
                              })()}
                            </select>
                            {item.ramAgriCropId && (() => {
                              const availableCrops = getAvailableCropsForMerchant();
                              const crop = availableCrops.find(c => c._id === item.ramAgriCropId) || ramAgriCrops.find(c => c._id === item.ramAgriCropId);
                              if (!crop || !crop.varieties || crop.varieties.length === 0) {
                                return (
                                  <div className="text-xs text-red-500 mt-1">
                                    No linked varieties available for this merchant
                                  </div>
                                );
                              }
                              // Filter varieties to only show active ones that are in merchant's linkedProducts
                              const availableVarieties = crop.varieties.filter(v => v.isActive !== false);
                              if (availableVarieties.length === 0) {
                                return (
                                  <div className="text-xs text-red-500 mt-1">
                                    No active varieties available
                                  </div>
                                );
                              }
                              return (
                                <select
                                  value={item.ramAgriVarietyId || ''}
                                  onChange={(e) => updateOrderItem(index, 'ramAgriVarietyId', e.target.value)}
                                  required
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                                >
                                  <option value="">Select Variety</option>
                                  {availableVarieties.map(variety => {
                                    const currentRate = getCurrentRateForVariety(variety);
                                    const rateDisplay = formatRateDisplay(currentRate);
                                    const primaryUnit = units.find(u => u._id === (variety.primaryUnit?._id || variety.primaryUnit));
                                    const unitDisplay = primaryUnit ? `(${primaryUnit.abbreviation || primaryUnit.name})` : '';
                                    const stock = variety.currentStock || 0;
                                    return (
                                      <option key={variety._id} value={variety._id}>
                                        {variety.name} {unitDisplay} - Stock: {stock} {rateDisplay !== 'N/A' ? `| Rate: ${rateDisplay}` : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              );
                            })()}
                            {item.ramAgriCropId && item.ramAgriVarietyId && (() => {
                              const availableCrops = getAvailableCropsForMerchant();
                              const crop = availableCrops.find(c => c._id === item.ramAgriCropId) || ramAgriCrops.find(c => c._id === item.ramAgriCropId);
                              if (crop) {
                                const variety = crop.varieties.find(v => v._id === item.ramAgriVarietyId);
                                if (variety) {
                                  const primaryUnit = units.find(u => u._id === (variety.primaryUnit?._id || variety.primaryUnit));
                                  const unitDisplay = primaryUnit ? primaryUnit.abbreviation || primaryUnit.name : 'N/A';
                                  const stock = variety.currentStock || 0;
                                  return (
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
                                      <div className="text-green-700 font-medium">
                                        {crop.cropName} - {variety.name}
                                      </div>
                                      <div className="text-green-600 text-xs mt-1">
                                        Stock: {stock} {unitDisplay} | Unit: {unitDisplay}
                                      </div>
                                    </div>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {item.ramAgriCropId && item.ramAgriVarietyId ? (
                            <select
                              value={item.selectedUnit || 'primary'}
                              onChange={(e) => updateOrderItem(index, 'selectedUnit', e.target.value)}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            >
                              {(() => {
                                const availableCrops = getAvailableCropsForMerchant();
                                const crop = availableCrops.find(c => c._id === item.ramAgriCropId) || ramAgriCrops.find(c => c._id === item.ramAgriCropId);
                                if (!crop) return null;
                                const variety = crop.varieties.find(v => v._id === item.ramAgriVarietyId);
                                if (!variety) return null;
                                
                                const primaryUnit = units.find(u => u._id === (variety.primaryUnit?._id || variety.primaryUnit));
                                const secondaryUnit = variety.secondaryUnit ? units.find(u => u._id === (variety.secondaryUnit?._id || variety.secondaryUnit)) : null;
                                
                                return (
                                  <>
                                    <option value="primary">
                                      {primaryUnit ? `${primaryUnit.abbreviation || primaryUnit.name} (Primary)` : 'Primary Unit'}
                                    </option>
                                    {secondaryUnit && (
                                      <option value="secondary">
                                        {secondaryUnit.abbreviation || secondaryUnit.name} (Secondary)
                                      </option>
                                    )}
                                  </>
                                );
                              })()}
                            </select>
                          ) : (
                            <div className="text-xs text-gray-400 px-3 py-2">Select variety first</div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            required
                            disabled={!item.ramAgriCropId || !item.ramAgriVarietyId}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            placeholder="Quantity"
                          />
                          {item.ramAgriCropId && item.ramAgriVarietyId && item.selectedUnit === 'secondary' && item.conversionFactor > 1 && (
                            <p className="text-xs text-gray-500 mt-1">
                              = {(item.quantity * item.conversionFactor).toFixed(4)} {units.find(u => u._id === item.primaryUnit)?.abbreviation || 'primary'} (converted)
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate || ''}
                            onChange={(e) => updateOrderItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            required
                            disabled={!item.ramAgriCropId || !item.ramAgriVarietyId}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                            placeholder="0.00"
                          />
                          {item.ramAgriCropId && item.ramAgriVarietyId && (
                            <p className="text-xs text-gray-500 mt-1">
                              Default: ₹{(() => {
                                const availableCrops = getAvailableCropsForMerchant();
                                const crop = availableCrops.find(c => c._id === item.ramAgriCropId) || ramAgriCrops.find(c => c._id === item.ramAgriCropId);
                                if (crop) {
                                  const variety = crop.varieties.find(v => v._id === item.ramAgriVarietyId);
                                  if (variety && variety.purchasePrice !== undefined && variety.purchasePrice !== null) {
                                    return Number(variety.purchasePrice).toLocaleString('en-IN', { maximumFractionDigits: 2 });
                                  }
                                }
                                return '0.00';
                              })()}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(item.amount || 0)}
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
                <div className="bg-green-50 px-6 py-4 rounded-lg border border-green-200">
                  <div className="text-lg font-semibold text-gray-800">
                    Total Amount: {formatCurrency(getTotalAmount())}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter any additional notes..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/u/inventory')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || orderItems.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{loading ? 'Creating...' : 'Create Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RamAgriInputOrderForm;

