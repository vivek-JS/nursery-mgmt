import { API, NetworkManager } from "network/core"
import React, { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

const PlantStatisticsCharts = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Available years - current year and next year
  const availableYears = [2025, 2026]

  useEffect(() => {
    fetchPlants()
  }, [selectedYear])

  const fetchPlants = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.STATS_SLOTS.GET_HOUSES)
      const response = await instance.request(
        {},
        { startDate: `01-01-${selectedYear}`, endDate: `31-12-${selectedYear}` }
      )
      if (response?.data) {
        console.log(response?.data)
        setData(response?.data?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }

  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value))
  }

  if (loading) return <div className="flex justify-center items-center h-64">Loading...</div>
  if (!data) return <div className="flex justify-center items-center h-64">No data available</div>

  return (
    <div className="space-y-8">
      {/* Year Selector */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Plant Statistics Dashboard</h2>
          <div className="flex items-center space-x-3">
            <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
              Select Year:
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={handleYearChange}
              className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Monthly Trends Line Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Monthly Plant Statistics Trends - {selectedYear}</h2>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.chartData.lineChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="totalPlants" stroke="#8884d8" name="Total Plants" />
              <Line
                type="monotone"
                dataKey="totalBookedPlants"
                stroke="#82ca9d"
                name="Booked Plants"
              />
              <Line type="monotone" dataKey="allPlants" stroke="#ffc658" name="All Plants" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Plant-wise Distribution Bar Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Plant-wise Distribution - {selectedYear}</h2>
        </div>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.chartData.barChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="plantName" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="totalPlants" fill="#8884d8" name="Total Plants" />
              <Bar dataKey="totalBookedPlants" fill="#82ca9d" name="Booked Plants" />
              <Bar dataKey="allPlants" fill="#ffc658" name="All Plants" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Overall Statistics - {selectedYear}</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-blue-100 rounded-lg">
            <div className="text-2xl font-bold">{data.grandTotals.totalPlants}</div>
            <div className="text-gray-600">Total Plants</div>
          </div>
          <div className="p-4 bg-green-100 rounded-lg">
            <div className="text-2xl font-bold">{data.grandTotals.totalBookedPlants}</div>
            <div className="text-gray-600">Booked Plants</div>
          </div>
          <div className="p-4 bg-yellow-100 rounded-lg">
            <div className="text-2xl font-bold">{data.grandTotals.allPlants}</div>
            <div className="text-gray-600">All Plants</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlantStatisticsCharts
