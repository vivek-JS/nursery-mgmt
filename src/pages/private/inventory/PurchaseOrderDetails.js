import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, ShoppingCart, Package, FileText, Zap, X } from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { formatDecimal, formatCurrency } from '../../../utils/numberUtils';

const PurchaseOrderDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [creatingGRN, setCreatingGRN] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [grnItems, setGrnItems] = useState([]);

  useEffect(() => {
    fetchPODetails();
  }, [id]);

  const fetchPODetails = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params array
      const instance = NetworkManager(API.INVENTORY.GET_PURCHASE_ORDER_BY_ID);
      const response = await instance.request({}, [id]);
      
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success && apiResponse.data) {
          // Handle both formats: {data: {purchaseOrder, grns}} or {data: purchaseOrder}
          if (apiResponse.data.purchaseOrder) {
            setPo(apiResponse.data.purchaseOrder);
            setGrns(apiResponse.data.grns || []);
          } else {
            setPo(apiResponse.data);
            setGrns([]);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching PO:', error);
      alert('Error loading purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this Purchase Order?')) return;

    setApproving(true);
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params array
      const instance = NetworkManager(API.INVENTORY.APPROVE_PURCHASE_ORDER);
      const response = await instance.request({}, [`${id}/approve`]);
      
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          alert('Purchase Order approved successfully!');
          fetchPODetails();
        } else {
          alert(apiResponse.message || 'Error approving purchase order');
        }
      }
    } catch (error) {
      console.error('Error approving PO:', error);
      alert(error.response?.data?.message || error.message || 'Error approving purchase order');
    } finally {
      setApproving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this Purchase Order? This cannot be undone.')) return;

    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager with params array
      const instance = NetworkManager(API.INVENTORY.CANCEL_PURCHASE_ORDER);
      const response = await instance.request({}, [`${id}/cancel`]);
      
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          alert('Purchase Order cancelled');
          fetchPODetails();
        } else {
          alert(apiResponse.message || 'Error cancelling purchase order');
        }
      }
    } catch (error) {
      console.error('Error cancelling PO:', error);
      alert(error.response?.data?.message || error.message || 'Error cancelling purchase order');
    }
  };

  const generateBatchNumber = (productName) => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const productCode = productName.substring(0, 3).toUpperCase().replace(/\s/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `BATCH${productCode}${year}${month}${day}${random}`;
  };

  const handleCreateGRN = () => {
    // Initialize GRN items from PO items
    const initialGrnItems = po.items
      .filter(item => item.quantity > (item.receivedQuantity || 0))
      .map(item => {
        const orderedQty = item.quantity - (item.receivedQuantity || 0);
        const productName = item.product?.name || 'PROD';
        return {
          poItemId: item._id,
          product: item.product,
          productName: productName,
          unit: item.unit,
          unitName: item.unit?.abbreviation || item.unit?.name || '',
          rate: item.rate || 0,
          orderedQuantity: orderedQty,
          batchNumber: generateBatchNumber(productName), // Auto-generate batch number
          acceptedQuantity: orderedQty,
          rejectedQuantity: 0,
          damageQuantity: 0,
          expiryDate: '', // Optional expiry date
        };
      });
    
    setGrnItems(initialGrnItems);
    setShowGRNModal(true);
  };

  const updateGrnItem = (index, field, value) => {
    const updatedItems = [...grnItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    // Auto-calculate accepted quantity when rejected or damaged changes
    if (field === 'rejectedQuantity' || field === 'damageQuantity') {
      const item = updatedItems[index];
      // Accepted = Ordered - Rejected - Damaged (can be less than ordered)
      updatedItems[index].acceptedQuantity = Math.max(0, 
        item.orderedQuantity - (item.rejectedQuantity || 0) - (item.damageQuantity || 0)
      );
    }

    // Auto-generate batch number if empty
    if (field === 'batchNumber' && !value.trim()) {
      const item = updatedItems[index];
      updatedItems[index].batchNumber = generateBatchNumber(item.productName);
    }

    setGrnItems(updatedItems);
  };

  const handleSubmitGRN = async () => {
    // Validate all items
    for (const item of grnItems) {
      // Auto-generate batch number if empty
      if (!item.batchNumber || !item.batchNumber.trim()) {
        item.batchNumber = generateBatchNumber(item.productName);
      }
      
      if (item.acceptedQuantity < 0) {
        alert(`Accepted quantity cannot be negative for ${item.productName}`);
        return;
      }
      
      // Validate that accepted + rejected + damaged doesn't exceed ordered (but can be less)
      const totalReceived = (item.acceptedQuantity || 0) + (item.rejectedQuantity || 0) + (item.damageQuantity || 0);
      if (totalReceived > item.orderedQuantity) {
        alert(`Total received (${totalReceived}) cannot exceed ordered quantity (${item.orderedQuantity}) for ${item.productName}`);
        return;
      }
    }

    setCreatingGRN(true);
    try {
      // Transform items for API
      const transformedItems = grnItems.map(item => {
        // Ensure batch number is set (auto-generate if still empty)
        const batchNum = item.batchNumber?.trim() || generateBatchNumber(item.productName);
        
        return {
          product: item.product._id || item.product,
          poItem: item.poItemId,
          batchNumber: batchNum,
          quantity: item.orderedQuantity,
          unit: item.unit._id || item.unit,
          rate: item.rate,
          acceptedQuantity: item.acceptedQuantity,
          rejectedQuantity: item.rejectedQuantity || 0,
          damageQuantity: item.damageQuantity || 0,
          amount: item.acceptedQuantity * item.rate,
          expiryDate: item.expiryDate || null, // Optional expiry date
        };
      });

      const grnData = {
        supplier: po.supplier?._id || po.supplier || null, // Will be auto-filled from PO in backend
        purchaseOrder: po._id,
        items: transformedItems,
      };

      // Following FarmerOrdersTable.js pattern - use NetworkManager
      const instance = NetworkManager(API.INVENTORY.CREATE_GRN);
      const response = await instance.request(grnData);
      
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          const grnId = apiResponse.data?._id;
          setShowGRNModal(false);
          alert('GRN created successfully! Redirecting to GRN page...');
          navigate(`/u/inventory/grn/${grnId}`);
        } else {
          alert(apiResponse.message || 'Error creating GRN');
        }
      }
    } catch (error) {
      console.error('Error creating GRN:', error);
      alert(error.response?.data?.message || 'Error creating GRN');
    } finally {
      setCreatingGRN(false);
    }
  };

  const handleCreateAndApproveGRN = async () => {
    if (!window.confirm('Create and Approve GRN immediately? This will update stock instantly.')) return;

    setCreatingGRN(true);
    try {
      // Create GRN
      const grnItems = po.items.map(item => ({
        product: item.product._id,
        batchNumber: `BATCH${Date.now()}${Math.floor(Math.random() * 1000)}`,
        quantity: item.quantity - item.receivedQuantity,
        unit: item.unit._id,
        rate: item.rate,
        acceptedQuantity: item.quantity - item.receivedQuantity,
        rejectedQuantity: 0,
        damageQuantity: 0,
        amount: (item.quantity - item.receivedQuantity) * item.rate,
      }));

      const grnData = {
        supplier: po.supplier?._id || po.supplier,
        purchaseOrder: po._id,
        items: grnItems,
      };

      // Following FarmerOrdersTable.js pattern - use NetworkManager
      const createInstance = NetworkManager(API.INVENTORY.CREATE_GRN);
      const createResponse = await createInstance.request(grnData);
      
      if (createResponse?.data) {
        const apiResponse = createResponse.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          const grnId = apiResponse.data?._id || apiResponse.data?._id;
          
          // Immediately approve it
          const approveInstance = NetworkManager(API.INVENTORY.APPROVE_GRN);
          await approveInstance.request(
            { qualityCheckRemarks: 'Auto-approved from PO' },
            [`${grnId}/approve`]
          );

          alert('GRN created and approved! Stock has been updated.');
          fetchPODetails(); // Refresh to show updated status
        }
      }
    } catch (error) {
      console.error('Error creating/approving GRN:', error);
      alert(error.response?.data?.message || 'Error creating GRN');
    } finally {
      setCreatingGRN(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <p className="text-xl text-gray-600">Purchase Order not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      partial_received: 'bg-orange-100 text-orange-800',
      received: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/u/inventory/purchase-orders')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Purchase Orders</span>
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-4">
                <div className="p-4 bg-green-100 rounded-xl">
                  <ShoppingCart className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{po.poNumber}</h1>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(po.status)}`}>
                      {po.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-gray-600">
                      {formatDisplayDate(po.poDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(po.status === 'draft' || po.status === 'pending') && (
                  <>
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="flex items-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>{approving ? 'Approving...' : 'Approve'}</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center space-x-2 bg-red-500 text-white px-6 py-3 rounded-xl hover:bg-red-600 transition-colors"
                    >
                      <XCircle className="w-5 h-5" />
                      <span>Cancel</span>
                    </button>
                  </>
                )}
                {(po.status === 'approved' || po.status === 'partial_received') && (
                  <>
                    <button
                      onClick={handleCreateGRN}
                      disabled={creatingGRN}
                      className="flex items-center space-x-2 bg-purple-500 text-white px-6 py-3 rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50"
                      title="Create GRN and fill details manually"
                    >
                      <FileText className="w-5 h-5" />
                      <span>{creatingGRN ? 'Creating...' : 'Create GRN'}</span>
                    </button>
                    <button
                      onClick={handleCreateAndApproveGRN}
                      disabled={creatingGRN}
                      className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-green-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                      title="Create GRN and approve immediately (updates stock)"
                    >
                      <Zap className="w-5 h-5" />
                      <span>{creatingGRN ? 'Processing...' : 'Quick GRN & Approve'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Supplier Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Supplier Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Supplier Name</p>
                <p className="font-semibold text-gray-800">{po.supplier?.name || po.supplier?.displayName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-semibold text-gray-800">{po.supplier?.phone || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Delivery Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Delivery Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">PO Date</p>
                <p className="font-semibold text-gray-800">
                  {formatDisplayDate(po.poDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-semibold text-gray-800">
                  {po.expectedDeliveryDate
                    ? formatDisplayDate(po.expectedDeliveryDate)
                    : 'Not specified'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Package className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-800">Items ({po.items?.length || 0})</h2>
          </div>
          <div className="space-y-3">
            {po.items?.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Product</p>
                    <p className="font-semibold text-gray-800">{item.product?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ordered</p>
                    <p className="font-semibold text-gray-800">
                      {item.quantity} {item.unit?.abbreviation}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Received</p>
                    <p className="font-semibold text-green-700">
                      {item.receivedQuantity || 0} {item.unit?.abbreviation}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-800">
                      {formatCurrency(formatDecimal(item.amount) || 0)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">{formatCurrency(formatDecimal(po.subtotal) || 0)}</span>
            </div>
            {po.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-semibold">-{formatCurrency(formatDecimal(po.discountAmount) || 0)}</span>
              </div>
            )}
            {po.gstAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">GST</span>
                <span className="font-semibold">{formatCurrency(formatDecimal(po.gstAmount) || 0)}</span>
              </div>
            )}
            {po.otherCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Other Charges</span>
                <span className="font-semibold">{formatCurrency(formatDecimal(po.otherCharges) || 0)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-300 text-xl font-bold text-gray-900">
              <span>Total Amount</span>
              <span>{formatCurrency(formatDecimal(po.totalAmount) || 0)}</span>
            </div>
          </div>
        </div>

        {/* Related GRNs */}
        {grns.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">Related GRNs ({grns.length})</h2>
            </div>
            <div className="space-y-3">
              {grns.map((grn) => (
                <div
                  key={grn._id}
                  className="border border-gray-200 rounded-xl p-4 hover:border-purple-400 transition-colors cursor-pointer"
                  onClick={() => navigate(`/u/inventory/grn/${grn._id}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">{grn.grnNumber}</p>
                      <p className="text-sm text-gray-600">
                        {formatDisplayDate(grn.grnDate)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      grn.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {grn.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {(po.terms || po.notes) && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
            {po.terms && (
              <div className="mb-4">
                <h3 className="font-semibold text-gray-800 mb-2">Terms & Conditions</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{po.terms}</p>
              </div>
            )}
            {po.notes && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{po.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GRN Creation Modal */}
      {showGRNModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">Create GRN</h2>
              <button
                onClick={() => setShowGRNModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Fill in the details for each item. Batch number will be auto-generated if left empty.
                </p>
              </div>

              <div className="space-y-4">
                {grnItems.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-3">{item.productName}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Batch Number
                        </label>
                        <input
                          type="text"
                          value={item.batchNumber}
                          onChange={(e) => updateGrnItem(index, 'batchNumber', e.target.value)}
                          onBlur={(e) => {
                            // Auto-generate if empty on blur
                            if (!e.target.value.trim()) {
                              updateGrnItem(index, 'batchNumber', generateBatchNumber(item.productName));
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          placeholder="Auto-generated if empty"
                        />
                        <span className="text-xs text-gray-500">Auto-generated if empty</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={item.expiryDate || ''}
                          onChange={(e) => updateGrnItem(index, 'expiryDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-xs text-gray-500">Optional</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Ordered Qty
                        </label>
                        <input
                          type="number"
                          value={item.orderedQuantity}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                        <span className="text-xs text-gray-500">{item.unitName}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Accepted Qty
                        </label>
                        <input
                          type="number"
                          value={item.acceptedQuantity}
                          onChange={(e) => updateGrnItem(index, 'acceptedQuantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-xs text-gray-500">{item.unitName}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rejected Qty
                        </label>
                        <input
                          type="number"
                          value={item.rejectedQuantity}
                          onChange={(e) => updateGrnItem(index, 'rejectedQuantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-xs text-gray-500">{item.unitName}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Damaged Qty
                        </label>
                        <input
                          type="number"
                          value={item.damageQuantity}
                          onChange={(e) => updateGrnItem(index, 'damageQuantity', parseFloat(e.target.value) || 0)}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                        <span className="text-xs text-gray-500">{item.unitName}</span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rate
                        </label>
                        <input
                          type="number"
                          value={item.rate}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Amount
                        </label>
                        <input
                          type="number"
                          value={formatDecimal(item.acceptedQuantity * item.rate)}
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={() => setShowGRNModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitGRN}
                  disabled={creatingGRN}
                  className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                >
                  {creatingGRN ? 'Creating...' : 'Create GRN'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderDetails;

