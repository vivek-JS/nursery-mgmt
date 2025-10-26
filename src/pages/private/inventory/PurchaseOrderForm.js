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
import axiosInstance from '../../../services/axiosConfig';

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
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
    loadSuppliers();
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

  const loadSuppliers = async () => {
    try {
      const response = await axiosInstance.get('/inventory/suppliers/all?limit=1000');
      if (response.data.success) {
        setSuppliers(response.data.data.data);
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s._id === supplierId);
    if (supplier) {
      setSelectedSupplier(supplier);
      setFormData(prev => ({
        ...prev,
        supplier: {
          name: supplier.name,
          contact: supplier.contact || '',
          email: supplier.email || '',
          address: supplier.address || '',
          gstNumber: supplier.gstNumber || '',
        }
      }));
    }
  };

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      productId: '',
      quantity: 1,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplier.name) {
      alert('Please select a supplier');
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
      const response = await axiosInstance.post('/purchase/purchase-orders/create', {
        supplier: formData.supplier,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        items: orderItems,
        notes: formData.notes,
      });

      if (response.data.success) {
        alert('Purchase order created successfully!');
        navigate('/u/inventory/purchase-orders');
      } else {
        alert('Error creating purchase order: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      alert('Error creating purchase order: ' + (error.response?.data?.message || error.message));
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
                  Select Supplier
                </label>
                <select
                  value={selectedSupplier?._id || ''}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    expectedDeliveryDate: e.target.value
                  }))}
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
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    supplier: { ...prev.supplier, contact: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter contact number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.supplier.email}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    supplier: { ...prev.supplier, email: e.target.value }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
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