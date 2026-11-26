import React, { useEffect, useState } from "react";
import { Autocomplete, Box, Button, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { API, NetworkManager } from "network/core";
import { DISPATCH_DAY_OPTIONS, dispatchDayTitle } from "./orderBoardUtils";

function asStringList(response) {
  const raw = response?.data?.data ?? response?.data;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => String(item || "").trim()).filter(Boolean);
}

const fieldSx = {
  "& .MuiInputBase-root": { fontSize: "0.74rem", bgcolor: "#fff", minHeight: 34 },
  "& .MuiInputBase-input": { py: "6px" },
  "& .MuiAutocomplete-input": { py: "2px !important" },
  "& .MuiInputLabel-root": { fontSize: "0.7rem" },
};

export default function CallingListFilters({ filters, onFiltersChange, dayKey, onDayKey, onReadyAll, busyAll, canMarkAll }) {
  const [moreOpen, setMoreOpen] = useState(
    () => Boolean(filters.plantId || filters.subtypeId || filters.district || filters.taluka || filters.village)
  );
  const [plants, setPlants] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [plantsRes, districtRes, talukaRes, villageRes] = await Promise.allSettled([
        NetworkManager(API.slots.GET_PLANTS).request(),
        NetworkManager(API.ORDER.GET_DISTRICTS).request(),
        NetworkManager(API.ORDER.GET_TALUKAS).request(),
        NetworkManager(API.ORDER.GET_VILLAGES).request(),
      ]);
      if (!active) return;
      if (plantsRes.status === "fulfilled") {
        const raw = plantsRes.value?.data;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        setPlants(
          list
            .map((plant) => ({
              label: plant?.name || "Plant",
              value: String(plant?.plantId ?? plant?._id ?? ""),
              subtypes: (plant?.subtypes || [])
                .map((subtype) => ({
                  label: subtype?.name || subtype?.subtypeName || "Variety",
                  value: String(subtype?._id ?? subtype?.subtypeId ?? ""),
                }))
                .filter((subtype) => subtype.value),
            }))
            .filter((plant) => plant.value)
        );
      }
      if (districtRes.status === "fulfilled") setDistricts(asStringList(districtRes.value).sort((a, b) => a.localeCompare(b)));
      if (talukaRes.status === "fulfilled") setTalukas(asStringList(talukaRes.value).sort((a, b) => a.localeCompare(b)));
      if (villageRes.status === "fulfilled") setVillages(asStringList(villageRes.value).sort((a, b) => a.localeCompare(b)));
    })();
    return () => {
      active = false;
    };
  }, []);

  const plantValue = plants.find((plant) => plant.value === filters.plantId) || null;
  const subtypes = plantValue?.subtypes || [];
  const varietyValue = subtypes.find((subtype) => subtype.value === filters.subtypeId) || null;
  const placeOn = Boolean(filters.plantId || filters.subtypeId || filters.district || filters.taluka || filters.village);
  const dayLabel = DISPATCH_DAY_OPTIONS.find((option) => option.value === dayKey)?.label || "Aaj";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
      <TextField
        size="small"
        placeholder="Search farmer, order, village…"
        value={filters.search}
        onChange={(event) => onFiltersChange({ search: event.target.value })}
        sx={fieldSx}
      />
      {String(filters.search || "").trim() ? (
        <Typography sx={{ fontSize: "0.66rem", color: "#b45309", lineHeight: 1.3 }}>
          Search covers the whole queue until this box is cleared.
        </Typography>
      ) : null}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filters.farmReadyOnly ? "farm" : "all"}
          onChange={(_, value) => value && onFiltersChange({ farmReadyOnly: value === "farm" })}
          sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 700, fontSize: "0.7rem", py: 0.15, px: 1 } }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="farm">Farm ready</ToggleButton>
        </ToggleButtonGroup>
        <Button
          size="small"
          variant={filters.includePastDue ? "contained" : "outlined"}
          color="warning"
          onClick={() => onFiltersChange({ includePastDue: !filters.includePastDue })}
          sx={{ ml: "auto", textTransform: "none", fontWeight: 800, fontSize: "0.7rem", borderRadius: 2, minWidth: 0, py: 0.25, boxShadow: "none" }}
        >
          Overdue
        </Button>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.6 }}>
        <TextField
          size="small"
          type="date"
          label="From"
          value={filters.startDate}
          onChange={(event) => onFiltersChange({ startDate: event.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={fieldSx}
        />
        <TextField
          size="small"
          type="date"
          label="To"
          value={filters.endDate}
          onChange={(event) => onFiltersChange({ endDate: event.target.value })}
          InputLabelProps={{ shrink: true }}
          sx={fieldSx}
        />
      </Box>
      <Button
        size="small"
        onClick={() => setMoreOpen((open) => !open)}
        sx={{ textTransform: "none", fontWeight: 800, fontSize: "0.7rem", justifyContent: "flex-start", px: 0.25, minWidth: 0, color: "#334155" }}
      >
        {moreOpen ? "Hide plant and place" : "Plant, variety, taluka, village"}
        {placeOn ? " · on" : ""}
      </Button>
      {moreOpen ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.6 }}>
          <Autocomplete
            size="small"
            options={plants}
            value={plantValue}
            onChange={(_, value) => onFiltersChange({ plantId: value?.value || "", subtypeId: "" })}
            getOptionLabel={(option) => option.label || ""}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            renderInput={(params) => <TextField {...params} placeholder="Plant" sx={fieldSx} />}
          />
          <Autocomplete
            size="small"
            options={subtypes}
            value={varietyValue}
            disabled={!filters.plantId}
            onChange={(_, value) => onFiltersChange({ subtypeId: value?.value || "" })}
            getOptionLabel={(option) => option.label || ""}
            isOptionEqualToValue={(a, b) => a.value === b.value}
            renderInput={(params) => (
              <TextField {...params} placeholder={filters.plantId ? "Variety" : "Plant first"} sx={fieldSx} />
            )}
          />
          <Autocomplete
            size="small"
            options={districts}
            value={filters.district || null}
            onChange={(_, value) => onFiltersChange({ district: value || "" })}
            renderInput={(params) => <TextField {...params} placeholder="District" sx={fieldSx} />}
          />
          <Autocomplete
            size="small"
            freeSolo
            options={talukas}
            value={filters.taluka || null}
            onChange={(_, value) => onFiltersChange({ taluka: typeof value === "string" ? value : value || "" })}
            renderInput={(params) => <TextField {...params} placeholder="Taluka" sx={fieldSx} />}
          />
          <Autocomplete
            size="small"
            options={villages}
            value={filters.village || null}
            onChange={(_, value) => onFiltersChange({ village: value || "" })}
            sx={{ gridColumn: "1 / -1" }}
            renderInput={(params) => <TextField {...params} placeholder="Village" sx={fieldSx} />}
          />
        </Box>
      ) : null}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={dayKey}
          onChange={(_, value) => value && onDayKey(value)}
          sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontWeight: 800, fontSize: "0.72rem", px: 1, py: 0.2 } }}
        >
          {DISPATCH_DAY_OPTIONS.map((option) => (
            <ToggleButton key={option.value} value={option.value} title={dispatchDayTitle(option.value)}>
              {option.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Button
          size="small"
          variant="contained"
          disabled={!canMarkAll || busyAll}
          onClick={onReadyAll}
          sx={{
            ml: "auto",
            textTransform: "none",
            fontWeight: 800,
            fontSize: "0.72rem",
            borderRadius: 2,
            py: 0.35,
            px: 1.1,
            bgcolor: "#2563eb",
            boxShadow: "none",
            whiteSpace: "nowrap",
            "&:hover": { bgcolor: "#1d4ed8", boxShadow: "none" },
          }}
        >
          {busyAll ? "Marking…" : `Ready · ${dayLabel}`}
        </Button>
      </Box>
    </Box>
  );
}
