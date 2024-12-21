import React, { useEffect, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import SlotAccordionView from "./slots"
import { API, NetworkManager } from "network/core"

const ParentAccordion = () => {
  const [expandedSections, setExpandedSections] = useState([])
  const [loading, setLoading] = useState(false)
  //const [slots, setSlots] = useState([])
  const [months, setMonths] = useState([])
  const toggleSection = (sectionIndex) => {
    setExpandedSections((prev) =>
      prev.includes(sectionIndex)
        ? prev.filter((index) => index !== sectionIndex)
        : [...prev, sectionIndex]
    )
  }
  {
    loading
  }
  useEffect(() => {
    fetchPlants()
  }, [])
  const fetchPlants = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS)
      const response = await instance.request()
      console.log(response?.data)
      if (response?.data) {
        setMonths(response?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }
  const isSectionExpanded = (sectionIndex) => expandedSections.includes(sectionIndex)

  //const sections = ["Section 1", "Section 2", "Section 3"] // Replace with dynamic data as needed

  return (
    <div className=" bg-gray-100 rounded-lg shadow-lg p-6 space-y-4">
      {months.map((section, sectionIndex) => (
        <div key={sectionIndex} className="border rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection(sectionIndex)}
            className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors">
            <span className="font-medium text-gray-700">{section?.name}</span>
            {isSectionExpanded(sectionIndex) ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {isSectionExpanded(sectionIndex) && (
            <div className="bg-white border-t">
              <SlotAccordionView plantId={section?.plantId} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default ParentAccordion
