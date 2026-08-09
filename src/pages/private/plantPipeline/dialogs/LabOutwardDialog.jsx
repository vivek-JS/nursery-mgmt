import React, { useEffect, useState } from "react";
import { Grid, TextField, MenuItem } from "@mui/material";
import dayjs from "dayjs";
import { Toast } from "helpers/toasts/toastHelper";
import { addLabEntry } from "../utils/pipelineApi";
import { apiErrText, calcPlantsFromBottles, SIZES } from "../utils/pipelineLabels";
import PipelineFormDialog from "../components/PipelineFormDialog";
import { STAGES } from "../utils/pipelineTheme";

const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: 2 } };

const emptyForm = () => ({
  outwardDate: dayjs().format("YYYY-MM-DD"),
  rootingDate: dayjs().subtract(14, "day").format("YYYY-MM-DD"),
  size: "R1",
  bottles: "",
  plants: "",
});

export default function LabOutwardDialog({ open, onClose, batchId, onSuccess }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "size" || key === "bottles") {
        const bottles = key === "bottles" ? val : prev.bottles;
        const size = key === "size" ? val : prev.size;
        if (bottles && size) {
          next.plants = String(calcPlantsFromBottles(size, bottles));
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!batchId) {
      Toast.error("Select a batch first");
      return;
    }
    const bottles = Number(form.bottles);
    const plants = Number(form.plants);
    if (!form.outwardDate || !form.rootingDate || !form.size || bottles < 1 || plants < 1) {
      Toast.error("Fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await addLabEntry(batchId, {
        outwardDate: new Date(form.outwardDate).toISOString(),
        rootingDate: new Date(form.rootingDate).toISOString(),
        size: form.size,
        bottles,
        plants,
      });
      Toast.success("Lab outward entry added");
      onSuccess?.();
      onClose();
    } catch (err) {
      Toast.error(apiErrText(err) || "Failed to add lab entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PipelineFormDialog
      open={open}
      onClose={onClose}
      title="Add lab outward"
      subtitle="Bottles and plants leaving tissue culture for this batch"
      stageColor={STAGES.lab.color}
      onSubmit={handleSubmit}
      submitLabel="Save entry"
      submitting={submitting}
    >
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            type="date"
            label="Outward date"
            InputLabelProps={{ shrink: true }}
            value={form.outwardDate}
            onChange={set("outwardDate")}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            type="date"
            label="Rooting date"
            InputLabelProps={{ shrink: true }}
            value={form.rootingDate}
            onChange={set("rootingDate")}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            required
            select
            label="Size"
            value={form.size}
            onChange={set("size")}
            sx={fieldSx}
          >
            {SIZES.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            required
            type="number"
            label="Bottles"
            value={form.bottles}
            onChange={set("bottles")}
            inputProps={{ min: 1 }}
            sx={fieldSx}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            required
            type="number"
            label="Plants"
            helperText="Auto-calculated from bottles"
            value={form.plants}
            onChange={set("plants")}
            inputProps={{ min: 1 }}
            sx={fieldSx}
          />
        </Grid>
      </Grid>
    </PipelineFormDialog>
  );
}
