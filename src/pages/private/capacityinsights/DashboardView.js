import React from "react"
import {
  Grid,
  Card,
  Typography,
  Box,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Chip
} from "@mui/material"
import {
  BarChart as BarChartIcon,
  ShowChart as LineChartIcon,
  CalendarToday as CalendarIcon,
  LocalFlorist as PlantIcon,
  Warning as WarningIcon
} from "@mui/icons-material"
import { format } from "date-fns"
import SummaryCard from "./SummaryCard"
import CapacityChart from "./CapacityChart"

/**
 * Dashboard overview component
 *
 * @param {Object} props - Component props
 * @param {Object} props.overallStats - Overall statistics
 * @param {Array} props.plants - Plant data
 * @param {Array} props.dailyDispatchByDate - Daily dispatch data
 * @param {Function} props.onViewPlant - Function to handle view plant details
 * @param {Function} props.onViewDaily - Function to handle view daily details
 * @returns {JSX.Element} Dashboard view component
 */
const DashboardView = ({ overallStats, plants, dailyDispatchByDate, onViewPlant, onViewDaily }) => {
  return (
    <>
      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Slot Capacity Stats */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                <BarChartIcon sx={{ mr: 1, color: "primary.main" }} />
                Slot Capacity Insights
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <SummaryCard
                title="Total Slots"
                value={overallStats.slots.total}
                secondaryValue={`${overallStats.slots.overCapacity} over capacity, ${overallStats.slots.underCapacity} under capacity`}
                icon={<BarChartIcon sx={{ color: "primary.main" }} />}
                color="primary"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <SummaryCard
                title="Slot Capacity"
                value={overallStats.slots.totalCapacity.toLocaleString()}
                secondaryValue={`${overallStats.slots.utilizationPercentage} utilized`}
                icon={<BarChartIcon sx={{ color: "success.main" }} />}
                color="success"
                status={overallStats.slots.status}
                chipText={
                  overallStats.slots.status === "UNDER_CAPACITY"
                    ? "Under Capacity"
                    : "Over Capacity"
                }
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Daily Dispatch Stats */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: "flex", alignItems: "center" }}>
                <LineChartIcon sx={{ mr: 1, color: "primary.main" }} />
                Daily Dispatch Insights
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <SummaryCard
                title="Total Days"
                value={overallStats.dailyDispatch.totalDays}
                secondaryValue={`${overallStats.dailyDispatch.overCapacityDays} over capacity, ${overallStats.dailyDispatch.underCapacityDays} under capacity`}
                icon={<CalendarIcon sx={{ color: "info.main" }} />}
                color="info"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <SummaryCard
                title="Dispatch Capacity"
                value={overallStats.dailyDispatch.totalCapacity.toLocaleString()}
                secondaryValue={`${overallStats.dailyDispatch.utilizationPercentage} utilized`}
                icon={
                  <LineChartIcon
                    sx={{
                      color:
                        overallStats.dailyDispatch.status === "UNDER_CAPACITY"
                          ? "success.main"
                          : "error.main"
                    }}
                  />
                }
                color={overallStats.dailyDispatch.status === "UNDER_CAPACITY" ? "success" : "error"}
                status={overallStats.dailyDispatch.status}
                chipText={
                  overallStats.dailyDispatch.status === "UNDER_CAPACITY"
                    ? "Under Capacity"
                    : "Over Capacity"
                }
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Capacity Overview Chart */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Daily Capacity Utilization Trend
        </Typography>

        <Box sx={{ height: 350 }}>
          <CapacityChart
            data={dailyDispatchByDate}
            type="line"
            dataKeys={[
              { key: "farmReadyPlants", name: "Farm Ready Plants", color: "#8884d8" },
              { key: "dailyCapacity", name: "Daily Capacity", color: "#82ca9d" }
            ]}
          />
        </Box>
      </Card>

      {/* Plants Summary */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Plants Capacity Overview
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Plant Name</TableCell>
                <TableCell align="right">Daily Dispatch Capacity</TableCell>
                <TableCell align="right">Total Farm Ready</TableCell>
                <TableCell align="right">Slot Capacity</TableCell>
                <TableCell align="right">Utilization</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plants.map((plant) => (
                <TableRow
                  key={plant.plantId}
                  sx={{
                    "&:last-child td, &:last-child th": { border: 0 },
                    bgcolor: plant.slotStatus === "OVER_CAPACITY" ? "error.lightest" : "inherit"
                  }}>
                  <TableCell component="th" scope="row">
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <PlantIcon sx={{ mr: 1, color: "primary.main" }} />
                      <Typography fontWeight="medium">{plant.plantName}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    {plant.dailyDispatchCapacity.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      fontWeight={plant.slotStatus === "OVER_CAPACITY" ? "bold" : "regular"}
                      color={plant.slotStatus === "OVER_CAPACITY" ? "error.main" : "inherit"}>
                      {plant.totalFarmReadyPlants.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{plant.totalSlotsCapacity.toLocaleString()}</TableCell>
                  <TableCell align="right">{plant.slotCapacityUtilization}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        plant.slotStatus === "UNDER_CAPACITY" ? "Under Capacity" : "Over Capacity"
                      }
                      size="small"
                      color={plant.slotStatus === "UNDER_CAPACITY" ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onViewPlant(plant.plantId)}>
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Critical Days */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 3 }}>
          Capacity Critical Days
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Plant</TableCell>
                <TableCell align="right">Daily Capacity</TableCell>
                <TableCell align="right">Farm Ready</TableCell>
                <TableCell align="right">Over By</TableCell>
                <TableCell align="right">Utilization</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dailyDispatchByDate
                .filter((day) => day.status === "OVER_CAPACITY")
                .sort((a, b) => {
                  // Sort by date first, then by utilization percentage (descending)
                  const dateComp = new Date(a.date) - new Date(b.date)
                  if (dateComp !== 0) return dateComp

                  const aUtil = (a.farmReadyPlants / a.dailyCapacity) * 100
                  const bUtil = (b.farmReadyPlants / b.dailyCapacity) * 100
                  return bUtil - aUtil
                })
                .map((day) => (
                  <TableRow
                    key={`${day.date}_${day.plantId}`}
                    sx={{
                      bgcolor: "error.lightest"
                    }}>
                    <TableCell component="th" scope="row">
                      {format(new Date(day.date), "EEE, MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{day.plantName}</TableCell>
                    <TableCell align="right">{day.dailyCapacity.toLocaleString()}</TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="error.main">
                        {day.farmReadyPlants.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight="bold" color="error.main">
                        {(day.farmReadyPlants - day.dailyCapacity).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{day.capacityUtilization}</TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => onViewDaily(day.date)}>
                        View Day
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

              {dailyDispatchByDate.filter((day) => day.status === "OVER_CAPACITY").length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        py: 2
                      }}>
                      <WarningIcon sx={{ color: "success.main", fontSize: 40, mb: 1 }} />
                      <Typography variant="body1" color="text.secondary">
                        No capacity critical days found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        All days are within dispatch capacity limits
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  )
}

export default DashboardView
