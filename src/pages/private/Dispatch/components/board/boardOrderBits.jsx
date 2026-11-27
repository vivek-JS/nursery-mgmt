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

export const orderRowSx = {
  display: "flex",
  alignItems: "center",
  gap: 1,
  px: 0.9,
  py: 1.05,
  borderBottom: "1px solid #e2e8f0",
};

function MetaDivider() {
  return <Box component="span" aria-hidden sx={{ width: "1px", height: 14, bgcolor: "#cbd5e1", flexShrink: 0 }} />;
}

export function formatPhoneLabel(phone) {
  const digits = String(phone || "");
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function PhoneLabel({ phone, showMissing = false }) {
  if (!phone) {
    if (!showMissing) return null;
    return (
      <Typography component="span" sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#94a3b8" }}>
        No mobile
      </Typography>
    );
  }
  return (
    <Box
      component="a"
      href={`tel:${phone}`}
      sx={{
        display: "inline-block",
        mt: 0.15,
        color: "#1d4ed8",
        fontSize: "0.8rem",
        fontWeight: 800,
        letterSpacing: "0.01em",
        textDecoration: "none",
        whiteSpace: "nowrap",
        "&:hover": { textDecoration: "underline" },
      }}
    >
      {formatPhoneLabel(phone)}
    </Box>
  );
}

export function OrderMeta({ variety, count, taluka, village, phone, showMissingPhone = false }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.45, mt: 0.45, minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.7, minWidth: 0 }}>
        <VarietyCount variety={variety} count={count} />
        <MetaDivider />
        <PlaceChip taluka={taluka} village={village} />
      </Box>
      {phone || showMissingPhone ? <PhoneLabel phone={phone} showMissing={showMissingPhone} /> : null}
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
