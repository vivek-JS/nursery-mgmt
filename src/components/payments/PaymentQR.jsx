import React, { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import axiosInstance from "../../services/axiosConfig";
import { Box, Button, CircularProgress, Paper, Typography, Alert } from "@mui/material";

const QR_TTL_MS = 30 * 60 * 1000;

function formatRemaining(ms) {
  if (ms <= 0) return "0:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Demo / integration UI for ICICI EazyPay dynamic QR.
 * Calls POST /api/payments/icici/qr (JWT via axiosConfig). Ensure backend has EAZYPAY_USE_STUB=true or real SDK.
 */
export default function PaymentQR({
  defaultOrderId = "ORD1001",
  defaultAmount = 5,
}) {
  const [orderId, setOrderId] = useState(defaultOrderId);
  const [amount, setAmount] = useState(defaultAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [remainingMs, setRemainingMs] = useState(null);
  const [txnStatus, setTxnStatus] = useState(null);

  const expiresAtDate = useMemo(() => {
    if (!data?.expiresAt) return null;
    const d = new Date(data.expiresAt);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [data]);

  useEffect(() => {
    if (!expiresAtDate) {
      setRemainingMs(null);
      return undefined;
    }
    const tick = () => {
      const end = expiresAtDate.getTime();
      setRemainingMs(Math.max(0, end - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAtDate]);

  /** Poll ICICI EazyPay status for standalone QR (merchantTranId) until success / terminal state. */
  useEffect(() => {
    const mtid = data?.merchantTranId;
    if (!mtid) {
      setTxnStatus(null);
      return undefined;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await axiosInstance.get(
          `/api/payments/icici/status/${encodeURIComponent(mtid)}`
        );
        const inner = r.data?.data ?? r.data;
        const st = inner?.status;
        if (!cancelled) setTxnStatus(st || null);
        return st === "SUCCESS" || st === "FAILED" || st === "EXPIRED";
      } catch {
        if (!cancelled) setTxnStatus("ERROR");
        return true;
      }
    };
    poll();
    const id = setInterval(async () => {
      if (cancelled) return;
      const stop = await poll();
      if (stop) clearInterval(id);
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [data?.merchantTranId]);

  const generateQr = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await axiosInstance.post("/api/payments/icici/qr", {
        orderId,
        amount: Number(amount),
      });
      const payload = res.data?.data ?? res.data;
      if (!payload?.qrString && !payload?.qrImageBase64) {
        setError("No QR data in response — check backend mapping.");
        return;
      }
      const exp =
        payload.expiresAt ||
        new Date(Date.now() + QR_TTL_MS).toISOString();
      setData({
        ...payload,
        expiresAt: exp,
      });
    } catch (e) {
      const msg =
        e.response?.data?.message ||
        (typeof e.response?.data?.error === "string" ? e.response.data.error : e.response?.data?.error?.reason) ||
        e.message ||
        "Failed to generate QR";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [orderId, amount]);

  const qrValue = data?.qrString || "";

  return (
    <Paper sx={{ p: 3, maxWidth: 420 }}>
      <Typography variant="h6" gutterBottom>
        ICICI EazyPay QR
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Order ID
        </Typography>
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <Typography variant="body2" color="text.secondary">
          Amount (INR)
        </Typography>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
        />
      </Box>
      <Button variant="contained" onClick={generateQr} disabled={loading} fullWidth>
        {loading ? <CircularProgress size={22} color="inherit" /> : "Generate QR"}
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {data && (
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2">
            Order: <strong>{data.orderId}</strong>
          </Typography>
          <Typography variant="body2">
            Amount: <strong>₹ {data.amount}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Expires in: <strong>{remainingMs != null ? formatRemaining(remainingMs) : "—"}</strong>{" "}
            (30 min window)
          </Typography>
          {data.merchantTranId && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
              Txn ref: {data.merchantTranId}
            </Typography>
          )}
          {txnStatus && (
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }} color="primary.main">
              Bank status (EazyPay): {txnStatus}
            </Typography>
          )}
          <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
            {qrValue ? (
              <QRCodeSVG value={qrValue} size={220} level="M" includeMargin />
            ) : data.qrImageBase64 ? (
              <img
                alt="QR"
                src={`data:image/png;base64,${data.qrImageBase64}`}
                width={220}
                height={220}
              />
            ) : null}
          </Box>
        </Box>
      )}
    </Paper>
  );
}
