import React from "react"
import { Box, Card, Tab, Tabs, Typography } from "@mui/material"
import LocalFloristRoundedIcon from "@mui/icons-material/LocalFloristRounded"
import ListAltRoundedIcon from "@mui/icons-material/ListAltRounded"

const TAB_META = [
  { id: "request", label: "Request & sow", icon: LocalFloristRoundedIcon },
  { id: "entries", label: "Sowing entries", icon: ListAltRoundedIcon },
]

function TabLabel({ label, Icon }) {
  return (
    <Box display="flex" alignItems="center" gap={0.75}>
      <Icon sx={{ fontSize: 18 }} />
      <Typography component="span" variant="body2" fontWeight={700}>
        {label}
      </Typography>
    </Box>
  )
}

export default function SowingPageTabs({ tab, onTabChange, requestPanel, entriesPanel }) {
  const panels = [requestPanel, entriesPanel]

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
        {TAB_META.map((t) => (
          <Tab key={t.id} label={<TabLabel label={t.label} Icon={t.icon} />} />
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
