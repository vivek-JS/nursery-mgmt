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
  Alert,
} from "@mui/material";
import dayjs from "dayjs";
import { Toast } from "helpers/toasts/toastHelper";
import { previewPrimaryInwardFifo, submitPrimaryInwardBulk } from "../utils/pipelineApi";
import { apiErrText } from "../utils/pipelineLabels";
import { buildSizeRowsFromTotals, parseSizeSplit, totalPlantsFromSplit } from "../utils/fifoPreview";

const emptyForm = () => ({
  primaryInwardDate: dayjs().format("YYYY-MM-DD"),
  pollyhouse: "",
  cavity: "126",
  R1: "",
  R2: "",
  R3: "",
  totalBottles: "",
  numberOfLabTrays: "",
  laboursLadies: "",
  laboursGents: "",
  primaryPlantReadyDays: "",
  primaryOutwardExpectedDate: dayjs().add(12, "day").format("YYYY-MM-DD"),
  remarks: "",
});

export default function PrimaryInwardDialog({
  open,
  onClose,
  batchId,
  locations,
  trays,
  onSuccess,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [fifoPreview, setFifoPreview] = useState(null);

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setFifoPreview(null);
    }
  }, [open]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const sizeSplit = parseSizeSplit(form);
  const totalPlants = totalPlantsFromSplit(sizeSplit);

  const handlePreview = async () => {
    const bottles = Number(form.totalBottles);
    if (totalPlants < 1 || bottles < 1) {
      Toast.error("Enter plants (R1/R2/R3) and bottles");
      return;
    }
    setPreviewing(true);
    try {
      const preview = await previewPrimaryInwardFifo({
        totalPlantsSown: totalPlants,
        totalBottlesSown: bottles,
        cavity: Number(form.cavity) || 126,
        primaryInwardDate: form.primaryInwardDate,
        sizeSplit,
      });
      setFifoPreview(preview);
      if (preview.suggestedPrimaryOutwardExpectedDate) {
        setForm((prev) => ({
          ...prev,
          primaryOutwardExpectedDate: dayjs(preview.suggestedPrimaryOutwardExpectedDate).format(
            "YYYY-MM-DD"
          ),
        }));
      }
      if (preview.suggestedPrimaryPlantReadyDays != null) {
        setForm((prev) => ({
          ...prev,
          primaryPlantReadyDays: String(preview.suggestedPrimaryPlantReadyDays),
        }));
      }
      Toast.success("FIFO preview loaded");
    } catch (err) {
      Toast.error(apiErrText(err) || "FIFO preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const bottles = Number(form.totalBottles);
    const ladies = Number(form.laboursLadies) || 0;
    const gents = Number(form.laboursGents) || 0;
    if (
      !form.pollyhouse ||
      totalPlants < 1 ||
      bottles < 1 ||
      ladies + gents < 1 ||
      !fifoPreview?.fifoAllocations?.length
    ) {
      Toast.error("Fill form, run FIFO preview, and ensure labour count ≥ 1");
      return;
    }
    const cavity = Number(form.cavity) || 126;
    const totalTrays = Math.max(1, Math.ceil(totalPlants / cavity));
    const sizeRows =
      fifoPreview.sizeRowsSuggested ??
      buildSizeRowsFromTotals(sizeSplit, totalTrays, bottles);

    setSubmitting(true);
    try {
      await submitPrimaryInwardBulk({
        primaryInwardDate: new Date(form.primaryInwardDate).toISOString(),
        pollyhouse: form.pollyhouse,
        cavity,
        totalPlantsSown: totalPlants,
        totalBottlesSown: bottles,
        sizeSplit,
        fifoAllocations: fifoPreview.fifoAllocations,
        sizeRows,
        laboursLadies: ladies,
        laboursGents: gents,
        remarks: form.remarks || "",
        primaryPlantReadyDays: Number(form.primaryPlantReadyDays) || undefined,
        primaryOutwardExpectedDate: form.primaryOutwardExpectedDate
          ? new Date(form.primaryOutwardExpectedDate).toISOString()
          : undefined,
        numberOfLabTrays: form.numberOfLabTrays ? Number(form.numberOfLabTrays) : undefined,
      });
      Toast.success("Primary inward recorded");
      onSuccess?.();
      onClose();
    } catch (err) {
      Toast.error(apiErrText(err) || "Primary inward failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Primary inward (sowing)</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Primary inward date"
                InputLabelProps={{ shrink: true }}
                value={form.primaryInwardDate}
                onChange={set("primaryInwardDate")}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                select
                label="Polyhouse / shade"
                value={form.pollyhouse}
                onChange={set("pollyhouse")}
              >
                {locations.map((loc) => (
                  <MenuItem key={loc.value} value={loc.value}>
                    {loc.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                select
                label="Cavity"
                value={form.cavity}
                onChange={set("cavity")}
              >
                {(trays.length ? trays : [{ cavity: 126, label: "126" }]).map((t) => (
                  <MenuItem key={t.cavity} value={String(t.cavity)}>
                    {t.label ?? t.cavity}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="R1 plants"
                value={form.R1}
                onChange={set("R1")}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="R2 plants"
                value={form.R2}
                onChange={set("R2")}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="R3 plants"
                value={form.R3}
                onChange={set("R3")}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Total bottles"
                value={form.totalBottles}
                onChange={set("totalBottles")}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Lab trays"
                value={form.numberOfLabTrays}
                onChange={set("numberOfLabTrays")}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Labour (ladies)"
                value={form.laboursLadies}
                onChange={set("laboursLadies")}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Labour (gents)"
                value={form.laboursGents}
                onChange={set("laboursGents")}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Ready days"
                value={form.primaryPlantReadyDays}
                onChange={set("primaryPlantReadyDays")}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="Expected outward date"
                InputLabelProps={{ shrink: true }}
                value={form.primaryOutwardExpectedDate}
                onChange={set("primaryOutwardExpectedDate")}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Remarks"
                value={form.remarks}
                onChange={set("remarks")}
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="outlined" onClick={handlePreview} disabled={previewing}>
                {previewing ? "Previewing…" : "Preview FIFO allocation"}
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                Total plants: {totalPlants.toLocaleString("en-IN")}
              </Typography>
            </Grid>
            {fifoPreview?.fifoAllocations?.length > 0 && (
              <Grid item xs={12}>
                <Alert severity="info">
                  FIFO: {fifoPreview.fifoAllocations.length} lab line(s) allocated ·{" "}
                  {fifoPreview.fifoAllocations
                    .map(
                      (a) =>
                        `${a.batchNumber ?? "batch"}: ${a.plantsTaken} pl / ${a.bottlesTaken} bt`
                    )
                    .join("; ")}
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting || !fifoPreview}>
            Save primary inward
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
