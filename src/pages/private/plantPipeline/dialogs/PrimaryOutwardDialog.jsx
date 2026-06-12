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
} from "@mui/material";
import dayjs from "dayjs";
import { Toast } from "helpers/toasts/toastHelper";
import { submitPrimaryOutwardBatch } from "../utils/pipelineApi";
import { apiErrText } from "../utils/pipelineLabels";

const QUALITIES = ["Very Good", "Good", "Average"];

const emptyForm = () => ({
  numberOfPlants: "",
  primaryOutwardDate: dayjs().format("YYYY-MM-DD"),
  pollyhouse: "",
  qualityOfDispatch: "Very Good",
  laboursLadies: "",
  laboursGents: "",
  remarks: "",
  isReceived: "yes",
});

export default function PrimaryOutwardDialog({
  open,
  onClose,
  batchId,
  locations,
  onSuccess,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const plants = Number(form.numberOfPlants);
    const ladies = Number(form.laboursLadies) || 0;
    const gents = Number(form.laboursGents) || 0;
    if (!batchId || plants < 1 || !form.pollyhouse || ladies + gents < 1) {
      Toast.error("Fill required fields (plants, polyhouse, labour)");
      return;
    }
    setSubmitting(true);
    try {
      await submitPrimaryOutwardBatch(batchId, {
        numberOfPlants: plants,
        primaryOutwardDate: new Date(form.primaryOutwardDate).toISOString(),
        pollyhouse: form.pollyhouse,
        qualityOfDispatch: form.qualityOfDispatch,
        laboursLadies: ladies,
        laboursGents: gents,
        remarks: form.remarks || "",
        isReceived: form.isReceived === "yes",
      });
      Toast.success("Primary outward recorded");
      onSuccess?.();
      onClose();
    } catch (err) {
      Toast.error(apiErrText(err) || "Primary outward failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Primary outward</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label="Number of plants"
                value={form.numberOfPlants}
                onChange={set("numberOfPlants")}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Primary outward date"
                InputLabelProps={{ shrink: true }}
                value={form.primaryOutwardDate}
                onChange={set("primaryOutwardDate")}
              />
            </Grid>
            <Grid item xs={12}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                select
                label="Quality of dispatch"
                value={form.qualityOfDispatch}
                onChange={set("qualityOfDispatch")}
              >
                {QUALITIES.map((q) => (
                  <MenuItem key={q} value={q}>
                    {q}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Labour (ladies)"
                value={form.laboursLadies}
                onChange={set("laboursLadies")}
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                fullWidth
                type="number"
                label="Labour (gents)"
                value={form.laboursGents}
                onChange={set("laboursGents")}
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
