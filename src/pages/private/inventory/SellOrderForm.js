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
} from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const SellOrderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [paymentScreenshots, setPaymentScreenshots] = useState([]);
  const [formData, setFormData] = useState({
    farmer: {
      name: '',
      mobile: '',
      district: '',
      village: '',
      taluka: '',
      address: '',
    },
    items: [],
    paymentMode: 'cash',
    paymentDetails: {
      transactionId: '',
      bankName: '',
      chequeNumber: '',
      upiId: '',
      cardLastFour: '',
    },
    vehicleDetails: {
      number: '',
      type: '',
      driverName: '',
      driverContact: '',
    },
    notes: '',
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await axiosInstance.get('/inventory/products/all?limit=1000');
      if (response.data.success) {
        setProducts(response.data.data.data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      productId: '',
      quantity: 1,
      size: '',
      rate: 0,
      amount: 0,
    }]);
  };

  const updateOrderItem = (index, field, value) => {
    const updatedItems = [...orderItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
    }

    setOrderItems(updatedItems);
  };

  const removeOrderItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + item.amount, 0);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newScreenshots = files.map(file => ({
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file),
      file: file,
    }));
    setPaymentScreenshots([...paymentScreenshots, ...newScreenshots]);
  };

  const removeScreenshot = (index) => {
    const updatedScreenshots = paymentScreenshots.filter((_, i) => i !== index);
    setPaymentScreenshots(updatedScreenshots);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.farmer.name || !formData.farmer.mobile || !formData.farmer.district || !formData.farmer.village || !formData.farmer.taluka) {
      alert('Please fill all farmer details');
      return;
    }

    if (orderItems.length === 0) {
      alert('Please add at least one item');
      return;
    }

    if (orderItems.some(item => !item.productId || item.quantity <= 0 || item.rate <= 0)) {
      alert('Please fill all item details correctly');
      return;
    }

    try {
      setLoading(true);
      
      // Upload screenshots first
      const uploadedScreenshots = [];
      for (const screenshot of paymentScreenshots) {
        const formData = new FormData();
        formData.append('file', screenshot.file);
        formData.append('folder', 'payment-screenshots');
        
        const uploadResponse = await axiosInstance.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        if (uploadResponse.data.success) {
          uploadedScreenshots.push(uploadResponse.data.data.url);
        }
      }

      const response = await axiosInstance.post('/purchase/sell-orders/create', {
        farmer: formData.farmer,
        items: orderItems,
        paymentMode: formData.paymentMode,
        paymentDetails: formData.paymentDetails,
        paymentScreenshots: uploadedScreenshots,
        vehicleDetails: formData.vehicleDetails,
        notes: formData.notes,
      });

      if (response.data.success) {
        alert('Sell order created successfully!');
        navigate('/u/inventory/sell-orders');
      } else {
        alert('Error creating sell order: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error creating sell order:', error);
      alert('Error creating sell order: ' + (error.response?.data?.message || error.message));
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
              <p className="text-gray-600">Create new sell order for farmer</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Farmer Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Farmer Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Farmer Name *
                </label>
                <input
                  type="text"
                  value={formData.farmer.name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    farmer: { ...prev.farmer, name: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter farmer name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  value={formData.farmer.mobile}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    farmer: { ...prev.farmer, mobile: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter mobile number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District *
                </label>
                <input
                  type="text"
                  value={formData.farmer.district}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    farmer: { ...prev.farmer, district: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter district"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Village *
                </label>
                <input
                  type="text"
                  value={formData.farmer.village}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    farmer: { ...prev.farmer, village: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter village"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Taluka *
                </label>
                <input
                  type="text"
                  value={formData.farmer.taluka}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    farmer: { ...prev.farmer, taluka: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter taluka"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <textarea
                  value={formData.farmer.address}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    farmer: { ...prev.farmer, address: e.target.value }
                  }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter complete address"
                />
              </div>
            </div>
          </div>

          {/* Order Items */}
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Size
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
                            type="text"
                            value={item.size}
                            onChange={(e) => updateOrderItem(index, 'size', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Size/Type"
                          />
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
                <p>No items added yet. Click "Add Item" to get started.</p>
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

          {/* Payment Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Payment Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode *
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentMode: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Received Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.receivedAmount || 0}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    receivedAmount: parseFloat(e.target.value) || 0
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter received amount"
                />
              </div>

              {formData.paymentMode === 'cheque' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Number
                    </label>
                    <input
                      type="text"
                      value={formData.paymentDetails.chequeNumber}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        paymentDetails: { ...prev.paymentDetails, chequeNumber: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter cheque number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.paymentDetails.bankName}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        paymentDetails: { ...prev.paymentDetails, bankName: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter bank name"
                    />
                  </div>
                </>
              )}

              {formData.paymentMode === 'upi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    UPI ID
                  </label>
                  <input
                    type="text"
                    value={formData.paymentDetails.upiId}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      paymentDetails: { ...prev.paymentDetails, upiId: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter UPI ID"
                  />
                </div>
              )}

              {formData.paymentMode === 'card' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Card Last 4 Digits
                  </label>
                  <input
                    type="text"
                    value={formData.paymentDetails.cardLastFour}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      paymentDetails: { ...prev.paymentDetails, cardLastFour: e.target.value }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter last 4 digits"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={formData.paymentDetails.transactionId}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    paymentDetails: { ...prev.paymentDetails, transactionId: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter transaction ID"
                />
              </div>
            </div>

            {/* Payment Screenshots */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Screenshots
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="payment-screenshots"
                />
                <label
                  htmlFor="payment-screenshots"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-600">Click to upload payment screenshots</span>
                </label>
              </div>

              {paymentScreenshots.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {paymentScreenshots.map((screenshot, index) => (
                    <div key={index} className="relative">
                      <img
                        src={screenshot.url}
                        alt={screenshot.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Vehicle Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );
};

export default SellOrderForm;
