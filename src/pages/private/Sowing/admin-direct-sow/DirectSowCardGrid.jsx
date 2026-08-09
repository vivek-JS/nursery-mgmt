import React, { memo, useMemo, useState, useEffect } from "react"
import { Box, Typography, Grid, Chip, Tabs, Tab, Paper } from "@mui/material"
import DirectSowDayCard from "./DirectSowDayCard"
import DirectSowMonthToolbar from "./DirectSowMonthToolbar"
import { fmtNum, groupDeliveryMonths } from "./directSowUtils"

function DirectSowCardGrid({
  group,
  dayCards = [],
  cardDrafts = {},
  savingKey = null,
  onDraftChange,
  onSow,
  onApplyMonthReadyDays,
  conversionFactor = 1,
  hasSeedProduct = false,
}) {
  const monthGroups = useMemo(
    () => groupDeliveryMonths(group?.orders || [], group?.slots || group?.slotDays || []),
    [group?.orders, group?.slots, group?.slotDays]
  )

  const dayByKey = useMemo(
    () => new Map(dayCards.map((d) => [d.deliveryKey, d])),
    [dayCards]
  )

  const [tab, setTab] = useState(0)

  useEffect(() => {
    setTab(0)
  }, [group?.subtypeId])

  if (!dayCards.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No sow cards for this subtype.
      </Typography>
    )
  }

  const active = monthGroups[tab] || monthGroups[0]
  const activeDays = (active?.days || [])
    .map((d) => dayByKey.get(d.deliveryKey))
    .filter(Boolean)

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          mb: 2,
          bgcolor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 2,
        }}
      >
        <Typography fontWeight={900} fontSize="1rem">
          {group.plantName} · {group.subtypeName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {dayCards.length} sow cards · {fmtNum(group.totalPlants || 0)} plants — ready date =
          sow + plant ready days
        </Typography>
      </Paper>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 1.5,
          minHeight: 40,
          "& .MuiTab-root": { minHeight: 40, py: 0.5, fontWeight: 700, fontSize: "0.8rem" },
        }}
      >
        {monthGroups.map((m, i) => (
          <Tab
            key={m.monthKey}
            label={
              <Box sx={{ textAlign: "left" }}>
                {m.label}
                <Typography component="span" display="block" fontSize="0.62rem" fontWeight={600}>
                  {m.dayCount} days · {fmtNum(m.plants)}
                </Typography>
              </Box>
            }
            value={i}
          />
        ))}
      </Tabs>

      {active && (
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
              mb: 1.5,
            }}
          >
            <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexWrap: "wrap" }}>
              <Typography fontWeight={800}>{active.label}</Typography>
              <Chip label={`${activeDays.length} days`} size="small" variant="outlined" />
              <Typography variant="caption" color="text.secondary">
                Booked {fmtNum(active.plants)}
              </Typography>
            </Box>
            <DirectSowMonthToolbar
              defaultReadyDays={group?.plantReadyDays || 0}
              onApply={(val) => onApplyMonthReadyDays?.(active.monthKey, val, activeDays)}
            />
          </Box>

          <Grid container spacing={1.25}>
            {activeDays.map((dg) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={dg.deliveryKey}>
                <DirectSowDayCard
                  dayGroup={dg}
                  plantReadyDaysDefault={group?.plantReadyDays || 0}
                  conversionFactor={conversionFactor}
                  hasSeedProduct={hasSeedProduct}
                  draft={cardDrafts[dg.deliveryKey] || {}}
                  saving={savingKey === dg.deliveryKey}
                  onDraftChange={onDraftChange}
                  onSow={onSow}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  )
}

export default memo(DirectSowCardGrid)
