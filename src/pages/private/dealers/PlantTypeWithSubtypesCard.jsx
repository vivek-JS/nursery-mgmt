// PlantTypeWithSubtypesCard Component
// Add this after the WalletUtilization component
import React, { useState } from "react"
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Divider,
  Tooltip,
  IconButton
} from "@mui/material"
import {
  Park as EcoIcon,
  ArrowDropDown as ArrowDropDownIcon,
  ArrowDropUp as ArrowDropUpIcon
} from "@mui/icons-material"
import { WalletUtilization } from "./DelaerDetails"
const PlantTypeWithSubtypesCard = ({ plantType, subtypes }) => {
  const [expanded, setExpanded] = useState(false)
  const filteredSubtypes = subtypes.filter((st) => st.plantTypeId === plantType.plantTypeId)

  // Helper function to get a color based on plant name
  const getPlantColor = (plantName) => {
    const colors = ["primary", "success", "info", "warning", "error", "secondary"]

    // Handle undefined or null plantName
    if (!plantName || typeof plantName !== "string") {
      return colors[0] // Return primary color as default
    }

    // Simple hash function to assign consistent colors
    const hash = plantName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  return (
    <Card
      sx={{
        height: "100%",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
        transition: "transform 0.2s",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)"
        }
      }}>
      <CardContent sx={{ pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
          <Avatar
            sx={{
              bgcolor: `${getPlantColor(plantType.plantTypeName)}.light`,
              mr: 2
            }}>
            <EcoIcon sx={{ color: `${getPlantColor(plantType.plantTypeName)}.main` }} />
          </Avatar>
          <Typography variant="h6" noWrap sx={{ maxWidth: "70%" }}>
            {plantType.plantTypeName}
          </Typography>
          <Tooltip title={expanded ? "Hide subtypes" : "Show subtypes"}>
            <IconButton size="small" sx={{ ml: "auto" }} onClick={() => setExpanded(!expanded)}>
              {expanded ? (
                <ArrowDropUpIcon fontSize="small" />
              ) : (
                <ArrowDropDownIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
        </Box>

        <Typography variant="h3" component="div" sx={{ mt: 2, fontWeight: "bold" }}>
          {plantType.totalQuantity.toLocaleString()}
        </Typography>

        <Box sx={{ mt: 1 }}>
          <WalletUtilization used={plantType.totalBookedQuantity} total={plantType.totalQuantity} />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Chip
            label={`${plantType.dealerCount} ${plantType.dealerCount === 1 ? "Dealer" : "Dealers"}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={`${plantType.totalRemainingQuantity.toLocaleString()} Available`}
            size="small"
            color="success"
            variant="outlined"
          />
        </Box>

        {expanded && filteredSubtypes.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ my: 1 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Subtypes ({filteredSubtypes.length})
            </Typography>
            {filteredSubtypes.map((subtype) => (
              <Box key={subtype.subTypeId} sx={{ mb: 2 }}>
                <Box
                  sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body2" fontWeight={500}>
                    {subtype.subTypeName}
                  </Typography>
                  <Typography variant="caption">
                    {subtype.totalQuantity.toLocaleString()}
                  </Typography>
                </Box>
                <WalletUtilization
                  used={subtype.totalBookedQuantity}
                  total={subtype.totalQuantity}
                />
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
export default PlantTypeWithSubtypesCard
