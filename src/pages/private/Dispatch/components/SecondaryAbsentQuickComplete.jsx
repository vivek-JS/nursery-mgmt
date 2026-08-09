import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Add, LocalShipping, Refresh } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import moment from "moment";
import { NetworkManager, API } from "network/core";
import { Toast } from "helpers/toasts/toastHelper";
import {
  dcPdfSuccessMessage,
  generateOrderDeliveryChallanPdfClient,
  orderDcPdfUrl,
  orderHasDcNumber,
  saveOrderDcNumber,
} from "utils/dispatchDcPdf";

function normalizeOrderRow(entry) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry._id ?? entry.details?.orderid ?? entry.id ?? "");
  if (!id) return null;
  const farmer =
    entry.farmer && typeof entry.farmer === "object"
      ? entry.farmer
      : entry.details?.farmer;
  return {
    ...entry,
    _id: id,
    orderId: entry.orderId ?? entry.details?.orderId,
    publicOrderCode: entry.publicOrderCode ?? entry.details?.publicOrderCode,
    farmerName: farmer?.name || entry.details?.farmer?.name || "—",
    deliveryChallanInvoiceNumber:
      entry.deliveryChallanInvoiceNumber ?? entry.details?.deliveryChallanInvoiceNumber,
    officialDeliveryChallanNumber:
      entry.officialDeliveryChallanNumber ?? entry.details?.officialDeliveryChallanNumber,
    deliveryChallanPdfUrl: entry.deliveryChallanPdfUrl ?? entry.details?.deliveryChallanPdfUrl,
    whatsappDispatchSentAt:
      entry.whatsappDispatchSentAt ?? entry.details?.whatsappDispatchSentAt,
  };
}

function normalizeDispatchRow(row) {
  const orders = (Array.isArray(row?.orderIds) ? row.orderIds : [])
    .map(normalizeOrderRow)
    .filter(Boolean);
  return { ...row, orders };
}

function OrderRow({ order, onOrderUpdated }) {
  const oid = String(order._id);
  const [dcDraft, setDcDraft] = useState(
    () =>
      String(
        order.officialDeliveryChallanNumber ||
          order.deliveryChallanInvoiceNumber ||
          ""
      ).trim()
  );
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const hasOfficial = Boolean(String(order.officialDeliveryChallanNumber || "").trim());
  const hasDc = orderHasDcNumber(order) || Boolean(dcDraft.trim());
  const pdfUrl = orderDcPdfUrl(order);
  const waSent = Boolean(order.whatsappDispatchSentAt);

  const saveDc = async () => {
    if (hasOfficial) return;
    setSaving(true);
    try {
      const saved = await saveOrderDcNumber(oid, dcDraft);
      onOrderUpdated(oid, {
        deliveryChallanInvoiceNumber: saved,
        officialDeliveryChallanNumber: order.officialDeliveryChallanNumber,
      });
      Toast.success("DC number saved");
    } catch (e) {
      Toast.error(e?.message || "Failed to save DC");
    } finally {
      setSaving(false);
    }
  };

  const generatePdf = async (force = false) => {
    if (!hasDc) {
      Toast.error("Save a DC number first");
      return;
    }
    if (!hasOfficial && dcDraft.trim()) {
      try {
        await saveOrderDcNumber(oid, dcDraft);
      } catch (e) {
        Toast.error(e?.message || "Save DC before PDF");
        return;
      }
    }
    if (pdfUrl && !force) {
      window.open(pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (force && !window.confirm("Regenerate DC PDF? Previous PDF stays in history.")) return;
    setPdfBusy(true);
    try {
      const data = await generateOrderDeliveryChallanPdfClient(oid, { force });
      onOrderUpdated(oid, {
        deliveryChallanPdfUrl: data?.deliveryChallanPdfUrl,
        deliveryChallanPdfGeneratedAt: data?.deliveryChallanPdfGeneratedAt,
        whatsappDispatchSentAt:
          data?.whatsappDispatch?.whatsappDispatchSentAt ||
          (data?.whatsappDispatch?.sent || data?.whatsappDispatch?.alreadySent
            ? new Date().toISOString()
            : order.whatsappDispatchSentAt),
      });
      const url = String(data?.deliveryChallanPdfUrl || "").trim();
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      Toast.success(dcPdfSuccessMessage(data));
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "DC PDF failed");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <Box
      sx={{
        py: 1,
        borderTop: "1px solid rgba(0,0,0,0.06)",
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        alignItems: "center",
      }}
    >
      <Box sx={{ flex: "1 1 180px", minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.85rem" }}>
          #{order.publicOrderCode || order.orderId || "—"} · {order.farmerName}
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
          {hasDc ? <Chip size="small" label="DC" color="success" variant="outlined" /> : null}
          {pdfUrl ? <Chip size="small" label="PDF" color="primary" variant="outlined" /> : null}
          {waSent ? <Chip size="small" label="WhatsApp sent" color="secondary" variant="outlined" /> : null}
        </Stack>
      </Box>
      {!hasOfficial ? (
        <TextField
          size="small"
          label="DC number"
          value={dcDraft}
          onChange={(e) => setDcDraft(e.target.value)}
          sx={{ width: 140 }}
        />
      ) : (
        <Typography variant="caption" color="text.secondary">
          DC: {order.officialDeliveryChallanNumber}
        </Typography>
      )}
      {!hasOfficial ? (
        <Button size="small" variant="outlined" disabled={saving} onClick={() => void saveDc()}>
          {saving ? "…" : "Save DC"}
        </Button>
      ) : null}
      <Button
        size="small"
        variant="contained"
        disabled={pdfBusy || !hasDc}
        onClick={() => void generatePdf(Boolean(pdfUrl))}
      >
        {pdfBusy ? "…" : pdfUrl ? "Open / regen PDF" : "Generate DC PDF"}
      </Button>
    </Box>
  );
}

function DispatchCard({ dispatch, onOrderUpdated, onRefresh }) {
  const [bulkBusy, setBulkBusy] = useState(false);
  const orders = dispatch.orders || [];
  const token = dispatch.transportId || "—";
  const meta = [dispatch.driverName, dispatch.vehicleNumber || dispatch.vehicleName]
    .filter(Boolean)
    .join(" · ");

  const generateAll = async () => {
    const missing = orders.filter((o) => orderHasDcNumber(o) && !orderDcPdfUrl(o));
    if (!missing.length) {
      Toast.info("All orders with DC already have PDFs");
      return;
    }
    setBulkBusy(true);
    let ok = 0;
    let fail = 0;
    for (const o of missing) {
      try {
        const data = await generateOrderDeliveryChallanPdfClient(o._id);
        onOrderUpdated(o._id, {
          deliveryChallanPdfUrl: data?.deliveryChallanPdfUrl,
          whatsappDispatchSentAt: data?.whatsappDispatch?.whatsappDispatchSentAt,
        });
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBulkBusy(false);
    if (ok) Toast.success(`Generated ${ok} DC PDF(s)${fail ? `; ${fail} failed` : ""}`);
    else Toast.error("Could not generate DC PDFs");
    onRefresh();
  };

  return (
    <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: "1px solid rgba(46,125,50,0.2)" }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
        <Box>
          <Typography sx={{ fontWeight: 800 }}>
            Token #{token} · {meta || "No driver/vehicle"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {orders.length} order(s) · {dispatch.transportStatus || "PENDING"}
          </Typography>
        </Box>
        <Button size="small" variant="outlined" disabled={bulkBusy} onClick={() => void generateAll()}>
          {bulkBusy ? "…" : "All DC PDFs"}
        </Button>
      </Stack>
      {orders.map((o) => (
        <OrderRow key={o._id} order={o} onOrderUpdated={onOrderUpdated} />
      ))}
    </Paper>
  );
}

export default function SecondaryAbsentQuickComplete() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [dispatches, setDispatches] = useState([]);

  const patchOrder = useCallback((orderId, patch) => {
    setDispatches((prev) =>
      prev.map((d) => ({
        ...d,
        orders: (d.orders || []).map((o) =>
          String(o._id) === String(orderId) ? { ...o, ...patch } : o
        ),
      }))
    );
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endDate = moment().format("YYYY-MM-DD");
      const startDate = moment().subtract(7, "days").format("YYYY-MM-DD");
      const inst = NetworkManager(API.DISPATCHED.GET_TRAYS);
      const res = await inst.request({}, { startDate, endDate, paged: "1", page: 1, limit: 50 });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      const active = rows
        .filter((d) => String(d?.transportStatus || "").toUpperCase() !== "DELIVERED")
        .map(normalizeDispatchRow);
      setDispatches(active);
    } catch (e) {
      Toast.error(e?.response?.data?.message || "Failed to load dispatches");
      setDispatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const empty = !loading && dispatches.length === 0;

  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1, p: 1 }}>
      <Alert severity="info" sx={{ borderRadius: 2, py: 0.5 }}>
        Secondary manager absent: create dispatch → assign DC → generate PDF. Farmer WhatsApp sends
        automatically once (no duplicate).
      </Alert>

      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate("/u/dispatched-vehicles")}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          New dispatch (vehicles)
        </Button>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
          onClick={() => void load()}
          disabled={loading}
          sx={{ textTransform: "none" }}
        >
          Refresh
        </Button>
      </Stack>

      {loading && !dispatches.length ? (
        <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress />
        </Box>
      ) : empty ? (
        <Paper sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
          <LocalShipping sx={{ fontSize: 40, color: "text.disabled", mb: 1 }} />
          <Typography color="text.secondary">No in-process dispatches in the last 7 days.</Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5} sx={{ overflow: "auto", pb: 2 }}>
          {dispatches.map((d) => (
            <DispatchCard
              key={d._id}
              dispatch={d}
              onOrderUpdated={patchOrder}
              onRefresh={load}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
