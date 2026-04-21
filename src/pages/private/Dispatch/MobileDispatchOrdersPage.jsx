import React from "react"
import { Box, Typography } from "@mui/material"
import { useSearchParams } from "react-router-dom"
import FarmerOrdersTable from "../dashboard/FarmerOrdersTable"

/**
 * Mobile-friendly entry: dispatch queue (Ready for dispatch) with optional
 * `?qf=farm` to start with "Farm-ready on file" queue filter (matches FarmerOrdersTable toggle).
 */
export default function MobileDispatchOrdersPage() {
  const [searchParams] = useSearchParams()
  const initialQueueFarmReadyOnly = searchParams.get("qf") === "farm"

  return (
    <Box sx={{ p: { xs: 1, sm: 2 }, maxWidth: "100%" }}>
      <Typography variant="h6" sx={{ mb: 1, fontWeight: 700 }}>
        Dispatch queue
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ready-for-dispatch orders. Use <strong>Queue → Farm-ready on file</strong> for FIFO by first farm-ready time.
      </Typography>
      <FarmerOrdersTable
        initialViewMode="ready_for_dispatch"
        initialQueueFarmReadyOnly={initialQueueFarmReadyOnly}
      />
    </Box>
  )
}
