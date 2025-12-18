import React from "react";
import {
  Box,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  TrendingUp,
  Warning,
  CheckCircle,
  Schedule,
  Refresh,
  Info,
} from "@mui/icons-material";

const SowingStats = ({ stats, reminders = [], alerts, onRefresh, loading = false }) => {
  if (!stats) return null;

  const totalReminders = reminders.length || 0;
  const slotReminders = reminders.filter((r) => r.reminderType === "SLOT").length || 0;
  const orderReminders = reminders.filter((r) => r.reminderType === "ORDER").length || 0;
  const urgentReminders = reminders.filter(
    (r) => r.priority === "urgent" || r.priority === "overdue"
  ).length || 0;

  const statCards = [
    {
      label: "Total Reminders",
      value: totalReminders,
      icon: <Schedule />,
      color: "#1976d2",
      bgcolor: "#e3f2fd",
      tooltip: `Slot-wise: ${slotReminders}, Order-wise: ${orderReminders}`,
    },
    {
      label: "Urgent/Overdue",
      value: urgentReminders,
      icon: <Warning />,
      color: "#f57c00",
      bgcolor: "#fff3e0",
      tooltip: "Requires immediate attention",
    },
    {
      label: "Slot-wise",
      value: slotReminders,
      icon: <CheckCircle />,
      color: "#2e7d32",
      bgcolor: "#e8f5e9",
      tooltip: "Reminders for slot-based sowing",
    },
    {
      label: "Order-wise",
      value: orderReminders,
      icon: <TrendingUp />,
      color: "#7b1fa2",
      bgcolor: "#f3e5f5",
      tooltip: "Reminders for order-based sowing",
    },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: "#1976d2" }}>
          📊 Sowing Overview
        </Typography>
        <IconButton size="small" onClick={onRefresh} disabled={loading}>
          <Refresh fontSize="small" />
        </IconButton>
      </Box>

      <Grid container spacing={2}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Tooltip title={card.tooltip} arrow>
              <Paper
                sx={{
                  p: 2,
                  textAlign: "center",
                  bgcolor: card.bgcolor,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 3,
                  },
                  border: `1px solid ${card.color}20`,
                }}>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                </Box>
                <Typography variant="caption" color="textSecondary" display="block">
                  {card.label}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 700, color: card.color, mt: 0.5 }}>
                  {card.value.toLocaleString()}
                </Typography>
              </Paper>
            </Tooltip>
          </Grid>
        ))}
      </Grid>

      {/* Detailed Stats */}
      {stats.plantWiseStats && stats.plantWiseStats.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Plant-wise Summary
          </Typography>
          <Grid container spacing={1}>
            {stats.plantWiseStats.slice(0, 6).map((plantStat, index) => {
              const completion =
                plantStat.totalBookedPlants > 0
                  ? ((plantStat.totalSowed / plantStat.totalBookedPlants) * 100).toFixed(1)
                  : 0;

              return (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper sx={{ p: 1.5, border: "1px solid #e0e0e0" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {plantStat.plantName || "Unknown"}
                      </Typography>
                      <Chip
                        label={`${completion}%`}
                        size="small"
                        color={completion >= 100 ? "success" : completion >= 50 ? "warning" : "error"}
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(100, parseFloat(completion))}
                      sx={{ height: 6, borderRadius: 3, mb: 1 }}
                      color={completion >= 100 ? "success" : completion >= 50 ? "warning" : "error"}
                    />
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "#666",
                      }}>
                      <span>Booked: {plantStat.totalBookedPlants || 0}</span>
                      <span>Sowed: {plantStat.totalSowed || 0}</span>
                      <span>Gap: {plantStat.totalGap || 0}</span>
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default SowingStats;








