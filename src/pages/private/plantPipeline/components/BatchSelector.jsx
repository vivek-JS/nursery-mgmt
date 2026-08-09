import React from "react";
import { Autocomplete, TextField, Box, Typography, InputAdornment, Chip } from "@mui/material";
import Inventory2Icon from "@mui/icons-material/Inventory2";
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
    <Box sx={{ minWidth: { xs: "100%", md: 420 }, flex: 1 }}>
      <Autocomplete
        options={options}
        value={selected}
        onChange={(_, opt) => onChange(opt?.id ?? "")}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderOption={(props, option) => (
          <Box component="li" {...props} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" noWrap flex={1}>
              {option.label}
            </Typography>
            {!option.hasOutward && (
              <Chip label="New" size="small" color="warning" variant="outlined" sx={{ height: 22 }} />
            )}
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search batch (plant / variety / number)"
            placeholder="Type to search…"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <InputAdornment position="start">
                    <Inventory2Icon sx={{ color: "#059669", fontSize: 22 }} />
                  </InputAdornment>
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2.5,
                bgcolor: "#fff",
              },
            }}
          />
        )}
      />
      {selected && !selected.hasOutward && (
        <Typography variant="caption" color="warning.main" sx={{ mt: 0.75, display: "block", fontWeight: 500 }}>
          First lab entry will create the plant-outward record for this batch.
        </Typography>
      )}
    </Box>
  );
}
