import React from "react"
import { Chip, Stack } from "@mui/material"

const SOURCE_SX = {
  COMPANY: { bgcolor: "#e3f2fd", color: "#1565c0", label: "Company" },
  RAISING: { bgcolor: "#fff3e0", color: "#e65100", label: "Customer seed" },
  MIXED: { bgcolor: "#f3e5f5", color: "#6a1b9a", label: "Mixed" },
}

export default function SeedPlanChip({ seedSource, companyPackets, raisingPackets, size = "small" }) {
  const src = SOURCE_SX[seedSource] || SOURCE_SX.COMPANY
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      <Chip size={size} label={src.label} sx={{ ...src, fontWeight: 600, height: 22 }} />
      {Number(companyPackets) > 0 && (
        <Chip size={size} label={`${Number(companyPackets)} co.`} variant="outlined" sx={{ height: 22 }} />
      )}
      {Number(raisingPackets) > 0 && (
        <Chip size={size} label={`${Number(raisingPackets)} cust.`} variant="outlined" sx={{ height: 22 }} />
      )}
    </Stack>
  )
}
