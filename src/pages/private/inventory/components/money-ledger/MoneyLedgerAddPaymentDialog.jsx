import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { Close, Payments } from "@mui/icons-material";
import { Toast } from "helpers/toasts/toastHelper";
import { API, NetworkManager } from "network/core";
import { addMoneyLedgerPayment } from "./moneyLedgerApi";

const MODES = ["Cash", "UPI", "Cheque", "NEFT/RTGS", "Card", "Bank Transfer"];

const DOC_TYPE_OPTIONS = [
  { value: "PurchaseOrder", label: "Purchase Order (we pay supplier)" },
  { value: "AgriSalesOrder", label: "B2B Agri Sale (merchant pays us)" },
  { value: "SellOrder", label: "Biotech Sell Order (they pay)" },
];

/**
 * Add payment against PO (AP), Agri B2B sale (Ram Agri AR), or Biotech SellOrder (AR).
 */
export default function MoneyLedgerAddPaymentDialog({
  open,
  onClose,
  onSuccess,
  defaultDocumentType = "PurchaseOrder",
  defaultDocumentId = "",
  defaultBook = "BIOTECH",
  documentLabel = "",
}) {
  const [documentType, setDocumentType] = useState(defaultDocumentType);
  const [documentId, setDocumentId] = useState(defaultDocumentId);
  const [poOptions, setPoOptions] = useState([]);
  const [sellOptions, setSellOptions] = useState([]);
  const [agriOptions, setAgriOptions] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [amount, setAmount] = useState("");
  const [modeOfPayment, setModeOfPayment] = useState("Cash");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [book, setBook] = useState(defaultBook);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDocumentType(defaultDocumentType);
    setDocumentId(defaultDocumentId || "");
    setBook(defaultBook);
    setAmount("");
    setRemark("");
    setModeOfPayment("Cash");
    setPaymentDate(new Date().toISOString().slice(0, 10));
  }, [open, defaultDocumentType, defaultDocumentId, defaultBook]);

  useEffect(() => {
    if (!open || defaultDocumentId) return;
    let cancelled = false;
    (async () => {
      setLoadingDocs(true);
      try {
        if (documentType === "PurchaseOrder") {
          const instance = NetworkManager(API.INVENTORY.GET_ALL_PURCHASE_ORDERS);
          const res = await instance.request({}, { limit: 50, page: 1 });
          const body = res?.data;
          const list =
            body?.data?.data || body?.data || (Array.isArray(body) ? body : []) || [];
          if (!cancelled) setPoOptions(Array.isArray(list) ? list : []);
        } else if (documentType === "AgriSalesOrder") {
          const instance = NetworkManager(API.INVENTORY.GET_ALL_AGRI_SALES_ORDERS);
          const res = await instance.request(
            {},
            { limit: 50, page: 1, orderChannel: "B2B" }
          );
          const body = res?.data;
          const list =
            body?.data?.data || body?.data || (Array.isArray(body) ? body : []) || [];
          const rows = Array.isArray(list) ? list : [];
          if (!cancelled) {
            setAgriOptions(
              rows.filter((o) => o.merchant || o.orderChannel === "B2B" || o.balanceAmount > 0)
            );
          }
        } else {
          const instance = NetworkManager(API.INVENTORY.GET_ALL_SELL_ORDERS);
          const res = await instance.request({}, { limit: 50, page: 1 });
          const body = res?.data;
          const list =
            body?.data?.data || body?.data || (Array.isArray(body) ? body : []) || [];
          if (!cancelled) setSellOptions(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (!cancelled) Toast.error(e?.message || "Failed to load documents");
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, documentType, defaultDocumentId]);

  const ledgerBookForSubmit = () => {
    if (documentType === "PurchaseOrder") return book;
    if (documentType === "AgriSalesOrder") return "RAM_AGRI";
    return "BIOTECH";
  };

  const handleSubmit = async () => {
    const amt = Number.parseFloat(amount);
    if (!documentId) {
      Toast.error("Select a document");
      return;
    }
    if (!(amt > 0)) {
      Toast.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      await addMoneyLedgerPayment({
        documentType,
        documentId,
        amount: amt,
        modeOfPayment,
        paymentDate,
        paymentStatus: "COLLECTED",
        book: ledgerBookForSubmit(),
        remark: remark.trim(),
      });
      Toast.success("Payment recorded on ledger");
      onSuccess?.();
      onClose?.();
    } catch (e) {
      Toast.error(e?.response?.data?.message || e?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  const docOptions =
    documentType === "PurchaseOrder"
      ? poOptions
      : documentType === "AgriSalesOrder"
        ? agriOptions
        : sellOptions;

  const formatDocLabel = (d) => {
    const num = d.poNumber || d.orderNumber || d._id;
    const party =
      d.supplier?.name || d.merchant?.name || d.customerName || d.buyerName || "";
    const bal =
      d.balanceAmount != null
        ? ` · bal ₹${Number(d.balanceAmount).toLocaleString("en-IN")}`
        : "";
    return `${num}${party ? ` · ${party}` : ""}${bal}`;
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 6 }}>
        <Payments color="primary" />
        <Box>
          <Typography fontWeight={800}>Add Payment</Typography>
          <Typography variant="caption" color="text.secondary">
            {documentLabel || "Posts an immutable ledger line"}
          </Typography>
        </Box>
        <Button
          onClick={onClose}
          disabled={submitting}
          sx={{ position: "absolute", right: 8, top: 8, minWidth: 0 }}
        >
          <Close />
        </Button>
      </DialogTitle>
      <DialogContent dividers>
        {!defaultDocumentId && (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Document type</InputLabel>
              <Select
                label="Document type"
                value={documentType}
                onChange={(e) => {
                  setDocumentType(e.target.value);
                  setDocumentId("");
                }}
              >
                {DOC_TYPE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={loadingDocs}>
              <InputLabel>Document</InputLabel>
              <Select
                label="Document"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
              >
                {docOptions.map((d) => (
                  <MenuItem key={d._id} value={d._id}>
                    {formatDocLabel(d)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}
        {defaultDocumentId ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Payment for this document will update paid amount and money ledger.
          </Alert>
        ) : null}

        {documentType === "PurchaseOrder" && (
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Ledger book</InputLabel>
            <Select label="Ledger book" value={book} onChange={(e) => setBook(e.target.value)}>
              <MenuItem value="BIOTECH">Biotech AP</MenuItem>
              <MenuItem value="RAM_AGRI">Ram Agri AP</MenuItem>
            </Select>
          </FormControl>
        )}
        {documentType === "AgriSalesOrder" && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Posts to Ram Agri Receivable (merchant B2B).
          </Alert>
        )}

        <TextField
          fullWidth
          size="small"
          type="number"
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={{ mb: 2 }}
          inputProps={{ min: 0, step: "any" }}
        />
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Mode</InputLabel>
          <Select
            label="Mode"
            value={modeOfPayment}
            onChange={(e) => setModeOfPayment(e.target.value)}
          >
            {MODES.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          size="small"
          type="date"
          label="Payment date"
          InputLabelProps={{ shrink: true }}
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          size="small"
          label="Remark"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {submitting ? <CircularProgress size={20} color="inherit" /> : "Confirm payment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
