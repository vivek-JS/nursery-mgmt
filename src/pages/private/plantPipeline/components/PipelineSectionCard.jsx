import React from "react";
import { Box, Typography, Button, Collapse, IconButton } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { contentPaperSx } from "../utils/pipelineTheme";

export default function PipelineSectionCard({
  stage,
  title,
  subtitle,
  count,
  actionLabel,
  actionIcon: ActionIcon,
  onAction,
  defaultOpen = true,
  children,
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const color = stage?.color ?? "#64748b";

  return (
    <Box
      sx={{
        ...contentPaperSx,
        mb: 2,
        borderLeft: `4px solid ${color}`,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1.5,
          bgcolor: stage?.bg ?? "transparent",
          borderBottom: open ? "1px solid" : "none",
          borderColor: "divider",
          cursor: "pointer",
        }}
        onClick={() => setOpen((v) => !v)}
      >
        <IconButton
          size="small"
          sx={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
        <Box flex={1}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            {count != null && (
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 10,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  bgcolor: `${color}22`,
                  color,
                }}
              >
                {count}
              </Box>
            )}
          </Box>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
        {actionLabel && onAction && (
          <Button
            size="small"
            variant="contained"
            startIcon={ActionIcon ? <ActionIcon /> : null}
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              bgcolor: color,
              "&:hover": { bgcolor: color, filter: "brightness(0.92)" },
            }}
          >
            {actionLabel}
          </Button>
        )}
      </Box>
      <Collapse in={open}>
        <Box sx={{ p: 2 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}
