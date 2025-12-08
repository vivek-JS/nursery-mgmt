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

  useEffect(() => {
    fetchGRNs();
  }, [searchTerm, filterStatus, pagination.page]);

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

      {/* GRN List */}
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
        <>
          <div className="grid grid-cols-1 gap-4">
            {grns.map((grn) => (
              <div
                key={grn._id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">{grn.grnNumber}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(grn.status)}`}>
                          {grn.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Supplier</p>
                          <p className="font-semibold text-gray-800">{grn.supplier?.name || grn.supplier?.displayName || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">GRN Date</p>
                          <p className="font-semibold text-gray-800">
                            {formatDisplayDate(grn.grnDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Invoice</p>
                          <p className="font-semibold text-gray-800">{grn.invoiceNumber || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase">Total Amount</p>
                          <p className="font-semibold text-gray-800">
                            {formatCurrency(formatDecimal(grn.totalAmount) || 0)}
                          </p>
                        </div>
                      </div>

                      {grn.items && grn.items.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-500">
                            {grn.items.length} item(s)
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => navigate(`/u/inventory/grn/${grn._id}`)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      {grn.status === 'draft' && (
                        <button
                          onClick={() => navigate(`/inventory/grn/${grn._id}/approve`)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Approve GRN"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-6 flex justify-center items-center space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="text-gray-600 px-4">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GRNList;

