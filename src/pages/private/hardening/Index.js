import React, { useEffect, useState } from "react"
import { CircleIcon, BoxIcon, Loader2Icon, TreePineIcon, UsersIcon, LayersIcon } from "lucide-react"
import { API, NetworkManager } from "network/core"
import BatchDetails from "./BatchDetails"
import FilterComponent from "./FilterComponent"

const Hardening = () => {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedBatchId, setExpandedBatchId] = useState(null)
  const [currentFilters, setCurrentFilters] = useState(null)
  // Prepare batch options for filter

  // Apply filters by calling API with parameters
  const handleApplyFilters = (filters) => {
    // Prepare filter parameters for API
    const apiParams = {
      ...(filters.batchId && { batchId: filters.batchId }),
      ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
      ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
      ...(filters.filterType && { [filters.filterType]: true })
    }
    // Store current filters for potential reload
    setCurrentFilters(apiParams)

    // Fetch outwards with filter parameters
    getOutwards(apiParams)
  }

  // Calculate enhanced statistics including primaryInward and efficiency
  const totalStats = batches.reduce(
    (acc, batch) => {
      // Outward calculations
      const outwardPlants = batch?.outward?.reduce((sum, o) => sum + (o?.plants || 0), 0) || 0
      const outwardBottles = batch?.outward?.reduce((sum, o) => sum + (o?.bottles || 0), 0) || 0

      // PrimaryInward calculations
      const totalQuantity =
        batch?.primaryInward?.reduce((sum, p) => sum + (p?.totalQuantity || 0), 0) || 0
      const totalLabours =
        batch?.primaryInward?.reduce((sum, p) => sum + (p?.laboursEngaged || 0), 0) || 0

      // Efficiency calculations
      const inwardBottles = batch?.summary?.total?.primaryInwardBottles || 0
      const efficiency = inwardBottles ? (outwardBottles / inwardBottles) * 100 : 0

      return {
        totalOutwardPlants: acc.totalOutwardPlants + outwardPlants,
        totalPrimaryInwardQuantity: acc.totalPrimaryInwardQuantity + totalQuantity,
        totalLaboursEngaged: acc.totalLaboursEngaged + totalLabours,
        bottleEfficiency: acc.bottleEfficiency + efficiency,
        activeBatches: acc.activeBatches + (batch?.isActive ? 1 : 0),
        batchCount: acc.batchCount + 1
      }
    },
    {
      totalOutwardPlants: 0,
      totalPrimaryInwardQuantity: 0,
      totalLaboursEngaged: 0,
      bottleEfficiency: 0,
      activeBatches: 0,
      batchCount: 0
    }
  )

  // Calculate batch-wise statistics
  const batchStats = batches.reduce((acc, batch) => {
    const batchNumber = batch?.batchId?.batchNumber || "Unknown"

    const outwardBottles = batch?.outward?.reduce((sum, o) => sum + (o?.bottles || 0), 0) || 0
    const inwardBottles = batch?.summary?.total?.primaryInwardBottles || 0
    const efficiency = inwardBottles ? (outwardBottles / inwardBottles) * 100 : 0

    const stats = {
      outwardPlants: batch?.outward?.reduce((sum, o) => sum + (o?.plants || 0), 0) || 0,
      primaryInwardQuantity:
        batch?.primaryInward?.reduce((sum, p) => sum + (p?.totalQuantity || 0), 0) || 0,
      laboursEngaged:
        batch?.primaryInward?.reduce((sum, p) => sum + (p?.laboursEngaged || 0), 0) || 0,
      efficiency,
      isActive: batch?.isActive,
      dateAdded: batch?.dateAdded,
      primaryInward: batch?.primaryInward || [],
      outward: batch?.outward || []
    }

    acc[batchNumber] = stats
    return acc
  }, {})

  const formatNumber = (num, decimals = 0) => {
    if (!num) return "0"
    return Number(num).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  }

  const getOutwards = async (apiParams) => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.PLANT_OUTWARD.GET_OUTWARDS)
      const response = await instance.request({}, apiParams)

      if (response.data?.data) {
        setBatches(response.data?.data)
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    getOutwards()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2Icon className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }
  const handleBatchToggle = (batchId) => {
    setExpandedBatchId(expandedBatchId === batchId ? null : batchId)
  }

  const handleReload = () => {
    // If filters were previously applied, reapply them
    currentFilters ? getOutwards(currentFilters) : getOutwards()
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Main Stats */}
      <div className="flex justify-between items-center mb-6">
        <FilterComponent onApplyFilters={handleApplyFilters} />
        <button
          onClick={handleReload}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Loader2Icon className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2">
            <CircleIcon className="h-6 w-6 text-blue-500" />
            <h3 className="text-sm font-medium text-gray-600">Efficiency Rate</h3>
          </div>
          <p className="text-2xl font-bold mt-2 text-gray-900">
            {formatNumber(totalStats.bottleEfficiency / (batches.length || 1), 1)}%
          </p>
          <p className="text-sm text-gray-500 mt-1">Outward/Inward Ratio</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2">
            <TreePineIcon className="h-6 w-6 text-green-500" />
            <h3 className="text-sm font-medium text-gray-600">Total Plants</h3>
          </div>
          <p className="text-2xl font-bold mt-2 text-gray-900">
            {formatNumber(totalStats.totalOutwardPlants)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Outward Plants</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2">
            <LayersIcon className="h-6 w-6 text-purple-500" />
            <h3 className="text-sm font-medium text-gray-600">Total Quantity</h3>
          </div>
          <p className="text-2xl font-bold mt-2 text-gray-900">
            {formatNumber(totalStats.totalPrimaryInwardQuantity)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Primary Inward</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2">
            <UsersIcon className="h-6 w-6 text-orange-500" />
            <h3 className="text-sm font-medium text-gray-600">Total Labour</h3>
          </div>
          <p className="text-2xl font-bold mt-2 text-gray-900">
            {formatNumber(totalStats.totalLaboursEngaged)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Engaged</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center space-x-2">
            <BoxIcon className="h-6 w-6 text-indigo-500" />
            <h3 className="text-sm font-medium text-gray-600">Active Batches</h3>
          </div>
          <p className="text-2xl font-bold mt-2 text-gray-900">{totalStats.activeBatches}</p>
          <p className="text-sm text-gray-500 mt-1">of {totalStats.batchCount}</p>
        </div>
      </div>

      {/* Batch-wise Details */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Batch-wise Details</h2>
          <button
            onClick={getOutwards}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Loader2Icon className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left font-medium p-4 text-gray-600">Batch Number</th>
                  <th className="text-left font-medium p-4 text-gray-600">Status</th>
                  <th className="text-right font-medium p-4 text-gray-600">Efficiency</th>
                  <th className="text-right font-medium p-4 text-gray-600">Outward Plants</th>
                  <th className="text-right font-medium p-4 text-gray-600">Primary Inward Qty</th>
                  <th className="text-right font-medium p-4 text-gray-600">Labour Engaged</th>
                  <th className="text-right font-medium p-4 text-gray-600">Primary Count</th>
                  <th className="text-right font-medium p-4 text-gray-600">Outward Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(batchStats).map(([batchNumber, stats]) => (
                  <BatchDetails
                    key={batchNumber}
                    batch={{ batchId: { batchNumber }, ...stats }}
                    isOpen={expandedBatchId === batchNumber}
                    onToggle={() => handleBatchToggle(batchNumber)}
                  />
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="p-4 font-medium text-gray-900">Total</td>
                  <td className="p-4"></td>
                  <td className="p-4 text-right font-medium">
                    {formatNumber(totalStats.bottleEfficiency / (batches.length || 1), 1)}%
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatNumber(totalStats.totalOutwardPlants)}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatNumber(totalStats.totalPrimaryInwardQuantity)}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatNumber(totalStats.totalLaboursEngaged)}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatNumber(
                      batches.reduce((sum, b) => sum + (b?.primaryInward?.length || 0), 0)
                    )}
                  </td>
                  <td className="p-4 text-right font-medium">
                    {formatNumber(batches.reduce((sum, b) => sum + (b?.outward?.length || 0), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Hardening
