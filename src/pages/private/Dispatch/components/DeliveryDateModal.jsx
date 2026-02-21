import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Close, Check } from "@mui/icons-material";
import moment from "moment";
import { Toast } from "helpers/toasts/toastHelper";

const DeliveryDateModal = ({ open, onClose, slots, selectedDate, onDateSelect, loading }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const today = moment().startOf("day");

  const handleDateClick = (date, slot) => {
    onDateSelect(date.toDate(), slot.value);
    onClose();
    Toast.success(`Delivery date set to ${date.format("DD MMM YYYY")}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? "100vh" : "85vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: "#1976d2",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontSize: isMobile ? "1rem" : "1.125rem", fontWeight: 600 }}>
            📅 Select Delivery Date
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: "white",
            "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
        {loading ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="textSecondary">
              Loading available slots...
            </Typography>
          </Box>
        ) : slots.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" sx={{ mb: 1, color: "#666" }}>
              📭 No Available Slots
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Please select a different plant/subtype combination
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {slots.map((slot) => {
              if (!slot.startDay || !slot.endDay) return null;

              const slotStart = moment(slot.startDay, "DD-MM-YYYY");
              const slotEnd = moment(slot.endDay, "DD-MM-YYYY");
              const dates = [];
              let currentDate = slotStart.clone();

              // Generate all dates in the slot
              while (currentDate.isSameOrBefore(slotEnd, "day")) {
                if (currentDate.isSameOrAfter(today, "day")) {
                  dates.push(currentDate.clone());
                }
                currentDate.add(1, "day");
              }

              if (dates.length === 0) return null;

              return (
                <Box
                  key={slot.value}
                  sx={{
                    borderBottom: "1px solid #e0e0e0",
                    pb: 3,
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  {/* Slot Header */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mb: 2,
                      pb: 1.5,
                      borderBottom: "2px solid #e3f2fd",
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "#1976d2",
                        mr: 1.5,
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600,
                          color: "#1976d2",
                          fontSize: isMobile ? "0.9rem" : "1rem",
                        }}
                      >
                        {slot.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#666",
                          fontSize: isMobile ? "0.75rem" : "0.8rem",
                        }}
                      >
                        Available: {slot.available} plants
                      </Typography>
                    </Box>
                  </Box>

                  {/* Dates Grid */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "repeat(5, 1fr)"
                        : "repeat(7, 1fr)",
                      gap: 1.5,
                    }}
                  >
                    {dates.map((date) => {
                      const isSelected =
                        selectedDate &&
                        moment(selectedDate).format("YYYY-MM-DD") ===
                          date.format("YYYY-MM-DD");
                      const isToday = date.isSame(today, "day");

                      return (
                        <Box
                          key={date.format("YYYY-MM-DD")}
                          onClick={() => handleDateClick(date, slot)}
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            border: isSelected
                              ? "2px solid #1976d2"
                              : isToday
                              ? "2px solid #ff9800"
                              : "2px solid #e0e0e0",
                            bgcolor: isSelected
                              ? "#1976d2"
                              : isToday
                              ? "#fff3e0"
                              : "white",
                            color: isSelected ? "white" : "#333",
                            cursor: "pointer",
                            transition: "all 0.2s",
                            position: "relative",
                            "&:hover": {
                              borderColor: "#1976d2",
                              bgcolor: isSelected ? "#1976d2" : "#e3f2fd",
                              transform: "scale(1.05)",
                            },
                            textAlign: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: isMobile ? "0.65rem" : "0.7rem",
                              fontWeight: 600,
                              display: "block",
                              opacity: isSelected ? 0.9 : 0.7,
                            }}
                          >
                            {date.format("ddd")}
                          </Typography>
                          <Typography
                            variant="h6"
                            sx={{
                              fontSize: isMobile ? "1rem" : "1.25rem",
                              fontWeight: 700,
                              my: 0.5,
                            }}
                          >
                            {date.format("DD")}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              fontSize: isMobile ? "0.65rem" : "0.7rem",
                              fontWeight: 600,
                              display: "block",
                              opacity: isSelected ? 0.9 : 0.8,
                            }}
                          >
                            {date.format("MMM")}
                          </Typography>
                          {isToday && !isSelected && (
                            <Box
                              sx={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                bgcolor: "#ff9800",
                                color: "white",
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                px: 0.75,
                                py: 0.25,
                                borderRadius: "10px",
                              }}
                            >
                              TODAY
                            </Box>
                          )}
                          {isSelected && (
                            <Box
                              sx={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                bgcolor: "white",
                                color: "#1976d2",
                                borderRadius: "50%",
                                width: 20,
                                height: 20,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Check sx={{ fontSize: "0.75rem" }} />
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}

            {/* Helper Text */}
            <Box
              sx={{
                bgcolor: "#e3f2fd",
                borderLeft: "4px solid #1976d2",
                p: 2,
                borderRadius: 1,
                mt: 1,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: "#1565c0",
                  fontSize: isMobile ? "0.8rem" : "0.875rem",
                }}
              >
                💡 <strong>Tip:</strong> Click on any date to select it as the delivery date. Only
                dates within available slots are shown.
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeliveryDateModal;






