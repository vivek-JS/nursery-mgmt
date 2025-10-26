import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, ShoppingCart, Package, FileText, Zap } from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const PurchaseOrderDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [po, setPo] = useState(null);
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [creatingGRN, setCreatingGRN] = useState(false);

  useEffect(() => {
    fetchPODetails();
  }, [id]);

  const fetchPODetails = async () => {
    try {
      const response = await axiosInstance.get(`/inventory/purchase-orders/${id}`);
      if (response.data.success) {
        setPo(response.data.data.purchaseOrder);
        setGrns(response.data.data.grns || []);
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
      await axiosInstance.post(`/inventory/purchase-orders/${id}/approve`);
      alert('Purchase Order approved successfully!');
      fetchPODetails();
    } catch (error) {
      console.error('Error approving PO:', error);
      alert(error.response?.data?.message || 'Error approving purchase order');
    } finally {
      setApproving(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this Purchase Order? This cannot be undone.')) return;

    try {
      await axiosInstance.post(`/inventory/purchase-orders/${id}/cancel`);
      alert('Purchase Order cancelled');
      fetchPODetails();
    } catch (error) {
      console.error('Error cancelling PO:', error);
      alert(error.response?.data?.message || 'Error cancelling purchase order');
    }
  };

  const handleCreateGRN = async () => {
    if (!window.confirm('Create GRN from this Purchase Order?')) return;

    setCreatingGRN(true);
    try {
      // Create GRN with items from PO
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
        supplier: po.supplier._id,
        purchaseOrder: po._id,
        items: grnItems,
      };

      const response = await axiosInstance.post('/inventory/grn', grnData);
      
      if (response.data.success) {
        const grnId = response.data.data._id;
        alert('GRN created successfully! Redirecting to GRN page...');
        navigate(`/u/inventory/grn/${grnId}`);
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
        supplier: po.supplier._id,
        purchaseOrder: po._id,
        items: grnItems,
      };

      const createResponse = await axiosInstance.post('/inventory/grn', grnData);
      
      if (createResponse.data.success) {
        const grnId = createResponse.data.data._id;
        
        // Immediately approve it
        await axiosInstance.post(`/inventory/grn/${grnId}/approve`, {
          qualityCheckRemarks: 'Auto-approved from PO',
        });

        alert('GRN created and approved! Stock has been updated.');
        fetchPODetails(); // Refresh to show updated status
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
                      {new Date(po.poDate).toLocaleDateString()}
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
                <p className="font-semibold text-gray-800">{po.supplier?.name || 'N/A'}</p>
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
                  {new Date(po.poDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Expected Delivery</p>
                <p className="font-semibold text-gray-800">
                  {po.expectedDeliveryDate
                    ? new Date(po.expectedDeliveryDate).toLocaleDateString()
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
                      ₹{item.amount?.toLocaleString('en-IN')}
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
              <span className="font-semibold">₹{po.subtotal?.toLocaleString('en-IN')}</span>
            </div>
            {po.discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Discount</span>
                <span className="font-semibold">-₹{po.discountAmount?.toLocaleString('en-IN')}</span>
              </div>
            )}
            {po.gstAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">GST</span>
                <span className="font-semibold">₹{po.gstAmount?.toLocaleString('en-IN')}</span>
              </div>
            )}
            {po.otherCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Other Charges</span>
                <span className="font-semibold">₹{po.otherCharges?.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-300 text-xl font-bold text-gray-900">
              <span>Total Amount</span>
              <span>₹{po.totalAmount?.toLocaleString('en-IN')}</span>
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
                        {new Date(grn.grnDate).toLocaleDateString()}
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
    </div>
  );
};

export default PurchaseOrderDetails;

