import React, { useState } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { Package, Plant, DollarSign, Truck } from 'lucide-react';
import StatsCard from '../common/StatsCard';
import ChartCard from '../common/ChartCard';
import CustomTooltip from '../common/CustomTooltip';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { STATUS_COLORS, COLORS } from '../../utils/constants';

const OverviewTab = ({ data }) => {
  const { orderStats, ordersByDate, ordersByPlant, ordersBySalesPerson } = data;
  const [expandedCards, setExpandedCards] = useState({});

  // Toggle card expansion
  const toggleCardExpansion = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Convert status distribution to chart data
  const getStatusDistributionData = (statusDistribution) => {
    return Object.entries(statusDistribution || {}).map(([status, count]) => ({
      name: status,
      value: count
    }));
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatsCard 
          title="Total Orders"
          value={orderStats.orderCount}
          icon={<Package className="h-6 w-6 text-green-600" />}
          iconBgColor="bg-green-100"
          secondaryLabel={`Completed: ${orderStats.statusDistribution.COMPLETED || 0}`}
          secondaryValue={`${((orderStats.statusDistribution.COMPLETED || 0) / orderStats.orderCount * 100).toFixed(1)}%`}
          secondaryColor="text-green-600"
        />

        <StatsCard 
          title="Total Plants"
          value={orderStats.plants.total.toLocaleString()}
          icon={<Plant className="h-6 w-6 text-blue-600" />}
          iconBgColor="bg-blue-100"
          secondaryLabel={`Returned: ${orderStats.plants.returned.toLocaleString()}`}
          secondaryValue={`${(orderStats.plants.returned / orderStats.plants.total * 100).toFixed(1)}%`}
          secondaryColor="text-yellow-600"
        />

        <StatsCard 
          title="Total Revenue"
          value={formatCurrency(orderStats.revenue.total)}
          icon={<DollarSign className="h-6 w-6 text-indigo-600" />}
          iconBgColor="bg-indigo-100"
          secondaryLabel={`Collected: ${formatCurrency(orderStats.revenue.collected)}`}
          secondaryValue={`${(orderStats.revenue.collected / orderStats.revenue.total * 100).toFixed(1)}%`}
          secondaryColor="text-green-600"
        />

        <StatsCard 
          title="Delivery Status"
          value={orderStats.statusDistribution.DISPATCHED || 0}
          icon={<Truck className="h-6 w-6 text-purple-600" />}
          iconBgColor="bg-purple-100"
          secondaryLabel={`Pending: ${orderStats.statusDistribution.PENDING || 0}`}
          secondaryValue={`${((orderStats.statusDistribution.PENDING || 0) / orderStats.orderCount * 100).toFixed(1)}%`}
          secondaryColor="text-yellow-600"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Orders Trend" subtitle="Last 30 days">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={ordersByDate}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="count" 
                name="Orders"
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorCount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Order Status Distribution" subtitle="Current Period">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={getStatusDistributionData(orderStats.statusDistribution)}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {getStatusDistributionData(orderStats.statusDistribution).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard 
          title="Top Performing Plants" 
          expandable={true}
          isExpanded={expandedCards['topPlants']}
          toggleExpansion={() => toggleCardExpansion('topPlants')}
          height={expandedCards['topPlants'] ? '400px' : '300px'}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ordersByPlant.slice(0, expandedCards['topPlants'] ? undefined : 5)}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="plantName" 
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
              <Bar yAxisId="left" dataKey="plantCount" name="Plants Sold" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard 
          title="Top Sales Personnel" 
          expandable={true}
          isExpanded={expandedCards['topSales']}
          toggleExpansion={() => toggleCardExpansion('topSales')}
          height={expandedCards['topSales'] ? '400px' : '300px'}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={ordersBySalesPerson.slice(0, expandedCards['topSales'] ? undefined : 5)}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis 
                dataKey="salesPersonName" 
                type="category" 
                tick={{ fontSize: 12 }} 
                width={100}
                tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
              />
              <Tooltip 
                content={<CustomTooltip formatter={(value, name) => {
                  if (name === 'Revenue') return formatCurrency(value);
                  return value.toLocaleString();
                }} />} 
              />
              <Legend />
              <Bar dataKey="orderCount" name="Orders" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              <Bar dataKey="uniqueCustomerCount" name="Customers" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Revenue Chart */}
      <ChartCard title="Revenue Trend" subtitle="Daily">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={ordersByDate}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const date = new Date(value);
                return `${date.getDate()}/${date.getMonth() + 1}`;
              }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                return `₹${(value / 1000).toLocaleString()}K`;
              }}
            />
            <CartesianGrid strokeDasharray="3 3" />
            <Tooltip 
              content={<CustomTooltip formatter={(value) => formatCurrency(value)} />} 
            />
            <Line 
              type="monotone" 
              dataKey="revenue"
              name="Revenue" 
              stroke="#10b981" 
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              name="Revenue Area"
              stroke="none" 
              fillOpacity={0.2} 
              fill="url(#colorRevenue)" 
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};

export default OverviewTab;