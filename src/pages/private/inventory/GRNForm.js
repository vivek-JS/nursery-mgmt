import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Package,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Search,
  CheckCircle,
  AlertCircle,
  FileText,
  Camera,
  X,
  Upload,
} from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';

const GRNForm = () => {
  const navigate = useNavigate();
  const { purchaseOrderId } = useParams();
  const [loading, setLoading] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [grnItems, setGrnItems] = useState([]);
  const [additionalItems, setAdditionalItems] = useState([]);
  const [images, setImages] = useState([]); // Mandatory images
  const [formData, setFormData] = useState({
    invoiceNumber: '',
    vehicleNumber: '',
    driverName: '',
    driverContact: '',
    notes: '',
  });

  useEffect(() => {
    if (purchaseOrderId) {
      loadPurchaseOrder();
    }
    loadProducts();
  }, [purchaseOrderId]);

  const loadPurchaseOrder = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_PURCHASE_ORDER_BY_ID);
      const response = await instance.request({}, [purchaseOrderId]);
      if (response?.data) {
        const apiResponse = response.data;
        const purchaseOrderData = apiResponse.success ? apiResponse.data : apiResponse;
        setPurchaseOrder(purchaseOrderData);
        
        // Initialize GRN items from purchase order
        const items = purchaseOrderData.items || [];
        const initialItems = items.map(item => {
          const product = item.product || item.productId;
          return {
            productId: typeof product === 'object' ? product._id : product,
            productName: typeof product === 'object' ? product.name : '',
            orderedQuantity: item.quantity,
            receivedQuantity: 0,
            rate: item.rate || 0,
            amount: 0,
            batchNumber: '', // Will be auto-generated if empty
            lotNumber: '', // Alternative to batch number
            manufacturingDate: '',
            expiryDate: '', // Required field
            quality: 'good',
            notes: '',
          };
        });
        setGrnItems(initialItems);
      }
    } catch (error) {
      console.error('Error loading purchase order:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS);
      const response = await instance.request({}, { limit: 1000, isActive: true });
      if (response?.data) {
        const apiResponse = response.data;
        // Handle both response structures
        const productsData = apiResponse.success && apiResponse.data
          ? (Array.isArray(apiResponse.data) ? apiResponse.data : apiResponse.data.data || [])
          : apiResponse.status === 'Success' && apiResponse.data
          ? (Array.isArray(apiResponse.data) ? apiResponse.data : apiResponse.data.data || [])
          : [];
        setProducts(productsData);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const updateGrnItem = (index, field, value) => {
    const updatedItems = [...grnItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    if (field === 'receivedQuantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].receivedQuantity * updatedItems[index].rate;
    }

    setGrnItems(updatedItems);
  };

  const addAdditionalItem = () => {
    setAdditionalItems([...additionalItems, {
      productId: '',
      quantity: 1,
      rate: 0,
      amount: 0,
      batchNumber: '', // Will be auto-generated if empty
      lotNumber: '', // Alternative to batch number
      manufacturingDate: '',
      expiryDate: '', // Required field
      quality: 'good',
      notes: '',
    }]);
  };

  const updateAdditionalItem = (index, field, value) => {
    const updatedItems = [...additionalItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
    }

    setAdditionalItems(updatedItems);
  };

  const removeAdditionalItem = (index) => {
    setAdditionalItems(additionalItems.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    const grnTotal = grnItems.reduce((total, item) => total + item.amount, 0);
    const additionalTotal = additionalItems.reduce((total, item) => total + item.amount, 0);
    return grnTotal + additionalTotal;
  };

  // Handle image upload
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('Please select valid image files');
      return;
    }

    if (imageFiles.length > 10) {
      alert('Maximum 10 images allowed');
      return;
    }

    imageFiles.forEach(file => {
      if (file.size > 8 * 1024 * 1024) { // 8MB limit
        alert(`File ${file.name} is too large. Maximum size is 8MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage = {
          id: Date.now() + Math.random(),
          file: file,
          preview: e.target.result,
          name: file.name,
          size: file.size
        };
        
        setImages(prev => [...prev, newImage]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (imageId) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!purchaseOrderId) {
      alert('Purchase order ID is required');
      return;
    }

    if (grnItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    if (grnItems.some(item => item.receivedQuantity <= 0 || item.rate <= 0)) {
      alert('Please fill all item details correctly');
      return;
    }

    // Validate mandatory images
    if (images.length === 0) {
      alert('Please upload at least one image. Images are mandatory for GRN.');
      return;
    }

    // Validate expiry dates for items
    const itemsWithoutExpiry = grnItems.filter(item => !item.expiryDate);
    if (itemsWithoutExpiry.length > 0) {
      alert('Please enter expiry date for all items. Expiry date is mandatory.');
      return;
    }

    try {
      setLoading(true);
      
      // Create FormData for file uploads
      const formDataForUpload = new FormData();
      
      // Append images
      images.forEach((image) => {
        if (image.file) {
          formDataForUpload.append('images', image.file);
        }
      });

      // Append other data
      formDataForUpload.append('purchaseOrder', purchaseOrderId);
      formDataForUpload.append('items', JSON.stringify(grnItems.map(item => ({
        product: item.productId,
        quantity: item.receivedQuantity,
        acceptedQuantity: item.receivedQuantity,
        rate: item.rate,
        batchNumber: item.batchNumber || item.lotNumber || '', // Use batch or lot number
        lotNumber: item.lotNumber || item.batchNumber || '',
        manufactureDate: item.manufacturingDate || undefined,
        expiryDate: item.expiryDate, // Required
        amount: item.amount,
        notes: item.notes || '',
      }))));
      
      if (additionalItems.length > 0) {
        formDataForUpload.append('additionalItems', JSON.stringify(additionalItems.map(item => ({
          product: item.productId,
          quantity: item.quantity,
          acceptedQuantity: item.quantity,
          rate: item.rate,
          batchNumber: item.batchNumber || item.lotNumber || '',
          lotNumber: item.lotNumber || item.batchNumber || '',
          manufactureDate: item.manufacturingDate || undefined,
          expiryDate: item.expiryDate, // Required
          amount: item.amount,
          notes: item.notes || '',
        }))));
      }

      formDataForUpload.append('invoiceNumber', formData.invoiceNumber || '');
      formDataForUpload.append('vehicleNumber', formData.vehicleNumber || '');
      formDataForUpload.append('driverName', formData.driverName || '');
      formDataForUpload.append('notes', formData.notes || '');

      // Use NetworkManager with FormData
      const instance = NetworkManager(API.INVENTORY.CREATE_GRN);
      const response = await instance.request(formDataForUpload);

      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          alert('GRN created successfully!');
          navigate('/u/inventory/grn');
        } else {
          alert('Error creating GRN: ' + (apiResponse.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
      alert('Error creating GRN: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!purchaseOrder) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/u/inventory/grn')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Create GRN</h1>
              <p className="text-gray-600">Goods Receipt Note for {purchaseOrder.orderNumber}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Purchase Order Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Purchase Order Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                <p className="text-sm text-gray-900">{purchaseOrder.orderNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <p className="text-sm text-gray-900">{purchaseOrder.supplier.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                <p className="text-sm text-gray-900">
                  {new Date(purchaseOrder.orderDate).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Delivery</label>
                <p className="text-sm text-gray-900">
                  {purchaseOrder.expectedDeliveryDate 
                    ? new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString('en-IN')
                    : 'Not set'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* GRN Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">GRN Items</h2>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ordered Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Received Qty
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Batch/Lot No.
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expiry Date <span className="text-red-500">*</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quality
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {grnItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          <div className="text-sm text-gray-500">
                            Max: {item.orderedQuantity}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900">{item.orderedQuantity}</div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          max={item.orderedQuantity}
                          value={item.receivedQuantity}
                          onChange={(e) => updateGrnItem(index, 'receivedQuantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateGrnItem(index, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="text"
                          value={item.batchNumber || item.lotNumber || ''}
                          onChange={(e) => {
                            updateGrnItem(index, 'batchNumber', e.target.value);
                            updateGrnItem(index, 'lotNumber', e.target.value);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Auto-generated if empty"
                        />
                        <p className="text-xs text-gray-500 mt-1">Will be auto-generated if left empty</p>
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="date"
                          value={item.expiryDate}
                          onChange={(e) => updateGrnItem(index, 'expiryDate', e.target.value)}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={item.quality}
                          onChange={(e) => updateGrnItem(index, 'quality', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="excellent">Excellent</option>
                          <option value="good">Good</option>
                          <option value="average">Average</option>
                          <option value="poor">Poor</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Additional Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Additional Items</h2>
              <button
                type="button"
                onClick={addAdditionalItem}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            {/* Product Search */}
            <div className="mb-4">
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
            </div>

            {additionalItems.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rate
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Batch/Lot No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Expiry Date <span className="text-red-500">*</span>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {additionalItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-4">
                          <select
                            value={item.productId}
                            onChange={(e) => updateAdditionalItem(index, 'productId', e.target.value)}
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
                            value={item.quantity}
                            onChange={(e) => updateAdditionalItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => updateAdditionalItem(index, 'rate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={item.batchNumber || item.lotNumber || ''}
                            onChange={(e) => {
                              updateAdditionalItem(index, 'batchNumber', e.target.value);
                              updateAdditionalItem(index, 'lotNumber', e.target.value);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Auto-generated if empty"
                          />
                          <p className="text-xs text-gray-500 mt-1">Will be auto-generated if left empty</p>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={(e) => updateAdditionalItem(index, 'expiryDate', e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => removeAdditionalItem(index)}
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
            )}
          </div>

          {/* Delivery Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Delivery Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    invoiceNumber: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter invoice number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleNumber: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter vehicle number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    driverName: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter driver name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Contact
                </label>
                <input
                  type="text"
                  value={formData.driverContact}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    driverContact: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter driver contact"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter any additional notes..."
              />
            </div>
          </div>

          {/* Images Section - Mandatory */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              GRN Images <span className="text-red-500">*</span>
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Upload images of the received goods. At least one image is required. Maximum 10 images, 8MB each.
            </p>
            
            <div className="mb-4">
              <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer inline-flex">
                <Camera className="w-4 h-4" />
                <span>Upload Images</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {images.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.preview}
                      alt={image.name}
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{image.name}</p>
                  </div>
                ))}
              </div>
            )}

            {images.length === 0 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No images uploaded yet</p>
                <p className="text-sm text-red-500 mt-1">At least one image is required</p>
              </div>
            )}
          </div>

          {/* Total Amount */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-end">
              <div className="bg-gray-50 px-6 py-4 rounded-lg">
                <div className="text-lg font-semibold text-gray-800">
                  Total Amount: ₹{getTotalAmount().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/u/inventory/grn')}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || grnItems.length === 0}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{loading ? 'Creating...' : 'Create GRN'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GRNForm;