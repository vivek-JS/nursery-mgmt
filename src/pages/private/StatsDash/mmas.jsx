
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

// utils/formatters.js
export const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

export const formatPercentage = (value) => {
  return (value * 100).toFixed(1) + '%';
};

// utils/constants.js
export const STATUS_COLORS = {
  'PENDING': '#f59e0b',
  'PROCESSING': '#3b82f6',
  'COMPLETED': '#10b981',
  'CANCELLED': '#ef4444',
  'DISPATCHED': '#8b5cf6',
  'ACCEPTED': '#84cc16',
  'REJECTED': '#f43f5e',
  'FARM_READY': '#14b8a6',
  'DISPATCH_PROCESS': '#6366f1',
  'PARTIALLY_COMPLETED': '#0ea5e9'
};

export const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// services/mockDataService.js
export const generateMockData = () => {
  // Mock order stats
  const orderStats = {
    orderCount: 324,
    statusDistribution: {
      'PENDING': 45,
      'PROCESSING': 78,
      'COMPLETED': 156,
      'CANCELLED': 25,
      'DISPATCHED': 20
    },
    plants: {
      total: 32500,
      returned: 1850,
      remaining: 30650
    },
    revenue: {
      total: 1625000,
      collected: 1248000,
      pending: 377000
    }
  };

  // Mock orders by date
  const ordersByDate = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 29 + i);
    
    return {
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 20) + 5,
      plants: Math.floor(Math.random() * 1000) + 200,
      revenue: Math.floor(Math.random() * 50000) + 10000
    };
  });