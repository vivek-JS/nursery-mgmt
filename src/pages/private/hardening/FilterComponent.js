import React, { useEffect, useState } from "react"
import {
  Filter as FilterIcon,
  X as CloseIcon,
  Calendar as CalendarIcon,
  ChevronDown as DropdownIcon
} from "lucide-react"
import { API, NetworkManager } from "network/core"

const FilterComponent = ({ onApplyFilters }) => {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [filters, setFilters] = useState({
    batchId: "",
    startDate: null,
    endDate: null,
    filterType: ""
  })
  const [batches, setBatches] = useState([])
  useEffect(() => {
    getBatches()
  }, [])
  const filterTypes = [
    { label: "Primary Inward Date", value: "primary" },
    { label: "Lab Outward Date", value: "lab" },
    { label: "Rooting Date", value: "labroot" },
    { label: "Expected Outward Date", value: "primaryexpected" }
  ]

  const handleDateChange = (type, date) => {
    setFilters((prev) => ({
      ...prev,
      [type]: date
    }))
  }

  const handleApplyFilters = () => {
    onApplyFilters(filters)
    setIsFilterModalOpen(false)
  }

  const resetFilters = () => {
    setFilters({
      batchId: "",
      startDate: null,
      endDate: null,
      filterType: ""
    })
  }
  const getBatches = async () => {
    try {
      const instance = NetworkManager(API.BATCH.GET_BATCHES)
      const response = await instance.request({})

      if (response.data?.data) {
        setBatches(response.data.data.data)
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
    }
  }
  console.log(batches)
  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsFilterModalOpen(true)}
        className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
        <FilterIcon className="w-5 h-5" />
        <span>Filters</span>
      </button>

      {/* Filter Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Filter Options</h2>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-gray-600 hover:text-gray-900 transition-colors">
                <CloseIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Batch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Batch Number</label>
                <div className="relative">
                  <select
                    value={filters.batchId}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        batchId: e.target.value
                      }))
                    }
                    className="w-full appearance-none border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="">Select Batch</option>
                    {batches.map((batch) => (
                      <option key={batch.batchNumber} value={batch.id}>
                        {batch.batchNumber}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <DropdownIcon className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Filter Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter By</label>
                <div className="flex flex-wrap gap-2">
                  {filterTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          filterType: type.value
                        }))
                      }
                      className={`px-4 py-2 rounded-full text-sm transition-colors ${
                        filters.filterType === type.value
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range Selection */}
              <div className="grid grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filters.startDate ? filters.startDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => handleDateChange("startDate", new Date(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={filters.endDate ? filters.endDate.toISOString().split("T")[0] : ""}
                      onChange={(e) => handleDateChange("endDate", new Date(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarIcon className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex space-x-4 p-6 border-t border-gray-200">
              <button
                onClick={resetFilters}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                Reset
              </button>
              <button
                onClick={handleApplyFilters}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FilterComponent
