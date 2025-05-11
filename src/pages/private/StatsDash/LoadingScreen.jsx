import React from 'react';
import { BarChart2, Plant, Users, Calendar, DollarSign } from 'lucide-react';

export const Navigation = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 overflow-x-auto">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-green-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart2 className="mr-2 h-5 w-5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('plants')}
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                activeTab === 'plants'
                  ? 'border-green-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Plant className="mr-2 h-5 w-5" />
              Plants
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                activeTab === 'sales'
                  ? 'border-green-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="mr-2 h-5 w-5" />
              Sales Team
            </button>
            <button
              onClick={() => setActiveTab('slots')}
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                activeTab === 'slots'
                  ? 'border-green-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="mr-2 h-5 w-5" />
              Slot Utilization
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                activeTab === 'finance'
                  ? 'border-green-500 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="mr-2 h-5 w-5" />
              Finance
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

// components/common/LoadingScreen.jsx

export const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-green-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
        <p className="mt-4 text-xl font-semibold text-gray-700">Loading your dashboard...</p>
        <p className="mt-2 text-gray-500">We're gathering all your insights</p>
      </div>
    </div>
  );
};

export const StatsCard = ({ 
    title, 
    value, 
    icon, 
    iconBgColor, 
    secondaryLabel, 
    secondaryValue, 
    secondaryColor 
  }) => {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className={`flex-shrink-0 ${iconBgColor} rounded-md p-3`}>
              {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
                <dd>
                  <div className="text-xl font-semibold text-gray-900">{value}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        {secondaryLabel && (
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm text-gray-500">
              <div className="flex justify-between">
                <span>{secondaryLabel}</span>
                <span className={`font-medium ${secondaryColor}`}>{secondaryValue}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  export const ChartCard = ({ 
    title, 
    subtitle, 
    icon,
    height = '300px',
    expandable = false,
    isExpanded = false,
    toggleExpansion,
    children 
  }) => {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>
            <div className="flex items-center space-x-2">
              {expandable && (
                <button
                  onClick={toggleExpansion}
                  className="text-gray-400 hover:text-gray-500"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
              )}
              {subtitle && (
                <>
                  {icon || (subtitle.includes('Last') ? (
                    <Clock className="h-5 w-5 text-gray-400" />
                  ) : (
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                  ))}
                  <span className="text-sm text-gray-500">{subtitle}</span>
                </>
              )}
            </div>
          </div>
          <div className="mt-6" style={{ height }}>
            {children}
          </div>
        </div>
      </div>
    );
  };
  
  export const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-4 bg-white rounded shadow border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}: </span>
              <span>{formatter ? formatter(entry.value, entry.name) : entry.value}</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
