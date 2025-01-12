import React, { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Leaf, CheckCircle, AlertCircle } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import Subtypes from "./Subtypes"

const SlotAccordionView = ({ plantId, year }) => {
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
      const response = await instance.request({}, { plantId, year: 2025 })
      if (response?.data) {
        setMonths(response?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }
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
        {months?.subtypes?.map((month, monthIndex) => (
          <div key={month?.name} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleMonth(monthIndex)}
              className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-700">{month?.subtypeName}</span>
                  <Leaf className="w-4 h-4 text-green-600" />
                </div>
                <div className="text-sm flex gap-6">
                  <span className="flex items-center gap-1 text-yellow-500">
                    <AlertCircle className="w-4 h-4" />{" "}
                    <strong>
                      {" "}
                      {month?.totalPlants + month?.totalBookedPlants - month?.totalBookedPlants ||
                        0}
                    </strong>{" "}
                    Remaining
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />{" "}
                    <strong> {month?.totalBookedPlants || 0}</strong> Booked
                  </span>

                  <span className="flex items-center gap-1 text-gray-700">
                    <strong> {month?.totalPlants + month?.totalBookedPlants || 0}</strong> Total
                    Plants
                  </span>
                </div>
              </div>
              {isMonthExpanded(monthIndex) ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>

            {isMonthExpanded(monthIndex) && (
              <Subtypes plantId={plantId} plantSubId={month.subtypeId} year={year} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default SlotAccordionView
