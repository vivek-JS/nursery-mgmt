import React from "react"
import { useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import { Box, Typography, Card, CardContent, Avatar } from "@mui/material"
import { Agriculture as PlantIcon, Inventory2 as InventoryIcon } from "@mui/icons-material"

const C = {
  primary: "#5B5FC7",
  gradient: "linear-gradient(135deg, #5B5FC7 0%, #8B5CF6 100%)",
  gradientSoft: "linear-gradient(135deg, #EEF0FF 0%, #F5F0FF 100%)",
  bg: "#F7F8FC",
  textPrimary: "#1A1D2E",
  textSecondary: "#6B7185",
  border: "#E8EBF0",
  green: "#22C55E",
  greenBg: "#ECFDF5",
}

/**
 * Mobile dashboard at /u/mobile — two buttons: Agri Input (Agri sales) and Plant order.
 * DEALER/SALES land here after login; they choose one to go to agri-sales-order or place-order.
 */
function MobileDashboard() {
  const navigate = useNavigate()
  const userData = useSelector((state) => state?.userData?.userData)
  const appUser = useSelector((state) => state?.app?.user)
  const user = userData || appUser || {}
  const userName = user?.name || user?.firstName || "User"
  const userInitial = (userName || "U").charAt(0).toUpperCase()

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: C.bg, width: "100%", maxWidth: "100vw" }}>
      <Box sx={{ background: C.gradient, px: 2, py: 2, boxShadow: "0 4px 20px rgba(91,95,199,0.25)" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 44, height: 44, bgcolor: "rgba(255,255,255,0.2)", fontSize: "1.1rem", fontWeight: 800, border: "2px solid rgba(255,255,255,0.4)" }}>
            {userInitial}
          </Avatar>
          <Box>
            <Typography sx={{ color: "white", fontWeight: 800, fontSize: "1.05rem" }}>{userName}</Typography>
            <Typography sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem" }}>Mobile Dashboard</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", px: 2, py: 4 }}>
        <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: C.textPrimary, mb: 3, textAlign: "center" }}>
          What would you like to do?
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%", maxWidth: 320 }}>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "2px solid",
              borderColor: C.primary,
              overflow: "hidden",
              cursor: "pointer",
              "&:active": { bgcolor: C.gradientSoft },
            }}
            onClick={() => navigate("/u/mobile/place-order", { state: { orderMode: "plant" } })}>
            <CardContent sx={{ py: 2.5, px: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 52, height: 52, borderRadius: 2, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PlantIcon sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: C.textPrimary }}>Plant Order</Typography>
                <Typography sx={{ fontSize: "0.78rem", color: C.textSecondary }}>Nursery plants (farmer / dealer)</Typography>
              </Box>
            </CardContent>
          </Card>
          <Card
            elevation={0}
            sx={{
              borderRadius: 3,
              border: "2px solid",
              borderColor: C.border,
              overflow: "hidden",
              cursor: "pointer",
              "&:active": { bgcolor: "#f5f5f5" },
            }}
            onClick={() => navigate("/u/mobile/agri-sales-order")}>
            <CardContent sx={{ py: 2.5, px: 2, display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: 52, height: 52, borderRadius: 2, bgcolor: C.greenBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <InventoryIcon sx={{ fontSize: 28, color: C.green }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: C.textPrimary }}>Agri Input</Typography>
                <Typography sx={{ fontSize: "0.78rem", color: C.textSecondary }}>Agri sales / Ram Agri products</Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  )
}

export default MobileDashboard
