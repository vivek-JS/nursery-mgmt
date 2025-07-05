import React from "react"
import moment from "moment"

/**
 * Component to display the history of farm ready dates
 *
 * @param {object} props
 * @param {Array} props.farmReadyDates - Array of farm ready dates, newest first
 * @returns {JSX.Element}
 */
const FarmReadyDatesHistory = ({ farmReadyDates }) => {
  console
  if (!farmReadyDates || farmReadyDates.length === 0) {
    return <div className="text-gray-500 italic">No farm ready dates recorded</div>
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
        <span className="mr-2">Farm Ready History</span>
        <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
          {farmReadyDates.length}
        </span>
      </h3>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {farmReadyDates.map((date, index) => (
          <div
            key={index}
            className={`p-3 rounded-md border-l-4 ${
              index === 0 ? "bg-amber-50 border-amber-500" : "bg-gray-50 border-gray-300"
            }`}>
            <div className="flex justify-between items-center">
              <div className={`font-medium ${index === 0 ? "text-amber-700" : "text-gray-600"}`}>
                {index === 0 ? "Current Farm Ready Date" : `Previous Date #${index}`}
              </div>
              <div className="text-sm font-medium bg-white px-2 py-1 rounded shadow-sm">
                {moment(date).format("DD/MM/YYYY")}
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-1">
              {index === 0
                ? `Set ${moment(date).fromNow()}`
                : `Updated on ${moment(date).format("DD/MM/YYYY")}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FarmReadyDatesHistory
