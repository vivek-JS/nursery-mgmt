import React from "react";
import { Box, Typography } from "@mui/material";
import BiotechIcon from "@mui/icons-material/Biotech";
import GrassIcon from "@mui/icons-material/Grass";
import ParkIcon from "@mui/icons-material/Park";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { STAGES, stageCounts } from "../utils/pipelineTheme";

const TABS = [
  { id: 0, stage: STAGES.lab, icon: BiotechIcon },
  { id: 1, stage: STAGES.primary, icon: GrassIcon },
  { id: 2, stage: STAGES.secondary, icon: ParkIcon },
  { id: 3, stage: STAGES.dispatch, icon: LocalShippingIcon },
];

export default function PipelineStageTabs({ value, onChange, batchDoc, batchSelected }) {
  const counts = stageCounts(batchDoc);

  const tabCount = (id) => {
    if (id === 0) return counts.lab;
    if (id === 1) return counts.primaryIn + counts.primaryOut;
    if (id === 2) return counts.secondaryIn;
    return counts.dispatch;
  };

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
        gap: 1.5,
        mb: 3,
      }}
    >
      {TABS.map(({ id, stage, icon: Icon }) => {
        const active = value === id;
        const disabled = id > 0 && !batchSelected;
        const count = tabCount(id);

        return (
          <Box
            key={id}
            onClick={() => !disabled && onChange(id)}
            sx={{
              p: 2,
              borderRadius: 2.5,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.45 : 1,
              border: "2px solid",
              borderColor: active ? stage.color : "transparent",
              bgcolor: active ? stage.bg : "#fff",
              boxShadow: active
                ? `0 4px 16px ${stage.color}22`
                : "0 1px 4px rgba(15,23,42,0.06)",
              transition: "all 0.2s ease",
              "&:hover": disabled
                ? {}
                : {
                    borderColor: stage.border,
                    transform: "translateY(-1px)",
                  },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: `${stage.color}18`,
                  color: stage.color,
                }}
              >
                <Icon fontSize="small" />
              </Box>
              <Box flex={1}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {stage.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {stage.subtitle}
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={800} color={stage.color}>
                {count}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
