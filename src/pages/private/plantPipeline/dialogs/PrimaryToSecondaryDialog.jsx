import React, { useEffect, useMemo, useState } from "react";
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
import { submitPrimaryToSecondary } from "../utils/pipelineApi";
import { apiErrText, formatPipelineDate } from "../utils/pipelineLabels";

const emptyForm = () => ({
  primaryOutwardId: "",
  secondaryInwardDate: dayjs().format("YYYY-MM-DD"),
  dateOfDispatch: dayjs().add(14, "day").format("YYYY-MM-DD"),
  numberOfTrays: "",
  cavity: "8",
  size: "R1",
  numberOfBottles: "1",
  pollyhouse: "",
  laboursLadies: "",
  laboursGents: "",
  remarks: "",
});

export default function PrimaryToSecondaryDialog({
  open,
  onClose,
  batchId,
  batchDoc,
  locations,
  trays,
  onSuccess,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const outwardOptions = useMemo(() => {
    const rows = batchDoc?.primaryOutward ?? [];
    return rows.map((po) => ({
      id: String(po._id),
      label: `${formatPipelineDate(po.primaryOutwardDate)} · ${po.totalQuantity ?? po.numberOfTrays ?? "?"} pl · ${po.size ?? ""}`,
      row: po,
    }));
  }, [batchDoc]);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "primaryOutwardId") {
        const opt = outwardOptions.find((o) => o.id === val);
        if (opt?.row) {
          next.size = opt.row.size ?? prev.size;
          next.cavity = String(opt.row.cavity ?? prev.cavity);
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ladies = Number(form.laboursLadies) || 0;
    const gents = Number(form.laboursGents) || 0;
    const trays = Number(form.numberOfTrays);
    if (
      !batchId ||
      !form.primaryOutwardId ||
      trays < 1 ||
      !form.pollyhouse ||
      ladies + gents < 1
    ) {
      Toast.error("Fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await submitPrimaryToSecondary(batchId, {
        primaryOutwardId: form.primaryOutwardId,
        secondaryInwardDate: new Date(form.secondaryInwardDate).toISOString(),
        dateOfDispatch: new Date(form.dateOfDispatch).toISOString(),
        numberOfTrays: trays,
        cavity: Number(form.cavity) || 8,
        size: form.size,
        numberOfBottles: Number(form.numberOfBottles) || 1,
        pollyhouse: form.pollyhouse,
        laboursLadies: ladies,
        laboursGents: gents,
        laboursEngaged: ladies + gents,
        remarks: form.remarks || "To secondary",
      });
      Toast.success("Transfer to secondary recorded");
      onSuccess?.();
      onClose();
    } catch (err) {
      Toast.error(apiErrText(err) || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Primary → secondary transfer</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                select
                label="Primary outward line"
                value={form.primaryOutwardId}
                onChange={set("primaryOutwardId")}
              >
                {outwardOptions.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Date of dispatch"
                InputLabelProps={{ shrink: true }}
                value={form.dateOfDispatch}
                onChange={set("dateOfDispatch")}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                required
                type="number"
                label="Trays"
                value={form.numberOfTrays}
                onChange={set("numberOfTrays")}
                inputProps={{ min: 1 }}
              />
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField
                fullWidth
                select
                label="Cavity"
                value={form.cavity}
                onChange={set("cavity")}
              >
                {(trays.length ? trays : [{ cavity: 8 }, { cavity: 126 }]).map((t) => (
                  <MenuItem key={t.cavity} value={String(t.cavity)}>
                    {t.cavity}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={4}>
              <TextField fullWidth label="Size" value={form.size} onChange={set("size")} />
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            Save transfer
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
