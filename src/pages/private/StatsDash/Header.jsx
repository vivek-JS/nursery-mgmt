import React from 'react';
import { Calendar, Filter } from 'lucide-react';

const Header = ({ dateRange, handleDateChange, handleApplyFilter }) => {
  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plant Nursery Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Get a comprehensive view of your plant nursery business</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
            <div className="relative flex items-center space-x-2">
              <Calendar className="absolute left-2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded shadow-sm text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="relative flex items-center space-x-2">
              <Calendar className="absolute left-2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="pl-10 pr-4 py-2 border border-gray-200 rounded shadow-sm text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <button 
              onClick={handleApplyFilter}
              className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Filter className="h-4 w-4" />
              <span>Apply Filter</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
