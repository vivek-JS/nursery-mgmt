import React from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Grid,
  IconButton,
  Collapse
} from "@mui/material"
import {
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowUp as ExpandLessIcon,
  LocalFlorist as PlantIcon
} from "@mui/icons-material"
import CapacityBar from "./CapacityBar"
import SlotTable from "./SlotTable"
import CapacityChart from "./CapacityChart"

/**
 * Expandable plant card component showing plant details
 *
 * @param {Object} props - Component props
 * @param {Object} props.plant - Plant data object
 * @param {Object} props.expandedState - Object tracking expanded state of all plants
 * @param {Function} props.setExpandedState - Function to update expanded state
 * @returns {JSX.Element} Plant card component
 */
const PlantCard = ({ plant, expandedState, setExpandedState }) => {
  const isExpanded = expandedState[plant.plantId] || false

  const toggleExpand = () => {
    setExpandedState((prev) => ({
      ...prev,
      [plant.plantId]: !prev[plant.plantId]
    }))
  }

  const getStatusColor = (status) => (status === "UNDER_CAPACITY" ? "success" : "error")

  return (
    <Card
      sx={{
        mb: 3,
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        borderLeft: 3,
        borderColor: getStatusColor(plant.slotStatus).main
      }}>
      <CardContent sx={{ p: 0 }}>
        {/* Plant Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer"
          }}
          onClick={toggleExpand}>
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
              <PlantIcon sx={{ color: "primary.main" }} />
            </Box>
            <Box>
              <Typography variant="h6">{plant.plantName}</Typography>
              <Typography variant="body2" color="text.secondary">
                Daily Dispatch Capacity: {plant.dailyDispatchCapacity.toLocaleString()} plants
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box sx={{ mr: 2, textAlign: "right" }}>
              <Typography variant="subtitle2" color="text.secondary">
                Slot Utilization
              </Typography>
              <Typography variant="h6" color={getStatusColor(plant.slotStatus).main}>
                {plant.slotCapacityUtilization}
              </Typography>
            </Box>
            <IconButton size="small">
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>
        </Box>

        {/* Capacity Bar */}
        <Box sx={{ px: 2, pb: 2 }}>
          <CapacityBar
            used={plant.totalFarmReadyPlants}
            total={plant.totalSlotsCapacity}
            height={8}
          />
        </Box>

        {/* Expanded Content */}
        <Collapse in={isExpanded}>
          <Divider />

          {/* Subtypes */}
          {plant.subtypesArray.map((subtype) => (
            <Box key={subtype.subtypeId}>
              <Box sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  {subtype.subtypeName}
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Slot Capacity
                      </Typography>
                      <Typography variant="h6">
                        {subtype.totalSlotsCapacity.toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Farm Ready Plants
                      </Typography>
                      <Typography variant="h6">
                        {subtype.totalFarmReadyPlants.toLocaleString()}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Utilization
                      </Typography>
                      <Typography variant="h6" color={getStatusColor(subtype.slotStatus).main}>
                        {subtype.slotCapacityUtilization}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>

                <CapacityBar
                  used={subtype.totalFarmReadyPlants}
                  total={subtype.totalSlotsCapacity}
                />

                {/* Slots Table */}
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                  Slot Breakdown
                </Typography>

                <SlotTable slots={subtype.slots} />
              </Box>
              <Divider />
            </Box>
          ))}

          {/* Daily Statistics */}
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Daily Dispatch Capacity Analysis
            </Typography>

            {/* Daily chart */}
            <Box sx={{ height: 250, mb: 3 }}>
              <CapacityChart
                data={plant.dailyStats}
                type="bar"
                dataKeys={[
                  { key: "farmReadyPlants", name: "Farm Ready Plants", color: "#8884d8" },
                  { key: "dailyCapacity", name: "Daily Capacity", color: "#82ca9d" }
                ]}
                colorByStatus={true}
              />
            </Box>

            {/* Daily stats table */}
            <SlotTable
              slots={plant.dailyStats.map((day) => ({
                slotKey: `${day.date}_${day.plantId}`,
                startDay: day.date.split("-").reverse().join("-"), // Convert YYYY-MM-DD to DD-MM-YYYY format
                endDay: day.date.split("-").reverse().join("-"), // Same day for daily stats
                totalCapacity: day.dailyCapacity,
                farmReadyPlants: day.farmReadyPlants,
                capacityUtilization: day.capacityUtilization,
                status: day.status
              }))}
            />
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  )
}

export default PlantCard
