import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  CircularProgress,
  Chip,
  Stack,
} from "@mui/material";
import SpaIcon from "@mui/icons-material/Spa";
import {
  fetchAllSowReadyEntriesByDate,
  fetchSowingAllowedPlants,
} from "pages/private/plantPipeline/utils/pipelineApi";
import { fmtReadyDate, num } from "../utils/monitorHelpers";

export default function SowReadyStockPanel({ onTotals }) {
  const [plants, setPlants] = useState([]);
  const [plantFilter, setPlantFilter] = useState("ALL");
  const [subtypeFilter, setSubtypeFilter] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [byDate, setByDate] = useState([]);
  const [totalAvailable, setTotalAvailable] = useState(0);

  const subtypes = useMemo(() => {
    if (plantFilter === "ALL") return [];
    const p = plants.find((x) => x.plantId === plantFilter);
    return p?.subtypes ?? [];
  }, [plants, plantFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchSowingAllowedPlants();
        if (!cancelled) setPlants(list);
      } catch {
        if (!cancelled) setPlants([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchAllSowReadyEntriesByDate();
        if (cancelled) return;
        const groups = res.byDate ?? [];
        setByDate(groups);
        const sum = num(res.totalAvailable);
        setTotalAvailable(sum);
        onTotals?.(sum, "all sellable");
      } catch {
        if (!cancelled) {
          setByDate([]);
          setTotalAvailable(0);
          onTotals?.(0, null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onTotals]);

  const filteredGroups = useMemo(() => {
    if (plantFilter === "ALL" && subtypeFilter === "ALL") return byDate;
    return byDate
      .map((g) => {
        const entries = (g.entries || []).filter((e) => {
          if (plantFilter !== "ALL" && String(e.plantId) !== plantFilter) return false;
          if (subtypeFilter !== "ALL" && String(e.subtypeId) !== subtypeFilter)
            return false;
          return true;
        });
        if (!entries.length) return null;
        return {
          ...g,
          entries,
          total: entries.reduce((s, e) => s + num(e.availablePlants), 0),
        };
      })
      .filter(Boolean);
  }, [byDate, plantFilter, subtypeFilter]);

  const filteredTotal = filteredGroups.reduce((s, g) => s + num(g.total), 0);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "#fff",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <SpaIcon sx={{ color: "#0d9488" }} />
        <Box flex={1}>
          <Typography variant="subtitle1" fontWeight={800}>
            Sow-ready stock (sellable)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            All entries with available plants · date-wise · no ±N day window
          </Typography>
        </Box>
        <Chip
          size="small"
          color="success"
          label={`${filteredTotal.toLocaleString("en-IN")} / ${totalAvailable.toLocaleString("en-IN")} plants`}
        />
      </Stack>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} mb={2}>
        <TextField
          select
          size="small"
          label="Plant"
          value={plantFilter}
          onChange={(e) => {
            setPlantFilter(e.target.value);
            setSubtypeFilter("ALL");
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="ALL">All plants</MenuItem>
          {plants.map((p) => (
            <MenuItem key={p.plantId} value={p.plantId}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Subtype"
          value={subtypeFilter}
          onChange={(e) => setSubtypeFilter(e.target.value)}
          sx={{ minWidth: 180 }}
          disabled={plantFilter === "ALL" || !subtypes.length}
        >
          <MenuItem value="ALL">All subtypes</MenuItem>
          {subtypes.map((st) => (
            <MenuItem key={st.subtypeId} value={st.subtypeId}>
              {st.name}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {loading ? (
        <Box py={4} display="flex" justifyContent="center">
          <CircularProgress size={28} />
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 420 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Ready date</TableCell>
                <TableCell>Plant / Subtype</TableCell>
                <TableCell>Slot</TableCell>
                <TableCell>Shed</TableCell>
                <TableCell align="right">Available</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.secondary" }}>
                    No sellable sow-ready entries (availablePlants = 0)
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.flatMap((group) => [
                  <TableRow key={`d-${group.date}`} sx={{ bgcolor: "#f0fdfa" }}>
                    <TableCell colSpan={4} sx={{ fontWeight: 800, py: 1 }}>
                      Ready {fmtReadyDate(group.date)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, py: 1 }}>
                      {num(group.total).toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>,
                  ...group.entries.map((e) => (
                    <TableRow key={`${group.date}-${e.slotId}`} hover>
                      <TableCell sx={{ color: "text.secondary", pl: 3 }}>
                        {fmtReadyDate(e.plantReadyDate)}
                      </TableCell>
                      <TableCell>
                        {e.label || `${e.plantName || "—"} / ${e.subtypeName || "—"}`}
                      </TableCell>
                      <TableCell>
                        {e.startDay || "—"} → {e.endDay || "—"}
                      </TableCell>
                      <TableCell>{e.shedName || "—"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {num(e.availablePlants).toLocaleString("en-IN")}
                      </TableCell>
                    </TableRow>
                  )),
                ])
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
