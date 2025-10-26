import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, FileText, Package, Truck } from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const GRNDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [grn, setGrn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [qualityRemarks, setQualityRemarks] = useState('');

  useEffect(() => {
    fetchGRN();
  }, [id]);

  const fetchGRN = async () => {
    try {
      const response = await axiosInstance.get(`/inventory/grn/${id}`);
      if (response.data.success) {
        setGrn(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching GRN:', error);
      alert('Error loading GRN details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this GRN? This will update inventory stock.')) return;

    setApproving(true);
    try {
      await axiosInstance.post(`/inventory/grn/${id}/approve`, {
        qualityCheckRemarks: qualityRemarks || 'Approved',
      });
      alert('GRN approved successfully! Stock has been updated.');
      fetchGRN();
    } catch (error) {
      console.error('Error approving GRN:', error);
      alert(error.response?.data?.message || 'Error approving GRN');
    } finally {
      setApproving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!grn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <p className="text-xl text-gray-600">GRN not found</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      quality_check: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      partial_accepted: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/u/inventory/grn')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to GRN List</span>
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex items-start space-x-4">
                <div className="p-4 bg-purple-100 rounded-xl">
                  <FileText className="w-10 h-10 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 mb-2">{grn.grnNumber}</h1>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(grn.status)}`}>
                      {grn.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-gray-600">
                      {new Date(grn.grnDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {grn.status === 'draft' && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex items-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>{approving ? 'Approving...' : 'Approve GRN'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Supplier & PO Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Supplier Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Supplier Name</p>
                <p className="font-semibold text-gray-800">{grn.supplier?.name || 'N/A'}</p>
              </div>
              {grn.purchaseOrder && (
                <div>
                  <p className="text-sm text-gray-500">Purchase Order</p>
                  <p className="font-semibold text-gray-800">{grn.purchaseOrder.poNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Invoice & Challan */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Document Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Invoice Number</p>
                <p className="font-semibold text-gray-800">{grn.invoiceNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="font-semibold text-gray-800">
                  {grn.invoiceDate ? new Date(grn.invoiceDate).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Challan Number</p>
                <p className="font-semibold text-gray-800">{grn.challanNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Challan Date</p>
                <p className="font-semibold text-gray-800">
                  {grn.challanDate ? new Date(grn.challanDate).toLocaleDateString() : '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          {(grn.vehicleNumber || grn.driverName) && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Truck className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-800">Vehicle Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Vehicle Number</p>
                  <p className="font-semibold text-gray-800">{grn.vehicleNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Driver Name</p>
                  <p className="font-semibold text-gray-800">{grn.driverName || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Package className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-800">Items ({grn.items?.length || 0})</h2>
          </div>
          <div className="space-y-3">
            {grn.items?.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">Product</p>
                    <p className="font-semibold text-gray-800">{item.product?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ordered</p>
                    <p className="font-semibold text-gray-800">{item.quantity} {item.unit?.abbreviation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Accepted</p>
                    <p className="font-semibold text-green-700">{item.acceptedQuantity} {item.unit?.abbreviation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-semibold text-gray-800">₹{item.amount?.toLocaleString('en-IN')}</p>
                  </div>
                </div>
                {(item.rejectedQuantity > 0 || item.damageQuantity > 0) && (
                  <div className="mt-2 flex space-x-4 text-sm">
                    {item.rejectedQuantity > 0 && (
                      <span className="text-red-600">Rejected: {item.rejectedQuantity}</span>
                    )}
                    {item.damageQuantity > 0 && (
                      <span className="text-orange-600">Damaged: {item.damageQuantity}</span>
                    )}
                  </div>
                )}
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
              <span className="font-semibold">₹{grn.subtotal?.toLocaleString('en-IN')}</span>
            </div>
            {grn.gstAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">GST</span>
                <span className="font-semibold">₹{grn.gstAmount?.toLocaleString('en-IN')}</span>
              </div>
            )}
            {grn.freightCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Freight Charges</span>
                <span className="font-semibold">₹{grn.freightCharges?.toLocaleString('en-IN')}</span>
              </div>
            )}
            {grn.otherCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Other Charges</span>
                <span className="font-semibold">₹{grn.otherCharges?.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-300 text-xl font-bold text-gray-900">
              <span>Total Amount</span>
              <span>₹{grn.totalAmount?.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Quality Check Section */}
        {grn.status === 'draft' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quality Check</h2>
            <textarea
              value={qualityRemarks}
              onChange={(e) => setQualityRemarks(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              placeholder="Enter quality check remarks..."
            />
            <button
              onClick={handleApprove}
              disabled={approving}
              className="mt-4 w-full bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-colors disabled:opacity-50 font-semibold flex items-center justify-center space-x-2"
            >
              <CheckCircle className="w-5 h-5" />
              <span>{approving ? 'Approving...' : 'Approve & Update Stock'}</span>
            </button>
          </div>
        )}

        {grn.status === 'approved' && grn.qualityCheckRemarks && (
          <div className="bg-green-50 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Quality Check Remarks</h2>
            <p className="text-gray-700">{grn.qualityCheckRemarks}</p>
            {grn.qualityCheckBy && (
              <p className="text-sm text-gray-500 mt-2">
                Checked by: {grn.qualityCheckBy.name} on{' '}
                {new Date(grn.qualityCheckDate).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GRNDetails;

