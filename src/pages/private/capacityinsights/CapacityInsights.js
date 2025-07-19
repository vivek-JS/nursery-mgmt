import React, { useState, useEffect } from "react"
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  Button,
  Alert,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from "@mui/material"
import { DatePicker } from "@mui/x-date-pickers/DatePicker"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import {
  Refresh as RefreshIcon,
  Dashboard as DashboardIcon,
  LocalFlorist as PlantIcon,
  ViewAgenda as TimelineIcon,
  Print as PrintIcon,
  FileDownload as DownloadIcon,
  CalendarToday as CalendarIcon
} from "@mui/icons-material"

// Import components
import DashboardView from "./DashboardView"
import PlantView from "./PlantView"
import DailyDispatchView from "./DailyDispatchView"

// Import services and utilities
import LoadingState from "./LoadingState"
import capacityService from "./capacityService"
import dateUtils from "./dateUtils"

/**
 * Main capacity insights container component
 */
const CapacityInsights = () => {
  // State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)) // 2 weeks ahead
  const [capacityData, setCapacityData] = useState(null)
  const [viewMode, setViewMode] = useState("dashboard") // dashboard, plantView, dailyView
  const [expandedPlants, setExpandedPlants] = useState({})
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // Available years
  const availableYears = [2025, 2026]

  // Fetch data when dates change
  useEffect(() => {
    fetchCapacityData()
  }, [startDate, endDate])

  /**
   * Set date range for specific year
   */
  const setYearRange = (year) => {
    setSelectedYear(year)
    setStartDate(new Date(year, 0, 1)) // January 1st
    setEndDate(new Date(year, 11, 31)) // December 31st
  }

  /**
   * Fetch capacity data from API
   */
  const fetchCapacityData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Format dates for API
      const formattedStartDate = dateUtils.formatForApi(startDate)
      const formattedEndDate = dateUtils.formatForApi(endDate)

      // Call API
      const data = await capacityService.getCapacityStats(formattedStartDate, formattedEndDate)
      setCapacityData(data)

      // Auto-expand plants with issues
      const newExpandedState = {}
      if (data.plants && data.plants.length > 0) {
        data.plants.forEach((plant) => {
          if (plant.slotStatus === "OVER_CAPACITY") {
            newExpandedState[plant.plantId] = true
          }
        })
      }
      setExpandedPlants(newExpandedState)
    } catch (error) {
      console.error("Error fetching capacity data:", error)
      setError("Failed to load capacity data. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle export of capacity data
   */
  const handleExport = () => {
    if (!capacityData) return

    capacityService.exportCapacityData(
      capacityData,
      dateUtils.formatForApi(startDate),
      dateUtils.formatForApi(endDate)
    )
  }

  /**
   * Handle viewing specific plant details
   *
   * @param {string} plantId - ID of plant to view
   */
  const handleViewPlant = (plantId) => {
    setViewMode("plantView")
    setExpandedPlants({
      ...expandedPlants,
      [plantId]: true
    })
  }

  /**
   * Handle viewing specific day details
   *
   * @param {string} date - Date to view
   */
  const handleViewDay = (date) => {
    setViewMode("dailyView")
  }

  // Show loading state while fetching data
  if (loading) {
    return <LoadingState message="Loading capacity data..." />
  }

  // Show error message if there's an error
  if (error) {
    return (
      <Container maxWidth={false} sx={{ py: 3 }}>
        <Alert
          severity="error"
          sx={{ m: 3 }}
          action={
            <Button color="inherit" size="small" onClick={fetchCapacityData}>
              Retry
            </Button>
          }>
          {error}
        </Alert>
      </Container>
    )
  }

  // Return null if no data is available
  if (!capacityData) {
    return null
  }

  // Extract data from API response
  const { overallStats, plants, dailyDispatchByDate } = capacityData

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      {/* Dashboard Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Typography variant="h4" sx={{ mb: 1, fontWeight: "bold" }}>
              Plant Capacity Insights
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Analyze slot capacity and farm-ready orders with comprehensive insights
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                justifyContent: { xs: "flex-start", md: "flex-end" }
              }}>
              <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>
                Print
              </Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
                Export
              </Button>
              <Button variant="contained" startIcon={<RefreshIcon />} onClick={fetchCapacityData}>
                Refresh
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Date Range Selection */}
      <Card sx={{ mb: 4, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <CalendarIcon sx={{ mr: 2, color: "primary.main" }} />
              <Typography variant="subtitle1">Select Date Range</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Choose the period to analyze slot capacity versus farm-ready orders
            </Typography>
          </Grid>
          <Grid item xs={12} sm={8}>
            {/* Year Selection */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Quick Year Selection:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                {availableYears.map((year) => (
                  <Button
                    key={year}
                    variant={selectedYear === year ? "contained" : "outlined"}
                    size="small"
                    onClick={() => setYearRange(year)}>
                    {year}
                  </Button>
                ))}
              </Box>
            </Box>

            {/* Custom Date Range */}
            <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={(newValue) => setStartDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                />
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={(newValue) => setEndDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                  minDate={startDate}
                />
              </LocalizationProvider>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const today = new Date()
                    setStartDate(today)
                    setEndDate(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000))
                  }}>
                  Next Week
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    const today = new Date()
                    setStartDate(today)
                    setEndDate(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000))
                  }}>
                  Next 2 Weeks
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* View Mode Selector */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Button
          variant={viewMode === "dashboard" ? "contained" : "outlined"}
          startIcon={<DashboardIcon />}
          onClick={() => setViewMode("dashboard")}>
          Dashboard
        </Button>
        <Button
          variant={viewMode === "plantView" ? "contained" : "outlined"}
          startIcon={<PlantIcon />}
          onClick={() => setViewMode("plantView")}>
          Plant View
        </Button>
        <Button
          variant={viewMode === "dailyView" ? "contained" : "outlined"}
          startIcon={<TimelineIcon />}
          onClick={() => setViewMode("dailyView")}>
          Daily View
        </Button>
      </Box>

      {/* Alert for Issues */}
      {overallStats.dailyDispatch.overCapacityDays > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => setViewMode("dailyView")}>
              View Details
            </Button>
          }>
          <Typography variant="subtitle2">Capacity Issues Detected</Typography>
          <Typography variant="body2">
            {overallStats.dailyDispatch.overCapacityDays} days exceed daily dispatch capacity. This
            may cause operational bottlenecks.
          </Typography>
        </Alert>
      )}

      {/* Main Content Based on View Mode */}
      {viewMode === "dashboard" && (
        <DashboardView
          overallStats={overallStats}
          plants={plants}
          dailyDispatchByDate={dailyDispatchByDate}
          onViewPlant={handleViewPlant}
          onViewDaily={handleViewDay}
        />
      )}

      {/* Plant View */}
      {viewMode === "plantView" && (
        <PlantView
          plants={plants}
          expandedState={expandedPlants}
          setExpandedState={setExpandedPlants}
        />
      )}

      {/* Daily View */}
      {viewMode === "dailyView" && <DailyDispatchView dailyDispatch={dailyDispatchByDate} />}
    </Container>
  )
}

export default CapacityInsights
