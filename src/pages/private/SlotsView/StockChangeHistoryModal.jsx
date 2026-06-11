import React, { useEffect, useState, useMemo } from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  CircularProgress
} from "@mui/material"
import { History, Package, Activity } from "lucide-react"
import { API, NetworkManager } from "network/core"
import { Toast } from "helpers/toasts/toastHelper"
import moment from "moment"

const STOCK_ACTIONS = [
  "ACTUAL_PLANTS_UPDATED",
  "CLOSING_STOCK_UPDATED",
  "AVAILABLE_PLANTS_UPDATED"
]

const fieldLabel = (action) => {
  if (action === "ACTUAL_PLANTS_UPDATED") return "Actual Plants"
  if (action === "CLOSING_STOCK_UPDATED") return "Closing Stock"
  if (action === "AVAILABLE_PLANTS_UPDATED") return "Available"
  return action
}

const StockChangeHistoryModal = ({ open, onClose, slot }) => {
  const [trail, setTrail] = useState([])
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState("all")

  useEffect(() => {
    if (open && slot?._id) {
      fetchTrail()
    } else {
      setTrail([])
      setTab("all")
    }
  }, [open, slot?._id])

  const fetchTrail = async () => {
    try {
      setLoading(true)
      const instance = NetworkManager(API.SLOTS.GET_SLOT_TRAIL)
      const response = await instance.request(
        {},
        { pathParams: [slot._id], types: "stock" }
      )
      if (response?.data?.success) {
        setTrail(response.data.data || [])
      } else {
        Toast.error("Failed to load change history")
      }
    } catch (error) {
      console.error("Error fetching stock trail:", error)
      Toast.error("Failed to load change history")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    if (tab === "actual") {
      return trail.filter((e) => e.action === "ACTUAL_PLANTS_UPDATED")
    }
    if (tab === "closing") {
      return trail.filter((e) => e.action === "CLOSING_STOCK_UPDATED")
    }
    if (tab === "available") {
      return trail.filter((e) => e.action === "AVAILABLE_PLANTS_UPDATED")
    }
    return trail.filter((e) => STOCK_ACTIONS.includes(e.action))
  }, [trail, tab])

  const getPrevious = (entry) => {
    const meta = entry.metadata || {}
    if (meta.previousValue !== undefined) return meta.previousValue
    if (entry.action === "ACTUAL_PLANTS_UPDATED") {
      return entry.before?.actualPlants ?? 0
    }
    if (entry.action === "AVAILABLE_PLANTS_UPDATED") {
      return entry.before?.availablePlants ?? entry.previousAvailablePlants ?? 0
    }
    return entry.before?.closingStock ?? 0
  }

  const getNew = (entry) => {
    const meta = entry.metadata || {}
    if (meta.newValue !== undefined) return meta.newValue
    if (entry.action === "ACTUAL_PLANTS_UPDATED") {
      return entry.after?.actualPlants ?? 0
    }
    if (entry.action === "AVAILABLE_PLANTS_UPDATED") {
      return entry.after?.availablePlants ?? entry.newAvailablePlants ?? 0
    }
    return entry.after?.closingStock ?? 0
  }

  const performerName = (entry) => {
    if (entry.performedBy?.name) return entry.performedBy.name
    if (typeof entry.performedBy === "string") return entry.performedBy
    return "—"
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center gap-2">
        <History className="h-5 w-5 text-teal-600" />
        Stock change history
        {slot?.startDay && slot?.endDay && (
          <span className="text-sm font-normal text-gray-500 ml-1">
            ({slot.startDay} – {slot.endDay})
          </span>
        )}
      </DialogTitle>
      <DialogContent dividers>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="All" value="all" />
          <Tab label="Actual Plants" value="actual" icon={<Package className="h-3.5 w-3.5" />} iconPosition="start" />
          <Tab label="Closing Stock" value="closing" icon={<Activity className="h-3.5 w-3.5" />} iconPosition="start" />
          <Tab label="Available" value="available" icon={<Package className="h-3.5 w-3.5" />} iconPosition="start" />
        </Tabs>

        {loading ? (
          <Box className="flex justify-center py-12">
            <CircularProgress size={32} />
          </Box>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">No stock changes recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-semibold uppercase text-gray-600">
                  <th className="px-3 py-2">Date / time</th>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2 text-right">Previous</th>
                  <th className="px-3 py-2 text-right">New</th>
                  <th className="px-3 py-2">Changed by</th>
                  <th className="px-3 py-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry, idx) => (
                  <tr key={entry._id || idx} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                      {entry.createdAt
                        ? moment(entry.createdAt).format("DD MMM YYYY, h:mm A")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {fieldLabel(entry.action)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {Number(getPrevious(entry)).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-teal-700">
                      {Number(getNew(entry)).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{performerName(entry)}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{entry.reason || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

export default StockChangeHistoryModal
