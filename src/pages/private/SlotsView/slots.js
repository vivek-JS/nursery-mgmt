import React, { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Leaf } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import Subtypes from "./Subtypes"

const SlotAccordionView = ({ plantId }) => {
  const [expandedMonths, setExpandedMonths] = useState([])

  const [loading, setLoading] = useState(false)
  //const [slots, setSlots] = useState([])
  const [months, setMonths] = useState([])
  //console.log(plantId)

  useEffect(() => {
    fetchPlants()
  }, [])

  const fetchPlants = async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
      const response = await instance.request({}, { plantId })
      console.log(response?.data)
      if (response?.data) {
        setMonths(response?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }
  console.log(months)
  // const months = [
  //   "January",
  //   "February",
  //   "March",
  //   "April",
  //   "May",
  //   "June",
  //   "July",
  //   "August",
  //   "September",
  //   "October",
  //   "November",
  //   "December"
  // ]

  const toggleMonth = (monthIndex) => {
    setExpandedMonths((prev) =>
      prev.includes(monthIndex) ? prev.filter((m) => m !== monthIndex) : [...prev, monthIndex]
    )
  }

  const isMonthExpanded = (monthIndex) => expandedMonths.includes(monthIndex)

  // Sample data - replace with actual data

  return (
    <div className=" bg-white rounded-lg shadow-lg p-6">
      {loading && <PageLoader />}

      <div className="space-y-3">
        {months.map((month, monthIndex) => (
          <div key={month?.name} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleMonth(monthIndex)}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700">{month?.name}</span>
                <Leaf className="w-4 h-4 text-green-600" />
                <span className="text-sm text-gray-500">
                  {isMonthExpanded(monthIndex) ? "Click to collapse" : "Click to expand"}
                </span>
              </div>
              {isMonthExpanded(monthIndex) ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {isMonthExpanded(monthIndex) && <Subtypes plantId={plantId} plantSubId={month._id} />}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SlotAccordionView
