import React from "react"
import { ChevronDownIcon, ChevronRightIcon, ArrowRightIcon, PackageIcon } from "lucide-react"
const BatchDetails = ({ batch, isOpen, onToggle }) => {
  const primaryInward = batch?.primaryInward || []
  const outward = batch?.outward || []
  const formatDate = (date) => {
    if (!date) return "-"
    return new Date(date).toLocaleDateString()
  }
  return (
    <>
      <tr
        onClick={onToggle}
        className="border-b border-gray-200 last:border-0 hover:bg-gray-50 cursor-pointer">
        <td className="p-4 text-gray-900">
          <div className="flex items-center space-x-2">
            {isOpen ? (
              <ChevronDownIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-gray-500" />
            )}
            <span>{batch?.batchId?.batchNumber}</span>
          </div>
        </td>
        <td className="p-4">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium
                ${batch?.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
            {batch?.isActive ? "Active" : "Inactive"}
          </span>
        </td>
        <td className="p-4 text-right">{batch?.efficiency?.toFixed(1)}%</td>
        <td className="p-4 text-right">{batch?.outwardPlants?.toLocaleString()}</td>
        <td className="p-4 text-right">{batch?.primaryInwardQuantity?.toLocaleString()}</td>
        <td className="p-4 text-right">{batch?.laboursEngaged?.toLocaleString()}</td>
        <td className="p-4 text-right">{primaryInward.length}</td>
        <td className="p-4 text-right">{outward.length}</td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan="8" className="p-0">
            <div className="bg-gray-50 p-6 space-y-6">
              {/* Primary Inward Details */}
              {primaryInward.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <PackageIcon className="h-5 w-5 text-blue-500 mr-2" />
                    Primary Inward Entries
                  </h3>
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-4 text-sm font-medium text-gray-600">Date</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-600">Size</th>
                          <th className="text-right p-4 text-sm font-medium text-gray-600">
                            Bottles
                          </th>
                          <th className="text-right p-4 text-sm font-medium text-gray-600">
                            Trays
                          </th>
                          <th className="text-right p-4 text-sm font-medium text-gray-600">
                            Cavity
                          </th>
                          <th className="text-right p-4 text-sm font-medium text-gray-600">
                            Quantity
                          </th>
                          <th className="text-right font-medium p-4 text-gray-600">
                            Expected Outward Date
                          </th>

                          <th className="text-right p-4 text-sm font-medium text-gray-600">
                            Labour
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {primaryInward.map((entry) => (
                          <tr key={entry._id} className="border-t border-gray-100">
                            <td className="p-4 text-gray-600">
                              {new Date(entry.primaryInwardDate).toLocaleDateString()}
                            </td>
                            <td className="p-4">{entry.size}</td>
                            <td className="p-4 text-right">
                              {entry.numberOfBottles?.toLocaleString()}
                            </td>
                            <td className="p-4 text-right">
                              {entry.numberOfTrays?.toLocaleString()}
                            </td>
                            <td className="p-4 text-right">{entry.cavity?.toLocaleString()}</td>
                            <td className="p-4 text-right">
                              {entry.totalQuantity?.toLocaleString()}
                            </td>
                            <td className="p-4 text-right font-medium">
                              {formatDate(entry.primaryOutwardExpectedDate)}
                            </td>
                            <td className="p-4 text-right">{entry.laboursEngaged}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Outward Details */}
              {outward.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <ArrowRightIcon className="h-5 w-5 text-green-500 mr-2" />
                    Outward Entries
                  </h3>
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left p-4 text-sm font-medium text-gray-600">Date</th>
                          <th className="text-left p-4 text-sm font-medium text-gray-600">Size</th>
                          <th className="text-right p-4 text-sm font-medium text-gray-600">
                            Bottles
                          </th>
                          <th className="text-right p-4 text-sm font-medium text-gray-600">
                            Plants
                          </th>
                          <th className="text-left p-4 text-sm font-medium text-gray-600">
                            Rooting Date
                          </th>
                          <th className="text-right p-4 text-sm font-medium text-gray-600">Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {outward.map((entry) => {
                          const rootingDays = Math.ceil(
                            (new Date(entry.outwardDate) - new Date(entry.rootingDate)) /
                              (1000 * 60 * 60 * 24)
                          )
                          return (
                            <tr key={entry._id} className="border-t border-gray-100">
                              <td className="p-4 text-gray-600">
                                {new Date(entry.outwardDate).toLocaleDateString()}
                              </td>
                              <td className="p-4">{entry.size}</td>
                              <td className="p-4 text-right">{entry.bottles?.toLocaleString()}</td>
                              <td className="p-4 text-right">{entry.plants?.toLocaleString()}</td>
                              <td className="p-4 text-gray-600">
                                {new Date(entry.rootingDate).toLocaleDateString()}
                              </td>
                              <td className="p-4 text-right">{rootingDays}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
export default BatchDetails
