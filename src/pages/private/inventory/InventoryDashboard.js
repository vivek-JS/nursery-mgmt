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
} from 'lucide-react';
import axiosInstance from '../../../services/axiosConfig';

const InventoryDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventorySummary();
  }, []);

  const fetchInventorySummary = async () => {
    try {
      const response = await axiosInstance.get('/inventory/products/summary');
      if (response.data.success) {
        setSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
    } finally {
      setLoading(false);
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
      title: 'Transactions',
      description: 'View inventory movements',
      icon: BarChart3,
      path: '/u/inventory/transactions',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Inventory Management
        </h1>
        <p className="text-gray-600">
          Comprehensive inventory control and tracking system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statsCards.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className={`h-2 rounded-t-2xl bg-gradient-to-r ${stat.color}`} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                  <h3 className="text-3xl font-bold text-gray-800">
                    {stat.value}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => navigate(action.path)}
              className={`${action.color} ${action.hoverColor} text-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
            >
              <action.icon className="w-8 h-8 mb-2" />
              <p className="font-semibold text-lg">{action.title}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Category-wise Stock */}
      {summary?.categoryWiseStock && summary.categoryWiseStock.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Stock by Category
          </h2>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.categoryWiseStock.map((category, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-gray-700 mb-2 capitalize">
                    {category._id.replace('_', ' ')}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Products: <span className="font-semibold">{category.count}</span>
                    </p>
                    <p className="text-sm text-gray-600">
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

      {/* Menu Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Inventory Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 text-left group"
            >
              <div className="flex items-start space-x-4">
                <div className={`p-4 rounded-xl ${item.bgColor} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`w-8 h-8 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InventoryDashboard;

