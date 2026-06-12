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
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { Toast } from "helpers/toasts/toastHelper";
import { submitSecondaryOutward } from "../utils/pipelineApi";
import { apiErrText, formatPipelineDate } from "../utils/pipelineLabels";

const emptyForm = () => ({
  secondaryInwardId: "",
  secondaryOutwardDate: dayjs().format("YYYY-MM-DD"),
  numberOfTrays: "",
  cavity: "8",
  numberOfBottles: "1",
  pollyhouse: "",
  laboursEngaged: "1",
  linkedOrderId: "",
  remarks: "",
});

export default function SecondaryOutwardDialog({
  open,
  onClose,
  batchId,
  batchDoc,
  locations,
  orders,
  onSuccess,
}) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const inwardOptions = useMemo(() => {
    const rows = batchDoc?.secondaryInward ?? [];
    return rows.map((si) => ({
      id: String(si._id),
      label: `${formatPipelineDate(si.secondaryInwardDate)} · ${si.size ?? ""} · ${si.totalQuantity ?? "?"} pl`,
      row: si,
    }));
  }, [batchDoc]);

  useEffect(() => {
    if (open) setForm(emptyForm());
  }, [open]);

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "secondaryInwardId") {
        const opt = inwardOptions.find((o) => o.id === val);
        if (opt?.row) {
          next.cavity = String(opt.row.cavity ?? prev.cavity);
          next.pollyhouse = String(opt.row.pollyhouse ?? prev.pollyhouse);
        }
      }
      return next;
    });
  };

  const selectedInward = inwardOptions.find((o) => o.id === form.secondaryInwardId)?.row;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trays = Number(form.numberOfTrays);
    const cav = Number(form.cavity) || 8;
    if (
      !batchId ||
      !form.secondaryInwardId ||
      !form.linkedOrderId ||
      trays < 1 ||
      !form.pollyhouse
    ) {
      Toast.error("Fill all required fields including farmer order");
      return;
    }
    setSubmitting(true);
    try {
      await submitSecondaryOutward(batchId, {
        secondaryInwardId: form.secondaryInwardId,
        secondaryOutwardDate: new Date(form.secondaryOutwardDate).toISOString(),
        numberOfBottles: Number(form.numberOfBottles) || 1,
        size: selectedInward?.size ?? "R1",
        cavity: cav,
        numberOfTrays: trays,
        pollyhouse: form.pollyhouse,
        laboursEngaged: Number(form.laboursEngaged) || 1,
        remarks: form.remarks || "",
        linkedOrderId: form.linkedOrderId,
      });
      Toast.success("Order dispatch recorded");
      onSuccess?.();
      onClose();
    } catch (err) {
      Toast.error(apiErrText(err) || "Dispatch failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Dispatch to farmer order</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                select
                label="Secondary inward line"
                value={form.secondaryInwardId}
                onChange={set("secondaryInwardId")}
              >
                {inwardOptions.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                select
                label="Farmer order"
                value={form.linkedOrderId}
                onChange={set("linkedOrderId")}
              >
                {(orders ?? []).map((ord) => (
                  <MenuItem key={String(ord._id)} value={String(ord._id)}>
                    {ord.publicOrderCode ?? ord.orderId ?? ord._id} · Remaining:{" "}
                    {ord.remainingPlants ?? "?"}
                  </MenuItem>
                ))}
              </TextField>
              {!orders?.length && (
                <Typography variant="caption" color="text.secondary">
                  No orders ready for this batch — check order status.
                </Typography>
              )}
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                required
                type="date"
                label="Outward date"
                InputLabelProps={{ shrink: true }}
                value={form.secondaryOutwardDate}
                onChange={set("secondaryOutwardDate")}
              />
            </Grid>
            <Grid item xs={6}>
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
            <Grid item xs={6}>
              <TextField fullWidth label="Cavity" value={form.cavity} onChange={set("cavity")} />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            Record dispatch
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
