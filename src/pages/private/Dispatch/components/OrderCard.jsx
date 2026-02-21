import React from "react";
import {
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Phone, Call, Edit, LocationOn, AccountBalanceWallet, PendingActions } from "@mui/icons-material";
import moment from "moment";
import { formatDateForDisplay } from "../utils/dateUtils";

const OrderCard = ({ order, onCall, onEdit }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case "ACCEPTED":
        return "#4caf50";
      case "FARM_READY":
        return "#2196f3";
      case "DISPATCHED":
        return "#ff9800";
      case "DELIVERED":
        return "#8bc34a";
      case "CANCELLED":
        return "#f44336";
      default:
        return "#757575";
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toUpperCase()) {
      case "FARM_READY":
        return "Ready to Dispatch";
      default:
        return status || "N/A";
    }
  };

  const handleCall = (mobileNumber) => {
    if (mobileNumber && onCall) {
      onCall(mobileNumber);
    }
  };

  const mobileNumber = order?.farmer?.mobileNumber || 
                      order?.orderFor?.mobileNumber || 
                      order?.mobileNumber || 
                      "N/A";

  const deliveryDate = order?.deliveryDate || order?.farmReadyDate || order?.dueDate;
  const formattedDeliveryDate = formatDateForDisplay(deliveryDate);
  // Check if delivery date has passed (compare dates only, not time)
  const isPastDue = deliveryDate && moment(deliveryDate).startOf("day").isBefore(moment().startOf("day"));

  // Calculate payment information
  const totalAmount = order?.totalAmount || order?.rate * (order?.numberOfPlants || 0) || 0;
  const payments = order?.payment || [];
  const receivedAmount = payments
    .filter((p) => p.paymentStatus === "COLLECTED")
    .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
  const pendingAmount = Math.max(0, totalAmount - receivedAmount);
  const paymentStatus = order?.orderPaymentStatus || "PENDING";

  // Get village name
  const villageName = order?.farmer?.village || 
                     order?.orderFor?.village || 
                     order?.farmer?.villageName ||
                     "N/A";

  const handleCardClick = () => {
    if (onEdit) {
      onEdit(order);
    }
  };

  return (
    <Paper
      onClick={handleCardClick}
      sx={{
        p: isMobile ? 0.75 : 1,
        mb: 1,
        bgcolor: "white",
        borderRadius: 1,
        border: "1px solid #e0e0e0",
        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
        cursor: onEdit ? "pointer" : "default",
        "&:hover": {
          boxShadow: onEdit ? "0 2px 6px rgba(0,0,0,0.12)" : "0 1px 2px rgba(0,0,0,0.08)",
          borderColor: onEdit ? "#1976d2" : "#e0e0e0",
        },
        transition: "all 0.2s ease",
      }}
    >
      {/* Header Row - Ultra Compact */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 0.75,
          gap: 0.75,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: "#1976d2",
              fontSize: isMobile ? "0.8rem" : "0.85rem",
              mb: 0.125,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            Order #{order?.orderId || order?.orderNumber || "N/A"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "#666",
              fontSize: isMobile ? "0.65rem" : "0.7rem",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {order?.farmer?.name || order?.orderFor?.name || "Unknown Customer"}
          </Typography>
          {villageName !== "N/A" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, mt: 0.125 }}>
              <LocationOn sx={{ fontSize: isMobile ? "0.65rem" : "0.7rem", color: "#999" }} />
              <Typography
                variant="caption"
                sx={{
                  color: "#999",
                  fontSize: isMobile ? "0.6rem" : "0.65rem",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {villageName}
              </Typography>
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", flexShrink: 0 }}>
          <Chip
            label={getStatusLabel(order?.orderStatus)}
            size="small"
            sx={{
              bgcolor: getStatusColor(order?.orderStatus),
              color: "white",
              fontWeight: 600,
              fontSize: isMobile ? "0.6rem" : "0.65rem",
              height: isMobile ? 18 : 20,
              px: 0.5,
            }}
          />
          {onEdit && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(order);
              }}
              sx={{
                p: 0.375,
                color: "#1976d2",
                "&:hover": { bgcolor: "#e3f2fd" },
              }}
              title="Edit Order"
            >
              <Edit sx={{ fontSize: isMobile ? "0.9rem" : "1rem" }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Compact Details - Inline */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: isMobile ? 0.75 : 1,
          mb: 0.75,
          fontSize: isMobile ? "0.7rem" : "0.75rem",
        }}
      >
        <Box sx={{ flex: isMobile ? "1 1 100%" : "1 1 calc(50% - 8px)", minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: "#999",
              fontSize: isMobile ? "0.6rem" : "0.65rem",
              display: "block",
              mb: 0.125,
            }}
          >
            Plant
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: "#333",
              fontSize: isMobile ? "0.75rem" : "0.8rem",
              lineHeight: 1.3,
            }}
          >
            {order?.plantType?.name || order?.plantName || "N/A"} -{" "}
            {order?.plantSubtype?.name || order?.subtypeName || "N/A"}
          </Typography>
        </Box>

        <Box sx={{ flex: isMobile ? "1 1 100%" : "1 1 calc(50% - 8px)", minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: "#999",
              fontSize: isMobile ? "0.6rem" : "0.65rem",
              display: "block",
              mb: 0.125,
            }}
          >
            Quantity
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: "#333",
              fontSize: isMobile ? "0.75rem" : "0.8rem",
              lineHeight: 1.3,
            }}
          >
            {order?.numberOfPlants || order?.quantity || 0} plants
          </Typography>
        </Box>
      </Box>

      {/* Highlighted Delivery Date - Compact */}
      <Box
        sx={{
          p: 0.75,
          mb: 0.75,
          bgcolor: isPastDue ? "#ffebee" : "#e8f5e9",
          borderRadius: 0.75,
          border: `1px solid ${isPastDue ? "#f44336" : "#4caf50"}`,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography
            variant="caption"
            sx={{
              color: "#999",
              fontSize: isMobile ? "0.6rem" : "0.65rem",
              mr: 1,
            }}
          >
            Due:
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: isPastDue ? "#d32f2f" : "#2e7d32",
              fontSize: isMobile ? "0.8rem" : "0.9rem",
              flex: 1,
              textAlign: "right",
            }}
          >
            {formattedDeliveryDate}
          </Typography>
        </Box>
      </Box>

      {/* Mobile Number with Call Button - Ultra Compact */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 0.5,
          bgcolor: "#f5f5f5",
          borderRadius: 0.75,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flex: 1, minWidth: 0 }}>
          <Phone sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem", color: "#1976d2", flexShrink: 0 }} />
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              color: "#333",
              fontSize: isMobile ? "0.7rem" : "0.75rem",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {mobileNumber}
          </Typography>
        </Box>
        {mobileNumber !== "N/A" && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleCall(mobileNumber);
            }}
            sx={{
              bgcolor: "#4caf50",
              color: "white",
              "&:hover": {
                bgcolor: "#45a049",
              },
              p: isMobile ? 0.375 : 0.5,
              ml: 0.5,
              flexShrink: 0,
            }}
            title="Call"
          >
            <Call sx={{ fontSize: isMobile ? "0.8rem" : "0.875rem" }} />
          </IconButton>
        )}
      </Box>

      {/* Payment Information - Aesthetic */}
      <Box
        sx={{
          mt: 0.75,
          pt: 0.75,
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        {/* Received Payment */}
        <Box
          sx={{
            flex: 1,
            minWidth: "calc(50% - 4px)",
            p: 0.75,
            bgcolor: "#e8f5e9",
            borderRadius: 0.75,
            border: "1px solid #4caf50",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <AccountBalanceWallet
            sx={{
              fontSize: isMobile ? "0.9rem" : "1rem",
              color: "#2e7d32",
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: "#666",
                fontSize: isMobile ? "0.6rem" : "0.65rem",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              Received
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: "#2e7d32",
                fontSize: isMobile ? "0.75rem" : "0.8rem",
                lineHeight: 1.2,
              }}
            >
              ₹{receivedAmount.toLocaleString("en-IN")}
            </Typography>
          </Box>
        </Box>

        {/* Pending Payment */}
        <Box
          sx={{
            flex: 1,
            minWidth: "calc(50% - 4px)",
            p: 0.75,
            bgcolor: pendingAmount > 0 ? "#fff3e0" : "#e8f5e9",
            borderRadius: 0.75,
            border: `1px solid ${pendingAmount > 0 ? "#ff9800" : "#4caf50"}`,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          <PendingActions
            sx={{
              fontSize: isMobile ? "0.9rem" : "1rem",
              color: pendingAmount > 0 ? "#f57c00" : "#2e7d32",
              flexShrink: 0,
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                color: "#666",
                fontSize: isMobile ? "0.6rem" : "0.65rem",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              Pending
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                color: pendingAmount > 0 ? "#f57c00" : "#2e7d32",
                fontSize: isMobile ? "0.75rem" : "0.8rem",
                lineHeight: 1.2,
              }}
            >
              ₹{pendingAmount.toLocaleString("en-IN")}
            </Typography>
          </Box>
        </Box>

        {/* Total Amount - Full Width */}
        <Box
          sx={{
            width: "100%",
            mt: 0.5,
            pt: 0.5,
            borderTop: "1px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "#666",
              fontSize: isMobile ? "0.65rem" : "0.7rem",
            }}
          >
            Total: ₹{totalAmount.toLocaleString("en-IN")}
          </Typography>
          {order?.rate && (
            <Typography
              variant="caption"
              sx={{
                color: "#999",
                fontSize: isMobile ? "0.6rem" : "0.65rem",
              }}
            >
              @ ₹{order.rate}/plant
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

export default OrderCard;






