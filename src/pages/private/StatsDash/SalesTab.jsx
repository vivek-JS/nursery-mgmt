import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Users } from 'lucide-react';
import ChartCard from '../common/ChartCard';
import SimpleTable from '../common/SimpleTable';
import DataCard from '../common/DataCard';
import CustomTooltip from '../common/CustomTooltip';
import { formatCurrency, formatPercentage } from '../../utils/formatters';

const SalesTab = ({ data }) => {
  const { ordersBySalesPerson } = data;
  
  return (
    <div className="space-y-6">
      {/* Top Sales People */}
      <ChartCard title="Sales Team Performance" height="400px">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={ordersBySalesPerson}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="salesPersonName" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
            />
            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
            <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
            <Tooltip 
              content={<CustomTooltip formatter={(value, name) => {
                if (name === 'Revenue') return formatCurrency(value);
                return value.toLocaleString();
              }} />} 
            />
            <Legend />
            <Bar yAxisId="left" dataKey="orderCount" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Sales Performance Details */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Sales Performance Details</h3>
        </div>
        <div className="p-5">
          <SimpleTable 
            headers={[
              { key: 'salesPersonName', label: 'Salesperson' },
              { key: 'orderCount', label: 'Orders' },
              { key: 'plantCountFormatted', label: 'Total Plants' },
              { key: 'revenueFormatted', label: 'Revenue' },
              { key: 'uniqueCustomerCount', label: 'Unique Customers' },
              { key: 'completionRateFormatted', label: 'Completion Rate' }
            ]}
            rows={ordersBySalesPerson.map(person => ({
              ...person,
              plantCountFormatted: person.plantCount.toLocaleString(),
              revenueFormatted: formatCurrency(person.revenue),
              completionRateFormatted: (
                <div className="flex items-center">
                  <div className="mr-2 flex-shrink-0">
                    <div 
                      className={`h-2.5 w-2.5 rounded-full ${
                        person.completionRate > 0.6 ? 'bg-green-400' : 
                        person.completionRate > 0.5 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                    ></div>
                  </div>
                  <span className={`text-sm ${
                    person.completionRate > 0.6 ? 'text-green-600' : 
                    person.completionRate > 0.5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(person.completionRate)}
                  </span>
                </div>
              )
            }))}
          />
        </div>
      </div>

      {/* Sales Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {ordersBySalesPerson.slice(0, 3).map((person) => (
          <div key={person.salesPersonId} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-md leading-6 font-medium text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-500" />
                {person.salesPersonName}
              </h3>
            </div>
            <div className="p-5">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-500">Revenue</span>
                    <span className="text-sm font-medium text-gray-900">{formatCurrency(person.revenue)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${(person.revenue / ordersBySalesPerson[0].revenue) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-500">Orders</span>
                    <span className="text-sm font-medium text-gray-900">{person.orderCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${(person.orderCount / ordersBySalesPerson[0].orderCount) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-500">Unique Customers</span>
                    <span className="text-sm font-medium text-gray-900">{person.uniqueCustomerCount}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div 
                      className="bg-purple-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${(person.uniqueCustomerCount / ordersBySalesPerson[0].uniqueCustomerCount) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="pt-2 flex justify-between text-sm">
                  <div>
                    <span className="text-gray-500">Completion Rate:</span>
                    <span className={`ml-1 font-medium ${
                      person.completionRate > 0.6 ? 'text-green-600' : 
                      person.completionRate > 0.5 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(person.completionRate)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Return Rate:</span>
                    <span className={`ml-1 font-medium ${
                      person.returnRate < 0.05 ? 'text-green-600' : 
                      person.returnRate < 0.07 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(person.returnRate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesTab;
