import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  Typography,
  Chip,
  Alert,
  IconButton,
  InputAdornment,
  Divider,
} from "@mui/material";
import {
  Close,
  Add as AddIcon,
  CalendarToday,
  LocationOn,
  Inventory,
  Notes,
  Save,
} from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import { useSelector } from "react-redux";

const AddSowingModal = ({ open, onClose, plants = [], onSuccess, userData, appUser }) => {
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [selectedSubtype, setSelectedSubtype] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [formData, setFormData] = useState({
    sowingDate: moment(),
    totalQuantityRequired: "",
    sowingLocation: "OFFICE",
    batchNumber: "",
    notes: "",
    reminderBeforeDays: 5,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      // Reset form when modal opens
      setFormData({
        sowingDate: moment(),
        totalQuantityRequired: "",
        sowingLocation: "OFFICE",
        batchNumber: "",
        notes: "",
        reminderBeforeDays: 5,
      });
      setSelectedPlant(null);
      setSelectedSubtype(null);
      setSelectedSlot(null);
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (selectedPlant && selectedSubtype) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedPlant, selectedSubtype]);

  const fetchAvailableSlots = async () => {
    if (!selectedPlant || !selectedSubtype) return;

    setLoadingSlots(true);
    try {
      const year = new Date().getFullYear();
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
      const response = await instance.request(
        {},
        {
          plantId: selectedPlant._id,
          subtypeId: selectedSubtype._id,
          year,
        }
      );

      const slotsData = response?.data?.data?.slots || response?.data?.slots || [];
      setAvailableSlots(slotsData);
    } catch (error) {
      console.error("Error fetching slots:", error);
      Toast.error("Failed to fetch available slots");
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSubmit = async () => {
    // Validate
    const newErrors = {};
    if (!selectedPlant) newErrors.plant = "Please select a plant";
    if (!selectedSubtype) newErrors.subtype = "Please select a subtype";
    if (!formData.totalQuantityRequired || formData.totalQuantityRequired <= 0) {
      newErrors.quantity = "Please enter a valid quantity";
    }
    if (!formData.sowingDate) {
      newErrors.date = "Please select a sowing date";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Toast.error("Please fill all required fields");
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      const user = userData || appUser;
      const payload = {
        plantId: selectedPlant._id,
        subtypeId: selectedSubtype._id,
        sowingDate: moment(formData.sowingDate).format("DD-MM-YYYY"),
        totalQuantityRequired: parseInt(formData.totalQuantityRequired),
        reminderBeforeDays: parseInt(formData.reminderBeforeDays),
        notes: formData.notes,
        batchNumber: formData.batchNumber,
        sowingLocation: formData.sowingLocation,
        slotId: selectedSlot?._id,
      };

      if (user?._id) {
        payload.createdBy = user._id;
      }

      const instance = NetworkManager(API.sowing.CREATE_SOWING);
      const response = await instance.request(payload);

      if (response?.data) {
        const locationText = formData.sowingLocation === "OFFICE" ? "Packets" : "Primary";
        Toast.success(`${locationText} sowing record created successfully`);
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error("Error creating sowing:", error);
      Toast.error(error?.response?.data?.message || "Failed to create sowing record");
    } finally {
      setSubmitting(false);
    }
  };

  const getExpectedReadyDate = () => {
    if (!selectedSubtype || !formData.sowingDate) return null;
    const readyDays = selectedSubtype.plantReadyDays || 0;
    return moment(formData.sowingDate).add(readyDays, "days").format("DD-MM-YYYY");
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle
          sx={{
            bgcolor: "#2e7d32",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AddIcon />
            Add New Sowing
          </Box>
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 3, bgcolor: "#f5f5f5" }}>
          <Paper sx={{ p: 3, bgcolor: "white", borderRadius: 2 }}>
            <Grid container spacing={2}>
              {/* Plant Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.plant}>
                  <InputLabel>Plant *</InputLabel>
                  <Select
                    value={selectedPlant?._id || ""}
                    label="Plant *"
                    onChange={(e) => {
                      const plant = plants.find((p) => p._id === e.target.value);
                      setSelectedPlant(plant);
                      setSelectedSubtype(null);
                      setSelectedSlot(null);
                      setAvailableSlots([]);
                    }}>
                    {plants.map((plant) => (
                      <MenuItem key={plant._id} value={plant._id}>
                        {plant.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Subtype Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth error={!!errors.subtype} disabled={!selectedPlant}>
                  <InputLabel>Subtype *</InputLabel>
                  <Select
                    value={selectedSubtype?._id || ""}
                    label="Subtype *"
                    onChange={(e) => {
                      const subtype = selectedPlant.subtypes.find(
                        (s) => s._id === e.target.value
                      );
                      setSelectedSubtype(subtype);
                      setSelectedSlot(null);
                    }}>
                    {selectedPlant?.subtypes?.map((subtype) => (
                      <MenuItem key={subtype._id} value={subtype._id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <span>{subtype.name}</span>
                          <Chip
                            label={`${subtype.plantReadyDays || 0}d`}
                            size="small"
                            color="success"
                            sx={{ height: 20, fontSize: "0.7rem" }}
                          />
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Sowing Date */}
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Sowing Date *"
                  value={formData.sowingDate}
                  onChange={(date) =>
                    setFormData({ ...formData, sowingDate: date || moment() })
                  }
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.date,
                      InputProps: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <CalendarToday fontSize="small" />
                          </InputAdornment>
                        ),
                      },
                    },
                  }}
                />
              </Grid>

              {/* Quantity */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Quantity *"
                  type="number"
                  value={formData.totalQuantityRequired}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalQuantityRequired: e.target.value,
                    })
                  }
                  error={!!errors.quantity}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Inventory fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Location */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Location</InputLabel>
                  <Select
                    value={formData.sowingLocation}
                    label="Location"
                    onChange={(e) =>
                      setFormData({ ...formData, sowingLocation: e.target.value })
                    }>
                    <MenuItem value="OFFICE">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        📦 Office (Packets)
                      </Box>
                    </MenuItem>
                    <MenuItem value="PRIMARY">
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        🌱 Primary (Field)
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Batch Number */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Batch Number (Optional)"
                  value={formData.batchNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, batchNumber: e.target.value })
                  }
                  placeholder="Enter batch number"
                />
              </Grid>

              {/* Slot Selection (Optional) */}
              {selectedPlant && selectedSubtype && (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Select Slot (Optional)</InputLabel>
                    <Select
                      value={selectedSlot?._id || ""}
                      label="Select Slot (Optional)"
                      onChange={(e) => {
                        const slot = availableSlots.find(
                          (s) => s._id.toString() === e.target.value
                        );
                        setSelectedSlot(slot);
                      }}
                      disabled={loadingSlots || availableSlots.length === 0}>
                      <MenuItem value="">
                        <em>None - General sowing</em>
                      </MenuItem>
                      {availableSlots.map((slot) => {
                        const gap =
                          (slot.totalBookedPlants || 0) - (slot.primarySowed || 0);
                        return (
                          <MenuItem key={slot._id} value={slot._id}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                              <span>
                                {moment(slot.startDay, "DD-MM-YYYY").format("MMM D")} -{" "}
                                {moment(slot.endDay, "DD-MM-YYYY").format("MMM D")} ({slot.month})
                              </span>
                              <Chip
                                label={`Gap: ${gap}`}
                                size="small"
                                color={gap > 0 ? "warning" : "success"}
                                sx={{ ml: 1, height: 20 }}
                              />
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  {loadingSlots && (
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                      Loading slots...
                    </Typography>
                  )}
                </Grid>
              )}

              {/* Expected Ready Date Info */}
              {selectedSubtype && formData.sowingDate && (
                <Grid item xs={12}>
                  <Alert severity="info" icon={<CalendarToday />}>
                    <Typography variant="body2">
                      <strong>Expected Ready Date:</strong> {getExpectedReadyDate()} (in{" "}
                      {selectedSubtype.plantReadyDays || 0} days)
                    </Typography>
                  </Alert>
                </Grid>
              )}

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes (Optional)"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                        <Notes fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
          <Button onClick={onClose} variant="outlined" disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? null : <Save />}
            sx={{ bgcolor: "#2e7d32", "&:hover": { bgcolor: "#1b5e20" } }}>
            {submitting ? "Creating..." : "Create Sowing"}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default AddSowingModal;



