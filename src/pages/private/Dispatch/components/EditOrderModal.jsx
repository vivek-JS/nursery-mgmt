import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  useTheme,
  useMediaQuery,
  MenuItem,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import DeliveryDateModal from "./DeliveryDateModal";

const EditOrderModal = ({ open, onClose, order, onSuccess }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rate: "",
    quantity: "",
    deliveryDate: null,
    bookingSlot: null,
    orderStatus: "",
  });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [showDeliveryDateModal, setShowDeliveryDateModal] = useState(false);

  // Load slots for plant/subtype
  const loadSlots = useCallback(async (plantId, subtypeId) => {
    setSlotsLoading(true);
    try {
      const instance = NetworkManager(API.slots.GET_SIMPLE_SLOTS);
      const years = [2025, 2026];
      
      // Fetch slots for both years in parallel
      const responses = await Promise.all(
        years.map((year) => instance.request({}, { plantId, subtypeId, year }))
      );

      // Combine slots from both years
      let allSlotsData = [];

      responses.forEach((response) => {
        const rawSlots =
          response?.data?.data?.slots ||
          response?.data?.slots ||
          response?.data?.data ||
          [];

        const slotsData = Array.isArray(rawSlots)
          ? rawSlots
          : Array.isArray(rawSlots?.slots)
          ? rawSlots.slots
          : [];

        allSlotsData = [...allSlotsData, ...slotsData];
      });

      if (allSlotsData.length > 0) {
        const processedSlots = allSlotsData
          .map((slot) => {
            const {
              startDay,
              endDay,
              month,
              totalBookedPlants,
              totalPlants,
              status,
              _id,
              availablePlants,
            } = slot || {};

            if (!startDay || !endDay) return null;

            // Validate date format
            const startDateValid = moment(startDay, "DD-MM-YYYY", true).isValid();
            const endDateValid = moment(endDay, "DD-MM-YYYY", true).isValid();

            if (!startDateValid || !endDateValid) return null;

            const start = moment(startDay, "DD-MM-YYYY").format("D");
            const end = moment(endDay, "DD-MM-YYYY").format("D");
            const monthYear = moment(startDay, "DD-MM-YYYY").format("MMMM, YYYY");

            // Calculate available plants
            const available =
              availablePlants !== undefined
                ? availablePlants
                : totalPlants - (totalBookedPlants || 0);

            return {
              label: `${start} - ${end} ${monthYear} (${available} available)`,
              value: _id,
              available: available,
              availableQuantity: available,
              totalPlants: totalPlants,
              totalBookedPlants: totalBookedPlants || 0,
              startDay: startDay,
              endDay: endDay,
            };
          })
          .filter((slot) => slot !== null && slot.available > 0);

        setSlots(processedSlots);
      } else {
        setSlots([]);
      }
    } catch (error) {
      console.error("Error loading slots:", error);
      Toast.error("Failed to load available slots");
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  // Load slots when order changes
  useEffect(() => {
    if (order && open) {
      const plantId = order.plantType?.id || order.plantType?._id || order.plantId;
      const subtypeId = order.plantSubtype?.id || order.plantSubtype?._id || order.subtypeId;
      
      if (plantId && subtypeId) {
        loadSlots(plantId, subtypeId);
      }
      
      // Initialize form data
      setFormData({
        rate: order.rate || "",
        quantity: order.numberOfPlants || order.quantity || "",
        deliveryDate: order.deliveryDate
          ? moment(order.deliveryDate).toDate()
          : order.farmReadyDate
          ? moment(order.farmReadyDate).toDate()
          : null,
        bookingSlot: order.bookingSlot?.[0]?.slotId || 
                    order.bookingSlot?.slotId || 
                    order.bookingSlot || 
                    null,
        orderStatus: order.orderStatus || "",
      });
    }
  }, [order, open, loadSlots]);

  // Handle delivery date selection from modal
  const handleDeliveryDateSelect = (date, slotId) => {
    setFormData({
      ...formData,
      deliveryDate: date,
      bookingSlot: slotId,
    });
  };

  const handleSave = async () => {
    if (!order) return;

    // Validation
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      Toast.error("Please enter a valid rate");
      return;
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      Toast.error("Please enter a valid quantity");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        id: order._id || order.id,
        rate: parseFloat(formData.rate),
        numberOfPlants: parseInt(formData.quantity),
      };

      // Add delivery date and booking slot if provided
      if (formData.deliveryDate) {
        updateData.deliveryDate = moment(formData.deliveryDate).toISOString();
      }
      
      // Add booking slot if provided (mapped from delivery date)
      if (formData.bookingSlot) {
        updateData.bookingSlot = formData.bookingSlot;
      }

      // Add order status if changed
      if (formData.orderStatus && formData.orderStatus !== order.orderStatus) {
        updateData.orderStatus = formData.orderStatus;
      }

      const instance = NetworkManager(API.ORDER.UPDATE_ORDER);
      const response = await instance.request(updateData);

      if (response?.data?.status === "Success") {
        Toast.success("Order updated successfully");
        onSuccess?.();
        onClose();
      } else {
        Toast.error(response?.data?.message || "Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      Toast.error(error?.response?.data?.message || "Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? 0 : 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: isMobile ? "1rem" : "1.125rem",
            pb: 1,
          }}
        >
          Edit Order #{order?.orderId || order?.orderNumber || "N/A"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label="Rate (₹)"
              type="number"
              fullWidth
              value={formData.rate}
              onChange={(e) =>
                setFormData({ ...formData, rate: e.target.value })
              }
              size={isMobile ? "medium" : "small"}
              inputProps={{
                min: 0,
                step: 0.01,
              }}
              required
            />

            <TextField
              label="Quantity (Plants)"
              type="number"
              fullWidth
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: e.target.value })
              }
              size={isMobile ? "medium" : "small"}
              inputProps={{
                min: 1,
                step: 1,
              }}
              required
            />

            <Box>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  fontWeight: 600,
                  color: "#666",
                  fontSize: isMobile ? "0.8rem" : "0.875rem",
                }}
              >
                Delivery Date *
              </Typography>
              {slotsLoading ? (
                <Box
                  sx={{
                    p: 2,
                    border: "1px solid #e0e0e0",
                    borderRadius: 1,
                    bgcolor: "#f5f5f5",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2" color="textSecondary">
                    Loading available slots...
                  </Typography>
                </Box>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => {
                    if (slots.length > 0) {
                      setShowDeliveryDateModal(true);
                    } else {
                      Toast.info(
                        "No available slots found. Please select a different plant/subtype."
                      );
                    }
                  }}
                  disabled={slots.length === 0}
                  sx={{
                    py: isMobile ? 1.5 : 1.25,
                    borderColor: formData.deliveryDate ? "#1976d2" : "#e0e0e0",
                    color: formData.deliveryDate ? "#1976d2" : "#999",
                    textTransform: "none",
                    justifyContent: "flex-start",
                    "&:hover": {
                      borderColor: "#1976d2",
                      bgcolor: "#e3f2fd",
                    },
                  }}
                >
                  {formData.deliveryDate
                    ? moment(formData.deliveryDate).format("DD MMM YYYY")
                    : "Click to select delivery date"}
                </Button>
              )}
              {slots.length === 0 && !slotsLoading && (
                <Typography
                  variant="caption"
                  sx={{ color: "#f44336", mt: 0.5, display: "block" }}
                >
                  No available slots found for this plant/subtype combination
                </Typography>
              )}
              {!slotsLoading && slots.length > 0 && (
                <Typography
                  variant="caption"
                  sx={{ color: "#666", mt: 0.5, display: "block" }}
                >
                  Click to select a delivery date from available slots
                </Typography>
              )}
            </Box>

            <TextField
              label="Order Status"
              select
              fullWidth
              value={formData.orderStatus}
              onChange={(e) =>
                setFormData({ ...formData, orderStatus: e.target.value })
              }
              size={isMobile ? "medium" : "small"}
            >
              <MenuItem value="ACCEPTED">ACCEPTED</MenuItem>
              <MenuItem value="FARM_READY">FARM_READY</MenuItem>
              <MenuItem value="DISPATCHED">DISPATCHED</MenuItem>
              <MenuItem value="DELIVERED">DELIVERED</MenuItem>
              <MenuItem value="CANCELLED">CANCELLED</MenuItem>
            </TextField>

            {/* Display current order info */}
            <Box
              sx={{
                p: 1.5,
                bgcolor: "#f5f5f5",
                borderRadius: 1,
                mt: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "#666", fontSize: isMobile ? "0.75rem" : "0.8rem", display: "block", mb: 0.5 }}
              >
                Customer: {order?.farmer?.name || "N/A"}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "#666", fontSize: isMobile ? "0.75rem" : "0.8rem", display: "block", mb: 0.5 }}
              >
                Plant: {order?.plantType?.name || "N/A"} -{" "}
                {order?.plantSubtype?.name || "N/A"}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "#666", fontSize: isMobile ? "0.75rem" : "0.8rem", display: "block" }}
              >
                Current Delivery Date:{" "}
                {order?.deliveryDate || order?.farmReadyDate
                  ? moment(order.deliveryDate || order.farmReadyDate).format("DD-MMM-YYYY")
                  : "N/A"}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions
          sx={{
            px: isMobile ? 2 : 3,
            pb: isMobile ? 2 : 2,
            gap: 1,
          }}
        >
          <Button
            onClick={onClose}
            disabled={loading}
            sx={{
              fontSize: isMobile ? "0.875rem" : "0.9rem",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={16} /> : null}
            sx={{
              bgcolor: "#2e7d32",
              "&:hover": { bgcolor: "#1b5e20" },
              fontSize: isMobile ? "0.875rem" : "0.9rem",
            }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delivery Date Selection Modal */}
      <DeliveryDateModal
        open={showDeliveryDateModal}
        onClose={() => setShowDeliveryDateModal(false)}
        slots={slots}
        selectedDate={formData.deliveryDate}
        onDateSelect={handleDeliveryDateSelect}
        loading={slotsLoading}
      />
    </LocalizationProvider>
  );
};

export default EditOrderModal;


