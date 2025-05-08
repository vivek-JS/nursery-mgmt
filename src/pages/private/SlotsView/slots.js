import React, { useEffect, useState } from "react"
import { ChevronDown, ChevronUp, Leaf, CheckCircle, AlertCircle } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import Subtypes from "./Subtypes"

const SlotAccordionView = ({ plantId, year }) => {
  const [expandedMonths, setExpandedMonths] = useState([])
  const [loading, setLoading] = useState(false)
  const [months, setMonths] = useState([])

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

  const toggleMonth = (monthIndex) => {
    setExpandedMonths((prev) =>
      prev.includes(monthIndex) ? prev.filter((m) => m !== monthIndex) : [...prev, monthIndex]
    )
  }

  const isMonthExpanded = (monthIndex) => expandedMonths.includes(monthIndex)

  // Helper function to calculate percentage
  const calculatePercentage = (booked, total) => {
    if (total === 0) return 0
    return Math.round((booked / total) * 100)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {loading ? (
        <PageLoader />
      ) : (
        <div className="space-y-4">
          {months?.subtypes?.map((subtype, subtypeIndex) => {
            const totalCapacity = subtype?.totalPlants + subtype?.totalBookedPlants || 0
            const bookedPercentage = calculatePercentage(
              subtype?.totalBookedPlants || 0,
              totalCapacity
            )

            return (
              <div
                key={subtype?.subtypeId}
                className="border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-all hover:shadow-md">
                <div
                  onClick={() => toggleMonth(subtypeIndex)}
                  className="cursor-pointer w-full px-5 py-4 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Leaf className="w-5 h-5 text-green-600" />
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {subtype?.subtypeName}
                        </h3>
                      </div>
                      {isMonthExpanded(subtypeIndex) ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${
                          bookedPercentage > 80
                            ? "bg-green-600"
                            : bookedPercentage > 50
                            ? "bg-green-500"
                            : bookedPercentage > 20
                            ? "bg-yellow-500"
                            : "bg-orange-500"
                        }`}
                        style={{ width: `${bookedPercentage}%` }}></div>
                    </div>

                    <div className="flex justify-between items-center text-sm mt-1">
                      <div className="grid grid-cols-3 gap-6 w-full">
                        <div className="flex items-center gap-1 text-yellow-600">
                          <AlertCircle className="w-4 h-4" />
                          {console.log("subtype", subtype)}
                          <span className="font-medium">{subtype?.totalPlants || 0} Remaining</span>
                        </div>

                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">
                            {subtype?.totalBookedPlants || 0} Booked
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-gray-700">
                          <span className="font-medium">
                            {totalCapacity || 0} Total Plants ({bookedPercentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {isMonthExpanded(subtypeIndex) && (
                  <div className="border-t border-gray-200">
                    <Subtypes plantId={plantId} plantSubId={subtype.subtypeId} year={year} />
                  </div>
                )}
              </div>
            )
          })}

          {months?.subtypes?.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <Leaf className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-lg">No subtypes available for this plant</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SlotAccordionView
