import React, { useState } from "react";
import { Box, Button, Chip } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import BiotechIcon from "@mui/icons-material/Biotech";
import LabOutwardDialog from "../../dialogs/LabOutwardDialog";
import PipelineDataTable from "../PipelineDataTable";
import PipelineEmptyState from "../PipelineEmptyState";
import { STAGES } from "../../utils/pipelineTheme";
import { formatPipelineDate } from "../../utils/pipelineLabels";

function statusChip(status) {
  const s = status ?? "pending";
  if (s === "accepted") {
    return <Chip size="small" color="success" label="Accepted" sx={{ fontWeight: 600 }} />;
  }
  if (s === "rejected") {
    return <Chip size="small" color="error" label="Rejected" sx={{ fontWeight: 600 }} />;
  }
  return <Chip size="small" color="warning" label="Pending review" sx={{ fontWeight: 600 }} />;
}

export default function LabOutwardSection({ batchId, batchDoc, onRefresh }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const lines = batchDoc?.outward ?? [];

  if (!batchId) {
    return (
      <PipelineEmptyState
        icon={BiotechIcon}
        title="Lab outward"
        description="Select a batch first, then add bottles/plants sent from the lab."
        stageColor={STAGES.lab.color}
      />
    );
  }

  const columns = [
    { key: "outwardDate", label: "Outward date" },
    { key: "rootingDate", label: "Rooting date" },
    { key: "size", label: "Size" },
    { key: "bottles", label: "Bottles", align: "right" },
    { key: "plants", label: "Plants", align: "right" },
    {
      key: "status",
      label: "Status",
      render: (row) => statusChip(row.primaryReviewStatus),
    },
  ];

  const rows = lines.map((row) => ({
    key: String(row._id),
    data: {
      ...row,
      outwardDate: formatPipelineDate(row.outwardDate),
      rootingDate: formatPipelineDate(row.rootingDate),
    },
  }));

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          sx={{
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            bgcolor: STAGES.lab.color,
            "&:hover": { bgcolor: STAGES.lab.color, filter: "brightness(0.92)" },
          }}
        >
          Add lab outward
        </Button>
      </Box>

      {lines.length === 0 ? (
        <PipelineEmptyState
          icon={BiotechIcon}
          title="No lab outward yet"
          description="Record bottles and plants leaving the tissue-culture lab for this batch."
          actionLabel="Add first entry"
          onAction={() => setDialogOpen(true)}
          stageColor={STAGES.lab.color}
        />
      ) : (
        <PipelineDataTable
          columns={columns}
          rows={rows}
          emptyMessage="No lab outward lines."
        />
      )}

      <LabOutwardDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        batchId={batchId}
        onSuccess={onRefresh}
      />
    </Box>
  );
}
