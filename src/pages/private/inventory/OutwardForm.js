import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, X, Send, Package, AlertCircle, CheckCircle } from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';

const OutwardForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);

  const [formData, setFormData] = useState({
    outwardDate: new Date().toISOString().split('T')[0],
    purpose: 'production',
    purposeDetails: '',
    department: '',
    recipientName: '',
    recipientPhone: '',
    destination: '',
    items: [],
    vehicleNumber: '',
    driverName: '',
    notes: '',
  });

  const [currentItem, setCurrentItem] = useState({
    product: '',
    batch: '',
    quantity: '',
    unit: '',
    rate: '',
  });

  const [availableBatches, setAvailableBatches] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [autoIssue, setAutoIssue] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [productsInstance, unitsInstance] = [
        NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS),
        NetworkManager(API.INVENTORY.GET_ALL_UNITS)
      ];
      
      const [productsRes, unitsRes] = await Promise.all([
        productsInstance.request({}, { isActive: true, limit: 1000 }),
        unitsInstance.request()
      ]);

      if (productsRes?.data?.success && productsRes?.data?.data) {
        setProducts(productsRes.data.data);
      }
      if (unitsRes?.data?.success && unitsRes?.data?.data) {
        setUnits(unitsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleProductSelect = async (productId) => {
    setCurrentItem({ ...currentItem, product: productId, batch: '', quantity: '', unit: '' });
    setSelectedBatch(null);
    setAvailableBatches([]);
    
    const product = products.find(p => p._id === productId);
    setSelectedProduct(product);
    
    if (productId) {
      try {
        const instance = NetworkManager(API.INVENTORY.GET_AVAILABLE_BATCHES_FOR_OUTWARD);
        const response = await instance.request({}, [productId]);
        
        if (response?.data?.success && response?.data?.data) {
          const batches = response.data.data;
          setAvailableBatches(batches);
          
          // Auto-select unit from product if available
          if (product?.primaryUnit && !currentItem.unit) {
            setCurrentItem(prev => ({ ...prev, unit: product.primaryUnit._id || product.primaryUnit }));
          }
        }
      } catch (error) {
        console.error('Error fetching batches:', error);
        setAvailableBatches([]);
      }
    } else {
      setSelectedProduct(null);
    }
  };

  const handleBatchSelect = (batchId) => {
    const batch = availableBatches.find(b => b._id === batchId);
    setSelectedBatch(batch);
    
    if (batch) {
      setCurrentItem({
        ...currentItem,
        batch: batchId,
        unit: batch.unit?._id || batch.unit || currentItem.unit,
        quantity: '',
      });
    }
  };

  const handleQuantityChange = (value) => {
    const quantity = parseFloat(value) || 0;
    setCurrentItem({ ...currentItem, quantity: value });
    
    // Auto-calculate amount if rate is provided
    if (currentItem.rate && quantity > 0) {
      const amount = quantity * parseFloat(currentItem.rate);
      // Amount will be calculated when adding item
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product || !currentItem.batch || !currentItem.quantity || !currentItem.unit) {
      alert('Please fill all required fields (Product, Batch, Quantity, Unit)');
      return;
    }

    const quantity = parseFloat(currentItem.quantity);
    if (quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }

    const batch = availableBatches.find((b) => b._id === currentItem.batch);
    if (!batch) {
      alert('Selected batch not found');
      return;
    }

    if (quantity > batch.remainingQuantity) {
      alert(`Insufficient stock! Only ${batch.remainingQuantity} ${batch.unit?.abbreviation || ''} available in this batch.`);
      return;
    }

    const product = products.find((p) => p._id === currentItem.product);
    const unit = units.find((u) => u._id === currentItem.unit);
    
    if (!product || !unit) {
      alert('Product or unit not found');
      return;
    }

    const rate = parseFloat(currentItem.rate) || 0;
    const amount = rate > 0 ? quantity * rate : 0;

    const newItem = {
      product: currentItem.product,
      batch: currentItem.batch,
      quantity: quantity,
      unit: currentItem.unit,
      rate: rate || undefined,
      amount: amount || undefined,
      // Display fields
      productName: product.name,
      batchNumber: batch.batchNumber,
      unitName: unit.abbreviation,
      availableQuantity: batch.remainingQuantity,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    // Reset current item but keep product selected for quick additions
    setCurrentItem({
      product: currentItem.product,
      batch: '',
      quantity: '',
      unit: currentItem.unit,
      rate: currentItem.rate,
    });
    setSelectedBatch(null);
    
    // Refresh batches to update available quantities
    if (currentItem.product) {
      handleProductSelect(currentItem.product);
    }
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      // Create outward entry
      const createInstance = NetworkManager(API.INVENTORY.CREATE_OUTWARD);
      const createResponse = await createInstance.request(formData);
      
      if (createResponse?.data?.success && createResponse?.data?.data) {
        const outwardId = createResponse.data.data._id;
        
        // Auto-issue if enabled
        if (autoIssue) {
          try {
            const issueInstance = NetworkManager(API.INVENTORY.ISSUE_OUTWARD);
            await issueInstance.request({}, [outwardId]);
            alert('Outward entry created and issued successfully! Stock has been deducted.');
          } catch (issueError) {
            console.error('Error issuing outward:', issueError);
            alert('Outward entry created but failed to issue. Please issue manually from the list.');
          }
        } else {
          alert('Outward entry created successfully! Please issue it from the list to deduct stock.');
        }
        
        navigate('/u/inventory/outward');
      } else {
        throw new Error(createResponse?.data?.message || 'Failed to create outward entry');
      }
    } catch (error) {
      console.error('Error creating outward:', error);
      const errorMessage = error?.data?.message || error?.message || 'Error creating outward entry';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = formData.items.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Validation function to check if form is valid
  const isFormValid = () => {
    const checks = {
      outwardDate: !!formData.outwardDate,
      purpose: !!formData.purpose,
      hasItems: formData.items.length > 0,
      itemsValid: formData.items.every(item => 
        item.product && 
        item.batch && 
        item.quantity && 
        item.quantity > 0 && 
        item.unit
      ),
      notLoading: !loading
    };

    // All checks must pass
    const isValid = Object.values(checks).every(check => check === true);
    
    return { isValid, checks };
  };

  const { isValid: formIsValid, checks: validationChecks } = isFormValid();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-2 md:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-3 md:mb-4">
          <button
            onClick={() => navigate('/u/inventory/outward')}
            className="group flex items-center space-x-1.5 text-gray-600 hover:text-indigo-600 mb-2 transition-all duration-200 hover:translate-x-[-2px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs md:text-sm font-medium">Back to Outward List</span>
          </button>

          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl md:rounded-2xl shadow-lg p-3 md:p-4 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative z-10 flex items-center space-x-2 md:space-x-3">
              <div className="p-2 md:p-2.5 bg-white bg-opacity-20 backdrop-blur-lg rounded-lg md:rounded-xl shadow-md">
                <Send className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold mb-0.5 drop-shadow-lg">Issue Stock</h1>
                <p className="text-xs md:text-sm text-indigo-100">Create and manage stock outward entries</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          {/* Basic Details - Compact */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-2 md:px-4 md:py-2.5">
              <h2 className="text-sm md:text-base font-bold text-white flex items-center">
                <Package className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                Basic Details
              </h2>
            </div>
            <div className="p-3 md:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Outward Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.outwardDate}
                  onChange={(e) => setFormData({ ...formData, outwardDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Purpose <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white"
                  required
                >
                  <option value="production">Production</option>
                  <option value="sales">Sales</option>
                  <option value="transfer">Transfer</option>
                  <option value="wastage">Wastage</option>
                  <option value="return">Return</option>
                  <option value="sample">Sample</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Purpose Details
                </label>
                <input
                  type="text"
                  value={formData.purposeDetails}
                  onChange={(e) => setFormData({ ...formData, purposeDetails: e.target.value })}
                  className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="e.g., Production Order #123"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Department name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Recipient name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Recipient Phone</label>
                <input
                  type="tel"
                  value={formData.recipientPhone}
                  onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                  className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder="Phone number"
                />
              </div>
            </div>
            </div>
          </div>

          {/* Add Item Section - Compact */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-3 py-2 md:px-4 md:py-2.5">
              <h2 className="text-sm md:text-base font-bold text-white flex items-center">
                <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                Add Item
              </h2>
            </div>
            <div className="p-3 md:p-4">
            
            {/* Product Selection */}
            <div className="mb-2 md:mb-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Product <span className="text-red-500">*</span>
              </label>
              <select
                value={currentItem.product}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
              >
                <option value="">Select Product</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <div className="mt-1.5 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-center space-x-1.5">
                  <Package className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-700">Current Stock:</span>
                  <span className="text-xs font-bold text-blue-700">{selectedProduct.currentStock || 0} {selectedProduct.primaryUnit?.abbreviation || ''}</span>
                </div>
              )}
            </div>

            {/* Batch Selection - Only show if product selected */}
            {currentItem.product && (
              <div className="mb-2 md:mb-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Batch <span className="text-red-500">*</span>
                </label>
                {availableBatches.length === 0 ? (
                  <div className="p-2 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-300 rounded-lg flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-yellow-800">No available batches for this product</span>
                  </div>
                ) : (
                  <select
                    value={currentItem.batch}
                    onChange={(e) => handleBatchSelect(e.target.value)}
                    className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white"
                  >
                    <option value="">Select Batch</option>
                    {availableBatches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.batchNumber} - Available: {b.remainingQuantity} {b.unit?.abbreviation || ''}
                        {b.expiryDate && ` (Exp: ${new Date(b.expiryDate).toLocaleDateString()})`}
                      </option>
                    ))}
                  </select>
                )}
                {selectedBatch && (
                  <div className="mt-1.5 p-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg flex items-center space-x-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                    <span className="text-xs font-semibold text-gray-700">Available:</span>
                    <span className="text-xs font-bold text-green-700">{selectedBatch.remainingQuantity} {selectedBatch.unit?.abbreviation || ''}</span>
                  </div>
                )}
              </div>
            )}

            {/* Quantity, Unit, Rate - Compact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={currentItem.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  placeholder="0"
                  step="0.01"
                  min="0"
                  max={selectedBatch?.remainingQuantity || undefined}
                />
                {selectedBatch && currentItem.quantity && parseFloat(currentItem.quantity) > selectedBatch.remainingQuantity && (
                  <p className="mt-0.5 text-xs text-red-600">Exceeds available quantity!</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Unit <span className="text-red-500">*</span>
                </label>
                <select
                  value={currentItem.unit}
                  onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                  className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                  disabled={!currentItem.product}
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.abbreviation} ({u.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Rate (Optional)
                </label>
                <input
                  type="number"
                  value={currentItem.rate}
                  onChange={(e) => setCurrentItem({ ...currentItem, rate: e.target.value })}
                  className="w-full px-2.5 py-1.5 md:px-3 md:py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Add Button */}
            <div className="mt-2 md:mt-3">
              <button
                type="button"
                onClick={handleAddItem}
                disabled={!currentItem.product || !currentItem.batch || !currentItem.quantity || !currentItem.unit}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm font-semibold shadow-md hover:shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>
            </div>
          </div>

          {/* Items List - Compact */}
          {formData.items.length > 0 && (
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 md:px-4 md:py-2.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                  <h2 className="text-sm md:text-base font-bold text-white flex items-center">
                    <Package className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                    Items ({formData.items.length})
                  </h2>
                  {totalAmount > 0 && (
                    <div className="text-left sm:text-right bg-white bg-opacity-20 backdrop-blur-lg rounded-lg px-2.5 py-1.5">
                      <p className="text-xs text-emerald-100 font-medium">Total Amount</p>
                      <p className="text-sm md:text-base font-bold text-white">₹{totalAmount.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-3 md:p-4">
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="group border border-gray-200 rounded-lg p-2.5 md:p-3 hover:border-emerald-400 hover:shadow-md transition-all duration-300 bg-gradient-to-r from-white to-gray-50">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div className="flex-1 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-2 w-full">
                        <div className="xs:col-span-2">
                          <p className="text-xs font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Product</p>
                          <p className="font-bold text-xs md:text-sm break-words text-gray-800">{item.productName}</p>
                          <div className="mt-1 inline-flex items-center px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                            Batch: {item.batchNumber}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Quantity</p>
                          <p className="font-bold text-xs md:text-sm text-gray-800">{item.quantity} {item.unitName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Avail: <span className="font-semibold">{item.availableQuantity}</span></p>
                        </div>
                        {item.amount > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-0.5 uppercase tracking-wide">Amount</p>
                            <p className="font-bold text-sm text-emerald-600">₹{item.amount.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="self-end sm:self-start p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 flex-shrink-0"
                        aria-label="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>
          )}

          {/* Auto-Issue Toggle */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2 md:px-4 md:py-2.5">
              <h2 className="text-sm md:text-base font-bold text-white flex items-center">
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                Auto-Issue Settings
              </h2>
            </div>
            <div className="p-3 md:p-4">
              <div className="flex items-center space-x-2.5 p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                <input
                  type="checkbox"
                  id="autoIssue"
                  checked={autoIssue}
                  onChange={(e) => setAutoIssue(e.target.checked)}
                  className="w-4 h-4 text-orange-600 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="autoIssue" className="text-xs md:text-sm font-semibold text-gray-800 cursor-pointer flex-1">
                  Auto-issue after creation (deduct stock immediately)
                </label>
              </div>
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-gray-700 flex items-start">
                  {autoIssue ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-green-600 mr-1.5 mt-0.5 flex-shrink-0" />
                      <span><span className="font-semibold">Enabled:</span> Stock will be deducted and ledger entries will be created automatically upon submission.</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 mr-1.5 mt-0.5 flex-shrink-0" />
                      <span><span className="font-semibold">Disabled:</span> You will need to issue this outward manually from the list to deduct stock.</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-500 to-gray-600 px-3 py-2 md:px-4 md:py-2.5">
              <h2 className="text-sm md:text-base font-bold text-white flex items-center">
                <Package className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                Additional Notes
              </h2>
            </div>
            <div className="p-3 md:p-4">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-2.5 py-2 md:px-3 md:py-2.5 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-1 focus:ring-slate-500 focus:border-slate-500 transition-all duration-200 resize-none"
                placeholder="Enter any additional notes or remarks about this outward entry..."
              />
            </div>
          </div>

          {/* Validation Status */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className={`px-3 py-2 md:px-4 md:py-2.5 ${formIsValid ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-orange-600'}`}>
              <h2 className="text-sm md:text-base font-bold text-white flex items-center">
                {formIsValid ? (
                  <>
                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                    Validation Checks
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 md:w-5 md:h-5 mr-1.5" />
                    Validation Checks
                  </>
                )}
              </h2>
            </div>
            <div className="p-3 md:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <div className={`p-2 rounded-lg border ${validationChecks.outwardDate ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center space-x-1.5">
                    {validationChecks.outwardDate ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Outward Date</p>
                      <p className={`text-xs font-bold ${validationChecks.outwardDate ? 'text-green-700' : 'text-red-700'}`}>
                        {validationChecks.outwardDate ? '✓ Filled' : '✗ Required'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-2 rounded-lg border ${validationChecks.purpose ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center space-x-1.5">
                    {validationChecks.purpose ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Purpose</p>
                      <p className={`text-xs font-bold ${validationChecks.purpose ? 'text-green-700' : 'text-red-700'}`}>
                        {validationChecks.purpose ? '✓ Selected' : '✗ Required'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-2 rounded-lg border ${validationChecks.hasItems ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center space-x-1.5">
                    {validationChecks.hasItems ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Items Added</p>
                      <p className={`text-xs font-bold ${validationChecks.hasItems ? 'text-green-700' : 'text-red-700'}`}>
                        {formData.items.length} {validationChecks.hasItems ? '✓' : '✗'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-2 rounded-lg border ${validationChecks.itemsValid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className="flex items-center space-x-1.5">
                    {validationChecks.itemsValid ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Items Valid</p>
                      <p className={`text-xs font-bold ${validationChecks.itemsValid ? 'text-green-700' : 'text-red-700'}`}>
                        {validationChecks.itemsValid ? '✓ All Valid' : '✗ Check Items'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-2 rounded-lg border ${validationChecks.notLoading ? 'bg-green-50 border-green-300' : 'bg-yellow-50 border-yellow-300'}`}>
                  <div className="flex items-center space-x-1.5">
                    {validationChecks.notLoading ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Status</p>
                      <p className={`text-xs font-bold ${validationChecks.notLoading ? 'text-green-700' : 'text-yellow-700'}`}>
                        {validationChecks.notLoading ? '✓ Ready' : '⏳ Processing...'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`p-2 rounded-lg border ${formIsValid ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-400' : 'bg-gradient-to-r from-red-100 to-orange-100 border-red-400'}`}>
                  <div className="flex items-center space-x-1.5">
                    {formIsValid ? (
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="text-xs font-semibold text-gray-600">Overall Status</p>
                      <p className={`text-sm font-bold ${formIsValid ? 'text-green-700' : 'text-red-700'}`}>
                        {formIsValid ? '✓ VALID' : '✗ INVALID'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pb-2">
            <button
              type="button"
              onClick={() => navigate('/u/inventory/outward')}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold text-xs md:text-sm text-gray-700 hover:text-gray-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formIsValid}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs md:text-sm relative overflow-hidden group"
              title={!formIsValid ? 'Please fill all required fields' : ''}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <Save className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{loading ? 'Creating...' : 'Create Outward Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OutwardForm;

