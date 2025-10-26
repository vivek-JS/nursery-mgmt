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
} from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const GRNForm = () => {
  const navigate = useNavigate();
  const { purchaseOrderId } = useParams();
  const [loading, setLoading] = useState(false);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [grnItems, setGrnItems] = useState([]);
  const [additionalItems, setAdditionalItems] = useState([]);
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
      const response = await axiosInstance.get(`/purchase/purchase-orders/${purchaseOrderId}`);
      if (response.data.success) {
        setPurchaseOrder(response.data.data);
        // Initialize GRN items from purchase order
        const initialItems = response.data.data.items.map(item => ({
          productId: item.productId._id,
          productName: item.productId.name,
          orderedQuantity: item.quantity,
          receivedQuantity: 0,
          rate: item.rate,
          amount: 0,
          batchNumber: '',
          manufacturingDate: '',
          expiryDate: '',
          quality: 'good',
          notes: '',
        }));
        setGrnItems(initialItems);
      }
    } catch (error) {
      console.error('Error loading purchase order:', error);
    }
  };

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
      batchNumber: '',
      manufacturingDate: '',
      expiryDate: '',
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

    try {
      setLoading(true);
      const response = await axiosInstance.post('/purchase/grn/create', {
        purchaseOrderId,
        items: grnItems.map(item => ({
          productId: item.productId,
          receivedQuantity: item.receivedQuantity,
          rate: item.rate,
          batchNumber: item.batchNumber,
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          quality: item.quality,
          notes: item.notes,
        })),
        additionalItems: additionalItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          rate: item.rate,
          batchNumber: item.batchNumber,
          manufacturingDate: item.manufacturingDate,
          expiryDate: item.expiryDate,
          quality: item.quality,
          notes: item.notes,
        })),
        invoiceNumber: formData.invoiceNumber,
        vehicleNumber: formData.vehicleNumber,
        driverName: formData.driverName,
        driverContact: formData.driverContact,
        notes: formData.notes,
      });

      if (response.data.success) {
        alert('GRN created successfully!');
        navigate('/u/inventory/grn');
      } else {
        alert('Error creating GRN: ' + response.data.message);
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
                      Batch No.
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
                          value={item.batchNumber}
                          onChange={(e) => updateGrnItem(index, 'batchNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Batch number"
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
                        Batch No.
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
                            value={item.batchNumber}
                            onChange={(e) => updateAdditionalItem(index, 'batchNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Batch number"
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