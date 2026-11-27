import React from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import CallingListFilters from "./CallingListFilters";
import { DayChip, OrderMeta, orderRowSx } from "./boardOrderBits";
import {
  orderDeliveryDayLabel,
  orderFarmerName,
  orderMongoId,
  orderPhone,
  orderPlantCount,
  orderPublicId,
  orderTaluka,
  orderVariety,
  orderVillage,
} from "./orderBoardUtils";

const columnShell = {
  bgcolor: "#fff",
  borderRadius: 3,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
};

export default function CallingListColumn({
  orders,
  loading,
  filters,
  onFiltersChange,
  dayKey,
  onDayKey,
  onReady,
  onReadyAll,
  markingIds,
}) {
  const busyAll = orders.some((order) => markingIds.has(orderMongoId(order)));

  return (
    <Box sx={{ ...columnShell, borderTop: "4px solid #f97316" }}>
      <Box sx={{ flexShrink: 0, maxHeight: "46%", overflow: "auto", px: 1.15, pt: 1, pb: 0.75 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.7 }}>
          <Typography sx={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>1. Calling list</Typography>
          <CountBadge value={orders.length} />
        </Box>
        <CallingListFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          dayKey={dayKey}
          onDayKey={onDayKey}
          onReadyAll={onReadyAll}
          busyAll={busyAll}
          canMarkAll={orders.length > 0}
        />
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", px: 1, pb: 1 }}>
        {loading && !orders.length ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={22} />
          </Box>
        ) : orders.length === 0 ? (
          <Typography sx={{ color: "#64748b", fontSize: "0.8rem", px: 0.5, py: 2 }}>
            No orders match these filters.
          </Typography>
        ) : (
          orders.map((order) => {
            const id = orderMongoId(order);
            const phone = orderPhone(order);
            const marking = markingIds.has(id);
            return (
              <Box key={id || orderPublicId(order)} sx={orderRowSx}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "0.8rem", color: "#0f172a", lineHeight: 1.25 }} noWrap>
                    {orderFarmerName(order)}
                    <Box component="span" sx={{ ml: 0.6, fontWeight: 600, color: "#94a3b8", fontSize: "0.66rem" }}>
                      {orderPublicId(order)}
                    </Box>
                  </Typography>
                  <OrderMeta
                    variety={orderVariety(order)}
                    count={orderPlantCount(order)}
                    taluka={orderTaluka(order)}
                    village={orderVillage(order)}
                    phone={phone}
                    showMissingPhone
                  />
                </Box>
                <DayChip label={orderDeliveryDayLabel(order)} />
                <Button
                  size="small"
                  variant="contained"
                  disabled={marking}
                  onClick={() => onReady(order)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    fontSize: "0.7rem",
                    borderRadius: 1.5,
                    minWidth: 52,
                    px: 0.8,
                    py: 0.25,
                    bgcolor: "#2563eb",
                    boxShadow: "none",
                    "&:hover": { bgcolor: "#1d4ed8", boxShadow: "none" },
                  }}
                >
                  {marking ? "…" : "Ready"}
                </Button>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

function CountBadge({ value }) {
  return (
    <Box
      sx={{
        minWidth: 20,
        height: 20,
        px: 0.65,
        borderRadius: 99,
        bgcolor: "#e2e8f0",
        color: "#334155",
        fontSize: "0.7rem",
        fontWeight: 800,
        display: "grid",
        placeItems: "center",
      }}
    >
      {value}
    </Box>
  );
}
