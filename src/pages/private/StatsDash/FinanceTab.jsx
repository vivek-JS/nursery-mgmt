// components/tabs/FinanceTab.jsx
import React, { useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart
} from 'recharts';
import { 
  TrendingUp, Download, CreditCard, DollarSign, 
  Inbox, Calendar, Filter, ArrowUp, ArrowDown, 
  AlertCircle, CheckCircle
} from 'lucide-react';
import ChartCard from '../common/ChartCard';
import CustomTooltip from '../common/CustomTooltip';
import SimpleTable from '../common/SimpleTable';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { COLORS } from '../../utils/constants';

const FinanceTab = ({ data }) => {
  const { ordersByDate, paymentStats, orderStats } = data;
  const [timeFrame, setTimeFrame] = useState('monthly');
  const [showCollectionDetails, setShowCollectionDetails] = useState(false);
  
  // Prepare payment method distribution data
  const getPaymentMethodData = () => {
    // Combine all payment methods from collected payments
    const collectedPayments = paymentStats.find(stat => stat.status === 'COLLECTED');
    if (!collectedPayments || !collectedPayments.byMethod) return [];
    
    return collectedPayments.byMethod.map((method) => ({
      name: method.method,
      value: method.amount,
      count: method.count
    }));
  };

  // Prepare monthly revenue data
  const getMonthlyRevenueData = () => {
    // Group orders by month
    const months = {};
    ordersByDate.forEach(order => {
      const date = new Date(order.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!months[monthKey]) {
        months[monthKey] = {
          month: `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`,
          revenue: 0,
          count: 0,
          collected: 0,
          pending: 0
        };
      }
      months[monthKey].revenue += order.revenue;
      months[monthKey].count += order.count;
      
      // Assume 80% of revenue is collected and 20% is pending for demonstration
      months[monthKey].collected += order.revenue * 0.8;
      months[monthKey].pending += order.revenue * 0.2;
    });
    
    return Object.values(months).sort((a, b) => {
      const aDate = new Date(a.month);
      const bDate = new Date(b.month);
      return aDate - bDate;
    });
  };

  // Format payment status data
  const formatPaymentStatus = () => {
    return paymentStats.map(stat => ({
      name: stat.status,
      value: stat.total,
      count: stat.count
    }));
  };

  // Get financial KPIs
  const getFinancialKPIs = () => {
    const revenueData = getMonthlyRevenueData();
    const totalRevenue = orderStats.revenue.total;
    const collectedRevenue = orderStats.revenue.collected;
    const pendingRevenue = orderStats.revenue.pending;
    
    // Calculate average order value
    const averageOrderValue = totalRevenue / orderStats.orderCount;
    
    // Calculate month-over-month growth (using mock data for demonstration)
    const currentMonthRevenue = revenueData[revenueData.length - 1]?.revenue || 0;
    const previousMonthRevenue = revenueData[revenueData.length - 2]?.revenue || 0;
    const revenueGrowth = previousMonthRevenue ? (currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue : 0;
    
    // Calculate collection rate
    const collectionRate = totalRevenue ? collectedRevenue / totalRevenue : 0;
    
    return {
      averageOrderValue,
      revenueGrowth,
      collectionRate,
      pendingAmount: pendingRevenue
    };
  };

  // Get daily revenue data
  const getDailyRevenueData = () => {
    // Group by day of week for insights
    const daysOfWeek = Array(7).fill(0).map((_, i) => ({
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
      revenue: 0,
      count: 0
    }));
    
    ordersByDate.forEach(order => {
      const date = new Date(order.date);
      const dayOfWeek = date.getDay(); // 0 for Sunday, 6 for Saturday
      daysOfWeek[dayOfWeek].revenue += order.revenue;
      daysOfWeek[dayOfWeek].count += order.count;
    });
    
    return daysOfWeek;
  };

  // Get top pending collections data
  const getPendingCollectionsData = () => {
    // Mock data for demonstration
    return [
      { 
        id: 'OR-1025', 
        customer: 'Raj Farm Supplies', 
        amount: 45000, 
        dueDate: '2025-05-15', 
        status: 'Overdue', 
        overdueDays: 4 
      },
      { 
        id: 'OR-1018', 
        customer: 'Green Valley Nursery', 
        amount: 38500, 
        dueDate: '2025-05-20', 
        status: 'Due Soon', 
        overdueDays: 0 
      },
      { 
        id: 'OR-1012', 
        customer: 'Sunshine Agro', 
        amount: 29000, 
        dueDate: '2025-05-22', 
        status: 'Due Soon', 
        overdueDays: 0 
      },
      { 
        id: 'OR-1005', 
        customer: 'Eastern Growers Association', 
        amount: 25500, 
        dueDate: '2025-05-30', 
        status: 'Upcoming', 
        overdueDays: 0 
      },
      { 
        id: 'OR-998', 
        customer: 'Harvest Fields Ltd.', 
        amount: 18000, 
        dueDate: '2025-06-05', 
        status: 'Upcoming', 
        overdueDays: 0 
      }
    ];
  };
  
  const kpis = getFinancialKPIs();
  const pendingCollections = getPendingCollectionsData();

  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Average Order Value</dt>
                  <dd className="flex items-center">
                    <div className="text-xl font-semibold text-gray-900">{formatCurrency(kpis.averageOrderValue)}</div>
                    <span className="ml-2 flex items-center text-sm font-medium text-green-600">
                      <ArrowUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                      <span className="sr-only">Increased by</span>
                      12.5%
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">MoM Revenue Growth</dt>
                  <dd className="flex items-center">
                    <div className="text-xl font-semibold text-gray-900">{(kpis.revenueGrowth * 100).toFixed(1)}%</div>
                    {kpis.revenueGrowth > 0 ? (
                      <span className="ml-2 flex items-center text-sm font-medium text-green-600">
                        <ArrowUp className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                        <span className="sr-only">Increased by</span>
                        {(kpis.revenueGrowth * 100).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="ml-2 flex items-center text-sm font-medium text-red-600">
                        <ArrowDown className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                        <span className="sr-only">Decreased by</span>
                        {Math.abs(kpis.revenueGrowth * 100).toFixed(1)}%
                      </span>
                    )}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                <CreditCard className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Collection Rate</dt>
                  <dd className="flex items-center">
                    <div className="text-xl font-semibold text-gray-900">{formatPercentage(kpis.collectionRate)}</div>
                    <span className={`ml-2 flex items-center text-sm font-medium ${kpis.collectionRate > 0.75 ? 'text-green-600' : 'text-yellow-600'}`}>
                      {kpis.collectionRate > 0.75 ? (
                        <CheckCircle className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="self-center flex-shrink-0 h-4 w-4 text-yellow-500" />
                      )}
                      <span className="sr-only">Status</span>
                      {kpis.collectionRate > 0.75 ? 'Good' : 'Needs attention'}
                    </span>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <Inbox className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Collections</dt>
                  <dd className="flex items-center">
                    <div className="text-xl font-semibold text-gray-900">{formatCurrency(kpis.pendingAmount)}</div>
                    <button 
                      onClick={() => setShowCollectionDetails(!showCollectionDetails)}
                      className="ml-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {showCollectionDetails ? 'Hide' : 'View'}
                    </button>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 gap-5">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Revenue Performance</h3>
              <div className="mt-3 sm:mt-0">
                <div className="flex rounded-md shadow-sm">
                  <button
                    onClick={() => setTimeFrame('monthly')}
                    className={`inline-flex items-center px-4 py-2 rounded-l-md border border-r-0 border-gray-300 bg-white text-sm font-medium ${
                      timeFrame === 'monthly' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setTimeFrame('quarterly')}
                    className={`inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      timeFrame === 'quarterly' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Quarterly
                  </button>
                  <button
                    onClick={() => setTimeFrame('yearly')}
                    className={`inline-flex items-center px-4 py-2 rounded-r-md border border-l-0 border-gray-300 bg-white text-sm font-medium ${
                      timeFrame === 'yearly' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="p-5" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={getMonthlyRevenueData()}
                margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  tickMargin={10}
                />
                <YAxis 
                  yAxisId="left"
                  orientation="left"
                  tickFormatter={(value) => `₹${(value / 1000).toLocaleString()}K`}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => value}
                  domain={[0, 'auto']}
                />
                <Tooltip 
                  content={<CustomTooltip formatter={(value, name) => {
                    if (name === 'Orders') return value;
                    return formatCurrency(value);
                  }} />} 
                />
                <Legend />
                <Bar 
                  yAxisId="right"
                  dataKey="count" 
                  name="Orders" 
                  fill="#8884d8" 
                  radius={[4, 4, 0, 0]} 
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="collected" 
                  name="Collected Revenue" 
                  fill="#4ade80" 
                  stroke="#10b981" 
                  fillOpacity={0.3} 
                />
                <Area 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="pending" 
                  name="Pending Revenue" 
                  fill="#fb923c" 
                  stroke="#f97316" 
                  fillOpacity={0.3} 
                />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="revenue" 
                  name="Total Revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  dot={{ r: 5 }}
                  activeDot={{ r: 8 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment Method & Daily Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Payment Method Distribution" height="350px">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getPaymentMethodData()}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toLocaleString()}K`} />
              <YAxis dataKey="name" type="category" width={100} />
              <Tooltip 
                content={<CustomTooltip formatter={(value, name) => {
                  if (name === 'Amount') return formatCurrency(value);
                  return value;
                }} />} 
              />
              <Legend />
              <Bar dataKey="value" name="Amount" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                {getPaymentMethodData().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
              <Bar dataKey="count" name="Transactions" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by Day of Week" height="350px">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={getDailyRevenueData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis yAxisId="left" orientation="left" tickFormatter={(value) => `₹${(value / 1000).toLocaleString()}K`} />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                content={<CustomTooltip formatter={(value, name) => {
                  if (name === 'Revenue') return formatCurrency(value);
                  return value;
                }} />} 
              />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="count" name="Order Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Pending Collections */}
      {showCollectionDetails && (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Top Pending Collections</h3>
            <div className="flex space-x-3">
              <button className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <Download className="h-4 w-4 mr-1" />
                Export
              </button>
              <button className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                <CreditCard className="h-4 w-4 mr-1" />
                Collect Payment
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingCollections.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.status === 'Overdue' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Overdue ({item.overdueDays} days)
                        </span>
                      ) : item.status === 'Due Soon' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Due Soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Upcoming
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-indigo-600 hover:text-indigo-900 mr-3">Remind</button>
                      <button className="text-indigo-600 hover:text-indigo-900">Collect</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 text-right">
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View All Pending Collections
            </button>
          </div>
        </div>
      )}

      {/* Financial Insights */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Financial Insights</h3>
          <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            AI Generated
          </span>
        </div>
        <div className="p-5">
          <div className="space-y-5">
            {/* Revenue Growth Insight */}
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-md bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Revenue Growth Trend</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Your revenue is showing an upward trend with an average growth of {(kpis.revenueGrowth * 100).toFixed(1)}% month-over-month. This is significantly higher than the industry average of 5.2% for plant nurseries in your region.
                </p>
              </div>
            </div>

            {/* Collection Efficiency */}
            <div className="flex">
              <div className="flex-shrink-0">
                <div className={`h-10 w-10 rounded-md ${kpis.collectionRate > 0.75 ? 'bg-green-100' : 'bg-yellow-100'} flex items-center justify-center`}>
                  <CreditCard className={`h-6 w-6 ${kpis.collectionRate > 0.75 ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Collection Efficiency</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Your current collection rate is {formatPercentage(kpis.collectionRate)}. 
                  {kpis.collectionRate > 0.75 
                    ? " This is excellent and above industry standards. Consider offering early payment discounts to maintain this momentum." 
                    : " This is below the industry benchmark of 85%. Consider implementing stricter payment terms or offering incentives for early payments."}
                </p>
              </div>
            </div>

            {/* Seasonal Pattern */}
            <div className="flex">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Seasonal Revenue Pattern</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Analysis shows a strong seasonal pattern with peak revenues in March-May and September-October. Consider adjusting production capacity and marketing efforts to capitalize on these peak seasons, while exploring strategies to boost sales during slower months.
                </p>
              </div>
            </div>

            {/* Action Recommendations */}
            <div className="mt-5 border-t border-gray-200 pt-5">
              <h4 className="text-base font-medium text-gray-900">Recommended Actions</h4>
              <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <li className="col-span-1 flex shadow-sm rounded-md">
                  <div className="bg-indigo-600 flex-shrink-0 flex items-center justify-center w-12 text-white text-sm font-medium rounded-l-md">
                    1
                  </div>
                  <div className="flex-1 flex items-center justify-between border-t border-r border-b border-gray-200 bg-white rounded-r-md truncate">
                    <div className="flex-1 px-4 py-3 text-sm truncate">
                      <a href="#" className="font-medium text-gray-900 hover:text-gray-600">Follow up on overdue payments</a>
                      <p className="text-gray-500">Priority: High</p>
                    </div>
                  </div>
                </li>
                <li className="col-span-1 flex shadow-sm rounded-md">
                  <div className="bg-indigo-600 flex-shrink-0 flex items-center justify-center w-12 text-white text-sm font-medium rounded-l-md">
                    2
                  </div>
                  <div className="flex-1 flex items-center justify-between border-t border-r border-b border-gray-200 bg-white rounded-r-m">
                  <li className="col-span-1 flex shadow-sm rounded-md">
                  <div className="bg-indigo-600 flex-shrink-0 flex items-center justify-center w-12 text-white text-sm font-medium rounded-l-md">
                    2
                  </div>
                  <div className="flex-1 flex items-center justify-between border-t border-r border-b border-gray-200 bg-white rounded-r-md truncate">
                    <div className="flex-1 px-4 py-3 text-sm truncate">
                      <a href="#" className="font-medium text-gray-900 hover:text-gray-600">Optimize payment methods</a>
                      <p className="text-gray-500">Reduce transaction costs</p>
                    </div>
                  </div>
                </li>
                <li className="col-span-1 flex shadow-sm rounded-md">
                  <div className="bg-indigo-600 flex-shrink-0 flex items-center justify-center w-12 text-white text-sm font-medium rounded-l-md">
                    3
                  </div>
                  <div className="flex-1 flex items-center justify-between border-t border-r border-b border-gray-200 bg-white rounded-r-md truncate">
                    <div className="flex-1 px-4 py-3 text-sm truncate">
                      <a href="#" className="font-medium text-gray-900 hover:text-gray-600">Prepare for June-July sales dip</a>
                      <p className="text-gray-500">Budget accordingly</p>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Flow Forecast */}
      <ChartCard title="Cash Flow Forecast (Next 3 Months)" height="350px">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={[
              { month: 'May 2025', expected: 240000, confirmed: 180000, projected: 210000 },
              { month: 'Jun 2025', expected: 210000, confirmed: 140000, projected: 185000 },
              { month: 'Jul 2025', expected: 180000, confirmed: 95000, projected: 165000 },
              { month: 'Aug 2025', expected: 220000, confirmed: 80000, projected: 195000 }
            ]}
            margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis tickFormatter={(value) => `₹${(value / 1000).toLocaleString()}K`} />
            <Tooltip 
              content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="expected" 
              name="Expected Revenue" 
              stroke="#8884d8" 
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Line 
              type="monotone" 
              dataKey="confirmed" 
              name="Confirmed Payments" 
              stroke="#10b981" 
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Line 
              type="monotone" 
              dataKey="projected" 
              name="Projected Cash Flow" 
              stroke="#f97316" 
              strokeWidth={2}
              strokeDasharray="5 5"
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Payment Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Analytics</h3>
          </div>
          <div className="p-5">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="font-medium text-gray-700">Average Days to Payment</span>
                  <span className="font-semibold text-gray-900">14.6 days</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '73%' }}></div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Benchmark: 20 days</p>
              </div>
              
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="font-medium text-gray-700">First Reminder Effectiveness</span>
                  <span className="font-semibold text-gray-900">62%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '62%' }}></div>
                </div>
                <p className="mt-1 text-xs text-gray-500">% of payments received after first reminder</p>
              </div>
              
              <div>
                <div className="flex justify-between mb-1 text-sm">
                  <span className="font-medium text-gray-700">Digital Payment Adoption</span>
                  <span className="font-semibold text-gray-900">78%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Target: 85%</p>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Status Breakdown</h4>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">On Time</span>
                  </div>
                  <span className="font-semibold text-gray-900">74%</span>
                </div>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">1-15 Days Late</span>
                  </div>
                  <span className="font-semibold text-gray-900">18%</span>
                </div>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <div className="flex items-center">
                    <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
                    <span className="text-gray-600">16+ Days Late</span>
                  </div>
                  <span className="font-semibold text-gray-900">8%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white overflow-hidden shadow rounded-lg">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Customer Payment Performance</h3>
          </div>
          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Purchases</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Days to Pay</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Green Valley Nursery</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(475000)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">6.2</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Excellent</span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '95%' }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Sunshine Agro</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(320000)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">14.8</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Good</span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '80%' }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Eastern Growers Association</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(280000)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">18.5</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Average</span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Raj Farm Supplies</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(245000)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">25.3</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Poor</span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Harvest Fields Ltd.</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(180000)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">11.9</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Good</span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right">
              <button className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                View All Customers
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Financial Reports */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Financial Reports</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-medium text-gray-900">Revenue Report</h4>
                  <p className="mt-1 text-sm text-gray-500">Detailed breakdown of all revenue sources and trends</p>
                  <button className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900">
                    <Download className="h-4 w-4 mr-1" />
                    Download Excel
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-medium text-gray-900">Collection Report</h4>
                  <p className="mt-1 text-sm text-gray-500">Payment collection analysis and aging report</p>
                  <button className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900">
                    <Download className="h-4 w-4 mr-1" />
                    Download Excel
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-all cursor-pointer">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-medium text-gray-900">Financial Performance</h4>
                  <p className="mt-1 text-sm text-gray-500">Key financial metrics and performance indicators</p>
                  <button className="mt-2 inline-flex items-center text-sm text-indigo-600 hover:text-indigo-900">
                    <Download className="h-4 w-4 mr-1" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceTab;