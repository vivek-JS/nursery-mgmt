import React from "react";
import {
  Paper,
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  LinearProgress,
} from "@mui/material";
import moment from "moment";

const SlotCard = ({
  slot,
  readyDays,
  hasReadyDays,
  daysUntilSow,
  gap,
  surplus,
  priority,
  sowByDate,
  isSlotReadyDaysSet,
  isPastSlot,
  isHighlighted,
  slotSowingData,
  onSowingChange,
  onSaveSowing,
  saving,
  onTransferClick,
  compactView = false,
}) => {
  const locationOptions = [
    { value: "OFFICE", label: "📦 Packets" },
    { value: "PRIMARY", label: "🌱 Primary" },
  ];

  const getPriorityChip = () => {
    if (priority === "overdue") {
      return <Chip label="🚨" size="small" color="error" sx={{ fontSize: "0.65rem", height: 16 }} />;
    }
    if (priority === "urgent") {
      return <Chip label="⚠️" size="small" color="warning" sx={{ fontSize: "0.65rem", height: 16 }} />;
    }
    if (priority === "complete") {
      return <Chip label="✓" size="small" color="success" sx={{ fontSize: "0.65rem", height: 16 }} />;
    }
    return null;
  };

  const getBgColor = () => {
    if (isHighlighted) return "#fff9c4";
    if (priority === "overdue") return "#ffebee";
    if (priority === "urgent") return "#fff3e0";
    if (priority === "complete") return "#e8f5e9";
    if (priority === "missingReadyDays") return "#fff9c4";
    return "#ffffff";
  };

  const getBorderColor = () => {
    if (isHighlighted) return "#fbc02d";
    if (priority === "overdue") return "#ef5350";
    if (priority === "urgent") return "#ffa726";
    if (priority === "complete") return "#66bb6a";
    if (priority === "missingReadyDays") return "#fbc02d";
    return "#e0e0e0";
  };

  return (
    <Paper
      sx={{
        p: compactView ? 1 : 1.5,
        bgcolor: getBgColor(),
        border: `2px solid ${getBorderColor()}`,
        transition: "all 0.2s",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 3 },
        boxShadow: isHighlighted ? 6 : 1,
        opacity: isPastSlot ? 0.8 : 1,
      }}>
      {/* Header */}
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
          {moment(slot.startDay, "DD-MM-YYYY").format("MMM D")} -{" "}
          {moment(slot.endDay, "DD-MM-YYYY").format("MMM D")}
          {isPastSlot && (
            <span style={{ fontSize: "0.7rem", color: "#999", marginLeft: 4 }}>(Past)</span>
          )}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
          {getPriorityChip()}
          <Tooltip
            title={
              hasReadyDays
                ? isSlotReadyDaysSet
                  ? `Slot-specific: ${readyDays} days`
                  : `Subtype default: ${readyDays} days`
                : "No ready days set"
            }>
            <Chip
              label={hasReadyDays ? `${readyDays}d${isSlotReadyDaysSet ? " (slot)" : ""}` : "Set days"}
              size="small"
              color={hasReadyDays ? (isSlotReadyDaysSet ? "primary" : "info") : "warning"}
              variant={hasReadyDays ? "outlined" : "filled"}
              sx={{ fontSize: "0.65rem", height: 16 }}
            />
          </Tooltip>
          {hasReadyDays && daysUntilSow !== null && daysUntilSow >= 0 && gap > 0 && (
            <Chip
              label={`${daysUntilSow}d`}
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.65rem", height: 16 }}
            />
          )}
        </Box>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={0.5} sx={{ mb: 1 }}>
        <Grid item xs={3}>
          <Box
            sx={{
              bgcolor: "rgba(25,118,210,0.1)",
              p: 0.5,
              borderRadius: 0.5,
              textAlign: "center",
            }}>
            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666" }}>
              Book
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: "#1976d2", fontSize: "0.75rem" }}>
              {slot.totalBookedPlants || 0}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box
            sx={{
              bgcolor: "rgba(158,158,158,0.1)",
              p: 0.5,
              borderRadius: 0.5,
              textAlign: "center",
            }}>
            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666" }}>
              Pkts
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "#666", fontSize: "0.75rem" }}>
              {slot.officeSowed || 0}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box
            sx={{
              bgcolor: "rgba(46,125,50,0.1)",
              p: 0.5,
              borderRadius: 0.5,
              textAlign: "center",
            }}>
            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666" }}>
              Pri
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: "#2e7d32", fontSize: "0.75rem" }}>
              {slot.primarySowed || 0}
            </Typography>
          </Box>
        </Grid>
        <Grid item xs={3}>
          <Box
            sx={{
              bgcolor: gap > 0 ? "rgba(255,152,0,0.15)" : "rgba(158,158,158,0.1)",
              p: 0.5,
              borderRadius: 0.5,
              textAlign: "center",
            }}>
            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#666" }}>
              Gap
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: gap > 0 ? "#f57c00" : "#666", fontSize: "0.75rem" }}>
              {gap > 0 ? "+" : ""}
              {gap}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Alerts */}
      {gap > 0 && hasReadyDays && sowByDate && (
        <Box
          sx={{
            mb: 1,
            p: 0.5,
            bgcolor:
              priority === "overdue"
                ? "#ffcdd2"
                : priority === "urgent"
                ? "#ffe0b2"
                : "#bbdefb",
            borderRadius: 1,
          }}>
          <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: 600 }}>
            Need to sow: {gap} by {sowByDate.format("MMM D")}
          </Typography>
        </Box>
      )}
      {(!hasReadyDays || priority === "missingReadyDays") && (
        <Box
          sx={{
            mb: 1,
            p: 0.5,
            bgcolor: "#fff9c4",
            borderRadius: 1,
            border: "1px dashed #fbc02d",
          }}>
          <Typography
            variant="caption"
            sx={{ fontSize: "0.65rem", fontWeight: 600, color: "#f57c00" }}>
            Set plant ready days to compute sowing schedule
          </Typography>
        </Box>
      )}

      {/* Transfer Surplus */}
      {surplus > 0 && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => onTransferClick(slot, surplus)}
          sx={{ alignSelf: "flex-start", mb: 1, width: "100%" }}>
          Transfer Surplus ({surplus})
        </Button>
      )}

      {/* Quick Entry */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <TextField
          type="date"
          size="small"
          value={slotSowingData?.sowingDate || moment().format("YYYY-MM-DD")}
          onChange={(e) => onSowingChange("sowingDate", e.target.value)}
          sx={{ "& input": { fontSize: "0.7rem", p: 0.5 } }}
        />

        <Select
          value={slotSowingData?.location || "OFFICE"}
          onChange={(e) => onSowingChange("location", e.target.value)}
          size="small"
          fullWidth
          sx={{ height: 28, fontSize: "0.65rem" }}>
          {locationOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>

        <TextField
          size="small"
          placeholder="Batch #"
          value={slotSowingData?.batchNumber || ""}
          onChange={(e) => onSowingChange("batchNumber", e.target.value)}
          sx={{ "& input": { fontSize: "0.7rem", p: 0.5 } }}
        />

        <Box sx={{ display: "flex", gap: 0.5 }}>
          <TextField
            type="number"
            size="small"
            placeholder={gap > 0 ? gap.toString() : "Qty"}
            value={slotSowingData?.quantity || ""}
            onChange={(e) => onSowingChange("quantity", e.target.value)}
            sx={{ flex: 1, "& input": { fontSize: "0.75rem", p: 0.5 } }}
          />
          <Button
            size="small"
            variant="contained"
            disabled={!slotSowingData?.quantity || saving}
            onClick={onSaveSowing}
            sx={{
              minWidth: 55,
              fontSize: "0.7rem",
              bgcolor:
                priority === "overdue"
                  ? "#d32f2f"
                  : priority === "urgent"
                  ? "#f57c00"
                  : "#2e7d32",
              "&:hover": {
                bgcolor:
                  priority === "overdue"
                    ? "#b71c1c"
                    : priority === "urgent"
                    ? "#e65100"
                    : "#1b5e20",
              },
            }}>
            {saving
              ? "..."
              : slotSowingData?.location === "OFFICE"
              ? "Add Packets"
              : "Sow"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default SlotCard;



