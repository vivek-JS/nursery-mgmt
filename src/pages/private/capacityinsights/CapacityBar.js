import React from "react"
import { Box, Typography, LinearProgress } from "@mui/material"

/**
 * Capacity utilization bar component
 *
 * @param {Object} props - Component props
 * @param {number} props.used - The amount used or consumed
 * @param {number} props.total - The total available capacity
 * @param {number} props.height - Height of the progress bar in pixels
 * @param {number} props.warning - Percentage threshold for warning state
 * @param {number} props.danger - Percentage threshold for danger state
 * @param {boolean} props.showLabel - Whether to show usage labels
 * @returns {JSX.Element} Capacity bar component
 */
const CapacityBar = ({ used, total, height = 8, warning = 90, danger = 100, showLabel = true }) => {
  const percentage = total > 0 ? Math.min(Math.round((used / total) * 100), 100) : 0
  const isOverCapacity = used > total
  const color = isOverCapacity
    ? "error"
    : percentage >= danger
    ? "error"
    : percentage >= warning
    ? "warning"
    : percentage > 70
    ? "info"
    : "success"

  return (
    <Box sx={{ width: "100%" }}>
      {showLabel && (
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {used.toLocaleString()} / {total.toLocaleString()}
          </Typography>
          <Typography
            variant="caption"
            fontWeight={isOverCapacity ? "bold" : "regular"}
            color={isOverCapacity ? "error.main" : "text.secondary"}>
            {percentage}%{isOverCapacity ? ` (${Math.round((used / total) * 100)}%)` : ""}
          </Typography>
        </Box>
      )}
      <Box sx={{ position: "relative" }}>
        <LinearProgress
          variant="determinate"
          value={percentage}
          color={color}
          sx={{ height, borderRadius: 1 }}
        />
        {isOverCapacity && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 1,
              background:
                "repeating-linear-gradient(45deg, rgba(255,0,0,0.1), rgba(255,0,0,0.1) 10px, rgba(255,0,0,0.2) 10px, rgba(255,0,0,0.2) 20px)",
              opacity: 0.6
            }}
          />
        )}
      </Box>
    </Box>
  )
}

export default CapacityBar
