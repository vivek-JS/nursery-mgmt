import React, { useState } from "react"
import { Box, Typography, Button, IconButton } from "@mui/material"
import { Add as AddIcon, Refresh as RefreshIcon, LocalFlorist } from "@mui/icons-material"
import ExcessiveSowingModal from "components/Modals/ExcessiveSowingModal"
import EasyRequestPanel from "./components/EasyRequestPanel"
import CompletedSowingEntries from "./components/CompletedSowingEntries"
import SowingPageTabs from "./components/SowingPageTabs"
import { SowHorizonProvider } from "./components/SowHorizonContext"

export default function SowingGapAnalysis() {
  const [tab, setTab] = useState(0)
  const [excessiveSowingModalOpen, setExcessiveSowingModalOpen] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

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
              Request & sow · sowing entries
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
        requestPanel={
          <SowHorizonProvider defaultDays={0}>
            <EasyRequestPanel refreshToken={refreshToken} embedded />
          </SowHorizonProvider>
        }
        entriesPanel={<CompletedSowingEntries refreshToken={refreshToken} />}
      />

      <ExcessiveSowingModal
        open={excessiveSowingModalOpen}
        onClose={() => setExcessiveSowingModalOpen(false)}
        onSuccess={bumpRefresh}
      />
    </Box>
  )
}
