import React from "react"
import { Chip, Stack } from "@mui/material"

const SOURCE_SX = {
  COMPANY: { bgcolor: "#e3f2fd", color: "#1565c0", label: "Company" },
  RAISING: { bgcolor: "#fff3e0", color: "#e65100", label: "Customer seed" },
  MIXED: { bgcolor: "#f3e5f5", color: "#6a1b9a", label: "Mixed" },
  RAISING_PENDING: { bgcolor: "#fff7ed", color: "#c2410c", label: "Farmer seed · not collected" },
}

export default function SeedPlanChip({
  seedSource,
  companyPackets,
  raisingPackets,
  collected = true,
  size = "small",
}) {
  const srcKey =
    (seedSource === "RAISING" || seedSource === "MIXED") && !collected
      ? "RAISING_PENDING"
      : seedSource
  const src = SOURCE_SX[srcKey] || SOURCE_SX.COMPANY
  const showRaisingPkts = collected && Number(raisingPackets) > 0
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      <Chip size={size} label={src.label} sx={{ ...src, fontWeight: 600, height: 22 }} />
      {Number(companyPackets) > 0 && (
        <Chip size={size} label={`${Number(companyPackets)} co.`} variant="outlined" sx={{ height: 22 }} />
      )}
      {showRaisingPkts && (
        <Chip size={size} label={`${Number(raisingPackets)} cust.`} variant="outlined" sx={{ height: 22 }} />
      )}
    </Stack>
  )
}
