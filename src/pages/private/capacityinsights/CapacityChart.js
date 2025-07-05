import React from "react"
import { format } from "date-fns"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts"

/**
 * Reusable chart component for capacity visualization
 *
 * @param {Object} props - Component props
 * @param {Array} props.data - Array of data points for the chart
 * @param {string} props.type - Chart type: 'line' or 'bar'
 * @param {Array} props.dataKeys - Array of data keys to display with their colors
 * @param {boolean} props.colorByStatus - Whether to color bars based on status
 * @param {string} props.dateFormat - Format for date labels (default: 'dd MMM')
 * @returns {JSX.Element} Chart component
 */
const CapacityChart = ({
  data,
  type = "line",
  dataKeys,
  colorByStatus = false,
  dateFormat = "dd MMM"
}) => {
  // Format date labels
  const formatXAxisDate = (dateStr) => {
    return format(new Date(dateStr), dateFormat)
  }

  // Format tooltip labels
  const formatTooltipLabel = (date) => {
    return format(new Date(date), "dd MMMM yyyy")
  }

  // Format tooltip values
  const formatTooltipValue = (value, name) => {
    return [value.toLocaleString(), name]
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {type === "line" ? (
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatXAxisDate} />
          <YAxis />
          <RechartsTooltip formatter={formatTooltipValue} labelFormatter={formatTooltipLabel} />
          <Legend />
          {dataKeys.map((item, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={item.key}
              name={item.name}
              stroke={item.color}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatXAxisDate} />
          <YAxis />
          <RechartsTooltip formatter={formatTooltipValue} labelFormatter={formatTooltipLabel} />
          <Legend />
          {dataKeys.map((item, index) => (
            <Bar key={index} dataKey={item.key} name={item.name} fill={item.color}>
              {colorByStatus &&
                item.key === "farmReadyPlants" &&
                data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.status === "OVER_CAPACITY" ? "#f44336" : "#4caf50"}
                  />
                ))}
            </Bar>
          ))}
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}

export default CapacityChart
