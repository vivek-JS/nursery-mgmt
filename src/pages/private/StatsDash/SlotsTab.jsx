import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, ComposedChart, Area
} from 'recharts';
import { Calendar } from 'lucide-react';
import ChartCard from '../common/ChartCard';
import DataCard from '../common/DataCard';
import CustomTooltip from '../common/CustomTooltip';
import SimpleTable from '../common/SimpleTable';

const SlotsTab = ({ data }) => {
  const { slotBookingStats } = data;
  const [selectedPlant, setSelectedPlant] = useState(slotBookingStats[0]?.plantName || '');
  const [selectedMonth, setSelectedMonth] = useState(slotBookingStats[0]?.month || 'May');

  // Prepare data for slot utilization chart
  const getSlotUtilizationData = () => {
    return slotBookingStats.map(stat => ({
      name: `${stat.plantName} - ${stat.month}`,
      utilization: stat.avgUtilizationRate,
      total: stat.totalCapacity,
      booked: stat.bookedCapacity,
      available: stat.availableCapacity
    }));
  };

  // Get slot details for trend chart
  const getSlotTrendData = () => {
    // Get slots from the first plant in May as an example
    const selectedStats = slotBookingStats.find(stat => 
      stat.month === selectedMonth && stat.plantName === selectedPlant
    ) || slotBookingStats[0];
    
    if (!selectedStats || !selectedStats.slots) return [];
    
    return selectedStats.slots.map((slot, index) => ({
      name: `Slot ${index + 1}`,
      startDay: slot.startDay,
      endDay: slot.endDay,
      booked: slot.totalBookedPlants,
      available: slot.totalPlants - slot.totalBookedPlants,
      utilizationRate: slot.utilizationRate
    }));
  };

  // Get all unique plants
  const getUniquePlants = () => {
    const plantsSet = new Set();
    slotBookingStats.forEach(stat => plantsSet.add(stat.plantName));
    return Array.from(plantsSet);
  };

  // Get all unique months
  const getUniqueMonths = () => {
    const monthsSet = new Set();
    slotBookingStats.forEach(stat => monthsSet.add(stat.month));
    return Array.from(monthsSet);
  };

  return (
    <div className="space-y-6">
      {/* Slot Utilization Overview */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Slot Utilization Overview</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {slotBookingStats.map((stat) => (
              <DataCard
                key={`${stat.plantId}-${stat.month}`}
                title={`${stat.plantName} - ${stat.month}`}
                icon={<Calendar className="w-5 h-5 mr-2 text-indigo-500" />}
                data={[
                  { label: 'Total Capacity', value: stat.totalCapacity.toLocaleString() },
                  { label: 'Booked', value: stat.bookedCapacity.toLocaleString() },
                  { label: 'Available', value: stat.availableCapacity.toLocaleString() },
                  { 
                    label: 'Utilization Rate', 
                    value: `${stat.avgUtilizationRate.toFixed(1)}%`,
                    color: stat.avgUtilizationRate > 80 ? 'text-green-600' : 
                          stat.avgUtilizationRate > 50 ? 'text-yellow-600' : 'text-red-600'
                  }
                ]}
                footerComponent={
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-500">Slot Utilization</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          stat.avgUtilizationRate > 80 ? 'bg-green-500' : 
                          stat.avgUtilizationRate > 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${stat.avgUtilizationRate}%` }}
                      ></div>
                    </div>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Slot Utilization Comparison */}
      <ChartCard title="Slot Utilization by Plant & Month" height="400px">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={getSlotUtilizationData()}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
            />
            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar yAxisId="left" dataKey="booked" name="Booked Capacity" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="available" name="Available Capacity" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="a" />
            <Bar yAxisId="right" dataKey="utilization" name="Utilization Rate %" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Slot Trend Chart with Filters */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Slot Booking Trend</h3>
            <div className="mt-3 sm:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <div>
                <label htmlFor="plant-filter" className="block text-sm font-medium text-gray-700 mb-1">Plant</label>
                <select
                  id="plant-filter"
                  value={selectedPlant}
                  onChange={(e) => setSelectedPlant(e.target.value)}
                  className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-full"
                >
                  {getUniquePlants().map(plant => (
                    <option key={plant} value={plant}>{plant}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="month-filter" className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  id="month-filter"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-full"
                >
                  {getUniqueMonths().map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="p-5" style={{ height: '400px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={getSlotTrendData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" unit="%" domain={[0, 100]} />
              <Tooltip 
                content={<CustomTooltip formatter={(value, name) => {
                  if (name === "Utilization Rate") return `${value}%`;
                  return value.toLocaleString();
                }} />} 
              />
              <Legend />
              <Bar yAxisId="left" dataKey="booked" name="Booked Plants" stackId="a" fill="#3b82f6" />
              <Bar yAxisId="left" dataKey="available" name="Available Plants" stackId="a" fill="#e5e7eb" />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="utilizationRate" 
                name="Utilization Rate" 
                stroke="#10b981" 
                strokeWidth={2}
                activeDot={{ r: 8 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Slot Details */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            {selectedPlant} - {selectedMonth} Slot Details
          </h3>
        </div>
        <div className="p-5">
          <SimpleTable 
            headers={[
              { key: 'name', label: 'Slot', className: 'text-sm font-medium text-gray-900' },
              { key: 'dateRange', label: 'Date Range' },
              { key: 'totalCapacity', label: 'Total Capacity' },
              { key: 'booked', label: 'Booked' },
              { key: 'available', label: 'Available' },
              { key: 'utilizationDisplay', label: 'Utilization' }
            ]}
            rows={getSlotTrendData().map(slot => ({
              ...slot,
              dateRange: `${slot.startDay} to ${slot.endDay}`,
              totalCapacity: (slot.booked + slot.available).toLocaleString(),
              booked: slot.booked.toLocaleString(),
              available: slot.available.toLocaleString(),
              utilizationDisplay: (
                <div className="flex items-center">
                  <div className="mr-2 flex-shrink-0">
                    <div 
                      className={`h-2.5 w-2.5 rounded-full ${
                        slot.utilizationRate > 80 ? 'bg-green-400' : 
                        slot.utilizationRate > 50 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                    ></div>
                  </div>
                  <span className={`text-sm ${
                    slot.utilizationRate > 80 ? 'text-green-600' : 
                    slot.utilizationRate > 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {slot.utilizationRate}%
                  </span>
                </div>
              )
            }))}
          />
        </div>
      </div>

      {/* Booking Recommendations */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Booking Optimization Recommendations
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            AI Generated
          </span>
        </div>
        <div className="p-5">
          <div className="space-y-4">
            {/* Low Utilization Warning */}
            {slotBookingStats.some(stat => stat.avgUtilizationRate < 50) && (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Low Utilization Alert</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Some slots are showing less than 50% utilization. Consider adjusting capacity or implementing special promotions for these slots.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Seasonal Recommendations */}
            <div className="rounded-md bg-blue-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Seasonal Planning</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      Based on historical data, consider increasing capacity for Tomato plants in June, as demand typically rises by 20%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Optimization Tips */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-800 mb-2">Optimization Suggestions:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Consider dynamic pricing to increase bookings in low-utilization slots
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Bundle popular plant varieties with less popular ones to improve overall slot utilization
                </li>
                <li className="flex items-start">
                  <svg className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Offer early-bird discounts for bookings made 2+ months in advance
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotsTab;