import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, CreditCard, Package, FileText, Upload, X, DollarSign } from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { formatDecimal, formatCurrency } from '../../../utils/numberUtils';
import { Toast } from 'helpers/toasts/toastHelper';

const SellOrderDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    paidAmount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    modeOfPayment: '',
    bankName: '',
    transactionId: '',
    chequeNumber: '',
    upiId: '',
    receiptPhoto: [],
    remark: '',
    paymentStatus: 'PENDING',
    isWalletPayment: false,
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_SELL_ORDER_BY_ID);
      const response = await instance.request({}, [id]);
      
      if (response?.data) {
        if (response.data.success && response.data.data) {
          const orderData = response.data.data.order || response.data.data;
          setOrder(orderData);
        }
      }
    } catch (error) {
      console.error('Error fetching sell order:', error);
      Toast.error('Error loading sell order');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm('Approve this Sell Order? This will reduce inventory stock.')) return;

    setApproving(true);
    try {
      const instance = NetworkManager(API.INVENTORY.APPROVE_SELL_ORDER);
      const response = await instance.request({ qualityCheckRemarks: 'Approved' }, [`${id}/approve`]);
      
      if (response?.data) {
        if (response.data.success) {
          Toast.success('Sell Order approved successfully!');
          fetchOrderDetails();
        } else {
          Toast.error(response.data.message || 'Error approving sell order');
        }
      }
    } catch (error) {
      console.error('Error approving sell order:', error);
      Toast.error(error.response?.data?.message || error.message || 'Error approving sell order');
    } finally {
      setApproving(false);
    }
  };

  const handlePaymentInputChange = (field, value) => {
    setNewPayment((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'your_upload_preset'); // Replace with your Cloudinary preset

        const response = await fetch('https://api.cloudinary.com/v1_1/your_cloud_name/image/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        return data.secure_url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setNewPayment((prev) => ({
        ...prev,
        receiptPhoto: [...(prev.receiptPhoto || []), ...uploadedUrls],
      }));
    } catch (error) {
      console.error('Error uploading photos:', error);
      Toast.error('Error uploading photos');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = (index) => {
    setNewPayment((prev) => ({
      ...prev,
      receiptPhoto: prev.receiptPhoto.filter((_, i) => i !== index),
    }));
  };

  const handleAddPayment = async () => {
    if (!newPayment.paidAmount) {
      Toast.error('Please enter payment amount');
      return;
    }

    if (!newPayment.modeOfPayment && !newPayment.isWalletPayment) {
      Toast.error('Please select payment mode');
      return;
    }

    try {
      const instance = NetworkManager(API.INVENTORY.ADD_SELL_ORDER_PAYMENT);
      const response = await instance.request(newPayment, [`${id}/payment`]);
      
      if (response?.data) {
        if (response.data.success) {
          Toast.success('Payment added successfully!');
          setShowPaymentModal(false);
          setNewPayment({
            paidAmount: '',
            paymentDate: new Date().toISOString().split('T')[0],
            modeOfPayment: '',
            bankName: '',
            transactionId: '',
            chequeNumber: '',
            upiId: '',
            receiptPhoto: [],
            remark: '',
            paymentStatus: 'PENDING',
            isWalletPayment: false,
          });
          fetchOrderDetails();
        } else {
          Toast.error(response.data.message || 'Error adding payment');
        }
      }
    } catch (error) {
      console.error('Error adding payment:', error);
      Toast.error(error.response?.data?.message || error.message || 'Error adding payment');
    }
  };

  const getTotalPaidAmount = () => {
    if (!order?.payment || !Array.isArray(order.payment)) return 0;
    return order.payment
      .filter(p => p.paymentStatus === 'COLLECTED')
      .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700';
      case 'dispatched':
        return 'bg-blue-100 text-blue-700';
      case 'delivered':
        return 'bg-purple-100 text-purple-700';
      case 'cancelled':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-yellow-100 text-yellow-700';
      case 'pending':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Sell Order not found</h3>
          <button
            onClick={() => navigate('/u/inventory/sell-orders')}
            className="mt-4 bg-pink-500 text-white px-6 py-2 rounded-xl hover:bg-pink-600 transition-colors"
          >
            Back to Sell Orders
          </button>
        </div>
      </div>
    );
  }

  const totalPaid = getTotalPaidAmount();
  const outstanding = (order.totalAmount || 0) - totalPaid;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/u/inventory/sell-orders')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Sell Orders</span>
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Sell Order #{order.orderNumber}</h1>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                {order.status?.toUpperCase()}
              </span>
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                {order.paymentStatus?.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex space-x-3">
            {order.status === 'draft' || order.status === 'pending' ? (
              <button
                onClick={handleApprove}
                disabled={approving}
                className="bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5" />
                <span>{approving ? 'Approving...' : 'Approve Order'}</span>
              </button>
            ) : null}
            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-pink-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2"
            >
              <CreditCard className="w-5 h-5" />
              <span>Add Payment</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Information */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <FileText className="w-6 h-6" />
              <span>Order Information</span>
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Order Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDisplayDate(order.orderDate)}
                </p>
              </div>
              {order.deliveryDate && (
                <div>
                  <p className="text-sm text-gray-500">Delivery Date</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDisplayDate(order.deliveryDate)}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Buyer</p>
                <p className="text-lg font-semibold text-gray-900">
                  {order.merchant?.name || order.buyerName || 'N/A'}
                </p>
                {order.buyerVillage && (
                  <p className="text-sm text-gray-500">{order.buyerVillage}</p>
                )}
              </div>
              {order.merchant?.phone && (
                <div>
                  <p className="text-sm text-gray-500">Contact</p>
                  <p className="text-lg font-semibold text-gray-900">{order.merchant.phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <Package className="w-6 h-6" />
              <span>Order Items</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Product</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Quantity</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-gray-900">{item.product?.name || 'N/A'}</p>
                        {item.batchNumber && (
                          <p className="text-xs text-gray-500">Batch: {item.batchNumber}</p>
                        )}
                      </td>
                      <td className="text-right py-3 px-4">
                        {item.quantity} {item.unit?.abbreviation || item.unit?.name || ''}
                      </td>
                      <td className="text-right py-3 px-4">{formatCurrency(item.rate || 0)}</td>
                      <td className="text-right py-3 px-4 font-semibold">{formatCurrency(item.amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History */}
          {order.payment && order.payment.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center space-x-2">
                <DollarSign className="w-6 h-6" />
                <span>Payment History</span>
              </h2>
              <div className="space-y-3">
                {order.payment.map((payment, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{formatCurrency(payment.paidAmount || 0)}</p>
                        <p className="text-sm text-gray-500">{formatDisplayDate(payment.paymentDate)}</p>
                        <p className="text-sm text-gray-600">{payment.modeOfPayment}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        payment.paymentStatus === 'COLLECTED' ? 'bg-green-100 text-green-700' :
                        payment.paymentStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {payment.paymentStatus}
                      </span>
                    </div>
                    {payment.remark && (
                      <p className="text-sm text-gray-500 mt-2">{payment.remark}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">{formatCurrency(order.subtotal || 0)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              {order.gstAmount > 0 && (
                <div className="flex justify-between">
                  <span>GST</span>
                  <span>{formatCurrency(order.gstAmount)}</span>
                </div>
              )}
              {order.otherCharges > 0 && (
                <div className="flex justify-between">
                  <span>Other Charges</span>
                  <span>{formatCurrency(order.otherCharges)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-lg font-bold text-gray-900">Total Amount</span>
                <span className="text-lg font-bold text-gray-900">{formatCurrency(order.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Paid</span>
                <span className="font-semibold">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between text-orange-600">
                <span>Outstanding</span>
                <span className="font-semibold">{formatCurrency(outstanding)}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          {order.vehicleDetails && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Vehicle Details</h2>
              <div className="space-y-2 text-sm">
                {order.vehicleDetails.number && (
                  <p><span className="text-gray-500">Number:</span> {order.vehicleDetails.number}</p>
                )}
                {order.vehicleDetails.type && (
                  <p><span className="text-gray-500">Type:</span> {order.vehicleDetails.type}</p>
                )}
                {order.vehicleDetails.driverName && (
                  <p><span className="text-gray-500">Driver:</span> {order.vehicleDetails.driverName}</p>
                )}
                {order.vehicleDetails.driverContact && (
                  <p><span className="text-gray-500">Contact:</span> {order.vehicleDetails.driverContact}</p>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Notes</h2>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Add Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount *</label>
                  <input
                    type="number"
                    value={newPayment.paidAmount}
                    onChange={(e) => handlePaymentInputChange('paidAmount', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                  <input
                    type="date"
                    value={newPayment.paymentDate}
                    onChange={(e) => handlePaymentInputChange('paymentDate', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode *</label>
                <select
                  value={newPayment.modeOfPayment}
                  onChange={(e) => handlePaymentInputChange('modeOfPayment', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                >
                  <option value="">Select Payment Mode</option>
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="NEFT/RTGS">NEFT/RTGS</option>
                  <option value="Card">Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              {newPayment.modeOfPayment === 'Cheque' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cheque Number</label>
                  <input
                    type="text"
                    value={newPayment.chequeNumber}
                    onChange={(e) => handlePaymentInputChange('chequeNumber', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              )}

              {newPayment.modeOfPayment === 'UPI' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
                  <input
                    type="text"
                    value={newPayment.upiId}
                    onChange={(e) => handlePaymentInputChange('upiId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={newPayment.bankName}
                  onChange={(e) => handlePaymentInputChange('bankName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                <input
                  type="text"
                  value={newPayment.transactionId}
                  onChange={(e) => handlePaymentInputChange('transactionId', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Photos</label>
                <div className="mt-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                  {uploadingPhoto && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
                  {newPayment.receiptPhoto && newPayment.receiptPhoto.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {newPayment.receiptPhoto.map((url, idx) => (
                        <div key={idx} className="relative">
                          <img src={url} alt={`Receipt ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                          <button
                            onClick={() => removePhoto(idx)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Remarks</label>
                <textarea
                  value={newPayment.remark}
                  onChange={(e) => handlePaymentInputChange('remark', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleAddPayment}
                  className="flex-1 bg-pink-500 text-white px-6 py-3 rounded-xl hover:bg-pink-600 transition-colors"
                >
                  Add Payment
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellOrderDetails;

