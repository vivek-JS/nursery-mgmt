import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit2, Building2, Phone, Mail, CreditCard, MapPin, FileText, DollarSign, Star, ChevronDown, ChevronUp } from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const MerchantList = () => {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [expandedCards, setExpandedCards] = useState(new Set());

  useEffect(() => {
    fetchMerchants();
  }, [searchTerm, pagination.page]);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (searchTerm) params.search = searchTerm;

      const response = await axiosInstance.get('/inventory/merchants', { params });
      if (response.data.success) {
        setMerchants(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCardExpansion = (merchantId) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(merchantId)) {
      newExpanded.delete(merchantId);
    } else {
      newExpanded.add(merchantId);
    }
    setExpandedCards(newExpanded);
  };

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'supplier':
        return 'bg-blue-100 text-blue-800';
      case 'buyer':
        return 'bg-green-100 text-green-800';
      case 'both':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Merchants / Recipients</h1>
            <p className="text-gray-600">Manage merchant and recipient information</p>
          </div>
          <button
            onClick={() => navigate('/u/inventory/merchants/new')}
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Add Merchant</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, code, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Merchants Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : merchants.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No merchants found</h3>
          <p className="text-gray-500 mb-6">Add your first merchant</p>
          <button
            onClick={() => navigate('/u/inventory/merchants/new')}
            className="bg-purple-500 text-white px-6 py-2 rounded-xl hover:bg-purple-600 transition-colors"
          >
            Add Merchant
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {merchants.map((merchant) => (
              <div
                key={merchant._id}
                className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <Building2 className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{merchant.name}</h3>
                        <p className="text-sm text-gray-500">{merchant.code}</p>
                        {merchant.isActive ? (
                          <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/u/inventory/merchants/${merchant._id}/ledger`)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Ledger"
                      >
                        <CreditCard className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/u/inventory/merchants/${merchant._id}`)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/u/inventory/merchants/${merchant._id}/edit`)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit Merchant"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Category Badge */}
                  {merchant.category && (
                    <div className="mb-3">
                      <span className={`inline-block px-2 py-1 ${getCategoryBadgeColor(merchant.category)} text-xs font-semibold rounded-full capitalize`}>
                        {merchant.category}
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {merchant.contactPerson && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <span className="text-sm"><strong>Contact:</strong> {merchant.contactPerson}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{merchant.phone}</span>
                    </div>
                    {merchant.email && (
                      <div className="flex items-center space-x-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{merchant.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Address */}
                  {merchant.address && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-start space-x-2 text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                          {typeof merchant.address === 'string' ? (
                            <span>{merchant.address}</span>
                          ) : (
                            <span>
                              {merchant.address.street && `${merchant.address.street}, `}
                              {merchant.address.city && `${merchant.address.city}, `}
                              {merchant.address.state && `${merchant.address.state} `}
                              {merchant.address.pincode && `- ${merchant.address.pincode}`}
                              {merchant.address.country && merchant.address.country !== 'India' && `, ${merchant.address.country}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial Summary */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {merchant.totalOrderValue !== undefined && (
                        <div>
                          <p className="text-gray-500">Total Orders</p>
                          <p className="font-semibold text-gray-700">
                            ₹{(merchant.totalOrderValue || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                      {merchant.totalPaidAmount !== undefined && (
                        <div>
                          <p className="text-gray-500">Total Paid</p>
                          <p className="font-semibold text-green-600">
                            ₹{(merchant.totalPaidAmount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                      {merchant.outstandingAmount !== undefined && (
                        <div>
                          <p className="text-gray-500">Outstanding</p>
                          <p className="font-semibold text-orange-600">
                            ₹{(merchant.outstandingAmount || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                      {merchant.creditLimit !== undefined && (
                        <div>
                          <p className="text-gray-500">Credit Limit</p>
                          <p className="font-semibold text-gray-700">
                            ₹{(merchant.creditLimit || 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expandable Section */}
                  <button
                    onClick={() => toggleCardExpansion(merchant._id)}
                    className="mt-4 w-full flex items-center justify-center space-x-2 text-sm text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    <span>{expandedCards.has(merchant._id) ? 'Show Less' : 'Show More Details'}</span>
                    {expandedCards.has(merchant._id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {/* Expanded Details */}
                  {expandedCards.has(merchant._id) && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      {/* GSTIN & PAN */}
                      <div className="grid grid-cols-2 gap-3">
                        {merchant.gstin && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">GSTIN</p>
                            <p className="text-sm font-semibold text-gray-700">{merchant.gstin}</p>
                          </div>
                        )}
                        {merchant.pan && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">PAN</p>
                            <p className="text-sm font-semibold text-gray-700">{merchant.pan}</p>
                          </div>
                        )}
                      </div>

                      {/* Payment Terms */}
                      {merchant.paymentTerms && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center">
                            <DollarSign className="w-3 h-3 mr-1" />
                            Payment Terms
                          </p>
                          <p className="text-sm font-semibold text-gray-700 capitalize">
                            {merchant.paymentTerms.replace('_', ' ')}
                          </p>
                        </div>
                      )}

                      {/* Rating */}
                      {merchant.rating && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center">
                            <Star className="w-3 h-3 mr-1" />
                            Rating
                          </p>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= merchant.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="text-sm text-gray-600 ml-2">({merchant.rating}/5)</span>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {merchant.notes && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            Notes
                          </p>
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">
                            {merchant.notes}
                          </p>
                        </div>
                      )}

                      {/* Timestamps */}
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                        {merchant.createdAt && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Created</p>
                            <p className="text-xs text-gray-600">
                              {new Date(merchant.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                        {merchant.updatedAt && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Updated</p>
                            <p className="text-xs text-gray-600">
                              {new Date(merchant.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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

export default MerchantList;

