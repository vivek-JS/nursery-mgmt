import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  Chip,
  Alert,
} from "@mui/material";
import { Toast } from "helpers/toasts/toastHelper";
import {
  fetchVehicleAllocation,
  fetchVehicleSowReadyEntries,
  submitVehicleLoad,
  apiErrText,
} from "../utils/pipelineApi";

function fmtReady(value) {
  if (!value) return "—";
  const m = String(value).match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) return `${m[1]}/${m[2]}/${m[3]}`;
  return String(value);
}

export default function VehicleLoadDialog({
  open,
  onClose,
  dispatch,
  batchId,
  onSuccess,
  initialPlantRowIndex = 0,
}) {
  const [plantRowIndex, setPlantRowIndex] = useState(initialPlantRowIndex);
  const [allocation, setAllocation] = useState(null);
  const [sowReady, setSowReady] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qtyByLine, setQtyByLine] = useState({});
  const [qtyBySlot, setQtyBySlot] = useState({});

  useEffect(() => {
    if (!open || !dispatch?._id) return undefined;
    setPlantRowIndex(Math.max(0, Number(initialPlantRowIndex) || 0));
    setQtyByLine({});
    setQtyBySlot({});
    return undefined;
  }, [open, dispatch?._id, initialPlantRowIndex]);

  useEffect(() => {
    if (!open || !dispatch?._id) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const payload = await fetchVehicleAllocation(
          dispatch._id,
          plantRowIndex,
          batchId || ""
        );
        if (cancelled) return;
        setAllocation(payload);
        if (payload?.sowingAllowed) {
          const sow = await fetchVehicleSowReadyEntries(dispatch._id, plantRowIndex);
          if (!cancelled) setSowReady(sow);
        } else {
          setSowReady(null);
        }
      } catch (e) {
        if (!cancelled) {
          Toast.error(apiErrText(e) || "Failed to load allocation");
          setAllocation(null);
          setSowReady(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, dispatch?._id, plantRowIndex, batchId]);

  const sowingAllowed = Boolean(allocation?.sowingAllowed);
  const suggestions = allocation?.suggestions ?? [];
  const sowEntries = sowReady?.entries ?? [];
  const plantRows = allocation?.plantRows?.length
    ? allocation.plantRows
    : dispatch?.plantRowsSummary ?? dispatch?.plantRows ?? [];
  const rowCount = Array.isArray(plantRows) ? Math.max(1, plantRows.length) : 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dispatch?._id) return;

    if (sowingAllowed) {
      const sowReadySelections = sowEntries
        .map((ent) => {
          const plants = Math.max(0, Math.floor(Number(qtyBySlot[ent.slotId]) || 0));
          if (plants < 1) return null;
          return { slotId: ent.slotId, plants };
        })
        .filter(Boolean);

      if (!sowReadySelections.length) {
        Toast.error("Enter plants on at least one sow-ready slot");
        return;
      }

      setSubmitting(true);
      try {
        await submitVehicleLoad(dispatch._id, {
          source: "SOW_READY",
          plantRowIndex,
          sowReadySelections,
        });
        Toast.success("Sow-ready vehicle load recorded");
        onSuccess?.();
        onClose();
      } catch (err) {
        Toast.error(apiErrText(err) || "Vehicle load failed");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const inwardSelections = suggestions
      .map((ln) => {
        const q = Math.max(0, Math.floor(Number(qtyByLine[String(ln.secondaryInwardId)] || 0)));
        if (q < 1) return null;
        return {
          secondaryInwardId: ln.secondaryInwardId,
          batchId: ln.batchId,
          plants: q,
        };
      })
      .filter(Boolean);

    if (!inwardSelections.length) {
      Toast.error("Enter plants on at least one line");
      return;
    }

    setSubmitting(true);
    try {
      await submitVehicleLoad(dispatch._id, {
        plantRowIndex,
        inwardSelections,
        ...(batchId ? { batchId } : {}),
      });
      Toast.success("Vehicle load recorded");
      onSuccess?.();
      onClose();
    } catch (err) {
      Toast.error(apiErrText(err) || "Vehicle load failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <span>
            Vehicle load — {dispatch?.vehicleName ?? dispatch?.transportId ?? "Dispatch"}
          </span>
          {sowingAllowed ? (
            <Chip size="small" color="success" label="Sow-ready" />
          ) : (
            <Chip size="small" variant="outlined" label="Secondary inward" />
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                size="small"
                label="Plant row"
                value={plantRowIndex}
                onChange={(e) => {
                  setPlantRowIndex(Number(e.target.value));
                  setQtyByLine({});
                  setQtyBySlot({});
                }}
              >
                {Array.from({ length: rowCount }).map((_, i) => {
                  const pr = plantRows[i];
                  const label = pr?.name
                    ? `${pr.name}${pr.sowingAllowed ? " · sow-ready" : ""}`
                    : `Row ${i + 1}`;
                  return (
                    <MenuItem key={i} value={i}>
                      {label}
                    </MenuItem>
                  );
                })}
              </TextField>
            </Grid>
          </Grid>

          {loading ? (
            <CircularProgress size={24} />
          ) : sowingAllowed ? (
            sowEntries.length === 0 ? (
              <Alert severity="info">No sellable sow-ready entries (availablePlants = 0).</Alert>
            ) : (
              <>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  All slots with available plants · pick qty per slot (decrements availablePlants)
                </Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ready date</TableCell>
                      <TableCell>Slot</TableCell>
                      <TableCell align="right">Available</TableCell>
                      <TableCell>Plants to load</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sowEntries.map((ent) => (
                      <TableRow key={ent.slotId}>
                        <TableCell>{fmtReady(ent.plantReadyDate)}</TableCell>
                        <TableCell>
                          {ent.startDay || "—"} → {ent.endDay || "—"}
                          {ent.shedName ? (
                            <Typography variant="caption" display="block" color="text.secondary">
                              {ent.shedName}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell align="right">{ent.availablePlants ?? "—"}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={qtyBySlot[ent.slotId] ?? ""}
                            onChange={(e) =>
                              setQtyBySlot((prev) => ({
                                ...prev,
                                [ent.slotId]: e.target.value,
                              }))
                            }
                            inputProps={{ min: 0, max: ent.availablePlants }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )
          ) : suggestions.length === 0 ? (
            <Typography color="text.secondary">No allocation suggestions available.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Batch</TableCell>
                  <TableCell>Shed</TableCell>
                  <TableCell align="right">Available</TableCell>
                  <TableCell>Plants to load</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suggestions.map((ln) => (
                  <TableRow key={String(ln.secondaryInwardId)}>
                    <TableCell>{ln.batchNumber ?? ln.batchId}</TableCell>
                    <TableCell>{ln.pollyhouse || "—"}</TableCell>
                    <TableCell align="right">
                      {ln.remainingPlants ?? ln.availableQuantity ?? "—"}
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={qtyByLine[String(ln.secondaryInwardId)] ?? ""}
                        onChange={(e) =>
                          setQtyByLine((prev) => ({
                            ...prev,
                            [String(ln.secondaryInwardId)]: e.target.value,
                          }))
                        }
                        inputProps={{
                          min: 0,
                          max: ln.remainingPlants ?? ln.availableQuantity,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting || loading}>
            Load vehicle
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
