import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Avatar,
  Divider,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  History,
  Person,
  AccessTime,
  LocationOn,
  Edit,
  Add,
  Delete,
} from "@mui/icons-material";
import moment from "moment";
import { NetworkManager, API } from "network/core";

const SowingActivityLog = ({ plantId, subtypeId, slotId, open, onClose }) => {
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (open && (plantId || slotId)) {
      fetchActivityLog();
    }
  }, [open, plantId, subtypeId, slotId]);

  const fetchActivityLog = async () => {
    setLoading(true);
    try {
      // Fetch sowing history from sowings
      const sowingsInstance = NetworkManager(API.sowing.GET_SOWINGS);
      const sowingsResponse = await sowingsInstance.request({}, {});

      let activities = [];

      if (sowingsResponse?.data?.data) {
        const filteredSowings = sowingsResponse.data.data.filter((sowing) => {
          if (slotId) return sowing.slotId?.toString() === slotId.toString();
          if (plantId && subtypeId)
            return (
              sowing.plantId?.toString() === plantId.toString() &&
              sowing.subtypeId?.toString() === subtypeId.toString()
            );
          if (plantId) return sowing.plantId?.toString() === plantId.toString();
          return true;
        });

        filteredSowings.forEach((sowing) => {
          // Creation activity
          activities.push({
            type: "create",
            timestamp: sowing.createdAt,
            user: sowing.createdBy,
            description: `Created sowing record`,
            details: {
              quantity: sowing.totalQuantityRequired,
              location: sowing.sowingLocation,
              date: sowing.sowingDate,
              batch: sowing.batchNumber,
            },
            plant: sowing.plantName,
            subtype: sowing.subtypeName,
          });

          // History entries
          if (sowing.sowingHistory && sowing.sowingHistory.length > 0) {
            sowing.sowingHistory.forEach((entry) => {
              activities.push({
                type: "update",
                timestamp: entry.timestamp,
                user: entry.performedBy,
                description: `Updated ${entry.location} sowing`,
                details: {
                  quantity: entry.quantity,
                  location: entry.location,
                  date: entry.date,
                  notes: entry.notes,
                },
                plant: sowing.plantName,
                subtype: sowing.subtypeName,
              });
            });
          }

          // Last update
          if (sowing.updatedAt && sowing.updatedAt !== sowing.createdAt) {
            activities.push({
              type: "update",
              timestamp: sowing.updatedAt,
              user: sowing.updatedBy,
              description: `Last updated`,
              details: {
                status: sowing.status,
                totalSowed: sowing.totalSowed,
              },
              plant: sowing.plantName,
              subtype: sowing.subtypeName,
            });
          }
        });
      }

      // Sort by timestamp (newest first)
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setActivityLog(activities);
    } catch (error) {
      console.error("Error fetching activity log:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "create":
        return <Add color="success" />;
      case "update":
        return <Edit color="primary" />;
      case "delete":
        return <Delete color="error" />;
      default:
        return <History />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown";
    return moment(timestamp).format("DD-MM-YYYY HH:mm");
  };

  const filteredActivities = activeTab === 0 ? activityLog : activityLog.filter((a) => {
    if (activeTab === 1) return a.type === "create";
    if (activeTab === 2) return a.type === "update";
    return true;
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ bgcolor: "#2e7d32", color: "white" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <History />
          Activity Log & Trail
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0, mt: 1 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tab label="All Activities" />
          <Tab label="Created" />
          <Tab label="Updated" />
        </Tabs>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredActivities.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <History sx={{ fontSize: 48, color: "#ccc", mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              No activity found
            </Typography>
          </Box>
        ) : (
          <List sx={{ maxHeight: 500, overflow: "auto" }}>
            {filteredActivities.map((activity, index) => (
              <React.Fragment key={index}>
                <ListItem>
                  <ListItemIcon>{getActivityIcon(activity.type)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {activity.description}
                        </Typography>
                        <Chip
                          label={activity.type.toUpperCase()}
                          size="small"
                          color={activity.type === "create" ? "success" : "primary"}
                          sx={{ height: 20, fontSize: "0.65rem" }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                          <Typography variant="caption" color="textSecondary">
                            <AccessTime sx={{ fontSize: 12, mr: 0.5, verticalAlign: "middle" }} />
                            {formatTimestamp(activity.timestamp)}
                          </Typography>
                          {activity.plant && (
                            <Typography variant="caption" color="textSecondary">
                              • {activity.plant}
                              {activity.subtype && ` - ${activity.subtype}`}
                            </Typography>
                          )}
                        </Box>
                        {activity.details && (
                          <Box sx={{ mt: 1 }}>
                            {activity.details.quantity && (
                              <Chip
                                label={`Qty: ${activity.details.quantity}`}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5, height: 20 }}
                              />
                            )}
                            {activity.details.location && (
                              <Chip
                                label={activity.details.location}
                                size="small"
                                color="info"
                                sx={{ mr: 0.5, mb: 0.5, height: 20 }}
                              />
                            )}
                            {activity.details.date && (
                              <Chip
                                label={activity.details.date}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5, height: 20 }}
                              />
                            )}
                            {activity.details.batch && (
                              <Chip
                                label={`Batch: ${activity.details.batch}`}
                                size="small"
                                sx={{ mr: 0.5, mb: 0.5, height: 20 }}
                              />
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                  {activity.user && (
                    <Tooltip title="Performed by user">
                      <Avatar sx={{ width: 32, height: 32, bgcolor: "#2e7d32" }}>
                        <Person fontSize="small" />
                      </Avatar>
                    </Tooltip>
                  )}
                </ListItem>
                {index < filteredActivities.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Button onClick={fetchActivityLog} variant="contained" color="primary">
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SowingActivityLog;



