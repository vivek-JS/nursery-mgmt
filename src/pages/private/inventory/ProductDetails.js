import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Box,
} from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const ProductDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProductDetails();
  }, [id]);

  const fetchProductDetails = async () => {
    try {
      const response = await axiosInstance.get(`/inventory/products/${id}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      alert('Error loading product details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <p className="text-xl text-gray-600">Product not found</p>
          <button
            onClick={() => navigate('/u/inventory/products')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const { product, batches, recentTransactions } = data;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'batches', label: `Batches (${batches?.length || 0})` },
    { id: 'transactions', label: `Transactions (${recentTransactions?.length || 0})` },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
          <button
            onClick={() => navigate('/u/inventory/products')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Products</span>
          </button>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-start space-x-4">
              <div className="p-4 bg-blue-100 rounded-xl">
                <Package className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{product.name}</h1>
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                    {product.code}
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full capitalize">
                    {product.category.replace('_', ' ')}
                  </span>
                  {product.isActive ? (
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                      Inactive
                    </span>
                  )}
                </div>
                {product.description && (
                  <p className="text-gray-600 mt-3">{product.description}</p>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate(`/u/inventory/products/${id}/edit`)}
              className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Current Stock</p>
            <Box className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {product.currentStock} <span className="text-lg">{product.primaryUnit?.abbreviation}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Average Price</p>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-800">
            ₹{product.averagePrice?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Stock Value</p>
            <TrendingUp className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-800">
            ₹{product.stockValue?.toLocaleString('en-IN') || '0'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Active Batches</p>
            <Package className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-gray-800">
            {batches?.filter((b) => b.status === 'active').length || 0}
          </p>
        </div>
      </div>

      {/* Product Info */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Product Information</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Primary Unit</p>
            <p className="font-semibold text-gray-800">
              {product.primaryUnit?.name} ({product.primaryUnit?.abbreviation})
            </p>
          </div>
          {product.secondaryUnit && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Secondary Unit</p>
              <p className="font-semibold text-gray-800">
                {product.secondaryUnit?.name} ({product.secondaryUnit?.abbreviation})
              </p>
            </div>
          )}
          {product.conversionFactor && product.conversionFactor !== 1 && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Conversion Factor</p>
              <p className="font-semibold text-gray-800">{product.conversionFactor}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600 mb-1">Reorder Level</p>
            <p className="font-semibold text-gray-800">{product.reorderLevel}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Min Stock Level</p>
            <p className="font-semibold text-gray-800">{product.minStockLevel}</p>
          </div>
          {product.maxStockLevel && (
            <div>
              <p className="text-sm text-gray-600 mb-1">Max Stock Level</p>
              <p className="font-semibold text-gray-800">{product.maxStockLevel}</p>
            </div>
          )}
          {product.hsn && (
            <div>
              <p className="text-sm text-gray-600 mb-1">HSN Code</p>
              <p className="font-semibold text-gray-800">{product.hsn}</p>
            </div>
          )}
          {product.gst > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-1">GST</p>
              <p className="font-semibold text-gray-800">{product.gst}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-lg">
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'batches' && (
            <div className="space-y-4">
              {batches && batches.length > 0 ? (
                batches.map((batch) => (
                  <div
                    key={batch._id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{batch.batchNumber}</h3>
                        <p className="text-sm text-gray-600">
                          Supplier: {batch.supplier?.name || 'N/A'}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          batch.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : batch.status === 'exhausted'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {batch.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Remaining</p>
                        <p className="font-semibold">
                          {batch.remainingQuantity} / {batch.quantity}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Purchase Price</p>
                        <p className="font-semibold">₹{batch.purchasePrice}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Received Date</p>
                        <p className="font-semibold">
                          {new Date(batch.receivedDate).toLocaleDateString()}
                        </p>
                      </div>
                      {batch.expiryDate && (
                        <div>
                          <p className="text-xs text-gray-500">Expiry Date</p>
                          <p className="font-semibold">
                            {new Date(batch.expiryDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No batches available</p>
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-3">
              {recentTransactions && recentTransactions.length > 0 ? (
                recentTransactions.map((txn) => (
                  <div
                    key={txn._id}
                    className="border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                              txn.transactionType === 'inward'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {txn.transactionType}
                          </span>
                          <span className="text-sm text-gray-600">{txn.transactionNumber}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">Quantity</p>
                            <p className="font-semibold">
                              {txn.quantity} {txn.unit?.abbreviation}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Balance After</p>
                            <p className="font-semibold">{txn.balanceAfterTransaction}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Date</p>
                            <p className="font-semibold">
                              {new Date(txn.transactionDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No transactions available</p>
              )}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                View detailed information about this product in the tabs above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;

