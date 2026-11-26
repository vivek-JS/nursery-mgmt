import React from "react";
import { Box, Typography } from "@mui/material";

const DAY_TONE = {
  Aaj: { bg: "#fee2e2", color: "#b91c1c" },
  Udya: { bg: "#dcfce7", color: "#166534" },
  Parva: { bg: "#ccfbf1", color: "#0f766e" },
};

export function DayChip({ label }) {
  if (!label) return null;
  const tone = DAY_TONE[label] || { bg: "#f1f5f9", color: "#334155" };
  return (
    <Box
      component="span"
      sx={{
        px: 0.7,
        py: 0.1,
        borderRadius: 99,
        bgcolor: tone.bg,
        color: tone.color,
        fontSize: "0.68rem",
        fontWeight: 800,
        lineHeight: 1.5,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Box>
  );
}

export function PlaceChip({ taluka, village }) {
  const place = taluka && village ? `${taluka} → ${village}` : taluka || village;
  if (!place) return null;
  return (
    <Box
      component="span"
      title={place}
      sx={{
        px: 0.65,
        py: 0.05,
        borderRadius: 1,
        bgcolor: "#fef3c7",
        color: "#92400e",
        fontSize: "0.68rem",
        fontWeight: 800,
        lineHeight: 1.5,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {place}
    </Box>
  );
}

export function VarietyCount({ variety, count }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.45, minWidth: 0, maxWidth: "100%" }}>
      <Typography component="span" sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#334155" }} noWrap>
        {variety || "Variety"}
      </Typography>
      <Box
        component="span"
        sx={{
          px: 0.6,
          borderRadius: 99,
          bgcolor: "#e0e7ff",
          color: "#3730a3",
          fontSize: "0.68rem",
          fontWeight: 800,
          lineHeight: 1.5,
          whiteSpace: "nowrap",
        }}
      >
        {Number(count || 0).toLocaleString()}
      </Box>
    </Box>
  );
}
