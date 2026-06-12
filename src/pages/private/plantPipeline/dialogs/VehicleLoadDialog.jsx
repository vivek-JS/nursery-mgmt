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
} from "@mui/material";
import { Toast } from "helpers/toasts/toastHelper";
import {
  fetchVehicleAllocation,
  submitVehicleLoad,
  apiErrText,
} from "../utils/pipelineApi";

export default function VehicleLoadDialog({ open, onClose, dispatch, batchId, onSuccess }) {
  const [plantRowIndex, setPlantRowIndex] = useState(0);
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [qtyByLine, setQtyByLine] = useState({});

  useEffect(() => {
    if (!open || !dispatch?._id) return undefined;
    setPlantRowIndex(0);
    setQtyByLine({});
    return undefined;
  }, [open, dispatch?._id]);

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
        if (!cancelled) setAllocation(payload);
      } catch (e) {
        if (!cancelled) {
          Toast.error(apiErrText(e) || "Failed to load allocation");
          setAllocation(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, dispatch?._id, plantRowIndex, batchId]);

  const suggestions = allocation?.suggestions ?? [];
  const plantRows = dispatch?.plantRows ?? dispatch?.plants ?? [];
  const rowCount = Array.isArray(plantRows) ? plantRows.length : 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dispatch?._id) return;
    const inwardSelections = suggestions
      .map((ln) => {
        const q = Number(qtyByLine[String(ln.secondaryInwardId)] || 0);
        if (q < 1) return null;
        const cav = Math.max(1, Number(ln.cavity) || 8);
        const trays = Math.floor(q / cav);
        if (trays < 1) return null;
        return {
          secondaryInwardId: ln.secondaryInwardId,
          batchId: ln.batchId,
          plants: cav * trays,
          cavity: cav,
          numberOfTrays: trays,
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
        <DialogTitle>
          Vehicle load — {dispatch?.vehicleName ?? dispatch?.transportId ?? "Dispatch"}
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
                onChange={(e) => setPlantRowIndex(Number(e.target.value))}
              >
                {Array.from({ length: Math.max(1, rowCount) }).map((_, i) => (
                  <MenuItem key={i} value={i}>
                    Row {i + 1}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {loading ? (
            <CircularProgress size={24} />
          ) : suggestions.length === 0 ? (
            <Typography color="text.secondary">No allocation suggestions available.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Batch</TableCell>
                  <TableCell>Available</TableCell>
                  <TableCell>Plants to load</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suggestions.map((ln) => (
                  <TableRow key={String(ln.secondaryInwardId)}>
                    <TableCell>{ln.batchNumber ?? ln.batchId}</TableCell>
                    <TableCell>{ln.availableQuantity ?? "—"}</TableCell>
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
                        inputProps={{ min: 0, max: ln.availableQuantity }}
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
