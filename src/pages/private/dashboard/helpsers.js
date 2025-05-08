import moment from "moment"
import React from "react"
const getStatusColor = (status) => {
  switch (status) {
    case "ACCEPTED":
      return "bg-green-100 text-green-700"
    case "PENDING":
      return "bg-yellow-100 text-yellow-700"
    case "REJECTED":
    case "CANCELLED":
      return "bg-red-100 text-red-700"
    case "DISPATCHED":
    case "PROCESSING":
      return "bg-blue-100 text-blue-700"
    case "COMPLETED":
      return "bg-gray-100 text-gray-700"
    case "FARM_READY":
      return "bg-amber-100 text-amber-700"
    default:
      return "bg-gray-50 text-gray-600"
  }
}
export const renderStatusHistory = (statusChanges) => {
  if (!statusChanges || statusChanges.length === 0) {
    return <div className="p-2 text-sm">No status history available</div>
  }

  return (
    <div className="p-3 max-w-md">
      <h3 className="font-medium text-gray-800 mb-2">Status History</h3>
      <div className="max-h-60 overflow-y-auto">
        {statusChanges.map((change, index) => (
          <div key={index} className="mb-3 border-b pb-2 last:border-0">
            <div className="flex justify-between items-start mb-1">
              <div>
                <span
                  className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                    change.newStatus
                  )}`}>
                  {change.newStatus}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  from{" "}
                  <span className={`px-1 rounded ${getStatusColor(change.previousStatus)}`}>
                    {change.previousStatus}
                  </span>
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {change.changedAt ? moment(change.changedAt).format("DD/MM/YY HH:mm") : "N/A"}
              </span>
            </div>
            {change.reason && (
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Reason:</span> {change.reason}
              </div>
            )}
            {change.notes && (
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Notes:</span> {change.notes}
              </div>
            )}
            {change.changedBy && (
              <div className="text-xs text-gray-500 mt-1">
                Changed by: {change.changedBy.name || "Unknown"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export const renderOrderRemarks = (remarks) => {
  if (!remarks || remarks.length === 0) {
    return <div className="p-2 text-sm">No remarks added</div>
  }

  return (
    <div className="p-3 max-w-md">
      <h3 className="font-medium text-gray-800 mb-2">Order Remarks</h3>
      <div className="max-h-60 overflow-y-auto">
        <ul className="space-y-1">
          {remarks.map((remark, index) => (
            <li key={index} className="text-sm text-gray-700 py-1 border-b last:border-0">
              {remark}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export const renderReturnHistory = (returnHistory) => {
  if (!returnHistory || returnHistory.length === 0) {
    return <div className="p-2 text-sm">No returns recorded</div>
  }

  return (
    <div className="p-3 max-w-md">
      <h3 className="font-medium text-gray-800 mb-2">Return History</h3>
      <div className="max-h-60 overflow-y-auto">
        {returnHistory.map((returnItem, index) => (
          <div key={index} className="mb-3 border-b pb-2 last:border-0">
            <div className="flex justify-between items-start mb-1">
              <div className="text-sm font-medium">{returnItem.quantity} plants returned</div>
              <span className="text-xs text-gray-500">
                {returnItem.date ? moment(returnItem.date).format("DD/MM/YY") : "N/A"}
              </span>
            </div>
            {returnItem.reason && (
              <div className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Reason:</span> {returnItem.reason}
              </div>
            )}
            {returnItem.processedBy && (
              <div className="text-xs text-gray-500 mt-1">
                Processed by: {returnItem.processedBy.name || "Unknown"}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
