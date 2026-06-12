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
  Alert,
} from "@mui/material";
import dayjs from "dayjs";
import { Toast } from "helpers/toasts/toastHelper";
import { submitSecondaryLagwad } from "../utils/pipelineApi";
import { apiErrText } from "../utils/pipelineLabels";
import { parseSizeSplit, totalPlantsFromSplit } from "../utils/fifoPreview";

const emptyForm = () => ({
  R1: "",
  R2: "",
  R3: "",
  cavity: "8",
  secondaryInwardDate: dayjs().format("YYYY-MM-DD"),
  dateOfDispatch: dayjs().add(14, "day").format("YYYY-MM-DD"),
  pollyhouse: "",
  laboursLadies: "",
  laboursGents: "",
  remarks: "",
});

export default function SecondaryLagwadDialog({
  open,
  onClose,
  batchId,
  locations,
  trays,
  onSuccess,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const split = parseSizeSplit(form);
  const totalPlants = totalPlantsFromSplit(split);
  const hasR3 = split.R3 > 0;
  const hasR1R2 = split.R1 > 0 || split.R2 > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ladies = Number(form.laboursLadies) || 0;
    const gents = Number(form.laboursGents) || 0;
    if (!batchId || totalPlants < 1 || !form.pollyhouse || ladies + gents < 1) {
      Toast.error("Fill required fields");
      return;
    }
    if (hasR3 && hasR1R2) {
      Toast.error("R3 cannot be mixed with R1/R2 in one lagwad session");
      return;
    }
    setSubmitting(true);
    try {
      await submitSecondaryLagwad(batchId, {
        sizeSplit: split,
        cavity: Number(form.cavity) || 8,
        secondaryInwardDate: new Date(form.secondaryInwardDate).toISOString(),
        dateOfDispatch: new Date(form.dateOfDispatch).toISOString(),
        pollyhouse: form.pollyhouse,
        laboursLadies: ladies,
        laboursGents: gents,
        remarks: form.remarks || "",
      });
      Toast.success("Secondary lagwad (sowing) recorded");
      onSuccess?.();
      onClose();
    } catch (err) {
      Toast.error(apiErrText(err) || "Lagwad failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Secondary lagwad (sowing)</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={4}>
              <TextField fullWidth type="number" label="R1 plants" value={form.R1} onChange={set("R1")} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth type="number" label="R2 plants" value={form.R2} onChange={set("R2")} />
            </Grid>
            <Grid item xs={4}>
              <TextField fullWidth type="number" label="R3 plants" value={form.R3} onChange={set("R3")} />
            </Grid>
            {hasR3 && hasR1R2 && (
              <Grid item xs={12}>
                <Alert severity="warning">R3 cannot be mixed with R1/R2.</Alert>
              </Grid>
            )}
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Cavity"
                value={form.cavity}
                onChange={set("cavity")}
              >
                {(trays.length ? trays : [{ cavity: 8 }]).map((t) => (
                  <MenuItem key={t.cavity} value={String(t.cavity)}>
                    {t.label ?? t.cavity}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                required
                select
                label="Polyhouse"
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
            <Grid item xs={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Secondary inward date"
                InputLabelProps={{ shrink: true }}
                value={form.secondaryInwardDate}
                onChange={set("secondaryInwardDate")}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Dispatch date"
                InputLabelProps={{ shrink: true }}
                value={form.dateOfDispatch}
                onChange={set("dateOfDispatch")}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Labour (ladies)"
                value={form.laboursLadies}
                onChange={set("laboursLadies")}
              />
            </Grid>
            <Grid item xs={6}>
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
            Save ({totalPlants} plants)
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
