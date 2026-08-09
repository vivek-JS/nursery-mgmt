import React, { useState } from "react"
import { Box, Typography, Button, IconButton, Alert } from "@mui/material"
import { Add as AddIcon, Refresh as RefreshIcon, LocalFlorist } from "@mui/icons-material"
import { Link as RouterLink } from "react-router-dom"
import ExcessiveSowingModal from "components/Modals/ExcessiveSowingModal"
import EasyRequestPanel from "./components/EasyRequestPanel"
import CompletedSowingEntries from "./components/CompletedSowingEntries"
import SlotStockPanel from "./components/excess-allocation/SlotStockPanel"
import SowingPageTabs from "./components/SowingPageTabs"
import { SowHorizonProvider } from "./components/SowHorizonContext"

export default function SowingGapAnalysis() {
  const [tab, setTab] = useState(0)
  const [excessiveSowingModalOpen, setExcessiveSowingModalOpen] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [surplusSlotCount, setSurplusSlotCount] = useState(0)

  const bumpRefresh = () => setRefreshToken((n) => n + 1)

  return (
    <Box p={3} sx={{ bgcolor: "#f5f5f5", minHeight: "100vh" }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <LocalFlorist sx={{ fontSize: 32, color: "#0f766e" }} />
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 800, color: "#0f766e" }}>
              Sowing Gap Analysis
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Requests · orders · sowing entry · completed history
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            color="success"
            startIcon={<AddIcon />}
            onClick={() => setExcessiveSowingModalOpen(true)}
            sx={{ fontWeight: 600, textTransform: "none", boxShadow: 2 }}
          >
            Create Excessive Sowing
          </Button>
          <IconButton
            onClick={bumpRefresh}
            color="primary"
            sx={{ bgcolor: "#e3f2fd", "&:hover": { bgcolor: "#bbdefb" } }}
          >
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <SowingPageTabs
        tab={tab}
        onTabChange={setTab}
        surplusSlotCount={surplusSlotCount}
        requestPanel={
          <SowHorizonProvider defaultDays={0}>
            <EasyRequestPanel refreshToken={refreshToken} embedded />
          </SowHorizonProvider>
        }
        surplusPanel={
          <SlotStockPanel
            refreshToken={refreshToken}
            onLoaded={({ slotCount, totalAvailable }) => {
              setSurplusSlotCount(
                Number(totalAvailable) > 0 ? slotCount : 0
              )
            }}
          />
        }
        advancedPanel={
          <Alert severity="info" sx={{ mb: 0 }}>
            Booking gap charts and plant-level analytics moved here.{" "}
            <Button
              size="small"
              component={RouterLink}
              to="/u/sowing-booking-gap-analysis"
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Open gap analytics
            </Button>
          </Alert>
        }
      />

      <CompletedSowingEntries refreshToken={refreshToken} />

      <ExcessiveSowingModal
        open={excessiveSowingModalOpen}
        onClose={() => setExcessiveSowingModalOpen(false)}
        onSuccess={bumpRefresh}
      />
    </Box>
  )
}
