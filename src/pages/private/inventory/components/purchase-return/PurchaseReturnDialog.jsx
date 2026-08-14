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
  createPurchaseReturn,
  fetchEligiblePurchaseOrdersForReturn,
  fetchEligibleSuppliersForReturn,
  fetchPurchaseReturnableBatches,
} from "./purchaseReturnApi";

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

function supplierOptionLabel(s) {
  if (!s) return "";
  const phone = s.phoneNumber ? ` · ${s.phoneNumber}` : "";
  const kind = s.partyType === "MERCHANT" ? " (merchant)" : "";
  return `${s.name || "—"}${kind}${phone} · ${s.returnableBatchCount || 0} batch(es) · avail ${
    s.returnableQty || 0
  }`;
}

function poOptionLabel(po) {
  if (!po) return "";
  const supplier = po.supplier?.name || "—";
  return `${po.poNumber || "—"} · ${supplier} · ${po.returnableBatchCount || 0} batch(es) · max ${
    po.returnableQty || 0
  }`;
}

function batchOptionLabel(b) {
  if (!b) return "";
  const po = b.poNumber ? ` · PO ${b.poNumber}` : "";
  const kind = b.isRamAgriProduct ? " · Agri" : "";
  return `${b.batchNumber || "—"} · ${b.productName || "Product"}${kind} · Exp ${formatExpiry(
    b.expiryDate
  )}${po} · avail ${b.maxReturnQuantity}`;
}

/**
 * Supplier-first purchase return (same pattern as merchant sell return).
 * Optional initialPurchaseOrderId keeps PO-scoped flow from PO list.
 */
export default function PurchaseReturnDialog({ open, onClose, onSuccess, initialPurchaseOrderId }) {
  const poScoped = Boolean(initialPurchaseOrderId);
  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPos] = useState([]);
  const [loadingParty, setLoadingParty] = useState(false);
  const [supplier, setSupplier] = useState(null);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [eligibleBatches, setEligibleBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [lines, setLines] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [productFilter, setProductFilter] = useState(null);

  useEffect(() => {
    if (!open) return;
    setSupplier(null);
    setPurchaseOrder(null);
    setEligibleBatches([]);
    setSelectedBatch(null);
    setLines([]);
    setProductFilter(null);
    setReturnReason("");
    setReturnNotes("");
    let cancelled = false;
    (async () => {
      setLoadingParty(true);
      try {
        if (poScoped) {
          const list = await fetchEligiblePurchaseOrdersForReturn({ limit: 80 });
          if (cancelled) return;
          setPos(list);
          const match = list.find((p) => String(p._id) === String(initialPurchaseOrderId));
          if (match) setPurchaseOrder(match);
        } else {
          const list = await fetchEligibleSuppliersForReturn({ limit: 100 });
          if (!cancelled) setSuppliers(list);
        }
      } catch (e) {
        if (!cancelled) {
          Toast.error(e?.response?.data?.message || e?.message || "Failed to load options");
          setSuppliers([]);
          setPos([]);
        }
      } finally {
        if (!cancelled) setLoadingParty(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, initialPurchaseOrderId, poScoped]);

  const partyId = poScoped ? purchaseOrder?._id : supplier?._id;

  useEffect(() => {
    if (!open || !partyId) {
      setEligibleBatches([]);
      setSelectedBatch(null);
      setLines([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingBatches(true);
      try {
        const data = await fetchPurchaseReturnableBatches(
          poScoped ? { purchaseOrderId: partyId } : { supplierId: partyId }
        );
        if (cancelled) return;
        const list = Array.isArray(data?.batches) ? data.batches : [];
        setEligibleBatches(list.filter((b) => Number(b.maxReturnQuantity) > 0));
        setSelectedBatch(null);
        setLines([]);
        setProductFilter(null);
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
  }, [open, partyId, poScoped]);

  const productOptions = useMemo(() => {
    const map = new Map();
    for (const b of eligibleBatches) {
      const name = b.productName || "Product";
      const key = `${b.productId || name}::${name}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          productId: b.productId || null,
          productName: name,
          batchCount: 0,
          availQty: 0,
        });
      }
      const row = map.get(key);
      row.batchCount += 1;
      row.availQty += Number(b.maxReturnQuantity) || 0;
    }
    return [...map.values()].sort((a, b) => a.productName.localeCompare(b.productName));
  }, [eligibleBatches]);

  const addedIds = useMemo(() => new Set(lines.map((l) => String(l.batchId))), [lines]);

  const dropdownOptions = useMemo(() => {
    let list = eligibleBatches.filter((b) => !addedIds.has(String(b.batchId)));
    if (productFilter?.productName) {
      list = list.filter((b) => {
        if (productFilter.productId && b.productId) {
          return String(b.productId) === String(productFilter.productId);
        }
        return String(b.productName || "") === String(productFilter.productName);
      });
    }
    return list;
  }, [eligibleBatches, addedIds, productFilter]);

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
        grnNumber: selectedBatch.grnNumber,
        poNumber: selectedBatch.poNumber,
        maxReturnQuantity: selectedBatch.maxReturnQuantity,
        rate: selectedBatch.rate,
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
    if (poScoped && !purchaseOrder?._id) {
      Toast.error("Select a purchase order");
      return;
    }
    if (!poScoped && !supplier?._id) {
      Toast.error("Select a supplier");
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
      const payload = {
        batchReturns,
        returnReason: returnReason.trim(),
        returnNotes: returnNotes.trim(),
      };
      if (poScoped) payload.purchaseOrderId = purchaseOrder._id;
      else payload.supplierId = supplier._id;

      const result = await createPurchaseReturn(payload);
      Toast.success(
        `Purchase return ${result?.returnNumber || ""} — ${
          result?.totalQuantity || totalReturnQty
        } qty returned. Stock updated.`
      );
      onSuccess?.(result);
      onClose?.();
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Purchase return failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          background: "linear-gradient(90deg, #1565c0 0%, #0277bd 100%)",
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
            Create Purchase Return
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {poScoped
              ? "PO → batch → Add → qty → Confirm (stock ↓)"
              : "Supplier → available batches → Add → qty → Confirm (stock ↓)"}
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
        {poScoped ? (
          <Autocomplete
            options={pos}
            loading={loadingParty}
            value={purchaseOrder}
            onChange={(_, v) => setPurchaseOrder(v)}
            getOptionLabel={poOptionLabel}
            isOptionEqualToValue={(a, b) => String(a?._id) === String(b?._id)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search purchase order"
                placeholder="PO number or supplier"
                size="small"
                sx={{ mb: 2, bgcolor: "#fff" }}
              />
            )}
          />
        ) : (
          <Autocomplete
            options={suppliers}
            loading={loadingParty}
            value={supplier}
            onChange={(_, v) => setSupplier(v)}
            getOptionLabel={supplierOptionLabel}
            isOptionEqualToValue={(a, b) => String(a?._id) === String(b?._id)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search supplier / vendor"
                placeholder="Name or phone — parties with available stock"
                size="small"
                sx={{ mb: 2, bgcolor: "#fff" }}
                helperText={
                  loadingParty
                    ? "Loading…"
                    : suppliers.length
                      ? `${suppliers.length} with returnable stock (classic + Ram Agri)`
                      : "No parties with returnable stock"
                }
              />
            )}
          />
        )}

        {!partyId ? (
          <Alert severity="info">
            {poScoped
              ? "Select a purchase order with returnable plant stock."
              : "Select a supplier/vendor to see currently available batches purchased from them."}
          </Alert>
        ) : loadingBatches ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : eligibleBatches.length === 0 ? (
          <Alert severity="warning">No returnable batches with available stock.</Alert>
        ) : (
          <>
            <Autocomplete
              sx={{ mb: 1.5, bgcolor: "#fff" }}
              options={productOptions}
              value={productFilter}
              onChange={(_, v) => {
                setProductFilter(v);
                setSelectedBatch(null);
              }}
              getOptionLabel={(p) =>
                p
                  ? `${p.productName} · ${p.batchCount} batch(es) · avail ${p.availQty}`
                  : ""
              }
              isOptionEqualToValue={(a, b) => String(a?.key) === String(b?.key)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Filter by product (optional)"
                  placeholder="All products"
                  size="small"
                />
              )}
            />
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
                groupBy={(b) => b.productName || "Product"}
                noOptionsText={
                  dropdownOptions.length === 0 ? "All eligible batches already added" : "No batches"
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Available batch"
                    size="small"
                    helperText={
                      productFilter
                        ? `${dropdownOptions.length} batch(es) for ${productFilter.productName}`
                        : `${eligibleBatches.length} batch(es) with stock`
                    }
                  />
                )}
              />
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleAddLine}
                disabled={!selectedBatch}
                sx={{ mt: 0.25, textTransform: "none", fontWeight: 700 }}
              >
                Add
              </Button>
            </Box>

            {lines.length === 0 ? (
              <Alert severity="info">Add at least one batch line, then enter return qty ≤ available.</Alert>
            ) : (
              <Table size="small" sx={{ bgcolor: "#fff", borderRadius: 1, mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Batch</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Available</TableCell>
                    <TableCell align="right" sx={{ minWidth: 110 }}>
                      Return qty
                    </TableCell>
                    <TableCell width={48} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((l) => (
                    <TableRow key={l.batchId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={700}>
                          {l.batchNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {l.poNumber ? `PO ${l.poNumber} · ` : ""}
                          GRN {l.grnNumber || "—"} · Exp {formatExpiry(l.expiryDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>{l.productName}</TableCell>
                      <TableCell align="right">{l.maxReturnQuantity}</TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          type="number"
                          value={l.returnQuantity || ""}
                          onChange={(e) => updateLineQty(l.batchId, e.target.value)}
                          inputProps={{ min: 0, max: l.maxReturnQuantity, step: "any" }}
                          sx={{ width: 100 }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => removeLine(l.batchId)}>
                          <DeleteOutline fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </>
        )}

        <TextField
          fullWidth
          size="small"
          label="Return reason"
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          sx={{ mb: 1.5, bgcolor: "#fff" }}
        />
        <TextField
          fullWidth
          size="small"
          label="Notes"
          multiline
          minRows={2}
          value={returnNotes}
          onChange={(e) => setReturnNotes(e.target.value)}
          sx={{ bgcolor: "#fff" }}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mr: "auto" }}>
          Total return qty: <strong>{totalReturnQty}</strong>
        </Typography>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting || totalReturnQty <= 0}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : "Confirm return"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
