import React, { useState, useEffect, useMemo } from "react";
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
  LinearProgress,
  CircularProgress,
  Paper,
  Alert,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  InputAdornment,
  Autocomplete,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
} from "@mui/material";
import {
  Warning as WarningIcon,
  CalendarToday as CalendarIcon,
  LocalFlorist as PlantIcon,
  Bolt as BoltIcon,
  CheckCircle as CheckIcon,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  Refresh,
  Visibility,
  Info,
  TrendingUp,
  Schedule,
  Search as SearchIcon,
  FilterList as FilterIcon,
  NotificationsActive as NotificationsIcon,
  Agriculture as AgricultureIcon,
  Clear as ClearIcon,
  Event as EventIcon,
  Inventory as InventoryIcon,
  Person as PersonIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import moment from "moment";
import { NetworkManager } from "network/core";
import { API } from "network/config/endpoints";

const formatNumber = (value) => (value || 0).toLocaleString();
const safeArray = (value) => (Array.isArray(value) ? value : []);

const priorityChipProps = {
  overdue: { color: "error", icon: <WarningIcon fontSize="small" />, label: "Overdue" },
  urgent: { color: "warning", icon: <BoltIcon fontSize="small" />, label: "Urgent" },
  upcoming: { color: "info", icon: <CheckIcon fontSize="small" />, label: "Upcoming" },
  future: { color: "default", icon: <CalendarIcon fontSize="small" />, label: "Future" },
};

const SummaryCard = ({ label, value, icon, tone, onClick, loading = false, subtitle }) => (
  <Paper
    onClick={onClick}
    sx={{
      borderRadius: 3,
      p: 3,
      bgcolor: `${tone}.50`,
      border: "2px solid",
      borderColor: `${tone}.200`,
      height: "100%",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      position: "relative",
      overflow: "hidden",
      "&:hover": onClick
        ? {
            transform: "translateY(-6px)",
            boxShadow: 8,
            borderColor: `${tone}.400`,
          }
        : {},
      "&::before": {
        content: '""',
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        bgcolor: `${tone}.400`,
      },
    }}>
    {loading && (
      <LinearProgress
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
        }}
      />
    )}
    <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 1.5 }}>
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: `${tone}.100`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 48,
          minHeight: 48,
        }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography
          variant="caption"
          color={`${tone}.700`}
          sx={{ fontWeight: 600, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            color: `${tone}.900`,
            fontSize: "2rem",
            lineHeight: 1.2,
            mt: 0.5,
          }}>
          {loading ? "..." : formatNumber(value)}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: "block" }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  </Paper>
);

const renderPriorityChip = (priority) => {
  const props = priorityChipProps[priority?.toLowerCase()] || priorityChipProps.upcoming;
  return (
    <Chip
      size="small"
      color={props.color}
      icon={props.icon}
      label={props.label}
      sx={{ fontWeight: 600, fontSize: "0.75rem" }}
    />
  );
};

const EmptyMessage = ({ message, icon: Icon, action }) => (
  <Box
    sx={{
      borderRadius: 3,
      border: "2px dashed",
      borderColor: "grey.300",
      bgcolor: "grey.50",
      p: 6,
      textAlign: "center",
    }}>
    {Icon && <Icon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />}
    <Typography variant="h6" color="textSecondary" sx={{ fontWeight: 500, mb: 1 }}>
      {message}
    </Typography>
    {action && <Box sx={{ mt: 3 }}>{action}</Box>}
  </Box>
);

const SowingAlerts = ({ onNavigateToSlot }) => {
  const [plants, setPlants] = useState([]);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Reminders, 1: Alerts, 2: Availability
  const [expandedSubtypes, setExpandedSubtypes] = useState({});
  const [filterPriority, setFilterPriority] = useState(null);
  const [filterSubtype, setFilterSubtype] = useState(null);
  const [filterDateRange, setFilterDateRange] = useState([null, null]); // [startDate, endDate]
  const [showAvailable, setShowAvailable] = useState(false);
  const [showGap, setShowGap] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [trailDialogOpen, setTrailDialogOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [slotTrail, setSlotTrail] = useState([]);
  const [loadingTrail, setLoadingTrail] = useState(false);
  const [groupByDays, setGroupByDays] = useState("");
  const [showGroupedView, setShowGroupedView] = useState(false);

  // Fetch plants on mount
  useEffect(() => {
    fetchPlants();
  }, []);

  // Set default date range to 30 days when Availability tab is selected
  useEffect(() => {
    if (activeTab === 2 && !filterDateRange[0] && !filterDateRange[1]) {
      const today = new Date();
      const thirtyDaysLater = new Date(today);
      thirtyDaysLater.setDate(today.getDate() + 30);
      setFilterDateRange([today, thirtyDaysLater]);
    }
  }, [activeTab]);

  // Fetch reminders/alerts/availability when plant or filters change
  useEffect(() => {
    if (selectedPlant) {
      if (activeTab === 0) {
        fetchReminders();
      } else if (activeTab === 1) {
        fetchAlerts();
      } else if (activeTab === 2) {
        fetchAvailability();
      }
    } else {
      setReminders(null);
      setAlerts(null);
      setAvailability(null);
    }
  }, [selectedPlant, activeTab, filterPriority, filterSubtype, filterDateRange, showAvailable, showGap]);

  const fetchPlants = async () => {
    setLoading(true);
    try {
      const instance = NetworkManager(API.plantCms.GET_PLANTS);
      const response = await instance.request();
      if (response?.data?.message) {
        const plantsData = response.data.data || [];
        // Filter only sowing-allowed plants
        const sowingAllowedPlants = plantsData.filter((plant) => plant.sowingAllowed);
        setPlants(sowingAllowedPlants);
      }
    } catch (error) {
      console.error("Error fetching plants:", error);
    }
    setLoading(false);
  };

  const fetchReminders = async () => {
    if (!selectedPlant?._id) return;
    setRemindersLoading(true);
    try {
      const params = {
        plantId: selectedPlant._id,
        _t: Date.now(),
      };
      
      // Add filters
      if (filterPriority) params.priority = filterPriority;
      if (filterSubtype) params.subtypeId = filterSubtype;
      if (filterDateRange[0] && filterDateRange[1]) {
        params.startDate = moment(filterDateRange[0]).format("DD-MM-YYYY");
        params.endDate = moment(filterDateRange[1]).format("DD-MM-YYYY");
      }
      if (showAvailable) params.showAvailable = "true";
      if (showGap) params.showGap = "true";
      
      const instance = NetworkManager(API.sowing.GET_PLANT_REMINDERS);
      const response = await instance.request({}, params);
      if (response?.data?.success) {
        setReminders(response.data);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
      setReminders(null);
    }
    setRemindersLoading(false);
  };

  const fetchAlerts = async () => {
    if (!selectedPlant?._id) return;
    setAlertsLoading(true);
    try {
      const params = {
        plantId: selectedPlant._id,
        _t: Date.now(),
      };
      
      // Add filters
      if (filterPriority) params.priority = filterPriority;
      if (filterSubtype) params.subtypeId = filterSubtype;
      if (filterDateRange[0] && filterDateRange[1]) {
        params.startDate = moment(filterDateRange[0]).format("DD-MM-YYYY");
        params.endDate = moment(filterDateRange[1]).format("DD-MM-YYYY");
      }
      
      const instance = NetworkManager(API.sowing.GET_PLANT_ALERTS);
      const response = await instance.request({}, params);
      if (response?.data?.success) {
        setAlerts(response.data);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
      setAlerts(null);
    }
    setAlertsLoading(false);
  };

  const fetchAvailability = async () => {
    if (!selectedPlant?._id) return;
    setAvailabilityLoading(true);
    try {
      const params = {
        plantId: selectedPlant._id,
        _t: Date.now(),
      };
      
      // Add filters
      if (filterSubtype) params.subtypeId = filterSubtype;
      if (filterDateRange[0] && filterDateRange[1]) {
        params.startDate = moment(filterDateRange[0]).format("DD-MM-YYYY");
        params.endDate = moment(filterDateRange[1]).format("DD-MM-YYYY");
      }
      
      const instance = NetworkManager(API.sowing.GET_PLANT_AVAILABILITY);
      const response = await instance.request({}, params);
      if (response?.data?.success) {
        setAvailability(response.data);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      setAvailability(null);
    }
    setAvailabilityLoading(false);
  };

  const handleOpenTrailDialog = async (slotId) => {
    if (!slotId) return;
    
    setSelectedSlotId(slotId);
    setTrailDialogOpen(true);
    setLoadingTrail(true);
    setSlotTrail([]);

    try {
      const instance = NetworkManager(API.slots.GET_SLOT_TRAIL);
      const response = await instance.request({}, [slotId]);
      if (response?.data?.success) {
        // Filter only primary sowing entries (reason contains "Primary sowing")
        const allTrail = response.data.data || [];
        const primarySowingEntries = allTrail.filter(
          (entry) => entry.reason && entry.reason.includes("Primary sowing")
        );
        setSlotTrail(primarySowingEntries.length > 0 ? primarySowingEntries : allTrail);
      }
    } catch (error) {
      console.error("Error fetching slot trail:", error);
      setSlotTrail([]);
    }
    setLoadingTrail(false);
  };

  const handleCloseTrailDialog = () => {
    setTrailDialogOpen(false);
    setSelectedSlotId(null);
    setSlotTrail([]);
  };

  const handleRefresh = () => {
    if (selectedPlant) {
      if (activeTab === 0) {
        fetchReminders();
      } else if (activeTab === 1) {
        fetchAlerts();
      } else if (activeTab === 2) {
        fetchAvailability();
      }
    }
  };

  const toggleSubtype = (subtypeId) => {
    setExpandedSubtypes((prev) => ({
      ...prev,
      [subtypeId]: !prev[subtypeId],
    }));
  };

  // Filter reminders/alerts by search and priority
  const filteredReminders = useMemo(() => {
    if (!reminders?.reminders) return [];
    let filtered = reminders.reminders;
    if (filterPriority) {
      filtered = filtered.filter((r) => r.priority === filterPriority);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.subtypeName?.toLowerCase().includes(term) ||
          r.slotStartDay?.toLowerCase().includes(term) ||
          r.slotEndDay?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [reminders, filterPriority, searchTerm]);

  const filteredAlerts = useMemo(() => {
    if (!alerts?.alerts) return [];
    let filtered = alerts.alerts;
    if (filterPriority) {
      filtered = filtered.filter((a) => a.priority === filterPriority);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.subtypeName?.toLowerCase().includes(term) ||
          a.slotStartDay?.toLowerCase().includes(term) ||
          a.slotEndDay?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [alerts, filterPriority, searchTerm]);

  // Group reminders by subtype
  const remindersBySubtype = useMemo(() => {
    const grouped = {};
    filteredReminders.forEach((reminder) => {
      const key = reminder.subtypeId || reminder.subtypeName;
      if (!grouped[key]) {
        grouped[key] = {
          subtypeId: reminder.subtypeId,
          subtypeName: reminder.subtypeName,
          reminders: [],
          totalBookingGap: 0,
          totalAvailable: 0,
        };
      }
      grouped[key].reminders.push(reminder);
      grouped[key].totalBookingGap += reminder.bookingGap || 0;
      grouped[key].totalAvailable += reminder.availablePlants || 0;
    });
    return Object.values(grouped);
  }, [filteredReminders]);

  // Group alerts by subtype
  const alertsBySubtype = useMemo(() => {
    const grouped = {};
    filteredAlerts.forEach((alert) => {
      const key = alert.subtypeId || alert.subtypeName;
      if (!grouped[key]) {
        grouped[key] = {
          subtypeId: alert.subtypeId,
          subtypeName: alert.subtypeName,
          alerts: [],
          totalPending: 0,
        };
      }
      grouped[key].alerts.push(alert);
      grouped[key].totalPending += alert.pendingQuantity || 0;
    });
    return Object.values(grouped);
  }, [filteredAlerts]);

  const currentData = activeTab === 0 ? reminders : alerts;
  const currentLoading = activeTab === 0 ? remindersLoading : alertsLoading;

  // Group availability slots by days
  const groupedAvailability = useMemo(() => {
    if (!availability?.availability || !groupByDays || !showGroupedView) return [];
    
    const days = parseInt(groupByDays, 10);
    if (isNaN(days) || days <= 0) return [];

    const slots = availability.availability.filter(slot => slot.availablePlants > 0);
    if (slots.length === 0) return [];

    // Sort slots by date
    const sortedSlots = [...slots].sort((a, b) => {
      const dateA = moment(a.slotStartDay, "DD-MM-YYYY");
      const dateB = moment(b.slotStartDay, "DD-MM-YYYY");
      return dateA.valueOf() - dateB.valueOf();
    });

    const grouped = [];
    let currentGroup = null;
    let currentGroupStart = null;
    let currentGroupEnd = null;

    sortedSlots.forEach((slot) => {
      const slotDate = moment(slot.slotStartDay, "DD-MM-YYYY");
      
      if (!currentGroupStart || !currentGroupEnd || slotDate.isAfter(currentGroupEnd)) {
        // Start a new group
        if (currentGroup) {
          grouped.push(currentGroup);
        }
        currentGroupStart = slotDate.clone();
        currentGroupEnd = slotDate.clone().add(days - 1, 'days');
        currentGroup = {
          startDate: currentGroupStart.format("DD-MM-YYYY"),
          endDate: currentGroupEnd.format("DD-MM-YYYY"),
          slots: [],
          totalAvailable: 0,
          subtypeGroups: {},
        };
      }

      if (slotDate.isSameOrBefore(currentGroupEnd)) {
        currentGroup.slots.push(slot);
        currentGroup.totalAvailable += slot.availablePlants || 0;
        
        // Group by subtype
        const subtypeName = slot.subtypeName || "Unknown";
        if (!currentGroup.subtypeGroups[subtypeName]) {
          currentGroup.subtypeGroups[subtypeName] = {
            subtypeName,
            totalAvailable: 0,
            slotCount: 0,
          };
        }
        currentGroup.subtypeGroups[subtypeName].totalAvailable += slot.availablePlants || 0;
        currentGroup.subtypeGroups[subtypeName].slotCount += 1;
      }
    });

    // Add the last group
    if (currentGroup) {
      grouped.push(currentGroup);
    }

    return grouped;
  }, [availability, groupByDays, showGroupedView]);

  return (
    <Card
      elevation={3}
      sx={{
        mb: 3,
        borderRadius: 3,
        overflow: "hidden",
        background: "linear-gradient(to bottom, #fff 0%, #fafafa 100%)",
      }}>
      {/* Header */}
      <CardHeader
        title={
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: "error.50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
              <NotificationsIcon sx={{ fontSize: 32, color: "error.main" }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#d32f2f" }}>
                Sowing Alerts & Reminders
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Select a plant to view booking gaps and sowing alerts
              </Typography>
            </Box>
          </Stack>
        }
        action={
          selectedPlant && (
            <Stack direction="row" spacing={1}>
              <Tooltip title="Refresh">
                <IconButton
                  onClick={handleRefresh}
                  disabled={currentLoading}
                  sx={{
                    bgcolor: "primary.50",
                    "&:hover": { bgcolor: "primary.100" },
                  }}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Stack>
          )
        }
        sx={{
          bgcolor: "error.50",
          borderBottom: "3px solid",
          borderColor: "error.main",
          py: 2,
        }}
      />

      <CardContent sx={{ p: 3 }}>
        {/* Plant Selector */}
        <Box sx={{ mb: 4 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="plant-select-label" required>
              Select Plant *
            </InputLabel>
            <Select
              labelId="plant-select-label"
              value={selectedPlant?._id || ""}
              label="Select Plant *"
              onChange={(e) => {
                const plant = plants.find((p) => p._id === e.target.value);
                setSelectedPlant(plant || null);
                setFilterPriority(null);
                setSearchTerm("");
              }}
              required
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: "white",
                },
              }}>
              {loading ? (
                <MenuItem disabled>Loading plants...</MenuItem>
              ) : (
                plants.map((plant) => (
                  <MenuItem key={plant._id} value={plant._id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PlantIcon fontSize="small" color="primary" />
                      <Typography>{plant.name}</Typography>
                      {plant.sowingAllowed && (
                        <Chip label="Sowing" size="small" color="success" sx={{ height: 20, fontSize: "0.65rem" }} />
                      )}
                    </Stack>
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          {selectedPlant && (
            <>
              <Alert severity="info" icon={<AgricultureIcon />} sx={{ borderRadius: 2, mb: 3 }}>
                <Typography variant="body2">
                  Viewing data for <strong>{selectedPlant.name}</strong>
                </Typography>
              </Alert>
              
              {/* Advanced Filters Section */}
              <Card elevation={1} sx={{ mb: 3, borderRadius: 2, bgcolor: "grey.50" }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                    <FilterIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                      Filters & Options
                    </Typography>
                  </Stack>
                  
                  <Grid container spacing={2}>
                    {/* Subtype Filter */}
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Filter by Subtype</InputLabel>
                        <Select
                          value={filterSubtype || ""}
                          label="Filter by Subtype"
                          onChange={(e) => setFilterSubtype(e.target.value || null)}
                          endAdornment={
                            filterSubtype && (
                              <InputAdornment position="end">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFilterSubtype(null);
                                  }}
                                  sx={{ mr: 1 }}>
                                  <ClearIcon fontSize="small" />
                                </IconButton>
                              </InputAdornment>
                            )
                          }>
                          <MenuItem value="">All Subtypes</MenuItem>
                          {selectedPlant?.subtypes?.map((subtype) => (
                            <MenuItem key={subtype._id} value={subtype._id}>
                              {subtype.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    {/* Priority Filter */}
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Filter by Priority</InputLabel>
                        <Select
                          value={filterPriority || ""}
                          label="Filter by Priority"
                          onChange={(e) => setFilterPriority(e.target.value || null)}
                          endAdornment={
                            filterPriority && (
                              <InputAdornment position="end">
                                <IconButton
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFilterPriority(null);
                                  }}
                                  sx={{ mr: 1 }}>
                                  <ClearIcon fontSize="small" />
                                </IconButton>
                              </InputAdornment>
                            )
                          }>
                          <MenuItem value="">All Priorities</MenuItem>
                          <MenuItem value="overdue">
                            <Chip size="small" color="error" icon={<WarningIcon />} label="Overdue" />
                          </MenuItem>
                          <MenuItem value="urgent">
                            <Chip size="small" color="warning" icon={<BoltIcon />} label="Urgent" />
                          </MenuItem>
                          <MenuItem value="upcoming">
                            <Chip size="small" color="info" icon={<CheckIcon />} label="Upcoming" />
                          </MenuItem>
                          <MenuItem value="future">
                            <Chip size="small" color="default" icon={<CalendarIcon />} label="Future" />
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    {/* Date Range Filter */}
                    <Grid item xs={12} md={6}>
                      <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <DatePicker
                            label="Start Date"
                            value={filterDateRange[0]}
                            onChange={(newValue) => setFilterDateRange([newValue, filterDateRange[1]])}
                            slotProps={{
                              textField: {
                                size: "small",
                                fullWidth: true,
                              },
                            }}
                          />
                          <Typography variant="body2" color="textSecondary">
                            to
                          </Typography>
                          <DatePicker
                            label="End Date"
                            value={filterDateRange[1]}
                            onChange={(newValue) => setFilterDateRange([filterDateRange[0], newValue])}
                            minDate={filterDateRange[0]}
                            slotProps={{
                              textField: {
                                size: "small",
                                fullWidth: true,
                              },
                            }}
                          />
                          {(filterDateRange[0] || filterDateRange[1]) && (
                            <IconButton
                              size="small"
                              onClick={() => setFilterDateRange([null, null])}
                              color="error">
                              <ClearIcon />
                            </IconButton>
                          )}
                        </Stack>
                      </LocalizationProvider>
                    </Grid>
                    
                    {/* Quick Date Range Buttons */}
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EventIcon />}
                          onClick={() => {
                            const today = new Date();
                            setFilterDateRange([today, new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)]);
                          }}>
                          Next 7 Days
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EventIcon />}
                          onClick={() => {
                            const today = new Date();
                            setFilterDateRange([today, new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000)]);
                          }}>
                          Next 14 Days
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<EventIcon />}
                          onClick={() => {
                            const today = new Date();
                            const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                            setFilterDateRange([today, endOfMonth]);
                          }}>
                          This Month
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<ClearIcon />}
                          onClick={() => {
                            setFilterPriority(null);
                            setFilterSubtype(null);
                            setFilterDateRange([null, null]);
                            setShowAvailable(false);
                            setShowGap(false);
                            setSearchTerm("");
                            setGroupByDays("");
                            setShowGroupedView(false);
                          }}>
                          Clear All Filters
                        </Button>
                      </Stack>
                    </Grid>
                    
                    {/* Show Available / Show Gap Toggles (Reminders only) */}
                    {activeTab === 0 && (
                      <Grid item xs={12}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Chip
                            label="Show Available Plants"
                            onClick={() => setShowAvailable(!showAvailable)}
                            color={showAvailable ? "success" : "default"}
                            icon={<InventoryIcon />}
                            variant={showAvailable ? "filled" : "outlined"}
                            clickable
                          />
                          <Chip
                            label="Show Booking Gap (Need to Sow)"
                            onClick={() => setShowGap(!showGap)}
                            color={showGap ? "warning" : "default"}
                            icon={<WarningIcon />}
                            variant={showGap ? "filled" : "outlined"}
                            clickable
                          />
                        </Stack>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            </>
          )}
        </Box>

        {!selectedPlant ? (
          <EmptyMessage
            message="Please select a plant to view reminders and alerts"
            icon={PlantIcon}
            action={
              <Button variant="contained" startIcon={<PlantIcon />} onClick={fetchPlants} disabled={loading}>
                {loading ? "Loading..." : "Load Plants"}
              </Button>
            }
          />
        ) : (
          <>
            {/* Tabs */}
            <Box sx={{ mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => {
                  setActiveTab(newValue);
                  setFilterPriority(null);
                  setSearchTerm("");
                }}
                sx={{
                  borderBottom: 2,
                  borderColor: "divider",
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: "1rem",
                  },
                }}>
                <Tab
                  icon={<Schedule />}
                  iconPosition="start"
                  label="Reminders"
                  sx={{
                    "&.Mui-selected": {
                      color: "primary.main",
                    },
                  }}
                />
                <Tab
                  icon={<WarningIcon />}
                  iconPosition="start"
                  label="Alerts"
                  sx={{
                    "&.Mui-selected": {
                      color: "error.main",
                    },
                  }}
                />
                <Tab
                  icon={<InventoryIcon />}
                  iconPosition="start"
                  label="Availability"
                  sx={{
                    "&.Mui-selected": {
                      color: "success.main",
                    },
                  }}
                />
              </Tabs>
            </Box>

            {/* Filters and Search */}
            {currentData && (
              <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  placeholder="Search by subtype, date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flex: 1, minWidth: 250, bgcolor: "white" }}
                />
                <FormControl size="small" sx={{ minWidth: 150, bgcolor: "white" }}>
                  <InputLabel>Filter Priority</InputLabel>
                  <Select
                    value={filterPriority || ""}
                    label="Filter Priority"
                    onChange={(e) => setFilterPriority(e.target.value || null)}>
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="overdue">Overdue</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                    <MenuItem value="upcoming">Upcoming</MenuItem>
                    <MenuItem value="future">Future</MenuItem>
                  </Select>
                </FormControl>
                {filterPriority && (
                  <Chip
                    label={`Filter: ${filterPriority}`}
                    onDelete={() => setFilterPriority(null)}
                    color="primary"
                  />
                )}
              </Box>
            )}

            {/* Loading State */}
            {currentLoading && (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress size={48} />
                <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
                  Loading {activeTab === 0 ? "reminders" : "alerts"}...
                </Typography>
              </Box>
            )}

            {/* Reminders Tab */}
            {activeTab === 0 && reminders && !remindersLoading && (
              <>
                {/* Enhanced Summary Cards with Visual Insights */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  {/* Booking Gap (Need to Sow) - Most Important */}
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)",
                        color: "white",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 8px 24px rgba(238, 90, 111, 0.3)",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: -50,
                          right: -50,
                          width: 150,
                          height: 150,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                        },
                      }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: "relative", zIndex: 1 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 56,
                            minHeight: 56,
                          }}>
                          <WarningIcon sx={{ fontSize: 32, color: "white" }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1 }}>
                            Need to Sow
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, fontSize: "2.5rem" }}>
                            {formatNumber(reminders.summary?.totalBookingGap || 0)}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mt: 0.5 }}>
                            Plants requiring immediate attention
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                  
                  {/* Available Plants */}
                  <Grid item xs={12} sm={6} md={4}>
                    <Paper
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: "linear-gradient(135deg, #51cf66 0%, #40c057 100%)",
                        color: "white",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 8px 24px rgba(64, 192, 87, 0.3)",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: -50,
                          right: -50,
                          width: 150,
                          height: 150,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                        },
                      }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: "relative", zIndex: 1 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 56,
                            minHeight: 56,
                          }}>
                          <InventoryIcon sx={{ fontSize: 32, color: "white" }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1 }}>
                            Available
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, fontSize: "2.5rem" }}>
                            {formatNumber(reminders.summary?.totalAvailable || 0)}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mt: 0.5 }}>
                            Plants ready for new bookings
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                  
                  {/* Surplus (Available for Booking) */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: "linear-gradient(135deg, #9775fa 0%, #845ef7 100%)",
                        color: "white",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 8px 24px rgba(132, 94, 247, 0.3)",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: -50,
                          right: -50,
                          width: 150,
                          height: 150,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                        },
                      }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: "relative", zIndex: 1 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 56,
                            minHeight: 56,
                          }}>
                          <TrendingUp sx={{ fontSize: 32, color: "white" }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1 }}>
                            Surplus
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, fontSize: "2.5rem" }}>
                            {formatNumber(reminders.summary?.totalSurplus || reminders.summary?.totalAvailable || 0)}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mt: 0.5 }}>
                            Available capacity for booking (slot-wise)
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                  
                  {/* Booked Plants */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        background: "linear-gradient(135deg, #4dabf7 0%, #339af0 100%)",
                        color: "white",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 8px 24px rgba(51, 154, 240, 0.3)",
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: -50,
                          right: -50,
                          width: 150,
                          height: 150,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.1)",
                        },
                      }}>
                      <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ position: "relative", zIndex: 1 }}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.2)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 56,
                            minHeight: 56,
                          }}>
                          <CheckIcon sx={{ fontSize: 32, color: "white" }} />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1 }}>
                            Booked
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700, mt: 0.5, fontSize: "2.5rem" }}>
                            {formatNumber(reminders.summary?.totalBooked || 
                              reminders.reminders?.reduce((sum, r) => sum + (r.totalBookedPlants || 0), 0) || 0)}
                          </Typography>
                          <Typography variant="caption" sx={{ opacity: 0.9, display: "block", mt: 0.5 }}>
                            Total plants booked across all slots
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                  
                  {/* Priority Breakdown */}
                  <Grid item xs={12}>
                    <Card elevation={2} sx={{ borderRadius: 2, bgcolor: "grey.50" }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: "text.primary" }}>
                          Priority Breakdown
                        </Typography>
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, bgcolor: "error.50", borderRadius: 2, border: "2px solid", borderColor: "error.200" }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <WarningIcon color="error" fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: "error.main" }}>
                                  Overdue
                                </Typography>
                              </Stack>
                              <Typography variant="h4" sx={{ fontWeight: 700, color: "error.main" }}>
                                {reminders.summary?.overdueCount || 0}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, bgcolor: "warning.50", borderRadius: 2, border: "2px solid", borderColor: "warning.200" }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <BoltIcon color="warning" fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: "warning.main" }}>
                                  Urgent
                                </Typography>
                              </Stack>
                              <Typography variant="h4" sx={{ fontWeight: 700, color: "warning.main" }}>
                                {reminders.summary?.urgentCount || 0}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, bgcolor: "info.50", borderRadius: 2, border: "2px solid", borderColor: "info.200" }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <CheckIcon color="info" fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: "info.main" }}>
                                  Upcoming
                                </Typography>
                              </Stack>
                              <Typography variant="h4" sx={{ fontWeight: 700, color: "info.main" }}>
                                {reminders.summary?.upcomingCount || 0}
                              </Typography>
                            </Paper>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Paper sx={{ p: 2, bgcolor: "grey.100", borderRadius: 2, border: "2px solid", borderColor: "grey.300" }}>
                              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <CalendarIcon color="action" fontSize="small" />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary" }}>
                                  Future
                                </Typography>
                              </Stack>
                              <Typography variant="h4" sx={{ fontWeight: 700, color: "text.secondary" }}>
                                {(reminders.summary?.totalSlots || 0) - 
                                  (reminders.summary?.overdueCount || 0) - 
                                  (reminders.summary?.urgentCount || 0) - 
                                  (reminders.summary?.upcomingCount || 0)}
                              </Typography>
                            </Paper>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                {/* Plant Information Card */}
                {reminders.plantInfo && (
                  <Card elevation={2} sx={{ mb: 4, borderRadius: 2, bgcolor: "info.50" }}>
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <PlantIcon sx={{ fontSize: 40, color: "info.main" }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: "info.main" }}>
                            {reminders.plantInfo.plantName}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            Total Slots: {reminders.summary?.totalSlots || 0} | 
                            Sowing Allowed: {reminders.plantInfo.sowingAllowed ? "Yes" : "No"}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                )}

                {/* Subtype Summary */}
                {reminders.subtypeSummary && reminders.subtypeSummary.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      🌿 Plant-wise Summary
                    </Typography>
                    <Paper sx={{ overflow: "hidden", borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "primary.50" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Subtype</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Total Booked
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Primary Sowed
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Booking Gap
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Available
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Surplus
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Completion
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>
                              Slots
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reminders.subtypeSummary.map((subtype) => (
                            <TableRow
                              key={subtype._id}
                              hover
                              sx={{
                                "&:nth-of-type(odd)": { bgcolor: "grey.50" },
                              }}>
                              <TableCell>
                                <Typography sx={{ fontWeight: 600 }}>{subtype.subtypeName}</Typography>
                              </TableCell>
                              <TableCell align="right">{formatNumber(subtype.totalBookedPlants)}</TableCell>
                              <TableCell align="right">{formatNumber(subtype.totalPrimarySowed)}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={formatNumber(subtype.totalBookingGap)}
                                  size="small"
                                  color={subtype.totalBookingGap > 0 ? "warning" : "default"}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={formatNumber(subtype.totalAvailable)}
                                  size="small"
                                  color={subtype.totalAvailable > 0 ? "success" : "default"}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={formatNumber(subtype.totalAvailable || 0)}
                                  size="small"
                                  color={subtype.totalAvailable > 0 ? "secondary" : "default"}
                                  sx={{ bgcolor: subtype.totalAvailable > 0 ? "purple.100" : undefined }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={`${subtype.completionPercentage?.toFixed(1) || 0}%`}
                                  size="small"
                                  color={
                                    subtype.completionPercentage >= 90
                                      ? "success"
                                      : subtype.completionPercentage >= 50
                                      ? "warning"
                                      : "error"
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={subtype.slotCount} size="small" variant="outlined" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  </Box>
                )}

                {/* Subtype-wise Details */}
                {remindersBySubtype.length > 0 ? (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      📋 Subtype-wise Details
                    </Typography>
                    {remindersBySubtype.map((subtypeGroup) => (
                      <Accordion
                        key={subtypeGroup.subtypeId}
                        expanded={expandedSubtypes[subtypeGroup.subtypeId] || false}
                        onChange={() => toggleSubtype(subtypeGroup.subtypeId)}
                        sx={{
                          mb: 2,
                          borderRadius: 2,
                          "&:before": { display: "none" },
                          boxShadow: 2,
                        }}>
                        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: "primary.50" }}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%", mr: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                              {subtypeGroup.subtypeName}
                            </Typography>
                            <Chip
                              label={`${subtypeGroup.reminders.length} slots`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                            <Chip
                              label={`Gap: ${formatNumber(subtypeGroup.totalBookingGap)}`}
                              size="small"
                              color="warning"
                            />
                            <Chip
                              label={`Available: ${formatNumber(subtypeGroup.totalAvailable)}`}
                              size="small"
                              color="success"
                            />
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: "grey.100" }}>
                                <TableCell sx={{ fontWeight: 600 }}>Slot Period</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  Booked
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  Sowed
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  Gap
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  Available
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  Surplus
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                  Sow-by
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                  Priority
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                  Action
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {subtypeGroup.reminders.map((reminder) => (
                                <TableRow
                                  key={reminder.slotId}
                                  hover
                                  sx={{
                                    bgcolor:
                                      reminder.priority === "overdue"
                                        ? "error.50"
                                        : reminder.priority === "urgent"
                                        ? "warning.50"
                                        : "inherit",
                                  }}>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {reminder.slotStartDay} → {reminder.slotEndDay}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                      {reminder.month}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">{formatNumber(reminder.totalBookedPlants)}</TableCell>
                                  <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                      {formatNumber(reminder.primarySowed)}
                                      {reminder.primarySowed > 0 && reminder.slotId && (
                                        <Tooltip title="View who entered primary sowing data">
                                          <IconButton
                                            size="small"
                                            onClick={() => handleOpenTrailDialog(reminder.slotId)}
                                            sx={{ ml: 0.5, p: 0.5 }}>
                                            <PersonIcon fontSize="small" color="primary" />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Stack>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={formatNumber(reminder.bookingGap)}
                                      size="small"
                                      color={reminder.bookingGap > 0 ? "warning" : "default"}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={formatNumber(reminder.availablePlants)}
                                      size="small"
                                      color={reminder.availablePlants > 0 ? "success" : "default"}
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={formatNumber(reminder.surplus || reminder.availablePlants || 0)}
                                      size="small"
                                      color={reminder.surplus || reminder.availablePlants > 0 ? "secondary" : "default"}
                                      sx={{ 
                                        bgcolor: (reminder.surplus || reminder.availablePlants) > 0 ? "purple.100" : undefined,
                                        color: (reminder.surplus || reminder.availablePlants) > 0 ? "purple.700" : undefined,
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2">{reminder.sowByDate}</Typography>
                                    {reminder.daysUntilSow !== undefined && (
                                      <Typography
                                        variant="caption"
                                        color={
                                          reminder.daysUntilSow < 0
                                            ? "error.main"
                                            : reminder.daysUntilSow <= 2
                                            ? "warning.main"
                                            : "textSecondary"
                                        }>
                                        {reminder.daysUntilSow < 0
                                          ? `${Math.abs(reminder.daysUntilSow)}d overdue`
                                          : `${reminder.daysUntilSow}d left`}
                                      </Typography>
                                    )}
                                  </TableCell>
                                  <TableCell align="center">{renderPriorityChip(reminder.priority)}</TableCell>
                                  <TableCell align="center">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<Visibility />}
                                      onClick={() =>
                                        onNavigateToSlot?.({
                                          slotId: reminder.slotId,
                                          plantId: reminder.plantId,
                                          subtypeId: reminder.subtypeId,
                                          plantName: reminder.plantName,
                                          subtypeName: reminder.subtypeName,
                                        })
                                      }>
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                ) : (
                  !currentLoading && (
                    <EmptyMessage
                      message={`No reminders found for ${selectedPlant?.name || "selected plant"}`}
                      icon={CheckIcon}
                    />
                  )
                )}
              </>
            )}

            {/* Alerts Tab */}
            {activeTab === 1 && alerts && !alertsLoading && (
              <>
                {/* Summary Cards */}
                <Grid container spacing={2} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                      label="Total Alerts"
                      value={alerts.summary?.totalAlerts || 0}
                      icon={<NotificationsIcon fontSize="small" color="primary" />}
                      tone="primary"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                      label="Total Pending"
                      value={alerts.summary?.totalPending || 0}
                      icon={<WarningIcon fontSize="small" color="warning" />}
                      tone="warning"
                      subtitle="Plants pending"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                      label="Overdue"
                      value={alerts.summary?.overdueCount || 0}
                      icon={<WarningIcon fontSize="small" color="error" />}
                      tone="error"
                      subtitle="Past deadline"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <SummaryCard
                      label="Urgent"
                      value={alerts.summary?.urgentCount || 0}
                      icon={<BoltIcon fontSize="small" color="error" />}
                      tone="error"
                      subtitle="≤2 days left"
                    />
                  </Grid>
                </Grid>

                {/* Subtype Summary */}
                {alerts.subtypeAlerts && alerts.subtypeAlerts.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      🌿 Plant-wise Summary
                    </Typography>
                    <Paper sx={{ overflow: "hidden", borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "error.50" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Subtype</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>
                              Total Pending
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>
                              Slots
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {alerts.subtypeAlerts.map((subtype) => (
                            <TableRow
                              key={subtype._id}
                              hover
                              sx={{
                                "&:nth-of-type(odd)": { bgcolor: "grey.50" },
                              }}>
                              <TableCell>
                                <Typography sx={{ fontWeight: 600 }}>{subtype.subtypeName}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={formatNumber(subtype.totalPending)}
                                  size="small"
                                  color={subtype.totalPending > 0 ? "warning" : "default"}
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={subtype.slotCount} size="small" variant="outlined" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  </Box>
                )}

                {/* Subtype-wise Alerts */}
                {alertsBySubtype.length > 0 ? (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      📋 Subtype-wise Alerts
                    </Typography>
                    {alertsBySubtype.map((subtypeGroup) => (
                      <Accordion
                        key={subtypeGroup.subtypeId}
                        expanded={expandedSubtypes[subtypeGroup.subtypeId] || false}
                        onChange={() => toggleSubtype(subtypeGroup.subtypeId)}
                        sx={{
                          mb: 2,
                          borderRadius: 2,
                          "&:before": { display: "none" },
                          boxShadow: 2,
                        }}>
                        <AccordionSummary expandIcon={<ExpandMore />} sx={{ bgcolor: "error.50" }}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%", mr: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
                              {subtypeGroup.subtypeName}
                            </Typography>
                            <Chip
                              label={`${subtypeGroup.alerts.length} slots`}
                              size="small"
                              color="error"
                              variant="outlined"
                            />
                            <Chip
                              label={`Pending: ${formatNumber(subtypeGroup.totalPending)}`}
                              size="small"
                              color="warning"
                            />
                          </Stack>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 0 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: "grey.100" }}>
                                <TableCell sx={{ fontWeight: 600 }}>Slot Period</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  Booked
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  Sowed
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 600 }}>
                                  Pending
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                  Sow-by
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                  Days Left
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                  Priority
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 600 }}>
                                  Action
                                </TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {subtypeGroup.alerts.map((alert) => (
                                <TableRow
                                  key={alert.slotId}
                                  hover
                                  sx={{
                                    bgcolor:
                                      alert.priority === "overdue"
                                        ? "error.50"
                                        : alert.priority === "urgent"
                                        ? "warning.50"
                                        : "inherit",
                                  }}>
                                  <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                      {alert.slotStartDay} → {alert.slotEndDay}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                      {alert.month}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">{formatNumber(alert.totalBookedPlants)}</TableCell>
                                  <TableCell align="right">
                                    <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                                      {formatNumber(alert.primarySowed)}
                                      {alert.primarySowed > 0 && alert.slotId && (
                                        <Tooltip title="View who entered primary sowing data">
                                          <IconButton
                                            size="small"
                                            onClick={() => handleOpenTrailDialog(alert.slotId)}
                                            sx={{ ml: 0.5, p: 0.5 }}>
                                            <PersonIcon fontSize="small" color="primary" />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Stack>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip
                                      label={formatNumber(alert.pendingQuantity)}
                                      size="small"
                                      color={alert.pendingQuantity > 0 ? "warning" : "default"}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <Typography variant="body2">{alert.sowByDate}</Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={
                                        alert.daysUntilSow < 0
                                          ? `${Math.abs(alert.daysUntilSow)}d overdue`
                                          : `${alert.daysUntilSow}d left`
                                      }
                                      size="small"
                                      color={
                                        alert.daysUntilSow < 0
                                          ? "error"
                                          : alert.daysUntilSow <= 2
                                          ? "warning"
                                          : "default"
                                      }
                                    />
                                  </TableCell>
                                  <TableCell align="center">{renderPriorityChip(alert.priority)}</TableCell>
                                  <TableCell align="center">
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color={alert.priority === "overdue" ? "error" : "primary"}
                                      startIcon={<Visibility />}
                                      onClick={() =>
                                        onNavigateToSlot?.({
                                          slotId: alert.slotId,
                                          plantId: alert.plantId,
                                          subtypeId: alert.subtypeId,
                                          plantName: alert.plantName,
                                          subtypeName: alert.subtypeName,
                                        })
                                      }>
                                      View
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </Box>
                ) : (
                  !currentLoading && (
                    <EmptyMessage
                      message={`No alerts found for ${selectedPlant?.name || "selected plant"}`}
                      icon={CheckIcon}
                    />
                  )
                )}
              </>
            )}

            {/* Availability Tab */}
            {activeTab === 2 && availability && !availabilityLoading && (
              <>
                {/* Grouped View Controls */}
                <Card elevation={2} sx={{ mb: 3, borderRadius: 2, bgcolor: "info.50" }}>
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 150, bgcolor: "white" }}>
                          <TextField
                            size="small"
                            type="number"
                            label="Group by Days"
                            value={groupByDays}
                            onChange={(e) => {
                              const value = e.target.value;
                              setGroupByDays(value);
                              setShowGroupedView(value !== "" && parseInt(value, 10) > 0);
                            }}
                            inputProps={{ min: 1, max: 365 }}
                            helperText="Enter number of days to group slots"
                            sx={{ bgcolor: "white" }}
                          />
                        </FormControl>
                        {groupByDays && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<ClearIcon />}
                            onClick={() => {
                              setGroupByDays("");
                              setShowGroupedView(false);
                            }}>
                            Clear Grouping
                          </Button>
                        )}
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {showGroupedView 
                          ? `Showing grouped view with ${groupByDays} days per group (only available plants)` 
                          : "Individual slot view"}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Grouped Availability View - Compact Table */}
                {showGroupedView && groupedAvailability.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Card elevation={2} sx={{ borderRadius: 2, overflow: "hidden", border: "2px solid", borderColor: "primary.200" }}>
                      <CardContent sx={{ p: 0 }}>
                        <Box sx={{ bgcolor: "primary.50", p: 2, borderBottom: "2px solid", borderColor: "primary.300" }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                            📊 Grouped Availability ({groupByDays} days per group)
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Showing only slots with available plants
                          </Typography>
                        </Box>
                        <Table size="small" sx={{ borderCollapse: "separate" }}>
                          <TableHead>
                            <TableRow sx={{ bgcolor: "grey.100" }}>
                              <TableCell 
                                sx={{ 
                                  fontWeight: 700, 
                                  borderRight: "1px solid", 
                                  borderBottom: "2px solid",
                                  borderColor: "grey.300",
                                  minWidth: 180
                                }}>
                                Period
                              </TableCell>
                              <TableCell 
                                align="center" 
                                sx={{ 
                                  fontWeight: 700, 
                                  borderRight: "1px solid", 
                                  borderBottom: "2px solid",
                                  borderColor: "grey.300",
                                  minWidth: 100
                                }}>
                                Slots
                              </TableCell>
                              <TableCell 
                                align="right" 
                                sx={{ 
                                  fontWeight: 700, 
                                  borderRight: "1px solid", 
                                  borderBottom: "2px solid",
                                  borderColor: "grey.300",
                                  minWidth: 150
                                }}>
                                Total Available
                              </TableCell>
                              <TableCell 
                                sx={{ 
                                  fontWeight: 700, 
                                  borderBottom: "2px solid",
                                  borderColor: "grey.300"
                                }}>
                                By Subtype (Available Plants)
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {groupedAvailability.map((group, index) => (
                              <TableRow
                                key={index}
                                sx={{
                                  "&:hover": { bgcolor: "action.hover" },
                                  "&:not(:last-child)": {
                                    borderBottom: "2px solid",
                                    borderColor: "grey.200"
                                  },
                                  "&:nth-of-type(even)": {
                                    bgcolor: "grey.50"
                                  }
                                }}>
                                <TableCell 
                                  sx={{ 
                                    fontWeight: 600, 
                                    borderRight: "1px solid",
                                    borderColor: "grey.300",
                                    verticalAlign: "top"
                                  }}>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main", mb: 0.5 }}>
                                    {moment(group.startDate, "DD-MM-YYYY").format("DD MMM")} - {moment(group.endDate, "DD-MM-YYYY").format("DD MMM YYYY")}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {moment(group.startDate, "DD-MM-YYYY").format("YYYY")}
                                  </Typography>
                                </TableCell>
                                <TableCell 
                                  align="center" 
                                  sx={{ 
                                    borderRight: "1px solid",
                                    borderColor: "grey.300",
                                    verticalAlign: "top"
                                  }}>
                                  <Chip 
                                    label={group.slots.length} 
                                    size="small" 
                                    variant="outlined" 
                                    color="primary"
                                    sx={{ fontWeight: 600 }}
                                  />
                                </TableCell>
                                <TableCell 
                                  align="right" 
                                  sx={{ 
                                    borderRight: "1px solid",
                                    borderColor: "grey.300",
                                    verticalAlign: "top"
                                  }}>
                                  <Typography 
                                    variant="h6" 
                                    sx={{ 
                                      fontWeight: 700, 
                                      color: "success.main",
                                      fontSize: "1.5rem"
                                    }}>
                                    {formatNumber(group.totalAvailable)}
                                  </Typography>
                                </TableCell>
                                <TableCell sx={{ verticalAlign: "top" }}>
                                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                                    {Object.values(group.subtypeGroups).map((subtypeGroup, idx) => (
                                      <Box
                                        key={idx}
                                        sx={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 1,
                                          p: 1,
                                          borderRadius: 1,
                                          bgcolor: "success.50",
                                          border: "1px solid",
                                          borderColor: "success.300",
                                          mb: 0.5,
                                        }}>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            fontWeight: 600,
                                            fontSize: "0.875rem"
                                          }}>
                                          {subtypeGroup.subtypeName}:
                                        </Typography>
                                        <Chip
                                          label={formatNumber(subtypeGroup.totalAvailable)}
                                          size="small"
                                          color="success"
                                          sx={{ 
                                            fontWeight: 700,
                                            fontSize: "0.75rem",
                                            height: 24
                                          }}
                                        />
                                        <Typography 
                                          variant="caption" 
                                          color="textSecondary"
                                          sx={{ fontSize: "0.7rem" }}>
                                          ({subtypeGroup.slotCount} slot{subtypeGroup.slotCount !== 1 ? 's' : ''})
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <Box sx={{ bgcolor: "grey.50", p: 1.5, borderTop: "2px solid", borderColor: "grey.300" }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="textSecondary">
                              Total Groups: {groupedAvailability.length}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
                              Grand Total Available: {formatNumber(
                                groupedAvailability.reduce((sum, group) => sum + group.totalAvailable, 0)
                              )}
                            </Typography>
                          </Stack>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>
                )}

                {/* Single Comprehensive Availability Card */}
                <Card
                  elevation={4}
                  sx={{
                    mb: 4,
                    borderRadius: 3,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "0 12px 40px rgba(102, 126, 234, 0.4)",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: -100,
                      right: -100,
                      width: 300,
                      height: 300,
                      borderRadius: "50%",
                      background: "rgba(255,255,255,0.1)",
                    },
                  }}>
                  <CardContent sx={{ p: 4, position: "relative", zIndex: 1 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: "rgba(255,255,255,0.2)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}>
                        <InventoryIcon sx={{ fontSize: 40, color: "white" }} />
                      </Box>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: "white" }}>
                        Slot Availability Summary
                      </Typography>
                    </Stack>
                    
                    <Grid container spacing={3}>
                      {/* Available - Ready for Booking */}
                      <Grid item xs={12} md={4}>
                        <Paper
                          sx={{
                            p: 3,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.95)",
                            color: "#2e7d32",
                            height: "100%",
                            border: "2px solid",
                            borderColor: "#4caf50",
                          }}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                            <CheckCircle sx={{ fontSize: 28, color: "#4caf50" }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#4caf50" }}>
                              Available (Ready for Booking)
                            </Typography>
                          </Stack>
                          <Typography variant="h2" sx={{ fontWeight: 700, color: "#2e7d32", fontSize: "3rem", lineHeight: 1.2 }}>
                            {formatNumber(availability.summary?.totalAvailable || 0)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Plants ready for new bookings
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      {/* Booked */}
                      <Grid item xs={12} md={4}>
                        <Paper
                          sx={{
                            p: 3,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.95)",
                            color: "#1976d2",
                            height: "100%",
                            border: "2px solid",
                            borderColor: "#42a5f5",
                          }}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                            <CalendarIcon sx={{ fontSize: 28, color: "#42a5f5" }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#1976d2" }}>
                              Booked
                            </Typography>
                          </Stack>
                          <Typography variant="h2" sx={{ fontWeight: 700, color: "#1976d2", fontSize: "3rem", lineHeight: 1.2 }}>
                            {formatNumber(availability.summary?.totalBooked || 0)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Total plants booked across slots
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      {/* Primary Sowed */}
                      <Grid item xs={12} md={4}>
                        <Paper
                          sx={{
                            p: 3,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.95)",
                            color: "#ed6c02",
                            height: "100%",
                            border: "2px solid",
                            borderColor: "#ff9800",
                          }}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                            <AgricultureIcon sx={{ fontSize: 28, color: "#ff9800" }} />
                            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "#ed6c02" }}>
                              Primary Sowed
                            </Typography>
                          </Stack>
                          <Typography variant="h2" sx={{ fontWeight: 700, color: "#ed6c02", fontSize: "3rem", lineHeight: 1.2 }}>
                            {formatNumber(availability.summary?.totalPrimarySowed || 0)}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Plants already sowed in field (real)
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      {/* Utilization Rate */}
                      <Grid item xs={12}>
                        <Paper
                          sx={{
                            p: 2,
                            borderRadius: 2,
                            bgcolor: "rgba(255,255,255,0.15)",
                            border: "1px solid",
                            borderColor: "rgba(255,255,255,0.3)",
                          }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={6}>
                              <Typography variant="body1" sx={{ color: "white", fontWeight: 600 }}>
                                Total Slots: {availability.summary?.totalSlots || 0}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="body1" sx={{ color: "white", fontWeight: 600 }}>
                                  Utilization Rate:
                                </Typography>
                                <Chip
                                  label={`${availability.summary?.avgUtilization?.toFixed(1) || 0}%`}
                                  sx={{
                                    bgcolor: "rgba(255,255,255,0.2)",
                                    color: "white",
                                    fontWeight: 700,
                                    fontSize: "1rem",
                                  }}
                                />
                              </Stack>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>

                {/* Subtype Availability Summary */}
                {availability.subtypeAvailability && availability.subtypeAvailability.length > 0 && (
                  <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      🌿 Subtype-wise Availability
                    </Typography>
                    <Paper sx={{ overflow: "hidden", borderRadius: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "success.50" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Subtype</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Available</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Booked</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Primary Sowed</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Capacity</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>Utilization</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>Slots</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {availability.subtypeAvailability.map((subtype) => (
                            <TableRow
                              key={subtype._id}
                              hover
                              sx={{
                                "&:nth-of-type(odd)": { bgcolor: "grey.50" },
                              }}>
                              <TableCell>
                                <Typography sx={{ fontWeight: 600 }}>{subtype.subtypeName}</Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={formatNumber(subtype.totalAvailable)}
                                  size="small"
                                  color="success"
                                />
                              </TableCell>
                              <TableCell align="right">{formatNumber(subtype.totalBooked)}</TableCell>
                              <TableCell align="right">{formatNumber(subtype.totalPrimarySowed)}</TableCell>
                              <TableCell align="right">{formatNumber(subtype.totalCapacity)}</TableCell>
                              <TableCell align="right">
                                <Chip
                                  label={`${subtype.utilizationRate?.toFixed(1) || 0}%`}
                                  size="small"
                                  color={
                                    subtype.utilizationRate >= 90
                                      ? "error"
                                      : subtype.utilizationRate >= 50
                                      ? "warning"
                                      : "success"
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Chip label={subtype.slotCount} size="small" variant="outlined" />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  </Box>
                )}

                {/* Slot-wise Availability Details */}
                {!showGroupedView && availability.availability && availability.availability.length > 0 ? (
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      📅 Available Slots (Only showing slots with availability)
                    </Typography>
                    {availability.availability.map((slot) => (
                      <Card key={slot.slotId} elevation={2} sx={{ mb: 2, borderRadius: 2 }}>
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={3}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {slot.subtypeName}
                              </Typography>
                              <Typography variant="body2" color="textSecondary">
                                {slot.slotStartDay} → {slot.slotEndDay}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {slot.month}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                              <Typography variant="caption" color="textSecondary">
                                Available
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
                                {formatNumber(slot.availablePlants)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                              <Typography variant="caption" color="textSecondary">
                                Primary Sowed
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: "info.main" }}>
                                {formatNumber(slot.primarySowed)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                              <Typography variant="caption" color="textSecondary">
                                Booked
                              </Typography>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                {formatNumber(slot.totalBookedPlants)}
                              </Typography>
                            </Grid>
                            <Grid item xs={6} md={2}>
                              <Typography variant="caption" color="textSecondary">
                                Utilization
                              </Typography>
                              <Chip
                                label={`${slot.utilizationRate?.toFixed(1) || 0}%`}
                                size="small"
                                color={
                                  slot.utilizationRate >= 90
                                    ? "error"
                                    : slot.utilizationRate >= 50
                                    ? "warning"
                                    : "success"
                                }
                              />
                            </Grid>
                            <Grid item xs={12} md={1}>
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                startIcon={<Visibility />}
                                onClick={() =>
                                  onNavigateToSlot?.({
                                    slotId: slot.slotId,
                                    plantId: slot.plantId,
                                    subtypeId: slot.subtypeId,
                                    plantName: slot.plantName,
                                    subtypeName: slot.subtypeName,
                                  })
                                }>
                                View
                              </Button>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                ) : (
                  !showGroupedView && !availabilityLoading && (
                    <EmptyMessage
                      message={`No available slots found for ${selectedPlant?.name || "selected plant"}`}
                      icon={InventoryIcon}
                    />
                  )
                )}

                {/* Empty state for grouped view */}
                {showGroupedView && groupedAvailability.length === 0 && !availabilityLoading && (
                  <EmptyMessage
                    message={`No available plants found in grouped view for ${selectedPlant?.name || "selected plant"}`}
                    icon={InventoryIcon}
                  />
                )}
              </>
            )}

            {/* Loading State for Availability */}
            {activeTab === 2 && availabilityLoading && (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <CircularProgress size={48} />
                <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
                  Loading availability...
                </Typography>
              </Box>
            )}
          </>
        )}
      </CardContent>
      
      {/* Slot Trail Dialog - Shows who entered primary sowing data */}
      <Dialog
        open={trailDialogOpen}
        onClose={handleCloseTrailDialog}
        maxWidth="md"
        fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={2} alignItems="center">
            <PersonIcon color="primary" />
            <Typography variant="h6">Primary Sowing Entries</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {loadingTrail ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : slotTrail.length === 0 ? (
            <EmptyMessage
              message="No primary sowing entries found for this slot"
              icon={HistoryIcon}
            />
          ) : (
            <List>
              {slotTrail.map((entry, index) => (
                <ListItem
                  key={index}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    mb: 2,
                    bgcolor: "background.paper",
                  }}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: "primary.main" }}>
                      {entry.performedBy?.name?.charAt(0)?.toUpperCase() || "?"}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {entry.performedBy?.name || "Unknown User"}
                        </Typography>
                        <Chip
                          label={`${formatNumber(entry.quantity)} plants`}
                          size="small"
                          color="primary"
                        />
                      </Stack>
                    }
                    secondary={
                      <Stack spacing={0.5} sx={{ mt: 1 }}>
                        <Typography variant="body2" color="textSecondary">
                          {entry.notes || entry.reason || "Primary sowing entry"}
                        </Typography>
                        {entry.performedBy?.phoneNumber && (
                          <Typography variant="caption" color="textSecondary">
                            Phone: {entry.performedBy.phoneNumber}
                          </Typography>
                        )}
                        {entry.createdAt && (
                          <Typography variant="caption" color="textSecondary">
                            Date: {moment(entry.createdAt).format("DD-MM-YYYY HH:mm")}
                          </Typography>
                        )}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTrailDialog} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default SowingAlerts;
