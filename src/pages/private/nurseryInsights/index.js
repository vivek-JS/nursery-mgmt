import React, { useEffect, useState } from "react"
import { Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material"
import BarChartIcon from "@mui/icons-material/BarChart"

const STORAGE_KEY = "nursery_insights_ui_version"

function normalizeBase(url) {
  if (!url || typeof url !== "string") return ""
  return url.trim().replace(/\/+$/, "")
}

const legacyUrl = normalizeBase(
  process.env.REACT_APP_NURSERY_INSIGHTS_LEGACY_URL || "https://md.rambiotechplants.com"
)
const newUrl = normalizeBase(process.env.REACT_APP_NURSERY_INSIGHTS_NEW_URL) || legacyUrl

export default function NurseryInsightsEmbed() {
  const [mode, setMode] = useState(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      return v === "new" ? "new" : "legacy"
    } catch {
      return "legacy"
    }
  })

  const iframeSrc = mode === "new" ? newUrl : legacyUrl
  const showNewUrlHint =
    Boolean(process.env.REACT_APP_NURSERY_INSIGHTS_NEW_URL) === false && mode === "new"

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  const openExternal = () => window.open(iframeSrc, "_blank", "noopener,noreferrer")

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", minHeight: 420 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
        <BarChartIcon color="primary" />
        <Typography variant="h6" component="h1">
          Nursery insights
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode}
          onChange={(_, value) => value && setMode(value)}
          aria-label="Insights version">
          <ToggleButton value="legacy">Classic</ToggleButton>
          <ToggleButton value="new">New (agri-insights-hub)</ToggleButton>
        </ToggleButtonGroup>
        <Button size="small" variant="outlined" onClick={openExternal}>
          Open in new tab
        </Button>
      </Stack>
      {showNewUrlHint && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 1 }}>
          Set <code>REACT_APP_NURSERY_INSIGHTS_NEW_URL</code> in the nursery-mgmt build to your deployed
          agri-insights-hub URL (for example Cloudflare Workers).
        </Typography>
      )}
      <Box
        sx={{
          flex: 1,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "background.paper"
        }}>
        <iframe title="Nursery insights" src={iframeSrc} style={{ width: "100%", height: "100%", border: "none" }} />
      </Box>
    </Box>
  )
}
