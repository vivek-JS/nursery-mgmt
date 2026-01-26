import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { API, NetworkManager } from 'network/core';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { Toast } from 'helpers/toasts/toastHelper';

const ReturnRequestList = () => {
  const navigate = useNavigate();
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchReturnRequests();
    fetchPendingCount();
  }, [filterStatus]);

  const fetchReturnRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;

      const instance = NetworkManager(API.INVENTORY.GET_RETURN_REQUESTS);
      const response = await instance.request(params);
      
      if (response?.data?.success) {
        setReturnRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching return requests:', error);
      Toast.error('Error fetching return requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const instance = NetworkManager(API.INVENTORY.GET_PENDING_RETURN_REQUESTS_COUNT);
      const response = await instance.request();
      if (response?.data?.success) {
        setPendingCount(response.data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      const instance = NetworkManager(API.INVENTORY.APPROVE_RETURN_REQUEST);
      const response = await instance.request({ remarks: '' }, [`${requestId}/approve`]);
      
      if (response?.data?.success) {
        Toast.success('Return request approved successfully');
        setApproveDialogOpen(false);
        setSelectedRequest(null);
        fetchReturnRequests();
        fetchPendingCount();
      } else {
        Toast.error(response?.data?.message || 'Failed to approve return request');
      }
    } catch (error) {
      console.error('Error approving return request:', error);
      Toast.error(error?.response?.data?.message || 'Error approving return request');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const instance = NetworkManager(API.INVENTORY.REJECT_RETURN_REQUEST);
      const response = await instance.request(
        { rejectionReason },
        [`${selectedRequest._id}/reject`]
      );
      
      if (response?.data?.success) {
        Toast.success('Return request rejected');
        setRejectDialogOpen(false);
        setRejectionReason('');
        setSelectedRequest(null);
        fetchReturnRequests();
        fetchPendingCount();
      } else {
        Toast.error(response?.data?.message || 'Failed to reject return request');
      }
    } catch (error) {
      console.error('Error rejecting return request:', error);
      Toast.error(error?.response?.data?.message || 'Error rejecting return request');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      approved: 'bg-green-100 text-green-800 border-green-300',
      rejected: 'bg-red-100 text-red-800 border-red-300',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getReturnTypeColor = (type) => {
    const colors = {
      sowing: 'bg-blue-100 text-blue-800',
      packet: 'bg-purple-100 text-purple-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Return Requests</h1>
            <p className="text-gray-600">Review and approve stock return requests</p>
          </div>
          {pendingCount > 0 && (
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-xl px-6 py-3">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-700" />
                <span className="font-bold text-yellow-800">{pendingCount} Pending</span>
              </div>
            </div>
          )}
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by request number, product name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') fetchReturnRequests();
                }}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-5 h-5" />
              <span className="font-medium">Filters</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Return Requests List */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading return requests...</p>
        </div>
      ) : returnRequests.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <p className="text-gray-600 text-lg">No return requests found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Request #</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Product</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Quantity</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Requested By</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {returnRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono font-semibold text-blue-600">
                        {request.requestNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">
                          {request.product?.name || 'N/A'}
                        </div>
                        {request.batch?.batchNumber && (
                          <div className="text-sm text-gray-500">
                            Batch: {request.batch.batchNumber}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getReturnTypeColor(
                          request.returnType
                        )}`}
                      >
                        {request.returnType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">
                        {request.quantity} {request.unit?.abbreviation || request.unit?.name || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 w-fit ${getStatusColor(
                          request.status
                        )}`}
                      >
                        {getStatusIcon(request.status)}
                        <span className="capitalize">{request.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {request.requestedBy?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDisplayDate(request.requestedDate)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setApproveDialogOpen(true);
                              }}
                              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-1"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setRejectDialogOpen(true);
                              }}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            // You can add a view details dialog here
                          }}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Dialog */}
      {approveDialogOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Approve Return Request</h2>
            <div className="mb-4 space-y-2">
              <p><span className="font-semibold">Request:</span> {selectedRequest.requestNumber}</p>
              <p><span className="font-semibold">Product:</span> {selectedRequest.product?.name}</p>
              <p><span className="font-semibold">Quantity:</span> {selectedRequest.quantity} {selectedRequest.unit?.abbreviation || ''}</p>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to approve this return request? The stock will be added back to inventory.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setApproveDialogOpen(false);
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedRequest._id)}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {rejectDialogOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Reject Return Request</h2>
            <div className="mb-4 space-y-2">
              <p><span className="font-semibold">Request:</span> {selectedRequest.requestNumber}</p>
              <p><span className="font-semibold">Product:</span> {selectedRequest.product?.name}</p>
              <p><span className="font-semibold">Quantity:</span> {selectedRequest.quantity} {selectedRequest.unit?.abbreviation || ''}</p>
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
                  setSelectedRequest(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReturnRequestList;

