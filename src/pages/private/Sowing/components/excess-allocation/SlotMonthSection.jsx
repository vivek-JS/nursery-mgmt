import React, { useState } from "react"
import { Box, Button, Chip, Collapse, Grid, Stack, Typography } from "@mui/material"
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"
import SlotStockCard from "./SlotStockCard"
import { fmtNum } from "./slotStockUtils"
import { SLOTS_PAGE_SIZE } from "./slotStockFilters"

export default function SlotMonthSection({
  monthKey,
  monthLabel,
  slots = [],
  canAssign,
  refreshToken,
  onAssign,
  onCoverOrder,
  onSlotTransfer,
  onOpenDetail,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [visible, setVisible] = useState(SLOTS_PAGE_SIZE)

  const shown = slots.slice(0, visible)
  const totalAvail = slots.reduce((s, r) => s + (Number(r.availablePlants) || 0), 0)
  const totalGap = slots.reduce((s, r) => s + (Number(r.gap) || 0), 0)

  return (
    <Box sx={{ mb: 1.5, border: "1px solid #e2e8f0", borderRadius: 1.5, overflow: "hidden" }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: "#f8fafc",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <ExpandMoreIcon
            sx={{
              fontSize: 20,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              color: "#64748b",
            }}
          />
          <Typography fontWeight={800} fontSize="0.9rem">
            {monthLabel}
          </Typography>
        </Stack>
        <Chip
          size="small"
          label={`${fmtNum(totalAvail)} avail · ${fmtNum(totalGap)} gap · ${slots.length} slots`}
          sx={{ fontWeight: 700, bgcolor: "#fff" }}
        />
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ p: 1.25 }}>
          <Grid container spacing={1.25}>
            {shown.map((slot) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={slot.slotId}>
                <SlotStockCard
                  slotId={slot.slotId}
                  slotStartDay={slot.slotStartDay}
                  slotEndDay={slot.slotEndDay}
                  availablePlants={slot.availablePlants}
                  totalBookedPlants={slot.totalBookedPlants}
                  primarySowed={slot.primarySowed}
                  gap={slot.gap}
                  plantName={slot.plantName}
                  subtypeName={slot.subtypeName}
                  plantId={slot.plantId}
                  subtypeId={slot.subtypeId}
                  canAssign={canAssign}
                  refreshKey={refreshToken}
                  onAssign={onAssign}
                  onCoverOrder={onCoverOrder}
                  onSlotTransfer={onSlotTransfer}
                  onOpenDetail={onOpenDetail}
                />
              </Grid>
            ))}
          </Grid>
          {visible < slots.length && (
            <Button
              size="small"
              onClick={() => setVisible((n) => n + SLOTS_PAGE_SIZE)}
              sx={{ mt: 1.25, textTransform: "none", fontWeight: 800 }}
            >
              Show more ({slots.length - visible} remaining)
            </Button>
          )}
        </Box>
      </Collapse>
    </Box>
  )
}
