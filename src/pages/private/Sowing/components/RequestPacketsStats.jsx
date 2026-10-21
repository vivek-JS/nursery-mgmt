import React from "react"
import { Box, Divider, Stack, Typography } from "@mui/material"
import SeedPlanChip from "./SeedPlanChip"

const section = {
  p: 2,
  borderRadius: 1.5,
  bgcolor: "#f0fdfa",
  border: "1px solid #99f6e4",
}

export default function RequestPacketsStats({
  orderCount,
  rawPlants,
  bufferPct,
  mortalityPct,
  packets,
  coveredPlants,
  gapLeft,
  plantsGap,
  coverPct,
  seedSource,
  companyPackets,
  raisingPackets,
  fmt,
}) {
  const items = [
    { label: "Orders", value: fmt(orderCount) },
    { label: "Raw plants", value: fmt(rawPlants) },
    { label: `+buffer ${fmt(bufferPct)}%`, value: fmt(plantsGap) },
    { label: `Mortality ${fmt(mortalityPct)}%`, value: `${fmt(mortalityPct)}%` },
    { label: "Packets", value: `${fmt(packets, 2)} pkt` },
    { label: "Covered", value: fmt(coveredPlants) },
    { label: "Remaining", value: fmt(gapLeft), warn: gapLeft > 0 },
  ]

  return (
    <Box sx={section}>
      <Stack
        direction="row"
        spacing={0}
        divider={<Divider orientation="vertical" flexItem />}
        flexWrap="wrap"
      >
        {items.map((item) => (
          <Box key={item.label} sx={{ flex: "1 1 18%", minWidth: 72, px: 1.25, py: 0.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={500}
              letterSpacing={0.3}
              display="block"
            >
              {item.label}
            </Typography>
            <Typography
              fontWeight={600}
              fontSize="1.05rem"
              color={item.warn ? "warning.dark" : "text.primary"}
            >
              {item.value}
            </Typography>
          </Box>
        ))}
      </Stack>
      <Box
        sx={{
          mt: 1.5,
          height: 4,
          borderRadius: 1,
          bgcolor: "#ccfbf1",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${coverPct}%`,
            bgcolor: "teal",
            transition: "width 0.2s ease",
          }}
        />
      </Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
        mt={1.25}
      >
        <Typography variant="caption" color="text.secondary">
          {coverPct}% of gap covered · buffer on company seed only
        </Typography>
        <SeedPlanChip
          seedSource={seedSource}
          companyPackets={companyPackets}
          raisingPackets={raisingPackets}
        />
      </Stack>
    </Box>
  )
}
