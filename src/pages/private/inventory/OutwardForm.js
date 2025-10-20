import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, X, Send } from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

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
  });

  const [availableBatches, setAvailableBatches] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [productsRes, unitsRes] = await Promise.all([
        axiosInstance.get('/inventory/products?isActive=true&limit=1000'),
        axiosInstance.get('/inventory/units'),
      ]);

      if (productsRes.data.success) setProducts(productsRes.data.data);
      if (unitsRes.data.success) setUnits(unitsRes.data.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleProductSelect = async (productId) => {
    setCurrentItem({ ...currentItem, product: productId, batch: '', quantity: '' });
    
    if (productId) {
      try {
        const response = await axiosInstance.get(`/inventory/outward/batches/${productId}`);
        if (response.data.success) {
          setAvailableBatches(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching batches:', error);
      }
    } else {
      setAvailableBatches([]);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product || !currentItem.batch || !currentItem.quantity || !currentItem.unit) {
      alert('Please fill all required fields');
      return;
    }

    const product = products.find((p) => p._id === currentItem.product);
    const batch = availableBatches.find((b) => b._id === currentItem.batch);
    const unit = units.find((u) => u._id === currentItem.unit);

    if (Number(currentItem.quantity) > batch.remainingQuantity) {
      alert(`Insufficient stock! Only ${batch.remainingQuantity} available in this batch.`);
      return;
    }

    const newItem = {
      ...currentItem,
      productName: product.name,
      batchNumber: batch.batchNumber,
      unitName: unit.abbreviation,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setCurrentItem({
      product: '',
      batch: '',
      quantity: '',
      unit: '',
    });
    setAvailableBatches([]);
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
      await axiosInstance.post('/inventory/outward', formData);
      alert('Outward entry created successfully');
      navigate('/u/inventory/outward');
    } catch (error) {
      console.error('Error creating outward:', error);
      alert(error.response?.data?.message || 'Error creating outward entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/u/inventory/outward')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Outward List</span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-orange-100 rounded-xl">
              <Send className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Issue Stock</h1>
              <p className="text-gray-600">Create stock outward entry</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Details */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Basic Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Outward Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.outwardDate}
                  onChange={(e) => setFormData({ ...formData, outwardDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Purpose <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Purpose Details
                </label>
                <input
                  type="text"
                  value={formData.purposeDetails}
                  onChange={(e) => setFormData({ ...formData, purposeDetails: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Production Order #123"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="Department name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Name</label>
                <input
                  type="text"
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="Recipient name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Recipient Phone</label>
                <input
                  type="tel"
                  value={formData.recipientPhone}
                  onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="Phone number"
                />
              </div>
            </div>
          </div>

          {/* Add Item Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Item</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product *</label>
                <select
                  value={currentItem.product}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Batch *</label>
                <select
                  value={currentItem.batch}
                  onChange={(e) => {
                    const batch = availableBatches.find(b => b._id === e.target.value);
                    setCurrentItem({
                      ...currentItem,
                      batch: e.target.value,
                      unit: batch?.unit?._id || '',
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  disabled={!currentItem.product}
                >
                  <option value="">Select Batch</option>
                  {availableBatches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.batchNumber} (Available: {b.remainingQuantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
                <input
                  type="number"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                  placeholder="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Unit *</label>
                <select
                  value={currentItem.unit}
                  onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.abbreviation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full bg-orange-500 text-white px-4 py-3 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Items List */}
          {formData.items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Items ({formData.items.length})</h2>
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 hover:border-orange-400 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-500">Product</p>
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Quantity</p>
                          <p className="font-semibold">{item.quantity} {item.unitName}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/u/inventory/outward')}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formData.items.length === 0}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Create Outward Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OutwardForm;


