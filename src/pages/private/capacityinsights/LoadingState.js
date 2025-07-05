import React from "react"
import { Box, CircularProgress, Typography } from "@mui/material"

/**
 * Loading state component with spinner and message
 *
 * @param {Object} props - Component props
 * @param {string} props.message - Loading message to display
 * @returns {JSX.Element} Loading state component
 */
const LoadingState = ({ message = "Loading data..." }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "50vh",
        width: "100%"
      }}>
      <CircularProgress size={60} thickness={4} />
      <Typography variant="body1" sx={{ mt: 3 }}>
        {message}
      </Typography>
    </Box>
  )
}

export default LoadingState
