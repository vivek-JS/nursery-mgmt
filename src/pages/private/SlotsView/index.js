import React, { useEffect, useState } from "react"
import SlotAccordionView from "./slots"
import { API, NetworkManager } from "network/core"
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Plus } from "lucide-react"
import AddManualSlotModal from "./AddManualSlotModal"

const ParentAccordion = () => {
  const [expandedSections, setExpandedSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [months, setMonths] = useState([])
  const [selectedYear, setSelectedYear] = useState("2025")
  const [isModalOpen, setIsModalOpen] = useState(false) // State to control modal visibility
  const [plants, setPlants] = useState([]) // State to store plants data for the dropdown

  const years = ["2025"]

  const toggleSection = (sectionIndex) => {
    setExpandedSections((prev) =>
      prev.includes(sectionIndex)
        ? prev.filter((index) => index !== sectionIndex)
        : [...prev, sectionIndex]
    )
  }

  useEffect(() => {
    fetchPlants()
    fetchAllPlants() // Fetch all plants for the dropdown
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
    // Refresh the plants data after adding a new slot
    fetchPlants()
    setIsModalOpen(false)
  }

  return (
    <div className="space-y-6">
      {/* Year Toggle and Add Slot Button Section */}
      <div className="bg-white rounded-lg p-2 shadow-sm flex justify-between items-center">
        <div className="flex justify-start items-center space-x-2">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                selectedYear === year
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100"
              }`}>
              {year}
            </button>
          ))}
        </div>

        {/* Add Manual Slot Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-md flex items-center gap-2 hover:bg-green-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Manual Slot
        </button>
      </div>

      {/* Main Accordion Section */}
      <div className="bg-gray-100 rounded-lg shadow-lg p-6 space-y-4">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          months.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(sectionIndex)}
                className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors">
                <div className="w-full flex items-start justify-center flex-col">
                  <span className="font-medium text-gray-700">{section?.name}</span>
                  <div className="text-sm flex gap-6">
                    <span className="flex items-center gap-1 text-yellow-500">
                      <AlertCircle className="w-4 h-4" />{" "}
                      <strong>{Number(section?.totalPlants) || 0}</strong> Remaining
                    </span>
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="w-4 h-4" />{" "}
                      <strong>{Number(section?.totalBookedPlants) || 0}</strong> Booked
                    </span>

                    <span className="flex items-center gap-1 text-gray-700">
                      <strong>
                        {Number(section?.totalPlants) + Number(section?.totalBookedPlants) || 0}
                      </strong>{" "}
                      Total Plants
                    </span>
                  </div>
                </div>
                {isSectionExpanded(sectionIndex) ? (
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                )}
              </button>

              {isSectionExpanded(sectionIndex) && (
                <div className="bg-white border-t">
                  <SlotAccordionView plantId={section?.plantId} year={selectedYear} />
                </div>
              )}
            </div>
          ))
        )}
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
