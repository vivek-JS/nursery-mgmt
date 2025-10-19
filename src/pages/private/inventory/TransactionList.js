import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const TransactionList = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });

  useEffect(() => {
    fetchTransactions();
  }, [filterType, pagination.page]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (filterType) params.transactionType = filterType;

      const response = await axiosInstance.get('/inventory/transactions', { params });
      if (response.data.success) {
        setTransactions(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      inward: 'bg-green-100 text-green-800',
      outward: 'bg-orange-100 text-orange-800',
      adjustment: 'bg-blue-100 text-blue-800',
      transfer: 'bg-purple-100 text-purple-800',
      return: 'bg-yellow-100 text-yellow-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type) => {
    return type === 'inward' ? TrendingUp : TrendingDown;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mb-6">
        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-3 bg-pink-100 rounded-xl">
              <BarChart3 className="w-8 h-8 text-pink-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">Transaction History</h1>
              <p className="text-gray-600">Complete audit trail of inventory movements</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500"
              >
                <option value="">All Types</option>
                <option value="inward">Inward</option>
                <option value="outward">Outward</option>
                <option value="adjustment">Adjustment</option>
                <option value="transfer">Transfer</option>
                <option value="return">Return</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No transactions found</h3>
          <p className="text-gray-500">Transactions will appear here as you manage inventory</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {transactions.map((txn) => {
              const TypeIcon = getTypeIcon(txn.transactionType);
              return (
                <div
                  key={txn._id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`p-3 rounded-xl ${
                        txn.transactionType === 'inward' ? 'bg-green-100' : 'bg-orange-100'
                      }`}>
                        <TypeIcon className={`w-6 h-6 ${
                          txn.transactionType === 'inward' ? 'text-green-600' : 'text-orange-600'
                        }`} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{txn.transactionNumber}</h3>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getTypeColor(txn.transactionType)}`}>
                            {txn.transactionType.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-500">Product</p>
                            <p className="font-semibold text-gray-800">{txn.product?.name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Quantity</p>
                            <p className={`font-semibold ${
                              txn.transactionType === 'inward' ? 'text-green-700' : 'text-orange-700'
                            }`}>
                              {txn.transactionType === 'inward' ? '+' : '-'}{txn.quantity} {txn.unit?.abbreviation}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Balance After</p>
                            <p className="font-semibold text-gray-800">{txn.balanceAfterTransaction}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="font-semibold text-gray-800">
                              {new Date(txn.transactionDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {txn.referenceNumber && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              Ref: {txn.referenceType} - {txn.referenceNumber}
                            </p>
                          </div>
                        )}

                        {txn.performedBy && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              By: {txn.performedBy.name} at {new Date(txn.transactionDate).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

export default TransactionList;

