import React from "react"
import { Box, Card, CardContent, Typography, Chip } from "@mui/material"

/**
 * Summary card for displaying key statistics
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Card title
 * @param {string|number} props.value - Primary value to display
 * @param {string} props.secondaryValue - Secondary/supporting text
 * @param {JSX.Element} props.icon - Icon to display
 * @param {string} props.color - Color theme for the card
 * @param {string} props.status - Status indicator (e.g., "OVER_CAPACITY", "UNDER_CAPACITY")
 * @param {string} props.chipText - Text to display in the status chip
 * @returns {JSX.Element} Summary card component
 */
const SummaryCard = ({ title, value, secondaryValue, icon, color, status, chipText }) => {
  return (
    <Card sx={{ height: "100%", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
      <CardContent>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1,
                bgcolor: `${color}.light`,
                borderRadius: 1,
                mr: 2
              }}>
              {icon}
            </Box>
            <Typography variant="subtitle2" color="text.secondary">
              {title}
            </Typography>
          </Box>
          {chipText && (
            <Chip
              label={chipText}
              color={status === "OVER_CAPACITY" ? "error" : "success"}
              size="small"
            />
          )}
        </Box>
        <Typography variant="h4" fontWeight="bold">
          {typeof value === "number" ? value.toLocaleString() : value}
        </Typography>
        {secondaryValue && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {secondaryValue}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

export default SummaryCard
