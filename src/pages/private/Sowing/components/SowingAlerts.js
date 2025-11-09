import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  Typography,
  Chip,
  Divider,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Stack,
  Button,
} from "@mui/material";
import {
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  LocalFlorist as PlantIcon,
  Bolt as BoltIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";

const formatNumber = (value) => (value || 0).toLocaleString();
const safeArray = (value) => (Array.isArray(value) ? value : []);

const priorityChipProps = {
  overdue: { color: "error", icon: <WarningIcon fontSize="small" /> },
  urgent: { color: "warning", icon: <BoltIcon fontSize="small" /> },
  upcoming: { color: "info", icon: <CheckIcon fontSize="small" /> },
  "due today": { color: "warning", icon: <CalendarIcon fontSize="small" /> },
};

const SummaryCard = ({ label, value, icon, tone }) => (
  <Box
    sx={{
      borderRadius: 2,
      p: 2,
      bgcolor: `${tone}.50`,
      border: "1px solid",
      borderColor: `${tone}.100`,
      height: "100%",
    }}
  >
    <Stack direction="row" spacing={1} alignItems="center">
      {icon}
      <Typography variant="caption" color={`${tone}.700`} sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
    <Typography variant="h5" sx={{ fontWeight: 700, color: `${tone}.900`, mt: 1 }}>
      {value}
    </Typography>
  </Box>
);

const renderPriorityChip = (priority) => {
  const props = priorityChipProps[priority] || priorityChipProps.upcoming;
  return (
    <Chip
      size="small"
      color={props.color}
      icon={props.icon}
      label={(priority || "upcoming").toUpperCase()}
    />
  );
};

const EmptyMessage = ({ message }) => (
  <Box
    sx={{
      borderRadius: 2,
      border: "1px dashed",
      borderColor: "grey.300",
      bgcolor: "grey.50",
      p: 2,
      textAlign: "center",
    }}
  >
    <Typography variant="body2" color="textSecondary">
      {message}
    </Typography>
  </Box>
);

const SowingAlerts = ({ alerts, todaySummary, onNavigateToSlot }) => {
  if (!alerts || !alerts.summary) {
    return null;
  }

  const plantAlerts = safeArray(alerts.plantAlerts);
  const dayAlerts = safeArray(alerts.dayAlerts);
  const slotAlerts = safeArray(alerts.slotAlerts);

  const totals = useMemo(() => {
    return slotAlerts.reduce(
      (acc, slot) => {
        const pending = Number(slot.pendingQuantity) || 0;
        acc.total += pending;
        if (slot.priority === "overdue" || slot.daysUntilSow < 0) {
          acc.overdue += pending;
        } else if (slot.priority === "urgent") {
          acc.urgent += pending;
        } else {
          acc.upcoming += pending;
        }
        return acc;
      },
      { total: 0, overdue: 0, urgent: 0, upcoming: 0 },
    );
  }, [slotAlerts]);

  const metrics = [
    {
      label: "Total Pending Plants",
      value: formatNumber(totals.total),
      icon: <PlantIcon fontSize="small" color="primary" />,
      tone: "primary",
    },
    {
      label: "Overdue Plants",
      value: formatNumber(totals.overdue),
      icon: <WarningIcon fontSize="small" color="error" />,
      tone: "error",
    },
    {
      label: "Urgent (next 2 days)",
      value: formatNumber(totals.urgent),
      icon: <BoltIcon fontSize="small" color="warning" />,
      tone: "warning",
    },
    {
      label: "Upcoming",
      value: formatNumber(totals.upcoming),
      icon: <CalendarIcon fontSize="small" color="info" />,
      tone: "info",
    },
  ];

  return (
    <Card elevation={3} sx={{ mb: 3 }}>
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningIcon color="error" />
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#d32f2f" }}>
              Sowing Alerts
            </Typography>
          </Stack>
        }
        subheader={
          <Typography variant="body2" color="textSecondary">
            Quick summary of pending sowing by plant, subtype and slot.
          </Typography>
        }
      />

      <CardContent>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {metrics.map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item.label}>
              <SummaryCard {...item} />
            </Grid>
          ))}
        </Grid>

        {todaySummary?.summary && (
          <Box
            sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "grey.200",
              bgcolor: "grey.50",
              p: 2,
              mb: 3,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Today’s Focus
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {formatNumber(todaySummary.summary.totalPendingToday)} plants across{" "}
              {todaySummary.summary.plantSubtypeCount} subtype
              {todaySummary.summary.plantSubtypeCount > 1 ? "s" : ""} are overdue or due today.
            </Typography>
          </Box>
        )}

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Plant Summary
        </Typography>
        {plantAlerts.length === 0 ? (
          <EmptyMessage message="No sowing backlog found for sowing-allowed plants." />
        ) : (
          <Box sx={{ overflowX: "auto", mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Plant</TableCell>
                  <TableCell>Subtype</TableCell>
                  <TableCell align="right">Pending Plants</TableCell>
                  <TableCell align="center">Active Slots</TableCell>
                  <TableCell align="center">Overdue</TableCell>
                  <TableCell align="center">Urgent</TableCell>
                  <TableCell align="center">Upcoming</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {plantAlerts.map((plant) => (
                  <TableRow key={`${plant.plantId}_${plant.subtypeId}`}>
                    <TableCell>{plant.plantName}</TableCell>
                    <TableCell>{plant.subtypeName}</TableCell>
                    <TableCell align="right">{formatNumber(plant.totalPending)}</TableCell>
                    <TableCell align="center">{plant.slotCount}</TableCell>
                    <TableCell align="center">{plant.overdueSlots}</TableCell>
                    <TableCell align="center">{plant.urgentSlots}</TableCell>
                    <TableCell align="center">{plant.upcomingSlots}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Slot Details
        </Typography>
        {slotAlerts.length === 0 ? (
          <EmptyMessage message="No slot-level alerts in the selected window." />
        ) : (
          <Box sx={{ overflowX: "auto", mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Plant</TableCell>
                  <TableCell>Subtype</TableCell>
                  <TableCell>Slot Window</TableCell>
                  <TableCell align="right">Pending</TableCell>
                  <TableCell align="center">Priority</TableCell>
                  <TableCell align="center">Sow-by</TableCell>
                  <TableCell align="center">Ready Days</TableCell>
                  <TableCell align="center">Booked</TableCell>
                  <TableCell align="center">Primary Sowed</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slotAlerts.map((slot) => (
                  <TableRow key={slot._id}>
                    <TableCell>{slot.plantName}</TableCell>
                    <TableCell>{slot.subtypeName}</TableCell>
                    <TableCell>
                      {slot.slotStartDay} → {slot.slotEndDay} ({slot.month} {slot.year})
                    </TableCell>
                    <TableCell align="right">{formatNumber(slot.pendingQuantity)}</TableCell>
                    <TableCell align="center">{renderPriorityChip(slot.priority)}</TableCell>
                    <TableCell align="center">{slot.sowByDate}</TableCell>
                    <TableCell align="center">{slot.slotReadyDays || 0}</TableCell>
                    <TableCell align="center">{formatNumber(slot.totalBookedPlants || 0)}</TableCell>
                    <TableCell align="center">{formatNumber(slot.primarySowed || 0)}</TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="text"
                        sx={{ textTransform: "none" }}
                        onClick={() =>
                          onNavigateToSlot({
                            slotId: slot._id,
                            plantId: slot.plantId,
                            subtypeId: slot.subtypeId,
                            plantName: slot.plantName,
                            subtypeName: slot.subtypeName,
                          })
                        }
                      >
                        View Slot
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Sow-by Deadlines
        </Typography>
        {dayAlerts.length === 0 ? (
          <EmptyMessage message="No day-wise sowing deadlines in the selected window." />
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Plant</TableCell>
                  <TableCell>Subtype</TableCell>
                  <TableCell>Sow-by</TableCell>
                  <TableCell align="right">Pending Plants</TableCell>
                  <TableCell align="center">Slots</TableCell>
                  <TableCell align="center">Priority</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dayAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>{alert.plantName}</TableCell>
                    <TableCell>{alert.subtypeName}</TableCell>
                    <TableCell>{alert.sowByDate}</TableCell>
                    <TableCell align="right">{formatNumber(alert.totalPending)}</TableCell>
                    <TableCell align="center">{alert.slotCount}</TableCell>
                    <TableCell align="center">{renderPriorityChip(alert.priority)}</TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="text"
                        sx={{ textTransform: "none" }}
                        onClick={() =>
                          onNavigateToSlot({
                            slotId: alert.slotIds?.[0],
                            plantId: alert.plantId,
                            subtypeId: alert.subtypeId,
                            plantName: alert.plantName,
                            subtypeName: alert.subtypeName,
                          })
                        }
                      >
                        View Slots
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default SowingAlerts;

