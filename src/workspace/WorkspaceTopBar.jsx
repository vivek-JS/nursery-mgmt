import React from "react"
import { Box, Stack, Typography } from "@mui/material"
import WorkspaceSwitcher from "./WorkspaceSwitcher"
import { useWorkspace } from "./WorkspaceContext"
import { useUserData } from "utils/roleUtils"
import { canUseWorkspaceSwitch, isAgriLockedRole } from "./agriAccess"

/**
 * Compact top bar so Biotech↔Agri switch is reachable from biotech mode too.
 */
export default function WorkspaceTopBar() {
  const user = useUserData()
  const { isAgriMode } = useWorkspace()
  const show =
    canUseWorkspaceSwitch(user) || isAgriLockedRole(user) || isAgriMode

  if (!show) return null
  // Hub + AgriModeChrome already show switcher in agri deep links / hub
  if (isAgriMode) return null

  return (
    <Box
      sx={{
        mb: 1.5,
        mx: { xs: 1, sm: 2 },
        px: 2,
        py: 1,
        borderRadius: 2,
        bgcolor: "#f0fdf4",
        border: "1px solid #bbf7d0",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        justifyContent="space-between"
        spacing={1}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 13, color: "#166534" }}>
          Workspace
        </Typography>
        <WorkspaceSwitcher />
      </Stack>
    </Box>
  )
}
