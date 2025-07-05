import React from "react"
import { Box, Button, Typography } from "@mui/material"
import { FilterList as FilterIcon } from "@mui/icons-material"
import PlantCard from "./PlantCard"

/**
 * Plant view component for displaying plants and their details
 *
 * @param {Object} props - Component props
 * @param {Array} props.plants - Array of plant data
 * @param {Object} props.expandedState - Expanded state object
 * @param {Function} props.setExpandedState - Function to update expanded state
 * @returns {JSX.Element} Plant view component
 */
const PlantView = ({ plants, expandedState, setExpandedState }) => {
  return (
    <Box>
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => {
            // Expand all plants
            const allExpanded = {}
            plants.forEach((plant) => {
              allExpanded[plant.plantId] = true
            })
            setExpandedState(allExpanded)
          }}>
          Expand All
        </Button>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => {
            // Expand only plants with issues
            const issuesExpanded = {}
            plants.forEach((plant) => {
              if (plant.slotStatus === "OVER_CAPACITY") {
                issuesExpanded[plant.plantId] = true
              } else {
                issuesExpanded[plant.plantId] = false
              }
            })
            setExpandedState(issuesExpanded)
          }}>
          Show Issues Only
        </Button>
        <Button
          variant="outlined"
          startIcon={<FilterIcon />}
          onClick={() => {
            // Collapse all
            setExpandedState({})
          }}>
          Collapse All
        </Button>
      </Box>

      {plants.map((plant) => (
        <PlantCard
          key={plant.plantId}
          plant={plant}
          expandedState={expandedState}
          setExpandedState={setExpandedState}
        />
      ))}

      {plants.length === 0 && (
        <Box
          sx={{
            p: 4,
            textAlign: "center",
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2
          }}>
          <Typography variant="body1">
            No plant data available for the selected date range.
          </Typography>
        </Box>
      )}
    </Box>
  )
}

export default PlantView
