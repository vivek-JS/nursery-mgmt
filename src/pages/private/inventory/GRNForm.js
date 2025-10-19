import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, Plus, X, FileText } from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const GRNForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const [formData, setFormData] = useState({
    supplier: '',
    purchaseOrder: '',
    invoiceNumber: '',
    invoiceDate: '',
    challanNumber: '',
    challanDate: '',
    vehicleNumber: '',
    driverName: '',
    items: [],
    freightCharges: 0,
    otherCharges: 0,
    notes: '',
  });

  const [currentItem, setCurrentItem] = useState({
    product: '',
    batchNumber: '',
    quantity: '',
    unit: '',
    rate: '',
    manufactureDate: '',
    expiryDate: '',
    acceptedQuantity: '',
    rejectedQuantity: 0,
    damageQuantity: 0,
    notes: '',
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [suppliersRes, productsRes, unitsRes, posRes] = await Promise.all([
        axiosInstance.get('/inventory/suppliers?isActive=true'),
        axiosInstance.get('/inventory/products?isActive=true&limit=1000'),
        axiosInstance.get('/inventory/units'),
        axiosInstance.get('/inventory/purchase-orders?status=approved'),
      ]);

      if (suppliersRes.data.success) setSuppliers(suppliersRes.data.data);
      if (productsRes.data.success) setProducts(productsRes.data.data);
      if (unitsRes.data.success) setUnits(unitsRes.data.data);
      if (posRes.data.success) setPurchaseOrders(posRes.data.data);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const handlePOSelect = async (poId) => {
    if (!poId) {
      setFormData({ ...formData, purchaseOrder: '', items: [] });
      return;
    }

    try {
      const response = await axiosInstance.get(`/inventory/purchase-orders/${poId}`);
      if (response.data.success) {
        const po = response.data.data.purchaseOrder;
        
        // Pre-fill GRN items from PO
        const items = po.items.map((item) => ({
          product: item.product._id,
          productName: item.product.name,
          batchNumber: `BATCH${Date.now()}${Math.floor(Math.random() * 1000)}`,
          quantity: item.quantity - item.receivedQuantity,
          unit: item.unit._id,
          unitName: item.unit.abbreviation,
          rate: item.rate,
          manufactureDate: '',
          expiryDate: '',
          acceptedQuantity: item.quantity - item.receivedQuantity,
          rejectedQuantity: 0,
          damageQuantity: 0,
          amount: (item.quantity - item.receivedQuantity) * item.rate,
          notes: '',
        }));

        setFormData({
          ...formData,
          purchaseOrder: poId,
          supplier: po.supplier._id,
          items,
        });
      }
    } catch (error) {
      console.error('Error fetching PO:', error);
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product || !currentItem.quantity || !currentItem.unit || !currentItem.rate) {
      alert('Please fill all required fields');
      return;
    }

    const product = products.find((p) => p._id === currentItem.product);
    const unit = units.find((u) => u._id === currentItem.unit);
    const amount = currentItem.acceptedQuantity * currentItem.rate;

    const newItem = {
      ...currentItem,
      productName: product.name,
      unitName: unit.abbreviation,
      amount,
      batchNumber: currentItem.batchNumber || `BATCH${Date.now()}${Math.floor(Math.random() * 1000)}`,
      acceptedQuantity: currentItem.acceptedQuantity || currentItem.quantity,
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    // Reset current item
    setCurrentItem({
      product: '',
      batchNumber: '',
      quantity: '',
      unit: '',
      rate: '',
      manufactureDate: '',
      expiryDate: '',
      acceptedQuantity: '',
      rejectedQuantity: 0,
      damageQuantity: 0,
      notes: '',
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount = subtotal + Number(formData.freightCharges) + Number(formData.otherCharges);
    return { subtotal, totalAmount };
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
      const { subtotal, totalAmount } = calculateTotals();
      
      const payload = {
        ...formData,
        freightCharges: Number(formData.freightCharges),
        otherCharges: Number(formData.otherCharges),
      };

      await axiosInstance.post('/inventory/grn', payload);
      alert('GRN created successfully');
      navigate('/u/inventory/grn');
    } catch (error) {
      console.error('Error creating GRN:', error);
      alert(error.response?.data?.message || 'Error creating GRN');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, totalAmount } = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/u/inventory/grn')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to GRN List</span>
          </button>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-xl">
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Create GRN</h1>
              <p className="text-gray-600">Goods Receipt Note</p>
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
                  Purchase Order
                </label>
                <select
                  value={formData.purchaseOrder}
                  onChange={(e) => handlePOSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select PO (optional)</option>
                  {purchaseOrders.map((po) => (
                    <option key={po._id} value={po._id}>
                      {po.poNumber} - {po.supplier?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  disabled={!!formData.purchaseOrder}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
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
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  placeholder="Invoice #"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Challan Number
                </label>
                <input
                  type="text"
                  value={formData.challanNumber}
                  onChange={(e) => setFormData({ ...formData, challanNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  placeholder="Challan #"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Challan Date
                </label>
                <input
                  type="date"
                  value={formData.challanDate}
                  onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicleNumber}
                  onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., DL01AB1234"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Driver Name
                </label>
                <input
                  type="text"
                  value={formData.driverName}
                  onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  placeholder="Driver name"
                />
              </div>
            </div>
          </div>

          {/* Add Item Section */}
          {!formData.purchaseOrder && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Add Item</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Batch # *</label>
                  <input
                    type="text"
                    value={currentItem.batchNumber}
                    onChange={(e) => setCurrentItem({ ...currentItem, batchNumber: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    placeholder="Auto-generated"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity *</label>
                  <input
                    type="number"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value, acceptedQuantity: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unit *</label>
                  <select
                    value={currentItem.unit}
                    onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Unit</option>
                    {units.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.abbreviation})
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mfg Date</label>
                  <input
                    type="date"
                    value={currentItem.manufactureDate}
                    onChange={(e) => setCurrentItem({ ...currentItem, manufactureDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={currentItem.expiryDate}
                    onChange={(e) => setCurrentItem({ ...currentItem, expiryDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full bg-purple-500 text-white px-4 py-3 rounded-xl hover:bg-purple-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Items List */}
          {formData.items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Items ({formData.items.length})</h2>
              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4 hover:border-purple-400 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Product</p>
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Quantity</p>
                          <p className="font-semibold">{item.acceptedQuantity} {item.unitName}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Rate</p>
                          <p className="font-semibold">₹{item.rate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="font-semibold">₹{item.amount.toLocaleString('en-IN')}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Freight Charges
                    </label>
                    <input
                      type="number"
                      value={formData.freightCharges}
                      onChange={(e) => setFormData({ ...formData, freightCharges: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Other Charges
                    </label>
                    <input
                      type="number"
                      value={formData.otherCharges}
                      onChange={(e) => setFormData({ ...formData, otherCharges: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <div className="w-full md:w-1/3 space-y-2">
                    <div className="flex justify-between text-gray-700">
                      <span>Subtotal:</span>
                      <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Charges:</span>
                      <span className="font-semibold">₹{(Number(formData.freightCharges) + Number(formData.otherCharges)).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                      <span>Total:</span>
                      <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              placeholder="Any additional notes..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/u/inventory/grn')}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || formData.items.length === 0}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? 'Creating...' : 'Create GRN'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GRNForm;

