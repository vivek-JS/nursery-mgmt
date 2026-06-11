import React, { useCallback, useEffect, useState } from "react"
import {
  Leaf,
  CheckCircle,
  TrendingUp,
  Package,
  BarChart3,
  Eye,
  AlertTriangle
} from "lucide-react"
import { Tabs, Tab, Card, CardContent, IconButton, Tooltip } from "@mui/material"
import { API, NetworkManager } from "network/core"
import {
  getTotalCapacity,
  getBookedPlants,
  getSubtypeAvailable,
  getUtilizationPct,
  isSubtypeOverbooked,
  openSlotManageTab
} from "./slotMetrics"

const getStatusInfo = (percentage, availablePlants, overbooked) => {
  if (overbooked) {
    return {
      color: "red",
      status: "Overbooked",
      bg: "bg-red-50",
      textColor: "text-red-700",
      progressColor: "bg-red-600"
    }
  }

  if (percentage >= 90)
    return {
      color: "orange",
      status: "Critical",
      bg: "bg-orange-50",
      textColor: "text-orange-700",
      progressColor: "bg-orange-500"
    }
  if (percentage >= 70)
    return {
      color: "yellow",
      status: "High",
      bg: "bg-yellow-50",
      textColor: "text-yellow-700",
      progressColor: "bg-yellow-500"
    }
  if (percentage >= 50)
    return {
      color: "blue",
      status: "Medium",
      bg: "bg-blue-50",
      textColor: "text-blue-700",
      progressColor: "bg-blue-500"
    }
  if (percentage >= 30)
    return {
      color: "indigo",
      status: "Low",
      bg: "bg-indigo-50",
      textColor: "text-indigo-700",
      progressColor: "bg-indigo-500"
    }
  return {
    color: "green",
    status: "Available",
    bg: "bg-green-50",
    textColor: "text-green-700",
    progressColor: "bg-green-500"
  }
}

const SlotAccordionView = ({ plantId, year }) => {
  const [selectedSubtype, setSelectedSubtype] = useState(0)
  const [loading, setLoading] = useState(false)
  const [months, setMonths] = useState([])

  useEffect(() => {
    setSelectedSubtype(0)
  }, [plantId, year])

  const fetchPlants = useCallback(async () => {
    setLoading(true)
    try {
      const instance = NetworkManager(API.slots.GET_PLANTS_SUBTYPE)
      const response = await instance.request({}, { plantId, year })
      if (response?.data) {
        setMonths(response?.data)
      }
    } catch (error) {
      console.error("Error fetching plants:", error)
    }
    setLoading(false)
  }, [plantId, year])

  useEffect(() => {
    fetchPlants()
  }, [fetchPlants])

  const StatCard = ({ icon: Icon, label, value, color, subtitle, isNegative = false }) => (
    <div
      className={`p-5 rounded-xl border-2 ${
        isNegative
          ? "bg-red-50 border-red-200"
          : color === "green"
          ? "bg-green-50 border-green-200"
          : color === "blue"
          ? "bg-blue-50 border-blue-200"
          : "bg-gray-50 border-gray-200"
      } transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">{label}</p>
          <p
            className={`text-2xl font-bold ${
              isNegative
                ? "text-red-700"
                : color === "green"
                ? "text-green-700"
                : color === "blue"
                ? "text-blue-700"
                : "text-gray-700"
            }`}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isNegative
              ? "bg-red-100"
              : color === "green"
              ? "bg-green-100"
              : color === "blue"
              ? "bg-blue-100"
              : "bg-gray-100"
          }`}>
          <Icon
            className={`w-6 h-6 ${
              isNegative
                ? "text-red-600"
                : color === "green"
                ? "text-green-600"
                : color === "blue"
                ? "text-blue-600"
                : "text-gray-600"
            }`}
          />
        </div>
      </div>
    </div>
  )

  const ProgressRing = ({ percentage, size = 120, availablePlants, overbooked }) => {
    const radius = (size - 20) / 2
    const circumference = 2 * Math.PI * radius
    const displayPercentage = Math.min(percentage, 100)
    const strokeDashoffset = circumference - (displayPercentage / 100) * circumference
    const statusInfo = getStatusInfo(percentage, availablePlants, overbooked)

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={`${statusInfo.progressColor} transition-all duration-1000 ease-in-out ${
              overbooked ? "animate-pulse" : ""
            }`}
            strokeLinecap="round"
          />
          {overbooked && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius - 12}
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray="4 4"
              className="text-red-400 animate-spin"
              style={{ animationDuration: "3s" }}
            />
          )}
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-2xl font-bold ${statusInfo.textColor}`}>{percentage}%</span>
          <span className={`text-xs font-medium ${statusInfo.textColor} flex items-center mt-1`}>
            {overbooked && <AlertTriangle className="w-3 h-3 mr-1" />}
            {statusInfo.status}
          </span>
        </div>
      </div>
    )
  }

  const handleOpenManage = (subtype) => {
    openSlotManageTab(plantId, subtype?.subtypeId, year)
  }

  return (
    <div className="p-6">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Loading subtype data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <Tabs
              value={selectedSubtype}
              onChange={(e, newValue) => setSelectedSubtype(newValue)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                borderBottom: 1,
                borderColor: "divider",
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  minHeight: "80px",
                  padding: "20px 28px"
                },
                "& .Mui-selected": {
                  color: "#2563eb",
                  backgroundColor: "#eff6ff"
                },
                "& .MuiTabs-indicator": {
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  backgroundColor: "#2563eb"
                }
              }}>
              {months?.subtypes?.map((subtype) => {
                const totalCapacity = getTotalCapacity(subtype)
                const bookedPlants = getBookedPlants(subtype)
                const availablePlants = getSubtypeAvailable(subtype)
                const bookedPercentage = getUtilizationPct(bookedPlants, totalCapacity)
                const isOverbooked = isSubtypeOverbooked(subtype)

                return (
                  <Tab
                    key={subtype?.subtypeId}
                    label={
                      <div className="flex flex-col items-start w-full">
                        <div className="flex items-center gap-2 mb-1">
                          <Leaf
                            className={`w-4 h-4 ${isOverbooked ? "text-red-500" : "text-green-500"}`}
                          />
                          <span className="font-semibold">{subtype?.subtypeName}</span>
                          {isOverbooked && (
                            <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                            {totalCapacity.toLocaleString()} total
                          </span>
                          <span
                            className={`font-semibold ${
                              isOverbooked
                                ? "text-red-600"
                                : bookedPercentage > 70
                                ? "text-orange-600"
                                : "text-green-600"
                            }`}>
                            {bookedPercentage}% used
                          </span>
                        </div>
                      </div>
                    }
                  />
                )
              })}
            </Tabs>
          </div>

          {months?.subtypes?.[selectedSubtype] && (
            <div className="space-y-6">
              {(() => {
                const subtype = months.subtypes[selectedSubtype]
                const totalCapacity = getTotalCapacity(subtype)
                const bookedPlants = getBookedPlants(subtype)
                const availablePlants = getSubtypeAvailable(subtype)
                const bookedPercentage = getUtilizationPct(bookedPlants, totalCapacity)
                const isOverbooked = isSubtypeOverbooked(subtype)
                const statusInfo = getStatusInfo(bookedPercentage, availablePlants, isOverbooked)

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <Card
                        className={`${
                          isOverbooked ? "ring-2 ring-red-400 shadow-lg shadow-red-100" : "shadow-md"
                        } rounded-2xl overflow-hidden`}>
                        <CardContent className={`p-6 ${isOverbooked ? "bg-red-50" : "bg-white"}`}>
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                              <div
                                className={`p-4 rounded-2xl shadow-lg ${
                                  isOverbooked
                                    ? "bg-gradient-to-br from-red-400 to-red-600"
                                    : "bg-gradient-to-br from-green-400 to-green-600"
                                }`}>
                                {isOverbooked ? (
                                  <AlertTriangle className="w-7 h-7 text-white" />
                                ) : (
                                  <Leaf className="w-7 h-7 text-white" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                                  {subtype?.subtypeName}
                                </h3>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                      isOverbooked
                                        ? "bg-red-100 text-red-800"
                                        : statusInfo.color === "green"
                                        ? "bg-green-100 text-green-800"
                                        : statusInfo.color === "orange"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}>
                                    {statusInfo.status}
                                  </span>
                                  {isOverbooked && (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                                      OVERBOOKED
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <ProgressRing
                                percentage={bookedPercentage}
                                size={100}
                                availablePlants={availablePlants}
                                overbooked={isOverbooked}
                              />
                              <Tooltip title="Manage slots in new tab" arrow placement="top">
                                <IconButton
                                  onClick={() => handleOpenManage(subtype)}
                                  sx={{
                                    bgcolor: "rgba(59, 130, 246, 0.1)",
                                    "&:hover": { bgcolor: "rgba(59, 130, 246, 0.2)" }
                                  }}>
                                  <Eye className="w-5 h-5 text-blue-600" />
                                </IconButton>
                              </Tooltip>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 mb-5">
                            <StatCard
                              icon={Package}
                              label="Available"
                              value={availablePlants}
                              color="green"
                              subtitle={isOverbooked ? "Overbooked" : "Ready"}
                              isNegative={isOverbooked}
                            />
                            <StatCard
                              icon={CheckCircle}
                              label="Booked"
                              value={bookedPlants}
                              color="blue"
                              subtitle="Reserved"
                            />
                            <StatCard
                              icon={isOverbooked ? AlertTriangle : TrendingUp}
                              label="Utilization"
                              value={bookedPercentage}
                              color={isOverbooked ? "red" : "gray"}
                              subtitle={`${bookedPercentage}% used`}
                              isNegative={isOverbooked}
                            />
                          </div>

                          <div className="mb-5">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-semibold text-gray-700">
                                Capacity Utilization
                              </span>
                              <span className={`text-sm font-bold ${statusInfo.textColor}`}>
                                {bookedPercentage}%{isOverbooked && " (EXCEEDED)"}
                              </span>
                            </div>
                            <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                              <div
                                className={`h-full transition-all duration-1000 ease-out rounded-full ${
                                  isOverbooked
                                    ? "bg-gradient-to-r from-red-500 via-red-600 to-red-700 animate-pulse"
                                    : bookedPercentage >= 90
                                    ? "bg-gradient-to-r from-orange-500 to-orange-600"
                                    : bookedPercentage >= 70
                                    ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                                    : bookedPercentage >= 50
                                    ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                    : bookedPercentage >= 30
                                    ? "bg-gradient-to-r from-indigo-500 to-indigo-600"
                                    : "bg-gradient-to-r from-green-500 to-green-600"
                                }`}
                                style={{ width: `${Math.min(bookedPercentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                            <div className="text-sm text-gray-600">
                              <strong className="text-gray-900">
                                {totalCapacity.toLocaleString()}
                              </strong>{" "}
                              total capacity
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenManage(subtype)}
                              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-semibold text-sm transform hover:-translate-y-0.5">
                              Manage All Slots
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="lg:col-span-1">
                      <Card className="rounded-2xl shadow-md h-full">
                        <CardContent className="p-6">
                          <h4 className="text-lg font-bold text-gray-900 mb-5 flex items-center">
                            <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                            Overview
                          </h4>

                          <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                Subtype
                              </div>
                              <div className="font-bold text-gray-900 text-lg">
                                {subtype?.subtypeName}
                              </div>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                Status
                              </div>
                              <div className={`font-bold text-lg ${statusInfo.textColor}`}>
                                {statusInfo.status}
                              </div>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                              <div className="text-xs text-green-700 uppercase tracking-wide mb-1">
                                Available
                              </div>
                              <div
                                className={`font-bold text-lg ${
                                  isOverbooked ? "text-red-700" : "text-green-700"
                                }`}>
                                {availablePlants.toLocaleString()}
                              </div>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                              <div className="text-xs text-blue-700 uppercase tracking-wide mb-1">
                                Booked
                              </div>
                              <div className="font-bold text-blue-700 text-lg">
                                {bookedPlants.toLocaleString()}
                              </div>
                            </div>

                            <div
                              className={`p-4 bg-gradient-to-br rounded-xl ${
                                isOverbooked
                                  ? "from-red-50 to-red-100"
                                  : "from-indigo-50 to-indigo-100"
                              }`}>
                              <div
                                className={`text-xs uppercase tracking-wide mb-1 ${
                                  isOverbooked ? "text-red-700" : "text-indigo-700"
                                }`}>
                                Rate
                              </div>
                              <div className="flex items-center justify-between">
                                <span className={`font-bold text-lg ${statusInfo.textColor}`}>
                                  {bookedPercentage}%
                                </span>
                                {isOverbooked && <AlertTriangle className="w-5 h-5 text-red-600" />}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <button
                              type="button"
                              onClick={() => handleOpenManage(subtype)}
                              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-semibold text-sm transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {(!months?.subtypes || months?.subtypes?.length === 0) && (
            <div className="text-center py-20">
              <div className="bg-white rounded-3xl p-16 shadow-xl border-2 border-dashed border-gray-300 max-w-2xl mx-auto">
                <div className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <Leaf className="w-14 h-14 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">No Subtypes Available</h3>
                <p className="text-gray-600 mb-8 text-lg">
                  There are no subtypes configured for this plant variety.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SlotAccordionView
