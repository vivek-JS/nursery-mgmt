import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, X, ShoppingCart } from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const PurchaseOrderForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);

  const [formData, setFormData] = useState({
    supplier: '',
    poDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    items: [],
    otherCharges: 0,
    terms: '',
    notes: '',
  });

  const [currentItem, setCurrentItem] = useState({
    product: '',
    quantity: '',
    unit: '',
    rate: '',
    gst: 12,
    discount: 0,
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [suppliersRes, productsRes, unitsRes] = await Promise.all([
        axiosInstance.get('/inventory/suppliers?isActive=true'),
        axiosInstance.get('/inventory/products?isActive=true&limit=1000'),
        axiosInstance.get('/inventory/units'),
      ]);

      if (suppliersRes.data.success) setSuppliers(suppliersRes.data.data);
      if (productsRes.data.success) setProducts(productsRes.data.data);
      if (unitsRes.data.success) setUnits(unitsRes.data.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product || !currentItem.quantity || !currentItem.unit || !currentItem.rate) {
      alert('Please fill all required fields');
      return;
    }

    const product = products.find((p) => p._id === currentItem.product);
    const unit = units.find((u) => u._id === currentItem.unit);

    const itemSubtotal = currentItem.quantity * currentItem.rate;
    const itemDiscount = (itemSubtotal * (currentItem.discount || 0)) / 100;
    const itemGst = ((itemSubtotal - itemDiscount) * (currentItem.gst || 0)) / 100;
    const amount = itemSubtotal - itemDiscount + itemGst;

    const newItem = {
      ...currentItem,
      productName: product.name,
      unitName: unit.abbreviation,
      amount,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    setCurrentItem({
      product: '',
      quantity: '',
      unit: '',
      rate: '',
      gst: 12,
      discount: 0,
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let gstAmount = 0;
    let discountAmount = 0;

    formData.items.forEach((item) => {
      const itemSubtotal = item.quantity * item.rate;
      const itemDiscount = (itemSubtotal * (item.discount || 0)) / 100;
      const itemGst = ((itemSubtotal - itemDiscount) * (item.gst || 0)) / 100;

      subtotal += itemSubtotal;
      discountAmount += itemDiscount;
      gstAmount += itemGst;
    });

    const totalAmount = subtotal - discountAmount + gstAmount + Number(formData.otherCharges);
    return { subtotal, gstAmount, discountAmount, totalAmount };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.supplier) {
      alert('Please select a supplier');
      return;
    }

    if (formData.items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        otherCharges: Number(formData.otherCharges),
      };

      await axiosInstance.post('/inventory/purchase-orders', payload);
      alert('Purchase Order created successfully');
      navigate('/u/inventory/purchase-orders');
    } catch (error) {
      console.error('Error creating PO:', error);
      alert(error.response?.data?.message || 'Error creating purchase order');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, gstAmount, discountAmount, totalAmount } = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/u/inventory/purchase-orders')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Purchase Orders</span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <ShoppingCart className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Create Purchase Order</h1>
              <p className="text-gray-600">Add new purchase order</p>
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
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  PO Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.poDate}
                  onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Expected Delivery Date
                </label>
                <input
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Add Item Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Item</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Product *</label>
                <select
                  value={currentItem.product}
                  onChange={(e) => {
                    const product = products.find((p) => p._id === e.target.value);
                    setCurrentItem({
                      ...currentItem,
                      product: e.target.value,
                      unit: product?.primaryUnit?._id || '',
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.code})
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Unit *</label>
                <select
                  value={currentItem.unit}
                  onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select Unit</option>
                  {units.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.abbreviation}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rate *</label>
                <input
                  type="number"
                  value={currentItem.rate}
                  onChange={(e) => setCurrentItem({ ...currentItem, rate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full bg-green-500 text-white px-4 py-3 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
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
                  <div key={index} className="border border-gray-200 rounded-xl p-4 hover:border-green-400 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="md:col-span-2">
                          <p className="text-xs text-gray-500">Product</p>
                          <p className="font-semibold">{item.productName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Quantity</p>
                          <p className="font-semibold">{item.quantity} {item.unitName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Rate</p>
                          <p className="font-semibold">₹{item.rate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="font-semibold">₹{item.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
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

              {/* Totals */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Other Charges
                    </label>
                    <input
                      type="number"
                      value={formData.otherCharges}
                      onChange={(e) => setFormData({ ...formData, otherCharges: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="w-full md:w-1/3 space-y-2">
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Discount:</span>
                      <span className="font-semibold">₹{discountAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>GST:</span>
                      <span className="font-semibold">₹{gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Other Charges:</span>
                      <span className="font-semibold">₹{Number(formData.otherCharges).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                      <span>Total:</span>
                      <span>₹{totalAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terms & Notes */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Terms & Conditions</label>
                <textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  placeholder="Payment terms, delivery terms..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/u/inventory/purchase-orders')}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formData.items.length === 0}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Create Purchase Order'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchaseOrderForm;


