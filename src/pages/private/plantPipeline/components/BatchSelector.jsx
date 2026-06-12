import React from "react";
import { Autocomplete, TextField, Box, Typography } from "@mui/material";
import { batchLabel } from "../utils/pipelineLabels";

export default function BatchSelector({ batchOptions, value, onChange, dispatchBatches = [] }) {
  const options = React.useMemo(() => {
    const fromOutwards = batchOptions.map(({ id, doc }) => ({
      id,
      label: batchLabel(doc),
      hasOutward: true,
    }));
    const seen = new Set(fromOutwards.map((o) => o.id));
    const extras = (dispatchBatches || [])
      .filter((b) => {
        const id = String(b._id ?? b.id);
        return id && !seen.has(id);
      })
      .map((b) => ({
        id: String(b._id ?? b.id),
        label: `${b.batchNumber ?? b.batchNo ?? "Batch"} · (no outward yet)`,
        hasOutward: false,
      }));
    return [...fromOutwards, ...extras];
  }, [batchOptions, dispatchBatches]);

  const selected = options.find((o) => o.id === value) ?? null;

  return (
    <Box sx={{ minWidth: 280, flex: 1 }}>
      <Autocomplete
        size="small"
        options={options}
        value={selected}
        onChange={(_, opt) => onChange(opt?.id ?? "")}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField {...params} label="Select batch" placeholder="Search batch…" />
        )}
      />
      {selected && !selected.hasOutward && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
          Lab outward can be added — plant-outward doc will be created on first lab entry.
        </Typography>
      )}
    </Box>
  );
}
