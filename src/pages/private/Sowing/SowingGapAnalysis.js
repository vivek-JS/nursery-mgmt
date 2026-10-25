import React, { useRef, useState } from "react"
import { Box, Typography, Button, IconButton } from "@mui/material"
import { Add as AddIcon, Refresh as RefreshIcon, LocalFlorist } from "@mui/icons-material"
import WhatsAppIcon from "@mui/icons-material/WhatsApp"
import ExcessiveSowingModal from "components/Modals/ExcessiveSowingModal"
import EasyRequestPanel from "./components/EasyRequestPanel"
import CompletedSowingEntries from "./components/CompletedSowingEntries"
import UnsownSowBoard from "./components/UnsownSowBoard"
import SowingSowBatchStockTab from "./components/SowingSowBatchStockTab"
import SowingPageTabs from "./components/SowingPageTabs"
import { SowHorizonProvider } from "./components/SowHorizonContext"
import SowAllTable from "./components/SowAllTable"
import { useIsOfficeAdmin, useIsSuperAdmin } from "utils/roleUtils"

export default function SowingGapAnalysis() {
  const canSow = useIsSuperAdmin() || useIsOfficeAdmin()
  const [tab, setTab] = useState(0)
  const [excessiveSowingModalOpen, setExcessiveSowingModalOpen] = useState(false)
  const [sowAllOpen, setSowAllOpen] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const requestPanelRef = useRef(null)

  const bumpRefresh = () => setRefreshToken((n) => n + 1)

  const openWhatsAppAll = () => {
    setTab(0)
    requestPanelRef.current?.openWhatsAppAll?.()
  }

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
              Request & sow · sowing entries · not sown · stock
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Button
            variant="contained"
            disableElevation
            startIcon={<WhatsAppIcon />}
            onClick={openWhatsAppAll}
            sx={{
              fontWeight: 800,
              textTransform: "none",
              bgcolor: "#16a34a",
              "&:hover": { bgcolor: "#15803d" },
            }}
          >
            WhatsApp sow needed
          </Button>
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

      <SowAllTable
        open={sowAllOpen}
        onClose={() => setSowAllOpen(false)}
        refreshToken={refreshToken}
        onSowed={bumpRefresh}
      />

      <SowingPageTabs
        tab={tab}
        onTabChange={setTab}
        requestPanel={
          <SowHorizonProvider defaultDays={0}>
            <EasyRequestPanel
              ref={requestPanelRef}
              refreshToken={refreshToken}
              embedded
              onSowAll={canSow ? () => setSowAllOpen(true) : null}
            />
          </SowHorizonProvider>
        }
        entriesPanel={<CompletedSowingEntries refreshToken={refreshToken} />}
        unsownPanel={<UnsownSowBoard refreshToken={refreshToken} />}
        stockPanel={<SowingSowBatchStockTab refreshToken={refreshToken} />}
      />

      <ExcessiveSowingModal
        open={excessiveSowingModalOpen}
        onClose={() => setExcessiveSowingModalOpen(false)}
        onSuccess={bumpRefresh}
      />
    </Box>
  )
}
