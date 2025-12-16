import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Eye, FileText, CheckCircle } from 'lucide-react';
import { API, NetworkManager } from '../../../network/core';
import { formatDisplayDate } from '../../../utils/dateUtils';
import { formatDecimal, formatCurrency } from '../../../utils/numberUtils';

const GRNList = () => {
  const navigate = useNavigate();
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [approvingId, setApprovingId] = useState(null);

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    fetchGRNs();
  }, [pagination.page, searchTerm, filterStatus]);

  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (searchTerm) params.search = searchTerm;
      if (filterStatus) params.status = filterStatus;

      // Following FarmerOrdersTable.js pattern - use NetworkManager with params
      const instance = NetworkManager(API.INVENTORY.GET_ALL_GRN);
      const response = await instance.request({}, params);
      
      if (response?.data) {
        const apiResponse = response.data;
        // Handle both response formats: {success: true, data: [...], pagination: {...}} or {status: "Success", data: {data: [...], pagination: {...}}}
        if (apiResponse.success && apiResponse.data) {
          const grnsData = Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setGrns(grnsData);
          setPagination(apiResponse.pagination || {});
        } else if (apiResponse.status === 'Success' && apiResponse.data) {
          const grnsData = Array.isArray(apiResponse.data.data) 
            ? apiResponse.data.data 
            : Array.isArray(apiResponse.data) 
            ? apiResponse.data 
            : [];
          setGrns(grnsData);
          setPagination(apiResponse.data.pagination || apiResponse.pagination || {});
        }
      }
    } catch (error) {
      console.error('Error fetching GRNs:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleApproveGRN = async (grnId) => {
    if (!window.confirm('Approve this GRN? This will update inventory stock.')) return;

    setApprovingId(grnId);
    try {
      const instance = NetworkManager(API.INVENTORY.APPROVE_GRN);
      const response = await instance.request(
        { qualityCheckRemarks: 'Approved from list' },
        [`${grnId}/approve`]
      );
      
      if (response?.data) {
        const apiResponse = response.data;
        if (apiResponse.success || apiResponse.status === 'Success') {
          alert('GRN approved successfully! Stock has been updated.');
          fetchGRNs(); // Refresh the list
        } else {
          alert(apiResponse.message || 'Error approving GRN');
        }
      }
    } catch (error) {
      console.error('Error approving GRN:', error);
      alert(error.response?.data?.message || 'Error approving GRN');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">GRN Management</h1>
            <p className="text-gray-600">Goods Receipt Notes</p>
          </div>
          <button
            onClick={() => navigate('/u/inventory/grn/new')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Create GRN</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by GRN number, invoice, or challan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="quality_check">Quality Check</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="partial_accepted">Partial Accepted</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* GRN Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : grns.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No GRNs found</h3>
          <p className="text-gray-500 mb-6">Create your first goods receipt note</p>
          <button
            onClick={() => navigate('/u/inventory/grn/new')}
            className="bg-purple-500 text-white px-6 py-2 rounded-xl hover:bg-purple-600 transition-colors"
          >
            Create GRN
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-purple-50 to-purple-100">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    GRN Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Batch / Expiry
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Approval Info
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {grns.map((grn) => (
                  <tr key={grn._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{grn.grnNumber}</div>
                        {grn.invoiceNumber && (
                          <div className="text-xs text-gray-500">Invoice: {grn.invoiceNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {grn.purchaseOrder?.poNumber || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {typeof grn.supplier === 'object' 
                          ? (grn.supplier?.name || grn.supplier?.displayName || 'N/A')
                          : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {grn.items?.length || 0} item(s)
                      </div>
                      {grn.items && grn.items.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {grn.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="truncate max-w-xs">
                              {item.product?.name || 'N/A'} ({item.acceptedQuantity || item.quantity} {item.unit?.abbreviation || ''})
                            </div>
                          ))}
                          {grn.items.length > 2 && (
                            <div className="text-gray-400 italic">+ {grn.items.length - 2} more</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {grn.items && grn.items.length > 0 ? (
                        <div className="space-y-1">
                          {grn.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-xs">
                              {item.batchNumber && (
                                <div className="text-gray-700">
                                  <span className="font-medium">Batch:</span> {item.batchNumber}
                                </div>
                              )}
                              {item.expiryDate && (
                                <div className={`mt-0.5 ${
                                  new Date(item.expiryDate) < new Date() 
                                    ? 'text-red-600 font-semibold' 
                                    : new Date(item.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                                    ? 'text-orange-600 font-medium'
                                    : 'text-gray-600'
                                }`}>
                                  <span className="font-medium">Expiry:</span> {formatDisplayDate(item.expiryDate)}
                                </div>
                              )}
                            </div>
                          ))}
                          {grn.items.length > 2 && (
                            <div className="text-xs text-gray-400 italic">+ {grn.items.length - 2} more</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatCurrency(formatDecimal(grn.totalAmount) || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDisplayDate(grn.grnDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(grn.status)}`}>
                        {grn.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {grn.status === 'approved' ? (
                        <div className="text-xs">
                          {grn.qualityCheckBy && (
                            <div className="text-gray-600">
                              <span className="font-medium">By:</span> {typeof grn.qualityCheckBy === 'object' ? grn.qualityCheckBy.name : 'N/A'}
                            </div>
                          )}
                          {grn.qualityCheckDate && (
                            <div className="text-gray-500 mt-0.5">
                              {formatDisplayDate(grn.qualityCheckDate)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/u/inventory/grn/${grn._id}`)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {grn.status === 'draft' && (
                          <button
                            onClick={() => handleApproveGRN(grn._id)}
                            disabled={approvingId === grn._id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Approve GRN"
                          >
                            {approvingId === grn._id ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                            ) : (
                              <CheckCircle className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setPagination({ ...pagination, page: Math.max(pagination.page - 1, 1) })}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: Math.min(pagination.page + 1, pagination.pages) })}
                  disabled={pagination.page === pagination.pages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setPagination({ ...pagination, page: Math.max(pagination.page - 1, 1) })}
                      disabled={pagination.page === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    {[...Array(pagination.pages)].map((_, idx) => {
                      const pageNum = idx + 1;
                      // Show first page, last page, current page, and pages around current
                      if (
                        pageNum === 1 ||
                        pageNum === pagination.pages ||
                        (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPagination({ ...pagination, page: pageNum })}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pagination.page === pageNum
                                ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      } else if (
                        pageNum === pagination.page - 2 ||
                        pageNum === pagination.page + 2
                      ) {
                        return (
                          <span
                            key={pageNum}
                            className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                          >
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    <button
                      onClick={() => setPagination({ ...pagination, page: Math.min(pagination.page + 1, pagination.pages) })}
                      disabled={pagination.page === pagination.pages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GRNList;

