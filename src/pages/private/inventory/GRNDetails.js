import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, FileText, Package, Truck, Image as ImageIcon } from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { formatDecimal, formatCurrency } from '../../../utils/numberUtils';

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
      const instance = NetworkManager(API.INVENTORY.GET_GRN_BY_ID);
      const response = await instance.request({}, [id]);
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success && apiResponse.data) {
          setGrn(apiResponse.data);
        } else if (apiResponse.data) {
          setGrn(apiResponse.data);
        }
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
      const instance = NetworkManager(API.INVENTORY.APPROVE_GRN || '/inventory/grn');
      const response = await instance.request({
        qualityCheckRemarks: qualityRemarks || 'Approved',
      }, [id, 'approve']);
      
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          alert('GRN approved successfully! Stock has been updated.');
          fetchGRN();
        } else {
          alert(apiResponse.message || 'Error approving GRN');
        }
      }
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
                      {formatDisplayDate(grn.grnDate)}
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
              <div key={index} className="border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500 mb-1">Product</p>
                    <p className="font-semibold text-gray-800 text-lg">{item.product?.name || 'N/A'}</p>
                    {item.product?.code && (
                      <p className="text-xs text-gray-500">Code: {item.product.code}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Quantity</p>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        Ordered: <span className="font-semibold">{item.quantity}</span> {item.unit?.abbreviation || ''}
                      </p>
                      <p className="text-sm text-green-700">
                        Accepted: <span className="font-semibold">{item.acceptedQuantity || item.quantity}</span> {item.unit?.abbreviation || ''}
                      </p>
                      {item.rejectedQuantity > 0 && (
                        <p className="text-sm text-red-600">
                          Rejected: <span className="font-semibold">{item.rejectedQuantity}</span> {item.unit?.abbreviation || ''}
                        </p>
                      )}
                      {item.damageQuantity > 0 && (
                        <p className="text-sm text-orange-600">
                          Damaged: <span className="font-semibold">{item.damageQuantity}</span> {item.unit?.abbreviation || ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Amount</p>
                    <p className="font-semibold text-gray-800 text-lg">{formatCurrency(formatDecimal(item.amount) || 0)}</p>
                    {item.rate && (
                      <p className="text-xs text-gray-500">Rate: {formatCurrency(formatDecimal(item.rate) || 0)}</p>
                    )}
                  </div>
                </div>
                
                {/* Batch Number and Expiry Date Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Batch / Lot Number</p>
                    <p className="font-semibold text-blue-800 text-sm">
                      {item.batchNumber || item.lotNumber || 'N/A'}
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                    <p className="font-semibold text-orange-800 text-sm">
                      {item.expiryDate ? formatDisplayDate(item.expiryDate) : 'N/A'}
                    </p>
                    {item.expiryDate && (() => {
                      const expiryDate = new Date(item.expiryDate);
                      const today = new Date();
                      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                      if (daysUntilExpiry < 0) {
                        return <p className="text-xs text-red-600 mt-1">⚠️ Expired</p>;
                      } else if (daysUntilExpiry < 30) {
                        return <p className="text-xs text-orange-600 mt-1">⚠️ Expires in {daysUntilExpiry} days</p>;
                      } else if (daysUntilExpiry < 90) {
                        return <p className="text-xs text-yellow-600 mt-1">⚠️ Expires in {daysUntilExpiry} days</p>;
                      }
                      return null;
                    })()}
                  </div>
                  {item.manufactureDate && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Manufacturing Date</p>
                      <p className="font-semibold text-green-800 text-sm">
                        {formatDisplayDate(item.manufactureDate)}
                      </p>
                    </div>
                  )}
                </div>

                {item.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{item.notes}</p>
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
              <span className="font-semibold">{formatCurrency(formatDecimal(grn.subtotal) || 0)}</span>
            </div>
            {grn.gstAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">GST</span>
                <span className="font-semibold">{formatCurrency(formatDecimal(grn.gstAmount) || 0)}</span>
              </div>
            )}
            {grn.freightCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Freight Charges</span>
                <span className="font-semibold">{formatCurrency(formatDecimal(grn.freightCharges) || 0)}</span>
              </div>
            )}
            {grn.otherCharges > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Other Charges</span>
                <span className="font-semibold">{formatCurrency(formatDecimal(grn.otherCharges) || 0)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-300 text-xl font-bold text-gray-900">
              <span>Total Amount</span>
              <span>{formatCurrency(formatDecimal(grn.totalAmount) || 0)}</span>
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
                {formatDisplayDate(grn.qualityCheckDate)}
              </p>
            )}
          </div>
        )}

        {/* GRN Images */}
        {grn.attachments && grn.attachments.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <ImageIcon className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-800">GRN Images ({grn.attachments.length})</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {grn.attachments.map((attachment, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={attachment.url || attachment}
                    alt={attachment.name || `GRN Image ${idx + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-300 cursor-pointer hover:border-purple-400 transition-colors"
                    onClick={() => window.open(attachment.url || attachment, '_blank')}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                    }}
                  />
                  {attachment.name && (
                    <p className="text-xs text-gray-500 mt-1 truncate">{attachment.name}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GRNDetails;

