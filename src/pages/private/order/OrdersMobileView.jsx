import React from "react"
import { useNavigate } from "react-router-dom"
import { Box, Typography, IconButton } from "@mui/material"
import { ArrowBack as ArrowBackIcon, Add as AddIcon } from "@mui/icons-material"
import FarmerOrdersTable from "../dashboard/FarmerOrdersTable"

/**
 * Mobile-only order view (Android-style UI).
 * No sidebar; full-screen layout with top app bar.
 * Route: /u/orders/mobile
 */
function OrdersMobileView() {
  const navigate = useNavigate()

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f5",
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
      }}>
      {/* Top app bar - Android style */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 1100,
          flexShrink: 0,
          background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
          boxShadow: "0 2px 12px rgba(234, 88, 12, 0.25)",
          WebkitTapHighlightColor: "transparent",
        }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1.5,
            py: 1.25,
            gap: 1,
            minHeight: 56,
          }}>
          <IconButton
            onClick={() => navigate("/u/dashboard")}
            size="medium"
            sx={{
              color: "white",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.3)" },
              "&:active": { backgroundColor: "rgba(255, 255, 255, 0.25)" },
              p: 1,
            }}
            aria-label="Back">
            <ArrowBackIcon sx={{ fontSize: "1.25rem" }} />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h6"
              sx={{
                color: "white",
                fontSize: "1.1rem",
                fontWeight: 700,
                lineHeight: 1.2,
              }}>
              Orders
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.7rem" }}>
              Ram Agri
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Content - full width, no sidebar */}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          maxWidth: "100%",
          overflow: "auto",
          WebkitOverflowScrolling: "touch",
          pb: 2,
        }}>
        <FarmerOrdersTable standaloneMobile defaultAgriView />
      </Box>
    </Box>
  )
}

export default OrdersMobileView
