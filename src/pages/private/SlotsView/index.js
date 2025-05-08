import React, { useEffect, useState } from "react"
import SlotAccordionView from "./slots"
import { API, NetworkManager } from "network/core"
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle } from "lucide-react"

const ParentAccordion = () => {
  const [expandedSections, setExpandedSections] = useState([])
  const [loading, setLoading] = useState(false)
  const [months, setMonths] = useState([])
  const [selectedYear, setSelectedYear] = useState("2025")

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

  const isSectionExpanded = (sectionIndex) => expandedSections.includes(sectionIndex)
  return (
    <div className="space-y-6">
      {/* Year Toggle Section */}
      <div className="bg-white rounded-lg p-2 shadow-sm">
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
      </div>

      {/* Main Accordion Section */}
      <div className="bg-gray-100 rounded-lg shadow-lg p-6 space-y-4">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          months.map((section, sectionIndex) => (
            <div key={sectionIndex} className="border rounded-lg overflow-hidden">
              {console.log(section)}
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
    </div>
  )
}

export default ParentAccordion
