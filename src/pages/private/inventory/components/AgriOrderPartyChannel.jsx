import React from "react";
import {
  Autocomplete,
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";

/**
 * Retail vs B2B (merchant) party section for agri sales order create.
 */
export default function AgriOrderPartyChannel({
  orderChannel,
  onOrderChannelChange,
  merchants = [],
  selectedMerchantId,
  onMerchantChange,
  disabled = false,
  loadingMerchants = false,
}) {
  const merchantOptions = merchants.filter(
    (m) => m.category === "buyer" || m.category === "both" || !m.category
  );

  return (
    <Box sx={{ mb: 1.5 }}>
      <FormControl component="fieldset" disabled={disabled} fullWidth>
        <FormLabel component="legend">
          <Typography variant="body2" fontWeight={700}>
            Order type · ऑर्डर प्रकार
          </Typography>
        </FormLabel>
        <RadioGroup
          row
          value={orderChannel}
          onChange={(e) => onOrderChannelChange(e.target.value)}
          sx={{ mt: 0.5 }}
        >
          <FormControlLabel value="RETAIL" control={<Radio size="small" />} label="Retail (farmer / dealer)" />
          <FormControlLabel value="B2B" control={<Radio size="small" />} label="B2B (Merchant)" />
        </RadioGroup>
      </FormControl>

      {orderChannel === "B2B" ? (
        <Autocomplete
          sx={{ mt: 1 }}
          size="small"
          options={merchantOptions}
          loading={loadingMerchants}
          value={merchantOptions.find((m) => String(m._id) === String(selectedMerchantId)) || null}
          onChange={(_, m) => onMerchantChange(m || null)}
          getOptionLabel={(m) =>
            `${m?.name || "—"}${m?.phone ? ` · ${m.phone}` : ""}${
              m?.address?.city || m?.address?.village
                ? ` · ${m.address.city || m.address.village}`
                : ""
            }`
          }
          isOptionEqualToValue={(a, b) => String(a?._id) === String(b?._id)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Merchant * · व्यापारी"
              placeholder="Search merchant (buyer / both)"
              required
            />
          )}
        />
      ) : null}
    </Box>
  );
}
