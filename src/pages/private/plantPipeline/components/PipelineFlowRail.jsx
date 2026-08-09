import React from "react";
import { Box, Typography } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { STAGES, stageCounts } from "../utils/pipelineTheme";

const FLOW = [
  { key: "lab", stage: STAGES.lab, countKey: "lab" },
  { key: "primaryIn", stage: STAGES.primary, countKey: "primaryIn", label: "Pri. in" },
  { key: "primaryOut", stage: STAGES.primary, countKey: "primaryOut", label: "Pri. out" },
  { key: "secondaryIn", stage: STAGES.secondary, countKey: "secondaryIn", label: "Sec. in" },
  { key: "dispatch", stage: STAGES.dispatch, countKey: "dispatch" },
];

export default function PipelineFlowRail({ batchDoc, activeTab = 0 }) {
  const counts = stageCounts(batchDoc);

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: { xs: 1, md: 0.5 },
        py: 1,
      }}
    >
      {FLOW.map((item, idx) => {
        const isActive =
          (activeTab === 0 && item.key === "lab") ||
          (activeTab === 1 && item.key.startsWith("primary")) ||
          (activeTab === 2 && item.key === "secondaryIn") ||
          (activeTab === 3 && item.key === "dispatch");
        const label = item.label ?? item.stage.label;
        const count = counts[item.countKey] ?? 0;

        return (
          <React.Fragment key={item.key}>
            <Box
              sx={{
                flex: { xs: "1 1 45%", md: "1 1 auto" },
                minWidth: 88,
                px: 1.5,
                py: 1,
                borderRadius: 2,
                textAlign: "center",
                border: "2px solid",
                borderColor: isActive ? item.stage.color : "transparent",
                bgcolor: isActive ? item.stage.bg : "rgba(255,255,255,0.6)",
                transition: "all 0.2s",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: item.stage.color, fontWeight: 700, display: "block" }}
              >
                {label}
              </Typography>
              <Typography variant="h6" fontWeight={800} lineHeight={1.2}>
                {count}
              </Typography>
            </Box>
            {idx < FLOW.length - 1 && (
              <ArrowForwardIcon
                sx={{
                  color: "text.disabled",
                  fontSize: 18,
                  display: { xs: "none", md: "block" },
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </Box>
  );
}
