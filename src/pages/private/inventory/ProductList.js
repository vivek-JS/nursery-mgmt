import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Eye,
  AlertCircle,
  Package,
  TrendingDown,
  X,
} from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const ProductList = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive] = useState('true');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'raw_material', label: 'Raw Material' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'finished_good', label: 'Finished Good' },
    { value: 'consumable', label: 'Consumable' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, filterCategory, filterActive, pagination.page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm) params.search = searchTerm;
      if (filterCategory) params.category = filterCategory;
      if (filterActive !== '') params.isActive = filterActive;

      const response = await axiosInstance.get('/inventory/products', { params });
      
      if (response.data.success) {
        setProducts(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product) => {
    if (product.currentStock <= 0) {
      return { label: 'Out of Stock', color: 'bg-red-100 text-red-800', icon: AlertCircle };
    } else if (product.currentStock <= product.reorderLevel) {
      return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800', icon: TrendingDown };
    }
    return { label: 'In Stock', color: 'bg-green-100 text-green-800', icon: Package };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Products</h1>
            <p className="text-gray-600">Manage your product inventory</p>
          </div>
          <button
            onClick={() => navigate('/u/inventory/products/new')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 transform hover:-translate-y-1"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Add Product</span>
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Filter className="w-5 h-5" />
              <span className="font-medium">Filters</span>
            </button>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No products found</h3>
          <p className="text-gray-500 mb-6">Get started by adding your first product</p>
          <button
            onClick={() => navigate('/u/inventory/products/new')}
            className="bg-blue-500 text-white px-6 py-2 rounded-xl hover:bg-blue-600 transition-colors"
          >
            Add Product
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {products.map((product) => {
              const stockStatus = getStockStatus(product);
              const StatusIcon = stockStatus.icon;

              return (
                <div
                  key={product._id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-xl font-bold text-gray-800">{product.name}</h3>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            {product.code}
                          </span>
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${stockStatus.color} flex items-center space-x-1`}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{stockStatus.label}</span>
                          </span>
                        </div>

                        {product.description && (
                          <p className="text-gray-600 text-sm mb-3">{product.description}</p>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Category</p>
                            <p className="font-semibold text-gray-800 capitalize">
                              {product.category.replace('_', ' ')}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Current Stock</p>
                            <p className="font-semibold text-gray-800">
                              {product.currentStock} {product.primaryUnit?.abbreviation}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Avg Price</p>
                            <p className="font-semibold text-gray-800">
                              ₹{product.averagePrice?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Stock Value</p>
                            <p className="font-semibold text-gray-800">
                              ₹{product.stockValue?.toLocaleString('en-IN') || '0'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => navigate(`/u/inventory/products/${product._id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => navigate(`/u/inventory/products/${product._id}/edit`)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
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

export default ProductList;

