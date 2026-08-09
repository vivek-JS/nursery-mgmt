import React from "react"
import { Box, Divider, Typography } from "@mui/material"
import SubtypeDirectSowPanel from "../admin-direct-sow/SubtypeDirectSowPanel"
import { todayYmd } from "../admin-direct-sow/directSowUtils"

export default function PendingSubtypeSowSection({ group, canEdit = false, onSowed }) {
  if (!canEdit || !group) return null

  return (
    <Box sx={{ px: 1.5, pb: 1.5, bgcolor: "#f0fdf4" }}>
      <Divider sx={{ mb: 1.5 }} />
      <Typography variant="caption" fontWeight={800} color="#166534" display="block" mb={1}>
        Bulk sow by delivery day · plants go to ready-date slot
      </Typography>
      <SubtypeDirectSowPanel
        group={group}
        sowDate={todayYmd()}
        onSowed={onSowed}
      />
    </Box>
  )
}
