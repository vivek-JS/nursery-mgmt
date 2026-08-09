import React from "react";
import { Box, Typography, Button } from "@mui/material";

export default function PipelineEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  stageColor = "#64748b",
}) {
  return (
    <Box
      sx={{
        py: 5,
        px: 3,
        textAlign: "center",
        borderRadius: 2,
        bgcolor: "rgba(248, 250, 252, 0.8)",
        border: "1px dashed",
        borderColor: "divider",
      }}
    >
      {Icon && (
        <Box
          sx={{
            width: 56,
            height: 56,
            mx: "auto",
            mb: 2,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: `${stageColor}14`,
            color: stageColor,
          }}
        >
          <Icon sx={{ fontSize: 28 }} />
        </Box>
      )}
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, mx: "auto", mb: 2 }}>
        {description}
      </Typography>
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction} sx={{ borderRadius: 2, textTransform: "none" }}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
