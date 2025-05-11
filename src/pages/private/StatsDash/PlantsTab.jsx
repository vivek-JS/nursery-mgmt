import React from 'react';
import { 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { Plant } from 'lucide-react';
import ChartCard from '../common/ChartCard';
import DataCard from '../common/DataCard';
import SimpleTable from '../common/SimpleTable';
import StatusDistribution from '../common/StatusDistribution';
import { formatCurrency, formatPercentage } from '../../utils/formatters';
import { STATUS_COLORS } from '../../utils/constants';

const PlantsTab = ({ data }) => {
  const { ordersByPlant } = data;

  return (
    <div className="space-y-6">
      {/* Plants Performance Overview */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Plant Performance Overview</h3>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ordersByPlant.slice(0, 3).map((plant) => (
              <DataCard
                key={plant.plantId}
                title={`${plant.plantName} (${plant.subtypeName})`}
                icon={<Plant className="w-5 h-5 mr-2 text-green-500" />}
                data={[
                  { label: 'Orders', value: plant.orderCount },
                  { label: 'Plants Sold', value: plant.plantCount.toLocaleString() },
                  { label: 'Revenue', value: formatCurrency(plant.revenue) },
                  { 
                    label: 'Return Rate', 
                    value: formatPercentage(plant.returnRate),
                    color: plant.returnRate < 0.06 ? 'text-green-600' : 'text-yellow-600'
                  }
                ]}
                footerComponent={
                  <StatusDistribution 
                    statusCounts={plant.statusDistribution} 
                    totalCount={plant.orderCount}
                    colors={STATUS_COLORS}
                  />
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Plants Performance Chart */}
      <ChartCard title="Plant Performance Comparison" height="400px">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={ordersByPlant}>
            <PolarGrid />
            <PolarAngleAxis dataKey="plantName" />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
            <Radar name="Plant Count" dataKey="plantCount" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
            <Radar name="Revenue (÷1000)" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
            <Legend />
            <Tooltip formatter={(value, name) => {
              if (name === "Revenue (÷1000)") return formatCurrency(value);
              return value.toLocaleString();
            }} />
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Plant Return Analysis */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Plant Return Analysis</h3>
        </div>
        <div className="p-5">
          <SimpleTable 
            headers={[
              { key: 'plantName', label: 'Plant' },
              { key: 'subtypeName', label: 'Subtype' },
              { key: 'plantCount', label: 'Total Plants' },
              { key: 'returnCount', label: 'Returns' },
              { key: 'returnRateFormatted', label: 'Return Rate' }
            ]}
            rows={ordersByPlant.map(plant => ({
              ...plant,
              plantCount: plant.plantCount.toLocaleString(),
              returnCount: plant.returnCount.toLocaleString(),
              returnRateFormatted: (
                <div className="flex items-center">
                  <div className="mr-2 flex-shrink-0">
                    <div 
                      className={`h-2.5 w-2.5 rounded-full ${
                        plant.returnRate < 0.05 ? 'bg-green-400' : 
                        plant.returnRate < 0.07 ? 'bg-yellow-400' : 'bg-red-400'
                      }`}
                    ></div>
                  </div>
                  <span className={`text-sm ${
                    plant.returnRate < 0.05 ? 'text-green-600' : 
                    plant.returnRate < 0.07 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(plant.returnRate)}
                  </span>
                </div>
              )
            }))}
          />
        </div>
      </div>
    </div>
  );
};

export default PlantsTab