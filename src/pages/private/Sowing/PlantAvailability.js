import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  Grid,
  Typography,
  Chip,
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
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import {
  Inventory as InventoryIcon,
  CalendarToday as CalendarIcon,
  Agriculture as AgricultureIcon,
  Refresh,
  ExpandMore,
  ExpandLess,
  Clear as ClearIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
} from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import moment from "moment";
import { NetworkManager } from "network/core";
import { API } from "network/config/endpoints";

const formatNumber = (value) => (value || 0).toLocaleString();

const PlantAvailability = () => {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  });
  const [expandedPlants, setExpandedPlants] = useState({});
  const [expandedSubtypes, setExpandedSubtypes] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlant, setFilterPlant] = useState(null);
  const [groupByDays, setGroupByDays] = useState("");

  // Auto-expand Papaya and Watermelon when data loads
  useEffect(() => {
    if (availability?.plantsAvailability) {
      const autoExpand = {};
      availability.plantsAvailability.forEach((plant) => {
        const plantName = plant.plantName?.toLowerCase() || "";
        if (plantName.includes("papaya") || plantName.includes("watermelon")) {
          autoExpand[plant.plantId] = true;
        }
      });
      if (Object.keys(autoExpand).length > 0) {
        setExpandedPlants((prev) => ({ ...prev, ...autoExpand }));
      }
    }
  }, [availability]);

  // Fetch availability when dates change
  useEffect(() => {
    if (startDate && endDate) {
      fetchAvailability();
    }
  }, [startDate, endDate]);

  const fetchAvailability = async () => {
    if (!startDate || !endDate) {
      return;
    }

    setLoading(true);
    try {
      const params = {
        startDate: moment(startDate).format("DD-MM-YYYY"),
        endDate: moment(endDate).format("DD-MM-YYYY"),
        _t: Date.now(),
      };

      const instance = NetworkManager(API.sowing.GET_ALL_PLANTS_AVAILABILITY);
      const response = await instance.request({}, params);
      if (response?.data?.success) {
        setAvailability(response.data);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
      setAvailability(null);
    }
    setLoading(false);
  };

  const handleRefresh = () => {
    fetchAvailability();
  };

  const togglePlant = (plantId) => {
    setExpandedPlants((prev) => ({
      ...prev,
      [plantId]: !prev[plantId],
    }));
  };

  const toggleSubtype = (key) => {
    setExpandedSubtypes((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Filter plants
  const filteredPlants = useMemo(() => {
    if (!availability?.plantsAvailability) return [];
    
    let filtered = availability.plantsAvailability;
    
    if (filterPlant) {
      filtered = filtered.filter(p => p.plantId === filterPlant);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.plantName.toLowerCase().includes(term) ||
        p.subtypes.some(st => st.subtypeName.toLowerCase().includes(term))
      );
    }
    
    return filtered;
  }, [availability, filterPlant, searchTerm]);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Card elevation={3} sx={{ mb: 3, borderRadius: 2 }}>
        <CardHeader
          title={
            <Stack direction="row" spacing={2} alignItems="center">
              <InventoryIcon sx={{ fontSize: 32, color: "primary.main" }} />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Plant Availability Overview
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  View availability for all plants and subtypes
                </Typography>
              </Box>
            </Stack>
          }
          action={
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading || !startDate || !endDate}>
              Refresh
            </Button>
          }
          sx={{ bgcolor: "primary.50", borderBottom: "3px solid", borderColor: "primary.main" }}
        />
      </Card>

      {/* Date Range Selection - Mandatory */}
      <Card elevation={2} sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <CalendarIcon color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Date Range (Required)
              </Typography>
            </Box>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date *"
                    value={startDate}
                    onChange={(newValue) => {
                      setStartDate(newValue);
                      if (newValue && endDate && moment(newValue).isAfter(endDate)) {
                        const newEndDate = new Date(newValue);
                        newEndDate.setDate(newEndDate.getDate() + 30);
                        setEndDate(newEndDate);
                      }
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !startDate,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={4}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date *"
                    value={endDate}
                    onChange={(newValue) => setEndDate(newValue)}
                    minDate={startDate}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: !endDate,
                      },
                    }}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} md={4}>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const today = new Date();
                      const thirtyDaysLater = new Date(today);
                      thirtyDaysLater.setDate(today.getDate() + 30);
                      setStartDate(today);
                      setEndDate(thirtyDaysLater);
                    }}>
                    30 Days
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const today = new Date();
                      const sixtyDaysLater = new Date(today);
                      sixtyDaysLater.setDate(today.getDate() + 60);
                      setStartDate(today);
                      setEndDate(sixtyDaysLater);
                    }}>
                    60 Days
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      {/* Filters */}
      {availability && (
        <Card elevation={2} sx={{ mb: 3, borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <TextField
                size="small"
                placeholder="Search plants or subtypes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchTerm && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchTerm("")}>
                        <ClearIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 250, bgcolor: "white" }}
              />
              <FormControl size="small" sx={{ minWidth: 200, bgcolor: "white" }}>
                <InputLabel>Filter by Plant</InputLabel>
                <Select
                  value={filterPlant || ""}
                  label="Filter by Plant"
                  onChange={(e) => setFilterPlant(e.target.value || null)}
                  endAdornment={
                    filterPlant && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setFilterPlant(null)} sx={{ mr: 1 }}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }>
                  <MenuItem value="">All Plants</MenuItem>
                  {availability?.plantsAvailability?.map((plant) => (
                    <MenuItem key={plant.plantId} value={plant.plantId}>
                      {plant.plantName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {(searchTerm || filterPlant) && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ClearIcon />}
                  onClick={() => {
                    setSearchTerm("");
                    setFilterPlant(null);
                  }}>
                  Clear Filters
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <CircularProgress size={48} />
          <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
            Loading availability data...
          </Typography>
        </Box>
      )}

      {/* Summary Cards */}
      {availability && !loading && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: "primary.50", borderRadius: 2, border: "2px solid", borderColor: "primary.200" }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                  Total Plants
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main" }}>
                  {availability.summary?.totalPlants || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: "success.50", borderRadius: 2, border: "2px solid", borderColor: "success.200" }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                  Total Available
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main" }}>
                  {formatNumber(availability.summary?.totalAvailable || 0)}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: "info.50", borderRadius: 2, border: "2px solid", borderColor: "info.200" }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                  Total Subtypes
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "info.main" }}>
                  {availability.summary?.totalSubtypes || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, bgcolor: "warning.50", borderRadius: 2, border: "2px solid", borderColor: "warning.200" }}>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                  Total Slots
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "warning.main" }}>
                  {formatNumber(availability.summary?.totalSlots || 0)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Plants List */}
          {filteredPlants.length > 0 ? (
            <Card elevation={2} sx={{ borderRadius: 2, overflow: "hidden" }}>
              <Box sx={{ bgcolor: "primary.50", p: 2, borderBottom: "2px solid", borderColor: "primary.200" }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
                  Plants Availability
                </Typography>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.100" }}>
                    <TableCell sx={{ fontWeight: 700, borderRight: "1px solid", borderColor: "grey.300", width: "30%" }}>
                      Plant
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, borderRight: "1px solid", borderColor: "grey.300", width: "15%" }}>
                      Subtypes
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, borderRight: "1px solid", borderColor: "grey.300", width: "20%" }}>
                      Total Available
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, width: "15%" }}>
                      Slots
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, width: "20%" }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredPlants.map((plant) => (
                    <React.Fragment key={plant.plantId}>
                      <TableRow
                        hover
                        sx={{
                          "&:nth-of-type(even)": { bgcolor: "grey.50" },
                          cursor: "pointer",
                        }}
                        onClick={() => togglePlant(plant.plantId)}>
                        <TableCell sx={{ borderRight: "1px solid", borderColor: "grey.300", fontWeight: 600 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <AgricultureIcon color="primary" fontSize="small" />
                            <Typography>{plant.plantName}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell align="center" sx={{ borderRight: "1px solid", borderColor: "grey.300" }}>
                          <Chip label={plant.subtypes.length} size="small" color="info" />
                        </TableCell>
                        <TableCell align="right" sx={{ borderRight: "1px solid", borderColor: "grey.300" }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
                            {formatNumber(plant.totalAvailable)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={plant.totalSlots} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small">
                            {expandedPlants[plant.plantId] ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </TableCell>
                      </TableRow>
                      {expandedPlants[plant.plantId] && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ p: 0, bgcolor: "grey.50" }}>
                            <Box sx={{ p: 2 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                                Subtypes Breakdown ({plant.subtypes.length} subtypes)
                              </Typography>
                              <Box
                                sx={{
                                  maxHeight: plant.plantName?.toLowerCase().includes("papaya") || 
                                           plant.plantName?.toLowerCase().includes("watermelon")
                                    ? "400px"
                                    : "none",
                                  overflowY: "auto",
                                  overflowX: "hidden",
                                  border: "1px solid",
                                  borderColor: "grey.300",
                                  borderRadius: 1,
                                  bgcolor: "white",
                                }}>
                                <Table size="small" stickyHeader>
                                  <TableHead>
                                    <TableRow sx={{ bgcolor: "grey.100" }}>
                                      <TableCell 
                                        sx={{ 
                                          fontWeight: 700, 
                                          borderRight: "1px solid", 
                                          borderColor: "grey.300",
                                          bgcolor: "grey.100",
                                          position: "sticky",
                                          top: 0,
                                          zIndex: 1,
                                        }}>
                                        Subtype
                                      </TableCell>
                                      <TableCell 
                                        align="right" 
                                        sx={{ 
                                          fontWeight: 700, 
                                          borderRight: "1px solid", 
                                          borderColor: "grey.300",
                                          bgcolor: "grey.100",
                                          position: "sticky",
                                          top: 0,
                                          zIndex: 1,
                                        }}>
                                        Available Plants
                                      </TableCell>
                                      <TableCell 
                                        align="right" 
                                        sx={{ 
                                          fontWeight: 700,
                                          bgcolor: "grey.100",
                                          position: "sticky",
                                          top: 0,
                                          zIndex: 1,
                                        }}>
                                        Slots Count
                                      </TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {plant.subtypes.map((subtype, idx) => (
                                      <TableRow 
                                        key={subtype.subtypeId} 
                                        hover
                                        sx={{
                                          "&:nth-of-type(even)": { bgcolor: "grey.50" },
                                          borderBottom: idx < plant.subtypes.length - 1 ? "1px solid" : "none",
                                          borderColor: "grey.200",
                                        }}>
                                        <TableCell 
                                          sx={{ 
                                            borderRight: "1px solid", 
                                            borderColor: "grey.300",
                                            fontWeight: 500,
                                          }}>
                                          <Typography sx={{ fontWeight: 600 }}>{subtype.subtypeName}</Typography>
                                        </TableCell>
                                        <TableCell 
                                          align="right" 
                                          sx={{ 
                                            borderRight: "1px solid", 
                                            borderColor: "grey.300",
                                          }}>
                                          <Chip
                                            label={formatNumber(subtype.totalAvailable)}
                                            size="small"
                                            color="success"
                                            sx={{ 
                                              fontWeight: 700,
                                              fontSize: "0.875rem",
                                              height: 28,
                                            }}
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <Chip 
                                            label={subtype.slots.length} 
                                            size="small" 
                                            variant="outlined"
                                            color="primary"
                                            sx={{ fontWeight: 600 }}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            !loading && (
              <Paper sx={{ p: 6, textAlign: "center", bgcolor: "grey.50" }}>
                <InventoryIcon sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  No availability data found for the selected date range
                </Typography>
              </Paper>
            )
          )}
        </>
      )}

      {/* Error State */}
      {!startDate || !endDate ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please select both start date and end date to view availability.
        </Alert>
      ) : null}
    </Box>
  );
};

export default PlantAvailability;

