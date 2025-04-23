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

  useEffect(() => {
    fetchPlants()
  }, [])

  const fetchPlants = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.STATS_SLOTS.GET_HOUSES)
      const response = await instance.request(
        {},
        { startDate: "01-01-2025", endDate: "31-12-2025" }
      )
      if (response?.data) {
        console.log(response?.data)
        setData(response?.data?.data)
        //   setMonths(response?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }

  if (loading) return <div>Loading...</div>
  if (!data) return <div>No data available</div>
  console.log(data)
  return (
    <div className="space-y-8">
      {/* Monthly Trends Line Chart */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-bold">Monthly Plant Statistics Trends</h2>
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
          <h2 className="text-xl font-bold">Plant-wise Distribution</h2>
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
          <h2 className="text-xl font-bold">Overall Statistics</h2>
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
