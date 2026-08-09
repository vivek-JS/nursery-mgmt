import React, { useState } from "react";
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
  Button,
  Chip,
  LinearProgress,
  Collapse,
  IconButton,
  CircularProgress,
  Stack,
  TextField,
  InputAdornment,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  fetchVehicleLoadedLines,
} from "pages/private/plantPipeline/utils/pipelineApi";
import VehicleLoadDialog from "pages/private/plantPipeline/dialogs/VehicleLoadDialog";
import { fmtReadyDate, num, vehicleHasSowReady } from "../utils/monitorHelpers";

function LoadedLinesExpand({ dispatchId, open }) {
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState([]);

  React.useEffect(() => {
    if (!open || !dispatchId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchVehicleLoadedLines(dispatchId);
        if (!cancelled) setLines(res.lines ?? []);
      } catch {
        if (!cancelled) setLines([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, dispatchId]);

  if (!open) return null;
  if (loading) {
    return (
      <Box py={2} display="flex" justifyContent="center">
        <CircularProgress size={22} />
      </Box>
    );
  }
  if (!lines.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1.5, px: 1 }}>
        No loaded lines yet
      </Typography>
    );
  }
  return (
    <Table size="small" sx={{ mb: 1 }}>
      <TableHead>
        <TableRow>
          <TableCell>Source</TableCell>
          <TableCell>Shed / slot</TableCell>
          <TableCell align="right">Plants</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((ln) => (
          <TableRow key={ln.secondaryOutwardId}>
            <TableCell>
              <Chip
                size="small"
                label={ln.stockSource === "SOW_READY" ? "Sow-ready" : "Secondary inward"}
                color={ln.stockSource === "SOW_READY" ? "success" : "default"}
                variant="outlined"
              />
              {ln.sowReadyPlantReadyDate ? (
                <Typography variant="caption" display="block" color="text.secondary">
                  Ready {fmtReadyDate(ln.sowReadyPlantReadyDate)}
                </Typography>
              ) : null}
            </TableCell>
            <TableCell>
              {ln.pollyhouse || ln.sowReadySlotId || "—"}
              {ln.batchNumber ? (
                <Typography variant="caption" display="block" color="text.secondary">
                  {ln.batchNumber}
                </Typography>
              ) : null}
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              {num(ln.plants).toLocaleString("en-IN")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function VehicleDispatchMonitorPanel({
  vehicles,
  loading,
  search,
  onSearchChange,
  onRefresh,
}) {
  const [expandedId, setExpandedId] = useState("");
  const [loadTarget, setLoadTarget] = useState(null);
  const [loadPlantRowIndex, setLoadPlantRowIndex] = useState(0);

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
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ sm: "center" }}
        spacing={1.5}
        mb={2}
      >
        <LocalShippingIcon sx={{ color: "#2563eb" }} />
        <Box flex={1}>
          <Typography variant="subtitle1" fontWeight={800}>
            Vehicle dispatches
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PENDING / IN_TRANSIT / LOADED · shed & sow-ready load progress
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search transport / driver"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 220 }}
        />
        <IconButton onClick={onRefresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Stack>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>Transport</TableCell>
              <TableCell>Vehicle / driver</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Plants</TableCell>
              <TableCell>Progress</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No active vehicle dispatches
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((v) => {
                const id = String(v._id);
                const open = expandedId === id;
                const need = num(v.vehiclePlantQty ?? v.totalPlantQty);
                const loaded = num(v.shedLoadedPlantsTotal);
                const pct =
                  need > 0 ? Math.min(100, Math.round((loaded / need) * 100)) : 0;
                const sow = vehicleHasSowReady(v);
                return (
                  <React.Fragment key={id}>
                    <TableRow hover>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => setExpandedId(open ? "" : id)}
                        >
                          {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {v.transportId || id.slice(-6)}
                        </Typography>
                        {sow ? (
                          <Chip size="small" color="success" label="Sow-ready" sx={{ mt: 0.5 }} />
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {v.vehicleName || v.vehicleNumber || "—"}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {v.driverName || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" variant="outlined" label={v.transportStatus || "—"} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {loaded.toLocaleString("en-IN")} / {need.toLocaleString("en-IN")}
                        </Typography>
                        {(v.plantRowsSummary || []).slice(0, 2).map((pr, i) => (
                          <Typography
                            key={i}
                            variant="caption"
                            display="block"
                            color="text.secondary"
                          >
                            {pr.name}
                            {pr.sowingAllowed ? " · sow" : ""}
                          </Typography>
                        ))}
                      </TableCell>
                      <TableCell sx={{ minWidth: 120 }}>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
                        />
                        <Typography variant="caption">{pct}%</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => {
                            setLoadPlantRowIndex(0);
                            setLoadTarget(v);
                          }}
                          sx={{ textTransform: "none", borderRadius: 2 }}
                        >
                          Load
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={7} sx={{ py: 0, border: 0 }}>
                        <Collapse in={open} timeout="auto" unmountOnExit>
                          <Box sx={{ px: 2, py: 1.5, bgcolor: "grey.50" }}>
                            <Typography
                              variant="caption"
                              fontWeight={800}
                              color="text.secondary"
                              display="block"
                              mb={0.75}
                            >
                              Plants · subtype · crates
                            </Typography>
                            {(v.plantRowsSummary || []).length === 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                No plant rows on vehicle
                              </Typography>
                            ) : (
                              (v.plantRowsSummary || []).map((pr, i) => {
                                const label =
                                  pr.plantName && pr.subtypeName
                                    ? `${pr.plantName} / ${pr.subtypeName}`
                                    : pr.name || "Plant";
                                const crates = pr.crates || [];
                                return (
                                  <Box
                                    key={`${pr.plantId || i}-${pr.subTypeId || ""}`}
                                    sx={{
                                      mb: 1,
                                      p: 1,
                                      borderRadius: 1.5,
                                      border: "1px solid",
                                      borderColor: "divider",
                                      bgcolor: "#fff",
                                    }}
                                  >
                                    <Stack
                                      direction="row"
                                      alignItems="center"
                                      justifyContent="space-between"
                                      gap={1}
                                    >
                                      <Box>
                                        <Typography variant="body2" fontWeight={700}>
                                          {label}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {num(pr.quantity).toLocaleString("en-IN")} plants
                                          {pr.cratePieces != null
                                            ? ` · ${num(pr.cratePieces).toLocaleString("en-IN")} crates`
                                            : ""}
                                          {crates.length
                                            ? ` · ${crates
                                                .map(
                                                  (c) =>
                                                    `${c.cavityName || "—"}×${num(c.crateCount)}`
                                                )
                                                .join(", ")}`
                                            : ""}
                                        </Typography>
                                      </Box>
                                      <Stack direction="row" spacing={0.75} alignItems="center">
                                        {pr.sowingAllowed ? (
                                          <Chip size="small" color="success" label="Unlimited · sow" />
                                        ) : null}
                                        <Button
                                          size="small"
                                          variant={pr.sowingAllowed ? "contained" : "outlined"}
                                          onClick={() => {
                                            setLoadPlantRowIndex(Number(pr.plantRowIndex ?? i) || 0);
                                            setLoadTarget(v);
                                          }}
                                          sx={{ textTransform: "none", borderRadius: 2 }}
                                        >
                                          {pr.sowingAllowed ? "Load sow" : "Load"}
                                        </Button>
                                      </Stack>
                                    </Stack>
                                  </Box>
                                );
                              })
                            )}
                            <Typography
                              variant="caption"
                              fontWeight={800}
                              color="text.secondary"
                              display="block"
                              mt={1}
                              mb={0.5}
                            >
                              Loaded lines
                            </Typography>
                            <LoadedLinesExpand dispatchId={id} open={open} />
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <VehicleLoadDialog
        open={Boolean(loadTarget)}
        dispatch={loadTarget}
        initialPlantRowIndex={loadPlantRowIndex}
        onClose={() => {
          setLoadTarget(null);
          setLoadPlantRowIndex(0);
        }}
        onSuccess={() => {
          setLoadTarget(null);
          setLoadPlantRowIndex(0);
          onRefresh?.();
        }}
      />
    </Paper>
  );
}
