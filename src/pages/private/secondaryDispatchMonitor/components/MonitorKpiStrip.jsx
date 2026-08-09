import React from "react";
import { Box, Paper, Typography, Grid, LinearProgress } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import SpaIcon from "@mui/icons-material/Spa";
import InventoryIcon from "@mui/icons-material/Inventory";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

function KpiCard({ icon: Icon, label, value, hint, color }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2.5,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
        background: `linear-gradient(145deg, #fff 0%, ${color}12 100%)`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: `${color}22`,
            color,
          }}
        >
          <Icon fontSize="small" />
        </Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
      </Box>
      <Typography variant="h5" fontWeight={800} letterSpacing="-0.02em">
        {value}
      </Typography>
      {hint ? (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      ) : null}
    </Paper>
  );
}

export default function MonitorKpiStrip({ vehicleSummary, sowReadyTotal, windowLabel }) {
  return (
    <Box>
      <Grid container spacing={1.5}>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={LocalShippingIcon}
            label="Active vehicles"
            value={vehicleSummary.vehicleCount.toLocaleString("en-IN")}
            hint={`${vehicleSummary.sowReadyVehicles} with sow-ready plants`}
            color="#2563eb"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={InventoryIcon}
            label="Still to load"
            value={vehicleSummary.remaining.toLocaleString("en-IN")}
            hint={`${vehicleSummary.loaded.toLocaleString("en-IN")} / ${vehicleSummary.need.toLocaleString("en-IN")} plants`}
            color="#d97706"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={TrendingUpIcon}
            label="Load progress"
            value={`${vehicleSummary.pct}%`}
            hint="Across open vehicle dispatches"
            color="#059669"
          />
        </Grid>
        <Grid item xs={6} md={3}>
          <KpiCard
            icon={SpaIcon}
            label="Sow-ready sellable"
            value={sowReadyTotal.toLocaleString("en-IN")}
            hint={windowLabel || "plantReadyDate window"}
            color="#0d9488"
          />
        </Grid>
      </Grid>
      <LinearProgress
        variant="determinate"
        value={vehicleSummary.pct}
        sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: "rgba(37,99,235,0.12)" }}
      />
    </Box>
  );
}
