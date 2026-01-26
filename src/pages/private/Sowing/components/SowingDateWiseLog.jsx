import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Paper,
  Grid,
  Avatar,
  Divider,
  CircularProgress,
  TextField,
  InputAdornment,
  Tooltip,
  LinearProgress,
  Alert,
} from "@mui/material";
import {
  Close,
  ExpandMore,
  History,
  Person,
  AccessTime,
  LocationOn,
  CalendarToday,
  Edit,
  Add,
  Refresh,
  Search,
  Inventory,
  CheckCircle,
  ExpandLess,
} from "@mui/icons-material";
import moment from "moment";
import { NetworkManager, API } from "network/core";

const SowingDateWiseLog = ({
  plantId,
  subtypeId,
  slotId,
  open,
  onClose,
  selectedDate = null,
}) => {
  const [dateLogs, setDateLogs] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingDates, setLoadingDates] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDates, setExpandedDates] = useState({});
  const [dateFilter, setDateFilter] = useState(selectedDate || moment().format("YYYY-MM-DD"));
  const [fetchedDates, setFetchedDates] = useState(new Set()); // Track which dates have been fetched

  // Only fetch summary on initial load - don't fetch all data
  useEffect(() => {
    if (open && !plantId && !subtypeId && !slotId) {
      fetchDateSummary();
    } else if (open && (plantId || subtypeId || slotId)) {
      // If filters provided, fetch data
      fetchDateWiseLogs();
    }
  }, [open, plantId, subtypeId, slotId, dateFilter]);

  // Fetch only date summary (optimized)
  const fetchDateSummary = async () => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.sowing.GET_SOWINGS);
      const response = await instance.request(
        {},
        {
          limit: 1000, // Get more for summary
          page: 1,
        }
      );

      const dateSummary = {};
      if (response?.data?.data) {
        response.data.data.forEach((sowing) => {
          const sowingDate = moment(sowing.sowingDate, "DD-MM-YYYY").format("DD-MM-YYYY");
          if (!dateSummary[sowingDate]) {
            dateSummary[sowingDate] = {
              date: sowingDate,
              count: 0,
              totalQuantity: 0,
            };
          }
          dateSummary[sowingDate].count += 1;
          dateSummary[sowingDate].totalQuantity += sowing.totalQuantityRequired || 0;
        });
      }

      // Convert to logs format but without full details
      const summaryLogs = {};
      Object.keys(dateSummary).forEach((date) => {
        summaryLogs[date] = {
          ...dateSummary[date],
          sowings: [], // Empty - will fetch on expand
          loaded: false, // Flag to indicate if full data is loaded
        };
      });

      setDateLogs(summaryLogs);
    } catch (error) {
      console.error("Error fetching date summary:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch full data for a specific date (on-demand)
  const fetchDateDetails = async (date) => {
    if (loadingDates.has(date) || fetchedDates.has(date)) {
      return; // Already loading or loaded
    }

    setLoadingDates((prev) => new Set(prev).add(date));

    try {
      const dateStr = moment(date, "DD-MM-YYYY").format("DD-MM-YYYY");
      
      const filters = { date: dateStr };
      if (plantId) filters.plantId = plantId;
      if (subtypeId) filters.subtypeId = subtypeId;
      if (slotId) filters.slotId = slotId;

      const instance = NetworkManager(API.sowing.GET_SOWINGS);
      const response = await instance.request({}, filters);

      if (response?.data?.data) {
        const sowingsForDate = response.data.data;
        const historyEntries = [];

        // Process history entries
        sowingsForDate.forEach((sowing) => {
          if (sowing.sowingHistory && sowing.sowingHistory.length > 0) {
            sowing.sowingHistory.forEach((entry) => {
              const entryDate = moment(entry.date || entry.timestamp, "DD-MM-YYYY").format("DD-MM-YYYY");
              if (entryDate === dateStr) {
                historyEntries.push({
                  ...entry,
                  plantName: sowing.plantName,
                  subtypeName: sowing.subtypeName,
                  sowingId: sowing._id,
                });
              }
            });
          }
        });

        // Update the date log with full details
        setDateLogs((prev) => ({
          ...prev,
          [date]: {
            ...prev[date],
            sowings: sowingsForDate,
            historyEntries,
            loaded: true,
          },
        }));

        setFetchedDates((prev) => new Set(prev).add(date));
      }
    } catch (error) {
      console.error(`Error fetching details for date ${date}:`, error);
    } finally {
      setLoadingDates((prev) => {
        const next = new Set(prev);
        next.delete(date);
        return next;
      });
    }
  };

  // Fetch all data (fallback for filtered views)
  const fetchDateWiseLogs = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (plantId) filters.plantId = plantId;
      if (subtypeId) filters.subtypeId = subtypeId;
      if (slotId) filters.slotId = slotId;
      if (dateFilter) {
        filters.date = moment(dateFilter).format("DD-MM-YYYY");
      }

      const instance = NetworkManager(API.sowing.GET_SOWINGS);
      const response = await instance.request({}, filters);

      const logsByDate = {};

      if (response?.data?.data) {
        const sowings = response.data.data;

        // Group by date
        sowings.forEach((sowing) => {
          const sowingDate = moment(sowing.sowingDate, "DD-MM-YYYY").format("DD-MM-YYYY");
          const dateKey = sowingDate;

          if (!logsByDate[dateKey]) {
            logsByDate[dateKey] = {
              date: sowingDate,
              sowings: [],
              historyEntries: [],
              totalQuantity: 0,
              totalSowed: 0,
              loaded: true,
            };
          }

          logsByDate[dateKey].sowings.push(sowing);
          logsByDate[dateKey].totalQuantity += sowing.totalQuantityRequired || 0;
          logsByDate[dateKey].totalSowed += sowing.totalSowed || 0;
        });

        // Process history entries
        sowings.forEach((sowing) => {
          if (sowing.sowingHistory && sowing.sowingHistory.length > 0) {
            sowing.sowingHistory.forEach((entry) => {
              const entryDate = moment(entry.date || entry.timestamp, "DD-MM-YYYY").format("DD-MM-YYYY");
              const dateKey = entryDate;

              if (!logsByDate[dateKey]) {
                logsByDate[dateKey] = {
                  date: entryDate,
                  sowings: [],
                  historyEntries: [],
                  totalQuantity: 0,
                  totalSowed: 0,
                  loaded: true,
                };
              }

              if (!logsByDate[dateKey].historyEntries) {
                logsByDate[dateKey].historyEntries = [];
              }

              logsByDate[dateKey].historyEntries.push({
                ...entry,
                plantName: sowing.plantName,
                subtypeName: sowing.subtypeName,
                sowingId: sowing._id,
              });
            });
          }
        });
      }

      // Sort dates (newest first)
      const sortedDates = Object.keys(logsByDate).sort((a, b) => {
        return moment(b, "DD-MM-YYYY").diff(moment(a, "DD-MM-YYYY"));
      });

      const sortedLogs = {};
      sortedDates.forEach((date) => {
        sortedLogs[date] = logsByDate[date];
      });

      setDateLogs(sortedLogs);
      setFetchedDates(new Set(sortedDates));

      // Auto-expand first date or filtered date
      if (sortedDates.length > 0) {
        const dateToExpand = dateFilter
          ? moment(dateFilter).format("DD-MM-YYYY")
          : sortedDates[0];
        if (sortedDates.includes(dateToExpand)) {
          setExpandedDates({ [dateToExpand]: true });
        }
      }
    } catch (error) {
      console.error("Error fetching date-wise logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateExpand = (date) => {
    const isExpanded = expandedDates[date] || false;
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !isExpanded,
    }));

    // Fetch details when expanding (lazy load)
    if (!isExpanded && dateLogs[date] && !dateLogs[date].loaded) {
      fetchDateDetails(date);
    }
  };

  const getUserDisplay = (user) => {
    if (!user) return "Unknown";
    if (typeof user === "string") return user;
    if (user.name) return user.name;
    if (user.phoneNumber) return user.phoneNumber;
    return "Unknown";
  };

  const filteredDateLogs = useMemo(() => {
    return Object.keys(dateLogs).filter((date) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const dateLog = dateLogs[date];
      return (
        date.includes(searchQuery) ||
        dateLog.sowings?.some(
          (s) =>
            s.plantName?.toLowerCase().includes(query) ||
            s.subtypeName?.toLowerCase().includes(query) ||
            s.batchNumber?.toLowerCase().includes(query) ||
            getUserDisplay(s.createdBy)?.toLowerCase().includes(query)
        )
      );
    });
  }, [dateLogs, searchQuery]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          bgcolor: "#1976d2",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <CalendarToday />
          Date-wise Sowing Log
          {(plantId || subtypeId || slotId) && (
            <Chip
              label="Filtered View"
              size="small"
              sx={{ ml: 1, bgcolor: "rgba(255,255,255,0.2)", color: "white" }}
            />
          )}
        </Box>
        <IconButton onClick={onClose} sx={{ color: "white" }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 0, mt: 1 }}>
        {/* Filters */}
        <Box sx={{ p: 2, bgcolor: "#f5f5f5", borderBottom: "1px solid #e0e0e0" }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Filter by Date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  if (e.target.value) {
                    fetchDateWiseLogs();
                  }
                }}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CalendarToday fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search by plant, subtype, batch, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setDateFilter("");
                  setSearchQuery("");
                  setDateLogs({});
                  setFetchedDates(new Set());
                }}
                size="small">
                Clear
              </Button>
            </Grid>
          </Grid>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4, gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="textSecondary">
              Loading sowing logs...
            </Typography>
          </Box>
        ) : filteredDateLogs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <History sx={{ fontSize: 48, color: "#ccc", mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              No logs found for{" "}
              {dateFilter ? moment(dateFilter).format("DD-MM-YYYY") : "selected criteria"}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 600, overflow: "auto", p: 2 }}>
            {filteredDateLogs.map((date) => {
              const dateLog = dateLogs[date];
              const isExpanded = expandedDates[date] || false;
              const isLoading = loadingDates.has(date);

              return (
                <Accordion
                  key={date}
                  expanded={isExpanded}
                  onChange={() => handleDateExpand(date)}
                  sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", pr: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          📅 {moment(date, "DD-MM-YYYY").format("DD MMM YYYY")}
                        </Typography>
                        <Chip
                          label={`${dateLog.sowings?.length || dateLog.count || 0} record${(dateLog.sowings?.length || dateLog.count || 0) !== 1 ? "s" : ""}`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        {isLoading && (
                          <CircularProgress size={16} sx={{ ml: 1 }} />
                        )}
                        {!dateLog.loaded && !isLoading && (
                          <Chip
                            label="Click to load"
                            size="small"
                            color="info"
                            variant="outlined"
                            sx={{ fontSize: "0.7rem", height: 20 }}
                          />
                        )}
                      </Box>
                      <Box sx={{ display: "flex", gap: 2 }}>
                        <Typography variant="body2" color="textSecondary">
                          Total: {dateLog.totalQuantity || 0}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Sowed: {dateLog.totalSowed || 0}
                        </Typography>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {isLoading ? (
                      <Box sx={{ py: 2, textAlign: "center" }}>
                        <CircularProgress size={24} />
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: "block" }}>
                          Loading details...
                        </Typography>
                      </Box>
                    ) : !dateLog.loaded ? (
                      <Alert severity="info" sx={{ mb: 2 }}>
                        Click expand to load full details for this date
                      </Alert>
                    ) : dateLog.sowings?.length === 0 ? (
                      <Typography variant="body2" color="textSecondary" sx={{ textAlign: "center", py: 2 }}>
                        No sowing records found for this date
                      </Typography>
                    ) : (
                      <List>
                        {/* Sowing Records */}
                        {dateLog.sowings?.map((sowing, index) => (
                          <React.Fragment key={sowing._id || index}>
                            <ListItem>
                              <ListItemIcon>
                                <Add color="success" />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                      {sowing.plantName} - {sowing.subtypeName}
                                    </Typography>
                                    <Chip
                                      label={sowing.sowingLocation || "OFFICE"}
                                      size="small"
                                      color="info"
                                      sx={{ height: 20 }}
                                    />
                                    {sowing.batchNumber && (
                                      <Chip
                                        label={`Batch: ${sowing.batchNumber}`}
                                        size="small"
                                        sx={{ height: 20 }}
                                      />
                                    )}
                                    <Chip
                                      label={sowing.status}
                                      size="small"
                                      color={
                                        sowing.status === "READY"
                                          ? "success"
                                          : sowing.status === "OVERDUE"
                                          ? "error"
                                          : "warning"
                                      }
                                      sx={{ height: 20 }}
                                    />
                                  </Box>
                                }
                                secondary={
                                  <Box sx={{ mt: 1 }}>
                                    <Box sx={{ display: "flex", gap: 2, mb: 1, flexWrap: "wrap" }}>
                                      <Typography variant="caption" color="textSecondary">
                                        <Inventory
                                          sx={{ fontSize: 12, mr: 0.5, verticalAlign: "middle" }}
                                        />
                                        Quantity: {sowing.totalQuantityRequired} | Sowed: {sowing.totalSowed} |
                                        Remaining: {sowing.remainingToSow || 0}
                                      </Typography>
                                    </Box>
                                    {sowing.expectedReadyDate && (
                                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                        <CalendarToday
                                          sx={{ fontSize: 12, mr: 0.5, verticalAlign: "middle" }}
                                        />
                                        Expected Ready: {sowing.expectedReadyDate}
                                      </Typography>
                                    )}
                                    {sowing.createdBy && (
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                                        <Person sx={{ fontSize: 12, color: "#666" }} />
                                        <Typography variant="caption" color="textSecondary">
                                          Created by: <strong>{getUserDisplay(sowing.createdBy)}</strong>
                                          {sowing.createdAt &&
                                            ` on ${moment(sowing.createdAt).format("DD-MM-YYYY HH:mm")}`}
                                        </Typography>
                                      </Box>
                                    )}
                                    {sowing.updatedBy && sowing.updatedAt && (
                                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                        <Edit sx={{ fontSize: 10, mr: 0.5, verticalAlign: "middle" }} />
                                        Updated by: <strong>{getUserDisplay(sowing.updatedBy)}</strong> on{" "}
                                        {moment(sowing.updatedAt).format("DD-MM-YYYY HH:mm")}
                                      </Typography>
                                    )}
                                    {sowing.notes && (
                                      <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                        Notes: {sowing.notes}
                                      </Typography>
                                    )}
                                  </Box>
                                }
                              />
                            </ListItem>
                            {index < dateLog.sowings.length - 1 && <Divider />}
                          </React.Fragment>
                        ))}

                        {/* History Entries */}
                        {dateLog.historyEntries && dateLog.historyEntries.length > 0 && (
                          <>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, px: 2, mb: 1 }}>
                              Updates/History:
                            </Typography>
                            {dateLog.historyEntries.map((entry, index) => (
                              <React.Fragment key={index}>
                                <ListItem>
                                  <ListItemIcon>
                                    <Edit color="primary" />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                          {entry.plantName} - {entry.subtypeName}
                                        </Typography>
                                        <Chip label={entry.location} size="small" color="info" sx={{ height: 18 }} />
                                        <Chip
                                          label={`+${entry.quantity}`}
                                          size="small"
                                          color="success"
                                          sx={{ height: 18 }}
                                        />
                                      </Box>
                                    }
                                    secondary={
                                      <Box sx={{ mt: 0.5 }}>
                                        <Typography variant="caption" color="textSecondary">
                                          <AccessTime
                                            sx={{ fontSize: 10, mr: 0.5, verticalAlign: "middle" }}
                                          />
                                          {entry.timestamp
                                            ? moment(entry.timestamp).format("DD-MM-YYYY HH:mm")
                                            : entry.date}
                                        </Typography>
                                        {entry.performedBy && (
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                                            <Person sx={{ fontSize: 10, color: "#666" }} />
                                            <Typography variant="caption" color="textSecondary">
                                              By: <strong>{getUserDisplay(entry.performedBy)}</strong>
                                            </Typography>
                                          </Box>
                                        )}
                                        {entry.notes && (
                                          <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                            Notes: {entry.notes}
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                  />
                                </ListItem>
                                {index < dateLog.historyEntries.length - 1 && <Divider />}
                              </React.Fragment>
                            ))}
                          </>
                        )}
                      </List>
                    )}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        <Button
          onClick={() => {
            setDateLogs({});
            setFetchedDates(new Set());
            setExpandedDates({});
            fetchDateWiseLogs();
          }}
          variant="contained"
          color="primary"
          startIcon={<Refresh />}>
          Refresh
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SowingDateWiseLog;
