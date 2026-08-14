import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Add, Close, DeleteOutline, Undo } from "@mui/icons-material";
import { Toast } from "helpers/toasts/toastHelper";
import {
  fetchMerchantReturnableBatches,
  fetchMerchantsSimple,
  processMerchantBatchSaleReturn,
} from "./agriOrderDetailApi";

function formatExpiry(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function clampQty(value, max) {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n) || n < 0) return 0;
  return Math.min(n, max);
}

function batchOptionLabel(b) {
  if (!b) return "";
  const expiry = formatExpiry(b.expiryDate);
  return `${b.batchNumber || "—"} · ${b.productName || "Product"} · Exp ${expiry} · max ${b.maxReturnQuantity}`;
}

export default function AgriMerchantSaleReturnDialog({ open, onClose, onSuccess }) {
  const [merchants, setMerchants] = useState([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [merchant, setMerchant] = useState(null);
  const [eligibleBatches, setEligibleBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [lines, setLines] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMerchant(null);
    setEligibleBatches([]);
    setSelectedBatch(null);
    setLines([]);
    setReturnReason("");
    setReturnNotes("");
    let cancelled = false;
    (async () => {
      setLoadingMerchants(true);
      try {
        const list = await fetchMerchantsSimple();
        if (!cancelled) setMerchants(list);
      } catch (e) {
        if (!cancelled) {
          Toast.error(e?.message || "Failed to load merchants");
          setMerchants([]);
        }
      } finally {
        if (!cancelled) setLoadingMerchants(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !merchant?._id) {
      setEligibleBatches([]);
      setSelectedBatch(null);
      setLines([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingBatches(true);
      try {
        const data = await fetchMerchantReturnableBatches(merchant._id);
        if (cancelled) return;
        const list = Array.isArray(data?.batches) ? data.batches : [];
        setEligibleBatches(list.filter((b) => Number(b.maxReturnQuantity) > 0));
        setSelectedBatch(null);
        setLines([]);
      } catch (e) {
        if (!cancelled) {
          Toast.error(e?.response?.data?.message || e?.message || "Failed to load batches");
          setEligibleBatches([]);
        }
      } finally {
        if (!cancelled) setLoadingBatches(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, merchant?._id]);

  const addedIds = useMemo(() => new Set(lines.map((l) => String(l.batchId))), [lines]);

  const dropdownOptions = useMemo(
    () => eligibleBatches.filter((b) => !addedIds.has(String(b.batchId))),
    [eligibleBatches, addedIds]
  );

  const totalReturnQty = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.returnQuantity) || 0), 0),
    [lines]
  );

  const handleAddLine = () => {
    if (!selectedBatch?.batchId) {
      Toast.error("Select an eligible batch first");
      return;
    }
    if (addedIds.has(String(selectedBatch.batchId))) {
      Toast.error("Batch already added");
      return;
    }
    setLines((prev) => [
      ...prev,
      {
        batchId: selectedBatch.batchId,
        batchNumber: selectedBatch.batchNumber,
        productName: selectedBatch.productName,
        expiryDate: selectedBatch.expiryDate,
        soldQty: selectedBatch.soldQty,
        maxReturnQuantity: selectedBatch.maxReturnQuantity,
        orderCount: selectedBatch.orderCount,
        returnQuantity: 0,
      },
    ]);
    setSelectedBatch(null);
  };

  const updateLineQty = (batchId, value) => {
    setLines((prev) =>
      prev.map((l) =>
        String(l.batchId) === String(batchId)
          ? { ...l, returnQuantity: clampQty(value, l.maxReturnQuantity) }
          : l
      )
    );
  };

  const removeLine = (batchId) => {
    setLines((prev) => prev.filter((l) => String(l.batchId) !== String(batchId)));
  };

  const handleSubmit = async () => {
    if (!merchant?._id) {
      Toast.error("Select a merchant");
      return;
    }
    const batchReturns = lines
      .map((l) => ({
        batchId: l.batchId,
        returnQuantity: Number(l.returnQuantity) || 0,
      }))
      .filter((b) => b.returnQuantity > 0);

    if (!batchReturns.length) {
      Toast.error("Add a batch and enter return quantity");
      return;
    }

    setSubmitting(true);
    try {
      const result = await processMerchantBatchSaleReturn({
        merchantId: merchant._id,
        batchReturns,
        returnReason: returnReason.trim(),
        returnNotes: returnNotes.trim(),
      });
      Toast.success(
        `Sale return applied — ${result?.totalReturnQty || totalReturnQty} qty across ${
          result?.orders?.length || 0
        } order(s). Stock & ledger updated.`
      );
      onSuccess?.(result);
      onClose?.();
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Sale return failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          background: "linear-gradient(90deg, #e65100 0%, #ef6c00 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          pr: 6,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Undo />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
            Create Sell Return
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Merchant → select batch → Add → qty → Confirm
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={submitting}
          sx={{ position: "absolute", right: 8, top: 8, color: "#fff" }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ bgcolor: "#fafafa" }}>
        <Autocomplete
          options={merchants}
          loading={loadingMerchants}
          value={merchant}
          onChange={(_, v) => setMerchant(v)}
          getOptionLabel={(m) =>
            m ? `${m.name || "—"}${m.phone || m.mobile ? ` · ${m.phone || m.mobile}` : ""}` : ""
          }
          isOptionEqualToValue={(a, b) => String(a?._id) === String(b?._id)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search merchant"
              placeholder="Name or phone"
              size="small"
              sx={{ mb: 2, bgcolor: "#fff" }}
            />
          )}
        />

        {!merchant ? (
          <Alert severity="info">Select a merchant to load eligible batches.</Alert>
        ) : loadingBatches ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : eligibleBatches.length === 0 ? (
          <Alert severity="warning">No returnable batches for this merchant.</Alert>
        ) : (
          <>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                flexWrap: "wrap",
                mb: 2,
              }}
            >
              <Autocomplete
                sx={{ flex: 1, minWidth: 260, bgcolor: "#fff" }}
                options={dropdownOptions}
                value={selectedBatch}
                onChange={(_, v) => setSelectedBatch(v)}
                getOptionLabel={batchOptionLabel}
                isOptionEqualToValue={(a, b) => String(a?.batchId) === String(b?.batchId)}
                noOptionsText={
                  dropdownOptions.length === 0 ? "All eligible batches already added" : "No batches"
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select eligible batch"
                    placeholder="Batch · product · expiry"
                    size="small"
                  />
                )}
              />
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddLine}
                disabled={!selectedBatch}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  bgcolor: "#ef6c00",
                  "&:hover": { bgcolor: "#e65100" },
                  height: 40,
                }}
              >
                Add
              </Button>
            </Box>

            {lines.length === 0 ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Select a batch from the dropdown and click Add to create a return line.
              </Alert>
            ) : (
              <Box
                sx={{
                  bgcolor: "#fff",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  mb: 2,
                }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#fff3e0" }}>
                      <TableCell>Product</TableCell>
                      <TableCell>Batch</TableCell>
                      <TableCell>Expiry</TableCell>
                      <TableCell align="right">Max</TableCell>
                      <TableCell align="right" width={120}>
                        Return qty
                      </TableCell>
                      <TableCell width={48} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lines.map((l) => (
                      <TableRow key={l.batchId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {l.productName || "—"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {l.orderCount || 0} order(s)
                          </Typography>
                        </TableCell>
                        <TableCell>{l.batchNumber || "—"}</TableCell>
                        <TableCell>{formatExpiry(l.expiryDate)}</TableCell>
                        <TableCell align="right">{l.maxReturnQuantity}</TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={l.returnQuantity || ""}
                            onChange={(e) => updateLineQty(l.batchId, e.target.value)}
                            inputProps={{ min: 0, max: l.maxReturnQuantity, step: "any" }}
                            sx={{ width: 96 }}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeLine(l.batchId)}
                            aria-label="Remove batch"
                          >
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            <TextField
              fullWidth
              size="small"
              label="Return reason"
              placeholder="e.g. Damaged, Wrong stock, Expiry near"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              sx={{ mb: 1.5, bgcolor: "#fff" }}
            />
            <TextField
              fullWidth
              size="small"
              label="Notes (optional)"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              multiline
              minRows={2}
              sx={{ mb: 1.5, bgcolor: "#fff" }}
            />
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Confirm restores stock, updates merchant outstanding, and posts ledger credits.
            </Alert>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, bgcolor: "#f5f5f5" }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || !merchant || totalReturnQty <= 0}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <Undo />}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            bgcolor: "#ef6c00",
            "&:hover": { bgcolor: "#e65100" },
          }}
        >
          {submitting
            ? "Processing…"
            : `Confirm Sell Return${totalReturnQty > 0 ? ` (${totalReturnQty})` : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
