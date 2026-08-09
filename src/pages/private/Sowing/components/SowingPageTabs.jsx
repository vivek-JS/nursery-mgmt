import React from "react"
import { Box, Card, Tab, Tabs, Typography } from "@mui/material"
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded"
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded"
import AnalyticsIcon from "@mui/icons-material/Analytics"
import AssignmentLateIcon from "@mui/icons-material/AssignmentLate"

const TAB_META = [
  { id: "request", label: "Request & sow", icon: LocalFloristRoundedIcon },
  { id: "pending", label: "Pending orders", icon: AssignmentLateIcon },
  { id: "surplus", label: "Surplus stock", icon: Inventory2RoundedIcon },
  { id: "advanced", label: "Gap analytics", icon: AnalyticsIcon },
]

function TabLabel({ label, Icon, badge }) {
  return (
    <Box display="flex" alignItems="center" gap={0.75}>
      <Icon sx={{ fontSize: 18 }} />
      <Typography component="span" variant="body2" fontWeight={700}>
        {label}
      </Typography>
      {badge != null && badge > 0 && (
        <Box
          component="span"
          sx={{
            ml: 0.25,
            px: 0.75,
            py: 0.15,
            borderRadius: 999,
            bgcolor: "#dcfce7",
            color: "#166534",
            fontSize: "0.7rem",
            fontWeight: 800,
            lineHeight: 1.4,
          }}
        >
          {badge}
        </Box>
      )}
    </Box>
  )
}

export default function SowingPageTabs({
  tab,
  onTabChange,
  surplusSlotCount = 0,
  pendingOrderCount = 0,
  requestPanel,
  pendingPanel,
  surplusPanel,
  advancedPanel,
}) {
  const panels = [requestPanel, pendingPanel, surplusPanel, advancedPanel]

  return (
    <Card sx={{ mb: 3, boxShadow: 2, overflow: "visible" }}>
      <Tabs
        value={tab}
        onChange={(_, v) => onTabChange(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "#fafafa",
          "& .MuiTab-root": { textTransform: "none", minHeight: 52 },
        }}
      >
        {TAB_META.map((t, i) => (
          <Tab
            key={t.id}
            label={
              <TabLabel
                label={t.label}
                Icon={t.icon}
                badge={
                  t.id === "surplus"
                    ? surplusSlotCount
                    : t.id === "pending"
                      ? pendingOrderCount
                      : null
                }
              />
            }
          />
        ))}
      </Tabs>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {panels.map((panel, i) => (
          <Box
            key={TAB_META[i]?.id || i}
            sx={{ display: tab === i ? "block" : "none" }}
            aria-hidden={tab !== i}
          >
            {panel}
          </Box>
        ))}
      </Box>
    </Card>
  )
}

export { TAB_META }
