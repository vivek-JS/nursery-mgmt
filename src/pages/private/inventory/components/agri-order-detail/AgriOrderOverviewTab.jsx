import React from "react";
import { Box, Chip, Grid, Typography } from "@mui/material";
import { formatAgriDeliveryTimingLabel, inferAgriDeliveryTiming } from "utils/agriDeliveryTiming";

export default function AgriOrderOverviewTab({ order }) {
  if (!order) return null;
  const timing = inferAgriDeliveryTiming(order.deliveryDate, order.orderDate);
  const deliveryLabel = formatAgriDeliveryTimingLabel(timing, order.deliveryDate);

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            Order #
          </Typography>
          <Typography variant="body1" fontWeight={700}>
            {order.orderNumber || "—"}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            Status
          </Typography>
          <Typography variant="body1">{order.orderStatus || "—"}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            Customer
          </Typography>
          <Typography variant="body1">
            {order.customerName} · {order.customerMobile}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {[order.customerVillage, order.customerTaluka, order.customerDistrict].filter(Boolean).join(", ")}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            Sales attribution
          </Typography>
          <Box sx={{ mt: 0.5, display: "flex", flexWrap: "wrap", gap: 1 }}>
            {order.isDealerSelfOrder ? (
              <Chip size="small" color="secondary" label="Dealer self order" />
            ) : order.salesPerson?.name ? (
              <Typography variant="body2">{order.salesPerson.name}</Typography>
            ) : (
              <Typography variant="body2">—</Typography>
            )}
          </Box>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            Send date (ऑर्डर कधी पाठवायची)
          </Typography>
          <Typography variant="body1">{deliveryLabel}</Typography>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Typography variant="caption" color="text.secondary">
            Totals
          </Typography>
          <Typography variant="body1">
            ₹{Number(order.totalAmount || 0).toLocaleString()} · Paid ₹
            {Number(order.totalPaidAmount || 0).toLocaleString()} · Balance ₹
            {Number(order.balanceAmount ?? order.totalAmount - (order.totalPaidAmount || 0)).toLocaleString()}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}
