import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Search,
  User,
  MapPin,
  CreditCard,
  Upload,
  Camera,
  X,
  CheckCircle,
} from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';
import useDebounce from '../../../hooks/useDebounce';
import { Toast } from 'helpers/toasts/toastHelper';

const SellOrderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [merchantData, setMerchantData] = useState({});
  const [farmerData, setFarmerData] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Filter merchants for customer/both category (like PurchaseOrderForm)
  const allMerchants = React.useMemo(() => {
    return merchants
      .filter(m => m.category === 'both' || m.category === 'customer')
      .map(m => ({
        ...m,
        displayName: m.name,
      }));
  }, [merchants]);

  const [formData, setFormData] = useState({
    merchant: '',
    merchantMobile: '',
    buyerName: '',
    buyerVillage: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    items: [],
    discountAmount: 0,
    gstAmount: 0,
    otherCharges: 0,
    vehicleDetails: {
      number: '',
      type: '',
      driverName: '',
      driverContact: '',
    },
    notes: '',
  });

  // Payment Management State - Using same structure as FarmerOrdersTable
  const [newPayment, setNewPayment] = useState({
    paidAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    modeOfPayment: '',
    bankName: '',
    remark: '',
    receiptPhoto: [],
    paymentStatus: 'PENDING',
    isWalletPayment: false,
    paymentScreenshot: null,
  });

  // Debounced mobile number for merchant lookup
  const debouncedMobileNumber = useDebounce(formData?.merchantMobile || '', 500);

  useEffect(() => {
    console.log('SellOrderForm: Loading initial data...');
    loadProducts();
    loadMerchants();
  }, []);

  // Auto-fill buyer data when mobile number is entered (with debouncing) - Use Farmer API
  useEffect(() => {
    if (debouncedMobileNumber?.length === 10) {
      setMobileLoading(true);
      getFarmerByMobile(debouncedMobileNumber);
    } else if (farmerData && debouncedMobileNumber?.length < 10) {
      resetBuyerData();
    }
  }, [debouncedMobileNumber]);

  const loadMerchants = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_ALL_MERCHANTS_SIMPLE);
      const response = await instance.request({}, { limit: 1000 });
      if (response?.data) {
        const apiResponse = response.data;
        // Handle response format: {success: true, data: [...], pagination: {...}}
        if (apiResponse.success && apiResponse.data) {
          const merchantsData = Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setMerchants(merchantsData);
          console.log('Merchants loaded:', merchantsData.length, merchantsData);
        } else if (apiResponse.status === 'Success' && apiResponse.data) {
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
    }
  };

  const loadProducts = async () => {
    try {
      console.log('SellOrderForm: Loading products...');
      const instance = NetworkManager(API.INVENTORY.GET_ALL_PRODUCTS);
      const response = await instance.request({}, { limit: 1000, isActive: true });
      
      console.log('SellOrderForm: Products API response:', response);
      
      if (response?.data) {
        const apiResponse = response.data;
        console.log('SellOrderForm: API response data:', apiResponse);
        
        // Handle both response formats: {success: true, data: [...]} or {status: "Success", data: {data: [...]}}
        if (apiResponse.status === 'Success' && apiResponse.data) {
          const productsData = Array.isArray(apiResponse.data.data) 
            ? apiResponse.data.data 
            : Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setProducts(productsData);
          console.log('SellOrderForm: Products loaded (Success format):', productsData.length, productsData);
        } else if (apiResponse.success && apiResponse.data) {
          const productsData = Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setProducts(productsData);
          console.log('SellOrderForm: Products loaded (success format):', productsData.length, productsData);
        } else {
          console.warn('SellOrderForm: Unexpected products response format:', apiResponse);
        }
      } else {
        console.warn('SellOrderForm: No response data from products API');
      }
    } catch (error) {
      console.error('SellOrderForm: Error loading products:', error);
      console.error('SellOrderForm: Error details:', error.response?.data || error.message);
      Toast.error('Failed to load products: ' + (error.response?.data?.message || error.message));
    }
  };

  // Get farmer by mobile number (same API as AddOrderForm)
  const getFarmerByMobile = async (mobileNumber) => {
    try {
      const instance = NetworkManager(API.FARMER.GET_FARMER_BY_MOBILE);
      const response = await instance.request(null, [mobileNumber]);

      if (response?.data?.data) {
        const farmer = response.data.data;
        setFarmerData(farmer);

        // Fill buyer name and village from farmer data
        setFormData(prev => ({
          ...prev,
          buyerName: farmer.name || '',
          buyerVillage: farmer.village || '',
          merchantMobile: mobileNumber,
        }));
      } else {
        // No farmer found - try merchant lookup as fallback
        const merchant = merchants.find(m => m.phone === mobileNumber || m.phone === `+91${mobileNumber}`);
        if (merchant) {
          setMerchantData(merchant);
          setSelectedMerchant(merchant);
          setFormData(prev => ({
            ...prev,
            merchant: merchant._id,
            buyerName: merchant.name || '',
            merchantMobile: mobileNumber,
          }));
        } else {
          resetBuyerData();
        }
      }
    } catch (error) {
      console.error('Error fetching farmer/merchant:', error);
      // Try merchant lookup as fallback
      const merchant = merchants.find(m => m.phone === mobileNumber || m.phone === `+91${mobileNumber}`);
      if (merchant) {
        setMerchantData(merchant);
        setSelectedMerchant(merchant);
        setFormData(prev => ({
          ...prev,
          merchant: merchant._id,
          buyerName: merchant.name || '',
          merchantMobile: mobileNumber,
        }));
      } else {
        resetBuyerData();
      }
    } finally {
      setMobileLoading(false);
    }
  };

  const resetBuyerData = () => {
    setFarmerData({});
    setMerchantData({});
    setSelectedMerchant(null);
    setMobileLoading(false);
    setFormData(prev => ({
      ...prev,
      merchant: '',
      buyerName: '',
      buyerVillage: '',
    }));
  };

  const handleMerchantChange = (merchantId) => {
    const merchant = allMerchants.find(m => m._id === merchantId);
    if (merchant) {
      setSelectedMerchant(merchant);
      setMerchantData(merchant);
      setFormData(prev => ({
        ...prev,
        merchant: merchantId,
        merchantMobile: merchant.phone || '',
        buyerName: merchant.name || '',
        buyerVillage: merchant.address?.village || merchant.address?.city || '',
      }));
    }
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      productId: '',
      quantity: 1,
      rate: 0,
      discount: 0,
      gst: 0,
      amount: 0,
      batchNumber: '',
      notes: '',
    }]);
  };

  const updateOrderItem = (index, field, value) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    if (field === 'quantity' || field === 'rate' || field === 'discount' || field === 'gst') {
      const item = updatedItems[index];
      const subtotal = item.quantity * item.rate;
      const discountAmount = (subtotal * (item.discount || 0)) / 100;
      const gstAmount = ((subtotal - discountAmount) * (item.gst || 0)) / 100;
      updatedItems[index].amount = subtotal - discountAmount + gstAmount;
    }

    setOrderItems(updatedItems);
  };

  const removeOrderItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + item.amount, 0);
  };

  // Payment Management Functions - Using same flow as FarmerOrdersTable
  const handlePaymentInputChange = (field, value) => {
    setNewPayment((prev) => {
      const updatedPayment = { ...prev, [field]: value };

      if (field === 'isWalletPayment') {
        const isWalletPayment = Boolean(value);
        updatedPayment.isWalletPayment = isWalletPayment;
        updatedPayment.paymentStatus = 'PENDING';
      }

      return updatedPayment;
    });
  };

  const handlePaymentImageUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      setLoading(true);
      const uploadedUrls = await Promise.all(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append('media_key', file);
          formData.append('media_type', 'IMAGE');
          formData.append('content_type', 'multipart/form-data');
          
          const instance = NetworkManager(API.MEDIA.UPLOAD);
          const response = await instance.request(formData);
          return response.data.media_url;
        })
      );
      handlePaymentInputChange('receiptPhoto', uploadedUrls);
      Toast.success('Images uploaded successfully');
    } catch (error) {
      console.error('Error uploading images:', error);
      Toast.error('Failed to upload images');
    } finally {
      setLoading(false);
    }
  };

  const removePaymentImage = (index) => {
    const updatedPhotos = newPayment.receiptPhoto.filter((_, i) => i !== index);
    handlePaymentInputChange('receiptPhoto', updatedPhotos);
  };

  const resetPaymentForm = () => {
    setNewPayment({
      paidAmount: '',
      paymentDate: new Date().toISOString().split('T')[0],
      modeOfPayment: '',
      bankName: '',
      remark: '',
      receiptPhoto: [],
      paymentStatus: 'PENDING',
      isWalletPayment: false,
      paymentScreenshot: null,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Only buyer details and order items are mandatory
    if (!formData.buyerName || formData.buyerName.trim() === '') {
      Toast.error('Please enter buyer name');
      return;
    }

    if (orderItems.length === 0) {
      Toast.error('Please add at least one item');
      return;
    }

    // Only product and quantity are required in order items (rate can be 0)
    if (orderItems.some(item => !item.productId || !item.quantity || item.quantity <= 0)) {
      Toast.error('Please select product and enter quantity for all items');
      return;
    }

    try {
      setLoading(true);

      // Prepare items with proper structure
      const items = orderItems.map(item => {
        const product = products.find(p => p._id === item.productId);
        const subtotal = item.quantity * (item.rate || 0);
        const discount = (subtotal * (item.discount || 0)) / 100;
        const gst = ((subtotal - discount) * (item.gst || 0)) / 100;
        
        // Get unit ID - handle both populated and non-populated cases
        let unitId = null;
        if (product?.primaryUnit) {
          unitId = typeof product.primaryUnit === 'object' 
            ? product.primaryUnit._id || product.primaryUnit 
            : product.primaryUnit;
        }
        
        return {
          product: item.productId,
          quantity: item.quantity,
          unit: unitId || null, // Send only ObjectId, not the full object (can be null)
          rate: item.rate || 0,
          discount: item.discount || 0,
          gst: item.gst || 0,
          amount: subtotal - discount + gst,
          batchNumber: item.batchNumber || '',
          notes: item.notes || '',
        };
      });

      // Calculate totals
      const subtotal = items.reduce((sum, item) => {
        const itemSubtotal = item.quantity * item.rate;
        const itemDiscount = (itemSubtotal * item.discount) / 100;
        return sum + itemSubtotal - itemDiscount;
      }, 0);
      
      const totalGst = items.reduce((sum, item) => {
        const itemSubtotal = item.quantity * item.rate;
        const itemDiscount = (itemSubtotal * item.discount) / 100;
        const itemGst = ((itemSubtotal - itemDiscount) * item.gst) / 100;
        return sum + itemGst;
      }, 0);

      const totalAmount = subtotal + (formData.gstAmount || totalGst) + (formData.otherCharges || 0) - (formData.discountAmount || 0);

      // Prepare payment data if provided
      const paymentData = [];
      if (newPayment.paidAmount && newPayment.modeOfPayment) {
        paymentData.push({
          paidAmount: parseFloat(newPayment.paidAmount),
          paymentDate: newPayment.paymentDate,
          modeOfPayment: newPayment.modeOfPayment,
          bankName: newPayment.bankName || '',
          remark: newPayment.remark || '',
          receiptPhoto: newPayment.receiptPhoto || [],
          paymentStatus: newPayment.paymentStatus || 'PENDING',
          isWalletPayment: newPayment.isWalletPayment || false,
        });
      }

      // Prepare payload - only items and buyerName are mandatory, rest optional
      const payload = {
        merchant: formData.merchant || null, // Optional
        orderDate: formData.orderDate || new Date().toISOString().split('T')[0],
        items,
        totalAmount: totalAmount,
        buyerName: formData.buyerName, // Required
      };

      // Add optional fields only if they have values
      if (formData.deliveryDate) {
        payload.deliveryDate = formData.deliveryDate;
      }
      if (formData.buyerVillage && formData.buyerVillage.trim()) {
        payload.buyerVillage = formData.buyerVillage;
      }
      if (formData.discountAmount) {
        payload.discountAmount = formData.discountAmount;
      }
      if (formData.gstAmount || totalGst) {
        payload.gstAmount = formData.gstAmount || totalGst;
      }
      if (formData.otherCharges) {
        payload.otherCharges = formData.otherCharges;
      }
      // Vehicle details - only include if at least one field has value
      if (formData.vehicleDetails && (
        formData.vehicleDetails.number || 
        formData.vehicleDetails.type || 
        formData.vehicleDetails.driverName || 
        formData.vehicleDetails.driverContact
      )) {
        payload.vehicleDetails = {
          number: formData.vehicleDetails.number || '',
          type: formData.vehicleDetails.type || '',
          driverName: formData.vehicleDetails.driverName || '',
          driverContact: formData.vehicleDetails.driverContact || '',
        };
      }
      if (formData.notes && formData.notes.trim()) {
        payload.notes = formData.notes;
      }
      if (paymentData.length > 0) {
        payload.payment = paymentData;
      }

      console.log('SellOrderForm: Submitting payload:', payload);

      // Following FarmerOrdersTable.js pattern - use NetworkManager
      const instance = NetworkManager(API.INVENTORY.CREATE_SELL_ORDER);
      const response = await instance.request(payload);

      if (response?.data) {
        // Check response.data.success directly (like other inventory forms)
        if (response.data.success) {
          Toast.success('Sell order created successfully!');
          navigate('/u/inventory/sell-orders');
        } else {
          Toast.error('Error creating sell order: ' + (response.data.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Error creating sell order:', error);
      // Extract error message from response
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Unknown error occurred';
      Toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/u/inventory/sell-orders')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Create Sell Order</h1>
              <p className="text-gray-600">Seller: Ram Biotech | Buyer: Merchant</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Merchant Selection - Compact (3 inputs per line) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Buyer Information (Merchant)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Merchant (Optional)
                </label>
                <select
                  value={formData.merchant}
                  onChange={(e) => handleMerchantChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a merchant (optional)...</option>
                  {allMerchants.map(merchant => (
                    <option key={merchant._id} value={merchant._id}>
                      {merchant.name} ({merchant.code}) - {merchant.phone} {merchant.category ? `[${merchant.category}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OR Enter Mobile Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.merchantMobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setFormData(prev => ({ ...prev, merchantMobile: value }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                  />
                  {mobileLoading && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {farmerData?.name
                    ? `Farmer found: ${farmerData.name} - Buyer details auto-filled`
                    : merchantData?.name
                    ? `Merchant found: ${merchantData.name}`
                    : mobileLoading
                    ? 'Searching for farmer/merchant...'
                    : 'Enter 10-digit mobile number to auto-fill buyer details from farmer API (500ms delay)'}
                </p>
              </div>

              {/* Buyer Name and Village - Auto-filled from Farmer API */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buyer Name *
                </label>
                <input
                  type="text"
                  value={formData.buyerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, buyerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Buyer name (auto-filled from farmer)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buyer Village
                </label>
                <input
                  type="text"
                  value={formData.buyerVillage}
                  onChange={(e) => setFormData(prev => ({ ...prev, buyerVillage: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Village (auto-filled from farmer)"
                />
              </div>

              {selectedMerchant && (
                <div className="md:col-span-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Contact:</strong> {selectedMerchant.contactPerson || 'N/A'} | 
                    <strong> Phone:</strong> {selectedMerchant.phone} | 
                    <strong> Email:</strong> {selectedMerchant.email || 'N/A'}
                  </p>
                  {selectedMerchant.address && (
                    <p className="text-sm text-gray-600 mt-1">
                      {typeof selectedMerchant.address === 'string' 
                        ? selectedMerchant.address
                        : `${selectedMerchant.address.street || ''}, ${selectedMerchant.address.city || ''}, ${selectedMerchant.address.state || ''} - ${selectedMerchant.address.pincode || ''}`}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order Date
                </label>
                <input
                  type="date"
                  value={formData.orderDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, orderDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discountAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Order Items - Compact */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Order Items
              </h2>
              <button
                type="button"
                onClick={addOrderItem}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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

            {/* Items Table */}
            {orderItems.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orderItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-4">
                          <select
                            value={item.productId}
                            onChange={(e) => updateOrderItem(index, 'productId', e.target.value)}
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
                            onChange={(e) => updateOrderItem(index, 'quantity', parseFloat(e.target.value) || 0)}
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.discount}
                            onChange={(e) => updateOrderItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.gst}
                            onChange={(e) => updateOrderItem(index, 'gst', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
                    Total Amount: ₹{getTotalAmount().toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Information - Button to open modal */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment Information
              </h2>
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Payment</span>
              </button>
            </div>
            {newPayment.paidAmount && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Amount:</strong> ₹{parseFloat(newPayment.paidAmount || 0).toLocaleString('en-IN')} | 
                  <strong> Mode:</strong> {newPayment.modeOfPayment} | 
                  <strong> Status:</strong> {newPayment.paymentStatus}
                </p>
              </div>
            )}
          </div>

          {/* Vehicle Details - Compact (3 inputs per line) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Vehicle Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicleDetails.number}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleDetails: { ...prev.vehicleDetails, number: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter vehicle number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicleDetails.type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleDetails: { ...prev.vehicleDetails, type: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select vehicle type</option>
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="pickup">Pickup</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.vehicleDetails.driverName}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleDetails: { ...prev.vehicleDetails, driverName: e.target.value }
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
                  value={formData.vehicleDetails.driverContact}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    vehicleDetails: { ...prev.vehicleDetails, driverContact: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter driver contact"
                />
              </div>
            </div>
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
              onClick={() => navigate('/u/inventory/sell-orders')}
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
              <span>{loading ? 'Creating...' : 'Create Sell Order'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Payment Modal - Similar to FarmerOrdersTable */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Add Payment
              </h3>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  resetPaymentForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={newPayment.paidAmount}
                    onChange={(e) => handlePaymentInputChange('paidAmount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={newPayment.paymentDate}
                    onChange={(e) => handlePaymentInputChange('paymentDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Mode *
                  </label>
                  <select
                    value={newPayment.modeOfPayment}
                    onChange={(e) => handlePaymentInputChange('modeOfPayment', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={newPayment.isWalletPayment}
                  >
                    <option value="">Select Mode</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                    <option value="NEFT/RTGS">NEFT/RTGS</option>
                    <option value="1341">1341</option>
                    <option value="434">434</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <div className={`w-full px-3 py-2 border rounded-lg text-sm ${
                    newPayment.paymentStatus === 'COLLECTED' 
                      ? 'bg-green-100 text-green-700 border-green-200' 
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {newPayment.paymentStatus} {newPayment.isWalletPayment ? '(Wallet Payment)' : ''}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={newPayment.bankName}
                    onChange={(e) => handlePaymentInputChange('bankName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      newPayment.modeOfPayment === 'Cheque' || newPayment.modeOfPayment === 'NEFT/RTGS'
                        ? 'Enter bank name'
                        : 'N/A'
                    }
                    disabled={
                      newPayment.modeOfPayment !== 'Cheque' &&
                      newPayment.modeOfPayment !== 'NEFT/RTGS'
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remark
                </label>
                <input
                  type="text"
                  value={newPayment.remark}
                  onChange={(e) => handlePaymentInputChange('remark', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional remark"
                />
              </div>

              {/* Payment Receipt Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Receipt Photo {newPayment.modeOfPayment && newPayment.modeOfPayment !== 'Cash' && newPayment.modeOfPayment !== 'NEFT/RTGS' ? '*' : '(Optional)'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePaymentImageUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {newPayment.modeOfPayment && newPayment.modeOfPayment !== 'Cash' && newPayment.modeOfPayment !== 'NEFT/RTGS' && (
                  <p className="text-xs text-red-600 mt-1">
                    Payment image is mandatory for {newPayment.modeOfPayment} payments
                  </p>
                )}
                {/* Show preview of uploaded images */}
                {newPayment.receiptPhoto && newPayment.receiptPhoto.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newPayment.receiptPhoto.map((photo, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photo}
                          alt={`Receipt ${index + 1}`}
                          className="w-16 h-16 object-cover rounded border"
                        />
                        <button
                          type="button"
                          onClick={() => removePaymentImage(index)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false);
                  resetPaymentForm();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newPayment.paidAmount || !newPayment.modeOfPayment) {
                    Toast.error('Please fill amount and payment mode');
                    return;
                  }
                  if (newPayment.modeOfPayment && newPayment.modeOfPayment !== 'Cash' && newPayment.modeOfPayment !== 'NEFT/RTGS') {
                    if (!newPayment.receiptPhoto || newPayment.receiptPhoto.length === 0) {
                      Toast.error(`Payment image is mandatory for ${newPayment.modeOfPayment} payments`);
                      return;
                    }
                  }
                  setShowPaymentModal(false);
                  Toast.success('Payment added successfully');
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Add Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellOrderForm;
