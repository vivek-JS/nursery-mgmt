import React, { useEffect, useState } from "react"
import SlotAccordionView from "./slots"
import { API, NetworkManager } from "network/core"
import { 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  Calendar,
  Package,
  TrendingUp,
  Leaf,
  BarChart3,
  Clock
} from "lucide-react"
import AddManualSlotModal from "./AddManualSlotModal"

const ParentAccordion = () => {
  const [expandedSections, setExpandedSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [months, setMonths] = useState([])
  const [selectedYear, setSelectedYear] = useState("2026")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [plants, setPlants] = useState([])

  const years = ["2026", "2027"]

  const toggleSection = (sectionIndex) => {
    setExpandedSections((prev) =>
      prev.includes(sectionIndex)
        ? prev.filter((index) => index !== sectionIndex)
        : [...prev, sectionIndex]
    )
  }

  useEffect(() => {
    fetchPlants()
    fetchAllPlants()
  }, [selectedYear])

  const fetchPlants = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS)
      const response = await instance.request({}, { year: selectedYear })
      if (response?.data) {
        setMonths(response?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }

  const fetchAllPlants = async () => {
    try {
      const instance = NetworkManager(API.plantCms.GET_PLANTS)
      const response = await instance.request()

      if (response?.data?.message) {
        setPlants(response?.data?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
  }

  const isSectionExpanded = (sectionIndex) => expandedSections.includes(sectionIndex)

  const handleAddSuccess = () => {
    fetchPlants()
    setIsModalOpen(false)
  }

  // Calculate summary statistics
  // totalPlants = total capacity, available = totalPlants - totalBookedPlants
  const totalStats = months.reduce(
    (acc, section) => {
      const total = Number(section?.totalPlants) || 0
      const booked = Number(section?.totalBookedPlants) || 0
      return {
        available: acc.available + Math.max(0, total - booked),
        booked: acc.booked + booked,
        total: acc.total + total
      }
    },
    { available: 0, booked: 0, total: 0 }
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <Leaf className="w-6 h-6 text-white" />
                </div>
                Plant Slot Management
              </h1>
              <p className="text-gray-500 mt-1 ml-13">
                Manage and monitor plant inventory across all slots
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl flex items-center gap-2 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              <Plus className="w-5 h-5" />
              <span className="font-medium">Add Manual Slot</span>
            </button>
          </div>

          {/* Year Selection Tabs */}
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-xl w-fit">
            {years.map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-8 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  selectedYear === year
                    ? "bg-white text-green-600 shadow-md"
                    : "text-gray-600 hover:text-gray-800"
                }`}>
                <Calendar className="w-4 h-4 inline-block mr-2" />
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Capacity Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <BarChart3 className="w-8 h-8 opacity-30" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Total Capacity</h3>
            <p className="text-3xl font-bold">{totalStats.total.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">All plants combined</p>
          </div>

          {/* Available Plants Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <TrendingUp className="w-8 h-8 opacity-30" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Available Plants</h3>
            <p className="text-3xl font-bold">{totalStats.available.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">
              {totalStats.total > 0 
                ? `${((totalStats.available / totalStats.total) * 100).toFixed(1)}% of total`
                : 'No capacity'}
            </p>
          </div>

          {/* Booked Plants Card */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <AlertCircle className="w-8 h-8 opacity-30" />
            </div>
            <h3 className="text-sm font-medium opacity-90 mb-1">Booked Plants</h3>
            <p className="text-3xl font-bold">{totalStats.booked.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">
              {totalStats.total > 0 
                ? `${((totalStats.booked / totalStats.total) * 100).toFixed(1)}% utilized`
                : 'No bookings'}
            </p>
          </div>
        </div>

        {/* Plants Accordion */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">Loading plant data...</p>
            </div>
          ) : months.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-md">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No Plants Found</h3>
              <p className="text-gray-500">No plant slots available for {selectedYear}</p>
            </div>
          ) : (
            months.map((section, sectionIndex) => {
              const totalCapacity = Number(section?.totalPlants) || 0
              const bookedPlants = Number(section?.totalBookedPlants) || 0
              const availablePlants = Math.max(0, totalCapacity - bookedPlants)
              const utilizationRate = totalCapacity > 0 ? (bookedPlants / totalCapacity) * 100 : 0
              const isExpanded = isSectionExpanded(sectionIndex)

              return (
                <div
                  key={sectionIndex}
                  className={`bg-white rounded-2xl shadow-md overflow-hidden transition-all duration-300 ${
                    isExpanded ? 'ring-2 ring-green-500' : 'hover:shadow-lg'
                  }`}>
                  <button
                    onClick={() => toggleSection(sectionIndex)}
                    className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Plant Icon */}
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        utilizationRate > 80 
                          ? 'bg-orange-100' 
                          : utilizationRate > 50 
                          ? 'bg-blue-100' 
                          : 'bg-green-100'
                      }`}>
                        <Leaf className={`w-7 h-7 ${
                          utilizationRate > 80 
                            ? 'text-orange-600' 
                            : utilizationRate > 50 
                            ? 'text-blue-600' 
                            : 'text-green-600'
                        }`} />
                      </div>

                      {/* Plant Info */}
                      <div className="flex-1 text-left">
                        <h3 className="text-lg font-bold text-gray-800 mb-1">
                          {section?.name}
                        </h3>
                        
                        {/* Stats Row */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-gray-600">Available:</span>
                            <span className="font-semibold text-green-600">
                              {availablePlants.toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span className="text-gray-600">Booked:</span>
                            <span className="font-semibold text-orange-600">
                              {bookedPlants.toLocaleString()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            <span className="text-gray-600">Total:</span>
                            <span className="font-semibold text-indigo-600">
                              {totalCapacity.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Utilization Indicator */}
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-1">Utilization</div>
                          <div className={`text-lg font-bold ${
                            utilizationRate > 80 
                              ? 'text-orange-600' 
                              : utilizationRate > 50 
                              ? 'text-blue-600' 
                              : 'text-green-600'
                          }`}>
                            {utilizationRate.toFixed(1)}%
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              utilizationRate > 80 
                                ? 'bg-orange-500' 
                                : utilizationRate > 50 
                                ? 'bg-blue-500' 
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(utilizationRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expand Icon */}
                    <div className="ml-4">
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 bg-gray-50">
                      <SlotAccordionView plantId={section?.plantId} year={selectedYear} />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Add Manual Slot Modal */}
      {isModalOpen && (
        <AddManualSlotModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          plants={plants}
          selectedYear={selectedYear}
          onSuccess={handleAddSuccess}
        />
      )}
    </div>
  )
}

export default ParentAccordion
