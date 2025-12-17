import React, { useState } from 'react';
import OrderBucketingTreeComponent from '../../../components/OrderBucketingTree';
import SalesmenBucketingTreeComponent from '../../../components/SalesmenBucketingTree';
import InventoryBucketingTreeComponent from '../../../components/InventoryBucketingTree';

const OrderBucketing = () => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'salesmen', or 'inventory'
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: ''
  });

  const handleOrderClick = (orderData) => {
    // Navigate to order details or show order modal
    console.log('Order clicked:', orderData);
    // You can implement navigation here
    // navigate(`/u/orders/${orderData._id}`);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      status: ''
    });
  };


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Bucketing & Decomposition Analysis</h1>
          
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'orders'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Orders Bucketing
            </button>
            <button
              onClick={() => setActiveTab('salesmen')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'salesmen'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Salesmen Performance
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 font-medium transition ${
                activeTab === 'inventory'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Inventory Decomposition
            </button>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={filters.status}
                onChange={handleFilterChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
            >
              Clear Filters
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Filters are applied automatically. Click on nodes to load data progressively.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'orders' ? (
            <OrderBucketingTreeComponent
              filters={filters}
              onOrderNodeClick={handleOrderClick}
            />
          ) : activeTab === 'salesmen' ? (
            <SalesmenBucketingTreeComponent
              filters={filters}
              onOrderNodeClick={handleOrderClick}
            />
          ) : (
            <InventoryBucketingTreeComponent
              filters={filters}
              onOutwardNodeClick={handleOrderClick}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderBucketing;

