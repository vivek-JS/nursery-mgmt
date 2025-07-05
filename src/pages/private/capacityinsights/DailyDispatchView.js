import React from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress
} from "@mui/material"
import {
  CalendarToday as CalendarIcon,
  CheckCircleOutline as CheckIcon,
  ErrorOutline as WarningIcon,
  LocalFlorist as PlantIcon
} from "@mui/icons-material"
import { format } from "date-fns"
import CapacityBar from "./CapacityBar"
import CapacityChart from "./CapacityChart"

/**
 * Daily dispatch view component
 *
 * @param {Object} props - Component props
 * @param {Array} props.dailyDispatch - Array of daily dispatch data
 * @returns {JSX.Element} Daily dispatch view component
 */
const DailyDispatchView = ({ dailyDispatch }) => {
  // Group all days by date
  const groupedByDate = {}

  dailyDispatch.forEach((day) => {
    if (!groupedByDate[day.date]) {
      groupedByDate[day.date] = {
        date: day.date,
        plants: [],
        totalFarmReady: 0,
        totalCapacity: 0
      }
    }

    groupedByDate[day.date].plants.push({
      plantId: day.plantId,
      plantName: day.plantName,
      dailyCapacity: day.dailyCapacity,
      farmReadyPlants: day.farmReadyPlants,
      capacityUtilization: day.capacityUtilization,
      status: day.status,
      subtypes: day.subtypesArray
    })

    groupedByDate[day.date].totalFarmReady += day.farmReadyPlants
    groupedByDate[day.date].totalCapacity += day.dailyCapacity
  })

  // Convert to array and sort by date
  const sortedDays = Object.values(groupedByDate).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  )

  // Prepare data for chart
  const chartData = sortedDays.map((day) => ({
    date: day.date,
    farmReady: day.totalFarmReady,
    capacity: day.totalCapacity,
    utilization: (day.totalFarmReady / day.totalCapacity) * 100,
    status: day.totalFarmReady > day.totalCapacity ? "OVER_CAPACITY" : "UNDER_CAPACITY"
  }))

  return (
    <Box>
      {/* Trend Chart */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Daily Dispatch Capacity Trend
        </Typography>

        <Box sx={{ height: 300 }}>
          <CapacityChart
            data={chartData}
            type="line"
            dataKeys={[
              { key: "farmReady", name: "Farm Ready Plants", color: "#8884d8" },
              { key: "capacity", name: "Capacity", color: "#82ca9d" },
              { key: "utilization", name: "Utilization (%)", color: "#ff7300" }
            ]}
          />
        </Box>
      </Card>

      {/* Daily Cards */}
      {sortedDays.map((day) => (
        <Card
          key={day.date}
          sx={{
            mb: 3,
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
            borderLeft: 3,
            borderColor: day.totalFarmReady > day.totalCapacity ? "error.main" : "success.main"
          }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 2
              }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 1,
                    bgcolor: "primary.light",
                    borderRadius: 1,
                    mr: 2
                  }}>
                  <CalendarIcon sx={{ color: "primary.main" }} />
                </Box>
                <Typography variant="h6">
                  {format(new Date(day.date), "EEEE, MMMM dd, yyyy")}
                </Typography>
              </Box>

              <Chip
                icon={day.totalFarmReady > day.totalCapacity ? <WarningIcon /> : <CheckIcon />}
                label={day.totalFarmReady > day.totalCapacity ? "Over Capacity" : "Under Capacity"}
                color={day.totalFarmReady > day.totalCapacity ? "error" : "success"}
              />
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Capacity
                  </Typography>
                  <Typography variant="h6">{day.totalCapacity.toLocaleString()}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Farm Ready
                  </Typography>
                  <Typography variant="h6">{day.totalFarmReady.toLocaleString()}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Utilization
                  </Typography>
                  <Typography
                    variant="h6"
                    color={day.totalFarmReady > day.totalCapacity ? "error.main" : "success.main"}>
                    {((day.totalFarmReady / day.totalCapacity) * 100).toFixed(2)}%
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <CapacityBar used={day.totalFarmReady} total={day.totalCapacity} height={10} />

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Plant Breakdown
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: "grey.50" }}>
                  <TableRow>
                    <TableCell>Plant</TableCell>
                    <TableCell align="right">Capacity</TableCell>
                    <TableCell align="right">Farm Ready</TableCell>
                    <TableCell align="right">Utilization</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {day.plants.map((plant) => (
                    <TableRow
                      key={plant.plantId}
                      sx={{
                        "&:last-child td, &:last-child th": { border: 0 },
                        bgcolor: plant.status === "OVER_CAPACITY" ? "error.lightest" : "inherit"
                      }}>
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <PlantIcon fontSize="small" sx={{ mr: 1, color: "primary.main" }} />
                          <Typography>{plant.plantName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{plant.dailyCapacity.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Typography
                          fontWeight={plant.status === "OVER_CAPACITY" ? "bold" : "regular"}
                          color={plant.status === "OVER_CAPACITY" ? "error.main" : "inherit"}>
                          {plant.farmReadyPlants.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{plant.capacityUtilization}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            plant.status === "UNDER_CAPACITY" ? "Under Capacity" : "Over Capacity"
                          }
                          size="small"
                          color={plant.status === "UNDER_CAPACITY" ? "success" : "error"}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Subtype Breakdown Expansion */}
            {day.plants.some((plant) => plant.subtypes && plant.subtypes.length > 0) && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  Subtype Distribution
                </Typography>

                <Grid container spacing={2}>
                  {day.plants.map((plant) =>
                    plant.subtypes.map((subtype) => (
                      <Grid
                        item
                        xs={12}
                        sm={6}
                        md={4}
                        key={`${plant.plantId}-${subtype.subtypeId}`}>
                        <Paper sx={{ p: 2, height: "100%" }}>
                          <Typography variant="subtitle2" gutterBottom>
                            {plant.plantName} - {subtype.subtypeName}
                          </Typography>
                          <Typography
                            variant="h6"
                            color={subtype.farmReadyPlants > 0 ? "primary.main" : "text.secondary"}>
                            {subtype.farmReadyPlants.toLocaleString()} plants
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {((subtype.farmReadyPlants / plant.farmReadyPlants) * 100).toFixed(1)}%
                            of plant type
                          </Typography>

                          <Box sx={{ mt: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(
                                100,
                                (subtype.farmReadyPlants / plant.farmReadyPlants) * 100
                              )}
                              color="primary"
                              sx={{ height: 4, borderRadius: 1 }}
                            />
                          </Box>
                        </Paper>
                      </Grid>
                    ))
                  )}
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      ))}

      {sortedDays.length === 0 && (
        <Card sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body1">
            No daily dispatch data available for the selected date range.
          </Typography>
        </Card>
      )}
    </Box>
  )
}

export default DailyDispatchView
