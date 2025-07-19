import React, { useEffect, useState } from "react"
import {
  ChevronDown,
  ChevronUp,
  Leaf,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Package,
  Activity,
  BarChart3,
  Eye,
  EyeOff,
  AlertTriangle,
  TrendingDown,
  Target,
  Users,
  Plus,
  X,
  MoreHorizontal
} from "lucide-react"
import {
  Tabs,
  Tab,
  Box,
  Card,
  CardContent,
  Modal,
  Backdrop,
  Fade,
  IconButton,
  Tooltip,
  Chip
} from "@mui/material"
import { API, NetworkManager } from "network/core"
import { PageLoader } from "components"
import Subtypes from "./Subtypes"

const SlotAccordionView = ({ plantId, year }) => {
  const [selectedSubtype, setSelectedSubtype] = useState(0)
  const [loading, setLoading] = useState(false)
  const [months, setMonths] = useState([])
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedSubtypeData, setSelectedSubtypeData] = useState(null)

  useEffect(() => {
    fetchPlants()
  }, [])

  const fetchPlants = async () => {
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
  }

  // Helper function to calculate percentage (can be over 100% for overbooked)
  const calculatePercentage = (booked, total) => {
    if (total === 0) return booked > 0 ? 100 : 0
    return Math.round((booked / total) * 100)
  }

  // Enhanced helper function to get status color and info including overbooked scenarios
  const getStatusInfo = (percentage, availablePlants) => {
    const isOverbooked = availablePlants < 0 || percentage > 100

    if (isOverbooked) {
      return {
        color: "red",
        status: "Overbooked",
        bg: "bg-red-50",
        border: "border-red-300",
        textColor: "text-red-700",
        progressColor: "bg-red-600",
        icon: AlertTriangle
      }
    }

    if (percentage >= 90)
      return {
        color: "orange",
        status: "Critical",
        bg: "bg-orange-50",
        border: "border-orange-200",
        textColor: "text-orange-700",
        progressColor: "bg-orange-500",
        icon: AlertCircle
      }
    if (percentage >= 70)
      return {
        color: "yellow",
        status: "High",
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        textColor: "text-yellow-700",
        progressColor: "bg-yellow-500",
        icon: TrendingUp
      }
    if (percentage >= 50)
      return {
        color: "blue",
        status: "Medium",
        bg: "bg-blue-50",
        border: "border-blue-200",
        textColor: "text-blue-700",
        progressColor: "bg-blue-500",
        icon: Activity
      }
    if (percentage >= 30)
      return {
        color: "indigo",
        status: "Low",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        textColor: "text-indigo-700",
        progressColor: "bg-indigo-500",
        icon: TrendingDown
      }
    return {
      color: "green",
      status: "Available",
      bg: "bg-green-50",
      border: "border-green-200",
      textColor: "text-green-700",
      progressColor: "bg-green-500",
      icon: CheckCircle
    }
  }

  const openSubtypeDetails = (subtype) => {
    setSelectedSubtypeData(subtype)
    setDetailModalOpen(true)
  }

  const StatCard = ({ icon: Icon, label, value, color, subtitle, isNegative = false }) => (
    <div
      className={`p-4 rounded-xl ${
        isNegative
          ? "bg-red-50 border-l-4 border-red-400"
          : color === "green"
          ? "bg-green-50 border-l-4 border-green-400"
          : color === "blue"
          ? "bg-blue-50 border-l-4 border-blue-400"
          : "bg-gray-50 border-l-4 border-gray-400"
      }`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{label}</p>
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
            {value.toLocaleString()}
          </p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon
          className={`w-8 h-8 ${
            isNegative
              ? "text-red-500"
              : color === "green"
              ? "text-green-500"
              : color === "blue"
              ? "text-blue-500"
              : "text-gray-500"
          }`}
        />
      </div>
    </div>
  )

  const ProgressRing = ({ percentage, size = 120, availablePlants }) => {
    const radius = (size - 20) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference

    // Cap percentage at 100% for visual display, but show actual value
    const displayPercentage = Math.min(percentage, 100)
    const strokeDashoffset = circumference - (displayPercentage / 100) * circumference
    const statusInfo = getStatusInfo(percentage, availablePlants)
    const isOverbooked = availablePlants < 0 || percentage > 100

    return (
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className={`text-${statusInfo.color}-500 transition-all duration-1000 ease-in-out ${
              isOverbooked ? "animate-pulse" : ""
            }`}
            strokeLinecap="round"
          />
          {/* Additional ring for overbooked indication */}
          {isOverbooked && (
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
          <span className={`text-xs font-medium ${statusInfo.textColor} flex items-center`}>
            {isOverbooked && <AlertTriangle className="w-3 h-3 mr-1" />}
            {statusInfo.status}
          </span>
        </div>
      </div>
    )
  }

  // Subtype Detail Modal
  const SubtypeDetailModal = () => {
    if (!selectedSubtypeData) return null

    const totalCapacity =
      selectedSubtypeData?.totalPlants + selectedSubtypeData?.totalBookedPlants || 0
    const availablePlants = selectedSubtypeData?.totalPlants || 0
    const bookedPlants = selectedSubtypeData?.totalBookedPlants || 0
    const bookedPercentage = calculatePercentage(bookedPlants, totalCapacity)
    const statusInfo = getStatusInfo(bookedPercentage, availablePlants)
    const isOverbooked = availablePlants < 0 || bookedPercentage > 100

    return (
      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500
        }}>
        <Fade in={detailModalOpen}>
          <Box
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "95%",
              maxWidth: "1200px",
              height: "90%",
              bgcolor: "background.paper",
              borderRadius: "16px",
              boxShadow: 24,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column"
            }}>
            {/* Modal Header */}
            <div className={`p-6 border-b ${isOverbooked ? "bg-red-50" : "bg-blue-50"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-xl ${isOverbooked ? "bg-red-500" : "bg-blue-500"}`}>
                    {isOverbooked ? (
                      <AlertTriangle className="w-6 h-6 text-white" />
                    ) : (
                      <Leaf className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedSubtypeData?.subtypeName}
                    </h3>
                    <p className="text-gray-600">Detailed Slot Management</p>
                  </div>
                  {isOverbooked && (
                    <Chip
                      icon={<AlertTriangle className="w-3 h-3" />}
                      label="OVERBOOKED"
                      size="small"
                      color="error"
                      variant="filled"
                    />
                  )}
                </div>
                <IconButton onClick={() => setDetailModalOpen(false)}>
                  <X className="w-6 h-6" />
                </IconButton>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Available Plants</p>
                        <p
                          className={`text-2xl font-bold ${
                            availablePlants < 0 ? "text-red-600" : "text-green-600"
                          }`}>
                          {availablePlants.toLocaleString()}
                        </p>
                      </div>
                      <Package
                        className={`w-8 h-8 ${
                          availablePlants < 0 ? "text-red-500" : "text-green-500"
                        }`}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Booked Plants</p>
                        <p className="text-2xl font-bold text-blue-600">{bookedPlants}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Capacity</p>
                        <p className="text-2xl font-bold text-gray-900">{totalCapacity}</p>
                      </div>
                      <Target className="w-8 h-8 text-gray-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Subtypes Component */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-blue-500" />
                    Slot Management
                  </h4>
                </div>
                <div className="overflow-auto">
                  <Subtypes
                    plantId={plantId}
                    plantSubId={selectedSubtypeData.subtypeId}
                    year={year}
                  />
                </div>
              </div>
            </div>
          </Box>
        </Fade>
      </Modal>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <SubtypeDetailModal />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Plant Slots Overview</h1>
              <p className="text-gray-600">
                Monitor and manage your plant slot capacity and bookings
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Year {year}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <PageLoader />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Subtypes Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                    fontSize: "1rem",
                    minHeight: "70px",
                    padding: "16px 24px"
                  },
                  "& .Mui-selected": {
                    color: "#3b82f6"
                  }
                }}>
                {months?.subtypes?.map((subtype, index) => {
                  const totalCapacity = subtype?.totalPlants + subtype?.totalBookedPlants || 0
                  const availablePlants = subtype?.totalPlants || 0
                  const bookedPlants = subtype?.totalBookedPlants || 0
                  const bookedPercentage = calculatePercentage(bookedPlants, totalCapacity)
                  const isOverbooked = availablePlants < 0 || bookedPercentage > 100

                  return (
                    <Tab
                      key={subtype?.subtypeId}
                      label={
                        <div className="flex flex-col items-center">
                          <div className="flex items-center space-x-2">
                            <span>{subtype?.subtypeName}</span>
                            {isOverbooked && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {totalCapacity.toLocaleString()} capacity • {bookedPercentage}%
                          </div>
                        </div>
                      }
                      sx={{
                        "&.Mui-selected": {
                          backgroundColor: isOverbooked ? "#fef2f2" : "#eff6ff"
                        }
                      }}
                    />
                  )
                })}
              </Tabs>
            </div>

            {/* Selected Subtype Content */}
            {months?.subtypes?.[selectedSubtype] && (
              <div className="space-y-6">
                {(() => {
                  const subtype = months.subtypes[selectedSubtype]
                  const totalCapacity = subtype?.totalPlants + subtype?.totalBookedPlants || 0
                  const availablePlants = subtype?.totalPlants || 0
                  const bookedPlants = subtype?.totalBookedPlants || 0
                  const bookedPercentage = calculatePercentage(bookedPlants, totalCapacity)
                  const statusInfo = getStatusInfo(bookedPercentage, availablePlants)
                  const isOverbooked = availablePlants < 0 || bookedPercentage > 100

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Subtype Overview Card */}
                      <Card className={`${isOverbooked ? "ring-2 ring-red-200" : ""}`}>
                        <CardContent className={`p-6 ${isOverbooked ? "bg-red-50" : ""}`}>
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                              <div
                                className={`p-3 rounded-xl ${
                                  isOverbooked
                                    ? "bg-gradient-to-r from-red-400 to-red-600"
                                    : "bg-gradient-to-r from-green-400 to-green-600"
                                }`}>
                                {isOverbooked ? (
                                  <AlertTriangle className="w-6 h-6 text-white" />
                                ) : (
                                  <Leaf className="w-6 h-6 text-white" />
                                )}
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                  {subtype?.subtypeName}
                                </h3>
                                <div className="flex items-center space-x-2 mt-1">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      isOverbooked
                                        ? "bg-red-100 text-red-800"
                                        : `bg-${statusInfo.color}-100 text-${statusInfo.color}-800`
                                    }`}>
                                    {statusInfo.status}
                                  </span>
                                  {isOverbooked && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                                      OVERBOOKED
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <ProgressRing
                                percentage={bookedPercentage}
                                size={80}
                                availablePlants={availablePlants}
                              />
                              <Tooltip title="View Detailed Slots">
                                <IconButton onClick={() => openSubtypeDetails(subtype)}>
                                  <Eye className="w-5 h-5" />
                                </IconButton>
                              </Tooltip>
                            </div>
                          </div>

                          {/* Stats Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <StatCard
                              icon={Package}
                              label="Available"
                              value={availablePlants}
                              color="green"
                              subtitle={availablePlants < 0 ? "Overbooked" : "Ready"}
                              isNegative={availablePlants < 0}
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
                              label="Rate"
                              value={bookedPercentage}
                              color={isOverbooked ? "red" : "gray"}
                              subtitle={`${bookedPercentage}%`}
                              isNegative={isOverbooked}
                            />
                          </div>

                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-gray-700">
                                Capacity Utilization
                              </span>
                              <span className={`text-sm font-bold ${statusInfo.textColor}`}>
                                {bookedPercentage}%{isOverbooked && " (OVERBOOKED)"}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                  isOverbooked
                                    ? "bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
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
                              {/* Overflow indicator */}
                              {isOverbooked && (
                                <div
                                  className="h-full bg-gradient-to-r from-red-600 to-red-700 opacity-75"
                                  style={{ width: `${Math.min(bookedPercentage - 100, 20)}%` }}
                                />
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              Total Capacity: {totalCapacity.toLocaleString()}
                            </div>
                            <button
                              onClick={() => openSubtypeDetails(subtype)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm">
                              Manage Slots
                            </button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Quick Stats Summary */}
                      <Card>
                        <CardContent className="p-6">
                          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                            Quick Overview
                          </h4>

                          <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Plant Type</span>
                              <span className="font-medium text-gray-900">
                                {subtype?.subtypeName}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Status</span>
                              <span className={`font-medium ${statusInfo.textColor}`}>
                                {statusInfo.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Available Plants</span>
                              <span
                                className={`font-medium ${
                                  availablePlants < 0 ? "text-red-600" : "text-green-600"
                                }`}>
                                {availablePlants.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-100">
                              <span className="text-sm text-gray-600">Booked Plants</span>
                              <span className="font-medium text-blue-600">{bookedPlants}</span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                              <span className="text-sm text-gray-600">Utilization Rate</span>
                              <div className="flex items-center space-x-2">
                                <span className={`font-medium ${statusInfo.textColor}`}>
                                  {bookedPercentage}%
                                </span>
                                {isOverbooked && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => openSubtypeDetails(subtype)}
                              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors font-medium text-sm">
                              View Detailed Slots
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Empty State */}
            {months?.subtypes?.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-white rounded-2xl p-12 shadow-lg border-2 border-dashed border-gray-200">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                    <Leaf className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Subtypes Available
                  </h3>
                  <p className="text-gray-600 mb-6">
                    There are no subtypes available for this plant at the moment.
                  </p>
                  <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                    Add New Subtype
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SlotAccordionView
