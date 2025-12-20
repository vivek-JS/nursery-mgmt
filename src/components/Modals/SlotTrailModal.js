import React, { useState, useEffect } from "react"
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material"
import { NetworkManager, API } from "../../network/core"
import { History, TrendingUp, TrendingDown, Shield, RotateCcw, Package, User } from "lucide-react"
import { Toast } from "../../helpers/toasts/toastHelper"
import moment from "moment"

const SlotTrailModal = ({ open, onClose, slotId, slotInfo }) => {
  const [trail, setTrail] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && slotId) {
      fetchSlotTrail()
    }
  }, [open, slotId])

  const fetchSlotTrail = async () => {
    try {
      setLoading(true)
      console.log("Fetching slot trail for slotId:", slotId)
      console.log("API endpoint:", API.SLOTS.GET_SLOT_TRAIL)

      const instance = NetworkManager(API.SLOTS.GET_SLOT_TRAIL)
      console.log("NetworkManager instance created")

      const response = await instance.request({}, [slotId])
      console.log("API response:", response)

      if (response.data?.success) {
        setTrail(response.data.data)
        console.log("Trail data set:", response.data.data)
      } else {
        console.error("API response not successful:", response)
        Toast.error("Failed to load slot trail")
      }
    } catch (error) {
      console.error("Error fetching slot trail:", error)
      Toast.error("Failed to load slot trail")
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action) => {
    switch (action) {
      case "ADD":
        return <TrendingUp className="text-green-600" size={16} />
      case "SUBTRACT":
        return <TrendingDown className="text-red-600" size={16} />
      case "BUFFER_APPLIED":
        return <Shield className="text-blue-600" size={16} />
      case "BUFFER_RELEASED":
        return <RotateCcw className="text-orange-600" size={16} />
      case "ORDER_CANCELLED":
      case "ORDER_RETURNED":
        return <Package className="text-purple-600" size={16} />
      default:
        return <History className="text-gray-600" size={16} />
    }
  }

  const getActionColor = (action) => {
    switch (action) {
      case "ADD":
        return "text-green-600 bg-green-50 border-green-200"
      case "SUBTRACT":
        return "text-red-600 bg-red-50 border-red-200"
      case "BUFFER_APPLIED":
        return "text-blue-600 bg-blue-50 border-blue-200"
      case "BUFFER_RELEASED":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "ORDER_CANCELLED":
      case "ORDER_RETURNED":
        return "text-purple-600 bg-purple-50 border-purple-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const formatQuantity = (action, quantity) => {
    if (action === "ADD") {
      return `+${quantity.toLocaleString()}`
    } else if (action === "SUBTRACT") {
      return `-${quantity.toLocaleString()}`
    }
    return quantity.toLocaleString()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        className: "max-h-[90vh] overflow-y-auto"
      }}>
      <DialogTitle className="bg-blue-50 border-b border-blue-100 flex items-center gap-2">
        <History className="text-blue-600" size={24} />
        <span className="text-blue-800">Slot Trail History</span>
      </DialogTitle>

      <DialogContent className="space-y-4 mt-4">
        {/* Slot Info Summary */}
        {slotInfo && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Slot Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Period:</span>
                <div className="font-medium">
                  {slotInfo.startDay} - {slotInfo.endDay}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Total Capacity:</span>
                <div className="font-medium">{slotInfo.totalPlants?.toLocaleString()} plants</div>
              </div>
              <div>
                <span className="text-gray-500">Available:</span>
                <div className="font-medium">
                  {slotInfo.availablePlants?.toLocaleString()} plants
                </div>
              </div>
              <div>
                <span className="text-gray-500">Buffer:</span>
                <div className="font-medium">
                  {slotInfo.effectiveBuffer || slotInfo.buffer || 0}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trail Entries */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : trail.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Activity History</h3>
            {trail.map((entry, index) => {
              // Safely handle undefined/null values
              const action = entry?.action || entry?.activityName || "UNKNOWN";
              const activityName = entry?.activityName || action;
              const quantity = entry?.quantity || 0;
              const reason = entry?.reason || "No reason provided";
              const notes = entry?.notes || "";
              const createdAt = entry?.createdAt ? moment(entry.createdAt) : moment();
              const previousAvailablePlants = entry?.previousAvailablePlants ?? entry?.before?.availablePlants ?? 0;
              const newAvailablePlants = entry?.newAvailablePlants ?? entry?.after?.availablePlants ?? 0;
              const bufferPercentage = entry?.bufferPercentage ?? 0;
              const bufferAmount = entry?.bufferAmount ?? 0;
              const performedBy = entry?.performedBy;
              const orderId = entry?.orderId;

              return (
                <div key={index} className={`border rounded-lg p-4 ${getActionColor(action)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getActionIcon(action)}
                      <span className="font-medium capitalize">
                        {(activityName || action || "Unknown").replace(/_/g, " ").toLowerCase()}
                      </span>
                      <span className="text-sm font-bold">
                        {formatQuantity(action, quantity)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {createdAt.isValid() ? createdAt.format("DD/MM/YYYY HH:mm") : "N/A"}
                    </span>
                  </div>

                  <div className="text-sm mb-2">
                    <p className="font-medium">{reason}</p>
                    {notes && <p className="text-gray-600 mt-1">{notes}</p>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Previous Available:</span>
                      <div className="font-medium">
                        {previousAvailablePlants?.toLocaleString() || "0"}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">New Available:</span>
                      <div className="font-medium">{newAvailablePlants?.toLocaleString() || "0"}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Buffer:</span>
                      <div className="font-medium">
                        {bufferPercentage}% ({bufferAmount?.toLocaleString() || "0"})
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500">Performed By:</span>
                      <div className="font-medium flex items-center gap-1">
                        <User size={12} />
                        {performedBy?.name || "System"}
                      </div>
                    </div>
                  </div>

                  {orderId && (
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">Order ID:</span>
                      <span className="font-medium ml-1">#{orderId}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <History className="text-gray-400 mx-auto mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Trail History</h3>
            <p className="text-gray-500">No activity has been recorded for this slot yet.</p>
          </div>
        )}
      </DialogContent>

      <DialogActions className="bg-gray-50 px-6 py-4">
        <Button
          onClick={onClose}
          variant="outlined"
          className="border-gray-300 text-gray-700 hover:bg-gray-50">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default SlotTrailModal
