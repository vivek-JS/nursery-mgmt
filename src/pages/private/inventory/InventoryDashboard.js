import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  FileText,
  Send,
  BarChart3,
  RotateCcw,
} from 'lucide-react';
import { API, NetworkManager } from 'network/core';
import SowingRequestDialog from './components/SowingRequestDialog';
import { Toast } from 'helpers/toasts/toastHelper';
import { CheckCircle, XCircle } from 'lucide-react';

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sowingRequests, setSowingRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [returnRequests, setReturnRequests] = useState([]);
  const [loadingReturnRequests, setLoadingReturnRequests] = useState(false);
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState(null);

  useEffect(() => {
    fetchInventorySummary();
    fetchPendingSowingRequests();
    fetchPendingReturnRequests();
  }, []);

  const fetchInventorySummary = async () => {
    try {
      // Following FarmerOrdersTable.js pattern - use NetworkManager
      const instance = NetworkManager(API.INVENTORY.GET_PRODUCTS_SUMMARY);
      const response = await instance.request();
      // Handle response format
      if (response?.data) {
        const data = response.data.data || response.data;
        if (data.success || data.status === 'Success') {
          setSummary(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingSowingRequests = async () => {
    setLoadingRequests(true);
    try {
      const instance = NetworkManager(API.sowing.GET_PENDING_SOWING_REQUESTS);
      const response = await instance.request();
      if (response?.data?.success) {
        setSowingRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sowing requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchPendingReturnRequests = async () => {
    setLoadingReturnRequests(true);
    try {
      const instance = NetworkManager(API.INVENTORY.GET_RETURN_REQUESTS);
      const response = await instance.request({ status: 'pending' });
      if (response?.data?.success) {
        // Filter to show only pending requests and get first 6 for dashboard
        const pendingRequests = (response.data.data || []).filter(req => req.status === 'pending');
        setReturnRequests(pendingRequests.slice(0, 6));
      }
    } catch (error) {
      console.error('Error fetching return requests:', error);
    } finally {
      setLoadingReturnRequests(false);
    }
  };

  const handleApproveReturnRequest = (request, e) => {
    e.stopPropagation(); // Prevent card click navigation
    setSelectedReturnRequest(request);
    setApproveDialogOpen(true);
  };

  const confirmApproveReturnRequest = async () => {
    if (!selectedReturnRequest) return;

    setApprovingId(selectedReturnRequest._id);
    try {
      const instance = NetworkManager(API.INVENTORY.APPROVE_RETURN_REQUEST);
      const response = await instance.request({ remarks: '' }, [`${selectedReturnRequest._id}/approve`]);
      
      if (response?.data?.success) {
        Toast.success('Return request approved successfully');
        setApproveDialogOpen(false);
        setSelectedReturnRequest(null);
        fetchPendingReturnRequests();
        fetchInventorySummary(); // Refresh summary to show updated stock
      } else {
        Toast.error(response?.data?.message || 'Failed to approve return request');
      }
    } catch (error) {
      console.error('Error approving return request:', error);
      Toast.error(error?.response?.data?.message || 'Error approving return request');
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectReturnRequest = (request, e) => {
    e.stopPropagation(); // Prevent card click navigation
    setSelectedReturnRequest(request);
    setRejectDialogOpen(true);
  };

  const confirmRejectReturnRequest = async () => {
    if (!rejectionReason.trim()) {
      Toast.error('Please provide a rejection reason');
      return;
    }

    if (!selectedReturnRequest) return;

    setRejectingId(selectedReturnRequest._id);
    try {
      const instance = NetworkManager(API.INVENTORY.REJECT_RETURN_REQUEST);
      const response = await instance.request(
        { rejectionReason },
        [`${selectedReturnRequest._id}/reject`]
      );
      
      if (response?.data?.success) {
        Toast.success('Return request rejected');
        setRejectDialogOpen(false);
        setRejectionReason('');
        setSelectedReturnRequest(null);
        fetchPendingReturnRequests();
      } else {
        Toast.error(response?.data?.message || 'Failed to reject return request');
      }
    } catch (error) {
      console.error('Error rejecting return request:', error);
      Toast.error(error?.response?.data?.message || 'Error rejecting return request');
    } finally {
      setRejectingId(null);
    }
  };

  const handleRequestClick = async (request) => {
    try {
      const instance = NetworkManager(API.sowing.GET_SOWING_REQUEST_BY_ID);
      const response = await instance.request({}, [request._id]);
      if (response?.data?.success) {
        setSelectedRequest(response.data.data);
        setRequestDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      alert('Error loading request details');
    }
  };

  const quickActions = [
    {
      title: 'New Product',
      icon: Package,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      path: '/u/inventory/products/new',
    },
    {
      title: 'Purchase Order',
      icon: ShoppingCart,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      path: '/u/inventory/purchase-orders/new',
    },
    {
      title: 'Create GRN',
      icon: FileText,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      path: '/u/inventory/grn/new',
    },
    {
      title: 'Issue Stock',
      icon: Send,
      color: 'bg-orange-500',
      hoverColor: 'hover:bg-orange-600',
      path: '/u/inventory/outward/new',
    },
  ];

  const statsCards = [
    {
      title: 'Total Products',
      value: summary?.totalProducts || 0,
      icon: Package,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Active Products',
      value: summary?.activeProducts || 0,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      textColor: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Low Stock Items',
      value: summary?.lowStockCount || 0,
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600',
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Stock Value',
      value: `₹${(summary?.totalStockValue || 0).toLocaleString('en-IN', {
        maximumFractionDigits: 0,
      })}`,
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  const menuItems = [
    {
      title: 'Products',
      description: 'Manage your product catalog',
      icon: Package,
      path: '/u/inventory/products',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Purchase Orders',
      description: 'Track purchase orders',
      icon: ShoppingCart,
      path: '/u/inventory/purchase-orders',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'GRN',
      description: 'Goods Receipt Notes',
      icon: FileText,
      path: '/u/inventory/grn',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Stock Outward',
      description: 'Issue materials & stock',
      icon: Send,
      path: '/u/inventory/outward',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Suppliers',
      description: 'Manage supplier details',
      icon: Package,
      path: '/u/inventory/suppliers',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Merchants',
      description: 'Manage merchants & recipients',
      icon: Package,
      path: '/u/inventory/merchants',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Sell Orders',
      description: 'Manage sell orders to merchants',
      icon: ShoppingCart,
      path: '/u/inventory/sell-orders',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: 'Transactions',
      description: 'View inventory movements',
      icon: BarChart3,
      path: '/u/inventory/transactions',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: 'Ledger',
      description: 'Merchant & Farmer ledgers',
      icon: FileText,
      path: '/u/inventory/ledger',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Return Requests',
      description: 'Approve stock return requests',
      icon: RotateCcw,
      path: '/u/inventory/return-requests',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 sm:p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-1 sm:mb-2">
          Inventory Management
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Comprehensive inventory control and tracking system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className={`h-1.5 sm:h-2 rounded-t-xl sm:rounded-t-2xl bg-gradient-to-r ${stat.color}`} />
            <div className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
                <div className={`p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.textColor}`} />
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm text-gray-500 mb-0.5 sm:mb-1">{stat.title}</p>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">
                    {stat.value}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className={`${action.color} ${action.hoverColor} text-white rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
            >
              <action.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 mb-1 sm:mb-2 mx-auto" />
              <p className="font-semibold text-xs sm:text-sm md:text-base lg:text-lg">{action.title}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Category-wise Stock */}
      {summary?.categoryWiseStock && summary.categoryWiseStock.length > 0 && (
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">
            Stock by Category
          </h2>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {summary.categoryWiseStock.map((category, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-blue-400 transition-colors"
                >
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-2 capitalize">
                    {category._id.replace('_', ' ')}
                  </h3>
                  <div className="space-y-0.5 sm:space-y-1">
                    <p className="text-xs sm:text-sm text-gray-600">
                      Products: <span className="font-semibold">{category.count}</span>
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Value:{' '}
                      <span className="font-semibold">
                        ₹{category.totalValue.toLocaleString('en-IN')}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sowing Requests Section */}
      {sowingRequests.length > 0 && (
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Sowing Requests Received ({sowingRequests.length})
            </h2>
            <button
              onClick={() => navigate('/u/inventory/sowing-requests')}
              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
            >
              View All →
            </button>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {sowingRequests.map((request) => (
                <button
                  key={request._id}
                  onClick={() => handleRequestClick(request)}
                  className="border-2 border-orange-300 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-orange-500 hover:shadow-md transition-all text-left"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">{request.requestNumber}</p>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-1">
                        {request.plantName}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">{request.subtypeName}</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-1 rounded block mb-1">
                        {request.packetsRequested?.toFixed(2) || request.packetsNeeded?.toFixed(2) || request.packetsNeeded} {request.unitName}
                      </span>
                      {request.excessPackets > 0 && (
                        <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded block">
                          +{request.excessPackets.toFixed(2)} excess
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Available: {request.availablePackets || 0}</span>
                    <span className="text-orange-600 font-semibold">Click to Issue →</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Return Requests Section */}
      {returnRequests.length > 0 && (
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
              Return Requests Pending ({returnRequests.length})
            </h2>
            <button
              onClick={() => navigate('/u/inventory/return-requests')}
              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
            >
              View All →
            </button>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {returnRequests.map((request) => (
                <div
                  key={request._id}
                  className="border-2 border-yellow-300 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-yellow-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">{request.requestNumber}</p>
                      <h3 className="text-sm sm:text-base font-bold text-gray-800 mb-1">
                        {request.product?.name || 'N/A'}
                      </h3>
                      {request.batch?.batchNumber && (
                        <p className="text-xs sm:text-sm text-gray-600 mb-2">
                          Batch: {request.batch.batchNumber}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded block mb-1">
                        {request.quantity} {request.unit?.abbreviation || request.unit?.name || ''}
                      </span>
                      <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-1 rounded block capitalize">
                        {request.returnType}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span>By: {request.requestedBy?.name || 'N/A'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => handleApproveReturnRequest(request, e)}
                      disabled={approvingId === request._id || rejectingId === request._id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={(e) => handleRejectReturnRequest(request, e)}
                      disabled={approvingId === request._id || rejectingId === request._id}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Approve Dialog */}
      {approveDialogOpen && selectedReturnRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Approve Return Request</h2>
            <div className="mb-4 space-y-2">
              <p><span className="font-semibold">Request:</span> {selectedReturnRequest.requestNumber}</p>
              <p><span className="font-semibold">Product:</span> {selectedReturnRequest.product?.name}</p>
              {selectedReturnRequest.batch?.batchNumber && (
                <p><span className="font-semibold">Batch:</span> {selectedReturnRequest.batch.batchNumber}</p>
              )}
              <p><span className="font-semibold">Quantity:</span> {selectedReturnRequest.quantity} {selectedReturnRequest.unit?.abbreviation || selectedReturnRequest.unit?.name || ''}</p>
              <p><span className="font-semibold">Type:</span> <span className="capitalize">{selectedReturnRequest.returnType}</span></p>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve this return request? The stock will be added back to inventory.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setApproveDialogOpen(false);
                  setSelectedReturnRequest(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproveReturnRequest}
                disabled={approvingId === selectedReturnRequest._id}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {approvingId === selectedReturnRequest._id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Approve</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialogOpen && selectedReturnRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reject Return Request</h2>
            <div className="mb-4 space-y-2">
              <p><span className="font-semibold">Request:</span> {selectedReturnRequest.requestNumber}</p>
              <p><span className="font-semibold">Product:</span> {selectedReturnRequest.product?.name}</p>
              <p><span className="font-semibold">Quantity:</span> {selectedReturnRequest.quantity} {selectedReturnRequest.unit?.abbreviation || ''}</p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason('');
                  setSelectedReturnRequest(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectReturnRequest}
                disabled={!rejectionReason.trim() || rejectingId === selectedReturnRequest._id}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejectingId === selectedReturnRequest._id ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Grid */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Inventory Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-4 sm:p-5 md:p-6 text-left group w-full"
            >
              <div className="flex items-start space-x-3 sm:space-x-4">
                <div className={`p-2.5 sm:p-3 md:p-4 rounded-lg sm:rounded-xl ${item.bgColor} group-hover:scale-110 transition-transform flex-shrink-0`}>
                  <item.icon className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800 mb-1 sm:mb-2 group-hover:text-blue-600 transition-colors truncate">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-xs sm:text-sm line-clamp-2">{item.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sowing Request Dialog */}
      <SowingRequestDialog
        open={requestDialogOpen}
        onClose={() => {
          setRequestDialogOpen(false);
          setSelectedRequest(null);
        }}
        request={selectedRequest}
        onSuccess={() => {
          fetchPendingSowingRequests();
          fetchInventorySummary();
        }}
      />
    </div>
  );
};

export default InventoryDashboard;

