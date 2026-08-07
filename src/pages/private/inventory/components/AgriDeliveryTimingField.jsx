import React from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "lib/muiLocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  AGRI_DELIVERY_TIMING,
  formatAgriDeliveryTimingLabel,
} from "utils/agriDeliveryTiming";

export default function AgriDeliveryTimingField({
  deliveryTiming,
  onDeliveryTimingChange,
  deliveryDate,
  onDeliveryDateChange,
  orderDate,
  disabled = false,
}) {
  return (
    <Box>
      <FormControl component="fieldset" fullWidth disabled={disabled}>
        <FormLabel component="legend">
          <Typography variant="body2" fontWeight={600}>
            ऑर्डर कधी आणायचे?
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            When to deliver order
          </Typography>
        </FormLabel>
        <RadioGroup
          row
          value={deliveryTiming}
          onChange={(e) => onDeliveryTimingChange(e.target.value)}
          sx={{ mt: 0.5, flexWrap: "wrap" }}
        >
          <FormControlLabel
            value={AGRI_DELIVERY_TIMING.TODAY}
            control={<Radio size="small" />}
            label="आज (Today)"
          />
          <FormControlLabel
            value={AGRI_DELIVERY_TIMING.TOMORROW}
            control={<Radio size="small" />}
            label="उद्या (Tomorrow)"
          />
          <FormControlLabel
            value={AGRI_DELIVERY_TIMING.CUSTOM}
            control={<Radio size="small" />}
            label="तारीख निवडा (Pick date)"
          />
        </RadioGroup>
      </FormControl>

      {deliveryTiming === AGRI_DELIVERY_TIMING.CUSTOM ? (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Delivery date · डिलिव्हरी तारीख"
            value={deliveryDate}
            onChange={onDeliveryDateChange}
            minDate={orderDate}
            renderInput={(params) => (
              <TextField {...params} fullWidth size="small" margin="dense" sx={{ mt: 1 }} />
            )}
          />
        </LocalizationProvider>
      ) : deliveryDate ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Selected · निवड: {formatAgriDeliveryTimingLabel(deliveryTiming, deliveryDate)}
        </Typography>
      ) : null}
    </Box>
  );
}
