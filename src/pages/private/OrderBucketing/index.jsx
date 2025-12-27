import React, { useState, useEffect, useRef } from 'react';
import OrderBucketingTreeComponent from '../../../components/OrderBucketingTree';
import SalesmenBucketingTreeComponent from '../../../components/SalesmenBucketingTree';
import InventoryBucketingTreeComponent from '../../../components/InventoryBucketingTree';
import OrderHeatMap from '../../../components/OrderHeatMap/OrderHeatMap';

const OrderBucketing = () => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'salesmen', 'inventory', or 'heatmap'
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);
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

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if (containerRef.current?.webkitRequestFullscreen) {
          await containerRef.current.webkitRequestFullscreen();
        } else if (containerRef.current?.msRequestFullscreen) {
          await containerRef.current.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (err) {
        console.error('Error attempting to enable fullscreen:', err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
      } catch (err) {
        console.error('Error attempting to exit fullscreen:', err);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);


  return (
    <div ref={containerRef} className="h-screen w-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">Bucketing & Decomposition Analysis</h1>
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition flex items-center gap-2"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Exit Fullscreen
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Fullscreen
              </>
            )}
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
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
          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2 font-medium transition ${
              activeTab === 'heatmap'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Heat Map
          </button>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
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
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Filters are applied automatically. Click on nodes to load data progressively.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 flex-shrink-0">
          {error}
        </div>
      )}

      <div className={`flex-1 bg-white ${activeTab === 'heatmap' ? 'overflow-hidden p-0' : 'overflow-auto p-4'}`}>
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
        ) : activeTab === 'inventory' ? (
          <InventoryBucketingTreeComponent
            filters={filters}
            onOutwardNodeClick={handleOrderClick}
          />
        ) : (
          <div className="h-full w-full">
            <OrderHeatMap filters={filters} />
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderBucketing;

